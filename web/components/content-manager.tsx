"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import { adminGet, adminMutation, type AdminPage, type EditableItem } from "@/lib/admin-api";

type Mode = "posts" | "notes" | "projects";

type FormState = {
  id?: string;
  title: string;
  name: string;
  slug: string;
  summary: string;
  content: string;
  description: string;
  coverImageUrl: string;
  tags: string;
  series: string;
  category: string;
  techStack: string;
  status: string;
  featured: boolean;
  repoUrl: string;
  demoUrl: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
};

const labels = {
  posts: { title: "文章管理", description: "创建、编辑和发布技术博客。", newLabel: "新建文章" },
  notes: { title: "笔记管理", description: "维护知识分类与技术笔记。", newLabel: "新建笔记" },
  projects: { title: "项目管理", description: "展示项目、技术栈与项目复盘。", newLabel: "新建项目" },
};

function empty(mode: Mode): FormState {
  return {
    title: "",
    name: "",
    slug: "",
    summary: "",
    content: "",
    description: "",
    coverImageUrl: "",
    tags: "",
    series: "",
    category: "",
    techStack: "",
    status: mode === "projects" ? "EXPERIMENTAL" : "DRAFT",
    featured: false,
    repoUrl: "",
    demoUrl: "",
    imageUrl: "",
    startDate: "",
    endDate: "",
  };
}

function toForm(item: EditableItem, mode: Mode): FormState {
  return {
    id: item.id,
    title: item.title || "",
    name: item.name || "",
    slug: item.slug || "",
    summary: item.summary || "",
    content: item.content || "",
    description: item.description || "",
    coverImageUrl: item.coverImageUrl || "",
    tags: (item.tags || []).join(", "),
    series: item.series || "",
    category: item.category || "",
    techStack: item.techStack || "",
    status: item.status || (mode === "projects" ? "EXPERIMENTAL" : "DRAFT"),
    featured: Boolean(item.featured),
    repoUrl: item.repoUrl || "",
    demoUrl: item.demoUrl || "",
    imageUrl: item.imageUrl || "",
    startDate: item.startDate || "",
    endDate: item.endDate || "",
  };
}

