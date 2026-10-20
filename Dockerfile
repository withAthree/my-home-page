# ============================================================================
#  my-home-page —— 生产镜像
# ----------------------------------------------------------------------------
#  站点是 Next.js 的纯静态导出（next.config.mjs 里 output: "export"），
#  所以最终镜像里不需要 Node.js 运行时，只需要一个安静的 nginx 托管 out/。
#
#  三阶段：
#    deps    → 只装依赖（package*.json 不变就不会重新装）
#    builder → 跑 next build，产出 out/
#    runner  → nginx + out/，镜像约 99MB（其中基础镜像 nginx:alpine 占 93MB）
#
#  可调参数（docker compose build --build-arg XXX=... 或 compose 的 args）：
#    NODE_IMAGE   构建用 Node 镜像，默认 node:22-alpine
#    NGINX_IMAGE  运行用 nginx 镜像，默认 nginx:1.29-alpine
#    NPM_REGISTRY npm 源，国内服务器建议 https://registry.npmmirror.com
#    RUN_CONTENT_CHECK  设为 1 时构建前跑 npm run content:check（内容校验）
# ============================================================================

ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginx:1.29-alpine


# ------------------------------- 1. 依赖层 -------------------------------
FROM ${NODE_IMAGE} AS deps

WORKDIR /app

# 构建期不需要 Next 的匿名遥测，关掉可以避免构建机连外网时卡住
ENV NEXT_TELEMETRY_DISABLED=1

ARG NPM_REGISTRY=https://registry.npmjs.org

# 只拷清单文件：源码改动不会让这一层缓存失效
COPY package.json package-lock.json ./

RUN npm config set registry "${NPM_REGISTRY}" \
 && npm config set fund false \
 && npm config set audit false \
 && npm ci --no-audit --no-fund


# ------------------------------- 2. 构建层 -------------------------------
FROM ${NODE_IMAGE} AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG RUN_CONTENT_CHECK=0
RUN if [ "${RUN_CONTENT_CHECK}" = "1" ]; then npm run content:check; fi

# 注意：不要给这一步设置 NEXT_DIST_DIR —— 只有默认的 .next 才会把
# 静态导出结果稳定地写到 out/，自定义 distDir 时产物会落在 distDir 里面。
RUN npm run build

# 兜底：产物没生成就直接让构建失败，避免推上去一个空站点
RUN test -f out/index.html \
 || (echo "✗ 构建失败：没有生成 out/index.html，请检查上面的 next build 输出" && exit 1)


# ------------------------------- 3. 运行层 -------------------------------
FROM ${NGINX_IMAGE} AS runner

LABEL org.opencontainers.image.title="my-home-page" \
      org.opencontainers.image.description="个人门户站点（Next.js 静态导出 + nginx）" \
      org.opencontainers.image.source="https://github.com/withAthree/my-home-page"

# 站点配置（缓存策略、安全响应头、gzip、/api 兜底、健康检查）
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf

# 清掉基础镜像自带的 index.html / 50x.html，只托管静态产物
RUN rm -rf /usr/share/nginx/html/*

# 只托管静态产物
COPY --from=builder /app/out /usr/share/nginx/html

EXPOSE 80

# 容器自身健康检查：/healthz 由 nginx 直接返回，不读磁盘
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

# 前台运行，SIGTERM 由 nginx 正常处理（docker stop 会优雅退出）
CMD ["nginx", "-g", "daemon off;"]
