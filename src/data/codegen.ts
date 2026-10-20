/**
 * ============================================================
 *  site.config.ts 代码生成器
 *  ------------------------------------------------------------
 *  后台保存时把 JSON 内容重新序列化为 TypeScript 源码，保证：
 *   · 类型声明与文件头注释原样保留（只重写 siteConfig 对象字面量）
 *   · 2 空格缩进、短数组单行、键名不加引号、结尾保留逗号
 *   · 空值的可选字段（demoUrl / repoUrl）直接省略
 *   · 生成结果二次生成完全一致（幂等），避免无意义的 diff
 *  浏览器与本地 Studio 服务共用这一份实现。
 * ============================================================
 */

import { ADMIN_PAGES, type AdminPage, type FieldDef } from "./schema";

/** 文件头 + 类型定义（离线导出时使用；本地服务会优先使用文件里真实的那段） */
export const FALLBACK_HEADER = `/**
 * ============================================================
 *  站点内容配置（唯一数据源 / Single source of truth）
 *  ------------------------------------------------------------
 *  想改文案 / 项目 / 照片 / 联系方式，只改这个文件即可，全站生效。
 *  图片统一放在 public/images/ 下，用 "/images/xxx.jpg" 引用。
 *  工作年限不用手写：文案里写 "{years}" 即可，渲染时按「当年 − 2021」
 *  自动算出（2026 年即 5 年）；{since} 是 2021，{year} 是当年。见 data/career.ts。
 *
 *  ⚠️ 这个文件也可以由后台管理系统（/admin）自动生成。
 *     后台启动方式见 docs/ADMIN.md；直接手改本文件同样完全有效。
 * ============================================================
 */

/* ------------------------------ 类型定义 ------------------------------ */

export interface SocialLink {
  /** 展示名称 */
  label: string;
  /** 跳转地址 */
  href: string;
  /** 图标标识，见 components/Icons.tsx */
  icon: "github" | "mail" | "weibo" | "wechat" | "zhihu" | "twitter" | "rss";
}

export interface Profile {
  name: string;
  /** 英文名 / 品牌名，用于 Logo 与装饰 */
  latinName: string;
  /** 打字机轮换的职业；只写一项时只打一次并保留，不做删除重打 */
  roles: string[];
  /** 一句话定位 */
  tagline: string;
  location: string;
  avatar: string;
  /** 简介段落，可多段 */
  bio: string[];
  keywords: string[];
  email: string;
  socials: SocialLink[];
  /** 首屏数据条；value 可写 {years}，渲染时自动替换成工作年限（当年 − 2021） */
  stats: { label: string; value: string }[];
}

export interface SkillGroup {
  category: string;
  /** 英文副标题，装饰用 */
  caption: string;
  items: { name: string; level: number }[];
}

export interface Project {
  id: string;
  title: string;
  /** 英文代号，卡片角标 */
  codename: string;
  summary: string;
  cover: string;
  tags: string[];
  /** 留空则不渲染「在线预览」按钮 */
  demoUrl?: string;
  /** 留空则不渲染「源码」按钮 */
  repoUrl?: string;
  year: string;
  /** 卡片高亮色 */
  accent: string;
}

export interface TimelineItem {
  period: string;
  org: string;
  role: string;
  highlights: string[];
}

export interface Photo {
  id: string;
  src: string;
  title: string;
  /** 取值需与 copy.gallery.categories 之一对应 */
  category: string;
  location: string;
  date: string;
  alt: string;
}

export interface NavItem {
  /** 锚点 id，需与页面中 section 的 id 一致 */
  id: string;
  label: string;
  href: string;
}

/** 板块标题文案；标题里用 *文本* 表示渐变强调，用 \\n 换行 */
export interface SectionCopy {
  /** 序号小标题，如 "01 — About" */
  index: string;
  /** 主标题，支持 *强调* 与 \\n 换行 */
  title: string;
  /** 副标题 / 一句话说明 */
  sub: string;
}

export interface CopyConfig {
  hero: {
    /** 首屏左上角状态徽标 */
    badge: string;
    ctaPrimary: string;
    ctaSecondary: string;
    scrollHint: string;
  };
  nav: {
    /** 右上角工作状态徽标 */
    status: string;
    /** Logo 上的域名后缀 */
    logoSuffix: string;
  };
  about: SectionCopy & {
    /** 头像角标，如 "{years}Y+ EXP"；{years} 自动算成工作年限 */
    avatarBadge: string;
    /** 「所在地 ·」文案 */
    locationLabel: string;
  };
  projects: SectionCopy & {
    /** 卡片按钮文案：有 demoUrl / repoUrl 时才渲染 */
    demoLabel: string;
    repoLabel: string;
  };
  timeline: SectionCopy;
  gallery: SectionCopy & {
    /** 「全部」筛选按钮文案 */
    allLabel: string;
    /** 照片分类（不含「全部」） */
    categories: string[];
    /** 视图切换按钮文案 */
    viewGrid: string;
    viewStage: string;
  };
  contact: SectionCopy & {
    copyLabel: string;
    copiedLabel: string;
  };
  footer: {
    /** 版权行，可用 {year} / {years} / {since} / {name} 占位 */
    copyright: string;
    builtWithLabel: string;
    /** 技术栈标签，逐个渲染为 <code> */
    stack: string[];
    backToTop: string;
  };
}

export interface SeoConfig {
  /** 站点主域名，用于 canonical / OG 绝对地址 */
  siteUrl: string;
  /** 社交分享大图（建议 1200×630） */
  ogImage: string;
  twitterCard: "summary_large_image" | "summary";
  /** 留空则自动由 tagline + 简介首段拼接 */
  description: string;
  /** 追加到 keywords 的关键词 */
  keywords: string[];
  /** 是否允许搜索引擎收录 */
  indexable: boolean;
}

export interface ThemeConfig {
  bg: string;
  ink: string;
  cyan: string;
  magenta: string;
  violet: string;
  amber: string;
}

export interface SiteConfig {
  profile: Profile;
  skills: SkillGroup[];
  projects: Project[];
  timeline: TimelineItem[];
  gallery: Photo[];
  nav: NavItem[];
  copy: CopyConfig;
  seo: SeoConfig;
  theme: ThemeConfig;
}

/* ------------------------------ 配置内容 ------------------------------ */

`;

