#!/usr/bin/env node
/**
 * ============================================================
 *  本地后台 Studio 服务（零依赖，只用 Node 内置模块）
 *  ------------------------------------------------------------
 *  作用：给 /admin 后台提供「真正写回文件」的能力。静态站点本身
 *  依然是纯静态导出，这个服务只在你自己的电脑上跑。
 *
 *  用法：
 *    node scripts/studio.cjs            # 开发模式：代理 npm run dev 的 4000 端口
 *    node scripts/studio.cjs serve      # 纯静态模式：直接服务 out/ 目录
 *    node scripts/studio.cjs check      # 校验 src/data/site.config.ts（CI 可用）
 *    node scripts/studio.cjs apply f.json  # 把导出的 JSON 写回配置文件
 *
 *  选项：
 *    --port 4600        监听端口（默认 4600，占用则自动 +1）
 *    --target 4000      开发模式下 Next dev 的端口
 *    --git              保存后自动 git 提交
 *    --no-open          不自动打开浏览器
 * ============================================================
 */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawn } = require("child_process");

/* ------------------------------ 路径常量 ------------------------------ */

const ROOT = path.resolve(__dirname, "..");
const SRC_DATA = path.join(ROOT, "src", "data");
const CONFIG_FILE = path.join(SRC_DATA, "site.config.ts");
const SCHEMA_FILE = path.join(SRC_DATA, "schema.ts");
const CODEGEN_FILE = path.join(SRC_DATA, "codegen.ts");
const VALIDATE_FILE = path.join(SRC_DATA, "validate.ts");
const PUBLIC_DIR = path.join(ROOT, "public");
const OUT_DIR = path.join(ROOT, "out");
const STORE_DIR = path.join(ROOT, ".studio");
const BACKUP_DIR = path.join(STORE_DIR, "backups");
const MAX_BACKUPS = 40;
const MAX_UPLOAD = 8 * 1024 * 1024;

/* ------------------------------ 参数解析 ------------------------------ */

const argv = process.argv.slice(2);
const COMMAND = argv.find((a) => !a.startsWith("-")) || "dev";

function flag(name) {
  return argv.includes(`--${name}`);
}

function option(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  return fallback;
}

const BASE_PORT = Number(option("port", process.env.STUDIO_PORT || 4600));
const DEV_TARGET = Number(option("target", process.env.NEXT_PORT || 4000));
const AUTO_GIT = flag("git") || process.env.STUDIO_GIT === "1";

// 站点内容当前是从哪来的：dev = 实时代理 Next dev，static = out/ 里的构建产物
let SITE_MODE = "dev";
const OPEN_BROWSER = !flag("no-open");

/* ------------------------------ 小工具 ------------------------------ */

