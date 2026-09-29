import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { getAllQa, getQa, getRelatedQa, qaPlainBody } from "@/lib/qa"
import { getCategories, getCategory, getInterview } from "@/lib/interview"
import { getCompany } from "@/lib/companies"
import { CAT_TO_TOOLS } from "@/lib/tools/shared"
import { getQaNeighbors } from "@/lib/learn-path"

const SITE = "https://agentalpha.top"

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllQa().map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const item = getQa(slug)
  if (!item) return {}
  const category = getCategory(item.category)
  const description = `「${item.question}」怎么答？一句话结论：${item.oneLine}`.slice(0, 150)
  const keywords = [
    ...item.tags,
    `${item.question.replace(/[？?]/g, "")} 答案`,
    category?.name || "",
    "Agent 面试题",
    "大模型面试题",
  ].filter(Boolean)
  return {
    title: `${item.question}（附答案）· 面试题库`,
    description,
    keywords,
    alternates: { canonical: `/interview/qa/${item.slug}` },
    openGraph: { title: item.question, description },
  }
}

/** 与深度解析一致的 h2 序号样式：01 / 02 / 03 */
function createQaComponents(): Components {
  let h2Cursor = 0
  return {
    h2({ children, ...props }) {
      const no = String(++h2Cursor).padStart(2, "0")
      return (
        <h2 {...props} data-no={no}>
          {children}
        </h2>
      )
    },
  }
}

export default async function QaDetailPage({ params }: PageProps) {
  const { slug } = await params
  const item = getQa(slug)
  if (!item) notFound()
  const category = getCategory(item.category)
  const related = getRelatedQa(slug, 5)
  const deepPost = item.deep ? getInterview(item.deep) : null
  const neighbors = getQaNeighbors(item.category, slug)

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: qaPlainBody(item) },
      },
    ],
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: "面试题大全", item: `${SITE}/interview/qa` },
      { "@type": "ListItem", position: 4, name: item.question, item: `${SITE}/interview/qa/${item.slug}` },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="ivu-measure">
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <Link href="/interview/qa">题库</Link>
          {category ? (
            <>
              <span className="sep">/</span>
              <Link href={`/interview/qa#${category.cat}`}>{category.name}</Link>
            </>
          ) : null}
        </nav>
      </div>

      <div className="ivu-measure ivu-head">
        <div className="ivu-meta">
          {category ? (
            <Link
              href={`/interview/qa#${category.cat}`}
              className="ivu-chip"
              style={{ background: "var(--brand-tint)", color: "var(--brand-deep)", textDecoration: "none" }}
            >
              {category.name}
            </Link>
          ) : null}
          {item.company
            ? item.company
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean)
                .map((c) => {
                  const company = getCompany(c)
                  return company ? (
                    <Link
                      key={c}
                      href={`/interview/company/${company.slug}`}
                      className="ivu-chip"
                      style={{ textDecoration: "none" }}
                    >
                      {company.name}面经高频
                    </Link>
                  ) : null
                })
            : null}
          {item.tags.map((tag) => (
            <span key={tag} className="ivu-chip">
              {tag}
            </span>
          ))}
          <span>速答 · 约 {item.minutes} 分钟</span>
          {item.updated ? <span className="ivu-updated">更新 {item.updated}</span> : null}
        </div>
        <h1 className="ivu-h1">{item.question}</h1>
      </div>

      <div className="ivu-measure">
        <div className="ivq-oneline">
          <span className="ivq-oneline-label">一句话结论</span>
          <p>{item.oneLine}</p>
        </div>
      </div>

      <div className="ivu-measure">
        <article className="ivu-prose">
          <ReactMarkdown components={createQaComponents()}>{item.content}</ReactMarkdown>

          {deepPost ? (
            <aside className="ivu-link" key={deepPost.slug}>
              <Link className="ivu-link-head" href={`/interview/${deepPost.slug}`}>
                <span className="ivu-link-badge">深度解析</span>
                <span className="ivu-link-title">{deepPost.title}</span>
              </Link>
              <div className="ivu-link-body">
                <p className="ivu-link-why">{deepPost.excerpt}</p>
                <Link className="ivu-link-go" href={`/interview/${deepPost.slug}`}>
                  站内阅读 →
                </Link>
              </div>
            </aside>
          ) : null}

          <div className="ivq-more">
            <p className="ivq-more-t">同系列的题</p>
            <ul>
              {related.map((rel) => (
                <li key={rel.slug}>
                  <Link href={`/interview/qa/${rel.slug}`}>{rel.question}</Link>
                </li>
              ))}
              <li>
                <Link href="/interview/qa">← 全部题目</Link>
              </li>
            </ul>
          </div>

          {neighbors.prev || neighbors.next ? (
            <nav className="ivq-serial" aria-label="本章题目导航">
              {neighbors.prev ? (
                <Link className="ivq-serial-link" href={`/interview/qa/${neighbors.prev.slug}`}>
                  <span className="ivq-serial-label">上一题</span>
                  <span className="ivq-serial-q">{neighbors.prev.question}</span>
                </Link>
              ) : (
                <span className="ivq-serial-link is-empty" />
              )}
              <span className="ivq-serial-pos">
                {category ? `${category.name} · ` : ""}第 {neighbors.index}/{neighbors.total} 题
              </span>
              {neighbors.next ? (
                <Link className="ivq-serial-link is-next" href={`/interview/qa/${neighbors.next.slug}`}>
                  <span className="ivq-serial-label">下一题</span>
                  <span className="ivq-serial-q">{neighbors.next.question}</span>
                </Link>
              ) : (
                <Link className="ivq-serial-link is-empty" href={`/interview/category/${item.category}`}>
                  <span className="ivq-serial-label">本章学完</span>
                  <span className="ivq-serial-q">回到学习路径 →</span>
                </Link>
              )}
            </nav>
          ) : null}

          {(CAT_TO_TOOLS[item.category] ?? []).length > 0 && (
            <aside className="ivq-cta ivq-cta--tools">
              <div>
                <p className="ivq-cta-t">练这个考点的工具</p>
                <div className="ivq-tool-links">
                  {(CAT_TO_TOOLS[item.category] ?? []).map((t) => (
                    <Link key={t.href} className="ivq-tool-link" href={t.href}>
                      <span className="t">{t.label}</span>
                      <span className="d">{t.why}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          )}

          <aside className="ivq-cta">
            <div>
              <p className="ivq-cta-t">这个答案扛得住追问吗？</p>
              <p className="ivq-cta-d">
                速答只给你第一层。追问往下挖两层，看深度解析；要系统刷，按专栏学习路线走。
              </p>
            </div>
            <div className="ivq-cta-links">
              <Link className="ivq-cta-btn" href="/interview">
                深度解析
              </Link>
              <Link className="ivq-cta-btn ivq-cta-btn--ghost" href="/interview#chapters">
                学习路线
              </Link>
            </div>
          </aside>

          <div className="ivu-endmark">—— 本题完 ——</div>
        </article>
      </div>
    </main>
  )
}
