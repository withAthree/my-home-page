# my-home-page

个人门户网站（深空暗色 + 玻璃拟态 + 3D 星座背景），内容与文案全部由一个配置文件驱动，自带一套配套的**内容后台**，不写代码也能改站。

技术栈：Next.js 15（App Router，`output: "export"` 静态导出）、React 19、TypeScript、three.js。后台零新增依赖。

## 快速开始

```bash
npm install

npm run dev            # 站点开发服务器  http://127.0.0.1:4000
npm run admin          # 后台 + 站点     http://127.0.0.1:4600/admin/   ← 一条命令搞定
npm run build          # 静态导出到 out/
```

## 改内容有两条路

**一、用后台（推荐）**

```bash
npm run admin
```

打开 <http://127.0.0.1:4600/admin/>，左边选版块改表单，右边「实时预览」边改边看，`Ctrl+S` 保存即写回 `src/data/site.config.ts`（自动备份上一版、可一键回滚、可选自动 git 提交、可直接往 `public/images/` 传图）。

没装后端也能用：直接 `npm run dev` 打开 `/admin/` 会进入「离线草稿模式」，改动存在浏览器里，最后「下载 site.config.ts」覆盖仓库文件即可。

**二、直接改文件**

所有内容都在 `src/data/site.config.ts` 一个文件里（PRD 要求：组件零硬编码文案）——`profile` / `skills` / `projects` / `timeline` / `gallery` / `nav` 是数据，`copy` 是每个版块的文案，`seo` 是元信息，`theme` 是配色。

完整说明见 **[docs/ADMIN.md](docs/ADMIN.md)**，需求与验收标准见 **[docs/PRD.md](docs/PRD.md)**。

## 目录结构

```
app/
  layout.tsx           根布局：字体、主题 CSS 变量、JSON-LD
  page.tsx             首页（server component，用 ContentProvider 包裹各版块）
  admin/page.tsx       后台入口（纯客户端 SPA）
  globals.css          站点样式与主题变量
src/
  data/
    site.config.ts     ★ 站点内容（唯一数据源）
    schema.ts          字段定义 + 页面分组 + 校验器（浏览器 / Node 共用）
    codegen.ts         JSON → 带注释和类型的 site.config.ts
    validate.ts        保存前校验 + 内容体检
  admin/               后台界面（store / fields / pages / admin.css）
  components/          站点组件（文案全部来自配置）
scripts/
  studio.cjs           本地内容服务：读写配置、备份、上传、Git（Node 内置模块）
public/images/         摄影集与项目封面
```

## 内容校验

```bash
npm run content:check
```

检查必填项、格式、重复 id、导航锚点、图片是否真实存在、分类是否对得上，并验证代码生成器幂等（可以放心放进 CI）。

## 部署

`npm run build` 生成纯静态的 `out/`，可直接丢到 Vercel / 任意静态托管。

用 Docker 部署到自己的云服务器（阿里云 / 腾讯云 / VPS）已经准备好一键方案：

```bash
cp .env.example .env         # 改 WEB_PORT 等
docker compose up -d --build # 起 nginx，访问 http://服务器IP:8080
sh deploy/smoke-test.sh      # 14 项部署后自检
```

需要 HTTPS 就用 `docker-compose.tls.yml`（内置 Caddy，自动申请续期证书）。完整步骤、安全组放行、更新与回滚、故障排查见 **[DEPLOY.md](DEPLOY.md)**。

线上的 `/admin/` 页面是可用的编辑器，但没有写文件的后端，只能用离线草稿模式导出文件——这是有意的安全设计。后台服务只监听 `127.0.0.1`，不要暴露到公网，也不要打进容器。
