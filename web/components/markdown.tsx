import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { createHeadingIdGenerator } from "@/lib/markdown-headings";

function textFromChildren(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textFromChildren).join("");
  if (isValidElement<{ children?: ReactNode }>(children)) return textFromChildren(children.props.children);
  return "";
}

export function Markdown({ content }: { content: string }) {
  const nextHeadingId = createHeadingIdGenerator();
  const heading = (level: 2 | 3 | 4) => {
    const HeadingTag = `h${level}` as const;
    return function MarkdownHeading({ children }: { children?: ReactNode }) {
      const text = textFromChildren(children);
      const id = nextHeadingId(text);
      return (
        <HeadingTag id={id}>
          <a className="heading-anchor" href={`#${id}`} aria-label={`链接到“${text}”`}>
            #
          </a>
          {children}
        </HeadingTag>
      );
    };
  };
  const components: Components = {
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
  };

  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
