export type PublicationState = "draft" | "preview" | "published"
export type ChapterStatus =
  | "planned"
  | "inventory"
  | "fact_checked"
  | "designed"
  | "rewritten"
  | "verified"
  | "approved"
  | "published"

export interface CollectionManifest {
  schemaVersion: 1
  id: string
  title: string
  description: string
  source: {
    rootWikiToken: string
    directoryWikiToken: string
    spaceId: string
  }
  publicationState: PublicationState
  navigationEnabled: boolean
  updatedAt: string
  volumes: Array<{ id: string; title: string }>
  chapters: ChapterManifestEntry[]
}

export interface ChapterManifestEntry {
  order: number
  volumeId: string
  slug: string
  title: string
  sourceWikiToken: string | null
  sourceRevision: number | null
  approvedRevision: number | null
  contentHash: string | null
  status: ChapterStatus
}

export type ContentBlock =
  | { type: "heading"; level: 2 | 3; id: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; language: string; code: string; caption?: string }
  | { type: "image"; src: string; alt: string; caption: string; sourceLabel: string; sourceUrl?: string }
  | { type: "callout"; tone: "key" | "warning" | "practice"; title: string; blocks: ContentBlock[] }
  | { type: "grid"; columns: Array<{ title?: string; blocks: ContentBlock[] }> }
  | { type: "table"; headers: string[]; rows: string[][]; caption?: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string; citation?: string }

export interface ChapterDocument {
  schemaVersion: 1
  slug: string
  title: string
  summary: string
  directAnswer: string
  difficulty: "入门" | "进阶" | "高级"
  readingMinutes: number
  tags: string[]
  sourceWikiToken: string
  sourceRevision: number
  approvedRevision: number
  contentHash: string
  publishedAt: string
  updatedAt: string
  quality: { overall: number; accuracy: number; depth: number }
  blocks: ContentBlock[]
  sources: Array<{ label: string; url: string }>
}
