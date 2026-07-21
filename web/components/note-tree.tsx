import Link from "next/link";
import type { NoteTreeNode } from "@/lib/api";
import { containsNoteSlug } from "@/lib/note-tree";

export function NoteTree({
  tree,
  activeSlug,
  expandAll = false,
  label = "知识库目录",
}: {
  tree: NoteTreeNode[];
  activeSlug?: string;
  expandAll?: boolean;
  label?: string;
}) {
  if (!tree.length) return <p className="knowledge-tree-empty">目录中还没有已发布笔记。</p>;

  return (
    <nav className="knowledge-tree" aria-label={label}>
      <ul>
        {tree.map((node) => (
          <PublicTreeNode
            activeSlug={activeSlug}
            expandAll={expandAll}
            key={node.id}
            node={node}
          />
        ))}
      </ul>
    </nav>
  );
}

function PublicTreeNode({
  node,
  activeSlug,
  expandAll,
}: {
  node: NoteTreeNode;
  activeSlug?: string;
  expandAll: boolean;
}) {
  const active = node.slug === activeSlug;
  const hasChildren = node.children.length > 0;
  const shouldOpen = expandAll || active || containsNoteSlug(node, activeSlug);
  const link = (
    <Link
      aria-current={active ? "page" : undefined}
      className={`knowledge-tree-link${active ? " active" : ""}`}
      href={`/notes/${node.slug}`}
      prefetch={false}
    >
      <span className="knowledge-tree-node-icon" aria-hidden="true">
        {hasChildren ? "▱" : "·"}
      </span>
      <span>{node.title}</span>
    </Link>
  );

  return (
    <li className="knowledge-tree-item">
      {hasChildren ? (
        <details open={shouldOpen}>
          <summary>{link}</summary>
          <ul>
            {node.children.map((child) => (
              <PublicTreeNode
                activeSlug={activeSlug}
                expandAll={expandAll}
                key={child.id}
                node={child}
              />
            ))}
          </ul>
        </details>
      ) : (
        link
      )}
    </li>
  );
}

export function KnowledgeIndex({ tree }: { tree: NoteTreeNode[] }) {
  if (!tree.length) return null;
  return (
    <div className="knowledge-index">
      {tree.map((node, index) => (
        <KnowledgeIndexNode index={index + 1} key={node.id} node={node} />
      ))}
    </div>
  );
}

function KnowledgeIndexNode({ node, index }: { node: NoteTreeNode; index: number | string }) {
  const number = String(index).padStart(2, "0");
  return (
    <section className="knowledge-index-node">
      <div className="knowledge-index-line">
        <span className="knowledge-index-number">{number}</span>
        <div>
          <p>{node.category || "Knowledge"}</p>
          <h2>
            <Link href={`/notes/${node.slug}`} prefetch={false}>{node.title}</Link>
          </h2>
          {node.summary && <div className="knowledge-index-summary">{node.summary}</div>}
        </div>
        <Link className="knowledge-index-open" href={`/notes/${node.slug}`} prefetch={false} aria-label={`打开 ${node.title}`}>
          ↗
        </Link>
      </div>
      {node.children.length > 0 && (
        <div className="knowledge-index-children">
          {node.children.map((child, childIndex) => (
            <KnowledgeIndexChild
              index={`${index}.${childIndex + 1}`}
              key={child.id}
              node={child}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function KnowledgeIndexChild({ node, index }: { node: NoteTreeNode; index: string }) {
  return (
    <div className="knowledge-index-child">
      <div className="knowledge-index-child-row">
        <span>{index}</span>
        <div>
          <Link href={`/notes/${node.slug}`} prefetch={false}>{node.title}</Link>
          {node.summary && <p>{node.summary}</p>}
        </div>
        <span className="knowledge-index-child-meta">{node.category || "笔记"}</span>
      </div>
      {node.children.length > 0 && (
        <div className="knowledge-index-grandchildren">
          {node.children.map((child, childIndex) => (
            <KnowledgeIndexChild
              index={`${index}.${childIndex + 1}`}
              key={child.id}
              node={child}
            />
          ))}
        </div>
      )}
    </div>
  );
}
