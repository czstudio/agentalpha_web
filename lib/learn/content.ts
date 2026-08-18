import fs from "node:fs"
import path from "node:path"
import manifestJson from "@/content/learn/claude-code/manifest.json"
import type { ChapterDocument, ChapterManifestEntry, CollectionManifest } from "./types"

const contentRoot = path.join(process.cwd(), "content", "learn", "claude-code")

export const claudeCodeManifest = manifestJson as CollectionManifest

export function isCollectionPublic() {
  return claudeCodeManifest.publicationState === "published"
}

export function getApprovedEntries(): ChapterManifestEntry[] {
  return claudeCodeManifest.chapters
    .filter((chapter) => chapter.approvedRevision !== null && ["approved", "published"].includes(chapter.status))
    .sort((a, b) => a.order - b.order)
}

export function getChapter(slug: string): ChapterDocument | null {
  const entry = getApprovedEntries().find((chapter) => chapter.slug === slug)
  if (!entry) return null

  const file = path.join(contentRoot, "chapters", `${slug}.json`)
  if (!fs.existsSync(file)) {
    throw new Error(`Approved chapter snapshot is missing: ${slug}`)
  }
  const chapter = JSON.parse(fs.readFileSync(file, "utf8")) as ChapterDocument
  if (chapter.approvedRevision !== entry.approvedRevision || chapter.contentHash !== entry.contentHash) {
    throw new Error(`Approved chapter lock mismatch: ${slug}`)
  }
  return chapter
}

export function getAllApprovedChapters(): ChapterDocument[] {
  return getApprovedEntries().map((entry) => {
    const chapter = getChapter(entry.slug)
    if (!chapter) throw new Error(`Unable to load approved chapter: ${entry.slug}`)
    return chapter
  })
}

export function getAdjacentChapters(slug: string) {
  const entries = getApprovedEntries()
  const index = entries.findIndex((chapter) => chapter.slug === slug)
  return {
    previous: index > 0 ? entries[index - 1] : null,
    next: index >= 0 && index < entries.length - 1 ? entries[index + 1] : null,
  }
}
