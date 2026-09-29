import type { Metadata } from "next"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import "./tools.css"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "求职工具箱 · JD 拆解 / 简历体检 / Gap 自测 / 项目匹配",
  description:
    "面向 AI Agent 岗求职者的免费工具：JD 人话拆解器、简历体检、面试 Gap 自测、项目匹配器。全部浏览器本地运行，不注册、不上传。看懂岗位 → 测出差距 → 做项目 → 改简历，一条链路。",
  keywords: ["AI 求职工具", "简历优化工具", "JD 分析", "面试自测", "Agent 求职"],
  alternates: { canonical: "/tools" },
}

const TOOLS = [
  {
    href: "/tools/jd-analyzer",
    badge: "引流",
    badgeClass: "badge-flow",
    title: "JD 人话拆解器",
    desc: "粘贴目标岗位 JD，拆出岗位画像、考察词、JD 没写但面试会问的隐藏考点，并匹配站内真实面试题。配套大厂 JD 精拆样板库。",
  },
  {
    href: "/tools/resume",
    badge: "诊断",
    badgeClass: "badge-diag",
    title: "AI / Agent 岗简历体检",
    desc: "粘贴简历（可加 JD）做本地分析：逐词对比、能力覆盖证据评级、逐条批注、基于真实面经的追问预演与翻车风险。",
  },
  {
    href: "/tools/gap-test",
    badge: "诊断",
    badgeClass: "badge-diag",
    title: "面试 Gap 自测",
    desc: "八项能力自评 + 真题抽验防虚标，出能力雷达与一句人话结论，短板按优先级排好补课路径。",
  },
  {
    href: "/tools/project-matcher",
    badge: "诊断",
    badgeClass: "badge-diag",
    title: "项目匹配器",
    desc: "选方向、基础、时间，拿三个能写进简历、扛得住追问的项目方案：难度、时间预算、bullet 模板、验收指标。",
  },
]

const FLOW = [
  { step: "1", label: "看懂岗位", desc: "拆目标 JD，或看大厂精拆样板", href: "/jd" },
  { step: "2", label: "测出差距", desc: "Gap 自测出短板与补课路径", href: "/tools/gap-test" },
  { step: "3", label: "做项目", desc: "项目匹配器按时间拿方案", href: "/tools/project-matcher" },
  { step: "4", label: "改简历", desc: "体检工具查证据与追问风险", href: "/tools/resume" },
  { step: "5", label: "刷题面试", desc: "题库 179 题 + 模拟抽题", href: "/interview/qa" },
]

export default function ToolsIndexPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "求职工具箱", item: `${SITE}/tools` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker">免费工具 · TOOLBOX</p>
          <h1>AI Agent 岗求职工具箱</h1>
          <p className="tk-lede">
            看懂岗位 → 测出差距 → 做项目 → 改简历 → 刷题面试，一条链路的免费工具。
            全部纯前端实现：不注册、不上传，你的简历和 JD 不出浏览器。
          </p>
        </header>

        <section className="tk-block" style={{ marginBottom: 24 }}>
          <h3>求职路径</h3>
          <div className="tools-flow">
            {FLOW.map((f) => (
              <Link key={f.step} href={f.href} className="tools-flow-step">
                <span className="no">{f.step}</span>
                <span className="lb">{f.label}</span>
                <span className="ds">{f.desc}</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="tk-index-grid">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="tk-index-card">
              <span className={`badge ${t.badgeClass}`}>{t.badge}</span>
              <div className="t">{t.title}</div>
              <div className="d">{t.desc}</div>
            </Link>
          ))}
        </div>

        <section className="tk-block" style={{ marginTop: 24 }}>
          <h3>内容库配套</h3>
          <p className="tk-block-desc">工具的判断依据全部来自站内真实内容，不是拍脑袋的规则：</p>
          <div className="tk-cta-grid">
            <Link href="/jd">
              <div className="t">大厂 JD 拆解库</div>
              <div className="d">字节/阿里/腾讯/百度/美团/小红书热门岗位精拆</div>
            </Link>
            <Link href="/interview/qa">
              <div className="t">面试题库</div>
              <div className="d">179 道高频题速答，一题一页带答案与追问</div>
            </Link>
            <Link href="/roadmap">
              <div className="t">学习路线</div>
              <div className="d">四个方向的章节顺序、题目与项目卡</div>
            </Link>
            <Link href="/mianjing">
              <div className="t">真实面经</div>
              <div className="d">一手面经复盘，追问链原样保留</div>
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
