import type { Metadata } from "next"
import { Navigation } from "@/components/navigation"
import { LogClient } from "@/components/tools/log-client"
import "../tools.css"
import { ToolsFaq } from "@/components/tools/tools-faq"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "面试复盘本 · 面完当天记，不再重复挂同一类题",
  description:
    "记录每场真实面试：公司、轮次、被问题目、卡壳点、下次策略。自动统计你反复挂在哪一轮、哪类主题，把每场面试变成一次针对性补课。数据只存本机浏览器，不上传、不公开。",
  keywords: ["面试复盘", "面经记录", "卡壳点整理", "求职复盘工具"],
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
          <p className="tk-kicker">免费工具 · INTERVIEW LOG</p>
          <h1>面试复盘本</h1>
          <p className="tk-lede">
            每场面试都是面试官替你做的一次免费诊断——他挑的地方就是你不会的地方。
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
