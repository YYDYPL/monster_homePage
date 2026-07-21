"use client";

import { useRef, useState, type ClipboardEvent, type ChangeEvent, type ReactNode } from "react";
import { Markdown } from "@/components/markdown";
import { adminUpload, type MediaItem } from "@/lib/admin-api";
import { handleContentPaste } from "@/lib/paste-image";

type MarkdownEditorProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  minHeight?: number;
};

type BlockFormat = "paragraph" | "h1" | "h2" | "h3" | "h4" | "quote" | "bullet" | "numbered";
type CodeLanguage = "plain" | "bash" | "javascript" | "typescript" | "java" | "python" | "sql" | "json" | "html" | "css" | "yaml" | "dockerfile";

const blockPrefixes: Record<BlockFormat, string> = {
  paragraph: "",
  h1: "# ",
  h2: "## ",
  h3: "### ",
  h4: "#### ",
  quote: "> ",
  bullet: "- ",
  numbered: "1. ",
};

const codeLanguages: Array<{ value: CodeLanguage; label: string }> = [
  { value: "plain", label: "\u7eaf\u6587\u672c" },
  { value: "bash", label: "Bash / Shell" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "java", label: "Java" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "yaml", label: "YAML" },
  { value: "dockerfile", label: "Dockerfile" },
];

