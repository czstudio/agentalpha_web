import type { Metadata } from "next"
import Link from "next/link"
import { getAllGlossary, getGlossaryGrouped } from "@/lib/glossary"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "AI Agent 术语表（RAG / MCP / KV Cache / Agentic RL 一句话定义）",
  description:
    "大模型与 Agent 面试高频术语表：RAG、Agent、MCP、A2A、Function Calling、KV Cache、vLLM、LoRA、GRPO、Agentic RL、Rerank、Embedding 等。每个术语一句话定义 + 机制 + 解决什么问题 + 面试怎么考，与题库互链。",
  keywords: [
    "AI 术语表",
    "大模型术语",
    "Agent 术语",
    "RAG 是什么",
    "MCP 是什么",
    "KV Cache 是什么",
    "Agentic RL",
    "LLM 术语表",
    "面试 名词解释",
  ],
  alternates: { canonical: "/interview/glossary" },
}

export default function GlossaryHubPage() {
  const all = getAllGlossary()
  const groups = getGlossaryGrouped()

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AI Agent 术语表",
    numberOfItems: all.length,
    itemListElement: all.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.term,
      url: `${SITE}/interview/glossary/${item.slug}`,
    })),
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: "术语表", item: `${SITE}/interview/glossary` },
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
          <span className="cur">术语表</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">术语速查 · GLOSSARY</p>
        <h1 className="ivc-hero-title">AI Agent 术语表</h1>
        <p className="ivc-hero-sub">
          {all.length} 个面试术语，每页含一句话定义、机制展开、面试考法与追问链。题目里出现的术语都链到这里，5 分钟查漏一个概念。
        </p>
        <div className="ivq-hero-actions">
          <Link className="ivq-hero-btn" href="/interview/qa">
            去题库刷题
          </Link>
          <span className="ivq-hero-btnnote">术语 + 真题搭配用</span>
        </div>
      </header>

      <div className="ivu-wide">
        {groups.map((group) => (
          <section key={group.group} id={group.group} className="ivq-cat">
            <div className="ivq-cat-head">
              <h2 className="ivq-cat-name">{group.name}</h2>
              <span className="ivq-cat-count">{group.items.length} 个术语</span>
            </div>
            <ul className="glo-list">
              {group.items.map((item) => (
                <li key={item.slug} className="glo-item">
                  <Link href={`/interview/glossary/${item.slug}`} className="glo-term">
                    {item.term}
                  </Link>
                  <p className="glo-oneline">{item.oneLine}</p>
                  {item.aliases.length > 0 ? (
                    <p className="glo-aliases">又称：{item.aliases.join(" · ")}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
