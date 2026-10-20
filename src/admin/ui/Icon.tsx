"use client";

import type { SVGProps } from "react";

/** 后台自用的线性图标（24×24，stroke 继承 currentColor） */
const paths: Record<string, string> = {
  dashboard: "M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8a8 8 0 0 1 16 0",
  layers: "M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  grid: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  timeline: "M6 4v16M6 8h12M6 16h8",
  camera: "M4 8h3l1.5-2h7L17 8h3v11H4V8Zm8 3a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  type: "M5 6h14M12 6v13M9 19h6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5.5-1.5L21 21",
  palette:
    "M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.3-2.5 1.6-2.5H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Zm-4 6h.01M12 7h.01M15.5 9h.01M7.5 13h.01",
  database:
    "M12 3c4 0 7 1.3 7 3s-3 3-7 3-7-1.3-7-3 3-3 7-3Zm7 3v12c0 1.7-3 3-7 3s-7-1.3-7-3V6m14 6c0 1.7-3 3-7 3s-7-1.3-7-3",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  check: "M4 12.5 9 17.5 20 6.5",
  trash: "M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13",
  copy: "M9 9h11v11H9V9Zm-5 6V4h11",
  up: "M12 19V5m0 0-6 6m6-6 6 6",
  down: "M12 5v14m0 0 6-6m-6 6-6-6",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12H7",
  redo: "M15 14l5-5-5-5m5 5H10a6 6 0 0 0 0 12h7",
  save: "M5 4h11l3 3v13H5V4Zm3 0v6h8V4M8 20v-6h8v6",
  eye: "M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Zm10 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  warning: "M12 4l9 16H3l9-16Zm0 5v5m0 3v.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v.01M11.5 12h.5v5h.5",
  upload: "M12 16V4m0 0L7 9m5-5 5 5M4 17v3h16v-3",
  download: "M12 4v12m0 0 5-5m-5 5-5-5M4 17v3h16v-3",
  refresh: "M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5",
  git: "M12 3v18M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  link: "M10 14a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7L11 7.3M14 10a4 4 0 0 0-5.7 0L6 12.3a4 4 0 0 0 5.7 5.7L13 16.7",
  image: "M4 5h16v14H4V5Zm2 10 3.5-4 3 3.5L16 10l2 2.5M9 9.5h.01",
  external: "M14 4h6v6m0-6-8 8M18 14v6H4V6h6",
  device: "M3 5h18v11H3V5Zm6 15h6",
  monitor: "M3 5h18v11H3V5Zm6 15h6",
  tablet: "M6 3h12v18H6V3Zm5 15h2",
  phone: "M8 3h8v18H8V3Zm3 15h2",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.2-1.8l2-1.5-2-3.4-2.3 1a8 8 0 0 0-3-1.7L14 2h-4l-.5 2.6a8 8 0 0 0-3 1.7l-2.3-1-2 3.4 2 1.5a8 8 0 0 0 0 3.6l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 3 1.7L10 22h4l.5-2.6a8 8 0 0 0 3-1.7l2.3 1 2-3.4-2-1.5c.1-.6.2-1.2.2-1.8Z",
  filter: "M4 6h16M7 12h10M10 18h4",
  drag: "M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01",
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 18,
  ...rest
}: { name: string; size?: number } & SVGProps<SVGSVGElement>) {
  const d = paths[name] ?? paths.info;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

export default Icon;
