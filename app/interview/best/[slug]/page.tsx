import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BEST_PAGES, getBestPage } from "@/lib/best-pages"
import { getCategories } from "@/lib/interview"

const SITE = "https://agentalpha.top"

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return BEST_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = getBestPage(slug)
  if (!data) return {}
  return {
    title: `${data.def.title} · AgentAlpha 面试题库`,
    description: data.def.description,
    keywords: data.def.keywords,
    alternates: { canonical: `/interview/best/${slug}` },
    openGraph: { title: data.def.title, description: data.def.description },
  }
}

export default async function BestPage({ params }: PageProps) {
  const { slug } = await params
  const data = getBestPage(slug)
  if (!data) notFound()
  const { def, sections, total, terms, tkCount } = data
  const catNames = new Map(getCategories().map((c) => [c.cat, c.name]))
  const updated = new Date().toISOString().slice(0, 10)

  // 每题都进 FAQPage mainEntity——聚合页吃宽泛词的结构化核心
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.flatMap((s) =>
      s.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.oneLine },
      })),
    ),
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: def.title, item: `${SITE}/interview/best/${slug}` },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="ivu-wide">
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <span className="cur">{def.title.split("（")[0]}</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">高频合集 · CHEAT SHEET</p>
        <h1 className="ivc-hero-title">{def.title}</h1>
        <p className="ivc-hero-sub">{def.intro}</p>
        <p className="ivq-hero-note">
          本页 {total} 题同页给全答案，可直接背结论；每题链到
          <Link href="/interview/tk"> {tkCount}+ 篇真题解析库</Link>
          与逐题深挖。更新于 {updated}，持续补充。
        </p>
        <p className="best-stats" aria-label="数据背书">
          <span><b>{total}</b> 道高频题</span>
          <span><b>{tkCount}+</b> 篇真题解析支撑</span>
          <span><b>2582</b> 道真题图谱聚类来源</span>
          <span><b>14</b> 个方向覆盖</span>
        </p>
        <p className="best-author">
          整理：AgentAlpha 社区（大模型 Agent 实战社区）· 校对：{updated} · 引用请注明来源 agentalpha.top
        </p>
        <nav className="best-toc" aria-label="本页目录">
          {sections.map((s) => (
            <a key={s.cat} href={`#sec-${s.cat}`}>{catNames.get(s.cat) || s.cat}（{s.items.length}）</a>
          ))}
        </nav>
      </header>

      <div className="ivu-wide">
        {sections.map((section) => (
          <section key={section.cat} id={`sec-${section.cat}`} className="best-sec">
            <h2 className="best-sec-title">{catNames.get(section.cat) || section.cat}</h2>
            <ol className="best-qlist">
              {section.items.map((item, i) => (
                <li key={item.slug} className="best-q">
                  <div className="best-q-head">
                    <span className="best-q-no">Q{i + 1}</span>
                    <h3 className="best-q-title">{item.question}</h3>
                  </div>
                  <p className="best-q-a">{item.oneLine}</p>
                  <div className="best-q-links">
                    <Link href={`/interview/qa/${item.slug}`}>完整速答 →</Link>
                    {item.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="ivu-chip">{tag}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}

        {terms.length > 0 ? (
          <section className="best-sec">
            <h2 className="best-sec-title">先补概念？术语速览</h2>
            <div className="best-terms">
              {terms.map((t) => (
                <Link key={t.slug} href={`/interview/glossary/${t.slug}`} className="best-term">
                  <b>{t.term}</b>
                  <span>{t.oneLine.slice(0, 46)}…</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <aside className="ivq-cta">
          <div>
            <p className="ivq-cta-t">背完结论，扛得住追问吗？</p>
            <p className="ivq-cta-d">
              本页只给一句话答案。追问往下挖两层看真题解析（{tkCount}+ 篇，含考察意图与 30 秒模板）；
              要系统学，回主线课程。
            </p>
          </div>
          <div className="ivq-cta-links">
            <Link className="ivq-cta-btn" href="/interview/tk">真题解析库</Link>
            <Link className="ivq-cta-btn ivq-cta-btn--ghost" href="/interview#chapters">主线课程</Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
