import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Clock3, GitBranch } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"
import { Navigation } from "@/components/navigation"
import { getAdjacentNotes, getAllNotes, getNote } from "@/lib/notes"

interface NotePageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllNotes().map((note) => ({ slug: note.slug }))
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params
  const note = getNote(slug)
  if (!note) return {}
  return {
    title: note.title,
    description: note.excerpt,
    alternates: { canonical: `/notes/${note.slug}` },
  }
}

const markdownComponents: Components = {
  p({ children, ...props }) {
    const arr = Array.isArray(children) ? [...children] : [children]
    const first = arr[0]
    if (typeof first === "string") {
      const match = first.match(/^(👔|🙋‍♂️|🙋)\s*(\S+)\s*([\s\S]*)$/)
      if (match) {
        const kind = match[1] === "👔" ? "interviewer" : "candidate"
        const rest = match[3].trim()
        const label = `${match[1]} ${match[2]}`
        // 纯标签段(说话内容在下一段)
        if (!rest && arr.length === 1) {
          return (
            <p className={`note-speaker note-speaker--${kind}`} {...props}>
              {children}
            </p>
          )
        }
        // 标签和内容在同一段:拆成标签 pill + 气泡
        return (
          <div className={`note-dialogue note-dialogue--${kind}`}>
            <span className={`note-speaker note-speaker--${kind}`}>{label}</span>
            <p {...props}>{[rest, ...arr.slice(1)]}</p>
          </div>
        )
      }
    }
    return <p {...props}>{children}</p>
  },
}

export default async function NoteDetailPage({ params }: NotePageProps) {
  const { slug } = await params
  const note = getNote(slug)
  if (!note) notFound()
  const { previous, next } = getAdjacentNotes(slug)

  return (
    <>
      <Navigation />
      <main className="aa-notes aa-note-detail">
        <article className="aa-notes-shell aa-note-article">
          <nav className="aa-note-breadcrumb">
            <Link href="/notes">
              <ArrowLeft aria-hidden /> 全部笔记
            </Link>
          </nav>

          <header className="aa-note-header">
            <div className="aa-note-meta">
              <span className={`aa-note-series-pill aa-note-series-pill--${note.seriesNo}`}>
                {note.series}
              </span>
              <span className="aa-note-no">{note.number}</span>
              <span className="aa-note-minutes">
                <Clock3 aria-hidden /> {note.minutes} 分钟
              </span>
            </div>
            <h1>{note.title}</h1>
            <p className="aa-note-lede">{note.excerpt}</p>
            <div className="aa-note-reading-path"><span><Check aria-hidden /> 原理</span><span><Check aria-hidden /> 实现</span><span><Check aria-hidden /> 边界</span><span><GitBranch aria-hidden /> 追问</span></div>
          </header>

          <div className="aa-note-diagram" aria-label="本篇阅读框架"><div><b>问题</b><span>面试官到底在判断什么</span></div><i>→</i><div><b>机制</b><span>系统如何工作</span></div><i>→</i><div><b>证据</b><span>代码、指标与取舍</span></div><i>→</i><div><b>表达</b><span>30 秒回答骨架</span></div></div>

          <div className="note-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {note.content}
            </ReactMarkdown>
          </div>

          <aside className="aa-note-promo">
            <p className="aa-note-promo-kicker">AgentAlpha 大模型 Agent 训练营</p>
            <p className="aa-note-promo-text">
              想把这道题真正讲透?和社区里的研究者、工程师一起,用实战项目把答案变成自己的系统直觉。
            </p>
            <Link href="/#join" className="aa-note-promo-cta">
              了解训练营 <ArrowRight aria-hidden />
            </Link>
          </aside>

          <nav className="aa-note-pager">
            {previous ? (
              <Link href={`/notes/${previous.slug}`} className="aa-note-pager-card">
                <span className="aa-note-pager-label">
                  <ArrowLeft aria-hidden /> 上一篇
                </span>
                <span className="aa-note-pager-title">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/notes/${next.slug}`} className="aa-note-pager-card aa-note-pager-card--next">
                <span className="aa-note-pager-label">
                  下一篇 <ArrowRight aria-hidden />
                </span>
                <span className="aa-note-pager-title">{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>
      </main>
    </>
  )
}
