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
  getCategory,
  getInterview,
  getInterviewHeadings,
  getRelatedByCategory,
  hasCover,
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
      images: hasCover(post.slug) ? [`/images/interview/${post.slug}/cover-og.jpg`] : undefined,
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
      // 笔录体对话：👔 面试官 / 🙋 候选人 → 面试官竖线 / 候选人缩进
      const arr0 = Array.isArray(children) ? [...children] : [children]
      const head = arr0[0]
      if (typeof head === "string") {
        const m = head.match(/^(👔|🙋(?:‍♂️)?)\s*(?:\*\*)?(面试官|我)(\*\*)?[：:、]?\s*([\s\S]*)$/)
        if (m) {
          const isInterviewer = m[1].startsWith("👔")
          const cls = isInterviewer ? "ivu-u" : "ivu-c"
          return (
            <p className={cls}>
              <span className="ivu-role">{isInterviewer ? "面试官" : "候选人"}</span>
              {[m[4], ...arr0.slice(1)]}
            </p>
          )
        }
      }
      // 图片段落：段落里只有一张图 + 一句图注时，渲染成 白卡 + 卡内图注（design-spec 4.1）
      const arr = Array.isArray(children) ? [...children] : [children]
      const imgIdx = arr.findIndex(
        (c) =>
          isValidElement(c) &&
          typeof (c as { props?: { className?: string } }).props?.className === "string" &&
          ((c as { props?: { className?: string } }).props?.className ?? "").includes("ivu-fig"),
      )
      if (imgIdx !== -1) {
        const rest = arr.filter((c, i) => i !== imgIdx && typeof c === "string" && c.trim())
        if (rest.length === 1 && typeof rest[0] === "string") {
          const isMeme = ((arr[imgIdx] as { props?: { className?: string } }).props?.className ?? "").includes("ivu-meme")
          return (
            <span className={isMeme ? "ivu-fig ivu-meme" : "ivu-fig"}>
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
      const isMeme = src.includes("/meme-")
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <span className={isMeme ? "ivu-fig ivu-meme" : "ivu-fig"}>
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

/** 站内 / 官方文档延伸阅读卡（E3）。slug → [{name, href, why, kind}] */
interface ExtLink {
  name: string
  href: string
  why: string
  kind: "站内" | "DOC"
}
const EXT_LINKS: Record<string, ExtLink[]> = {}

function ExtLinkCard({ link }: { link: ExtLink }) {
  const external = /^https?:/.test(link.href)
  return (
    <aside className="ivu-link">
      <a
        className="ivu-link-head"
        href={link.href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener" : undefined}
      >
        <span className="ivu-link-badge">{link.kind}</span>
        <span className="ivu-link-title">{link.name}</span>
      </a>
      <div className="ivu-link-body">
        <p className="ivu-link-why">{link.why}</p>
        {external ? (
          <a className="ivu-link-go" href={link.href} target="_blank" rel="noopener">
            打开原文 ↗
          </a>
        ) : (
          <Link className="ivu-link-go" href={link.href}>
            站内阅读 →
          </Link>
        )}
      </div>
    </aside>
  )
}

function PaperCard({ slug, paper }: { slug: string; paper: { arxiv: string; title: string; why: string; figure?: string } }) {
  const absUrl = `https://arxiv.org/abs/${paper.arxiv}`
  return (
    <aside className="ivu-paper">
      <a className="ivu-paper-head" href={absUrl} target="_blank" rel="noopener">
        <span className="ivu-paper-badge">arXiv:{paper.arxiv}</span>
        <span className="ivu-paper-title">{paper.title}</span>
        {paper.figure ? <span className="ivu-paper-fig">{paper.figure}</span> : null}
      </a>
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
  const category = post.category ? getCategory(post.category) : null
  const siblings = getRelatedByCategory(slug, 6)
  const extLinks = EXT_LINKS[slug] || []
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
    image: cover ? [`https://agentalpha.top/images/interview/${post.slug}/cover-og.jpg`] : undefined,
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
      { "@type": "ListItem", position: 2, name: "面试间", item: "https://agentalpha.top/interview" },
      ...(category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: category.name,
              item: `https://agentalpha.top/interview/category/${category.cat}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: category ? 4 : 3,
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
          <img src={`/images/interview/${post.slug}/cover-800.webp`} alt="" />
        </figure>
      ) : null}

      <div className="ivu-measure">
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          {category ? (
            <>
              <span className="sep">/</span>
              <Link href={`/interview/category/${category.cat}`}>{category.name}</Link>
            </>
          ) : null}
          <span className="sep">/</span>
          <span className="cur">Q{post.no}</span>
        </nav>
      </div>

      <div className="ivu-measure ivu-head">
        <div className="ivu-meta">
          <span className="qno">Q{post.no}</span>
          {category ? (
            <Link
              href={`/interview/category/${category.cat}`}
              className="ivu-chip"
              style={{
                background: "var(--brand-tint)",
                color: "var(--brand-deep)",
                textDecoration: "none",
              }}
            >
              {category.name}
            </Link>
          ) : null}
          {post.tags.map((tag) => (
            <span key={tag} className="ivu-chip">
              {tag}
            </span>
          ))}
          <span>{post.source}</span>
          <span>约 {post.minutes} 分钟</span>
          {post.updated ? <span className="ivu-updated">更新 {post.updated}</span> : null}
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

          {post.works.length ? (
            <section aria-label="社区成果 · 开源与论文">
              {post.works.map((work) => (
                <aside className="ivu-work" key={work.url}>
                  <a className="ivu-work-head" href={work.url} target="_blank" rel="noopener noreferrer">
                    <span className="ivu-work-badge">{work.badge}</span>
                    <span className="ivu-work-name">{work.name}</span>
                  </a>
                  <div className="ivu-work-body">
                    <p className="ivu-work-desc">{work.desc}</p>
                    <a className="ivu-work-link" href={work.url} target="_blank" rel="noopener noreferrer">
                      前往查看 ↗
                    </a>
                  </div>
                </aside>
              ))}
            </section>
          ) : null}

          {extLinks.length ? (
            <>
              <div className="ivu-links-label">ALSO READ / 延伸阅读</div>
              <section aria-label="延伸阅读 · 站内与文档">
                {extLinks.map((link) => (
                  <ExtLinkCard key={link.href} link={link} />
                ))}
              </section>
            </>
          ) : null}

          <div className="ivu-endmark">—— 本场面试完 ——</div>
        </article>

        {headings.length >= 3 || siblings.length ? (
          <aside className="ivu-rail">
            {headings.length >= 3 ? (
              <div className="ivu-toc" aria-label="本篇目录">
                <div className="ivu-toc-t">本篇目录</div>
                {headings.map((heading) => (
                  <a key={heading.id} href={`#${heading.id}`}>
                    {heading.title}
                  </a>
                ))}
              </div>
            ) : null}

            {siblings.length ? (
              <div className="ivu-sib" aria-label="同分类文章">
                <div className="ivu-sib-t">
                  <span>{category ? category.name : "同分类"}</span>
                  {category ? (
                    <Link href={`/interview/category/${category.cat}`}>全部 →</Link>
                  ) : null}
                </div>
                <div className="ivu-sib-list">
                  {siblings.map((item) => (
                    <Link
                      key={item.slug}
                      href={`/interview/${item.slug}`}
                      className="ivu-sib-item"
                    >
                      <span className="q">{item.no}</span>
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
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
            <b>把题练成肌肉记忆。</b>训练营的作业是开源项目和论文——来社区，有人陪你把这道题做到能拿出手。
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
