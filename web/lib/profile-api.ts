// ── Profile Types ──

export type ProfileAbout = {
  profileName: string;
  profileTagline: string;
  profileBio: string;
  story1: string;
  story2: string;
  skillGroups: SkillGroup[];
  timeline: TimelineEntry[];
};

export type SkillGroup = { title: string; items: string[] };
export type TimelineEntry = { period: string; title: string; description: string };

export type ProfileResume = {
  name: string;
  title: string;
  email: string;
  website: string;
  location: string;
  profile: string;
  coreSkills: string;
  engineeringSkills: string;
  projects: ResumeProjectEntry[];
  education: string;
  educationDetail: string;
};

export type ResumeProjectEntry = { name: string; description: string; responsibilities: string };

export type ProfileUses = {
  groups: UseGroup[];
};

export type UseGroup = { title: string; items: UseItem[] };
export type UseItem = { name: string; description: string };

export type ProfileLinks = {
  links: LinkEntry[];
};

export type LinkEntry = { name: string; url: string; description: string };

export type FullProfile = {
  about: ProfileAbout | null;
  resume: ProfileResume | null;
  uses: ProfileUses | null;
  links: ProfileLinks | null;
};

// ── defaults ──

export function defaultProfileAbout(): ProfileAbout {
  return {
    profileName: "Monster",
    profileTagline: "Java / Full-stack Developer",
    profileBio: "Computer Science",
    story1: "我喜欢把一个模糊的想法拆解成清晰的边界、数据模型和可交付的软件。",
    story2: "Java 是我最熟悉的语言，Spring Boot 是构建后端服务的主要工具。",
    skillGroups: [
      { title: "后端工程", items: ["Java", "Spring Boot", "Spring Security", "JPA / Hibernate", "REST API"] },
      { title: "前端开发", items: ["TypeScript", "React", "Next.js", "HTML / CSS", "SSR / SEO"] },
      { title: "数据与存储", items: ["PostgreSQL", "MySQL", "Redis", "SQL 调优", "数据建模"] },
      { title: "工程与基础设施", items: ["Linux", "Docker", "Caddy", "GitHub Actions", "可观测性"] },
    ],
    timeline: [
      { period: "NOW", title: "持续构建个人技术平台", description: "整理技术文章、知识笔记与项目经验。" },
      { period: "2025 — 2026", title: "深入 Java 与工程实践", description: "围绕 Spring 生态、数据库、认证授权和部署流程完成系统化实践。" },
      { period: "EARLIER", title: "计算机科学基础", description: "学习算法、数据结构、操作系统、网络和数据库原理。" },
    ],
  };
}

export function defaultProfileResume(): ProfileResume {
  return {
    name: "Monster",
    title: "Java / Full-stack Developer",
    email: "hello@example.com",
    website: "github.com/your-name",
    location: "中国",
    profile: "计算机专业开发者，熟悉 Java、Spring Boot、PostgreSQL 与现代 Web 开发。",
    coreSkills: "Java 21、Spring Boot、Spring Security、JPA / Hibernate、PostgreSQL、Next.js、TypeScript、Docker、Linux",
    engineeringSkills: "REST API 设计、数据库建模、权限系统、自动化测试、CI/CD、容器部署、性能排查",
    projects: [
      { name: "Monster HomePage", description: "个人技术品牌、博客、知识库和项目平台。", responsibilities: "负责前后端架构、Spring Security 会话认证、内容管理、Next.js SSR 与 Docker Compose 部署。" },
    ],
    education: "计算机相关专业",
    educationDetail: "核心课程：数据结构、算法、操作系统、计算机网络、数据库、软件工程。",
  };
}

export function defaultProfileUses(): ProfileUses {
  return {
    groups: [
      {
        title: "开发环境",
        items: [
          { name: "IntelliJ IDEA", description: "Java 与 Spring Boot 的主要 IDE" },
          { name: "Visual Studio Code", description: "前端、Markdown 与轻量编辑" },
          { name: "Windows + WSL / Linux", description: "本地开发与服务器环境" },
          { name: "Git", description: "版本管理与协作" },
        ],
      },
      {
        title: "技术栈",
        items: [
          { name: "Java 21", description: "稳定、成熟的后端开发语言" },
          { name: "Spring Boot", description: "Web API、认证与数据访问" },
          { name: "Next.js", description: "SSR、SEO 与前端交互" },
          { name: "PostgreSQL", description: "主要关系型数据库" },
        ],
      },
      {
        title: "部署服务",
        items: [
          { name: "Docker Compose", description: "单机容器编排" },
          { name: "Caddy", description: "自动 HTTPS 与反向代理" },
          { name: "GitHub Actions", description: "测试、构建与发布" },
          { name: "云服务器", description: "Linux 生产运行环境" },
        ],
      },
    ],
  };
}

export function defaultProfileLinks(): ProfileLinks {
  return {
    links: [
      { name: "GitHub", url: "https://github.com/", description: "开源代码与开发者协作平台" },
      { name: "Spring", url: "https://spring.io/", description: "Spring 生态官方站点" },
      { name: "Next.js", url: "https://nextjs.org/", description: "React 全栈 Web 框架" },
      { name: "PostgreSQL", url: "https://www.postgresql.org/", description: "强大的开源关系型数据库" },
      { name: "MDN Web Docs", url: "https://developer.mozilla.org/", description: "高质量 Web 技术参考" },
      { name: "Java Documentation", url: "https://docs.oracle.com/en/java/", description: "Java 平台参考文档" },
    ],
  };
}

// ── server fetch ──
import { apiFetch } from "@/lib/api";
export async function getFullProfile(): Promise<FullProfile> {
  try {
    const res = await apiFetch<FullProfile>("/api/profile");
    if (res.success && res.data) return res.data;
  } catch { /* fallback to defaults */ }
  return {
    about: defaultProfileAbout(),
    resume: defaultProfileResume(),
    uses: defaultProfileUses(),
    links: defaultProfileLinks(),
  };
}
