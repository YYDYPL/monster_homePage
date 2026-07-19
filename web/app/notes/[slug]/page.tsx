import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentExport } from "@/components/content-export";
import { Markdown } from "@/components/markdown";
import { NoteTree } from "@/components/note-tree";
import { TableOfContents } from "@/components/table-of-contents";
import { formatDate, Tags } from "@/components/ui";
import { getNote, getNoteTree } from "@/lib/api";
import { extractHeadings } from "@/lib/markdown-headings";
import { findNoteTrail, flattenNoteTree } from "@/lib/note-tree";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const response = await getNote(slug);
  return response.success
    ? { title: response.data.title, description: response.data.summary }
    : { title: "知识笔记" };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [noteResponse, treeResponse] = await Promise.all([getNote(slug), getNoteTree()]);
  if (!noteResponse.success || !noteResponse.data) notFound();

  const note = noteResponse.data;
  const tree = treeResponse.success ? treeResponse.data : [];
  const headings = extractHeadings(note.content);
  const trail = findNoteTrail(tree, slug);
  const flat = flattenNoteTree(tree);
  const currentIndex = flat.findIndex((item) => item.slug === slug);
  const previous = currentIndex > 0 ? flat[currentIndex - 1] : undefined;
  const next = currentIndex >= 0 && currentIndex < flat.length - 1 ? flat[currentIndex + 1] : undefined;

  return (
    <article className="article-shell knowledge-article-shell">
      <div className="container knowledge-layout">
        <aside className="knowledge-sidebar">
          <div className="knowledge-sidebar-head">
            <Link href="/notes">知识库</Link>
            <span>{flat.length} 篇</span>
          </div>
          <NoteTree activeSlug={slug} tree={tree} />
        </aside>

        <div className="knowledge-content">
          <nav className="note-breadcrumbs" aria-label="面包屑">
            <Link href="/notes">知识库</Link>
            {trail.map((item, index) => (
              <span key={item.id}>
                <i>/</i>
                {index === trail.length - 1 ? item.title : <Link href={`/notes/${item.slug}`}>{item.title}</Link>}
              </span>
            ))}
          </nav>

          <div id="note-export-source" className="export-content-source">
            <header className="article-header note-article-header">
              <p className="eyebrow">{note.category || "Knowledge note"}</p>
              <h1>{note.title}</h1>
              {note.summary && <p className="article-summary">{note.summary}</p>}
              <div className="article-meta">
                <span>最近更新 {formatDate(note.updatedAt)}</span>
                <span>目录层级 {Math.max(trail.length, 1)}</span>
                <span>状态：持续维护</span>
              </div>
              <Tags tags={note.tags || []} />
            </header>

            <div className="mobile-page-toc">
              <TableOfContents headings={headings} />
            </div>
            <Markdown content={note.content} />
          </div>

          <nav className="note-sibling-nav" aria-label="相邻笔记">
            {previous ? (
              <Link href={`/notes/${previous.slug}`}>
                <span>上一篇</span>
                <strong>← {previous.title}</strong>
              </Link>
            ) : <span />}
            {next && (
              <Link href={`/notes/${next.slug}`}>
                <span>下一篇</span>
                <strong>{next.title} →</strong>
              </Link>
            )}
          </nav>
        </div>

        <aside className="page-toc-sidebar">
          <TableOfContents headings={headings} />
          <ContentExport
            content={note.content}
            contentType="note"
            publishedAt={note.publishedAt}
            sourceId="note-export-source"
            summary={note.summary}
            tags={note.tags || []}
            title={note.title}
            updatedAt={note.updatedAt}
          />
          <div className="note-maintenance-tip">
            <strong>持续修订</strong>
            <p>知识笔记会随着实践和认知变化持续更新，不代表最终结论。</p>
          </div>
        </aside>
      </div>
    </article>
  );
}
