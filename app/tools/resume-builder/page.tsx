import type { Metadata } from "next"
import { FileUser } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { ToolsGuide } from "@/components/tools/tools-guide"
import { ToolsFaq } from "@/components/tools/tools-faq"
import { ResumeBuilderClient } from "@/components/tools/resume-builder-client"
import "../tools.css"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "免费在线简历生成器 - AI 岗简历模板,导出 PDF/Word,无需注册",
  description:
    "免费在线简历制作工具:粘贴旧简历或写一段话,自动解析重排成带配色和多页分页的 A4 简历,数字指标自动加粗,直接导出 PDF、Word、HTML,无水印、无需注册。内置逐条经历打分、证据体检和 AI 改写(AI 只改表达不编经历),也支持 JSON 导入导出与 LaTeX 源码。全部在你的浏览器本地完成,简历不上传。",
  keywords: [
    "免费简历制作",
    "在线简历生成器",
    "简历模板免费",
    "简历导出PDF",
    "简历Word模板",
    "AI岗位简历",
    "程序员简历模板",
    "应届生简历",
    "大模型简历",
    "算法岗简历模板",
    "AI简历优化",
    "简历制作免费无水印",
    "LaTeX简历",
  ],
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
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AgentAlpha 免费在线简历生成器",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "免费在线简历制作工具:粘贴旧简历或一段话,自动排版成带配色和分页的 A4 简历,导出 PDF、Word、HTML、LaTeX,内置经历打分、证据体检与 AI 改写,本地处理不上传,无需注册无水印。",
    offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker"><FileUser size={13} strokeWidth={2} aria-hidden /> 免费工具 · RESUME BUILDER</p>
          <h1>简历生成器</h1>
          <p className="tk-lede">
            旧简历粘进来重新优化，或者只写一段话，解析成结构化简历后逐条改：公司条色带、章节衬线标题、数字指标自动加粗，
            预览里每一页都是真实 A4，内容多了自动分页、页码页边距可调。导出打印 PDF、Word、HTML 和 LaTeX 源码，
            每条经历旁边就是打分和证据体检，AI 改写不编造、缺数字留〔〕占位。全部在你浏览器里完成，简历不上传。
          </p>
        </header>

        <ResumeBuilderClient />

        <ToolsGuide slug="resume-builder" />

        <ToolsFaq slug="resume-builder" />
      </main>
    </>
  )
}
