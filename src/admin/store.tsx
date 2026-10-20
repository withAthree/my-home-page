"use client";

/**
 * 后台状态仓库：草稿、撤销重做、校验、保存、预览同步。
 * 只用一个 Context，避免多层 Provider 把逻辑切得太碎。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import defaultConfig from "@/data/site.config";
import { PAGE_MAP, makeUniqueId } from "@/data/schema";
import { buildConfigFile, isEqual } from "@/data/codegen";
import { auditConfig, validateConfig, type Issue } from "@/data/validate";
import {
  ApiError,
  ApiUnavailable,
  studioApi,
  type BackupEntry,
  type GitStatus,
  type StudioInfo,
} from "./api";

export type StudioMode = "loading" | "studio" | "local";
export type PreviewDevice = "desktop" | "tablet" | "phone";

export const LOCAL_DRAFT_KEY = "studio:draft:local";
const PREVIEW_KEY = "studio:preview";

type Config = Record<string, unknown>;

/* ------------------------------ 路径与不可变更新 ------------------------------ */

function splitPath(path: string): (string | number)[] {
  if (!path) return [];
  return path
    .split(".")
    .filter(Boolean)
    .map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg));
}

export function getAt(root: unknown, path: string): unknown {
  return splitPath(path).reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string | number, unknown>)[key];
  }, root);
}

