"use client";

import { useEffect, useState, type FormEvent } from "react";
import { adminGet, adminMutation, adminUpload, type MediaItem, type SiteConfig } from "@/lib/admin-api";

const empty: SiteConfig = {
  siteName: "",
  siteDescription: "",
  ownerName: "",
  headline: "",
  location: "",
  email: "",
  githubUrl: "",
  linkedinUrl: "",
  xUrl: "",
  footerText: "",
  icpNumber: "",
  publicSecurityNumber: "",
  avatarUrl: "",
  heroEyebrow: "",
  heroTitleLine1: "",
  heroTitleLine2: "",
  heroTitleLine3: "",
  heroDescription: "",
  heroPrimaryText: "",
  heroPrimaryUrl: "",
  heroSecondaryText: "",
  heroSecondaryUrl: "",
  heroImageUrl: "",
  wechat: "",
  wechatQrCodeUrl: "",
  qq: "",
  qqUrl: "",
  xiaohongshuUrl: "",
  douyinUrl: "",
};

type Field = { key: keyof SiteConfig; label: string; placeholder?: string; wide?: boolean; multiline?: boolean; type?: string };

const baseFields: Field[] = [
  { key: "siteName", label: "站点名称", placeholder: "Monster" },
  { key: "ownerName", label: "显示名称", placeholder: "你的名字" },
  { key: "headline", label: "个人定位", placeholder: "计算机专业 · Java / Web / 系统工程", wide: true },
  { key: "siteDescription", label: "站点描述", placeholder: "用于 SEO、页脚和站点介绍", wide: true, multiline: true },
  { key: "location", label: "所在地区", placeholder: "China" },
  { key: "email", label: "公开邮箱", placeholder: "hello@example.com", type: "email" },
];

const heroFields: Field[] = [
  { key: "heroEyebrow", label: "首页眉题", placeholder: "Hello, world" },
  { key: "heroTitleLine1", label: "主标题第一行", placeholder: "构建系统，" },
  { key: "heroTitleLine2", label: "主标题第二行", placeholder: "沉淀知识，" },
  { key: "heroTitleLine3", label: "主标题第三行", placeholder: "持续进化。" },
  { key: "heroDescription", label: "首页介绍文字", placeholder: "介绍你的方向、内容和个人特点", wide: true, multiline: true },
  { key: "heroPrimaryText", label: "主按钮文字", placeholder: "探索我的项目" },
  { key: "heroPrimaryUrl", label: "主按钮链接", placeholder: "/projects" },
  { key: "heroSecondaryText", label: "次按钮文字", placeholder: "了解更多" },
  { key: "heroSecondaryUrl", label: "次按钮链接", placeholder: "/about" },
];