const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export function ContentManager({ mode }: { mode: Mode }) {
  const [items, setItems] = useState<EditableItem[]>([]);
  const [form, setForm] = useState<FormState>(() => empty(mode));
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const config = labels[mode];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminGet<AdminPage>(`/api/admin/${mode}?page=1&size=100`);
      setItems(response.data.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function change<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openNew() {
    setForm(empty(mode));
    setEditing(true);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(item: EditableItem) {
    setForm(toForm(item, mode));
    setEditing(true);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    let payload: Record<string, unknown>;
    if (mode === "posts") {
      payload = {
        title: form.title,
        slug: form.slug || null,
        summary: form.summary,
        content: form.content,
        coverImageUrl: form.coverImageUrl || null,
        tags: split(form.tags),
        series: form.series || null,
        status: form.status,
        featured: form.featured,
      };
    } else if (mode === "notes") {
      payload = {
        title: form.title,
        slug: form.slug || null,
        summary: form.summary,
        content: form.content,
        category: form.category || null,
        tags: split(form.tags),
        status: form.status,
      };
    } else {
      payload = {
        name: form.name,
        slug: form.slug || null,
        summary: form.summary,
        description: form.description,
        techStack: split(form.techStack),
        status: form.status,
        repoUrl: form.repoUrl || null,
        demoUrl: form.demoUrl || null,
        imageUrl: form.imageUrl || null,
        featured: form.featured,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
    }

    try {
      await adminMutation<EditableItem>(
        form.id ? `/api/admin/${mode}/${form.id}` : `/api/admin/${mode}`,
        { method: form.id ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setMessage(`${mode === "posts" ? "文章" : mode === "notes" ? "笔记" : "项目"}已保存`);
      setEditing(false);
      setForm(empty(mode));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: EditableItem) {
    const name = item.title || item.name || "这条内容";
    if (!window.confirm(`确定删除「${name}」吗？此操作不可撤销。`)) return;
    try {
      await adminMutation<string>(`/api/admin/${mode}/${item.id}`, { method: "DELETE" });
      setMessage("内容已删除");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败");
    }
  }

  async function publish(item: EditableItem) {
    if (mode !== "posts") return;
    try {
      await adminMutation<EditableItem>(`/api/admin/posts/${item.id}/publish`, { method: "POST" });
      setMessage("文章已发布");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发布失败");
    }
  }

  return (
    <>
      <div className="admin-heading">
        <div><h1>{config.title}</h1><p>{config.description}</p></div>
        <button className="button primary small" onClick={openNew} type="button">{config.newLabel}</button>
      </div>

      {message && <p className={`form-message ${message.includes("失败") || message.includes("错误") ? "error" : "success"}`}>{message}</p>}

      {editing && (
        <form className="admin-panel editor-panel" onSubmit={save}>
          <div className="panel-head editor-panel-head">
            <div>
              <h2>{form.id ? "编辑内容" : config.newLabel}</h2>
              <p>可直接粘贴其他平台的 Markdown、富文本和语雀图片。</p>
            </div>
            <button className="button small" type="button" onClick={() => setEditing(false)}>关闭</button>
          </div>

          <div className="editor-grid">
            {mode === "projects"
              ? <Field label="项目名称" required value={form.name} onChange={(value) => change("name", value)} />
              : <Field label={mode === "posts" ? "文章标题" : "笔记标题"} required value={form.title} onChange={(value) => change("title", value)} />}
            <Field label="Slug（留空自动生成）" value={form.slug} onChange={(value) => change("slug", value)} />

            <div className="form-field span-2">
              <label>摘要</label>
              <textarea className="form-control" maxLength={500} value={form.summary} onChange={(event) => change("summary", event.target.value)} />
            </div>

            {mode === "posts" && (
              <>
                <Field label="标签（逗号分隔）" value={form.tags} onChange={(value) => change("tags", value)} />
                <Field label="系列" value={form.series} onChange={(value) => change("series", value)} />
                <Field label="封面图片 URL" value={form.coverImageUrl} onChange={(value) => change("coverImageUrl", value)} />
              </>
            )}

            {mode === "notes" && (
              <>
                <Field label="分类" value={form.category} onChange={(value) => change("category", value)} />
                <Field label="标签（逗号分隔）" value={form.tags} onChange={(value) => change("tags", value)} />
              </>
            )}

            {mode === "projects" && (
              <>
                <Field label="技术栈（逗号分隔）" value={form.techStack} onChange={(value) => change("techStack", value)} />
                <Field label="仓库 URL" value={form.repoUrl} onChange={(value) => change("repoUrl", value)} />
                <Field label="演示 URL" value={form.demoUrl} onChange={(value) => change("demoUrl", value)} />
                <Field label="图片 URL" value={form.imageUrl} onChange={(value) => change("imageUrl", value)} />
                <Field label="开始日期" type="date" value={form.startDate} onChange={(value) => change("startDate", value)} />
                <Field label="结束日期" type="date" value={form.endDate} onChange={(value) => change("endDate", value)} />
              </>
            )}

            <div className="form-field">
              <label>状态</label>
              <select className="form-control" value={form.status} onChange={(event) => change("status", event.target.value)}>
                {(mode === "projects"
                  ? ["ACTIVE", "COMPLETED", "MAINTAINED", "EXPERIMENTAL", "ARCHIVED"]
                  : ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]
                ).map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>

            {mode !== "notes" && (
              <label className="check-field">
                <input type="checkbox" checked={form.featured} onChange={(event) => change("featured", event.target.checked)} />
                在首页精选展示
              </label>
            )}

            <div className="form-field span-2">
              <MarkdownEditor
                id={`${mode}-content`}
                label={mode === "projects" ? "项目介绍（Markdown）" : "正文（Markdown / HTML）"}
                minHeight={440}
                onChange={(value) => change(mode === "projects" ? "description" : "content", value)}
                placeholder={"## 小节标题\n\n可直接粘贴 Markdown、语雀文档、Notion 内容或截图。"}
                required={mode !== "projects"}
                value={mode === "projects" ? form.description : form.content}
              />
            </div>
          </div>

          <div className="editor-actions">
            <button className="button small" type="button" onClick={() => setEditing(false)}>取消</button>
            <button className="button primary small" type="submit" disabled={saving}>{saving ? "保存中…" : "保存内容"}</button>
          </div>
        </form>
      )}

      <section className="admin-panel">
        <div className="panel-head"><h2>全部内容</h2><span>{items.length} 条记录</span></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>标题</th><th>状态</th><th>{mode === "projects" ? "技术栈" : "Slug"}</th><th>更新/时间</th><th>操作</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}>正在加载…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5}>暂无内容，点击右上角创建第一条记录。</td></tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.title || item.name}</strong><br /><span className="table-summary">{item.summary?.slice(0, 60)}</span></td>
                  <td><span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span></td>
                  <td>{mode === "projects" ? item.techStack : item.slug}</td>
                  <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("zh-CN") : item.startDate || "—"}</td>
                  <td>
                    <div className="table-actions">
                      <button onClick={() => openEdit(item)}>编辑</button>
                      {mode === "posts" && item.status !== "PUBLISHED" && <button onClick={() => publish(item)}>发布</button>}
                      <button onClick={() => remove(item)}>删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input className="form-control" type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
