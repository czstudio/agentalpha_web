import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, Calendar, Clock3, ExternalLink } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import type { Components } from "react-markdown"
import { isValidElement, type ReactNode } from "react"
import { Navigation } from "@/components/navigation"
import {
  getAllArticles,
  getAdjacentArticles,
  getArticle,
  getArticleHeadings,
  slugifyHeading,
  type ArticleHeading,
} from "@/lib/articles"

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllArticles().map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return {}
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/articles/${article.slug}` },
  }
}

function headingText(children: ReactNode): string {
  const values = Array.isArray(children) ? children : [children]
  return values
    .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : ""))
    .join("")
}

function flattenText(value: ReactNode): string {
  const out: string[] = []
  const walk = (node: ReactNode) => {
    if (typeof node === "string" || typeof node === "number") out.push(String(node))
    else if (isValidElement(node)) walk((node.props as { children?: ReactNode }).children)
    else if (Array.isArray(node)) node.forEach(walk)
  }
  walk(value)
  return out.join("")
}

function createMarkdownComponents(headings: ArticleHeading[]): Components {
  let headingCursor = 0
  return {
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
    a({ children, href }) {
      return (
        <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
          {children}
        </a>
      )
    },
  }
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()
  const { previous, next } = getAdjacentArticles(slug)
  const headings = getArticleHeadings(article.content)

  return (
    <>
      <Navigation />
      <main className="aa-notes aa-note-detail">
        <article className="aa-notes-shell aa-note-article">
          <nav className="aa-note-breadcrumb">
            <Link href="/articles">
              <ArrowLeft aria-hidden /> 全部文章
            </Link>
            {article.source && (
              <a href={article.source} target="_blank" rel="noreferrer" className="aa-note-source-link">
                公众号原文 <ExternalLink aria-hidden />
              </a>
            )}
          </nav>

          <header className="aa-note-header">
            <div className="aa-note-meta">
              <span className="aa-note-series-pill">{article.category}</span>
              <span className="aa-note-minutes">
                <Calendar aria-hidden /> {article.date}
              </span>
              <span className="aa-note-minutes">
                <Clock3 aria-hidden /> {article.minutes} 分钟
              </span>
            </div>
            <h1>{article.title}</h1>
            <p className="aa-note-lede">{article.excerpt}</p>
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
                  {article.content}
                </ReactMarkdown>
              </div>

              <aside className="aa-note-promo">
                <p className="aa-note-promo-kicker">AgentAlpha 大模型 Agent 训练营</p>
                <p className="aa-note-promo-text">
                  一个人刷题，容易停在「背下来了」。来社区把这篇里的问题做成项目，每周有人陪你互相追问。
                </p>
                <Link href="/#join" className="aa-note-promo-cta">
                  了解训练营 <ArrowRight aria-hidden />
                </Link>
              </aside>

              <nav className="aa-note-pager">
                {previous ? (
                  <Link href={`/articles/${previous.slug}`} className="aa-note-pager-card">
                    <span className="aa-note-pager-label">
                      <ArrowLeft aria-hidden /> 上一篇
                    </span>
                    <span className="aa-note-pager-title">{previous.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {next ? (
                  <Link href={`/articles/${next.slug}`} className="aa-note-pager-card aa-note-pager-card--next">
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
