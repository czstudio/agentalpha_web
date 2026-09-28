import type { Metadata } from "next"
import Link from "next/link"
import { ROADMAPS, roadmapQaCount } from "@/lib/roadmap"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "AI Agent 求职学习路线（Agent 开发 / RAG 工程 / LLM 应用 / AI Infra）",
  description:
    "四条学习路线把 12 章专栏、分类题库、术语表与项目卡组装成方向化刷题路径：Agent 应用开发、RAG 工程师、LLM 应用开发、AI Infra。每条路线给章节顺序、题目范围与岗位画像，按方向准备面试少走弯路。",
  keywords: [
    "AI Agent 学习路线",
    "大模型面试准备",
    "RAG 工程师路线",
    "AI Infra 学习",
    "Agent 开发 岗位准备",
    "大模型求职规划",
  ],
  alternates: { canonical: "/roadmap" },
}

export default function RoadmapIndexPage() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AI Agent 求职学习路线",
    numberOfItems: ROADMAPS.length,
    itemListElement: ROADMAPS.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${r.name}学习路线`,
      url: `${SITE}/roadmap/${r.slug}`,
    })),
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: "学习路线", item: `${SITE}/roadmap` },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <div className="ivu-wide">
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <span className="cur">学习路线</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">按方向刷 · ROADMAP</p>
        <h1 className="ivc-hero-title">AI Agent 求职学习路线</h1>
        <p className="ivc-hero-sub">
          同一套题库，四个方向四种走法。每条路线给章节顺序、题目范围、术语与项目卡，先确认方向再刷题，比从第一页刷到最后少花一半时间。
        </p>
        <div className="ivq-hero-actions">
          <Link className="ivq-hero-btn" href="/interview/qa">
            不挑方向，直接刷全部题库
          </Link>
          <span className="ivq-hero-btnnote">方向路线只是排序，不是围墙</span>
        </div>
      </header>

      <div className="ivu-wide">
        <div className="road-grid">
          {ROADMAPS.map((r) => (
            <Link key={r.slug} href={`/roadmap/${r.slug}`} className="road-card">
              <span className="road-card-kicker">{r.roles[0]}</span>
              <h2 className="road-card-name">{r.name}</h2>
              <p className="road-card-tagline">{r.tagline}</p>
              <p className="road-card-meta">
                {r.chapters.length} 章顺序 · {roadmapQaCount(r)} 道速答题 · {r.roles.join(" / ")}
              </p>
              <span className="road-card-go">看这条路线 →</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
