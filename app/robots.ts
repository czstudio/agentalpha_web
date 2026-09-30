import type { MetadataRoute } from "next"

const siteUrl = "https://agentalpha.top"

/** 对生成式 AI 引擎友好的抓取策略：显式放行主流 AI 爬虫（抓取/搜索/答案三类） */
const AI_CRAWLERS = [
  "GPTBot", // OpenAI 模型训练
  "OAI-SearchBot", // ChatGPT 搜索
  "ChatGPT-User", // ChatGPT 用户实时浏览
  "ClaudeBot", // Anthropic 抓取
  "Claude-Web", // Claude 网页搜索
  "anthropic-ai",
  "PerplexityBot", // Perplexity
  "Perplexity-User",
  "Google-Extended", // Gemini 训练（搜索由 Googlebot 覆盖）
  "Applebot-Extended",
  "Bytespider", // 字节（豆包）
  "CCBot", // Common Crawl（多数 AI 的语料底座）
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
      })),
    ],
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/sitemap-questions.xml`,
      `${siteUrl}/sitemap-articles.xml`,
      `${siteUrl}/sitemap-glossary.xml`,
    ],
    host: siteUrl,
  }
}
