import type { MetadataRoute } from "next"
import { communityDocument } from "@/lib/community/content"

export default function sitemap(): MetadataRoute.Sitemap {
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
  ]
}
