/**
 * ============================================================
 *  后台字段 Schema —— 后台管理的「唯一表单定义」
 *  ------------------------------------------------------------
 *  这里没有任何 React / Node 依赖，是纯数据 + 纯函数：
 *   · 后台界面（/admin）用它渲染表单；
 *   · 本地 Studio 服务（scripts/studio.cjs）用它做校验与代码生成。
 *  改一个字段，界面、校验、写回文件三处同时生效。
 * ============================================================
 */

/* ------------------------------ 字段类型 ------------------------------ */

export type FieldKind =
  | "text" // 单行文本
  | "textarea" // 多行文本
  | "title" // 板块标题（支持 *强调* 与换行）
  | "chips" // 短标签数组（回车添加）
  | "paragraphs" // 长文本数组（简介 / 要点）
  | "number"
  | "range" // 0-100 滑块
  | "color" // #rrggbb
  | "switch" // 布尔
  | "select" // 枚举
  | "email"
  | "url"
  | "image" // 图片路径 + 预览 + 资源选择
  | "id" // 短横线 id
  | "list" // 对象数组（嵌套）
  | "object"; // 对象（嵌套）

export interface StringOption {
  value: string;
  label: string;
}

export interface ValidateContext {
  /** 整份站点配置 */
  config: Record<string, unknown>;
  /** 所在列表项的当前值（非列表字段为 undefined） */
  item?: Record<string, unknown>;
  /** 字段完整路径，如 projects.0.title */
  path: string;
}

export type Validator = (value: unknown, ctx: ValidateContext) => string | null;

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  /** 字段下方说明 */
  hint?: string;
  placeholder?: string;
  /** 必填：空值时报错并阻止保存 */
  required?: boolean;
  /** 空值时从输出中省略该键（如 project.demoUrl） */
  omitWhenEmpty?: boolean;
  /** 两列布局时占半宽 */
  half?: boolean;
  /** 折叠区（用于低频字段） */
  advanced?: boolean;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  maxLength?: number;
  options?: StringOption[];
  /** 动态选项：从配置的其他路径取（对象数组或字符串数组） */
  optionsFrom?: string;
  /** optionsFrom 指向字符串数组时，从第几项开始取 */
  optionsSkip?: number;
  /** optionsFrom 指向对象数组时，用哪个键做 value / label */
  optionsValueKey?: string;
  optionsLabelKey?: string;
  /** object 的子字段 */
  fields?: FieldDef[];
  /** list 的子字段 */
  itemFields?: FieldDef[];
  /** list 卡片标题模板，{key} 取当前项的值 */
  itemTitle?: string;
  /** list 卡片副标题模板 */
  itemSubtitle?: string;
  /** list 卡片缩略图字段名 */
  itemThumb?: string;
  /** 新增一项时的初始值 */
  newItem?: () => Record<string, unknown>;
  addLabel?: string;
  minItems?: number;
  maxItems?: number;
  /** id 类字段的前缀，用于自动生成 */
  idPrefix?: string;
  validate?: Validator;
}

/* ------------------------------ 页面结构 ------------------------------ */

/** 一个编辑面板（一张卡片）：字段都挂在 path 指向的对象上 */
export interface Panel {
  id: string;
  title: string;
  desc?: string;
  /** 相对 config 的路径："" 表示根，如 "profile"、"copy.hero" */
  path: string;
  fields: FieldDef[];
}

export interface AdminPage {
  id: string;
  label: string;
  /** 左侧导航图标 key（见 src/admin/ui/Icon.tsx） */
  icon: string;
  desc: string;
  navGroup: "内容" | "站点" | "工具";
  kind: "panels" | "list" | "overview" | "data";
  panels?: Panel[];
  /** kind === "list" 时：数组在 config 中的路径 */
  listPath?: string;
  itemFields?: FieldDef[];
  itemTitle?: string;
  itemSubtitle?: string;
  itemThumb?: string;
  newItem?: () => Record<string, unknown>;
  addLabel?: string;
  minItems?: number;
}

/* ------------------------------ 通用校验 ------------------------------ */

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

