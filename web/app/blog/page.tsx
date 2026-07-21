import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHero, PostCard } from "@/components/ui";
import { fallbackPosts, getPosts, getTags } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "技术博客",
  description: "Java、Spring、数据库、架构与工程实践文章。",
};

type BlogSearchParams = {
  page?: string;
  size?: string;
  tag?: string;
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const size = [6, 10, 20].includes(Number(params.size)) ? Number(params.size) : 10;
  const selectedTag = params.tag?.trim() || "";
  const [response, tagsResponse] = await Promise.all([
    getPosts(page, size, selectedTag),
    getTags(),
  ]);
  const data = response.success
    ? response.data
    : {
        items: page === 1 ? fallbackPosts : [],
        page,
        size,
        total: fallbackPosts.length,
        totalPages: 1,
      };
  const tags = tagsResponse.success
    ? tagsResponse.data.slice(0, 10)
    : ["Java", "Spring", "数据库", "架构", "DevOps"];

  function href(nextPage: number, nextSize = size, nextTag = selectedTag) {
    const query = new URLSearchParams();
    if (nextTag) query.set("tag", nextTag);
    if (nextPage > 1) query.set("page", String(nextPage));
    if (nextSize !== 10) query.set("size", String(nextSize));
    const value = query.toString();
    return value ? `/blog?${value}` : "/blog";
  }

  return (
    <>
      <PageHero
        eyebrow="Writing"
        title="技术博客"
        description="记录技术选择背后的思考、真实项目中的取舍，以及那些值得重复使用的工程经验。"
      >
        <div className="filter-bar" aria-label="文章标签筛选">
          <Link className={!selectedTag ? "active" : ""} href={href(1, size, "")}>
            全部文章
          </Link>
          {tags.map((tag) => (
            <Link
              className={selectedTag === tag ? "active filter-chip" : "filter-chip"}
              href={href(1, size, tag)}
              key={tag}
            >
              #{tag}
            </Link>
          ))}
        </div>
      </PageHero>

      <section className="list-section">
        <div className="container">
          <div className="list-toolbar">
            <span>
              {selectedTag ? `标签：#${selectedTag}` : "全部文章"} · 共 {data.total} 篇
            </span>
            <span>
              每页
              {[6, 10, 20].map((option) => (
                <Link
                  className={option === size ? "active" : ""}
                  href={href(1, option)}
                  key={option}
                >
                  {option}
                </Link>
              ))}
              篇
            </span>
          </div>

          <div className="content-grid">
            {data.items.length ? (
              data.items.map((post) => <PostCard post={post} key={post.id} />)
            ) : (
              <EmptyState title="没有匹配的文章" description="换一个标签试试吧。" />
            )}
          </div>

          {data.totalPages > 1 && (
            <nav className="pagination" aria-label="博客分页">
              {page > 1 && <Link href={href(page - 1)}>← 上一页</Link>}
              <span className="current">
                第 {page} / {data.totalPages} 页
              </span>
              {page < data.totalPages && (
                <Link href={href(page + 1)}>下一页 →</Link>
              )}
            </nav>
          )}
        </div>
      </section>
    </>
  );
}