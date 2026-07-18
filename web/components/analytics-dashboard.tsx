"use client";

import { useEffect, useState } from "react";
import { adminGet, type AnalyticsData } from "@/lib/admin-api";

const empty: AnalyticsData = { totalViews: 0, todayViews: 0, last7Days: 0, last30Days: 0, uniqueVisitors30Days: 0, daily: [], topPaths: [] };

export function AnalyticsDashboard() {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    adminGet<AnalyticsData>("/api/admin/analytics?days=30")
      .then((response) => { if (active) setData(response.data); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "统计数据加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const maxDaily = Math.max(1, ...data.daily.map((item) => item.views));
  const maxPath = Math.max(1, ...data.topPaths.map((item) => item.views));
  const metrics = [["今日访问", data.todayViews], ["最近 7 天", data.last7Days], ["最近 30 天", data.last30Days], ["30 天访客", data.uniqueVisitors30Days], ["累计访问", data.totalViews]] as const;

  return <>
    <div className="admin-heading"><div><h1>访问统计</h1><p>不保存原始 IP，仅使用每日轮换哈希进行隐私友好的访问去重。</p></div></div>
    {error && <p className="admin-notice error">{error}</p>}
    <section className="dashboard-cards analytics-cards">{metrics.map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{loading ? "—" : value.toLocaleString("zh-CN")}</strong><i/></div>)}</section>
    <div className="analytics-grid">
      <section className="admin-panel chart-panel"><div className="panel-head"><h2>30 天趋势</h2><span>按自然日统计</span></div>{data.daily.length === 0 ? <div className="empty-state">暂无访问数据</div> : <div className="daily-chart" aria-label="30 天访问趋势">{data.daily.map((item) => <div className="daily-bar" key={item.day} title={`${item.day}: ${item.views}`}><span style={{ height: `${Math.max(6, item.views / maxDaily * 100)}%` }}/><small>{item.day.slice(5)}</small></div>)}</div>}</section>
      <section className="admin-panel chart-panel"><div className="panel-head"><h2>热门页面</h2><span>最近 30 天</span></div>{data.topPaths.length === 0 ? <div className="empty-state">暂无页面排行</div> : <div className="path-ranking">{data.topPaths.map((item, index) => <div className="path-row" key={item.path}><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{item.path}</strong><i style={{ width: `${item.views / maxPath * 100}%` }}/></span><em>{item.views}</em></div>)}</div>}</section>
    </div>
  </>;
}
