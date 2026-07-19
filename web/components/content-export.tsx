"use client";

import { useEffect, useState, type FormEvent, type MouseEvent } from "react";

type ExportFormat = "markdown" | "html" | "pdf";

type ContentExportProps = {
  content: string;
  contentType: "article" | "note";
  publishedAt?: string;
  sourceId: string;
  summary?: string;
  tags?: string[];
  title: string;
  updatedAt?: string;
};

type ApiPayload = {
  success?: boolean;
  error?: { message?: string };
};

const formatOptions: { value: ExportFormat; label: string; description: string }[] = [
  { value: "markdown", label: "Markdown", description: "保留原始内容，适合继续编辑" },
  { value: "html", label: "HTML", description: "完整网页文件，可离线打开" },
  { value: "pdf", label: "PDF", description: "打开打印窗口并另存为 PDF" },
];

export function ContentExport(props: ContentExportProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !working) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, working]);

  function close() {
    if (working) return;
    setOpen(false);
    setError("");
  }

  function backdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) close();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!key.trim()) {
      setError("请输入导出密钥。");
      return;
    }

    const printWindow = format === "pdf" ? window.open("", "_blank", "width=980,height=760") : null;
    if (printWindow) {
      try { printWindow.opener = null; } catch { /* Browser may disallow changing opener. */ }
      printWindow.document.write("<!doctype html><title>Export</title><p style='font-family:sans-serif;padding:32px'>正在验证导出密钥…</p>");
    }

    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/export/authorize", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });
      const payload = await response.json().catch(() => null) as ApiPayload | null;
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message || `授权失败 (${response.status})`);
      }

      const source = document.getElementById(props.sourceId);
      if (!source) throw new Error("未找到可导出的正文内容。");

      const fileName = safeFileName(props.title);
      if (format === "markdown") {
        download(`${fileName}.md`, buildMarkdown(props), "text/markdown;charset=utf-8");
      } else {
        const html = buildHtml(source, props.title, format === "pdf");
        if (format === "html") {
          download(`${fileName}.html`, html, "text/html;charset=utf-8");
        } else {
          if (!printWindow) throw new Error("浏览器阻止了 PDF 打印窗口，请允许弹出窗口后重试。");
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
        }
      }

      setKey("");
      setOpen(false);
    } catch (reason) {
      printWindow?.close();
      setError(reason instanceof Error ? reason.message : "导出失败，请稍后重试。");
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <button className="content-export-trigger" type="button" onClick={() => setOpen(true)}>
        <span aria-hidden="true">↓</span>
        <span><strong>导出内容</strong><small>PDF / HTML / Markdown</small></span>
      </button>

      {open && (
        <div className="export-dialog-backdrop" onMouseDown={backdrop}>
          <section aria-labelledby="export-dialog-title" aria-modal="true" className="export-dialog" role="dialog">
            <div className="export-dialog-head">
              <div>
                <p className="eyebrow">Protected export</p>
                <h2 id="export-dialog-title">导出当前{props.contentType === "article" ? "文章" : "笔记"}</h2>
              </div>
              <button aria-label="关闭导出窗口" className="export-dialog-close" disabled={working} type="button" onClick={close}>×</button>
            </div>

            <form onSubmit={submit}>
              <fieldset className="export-format-list">
                <legend>选择格式</legend>
                {formatOptions.map((option) => (
                  <label className={format === option.value ? "selected" : ""} key={option.value}>
                    <input
                      checked={format === option.value}
                      name="export-format"
                      type="radio"
                      value={option.value}
                      onChange={() => setFormat(option.value)}
                    />
                    <span><strong>{option.label}</strong><small>{option.description}</small></span>
                  </label>
                ))}
              </fieldset>

              <div className="export-key-field">
                <label htmlFor="content-export-key">导出密钥</label>
                <input
                  autoComplete="off"
                  autoFocus
                  id="content-export-key"
                  maxLength={128}
                  placeholder="请输入站点管理员提供的密钥"
                  type="password"
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                />
                <small>密钥仅用于本次授权，不会保存在浏览器中。</small>
              </div>

              {error && <p className="export-error" role="alert">{error}</p>}

              <div className="export-dialog-actions">
                <button className="button" disabled={working} type="button" onClick={close}>取消</button>
                <button className="button primary" disabled={working} type="submit">
                  {working ? "验证中…" : format === "pdf" ? "打开 PDF 导出" : "验证并下载"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function buildMarkdown(props: ContentExportProps) {
  const frontMatter = [
    "---",
    `title: "${yaml(props.title)}"`,
    `type: ${props.contentType}`,
    props.summary ? `summary: "${yaml(props.summary)}"` : "",
    props.tags?.length ? `tags: [${props.tags.map((tag) => `"${yaml(tag)}"`).join(", ")}]` : "",
    props.publishedAt ? `publishedAt: ${props.publishedAt}` : "",
    props.updatedAt ? `updatedAt: ${props.updatedAt}` : "",
    typeof window !== "undefined" ? `source: ${window.location.href}` : "",
    "---",
  ].filter(Boolean).join("\n");
  return `${frontMatter}\n\n${props.content.trim()}\n`;
}

function buildHtml(source: HTMLElement, title: string, printMode: boolean) {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>("[href]").forEach((element) => {
    const href = element.getAttribute("href");
    if (href && !href.startsWith("#")) element.setAttribute("href", new URL(href, window.location.href).href);
  });
  clone.querySelectorAll<HTMLImageElement>("img[src]").forEach((image) => {
    image.src = new URL(image.getAttribute("src") || "", window.location.href).href;
    image.loading = "eager";
  });

  const printScript = printMode
    ? `<script>window.addEventListener("load",()=>setTimeout(()=>{window.focus();window.print()},450));<\/script>`
    : "";
  const sourceUrl = escapeHtml(window.location.href);
  const exportedAt = new Intl.DateTimeFormat("zh-CN", { dateStyle: "long", timeStyle: "short" }).format(new Date());

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{color-scheme:light}*{box-sizing:border-box}html{background:#eef0ea}body{margin:0;color:#182018;background:#eef0ea;font-family:Inter,"PingFang SC","Microsoft YaHei",Arial,sans-serif;line-height:1.8}.export-page{width:min(100% - 40px,980px);margin:36px auto;padding:58px 68px;background:#fff;border:1px solid #dfe3da;border-radius:22px;box-shadow:0 20px 60px rgba(31,40,27,.08)}h1{margin:.12em 0 .3em;font-size:clamp(38px,7vw,66px);line-height:1.05;letter-spacing:-.045em}h2{margin:2em 0 .7em;padding-bottom:.35em;border-bottom:1px solid #e1e5dd;font-size:30px;line-height:1.25}h3{margin:1.7em 0 .55em;font-size:23px}h4{font-size:19px}.eyebrow{margin:0 0 12px;color:#65b900;font:700 12px/1.2 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase}.article-summary{color:#596257;font-size:19px}.article-meta,.tag-row{display:flex;flex-wrap:wrap;gap:10px 18px;color:#778075;font-size:13px}.tag{color:#548f11}.article-header{margin-bottom:42px;padding-bottom:32px;border-bottom:1px solid #dfe3da}.markdown-body{font-size:16px;line-height:1.9;overflow-wrap:anywhere}.markdown-body p,.markdown-body ul,.markdown-body ol{margin:1em 0}.markdown-body a{color:#4e9700;text-decoration:underline;text-underline-offset:3px}.heading-anchor{display:none}.markdown-body img{display:block;max-width:100%;height:auto;margin:28px auto;border-radius:10px}.markdown-body blockquote{margin:1.4em 0;padding:10px 20px;border-left:4px solid #86d827;background:#f5faef;color:#4f594c}.markdown-body pre{overflow:auto;padding:20px;border-radius:12px;background:#121713;color:#edf3e8;white-space:pre-wrap;word-break:break-word}.markdown-body code{font-family:"SFMono-Regular",Consolas,monospace}.markdown-body :not(pre)>code{padding:.15em .42em;border-radius:5px;background:#eef1ea}.markdown-body table{width:100%;border-collapse:collapse;margin:1.4em 0}.markdown-body th,.markdown-body td{padding:9px 12px;border:1px solid #dfe3da;text-align:left}.export-source{margin-top:52px;padding-top:18px;border-top:1px solid #dfe3da;color:#778075;font-size:12px;overflow-wrap:anywhere}@page{size:A4;margin:16mm}@media(max-width:680px){.export-page{width:100%;margin:0;padding:30px 22px;border:0;border-radius:0}}@media print{html,body{background:#fff}.export-page{width:auto;margin:0;padding:0;border:0;border-radius:0;box-shadow:none}.markdown-body pre,.markdown-body blockquote,.markdown-body img,.markdown-body table{break-inside:avoid}a{color:inherit}}
</style>
</head>
<body>
<main class="export-page">${clone.innerHTML}<footer class="export-source">来源：${sourceUrl}<br>导出时间：${escapeHtml(exportedAt)}</footer></main>
${printScript}
</body>
</html>`;
}

function download(fileName: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob(["\ufeff", body], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFileName(value: string) {
  return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, " ").slice(0, 80) || "export";
}

function yaml(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);
}
