"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Sparkles, X } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { adminMutation, type AiContentType, type AiTextResult } from "@/lib/admin-api";

export function AiSummaryButton({
  content,
  contentType,
  onError,
  onGenerated,
  title,
}: {
  content: string;
  contentType: AiContentType;
  onError: (message: string) => void;
  onGenerated: (summary: string) => void;
  title: string;
}) {
  const [generating, setGenerating] = useState(false);

  async function generate() {
    if (!content.trim() || generating) return;
    setGenerating(true);
    try {
      const response = await adminMutation<AiTextResult>("/api/admin/ai/summary", {
        method: "POST",
        body: JSON.stringify({ contentType, title, content }),
      });
      onGenerated(response.data.text);
    } catch (error) {
      onError(error instanceof Error ? error.message : "AI 摘要生成失败");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      className="button small ai-action-button"
      disabled={!content.trim() || generating}
      onClick={() => void generate()}
      title={content.trim() ? "根据正文生成摘要" : "请先填写正文"}
      type="button"
    >
      {generating ? <LoaderCircle className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
      {generating ? "生成中" : "AI 生成摘要"}
    </button>
  );
}

export function AiPostBodyDialog({
  currentContent,
  onApply,
  onError,
  title,
}: {
  currentContent: string;
  onApply: (content: string, mode: "replace" | "append") => void;
  onError: (message: string) => void;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [generating, setGenerating] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    promptRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !generating) setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [generating, open]);

  async function generate() {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    try {
      const response = await adminMutation<AiTextResult>("/api/admin/ai/post-body", {
        method: "POST",
        body: JSON.stringify({ title, prompt }),
      });
      setResult(response.data.text);
    } catch (error) {
      onError(error instanceof Error ? error.message : "AI 正文生成失败");
    } finally {
      setGenerating(false);
    }
  }

  function apply(mode: "replace" | "append") {
    if (!result) return;
    onApply(result, mode);
    setOpen(false);
    setResult("");
    setPrompt("");
  }

  return (
    <>
      <button className="button small ai-action-button" onClick={() => setOpen(true)} type="button">
        <Sparkles aria-hidden="true" />
        AI 写正文
      </button>
      {open && (
        <div className="ai-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !generating) setOpen(false);
        }}>
          <section aria-labelledby="ai-post-dialog-title" aria-modal="true" className="ai-dialog" role="dialog">
            <header className="ai-dialog-header">
              <div>
                <span>AI WRITER</span>
                <h2 id="ai-post-dialog-title">生成博客正文</h2>
              </div>
              <button aria-label="关闭" className="icon-button" disabled={generating} onClick={() => setOpen(false)} type="button">
                <X aria-hidden="true" />
              </button>
            </header>

            <div className="ai-dialog-body">
              <div className="form-field">
                <label htmlFor="ai-post-prompt">写作提示词</label>
                <textarea
                  className="form-control ai-prompt-input"
                  id="ai-post-prompt"
                  maxLength={4000}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="例如：面向 Java 开发者，介绍 Redis 分布式锁的实现、常见错误和完整示例。"
                  ref={promptRef}
                  value={prompt}
                />
                <small className="field-help">{prompt.length}/4000</small>
              </div>

              {result && (
                <div className="ai-result-preview">
                  <div className="ai-result-label">生成结果预览</div>
                  <Markdown content={result} />
                </div>
              )}
            </div>

            <footer className="ai-dialog-actions">
              {!result ? (
                <button className="button primary" disabled={!prompt.trim() || generating} onClick={() => void generate()} type="button">
                  {generating ? <LoaderCircle className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                  {generating ? "正在生成" : "生成正文"}
                </button>
              ) : (
                <>
                  <button className="button small" disabled={generating} onClick={() => void generate()} type="button">
                    {generating && <LoaderCircle className="spin" aria-hidden="true" />}
                    {generating ? "重新生成中" : "重新生成"}
                  </button>
                  {currentContent.trim() && <button className="button small" onClick={() => apply("append")} type="button">追加到末尾</button>}
                  <button className="button primary small" onClick={() => apply("replace")} type="button">替换正文</button>
                </>
              )}
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
