/**
 * ============================================================
 *  配置校验 + 内容体检
 *  ------------------------------------------------------------
 *  validateConfig：阻止保存的硬错误（必填、格式、重复 id、类型）
 *  auditConfig   ：不阻止保存的提醒（外链缺失、分类不匹配、可优化项）
 *  浏览器与本地 Studio 服务共用。
 * ============================================================
 */

import { ADMIN_PAGES, getAtPath, type AdminPage, type FieldDef } from "./schema";

export type IssueLevel = "error" | "warn";

export interface Issue {
  level: IssueLevel;
  /** 字段路径，如 projects.0.title */
  path: string;
  message: string;
  /** 所属后台页面 id，用于跳转 */
  pageId?: string;
  /** 所属列表项下标 */
  index?: number;
}

/** 首页存在的 section 锚点，导航菜单应当指向其中之一 */
export const KNOWN_ANCHORS = ["hero", "about", "projects", "timeline", "gallery", "contact"];

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function validateFields(
  fields: FieldDef[],
  record: Record<string, unknown> | undefined,
  basePath: string,
  config: Record<string, unknown>,
  item: Record<string, unknown> | undefined,
  issues: Issue[],
  pageId: string,
  index?: number
): void {
  for (const field of fields) {
    const value = record ? record[field.key] : undefined;
    const path = `${basePath}.${field.key}`;
    const label = field.label || field.key;

    // 必填
    if (field.required && isBlank(value)) {
      issues.push({ level: "error", path, message: `${label}不能为空`, pageId, index });
      continue;
    }

    // 数组条数
    if (field.kind === "list" || field.kind === "paragraphs" || field.kind === "chips") {
      const arr = Array.isArray(value) ? value : [];
      if (field.minItems && arr.length < field.minItems) {
        issues.push({
          level: "error",
          path,
          message: `${label}至少需要 ${field.minItems} 项`,
          pageId,
          index,
        });
      }
      if (field.maxItems && arr.length > field.maxItems) {
        issues.push({
          level: "error",
          path,
          message: `${label}最多 ${field.maxItems} 项`,
          pageId,
          index,
        });
      }
    }

    // 自定义校验
    if (value !== undefined && value !== "" && field.validate) {
      const message = field.validate(value, { config, item, path });
      if (message) issues.push({ level: "error", path, message, pageId, index });
    }

    // 递归：嵌套对象 / 列表
    if (field.kind === "object" && field.fields && value && typeof value === "object") {
      validateFields(
        field.fields,
        value as Record<string, unknown>,
        path,
        config,
        value as Record<string, unknown>,
        issues,
        pageId,
        index
      );
    }

    if (field.kind === "list" && Array.isArray(value)) {
      const seen = new Set<string>();
      value.forEach((child, i) => {
        const childRecord =
          child && typeof child === "object" ? (child as Record<string, unknown>) : undefined;
        const childPath = `${path}.${i}`;

        if (childRecord && typeof childRecord.id === "string" && childRecord.id.trim()) {
          const id = childRecord.id.trim();
          if (seen.has(id)) {
            issues.push({
              level: "error",
              path: `${childPath}.id`,
              message: `${field.label || "列表"}里的标识 id "${id}" 重复了`,
              pageId,
              index,
            });
          }
          seen.add(id);
        }

        if (childRecord && field.itemFields) {
          validateFields(
            field.itemFields,
            childRecord,
            childPath,
            config,
            childRecord,
            issues,
            pageId,
            i
          );
        }
      });
    }
  }
}

/** 硬错误：有任意 error 时禁止保存 */
export function validateConfig(config: Record<string, unknown>): Issue[] {
  const issues: Issue[] = [];

  for (const page of ADMIN_PAGES as AdminPage[]) {
    if (page.kind === "list" && page.listPath) {
      const arr = getAtPath(config, page.listPath);
      if (!Array.isArray(arr)) {
        issues.push({
          level: "error",
          path: page.listPath,
          message: `${page.label}数据缺失（应为数组）`,
          pageId: page.id,
        });
        continue;
      }
      if (page.minItems && arr.length < page.minItems) {
        issues.push({
          level: "error",
          path: page.listPath,
          message: `${page.label}至少需要 ${page.minItems} 条`,
          pageId: page.id,
        });
      }
      const seen = new Set<string>();
      arr.forEach((item, i) => {
        const record =
          item && typeof item === "object" ? (item as Record<string, unknown>) : undefined;
        if (!record) {
          issues.push({
            level: "error",
            path: `${page.listPath}.${i}`,
            message: `${page.label}第 ${i + 1} 条数据格式不对`,
            pageId: page.id,
            index: i,
          });
          return;
        }
        if (typeof record.id === "string" && record.id.trim()) {
          const id = record.id.trim();
          if (seen.has(id)) {
            issues.push({
              level: "error",
              path: `${page.listPath}.${i}.id`,
              message: `标识 id "${id}" 与前面的条目重复`,
              pageId: page.id,
              index: i,
            });
          }
          seen.add(id);
        }
        validateFields(
          page.itemFields ?? [],
          record,
          `${page.listPath}.${i}`,
          config,
          record,
          issues,
          page.id,
          i
        );
      });
    }

    if (page.kind === "panels") {
      for (const panel of page.panels ?? []) {
        const record = getAtPath(config, panel.path);
        validateFields(
          panel.fields,
          record && typeof record === "object" ? (record as Record<string, unknown>) : undefined,
          panel.path,
          config,
          record && typeof record === "object" ? (record as Record<string, unknown>) : undefined,
          issues,
          page.id
        );
      }
    }
  }

  return issues;
}

