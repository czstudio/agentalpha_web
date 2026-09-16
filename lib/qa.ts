import fs from "node:fs"
import path from "node:path"

const qaRoot = path.join(process.cwd(), "content", "qa")

/**
 * 高频题速答库（content/qa/*.md）。
 * 与 content/interview 的深度解析互补：这边一题一页、一屏答完，标题即搜索句式；
 * frontmatter.deep 指向深度解析 slug，形成「速答 → 深挖」内链。
 */
export interface QaItem {
  slug: string
  /** 问题本身，写成用户会拿去搜的句式 */
  question: string
  /** 一句话结论：详情页首屏高亮 + FAQPage acceptedAnswer 首段 */
  oneLine: string
  /** 对应 content/interview/categories.json 的 cat 词表 */
  category: string
  tags: string[]
  minutes: number
  updated: string
  /** 同分类内排序，小在前 */
  order: number
  /** 深度解析 slug（/interview/<deep>），没有则空串 */
  deep: string
  content: string
}

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
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

function parseTags(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, ""))
    .filter(Boolean)
}

function toItem(file: string): QaItem {
  const slug = file.replace(/\.md$/, "")
  const { data, body } = parseFrontmatter(fs.readFileSync(path.join(qaRoot, file), "utf8"))
  return {
    slug: data.slug || slug,
    question: data.question || slug,
    oneLine: data.oneLine || "",
    category: data.category || "",
    tags: parseTags(data.tags),
    minutes: Number(data.minutes) || 4,
    updated: data.updated || "",
    order: Number(data.order) || 0,
    deep: data.deep || "",
    content: body,
  }
}

export function getAllQa(): QaItem[] {
  if (!fs.existsSync(qaRoot)) return []
  return fs
    .readdirSync(qaRoot)
    .filter((file) => file.endsWith(".md"))
    .map(toItem)
    .sort((a, b) => (a.category === b.category ? a.order - b.order : a.category.localeCompare(b.category)))
}

export function getQa(slug: string): QaItem | null {
  return getAllQa().find((item) => item.slug === slug) || null
}

/** 按分类分组，保持 categories 传入顺序，空分类剔除 */
export function getQaGrouped(cats: { cat: string }[]): { cat: string; items: QaItem[] }[] {
  return cats
    .map(({ cat }) => ({ cat, items: getAllQa().filter((item) => item.category === cat) }))
    .filter((group) => group.items.length > 0)
}

/** 同分类的其他速答题（详情页侧栏/页尾内链用） */
export function getRelatedQa(slug: string, limit = 5): QaItem[] {
  const all = getAllQa()
  const current = all.find((item) => item.slug === slug)
  if (!current) return []
  return all.filter((item) => item.category === current.category && item.slug !== slug).slice(0, limit)
}

/** markdown 源码 → 纯文本（FAQPage JSON-LD 的 acceptedAnswer 用） */
export function qaPlainBody(item: QaItem): string {
  const text = item.content
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "· ")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim()
  return item.oneLine ? `${item.oneLine}\n${text}` : text
}