export function MarkdownEditor({
  id,
  label = "Markdown 正文",
  value,
  onChange,
  required = false,
  placeholder,
  minHeight = 360,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const markdownFileRef = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<BlockFormat>("paragraph");
  const [preview, setPreview] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>("plain");
  const [textColor, setTextColor] = useState("#ef4444");
  const [highlightColor, setHighlightColor] = useState("#fef08a");

  function updateValue(nextValue: string, cursorStart?: number, cursorEnd = cursorStart) {
    onChange(nextValue);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea || cursorStart === undefined) return;
      textarea.focus();
      textarea.setSelectionRange(cursorStart, cursorEnd ?? cursorStart);
    });
  }

  function selection() {
    const textarea = textareaRef.current;
    if (!textarea) return null;
    return {
      textarea,
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
      selected: value.slice(textarea.selectionStart, textarea.selectionEnd),
    };
  }

  function wrap(before: string, after = before, emptyText = "文本") {
    const current = selection();
    if (!current) return;
    const selected = current.selected || emptyText;
    const nextValue = value.slice(0, current.start) + before + selected + after + value.slice(current.end);
    const nextStart = current.start + before.length;
    updateValue(nextValue, nextStart, nextStart + selected.length);
  }

  function applyBlock(nextFormat: BlockFormat) {
    const current = selection();
    if (!current) return;
    const prefix = blockPrefixes[nextFormat];
    const lineStart = value.lastIndexOf("\n", Math.max(0, current.start - 1)) + 1;
    const lineEndIndex = value.indexOf("\n", current.end);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n").map((line) => {
      const withoutPrefix = line.replace(/^\s*(?:#{1,6}\s+|>\s+|[-*+]\s+|\d+[.)]\s+)/, "");
      return prefix ? prefix + withoutPrefix : withoutPrefix;
    });
    const replacement = lines.join("\n");
    const nextValue = value.slice(0, lineStart) + replacement + value.slice(lineEnd);
    updateValue(nextValue, lineStart, lineStart + replacement.length);
    setFormat(nextFormat);
  }

  function codeBlock() {
    const current = selection();
    if (!current) return;
    const selected = current.selected || "\u5728\u8fd9\u91cc\u8f93\u5165\u4ee3\u7801";
    const fence = "```";
    const language = codeLanguage === "plain" ? "" : codeLanguage;
    const opening = `${fence}${language}\n`;
    const insertion = `${opening}${selected}\n${fence}`;
    const nextValue = value.slice(0, current.start) + insertion + value.slice(current.end);
    const nextStart = current.start + opening.length;
    updateValue(nextValue, nextStart, nextStart + selected.length);
    setFormat("paragraph");
  }

  async function importMarkdownFile(file: File) {
    const maxMarkdownBytes = 10 * 1024 * 1024;
    if (file.size > maxMarkdownBytes) {
      window.alert("Markdown \u6587\u4ef6\u4e0d\u80fd\u8d85\u8fc7 10MB");
      if (markdownFileRef.current) markdownFileRef.current.value = "";
      return;
    }
    if (!/\.(md|markdown)$/i.test(file.name)) {
      window.alert("\u8bf7\u9009\u62e9 .md \u6216 .markdown \u6587\u4ef6");
      if (markdownFileRef.current) markdownFileRef.current.value = "";
      return;
    }
    try {
      const text = await file.text();
      const current = selection();
      if (!current) return;
      const before = value.slice(0, current.start);
      const after = value.slice(current.end);
      const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
      const suffix = after && !after.startsWith("\n") ? "\n\n" : "";
      updateValue(before + prefix + text.replace(/\r\n?/g, "\n") + suffix + after, current.start + prefix.length + text.length);
    } catch {
      window.alert("\u004d\u0061\u0072\u006b\u0064\u006f\u0077\u006e \u6587\u4ef6\u8bfb\u53d6\u5931\u8d25");
    } finally {
      if (markdownFileRef.current) markdownFileRef.current.value = "";
    }
  }

  function onMarkdownFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void importMarkdownFile(file);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const response = await adminUpload<MediaItem>("/api/admin/media", file);
      const current = selection();
      if (!current) return;
      const insertion = `![${file.name}](${response.data.url})`;
      updateValue(value.slice(0, current.start) + insertion + value.slice(current.end), current.start + insertion.length);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploadImage(file);
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    void handleContentPaste(event.nativeEvent, setUploading);
  }

  return (
    <div className="markdown-editor">
      <div className="markdown-editor-label-row">
        <label htmlFor={id}>{label}</label>
        <span className="markdown-editor-hint">支持 Markdown、语雀/Notion HTML、截图和远程图片</span>
      </div>
      <div className="markdown-toolbar" role="toolbar" aria-label="Markdown 格式工具栏">
        <select
          aria-label="段落格式"
          className="markdown-toolbar-select"
          onChange={(event) => applyBlock(event.target.value as BlockFormat)}
          value={format}
        >
          <option value="paragraph">正文段落</option>
          <option value="h1">一级标题</option>
          <option value="h2">二级标题</option>
          <option value="h3">三级标题</option>
          <option value="h4">四级标题</option>
          <option value="quote">引用段落</option>
          <option value="bullet">无序列表</option>
          <option value="numbered">有序列表</option>
        </select>
        <span className="toolbar-divider" />
        <ToolbarButton label="粗体" title="粗体" onClick={() => wrap("**")}><strong>B</strong></ToolbarButton>
        <ToolbarButton label="斜体" title="斜体" onClick={() => wrap("*")}><em>I</em></ToolbarButton>
        <ToolbarButton label="删除线" title="删除线" onClick={() => wrap("~~")}><s>S</s></ToolbarButton>
        <ToolbarButton label="行内代码" title="行内代码" onClick={() => wrap("`")}><code>&lt;/&gt;</code></ToolbarButton>
        <ToolbarButton label="高亮" title="高亮" onClick={() => wrap("<mark>", "</mark>")}><span className="toolbar-mark">A</span></ToolbarButton>
        <ToolbarButton label={"\u4e0b\u5212\u7ebf"} title={"\u4e0b\u5212\u7ebf"} onClick={() => wrap("<u>", "</u>")}><u>U</u></ToolbarButton>
        <ToolbarButton label={"\u5c0f\u5b57\u53f7"} title={"\u5c0f\u5b57\u53f7"} onClick={() => wrap('<span class="md-text-small">', "</span>")}><small>A-</small></ToolbarButton>
        <ToolbarButton label={"\u5927\u5b57\u53f7"} title={"\u5927\u5b57\u53f7"} onClick={() => wrap('<span class="md-text-large">', "</span>")}><strong>A+</strong></ToolbarButton>
        <span className="toolbar-divider" />
        <ToolbarButton label="链接" title="插入链接" onClick={() => {
          const url = window.prompt("请输入链接地址");
          if (url) wrap("[", `](${url})`, "链接文字");
        }}>↗</ToolbarButton>
        <select
          aria-label={"\u4ee3\u7801\u8bed\u8a00"}
          className="markdown-toolbar-select code-language-select"
          onChange={(event) => setCodeLanguage(event.target.value as CodeLanguage)}
          title={"\u9009\u62e9\u4ee3\u7801\u5757\u8bed\u8a00"}
          value={codeLanguage}
        >
          {codeLanguages.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
        </select>
        <ToolbarButton label={"\u4ee3\u7801\u5757"} title={"\u63d2\u5165\u4ee3\u7801\u5757"} onClick={codeBlock}>{"\u25a3"}</ToolbarButton>
        <span className="toolbar-divider" />
        <label className="markdown-color-control" title={"\u6587\u5b57\u989c\u8272"}>
          <span style={{ color: textColor }}>A</span>
          <input
            aria-label={"\u6587\u5b57\u989c\u8272"}
            onChange={(event) => {
              const color = event.target.value;
              setTextColor(color);
              wrap(`<span style="color: ${color}">`, "</span>");
            }}
            type="color"
            value={textColor}
          />
        </label>
        <label className="markdown-color-control" title={"\u80cc\u666f\u9ad8\u4eae\u989c\u8272"}>
          <span style={{ backgroundColor: highlightColor, color: "#111827" }}>A</span>
          <input
            aria-label={"\u80cc\u666f\u9ad8\u4eae\u989c\u8272"}
            onChange={(event) => {
              const color = event.target.value;
              setHighlightColor(color);
              wrap(`<span style="background-color: ${color}; padding: .08em .24em; border-radius: .25em">`, "</span>");
            }}
            type="color"
            value={highlightColor}
          />
        </label>
        <ToolbarButton label={"\u5bfc\u5165 Markdown"} title={"\u5bfc\u5165 Markdown \u6587\u4ef6"} onClick={() => markdownFileRef.current?.click()}>MD</ToolbarButton>
        <input ref={markdownFileRef} accept=".md,.markdown,text/markdown,text/plain" hidden onChange={onMarkdownFileChange} type="file" />
        <ToolbarButton disabled={uploading} label={"\u56fe\u7247"} title={"\u4e0a\u4f20\u56fe\u7247"} onClick={() => fileRef.current?.click()}>{uploading ? "\u2026" : "\u25a7"}</ToolbarButton>
        <input ref={fileRef} accept="image/*" hidden onChange={onFileChange} type="file" />
        <button className={`markdown-preview-toggle ${preview ? "active" : ""}`} onClick={() => setPreview((current) => !current)} type="button">
          {preview ? "隐藏预览" : "显示预览"}
        </button>
      </div>
      <div className={`markdown-editor-workspace ${preview ? "with-preview" : "editor-only"}`}>
        <textarea
          ref={textareaRef}
          aria-label={label}
          className="form-control markdown-content-input"
          id={id}
          minLength={required ? 1 : undefined}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
          placeholder={placeholder}
          required={required}
          style={{ minHeight }}
          value={value}
        />
        {preview && (
          <div className="markdown-live-preview">
            <div className="markdown-preview-label">实时预览</div>
            {value ? <Markdown content={value} /> : <p className="markdown-empty-preview">输入内容后在这里预览。</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  disabled = false,
  label,
  onClick,
  title,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  title: string;
}) {
  return <button aria-label={label} className="markdown-toolbar-button" disabled={disabled} onClick={onClick} title={title} type="button">{children}</button>;
}