/** 「空值时不输出」的字段名（从 schema 的 omitWhenEmpty 推导，避免两处维护） */
function collectOmitKeys(): Set<string> {
  const keys = new Set<string>();
  const walk = (fields: FieldDef[] | undefined) => {
    (fields ?? []).forEach((f) => {
      if (f.omitWhenEmpty) keys.add(f.key);
      walk(f.fields);
      walk(f.itemFields);
    });
  };
  (ADMIN_PAGES as AdminPage[]).forEach((page) => {
    walk(page.itemFields);
    (page.panels ?? []).forEach((panel) => walk(panel.fields));
  });
  return keys;
}

const OMIT_WHEN_EMPTY = collectOmitKeys();

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const MAX_INLINE = 96;

function quote(value: string): string {
  return JSON.stringify(value);
}

function isPrimitive(value: unknown): boolean {
  return (
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
  );
}

function inlineLength(items: unknown[]): number {
  return items.reduce<number>((sum, item) => sum + String(JSON.stringify(item) ?? "").length + 2, 0);
}

/** 序列化任意值；indent 为当前缩进层级 */
export function serializeValue(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  const padIn = "  ".repeat(indent + 1);

  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return quote(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";

    // 短的基本类型数组保持单行，读起来更接近手写风格
    const allPrimitive = value.every(isPrimitive);
    const singleLineSafe =
      allPrimitive &&
      value.every((v) => typeof v !== "string" || !v.includes("\n")) &&
      inlineLength(value) + indent * 2 <= MAX_INLINE;

    if (singleLineSafe) {
      return `[${value
        .map((v) => (typeof v === "string" ? quote(v) : String(v)))
        .join(", ")}]`;
    }

    const body = value
      .map((item) => `${padIn}${serializeValue(item, indent + 1)},`)
      .join("\n");
    return `[\n${body}\n${pad}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key, v]) => {
        if (v === undefined) return false;
        if (OMIT_WHEN_EMPTY.has(key) && (v === "" || v === null)) return false;
        return true;
      }
    );

    if (entries.length === 0) return "{}";

    const body = entries
      .map(([key, v]) => {
        const name = IDENTIFIER.test(key) ? key : quote(key);
        return `${padIn}${name}: ${serializeValue(v, indent + 1)},`;
      })
      .join("\n");

    return `{\n${body}\n${pad}}`;
  }

  return "null";
}

/** 只重写对象字面量部分 */
export function serializeConfigObject(config: unknown): string {
  return serializeValue(config, 0);
}

/** 组装完整文件：文件头（含类型定义）+ 配置对象 + 默认导出 */
export function buildConfigFile(config: unknown, header?: string): string {
  const head = header && header.trim() ? header : FALLBACK_HEADER;
  const normalizedHead = head.endsWith("\n\n") ? head : `${head.replace(/\s*$/, "")}\n\n`;
  return `${normalizedHead}export const siteConfig: SiteConfig = ${serializeConfigObject(
    config
  )};\n\nexport default siteConfig;\n`;
}

/** 从现有文件文本里切出「文件头」（export const siteConfig 之前的部分） */
export function extractHeader(source: string): string {
  const marker = "export const siteConfig";
  const index = source.indexOf(marker);
  return index <= 0 ? "" : source.slice(0, index);
}

/** 深比较，用于判断草稿是否有改动 */
export function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
