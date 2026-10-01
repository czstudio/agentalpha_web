import type { Metadata } from "next"
import Link from "next/link"
import { ROADMAPS, roadmapQaCount } from "@/lib/roadmap"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "求职路线（Agent 开发 / RAG 工程 / LLM 应用 / AI Infra）· 主线课程的岗位读法",
  description:
    "四条求职路线是主线课程（12 章）的岗位侧重读法：每条给章节先读哪些、题目范围与岗位画像。学还是跟主线课程走，路线只管你的岗位侧重。",
  keywords: [
    "AI Agent 求职路线",
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
    name: "AI Agent 求职路线",
    numberOfItems: ROADMAPS.length,
    itemListElement: ROADMAPS.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${r.name}求职路线`,
      url: `${SITE}/roadmap/${r.slug}`,
    })),
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: "求职路线", item: `${SITE}/roadmap` },
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
          <span className="cur">求职路线</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">求职路线 · CAREER ROUTES</p>
        <h1 className="ivc-hero-title">求职路线</h1>
        <p className="ivc-hero-sub">
          这是主线课程（12 章）的岗位侧重读法：每条路线告诉你先读哪几章、跳过哪章、补刷哪些题。学习本身跟主线课程走，路线只管你的岗位侧重。
        </p>
        <div className="ivq-hero-actions">
          <Link className="ivq-hero-btn" href="/interview#chapters">
            回主线课程
          </Link>
          <span className="ivq-hero-btnnote">路线 = 主线的岗位读法，不是另一套课</span>
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
