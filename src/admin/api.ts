/**
 * 本地 Studio 服务的接口封装。
 * 所有请求都带 x-studio-request 头：跨站页面无法伪造，服务端据此拒绝外部提交。
 */

export interface StudioInfo {
  ok: boolean;
  mode: string;
  file?: string;
  /** dev = 实时读 Next dev 渲染结果；static = 读 out/ 构建产物（保存后需要重新 build） */
  site?: "dev" | "static";
  backups?: number;
  assets?: number;
  autoGit?: boolean;
  git?: GitStatus;
}

export interface GitStatus {
  repo: boolean;
  dirty: boolean;
  branch: string;
  detail: string;
}

export interface BackupEntry {
  name: string;
  size: number;
  mtime: number;
}

export interface Issue {
  level: "error" | "warn";
  path: string;
  message: string;
  pageId?: string;
  index?: number;
}

export class ApiError extends Error {
  status: number;
  issues: Issue[];
  constructor(status: number, message: string, issues: Issue[] = []) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

/** 本地服务不可用（未启动 / 静态部署环境） */
export class ApiUnavailable extends Error {}

const JSON_HEADERS = {
  "content-type": "application/json",
  "x-studio-request": "1",
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { ...JSON_HEADERS, ...(init.headers ?? {}) },
      cache: "no-store",
    });
  } catch (error) {
    throw new ApiUnavailable(error instanceof Error ? error.message : "网络请求失败");
  }

  if (response.status === 404 || response.status === 501 || response.status === 502) {
    throw new ApiUnavailable("本地服务未运行");
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    throw new ApiUnavailable("接口返回的不是 JSON，可能被静态托管接管了");
  }

  if (!response.ok) {
    const body = (data ?? {}) as { message?: string; issues?: Issue[] };
    throw new ApiError(response.status, body.message ?? `请求失败（${response.status}）`, body.issues ?? []);
  }

  return data as T;
}

export const studioApi = {
  info: () => request<StudioInfo>("/api/studio"),

  loadConfig: () =>
    request<{ ok: boolean; config: Record<string, unknown>; header: string; source: string }>(
      "/api/config"
    ),

  saveConfig: (config: unknown) =>
    request<{
      ok: boolean;
      changed: boolean;
      message: string;
      backup?: string;
      bytes?: number;
      git?: { ok: boolean; message: string; sha?: string } | null;
      gitStatus?: GitStatus;
      issues?: Issue[];
    }>("/api/config", { method: "POST", body: JSON.stringify({ config }) }),

  backups: () => request<{ ok: boolean; backups: BackupEntry[] }>("/api/backups"),

  restore: (name: string) =>
    request<{ ok: boolean; config: Record<string, unknown>; header: string; message: string }>(
      "/api/backups/restore",
      { method: "POST", body: JSON.stringify({ name }) }
    ),

  assets: () => request<{ ok: boolean; images: string[] }>("/api/assets"),

  upload: (file: File) =>
    request<{ ok: boolean; path: string; size: number }>(
      `/api/images?name=${encodeURIComponent(file.name)}`,
      {
        method: "POST",
        headers: { "content-type": file.type || "application/octet-stream", "x-studio-request": "1" },
        body: file,
      }
    ),

  gitStatus: () => request<GitStatus>("/api/git/status"),

  build: () => request<{ ok: boolean; code: number; output: string }>("/api/build", { method: "POST" }),

  gitCommit: (message: string) =>
    request<{ ok: boolean; message: string; sha?: string }>("/api/git/commit", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};
