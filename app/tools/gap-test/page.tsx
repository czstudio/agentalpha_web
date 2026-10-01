import type { Metadata } from "next"
import { Radar } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { GapClient } from "@/components/tools/gap-client"
import { getAllQa } from "@/lib/qa"
import "../tools.css"
import { ToolsGuide } from "@/components/tools/tools-guide"
import { ToolsFaq } from "@/components/tools/tools-faq"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "面试 Gap 自测 - 测你离 AI 岗位 Offer 差多远",
  description:
    "八项能力自评加真实面试题抽验(防虚标),测出你和目标 AI 岗位的差距:能力雷达、短板清单、补课路径。免费、无需注册、浏览器本地完成,自测结果不出本机。",
  keywords: ["面试能力测评", "AI岗位自测", "面试差距测试", "求职自测", "大模型面试准备", "能力雷达"],
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
          <p className="tk-kicker"><Radar size={13} strokeWidth={2} aria-hidden /> 免费工具 · GAP TEST</p>
          <h1>面试 Gap 自测</h1>
          <p className="tk-lede">
            选目标方向，八项能力自评，然后用真实面试题验证一遍：自评「会」的域会被抽题，
            答不上分数就回落。最后出能力雷达、一句人话结论和按优先级排好的补课路径。
            不注册、不上传，全部在浏览器本地完成。
          </p>
        </header>

        <GapClient qaList={qaList} />

        <ToolsGuide slug="gap-test" />

        <ToolsFaq slug="gap-test" />
      </main>
    </>
  )
}
