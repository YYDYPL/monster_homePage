#!/usr/bin/env python3
"""End-to-end smoke test for the production-style Docker Compose stack.

Only Python's standard library is used so the script can run locally and in
GitHub Actions without installing test dependencies.
"""

from __future__ import annotations

import http.cookiejar
import json
import os
import ssl
import socket
import sys
import time
import uuid
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import (
    HTTPRedirectHandler,
    HTTPCookieProcessor,
    HTTPSHandler,
    ProxyHandler,
    Request,
    build_opener,
)


for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(encoding="utf-8")


BASE_URL = os.getenv("SMOKE_BASE_URL", "https://localhost").rstrip("/")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "test-admin-password")
TIMEOUT = float(os.getenv("SMOKE_TIMEOUT", "20"))
INSECURE_TLS = os.getenv("SMOKE_INSECURE_TLS", "true").lower() in {"1", "true", "yes"}
FORCE_IPV4 = os.getenv("SMOKE_FORCE_IPV4", "true").lower() in {"1", "true", "yes"}

if FORCE_IPV4 and urlparse(BASE_URL).hostname == "localhost":
    _original_getaddrinfo = socket.getaddrinfo

    def _ipv4_localhost(host, port, family=0, type=0, proto=0, flags=0):  # noqa: ANN001
        results = _original_getaddrinfo(host, port, family, type, proto, flags)
        if host == "localhost":
            ipv4 = [result for result in results if result[0] == socket.AF_INET]
            return ipv4 or results
        return results

    socket.getaddrinfo = _ipv4_localhost


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        return None


@dataclass
class Response:
    status: int
    body: bytes
    headers: Any
    url: str

    def json(self) -> Any:
        if not self.body:
            return None
        return json.loads(self.body.decode("utf-8"))

    def text(self) -> str:
        return self.body.decode("utf-8", errors="replace")


