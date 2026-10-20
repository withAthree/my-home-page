#!/usr/bin/env sh
# ============================================================================
#  部署后自检脚本 —— 只用 curl，服务器上直接跑
#
#    sh deploy/smoke-test.sh                        # 默认 http://127.0.0.1:8080
#    sh deploy/smoke-test.sh http://127.0.0.1:18090 # 指定地址
#    sh deploy/smoke-test.sh https://xuqingchu.dev  # 线上域名（走 HTTPS 时用得到）
#
#  全部通过时退出码 0，任意一项失败退出码 1（可以放进 CI / 部署钩子）。
# ============================================================================
set -u

BASE="${1:-http://127.0.0.1:8080}"
BASE="${BASE%/}"

if ! command -v curl >/dev/null 2>&1; then
  echo "✗ 没找到 curl，先装一个：apt install -y curl" >&2
  exit 1
fi

FAIL=0
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# ---------------------------------------------------------------------------
# check "说明" "期望状态码" "路径" ["必须包含的响应头/正文片段"]
# ---------------------------------------------------------------------------
check() {
  desc="$1"; want="$2"; path="$3"; needle="${4:-}"
  code=$(curl -sS -o "$TMP" -D "$TMP.headers" -w '%{http_code}' --max-time 15 "$BASE$path" 2>/dev/null || echo 000)
  body_ok=1
  if [ -n "$needle" ]; then
    grep -q -- "$needle" "$TMP" || body_ok=0
  fi
  if [ "$code" = "$want" ] && [ "$body_ok" = "1" ]; then
    printf '  ✓ %-38s %s %s\n' "$desc" "$code" "$path"
  else
    FAIL=$((FAIL + 1))
    printf '  ✗ %-38s 期望 %s 拿到 %s  %s\n' "$desc" "$want" "$code" "$path"
    if [ -n "$needle" ]; then
      printf '      响应里没有找到：%s\n' "$needle"
    fi
  fi
}

# 只检查响应头（不关心正文）
check_header() {
  desc="$1"; path="$2"; header="$3"; expect="$4"
  curl -sS -o /dev/null -D "$TMP.headers" --max-time 15 "$BASE$path" >/dev/null 2>&1 || true
  if grep -qi "^$header:.*$expect" "$TMP.headers"; then
    printf '  ✓ %-38s %s: %s\n' "$desc" "$header" "$expect"
  else
    FAIL=$((FAIL + 1))
    printf '  ✗ %-38s 期望响应头 %s 含 %s，实际没有\n' "$desc" "$header" "$expect"
    grep -i "^$header:" "$TMP.headers" | sed 's/^/      /' || true
  fi
}

echo "自检目标：$BASE"
echo

echo "[1/5] 页面可访问"
check "首页"                 200 "/"         "个人门户"
check "后台页面"             200 "/admin/"   "内容后台"
check "后台目录重定向"       301 "/admin"
check "自定义 404"           404 "/no-such-page-$$"

echo
echo "[2/5] 静态资源与缓存"
css=$(curl -sS --max-time 15 "$BASE/" | grep -o '/_next/static/css/[^"]*\.css' | head -n 1)
if [ -n "$css" ]; then
  check_header "CSS 长缓存" "$css" "cache-control" "max-age=31536000"
else
  FAIL=$((FAIL + 1)); echo "  ✗ 首页里没有找到 CSS 资源（构建产物不完整？）"
fi
check_header "HTML 不缓存" "/" "cache-control" "no-cache"
check_header "图片缓存"    "/images/photo-01.jpg" "cache-control" "max-age=2592000"

echo
echo "[3/5] 安全响应头"
check_header "X-Content-Type-Options" "/" "x-content-type-options" "nosniff"
check_header "X-Frame-Options"        "/" "x-frame-options"        "SAMEORIGIN"
check_header "Content-Security-Policy" "/" "content-security-policy" "default-src 'self'"
check_header "Referrer-Policy"        "/" "referrer-policy"        "strict-origin"

echo
echo "[4/5] 压缩"
curl -sS -o /dev/null -D "$TMP.headers" -H 'Accept-Encoding: gzip' --max-time 15 "$BASE/" >/dev/null 2>&1 || true
if grep -qi '^content-encoding:.*gzip' "$TMP.headers"; then
  echo "  ✓ HTML 走 gzip"
else
  FAIL=$((FAIL + 1)); echo "  ✗ HTML 没有 gzip，检查 nginx 的 gzip 配置"
fi

echo
echo "[5/5] 后台接口兜底（静态部署应为 404 JSON）"
check "后台 API 不可用" 404 "/api/studio" '"mode":"static"'
check "健康检查"        200 "/healthz"    "ok"

echo
if [ "$FAIL" -eq 0 ]; then
  echo "全部通过 ✓"
  exit 0
fi
echo "有 $FAIL 项没通过 ✗"
exit 1
