import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { CrossLinks } from "@/components/cross-link"
import { qaForMianjing } from "@/lib/crosslink"
import { getMianjing, getMianjingList } from "@/lib/mianjing"
import { getNoteHeadings, slugifyHeading } from "@/lib/notes"
import { ReadingExtras } from "@/components/mianjing/reading-extras"
import "../detail-enhance.css"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"
import type { ReactNode } from "react"

interface MianjingPageProps {
  params: Promise<{ slug: string }>
}

/** 公司展示名 → 徽章配色 key（detail-enhance.css 的 data-co 属性） */
const COMPANY_KEYS: Record<string, string> = {
  字节跳动: "bytedance",
  阿里巴巴: "alibaba",
  腾讯: "tencent",
  美团: "meituan",
  百度: "baidu",
  京东: "jd",
  "月之暗面（Kimi）": "moonshot",
  小米: "xiaomi",
  快手: "kuaishou",
  滴滴: "didi",
  拼多多: "pdd",
  抖音: "douyin",
}

function companyKey(name: string): string {
  return COMPANY_KEYS[name] ?? ""
}

export function generateStaticParams() {
  return getMianjingList().map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({ params }: MianjingPageProps): Promise<Metadata> {
  const { slug } = await params
  const doc = getMianjing(slug)
  if (!doc) return {}
  return {
    title: doc.title,
    description: doc.excerpt,
    alternates: { canonical: `/mianjing/${doc.slug}` },
  }
}

function headingText(children: ReactNode): string {
  const values = Array.isArray(children) ? children : [children]
  return values.map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : "")).join("")
}

function createMarkdownComponents(headings: { id: string; title: string }[]): Components {
  let cursor = 0
  return {
    h2({ children, ...props }) {
      const current = headings[cursor++]
      const id = current?.id || slugifyHeading(headingText(children))
      return (
        <h2 id={id} {...props}>
          {children}
          <a className="mj-anchor" href={`#${id}`} aria-label="锚点链接">#</a>
        </h2>
      )
    },
    h3({ children, ...props }) {
      const current = headings[cursor++]
      return <h3 id={current?.id || slugifyHeading(headingText(children))} {...props}>{children}</h3>
    },
    table({ children }) {
      return <div className="mj-table-wrap"><table>{children}</table></div>
    },
    blockquote({ children }) {
      return <div className="mj-callout">{children}</div>
    },
  }
}

export default async function MianjingDetailPage({ params }: MianjingPageProps) {
  const { slug } = await params
  const doc = getMianjing(slug)
  if (!doc) notFound()
  const headings = getNoteHeadings(doc.content)
  const { companySlug, items: xQaItems } = qaForMianjing(doc)
  const xQaLinks = [
    ...(companySlug
      ? [
          {
            href: `/interview/company/${companySlug}`,
            label: `刷${doc.company}真题（50 题）`,
            note: "按厂聚合 · 含考点映射",
          },
        ]
      : []),
    ...xQaItems.map((q) => ({
      href: `/interview/qa/${q.slug}`,
      label: q.question,
      note: q.oneLine.slice(0, 40) + (q.oneLine.length > 40 ? "…" : ""),
    })),
  ]

  return (
    <>
      <Navigation />
      <ReadingExtras />
      <main className="aa-notes aa-note-detail mj-page">
        <article className="aa-notes-shell aa-note-article">
          <nav className="aa-note-breadcrumb">
            <Link href="/mianjing">
              <ArrowLeft aria-hidden /> 全部面经
            </Link>
          </nav>

          <header className="aa-note-header mj-header">
            <div className="aa-note-meta">
              <span className="mj-company-pill" data-co={companyKey(doc.company)}>{doc.company}</span>
              <span className="mj-round">{doc.round}</span>
              <span className="aa-note-minutes">
                <Clock3 aria-hidden /> {doc.minutes} 分钟读完
              </span>
            </div>
            <h1>{doc.title}</h1>
            <p className="aa-note-lede">{doc.role}</p>
            <div className="mj-tags">
              {doc.tags.map((tag) => (
                <span key={tag} className="mj-tag">{tag}</span>
              ))}
            </div>
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
              <div className="note-prose mj-prose">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={createMarkdownComponents(headings)}
                >
                  {doc.content}
                </ReactMarkdown>
              </div>

              <aside className="aa-note-promo">
                <p className="aa-note-promo-kicker">AgentAlpha 大模型 Agent 训练营</p>
                <p className="aa-note-promo-text">
                  面经里的追问，只有在自己项目里遇到过才算真的会。来社区，每周有人陪你把项目做到能拿出手。
                </p>
                <Link href="/#join" className="aa-note-promo-cta">
                  了解训练营 <ArrowRight aria-hidden />
                </Link>
              </aside>

              <CrossLinks title="面经对应的真题" variant="mianjing" items={xQaLinks} />

              <nav className="aa-note-pager">
                <span />
                <span className="aa-note-pager-card aa-note-pager-card--next mj-pager-more">
                  <span className="aa-note-pager-label">更多面经 <ArrowRight aria-hidden /></span>
                  <span className="aa-note-pager-title">整理中，持续更新</span>
                </span>
              </nav>
            </div>
          </div>
        </article>
      </main>
    </>
  )
}
