import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowRight, BookOpen, Clock3 } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { claudeCodeManifest, getApprovedEntries } from "@/lib/learn/content"

export const metadata: Metadata = {
  title: claudeCodeManifest.title,
  description: claudeCodeManifest.description,
  alternates: { canonical: "/learn/claude-code" },
  robots: { index: false, follow: false },
}

export default function ClaudeCodeCollectionPage() {
  const approvedCount = getApprovedEntries().length

  return (
    <>
      <Navigation />
      <main className="aa-notes aa-note-detail">
        <article className="aa-notes-shell aa-note-article learn-collection-page">
          <nav className="aa-note-breadcrumb">
            <Link href="/notes"><ArrowLeft aria-hidden /> 返回面试笔记</Link>
          </nav>
          <header className="learn-collection-header">
            <p className="aa-notes-kicker">Claude Code · 课程目录</p>
            <h1>{claudeCodeManifest.title}</h1>
            <p>{claudeCodeManifest.description}</p>
          </header>
          <section className="learn-pending-card" aria-labelledby="learn-pending-title">
            <div className="learn-pending-icon"><BookOpen aria-hidden /></div>
            <div>
              <p className="aa-notes-kicker">正文正在整理</p>
              <h2 id="learn-pending-title">目录先公开，正文逐章核验后再开放。</h2>
              <p>这套课的资料已经收齐，但还没有一章通过最终校对。现在打开章节只会看到整理状态，不会把未审核的草稿当成成品。</p>
              <div className="learn-pending-meta"><span><Clock3 aria-hidden /> {claudeCodeManifest.chapters.length} 章目录</span><span>{approvedCount} 章已发布</span></div>
            </div>
          </section>
          <Link href="/notes#learn-directory" className="aa-note-promo-cta learn-back-link">先读现有面试笔记 <ArrowRight aria-hidden /></Link>
        </article>
      </main>
    </>
  )
}
