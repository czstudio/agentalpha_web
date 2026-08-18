import type { MetadataRoute } from "next"
import { communityDocument } from "@/lib/community/content"
import { getAllNotes } from "@/lib/notes"

export default function sitemap(): MetadataRoute.Sitemap {
  const notes = getAllNotes().map((note) => ({
    url: `https://agentalpha.top/notes/${note.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  return [
    {
      url: "https://agentalpha.top",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://agentalpha.top/community",
      lastModified: new Date(communityDocument.syncedAt),
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: "https://agentalpha.top/notes",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...notes,
  ]
}
