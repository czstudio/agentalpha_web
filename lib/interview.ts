import fs from "node:fs"
import path from "node:path"

const interviewRoot = path.join(process.cwd(), "content", "interview")

export interface InterviewWork {
  name: string
  desc: string
  url: string
  badge: string
}

export interface InterviewPaper {
  arxiv: string
  title: string
  why: string
  figure?: string
}

export interface InterviewMeta {
  slug: string
  no: string
  title: string
  question: string
  excerpt: string
  category: string
  tags: string[]
  minutes: number
  words: number
  /** 最后更新日期（frontmatter `updated`，YYYY-MM-DD）；未填为空串 */
  updated: string
  author: string
  source: string
  papers: InterviewPaper[]
  works: InterviewWork[]
}

/** 分类词表与元数据，来源 content/interview/categories.json（唯一来源） */
export interface InterviewCategory {
  /** 路由与 frontmatter 用的固定值，如 "rag" */
  cat: string
  /** 分类名，如 "RAG 检索增强" */
  name: string
  intro: string
  kbChapter: string
  /** 规划篇数（第一批完成后），用于「N/M 篇」进度文案 */
  planned: number
  /** 详情页置顶的真题集 slug（B 类篇目上线后填） */
  flagship?: string
}

/** 分类 + 实时篇数，列表页与分类页共用 */
export interface InterviewCategoryWithCount extends InterviewCategory {
  count: number
  posts: InterviewMeta[]
}

export interface InterviewArticle extends InterviewMeta {
  content: string
}

