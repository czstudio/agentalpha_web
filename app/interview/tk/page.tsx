import type { Metadata } from "next"
import Link from "next/link"
import { getAllInterview, getCategoriesWithPosts, getCategories } from "@/lib/interview"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "真题解析库（2500+ 篇大模型 Agent 面试真题，含考察意图与追问链）",
  description:
    "社区面试宝典 12 章真题的完整解析库：每题含考察意图、标准答、30 秒答题模板与追问链。按 14 个方向分类，可跳转各方向分页浏览全部真题。",
  keywords: ["大模型真题", "Agent 面试真题", "LLM 真题解析", "面试宝典", "真题库"],
  alternates: { canonical: "/interview/tk" },
}

export default function TkIndexPage() {
  const all = getAllInterview()
  const cats = getCategoriesWithPosts(true)
  const catNames = new Map(getCategories().map((c) => [c.cat, c.name]))
  const tk = all.filter((post) => post.slug.includes("-tk"))
  const guides = all.filter((post) => post.slug.endsWith("-chapter-guide"))
  const comparisons = all.filter((post) => (post.tags || []).some((t) => t.includes("对比选型")))

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: "真题解析库", item: `${SITE}/interview/tk` },
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
          <span className="cur">真题解析库</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">真题解析 · QUESTION BANK</p>
        <h1 className="ivc-hero-title">真题解析库</h1>
        <p className="ivc-hero-sub">
          {tk.length} 篇大厂面试真题的完整解析，来自社区面试宝典 12 章。每篇四段结构：考察意图 → 标准答 →
          30 秒答题模板 → 追问链。想刷短平快的结论版去
          <Link href="/interview/qa">速答题库</Link>
          ，想系统学去<Link href="/interview">系统学习</Link>。
        </p>
        <div className="ivq-hero-actions">
          <Link className="ivq-hero-btn" href="/interview/jingchang">
            按公司看真题（五厂清单）
          </Link>
          <span className="ivq-hero-btnnote">另有 {guides.length} 篇章节导学与 {comparisons.length} 篇对比选型</span>
        </div>
      </header>

      <div className="ivu-wide">
        <div className="ivu-sec">
          <h2 className="ivu-sec-t">按方向进真题</h2>
          <p className="ivu-sec-sub">共 {cats.reduce((n, c) => n + c.count, 0)} 篇</p>
        </div>
        <div className="tk-catgrid">
          {cats.map((c) => {
            const tkCount = c.posts.filter((p) => p.slug.includes("-tk")).length
            const teachCount = c.count - tkCount
            return (
              <div key={c.cat} className="tk-catcard" style={{ "--cc": `var(--cat-${c.cat})` } as React.CSSProperties}>
                <div className="tk-catcard-head">
                  <Link href={`/interview/category/${c.cat}/all`} className="tk-catcard-name">
                    {catNames.get(c.cat) || c.cat}
                  </Link>
                  <span className="tk-catcard-count">{c.count} 篇</span>
                </div>
                <p className="tk-catcard-split">
                  真题解析 <b>{tkCount}</b> · 教程深挖 <b>{teachCount}</b>
                </p>
                <div className="tk-catcard-links">
                  <Link href={`/interview/category/${c.cat}/all`}>全部题目 →</Link>
                  <Link href={`/interview/category/${c.cat}`}>学习路径 →</Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
