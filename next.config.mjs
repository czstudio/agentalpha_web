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

    return [
      {
        source: "/admin/:path*",
        headers: noIndexHeaders,
      },
      {
        source: "/api/:path*",
        headers: noIndexHeaders,
      },
    ]
  },
}

export default nextConfig
