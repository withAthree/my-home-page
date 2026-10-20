# 部署手册（Docker → 云服务器）

这个仓库已经准备好容器化部署：`npm run build` 的静态产物 `out/` 会被打进一个 **nginx 镜像**里，最终镜像约 **99 MB**，运行时只读文件系统、不跑 Node 进程、几乎不吃内存。

- 站点本身：纯静态文件（`output: "export"`），nginx 直接发文件，无需 Node 运行时。
- 内容后台 `scripts/studio.cjs`：**不打进容器**。它有写文件 + git 能力，只监听 `127.0.0.1`，线上用离线草稿模式（原因见 [docs/ADMIN.md](docs/ADMIN.md) 第二节「两种工作模式」）。

> 下面所有命令都在**仓库根目录**（有 `docker-compose.yml` 的那一层）执行。

---

## 0. 一分钟看懂有哪些文件

| 文件 | 作用 |
| --- | --- |
| `Dockerfile` | 三阶段构建：装依赖 → `next build` 导出 `out/` → 塞进 `nginx:alpine` |
| `.dockerignore` | 构建上下文瘦身（排除 node_modules / .next / out / .git / docs 等） |
| `docker-compose.yml` | **方案 A**：只发布 HTTP 端口，最简单 |
| `docker-compose.tls.yml` | **方案 B**：站点 + Caddy，自动申请/续期 HTTPS 证书 |
| `deploy/nginx/default.conf` | nginx 全部配置：安全头、CSP、gzip、缓存策略、404、`/api/*` 兜底 |
| `deploy/caddy/Caddyfile` | Caddy 反向代理 + 自动证书 |
| `deploy/smoke-test.sh` | 部署后自检脚本（14 项检查，只用 curl） |
| `.env.example` | 所有可调项的模板，复制成 `.env` 再改 |

**两个 compose 文件是二选一的**，不要叠加使用（`-f a.yml -f b.yml` 会冲突）。

---

## 1. 服务器准备

最低配置：**1 vCPU / 1 GB 内存 / 10 GB 磁盘**（跑起来 nginx 常驻内存约 15 MB）。
构建镜像时内存峰值约 1 GB，1 GB 内存的机器建议先开 2 GB swap（见第 7 节）。

```bash
# 1) 装 Docker（官方脚本）
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker

# 2) 装 compose 插件（新版 Docker 自带；装完确认一下）
sudo apt install -y docker-compose-plugin
docker compose version
```

国内机器拉不到镜像时，给 daemon 配加速器（`/etc/docker/daemon.json`）：

```json
{
  "registry-mirrors": ["https://docker.m.daocloud.io"]
}
```

```bash
sudo systemctl restart docker
docker info | grep -A2 "Registry Mirrors"    # 确认生效
```

---

## 2. 方案 A：HTTP 部署（最快跑起来）

### 2.1 传代码

```bash
# 方式一：git
git clone git@github.com:withAthree/my-home-page.git
cd my-home-page

# 方式二：本地目录直接传（Windows 上执行）
#   scp -r "D:\Projects\Software Project\my-home-page" user@服务器IP:~/my-home-page
```

参与构建的只有这些：`Dockerfile`、`.dockerignore`、`docker-compose*.yml`、`deploy/`、`package.json`、`package-lock.json`、`next.config.mjs`、`tsconfig.json`、`app/`、`src/`、`public/`、`scripts/`。

### 2.2 配置

```bash
cp .env.example .env
vim .env          # 至少改 WEB_PORT，别跟机器上已有服务撞端口
```

`.env` 逐项说明：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `WEB_PORT` | `8080` | 宿主机端口。站点最终地址是 `http://服务器IP:8080` |
| `IMAGE_TAG` | `latest` | 建议部署时改成日期/版本号（如 `20260101`），方便回滚 |
| `CONTAINER_NAME` | `my-home-page` | 容器名 |
| `NPM_REGISTRY` | `https://registry.npmjs.org` | 构建时装 npm 包的源；国内建议改 `https://registry.npmmirror.com` |
| `RUN_CONTENT_CHECK` | `0` | 设 `1` 会在构建时跑 `npm run content:check`，内容有问题就让构建失败（推荐开） |
| `TZ` | `Asia/Shanghai` | 日志时间 |

