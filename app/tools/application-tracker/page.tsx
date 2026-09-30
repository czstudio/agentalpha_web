import type { Metadata } from "next"
import { LayoutList } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { TrackerClient } from "@/components/tools/tracker-client"
import "../tools.css"
import { ToolsFaq } from "@/components/tools/tools-faq"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "求职投递管理 - 免费投递记录看板与漏斗统计",
  description:
    "免费求职投递管理工具:未投到 Offer 八个状态的看板,自动汇总投递漏斗与进面率,告诉你问题出在简历还是面试。数据只存本机浏览器,不上传、不公开。",
  keywords: ["求职投递管理", "投递记录", "投递看板", "求职CRM", "秋招投递", "投递统计"],
  alternates: { canonical: "/tools/application-tracker" },
}

export default function ApplicationTrackerPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "工具", item: SITE + "/tools" },
      { "@type": "ListItem", position: 3, name: "投递看板", item: SITE + "/tools/application-tracker" },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker"><LayoutList size={13} strokeWidth={2} aria-hidden /> 免费工具 · APPLICATION TRACKER</p>
          <h1>投递看板</h1>
          <p className="tk-lede">
            offer 少的常见原因不是实力不够，是投递混乱：忘了跟进、错过笔试、复盘不出挂在哪轮。
            每投一家记一笔，状态变了随手改，两周后漏斗会自己告诉你：是简历问题还是面试问题。
            数据只存本机浏览器。
          </p>
        </header>

        <TrackerClient />
              <ToolsFaq slug="application-tracker" />
      </main>
    </>
  )
}
