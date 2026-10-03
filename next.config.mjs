/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // 2918+ 静态页的大站：单页生成（KaTeX + 全文 markdown）在资源紧张时
  // 会超过默认 60s（本机多会话并行 build / Vercel 共享构建机都会遇到），放宽到 300s。
  staticPageGenerationTimeout: 300,
  async rewrites() {
    return [
      {
        source: "/community.md",
        destination: "/community/markdown",
      },
      // 实战项目展示区（public/projects 静态站）：目录路径落到 index.html
      { source: "/projects", destination: "/projects/index.html" },
      { source: "/projects/", destination: "/projects/index.html" },
    ]
  },
  async headers() {
    const noIndexHeaders = [
      {
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive",
      },
    ]
    // 图片/字体/品牌素材默认 max-age=0，每次访问都对每个资源回源校验（304 也要一个 RTT，
    // 国内访问 Vercel 一个 RTT 就是几百毫秒）。这些目录内容基本不变（社区图是内容哈希名），
    // 给 7 天强缓存 + 30 天 stale-while-revalidate。
    const staticCache = [
      {
        key: "Cache-Control",
        value: "public, max-age=604800, stale-while-revalidate=2592000",
      },
    ]
    const staticDirs = ["/images/:path*", "/fonts/:path*", "/brand/:path*", "/logos/:path*", "/projects/:path*"]

    return [
      {
        source: "/admin/:path*",
        headers: noIndexHeaders,
      },
      {
        source: "/api/:path*",
        headers: noIndexHeaders,
      },
      ...staticDirs.map((source) => ({ source, headers: staticCache })),
    ]
  },
}

export default nextConfig
