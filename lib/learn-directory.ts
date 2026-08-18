import fs from "node:fs"
import path from "node:path"

const root = path.join(process.cwd(), "content", "learn", "claude-code")

export interface LearnChapter {
  order: number
  volumeId: string
  slug: string
  title: string
  sourceWikiToken?: string
  status?: string
}

export interface LearnVolume { id: string; title: string }

export function getLearnDirectory(): { title: string; description: string; volumes: LearnVolume[]; chapters: LearnChapter[] } {
  const file = path.join(root, "manifest.json")
  if (!fs.existsSync(file)) return { title: "Agent 工程教程", description: "", volumes: [], chapters: [] }
  const data = JSON.parse(fs.readFileSync(file, "utf8"))
  return { title: data.title, description: data.description, volumes: data.volumes || [], chapters: data.chapters || [] }
}
