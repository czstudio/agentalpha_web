import type { Metadata } from "next"
import { ArrowUpRight } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { getGzhArticles } from "@/lib/gzh"

export const metadata: Metadata = {
  title: "公众号文章合集：面试长文、社区动态与学员案例",
  description:
    "AgentAlpha 公众号文章全集索引：大模型 Agent 面试长文、工程实战拆解、社区动态与学员案例，附微信原文链接，持续同步。",
  keywords: ["AgentAlpha 公众号", "大模型面试 公众号", "Agent 面试长文"],
  alternates: { canonical: "/gzh" },
}

/** 以最新一篇为锚点往回推 7 天，静态构建也不会把「新」标打错 */function freshWindow(articles: { date: string }[]): string {
  const dates = articles.map((a) => a.date).filter(Boolean).sort()
  const newest = dates[dates.length - 1]
  if (!newest) return ""
  const t = new Date(newest.slice(0, 10).replace(/-/g, "/"))
  t.setDate(t.getDate() - 7)
  return t.toISOString().slice(0, 10)
}

export default function GzhPage() {
  const articles = getGzhArticles()
  const freshSince = freshWindow(articles)

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AgentAlpha 公众号文章合集",
    numberOfItems: articles.length,
    itemListElement: articles.slice(0, 30).map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.title,
      url: a.url,
    })),
  }

  // 按月分组，日期缺失的归到最前面展示
  const groups: { month: string; items: typeof articles }[] = []
  for (const a of articles) {
    const month = a.date ? a.date.slice(0, 7) : "更早"
    const last = groups[groups.length - 1]
    if (last && last.month === month) last.items.push(a)
    else groups.push({ month, items: [a] })
  }

  return (
    <main className="mj-index">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      <header className="mj-index-hero">
        <div className="aa-notes-shell">
          <p className="mj-index-kicker">公众号 · AGENTALPHA</p>
          <h1>
            公众号文章合集，<br />
            <em>一篇不落。</em>
          </h1>
          <p className="mj-index-lede">
            面试长文、工程拆解、社区动态与学员案例，全部收录在这里，点击直达微信原文。每周同步一次。
          </p>
        </div>
      </header>

      <div className="aa-notes-shell">
        {groups.map((group) => (
          <section key={group.month} className="gzh-month">
            <h2 className="gzh-month-name">{group.month}</h2>
            <div className="gzh-list">
              {group.items.map((a) => {
                const fresh = freshSince && a.date && a.date.slice(0, 10) >= freshSince
                return (
                  <a
                    key={a.url}
                    className="gzh-item"
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="gzh-item-top">
                      <span className="gzh-item-title">
                        {a.title}
                        {fresh ? <span className="gzh-fresh">新</span> : null}
                      </span>
                      <span className="gzh-item-date">{a.date ? a.date.slice(0, 10) : ""}</span>
                    </div>
                    {a.digest ? <p className="gzh-item-digest">{a.digest}</p> : null}
                    <span className="gzh-item-go" aria-hidden>
                      微信原文 <ArrowUpRight size={14} aria-hidden />
                    </span>
                  </a>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="aa-notes-outro mj-outro">
        <div className="aa-notes-shell">
          <p>△ AgentAlpha 公众号</p>
          <h2>长文首发在公众号，题库沉淀在站内。</h2>
          <a className="aa-notes-join" href="/interview/qa">
            去刷面试题 <ArrowUpRight aria-hidden />
          </a>
        </div>
      </section>
    </main>
  )
}
