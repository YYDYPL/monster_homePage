"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
      .then((json) => { if (active && json?.data) setConfig(json.data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  if (pathname.startsWith("/admin")) return null;
  return <footer className="site-footer"><div className="container footer-grid"><div className="footer-intro"><div className="brand footer-brand"><span className="brand-mark">M</span><span className="brand-copy"><strong>{config.siteName.toUpperCase()}</strong><small>PERSONAL TECH SPACE</small></span></div><p>{config.siteDescription}</p><div className="social-row">{config.githubUrl && <a href={config.githubUrl} target="_blank" rel="noreferrer" aria-label="GitHub">GH</a>}{config.email && <a href={`mailto:${config.email}`} aria-label="Email">@</a>}<Link href="/rss.xml" aria-label="RSS">RSS</Link></div></div>{groups.map((group) => <div className="footer-links" key={group.title}><h3>{group.title}</h3>{group.links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</div>)}</div><div className="container footer-bottom"><span>© {new Date().getFullYear()} {config.ownerName}. Built with Next.js & Spring Boot.</span><span>{config.footerText}</span></div>{(config.icpNumber || config.publicSecurityNumber) && <div className="container filing-row">{config.icpNumber && <span>{config.icpNumber}</span>}{config.publicSecurityNumber && <span>{config.publicSecurityNumber}</span>}</div>}</footer>;
}
