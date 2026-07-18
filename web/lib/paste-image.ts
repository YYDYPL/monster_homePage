/**
 * 处理 textarea 中的粘贴事件（接受原生 ClipboardEvent 或 React 合成事件）：
 * - 粘贴图片文件（截图等） → 自动上传并插入 ![](url)
 * - 粘贴含 <img> 的 HTML（语雀/Notion 等） → 下载远程图片并上传，HTML 转 Markdown
 * - 粘贴 HTML（无图片） → 转为纯文本保留换行
 * - 粘贴纯文本 → 默认行为
 * 返回 true 表示已处理，false 走默认行为。
 */
export async function handleContentPaste(
  event: ClipboardEvent,
  onUploading?: (uploading: boolean) => void,
): Promise<boolean> {
  try {
    const data = event.clipboardData;
    if (!data) return false;

    const files = data.files;

    // 1. 检查是否有图片文件（截图、本地文件等）
    const imageFiles: File[] = [];
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith("image/")) {
          imageFiles.push(files[i]);
        }
      }
    }

    if (imageFiles.length > 0) {
      event.preventDefault();
      onUploading?.(true);
      try {
        const urls: string[] = [];
        for (const file of imageFiles) {
          urls.push(await uploadFile(file));
        }
        insertText(event, urls.map((u) => `![](${u})`).join("\n"));
      } finally {
        onUploading?.(false);
      }
      return true;
    }

    // 2. 检查是否有 HTML 内容（从语雀/Notion/网页复制）
    const html = data.getData("text/html");
    if (!html) return false;

    const doc = new DOMParser().parseFromString(html, "text/html");
    const imgs = doc.querySelectorAll("img");
    const imgSrcs = Array.from(imgs)
      .map((img) => img.getAttribute("src"))
      .filter((s): s is string => !!s && (s.startsWith("http://") || s.startsWith("https://")));

    if (imgSrcs.length > 0) {
      event.preventDefault();
      onUploading?.(true);
      try {
        const urlMap = new Map<string, string>();
        for (const src of imgSrcs) {
          try {
            const file = await downloadImageAsFile(src);
            urlMap.set(src, await uploadFile(file));
          } catch {
            urlMap.set(src, src);
          }
        }

        for (const img of imgs) {
          const src = img.getAttribute("src");
          if (src && urlMap.has(src)) {
            img.replaceWith(`![](${urlMap.get(src)})`);
          }
        }

        const markdown = docToMarkdown(doc.body);
        insertText(event, markdown);
      } finally {
        onUploading?.(false);
      }
      return true;
    }

    // 3. 无图片但 HTML 和纯文本差异大 → 用纯文本粘贴（去格式）
    const plainText = data.getData("text/plain");
    if (plainText) {
      const htmlText = (doc.body.textContent || "").trim();
      if (Math.abs(htmlText.length - plainText.length) > plainText.length * 0.3) {
        event.preventDefault();
        insertText(event, plainText);
        return true;
      }
    }

    return false;
  } catch (e) {
    console.error("paste handler error:", e);
    return false;
  }
}

// ── helpers ──

async function uploadFile(file: File): Promise<string> {
  const csrfRes = await fetch("/api/auth/csrf", { credentials: "include", cache: "no-store" });
  const csrfJson = await csrfRes.json();
  const headers: Record<string, string> = {};
  headers[csrfJson.data.headerName] = csrfJson.data.token;

  const body = new FormData();
  body.set("file", file);

  const res = await fetch("/api/admin/media", {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message || "图片上传失败");
  }
  const json = await res.json();
  return json.data.url as string;
}

async function downloadImageAsFile(src: string): Promise<File> {
  let res = await fetch(src, { mode: "cors" }).catch(() => null);
  if (!res || !res.ok) {
    res = await fetch(`/api/admin/media/proxy-download?url=${encodeURIComponent(src)}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`无法下载图片: ${src}`);
  }
  const blob = await res.blob();
  const name = src.split("/").pop()?.split("?")[0] || "image.png";
  return new File([blob], name, { type: blob.type || "image/png" });
}

function insertText(event: ClipboardEvent, text: string) {
  const textarea = event.target as HTMLTextAreaElement;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const insertion = start === end && before ? "\n" + text + "\n" : text;
  const newValue = before + insertion + after;

  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  nativeSetter?.call(textarea, newValue);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  const cursorPos = start + insertion.length;
  textarea.setSelectionRange(cursorPos, cursorPos);
}

// ── DOM → Markdown ──

function docToMarkdown(body: HTMLElement): string {
  const lines: string[] = [];
  walk(body, lines);
  return lines.join("").replace(/\n{3,}/g, "\n\n").trim();
}

function walk(node: Node, lines: string[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    lines.push((node.textContent || "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\""));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "br": lines.push("\n"); return;
    case "img": return;
    case "hr": lines.push("\n---\n"); return;
    case "p": case "div": case "section": case "article": case "blockquote":
      el.childNodes.forEach((c) => walk(c, lines));
      lines.push("\n\n"); return;
    case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
      lines.push("#".repeat(Number(tag[1])) + " ");
      el.childNodes.forEach((c) => walk(c, lines));
      lines.push("\n\n"); return;
    case "strong": case "b":
      lines.push("**"); el.childNodes.forEach((c) => walk(c, lines)); lines.push("**"); return;
    case "em": case "i":
      lines.push("*"); el.childNodes.forEach((c) => walk(c, lines)); lines.push("*"); return;
    case "code":
      if (el.parentElement?.tagName.toLowerCase() !== "pre") {
        lines.push("`"); el.childNodes.forEach((c) => walk(c, lines)); lines.push("`");
      } else { el.childNodes.forEach((c) => walk(c, lines)); }
      return;
    case "pre":
      lines.push("\n```\n"); el.childNodes.forEach((c) => walk(c, lines)); lines.push("\n```\n"); return;
    case "a":
      lines.push("["); el.childNodes.forEach((c) => walk(c, lines)); lines.push(`](${el.getAttribute("href") || ""})`); return;
    case "li":
      lines.push("- "); el.childNodes.forEach((c) => walk(c, lines)); lines.push("\n"); return;
    case "ul": case "ol":
      el.childNodes.forEach((c) => walk(c, lines)); lines.push("\n"); return;
    case "span": case "small": case "label": case "sub": case "sup": case "del": case "ins":
      el.childNodes.forEach((c) => walk(c, lines)); return;
    default:
      el.childNodes.forEach((c) => walk(c, lines));
  }
}
