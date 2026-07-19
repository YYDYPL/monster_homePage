import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import { fallbackSiteConfig, getSiteConfig } from "@/lib/api";
import { getFullProfile } from "@/lib/profile-api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "\u5173\u4e8e\u6211", description: "\u5173\u4e8e Monster \u7684\u6280\u672f\u65b9\u5411\u3001\u6280\u80fd\u6808\u4e0e\u5b66\u4e60\u7ecf\u5386\u3002" };

export default async function AboutPage() {
  const [profile, configResponse] = await Promise.all([getFullProfile(), getSiteConfig(true)]);
  const config = configResponse.success ? { ...fallbackSiteConfig, ...configResponse.data } : fallbackSiteConfig;
  const about = profile.about || { profileName: "Monster", profileTagline: "", profileBio: "", story1: "", story2: "", skillGroups: [], timeline: [] };
  const displayName = about.profileName || config.ownerName || "Monster";
  const githubUrl = config.githubUrl && config.githubUrl !== "https://github.com/" ? config.githubUrl : "";

  return (
    <>
      <PageHero eyebrow="About me" title={`\u4f60\u597d\uff0c\u6211\u662f ${displayName}\u3002`} description={about.profileTagline || config.headline || "\u8ba1\u7b97\u673a\u4e13\u4e1a\u5f00\u53d1\u8005"} />
      <section className="list-section">
        <div className="container profile-grid">
          <aside className="profile-card profile-card-enhanced">
            <div className={`profile-avatar ${config.avatarUrl ? "has-image" : ""}`}>
              {config.avatarUrl ? <img src={config.avatarUrl} alt={`${displayName} \u7684\u5934\u50cf`} /> : displayName.slice(0, 1)}
              <span className="profile-presence" title="\u5728\u7ebf" />
            </div>
            <h2>{displayName}</h2>
            <p>{about.profileTagline || config.headline}<br />{about.profileBio || config.location}</p>
            <div className="profile-links">
              {githubUrl && <a href={githubUrl} target="_blank" rel="noreferrer"><span>GitHub</span><span>\u2197</span></a>}
              {config.email && <a href={`mailto:${config.email}`}><span>Email</span><span>\u2197</span></a>}
              {(config.wechat || config.qq || config.xiaohongshuUrl || config.douyinUrl) && <Link href="/contact"><span>\u8054\u7cfb\u65b9\u5f0f</span><span>\u2197</span></Link>}
              <Link href="/resume"><span>Resume</span><span>\u2197</span></Link>
            </div>
          </aside>
          <div className="story">
            <p className="eyebrow">My story</p>
            <h2>\u7528\u5de5\u7a0b\u65b9\u6cd5\u89e3\u51b3\u771f\u5b9e\u95ee\u9898</h2>
            <p>{about.story1 || "\u6211\u559c\u6b22\u628a\u4e00\u4e2a\u6a21\u7cca\u7684\u60f3\u6cd5\u62c6\u89e3\u6210\u6e05\u6670\u7684\u8fb9\u754c\u3001\u6570\u636e\u6a21\u578b\u548c\u53ef\u4ea4\u4ed8\u7684\u8f6f\u4ef6\u3002"}</p>
            {about.story2 && <p>{about.story2}</p>}
            <div className="skill-groups">{(about.skillGroups || []).map((group) => <div className="skill-group" key={group.title}><h3>{group.title}</h3><div className="tech-row">{group.items.map((item) => <span key={item}>{item}</span>)}</div></div>)}</div>
            <div className="timeline">{(about.timeline || []).map((item, index) => <div className="timeline-item" key={`${item.period}-${index}`}><time>{item.period}</time><div><h3>{item.title}</h3><p>{item.description}</p></div></div>)}</div>
          </div>
        </div>
      </section>
    </>
  );
}
