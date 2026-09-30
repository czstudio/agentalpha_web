import type { Metadata } from "next"
import { NotebookPen } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { LogClient } from "@/components/tools/log-client"
import "../tools.css"
import { ToolsFaq } from "@/components/tools/tools-faq"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "面试复盘模板 - 记录被问题目,统计反复挂在哪",
  description:
    "免费的面试复盘工具:面完当天记公司、轮次、被问题目、卡壳点、下次策略,自动统计你反复挂在哪一轮、哪类主题。数据只存本机浏览器,不上传、不公开,适合秋招春招连续作战。",
  keywords: ["面试复盘", "面试记录模板", "面试总结工具", "秋招复盘", "面经整理", "求职记录"],
  alternates: { canonical: "/tools/interview-log" },
}

export default function InterviewLogPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "工具", item: SITE + "/tools" },
      { "@type": "ListItem", position: 3, name: "面试复盘本", item: SITE + "/tools/interview-log" },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker"><NotebookPen size={13} strokeWidth={2} aria-hidden /> 免费工具 · INTERVIEW LOG</p>
          <h1>面试复盘本</h1>
          <p className="tk-lede">
            每场面试都是面试官替你做的一次免费诊断：他挑的地方就是你不会的地方。
            当天记三样：被问的题、卡壳点、下次怎么答。三场之后，你会清楚看到自己反复挂在哪类问题上。
            记录只存你的浏览器，不上传、不公开。
          </p>
        </header>

        <LogClient />
              <ToolsFaq slug="interview-log" />
      </main>
    </>
  )
}
