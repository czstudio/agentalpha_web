import type { Metadata } from "next"
import { PenLine } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { ToolsGuide } from "@/components/tools/tools-guide"
import { ToolsCrossLinks } from "@/components/tools/tools-cross-links"
import { ToolsFaq } from "@/components/tools/tools-faq"
import { BulletClient } from "@/components/tools/bullet-client"
import "../tools.css"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "简历经历打分 - Bullet 一条值多少分,给改写骨架",
  description:
    "粘贴单条简历经历,按动词强度、量化证据、技术深度、结果表达四维打分,给问题清单和改写骨架。指标位留空由你填真实值,系统不编数。免费、无需注册、本地运行。",
  keywords: ["简历打分", "简历经历优化", "STAR法则", "简历量化", "bullet写法", "简历动词"],
  alternates: { canonical: "/tools/bullet-grader" },
}

export default function BulletGraderPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "工具", item: SITE + "/tools" },
      { "@type": "ListItem", position: 3, name: "简历 Bullet 打分器", item: SITE + "/tools/bullet-grader" },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker"><PenLine size={13} strokeWidth={2} aria-hidden /> 免费工具 · BULLET GRADER</p>
          <h1>简历 Bullet 打分器</h1>
          <p className="tk-lede">
            一条经历值多少分，十秒见分晓。粘进来，按动词、量化、深度、结果四个维度打分，给出问题清单和一个照着填的改写骨架。本地运行，不注册、不上传。
          </p>
        </header>

        <BulletClient />

        <ToolsCrossLinks slug="bullet-grader" />

        <ToolsGuide slug="bullet-grader" />

        <ToolsFaq slug="bullet-grader" />
      </main>
    </>
  )
}
