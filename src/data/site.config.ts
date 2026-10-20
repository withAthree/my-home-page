/**
 * ============================================================
 *  站点内容配置（唯一数据源 / Single source of truth）
 *  ------------------------------------------------------------
 *  想改文案 / 项目 / 照片 / 联系方式，只改这个文件即可，全站生效。
 *  图片统一放在 public/images/ 下，用 "/images/xxx.jpg" 引用。
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
  /** 首屏数据条 */
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

/** 板块标题文案；标题里用 *文本* 表示渐变强调，用 \n 换行 */
export interface SectionCopy {
  /** 序号小标题，如 "01 — About" */
  index: string;
  /** 主标题，支持 *强调* 与 \n 换行 */
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
    /** 头像角标，如 "8Y+ EXP" */
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
    /** 版权行，可用 {year} 与 {name} 占位 */
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

export const siteConfig: SiteConfig = {
  profile: {
    name: "黄凯",
    latinName: "HUANG KAI",
    roles: ["软件工程师", "产品设计师"],
    tagline: "擅长发现真问题，认真负责的 INTJ。",
    location: "中国 · 西安",
    avatar: "/images/wallhaven-o5llrm.jpg",
    bio: [
      "黄凯，软件工程师，2021 年起从事应用研发，现居西安。前端以 TypeScript、Vue、React 为主，后端做 Node.js、Python 与 Java，也负责过 Nginx、Docker 的部署与线上维护。",
      "先后参与智慧楼宇与低代码平台的研发，后在航天领域参与卫星测控平台及指挥类系统的设计与开发，从需求拆解、技术选型到上线交付都完整跑过。",
      "目前在关注 LangGraph 与 AI 应用工程化，希望找一个能真正解决复杂问题、对交付质量有要求的团队。",
    ],
    keywords: ["全栈开发", "TypeScript", "Vue / React", "Python", "LangGraph", "Docker / Nginx"],
    email: "huangkaixiang8462@163.com",
    socials: [
      {
        label: "GitHub",
        href: "https://github.com/withAthree",
        icon: "github",
      },
      {
        label: "邮件",
        href: "mailto:huangkaixiang8462@163.com",
        icon: "mail",
      },
    ],
    stats: [
      {
        label: "工作经验",
        value: "5Y+",
      },
      {
        label: "主导项目",
        value: "4",
      },
      {
        label: "现居城市",
        value: "西安",
      },
    ],
  },
  skills: [
    {
      category: "前端",
      caption: "FRONTEND",
      items: [
        {
          name: "Vue",
          level: 95,
        },
        {
          name: "TypeScript",
          level: 92,
        },
        {
          name: "React",
          level: 90,
        },
      ],
    },
    {
      category: "后端",
      caption: "BACKEND",
      items: [
        {
          name: "Node.js",
          level: 85,
        },
        {
          name: "Python",
          level: 85,
        },
        {
          name: "LangGraph",
          level: 80,
        },
        {
          name: "Java",
          level: 70,
        },
      ],
    },
    {
      category: "工具与运维",
      caption: "TOOLS & OPS",
      items: [
        {
          name: "Git",
          level: 90,
        },
        {
          name: "Nginx",
          level: 85,
        },
        {
          name: "Docker",
          level: 76,
        },
      ],
    },
  ],
  projects: [
    {
      id: "pha",
      title: "健康管理智能体",
      codename: "PROJECT / 1X",
      summary: "一个由数据科学、领域专家和健康教练三个专业子智能体协同工作的多智能体框架，旨在推理健康记录中的多模态数据，为用户提供个性化、循证的健康指导。",
      cover: "/images/project-clouddeck.svg",
      tags: [],
      year: "2026",
      accent: "#4CC9F0",
    },
    {
      id: "satellite-ttc",
      title: "卫星测控平台",
      codename: "PROJECT / 01",
      summary: "面向卫星测运控业务的一体化平台，承担系统设计与核心模块开发，处理多源遥测数据的接入、呈现与指令联动。",
      cover: "/images/project-clouddeck.svg",
      tags: ["Vue", "TypeScript", "WebSocket", "数据可视化"],
      year: "2025",
      accent: "#4CC9F0",
    },
    {
      id: "lowcode",
      title: "低代码可视化搭建平台",
      codename: "PROJECT / 02",
      summary: "通过可视化配置搭建表单与业务流程，把业务侧重复的开发需求收敛成可复用的配置，减少定制开发量。",
      cover: "/images/project-inkflow.svg",
      tags: ["Vue", "TypeScript", "Node.js", "可视化搭建"],
      year: "2023",
      accent: "#F72585",
    },
    {
      id: "smart-building",
      title: "智慧楼宇管理平台",
      codename: "PROJECT / 03",
      summary: "面向楼宇设备与能耗的一体化管理系统，负责前后端功能开发与现场联调，支撑设备的集中监控与数据上报。",
      cover: "/images/project-lumen.svg",
      tags: ["Vue", "Java", "Nginx", "物联网"],
      year: "2022",
      accent: "#B892FF",
    },
  ],
  timeline: [
    {
      period: "2024 — 至今",
      org: "北京航天驭星科技股份有限公司",
      role: "软件设计师",
      highlights: ["参与卫星测控平台的设计与核心模块开发。", "参与某指挥类平台的研发（涉密项目）。"],
    },
    {
      period: "2021 — 2023",
      org: "信华信（西安）信息技术有限公司",
      role: "软件开发工程师",
      highlights: ["参与智慧楼宇相关系统的前后端开发。", "参与低代码平台的设计、研发与落地。"],
    },
  ],
  gallery: [
    {
      id: "p1",
      src: "/images/photo-01.jpg",
      title: "冰川之镜",
      category: "风光",
      location: "冰岛",
      date: "2023.02",
      alt: "冰川断面与静水中的倒影",
    },
    {
      id: "p2",
      src: "/images/photo-02.jpg",
      title: "云海之上",
      category: "风光",
      location: "黄山",
      date: "2022.11",
      alt: "云海翻涌之上的山脊与孤树",
    },
    {
      id: "p3",
      src: "/images/photo-03.jpg",
      title: "钢索之上",
      category: "城市",
      location: "纽约",
      date: "2024.05",
      alt: "布鲁克林大桥的钢索与桥面透视",
    },
    {
      id: "p4",
      src: "/images/photo-04.jpg",
      title: "蓝白巴士",
      category: "城市",
      location: "大理",
      date: "2023.04",
      alt: "停在树荫下的蓝色复古巴士",
    },
    {
      id: "p5",
      src: "/images/photo-05.jpg",
      title: "窗边的马蹄莲",
      category: "人文",
      location: "深圳",
      date: "2024.02",
      alt: "暗调中窗边一株白色马蹄莲",
    },
    {
      id: "p6",
      src: "/images/photo-06.jpg",
      title: "注视",
      category: "人文",
      location: "内罗毕",
      date: "2023.08",
      alt: "母狮正面特写与金色眼睛",
    },
    {
      id: "p7",
      src: "/images/photo-07.jpg",
      title: "琴键上的手",
      category: "人文",
      location: "上海",
      date: "2024.09",
      alt: "黑白画面中弹奏钢琴的双手",
    },
    {
      id: "p8",
      src: "/images/photo-08.jpg",
      title: "橙色小船",
      category: "风光",
      location: "大理",
      date: "2023.06",
      alt: "碧绿湖面上的一条橙色小船",
    },
    {
      id: "p9",
      src: "/images/photo-09.jpg",
      title: "海边的望远镜",
      category: "人文",
      location: "青岛",
      date: "2022.07",
      alt: "海边银色投币望远镜与海平线",
    },
  ],
  nav: [
    {
      id: "hero",
      label: "首页",
      href: "#hero",
    },
    {
      id: "about",
      label: "关于",
      href: "#about",
    },
    {
      id: "projects",
      label: "作品",
      href: "#projects",
    },
    {
      id: "timeline",
      label: "经历",
      href: "#timeline",
    },
    {
      id: "gallery",
      label: "摄影",
      href: "#gallery",
    },
    {
      id: "contact",
      label: "联系",
      href: "#contact",
    },
  ],
  copy: {
    hero: {
      badge: "Available for select projects · 2026",
      ctaPrimary: "查看作品",
      ctaSecondary: "联系我",
      scrollHint: "Scroll to explore",
    },
    nav: {
      status: "Open to work",
      logoSuffix: ".dev",
    },
    about: {
      index: "01 — About",
      title: "把复杂*拆开*\n再把细节做到位",
      sub: "一个写前端、也关心后端与设计的人。相信好的产品是「工程约束」与「审美判断」反复拉扯后的结果。",
      avatarBadge: "8Y+ EXP",
      locationLabel: "所在地",
    },
    projects: {
      index: "02 — Selected Work",
      title: "做过一些*有意思*\n也够难的东西",
      sub: "从智慧楼宇到卫星测控，场景差别很大，做法一致：先把真实问题摸清楚，再谈方案。",
      demoLabel: "在线预览",
      repoLabel: "源码",
    },
    timeline: {
      index: "03 — Timeline",
      title: "一路走来\n留下*一些坐标*",
      sub: "从智慧楼宇到航天测控，交付场景在变，做事的方式没变：先把问题搞清楚，再动手。",
    },
    gallery: {
      index: "04 — Photography",
      title: "镜头里的*另一种秩序*",
      sub: "不为了拍得多好，只为了把某一刻的光留在硬盘里。城市、风光、人文，三个抽屉。",
      allLabel: "全部",
      categories: ["城市", "风光", "人文"],
      viewGrid: "瀑布流",
      viewStage: "3D 画廊",
    },
    contact: {
      index: "05 — Contact",
      title: "一起做点\n*有意思的事*",
      sub: "无论是工作机会、项目合作，还是单纯想聊聊工程和摄影，都可以直接给我写信，看到就会回。",
      copyLabel: "复制邮箱",
      copiedLabel: "已复制",
    },
    footer: {
      copyright: "© {year} {name} · 保留所有权利",
      builtWithLabel: "Built with",
      stack: ["Next.js", "Three.js", "TypeScript"],
      backToTop: "回到顶部",
    },
  },
  seo: {
    siteUrl: "https://xuqingchu.dev",
    ogImage: "/images/photo-03.jpg",
    twitterCard: "summary_large_image",
    description: "",
    keywords: ["个人主页", "作品集"],
    indexable: true,
  },
  theme: {
    bg: "#04040c",
    ink: "#eef1ff",
    cyan: "#4cc9f0",
    magenta: "#f72585",
    violet: "#7b2ff7",
    amber: "#ffd166",
  },
};

export default siteConfig;
