import type { MarkdownHeading } from "@/lib/markdown-headings";

export function TableOfContents({ headings }: { headings: MarkdownHeading[] }) {
  return (
    <nav className="page-toc" aria-label="本页目录">
      <p className="page-toc-title">本页目录</p>
      {headings.length ? (
        <ol>
          {headings.map((heading) => (
            <li className={`toc-level-${heading.level}`} key={heading.id}>
              <a className="toc-link" href={`#${heading.id}`}>
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="page-toc-empty">正文暂时没有二级标题。</p>
      )}
    </nav>
  );
}
