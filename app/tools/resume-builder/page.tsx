import type { Metadata } from "next"
import { FileUser } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { ToolsGuide } from "@/components/tools/tools-guide"
import { ToolsFaq } from "@/components/tools/tools-faq"
import { ResumeBuilderClient } from "@/components/tools/resume-builder-client"
import "../tools.css"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "免费在线简历生成器 - 导出 PDF 和 Word,无需注册",
  description:
    "免费在线简历制作工具:粘贴旧简历或写一段话,自动排版成一页 A4 简历,直接导出 PDF 和 Word,无水印、无需注册。内置逐条经历打分(AI 岗位向),每条给改写骨架;也可导出 LaTeX 源码在 Overleaf 编译。全部在你的浏览器本地完成,简历不上传。",
  keywords: ["免费简历制作", "在线简历生成器", "简历导出PDF", "简历模板 Word", "简历制作免费", "AI岗位简历", "LaTeX简历", "求职简历工具"],
  alternates: { canonical: "/tools/resume-builder" },
}

export default function ResumeBuilderPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "工具", item: SITE + "/tools" },
      { "@type": "ListItem", position: 3, name: "简历生成器", item: SITE + "/tools/resume-builder" },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker"><FileUser size={13} strokeWidth={2} aria-hidden /> 免费工具 · RESUME BUILDER</p>
          <h1>简历生成器</h1>
          <p className="tk-lede">
            把简历排成一页能打的。旧简历全文粘进来重新优化，或者只写一段话，解析完逐条改：
            每条经历旁边就是打分器同款的分数和问题，照着改写骨架补上真实数字。
            排版走 LaTeX 风格，导出打印 PDF、Word 和 LaTeX 源码，全部在你浏览器里生成。
          </p>
        </header>

        <ResumeBuilderClient />

        <ToolsGuide slug="resume-builder" />

        <ToolsFaq slug="resume-builder" />
      </main>
    </>
  )
}
