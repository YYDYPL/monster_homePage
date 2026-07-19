"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { fallbackSiteConfig, type SiteConfig } from "@/lib/api";

const groups = [
  { title: "内容", links: [["技术博客", "/blog"], ["知识笔记", "/notes"], ["项目作品", "/projects"], ["在线工具", "/lab"]] },
  { title: "关于", links: [["关于我", "/about"], ["个人简历", "/resume"], ["我的装备", "/uses"], ["友情链接", "/links"]] },
  { title: "更多", links: [["全站搜索", "/search"], ["联系我", "/contact"], ["RSS 订阅", "/rss.xml"], ["管理入口", "/admin"]] },
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
            {config.xiaohongshuUrl && <Social href={config.xiaohongshuUrl} label="小红书">RED</Social>}
            {config.douyinUrl && <Social href={config.douyinUrl} label="抖音">DY</Social>}
            {config.wechatQrCodeUrl ? <Social href={config.wechatQrCodeUrl} label="微信">WX</Social> : config.wechat ? <Link href="/contact" title={`微信：${config.wechat}`} aria-label="微信">WX</Link> : null}
            {config.qqUrl ? <Social href={config.qqUrl} label="QQ">QQ</Social> : config.qq ? <Link href="/contact" title={`QQ：${config.qq}`} aria-label="QQ">QQ</Link> : null}
            {config.email && <Social href={`mailto:${config.email}`} label="Email">@</Social>}
            <Link href="/rss.xml" aria-label="RSS">RSS</Link>
          </div>
        </div>
        {groups.map((group) => <div className="footer-links" key={group.title}><h3>{group.title}</h3>{group.links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</div>)}
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} {config.ownerName || siteName}. Built with Next.js & Spring Boot.</span><span>{config.footerText}</span></div>
      {(config.icpNumber || config.publicSecurityNumber) && <div className="container filing-row">{config.icpNumber && <span>{config.icpNumber}</span>}{config.publicSecurityNumber && <span>{config.publicSecurityNumber}</span>}</div>}
    </footer>
  );
}

function Social({ children, href, label }: { children: ReactNode; href: string; label: string }) {
  const external = href.startsWith("http");
  return <a href={href} aria-label={label} title={label} rel={external ? "noreferrer" : undefined} target={external ? "_blank" : undefined}>{children}</a>;
}
