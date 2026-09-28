import type { Metadata } from "next"
import Link from "next/link"
import { getAllQa } from "@/lib/qa"
import { getCategories } from "@/lib/interview"
import { QuizClient, type QuizCategory, type QuizQaItem } from "@/components/interview/quiz-client"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "模拟面试 · 抽题自测",
  description:
    "从面试题库抽一组题，先自己开口说，再亮参考答案自评，答上了还是没答上一键记录。错题优先重抽，掌握进度存在本地，面试前拿它收尾。",
  keywords: ["Agent 模拟面试", "大模型面试自测", "面试抽题", "AI 面试练习"],
  alternates: { canonical: "/interview/quiz" },
}

export default function QuizPage() {
  const categories = getCategories()
  const items: QuizQaItem[] = getAllQa().map((it) => ({
    slug: it.slug,
    question: it.question,
    oneLine: it.oneLine,
    category: it.category,
    minutes: it.minutes,
  }))
  const quizCats: QuizCategory[] = categories
    .map((c) => ({
      cat: c.cat,
      name: c.name,
      count: items.filter((it) => it.category === c.cat).length,
    }))
    .filter((c) => c.count > 0)

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: "模拟面试", item: `${SITE}/interview/quiz` },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="ivu-wide">
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <span className="cur">模拟面试</span>
        </nav>
      </div>
      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">模拟面试 · SELF DRILL</p>
        <h1 className="ivc-hero-title">抽一组题，开口自己答</h1>
        <p className="ivc-hero-sub">
          和翻书刷题不一样：先看题自己说，说不全再亮答案，自评「答上了」还是「没答上」。
          没答上的题下一轮优先出现，掌握进度记在你自己的浏览器里，不用注册。
        </p>
      </header>
      <div className="ivu-wide">
        <QuizClient items={items} categories={quizCats} />
      </div>
      <div className="ivu-wide">
        <aside className="ivq-cta">
          <div>
            <p className="ivz-cta-t">答不上别硬背</p>
            <p className="ivz-cta-d">
              每道题的速答页里有完整答法、面试官的追问点和常见的坑。抽题暴露短板，速答页补短板，这一圈转起来才叫复习。
            </p>
          </div>
          <div className="ivq-cta-links">
            <Link className="ivq-cta-btn" href="/interview/qa">
              回题库速刷
            </Link>
            <Link className="ivq-cta-btn ivq-cta-btn--ghost" href="/interview">
              看深度解析
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
