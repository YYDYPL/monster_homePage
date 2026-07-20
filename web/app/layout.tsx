import type { Metadata } from "next";
import Script from "next/script";
import { PageViewTracker } from "@/components/page-view-tracker";
import { RouteScrollReset } from "@/components/route-scroll-reset";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { fallbackSiteConfig, getSiteConfig } from "@/lib/api";
import "./globals.css";

const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const response = await getSiteConfig();
  const config = response.success ? response.data : fallbackSiteConfig;
  const title = `${config.siteName} · 个人技术空间`;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s · ${config.siteName}` },
    description: config.siteDescription,
    keywords: ["Java", "Spring Boot", "Next.js", "PostgreSQL", "技术博客", "知识库", "个人网站"],
    authors: [{ name: config.ownerName }],
    creator: config.ownerName,
    openGraph: { type: "website", locale: "zh_CN", siteName: title, title, description: config.siteDescription, url: siteUrl },
    twitter: { card: "summary_large_image", title, description: config.siteDescription },
    alternates: { types: { "application/rss+xml": "/rss.xml" } },
  };
}

const themeScript = `(function(){try{var saved=localStorage.getItem('monster-theme');var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=saved||(dark?'dark':'light')}catch(_){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" suppressHydrationWarning><body><Script id="theme-script" strategy="beforeInteractive">{themeScript}</Script><RouteScrollReset/><PageViewTracker/><div className="site-shell"><SiteHeader/><main>{children}</main><SiteFooter/></div></body></html>;
}
