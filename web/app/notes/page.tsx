import type { Metadata } from "next";
import { EmptyState, PageHero } from "@/components/ui";
import { KnowledgeIndex, NoteTree } from "@/components/note-tree";
import { fallbackNoteTree, getNoteTree } from "@/lib/api";
import { flattenNoteTree, noteTreeDepth } from "@/lib/note-tree";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "知识库",
  description: "按层级组织、持续更新的计算机科学与软件工程知识笔记。",
};

export default async function NotesPage() {
  const response = await getNoteTree();
  const tree = response.success ? response.data : fallbackNoteTree;
  const flat = flattenNoteTree(tree);
  const categoryCount = new Set(flat.map((note) => note.category).filter(Boolean)).size;
  const depth = noteTreeDepth(tree);

  return (
    <>
      <PageHero
        eyebrow="Knowledge graph"
        title="知识库"
        description="不是散落的笔记列表，而是一棵持续生长的知识树。沿着目录探索主题，也可以从任意节点深入它的子笔记。"
      >
        <div className="knowledge-stats" aria-label="知识库统计">
          <div><strong>{flat.length}</strong><span>篇笔记</span></div>
          <div><strong>{tree.length}</strong><span>个顶级主题</span></div>
          <div><strong>{categoryCount}</strong><span>个分类</span></div>
          <div><strong>{depth}</strong><span>层目录深度</span></div>
        </div>
      </PageHero>

      <section className="knowledge-home">
        <div className="container knowledge-home-layout">
          <aside className="knowledge-directory">
            <div className="knowledge-directory-head">
              <div>
                <p className="eyebrow">Directory</p>
                <h2>知识目录</h2>
              </div>
              <span>{flat.length} docs</span>
            </div>
            <NoteTree tree={tree} />
          </aside>

          <div className="knowledge-catalog">
            <div className="knowledge-catalog-head">
              <div>
                <p className="eyebrow">Explore</p>
                <h2>从一个主题开始</h2>
              </div>
              <p>标题均可点击进入对应笔记，缩进表示知识之间的父子关系。</p>
            </div>
            {tree.length ? (
              <KnowledgeIndex tree={tree} />
            ) : (
              <EmptyState title="知识树还没有内容" description="发布第一篇笔记后，它会出现在这里。" />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