function setAt(root: unknown, path: (string | number)[], value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const base = Array.isArray(root) ? [...root] : { ...((root as Config) ?? {}) };
  (base as Record<string | number, unknown>)[head] = setAt(
    (root as Record<string | number, unknown> | undefined)?.[head],
    rest,
    value
  );
  return base;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 用默认配置补齐缺失字段（对象逐键合并，数组整体替换） */
function mergeDefaults(base: unknown, incoming: unknown): unknown {
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
  if (base && typeof base === "object") {
    const b = base as Config;
    const s = (incoming && typeof incoming === "object" ? incoming : {}) as Config;
    const out: Config = {};
    Object.keys(b).forEach((key) => {
      out[key] = mergeDefaults(b[key], s[key]);
    });
    Object.keys(s).forEach((key) => {
      if (!(key in out)) out[key] = s[key];
    });
    return out;
  }
  return incoming === undefined ? base : incoming;
}

/* ------------------------------ Context 类型 ------------------------------ */

export interface ToastState {
  kind: "ok" | "error" | "info";
  text: string;
}

interface StudioContextValue {
  mode: StudioMode;
  info: StudioInfo | null;
  loading: boolean;
  saving: boolean;
  building: boolean;
  config: Config;
  base: Config;
  source: string;
  header: string;
  dirty: boolean;
  assets: string[];
  backups: BackupEntry[];
  git: GitStatus | null;
  errors: Issue[];
  warnings: Issue[];
  issuesByPage: Record<string, Issue[]>;
  activePage: string;
  setActivePage: (id: string) => void;
  toast: ToastState | null;
  notify: (kind: ToastState["kind"], text: string) => void;
  update: (path: string, value: unknown, historyKey?: string) => void;
  addItem: (path: string, template: () => Config) => void;
  removeItem: (path: string, index: number) => void;
  moveItem: (path: string, index: number, direction: -1 | 1) => void;
  duplicateItem: (path: string, index: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetAll: () => void;
  save: () => Promise<void>;
  reload: () => Promise<void>;
  restoreBackup: (name: string) => Promise<void>;
  refreshBackups: () => Promise<void>;
  commitGit: (message: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string | null>;
  buildSite: () => Promise<{ ok: boolean; code: number; output: string }>;
  exportFile: () => void;
  exportJson: () => void;
  discardLocalDraft: () => void;
  generatedText: string;
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  previewDevice: PreviewDevice;
  setPreviewDevice: (device: PreviewDevice) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

/* ------------------------------ Provider ------------------------------ */

export function StudioProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<StudioMode>("loading");
  const [info, setInfo] = useState<StudioInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [config, setConfig] = useState<Config>(() => clone(defaultConfig) as unknown as Config);
  const [base, setBase] = useState<Config>(() => clone(defaultConfig) as unknown as Config);
  const [source, setSource] = useState("");
  const [header, setHeader] = useState("");
  const [assets, setAssets] = useState<string[]>([]);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [git, setGit] = useState<GitStatus | null>(null);
  const [past, setPast] = useState<Config[]>([]);
  const [future, setFuture] = useState<Config[]>([]);
  const [activePage, setActivePageState] = useState("overview");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");

  const configRef = useRef(config);
  const coalesceRef = useRef<{ key?: string; at: number }>({ at: 0 });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const notify = useCallback((kind: ToastState["kind"], text: string) => {
    setToast({ kind, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), kind === "error" ? 6000 : 3200);
  }, []);

  /* ---------------- 页面导航（同步到 URL，刷新后停在同一页） ---------------- */

  const setActivePage = useCallback((id: string) => {
    const next = PAGE_MAP[id] ? id : "overview";
    setActivePageState(next);
    if (typeof window !== "undefined") {
      const hash = `#${next}`;
      if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
      document.querySelector(".body")?.scrollTo({ top: 0 });
    }
  }, []);

  useEffect(() => {
    const readHash = () => {
      const id = window.location.hash.replace(/^#/, "");
      setActivePageState(PAGE_MAP[id] ? id : "overview");
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  /* ---------------- 历史 ---------------- */

  const record = useCallback((snapshot: Config, key?: string) => {
    const now = Date.now();
    const last = coalesceRef.current;
    if (key && last.key === key && now - last.at < 900) {
      last.at = now;
      return;
    }
    coalesceRef.current = { key, at: now };
    setPast((prev) => [...prev.slice(-59), snapshot]);
    setFuture([]);
  }, []);

  const commit = useCallback(
    (recipe: (prev: Config) => Config, historyKey?: string) => {
      const prev = configRef.current;
      const next = recipe(prev);
      if (next === prev || isEqual(prev, next)) return;
      record(prev, historyKey);
      configRef.current = next;
      setConfig(next);
    },
    [record]
  );

  const update = useCallback(
    (path: string, value: unknown, historyKey?: string) => {
      commit((prev) => setAt(prev, splitPath(path), value) as Config, historyKey ?? path);
    },
    [commit]
  );

  const uniqueIdFor = useCallback((arrayPath: string, prefix: string) => {
    const list = getAt(configRef.current, arrayPath);
    const taken = new Set(
      (Array.isArray(list) ? list : [])
        .map((item) => (item as Config)?.id)
        .filter((v): v is string => typeof v === "string")
    );
    return makeUniqueId(prefix, taken);
  }, []);

  const addItem = useCallback(
    (path: string, template: () => Config) => {
      const list = getAt(configRef.current, path);
      const items = Array.isArray(list) ? list : [];
      const draft = template() as Config;
      // 自动补齐唯一 id
      if (typeof draft.id === "string") {
        const prefix =
          draft.id ||
          (path.includes("gallery") ? "photo" : path.includes("projects") ? "project" : "item");
        draft.id = uniqueIdFor(path, prefix);
      }
      commit((prev) => setAt(prev, [...splitPath(path)], [...items, draft]) as Config);
    },
    [commit, uniqueIdFor]
  );

  const removeItem = useCallback(
    (path: string, index: number) => {
      commit((prev) => {
        const list = getAt(prev, path);
        if (!Array.isArray(list)) return prev;
        return setAt(
          prev,
          splitPath(path),
          list.filter((_, i) => i !== index)
        ) as Config;
      }, `${path}:remove`);
    },
    [commit]
  );

  const moveItem = useCallback(
    (path: string, index: number, direction: -1 | 1) => {
      commit((prev) => {
        const list = getAt(prev, path);
        if (!Array.isArray(list)) return prev;
        const next = [...list];
        const target = index + direction;
        if (target < 0 || target >= next.length) return prev;
        [next[index], next[target]] = [next[target], next[index]];
        return setAt(prev, splitPath(path), next) as Config;
      }, `${path}:move`);
    },
    [commit]
  );

  const duplicateItem = useCallback(
    (path: string, index: number) => {
      const list = getAt(configRef.current, path);
      if (!Array.isArray(list) || !list[index]) return;
      const copy = clone(list[index]) as Config;
      if (typeof copy.id === "string") {
        const prefix = copy.id.replace(/-\d+$/, "") || "item";
        copy.id = uniqueIdFor(path, prefix);
      }
      commit((prev) => {
        const current = getAt(prev, path);
        const items = Array.isArray(current) ? [...current] : [];
        items.splice(index + 1, 0, copy);
        return setAt(prev, splitPath(path), items) as Config;
      });
    },
    [commit, uniqueIdFor]
  );

  const undo = useCallback(() => {
    setPast((prev) => {
      if (!prev.length) return prev;
      const previous = prev[prev.length - 1];
      setFuture((f) => [configRef.current, ...f].slice(0, 60));
      configRef.current = previous;
      setConfig(previous);
      coalesceRef.current = { at: 0 };
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (!prev.length) return prev;
      const next = prev[0];
      setPast((p) => [...p, configRef.current].slice(-60));
      configRef.current = next;
      setConfig(next);
      coalesceRef.current = { at: 0 };
      return prev.slice(1);
    });
  }, []);

  /* ---------------- 加载 ---------------- */

  const applyLoaded = useCallback((rawConfig: Config, rawHeader: string, rawSource: string) => {
    const merged = mergeDefaults(clone(defaultConfig), rawConfig) as Config;
    configRef.current = merged;
    setConfig(merged);
    setBase(merged);
    setHeader(rawHeader);
    setSource(rawSource);
    setPast([]);
    setFuture([]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const studioInfo = await studioApi.info();
      setMode("studio");
      setInfo(studioInfo);
      setGit(studioInfo.git ?? null);
      const [loaded, images, history] = await Promise.all([
        studioApi.loadConfig(),
        studioApi.assets().catch(() => ({ ok: false, images: [] as string[] })),
        studioApi.backups().catch(() => ({ ok: false, backups: [] as BackupEntry[] })),
      ]);
      applyLoaded(loaded.config as Config, loaded.header, loaded.source);
      setAssets(images.images ?? []);
      setBackups(history.backups ?? []);
    } catch (error) {
      if (!(error instanceof ApiUnavailable)) {
        notify("error", error instanceof Error ? error.message : "读取配置失败");
      }
      setMode("local");
      setInfo(null);
      setAssets([]);
      setBackups([]);
      setGit(null);
      // 本地模式：尝试恢复上次的浏览器草稿
      let restored: Config | null = null;
      try {
        const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
        if (raw) restored = JSON.parse(raw) as Config;
      } catch {
        restored = null;
      }
      const merged = mergeDefaults(clone(defaultConfig), restored ?? {}) as Config;
      configRef.current = merged;
      setConfig(merged);
      setBase(restored ? merged : (clone(defaultConfig) as unknown as Config));
      setSource("");
      setHeader("");
      setPast([]);
      setFuture([]);
      if (restored) notify("info", "已载入上次保存在浏览器里的草稿");
    } finally {
      setLoading(false);
    }
  }, [applyLoaded, notify]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = useCallback(async () => {
    await load();
    notify("ok", "已从磁盘重新载入");
  }, [load, notify]);

  /* ---------------- 派生数据 ---------------- */

  const dirty = useMemo(() => !isEqual(config, base), [config, base]);

  const errors = useMemo(() => {
    try {
      return validateConfig(config);
    } catch {
      return [] as Issue[];
    }
  }, [config]);

  const warnings = useMemo(() => {
    try {
      const audit = auditConfig(config, { assets });
      return audit.filter((i) => i.level === "warn");
    } catch {
      return [] as Issue[];
    }
  }, [config, assets]);

  const issuesByPage = useMemo(() => {
    const map: Record<string, Issue[]> = {};
    [...errors, ...warnings].forEach((issue) => {
      const pageId = issue.pageId ?? "overview";
      (map[pageId] ??= []).push(issue);
    });
    return map;
  }, [errors, warnings]);

  const generatedText = useMemo(() => {
    try {
      return buildConfigFile(config, header);
    } catch {
      return "";
    }
  }, [config, header]);

  /* ---------------- 保存 / 导出 ---------------- */

  const save = useCallback(async () => {
    if (mode === "studio") {
      setSaving(true);
      try {
        const result = await studioApi.saveConfig(configRef.current);
        setBase(configRef.current);
        notify("ok", result.message || "已保存");
        if (result.git && !result.git.ok) notify("error", `Git：${result.git.message}`);
        if (result.gitStatus) setGit(result.gitStatus);
        const history = await studioApi.backups().catch(() => null);
        if (history) setBackups(history.backups);
      } catch (error) {
        if (error instanceof ApiError) {
          notify("error", error.message);
          const first = error.issues.find((i) => i.level === "error");
          if (first?.pageId) setActivePage(first.pageId);
        } else {
          notify("error", error instanceof Error ? error.message : "保存失败");
        }
      } finally {
        setSaving(false);
      }
      return;
    }

    // 本地模式：存进浏览器
    try {
      window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(configRef.current));
      setBase(configRef.current);
      notify("ok", "已保存到浏览器草稿（未写入文件，可在「数据与发布」导出）");
    } catch {
      notify("error", "浏览器存储已满，导出文件更稳妥");
    }
  }, [mode, notify, setActivePage]);

  const restoreBackup = useCallback(
    async (name: string) => {
      try {
        const result = await studioApi.restore(name);
        applyLoaded(result.config as Config, result.header, "");
        const loaded = await studioApi.loadConfig().catch(() => null);
        if (loaded) {
          setSource(loaded.source);
          configRef.current = mergeDefaults(clone(defaultConfig), loaded.config) as Config;
          setConfig(configRef.current);
          setBase(configRef.current);
        }
        const history = await studioApi.backups().catch(() => null);
        if (history) setBackups(history.backups);
        notify("ok", result.message || "已回滚");
      } catch (error) {
        notify("error", error instanceof Error ? error.message : "回滚失败");
      }
    },
    [applyLoaded, notify]
  );

  const refreshBackups = useCallback(async () => {
    try {
      const history = await studioApi.backups();
      setBackups(history.backups);
    } catch {
      notify("error", "读取备份失败");
    }
  }, [notify]);

  const commitGit = useCallback(
    async (message: string) => {
      try {
        const result = await studioApi.gitCommit(message);
        notify(result.ok ? "ok" : "error", result.sha ? `${result.message}（${result.sha}）` : result.message);
        setGit(await studioApi.gitStatus());
      } catch (error) {
        notify("error", error instanceof Error ? error.message : "提交失败");
      }
    },
    [notify]
  );

  const buildSite = useCallback(async () => {
    setBuilding(true);
    try {
      const result = await studioApi.build();
      if (result.ok) {
        notify("ok", "构建完成，out/ 已更新");
        setInfo(await studioApi.info());
      } else {
        notify("error", `构建失败：${result.output.trim().split("\n").slice(-2).join(" ")}`);
      }
      return result;
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "构建失败");
      return { ok: false, code: -1, output: "" };
    } finally {
      setBuilding(false);
    }
  }, [notify]);

  const uploadImage = useCallback(    async (file: File) => {
      try {
        const result = await studioApi.upload(file);
        setAssets((prev) => Array.from(new Set([...prev, result.path])).sort());
        notify("ok", `已上传到 ${result.path}`);
        return result.path;
      } catch (error) {
        notify("error", error instanceof Error ? error.message : "上传失败");
        return null;
      }
    },
    [notify]
  );

  const download = useCallback((filename: string, text: string, type: string) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const exportFile = useCallback(() => {
    download("site.config.ts", generatedText || buildConfigFile(configRef.current), "text/plain");
  }, [download, generatedText]);

  const exportJson = useCallback(() => {
    download("site-content.json", JSON.stringify(configRef.current, null, 2), "application/json");
  }, [download]);

  const resetAll = useCallback(() => {
    commit(() => clone(defaultConfig) as unknown as Config, "reset");
  }, [commit]);

  const discardLocalDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(LOCAL_DRAFT_KEY);
      window.localStorage.removeItem(PREVIEW_KEY);
    } catch {
      /* 忽略 */
    }
    applyLoaded(clone(defaultConfig) as unknown as Config, "", "");
    notify("ok", "已清空本地草稿，恢复为仓库里的内容");
  }, [applyLoaded, notify]);

  /* ---------------- 预览同步 ---------------- */

  useEffect(() => {
    if (mode === "loading") return;
    try {
      window.localStorage.setItem(PREVIEW_KEY, JSON.stringify(config));
    } catch {
      /* 忽略容量问题 */
    }
    if (!previewOpen) return;
    const timer = setTimeout(() => {
      document.querySelectorAll<HTMLIFrameElement>("iframe[data-studio-preview]").forEach((frame) => {
        frame.contentWindow?.postMessage({ type: "studio:preview", config }, "*");
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [config, mode, previewOpen]);

  /* ---------------- 快捷键 ---------------- */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.ctrlKey || event.metaKey;
      if (!meta) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      } else if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, save, undo]);

  const value: StudioContextValue = {
    mode,
    info,
    loading,
    saving,
    building,
    config,
    base,
    source,
    header,
    dirty,
    assets,
    backups,
    git,
    errors,
    warnings,
    issuesByPage,
    activePage,
    setActivePage,
    toast,
    notify,
    update,
    addItem,
    removeItem,
    moveItem,
    duplicateItem,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    resetAll,
    save,
    reload,
    restoreBackup,
    refreshBackups,
    commitGit,
    uploadImage,
    buildSite,
    exportFile,
    exportJson,
    discardLocalDraft,
    generatedText,
    previewOpen,
    setPreviewOpen,
    previewDevice,
    setPreviewDevice,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio 必须在 StudioProvider 内使用");
  return ctx;
}

/** 当前页面的字段错误，便于在字段下方提示 */
export function useFieldError(path: string): Issue | undefined {
  const { errors } = useStudio();
  return useMemo(() => errors.find((issue) => issue.path === path), [errors, path]);
}


