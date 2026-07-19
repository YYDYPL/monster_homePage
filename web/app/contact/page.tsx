import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ContactForm } from "@/components/contact-form";
import { PageHero } from "@/components/ui";
import { fallbackSiteConfig, getSiteConfig } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "???", description: "???????????????" };

type ContactMethod = { label: string; value: string; href?: string; icon: string };

export default async function ContactPage() {
  const response = await getSiteConfig(true);
  const config = response.success ? { ...fallbackSiteConfig, ...response.data } : fallbackSiteConfig;
  const methods = ([
    config.email ? { label: "Email", value: config.email, href: `mailto:${config.email}`, icon: "@" } : null,
    config.wechat ? { label: "??", value: config.wechat, href: config.wechatQrCodeUrl || undefined, icon: "?" } : null,
    config.qq ? { label: "QQ", value: config.qq, href: config.qqUrl || undefined, icon: "Q" } : null,
    config.githubUrl && config.githubUrl !== "https://github.com/" ? { label: "GitHub", value: labelFromUrl(config.githubUrl), href: config.githubUrl, icon: "GH" } : null,
    config.linkedinUrl ? { label: "LinkedIn", value: labelFromUrl(config.linkedinUrl), href: config.linkedinUrl, icon: "in" } : null,
    config.xUrl ? { label: "X / Twitter", value: labelFromUrl(config.xUrl), href: config.xUrl, icon: "X" } : null,
    config.xiaohongshuUrl ? { label: "???", value: labelFromUrl(config.xiaohongshuUrl), href: config.xiaohongshuUrl, icon: "RED" } : null,
    config.douyinUrl ? { label: "??", value: labelFromUrl(config.douyinUrl), href: config.douyinUrl, icon: "DY" } : null,
  ] as Array<ContactMethod | null>).filter((item): item is ContactMethod => Boolean(item));

  return (
    <>
      <PageHero eyebrow="Contact" title="????" description="????????????????????????????????????" />
      <section className="list-section">
        <div className="container contact-layout">
          <div className="contact-copy">
            <p className="eyebrow">Say hello</p>
            <h2>??????????</h2>
            <p>?????????????????????????????????????????????????</p>
            <div className="contact-methods">
              {methods.length > 0 ? methods.map((method) => <Method key={method.label} method={method} />) : <p className="contact-empty">???????????????????????</p>}
            </div>
            {config.wechatQrCodeUrl && (
              <a className="contact-qr-card" href={config.wechatQrCodeUrl} target="_blank" rel="noreferrer">
                <img src={config.wechatQrCodeUrl} alt="?????" />
                <span><strong>?????</strong><small>???????????</small></span>
              </a>
            )}
            <p className="contact-privacy">?????????????????????????????????????????</p>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}

function Method({ method }: { method: ContactMethod }) {
  const content: ReactNode = <><span className="contact-method-icon">{method.icon}</span><span><strong>{method.label}</strong><small>{method.value}</small></span><i>{method.href ? "?" : ""}</i></>;
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
