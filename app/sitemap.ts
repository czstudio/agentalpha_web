import type { MetadataRoute } from "next"
import { communityDocument } from "@/lib/community/content"
import { getAllNotes } from "@/lib/notes"
import { getAllInterview } from "@/lib/interview"
import { getAllQa } from "@/lib/qa"

export default function sitemap(): MetadataRoute.Sitemap {
  const notes = getAllNotes().map((note) => ({
    url: `https://agentalpha.top/notes/${note.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  const interview = getAllInterview().map((post) => ({
    url: `https://agentalpha.top/interview/${post.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }))

  const qa = getAllQa().map((item) => ({
    url: `https://agentalpha.top/interview/qa/${item.slug}`,
    lastModified: item.updated ? new Date(item.updated) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
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
    {
      url: "https://agentalpha.top/interview",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: "https://agentalpha.top/interview/qa",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: "https://agentalpha.top/learn",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...notes,
    ...interview,
    ...qa,
  ]
}