const log = (...args) => console.log("[studio]", ...args);
const warn = (...args) => console.warn("[studio]", ...args);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stamp() {
  const d = new Date();
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(
    d.getMinutes()
  )}${p(d.getSeconds())}`;
}

/* ------------------------------ TS 加载器 ------------------------------ */
/*
 * 复用项目自带的 typescript，把 schema / codegen / validate 与
 * site.config.ts 转译成 CommonJS 后在 vm 里执行。这样浏览器与本地服务
 * 共用同一份 schema 与生成逻辑，无需额外构建步骤。
 */
let ts = null;
function loadTypeScript() {
  if (!ts) ts = require("typescript");
  return ts;
}

function resolveRelative(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, "index.ts")];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`无法解析模块：${spec}（来自 ${path.basename(fromFile)}）`);
}

function loadTsModule(filePath, cache = new Map()) {
  const abs = path.resolve(filePath);
  if (cache.has(abs)) return cache.get(abs);

  const typescript = loadTypeScript();
  const source = fs.readFileSync(abs, "utf8");
  const output = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: typescript.JsxEmit.ReactJSX,
    },
    fileName: abs,
  }).outputText;

  const module = { exports: {} };
  cache.set(abs, module.exports);

  const requireShim = (spec) => {
    if (spec.startsWith(".") || spec.startsWith("/")) {
      return loadTsModule(resolveRelative(abs, spec), cache);
    }
    return require(spec);
  };

  const sandbox = {
    module,
    exports: module.exports,
    require: requireShim,
    __filename: abs,
    __dirname: path.dirname(abs),
    console,
    process,
    JSON,
    Math,
    Date,
    Set,
    Map,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Buffer,
  };
  sandbox.globalThis = sandbox;

  const wrapper = vm.runInNewContext(
    `(function (exports, require, module, __filename, __dirname) {${output}\n})`,
    sandbox,
    { filename: abs }
  );
  wrapper(module.exports, requireShim, module, abs, path.dirname(abs));

  cache.set(abs, module.exports);
  return module.exports;
}

/** 每次调用拿到同一批转译结果（schema 只含纯数据与纯函数，可安全复用） */
function getModules() {
  const cache = new Map();
  const schema = loadTsModule(SCHEMA_FILE, cache);
  const codegen = loadTsModule(CODEGEN_FILE, cache);
  const validate = loadTsModule(VALIDATE_FILE, cache);
  return { schema, codegen, validate };
}

/* ------------------------------ 读写配置 ------------------------------ */

function readConfigSource() {
  return fs.readFileSync(CONFIG_FILE, "utf8");
}

function parseConfigText(text) {
  const cache = new Map();
  const codegen = loadTsModule(CODEGEN_FILE, cache);
  const header = codegen.extractHeader(text);
  // 用转译后的 site.config 拿对象（真实 TS，注释与类型不参与）
  const mod = loadTsModuleFromText(CONFIG_FILE, text, cache);
  return { config: mod.siteConfig, header };
}

function loadTsModuleFromText(filePath, text, cache) {
  const typescript = loadTypeScript();
  const output = typescript.transpileModule(text, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;

  const module = { exports: {} };
  const requireShim = (spec) => {
    if (spec.startsWith(".") || spec.startsWith("/")) {
      return loadTsModule(resolveRelative(filePath, spec), cache);
    }
    return require(spec);
  };
  const sandbox = {
    module,
    exports: module.exports,
    require: requireShim,
    __filename: filePath,
    __dirname: path.dirname(filePath),
    console,
    process,
    JSON,
    Math,
    Date,
    Set,
    Map,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Buffer,
  };
  sandbox.globalThis = sandbox;
  const wrapper = vm.runInNewContext(
    `(function (exports, require, module, __filename, __dirname) {${output}\n})`,
    sandbox,
    { filename: filePath }
  );
  wrapper(module.exports, requireShim, module, filePath, path.dirname(filePath));
  return module.exports;
}

function scanImages() {
  const exts = new Set([".jpg", ".jpeg", ".png", ".svg", ".webp", ".gif", ".avif"]);
  const found = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".")) continue;
        walk(full);
      } else if (exts.has(path.extname(entry.name).toLowerCase())) {
        found.push("/" + path.relative(PUBLIC_DIR, full).split(path.sep).join("/"));
      }
    }
  };
  walk(PUBLIC_DIR);
  return found.sort();
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".ts"))
    .map((name) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, size: stat.size, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function pruneBackups() {
  const all = listBackups();
  all.slice(MAX_BACKUPS).forEach((b) => {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, b.name));
    } catch {
      /* 忽略 */
    }
  });
}

function writeConfigFile(text) {
  const tmp = `${CONFIG_FILE}.tmp`;
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, CONFIG_FILE);
}

/* ------------------------------ git ------------------------------ */

function gitAvailable() {
  return fs.existsSync(path.join(ROOT, ".git"));
}

function run(cmd, args, cwd = ROOT) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, {
        cwd,
        shell: process.platform === "win32",
        windowsHide: true,
      });
    } catch (error) {
      // 某些受限环境（或未安装 git）会在 spawn 时直接抛错，不能让整个请求挂掉
      resolve({ ok: false, out: "", err: error.message });
      return;
    }
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => resolve({ ok: false, out: "", err: e.message }));
    child.on("close", (code) => resolve({ ok: code === 0, out: out.trim(), err: err.trim() }));
  });
}

async function gitStatus() {
  if (!gitAvailable()) return { repo: false, dirty: false, branch: "", detail: "", error: "" };
  try {
    const branch = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
    const status = await run("git", ["status", "--porcelain", "--", "src/data/site.config.ts"]);
    return {
      repo: true,
      dirty: status.out.length > 0,
      branch: branch.ok ? branch.out : "",
      detail: status.out,
      error: branch.ok ? "" : branch.err || "git 命令不可用",
    };
  } catch (error) {
    return { repo: true, dirty: false, branch: "", detail: "", error: error.message };
  }
}

async function gitCommit(message) {
  if (!gitAvailable()) return { ok: false, message: "当前目录不是 git 仓库" };
  const add = await run("git", ["add", "--", "src/data/site.config.ts"]);
  if (!add.ok) return { ok: false, message: add.err || "git add 失败" };
  const commit = await run("git", ["commit", "-m", message || "chore(content): 后台更新站点内容"]);
  if (!commit.ok) {
    if (/nothing to commit/i.test(commit.out + commit.err)) {
      return { ok: true, message: "没有需要提交的改动" };
    }
    return { ok: false, message: commit.err || commit.out || "git commit 失败" };
  }
  const sha = await run("git", ["rev-parse", "--short", "HEAD"]);
  return { ok: true, message: "已提交", sha: sha.ok ? sha.out : "" };
}

/* ------------------------------ 保存流程 ------------------------------ */

async function saveConfig(config) {
  const { codegen, validate } = getModules();
  const before = readConfigSource();
  const header = codegen.extractHeader(before);

  const issues = validate.validateConfig(config);
  const errors = issues.filter((i) => i.level === "error");
  if (errors.length) {
    return { status: 422, body: { ok: false, message: "内容校验未通过，未写入文件", issues } };
  }

  const next = codegen.buildConfigFile(config, header);
  if (next === before) {
    return { status: 200, body: { ok: true, changed: false, message: "内容没有变化" } };
  }

  ensureDir(BACKUP_DIR);
  const backupName = `site.config.${stamp()}.ts`;
  fs.copyFileSync(CONFIG_FILE, path.join(BACKUP_DIR, backupName));
  pruneBackups();

  writeConfigFile(next);

  let git = null;
  if (AUTO_GIT) {
    git = await gitCommit(null);
  }

  return {
    status: 200,
    body: {
      ok: true,
      changed: true,
      bytes: Buffer.byteLength(next, "utf8"),
      backup: backupName,
      git,
      gitStatus: await gitStatus(),
      message: "已写入 src/data/site.config.ts",
    },
  };
}

/* ------------------------------ HTTP 工具 ------------------------------ */

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(text),
  });
  res.end(text);
}

function sendText(res, status, text, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(text);
}

function readBody(req, limit = MAX_UPLOAD) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("请求体过大"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const buffer = await readBody(req, 32 * 1024 * 1024);
  if (!buffer.length) return {};
  return JSON.parse(buffer.toString("utf8"));
}

/** 只接受本机访问，并要求自定义请求头，避免被其它网站跨站提交 */
function isTrusted(req) {
  const host = String(req.headers.host || "");
  const hostname = host.split(":")[0];
  if (!["127.0.0.1", "localhost", "[::1]"].includes(hostname)) return false;
  if (req.method === "GET" || req.method === "HEAD") return true;
  return req.headers["x-studio-request"] === "1";
}

/* ------------------------------ 静态文件 ------------------------------ */

function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]);
  if (rel.endsWith("/")) rel += "index.html";
  const candidates = [rel];
  if (!path.extname(rel)) candidates.push(`${rel}.html`, path.join(rel, "index.html"));

  for (const candidate of candidates) {
    const full = path.join(OUT_DIR, candidate);
    if (!full.startsWith(OUT_DIR)) continue;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      const type = CONTENT_TYPES[path.extname(full).toLowerCase()] || "application/octet-stream";
      const isHtml = type.startsWith("text/html");
      res.writeHead(200, {
        "content-type": type,
        "cache-control": isHtml ? "no-store" : "public, max-age=3600",
      });
      fs.createReadStream(full).pipe(res);
      return true;
    }
  }

  const notFound = path.join(OUT_DIR, "404.html");
  if (fs.existsSync(notFound)) {
    res.writeHead(404, { "content-type": CONTENT_TYPES[".html"], "cache-control": "no-store" });
    fs.createReadStream(notFound).pipe(res);
  } else {
    sendText(res, 404, "Not Found");
  }
  return true;
}

/* ------------------------------ 反向代理 ------------------------------ */

function proxyHttp(req, res, target) {
  const options = {
    hostname: "127.0.0.1",
    port: target,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${target}` },
  };
  let answered = false;
  let warnedFallback = false;
  const upstream = http.request(options, (up) => {
    answered = true;
    SITE_MODE = "dev";
    res.writeHead(up.statusCode || 502, up.headers);
    up.pipe(res);
  });
  upstream.on("error", (e) => {
    if (answered) return;
    // 站点 dev 服务没起来时，有 out/ 就先拿静态产物顶上，后台不至于白屏
    if (fs.existsSync(OUT_DIR) && serveStatic(res, req.url)) {
      SITE_MODE = "static";
      if (!warnedFallback) {
        warnedFallback = true;
        warn(
          `站点 dev 服务未就绪（${e.code || e.message}），改用 out/ 构建产物 —— 这类页面不会跟着保存变化，改完要重新 npm run build`
        );
      }
      return;
    }
    sendText(
      res,
      502,
      `无法连接站点服务（127.0.0.1:${target}）：${e.message}\n请运行 npm run dev，或先 npm run build 再用 npm run admin:static。`
    );
  });
  req.pipe(upstream);
}

