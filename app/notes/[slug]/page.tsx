import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Clock3, GitBranch } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import type { Components } from "react-markdown"
import { isValidElement, type ReactNode } from "react"
import { Navigation } from "@/components/navigation"
import { getAdjacentNotes, getAllNotes, getNote, getNoteHeadings, slugifyHeading, type NoteHeading } from "@/lib/notes"

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

function headingText(children: ReactNode): string {
  const values = Array.isArray(children) ? children : [children]
  return values
    .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
    .join("")
}

function flattenText(value: ReactNode): string {
  if (value == null || typeof value === "boolean") return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (Array.isArray(value)) return value.map(flattenText).join("")
  if (isValidElement<{ children?: ReactNode }>(value)) return flattenText(value.props.children)
  return ""
}

/**
 * The note corpus also contains the conventional LaTeX \[...\] / \(...\)
 * delimiters. remark-math intentionally keeps its markdown surface to $ and
 * $$, so normalize those delimiters before parsing rather than asking every
 * author to rewrite an already useful formula.
 */
function normalizeMathDelimiters(markdown: string): string {
  return markdown
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, expression: string) => `$$\n${expression.trim()}\n$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, expression: string) => `$${expression}$`)
}

function createMarkdownComponents(headings: NoteHeading[]): Components {
  let headingCursor = 0
  return {
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
    h2({ children, ...props }) {
      const title = headingText(children)
      const current = headings[headingCursor++]
      return <h2 id={current?.id || slugifyHeading(title)} {...props}>{children}</h2>
    },
    h3({ children, ...props }) {
      const title = headingText(children)
      const current = headings[headingCursor++]
      return <h3 id={current?.id || slugifyHeading(title)} {...props}>{children}</h3>
    },
    table({ children }) {
      return <div className="note-table-wrap"><table>{children}</table></div>
    },
    pre({ children, ...props }) {
      const codeText = flattenText(children)
      const lineCount = codeText.split("\n").length
      const block = <pre {...props}>{children}</pre>
      if (lineCount < 28 && codeText.length < 1200) return block
      return (
        <details className="note-code-card">
          <summary>展开代码 · {lineCount} 行</summary>
          {block}
        </details>
      )
    },
  }
}

export default async function NoteDetailPage({ params }: NotePageProps) {
  const { slug } = await params
  const note = getNote(slug)
  if (!note) notFound()
  const { previous, next } = getAdjacentNotes(slug)
  const headings = getNoteHeadings(note.content)
  const implementationFocus = note.series === "RAG"
    ? "把召回、证据与版本过滤做成可复跑实验"
    : note.series === "工具调用" || note.series === "评测"
      ? "把动作、回执与失败边界写进最小实现"
      : note.series === "LLM 基础" || note.series === "LLM 训练"
        ? "用公式、张量形状和基线代码解释机制"
        : "把状态、约束和结果落到一个能验收的闭环"

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
          </header>

          <div className="aa-note-reading-grid">
            <aside className="aa-note-toc" aria-label="本篇目录">
              <p>本篇目录</p>
              <ol>
                {headings.map((heading) => (
                  <li key={heading.id} className={heading.level === 3 ? "aa-note-toc-h3" : undefined}>
                    <a href={`#${heading.id}`}>{heading.title}</a>
                  </li>
                ))}
              </ol>
            </aside>

            <div className="aa-note-reading-main">
              <div className="note-prose">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={createMarkdownComponents(headings)}
                >
                  {normalizeMathDelimiters(note.content)}
                </ReactMarkdown>
              </div>

              <aside className="aa-note-promo">
                <p className="aa-note-promo-kicker">AgentAlpha 大模型 Agent 训练营</p>
                <p className="aa-note-promo-text">
                  一个人刷题，容易停在「背下来了」。来社区把这道题做成项目，每周有人陪你互相追问。
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
            </div>
          </div>
        </article>
      </main>
    </>
  )
}