export interface InterviewHeading {
  id: string
  title: string
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

function loadWorks(): Record<string, InterviewWork[]> {
  const indexPath = path.join(interviewRoot, "index.json")
  if (!fs.existsSync(indexPath)) return {}
  try {
    const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"))
    const works: Record<string, InterviewWork[]> = {}
    for (const post of parsed.posts || []) {
      if (Array.isArray(post.works) && post.works.length) works[post.slug] = post.works
    }
    return works
  } catch {
    return {}
  }
}

function loadIndex(): Record<string, InterviewPaper[]> {
  const indexPath = path.join(interviewRoot, "index.json")
  if (!fs.existsSync(indexPath)) return {}
  try {
    const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"))
    const papers: Record<string, InterviewPaper[]> = {}
    for (const post of parsed.posts || []) {
      if (Array.isArray(post.papers) && post.papers.length) papers[post.slug] = post.papers
    }
    return papers
  } catch {
    return {}
  }
}

function toMeta(
  slug: string,
  data: Record<string, string>,
  papersBySlug: Record<string, InterviewPaper[]>,
  worksBySlug: Record<string, InterviewWork[]>,
): InterviewMeta {
  return {
    slug: data.slug || slug,
    no: data.no || "00",
    title: data.title || slug,
    question: data.question || "",
    excerpt: data.excerpt || "",
    category: data.category || "",
    tags: parseTags(data.tags),
    minutes: Number(data.minutes) || 8,
    words: Number(data.words) || 0,
    updated: data.updated || "",
    author: data.author || "AgentAlpha",
    source: data.source || "AgentAlpha 社区",
    papers: papersBySlug[slug] || [],
    works: worksBySlug[slug] || [],
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

export function getInterviewHeadings(content: string): InterviewHeading[] {
  const seen = new Map<string, number>()
  const headings: InterviewHeading[] = []
  for (const match of content.matchAll(/^##\s+(.+)$/gm)) {
    const title = match[1].trim().replace(/[`*_]/g, "")
    const base = slugifyHeading(title)
    const count = seen.get(base) || 0
    seen.set(base, count + 1)
    headings.push({ id: count ? `${base}-${count + 1}` : base, title })
  }
  return headings
}

export function getAllInterview(): InterviewMeta[] {
  if (!fs.existsSync(interviewRoot)) return []
  const papersBySlug = loadIndex()
  const worksBySlug = loadWorks()
  return fs
    .readdirSync(interviewRoot)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(interviewRoot, file), "utf8")
      const { data } = parseFrontmatter(raw)
      return toMeta(file.replace(/\.md$/, ""), data, papersBySlug, worksBySlug)
    })
    .sort((a, b) => a.no.localeCompare(b.no))
}

export function getInterview(slug: string): InterviewArticle | null {
  const file = path.join(interviewRoot, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const papersBySlug = loadIndex()
  const worksBySlug = loadWorks()
  const { data, body } = parseFrontmatter(fs.readFileSync(file, "utf8"))
  return { ...toMeta(slug, data, papersBySlug, worksBySlug), works: worksBySlug[slug] || [], content: body }
}

/** 分类词表定义（顺序即展示顺序）。categories.json 缺失时返回空数组，页面按「无分类」降级。 */
export function getCategories(): InterviewCategory[] {
  const file = path.join(interviewRoot, "categories.json")
  if (!fs.existsSync(file)) return []
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"))
    return (parsed.categories || []).filter((c: InterviewCategory) => c && c.cat)
  } catch {
    return []
  }
}

/** 单个分类的定义；cat 不在词表内返回 null（调用方据此 notFound） */
export function getCategory(cat: string): InterviewCategory | null {
  return getCategories().find((c) => c.cat === cat) || null
}

/**
 * 分类 + 该分类下的文章（按 no 序）。
 * includeEmpty=false 时剔除「有定义但暂无文章」的分类——列表页分类卡用这个，
 * 避免 B 类真题集上线前出现 8 个空分类。
 */
export function getCategoriesWithPosts(includeEmpty = true): InterviewCategoryWithCount[] {
  const posts = getAllInterview()
  const grouped = new Map<string, InterviewMeta[]>()
  for (const post of posts) {
    if (!post.category) continue
    const bucket = grouped.get(post.category)
    if (bucket) bucket.push(post)
    else grouped.set(post.category, [post])
  }
  return getCategories()
    .map((category) => {
      const list = grouped.get(category.cat) || []
      return { ...category, posts: list, count: list.length }
    })
    .filter((category) => includeEmpty || category.count > 0)
}

/** 某分类下的文章；cat 未知时返回空数组 */
export function getCategoryPosts(cat: string): InterviewMeta[] {
  return getAllInterview().filter((post) => post.category === cat)
}

/** 同分类文章（按 no 序，排除自身）。详情页右栏用，limit 默认 6。 */
export function getRelatedByCategory(slug: string, limit = 6): InterviewMeta[] {
  const posts = getAllInterview()
  const current = posts.find((post) => post.slug === slug)
  if (!current || !current.category) return []
  return posts.filter((post) => post.category === current.category && post.slug !== slug).slice(0, limit)
}

export function getAdjacentInterview(slug: string): {
  previous: InterviewMeta | null
  next: InterviewMeta | null
} {
  const posts = getAllInterview()
  const index = posts.findIndex((post) => post.slug === slug)
  return {
    previous: index > 0 ? posts[index - 1] : null,
    next: index >= 0 && index < posts.length - 1 ? posts[index + 1] : null,
  }
}

/** 题图按约定路径存放：public/images/interview/<slug>/cover-og.jpg（OG/分享卡用，≤300KB） */
export function hasCover(slug: string): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", "images", "interview", slug, "cover-og.jpg"))
}

/** 论文原图约定：public/images/interview/<slug>/paper-<arxiv>.<ext> */
export function paperFigure(slug: string, arxiv: string): string | null {
  const dir = path.join(process.cwd(), "public", "images", "interview", slug)
  if (!fs.existsSync(dir)) return null
  for (const file of fs.readdirSync(dir)) {
    if (file.startsWith(`paper-${arxiv}.`)) {
      return `/images/interview/${slug}/${file}`
    }
  }
  return null
}
