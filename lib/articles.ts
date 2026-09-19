import fs from "node:fs"
import path from "node:path"

const articlesRoot = path.join(process.cwd(), "content", "articles")

export interface ArticleMeta {
  slug: string
  title: string
  excerpt: string
  date: string
  category: string
  tags: string[]
  minutes: number
  source?: string
}

export interface Article extends ArticleMeta {
  /** 正文 Markdown(已按站点约定去掉尾部推广段) */
  content: string
}

export interface ArticleHeading {
  id: string
  title: string
  level: 2 | 3
}

/** 尾部推广段标记:命中即截断,站内用统一 promo 卡替代 */
const PROMO_MARKERS = [
  "## AgentAlpha 大模型 Agent 训练营",
  "## 🚀 跨越成本深水区",
  "## 跨越成本深水区",
  "## ⭐ 跨越成本深水区",
]

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { data: {}, body: raw }
  const data: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    data[key] = value
  }
  return { data, body: match[2].trim() }
}

function toMeta(slug: string, data: Record<string, string>): ArticleMeta {
  return {
    slug: data.slug || slug,
    title: data.title || slug,
    excerpt: data.excerpt || "",
    date: data.date || "",
    category: data.category || "技术分享",
    tags: (data.tags || "").split(",").map(t => t.trim()).filter(Boolean),
    minutes: Number(data.minutes) || 8,
    source: data.source || undefined,
  }
}

export function slugifyHeading(title: string): string {
  const normalized = title
    .replace(/[`*_]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized || "section"
}

export function getArticleHeadings(content: string): ArticleHeading[] {
  const seen = new Map<string, number>()
  const headings: ArticleHeading[] = []
  for (const match of content.matchAll(/^(#{2,3})\s+(.+)$/gm)) {
    const level = match[1].length as 2 | 3
    const title = match[2].trim().replace(/[`*_]/g, "")
    const base = slugifyHeading(title)
    const count = seen.get(base) || 0
    seen.set(base, count + 1)
    headings.push({ id: count ? `${base}-${count + 1}` : base, title, level })
  }
  return headings
}

export function getAllArticles(): ArticleMeta[] {
  if (!fs.existsSync(articlesRoot)) return []
  return fs
    .readdirSync(articlesRoot)
    .filter((file) => file.endsWith(".md") && file !== "index.json")
    .map((file) => {
      const raw = fs.readFileSync(path.join(articlesRoot, file), "utf8")
      const { data } = parseFrontmatter(raw)
      return toMeta(file.replace(/\.md$/, ""), data)
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getArticle(slug: string): Article | null {
  const file = path.join(articlesRoot, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const parsed = parseFrontmatter(fs.readFileSync(file, "utf8"))
  const data = parsed.data
  const body = parsed.body
  const meta = toMeta(slug, data)
  let content = body.trim()
  for (const marker of PROMO_MARKERS) {
    const idx = content.indexOf(marker)
    if (idx !== -1) { content = content.slice(0, idx).trim(); break }
  }
  return { ...meta, content }
}

export function getAdjacentArticles(slug: string): { previous: ArticleMeta | null; next: ArticleMeta | null } {
  const articles = getAllArticles()
  const index = articles.findIndex(a => a.slug === slug)
  return {
    previous: index > 0 ? articles[index - 1] : null,
    next: index >= 0 && index < articles.length - 1 ? articles[index + 1] : null,
  }
}