/* ------------------------------ 构建 ------------------------------ */

function runBuild() {
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  if (!fs.existsSync(nextBin)) {
    return Promise.resolve({ ok: false, code: -1, output: "找不到 next 可执行文件，请先 npm install" });
  }
  log("重新构建站点 — next build …");
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(process.execPath, [nextBin, "build"], {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      return resolve({ ok: false, code: -1, output: `无法启动 next build：${error.message}` });
    }
    let out = "";
    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      out += chunk.toString();
    });
    child.on("error", (error) => resolve({ ok: false, code: -1, output: `${out}\n${error.message}` }));
    child.on("exit", (code) => {
      if (code === 0) {
        SITE_MODE = "static";
        log("构建完成 — out/ 已更新");
      } else {
        warn(`构建失败（code ${code}）`);
      }
      resolve({ ok: code === 0, code, output: out.slice(-6000) });
    });
  });
}

/* ------------------------------ 路由 ------------------------------ */

async function handleApi(req, res, url) {  const route = url.pathname;
  const { codegen } = getModules();

  if (route === "/api/studio" && req.method === "GET") {
    const { config } = parseConfigText(readConfigSource());
    return sendJson(res, 200, {
      ok: true,
      mode: "studio",
      file: "src/data/site.config.ts",
      site: SITE_MODE,
      backups: listBackups().length,
      assets: scanImages().length,
      git: await gitStatus(),
      autoGit: AUTO_GIT,
      pages: Object.keys(config || {}),
    });
  }

  // 静态模式下让后台能自己触发一次 next build，省得切终端
  if (route === "/api/build" && req.method === "POST") {
    if (SITE_MODE === "dev") {
      return sendJson(res, 200, {
        ok: false,
        code: -1,
        output:
          "当前是开发模式：站点由 next dev 实时渲染，保存后刷新就能看到变化，不需要构建。\n" +
          "构建会覆盖正在运行的 next dev 使用的 .next 缓存，把开发服务器搞坏，所以拒绝执行。\n" +
          "确实要生成静态产物，请先停掉站点服务，再用 npm run admin:static。",
      });
    }
    return sendJson(res, 200, await runBuild());
  }

  if (route === "/api/config" && req.method === "GET") {
    const source = readConfigSource();
    const { config, header } = parseConfigText(source);
    return sendJson(res, 200, {
      ok: true,
      config,
      header,
      source,
      meta: {
        file: "src/data/site.config.ts",
        size: Buffer.byteLength(source, "utf8"),
        mtime: fs.statSync(CONFIG_FILE).mtimeMs,
      },
    });
  }

  if (route === "/api/config" && req.method === "POST") {
    const body = await readJson(req);
    if (!body || typeof body.config !== "object" || body.config === null) {
      return sendJson(res, 400, { ok: false, message: "缺少 config 字段" });
    }
    const result = await saveConfig(body.config);
    return sendJson(res, result.status, result.body);
  }

  if (route === "/api/config/preview" && req.method === "POST") {
    const body = await readJson(req);
    const { validate } = getModules();
    const header = codegen.extractHeader(readConfigSource());
    const issues = validate.validateConfig(body.config || {});
    return sendJson(res, 200, {
      ok: true,
      text: codegen.buildConfigFile(body.config || {}, header),
      issues,
    });
  }

  if (route === "/api/backups" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, backups: listBackups() });
  }

  if (route === "/api/backups/restore" && req.method === "POST") {
    const body = await readJson(req);
    const name = path.basename(String(body.name || ""));
    const file = path.join(BACKUP_DIR, name);
    if (!name.endsWith(".ts") || !fs.existsSync(file)) {
      return sendJson(res, 404, { ok: false, message: "找不到这个备份" });
    }
    ensureDir(BACKUP_DIR);
    fs.copyFileSync(CONFIG_FILE, path.join(BACKUP_DIR, `site.config.${stamp()}.ts`));
    fs.copyFileSync(file, CONFIG_FILE);
    pruneBackups();
    const { config, header } = parseConfigText(readConfigSource());
    return sendJson(res, 200, { ok: true, config, header, message: `已回滚到 ${name}` });
  }

  if (route === "/api/assets" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, images: scanImages() });
  }

  if (route === "/api/images" && req.method === "POST") {
    const rawName = String(url.searchParams.get("name") || "upload.png");
    const ext = path.extname(rawName).toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".svg", ".webp", ".gif", ".avif"];
    if (!allowed.includes(ext)) {
      return sendJson(res, 400, { ok: false, message: `不支持的图片格式：${ext || "未知"}` });
    }
    const buffer = await readBody(req);
    if (!buffer.length) return sendJson(res, 400, { ok: false, message: "文件为空" });
    const safe = (path.basename(rawName, ext).replace(/[^\w\u4e00-\u9fa5-]+/g, "-").slice(0, 60) || "image");
    ensureDir(path.join(PUBLIC_DIR, "images"));
    let target = path.join(PUBLIC_DIR, "images", `${safe}${ext}`);
    let i = 2;
    while (fs.existsSync(target)) {
      target = path.join(PUBLIC_DIR, "images", `${safe}-${i}${ext}`);
      i += 1;
    }
    fs.writeFileSync(target, buffer);
    const rel = "/" + path.relative(PUBLIC_DIR, target).split(path.sep).join("/");
    return sendJson(res, 200, { ok: true, path: rel, size: buffer.length });
  }

  if (route === "/api/git/commit" && req.method === "POST") {
    const body = await readJson(req);
    return sendJson(res, 200, await gitCommit(body.message));
  }

  if (route === "/api/git/status" && req.method === "GET") {
    return sendJson(res, 200, await gitStatus());
  }

  return sendJson(res, 404, { ok: false, message: `未知接口 ${route}` });
}

