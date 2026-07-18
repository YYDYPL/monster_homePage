"use client";

import { useEffect, useState } from "react";
import { adminMutation, adminGet } from "@/lib/admin-api";
import type {
  ProfileAbout, ProfileResume, ProfileUses, ProfileLinks, FullProfile,
  SkillGroup, TimelineEntry, UseGroup, UseItem, LinkEntry, ResumeProjectEntry,
} from "@/lib/profile-api";
import {
  defaultProfileAbout, defaultProfileResume, defaultProfileUses, defaultProfileLinks,
} from "@/lib/profile-api";

type Tab = "about" | "resume" | "uses" | "links";

const tabs: { key: Tab; label: string }[] = [
  { key: "about", label: "关于我" },
  { key: "resume", label: "个人简历" },
  { key: "uses", label: "我的装备" },
  { key: "links", label: "友情链接" },
];

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("about");
  const [about, setAbout] = useState<ProfileAbout>(defaultProfileAbout());
  const [resume, setResume] = useState<ProfileResume>(defaultProfileResume());
  const [uses, setUses] = useState<ProfileUses>(defaultProfileUses());
  const [links, setLinks] = useState<ProfileLinks>(defaultProfileLinks());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    adminGet<FullProfile>("/api/profile?t=" + Date.now())
      .then((r) => {
        if (r.data.about) setAbout(r.data.about);
        if (r.data.resume) setResume(r.data.resume);
        if (r.data.uses) setUses(r.data.uses);
        if (r.data.links) setLinks(r.data.links);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveAbout() { await save("about", about, "/api/admin/profile/about"); }
  async function saveResume() { await save("resume", resume, "/api/admin/profile/resume"); }
  async function saveUses() { await save("uses", uses, "/api/admin/profile/uses"); }
  async function saveLinks() { await save("links", links, "/api/admin/profile/links"); }

  async function save(section: string, data: unknown, url: string) {
    setSaving(true);
    setMessage("");
    try {
      await adminMutation<string>(url, { method: "PUT", body: JSON.stringify(data) });
      setMessage(`${section} 已保存`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="admin-loading"><span>正在加载个人资料…</span></div>;

  return <>
    <div className="admin-heading">
      <div><h1>个人资料</h1><p>编辑"关于我"、"个人简历"、"我的装备"和"友情链接"四个公开页面的内容。</p></div>
    </div>
    {message && <p className={`admin-notice ${message.includes("失败") ? "error" : ""}`}>{message}</p>}
    <div className="admin-tabs">
      {tabs.map((t) => <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>{t.label}</button>)}
    </div>

    {tab === "about" && <AboutEditor data={about} onChange={setAbout} onSave={saveAbout} saving={saving} />}
    {tab === "resume" && <ResumeEditor data={resume} onChange={setResume} onSave={saveResume} saving={saving} />}
    {tab === "uses" && <UsesEditor data={uses} onChange={setUses} onSave={saveUses} saving={saving} />}
    {tab === "links" && <LinksEditor data={links} onChange={setLinks} onSave={saveLinks} saving={saving} />}
  </>;
}

// ── About Editor ──
function AboutEditor({ data, onChange, onSave, saving }: {
  data: ProfileAbout; onChange: (d: ProfileAbout) => void; onSave: () => void; saving: boolean;
}) {
  return <section className="admin-panel">
    <div className="form-field"><label>姓名</label><input className="form-control" value={data.profileName} onChange={e => onChange({ ...data, profileName: e.target.value })} /></div>
    <div className="form-field"><label>标签（Tagline）</label><input className="form-control" value={data.profileTagline} onChange={e => onChange({ ...data, profileTagline: e.target.value })} /></div>
    <div className="form-field"><label>专业（Bio）</label><input className="form-control" value={data.profileBio} onChange={e => onChange({ ...data, profileBio: e.target.value })} /></div>
    <div className="form-field"><label>故事 第一段</label><textarea className="form-control" value={data.story1} onChange={e => onChange({ ...data, story1: e.target.value })} /></div>
    <div className="form-field"><label>故事 第二段</label><textarea className="form-control" value={data.story2} onChange={e => onChange({ ...data, story2: e.target.value })} /></div>
    <h3 style={{ marginTop: 20 }}>技能分组</h3>
    {data.skillGroups.map((g, gi) => <div key={gi} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div className="form-field"><label>分组名</label><input className="form-control" value={g.title} onChange={e => {
        const groups = [...data.skillGroups]; groups[gi] = { ...g, title: e.target.value }; onChange({ ...data, skillGroups: groups });
      }} /></div>
      <div className="form-field"><label>技能（逗号分隔）</label><input className="form-control" value={g.items.join(", ")} onChange={e => {
        const groups = [...data.skillGroups]; groups[gi] = { ...g, items: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }; onChange({ ...data, skillGroups: groups });
      }} /></div>
      <button className="button small" type="button" onClick={() => onChange({ ...data, skillGroups: data.skillGroups.filter((_, i) => i !== gi) })}>删除此分组</button>
    </div>)}
    <button className="button small" type="button" onClick={() => onChange({ ...data, skillGroups: [...data.skillGroups, { title: "", items: [] }] })}>+ 添加技能分组</button>

    <h3 style={{ marginTop: 20 }}>时间线</h3>
    {data.timeline.map((t, ti) => <div key={ti} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div className="form-field"><label>时期</label><input className="form-control" value={t.period} onChange={e => {
        const timeline = [...data.timeline]; timeline[ti] = { ...t, period: e.target.value }; onChange({ ...data, timeline });
      }} /></div>
      <div className="form-field"><label>标题</label><input className="form-control" value={t.title} onChange={e => {
        const timeline = [...data.timeline]; timeline[ti] = { ...t, title: e.target.value }; onChange({ ...data, timeline });
      }} /></div>
      <div className="form-field"><label>描述</label><input className="form-control" value={t.description} onChange={e => {
        const timeline = [...data.timeline]; timeline[ti] = { ...t, description: e.target.value }; onChange({ ...data, timeline });
      }} /></div>
      <button className="button small" type="button" onClick={() => onChange({ ...data, timeline: data.timeline.filter((_, i) => i !== ti) })}>删除</button>
    </div>)}
    <button className="button small" type="button" onClick={() => onChange({ ...data, timeline: [...data.timeline, { period: "", title: "", description: "" }] })}>+ 添加时间线条目</button>

    <div className="editor-actions"><button className="button primary small" onClick={onSave} disabled={saving}>{saving ? "保存中…" : "保存"}</button></div>
  </section>;
}

// ── Resume Editor ──
function ResumeEditor({ data, onChange, onSave, saving }: {
  data: ProfileResume; onChange: (d: ProfileResume) => void; onSave: () => void; saving: boolean;
}) {
  return <section className="admin-panel">
    <div className="form-field"><label>姓名</label><input className="form-control" value={data.name} onChange={e => onChange({ ...data, name: e.target.value })} /></div>
    <div className="form-field"><label>职位</label><input className="form-control" value={data.title} onChange={e => onChange({ ...data, title: e.target.value })} /></div>
    <div className="form-field"><label>邮箱</label><input className="form-control" value={data.email} onChange={e => onChange({ ...data, email: e.target.value })} /></div>
    <div className="form-field"><label>网站/GitHub</label><input className="form-control" value={data.website} onChange={e => onChange({ ...data, website: e.target.value })} /></div>
    <div className="form-field"><label>所在地</label><input className="form-control" value={data.location} onChange={e => onChange({ ...data, location: e.target.value })} /></div>
    <div className="form-field"><label>个人简介（Profile）</label><textarea className="form-control" value={data.profile} onChange={e => onChange({ ...data, profile: e.target.value })} /></div>
    <div className="form-field"><label>核心技术</label><input className="form-control" value={data.coreSkills} onChange={e => onChange({ ...data, coreSkills: e.target.value })} /></div>
    <div className="form-field"><label>工程能力</label><input className="form-control" value={data.engineeringSkills} onChange={e => onChange({ ...data, engineeringSkills: e.target.value })} /></div>
    <h3 style={{ marginTop: 20 }}>项目经历</h3>
    {data.projects.map((p, pi) => <div key={pi} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div className="form-field"><label>项目名</label><input className="form-control" value={p.name} onChange={e => { const proj = [...data.projects]; proj[pi] = { ...p, name: e.target.value }; onChange({ ...data, projects: proj }); }} /></div>
      <div className="form-field"><label>描述</label><input className="form-control" value={p.description} onChange={e => { const proj = [...data.projects]; proj[pi] = { ...p, description: e.target.value }; onChange({ ...data, projects: proj }); }} /></div>
      <div className="form-field"><label>负责内容</label><input className="form-control" value={p.responsibilities} onChange={e => { const proj = [...data.projects]; proj[pi] = { ...p, responsibilities: e.target.value }; onChange({ ...data, projects: proj }); }} /></div>
      <button className="button small" type="button" onClick={() => onChange({ ...data, projects: data.projects.filter((_, i) => i !== pi) })}>删除</button>
    </div>)}
    <button className="button small" type="button" onClick={() => onChange({ ...data, projects: [...data.projects, { name: "", description: "", responsibilities: "" }] })}>+ 添加项目</button>
    <div className="form-field" style={{ marginTop: 20 }}><label>教育经历</label><input className="form-control" value={data.education} onChange={e => onChange({ ...data, education: e.target.value })} /></div>
    <div className="form-field"><label>教育详情</label><input className="form-control" value={data.educationDetail} onChange={e => onChange({ ...data, educationDetail: e.target.value })} /></div>
    <div className="editor-actions"><button className="button primary small" onClick={onSave} disabled={saving}>{saving ? "保存中…" : "保存"}</button></div>
  </section>;
}

// ── Uses Editor ──
function UsesEditor({ data, onChange, onSave, saving }: {
  data: ProfileUses; onChange: (d: ProfileUses) => void; onSave: () => void; saving: boolean;
}) {
  return <section className="admin-panel">
    {data.groups.map((g, gi) => <div key={gi} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
      <div className="form-field"><label>分组名</label><input className="form-control" value={g.title} onChange={e => { const groups = [...data.groups]; groups[gi] = { ...g, title: e.target.value }; onChange({ ...data, groups }); }} /></div>
      {g.items.map((item, ii) => <div key={ii} style={{ marginLeft: 12, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
        <div className="form-field"><label>名称</label><input className="form-control" value={item.name} onChange={e => { const groups = [...data.groups]; const items = [...g.items]; items[ii] = { ...item, name: e.target.value }; groups[gi] = { ...g, items }; onChange({ ...data, groups }); }} /></div>
        <div className="form-field"><label>描述</label><input className="form-control" value={item.description} onChange={e => { const groups = [...data.groups]; const items = [...g.items]; items[ii] = { ...item, description: e.target.value }; groups[gi] = { ...g, items }; onChange({ ...data, groups }); }} /></div>
        <button className="button small" type="button" onClick={() => { const groups = [...data.groups]; groups[gi] = { ...g, items: g.items.filter((_, i) => i !== ii) }; onChange({ ...data, groups }); }}>删除此项</button>
      </div>)}
      <div style={{ marginTop: 8 }}><button className="button small" type="button" onClick={() => { const groups = [...data.groups]; groups[gi] = { ...g, items: [...g.items, { name: "", description: "" }] }; onChange({ ...data, groups }); }}>+ 添加工具</button> <button className="button small" type="button" onClick={() => onChange({ ...data, groups: data.groups.filter((_, i) => i !== gi) })}>删除此分组</button></div>
    </div>)}
    <button className="button small" type="button" onClick={() => onChange({ ...data, groups: [...data.groups, { title: "", items: [] }] })}>+ 添加分组</button>
    <div className="editor-actions"><button className="button primary small" onClick={onSave} disabled={saving}>{saving ? "保存中…" : "保存"}</button></div>
  </section>;
}

// ── Links Editor ──
function LinksEditor({ data, onChange, onSave, saving }: {
  data: ProfileLinks; onChange: (d: ProfileLinks) => void; onSave: () => void; saving: boolean;
}) {
  return <section className="admin-panel">
    {data.links.map((l, li) => <div key={li} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div className="form-field"><label>名称</label><input className="form-control" value={l.name} onChange={e => { const links = [...data.links]; links[li] = { ...l, name: e.target.value }; onChange({ ...data, links }); }} /></div>
      <div className="form-field"><label>URL</label><input className="form-control" value={l.url} onChange={e => { const links = [...data.links]; links[li] = { ...l, url: e.target.value }; onChange({ ...data, links }); }} /></div>
      <div className="form-field"><label>描述</label><input className="form-control" value={l.description} onChange={e => { const links = [...data.links]; links[li] = { ...l, description: e.target.value }; onChange({ ...data, links }); }} /></div>
      <button className="button small" type="button" onClick={() => onChange({ ...data, links: data.links.filter((_, i) => i !== li) })}>删除</button>
    </div>)}
    <button className="button small" type="button" onClick={() => onChange({ ...data, links: [...data.links, { name: "", url: "", description: "" }] })}>+ 添加链接</button>
    <div className="editor-actions"><button className="button primary small" onClick={onSave} disabled={saving}>{saving ? "保存中…" : "保存"}</button></div>
  </section>;
}
