import type { Metadata } from "next"
import Link from "next/link"
import { ClipboardCheck } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { ToolsGuide } from "@/components/tools/tools-guide"
import { ToolsCrossLinks } from "@/components/tools/tools-cross-links"
import { ResumeClient } from "@/components/tools/resume-client"
import "../tools.css"
import "./resume.css"
import { ToolsFaq } from "@/components/tools/tools-faq"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "简历在线分析 - AI 岗简历体检,免费查匹配度与追问风险",
  description:
    "免费在线简历分析:粘贴简历和目标 JD,本地逐词对比匹配度、能力证据评级、逐条批注,并基于真实面经预演面试官会追问什么。AI Agent 与大模型岗位专用,无需注册,简历不出浏览器。",
  keywords: ["简历在线分析", "简历匹配度检测", "简历体检", "简历优化免费", "AI岗位简历", "简历诊断工具"],
  alternates: { canonical: "/tools/resume" },
}

export default function ResumeToolPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "简历体检", item: `${SITE}/tools/resume` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="rt-main">
        <header className="rt-hero">
          <p className="rt-kicker"><ClipboardCheck size={13} strokeWidth={2} aria-hidden /> 免费工具 · RESUME CHECK</p>
          <h1>AI / Agent 岗简历体检</h1>
          <p className="rt-lede">
            粘简历和目标 JD，本地分析：JD 逐词对比、能力证据评级、逐条批注、追问预演。不上传，文本不出浏览器。
          </p>
        </header>

        <ResumeClient />

        <section className="rt-guide">
          <h2>改简历的三段式写法</h2>
          <p>
            一条撑得住追问的经历分三段：用了什么 Agent 技术或架构；难在哪（幻觉控制、长上下文成本、调用稳定性、延迟）；结果多少（准确率、成本、人效、周期）。
            只罗列技术栈的条目，面试官默认你没做过深的部分。
          </p>
          <div className="rt-guide-links">
            <Link href="/interview/qa">面试题库</Link>
            <Link href="/interview/quiz">模拟面试抽题</Link>
            <Link href="/mianjing">真实面经</Link>
          </div>
        </section>
        <ToolsCrossLinks slug="resume" />

        <ToolsGuide slug="resume" />

        <ToolsFaq slug="resume" />
      </main>
    </>
  )
}
