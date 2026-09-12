import fs from "node:fs"
import path from "node:path"

const interviewRoot = path.join(process.cwd(), "content", "interview")

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
  tags: string[]
  minutes: number
  words: number
  author: string
  source: string
  papers: InterviewPaper[]
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

function toMeta(slug: string, data: Record<string, string>, papersBySlug: Record<string, InterviewPaper[]>): InterviewMeta {
  return {
    slug: data.slug || slug,
    no: data.no || "00",
    title: data.title || slug,
    question: data.question || "",
    excerpt: data.excerpt || "",
    tags: parseTags(data.tags),
    minutes: Number(data.minutes) || 8,
    words: Number(data.words) || 0,
    author: data.author || "吴师兄",
    source: data.source || "公众号 吴师兄学大模型",
    papers: papersBySlug[slug] || [],
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
  return fs
    .readdirSync(interviewRoot)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(interviewRoot, file), "utf8")
      const { data } = parseFrontmatter(raw)
      return toMeta(file.replace(/\.md$/, ""), data, papersBySlug)
    })
    .sort((a, b) => a.no.localeCompare(b.no))
}

export function getInterview(slug: string): InterviewArticle | null {
  const file = path.join(interviewRoot, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const papersBySlug = loadIndex()
  const { data, body } = parseFrontmatter(fs.readFileSync(file, "utf8"))
  return { ...toMeta(slug, data, papersBySlug), content: body }
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

/** 题图按约定路径存放：public/images/interview/<slug>/cover.png */
export function hasCover(slug: string): boolean {
  return fs.existsSync(path.join(process.cwd(), "public", "images", "interview", slug, "cover.png"))
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
