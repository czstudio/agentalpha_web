import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import type { Components } from "react-markdown"
import { isValidElement, type ReactNode } from "react"
import {
  getAdjacentInterview,
  getAllInterview,
  getInterview,
  getInterviewHeadings,
  hasCover,
  paperFigure,
} from "@/lib/interview"

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllInterview().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getInterview(slug)
  if (!post) return {}
  const description = `「${post.question}」怎么答？本文按面试官视角拆解：${post.excerpt}`.slice(0, 140)
  return {
    title: `${post.title} | AgentAlpha 面试题库`,
    description,
    alternates: { canonical: `/interview/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      images: hasCover(post.slug) ? [`/images/interview/${post.slug}/cover.png`] : undefined,
    },
  }
}

function flattenText(value: ReactNode): string {
  if (value == null || typeof value === "boolean") return ""
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (Array.isArray(value)) return value.map(flattenText).join("")
  if (isValidElement<{ children?: ReactNode }>(value)) return flattenText(value.props.children)
  return ""
}

function createMarkdownComponents(): Components {
  let h2Cursor = 0
  return {
    h2({ children, ...props }) {
      const no = String(++h2Cursor).padStart(2, "0")
      // 正文标题自带「一、二、」编号时剥掉，避免与样式序号叠用
      const arr = Array.isArray(children) ? [...children] : [children]
      if (typeof arr[0] === "string") {
        arr[0] = arr[0].replace(/^(第\s*)?[0-9一二三四五六七八九十]{1,3}\s*[、.．]\s*/, "")
      }
      return (
        <h2 {...props} data-no={no}>
          {arr}
        </h2>
      )
    },
    p({ children, ...props }) {
      // 图片段落：段落里只有一张图 + 一句图注时，渲染成 白卡 + 卡内图注（design-spec 4.1）
      const arr = Array.isArray(children) ? [...children] : [children]
      const imgIdx = arr.findIndex(
        (c) => isValidElement(c) && (c as { props?: { className?: string } }).props?.className === "ivu-fig",
      )
      if (imgIdx !== -1) {
        const rest = arr.filter((c, i) => i !== imgIdx && typeof c === "string" && c.trim())
        if (rest.length === 1 && typeof rest[0] === "string") {
          return (
            <span className="ivu-fig">
              {arr[imgIdx]}
              <span className="ivu-figcap">{rest[0].trim()}</span>
            </span>
          )
        }
      }
      return <p {...props}>{children}</p>
    },
    img({ src, alt }) {
      if (typeof src !== "string") return null
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <span className="ivu-fig">
          <img src={src} alt={alt || ""} loading="lazy" />
        </span>
      )
    },
    a({ children, href }) {
      const external = typeof href === "string" && /^https?:/.test(href)
      return (
        <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener" : undefined}>
          {children}
        </a>
      )
    },
  }
}

function PaperCard({ slug, paper }: { slug: string; paper: { arxiv: string; title: string; why: string; figure?: string } }) {
  const figure = paperFigure(slug, paper.arxiv)
  const absUrl = `https://arxiv.org/abs/${paper.arxiv}`
  return (
    <aside className="ivu-paper">
      <a className="ivu-paper-head" href={absUrl} target="_blank" rel="noopener">
        <span className="ivu-paper-badge">arXiv:{paper.arxiv}</span>
        <span className="ivu-paper-title">{paper.title}</span>
        {paper.figure ? <span className="ivu-paper-fig">{paper.figure}</span> : null}
      </a>
      {figure ? (
        <div className="ivu-paper-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={figure} alt={`${paper.title} ${paper.figure || ""}`} loading="lazy" />
        </div>
      ) : null}
      <div className="ivu-paper-body">
        <p className="ivu-paper-why">{paper.why}</p>
        <a className="ivu-paper-link" href={absUrl} target="_blank" rel="noopener">
          查看原文 ↗
        </a>
      </div>
    </aside>
  )
}

export default async function InterviewDetailPage({ params }: PageProps) {
  const { slug } = await params
  const post = getInterview(slug)
  if (!post) notFound()
  const { previous, next } = getAdjacentInterview(slug)
  // 「60 秒回答骨架」章节拆出为结论卡，目录只统计主文
  const ANSWER_MARK = "## 60 秒回答骨架"
  const answerIdx0 = post.content.lastIndexOf(ANSWER_MARK)
  const headings = getInterviewHeadings(
    answerIdx0 === -1 ? post.content : post.content.slice(0, answerIdx0),
  )
  const cover = hasCover(post.slug)
  // 非面试体文章（AgentAlpha 特稿）question 兜底成了标题，此时不渲染题卡
  const showQuestion = post.question && post.question !== post.title
  // 自动摘要是正文首段时不重复渲染导语
  const lede =
    post.excerpt && !post.content.slice(0, 600).includes(post.excerpt.slice(0, 24))
      ? post.excerpt
      : null
  const mainContent =
    answerIdx0 === -1 ? post.content : post.content.slice(0, answerIdx0).trim()
  const answerContent =
    answerIdx0 === -1
      ? null
      : post.content
          .slice(answerIdx0 + ANSWER_MARK.length)
          .replace(/^\s*>?\s*先给一句话结论[^\n]*\n/, "")
          .trim()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: cover ? [`https://agentalpha.top/images/interview/${post.slug}/cover.png`] : undefined,
    author: { "@type": "Person", name: post.author },
    ...(post.papers.length
      ? { about: post.papers.map((p) => ({ "@type": "ScholarlyArticle", name: p.title })) }
      : {}),
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: "https://agentalpha.top" },
      { "@type": "ListItem", position: 2, name: "面试题库", item: "https://agentalpha.top/interview" },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://agentalpha.top/interview/${post.slug}`,
      },
    ],
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {cover ? (
        <figure className="ivu-hero" style={{ margin: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/images/interview/${post.slug}/cover-1600.webp`} alt="" />
        </figure>
      ) : null}

      <div className="ivu-measure ivu-head">
        <div className="ivu-meta">
          <span className="qno">Q{post.no}</span>
          {post.tags.map((tag) => (
            <span key={tag} className="ivu-chip">
              {tag}
            </span>
          ))}
          <span>{post.source}</span>
          <span>约 {post.minutes} 分钟</span>
        </div>
        <h1 className="ivu-h1">{post.title}</h1>
        {lede ? <p className="ivu-lede">{lede}</p> : null}
        <div className="ivu-rule" aria-hidden />
      </div>

      {showQuestion ? (
        <div className="ivu-measure">
          <div className="ivu-question">
            <span className="ivu-question-no" aria-hidden>
              Q{post.no}
            </span>
            <div className="ivu-question-main">
              <div className="ivu-question-label">面试官原题</div>
              <p className="ivu-question-text">{post.question}</p>
              <div className="ivu-question-who">面试官 · Agent 岗面试现场</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="ivu-with-toc">
        <article className="ivu-prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={createMarkdownComponents()}
          >
            {mainContent}
          </ReactMarkdown>

          {answerContent !== null ? (
            <div className="ivu-answer">
              <h2 className="ivu-answer-t" id="answer">
                参考答案要点
              </h2>
              <div className="ivu-answer-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {answerContent}
                </ReactMarkdown>
              </div>
            </div>
          ) : null}

          {post.papers.length ? (
            <section aria-label="延伸阅读 · 论文原文">
              {post.papers.map((paper) => (
                <PaperCard key={paper.arxiv} slug={post.slug} paper={paper} />
              ))}
            </section>
          ) : null}

          <div className="ivu-endmark">—— 本场面试完 ——</div>
        </article>

        {headings.length >= 3 ? (
          <aside className="ivu-toc" aria-label="本篇目录">
            <div className="ivu-toc-t">本篇目录</div>
            {headings.map((heading) => (
              <a key={heading.id} href={`#${heading.id}`}>
                {heading.title}
              </a>
            ))}
          </aside>
        ) : null}
      </div>

      <div className="ivu-measure">
        <div className="ivu-pn">
          {previous ? (
            <Link href={`/interview/${previous.slug}`} className="prev">
              <span className="dir">← 上一篇 Q{previous.no}</span>
              {previous.title}
            </Link>
          ) : (
            <Link href="/interview" className="prev">
              <span className="dir">← </span>回到题库列表
            </Link>
          )}
          {next ? (
            <Link href={`/interview/${next.slug}`} className="next">
              <span className="dir">下一篇 Q{next.no} →</span>
              {next.title}
            </Link>
          ) : (
            <Link href="/interview" className="next">
              <span className="dir">→</span>回到题库列表
            </Link>
          )}
        </div>

        <div className="ivu-cta">
          <p className="ivu-cta-text">
            <b>把题练成肌肉记忆。</b>公众号「吴师兄学大模型」每周更新面试真题拆解；想系统上手 Agent 工程，看 AgentAlpha 训练营。
          </p>
          <div className="ivu-cta-actions">
            <Link href="/learn" className="ivu-btn ivu-btn-primary">
              了解训练营
            </Link>
            <Link href="/notes" className="ivu-btn ivu-btn-ghost">
              配套知识笔记
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
