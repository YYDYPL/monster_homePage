import { TaxonomyManager } from "@/components/taxonomy-manager";

export default function Page() {
  return <TaxonomyManager
    title="系列与分类"
    description="维护文章系列、笔记分类和项目技术栈，重命名会同步更新所有引用。"
    sections={[
      { kind: "series", title: "文章系列", description: "用于组织连续发布的主题文章" },
      { kind: "categories", title: "笔记分类", description: "用于构建知识库目录和主题导航" },
      { kind: "technologies", title: "项目技术栈", description: "来自作品集项目的技术栈字段" },
    ]}
  />;
}
