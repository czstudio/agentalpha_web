import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { ChapterRenderer } from "@/components/learn/chapter-renderer"
import { claudeCodeManifest, getApprovedEntries, getChapter, isCollectionPublic } from "@/lib/learn/content"

interface ChapterPageProps {
  params: Promise<{ slug: string }>
}

function getManifestEntry(slug: string) {
  return claudeCodeManifest.chapters.find((chapter) => chapter.slug === slug) ?? null
}

export function generateStaticParams() {
  return getApprovedEntries().map((chapter) => ({ slug: chapter.slug }))
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { slug } = await params
  const entry = getManifestEntry(slug)
  if (!entry) return {}
  const approved = isCollectionPublic() && entry.approvedRevision !== null && ["approved", "published"].includes(entry.status)
  return {
    title: `${entry.title} · ${claudeCodeManifest.title}`,
    description: "Claude Code 章节正文与工程练习。",
    alternates: { canonical: `/learn/claude-code/${slug}` },
    robots: approved ? undefined : { index: false, follow: false },
  }
}

export default async function ClaudeCodeChapterPage({ params }: ChapterPageProps) {
  const { slug } = await params
  const entry = getManifestEntry(slug)
  if (!entry) notFound()

  const approved = isCollectionPublic() && entry.approvedRevision !== null && ["approved", "published"].includes(entry.status)
  if (!approved) {
    return (
      <>
        <Navigation />
        <main className="aa-notes aa-note-detail">
          <article className="aa-notes-shell aa-note-article learn-collection-page">
            <nav className="aa-note-breadcrumb"><Link href="/learn/claude-code"><ArrowLeft aria-hidden /> 返回课程目录</Link></nav>
            <section className="learn-pending-card" aria-labelledby="chapter-pending-title">
              <div className="learn-pending-icon"><BookOpen aria-hidden /></div>
              <div>
                <p className="aa-notes-kicker">章节整理中 · 暂未开放</p>
                <h1 id="chapter-pending-title">{entry.title}</h1>
                <p>这章还在核对资料、例子和引用。正文通过审核后会从这里开放；当前不会展示未审核草稿。</p>
                <Link href="/learn/claude-code" className="aa-note-promo-cta learn-back-link">回到课程目录 <ArrowRight aria-hidden /></Link>
              </div>
            </section>
          </article>
        </main>
      </>
    )
  }

  const chapter = getChapter(slug)
  if (!chapter) notFound()

  return (
    <>
      <Navigation />
      <main className="aa-notes aa-note-detail">
        <article className="aa-notes-shell aa-note-article learn-chapter-page">
          <nav className="aa-note-breadcrumb"><Link href="/learn/claude-code"><ArrowLeft aria-hidden /> 返回课程目录</Link></nav>
          <header className="learn-chapter-header">
            <p className="aa-notes-kicker">Claude Code · 第 {entry.order} 章</p>
            <h1>{chapter.title}</h1>
            <p>{chapter.summary}</p>
            <div className="learn-chapter-meta"><span>{chapter.difficulty}</span><span>{chapter.readingMinutes} 分钟</span>{chapter.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </header>
          <div className="learn-chapter-prose"><ChapterRenderer blocks={chapter.blocks} /></div>
          <section className="learn-sources" aria-labelledby="learn-sources-title">
            <h2 id="learn-sources-title">资料来源</h2>
            <ul>{chapter.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul>
          </section>
        </article>
      </main>
    </>
  )
}
