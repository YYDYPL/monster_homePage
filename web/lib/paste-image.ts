import { mergeInlineColor, sanitizeInlineStyle } from "@/lib/markdown-inline-styles";

/**
 * Handles clipboard content from screenshots and rich text editors such as
 * Yuque and Notion. Rich HTML is converted to portable Markdown while remote
 * images are copied to the local media library whenever possible.
 */
export async function handleContentPaste(
  event: ClipboardEvent,
  onUploading?: (uploading: boolean) => void,
): Promise<boolean> {
  const data = event.clipboardData;
  const textarea = event.target as HTMLTextAreaElement | null;
  if (!data || !textarea) return false;

  const pasteSelection: PasteSelection = {
    textarea,
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  };
  const plainText = normalizePastedText(data.getData("text/plain"));

  try {
    const imageFiles = Array.from(data.files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length > 0) {
      event.preventDefault();
      onUploading?.(true);
      try {
        const urls: string[] = [];
        for (const file of imageFiles) urls.push(await uploadFile(file));
        insertText(pasteSelection, urls.map((url) => `![](${url})`).join("\n"), true);
      } catch (error) {
        console.error("clipboard image upload failed:", error);
        if (plainText) insertText(pasteSelection, plainText, false);
        else window.alert(error instanceof Error ? error.message : "Image upload failed");
      } finally {
        onUploading?.(false);
      }
      return true;
    }

    const html = data.getData("text/html");
    if (!html) return false;

    event.preventDefault();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const images = Array.from(doc.querySelectorAll("img"));
    const remoteSources = [...new Set(images
      .map((image) => image.getAttribute("src"))
      .filter((source): source is string => Boolean(source && /^https?:\/\//i.test(source))))];

    if (remoteSources.length > 0) {
      onUploading?.(true);
      try {
        const urlMap = new Map<string, string>();
        for (const source of remoteSources) {
          try {
            const file = await downloadImageAsFile(source);
            urlMap.set(source, await uploadFile(file));
          } catch (error) {
            console.warn("remote clipboard image kept at original URL:", source, error);
            urlMap.set(source, source);
          }
        }

        for (const image of images) {
          const source = image.getAttribute("src");
          if (!source || !urlMap.has(source)) continue;
          const alt = normalizePastedText(image.getAttribute("alt") || "").replace(/[\[\]]/g, "");
          image.replaceWith(`![${alt}](${urlMap.get(source)})`);
        }
      } finally {
        onUploading?.(false);
      }
    }

    const markdown = normalizePastedText(docToMarkdown(doc.body));
    insertText(pasteSelection, markdown || plainText, true);
    return true;
  } catch (error) {
    console.error("paste handler error:", error);
    if (event.defaultPrevented && plainText) {
      insertText(pasteSelection, plainText, false);
      return true;
    }
    return false;
  }
}

type PasteSelection = {
  textarea: HTMLTextAreaElement;
  start: number;
  end: number;
};

async function uploadFile(file: File): Promise<string> {
  const csrfRes = await fetch("/api/auth/csrf", { credentials: "include", cache: "no-store" });
  const csrfJson = await csrfRes.json();
  if (!csrfRes.ok || !csrfJson?.data?.headerName || !csrfJson?.data?.token) {
    throw new Error(csrfJson?.error?.message || "Unable to prepare image upload");
  }

  const headers: Record<string, string> = {
    [csrfJson.data.headerName]: csrfJson.data.token,
  };
  const body = new FormData();
  body.set("file", file);

  const response = await fetch("/api/admin/media", {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message || "Image upload failed");
  }
  const json = await response.json();
  return json.data.url as string;
}

async function downloadImageAsFile(source: string): Promise<File> {
  let response = await fetch(source, { mode: "cors" }).catch(() => null);
  if (!response?.ok) {
    response = await fetch(`/api/admin/media/proxy-download?url=${encodeURIComponent(source)}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error(`Unable to download image: ${source}`);
  }
  const blob = await response.blob();
  const name = source.split("/").pop()?.split("?")[0] || "image.png";
  return new File([blob], name, { type: blob.type || "image/png" });
}

function normalizePastedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFEFF]/g, "")
    .replace(/[\u2028\u2029]/g, "\n");
}

function insertText(selection: PasteSelection, text: string, block: boolean) {
  const { textarea, start, end } = selection;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const prefix = block && before && !before.endsWith("\n") ? "\n" : "";
  const suffix = block && after && !after.startsWith("\n") ? "\n" : "";
  const insertion = prefix + text + suffix;
  const newValue = before + insertion + after;

  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  nativeSetter?.call(textarea, newValue);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  const cursorPosition = start + insertion.length;
  textarea.setSelectionRange(cursorPosition, cursorPosition);
  textarea.focus();
}

function docToMarkdown(body: HTMLElement): string {
  const output: string[] = [];
  walk(body, output);
  return output.join("").replace(/\n{3,}/g, "\n\n").trim();
}

function walk(node: Node, output: string[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    output.push(node.textContent || "");
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  switch (tag) {
    case "br":
      output.push("\n");
      return;
    case "img": {
      const source = element.getAttribute("src");
      if (source && /^https?:\/\//i.test(source)) output.push(`![](${source})`);
      return;
    }
    case "hr":
      output.push("\n\n---\n\n");
      return;
    case "p":
    case "div":
    case "section":
    case "article":
      walkChildren(element, output);
      output.push("\n\n");
      return;
    case "blockquote":
      output.push("> ");
      walkChildren(element, output);
      output.push("\n\n");
      return;
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      output.push(`${"#".repeat(Number(tag[1]))} `);
      walkChildren(element, output);
      output.push("\n\n");
      return;
    case "strong":
    case "b":
      wrapChildren(element, output, "**", "**");
      return;
    case "em":
    case "i":
      wrapChildren(element, output, "*", "*");
      return;
    case "del":
    case "s":
    case "strike":
      wrapChildren(element, output, "~~", "~~");
      return;
    case "code":
      if (element.parentElement?.tagName.toLowerCase() !== "pre") {
        const text = element.textContent || "";
        const fence = text.includes("`") ? "``" : "`";
        output.push(fence, text, fence);
      }
      return;
    case "pre":
      appendCodeBlock(element, output);
      return;
    case "a": {
      const href = element.getAttribute("href") || "";
      output.push("[");
      walkChildren(element, output);
      output.push(`](${href})`);
      return;
    }
    case "li": {
      const parent = element.parentElement;
      const ordered = parent?.tagName.toLowerCase() === "ol";
      const index = ordered ? Array.from(parent?.children || []).indexOf(element) + 1 : 0;
      output.push(ordered ? `${index}. ` : "- ");
      walkChildren(element, output);
      output.push("\n");
      return;
    }
    case "ul":
    case "ol":
      walkChildren(element, output);
      output.push("\n");
      return;
    case "u":
    case "ins":
      wrapChildren(element, output, "<u>", "</u>");
      return;
    case "small":
      wrapChildren(element, output, "<small>", "</small>");
      return;
    case "sub":
    case "sup":
      wrapChildren(element, output, `<${tag}>`, `</${tag}>`);
      return;
    case "mark":
      appendStyledInline(element, output, "mark");
      return;
    case "font":
    case "span":
    case "label":
      appendStyledInline(element, output, "span");
      return;
    default:
      walkChildren(element, output);
  }
}

function walkChildren(element: HTMLElement, output: string[]) {
  element.childNodes.forEach((child) => walk(child, output));
}

function wrapChildren(element: HTMLElement, output: string[], before: string, after: string) {
  output.push(before);
  walkChildren(element, output);
  output.push(after);
}

function appendCodeBlock(element: HTMLElement, output: string[]) {
  const code = element.querySelector("code");
  const text = normalizePastedText(code?.textContent || element.textContent || "").replace(/\n$/, "");
  const language = extractCodeLanguage(code || element);
  const longestFence = Math.max(3, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length + 1));
  const fence = "`".repeat(longestFence);
  output.push(`\n\n${fence}${language ? language : ""}\n${text}\n${fence}\n\n`);
}

function extractCodeLanguage(element: Element): string {
  const className = element.getAttribute("class") || "";
  const classMatch = className.match(/(?:^|\s)(?:language|lang)-([a-z0-9_+-]+)/i);
  const raw = classMatch?.[1]
    || element.getAttribute("data-language")
    || element.getAttribute("data-lang")
    || element.parentElement?.getAttribute("data-language")
    || "";
  return raw.toLowerCase().replace(/[^a-z0-9_+-]/g, "");
}

function appendStyledInline(element: HTMLElement, output: string[], preferredTag: "mark" | "span") {
  const style = mergeInlineColor(
    sanitizeInlineStyle(element.getAttribute("style")),
    element.getAttribute("color"),
  );
  const classes = (element.getAttribute("class") || "")
    .split(/\s+/)
    .filter((name) => name === "md-text-small" || name === "md-text-large")
    .join(" ");

  if (!style && !classes && preferredTag === "span") {
    walkChildren(element, output);
    return;
  }

  const attributes = [
    classes ? `class="${classes}"` : "",
    style ? `style="${escapeAttribute(style)}"` : "",
  ].filter(Boolean).join(" ");
  const tag = preferredTag;
  output.push(`<${tag}${attributes ? ` ${attributes}` : ""}>`);
  walkChildren(element, output);
  output.push(`</${tag}>`);
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
