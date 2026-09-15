import fs from "node:fs"
import path from "node:path"

const mianjingRoot = path.join(process.cwd(), "content", "mianjing")

export interface MianjingMeta {
  slug: string
  title: string
  company: string
  role: string
  round: string
  date: string
  minutes: number
  tags: string[]
  excerpt: string
}

export interface Mianjing extends MianjingMeta {
  content: string
}

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

function toMeta(slug: string, data: Record<string, string>): MianjingMeta {
  let tags: string[] = []
  const rawTags = data.tags || ""
  const tagMatch = rawTags.match(/^\[(.*)\]$/)
  if (tagMatch) {
    tags = tagMatch[1].split(",").map((t) => t.trim().replace(/^"|"$/g, "")).filter(Boolean)
  }
  return {
    slug: data.slug || slug,
    title: data.title || slug,
    company: data.company || "",
    role: data.role || "",
    round: data.round || "",
    date: data.date || "",
    minutes: Number(data.minutes) || 20,
    tags,
    excerpt: data.excerpt || "",
  }
}

export function getMianjingList(): MianjingMeta[] {
  if (!fs.existsSync(mianjingRoot)) return []
  return fs
    .readdirSync(mianjingRoot)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(mianjingRoot, file), "utf8")
      const { data } = parseFrontmatter(raw)
      return toMeta(file.replace(/\.md$/, ""), data)
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getMianjing(slug: string): Mianjing | null {
  const file = path.join(mianjingRoot, `${slug}.md`)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, "utf8")
  const { data, body } = parseFrontmatter(raw)
  return { ...toMeta(slug, data), content: body }
}
