import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ContactForm } from "@/components/contact-form";
import { PageHero } from "@/components/ui";
import { fallbackSiteConfig, getSiteConfig } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "\u8054\u7cfb\u6211", description: "\u6b22\u8fce\u901a\u8fc7\u5404\u79cd\u65b9\u5f0f\u4e0e\u6211\u4ea4\u6d41\u3002" };

type ContactMethod = { label: string; value: string; href?: string; icon: string };

export default async function ContactPage() {
  const response = await getSiteConfig(true);
  const config = response.success ? { ...fallbackSiteConfig, ...response.data } : fallbackSiteConfig;
  const methods = ([
    config.email ? { label: "Email", value: config.email, href: `mailto:${config.email}`, icon: "@" } : null,
    config.wechat ? { label: "\u5fae\u4fe1", value: config.wechat, href: config.wechatQrCodeUrl || undefined, icon: "\u5fae" } : null,
    config.qq ? { label: "QQ", value: config.qq, href: config.qqUrl || undefined, icon: "Q" } : null,
    config.githubUrl && config.githubUrl !== "https://github.com/" ? { label: "GitHub", value: labelFromUrl(config.githubUrl), href: config.githubUrl, icon: "GH" } : null,
    config.linkedinUrl ? { label: "LinkedIn", value: labelFromUrl(config.linkedinUrl), href: config.linkedinUrl, icon: "in" } : null,
    config.xUrl ? { label: "X / Twitter", value: labelFromUrl(config.xUrl), href: config.xUrl, icon: "X" } : null,
    config.xiaohongshuUrl ? { label: "\u5c0f\u7ea2\u4e66", value: labelFromUrl(config.xiaohongshuUrl), href: config.xiaohongshuUrl, icon: "RED" } : null,
    config.douyinUrl ? { label: "\u6296\u97f3", value: labelFromUrl(config.douyinUrl), href: config.douyinUrl, icon: "DY" } : null,
  ] as Array<ContactMethod | null>).filter((item): item is ContactMethod => Boolean(item));

  return (
    <>
      <PageHero eyebrow="Contact" title="\u4e0e\u6211\u8054\u7cfb" description="\u6709\u60f3\u4ea4\u6d41\u7684\u6280\u672f\u3001\u9879\u76ee\u6216\u60f3\u6cd5\uff1f\u6b22\u8fce\u968f\u65f6\u8054\u7cfb\u6211\u3002" />
      <section className="list-section">
        <div className="container contact-layout">
          <div className="contact-copy">
            <p className="eyebrow">Say hello</p>
            <h2>\u7559\u4e0b\u4f60\u7684\u6d88\u606f</h2>
            <p>\u6211\u5f88\u4e50\u610f\u4ea4\u6d41\u6280\u672f\u3001\u9879\u76ee\u4e0e\u521b\u4f5c\u3002\u4f60\u53ef\u4ee5\u901a\u8fc7\u4e0b\u65b9\u6e20\u9053\u6216\u7559\u8a00\u8868\u5355\u8054\u7cfb\u6211\u3002</p>
            <div className="contact-methods">
              {methods.length > 0 ? methods.map((method) => <Method key={method.label} method={method} />) : <p className="contact-empty">\u6682\u672a\u8bbe\u7f6e\u516c\u5f00\u8054\u7cfb\u65b9\u5f0f\uff0c\u8bf7\u7a0d\u540e\u518d\u6765\u770b\u770b\u3002</p>}
            </div>
            {config.wechatQrCodeUrl && (
              <a className="contact-qr-card" href={config.wechatQrCodeUrl} target="_blank" rel="noreferrer">
                <img src={config.wechatQrCodeUrl} alt="\u5fae\u4fe1\u4e8c\u7ef4\u7801" />
                <span><strong>\u5fae\u4fe1\u626b\u7801\u8054\u7cfb</strong><small>\u6dfb\u52a0\u5fae\u4fe1\u540e\uff0c\u8bf7\u5907\u6ce8\u6765\u610f\u3002</small></span>
              </a>
            )}
            <p className="contact-privacy">\u4f60\u63d0\u4ea4\u7684\u8054\u7cfb\u4fe1\u606f\u4ec5\u7528\u4e8e\u56de\u590d\u6d88\u606f\uff0c\u4e0d\u7528\u4e8e\u8425\u9500\u6216\u5bf9\u5916\u5171\u4eab\u3002</p>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}

function Method({ method }: { method: ContactMethod }) {
  const content: ReactNode = <><span className="contact-method-icon">{method.icon}</span><span><strong>{method.label}</strong><small>{method.value}</small></span><i>{method.href ? "\u2197" : ""}</i></>;
  return method.href
    ? <a className="contact-method contact-method-link" href={method.href} target={method.href.startsWith("http") ? "_blank" : undefined} rel={method.href.startsWith("http") ? "noreferrer" : undefined}>{content}</a>
    : <div className="contact-method">{content}</div>;
}

function labelFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}
