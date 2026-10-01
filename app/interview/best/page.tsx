import type { Metadata } from "next"
import Link from "next/link"
import { BEST_PAGES } from "@/lib/best-pages"
import { getAllQa } from "@/lib/qa"
import { getCategories } from "@/lib/interview"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "面试高频合集（速记版）· AgentAlpha 面试题库",
  description:
    "按宽泛搜索词组织的面试高频合集：AI Agent 面试题 60 问、RAG 面试题 50 问、大模型八股 60 问、MCP 面试题 20 问——每页同页给全一句话答案，可直接背结论，附完整解析链接。",
  alternates: { canonical: "/interview/best" },
}

export default function BestIndexPage() {
  const qa = getAllQa()
  const catNames = new Map(getCategories().map((c) => [c.cat, c.name]))
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: "高频合集", item: `${SITE}/interview/best` },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="ivu-wide">
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <span className="cur">高频合集</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">高频合集 · CHEAT SHEETS</p>
        <h1 className="ivc-hero-title">面试高频合集（速记版）</h1>
        <p className="ivc-hero-sub">
          每一页是一个方向的全部高频题 + 一句话答案，同页给全、可直接背结论——适合面试前一晚速记。
          每题都链到逐题深挖与真题解析。
        </p>
      </header>

      <div className="ivu-wide">
        <div className="tk-catgrid">
          {BEST_PAGES.map((p) => {
            const total = p.cats.reduce((n, cat) => n + qa.filter((item) => item.category === cat).length, 0)
            return (
              <Link key={p.slug} href={`/interview/best/${p.slug}`} className="tk-catcard">
                <div className="tk-catcard-head">
                  <span className="tk-catcard-name">{p.title.split("（")[0]}</span>
                  <span className="tk-catcard-count">{Math.min(total, p.perCat * p.cats.length)}+ 问</span>
                </div>
                <p className="tk-catcard-split">{p.description.slice(0, 60)}…</p>
                <span className="tk-catcard-links">打开速记版 →</span>
              </Link>
            )
          })}
        </div>
        <p className="learn-note" style={{ marginTop: 18 }}>
          想要一题一页带追问链的版本，去
          <Link href="/interview/qa">速答题库（{qa.length} 题）</Link>
          ；分类维度见{catNames.size} 个方向页。
        </p>
      </div>
    </main>
  )
}