### 2.3 构建并启动

```bash
docker compose up -d --build     # 首次会拉基础镜像 + 装依赖，约 2~5 分钟（看服务器带宽）
docker compose ps                # STATUS 显示 (healthy) 就成功了
```

访问 `http://服务器IP:8080`。

### 2.4 放行端口

云厂商安全组 + 系统防火墙两层都要开：

```bash
# Ubuntu / Debian（开了 ufw）
sudo ufw allow 8080/tcp
# CentOS / Alma / Rocky（firewalld 在跑）
sudo firewall-cmd --add-port=8080/tcp --permanent && sudo firewall-cmd --reload
```

---

## 3. 方案 B：HTTPS 部署（有域名时推荐）

**前提三条，缺一条证书就签不下来：**

1. 域名 A/AAAA 记录已经指向这台服务器（`ping 你的域名` 出的是服务器 IP）；
2. 安全组 + 防火墙放行 **80 和 443**（80 是 Let's Encrypt 回验用的）；
3. `.env` 里填好 `SITE_DOMAIN`（本方案不发布 `WEB_PORT`，端口由 Caddy 接管）。

```bash
cp .env.example .env
vim .env                     # 设置 SITE_DOMAIN=xuqingchu.dev

docker compose -f docker-compose.tls.yml up -d --build
docker compose -f docker-compose.tls.yml logs -f caddy   # 看到 certificate obtained 就好了
```

Caddy 会自动申请并续期证书，证书存在 `caddy_data` 卷里，重启 / 重新部署都不会重复申请。

> **别随便 `docker volume rm` 这个卷**：Let's Encrypt 对同一域名有每周签发上限，反复重建会触发限流，得等一周。
>
> 想收证书到期提醒邮件：打开 `deploy/caddy/Caddyfile`，把注释掉的 `email you@example.com` 取消注释改成你的邮箱。**必须填真实邮箱**——写空值 Caddy 会直接启动失败（`wrong argument count ... after 'email'`）。

想用**自己的证书**（不经过 Caddy）：`deploy/nginx/default.conf` 文件末尾有一段注释模板，照着把 server 块改成 443 + ssl、再补一个 80 跳转块即可，证书目录挂进容器就行。

---

## 4. 部署后自检（强烈建议每次都跑）

```bash
sh deploy/smoke-test.sh http://127.0.0.1:8080      # 方案 A
sh deploy/smoke-test.sh https://xuqingchu.dev      # 方案 B
```

它检查 14 项：首页 / 后台 / 404 的状态码、`/_next/static` 一年缓存、HTML 不缓存、图片 30 天缓存、CSP 等安全头、gzip、`/api/*` 返回 404、`/healthz`。全过打印 `全部通过 ✓` 并退出码 0，可以直接放进部署钩子。

---

## 5. 改内容后怎么更新

内容在 `src/data/site.config.ts`，改完（本地后台改、或直接改文件）必须**重新构建镜像**才生效——静态站点没有运行时读文件这回事：

```bash
git pull                       # 或者在本地改好再上传
docker compose up -d --build   # 重新构建并替换容器
```

有构建缓存，一般几十秒。切换的那一两秒站点不可用，个人站无所谓；要零中断就在前面挂一层 nginx/Caddy 反代，用两台容器蓝绿切换。

回滚到上一版镜像：

```bash
docker compose down
IMAGE_TAG=20251231 docker compose up -d     # 用之前那个标签重启
```

---

## 6. 日常运维

```bash
docker compose ps                              # 状态（含 healthy）
docker compose logs -f web                     # 跟 nginx 日志
docker compose exec web nginx -t               # 验证配置语法
docker inspect --format '{{.State.Health.Status}}' my-home-page
docker stats --no-stream                       # 内存 / CPU 占用

docker compose down                            # 停止并删容器（镜像、.env 保留）
docker compose down --rmi local                # 连镜像一起删
```

