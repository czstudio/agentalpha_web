import type { Metadata } from "next"
import { FileUser } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { ToolsFaq } from "@/components/tools/tools-faq"
import { ResumeBuilderClient } from "@/components/tools/resume-builder-client"
import "../tools.css"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "简历生成器 · 一页排版好的简历,本地导出 PDF 和 Word",
  description:
    "粘贴旧简历或一段话,自动解析重排成一页 A4 简历;逐条经历按动词、量化、深度、结果打分并给改写骨架;本地导出打印 PDF、Word 和 LaTeX 源码。不注册、不上传。",
  keywords: ["简历生成器", "简历排版", "简历模板", "LaTeX 简历", "简历导出 Word", "Agent 岗简历"],
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

        <ToolsFaq slug="resume-builder" />
      </main>
    </>
  )
}
