/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // 2918+ 静态页的大站：单页生成（KaTeX + 全文 markdown）在资源紧张时
  // 会超过默认 60s（本机多会话并行 build / Vercel 共享构建机都会遇到），放宽到 300s。
  staticPageGenerationTimeout: 300,
    async redirects() {
      return [
        // 根路径旧版页面地址永久重定向（修复旧缓存/书签/搜索引擎收录的根路径 404）
      { source: "/m1-rag.html", destination: "/projects/m1-rag.html", permanent: true },
      { source: "/m2-memory.html", destination: "/projects/m2-memory.html", permanent: true },
      { source: "/m3-agent.html", destination: "/projects/m3-agent.html", permanent: true },
      { source: "/m4-multiagent.html", destination: "/projects/m4-multiagent.html", permanent: true },
      { source: "/m5-deepsearch.html", destination: "/projects/m5-deepsearch.html", permanent: true },
      { source: "/m6-inference.html", destination: "/projects/m6-inference.html", permanent: true },
      { source: "/m7-codeagent.html", destination: "/projects/m7-codeagent.html", permanent: true },
      { source: "/m8-selfevolve.html", destination: "/projects/m8-selfevolve.html", permanent: true },
      { source: "/m9-agentic-rl.html", destination: "/projects/m9-agentic-rl.html", permanent: true },
      { source: "/m10-capstone.html", destination: "/projects/m10-capstone.html", permanent: true },
      { source: "/stories.html", destination: "/projects/stories.html", permanent: true },
      { source: "/results.html", destination: "/projects/results.html", permanent: true },
      { source: "/playground.html", destination: "/projects/playground.html", permanent: true },
      ];
    },
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
    const staticDirs = ["/images/:path*", "/fonts/:path*", "/brand/:path*", "/logos/:path*"]
    // HTML 页面必须 max-age=0：/projects 项目页会频繁迭代，7 天强缓存会让访客
    // 长期看到旧版（2026-10-05 事故：m1 重做后用户浏览器仍缓存旧页 7 天）。
    // 二级规则把图片/字体的长缓存加回来（后定义的规则覆盖先定义的，资产不受影响）。
    const htmlNoCache = [
      {
        key: "Cache-Control",
        value: "public, max-age=0, must-revalidate",
      },
    ]

    return [
      {
        source: "/admin/:path*",
        headers: noIndexHeaders,
      },
      {
        source: "/api/:path*",
        headers: noIndexHeaders,
      },
      { source: "/projects/:path*", headers: htmlNoCache },
      { source: "/projects/assets/:path*", headers: staticCache },
      ...staticDirs.map((source) => ({ source, headers: staticCache })),
    ]
  },
}

export default nextConfig
