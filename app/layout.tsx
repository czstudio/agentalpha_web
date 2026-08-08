import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/contexts/language-context"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

const siteUrl = "https://agentalpha.top"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AgentAlpha｜大模型 Agent、Claude Code 与 Codex 学习门户",
    template: "%s｜AgentAlpha",
  },
  description:
    "AgentAlpha 是面向 AI 工程师与研究者的中文知识门户，系统整理大模型 Agent、Claude Code、Codex 教程、工程实践、项目案例与社区资源。",
  keywords: [
    "Agent 教程",
    "大模型 Agent",
    "AI Agent",
    "Claude Code 教程",
    "Codex 教程",
    "大模型开发",
    "AI 工程实践",
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
    title: "AgentAlpha｜大模型 Agent、Claude Code 与 Codex 学习门户",
    description:
      "系统学习大模型 Agent、Claude Code、Codex 与 AI 工程实践。",
    images: [
      {
        url: "/ai-agent-network-visualization-with-nodes-and-conn.jpg",
        width: 1024,
        height: 1024,
        alt: "AgentAlpha 大模型 Agent 中文知识门户",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentAlpha｜大模型 Agent 学习门户",
    description: "Claude Code、Codex、Agent 教程与 AI 工程实践。",
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
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "AgentAlpha",
        description:
          "面向 AI 工程师与研究者的大模型 Agent 中文知识门户。",
        inLanguage: ["zh-CN", "en"],
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${geist.className} font-sans antialiased`} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <LanguageProvider>
            {children}
            <Analytics />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
