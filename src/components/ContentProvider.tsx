"use client";

import { createContext, useContext, useEffect, useState } from "react";
import baseConfig, { type SiteConfig } from "@/data/site.config";

/**
 * 内容上下文
 * ------------------------------------------------------------
 * 默认永远等于 site.config.ts（构建时静态注入，服务端渲染直出）。
 * 只有在 URL 带 ?studio=1 时，才允许后台管理界面把「草稿」推送到
 * 预览 iframe 里，实现所见即所得的实时预览；正式访问不受任何影响。
 */

const ContentContext = createContext<SiteConfig>(baseConfig);

/** 预览草稿在 localStorage 中的键（后台与预览页同源共享） */
export const PREVIEW_STORAGE_KEY = "studio:preview";

/** 取到当前内容；组件内使用，不要用模块级解构 */
export function useSiteContent(): SiteConfig {
  return useContext(ContentContext);
}

function readPreviewConfig(raw: string | null): SiteConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { config?: SiteConfig };
    return parsed && parsed.config ? parsed.config : null;
  } catch {
    return null;
  }
}

/** 把主题色写进 :root，预览时改色可即时生效 */
function applyTheme(theme: SiteConfig["theme"]) {
  const root = document.documentElement;
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--ink", theme.ink);
  root.style.setProperty("--cyan", theme.cyan);
  root.style.setProperty("--magenta", theme.magenta);
  root.style.setProperty("--violet", theme.violet);
  root.style.setProperty("--amber", theme.amber);
}

export default function ContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteConfig>(baseConfig);

  // 仅预览模式：跟随后台草稿
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("studio")) return;

    const adopt = (next: SiteConfig | null) => {
      if (next) setContent(next);
    };

    adopt(readPreviewConfig(window.localStorage.getItem(PREVIEW_STORAGE_KEY)));

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; config?: SiteConfig } | null;
      if (!data || data.type !== "studio:preview" || !data.config) return;
      adopt(data.config);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== PREVIEW_STORAGE_KEY) return;
      adopt(readPreviewConfig(event.newValue));
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // 预览模式下主题色为草稿值
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("studio")) return;
    applyTheme(content.theme);
  }, [content.theme]);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}
