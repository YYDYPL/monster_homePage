import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import { fallbackSiteConfig, getSiteConfig } from "@/lib/api";
import { getFullProfile } from "@/lib/profile-api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "关于我", description: "关于 Monster 的技术方向、技能栈与学习经历。" };

export default async function AboutPage() {
  const [profile, configResponse] = await Promise.all([getFullProfile(), getSiteConfig(true)]);
  const config = configResponse.success ? { ...fallbackSiteConfig, ...configResponse.data } : fallbackSiteConfig;
  const about = profile.about || { profileName: "Monster", profileTagline: "", profileBio: "", story1: "", story2: "", skillGroups: [], timeline: [] };
  const displayName = about.profileName || config.ownerName || "Monster";
  const githubUrl = config.githubUrl && config.githubUrl !== "https://github.com/" ? config.githubUrl : "";

  return (
    <>
      <PageHero eyebrow="About me" title={`你好，我是 ${displayName}。`} description={about.profileTagline || config.headline || "计算机专业开发者"} />
      <section className="list-section">
        <div className="container profile-grid">
          <aside className="profile-card profile-card-enhanced">
            <div className={`profile-avatar ${config.avatarUrl ? "has-image" : ""}`}>
              {config.avatarUrl ? <img src={config.avatarUrl} alt={`${displayName} 的头像`} /> : displayName.slice(0, 1)}
              <span className="profile-presence" title="在线" />
            </div>
            <h2>{displayName}</h2>
            <p>{about.profileTagline || config.headline}<br />{about.profileBio || config.location}</p>
            <div className="profile-links">
              {githubUrl && <a href={githubUrl} target="_blank" rel="noreferrer"><span>GitHub</span><span>↗</span></a>}
              {config.email && <a href={`mailto:${config.email}`}><span>Email</span><span>↗</span></a>}
              {(config.wechat || config.qq || config.xiaohongshuUrl || config.douyinUrl) && <Link href="/contact"><span>联系方式</span><span>↗</span></Link>}
              <Link href="/resume"><span>Resume</span><span>↗</span></Link>
            </div>
          </aside>
          <div className="story">
            <p className="eyebrow">My story</p>
            <h2>用工程方法解决真实问题</h2>
            <p>{about.story1 || "我喜欢把一个模糊的想法拆解成清晰的边界、数据模型和可交付的软件。"}</p>
            {about.story2 && <p>{about.story2}</p>}
            <div className="skill-groups">{(about.skillGroups || []).map((group) => <div className="skill-group" key={group.title}><h3>{group.title}</h3><div className="tech-row">{group.items.map((item) => <span key={item}>{item}</span>)}</div></div>)}</div>
            <div className="timeline">{(about.timeline || []).map((item, index) => <div className="timeline-item" key={`${item.period}-${index}`}><time>{item.period}</time><div><h3>{item.title}</h3><p>{item.description}</p></div></div>)}</div>
          </div>
        </div>
      </section>
    </>
  );
}
