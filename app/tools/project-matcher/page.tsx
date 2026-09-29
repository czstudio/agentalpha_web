import type { Metadata } from "next"
import { Navigation } from "@/components/navigation"
import { MatcherClient } from "@/components/tools/matcher-client"
import "../tools.css"
import { ToolsFaq } from "@/components/tools/tools-faq"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "项目匹配器 · 不知道做什么项目能上岸？",
  description:
    "选目标方向、现有基础和可投入时间，推荐三个能写进简历、扛得住追问的 AI 项目：每个给难度、时间预算、简历 bullet 模板、验收指标和会被问到的面试题。免费、无注册。",
  keywords: ["AI 求职项目推荐", "简历项目怎么选", "Agent 项目", "RAG 项目", "大模型面试项目"],
  alternates: { canonical: "/tools/project-matcher" },
}

export default function ProjectMatcherPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "工具", item: `${SITE}/tools` },
      { "@type": "ListItem", position: 3, name: "项目匹配器", item: `${SITE}/tools/project-matcher` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker">免费工具 · PROJECT MATCHER</p>
          <h1>项目匹配器</h1>
          <p className="tk-lede">
            「做什么项目能上岸」没有标准答案，但有匹配逻辑：方向考点重合度 × 时间可行性 × 你的当前基础。
            选三项，拿三个项目方案——每个带简历写法模板（指标留空，你自己填真实值）和面试会被问到的真题。
          </p>
        </header>

        <MatcherClient />

        <section className="tk-block" style={{ marginTop: 24 }}>
          <h3>项目不是越多越好</h3>
          <p className="tk-block-desc">
            面试官看项目看三样：技术判断（为什么这么选）、深度（难在哪、怎么解的）、证据（指标和 badcase）。
            一个能被三层追问的项目，胜过五个跑完教程的 demo。简历上写不出〔指标〕的项目，先补指标再写。
          </p>
        </section>
              <ToolsFaq slug="project-matcher" />
      </main>
    </>
  )
}
