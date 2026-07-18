"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/admin-api";

const nav = [
  { href: "/admin", label: "仪表盘", icon: "01" },
  { href: "/admin/posts", label: "文章管理", icon: "02" },
  { href: "/admin/notes", label: "笔记管理", icon: "03" },
  { href: "/admin/projects", label: "项目管理", icon: "04" },
  { href: "/admin/tags", label: "标签管理", icon: "05" },
  { href: "/admin/series", label: "系列与分类", icon: "06" },
  { href: "/admin/media", label: "媒体资源", icon: "07" },
  { href: "/admin/messages", label: "联系消息", icon: "08" },
  { href: "/admin/analytics", label: "访问统计", icon: "09" },
  { href: "/admin/settings", label: "网站设置", icon: "10" },
  { href: "/admin/audit-logs", label: "审计日志", icon: "11" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getCurrentUser().then((response) => {
      if (!response.data.authenticated) {
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      setUsername(response.data.username || "admin");
      setReady(true);
    }).catch(() => router.replace("/admin/login"));
  }, [pathname, router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  }

  if (!ready) return <div className="admin-loading"><span>正在验证管理会话…</span></div>;

  return <div className="admin-layout">
    <aside className="admin-sidebar">
      <Link className="brand" href="/admin">
        <span className="brand-mark">M</span>
        <span className="brand-copy"><strong>MONSTER</strong><small>CONTROL PANEL</small></span>
      </Link>
      <nav className="admin-nav">
        {nav.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return <Link className={active ? "active" : ""} href={item.href} key={item.href}><span>{item.icon}</span>{item.label}</Link>;
        })}
      </nav>
      <div className="admin-user"><strong>{username}</strong><small>站点管理员</small><button onClick={logout}>退出登录 →</button></div>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar"><strong>内容管理系统</strong><span>{new Intl.DateTimeFormat("zh-CN", { dateStyle: "long" }).format(new Date())}</span></header>
      <main className="admin-content">{children}</main>
    </div>
  </div>;
}
