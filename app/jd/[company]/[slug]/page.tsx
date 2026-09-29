import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { Navigation } from "@/components/navigation"
import { getAllJd, getJd, getJdCompany, getSimilarJd, getJdQa } from "@/lib/jd"
import { getCategory } from "@/lib/interview"
import "../../jd.css"

const SITE = "https://agentalpha.top"

interface PageProps {
  params: Promise<{ company: string; slug: string }>
}

export function generateStaticParams() {
  return getAllJd().map((doc) => ({ company: doc.company, slug: doc.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { company, slug } = await params
  const doc = getJd(company, slug)
  if (!doc) return {}
  const co = getJdCompany(company)
  const description = `${doc.summary} 含硬技能清单、JD 没写但面试会问的考点、对应面试题与准备计划。`.slice(0, 150)
  return {
    title: `${doc.title} · JD 拆解`,
    description,
    keywords: [...doc.keywords, "JD 拆解", "AI 岗位面试"],
    alternates: { canonical: `/jd/${doc.company}/${doc.slug}` },
    openGraph: { title: doc.title, description },
  }
}

export default async function JdDetailPage({ params }: PageProps) {
  const { company, slug } = await params
  const doc = getJd(company, slug)
  if (!doc) notFound()
  const co = getJdCompany(company)
  const qaList = getJdQa(doc)
  const similar = getSimilarJd(doc)

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: doc.title,
    description: doc.summary,
    dateModified: doc.updated || undefined,
    author: { "@type": "Organization", name: "AgentAlpha" },
    publisher: { "@type": "Organization", name: "AgentAlpha" },
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "JD 拆解库", item: `${SITE}/jd` },
      { "@type": "ListItem", position: 3, name: doc.title, item: `${SITE}/jd/${doc.company}/${doc.slug}` },
    ],
  }

  return (
    <div className="jd-root">
      <Navigation />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <main className="jd-main">
        <nav className="jd-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/jd">JD 拆解库</Link>
          <span className="sep">/</span>
          <span>{co?.name ?? company}</span>
        </nav>

        <header>
          <p className="jd-kicker">{co?.name ?? company} · JD 拆解</p>
          <h1>{doc.role}岗位拆解：{doc.title.split("·").slice(-1)[0].trim()}</h1>
          <p className="jd-summary">{doc.summary}</p>
          <div className="jd-meta">
            <span>岗位族：{doc.role}</span>
            <span>层级：{doc.level}</span>
            <span>方向：{doc.cats.map((c) => getCategory(c)?.name ?? c).slice(0, 4).join(" / ")}</span>
          </div>
          <p className="jd-updated">更新于 {doc.updated} · 口径：该方向公开 JD 与公开面经的高频归纳</p>
        </header>

        <article className="jd-body">
          <ReactMarkdown
            components={{
              a({ href, children }) {
                return <a href={href}>{children}</a>
              },
            }}
          >
            {doc.content}
          </ReactMarkdown>
        </article>

        <h2 className="jd-section-title">对应面试题：直接刷这几题</h2>
        <p className="jd-summary" style={{ marginBottom: 14 }}>
          下面是这个方向的高频题（站内真实题库，一题一页带答案）。面试前按这个清单过一遍。
        </p>
        <div className="jd-qa-list">
          {qaList.map((q) => (
            <div key={q.slug} className="jd-qa-item">
              <a href={`/interview/qa/${q.slug}`}>{q.question}</a>
              <span className="jd-qa-cat">{getCategory(q.category)?.name ?? q.category}</span>
            </div>
          ))}
        </div>

        {similar.length > 0 && (
          <>
            <h2 className="jd-section-title">相似岗位拆解</h2>
            <div className="jd-similar">
              {similar.map((d) => (
                <Link key={`${d.company}-${d.slug}`} href={`/jd/${d.company}/${d.slug}`}>
                  <span className="co">{getJdCompany(d.company)?.name ?? d.company}</span>
                  <span className="ti">{d.role} · {d.level}</span>
                  <span className="sm">{d.summary}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <h2 className="jd-section-title">下一步</h2>
        <div className="jd-cta">
          <Link href="/tools/jd-analyzer">
            <div className="t">拆你手上的 JD</div>
            <div className="d">粘贴目标岗位 JD 原文，本地拆出考察词与简历缺口</div>
          </Link>
          <Link href="/tools/resume">
            <div className="t">简历对着这个岗体检</div>
            <div className="d">粘贴简历 + 这页要点，看匹配度与撑不住追问的条目</div>
          </Link>
          <Link href="/tools/gap-test">
            <div className="t">测离这个岗差多远</div>
            <div className="d">八项能力自评加真题验证，出补课路径</div>
          </Link>
          <Link href={`/interview/company/${doc.company}`}>
            <div className="t">{co?.name ?? company} 面试题聚合</div>
            <div className="d">该公司公开面经高频归纳的题目全集</div>
          </Link>
        </div>

        <p className="jd-claim">
          口径说明：本页是该方向公开 JD 与公开面经的高频归纳，不对应某一篇特定 JD，不包含具体薪资与编制信息；
          业务场景为推断并标注了置信度，AI 辅助整理、已按站内核查流程过题。招聘以官方发布为准。
        </p>
      </main>
    </div>
  )
}
