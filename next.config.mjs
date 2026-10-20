/** @type {import('next').NextConfig} */
const nextConfig = {
  // 允许通过环境变量切换构建目录（规避本地批量删除限制，不影响产物）
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: true,
};

export default nextConfig;
