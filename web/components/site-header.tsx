"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fallbackSiteConfig, type SiteConfig } from "@/lib/api";

const navigation = [
  { href: "/blog", label: "博客" },
  { href: "/notes", label: "知识库" },
  { href: "/projects", label: "项目" },
  { href: "/lab", label: "实验室" },
  { href: "/about", label: "关于" },
];

function ThemeIcon({ theme }: { theme: "light" | "dark" }) {
  return theme === "dark"
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M18.36 5.64l-1.42 1.42M7.06 16.94l-1.42 1.42" /><circle cx="12" cy="12" r="4" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.3A8.4 8.4 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z" /></svg>;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<SiteConfig>(fallbackSiteConfig);

  useEffect(() => {
    let active = true;
    fetch("/api/site-config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((json) => { if (active && json?.data) setConfig((current) => ({ ...current, ...json.data })); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("monster-theme", next);
  }

  if (pathname.startsWith("/admin")) return null;
  const siteName = config.siteName || "Monster";

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/" aria-label={`${siteName} 首页`}>
          <img className={`brand-mark ${config.avatarUrl ? "brand-avatar" : ""}`} src={config.avatarUrl || "/logo.png"} alt="" width="37" height="37" />
          <span className="brand-copy"><strong>{siteName.toUpperCase()}</strong><small>{config.footerText || "BUILD · LEARN · SHARE"}</small></span>
        </Link>
        <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="主导航">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link className={active ? "active" : ""} href={item.href} key={item.href} onClick={() => setOpen(false)}>{item.label}</Link>;
          })}
        </nav>
        <div className="header-actions">
          <Link className="icon-button search-button" href="/search" aria-label="搜索"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg></Link>
          <button className="icon-button" type="button" onClick={toggleTheme} aria-label="切换主题"><ThemeIcon theme="light" /></button>
          <button className="menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="打开菜单"><span /><span /><span /></button>
        </div>
      </div>
    </header>
  );
}