async function handle(req, res, mode) {
  const url = new URL(req.url, "http://127.0.0.1");

  if (!isTrusted(req)) {
    return sendJson(res, 403, { ok: false, message: "拒绝非本机请求" });
  }

  if (url.pathname.startsWith("/api/")) {
    try {
      return await handleApi(req, res, url);
    } catch (err) {
      warn("接口出错：", err && err.message ? err.message : err);
      return sendJson(res, 500, { ok: false, message: String(err && err.message ? err.message : err) });
    }
  }

  // 根路径直接给站点首页（终端里打印的就是这个地址）；带查询串（预览用的 /?studio=1）一样原样放行
  if (mode === "serve") {
    if (!fs.existsSync(OUT_DIR)) {
      return sendText(
        res,
        503,
        "还没有构建产物 out/。请先运行：npm run build\n然后再运行：npm run admin:static"
      );
    }
    return serveStatic(res, req.url);
  }

  return proxyHttp(req, res, DEV_TARGET);
}

/* ------------------------------ 启动服务 ------------------------------ */

function createServer(mode) {
  SITE_MODE = mode === "serve" ? "static" : "dev";
  const server = http.createServer((req, res) => {
    handle(req, res, mode).catch((err) => {
      sendText(res, 500, String(err));
    });
  });

  // Next dev 的 HMR 走 WebSocket，需要把 upgrade 也代理过去
  server.on("upgrade", (req, socket, head) => {
    if (mode !== "dev") {
      socket.destroy();
      return;
    }
    const upstream = http.request({
      hostname: "127.0.0.1",
      port: DEV_TARGET,
      path: req.url,
      headers: { ...req.headers, host: `127.0.0.1:${DEV_TARGET}` },
    });
    upstream.on("upgrade", (up, upSocket, upHead) => {
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(up.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\r\n")}\r\n\r\n`
      );
      if (upHead && upHead.length) socket.write(upHead);
      upSocket.on("data", (d) => socket.write(d));
      socket.on("data", (d) => upSocket.write(d));
      const kill = () => {
        upSocket.destroy();
        socket.destroy();
      };
      upSocket.on("close", kill);
      socket.on("close", kill);
      upSocket.on("error", kill);
      socket.on("error", kill);
    });
    upstream.on("error", () => socket.destroy());
    upstream.end();
  });

  return server;
}

