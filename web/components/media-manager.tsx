"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { adminGet, adminMutation, adminUpload, type MediaItem } from "@/lib/admin-api";
import type { PageResponse } from "@/lib/api";

export function MediaManager() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    adminGet<PageResponse<MediaItem>>("/api/admin/media?size=60")
      .then((response) => { if (active) setItems(response.data.items); })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "媒体列表加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const response = await adminUpload<MediaItem>("/api/admin/media", file);
      setItems((current) => [response.data, ...current]);
      setMessage("图片上传成功，点击 URL 即可复制。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function remove(item: MediaItem) {
    if (!window.confirm(`确定删除 ${item.originalName}？`)) return;
    try {
      await adminMutation<string>(`/api/admin/media/${item.id}`, { method: "DELETE" });
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败");
    }
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage(`已复制：${url}`);
  }

  return <>
    <div className="admin-heading">
      <div><h1>媒体资源</h1><p>上传和管理文章封面、项目截图等站点图片。</p></div>
      <div>
        <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={upload}/>
        <button className="button primary small" disabled={uploading} onClick={() => inputRef.current?.click()} type="button">{uploading ? "上传中…" : "上传图片"}</button>
      </div>
    </div>
    {message && <p className="admin-notice">{message}</p>}
    <section className="admin-panel media-panel">
      {loading ? <div className="empty-state">正在加载媒体资源…</div> : items.length === 0 ? <div className="empty-state"><strong>还没有图片</strong><span>上传第一张图片后，可将 URL 填入文章封面或项目图片字段。</span></div> :
        <div className="media-grid">{items.map((item) => <article className="media-card" key={item.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt={item.originalName}/>
          <div className="media-copy"><strong title={item.originalName}>{item.originalName}</strong><span>{formatBytes(item.sizeBytes)} · {item.contentType.replace("image/", "").toUpperCase()}</span></div>
          <div className="media-actions"><button type="button" onClick={() => copy(item.url)}>复制 URL</button><button className="danger" type="button" onClick={() => remove(item)}>删除</button></div>
        </article>)}</div>}
    </section>
  </>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
