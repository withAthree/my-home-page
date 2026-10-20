/** 极简线性图标集（内联 SVG，无第三方依赖） */

type P = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const ArrowRight = (p: P) => (
  <svg {...base} className={p.className}>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const ArrowUpRight = (p: P) => (
  <svg {...base} className={p.className}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

export const ArrowUp = (p: P) => (
  <svg {...base} className={p.className}>
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </svg>
);

export const ArrowLeft = (p: P) => (
  <svg {...base} className={p.className}>
    <path d="M20 12H5" />
    <path d="m11 6-6 6 6 6" />
  </svg>
);

export const Close = (p: P) => (
  <svg {...base} className={p.className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Copy = (p: P) => (
  <svg {...base} className={p.className}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6.5A2.5 2.5 0 0 0 4 5.5v6A2.5 2.5 0 0 0 6.5 14" />
  </svg>
);

export const Check = (p: P) => (
  <svg {...base} className={p.className}>
    <path d="m4 12.5 5 5L20 6.5" />
  </svg>
);

export const Grid = (p: P) => (
  <svg {...base} className={p.className}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
  </svg>
);

export const Layers = (p: P) => (
  <svg {...base} className={p.className}>
    <path d="m12 3 8.5 4.6L12 12.2 3.5 7.6 12 3Z" />
    <path d="m3.5 12.4 8.5 4.6 8.5-4.6" />
    <path d="m3.5 16.9 8.5 4.6 8.5-4.6" />
  </svg>
);

export const Github = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={p.className}>
    <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.51 2.87 8.34 6.84 9.69.5.09.68-.22.68-.49v-1.7c-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.11.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.35 4.8-4.58 5.05.36.32.68.94.68 1.9v2.82c0 .27.18.59.69.49A10.06 10.06 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
  </svg>
);

export const Weibo = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={p.className}>
    <path d="M10.1 20.2c-4.2 0-7.6-2-7.6-4.5 0-1.3.8-2.8 2.3-4.2 2-1.9 4.3-2.7 5.2-1.9.4.4.4 1 .1 1.8-.1.4.4.2.4.2 1.7-.7 3.1-.7 3.7.1.3.4.3 1 0 1.7-.1.3 0 .4.3.5 1.5.5 2.3 1.3 2.3 2.4 0 2.2-3.1 3.9-6.7 3.9Zm-.2-1.6c2.3 0 4.2-1 4.2-2.3 0-1.2-1.7-2.2-4-2.2-2.3 0-4.2 1-4.2 2.3 0 1.2 1.7 2.2 4 2.2Zm.3-2.9c.8 0 1.4.4 1.4.9 0 .6-.6 1-1.4 1-.8 0-1.4-.4-1.4-1 0-.5.6-.9 1.4-.9Z" />
    <path d="M16.4 3.2c2.6-.4 4.9 1.4 5.2 4 .1.6-.4 1-.9 1.1-.5 0-.9-.4-1-.9-.2-1.5-1.5-2.6-3-2.4-.6.1-1-.3-1.1-.8 0-.5.3-.9.8-1Zm-.2 2.6c1.2-.2 2.3.6 2.5 1.8 0 .5-.3.8-.7.9-.4 0-.7-.3-.8-.7-.1-.6-.6-1-1.2-.9-.4 0-.7-.2-.7-.6 0-.3.2-.5.5-.5Z" />
  </svg>
);

export const Wechat = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={p.className}>
    <path d="M9.1 4C5.2 4 2 6.7 2 10c0 1.9 1 3.6 2.7 4.7l-.7 2.1 2.5-1.3c.8.2 1.6.4 2.6.4h.6a5.6 5.6 0 0 1-.2-1.5c0-3.1 3-5.6 6.7-5.6h.6C16 6.2 13 4 9.1 4Zm-2.4 3.3a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Zm4.8 0a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Z" />
    <path d="M22 14.4c0-2.7-2.6-4.8-5.8-4.8s-5.8 2.1-5.8 4.8 2.6 4.8 5.8 4.8c.7 0 1.3-.1 2-.3l2 1-.5-1.7c1.4-.9 2.3-2.3 2.3-3.8Zm-7.8-1.5a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Zm4 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Z" />
  </svg>
);

export const Zhihu = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={p.className}>
    <path d="M5.6 3h13.2v18h-2.5l-3.4-3.1v3.1h-2.2v-6.4H8.3c.1 2.4.7 4.3 1.7 5.7l-1.7 1.2C6.8 19.7 6 16.9 6 13.6V8.9h2.2v4.3h1.4V3Zm2.4 2v3.9h2.9V5H8Zm4.9 0v3.9h3.4V5h-3.4Zm0 5.9v3.9h1.2l2.2 2V10.9h-3.4Z" />
  </svg>
);

export const Mail = (p: P) => (
  <svg {...base} className={p.className}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
);

export const Sparkle = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={p.className}>
    <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5Z" />
  </svg>
);

export const iconMap = {
  github: Github,
  weibo: Weibo,
  wechat: Wechat,
  zhihu: Zhihu,
  mail: Mail,
  twitter: ArrowUpRight,
  rss: Sparkle,
} as const;