class Client:
    def __init__(self) -> None:
        self.cookies = http.cookiejar.CookieJar()
        context = ssl.create_default_context()
        if INSECURE_TLS:
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
        handlers = [ProxyHandler({}), HTTPCookieProcessor(self.cookies), HTTPSHandler(context=context)]
        self.opener = build_opener(*handlers)
        self.no_redirect_opener = build_opener(*handlers, NoRedirect())
        self.csrf_token: str | None = None
        self.csrf_header = "X-XSRF-TOKEN"

    def request(
        self,
        method: str,
        path: str,
        *,
        json_body: Any | None = None,
        data: bytes | None = None,
        headers: dict[str, str] | None = None,
        expected: int | tuple[int, ...] = 200,
        follow_redirects: bool = True,
    ) -> Response:
        url = path if path.startswith("http") else f"{BASE_URL}{path}"
        request_headers = {
            "Accept": "application/json, text/html;q=0.9, */*;q=0.8",
            "User-Agent": "MonsterHomePage-Smoke/1.0",
            **(headers or {}),
        }
        body = data
        if json_body is not None:
            body = json.dumps(json_body, ensure_ascii=False).encode("utf-8")
            request_headers["Content-Type"] = "application/json"
        request = Request(url, data=body, headers=request_headers, method=method)
        opener = self.opener if follow_redirects else self.no_redirect_opener
        try:
            with opener.open(request, timeout=TIMEOUT) as raw:
                response = Response(raw.status, raw.read(), raw.headers, raw.geturl())
        except HTTPError as error:
            response = Response(error.code, error.read(), error.headers, error.geturl())
        except URLError as error:
            raise AssertionError(f"{method} {url} 无法连接: {error}") from error

        expected_statuses = (expected,) if isinstance(expected, int) else expected
        if response.status not in expected_statuses:
            excerpt = response.text()[:500].replace("\n", " ")
            raise AssertionError(
                f"{method} {url} 预期状态 {expected_statuses}，实际 {response.status}: {excerpt}"
            )
        return response

    def api(
        self,
        method: str,
        path: str,
        *,
        json_body: Any | None = None,
        expected: int | tuple[int, ...] = 200,
        csrf: bool = False,
    ) -> Any:
        headers: dict[str, str] = {}
        if csrf:
            if not self.csrf_token:
                self.refresh_csrf()
            headers[self.csrf_header] = self.csrf_token or ""
        response = self.request(method, path, json_body=json_body, headers=headers, expected=expected)
        payload = response.json()
        if response.status < 400:
            require(isinstance(payload, dict) and payload.get("success") is True, f"{path} 未返回成功 API 响应")
        return payload

    def login(self) -> None:
        body = urlencode({"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}).encode("utf-8")
        response = self.request(
            "POST",
            "/api/auth/login",
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            expected=200,
        )
        require(response.json().get("success") is True, "管理员登录返回失败")
        self.refresh_csrf()

    def refresh_csrf(self) -> None:
        payload = self.api("GET", "/api/auth/csrf")
        self.csrf_token = payload["data"]["token"]
        self.csrf_header = payload["data"].get("headerName", "X-XSRF-TOKEN")

    def logout(self) -> None:
        self.request("POST", "/api/auth/logout", expected=200)
        self.csrf_token = None

    def multipart_upload(self, path: str, filename: str, content_type: str, content: bytes) -> Any:
        if not self.csrf_token:
            self.refresh_csrf()
        boundary = f"----MonsterSmoke{uuid.uuid4().hex}"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode("ascii") + content + f"\r\n--{boundary}--\r\n".encode("ascii")
        response = self.request(
            "POST",
            path,
            data=body,
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                self.csrf_header: self.csrf_token,
            },
            expected=201,
        )
        payload = response.json()
        require(payload.get("success") is True, "媒体上传未返回成功 API 响应")
        return payload


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def log(message: str) -> None:
    print(f"[smoke] {message}", flush=True)


def wait_for_stack(client: Client, attempts: int = 45) -> None:
    for attempt in range(1, attempts + 1):
        try:
            payload = client.api("GET", "/api/health")
            health = payload.get("data")
            if health == "ok" or (isinstance(health, dict) and health.get("status") == "UP"):
                log("应用健康检查通过")
                return
        except Exception as error:  # stack startup retry
            if attempt == attempts:
                raise
            log(f"等待服务启动 ({attempt}/{attempts}): {error}")
        time.sleep(2)
    raise AssertionError("应用未在预期时间内就绪")


def find_message(client: Client, subject: str) -> dict[str, Any] | None:
    payload = client.api("GET", "/api/admin/messages?size=100")
    return next((item for item in payload["data"]["items"] if item["subject"] == subject), None)


def find_note_node(tree: list[dict[str, Any]], note_id: str) -> dict[str, Any] | None:
    for node in tree:
        if node.get("id") == note_id:
            return node
        nested = find_note_node(node.get("children") or [], note_id)
        if nested is not None:
            return nested
    return None


def main() -> int:
    client = Client()
    token = f"smoke-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    post_id = note_id = note_child_id = note_root_id = project_id = media_id = message_id = None
    original_settings: dict[str, Any] | None = None
    logged_in = False

    post_slug = f"{token}-post"
    note_slug = f"{token}-note"
    note_child_slug = f"{token}-note-child"
    note_root_slug = f"{token}-note-root"
    project_slug = f"{token}-project"
    old_tag = f"tag-{token}"
    new_tag = f"tag-renamed-{token}"
    series = f"series-{token}"
    category = f"category-{token}"
    technology = f"tech-{token}"
    contact_subject = f"Contact {token}"

    try:
        wait_for_stack(client)

        public_pages = [
            "/", "/about", "/blog", "/notes", "/projects", "/resume", "/uses", "/links",
            "/search", "/contact", "/lab", "/rss.xml", "/sitemap.xml", "/robots.txt",
            *[f"/lab/{tool}" for tool in ("json", "base64", "url", "regex", "timestamp", "uuid", "markdown", "jwt", "diff", "cron")],
        ]
        for path in public_pages:
            response = client.request("GET", path, expected=200)
            require(len(response.body) > 0, f"公共页面 {path} 返回空响应")
        log(f"{len(public_pages)} 个公共页面可访问")

        admin_redirect = client.request("GET", "/admin", expected=(302, 303, 307, 308), follow_redirects=False)
        require("/admin/login" in (admin_redirect.headers.get("Location") or ""), "未登录 /admin 未跳转登录页")
        client.request("GET", "/api/admin/dashboard", expected=401)
        client.request("GET", "/actuator/health", expected=404)
        log("管理页面服务端保护、管理 API 权限和 Actuator 隔离通过")

        client.api("POST", "/api/contact", json_body={
            "name": "Smoke Tester",
            "email": "smoke@example.com",
            "subject": contact_subject,
            "message": f"Integration smoke message {token}",
        }, expected=201)
        view_payload = client.api("POST", "/api/analytics/page-view", json_body={"path": f"/smoke/{token}"})
        require(isinstance(view_payload["data"], bool), "访问统计上报未返回布尔值")
        log("联系表单与访问统计上报通过")

        client.login()
        logged_in = True
        me = client.api("GET", "/api/auth/me")
        require(me["data"].get("authenticated") is True, "登录后 /api/auth/me 未认证")
        require(me["data"].get("username") == ADMIN_USERNAME, "管理员用户名不匹配")
        client.request("GET", "/admin", expected=200)
        log("Session 登录、CSRF 获取和登录后后台 SSR 访问通过")

        post_payload = {
            "title": f"Smoke Post {token}", "slug": post_slug, "summary": f"Summary {token}",
            "content": f"# Smoke Post\n\nSearch marker {token}", "coverImageUrl": None,
            "tags": [old_tag], "series": series, "status": "DRAFT", "featured": False,
        }
        created_post = client.api("POST", "/api/admin/posts", json_body=post_payload, expected=201, csrf=True)["data"]
        post_id = created_post["id"]
        client.request("GET", f"/api/posts/{post_slug}", expected=404)
        published = client.api("POST", f"/api/admin/posts/{post_id}/publish", csrf=True)["data"]
        require(published["status"] == "PUBLISHED", "文章发布状态不正确")
        public_post = client.api("GET", f"/api/posts/{post_slug}")["data"]
        require(public_post["slug"] == post_slug, "已发布文章无法公开读取")
        search = client.api("GET", f"/api/search?q={token}")["data"]
        require(any(item["slug"] == post_slug for item in search), "搜索未找到已发布测试文章")
        log("文章草稿隔离、发布、公开读取和搜索通过")

        note_payload = {
            "title": f"Smoke Note {token}", "slug": note_slug, "summary": f"Note summary {token}",
            "content": f"# Smoke Note\n\n## Parent Section\n\n{token}", "category": category,
            "tags": [old_tag], "status": "PUBLISHED", "parentId": None, "sortOrder": 0,
        }
        created_note = client.api("POST", "/api/admin/notes", json_body=note_payload, expected=201, csrf=True)["data"]
        note_id = created_note["id"]

        child_payload = {
            "title": f"Smoke Child Note {token}", "slug": note_child_slug, "summary": f"Child summary {token}",
            "content": f"# Smoke Child Note\n\n## Child Section\n\n### Nested Heading\n\n{token}",
            "category": category, "tags": [], "status": "PUBLISHED", "parentId": note_id, "sortOrder": 0,
        }
        created_child = client.api("POST", "/api/admin/notes", json_body=child_payload, expected=201, csrf=True)["data"]
        note_child_id = created_child["id"]

        root_payload = {
            "title": f"Smoke Root Note {token}", "slug": note_root_slug, "summary": f"Root summary {token}",
            "content": f"# Smoke Root Note\n\n## Root Section\n\n{token}",
            "category": None, "tags": [], "status": "PUBLISHED", "parentId": None, "sortOrder": 99,
        }
        created_root = client.api("POST", "/api/admin/notes", json_body=root_payload, expected=201, csrf=True)["data"]
        note_root_id = created_root["id"]

        admin_tree = client.api("GET", "/api/admin/notes/tree")["data"]
        parent_node = find_note_node(admin_tree, note_id)
        child_node = find_note_node(admin_tree, note_child_id)
        require(parent_node is not None and any(child["id"] == note_child_id for child in parent_node["children"]), "Admin note tree did not preserve parent-child structure")
        require(child_node is not None and child_node["parentId"] == note_id, "Child note parentId is incorrect")

        public_tree = client.api("GET", "/api/notes/tree")["data"]
        public_parent = find_note_node(public_tree, note_id)
        require(public_parent is not None and any(child["id"] == note_child_id for child in public_parent["children"]), "Public note tree did not return published hierarchy")

        client.api("PATCH", f"/api/admin/notes/{note_root_id}/move", json_body={"parentId": None, "position": 0}, csrf=True)
        reordered_tree = client.api("GET", "/api/admin/notes/tree")["data"]
        require(reordered_tree[0]["id"] == note_root_id, "Root note reorder result is incorrect")

        cycle_response = client.api(
            "PATCH", f"/api/admin/notes/{note_id}/move",
            json_body={"parentId": note_child_id, "position": 0}, expected=400, csrf=True,
        )
        require(cycle_response.get("error", {}).get("code") == "BAD_REQUEST", "Server did not reject cyclic hierarchy")
        client.api("DELETE", f"/api/admin/notes/{note_id}", expected=400, csrf=True)

        require(client.api("GET", f"/api/notes/{note_slug}")["data"]["slug"] == note_slug, "Parent note is not publicly readable")
        child_page = client.request("GET", f"/notes/{note_child_slug}", expected=200).text()
        require(f"Smoke Note {token}" in child_page and f"Smoke Child Note {token}" in child_page, "Note page did not render the knowledge tree")
        require('id="child-section"' in child_page and 'href="#child-section"' in child_page, "Note page did not generate heading TOC anchors")
        log("Knowledge hierarchy, reorder, cycle protection, and page TOC passed")

        project_payload = {
            "name": f"Smoke Project {token}", "slug": project_slug, "summary": f"Project summary {token}",
            "description": f"Project description {token}", "techStack": [technology], "status": "EXPERIMENTAL",
            "repoUrl": None, "demoUrl": None, "imageUrl": None, "featured": False,
            "startDate": "2026-07-18", "endDate": None,
        }
        created_project = client.api("POST", "/api/admin/projects", json_body=project_payload, expected=201, csrf=True)["data"]
        project_id = created_project["id"]
        require(client.api("GET", f"/api/projects/{project_slug}")["data"]["slug"] == project_slug, "测试项目无法公开读取")
        log("笔记和项目的创建及公开读取通过")

        taxonomy = client.api("GET", "/api/admin/taxonomy")["data"]
        tag_item = next((item for item in taxonomy["tags"] if item["name"] == old_tag), None)
        require(tag_item is not None and tag_item["usageCount"] == 2, "标签引用汇总不正确")
        require(any(item["name"] == series for item in taxonomy["series"]), "文章系列未汇总")
        require(any(item["name"] == category for item in taxonomy["categories"]), "笔记分类未汇总")
        require(any(item["name"] == technology for item in taxonomy["technologies"]), "项目技术栈未汇总")
        renamed = client.api("PATCH", "/api/admin/taxonomy/tags", json_body={"from": old_tag, "to": new_tag}, csrf=True)["data"]
        require(any(item["name"] == new_tag and item["usageCount"] == 2 for item in renamed["tags"]), "标签重命名未同步引用")
        client.api("DELETE", f"/api/admin/taxonomy/tags?name={new_tag}", csrf=True)
        log("标签、系列、分类与技术栈汇总、重命名和移除通过")

        settings_response = client.api("GET", "/api/admin/settings")
        original_settings = settings_response["data"]
        changed_settings = dict(original_settings)
        changed_settings["footerText"] = f"Smoke footer {token}"
        saved_settings = client.api("PATCH", "/api/admin/settings", json_body=changed_settings, csrf=True)["data"]
        require(saved_settings["footerText"] == changed_settings["footerText"], "网站设置保存失败")
        client.api("PATCH", "/api/admin/settings", json_body=original_settings, csrf=True)
        original_settings = None
        analytics = client.api("GET", "/api/admin/analytics?days=30")["data"]
        require(analytics["totalViews"] >= 1, "后台访问统计未包含测试上报")
        log("网站设置保存/恢复和统计查询通过")

        png = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000d49444154789c63606060f80f0001040100b5d1c4f40000000049454e44ae426082"
        )
        uploaded = client.multipart_upload("/api/admin/media", f"{token}.png", "image/png", png)["data"]
        media_id = uploaded["id"]
        media_response = client.request("GET", uploaded["url"], expected=200)
        require(media_response.body.startswith(b"\x89PNG\r\n\x1a\n"), "上传后的 PNG 内容不正确")
        client.api("DELETE", f"/api/admin/media/{media_id}", csrf=True)
        media_id = None
        log("媒体上传、公开读取和删除通过")

        message = find_message(client, contact_subject)
        require(message is not None, "后台未找到测试联系消息")
        message_id = message["id"]
        updated_message = client.api("PATCH", f"/api/admin/messages/{message_id}", json_body={"status": "READ"}, csrf=True)["data"]
        require(updated_message["status"] == "READ", "联系消息状态更新失败")
        client.api("DELETE", f"/api/admin/messages/{message_id}", csrf=True)
        message_id = None
        log("联系消息查询、状态更新和删除通过")

        audit = client.api("GET", "/api/admin/audit-logs?size=100")["data"]["items"]
        require(any(item["resourceType"] == "posts" and item["action"].startswith("POST") for item in audit), "审计日志缺少文章写操作")
        require(any(item["resourceType"] == "taxonomy" and item["action"].startswith("PATCH") for item in audit), "审计日志缺少标签重命名操作")
        require(any(item["resourceType"] == "media" and item["action"].startswith("POST") for item in audit), "审计日志缺少媒体上传操作")
        log("审计日志记录通过")

        client.api("DELETE", f"/api/admin/posts/{post_id}", csrf=True); post_id = None
        client.api("DELETE", f"/api/admin/notes/{note_child_id}", csrf=True); note_child_id = None
        client.api("DELETE", f"/api/admin/notes/{note_id}", csrf=True); note_id = None
        client.api("DELETE", f"/api/admin/notes/{note_root_id}", csrf=True); note_root_id = None
        client.api("DELETE", f"/api/admin/projects/{project_id}", csrf=True); project_id = None

        client.logout()
        logged_in = False
        me_after_logout = client.api("GET", "/api/auth/me")
        require(me_after_logout["data"].get("authenticated") is False, "退出后会话仍处于认证状态")
        client.request("GET", "/api/admin/dashboard", expected=401)
        log("退出登录和权限回收通过")

        log("全部集成冒烟测试通过")
        return 0
    except Exception as error:
        print(f"[smoke] FAILED: {error}", file=sys.stderr, flush=True)
        return_code = 1
    finally:
        if any((post_id, note_id, note_child_id, note_root_id, project_id, media_id, message_id, original_settings)):
            log("开始清理未完成的测试数据")
            try:
                if not logged_in:
                    client.login()
                    logged_in = True
                if media_id:
                    client.api("DELETE", f"/api/admin/media/{media_id}", csrf=True)
                if message_id:
                    client.api("DELETE", f"/api/admin/messages/{message_id}", csrf=True)
                if post_id:
                    client.api("DELETE", f"/api/admin/posts/{post_id}", csrf=True)
                if note_child_id:
                    client.api("DELETE", f"/api/admin/notes/{note_child_id}", csrf=True)
                if note_id:
                    client.api("DELETE", f"/api/admin/notes/{note_id}", csrf=True)
                if note_root_id:
                    client.api("DELETE", f"/api/admin/notes/{note_root_id}", csrf=True)
                if project_id:
                    client.api("DELETE", f"/api/admin/projects/{project_id}", csrf=True)
                if original_settings is not None:
                    client.api("PATCH", "/api/admin/settings", json_body=original_settings, csrf=True)
            except Exception as cleanup_error:
                print(f"[smoke] 清理警告: {cleanup_error}", file=sys.stderr, flush=True)
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