const socialFields: Field[] = [
  { key: "wechat", label: "微信号", placeholder: "你的微信号" },
  { key: "qq", label: "QQ 号", placeholder: "你的 QQ 号" },
  { key: "qqUrl", label: "QQ 联系链接（可选）", placeholder: "https://...", wide: true },
  { key: "githubUrl", label: "GitHub", placeholder: "https://github.com/...", wide: true },
  { key: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/in/...", wide: true },
  { key: "xUrl", label: "X / Twitter", placeholder: "https://x.com/...", wide: true },
  { key: "xiaohongshuUrl", label: "小红书主页", placeholder: "https://www.xiaohongshu.com/user/profile/...", wide: true },
  { key: "douyinUrl", label: "抖音主页", placeholder: "https://www.douyin.com/user/...", wide: true },
];

const footerFields: Field[] = [
  { key: "footerText", label: "页脚短句", placeholder: "Build · Learn · Share", wide: true },
  { key: "icpNumber", label: "ICP备案号", placeholder: "某ICP备XXXXXXXX号" },
  { key: "publicSecurityNumber", label: "公安备案号", placeholder: "某公网安备XXXXXXXXXXXXXX号" },
];

export function SettingsForm() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    adminGet<SiteConfig>("/api/admin/settings")
      .then((response) => { if (active) setForm({ ...empty, ...response.data }); })
      .catch((reason) => { if (active) setMessage(reason instanceof Error ? reason.message : "设置加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function update(key: keyof SiteConfig, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await adminMutation<SiteConfig>("/api/admin/settings", { method: "PATCH", body: JSON.stringify(form) });
      setForm({ ...empty, ...response.data });
      setMessage("网站设置已保存，首页、关于页、联系页和页脚会读取新配置。");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-heading">
        <div><h1>网站与首页设置</h1><p>维护站点资料、首页文案与图片、头像、社交联系方式和备案信息。</p></div>
      </div>
      {message && <p className={`admin-notice ${message.includes("失败") ? "error" : ""}`}>{message}</p>}

      <form className="settings-form" onSubmit={submit}>
        {loading ? <div className="admin-panel empty-state">正在读取网站设置…</div> : (
          <>
            <SettingsSection description="用于导航、SEO、个人介绍和联系页面。" fields={baseFields} form={form} title="基础资料" update={update} />

            <section className="admin-panel settings-section">
              <div className="panel-head"><div><h2>头像与首页视觉</h2><p>图片可直接上传，也可以粘贴已有图片 URL。</p></div></div>
              <div className="settings-section-body editor-grid">
                <ImageSettingField label="个人头像" value={form.avatarUrl} onChange={(value) => update("avatarUrl", value)} shape="round" />
                <ImageSettingField label="首页主视觉图片" value={form.heroImageUrl} onChange={(value) => update("heroImageUrl", value)} />
                <ImageSettingField label="微信二维码" value={form.wechatQrCodeUrl} onChange={(value) => update("wechatQrCodeUrl", value)} />
              </div>
            </section>

            <SettingsSection description="三行主标题、说明文字和两个按钮都可以自定义。" fields={heroFields} form={form} title="首页文案" update={update} />
            <SettingsSection description="填写后会显示在关于页、联系页和页脚入口。" fields={socialFields} form={form} title="社交与联系方式" update={update} />
            <SettingsSection description="域名和 HTTPS 仍通过服务器环境变量与 Caddy 配置管理。" fields={footerFields} form={form} title="页脚与备案" update={update} />
          </>
        )}

        <div className="settings-savebar">
          <span>保存后公共页面在下一次请求时读取新配置。</span>
          <button className="button primary" disabled={loading || saving} type="submit">{saving ? "保存中…" : "保存全部设置"}</button>
        </div>
      </form>
    </>
  );
}

function SettingsSection({
  description,
  fields,
  form,
  title,
  update,
}: {
  description: string;
  fields: Field[];
  form: SiteConfig;
  title: string;
  update: (key: keyof SiteConfig, value: string) => void;
}) {
  return (
    <section className="admin-panel settings-section">
      <div className="panel-head"><div><h2>{title}</h2><p>{description}</p></div></div>
      <div className="settings-section-body editor-grid">
        {fields.map((field) => (
          <div className={`form-field ${field.wide ? "span-2" : ""}`} key={field.key}>
            <label htmlFor={field.key}>{field.label}</label>
            {field.multiline ? (
              <textarea className="form-control settings-textarea" id={field.key} value={form[field.key]} placeholder={field.placeholder} onChange={(event) => update(field.key, event.target.value)} />
            ) : (
              <input className="form-control" id={field.key} type={field.type || "text"} value={form[field.key]} placeholder={field.placeholder} onChange={(event) => update(field.key, event.target.value)} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ImageSettingField({
  label,
  onChange,
  shape = "rect",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  shape?: "round" | "rect";
  value: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const response = await adminUpload<MediaItem>("/api/admin/media", file);
      onChange(response.data.url);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="form-field image-setting-field">
      <label>{label}</label>
      <div className={`image-setting-preview ${shape}`}>
        {value ? <img alt={`${label}预览`} src={value} /> : <span>暂无图片</span>}
      </div>
      <input className="form-control" value={value} placeholder="图片 URL" onChange={(event) => onChange(event.target.value)} />
      <label className="button small image-upload-button">
        {uploading ? "上传中…" : "选择并上传图片"}
        <input accept="image/*" disabled={uploading} hidden type="file" onChange={(event) => void upload(event.target.files?.[0])} />
      </label>
    </div>
  );
}
