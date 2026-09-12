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
            <div className="aa-note-reading-path"><span><Check aria-hidden /> 原理</span><span><Check aria-hidden /> 实现</span><span><Check aria-hidden /> 边界</span><span><GitBranch aria-hidden /> 追问</span></div>
          </header>

          <section className="aa-note-aris" aria-labelledby="aa-note-aris-title">
            <div className="aa-note-aris-head">
              <div>
                <p className="aa-notes-kicker">本篇阅读顺序 · 三遍读法</p>
                <h2 id="aa-note-aris-title">一篇文章，读出三种能力。</h2>
              </div>
              <p>先弄懂它为什么这样工作，再把条件换一换，看方案还能不能站住，最后用代码和证据复盘一遍。顺序固定，读完才知道自己是真的会了，还是只记住了名词。</p>
            </div>
            <div className="aa-note-aris-grid">
              <article>
                <span>01 / 基础知识</span>
                <strong>先回答“它为什么这样工作”</strong>
                <p>沿着直觉、公式和边界读正文，看到变量就问输入、状态、复杂度分别是什么。</p>
              </article>
              <article>
                <span>02 / 高频追问</span>
                <strong>再回答“条件变了怎么办”</strong>
                <p>把面试官的追问当作小型设计评审：更大流量、更少上下文、外部失败或安全约束出现时，局部如何重算。</p>
              </article>
              <article>
                <span>03 / 从零实现</span>
                <strong>{implementationFocus}</strong>
                <p>沿代码、表格和证据卡复盘，最后用文末的 60 秒回答确认自己没有只记住名词。</p>
              </article>
            </div>
          </section>

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
              <div className="aa-note-diagram" aria-label="本篇阅读框架"><div><b>问题</b><span>面试官到底在判断什么</span></div><i>→</i><div><b>机制</b><span>系统如何工作</span></div><i>→</i><div><b>证据</b><span>代码、指标与取舍</span></div><i>→</i><div><b>表达</b><span>30 秒回答骨架</span></div></div>

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
                  想把这道题真正讲透？和社区里的研究者、工程师一起，用实战项目把答案变成自己的判断。
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
