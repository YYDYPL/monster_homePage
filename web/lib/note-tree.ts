import type { NoteTreeNode } from "@/lib/api";

export type FlatNoteTreeItem = NoteTreeNode & { depth: number };

export function flattenNoteTree(tree: NoteTreeNode[], depth = 0): FlatNoteTreeItem[] {
  return tree.flatMap((node) => [
    { ...node, depth },
    ...flattenNoteTree(node.children, depth + 1),
  ]);
}

export function findNoteTrail(tree: NoteTreeNode[], slug: string): NoteTreeNode[] {
  for (const node of tree) {
    if (node.slug === slug) return [node];
    const nested = findNoteTrail(node.children, slug);
    if (nested.length) return [node, ...nested];
  }
  return [];
}

export function containsNoteSlug(node: NoteTreeNode, slug?: string): boolean {
  if (!slug) return false;
  return node.slug === slug || node.children.some((child) => containsNoteSlug(child, slug));
}

export function noteTreeDepth(tree: NoteTreeNode[]): number {
  if (!tree.length) return 0;
  return Math.max(...tree.map((node) => 1 + noteTreeDepth(node.children)));
}

export function siblingNotes(tree: NoteTreeNode[], parentId: string | null): NoteTreeNode[] {
  if (parentId === null) return tree;
  for (const node of tree) {
    if (node.id === parentId) return node.children;
    const nested = siblingNotes(node.children, parentId);
    if (nested.length) return nested;
  }
  return [];
}
