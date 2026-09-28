import type { Metadata } from "next"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { ResumeClient } from "@/components/tools/resume-client"
import "./resume.css"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "AI/Agent 岗简历体检 · 免费在线简历分析",
  description:
    "粘贴简历文本和目标 JD，本地分析不出浏览器：JD 逐词对比、Agent 岗能力覆盖证据评级、逐条经历批注、基于真实面经的追问预演与翻车风险。免费、无注册、不上传。",
  keywords: ["Agent 简历优化", "大模型简历", "AI 岗简历修改", "简历诊断", "面试追问预演"],
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
          <p className="rt-kicker">免费工具 · RESUME CHECK</p>
          <h1>AI / Agent 岗简历体检</h1>
          <p className="rt-lede">
            把简历文本和目标岗位 JD 粘进来，在浏览器本地完成分析：JD 逐词对比、能力覆盖评级、逐条批注、以及每条经历会招来什么追问。
            不注册、不上传，文本不出你的浏览器。
          </p>
        </header>

        <ResumeClient />

        <section className="rt-guide">
          <h2>改简历的三段式写法</h2>
          <p>
            一条能撑住追问的经历，按三段组织：先说用了什么 Agent 技术或架构，再说难在哪（幻觉控制、长上下文成本、调用稳定性、延迟），最后给可量化结果（准确率、成本、人效、周期）。
            只写技术栈罗列的条目，面试官默认你没做过深的部分。
          </p>
          <div className="rt-guide-links">
            <Link href="/interview/qa">面试题库</Link>
            <Link href="/interview/quiz">模拟面试抽题</Link>
            <Link href="/mianjing">真实面经</Link>
          </div>
        </section>
      </main>
    </>
  )
}
