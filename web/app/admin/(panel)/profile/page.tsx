"use client";

import { useEffect, useState } from "react";
import { adminGet, adminMutation, adminUpload, type MediaItem } from "@/lib/admin-api";
import type { FullProfile, ProfileAbout, ProfileLinks, ProfileResume, ProfileUses } from "@/lib/profile-api";
import { defaultProfileAbout, defaultProfileLinks, defaultProfileResume, defaultProfileUses } from "@/lib/profile-api";

type Tab = "about" | "resume" | "uses" | "links";

const tabs: { key: Tab; label: string; description: string }[] = [
  { key: "about", label: "关于我", description: "故事、技能与时间线" },
  { key: "resume", label: "个人简历", description: "经历、能力与项目" },
  { key: "uses", label: "我的装备", description: "软件、硬件与服务" },
  { key: "links", label: "友情链接", description: "名称、地址、说明与图标" },
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
    const requested = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    const tabTimer = requested && tabs.some((item) => item.key === requested)
      ? window.setTimeout(() => setTab(requested), 0)
      : undefined;

    let active = true;
    adminGet<FullProfile>(`/api/profile?t=${Date.now()}`)
      .then((response) => {
        if (!active) return;
        if (response.data.about) setAbout({ ...defaultProfileAbout(), ...response.data.about });
        if (response.data.resume) setResume({ ...defaultProfileResume(), ...response.data.resume });
        if (response.data.uses) setUses(response.data.uses);
        if (response.data.links) setLinks(response.data.links);
      })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "个人资料加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      if (tabTimer !== undefined) window.clearTimeout(tabTimer);
    };
  }, []);

  function changeTab(next: Tab) {
    setTab(next);
    setMessage("");
    window.history.replaceState(null, "", `/admin/profile?tab=${next}`);
  }

  async function save(section: string, data: unknown, url: string) {
    setSaving(true);
    setMessage("");
    try {
      await adminMutation<string>(url, { method: "PUT", body: JSON.stringify(data) });
      setMessage(`${section}已保存，公开页面刷新后即可看到。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="admin-loading"><span>正在加载个人资料…</span></div>;

  return (
    <>
      <div className="admin-heading">
        <div><h1>个人资料与展示内容</h1><p>在这里自定义“关于我”“个人简历”“我的装备”和“友情链接”四个公开页面。</p></div>
      </div>
      {message && <p className={`admin-notice ${message.includes("失败") ? "error" : ""}`}>{message}</p>}

      <div className="admin-tabs profile-admin-tabs">
        {tabs.map((item) => (
          <button className={tab === item.key ? "active" : ""} key={item.key} onClick={() => changeTab(item.key)} type="button">
            <strong>{item.label}</strong><small>{item.description}</small>
          </button>
        ))}
      </div>

      {tab === "about" && <AboutEditor data={about} onChange={setAbout} onSave={() => save("关于我", about, "/api/admin/profile/about")} saving={saving} />}
      {tab === "resume" && <ResumeEditor data={resume} onChange={setResume} onSave={() => save("个人简历", resume, "/api/admin/profile/resume")} saving={saving} />}
      {tab === "uses" && <UsesEditor data={uses} onChange={setUses} onSave={() => save("我的装备", uses, "/api/admin/profile/uses")} saving={saving} />}
      {tab === "links" && <LinksEditor data={links} onChange={setLinks} onSave={() => save("友情链接", links, "/api/admin/profile/links")} saving={saving} />}
    </>
  );
}

function AboutEditor({ data, onChange, onSave, saving }: {
  data: ProfileAbout;
  onChange: (data: ProfileAbout) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="admin-panel profile-editor-section">
      <div className="panel-head"><div><h2>关于我页面</h2><p>个人介绍、技能分组和成长时间线。</p></div></div>
      <div className="profile-editor-body">
        <div className="editor-grid">
          <TextField label="姓名" value={data.profileName} onChange={(value) => onChange({ ...data, profileName: value })} />
          <TextField label="标签（Tagline）" value={data.profileTagline} onChange={(value) => onChange({ ...data, profileTagline: value })} />
          <TextField label="专业 / Bio" value={data.profileBio} onChange={(value) => onChange({ ...data, profileBio: value })} />
          <div className="form-field span-2"><label>故事第一段</label><textarea className="form-control" value={data.story1} onChange={(event) => onChange({ ...data, story1: event.target.value })} /></div>
          <div className="form-field span-2"><label>故事第二段</label><textarea className="form-control" value={data.story2} onChange={(event) => onChange({ ...data, story2: event.target.value })} /></div>
        </div>

        <EditorSubheading title="技能分组" description="每个分组中的技能使用逗号分隔。" />
        <div className="repeatable-list">
          {(data.skillGroups || []).map((group, groupIndex) => (
            <div className="repeatable-card" key={groupIndex}>
              <div className="editor-grid">
                <TextField label="分组名" value={group.title} onChange={(value) => {
                  const skillGroups = [...data.skillGroups];
                  skillGroups[groupIndex] = { ...group, title: value };
                  onChange({ ...data, skillGroups });
                }} />
                <TextField label="技能（逗号分隔）" value={(group.items || []).join(", ")} onChange={(value) => {
                  const skillGroups = [...data.skillGroups];
                  skillGroups[groupIndex] = { ...group, items: value.split(",").map((item) => item.trim()).filter(Boolean) };
                  onChange({ ...data, skillGroups });
                }} />
              </div>
              <RowActions index={groupIndex} length={data.skillGroups.length} onMove={(to) => onChange({ ...data, skillGroups: move(data.skillGroups, groupIndex, to) })} onDelete={() => onChange({ ...data, skillGroups: data.skillGroups.filter((_, index) => index !== groupIndex) })} />
            </div>
          ))}
        </div>
        <button className="button small" type="button" onClick={() => onChange({ ...data, skillGroups: [...data.skillGroups, { title: "", items: [] }] })}>+ 添加技能分组</button>

        <EditorSubheading title="成长时间线" description="按你希望展示的顺序排列。" />
        <div className="repeatable-list">
          {(data.timeline || []).map((item, index) => (
            <div className="repeatable-card" key={index}>
              <div className="editor-grid">
                <TextField label="时间" value={item.period} onChange={(value) => {
                  const timeline = [...data.timeline]; timeline[index] = { ...item, period: value }; onChange({ ...data, timeline });
                }} />
                <TextField label="标题" value={item.title} onChange={(value) => {
                  const timeline = [...data.timeline]; timeline[index] = { ...item, title: value }; onChange({ ...data, timeline });
                }} />
                <div className="form-field span-2"><label>描述</label><textarea className="form-control" value={item.description} onChange={(event) => {
                  const timeline = [...data.timeline]; timeline[index] = { ...item, description: event.target.value }; onChange({ ...data, timeline });
                }} /></div>
              </div>
              <RowActions index={index} length={data.timeline.length} onMove={(to) => onChange({ ...data, timeline: move(data.timeline, index, to) })} onDelete={() => onChange({ ...data, timeline: data.timeline.filter((_, itemIndex) => itemIndex !== index) })} />
            </div>
          ))}
        </div>
        <button className="button small" type="button" onClick={() => onChange({ ...data, timeline: [...data.timeline, { period: "", title: "", description: "" }] })}>+ 添加时间线</button>
        <SaveBar saving={saving} onSave={onSave} />
      </div>
    </section>
  );
}

function ResumeEditor({ data, onChange, onSave, saving }: {
  data: ProfileResume;
  onChange: (data: ProfileResume) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="admin-panel profile-editor-section">
      <div className="panel-head"><div><h2>个人简历页面</h2><p>基础信息、能力描述、项目经历与教育经历。</p></div></div>
      <div className="profile-editor-body">
        <div className="editor-grid">
          <TextField label="姓名" value={data.name} onChange={(value) => onChange({ ...data, name: value })} />
          <TextField label="职位 / 方向" value={data.title} onChange={(value) => onChange({ ...data, title: value })} />
          <TextField label="邮箱" value={data.email} onChange={(value) => onChange({ ...data, email: value })} />
          <TextField label="网站" value={data.website} onChange={(value) => onChange({ ...data, website: value })} />
          <TextField label="所在地" value={data.location} onChange={(value) => onChange({ ...data, location: value })} />
          <div className="form-field span-2"><label>个人简介</label><textarea className="form-control" value={data.profile} onChange={(event) => onChange({ ...data, profile: event.target.value })} /></div>
          <div className="form-field span-2"><label>核心技能</label><textarea className="form-control" value={data.coreSkills} onChange={(event) => onChange({ ...data, coreSkills: event.target.value })} /></div>
          <div className="form-field span-2"><label>工程能力</label><textarea className="form-control" value={data.engineeringSkills} onChange={(event) => onChange({ ...data, engineeringSkills: event.target.value })} /></div>
        </div>

        <EditorSubheading title="项目经历" description="支持新增、删除和调整顺序。" />
        <div className="repeatable-list">
          {(data.projects || []).map((project, index) => (
            <div className="repeatable-card" key={index}>
              <div className="editor-grid">
                <TextField label="项目名称" value={project.name} onChange={(value) => {
                  const projects = [...data.projects]; projects[index] = { ...project, name: value }; onChange({ ...data, projects });
                }} />
                <TextField label="项目简介" value={project.description} onChange={(value) => {
                  const projects = [...data.projects]; projects[index] = { ...project, description: value }; onChange({ ...data, projects });
                }} />
                <div className="form-field span-2"><label>职责与成果</label><textarea className="form-control" value={project.responsibilities} onChange={(event) => {
                  const projects = [...data.projects]; projects[index] = { ...project, responsibilities: event.target.value }; onChange({ ...data, projects });
                }} /></div>
              </div>
              <RowActions index={index} length={data.projects.length} onMove={(to) => onChange({ ...data, projects: move(data.projects, index, to) })} onDelete={() => onChange({ ...data, projects: data.projects.filter((_, projectIndex) => projectIndex !== index) })} />
            </div>
          ))}
        </div>
        <button className="button small" type="button" onClick={() => onChange({ ...data, projects: [...data.projects, { name: "", description: "", responsibilities: "" }] })}>+ 添加项目</button>

        <div className="editor-grid profile-editor-spacer">
          <TextField label="教育经历" value={data.education} onChange={(value) => onChange({ ...data, education: value })} />
          <TextField label="教育详情" value={data.educationDetail} onChange={(value) => onChange({ ...data, educationDetail: value })} />
        </div>
        <SaveBar saving={saving} onSave={onSave} />
      </div>
    </section>
  );
}

function UsesEditor({ data, onChange, onSave, saving }: {
  data: ProfileUses;
  onChange: (data: ProfileUses) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="admin-panel profile-editor-section">
      <div className="panel-head"><div><h2>我的装备</h2><p>可自定义分组、条目、说明、跳转链接与图片，保存后同步到 /uses。</p></div></div>
      <div className="profile-editor-body">
        <div className="repeatable-list">
          {(data.groups || []).map((group, groupIndex) => (
            <div className="repeatable-card group-card" key={groupIndex}>
              <div className="repeatable-card-title">
                <TextField label="分组名称" value={group.title} onChange={(value) => {
                  const groups = [...data.groups]; groups[groupIndex] = { ...group, title: value }; onChange({ ...data, groups });
                }} />
                <RowActions index={groupIndex} length={data.groups.length} onMove={(to) => onChange({ ...data, groups: move(data.groups, groupIndex, to) })} onDelete={() => onChange({ ...data, groups: data.groups.filter((_, index) => index !== groupIndex) })} />
              </div>

              <div className="nested-repeatable-list">
                {(group.items || []).map((item, itemIndex) => (
                  <div className="nested-repeatable-card" key={itemIndex}>
                    <div className="editor-grid">
                      <TextField label="名称" value={item.name} onChange={(value) => updateUseItem(data, onChange, groupIndex, itemIndex, { name: value })} />
                      <TextField label="链接（可选）" value={item.url || ""} onChange={(value) => updateUseItem(data, onChange, groupIndex, itemIndex, { url: value })} />
                      <div className="form-field span-2"><label>描述</label><textarea className="form-control" value={item.description} onChange={(event) => updateUseItem(data, onChange, groupIndex, itemIndex, { description: event.target.value })} /></div>
                      <ImageUploadInput label="装备图片 / 图标" value={item.imageUrl || ""} onChange={(value) => updateUseItem(data, onChange, groupIndex, itemIndex, { imageUrl: value })} />
                    </div>
                    <RowActions index={itemIndex} length={group.items.length} onMove={(to) => {
                      const groups = [...data.groups]; groups[groupIndex] = { ...group, items: move(group.items, itemIndex, to) }; onChange({ ...data, groups });
                    }} onDelete={() => {
                      const groups = [...data.groups]; groups[groupIndex] = { ...group, items: group.items.filter((_, index) => index !== itemIndex) }; onChange({ ...data, groups });
                    }} />
                  </div>
                ))}
              </div>
              <button className="button small" type="button" onClick={() => {
                const groups = [...data.groups]; groups[groupIndex] = { ...group, items: [...(group.items || []), { name: "", description: "", url: "", imageUrl: "" }] }; onChange({ ...data, groups });
              }}>+ 添加装备</button>
            </div>
          ))}
        </div>
        <button className="button small" type="button" onClick={() => onChange({ ...data, groups: [...data.groups, { title: "", items: [] }] })}>+ 添加装备分组</button>
        <SaveBar saving={saving} onSave={onSave} />
      </div>
    </section>
  );
}

function LinksEditor({ data, onChange, onSave, saving }: {
  data: ProfileLinks;
  onChange: (data: ProfileLinks) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="admin-panel profile-editor-section">
      <div className="panel-head"><div><h2>友情链接</h2><p>可自定义名称、URL、描述、站点图标及展示顺序，保存后同步到 /links。</p></div></div>
      <div className="profile-editor-body">
        <div className="repeatable-list links-editor-list">
          {(data.links || []).map((link, index) => (
            <div className="repeatable-card link-editor-card" key={index}>
              <div className="editor-grid">
                <TextField label="名称" value={link.name} onChange={(value) => updateLink(data, onChange, index, { name: value })} />
                <TextField label="URL" value={link.url} onChange={(value) => updateLink(data, onChange, index, { url: value })} />
                <div className="form-field span-2"><label>描述</label><textarea className="form-control" value={link.description} onChange={(event) => updateLink(data, onChange, index, { description: event.target.value })} /></div>
                <ImageUploadInput label="站点图标 / Logo" value={link.imageUrl || ""} onChange={(value) => updateLink(data, onChange, index, { imageUrl: value })} />
              </div>
              <RowActions index={index} length={data.links.length} onMove={(to) => onChange({ ...data, links: move(data.links, index, to) })} onDelete={() => onChange({ ...data, links: data.links.filter((_, linkIndex) => linkIndex !== index) })} />
            </div>
          ))}
        </div>
        <button className="button small" type="button" onClick={() => onChange({ ...data, links: [...data.links, { name: "", url: "", description: "", imageUrl: "" }] })}>+ 添加友情链接</button>
        <SaveBar saving={saving} onSave={onSave} />
      </div>
    </section>
  );
}

function updateUseItem(
  data: ProfileUses,
  onChange: (data: ProfileUses) => void,
  groupIndex: number,
  itemIndex: number,
  patch: Record<string, string>,
) {
  const groups = [...data.groups];
  const group = groups[groupIndex];
  const items = [...group.items];
  items[itemIndex] = { ...items[itemIndex], ...patch };
  groups[groupIndex] = { ...group, items };
  onChange({ ...data, groups });
}

function updateLink(data: ProfileLinks, onChange: (data: ProfileLinks) => void, index: number, patch: Record<string, string>) {
  const links = [...data.links];
  links[index] = { ...links[index], ...patch };
  onChange({ ...data, links });
}

function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function TextField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <div className="form-field"><label>{label}</label><input className="form-control" value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function EditorSubheading({ description, title }: { description: string; title: string }) {
  return <div className="editor-subheading"><div><h3>{title}</h3><p>{description}</p></div></div>;
}

function RowActions({ index, length, onDelete, onMove }: {
  index: number;
  length: number;
  onDelete: () => void;
  onMove: (to: number) => void;
}) {
  return (
    <div className="row-actions">
      <button disabled={index === 0} onClick={() => onMove(index - 1)} type="button">↑ 上移</button>
      <button disabled={index === length - 1} onClick={() => onMove(index + 1)} type="button">↓ 下移</button>
      <button className="danger" onClick={onDelete} type="button">删除</button>
    </div>
  );
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return <div className="editor-actions"><button className="button primary" disabled={saving} onClick={onSave} type="button">{saving ? "保存中…" : "保存当前页面"}</button></div>;
}

function ImageUploadInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  const [uploading, setUploading] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const response = await adminUpload<MediaItem>("/api/admin/media", file);
      onChange(response.data.url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="form-field span-2 compact-image-upload">
      <label>{label}</label>
      <div className="compact-image-upload-row">
        {value ? <img alt="预览" src={value} /> : <span className="compact-image-placeholder">无图</span>}
        <input className="form-control" value={value} placeholder="图片 URL（可选）" onChange={(event) => onChange(event.target.value)} />
        <label className="button small">
          {uploading ? "上传中…" : "上传"}
          <input accept="image/*" disabled={uploading} hidden type="file" onChange={(event) => void upload(event.target.files?.[0])} />
        </label>
      </div>
    </div>
  );
}
