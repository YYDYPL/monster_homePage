"use client";

import {
  type DragEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MarkdownEditor } from "@/components/markdown-editor";
import {
  adminGet,
  adminMutation,
  type AdminNoteTreeNode,
  type AdminPage,
  type EditableItem,
} from "@/lib/admin-api";
import { flattenNoteTree, siblingNotes } from "@/lib/note-tree";

type NoteForm = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  tags: string;
  status: string;
  parentId: string | null;
  sortOrder: number;
};

type DropZone = "before" | "inside" | "after";
type DropTarget = { id: string; zone: DropZone } | null;
type Notice = { type: "success" | "error"; text: string } | null;

const statusLabels: Record<string, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  SCHEDULED: "定时发布",
  ARCHIVED: "已归档",
};

function emptyForm(parentId: string | null = null, sortOrder = 0): NoteForm {
  return {
    title: "",
    slug: "",
    summary: "",
    content: "",
    category: "",
    tags: "",
    status: "DRAFT",
    parentId,
    sortOrder,
  };
}

function toForm(item: EditableItem): NoteForm {
  return {
    id: item.id,
    title: item.title || "",
    slug: item.slug || "",
    summary: item.summary || "",
    content: item.content || "",
    category: item.category || "",
    tags: (item.tags || []).join(", "),
    status: item.status || "DRAFT",
    parentId: item.parentId ?? null,
    sortOrder: item.sortOrder ?? 0,
  };
}

