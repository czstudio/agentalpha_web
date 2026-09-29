import fs from "node:fs"
import path from "node:path"

const glossaryRoot = path.join(process.cwd(), "content", "glossary")

/**
 * 术语库（content/glossary/*.md）。
 * 面向 AI 引用的定义页：一句话定义 + 机制 + 解决什么问题 + 面试怎么考；
 * relatedQa / relatedTerms 把术语页织进题库内链网。
 */
export interface GlossaryItem {
  slug: string
  /** 术语名（中文优先，附英文缩写） */
  term: string
  /** 英文全称，没有则空串 */
  en: string
  /** 一句话定义：详情页首屏高亮 + JSON-LD description */
  oneLine: string
  /** 同义词/别名（搜索对齐用） */
  aliases: string[]
  /** 分组词表：basics / rag / agent / inference / finetune / eval / safety */
  group: string
  tags: string[]
  /** 相关速答题 slug（/interview/qa/<slug>） */
  relatedQa: string[]
  /** 相关术语 slug（/glossary/<slug>） */
  relatedTerms: string[]
  updated: string
  content: string
}

export const GLOSSARY_GROUPS: { group: string; name: string }[] = [
  { group: "basics", name: "LLM 基础" },
  { group: "rag", name: "RAG 与检索" },
  { group: "agent", name: "Agent 与工具" },
  { group: "inference", name: "推理与部署" },
  { group: "finetune", name: "训练与微调" },
  { group: "eval", name: "评估" },
  { group: "safety", name: "安全" },
]

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

function toItem(file: string): GlossaryItem {
  const slug = file.replace(/\.md$/, "")
  const { data, body } = parseFrontmatter(fs.readFileSync(path.join(glossaryRoot, file), "utf8"))
  return {
    slug: data.slug || slug,
    term: data.term || slug,
    en: data.en || "",
    oneLine: data.oneLine || "",
    aliases: parseList(data.aliases),
    group: data.group || "basics",
    tags: parseList(data.tags),
    relatedQa: parseList(data.relatedQa),
    relatedTerms: parseList(data.relatedTerms),
    updated: data.updated || "",
    content: body,
  }
}

let _gloCache: GlossaryItem[] | null = null

export function getAllGlossary(): GlossaryItem[] {
  if (_gloCache) return _gloCache
  if (!fs.existsSync(glossaryRoot)) return []
  const items = fs
    .readdirSync(glossaryRoot)
    .filter((file) => file.endsWith(".md"))
    .map(toItem)
    .sort((a, b) => (a.group === b.group ? a.term.localeCompare(b.term, "zh-Hans-CN") : a.group.localeCompare(b.group)))
  _gloCache = items
  return items
}

export function getGlossary(slug: string): GlossaryItem | null {
  return getAllGlossary().find((item) => item.slug === slug) || null
}

/** 按分组聚合并剔除空组，保持 GLOSSARY_GROUPS 顺序 */
export function getGlossaryGrouped(): { group: string; name: string; items: GlossaryItem[] }[] {
  const all = getAllGlossary()
  return GLOSSARY_GROUPS.map(({ group, name }) => ({
    group,
    name,
    items: all.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0)
}
