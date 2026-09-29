import type { Metadata } from "next"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { MockClient } from "@/components/tools/mock-client"
import { getAllQa } from "@/lib/qa"
import "../tools.css"
import { ToolsFaq } from "@/components/tools/tools-faq"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "AI 模拟面试 · 岗位剧本 / 简历深挖 / 压力追问",
  description:
    "选面试官人格（温和引导/冷酷打断/细节抠挖/架构挑战/HR 观察），跑一场像真面试的模拟：按方向组卷或粘贴简历被逐条深挖，压力模式每题追问到底，答完出复盘报告，错题自动进错题本。免费、无注册、本机运行。",
  keywords: ["AI 模拟面试", "Agent 面试练习", "简历深挖面试", "压力面试", "面试复盘"],
  alternates: { canonical: "/tools/mock-interview" },
}

export default function MockInterviewPage() {
  const qaList = getAllQa().map((q) => ({
    slug: q.slug,
    question: q.question,
    oneLine: q.oneLine,
    category: q.category,
    tags: q.tags,
  }))

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "工具", item: `${SITE}/tools` },
      { "@type": "ListItem", position: 3, name: "AI 模拟面试", item: `${SITE}/tools/mock-interview` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker">免费工具 · MOCK INTERVIEW</p>
          <h1>AI 模拟面试</h1>
          <p className="tk-lede">
            会背和会说之间隔一场面试。这里给你一场接近真实的演练：挑一个面试官人格，
            按目标方向组卷、或贴上简历等着被逐条深挖、或开压力模式被追问到底。
            答完出复盘报告，没答上的题自动进错题本。不注册、不上传，全程在你浏览器里。
          </p>
        </header>

        <MockClient qaList={qaList} />

        <section className="tk-block" style={{ marginTop: 24 }}>
          <h3>怎么练最有效</h3>
          <p className="tk-block-desc">
            第一遍用温和人格把话说完整，第二遍换冷酷人格压缩到一分钟版本，第三遍开压力模式——
            真面试里让你崩的从来不是题本身，是「说了一半被追问细节」。作答时开口说或打字都行，
            但一定要先答再看参考答案，看完再自评，顺序反了就变成背题。
          </p>
          <div className="tk-cta-grid">
            <Link href="/interview/quiz">
              <div className="t">抽题快练模式</div>
              <div className="d">没有剧本的纯抽题自测，适合碎片时间</div>
            </Link>
            <Link href="/tools/gap-test">
              <div className="t">先定位短板</div>
              <div className="d">不知道练什么方向，先跑八域 Gap 自测</div>
            </Link>
            <Link href="/mianjing">
              <div className="t">看真实面试长什么样</div>
              <div className="d">一手面经复盘，追问链原样保留</div>
            </Link>
          </div>
        </section>
              <ToolsFaq slug="mock-interview" />
      </main>
    </>
  )
}
