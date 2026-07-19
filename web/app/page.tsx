import type { ReactNode } from "react";
import Link from "next/link";
import {
  fallbackNotes,
  fallbackPosts,
  fallbackProjects,
  fallbackSiteConfig,
  getNotes,
  getPosts,
  getProjects,
  getSiteConfig,
} from "@/lib/api";
import { ArrowIcon, NoteCard, PostCard, ProjectCard, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

function ActionLink({ children, className, href }: { children: ReactNode; className: string; href: string }) {
  const target = href || "/";
  if (/^(?:https?:\/\/|mailto:|tel:)/i.test(target)) {
    return <a className={className} href={target} rel="noreferrer" target={target.startsWith("http") ? "_blank" : undefined}>{children}</a>;
  }
  return <Link className={className} href={target}>{children}</Link>;
}

export default async function HomePage() {
  const [postResponse, noteResponse, projectResponse, configResponse] = await Promise.all([
    getPosts(1, 4),
    getNotes(1, 4),
    getProjects(1, 3),
    getSiteConfig(true),
  ]);
  const config = configResponse.success ? { ...fallbackSiteConfig, ...configResponse.data } : fallbackSiteConfig;
  const posts = postResponse.success ? postResponse.data.items : fallbackPosts;
  const notes = noteResponse.success ? noteResponse.data.items : fallbackNotes;
  const projects = projectResponse.success ? projectResponse.data.items : fallbackProjects;

  return (
    <>
      <section className="hero">
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy hero-reveal">
            {config.heroEyebrow && <p className="eyebrow">{config.heroEyebrow}</p>}
            <h1>
              <span className="hero-title-line">{config.heroTitleLine1}</span>
              <span className="hero-title-line outline">{config.heroTitleLine2}</span>
              <span className="hero-title-line accent">{config.heroTitleLine3}</span>
            </h1>
            {config.heroDescription && <p className="hero-lead">{config.heroDescription}</p>}
            <div className="hero-actions">
              {config.heroPrimaryText && (
                <ActionLink className="button primary" href={config.heroPrimaryUrl || "/projects"}>
                  {config.heroPrimaryText} <ArrowIcon />
                </ActionLink>
              )}
              {config.heroSecondaryText && (
                <ActionLink className="button ghost" href={config.heroSecondaryUrl || "/about"}>
                  {config.heroSecondaryText}
                </ActionLink>
              )}
            </div>
            <div className="hero-meta">
              <span><i />\u5f00\u653e\u4ea4\u6d41</span>
              {config.headline && <span>{config.headline}</span>}
              {config.location && <span>Based in {config.location}</span>}
            </div>
          </div>

          {config.heroImageUrl ? (
            <div className="hero-image-card hero-reveal hero-reveal-delay">
              <img className="hero-main-image" src={config.heroImageUrl} alt={`${config.ownerName || config.siteName} \u7684\u9996\u9875\u4e3b\u89c6\u89c9`} />
              <div className="hero-image-overlay" aria-hidden="true" />
              <div className="hero-image-caption">
                {config.avatarUrl ? (
                  <img className="hero-avatar" src={config.avatarUrl} alt={`${config.ownerName} \u5934\u50cf`} />
                ) : (
                  <span className="hero-avatar hero-avatar-fallback">{(config.ownerName || "M").slice(0, 1).toUpperCase()}</span>
                )}
                <span><strong>{config.ownerName || config.siteName}</strong><small>{config.headline}</small></span>
              </div>
              <span className="hero-image-badge">BUILD \u00b7 LEARN \u00b7 SHARE</span>
            </div>
          ) : (
            <div className="terminal-card hero-reveal hero-reveal-delay" aria-label="\u4e2a\u4eba\u6280\u672f\u6808\u7ec8\u7aef\u5361\u7247">
              <div className="terminal-bar"><i /><i /><i /><span>monster@dev:~</span></div>
              <div className="terminal-content">
                <p><span className="prompt">$</span> whoami</p>
                <p className="value">computer-science-developer</p><br />
                <p><span className="prompt">$</span> cat stack.json</p>
                <p>{`{`}</p>
                <p>&nbsp;&nbsp;&quot;backend&quot;: <span className="value">&quot;Java / Spring Boot&quot;</span>,</p>
                <p>&nbsp;&nbsp;&quot;frontend&quot;: <span className="value">&quot;Next.js / React&quot;</span>,</p>
                <p>&nbsp;&nbsp;&quot;database&quot;: <span className="value">&quot;PostgreSQL&quot;</span>,</p>
                <p>&nbsp;&nbsp;&quot;infra&quot;: <span className="value">&quot;Docker / Linux&quot;</span></p>
                <p>{`}`}</p><br />
                <p className="comment"># always building something useful</p>
                <p><span className="prompt">$</span><span className="blink" /></p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="stats-strip">
        <div className="container stats-grid">
          <div className="stat-item"><strong>{postResponse.success ? postResponse.data.total : posts.length}+</strong><span>\u6280\u672f\u6587\u7ae0</span></div>
          <div className="stat-item"><strong>{noteResponse.success ? noteResponse.data.total : notes.length}+</strong><span>\u77e5\u8bc6\u7b14\u8bb0</span></div>
          <div className="stat-item"><strong>{projectResponse.success ? projectResponse.data.total : projects.length}+</strong><span>\u9879\u76ee\u5b9e\u8df5</span></div>
          <div className="stat-item"><strong>\u221e</strong><span>\u6301\u7eed\u5b66\u4e60</span></div>
        </div>
      </section>

      <section className="section motion-section"><div className="container"><SectionHeading eyebrow="Latest writing" title="\u6700\u8fd1\u5728\u5199" href="/blog" /><div className="content-grid">{posts.slice(0, 4).map((post, index) => <PostCard post={post} featured={index === 0 && posts.length > 2} key={post.id} />)}</div></div></section>
      <section className="section alt motion-section"><div className="container"><SectionHeading eyebrow="Knowledge base" title="\u77e5\u8bc6\u7247\u6bb5" href="/notes" /><div className="note-list">{notes.slice(0, 4).map((note) => <NoteCard note={note} key={note.id} />)}</div></div></section>
      <section className="section motion-section"><div className="container"><SectionHeading eyebrow="Selected work" title="\u7cbe\u9009\u9879\u76ee" href="/projects" /><div className="content-grid three">{projects.slice(0, 3).map((project) => <ProjectCard project={project} key={project.id} />)}</div></div></section>
      <section className="section alt connect-section motion-section"><div className="container"><div className="section-heading"><div><p className="eyebrow">Let&apos;s connect</p><h2>\u6709\u60f3\u6cd5\uff1f\u4e00\u8d77\u804a\u804a\u3002</h2></div><Link className="button primary" href="/contact">\u8054\u7cfb\u6211 <ArrowIcon /></Link></div></div></section>
    </>
  );
}