function splitTags(value: string) {
  return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function findNode(tree: AdminNoteTreeNode[], id: string): AdminNoteTreeNode | undefined {
  for (const node of tree) {
    if (node.id === id) return node;
    const nested = findNode(node.children, id);
    if (nested) return nested;
  }
}

function descendantIds(node?: AdminNoteTreeNode): Set<string> {
  const ids = new Set<string>();
  if (!node) return ids;
  const visit = (current: AdminNoteTreeNode) => {
    for (const child of current.children) {
      ids.add(child.id);
      visit(child);
    }
  };
  visit(node);
  return ids;
}

export function NoteManager() {
  const [tree, setTree] = useState<AdminNoteTreeNode[]>([]);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [form, setForm] = useState<NoteForm>(() => emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [treeResponse, listResponse] = await Promise.all([
        adminGet<AdminNoteTreeNode[]>("/api/admin/notes/tree"),
        adminGet<AdminPage>("/api/admin/notes?page=1&size=100"),
      ]);
      setTree(treeResponse.data);
      setItems(listResponse.data.items);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "知识目录加载失败" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      adminGet<AdminNoteTreeNode[]>("/api/admin/notes/tree"),
      adminGet<AdminPage>("/api/admin/notes?page=1&size=100"),
    ])
      .then(([treeResponse, listResponse]) => {
        if (!mounted) return;
        setTree(treeResponse.data);
        setItems(listResponse.data.items);
      })
      .catch((error) => {
        if (mounted) {
          setNotice({ type: "error", text: error instanceof Error ? error.message : "保存笔记失败" });
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const flatTree = useMemo(() => flattenNoteTree(tree), [tree]);
  const excludedParentIds = useMemo(() => {
    if (!form.id) return new Set<string>();
    const ids = descendantIds(findNode(tree, form.id));
    ids.add(form.id);
    return ids;
  }, [form.id, tree]);

  function change<K extends keyof NoteForm>(key: K, value: NoteForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openNew(parentId: string | null = null) {
    const position = siblingNotes(tree, parentId).length;
    setForm(emptyForm(parentId, position));
    setEditing(true);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openEdit(node: AdminNoteTreeNode) {
    setNotice(null);
    try {
      const cached = items.find((item) => item.id === node.id);
      const item = cached?.content
        ? cached
        : (await adminGet<EditableItem>(`/api/admin/notes/${node.id}`)).data;
      setForm(toForm(item));
      setEditing(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "笔记加载失败" });
    }
  }

  function changeParent(parentId: string | null) {
    setForm((current) => ({
      ...current,
      parentId,
      sortOrder: siblingNotes(tree, parentId).filter((node) => node.id !== current.id).length,
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    const payload = {
      title: form.title,
      slug: form.slug || null,
      summary: form.summary,
      content: form.content,
      category: form.category || null,
      tags: splitTags(form.tags),
      status: form.status,
      parentId: form.parentId,
      sortOrder: Math.max(0, form.sortOrder),
    };

    try {
      await adminMutation<EditableItem>(
        form.id ? `/api/admin/notes/${form.id}` : "/api/admin/notes",
        { method: form.id ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setNotice({ type: "success", text: "笔记与目录位置已保存" });
      setEditing(false);
      setForm(emptyForm());
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "保存失败" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(node: AdminNoteTreeNode) {
    const childHint = node.children.length ? `\n当前笔记还有 ${node.children.length} 个直接子笔记，请先移动或删除子笔记。` : "";
    if (!confirm(`确定删除「${node.title}」吗？此操作不可撤销。${childHint}`)) return;
    try {
      await adminMutation<string>(`/api/admin/notes/${node.id}`, { method: "DELETE" });
      setNotice({ type: "success", text: "笔记已删除" });
      if (form.id === node.id) setEditing(false);
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "删除失败" });
    }
  }

  function toggleNode(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onDragStart(event: DragEvent<HTMLElement>, id: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    setDragId(id);
    setNotice(null);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>, id: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = event.clientY - rect.top;
    const zone: DropZone = relativeY < rect.height * 0.28
      ? "before"
      : relativeY > rect.height * 0.72
        ? "after"
        : "inside";
    setDropTarget({ id, zone });
  }

  async function moveNote(sourceId: string, targetId: string, zone: DropZone) {
    if (sourceId === targetId) return;
    const source = findNode(tree, sourceId);
    const target = findNode(tree, targetId);
    if (!source || !target) return;

    let parentId: string | null;
    let position: number;
    if (zone === "inside") {
      parentId = target.id;
      position = target.children.filter((node) => node.id !== sourceId).length;
    } else {
      parentId = target.parentId;
      const siblings = siblingNotes(tree, parentId).filter((node) => node.id !== sourceId);
      const targetPosition = siblings.findIndex((node) => node.id === target.id);
      position = Math.max(0, targetPosition + (zone === "after" ? 1 : 0));
    }

    const descendants = descendantIds(source);
    if (parentId === sourceId || (parentId && descendants.has(parentId))) {
      setNotice({ type: "error", text: "不能把父笔记移动到自己的子孙笔记下面" });
      return;
    }

    setMoving(true);
    try {
      await adminMutation<EditableItem>(`/api/admin/notes/${sourceId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ parentId, position }),
      });
      setNotice({ type: "success", text: `已移动「${source.title}」` });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "目录移动失败" });
    } finally {
      setMoving(false);
      setDragId(null);
      setDropTarget(null);
    }
  }

  async function dropOnNode(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    const sourceId = dragId || event.dataTransfer.getData("text/plain");
    const zone = dropTarget?.id === targetId ? dropTarget.zone : "inside";
    if (sourceId) await moveNote(sourceId, targetId, zone);
  }

  async function dropAtRoot(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const sourceId = dragId || event.dataTransfer.getData("text/plain");
    if (!sourceId) return;
    const source = findNode(tree, sourceId);
    if (!source) return;
    const position = tree.filter((node) => node.id !== sourceId).length;
    setMoving(true);
    try {
      await adminMutation<EditableItem>(`/api/admin/notes/${sourceId}/move`, {
        method: "PATCH",
        body: JSON.stringify({ parentId: null, position }),
      });
      setNotice({ type: "success", text: `已将「${source.title}」移动到顶级目录` });
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "目录移动失败" });
    } finally {
      setMoving(false);
      setDragId(null);
      setDropTarget(null);
    }
  }

  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>知识库管理</h1>
          <p>用父子笔记组织知识结构；拖动标题可调整层级和同级顺序。</p>
        </div>
        <button className="button primary small" onClick={() => openNew()} type="button">
          新建顶级笔记
        </button>
      </div>

      {notice && <p className={`form-message ${notice.type}`}>{notice.text}</p>}

      {editing && (
        <form className="admin-panel editor-panel note-editor-panel" onSubmit={save}>
          <div className="panel-head note-editor-head">
            <div>
              <h2>{form.id ? "编辑笔记" : "新建笔记"}</h2>
              <p>{form.parentId ? "当前笔记将作为所选父笔记的子笔记。" : "当前笔记位于知识库顶级目录。"}</p>
            </div>
            <button className="button small" onClick={() => setEditing(false)} type="button">关闭</button>
          </div>

          <div className="editor-grid">
            <Field label="标题" required value={form.title} onChange={(value) => change("title", value)} />
            <Field label="Slug（留空自动生成）" value={form.slug} onChange={(value) => change("slug", value)} />

            <div className="form-field">
              <label htmlFor="note-parent">父笔记</label>
              <select
                className="form-control"
                id="note-parent"
                value={form.parentId || ""}
                onChange={(event) => changeParent(event.target.value || null)}
              >
                <option value="">顶级目录（无父笔记）</option>
                {flatTree.map((node) => (
                  <option disabled={excludedParentIds.has(node.id)} key={node.id} value={node.id}>
                    {`${"— ".repeat(node.depth)}${node.title}`}
                  </option>
                ))}
              </select>
            </div>

            <Field
              label="同级位置（从 0 开始）"
              min={0}
              type="number"
              value={String(form.sortOrder)}
              onChange={(value) => change("sortOrder", Math.max(0, Number(value) || 0))}
            />
            <Field label="分类" value={form.category} onChange={(value) => change("category", value)} />
            <Field label="标签（逗号分隔）" value={form.tags} onChange={(value) => change("tags", value)} />

            <div className="form-field">
              <label htmlFor="note-status">状态</label>
              <select
                className="form-control"
                id="note-status"
                value={form.status}
                onChange={(event) => change("status", event.target.value)}
              >
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <div className="form-field span-2">
              <label htmlFor="note-summary">摘要</label>
              <textarea
                className="form-control note-summary-input"
                id="note-summary"
                value={form.summary}
                onChange={(event) => change("summary", event.target.value)}
              />
            </div>

            <div className="form-field span-2">
              <MarkdownEditor
                id="note-content"
                label="Markdown / HTML 正文"
                minHeight={440}
                onChange={(value) => change("content", value)}
                placeholder={"## 本节标题\n\n可直接粘贴语雀、Notion 或其他来源的 Markdown / HTML。"}
                required
                value={form.content}
              />
            </div>
          </div>

          <div className="editor-actions">
            {form.id && form.status === "PUBLISHED" && (
              <a className="button small" href={`/notes/${form.slug}`} rel="noreferrer" target="_blank">公开预览</a>
            )}
            <button className="button small" onClick={() => setEditing(false)} type="button">取消</button>
            <button className="button primary small" disabled={saving} type="submit">
              {saving ? "保存中…" : "保存笔记"}
            </button>
          </div>
        </form>
      )}

      <section className="admin-panel note-tree-panel">
        <div className="panel-head">
          <div>
            <h2>知识目录树</h2>
            <p>拖到上部/中部/下部，分别表示放到目标之前、成为子笔记、放到目标之后。</p>
          </div>
          <span>{loading ? "加载中…" : `${flatTree.length} 篇笔记`}</span>
        </div>

        <div className={`note-admin-tree${moving ? " is-busy" : ""}`}>
          {loading ? (
            <p className="note-tree-placeholder">正在加载知识目录…</p>
          ) : tree.length ? (
            tree.map((node) => (
              <AdminTreeNode
                collapsed={collapsed}
                depth={0}
                dragId={dragId}
                dropTarget={dropTarget}
                key={node.id}
                node={node}
                onAddChild={openNew}
                onDelete={remove}
                onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                onDragOver={onDragOver}
                onDragStart={onDragStart}
                onDrop={dropOnNode}
                onEdit={openEdit}
                onToggle={toggleNode}
              />
            ))
          ) : (
            <p className="note-tree-placeholder">还没有笔记，创建第一篇顶级笔记开始构建知识树。</p>
          )}

          <div
            className="note-root-dropzone"
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
            onDrop={dropAtRoot}
          >
            拖到这里，移动为顶级笔记并放到目录末尾
          </div>
        </div>
      </section>
    </>
  );
}

function AdminTreeNode({
  node,
  depth,
  collapsed,
  dragId,
  dropTarget,
  onToggle,
  onEdit,
  onAddChild,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  node: AdminNoteTreeNode;
  depth: number;
  collapsed: Set<string>;
  dragId: string | null;
  dropTarget: DropTarget;
  onToggle: (id: string) => void;
  onEdit: (node: AdminNoteTreeNode) => void;
  onAddChild: (parentId: string | null) => void;
  onDelete: (node: AdminNoteTreeNode) => void;
  onDragStart: (event: DragEvent<HTMLElement>, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, id: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const indicator = dropTarget?.id === node.id ? ` drop-${dropTarget.zone}` : "";

  return (
    <div className="note-tree-branch">
      <div
        className={`note-tree-row${dragId === node.id ? " dragging" : ""}${indicator}`}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            // The next row will set its own indicator; leaving the tree clears naturally on drag end.
          }
        }}
        onDragOver={(event) => onDragOver(event, node.id)}
        onDrop={(event) => onDrop(event, node.id)}
        style={{ "--note-depth": depth } as React.CSSProperties}
      >
        <button
          aria-label={hasChildren ? `${isCollapsed ? "展开" : "收起"}${node.title}` : `${node.title} 没有子笔记`}
          className="note-tree-toggle"
          disabled={!hasChildren}
          onClick={() => onToggle(node.id)}
          type="button"
        >
          {hasChildren ? (isCollapsed ? "▸" : "▾") : "·"}
        </button>
        <span
          aria-label={`拖动 ${node.title}`}
          className="note-drag-handle"
          draggable
          onDragEnd={onDragEnd}
          onDragStart={(event) => onDragStart(event, node.id)}
          role="button"
          tabIndex={0}
          title="拖动调整目录位置"
        >
          ⋮⋮
        </span>
        <button className="note-tree-title" onClick={() => onEdit(node)} type="button">
          <strong>{node.title}</strong>
          <small>{node.slug}</small>
        </button>
        <span className={`status-badge ${node.status.toLowerCase()}`}>{statusLabels[node.status] || node.status}</span>
        <span className="note-tree-category">{node.category || "未分类"}</span>
        <div className="note-tree-actions">
          <button onClick={() => onAddChild(node.id)} type="button">新建子笔记</button>
          <button onClick={() => onEdit(node)} type="button">编辑</button>
          {node.status === "PUBLISHED" && <a href={`/notes/${node.slug}`} rel="noreferrer" target="_blank">查看</a>}
          <button className="danger" onClick={() => onDelete(node)} type="button">删除</button>
        </div>
      </div>

      {hasChildren && !isCollapsed && (
        <div className="note-tree-children">
          {node.children.map((child) => (
            <AdminTreeNode
              collapsed={collapsed}
              depth={depth + 1}
              dragId={dragId}
              dropTarget={dropTarget}
              key={child.id}
              node={child}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragStart={onDragStart}
              onDrop={onDrop}
              onEdit={onEdit}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  min?: number;
}) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input
        className="form-control"
        min={min}
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
