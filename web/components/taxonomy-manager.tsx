"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminGet,
  adminMutation,
  type TaxonomyItem,
  type TaxonomyKind,
  type TaxonomySummary,
} from "@/lib/admin-api";

type TaxonomySection = {
  kind: TaxonomyKind;
  title: string;
  description: string;
};

type TaxonomyManagerProps = {
  title: string;
  description: string;
  sections: TaxonomySection[];
};

const empty: TaxonomySummary = { tags: [], series: [], categories: [], technologies: [] };

export function TaxonomyManager({ title, description, sections }: TaxonomyManagerProps) {
  const [data, setData] = useState<TaxonomySummary>(empty);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminGet<TaxonomySummary>("/api/admin/taxonomy");
      setData(response.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "分类数据加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    adminGet<TaxonomySummary>("/api/admin/taxonomy")
      .then((response) => { if (active) setData(response.data); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "加载分类失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totalItems = useMemo(
    () => sections.reduce((sum, section) => sum + data[section.kind].length, 0),
    [data, sections],
  );

  async function rename(kind: TaxonomyKind, item: TaxonomyItem) {
    const nextName = window.prompt(`将“${item.name}”重命名为：`, item.name)?.trim();
    if (!nextName || nextName === item.name) return;
    const key = `${kind}:${item.name}`;
    setBusyKey(key);
    setError("");
    setNotice("");
    try {
      const response = await adminMutation<TaxonomySummary>(`/api/admin/taxonomy/${kind}`, {
        method: "PATCH",
        body: JSON.stringify({ from: item.name, to: nextName }),
      });
      setData(response.data);
      setNotice(`已将“${item.name}”重命名为“${nextName}”，所有内容引用已同步更新。`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "重命名失败");
    } finally {
      setBusyKey("");
    }
  }

  async function remove(kind: TaxonomyKind, item: TaxonomyItem) {
    const confirmed = window.confirm(
      `确定移除“${item.name}”吗？\n\n该名称当前被 ${item.usageCount} 条内容引用。操作会从这些内容中移除引用，但不会删除文章、笔记或项目。`,
    );
    if (!confirmed) return;
    const key = `${kind}:${item.name}`;
    setBusyKey(key);
    setError("");
    setNotice("");
    try {
      const response = await adminMutation<TaxonomySummary>(
        `/api/admin/taxonomy/${kind}?name=${encodeURIComponent(item.name)}`,
        { method: "DELETE" },
      );
      setData(response.data);
      setNotice(`已移除“${item.name}”及其内容引用。`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "删除失败");
    } finally {
      setBusyKey("");
    }
  }

  return <>
    <div className="admin-heading">
      <div><h1>{title}</h1><p>{description}</p></div>
      <button className="button small" type="button" onClick={() => void load()} disabled={loading}>刷新数据</button>
    </div>
    {error && <p className="admin-notice error">{error}</p>}
    {notice && <p className="admin-notice success">{notice}</p>}
    <div className="taxonomy-summary">
      <span>当前共维护</span><strong>{loading ? "—" : totalItems}</strong><span>个名称</span>
      <small>名称从内容中自动汇总；请在文章、笔记或项目编辑器中添加新名称。</small>
    </div>
    <div className="taxonomy-grid">
      {sections.map((section) => {
        const items = data[section.kind];
        return <section className="admin-panel taxonomy-panel" key={section.kind}>
          <div className="panel-head">
            <div><h2>{section.title}</h2><p>{section.description}</p></div>
            <span>{items.length} 项</span>
          </div>
          {loading ? <div className="empty-state">正在加载…</div> : items.length === 0 ? <div className="empty-state"><strong>暂无数据</strong><span>保存包含该字段的内容后会自动出现。</span></div> : <div className="taxonomy-list">
            {items.map((item) => {
              const busy = busyKey === `${section.kind}:${item.name}`;
              return <div className="taxonomy-row" key={item.name}>
                <div><strong>{item.name}</strong><small>{item.usageCount} 条内容引用</small></div>
                <div className="taxonomy-actions">
                  <button type="button" onClick={() => void rename(section.kind, item)} disabled={busy}>{busy ? "处理中" : "重命名"}</button>
                  <button className="danger" type="button" onClick={() => void remove(section.kind, item)} disabled={busy}>移除</button>
                </div>
              </div>;
            })}
          </div>}
        </section>;
      })}
    </div>
  </>;
}
