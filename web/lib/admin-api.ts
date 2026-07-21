import type { ApiResponse, NoteTreeNode, PageResponse } from "@/lib/api";

export type AdminUser = { authenticated: boolean; username?: string; roles?: string[] };
export type DashboardData = { posts: number; notes: number; projects: number; messages: number };
export type EditableItem = {
  id?: string;
  title?: string;
  name?: string;
  slug: string;
  summary: string;
  content?: string;
  description?: string;
  coverImageUrl?: string;
  tags?: string[];
  series?: string;
  category?: string;
  parentId?: string | null;
  sortOrder?: number;
  techStack?: string;
  status: string;
  featured?: boolean;
  repoUrl?: string;
  demoUrl?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  publishedAt?: string;
  updatedAt?: string;
  createdAt?: string;
};
export type MediaItem = { id: string; originalName: string; contentType: string; sizeBytes: number; url: string; createdAt: string };
export type AdminUserItem = { id: string; username: string; role: string; enabled: boolean; createdAt: string };
export type MessageStatus = "NEW" | "READ" | "ARCHIVED";
export type MessageItem = { id: string; name: string; email: string; subject: string; message: string; status: MessageStatus; createdAt: string };
export type SiteConfig = {
  siteName: string;
  siteDescription: string;
  ownerName: string;
  headline: string;
  location: string;
  email: string;
  githubUrl: string;
  linkedinUrl: string;
  xUrl: string;
  footerText: string;
  icpNumber: string;
  publicSecurityNumber: string;
  avatarUrl: string;
  heroEyebrow: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroTitleLine3: string;
  heroDescription: string;
  heroPrimaryText: string;
  heroPrimaryUrl: string;
  heroSecondaryText: string;
  heroSecondaryUrl: string;
  heroImageUrl: string;
  wechat: string;
  wechatQrCodeUrl: string;
  qq: string;
  qqUrl: string;
  xiaohongshuUrl: string;
  douyinUrl: string;
};
export type AdminSiteSettings = {
  site: SiteConfig;
  exportKeyConfigured: boolean;
};

export type SiteSettingsUpdate = {
  site: SiteConfig;
  exportKey?: string | null;
};

export type AnalyticsMetric = { pv: number; uv: number; uip: number };
export type AnalyticsPoint = { period: string; pv: number; uv: number; uip: number };
export type AnalyticsDimension = { name: string; pv: number; uv: number; uip: number };
export type AnalyticsData = {
  startDate: string;
  endDate: string;
  days: number;
  totals: AnalyticsMetric;
  today: AnalyticsMetric;
  timeline: AnalyticsPoint[];
  topPaths: { path: string; views: number }[];
  regions: AnalyticsDimension[];
  browsers: AnalyticsDimension[];
  devices: AnalyticsDimension[];
  networks: AnalyticsDimension[];
};
export type TaxonomyKind = "tags" | "series" | "categories" | "technologies";
export type TaxonomyItem = { name: string; usageCount: number };
export type TaxonomySummary = {
  tags: TaxonomyItem[];
  series: TaxonomyItem[];
  categories: TaxonomyItem[];
  technologies: TaxonomyItem[];
};
export type AuditLogItem = {
  id: string;
  username: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  createdAt: string;
};

async function parse<T>(response: Response): Promise<ApiResponse<T>> {
  const json = await response.json().catch(() => null);
  if (!response.ok || !json) throw new Error(json?.error?.message || `请求失败 (${response.status})`);
  return json as ApiResponse<T>;
}

export async function getCurrentUser() {
  return parse<AdminUser>(await fetch("/api/auth/me", { credentials: "include", cache: "no-store" }));
}

export async function adminGet<T>(path: string) {
  return parse<T>(await fetch(path, { credentials: "include", cache: "no-store" }));
}

async function csrfHeaders() {
  const response = await fetch("/api/auth/csrf", { credentials: "include", cache: "no-store" });
  const json = await parse<{ token: string; headerName: string }>(response);
  return { [json.data.headerName]: json.data.token };
}

export async function adminMutation<T>(path: string, init: RequestInit = {}) {
  const csrf = await csrfHeaders();
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  Object.entries(csrf).forEach(([key, value]) => headers.set(key, value));
  return parse<T>(await fetch(path, { ...init, headers, credentials: "include" }));
}

export async function adminUpload<T>(path: string, file: File) {
  const body = new FormData();
  body.set("file", file);
  return adminMutation<T>(path, { method: "POST", body });
}

export type AdminPage = PageResponse<EditableItem>;
export type AdminNoteTreeNode = NoteTreeNode;
