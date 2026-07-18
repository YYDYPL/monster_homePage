import { TaxonomyManager } from "@/components/taxonomy-manager";

export default function Page() {
  return <TaxonomyManager
    title="标签管理"
    description="统一维护文章与笔记使用的标签，并查看每个标签的引用数量。"
    sections={[{ kind: "tags", title: "内容标签", description: "来自博客文章和知识库笔记" }]}
  />;
}
