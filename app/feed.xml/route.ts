import { communityDocument } from "@/lib/community/content"
import { getAllQa } from "@/lib/qa"
import { getAllInterview } from "@/lib/interview"
import { getMianjingList } from "@/lib/mianjing"
import { getGzhArticles } from "@/lib/gzh"

export const dynamic = "force-static"

const SITE = "https://agentalpha.top"

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")
}

interface FeedEntry {
  title: string
  url: string
  date: string
  summary: string
}

function entry(e: FeedEntry) {
  return `<entry><title>${escapeXml(e.title)}</title><id>${e.url}</id><link href="${e.url}"/><updated>${e.date}</updated><summary>${escapeXml(e.summary)}</summary></entry>`
}

export function GET() {
  const qa: FeedEntry[] = getAllQa()
    .sort((a, b) => (a.updated < b.updated ? 1 : -1))
    .slice(0, 40)
    .map((item) => ({ title: item.question, url: `${SITE}/interview/qa/${item.slug}`, date: item.updated, summary: item.oneLine }))

  const posts: FeedEntry[] = getAllInterview().map((post) => ({
    title: post.title,
    url: `${SITE}/interview/${post.slug}`,
    date: post.updated || "2026-01-01",
    summary: post.excerpt,
  }))

  const mianjing: FeedEntry[] = getMianjingList().map((doc) => ({
    title: doc.title,
    url: `${SITE}/mianjing/${doc.slug}`,
    date: doc.date || "2026-01-01",
    summary: doc.excerpt,
  }))

  const gzh: FeedEntry[] = getGzhArticles()
    .slice(0, 20)
    .map((a) => ({ title: `${a.title}（公众号）`, url: a.url, date: a.date ? a.date.slice(0, 10) : "2026-01-01", summary: a.digest }))

  const all = [...qa, ...posts, ...mianjing, ...gzh]
    .filter((e) => e.title && e.url)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 60)

  const latest = all[0]?.date || communityDocument.syncedAt
  const community: FeedEntry = {
    title: communityDocument.title,
    url: `${SITE}/community`,
    date: communityDocument.syncedAt,
    summary: communityDocument.description,
  }
  const xml = `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>AgentAlpha 面试题库与社区</title><id>${SITE}</id><link href="${SITE}" /><link href="${SITE}/feed.xml" rel="self"/><updated>${latest}</updated><subtitle>大模型 Agent 岗面试题速答、深度解析、面经与社区动态</subtitle>${entry(community)}${all.map(entry).join("")}</feed>`
  return new Response(xml, { headers: { "Content-Type": "application/atom+xml; charset=utf-8" } })
}