日志已经限制成 `10m × 3 个文件`，不会把磁盘写满。

---

## 7. 常见问题排查

| 现象 | 原因 / 解法 |
| --- | --- |
| `docker compose up` 报端口被占用 | `ss -lntp \| grep 8080` 看谁占着，改 `.env` 的 `WEB_PORT` |
| 页面能开但样式全丢 | 前面有反代 / CDN 把 `/_next/static/*` 拦走了，检查路由规则和缓存 |
| 浏览器控制台报 CSP 违规 | `default.conf` 的 CSP 已放行 Google Fonts（`layout.tsx` 用的）；如果新加了第三方资源（统计、视频、地图），要把它加到 `script-src` / `img-src` / `connect-src` |
| `/admin/` 显示「离线草稿模式」 | **正常**。线上没有写文件的后端。改完点「下载 site.config.ts」，覆盖仓库文件后重新部署 |
| 访问 `/api/*` 返回 404 JSON | **正常**，nginx 故意这么配，前端靠它切到离线模式 |
| 构建在服务器上被 OOM kill | 给机器加 swap：`fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`，或在本地 / CI 构建好镜像再传（第 9 节） |
| 健康检查一直 `unhealthy` | `docker compose exec web wget -q -O- http://127.0.0.1/healthz`，再 `docker compose logs web` 看 nginx 报错 |
| 证书签发失败 | 域名没解析到本机 / 80 端口没放行 / 刚把 `caddy_data` 卷删了触发限流 |
| 改了 `default.conf` 不生效 | 配置是 `COPY` 进镜像的，要 `--build` 重建；或者临时在 compose 里把它挂载进去热改 |

---

## 8. 安全设计说明（为什么这么做）

- **容器只读**：`read_only: true` + 三个 tmpfs，nginx 就算被打穿也改不了文件系统。
- **没有 Node 运行时**：最终镜像只有 nginx + 静态文件，没有 `node`、没有源码，攻击面极小。
- **内容后台不进容器**：`scripts/studio.cjs` 能写文件、能执行 git，只监听 `127.0.0.1`。线上只用离线草稿模式——宁可麻烦一点，也不能把写权限放到公网。
- **CSP 收紧**：默认 `default-src 'self'`，只放行站点真正需要的 Google Fonts 与 `data:` / `blob:` 资源。
- **不泄漏信息**：`server_tokens off` 隐藏版本号，`location ~ /\.` 拦掉隐藏文件，404 走自定义页面。

---

## 9. 可选：本地 / CI 构建好镜像再上传

服务器没网、或内存太小不适合构建时用：

```bash
# 本地（Windows / macOS 都行；ARM 机器要加 --platform linux/amd64）
docker build --platform linux/amd64 -t my-home-page:20260101 .
docker save my-home-page:20260101 | gzip > my-home-page-20260101.tar.gz
scp my-home-page-20260101.tar.gz user@服务器IP:~/

# 服务器上
gunzip -c my-home-page-20260101.tar.gz | docker load
cd my-home-page && IMAGE_TAG=20260101 docker compose up -d    # 这次不要 --build
```

仓库里还有一个 GitHub Actions 工作流 `.github/workflows/docker-image.yml`：打 `v*` 标签（或手动触发）会自动构建 **amd64 + arm64** 双架构镜像推到 `ghcr.io`，服务器上直接 `docker pull` 就行（私有仓库要先 `docker login ghcr.io`）。

---

## 10. 本地调试（Windows / macOS 一样）

```bash
cp .env.example .env      # 把 WEB_PORT 改成 18090 之类没被占用的端口
docker compose up -d --build
# 浏览器打开 http://127.0.0.1:18090
sh deploy/smoke-test.sh http://127.0.0.1:18090
docker compose down
```

Windows 上没有 bash 的话，可以直接看这几个地址：`/`、`/admin/`、`/healthz`、`/api/studio`（应返回 404 JSON）。
