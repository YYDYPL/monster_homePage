import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { createHeadingIdGenerator } from "@/lib/markdown-headings";

const contentSchema = {
  ...defaultSchema,
  tagNames: [...new Set([...(defaultSchema.tagNames || []), "mark", "small", "u"])],
  attributes: {
    ...defaultSchema.attributes,
    img: [
      ...(defaultSchema.attributes?.img || []),
      "alt",
      "title",
      "width",
      "height",
      "crop",
      ["className", "ne-image"],
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      ["className", "md-text-small", "md-text-large"],
    ],
  },
};

function textFromChildren(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textFromChildren).join("");
  if (isValidElement<{ children?: ReactNode }>(children)) return textFromChildren(children.props.children);
  return "";
}

/**
 * Render Markdown copied from other editors (including Yuque/Notion HTML).
 *
 * `rehypeRaw` is intentionally paired with `rehypeSanitize`: it lets us render
 * legitimate inline HTML such as Yuque's `<img ... width="...">` while
 * stripping scripts, event handlers and unsafe URLs before React receives the tree.
 */
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
    img: ({ src, alt, title, width, height, className, ...props }) => {
      if (!src) return null;
      return (
        <img
          {...props}
          alt={alt || ""}
          className={`markdown-image${className ? ` ${className}` : ""}`}
          height={height}
          loading="lazy"
          referrerPolicy="no-referrer"
          src={src}
          title={title || undefined}
          width={width}
        />
      );
    },
    a: ({ href, children, ...props }) => (
      <a {...props} href={href} rel={href?.startsWith("http") ? "noreferrer" : undefined} target={href?.startsWith("http") ? "_blank" : undefined}>
        {children}
      </a>
    ),
  };

  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={components}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, contentSchema], rehypeHighlight]}
        remarkPlugins={[remarkGfm]}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}
