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
  const [format, setFormat] = useState<BlockFormat>("paragraph");
  const [preview, setPreview] = useState(true);
  const [uploading, setUploading] = useState(false);

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
    const selected = current.selected || "在这里输入代码";
    const fence = "```";
    const insertion = `${fence}\n${selected}\n${fence}`;
    const nextValue = value.slice(0, current.start) + insertion + value.slice(current.end);
    const nextStart = current.start + 4;
    updateValue(nextValue, nextStart, nextStart + selected.length);
    setFormat("paragraph");
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
        <ToolbarButton label="代码块" title="代码块" onClick={codeBlock}>▣</ToolbarButton>
        <ToolbarButton disabled={uploading} label="图片" title="上传图片" onClick={() => fileRef.current?.click()}>{uploading ? "…" : "▧"}</ToolbarButton>
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