export const validators = {
  hex: (v: unknown) =>
    typeof v === "string" && HEX.test(v) ? null : "请填写十六进制颜色，如 #4cc9f0",
  email: (v: unknown) =>
    typeof v === "string" && EMAIL.test(v) ? null : "邮箱格式不正确",
  url: (v: unknown) =>
    typeof v === "string" && /^(https?:)?\/\/|^mailto:|^tel:/i.test(v)
      ? null
      : "请填写 http(s):// 开头的链接，或 mailto: / tel: 链接",
  slug: (v: unknown) =>
    typeof v === "string" && SLUG.test(v) ? null : "只用小写字母、数字和短横线，如 satellite-ttc",
  /** 图片：站内绝对路径或完整 URL */
  imagePath: (v: unknown) =>
    typeof v === "string" && (/^\//.test(v) || /^https?:\/\//.test(v))
      ? null
      : "站内路径以 / 开头（如 /images/a.jpg），或填写完整 URL",
  /** 标题标记：*强调* 必须成对 */
  titleMarkup: (v: unknown) => {
    if (typeof v !== "string") return null;
    const marks = (v.match(/\*/g) ?? []).length;
    return marks % 2 === 0 ? null : "「*」必须成对出现，用于标记渐变强调文字";
  },
} satisfies Record<string, Validator>;

/* ------------------------------ 复用字段片段 ------------------------------ */

const chips = (key: string, label: string, hint?: string, placeholder?: string): FieldDef => ({
  key,
  label,
  kind: "chips",
  hint,
  placeholder,
});

const sectionCopyFields = (): FieldDef[] => [
  {
    key: "index",
    label: "序号小标题",
    kind: "text",
    half: true,
    placeholder: "01 — About",
    hint: "左上角的等宽小字",
  },
  {
    key: "title",
    label: "主标题",
    kind: "title",
    required: true,
    validate: validators.titleMarkup,
    hint: "用 *文字* 标记渐变强调，回车换行",
  },
  { key: "sub", label: "副标题 / 说明", kind: "textarea", rows: 3 },
];

/* ------------------------------ 页面定义 ------------------------------ */

export const ADMIN_PAGES: AdminPage[] = [
  /* ----------------------------- 概览 ----------------------------- */
  {
    id: "overview",
    label: "概览",
    icon: "dashboard",
    navGroup: "工具",
    kind: "overview",
    desc: "站点状态、内容体检、快捷入口",
  },

  /* ----------------------------- 基本信息 ----------------------------- */
  {
    id: "profile",
    label: "基本信息",
    icon: "user",
    navGroup: "内容",
    kind: "panels",
    desc: "姓名、职业、简介、联系方式等「关于我」的核心内容",
    panels: [
      {
        id: "identity",
        title: "身份",
        desc: "首屏与导航里出现的最基本信息",
        path: "profile",
        fields: [
          { key: "name", label: "姓名", kind: "text", required: true, half: true, maxLength: 24 },
          {
            key: "latinName",
            label: "英文名 / 品牌名",
            kind: "text",
            half: true,
            hint: "首屏大字背后的装饰文字",
          },
          chips("roles", "职业（打字机轮换）", "首屏逐字打出；只填 1 项时打完不回删", "加一个职业后回车"),
          {
            key: "tagline",
            label: "一句话定位",
            kind: "textarea",
            required: true,
            rows: 2,
            validate: (v) =>
              typeof v === "string" && v.length > 60 ? "建议控制在 60 字以内" : null,
          },
          { key: "location", label: "所在地", kind: "text", half: true, placeholder: "中国 · 西安" },
          {
            key: "avatar",
            label: "头像",
            kind: "image",
            half: true,
            required: true,
            validate: validators.imagePath,
            hint: "建议正方形，≥ 400×400",
          },
        ],
      },
      {
        id: "bio",
        title: "简介与关键词",
        desc: "关于我的正文段落和技能关键词标签",
        path: "profile",
        fields: [
          {
            key: "bio",
            label: "简介段落",
            kind: "paragraphs",
            required: true,
            minItems: 1,
            maxItems: 5,
            addLabel: "添加段落",
            hint: "每段对应「关于我」右侧的一段文字",
          },
          chips("keywords", "关键词标签", "展示为头像下方的标签云", "加一个关键词后回车"),
        ],
      },
      {
        id: "contact",
        title: "联系方式",
        desc: "邮箱与社交链接",
        path: "profile",
        fields: [
          {
            key: "email",
            label: "邮箱",
            kind: "email",
            required: true,
            half: true,
            validate: validators.email,
          },
          {
            key: "socials",
            label: "社交链接",
            kind: "list",
            maxItems: 6,
            addLabel: "添加社交链接",
            itemTitle: "{label}",
            itemSubtitle: "{href}",
            newItem: () => ({ label: "GitHub", href: "https://github.com/", icon: "github" }),
            itemFields: [
              { key: "label", label: "名称", kind: "text", required: true, half: true },
              {
                key: "icon",
                label: "图标",
                kind: "select",
                half: true,
                options: [
                  { value: "github", label: "GitHub" },
                  { value: "mail", label: "邮件" },
                  { value: "weibo", label: "微博" },
                  { value: "wechat", label: "微信" },
                  { value: "zhihu", label: "知乎" },
                  { value: "twitter", label: "Twitter / X" },
                  { value: "rss", label: "RSS / 其它" },
                ],
              },
              {
                key: "href",
                label: "链接",
                kind: "url",
                required: true,
                validate: validators.url,
                placeholder: "https://github.com/withAthree 或 mailto:hi@example.com",
                hint: "支持 mailto: 链接",
              },
            ],
          },
        ],
      },
      {
        id: "stats",
        title: "首屏数据条",
        desc: "首屏底部的三个数字",
        path: "profile",
        fields: [
          {
            key: "stats",
            label: "数据项",
            kind: "list",
            maxItems: 4,
            addLabel: "添加数据项",
            itemTitle: "{label} · {value}",
            newItem: () => ({ label: "研发经验", value: "5Y+" }),
            hint: "2–3 条排版最好看",
            itemFields: [
              { key: "label", label: "说明", kind: "text", required: true, half: true },
              { key: "value", label: "数值", kind: "text", required: true, half: true },
            ],
          },
        ],
      },
    ],
  },

  /* ----------------------------- 技能 ----------------------------- */
  {
    id: "skills",
    label: "技能栈",
    icon: "layers",
    navGroup: "内容",
    kind: "list",
    desc: "关于我里的技能分组与熟练度进度条",
    listPath: "skills",
    addLabel: "添加技能分组",
    itemTitle: "{category}",
    itemSubtitle: "{caption}",
    minItems: 1,
    newItem: () => ({
      category: "新分组",
      caption: "NEW GROUP",
      items: [{ name: "新技能", level: 60 }],
    }),
    itemFields: [
      { key: "category", label: "分组名称", kind: "text", required: true, half: true },
      {
        key: "caption",
        label: "英文副标题",
        kind: "text",
        half: true,
        placeholder: "FRONTEND",
        hint: "装饰用，建议全大写",
      },
      {
        key: "items",
        label: "技能条目",
        kind: "list",
        required: true,
        minItems: 1,
        addLabel: "添加技能",
        itemTitle: "{name}",
        newItem: () => ({ name: "新技能", level: 60 }),
        itemFields: [
          { key: "name", label: "名称", kind: "text", required: true, half: true },
          {
            key: "level",
            label: "熟练度",
            kind: "range",
            half: true,
            min: 0,
            max: 100,
            step: 1,
          },
        ],
      },
    ],
  },

  /* ----------------------------- 作品 ----------------------------- */
  {
    id: "projects",
    label: "项目作品",
    icon: "grid",
    navGroup: "内容",
    kind: "list",
    desc: "作品集卡片：封面、简介、技术标签、外部链接",
    listPath: "projects",
    addLabel: "添加作品",
    itemTitle: "{title}",
    itemSubtitle: "{codename} · {year}",
    itemThumb: "cover",
    newItem: () => ({
      id: "",
      title: "新项目",
      codename: "PROJECT / 0X",
      summary: "",
      cover: "/images/project-clouddeck.svg",
      tags: [],
      year: String(new Date().getFullYear()),
      accent: "#4CC9F0",
    }),
    itemFields: [
      { key: "title", label: "项目名称", kind: "text", required: true, half: true },
      {
        key: "codename",
        label: "角标文字",
        kind: "text",
        half: true,
        placeholder: "PROJECT / 01",
        hint: "卡片左上角的小字",
      },
      {
        key: "id",
        label: "标识 id",
        kind: "id",
        required: true,
        half: true,
        idPrefix: "project",
        validate: validators.slug,
        hint: "站内唯一，用于锚点与图片命名",
      },
      {
        key: "year",
        label: "年份",
        kind: "text",
        half: true,
        required: true,
        placeholder: "2025",
        maxLength: 9,
      },
      { key: "summary", label: "一句话简介", kind: "textarea", required: true, rows: 3 },
      {
        key: "cover",
        label: "封面图",
        kind: "image",
        required: true,
        validate: validators.imagePath,
        hint: "建议 16:10，≥ 1200×750",
      },
      chips("tags", "技术标签", "卡片底部的标签", "加一个标签后回车"),
      {
        key: "accent",
        label: "卡片高亮色",
        kind: "color",
        half: true,
        validate: validators.hex,
        hint: "角标文字颜色",
      },
      {
        key: "demoUrl",
        label: "在线预览链接",
        kind: "url",
        omitWhenEmpty: true,
        validate: validators.url,
        hint: "留空则不显示「在线预览」按钮",
      },
      {
        key: "repoUrl",
        label: "源码链接",
        kind: "url",
        omitWhenEmpty: true,
        validate: validators.url,
        hint: "留空则不显示「源码」按钮",
      },
    ],
  },

  /* ----------------------------- 经历 ----------------------------- */
  {
    id: "timeline",
    label: "经历时间线",
    icon: "timeline",
    navGroup: "内容",
    kind: "list",
    desc: "工作与教育经历，按时间倒序排列",
    listPath: "timeline",
    addLabel: "添加经历",
    itemTitle: "{org}",
    itemSubtitle: "{period} · {role}",
    newItem: () => ({
      period: "2025 — 至今",
      org: "公司名称",
      role: "职位",
      highlights: [""],
    }),
    itemFields: [
      { key: "period", label: "时间区间", kind: "text", required: true, half: true, placeholder: "2024 — 至今" },
      { key: "org", label: "机构 / 公司", kind: "text", required: true, half: true },
      { key: "role", label: "角色 / 职位", kind: "text", required: true },
      {
        key: "highlights",
        label: "要点",
        kind: "paragraphs",
        addLabel: "添加要点",
        hint: "每行一条，2–3 条最合适",
      },
    ],
  },

  /* ----------------------------- 摄影 ----------------------------- */
  {
    id: "gallery",
    label: "摄影集",
    icon: "camera",
    navGroup: "内容",
    kind: "list",
    desc: "照片墙内容：图片、标题、分类、拍摄地",
    listPath: "gallery",
    addLabel: "添加照片",
    itemTitle: "{title}",
    itemSubtitle: "{category} · {location} · {date}",
    itemThumb: "src",
    newItem: () => ({
      id: "",
      src: "/images/photo-01.jpg",
      title: "新照片",
      category: "",
      location: "西安",
      date: String(new Date().getFullYear()),
      alt: "",
    }),
    itemFields: [
      {
        key: "src",
        label: "图片",
        kind: "image",
        required: true,
        validate: validators.imagePath,
        hint: "建议长边 ≥ 1600px，保持竖图比例更整齐",
      },
      { key: "title", label: "标题", kind: "text", required: true, half: true },
      {
        key: "category",
        label: "分类",
        kind: "select",
        half: true,
        required: true,
        optionsFrom: "copy.gallery.categories",
        hint: "可选分类在「文案 → 摄影集」里维护",
      },
      { key: "location", label: "拍摄地", kind: "text", half: true, required: true },
      { key: "date", label: "拍摄时间", kind: "text", half: true, placeholder: "2024.05" },
      {
        key: "alt",
        label: "图片描述（无障碍）",
        kind: "textarea",
        rows: 2,
        required: true,
        hint: "给读屏软件用，简述画面内容",
      },
      {
        key: "id",
        label: "标识 id",
        kind: "id",
        required: true,
        half: true,
        idPrefix: "photo",
        validate: validators.slug,
        hint: "站内唯一",
      },
    ],
  },

  /* ----------------------------- 导航 ----------------------------- */
  {
    id: "nav",
    label: "导航菜单",
    icon: "list",
    navGroup: "内容",
    kind: "list",
    desc: "顶部导航与移动端菜单，顺序即展示顺序",
    listPath: "nav",
    addLabel: "添加导航项",
    itemTitle: "{label}",
    itemSubtitle: "{href}",
    minItems: 1,
    newItem: () => ({ id: "about", label: "新入口", href: "#about" }),
    itemFields: [
      { key: "label", label: "文字", kind: "text", required: true, half: true },
      {
        key: "id",
        label: "锚点 id",
        kind: "text",
        half: true,
        required: true,
        hint: "页面中 section 的 id：hero / about / projects / timeline / gallery / contact",
      },
      { key: "href", label: "链接", kind: "text", required: true, placeholder: "#about" },
    ],
  },

  /* ----------------------------- 文案 ----------------------------- */
  {
    id: "copy",
    label: "页面文案",
    icon: "type",
    navGroup: "站点",
    kind: "panels",
    desc: "各板块的标题、说明与按钮文字，改这里不用碰代码",
    panels: [
      {
        id: "copy-hero",
        title: "首屏 Hero",
        path: "copy.hero",
        fields: [
          {
            key: "badge",
            label: "状态徽标",
            kind: "text",
            hint: "首屏左上角那一行小字，可留空",
          },
          { key: "ctaPrimary", label: "主按钮文字", kind: "text", half: true, required: true },
          { key: "ctaSecondary", label: "次按钮文字", kind: "text", half: true, required: true },
          {
            key: "scrollHint",
            label: "滚动提示",
            kind: "text",
            placeholder: "Scroll to explore",
          },
        ],
      },
      {
        id: "copy-nav",
        title: "导航",
        path: "copy.nav",
        fields: [
          { key: "status", label: "工作状态", kind: "text", half: true, placeholder: "Open to work" },
          {
            key: "logoSuffix",
            label: "Logo 后缀",
            kind: "text",
            half: true,
            placeholder: ".dev",
          },
        ],
      },
      {
        id: "copy-about",
        title: "关于我",
        path: "copy.about",
        fields: [
          ...sectionCopyFields(),
          { key: "avatarBadge", label: "头像角标", kind: "text", half: true, placeholder: `${new Date().getFullYear() - 2021}Y+ EXP` },
          {
            key: "locationLabel",
            label: "所在地标签",
            kind: "text",
            half: true,
            placeholder: "所在地",
          },
        ],
      },
      {
        id: "copy-projects",
        title: "项目作品",
        path: "copy.projects",
        fields: [
          ...sectionCopyFields(),
          { key: "demoLabel", label: "预览按钮文字", kind: "text", half: true },
          { key: "repoLabel", label: "源码按钮文字", kind: "text", half: true },
        ],
      },
      {
        id: "copy-timeline",
        title: "经历时间线",
        path: "copy.timeline",
        fields: sectionCopyFields(),
      },
      {
        id: "copy-gallery",
        title: "摄影集",
        path: "copy.gallery",
        fields: [
          ...sectionCopyFields(),
          {
            key: "allLabel",
            label: "「全部」筛选文字",
            kind: "text",
            half: true,
            required: true,
          },
          {
            key: "categories",
            label: "照片分类",
            kind: "chips",
            required: true,
            minItems: 1,
            hint: "顺序即筛选条顺序；删掉一个分类后，该分类下的照片需要重新归类",
          },
          { key: "viewGrid", label: "瀑布流按钮", kind: "text", half: true, required: true },
          { key: "viewStage", label: "3D 画廊按钮", kind: "text", half: true, required: true },
        ],
      },
      {
        id: "copy-contact",
        title: "联系方式",
        path: "copy.contact",
        fields: [
          ...sectionCopyFields(),
          { key: "copyLabel", label: "复制按钮", kind: "text", half: true, required: true },
          { key: "copiedLabel", label: "已复制状态", kind: "text", half: true, required: true },
        ],
      },
      {
        id: "copy-footer",
        title: "页脚",
        path: "copy.footer",
        fields: [
          {
            key: "copyright",
            label: "版权行",
            kind: "text",
            required: true,
            hint: "支持 {year} 与 {name} 两个占位符",
            validate: (v) => {
              if (typeof v !== "string") return null;
              const bad = v.match(/\{[a-zA-Z]+\}/g)?.filter((t) => t !== "{year}" && t !== "{name}");
              return bad && bad.length ? `不认识的占位符：${bad.join("、")}` : null;
            },
          },
          { key: "builtWithLabel", label: "技术栈前缀", kind: "text", half: true },
          chips("stack", "技术栈标签", "逐个渲染为等宽小标签", "加一项后回车"),
          { key: "backToTop", label: "回到顶部文字", kind: "text", half: true, required: true },
        ],
      },
    ],
  },

  /* ----------------------------- SEO ----------------------------- */
  {
    id: "seo",
    label: "SEO 与分享",
    icon: "search",
    navGroup: "站点",
    kind: "panels",
    desc: "搜索引擎收录、社交平台分享卡片",
    panels: [
      {
        id: "seo-basic",
        title: "站点信息",
        path: "seo",
        fields: [
          {
            key: "siteUrl",
            label: "站点主域名",
            kind: "url",
            required: true,
            validate: validators.url,
            placeholder: "https://your-domain.com",
            hint: "用于 canonical 与分享卡片的绝对地址",
          },
          {
            key: "description",
            label: "站点描述",
            kind: "textarea",
            rows: 3,
            hint: "留空则自动用「一句话定位 + 简介首段」拼接；建议 80–120 字",
            validate: (v) =>
              typeof v === "string" && v.length > 200 ? "建议控制在 200 字以内" : null,
          },
          chips("keywords", "追加关键词", "会与姓名、职业、标签自动合并", "加一个关键词后回车"),
        ],
      },
      {
        id: "seo-share",
        title: "分享卡片",
        path: "seo",
        fields: [
          {
            key: "ogImage",
            label: "分享大图",
            kind: "image",
            required: true,
            validate: validators.imagePath,
            hint: "建议 1200×630，微信 / Twitter 分享时使用",
          },
          {
            key: "twitterCard",
            label: "Twitter 卡片样式",
            kind: "select",
            half: true,
            options: [
              { value: "summary_large_image", label: "大图（summary_large_image）" },
              { value: "summary", label: "小图（summary）" },
            ],
          },
          {
            key: "indexable",
            label: "允许搜索引擎收录",
            kind: "switch",
            half: true,
            hint: "关闭后生成 robots noindex",
          },
        ],
      },
    ],
  },

  /* ----------------------------- 主题 ----------------------------- */
  {
    id: "theme",
    label: "主题配色",
    icon: "palette",
    navGroup: "站点",
    kind: "panels",
    desc: "全站配色变量，改动会即时体现在预览里",
    panels: [
      {
        id: "theme-color",
        title: "色彩",
        desc: "深空暗色基调，三个强调色用于渐变与高亮",
        path: "theme",
        fields: [
          { key: "bg", label: "背景色", kind: "color", half: true, validate: validators.hex },
          { key: "ink", label: "正文色", kind: "color", half: true, validate: validators.hex },
          { key: "cyan", label: "主强调色", kind: "color", half: true, validate: validators.hex, hint: "标题渐变起点、下标装饰" },
          { key: "violet", label: "次强调色", kind: "color", half: true, validate: validators.hex, hint: "渐变中段" },
          { key: "magenta", label: "强调色 3", kind: "color", half: true, validate: validators.hex, hint: "渐变终点" },
          { key: "amber", label: "点缀色", kind: "color", half: true, validate: validators.hex },
        ],
      },
    ],
  },

  /* ----------------------------- 数据 ----------------------------- */
  {
    id: "data",
    label: "数据与发布",
    icon: "database",
    navGroup: "工具",
    kind: "data",
    desc: "导入导出、历史版本、写回文件与提交",
  },
];

export const PAGE_MAP: Record<string, AdminPage> = Object.fromEntries(
  ADMIN_PAGES.map((p) => [p.id, p])
);

/** 左栏顺序：概览置顶，其余按 navGroup 分组 */
export const NAV_GROUPS: { title: string; pages: AdminPage[] }[] = [
  { title: "工具", pages: ADMIN_PAGES.filter((p) => p.navGroup === "工具") },
  { title: "内容", pages: ADMIN_PAGES.filter((p) => p.navGroup === "内容") },
  { title: "站点", pages: ADMIN_PAGES.filter((p) => p.navGroup === "站点") },
];

/** 所有带 list 的顶层路径，服务端用来判断「哪些字段是数组」 */
export const LIST_PATHS = ADMIN_PAGES.filter((p) => p.kind === "list" && p.listPath).map(
  (p) => p.listPath as string
);

/* ------------------------------ 工具函数 ------------------------------ */

export function getAtPath(root: unknown, path: string): unknown {
  if (!path) return root;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, root);
}

export function formatTemplate(template: string | undefined, item: unknown): string {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const value = getAtPath(item, key);
    return value === undefined || value === null || value === "" ? "—" : String(value);
  });
}

/** 新增列表项时补齐唯一 id */
export function makeUniqueId(base: string, taken: Set<string>): string {
  const slug = base || "item";
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i += 1;
  return `${slug}-${i}`;
}
