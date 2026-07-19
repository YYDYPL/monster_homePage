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
          {links.length === 0 && <p className="collection-empty">\u6682\u672a\u6dfb\u52a0\u53cb\u60c5\u94fe\u63a5\u3002\u8bf7\u524d\u5f80\u540e\u53f0\u201c\u4e2a\u4eba\u8d44\u6599 \u2192 \u53cb\u60c5\u94fe\u63a5\u201d\u8fdb\u884c\u914d\u7f6e\u3002</p>}
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
