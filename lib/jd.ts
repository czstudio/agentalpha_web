import fs from "node:fs"
import path from "node:path"
import { getAllQa, type QaItem } from "@/lib/qa"
import { getCompany, type Company } from "@/lib/companies"

/**
 * JD 拆解样板库（/jd）。
 * content/jd/<company>-<slug>.md：frontmatter 放结构化字段，正文固定 10 节 `## `。
 * 口径红线：样板页是该方向公开 JD 的高频归纳，非某一篇特定 JD；正文不写具体薪资/编制。
 * 扩页只加 md 文件，零代码改动；qaSlugs 必须真实存在于 content/qa。
 */
export interface JdDoc {
  /** 岗位 slug（URL 用 /jd/<company>/<slug>） */
  slug: string
  /** lib/companies 的公司 slug */
  company: string
  /** 页面标题（含公司名） */
  title: string
  /** 岗位族（Agent 应用开发 / RAG 工程…） */
  role: string
  /** 对应 lib/tools/resume-analyzer JOB_PROFILES 的 slug，交互工具复用岗位画像 */
  family: string
  /** 招聘层级描述（校招/1-3 年…） */
  level: string
  /** 一句话：这个岗在招什么（列表页卡片 + SEO description） */
  summary: string
  /** 对应题库分类（content/interview/categories.json 词表），页面自动拉题 */
  cats: string[]
  /** 精选考点题 slug（页面「直接刷这几题」区，最多 12） */
  qaSlugs: string[]
  /** 搜索词 */
  keywords: string[]
  updated: string
  /** 正文 markdown（10 节） */
  content: string
}

const jdRoot = path.join(process.cwd(), "content", "jd")

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

function parseList(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, ""))
    .filter(Boolean)
}

function toDoc(file: string): JdDoc {
  const raw = fs.readFileSync(path.join(jdRoot, file), "utf8")
  const { data, body } = parseFrontmatter(raw)
  const company = data.company || ""
  return {
    slug: data.slug || file.replace(/\.md$/, "").replace(`${company}-`, ""),
    company,
    title: data.title || "",
    role: data.role || "",
    family: data.family || "agent-app",
    level: data.level || "",
    summary: data.summary || "",
    cats: parseList(data.cats),
    qaSlugs: parseList(data.qaSlugs),
    keywords: parseList(data.keywords),
    updated: data.updated || "",
    content: body,
  }
}

export function getAllJd(): JdDoc[] {
  if (!fs.existsSync(jdRoot)) return []
  return fs
    .readdirSync(jdRoot)
    .filter((file) => file.endsWith(".md"))
    .map(toDoc)
    .sort((a, b) => (a.company === b.company ? a.slug.localeCompare(b.slug) : a.company.localeCompare(b.company)))
}

export function getJd(company: string, slug: string): JdDoc | null {
  return getAllJd().find((doc) => doc.company === company && doc.slug === slug) || null
}

export function getJdCompany(company: string): Company | null {
  return getCompany(company)
}

/** 同方向（family）或同公司的其他 JD 页 */
export function getSimilarJd(doc: JdDoc, limit = 4): JdDoc[] {
  return getAllJd()
    .filter((d) => d.company !== doc.company || d.slug !== doc.slug)
    .sort((a, b) => {
      const score = (d: JdDoc) => (d.family === doc.family ? 0 : 1) + (d.company === doc.company ? 0 : 1.5)
      return score(a) - score(b)
    })
    .slice(0, limit)
}

/** 该 JD 对应的速答题：qaSlugs 精选在前，再按 cats 补齐到 limit */
export function getJdQa(doc: JdDoc, limit = 14): QaItem[] {
  const all = getAllQa()
  const picked: QaItem[] = []
  const seen = new Set<string>()
  for (const slug of doc.qaSlugs) {
    const item = all.find((q) => q.slug === slug)
    if (item && !seen.has(item.slug)) {
      picked.push(item)
      seen.add(item.slug)
    }
  }
  if (picked.length < limit) {
    for (const cat of doc.cats) {
      for (const item of all.filter((q) => q.category === cat)) {
        if (picked.length >= limit) break
        if (!seen.has(item.slug)) {
          picked.push(item)
          seen.add(item.slug)
        }
      }
    }
  }
  return picked.slice(0, limit)
}
