import type { MetadataRoute } from "next"
import { communityDocument } from "@/lib/community/content"
import { getAllNotes } from "@/lib/notes"
import { getAllInterview } from "@/lib/interview"
import { getAllQa } from "@/lib/qa"
import { getAllArticles } from "@/lib/articles"
import { getMianjingList } from "@/lib/mianjing"
import { getAllGlossary } from "@/lib/glossary"
import { COMPANIES, getQaByCompany } from "@/lib/companies"
import { TRACKS, getQaByTrack } from "@/lib/tracks"
import { ROADMAPS } from "@/lib/roadmap"
import { getAllJd } from "@/lib/jd"

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

  const articles = getAllArticles().map((a) => ({
    url: `https://agentalpha.top/articles/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }))

  const qa = getAllQa().map((item) => ({
    url: `https://agentalpha.top/interview/qa/${item.slug}`,
    lastModified: item.updated ? new Date(item.updated) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }))

  const mianjing = getMianjingList().map((doc) => ({
    url: `https://agentalpha.top/mianjing/${doc.slug}`,
    lastModified: doc.date ? new Date(doc.date) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))

  const glossary = getAllGlossary().map((item) => ({
    url: `https://agentalpha.top/interview/glossary/${item.slug}`,
    lastModified: item.updated ? new Date(item.updated) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }))

  const companyPages = COMPANIES.filter((c) => getQaByCompany(c.slug).length > 0).map((c) => ({
    url: `https://agentalpha.top/interview/company/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }))

  const trackPages = TRACKS.filter((t) => getQaByTrack(t.slug).length > 0).map((t) => ({
    url: `https://agentalpha.top/interview/track/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
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
      url: "https://agentalpha.top/interview/quiz",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://agentalpha.top/interview/glossary",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://agentalpha.top/interview/jingchang",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://agentalpha.top/roadmap",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...ROADMAPS.map((r) => ({
      url: `https://agentalpha.top/roadmap/${r.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: "https://agentalpha.top/jd",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    ...getAllJd().map((doc) => ({
      url: `https://agentalpha.top/jd/${doc.company}/${doc.slug}`,
      lastModified: doc.updated ? new Date(doc.updated) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: "https://agentalpha.top/tools",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: "https://agentalpha.top/tools/jd-analyzer",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://agentalpha.top/tools/resume",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://agentalpha.top/tools/gap-test",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://agentalpha.top/tools/project-matcher",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: "https://agentalpha.top/tools/mock-interview",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://agentalpha.top/tools/interview-log",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://agentalpha.top/tools/application-tracker",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://agentalpha.top/tools/offer-compare",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.65,
    },
    {
      url: "https://agentalpha.top/learn",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: "https://agentalpha.top/mianjing",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://agentalpha.top/gzh",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    ...notes,
    ...articles,
    ...interview,
    ...qa,
    ...mianjing,
    ...glossary,
    ...companyPages,
    ...trackPages,
  ]
}
