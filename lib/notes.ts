import fs from "node:fs"
import path from "node:path"

const notesRoot = path.join(process.cwd(), "content", "notes")

export interface NoteMeta {
  slug: string
  title: string
  excerpt: string
  series: string
  seriesNo: string
  number: string
  minutes: number
}

export interface NoteSeries {
  no: string
  name: string
  title: string
  description: string
}

export interface Note extends NoteMeta {
  /** 正文 Markdown(已去掉尾部推广段) */
  content: string
}

const PROMO_MARKER = "## AgentAlpha 大模型 Agent 训练营"

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

function toMeta(slug: string, data: Record<string, string>): NoteMeta {
  return {
    slug: data.slug || slug,
    title: data.title || slug,
    excerpt: data.excerpt || "",
    series: data.series || "",
    seriesNo: data.seriesNo || "",
    number: data.number || "",
    minutes: Number(data.minutes) || 8,
  }
}

export function getAllNotes(): NoteMeta[] {
  if (!fs.existsSync(notesRoot)) return []
  return fs
    .readdirSync(notesRoot)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(notesRoot, file), "utf8")
      const { data } = parseFrontmatter(raw)
      return toMeta(file.replace(/\.md$/, ""), data)
    })
    .sort((a, b) => a.number.localeCompare(b.number))
}

export function getSeries(): NoteSeries[] {
  const indexPath = path.join(notesRoot, "index.json")
  if (!fs.existsSync(indexPath)) return []
  const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"))
  return (parsed.series || []) as NoteSeries[]
}

export function getNote(slug: string): Note | null {
  const file = path.join(notesRoot, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const { data, body } = parseFrontmatter(fs.readFileSync(file, "utf8"))
  const meta = toMeta(slug, data)
  const promoIndex = body.indexOf(PROMO_MARKER)
  return {
    ...meta,
    content: (promoIndex === -1 ? body : body.slice(0, promoIndex)).trim(),
  }
}

export function getAdjacentNotes(slug: string): { previous: NoteMeta | null; next: NoteMeta | null } {
  const notes = getAllNotes()
  const index = notes.findIndex((note) => note.slug === slug)
  return {
    previous: index > 0 ? notes[index - 1] : null,
    next: index >= 0 && index < notes.length - 1 ? notes[index + 1] : null,
  }
}