export interface AuditOptions {
  /** public/images 下的文件（由本地服务提供，离线模式为空） */
  assets?: string[];
}

/** 体检：不阻止保存，但值得提醒的问题 */
export function auditConfig(
  config: Record<string, unknown>,
  options: AuditOptions = {}
): Issue[] {
  const issues: Issue[] = [];
  const push = (level: IssueLevel, path: string, message: string, pageId: string, index?: number) =>
    issues.push({ level, path, message, pageId, index });

  const copy = config.copy as Record<string, Record<string, unknown>> | undefined;
  const categories = (copy?.gallery?.categories as string[] | undefined) ?? [];

  // 1. 导航锚点是否真实存在
  const nav = (config.nav as Record<string, unknown>[] | undefined) ?? [];
  nav.forEach((item, i) => {
    const id = typeof item.id === "string" ? item.id : "";
    if (id && !KNOWN_ANCHORS.includes(id)) {
      push(
        "warn",
        `nav.${i}.id`,
        `锚点 "${id}" 不在首页 section 列表中，点击后可能无法定位`,
        "nav",
        i
      );
    }
  });

  // 2. 照片分类是否都在分类表里
  const gallery = (config.gallery as Record<string, unknown>[] | undefined) ?? [];
  gallery.forEach((photo, i) => {
    const category = typeof photo.category === "string" ? photo.category : "";
    if (category && categories.length && !categories.includes(category)) {
      push(
        "warn",
        `gallery.${i}.category`,
        `分类「${category}」不在筛选条里，这张照片会只在「全部」中出现`,
        "gallery",
        i
      );
    }
  });

  // 3. 分类为空 / 重复
  const duplicated = categories.filter((c, i) => categories.indexOf(c) !== i);
  if (duplicated.length) {
    push("warn", "copy.gallery.categories", `分类重复：${duplicated.join("、")}`, "copy");
  }
  const unused = categories.filter((c) => !gallery.some((p) => p.category === c));
  if (unused.length) {
    push(
      "warn",
      "copy.gallery.categories",
      `分类「${unused.join("、")}」下还没有照片，筛选后会是空列表`,
      "copy"
    );
  }

  // 4. 项目缺外链
  const projects = (config.projects as Record<string, unknown>[] | undefined) ?? [];
  const withoutLink = projects.filter((project) => {
    const hasDemo = typeof project.demoUrl === "string" && project.demoUrl.trim() !== "";
    const hasRepo = typeof project.repoUrl === "string" && project.repoUrl.trim() !== "";
    return !hasDemo && !hasRepo;
  });
  if (withoutLink.length) {
    push(
      "warn",
      "projects",
      `${withoutLink.length} 个项目没有填写预览 / 源码链接，卡片上不会出现按钮`,
      "projects"
    );
  }

  // 5. 社交链接数量
  const socials = ((config.profile as Record<string, unknown> | undefined)?.socials ??
    []) as Record<string, unknown>[];
  if (socials.length === 0) {
    push("warn", "profile.socials", "还没有配置任何社交链接", "profile");
  }

  // 6. 主题色是否可读（背景色过亮时深色文字会看不清）
  const theme = config.theme as Record<string, string> | undefined;
  if (theme?.bg) {
    const hex = theme.bg.replace("#", "");
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex.padEnd(6, "0");
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (luma > 0.55) {
      push("warn", "theme.bg", "背景色偏亮，而站点排版是为深色背景设计的，文字可能看不清", "theme");
    }
  }

  // 7. 图片文件是否存在（需要本地服务提供 public/images 清单）
  if (options.assets && options.assets.length) {
    const known = new Set(options.assets);
    const checkImage = (path: string | undefined, at: string, pageId: string, index?: number) => {
      if (!path || /^https?:\/\//.test(path)) return;
      if (!known.has(path)) {
        push("warn", at, `public 目录下找不到这个文件：${path}`, pageId, index);
      }
    };
    checkImage(
      (config.profile as Record<string, unknown> | undefined)?.avatar as string,
      "profile.avatar",
      "profile"
    );
    checkImage((config.seo as Record<string, unknown> | undefined)?.ogImage as string, "seo.ogImage", "seo");
    projects.forEach((p, i) => checkImage(p.cover as string, `projects.${i}.cover`, "projects", i));
    gallery.forEach((p, i) => checkImage(p.src as string, `gallery.${i}.src`, "gallery", i));

    const referenced = new Set<string>();
    if (typeof (config.profile as Record<string, unknown>)?.avatar === "string") {
      referenced.add((config.profile as Record<string, string>).avatar);
    }
    projects.forEach((p) => typeof p.cover === "string" && referenced.add(p.cover));
    gallery.forEach((p) => typeof p.src === "string" && referenced.add(p.src));
    const orphans = options.assets.filter(
      (a) => a.startsWith("/images/") && !referenced.has(a)
    );
    if (orphans.length) {
      push(
        "warn",
        "",
        `public/images 里有 ${orphans.length} 张图片没有被任何内容引用（不影响使用）`,
        "data"
      );
    }
  }

  // 8. 简介段落过多会影响首屏高度
  const bio = ((config.profile as Record<string, unknown> | undefined)?.bio ?? []) as string[];
  if (bio.length > 4) {
    push("warn", "profile.bio", "简介超过 4 段，「关于我」板块会显得过长", "profile");
  }

  return issues;
}

export function countIssues(issues: Issue[], level: IssueLevel): number {
  return issues.filter((i) => i.level === level).length;
}
