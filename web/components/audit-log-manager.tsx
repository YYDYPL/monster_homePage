"use client";

import { useCallback, useEffect, useState } from "react";
import { adminGet, type AuditLogItem } from "@/lib/admin-api";
import type { PageResponse } from "@/lib/api";

const pageSize = 30;

export function AuditLogManager() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PageResponse<AuditLogItem>>({ items: [], page: 1, size: pageSize, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminGet<PageResponse<AuditLogItem>>(`/api/admin/audit-logs?page=${page}&size=${pageSize}`);
      setResult(response.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "审计日志加载失败");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    let active = true;
    adminGet<PageResponse<AuditLogItem>>(`/api/admin/audit-logs?page=${page}&size=${pageSize}`)
      .then((response) => { if (active) setResult(response.data); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "????????"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  return <>
    <div className="admin-heading">
      <div><h1>审计日志</h1><p>记录管理接口中成功执行的新增、修改、发布、上传和删除操作。</p></div>
      <button className="button small" type="button" onClick={() => void load()} disabled={loading}>刷新日志</button>
    </div>
    {error && <p className="admin-notice error">{error}</p>}
    <section className="admin-panel audit-panel">
      <div className="panel-head">
        <div><h2>操作记录</h2><p>用于追踪后台变更；日志只读，不提供在线清除功能。</p></div>
        <span>{result.total.toLocaleString("zh-CN")} 条</span>
      </div>
      {loading ? <div className="empty-state">正在加载审计日志…</div> : result.items.length === 0 ? <div className="empty-state"><strong>暂无操作记录</strong><span>执行一次内容保存或设置更新后会生成日志。</span></div> : <div className="audit-table-wrap">
        <table className="audit-table">
          <thead><tr><th>时间</th><th>管理员</th><th>操作</th><th>资源</th><th>来源 IP</th></tr></thead>
          <tbody>{result.items.map((item) => <tr key={item.id}>
            <td><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("zh-CN")}</time></td>
            <td><strong>{item.username || "admin"}</strong></td>
            <td><code>{item.action}</code></td>
            <td>{item.resourceType ? <span className="audit-resource">{item.resourceType}{item.resourceId ? ` / ${item.resourceId}` : ""}</span> : "—"}</td>
            <td><code>{item.ipAddress || "—"}</code></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <div className="admin-pagination">
        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>← 上一页</button>
        <span>第 {result.page || page} / {Math.max(1, result.totalPages)} 页</span>
        <button type="button" disabled={page >= result.totalPages || loading || result.totalPages === 0} onClick={() => setPage((value) => value + 1)}>下一页 →</button>
      </div>
    </section>
  </>;
}
