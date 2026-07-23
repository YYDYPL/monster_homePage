"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
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
    <InteractiveNoteTree
      activeSlug={activeSlug}
      expandAll={expandAll}
      key={activeSlug || "knowledge-root"}
      label={label}
      tree={tree}
    />
  );
}

function InteractiveNoteTree({
  tree,
  activeSlug,
  expandAll,
  label,
}: {
  tree: NoteTreeNode[];
  activeSlug?: string;
  expandAll: boolean;
  label: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => initialExpanded(tree, activeSlug, expandAll));

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <nav className="knowledge-tree" aria-label={label}>
      <ul>
        {tree.map((node) => (
          <PublicTreeNode
            activeSlug={activeSlug}
            expanded={expanded}
            key={node.id}
            node={node}
            onToggle={toggle}
          />
        ))}
      </ul>
    </nav>
  );
}

function PublicTreeNode({
  node,
  activeSlug,
  expanded,
  onToggle,
}: {
  node: NoteTreeNode;
  activeSlug?: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const active = node.slug === activeSlug;
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const childListId = `knowledge-tree-children-${node.id}`;

  return (
    <li className="knowledge-tree-item">
      <div className="knowledge-tree-row">
        {hasChildren ? (
          <button
            aria-controls={childListId}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "收起" : "展开"}${node.title}`}
            className="knowledge-tree-toggle"
            onClick={() => onToggle(node.id)}
            type="button"
          >
            {isOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          </button>
        ) : <span className="knowledge-tree-toggle-spacer" />}
        <Link
          aria-current={active ? "page" : undefined}
          className={`knowledge-tree-link${active ? " active" : ""}`}
          href={`/notes/${node.slug}`}
          prefetch={false}
        >
          {!hasChildren && <span className="knowledge-tree-leaf" aria-hidden="true">·</span>}
          <span>{node.title}</span>
        </Link>
      </div>
      {hasChildren && isOpen && (
        <ul id={childListId}>
          {node.children.map((child) => (
            <PublicTreeNode
              activeSlug={activeSlug}
              expanded={expanded}
              key={child.id}
              node={child}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function initialExpanded(tree: NoteTreeNode[], activeSlug?: string, expandAll = false) {
  const ids = new Set<string>();
  if (expandAll) addAllParents(tree, ids);
  else if (activeSlug) addActivePath(tree, activeSlug, ids);
  return ids;
}

function addAllParents(tree: NoteTreeNode[], ids: Set<string>) {
  for (const node of tree) {
    if (node.children.length) {
      ids.add(node.id);
      addAllParents(node.children, ids);
    }
  }
}

function addActivePath(tree: NoteTreeNode[], activeSlug: string, ids: Set<string>) {
  for (const node of tree) {
    if (!containsNoteSlug(node, activeSlug)) continue;
    if (node.children.length) ids.add(node.id);
    addActivePath(node.children, activeSlug, ids);
    return;
  }
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
