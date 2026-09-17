import type { Metadata } from "next"
import Link from "next/link"
import { getAllQa, getQaGrouped } from "@/lib/qa"
import { getCategories } from "@/lib/interview"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "Agent 面试题大全（含答案，持续更新）",
  description:
    "大模型 Agent 岗高频面试题大全：RAG、Agent 架构、Function Calling 与 MCP、多智能体、记忆系统、评测、企业落地，一题一页给出口语化参考答案，面试前速刷。",
  keywords: [
    "Agent 面试题",
    "大模型面试题",
    "LLM 面试题及答案",
    "RAG 面试题",
    "Agent 面试",
    "AI 产品经理面试题",
    "大模型岗面试",
    "Agent 八股文",
  ],
  alternates: { canonical: "/interview/qa" },
}

export default function QaHubPage() {
  const all = getAllQa()
  const groups = getQaGrouped(getCategories())

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Agent 面试题大全",
    numberOfItems: all.length,
    itemListElement: all.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.question,
      url: `${SITE}/interview/qa/${item.slug}`,
    })),
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: "面试题大全", item: `${SITE}/interview/qa` },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="ivu-wide">
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <span className="cur">题库</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">高频题速答 · QUICK ANSWERS</p>
        <h1 className="ivc-hero-title">Agent 面试题大全</h1>
        <p className="ivc-hero-sub">
          {all.length} 道真实高频题，一题一页。每页先给一句能直接说出口的结论，再补追问点和常见的坑。面试前速刷，面试中救场。
        </p>
        <p className="ivq-hero-note">
          题目来自社区成员的真实面经与公开面经汇总，按大家实际会搜的说法组织。
          想看逐层拆解的长文，去<a href="/interview">深度解析</a>；想按学习路线刷，去
          <a href="/interview#chapters">专栏目录</a>。
        </p>
      </header>

      <div className="ivu-wide">
        {groups.map((group) => {
          const category = getCategories().find((c) => c.cat === group.cat)
          return (
            <section className="ivq-cat" key={group.cat} id={group.cat}>
              <div className="ivq-cat-head">
                <h2 className="ivq-cat-name">{category?.name || group.cat}</h2>
                <p className="ivq-cat-intro">{category?.intro}</p>
                <span className="ivq-cat-count">{group.items.length} 题</span>
              </div>
              <div className="ivq-rows">
                {group.items.map((item) => (
                  <Link className="ivq-row" href={`/interview/qa/${item.slug}`} key={item.slug}>
                    <span className="ivq-row-q">Q · {item.question}</span>
                    <span className="ivq-row-a">{item.oneLine}</span>
                    <span className="ivq-row-go" aria-hidden>
                      查看答案 →
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <div className="ivu-wide">
        <aside className="ivq-cta">
          <div>
            <p className="ivq-cta-t">刷完速答，再往深走一层</p>
            <p className="ivq-cta-d">
              速答帮你把结论说出口，深度解析帮你扛住追问：17 篇逐层拆解的长文，以及按章刷题的完整学习路线。
            </p>
          </div>
          <div className="ivq-cta-links">
            <Link className="ivq-cta-btn" href="/interview">
              看深度解析
            </Link>
            <Link className="ivq-cta-btn ivq-cta-btn--ghost" href="/learn">
              训练营
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