function listen(server, port, onReady, attempts = 0) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && attempts < 10) {
      warn(`端口 ${port} 被占用，尝试 ${port + 1}`);
      listen(server, port + 1, onReady, attempts + 1);
    } else {
      warn("启动失败：", err.message);
      process.exit(1);
    }
  });
  server.listen(port, "127.0.0.1", () => onReady(port));
}

function openBrowser(url) {
  if (!OPEN_BROWSER) return;
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  try {
    spawn(cmd, { shell: true, detached: true, stdio: "ignore" }).unref();
  } catch {
    log("（自动打开浏览器失败，请手动访问上面的地址）");
  }
}

function banner(port, mode, devState) {
  const url = `http://127.0.0.1:${port}/admin/`;
  log("");
  log(`  后台地址   ${url}`);
  log(`  预览站首页 http://127.0.0.1:${port}/`);
  log(`  模式       ${mode === "serve" ? "静态（读取 out/ 构建产物）" : `开发（代理 Next dev :${DEV_TARGET}）`}`);
  if (mode === "dev") {
    log(
      `  站点服务   ${
        devState === "spawned"
          ? `已由本命令启动（next dev :${DEV_TARGET}）`
          : devState === "found"
            ? `已在运行（127.0.0.1:${DEV_TARGET}）`
            : devState === "missing"
              ? "未安装 Next，预览不可用"
              : "启动中 …（若一直失败会回退到 out/ 静态产物）"
      }`
    );
  }
  log(`  配置文件   src/data/site.config.ts`);
  log(`  自动提交   ${AUTO_GIT ? "开启" : "关闭（保存后可在后台点「提交到 Git」）"}`);
  log("");
  log("  Ctrl+C 停止服务");
  log("");
}

