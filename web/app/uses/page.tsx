import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { getFullProfile } from "@/lib/profile-api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "我的装备", description: "日常开发使用的软件、硬件和服务。" };

export default async function UsesPage() {
  const profile = await getFullProfile();
  const groups = profile.uses?.groups || [];

  return (
    <>
      <PageHero eyebrow="Uses" title="我的装备与工具" description="不是工具收藏，而是那些真正进入日常工作流、帮助我稳定产出的软硬件。" />
      <section className="list-section">
        <div className="container uses-groups">
          {groups.length === 0 && <p className="collection-empty">\u6682\u672a\u6dfb\u52a0\u88c5\u5907\u3002\u8bf7\u524d\u5f80\u540e\u53f0\u201c\u4e2a\u4eba\u8d44\u6599 \u2192 \u6211\u7684\u88c5\u5907\u201d\u8fdb\u884c\u914d\u7f6e\u3002</p>}
          {groups.map((group, groupIndex) => (
            <article className="uses-group-card" key={`${group.title}-${groupIndex}`}>
              <div className="uses-group-heading">
                <span className="number">{String(groupIndex + 1).padStart(2, "0")}</span>
                <div><p>Toolkit group</p><h2>{group.title}</h2></div>
              </div>
              <div className="uses-items-grid">
                {(group.items || []).map((item, itemIndex) => {
                  const body = (
                    <>
                      <span className="uses-item-visual">
                        {item.imageUrl ? <img alt="" src={item.imageUrl} /> : <strong>{item.name.slice(0, 1).toUpperCase()}</strong>}
                      </span>
                      <span className="uses-item-copy"><strong>{item.name}</strong><small>{item.description}</small></span>
                      {item.url && <span className="uses-item-arrow">↗</span>}
                    </>
                  );
                  return item.url
                    ? <a className="uses-item" href={item.url} key={`${item.name}-${itemIndex}`} rel="noreferrer" target="_blank">{body}</a>
                    : <div className="uses-item" key={`${item.name}-${itemIndex}`}>{body}</div>;
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
