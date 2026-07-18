"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminGet, adminMutation, type AdminUserItem } from "@/lib/admin-api";

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ id: "", username: "", password: "", role: "ADMIN", enabled: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const response = await adminGet<AdminUserItem[]>("/api/admin/users");
      setUsers(response.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm({ id: "", username: "", password: "", role: "ADMIN", enabled: true });
    setEditing(true);
    setMessage("");
  }

  function openEdit(user: AdminUserItem) {
    setForm({ id: user.id, username: user.username, password: "", role: user.role, enabled: user.enabled });
    setEditing(true);
    setMessage("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.username) { setMessage("请输入用户名"); return; }
    if (!form.id && !form.password) { setMessage("请输入密码"); return; }
    setSaving(true);
    setMessage("");
    try {
      const body = JSON.stringify({
        username: form.username,
        password: form.password || undefined,
        role: form.role,
        enabled: form.enabled,
      });
      if (form.id) {
        await adminMutation<AdminUserItem>(`/api/admin/users/${form.id}`, { method: "PATCH", body });
      } else {
        await adminMutation<AdminUserItem>("/api/admin/users", { method: "POST", body });
      }
      setEditing(false);
      await load();
      setMessage(form.id ? "用户已更新" : "用户已创建");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(user: AdminUserItem) {
    try {
      await adminMutation<AdminUserItem>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !user.enabled }),
      });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function remove(user: AdminUserItem) {
    if (!confirm(`确定删除用户「${user.username}」吗？`)) return;
    try {
      await adminMutation<string>(`/api/admin/users/${user.id}`, { method: "DELETE" });
      await load();
      setMessage("用户已删除");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败");
    }
  }

  return <>
    <div className="admin-heading">
      <div><h1>用户管理</h1><p>管理可登录后台的管理员账号。</p></div>
      <button className="button primary small" onClick={openNew}>添加用户</button>
    </div>
    {message && <p className={`admin-notice ${message.includes("失败") ? "error" : ""}`}>{message}</p>}
    {editing && <form className="admin-panel" style={{ marginBottom: 22 }} onSubmit={save}>
      <div className="panel-head" style={{ margin: "-22px -22px 22px" }}>
        <h2>{form.id ? "编辑用户" : "添加用户"}</h2>
        <button className="button small" type="button" onClick={() => setEditing(false)}>关闭</button>
      </div>
      <div className="editor-grid">
        <div className="form-field"><label>用户名</label><input className="form-control" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
        <div className="form-field"><label>{form.id ? "新密码（留空不修改）" : "密码"}</label><input className="form-control" type="password" required={!form.id} minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
        <div className="form-field"><label>角色</label><select className="form-control" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}><option>ADMIN</option></select></div>
      </div>
      <div className="editor-actions">
        <button className="button small" type="button" onClick={() => setEditing(false)}>取消</button>
        <button className="button primary small" type="submit" disabled={saving}>{saving ? "保存中…" : "保存"}</button>
      </div>
    </form>}
    <section className="admin-panel">
      <div className="panel-head"><h2>全部账号</h2><span style={{ color: "var(--text-3)", fontSize: 12 }}>{users.length} 个用户</span></div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>用户名</th><th>角色</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5}>正在加载…</td></tr> :
              users.length === 0 ? <tr><td colSpan={5}>暂无用户。</td></tr> :
                users.map(user => <tr key={user.id}>
                  <td><strong>{user.username}</strong></td>
                  <td><span className="status-badge">{user.role}</span></td>
                  <td><span className={`status-badge ${user.enabled ? "published" : "archived"}`}>{user.enabled ? "启用" : "禁用"}</span></td>
                  <td>{new Date(user.createdAt).toLocaleDateString("zh-CN")}</td>
                  <td><div className="table-actions">
                    <button onClick={() => openEdit(user)}>编辑</button>
                    <button onClick={() => toggleEnabled(user)}>{user.enabled ? "禁用" : "启用"}</button>
                    <button onClick={() => remove(user)}>删除</button>
                  </div></td>
                </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </>;
}
