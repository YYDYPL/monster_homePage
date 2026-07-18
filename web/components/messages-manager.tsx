"use client";

import { useEffect, useState } from "react";
import { adminGet, adminMutation, type MessageItem, type MessageStatus } from "@/lib/admin-api";
import type { PageResponse } from "@/lib/api";

const labels: Record<MessageStatus, string> = { NEW: "未读", READ: "已读", ARCHIVED: "已归档" };

export function MessagesManager() {
  const [items, setItems] = useState<MessageItem[]>([]);
  const [selected, setSelected] = useState<MessageItem | null>(null);
  const [filter, setFilter] = useState<"ALL" | MessageStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const query = filter === "ALL" ? "" : `&status=${filter}`;
    adminGet<PageResponse<MessageItem>>(`/api/admin/messages?size=100${query}`)
      .then((response) => { if (active) { setItems(response.data.items); setSelected((current) => current && response.data.items.find((item) => item.id === current.id) || null); } })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "消息加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter]);

  async function changeStatus(item: MessageItem, status: MessageStatus) {
    try {
      const response = await adminMutation<MessageItem>(`/api/admin/messages/${item.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setItems((current) => filter !== "ALL" && filter !== status ? current.filter((candidate) => candidate.id !== item.id) : current.map((candidate) => candidate.id === item.id ? response.data : candidate));
      setSelected(response.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "状态更新失败");
    }
  }

  async function remove(item: MessageItem) {
    if (!window.confirm("确定永久删除这条联系消息？")) return;
    try {
      await adminMutation<string>(`/api/admin/messages/${item.id}`, { method: "DELETE" });
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setSelected(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败");
    }
  }

  return <>
    <div className="admin-heading"><div><h1>联系消息</h1><p>查看访客通过联系表单提交的消息，并维护处理状态。</p></div><div className="filter-tabs">{(["ALL", "NEW", "READ", "ARCHIVED"] as const).map((value) => <button className={filter === value ? "active" : ""} onClick={() => { setLoading(true); setFilter(value); }} type="button" key={value}>{value === "ALL" ? "全部" : labels[value]}</button>)}</div></div>
    {error && <p className="admin-notice error">{error}</p>}
    <div className="messages-layout">
      <section className="admin-panel message-list">{loading ? <div className="empty-state">正在加载联系消息…</div> : items.length === 0 ? <div className="empty-state"><strong>当前没有消息</strong><span>新的联系表单提交会出现在这里。</span></div> : items.map((item) => <button className={`message-row ${selected?.id === item.id ? "active" : ""}`} onClick={() => { setSelected(item); if (item.status === "NEW") changeStatus(item, "READ"); }} type="button" key={item.id}><span className={`status-dot ${item.status.toLowerCase()}`}/><span><strong>{item.subject}</strong><small>{item.name} · {new Date(item.createdAt).toLocaleString("zh-CN")}</small></span><i>{labels[item.status]}</i></button>)}</section>
      <section className="admin-panel message-detail">{selected ? <><div className="panel-head"><div><span className={`status-badge ${selected.status.toLowerCase()}`}>{labels[selected.status]}</span><h2>{selected.subject}</h2></div></div><dl><div><dt>发件人</dt><dd>{selected.name}</dd></div><div><dt>邮箱</dt><dd><a href={`mailto:${selected.email}`}>{selected.email}</a></dd></div><div><dt>时间</dt><dd>{new Date(selected.createdAt).toLocaleString("zh-CN")}</dd></div></dl><div className="message-body">{selected.message}</div><div className="editor-actions"><button className="button small" type="button" onClick={() => changeStatus(selected, selected.status === "ARCHIVED" ? "READ" : "ARCHIVED")}>{selected.status === "ARCHIVED" ? "移出归档" : "归档"}</button><button className="button small danger-button" type="button" onClick={() => remove(selected)}>删除</button><a className="button primary small" href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}>邮件回复</a></div></> : <div className="empty-state"><strong>选择一条消息</strong><span>消息正文与处理操作会显示在这里。</span></div>}</section>
    </div>
  </>;
}
