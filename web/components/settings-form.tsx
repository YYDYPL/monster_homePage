"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminGet, adminMutation, type SiteConfig } from "@/lib/admin-api";

const empty: SiteConfig = { siteName: "", siteDescription: "", ownerName: "", headline: "", location: "", email: "", githubUrl: "", linkedinUrl: "", xUrl: "", footerText: "", icpNumber: "", publicSecurityNumber: "" };
const fields: { key: keyof SiteConfig; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: "siteName", label: "站点名称", placeholder: "Monster" },
  { key: "ownerName", label: "显示名称", placeholder: "你的名字" },
  { key: "headline", label: "个人定位", placeholder: "计算机专业 · Java / Web / 系统工程", wide: true },
  { key: "siteDescription", label: "站点描述", placeholder: "用于 SEO 与站点介绍", wide: true },
  { key: "location", label: "所在地区", placeholder: "China" },
  { key: "email", label: "公开邮箱", placeholder: "hello@example.com" },
  { key: "githubUrl", label: "GitHub", placeholder: "https://github.com/...", wide: true },
  { key: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/in/...", wide: true },
  { key: "xUrl", label: "X / Twitter", placeholder: "https://x.com/...", wide: true },
  { key: "footerText", label: "页脚短句", placeholder: "Build · Learn · Share", wide: true },
  { key: "icpNumber", label: "ICP备案号", placeholder: "某ICP备XXXXXXXX号" },
  { key: "publicSecurityNumber", label: "公安备案号", placeholder: "某公网安备XXXXXXXXXXXXXX号" },
];

export function SettingsForm() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    adminGet<SiteConfig>("/api/admin/settings")
      .then((response) => { if (active) setForm(response.data); })
      .catch((reason) => { if (active) setMessage(reason instanceof Error ? reason.message : "设置加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await adminMutation<SiteConfig>("/api/admin/settings", { method: "PATCH", body: JSON.stringify(form) });
      setForm(response.data);
      setMessage("网站设置已保存。公共页面会在下次请求时读取新配置。");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return <>
    <div className="admin-heading"><div><h1>网站设置</h1><p>维护个人资料、SEO 描述、社交入口和中国大陆备案信息。</p></div></div>
    {message && <p className="admin-notice">{message}</p>}
    <form className="admin-panel editor-panel" onSubmit={submit}>
      {loading ? <div className="empty-state">正在读取网站设置…</div> : <div className="editor-grid">{fields.map((field) => <div className={`form-field ${field.wide ? "span-2" : ""}`} key={field.key}><label htmlFor={field.key}>{field.label}</label>{field.key === "siteDescription" ? <textarea className="form-control settings-textarea" id={field.key} value={form[field.key]} placeholder={field.placeholder} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}/> : <input className="form-control" id={field.key} type={field.key === "email" ? "email" : "text"} value={form[field.key]} placeholder={field.placeholder} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}/>}</div>)}</div>}
      <div className="settings-hint"><strong>部署提示</strong><span>域名和 HTTPS 仍通过服务器 `.env` 与 Caddy 配置管理；这里保存的是可公开展示的站点资料。</span></div>
      <div className="editor-actions"><button className="button primary small" disabled={loading || saving} type="submit">{saving ? "保存中…" : "保存设置"}</button></div>
    </form>
  </>;
}
