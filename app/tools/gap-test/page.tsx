import type { Metadata } from "next"
import { Navigation } from "@/components/navigation"
import { GapClient } from "@/components/tools/gap-client"
import { getAllQa } from "@/lib/qa"
import "../tools.css"
import { ToolsFaq } from "@/components/tools/tools-faq"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "面试 Gap 自测 · 测你离目标 AI 岗位差多远",
  description:
    "选目标方向，八项能力自评加真实面试题抽验（防虚标），出能力雷达、短板清单和补课路径：先刷哪个题库分类、走哪条学习路线、做什么项目。免费、无注册、浏览器本地完成。",
  keywords: ["AI 岗位差距自测", "Agent 面试自测", "大模型面试准备", "能力雷达", "求职诊断"],
  alternates: { canonical: "/tools/gap-test" },
}

export default function GapTestPage() {
  const qaList = getAllQa().map((q) => ({
    slug: q.slug,
    question: q.question,
    oneLine: q.oneLine,
    category: q.category,
    tags: q.tags,
  }))

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "工具", item: `${SITE}/tools` },
      { "@type": "ListItem", position: 3, name: "面试 Gap 自测", item: `${SITE}/tools/gap-test` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker">免费工具 · GAP TEST</p>
          <h1>面试 Gap 自测</h1>
          <p className="tk-lede">
            选目标方向，八项能力自评，然后用真实面试题验证一遍——自评「会」的域会被抽题，
            答不上分数就回落。最后出能力雷达、一句人话结论和按优先级排好的补课路径。
            不注册、不上传，全部在浏览器本地完成。
          </p>
        </header>

        <GapClient qaList={qaList} />
              <ToolsFaq slug="gap-test" />
      </main>
    </>
  )
}
