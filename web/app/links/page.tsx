import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { getFullProfile } from "@/lib/profile-api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "友情链接", description: "优质技术网站与常用资源。" };

export default async function LinksPage() {
  const profile = await getFullProfile();
  const links = profile.links?.links || [];

  return (
    <>
      <PageHero eyebrow="Bookmarks" title="链接与资源" description="我经常使用、长期关注或认为值得推荐的技术站点。" />
      <section className="list-section">
        <div className="container links-showcase-grid">
          {links.length === 0 && <p className="collection-empty">暂未添加友情链接。请前往后台“个人资料 → 友情链接”进行配置。</p>}
          {links.map((link, index) => (
            <a className="friend-link-card" href={link.url} target="_blank" rel="noreferrer" key={`${link.name}-${index}`}>
              <span className="friend-link-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="friend-link-logo">
                {link.imageUrl ? <img alt="" src={link.imageUrl} /> : <strong>{link.name.slice(0, 1).toUpperCase()}</strong>}
              </span>
              <span className="friend-link-copy"><strong>{link.name}</strong><small>{link.description}</small></span>
              <span className="friend-link-arrow">↗</span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
