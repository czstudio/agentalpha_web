import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import { getAllGlossary, getGlossary, GLOSSARY_GROUPS } from "@/lib/glossary"
import { getQa } from "@/lib/qa"

const SITE = "https://agentalpha.top"

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllGlossary().map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const item = getGlossary(slug)
  if (!item) return {}
  const description = `${item.term}是什么？${item.oneLine}`.slice(0, 150)
  return {
    title: `${item.term}是什么（一句话定义 + 面试考法）· 术语表`,
    description,
    keywords: [item.term, ...(item.en ? [item.en] : []), ...item.aliases, "面试", "名词解释"].filter(Boolean),
    alternates: { canonical: `/interview/glossary/${item.slug}` },
    openGraph: { title: `${item.term}是什么`, description },
  }
}

/** 与题库一致的 h2 序号样式：01 / 02 / 03 */
function createGlossaryComponents(): Components {
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

export default async function GlossaryDetailPage({ params }: PageProps) {
  const { slug } = await params
  const item = getGlossary(slug)
  if (!item) notFound()
  const groupName = GLOSSARY_GROUPS.find((g) => g.group === item.group)?.name || item.group
  const relatedQaItems = item.relatedQa.map((qaSlug) => getQa(qaSlug)).filter(Boolean)
  const relatedTermItems = item.relatedTerms
    .map((termSlug) => getGlossary(termSlug))
    .filter(Boolean)

  const termLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: item.term,
    alternateName: item.aliases,
    description: item.oneLine,
    url: `${SITE}/interview/glossary/${item.slug}`,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "AgentAlpha AI Agent 术语表",
      url: `${SITE}/interview/glossary`,
    },
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: "术语表", item: `${SITE}/interview/glossary` },
      { "@type": "ListItem", position: 4, name: item.term, item: `${SITE}/interview/glossary/${item.slug}` },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(termLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="ivu-measure">
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <Link href="/interview/glossary">术语表</Link>
          <span className="sep">/</span>
          <Link href={`/interview/glossary#${item.group}`}>{groupName}</Link>
        </nav>
      </div>

      <div className="ivu-measure ivu-head">
        <div className="ivu-meta">
          <Link
            href={`/interview/glossary#${item.group}`}
            className="ivu-chip"
            style={{ background: "var(--brand-tint)", color: "var(--brand-deep)", textDecoration: "none" }}
          >
            {groupName}
          </Link>
          {item.tags.map((tag) => (
            <span key={tag} className="ivu-chip">
              {tag}
            </span>
          ))}
          {item.updated ? <span className="ivu-updated">更新 {item.updated}</span> : null}
        </div>
        <h1 className="ivu-h1">
          {item.term}
          {item.en ? <span className="glo-en">{item.en}</span> : null}
        </h1>
      </div>

      <div className="ivu-measure">
        <div className="ivq-oneline">
          <span className="ivq-oneline-label">一句话定义</span>
          <p>{item.oneLine}</p>
        </div>
      </div>

      <div className="ivu-measure">
        <article className="ivu-prose">
          <ReactMarkdown components={createGlossaryComponents()}>{item.content}</ReactMarkdown>

          {item.aliases.length > 0 ? (
            <p className="glo-aliases-line">又称：{item.aliases.join(" · ")}</p>
          ) : null}

          {relatedQaItems.length > 0 ? (
            <div className="ivq-more">
              <p className="ivq-more-t">考这个术语的题</p>
              <ul>
                {relatedQaItems.map(
                  (qa) =>
                    qa && (
                      <li key={qa.slug}>
                        <Link href={`/interview/qa/${qa.slug}`}>{qa.question}</Link>
                      </li>
                    ),
                )}
              </ul>
            </div>
          ) : null}

          {relatedTermItems.length > 0 ? (
            <div className="ivq-more">
              <p className="ivq-more-t">相关术语</p>
              <ul>
                {relatedTermItems.map(
                  (term) =>
                    term && (
                      <li key={term.slug}>
                        <Link href={`/interview/glossary/${term.slug}`}>{term.term}</Link>
                      </li>
                    ),
                )}
              </ul>
            </div>
          ) : null}

          <div className="ivq-more">
            <p className="ivq-more-t">接着做点什么</p>
            <ul>
              <li>
                <Link href="/interview/qa">← 去题库刷这个方向的题</Link>
              </li>
              <li>
                <Link href="/interview/glossary">← 全部术语</Link>
              </li>
            </ul>
          </div>

          <div className="ivu-endmark">—— 本条完 ——</div>
        </article>
      </div>
    </main>
  )
}
