export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: { code: string; message: string; fields?: Record<string, string> } | null;
  traceId?: string | null;
};

export type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

export type PostSummary = {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  coverImageUrl?: string;
  tags: string[];
  series?: string;
  featured: boolean;
  status: string;
  publishedAt?: string;
  updatedAt: string;
};

export type PostDetail = PostSummary & { content: string; createdAt: string };

export type NoteSummary = {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  category?: string;
  tags: string[];
  status: string;
  parentId: string | null;
  sortOrder: number;
  publishedAt?: string;
  updatedAt: string;
};

export type NoteDetail = NoteSummary & { content: string; createdAt: string };

export type NoteTreeNode = {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  category?: string;
  status: string;
  parentId: string | null;
  sortOrder: number;
  updatedAt: string;
  children: NoteTreeNode[];
};

export type ProjectSummary = {
  id: string;
  name: string;
  slug: string;
  summary?: string;
  techStack: string;
  status: string;
  repoUrl?: string;
  demoUrl?: string;
  imageUrl?: string;
  featured: boolean;
  startDate?: string;
  endDate?: string;
};

export type ProjectDetail = ProjectSummary & {
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type SearchResult = {
  type: string;
  title: string;
  slug: string;
  summary?: string;
  href: string;
};

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
};

const INTERNAL_API = process.env.API_INTERNAL_URL || process.env.BACKEND_URL || "http://localhost:8080";
type NextRequestInit = RequestInit & { next?: { revalidate?: number; tags?: string[] } };

export async function apiFetch<T>(path: string, init?: NextRequestInit): Promise<ApiResponse<T>> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  try {
    const options: NextRequestInit = { ...init, headers };
    if (!init?.cache && !init?.next) options.cache = "no-store";
    const response = await fetch(`${INTERNAL_API}${path}`, options);
    const json = await response.json().catch(() => ({
      success: false,
      data: null,
      error: { code: "INVALID_RESPONSE", message: "后端返回了无法解析的响应" },
    }));
    if (!response.ok && json.success !== false) {
      return {
        success: false,
        data: null as T,
        error: { code: `HTTP_${response.status}`, message: response.statusText },
      };
    }
    return json as ApiResponse<T>;
  } catch {
    return {
      success: false,
      data: null as T,
      error: { code: "API_UNAVAILABLE", message: "内容服务暂时不可用" },
    };
  }
}

export const getPosts = (page = 1, size = 12) =>
  apiFetch<PageResponse<PostSummary>>(`/api/posts?page=${page}&size=${size}`);
export const getPost = (slug: string) =>
  apiFetch<PostDetail>(`/api/posts/${encodeURIComponent(slug)}`);
export const getNotes = (page = 1, size = 20) =>
  apiFetch<PageResponse<NoteSummary>>(`/api/notes?page=${page}&size=${size}`);
export const getNote = (slug: string) =>
  apiFetch<NoteDetail>(`/api/notes/${encodeURIComponent(slug)}`);
export const getNoteTree = () => apiFetch<NoteTreeNode[]>("/api/notes/tree");
export const getProjects = (page = 1, size = 20) =>
  apiFetch<PageResponse<ProjectSummary>>(`/api/projects?page=${page}&size=${size}`);
export const getProject = (slug: string) =>
  apiFetch<ProjectDetail>(`/api/projects/${encodeURIComponent(slug)}`);
export const getSiteConfig = () =>
  apiFetch<SiteConfig>("/api/site-config", { next: { revalidate: 300 } });
export const searchContent = (q: string) =>
  apiFetch<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`);

export const fallbackSiteConfig: SiteConfig = {
  siteName: "Monster",
  siteDescription: "个人技术品牌主页、博客、知识库与项目作品集",
  ownerName: "Monster",
  headline: "计算机专业 · Java / Web / 系统工程",
  location: "China",
  email: "",
  githubUrl: "https://github.com/",
  linkedinUrl: "",
  xUrl: "",
  footerText: "Build · Learn · Share",
  icpNumber: "",
  publicSecurityNumber: "",
};

const now = "2026-07-18T00:00:00Z";

export const fallbackPosts: PostSummary[] = [
  {
    id: "fallback-post-1",
    title: "欢迎来到我的技术空间",
    slug: "welcome-to-my-technical-space",
    summary: "记录 Java、Spring、数据库、前端和 DevOps 的学习与实践。",
    tags: ["个人网站", "工程实践"],
    series: "建站日志",
    featured: true,
    status: "PUBLISHED",
    publishedAt: now,
    updatedAt: now,
  },
  {
    id: "fallback-post-2",
    title: "从单体应用开始构建可靠系统",
    slug: "build-reliable-system-from-monolith",
    summary: "不追逐复杂度，从边界、数据和可观测性出发设计可以持续演进的系统。",
    tags: ["架构", "Spring Boot"],
    featured: false,
    status: "PUBLISHED",
    publishedAt: now,
    updatedAt: now,
  },
];

export const fallbackNotes: NoteSummary[] = [
  {
    id: "fallback-note-1",
    title: "Java 学习路线",
    slug: "java-learning-roadmap",
    summary: "从语言基础、并发、JVM 到 Spring 生态的学习记录。",
    category: "Java",
    tags: ["Java", "学习路线"],
    status: "PUBLISHED",
    parentId: null,
    sortOrder: 0,
    updatedAt: now,
  },
  {
    id: "fallback-note-2",
    title: "PostgreSQL 常用诊断命令",
    slug: "postgresql-diagnostics",
    summary: "连接、锁、慢查询与索引使用情况的快速排查清单。",
    category: "数据库",
    tags: ["PostgreSQL"],
    status: "PUBLISHED",
    parentId: null,
    sortOrder: 1,
    updatedAt: now,
  },
];

export const fallbackNoteTree: NoteTreeNode[] = fallbackNotes.map((note) => ({
  id: note.id,
  title: note.title,
  slug: note.slug,
  summary: note.summary,
  category: note.category,
  status: note.status,
  parentId: note.parentId,
  sortOrder: note.sortOrder,
  updatedAt: note.updatedAt,
  children: [],
}));

export const fallbackProjects: ProjectSummary[] = [
  {
    id: "fallback-project",
    name: "Monster HomePage",
    slug: "monster-homepage",
    summary: "基于 Next.js、Spring Boot 和 PostgreSQL 的个人技术内容平台。",
    techStack: "Java, Spring Boot, Next.js, PostgreSQL, Docker",
    status: "ACTIVE",
    featured: true,
  },
];