/** 探测某个端口上的 HTTP 服务是否已经起来 */
function probePort(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 1200 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

/** dev 模式下如果站点 dev 服务没起，就自己拉一个，省得开两个终端 */
async function ensureDevServer() {
  if (await probePort(DEV_TARGET)) return "found";

  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  if (!fs.existsSync(nextBin)) {
    warn("找不到 next 可执行文件（先 npm install），站点预览会不可用");
    return "missing";
  }

  log(`未检测到 ${DEV_TARGET} 端口的站点服务，正在启动 next dev …`);
  let child;
  try {
    child = spawn(process.execPath, [nextBin, "dev", "-p", String(DEV_TARGET)], {
      cwd: ROOT,
      stdio: "inherit",
      windowsHide: true,
    });
  } catch (error) {
    warn(`启动 next dev 失败：${error.message}（可手动运行 npm run dev）`);
    return "failed";
  }

  const stop = () => {
    if (!child.killed && child.exitCode === null) {
      try {
        child.kill();
      } catch {
        /* 忽略 */
      }
    }
  };
  process.on("exit", stop);
  process.on("SIGINT", () => {
    stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stop();
    process.exit(0);
  });

  return new Promise((resolve) => {
    let settled = false;
    const done = (state) => {
      if (settled) return;
      settled = true;
      resolve(state);
    };

    // 子进程一起不来（端口占用、权限不足等）就别干等了
    child.on("error", (error) => {
      warn(`next dev 无法启动：${error.message}`);
      done("failed");
    });
    child.on("exit", (code) => {
      if (!settled) {
        warn(`next dev 已退出（code ${code}），站点预览改用 out/ 静态产物`);
        done("failed");
      }
    });

    const started = Date.now();
    const tick = async () => {
      if (settled) return;
      if (await probePort(DEV_TARGET)) return done("spawned");
      if (Date.now() - started > 60000) return done("timeout");
      setTimeout(tick, 400);
    };
    tick();
  });
}

/* ------------------------------ CLI ------------------------------ */

async function cmdServe(mode) {
  const server = createServer(mode);
  listen(server, BASE_PORT, (port) => {
    banner(port, mode, mode === "dev" ? "" : undefined);
    openBrowser(`http://127.0.0.1:${port}/admin/`);

    // 站点 dev 服务放后台去起，绝不挡住后台本身可用
    if (mode === "dev") {
      ensureDevServer()
        .then((state) => {
          if (state === "spawned") log(`  ✓ 站点服务已启动：http://127.0.0.1:${DEV_TARGET}/`);
          else if (state === "found") log(`  ✓ 站点服务已在运行：http://127.0.0.1:${DEV_TARGET}/`);
          else if (state === "timeout") warn("站点服务还没起来，先手动运行 npm run dev");
          else if (state !== "missing") warn("站点服务未启动，预览会回退到 out/ 静态产物（若存在）");
        })
        .catch((error) => warn(`启动站点服务出错：${error.message}`));
    }
  });
}

function cmdCheck() {
  const { validate } = getModules();
  const { config } = parseConfigText(readConfigSource());
  const issues = validate.validateConfig(config);
  const audit = validate.auditConfig(config, { assets: scanImages() });
  const errors = issues.filter((i) => i.level === "error");
  const warnings = audit.filter((i) => i.level === "warn");

  log(`校验 src/data/site.config.ts`);
  errors.forEach((i) => log(`  ✖ ${i.path || "(根)"}  ${i.message}`));
  warnings.forEach((i) => log(`  ! ${i.path || "(根)"}  ${i.message}`));
  if (!errors.length && !warnings.length) log("  ✓ 没有发现问题");
  log(`  错误 ${errors.length} 项 / 提醒 ${warnings.length} 项`);

  // 顺手验证生成器幂等性：生成结果再生成一次必须完全一致
  const { codegen } = getModules();
  const text = codegen.buildConfigFile(config, codegen.extractHeader(readConfigSource()));
  const again = codegen.buildConfigFile(parseConfigText(text).config, codegen.extractHeader(text));
  if (text !== again) {
    log("  ✖ 代码生成器不幂等（生成两次结果不同），请检查 codegen.ts");
    process.exit(1);
  }
  log("  ✓ 代码生成器幂等");

  process.exit(errors.length ? 1 : 0);
}

async function cmdApply(jsonFile) {
  if (!jsonFile) {
    warn("用法：node scripts/studio.cjs apply <导出文件.json>");
    process.exit(1);
  }
  const abs = path.resolve(jsonFile);
  const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  const config = raw && raw.config ? raw.config : raw;
  const result = await saveConfig(config);
  log(result.body.message || "");
  if (result.body.issues) {
    result.body.issues.forEach((i) => log(`  ${i.level === "error" ? "✖" : "!"} ${i.path}  ${i.message}`));
  }
  process.exit(result.body.ok ? 0 : 1);
}

/* ------------------------------ 入口 ------------------------------ */

(async () => {
  if (COMMAND === "check") return cmdCheck();
  if (COMMAND === "apply") return cmdApply(argv[argv.indexOf("apply") + 1]);
  if (COMMAND === "serve") return cmdServe("serve");
  if (COMMAND === "dev") return cmdServe("dev");
  if (COMMAND === "help") {
    log("node scripts/studio.cjs [dev|serve|check|apply <file.json>] [--port 4600] [--target 4000] [--git] [--no-open]");
    return;
  }
  warn(`未知命令：${COMMAND}`);
  process.exit(1);
})();
