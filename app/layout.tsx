import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/contexts/language-context"
import "./globals.css"

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
    description: "技术落地、人才培养、商业共创，围绕真实 Agent 项目共同成长。",
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
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
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
      },
    ],
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/MiSans-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/MiSans-Bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LanguageProvider>
            {children}
            <Analytics />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
