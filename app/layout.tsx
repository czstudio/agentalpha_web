import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ScrollReveal } from "@/components/scroll-reveal"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/contexts/language-context"
import "katex/dist/katex.min.css"
import "./globals.css"
import "./theme-soft.css"
import { SiteFooter } from "@/components/site-footer"


const siteUrl = "https://agentalpha.top"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AgentAlpha｜大模型 Agent 实战社区",
    template: "%s｜AgentAlpha",
  },
  description:
    "AgentAlpha 是以技术落地、人才培养与商业共创为核心的大模型 Agent 实战社区。",
  keywords: [
    "Agent 教程",
    "大模型 Agent",
    "AI Agent",
    "大模型开发",
    "AI 工程实践",
    "AI 社区",
    "AgentAlpha",
  ],
  authors: [{ name: "AgentAlpha", url: siteUrl }],
  creator: "AgentAlpha",
  publisher: "AgentAlpha",
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    alternateLocale: "en_US",
    url: "/",
    siteName: "AgentAlpha",
    title: "AgentAlpha｜大模型 Agent 实战社区",
    description: "技术落地、人才培养、商业共创：在真实的 Agent 项目里一起成长。",
    images: [
      {
        url: "/ai-agent-network-visualization-with-nodes-and-conn.jpg",
        width: 1024,
        height: 1024,
        alt: "AgentAlpha 大模型 Agent 实战社区",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentAlpha｜大模型 Agent 实战社区",
    description: "技术落地、人才培养、商业共创。",
    images: ["/ai-agent-network-visualization-with-nodes-and-conn.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "AgentAlpha",
        alternateName: "AgentAlpha 社区",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        description: "国内顶尖大模型 Agent 实战社区：面试题库、主线课程、求职工具与开源项目。",
        sameAs: ["https://github.com/czstudio"],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "AgentAlpha",
        description:
          "以技术落地、人才培养与商业共创为核心的大模型 Agent 实战社区。",
        inLanguage: ["zh-CN", "en"],
        publisher: { "@id": `${siteUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/interview/qa?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        {/* 字体已按 unicode-range 切片（@font-face 指向 /fonts/slices/*），按需加载即可；整包 woff2 未被任何 @font-face 引用，preload 只会让每个访客白下 1.5MB */}
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
          <LanguageProvider>
            {children}
            <ScrollReveal />
            <Analytics />
          </LanguageProvider>
        </ThemeProvider>
        {/* chunk 加载失败兜底:部署窗口期旧页面引用的 chunk 会 404/500,静默无响应最坑——给一句可见提示 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function show(){var b=document.getElementById('chunk-fail-banner');if(b)b.style.display='flex'}function h(e){var t=e.target;if(t&&(t.tagName==='SCRIPT'||t.tagName==='LINK')&&/_next\/static/.test(t.src||t.href||'')){show()}}window.addEventListener('error',h,true);window.addEventListener('unhandledrejection',function(e){if(String(e.reason).indexOf('Failed to fetch dynamically imported module')>-1||String(e.reason).indexOf('Loading chunk')>-1)show()})})();`,
          }}
        />
        <SiteFooter />
        <div id="chunk-fail-banner" style={{ display: "none", position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 9999, justifyContent: "center" }}>
          <div style={{ background: "#26211a", color: "#faf6ef", borderRadius: 12, padding: "10px 18px", fontSize: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
            页面资源加载失败,可能是站点刚发布了新版本，
            <a href="javascript:location.reload()" style={{ color: "#f2b48c", fontWeight: 600 }}>
              点击刷新
            </a>
            即可恢复。
          </div>
        </div>
      </body>
    </html>
  )
}
