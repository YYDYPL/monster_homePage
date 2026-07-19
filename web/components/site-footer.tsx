"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { fallbackSiteConfig, type SiteConfig } from "@/lib/api";

const groups = [
  { title: "\u5185\u5bb9", links: [["\u6280\u672f\u535a\u5ba2", "/blog"], ["\u77e5\u8bc6\u7b14\u8bb0", "/notes"], ["\u9879\u76ee\u4f5c\u54c1", "/projects"], ["\u5728\u7ebf\u5de5\u5177", "/lab"]] },
  { title: "\u5173\u4e8e", links: [["\u5173\u4e8e\u6211", "/about"], ["\u4e2a\u4eba\u7b80\u5386", "/resume"], ["\u6211\u7684\u88c5\u5907", "/uses"], ["\u53cb\u60c5\u94fe\u63a5", "/links"]] },
  { title: "\u66f4\u591a", links: [["\u5168\u7ad9\u641c\u7d22", "/search"], ["\u8054\u7cfb\u6211", "/contact"], ["RSS \u8ba2\u9605", "/rss.xml"], ["\u7ba1\u7406\u5165\u53e3", "/admin"]] },
];

export function SiteFooter() {
  const pathname = usePathname();
  const [config, setConfig] = useState<SiteConfig>(fallbackSiteConfig);

  useEffect(() => {
    let active = true;
    fetch("/api/site-config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((json) => { if (active && json?.data) setConfig((current) => ({ ...current, ...json.data })); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  if (pathname.startsWith("/admin")) return null;
  const siteName = config.siteName || "Monster";

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-intro">
          <div className="brand footer-brand">
            <img className={`brand-mark ${config.avatarUrl ? "brand-avatar" : ""}`} src={config.avatarUrl || "/logo.png"} alt="" width="37" height="37" />
            <span className="brand-copy"><strong>{siteName.toUpperCase()}</strong><small>PERSONAL TECH SPACE</small></span>
          </div>
          <p>{config.siteDescription}</p>
          <div className="social-row">
            {config.githubUrl && config.githubUrl !== "https://github.com/" && <Social href={config.githubUrl} label="GitHub">GH</Social>}
            {config.linkedinUrl && <Social href={config.linkedinUrl} label="LinkedIn">in</Social>}
            {config.xUrl && <Social href={config.xUrl} label="X / Twitter">X</Social>}
            {config.xiaohongshuUrl && <Social href={config.xiaohongshuUrl} label="\u5c0f\u7ea2\u4e66">RED</Social>}
            {config.douyinUrl && <Social href={config.douyinUrl} label="\u6296\u97f3">DY</Social>}
            {config.wechatQrCodeUrl ? <Social href={config.wechatQrCodeUrl} label="\u5fae\u4fe1">WX</Social> : config.wechat ? <Link href="/contact" title={`\u5fae\u4fe1\uff1a${config.wechat}`} aria-label="\u5fae\u4fe1">WX</Link> : null}
            {config.qqUrl ? <Social href={config.qqUrl} label="QQ">QQ</Social> : config.qq ? <Link href="/contact" title={`QQ\uff1a${config.qq}`} aria-label="QQ">QQ</Link> : null}
            {config.email && <Social href={`mailto:${config.email}`} label="Email">@</Social>}
            <Link href="/rss.xml" aria-label="RSS">RSS</Link>
          </div>
        </div>
        {groups.map((group) => <div className="footer-links" key={group.title}><h3>{group.title}</h3>{group.links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</div>)}
      </div>
      <div className="container footer-bottom"><span>\u00a9 {new Date().getFullYear()} {config.ownerName || siteName}. Built with Next.js & Spring Boot.</span><span>{config.footerText}</span></div>
      {(config.icpNumber || config.publicSecurityNumber) && <div className="container filing-row">{config.icpNumber && <span>{config.icpNumber}</span>}{config.publicSecurityNumber && <span>{config.publicSecurityNumber}</span>}</div>}
    </footer>
  );
}

function Social({ children, href, label }: { children: ReactNode; href: string; label: string }) {
  const external = href.startsWith("http");
  return <a href={href} aria-label={label} title={label} rel={external ? "noreferrer" : undefined} target={external ? "_blank" : undefined}>{children}</a>;
}
