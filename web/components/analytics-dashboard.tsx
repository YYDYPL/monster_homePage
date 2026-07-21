"use client";

import { useEffect, useMemo, useState } from "react";
import { adminGet, type AnalyticsData, type AnalyticsDimension, type AnalyticsMetric } from "@/lib/admin-api";

const emptyMetric: AnalyticsMetric = { pv: 0, uv: 0, uip: 0 };
const empty: AnalyticsData = {
  startDate: "",
  endDate: "",
  days: 30,
  totals: emptyMetric,
  today: emptyMetric,
  timeline: [],
  topPaths: [],
  regions: [],
  browsers: [],
  devices: [],
  networks: [],
};

const number = (value: number) => value.toLocaleString("zh-CN");

function metricCards(data: AnalyticsData) {
  return [
    ["PV 页面浏览", data.totals.pv, "选定时间范围内的页面浏览次数"],
    ["UV 独立访客", data.totals.uv, "按匿名访客标识去重"],
    ["UIP 独立 IP", data.totals.uip, "按匿名 IP 哈希去重"],
    ["今日 PV", data.today.pv, "今天（北京时间）"],
    ["今日 UV", data.today.uv, "今天的独立访客"],
  ] as const;
}

function chartPath(values: number[], max: number, width: number, height: number, padding: number) {
  if (!values.length) return "";
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  return values.map((value, index) => {
    const x = padding + (values.length === 1 ? innerWidth / 2 : index / (values.length - 1) * innerWidth);
    const y = padding + innerHeight - value / max * innerHeight;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function DistributionPanel({ title, items }: { title: string; items: AnalyticsDimension[] }) {
  const max = Math.max(1, ...items.map((item) => item.pv));
  return (
    <section className="admin-panel analytics-distribution-panel">
      <div className="panel-head"><h2>{title}</h2><span>按 PV 排序</span></div>
      {items.length === 0 ? <div className="empty-state">暂无数据</div> : (
        <div className="distribution-list">
          {items.map((item) => (
            <div className="distribution-row" key={item.name}>
              <div className="distribution-label"><strong>{item.name}</strong><small>PV {number(item.pv)} · UV {number(item.uv)} · UIP {number(item.uip)}</small></div>
              <div className="distribution-track"><i style={{ width: `${Math.max(3, item.pv / max * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TimelineChart({ data }: { data: AnalyticsData }) {
  const width = 900;
  const height = 285;
  const padding = 34;
  const max = Math.max(1, ...data.timeline.flatMap((item) => [item.pv, item.uv, item.uip]));
  const pvPath = chartPath(data.timeline.map((item) => item.pv), max, width, height, padding);
  const uvPath = chartPath(data.timeline.map((item) => item.uv), max, width, height, padding);
  const uipPath = chartPath(data.timeline.map((item) => item.uip), max, width, height, padding);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  return (
    <div className="analytics-line-chart">
      <div className="analytics-chart-legend"><span className="legend-pv">PV</span><span className="legend-uv">UV</span><span className="legend-uip">UIP</span><em>单位：次数</em></div>
      {data.timeline.length === 0 ? <div className="empty-state">暂无访问数据</div> : (
        <div className="analytics-chart-scroll">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="PV、UV、UIP 趋势图" preserveAspectRatio="none">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + innerHeight - ratio * innerHeight;
              return <line key={ratio} x1={padding} x2={width - padding} y1={y} y2={y} className="chart-grid-line" />;
            })}
            <path d={pvPath} className="analytics-line analytics-line-pv" />
            <path d={uvPath} className="analytics-line analytics-line-uv" />
            <path d={uipPath} className="analytics-line analytics-line-uip" />
            {data.timeline.map((item, index) => {
              const x = padding + (data.timeline.length === 1 ? innerWidth / 2 : index / (data.timeline.length - 1) * innerWidth);
              const y = padding + innerHeight - item.pv / max * innerHeight;
              return <circle key={item.period} cx={x} cy={y} r="3" className="analytics-point-pv"><title>{`${item.period}：PV ${item.pv}，UV ${item.uv}，UIP ${item.uip}`}</title></circle>;
            })}
          </svg>
          <div className="analytics-chart-labels">{data.timeline.map((item) => <span key={item.period}>{item.period.slice(5)}</span>)}</div>
        </div>
      )}
    </div>
  );
}

export function AnalyticsDashboard() {
  const [data, setData] = useState(empty);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    adminGet<AnalyticsData>(`/api/admin/analytics?days=${days}`)
      .then((response) => { if (active) setData(response.data); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "统计数据加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days]);

  const cards = useMemo(() => metricCards(data), [data]);
  const maxPath = Math.max(1, ...data.topPaths.map((item) => item.views));
  const changeDays = (value: number) => {
    setError("");
    setLoading(true);
    setDays(value);
  };

  return <>
    <div className="admin-heading analytics-heading">
      <div><h1>访问统计</h1><p>统计公开页面的 PV、UV、UIP，以及地域、浏览器、设备和网络分布。</p></div>
      <label className="analytics-range">时间范围
        <select value={days} onChange={(event) => changeDays(Number(event.target.value))}>
          <option value="7">最近 7 天</option><option value="30">最近 30 天</option><option value="90">最近 90 天</option><option value="180">最近 180 天</option><option value="365">最近 365 天</option>
        </select>
      </label>
    </div>
    {error && <p className="admin-notice error">{error}</p>}
    <section className="dashboard-cards analytics-cards">
      {cards.map(([label, value, hint]) => <div className="metric-card" key={label}><span>{label}</span><strong>{loading ? "?" : number(value)}</strong><small>{hint}</small><i /></div>)}
    </section>

    <section className="admin-panel analytics-trend-panel">
      <div className="panel-head"><h2>访问趋势</h2><span>{data.startDate || "?"} 至 {data.endDate || "?"} · 按北京时间统计</span></div>
      <TimelineChart data={data} />
    </section>

    <div className="analytics-distribution-grid">
      <DistributionPanel title="地域分布" items={data.regions} />
      <DistributionPanel title="浏览器分布" items={data.browsers} />
      <DistributionPanel title="设备分布" items={data.devices} />
      <DistributionPanel title="网络分布" items={data.networks} />
    </div>

    <section className="admin-panel analytics-path-panel">
      <div className="panel-head"><h2>热门页面</h2><span>当前时间范围内按 PV 排序</span></div>
      {data.topPaths.length === 0 ? <div className="empty-state">暂无页面访问数据</div> : <div className="path-ranking">{data.topPaths.map((item, index) => <div className="path-row" key={item.path}><b>{String(index + 1).padStart(2, "0")}</b><span><strong>{item.path}</strong><i style={{ width: `${Math.max(3, item.views / maxPath * 100)}%` }} /></span><em>{number(item.views)}</em></div>)}</div>}
    </section>
  </>;
}
