import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Clock3, Sparkles } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { getAllArticles } from "@/lib/articles"

export const metadata: Metadata = {
  title: "AgentAlpha 原创文章",
  description:
    "AgentAlpha 公众号原创文章的站内版本：Agent 架构、多智能体、Agentic RL 与后训练，一篇讲透一个真实问题。",
  alternates: { canonical: "/articles" },
}

const categoryColors: Record<string, string> = {
  技术分享: "aa-articles-pill--tech",
  社区动态: "aa-articles-pill--community",
  面试实战: "aa-articles-pill--interview",
}

export default function ArticlesIndexPage() {
  const articles = getAllArticles()
  const totalMinutes = articles.reduce((sum, a) => sum + a.minutes, 0)

  return (
    <>
      <Navigation />
      <main className="aa-notes">
        <header className="aa-notes-hero">
          <div className="aa-notes-shell">
            <p className="aa-notes-eyebrow">
              <Sparkles aria-hidden /> AgentAlpha 原创 · 公众号同款
            </p>
            <h1>
              公众号里的长文，<br />
              <em>原文都在这里。</em>
            </h1>
            <p className="aa-notes-lede">
              与公众号同步发布的原创深文：真实面试、生产事故与论文机制，一篇讲透一个问题。站内排版，阅读体验一致。
            </p>
            <div className="aa-notes-stats">
              <span>{articles.length} 篇文章</span>
              <span>{totalMinutes} 分钟</span>
            </div>
          </div>
        </header>

        <section className="aa-notes-series" aria-label="全部文章">
          <div className="aa-notes-shell">
            <div className="aa-notes-grid">
              {articles.map((article) => (
                <Link key={article.slug} href={`/articles/${article.slug}`} className="aa-notes-card">
                  <div className="aa-notes-card-top">
                    <span className={`aa-articles-pill ${categoryColors[article.category] || "aa-articles-pill--tech"}`}>
                      {article.category}
                    </span>
                    <span className="aa-notes-card-minutes">
                      <Clock3 aria-hidden /> {article.minutes} 分钟
                    </span>
                  </div>
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                  <span className="aa-notes-card-date">{article.date}</span>
                  <span className="aa-notes-card-cta">
                    开始阅读 <ArrowRight aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
            {articles.length === 0 && (
              <p style={{ color: "var(--aa-muted)", textAlign: "center", padding: "48px 0" }}>
                文章即将上线。
              </p>
            )}
          </div>
        </section>

        <section className="aa-notes-outro">
          <div className="aa-notes-shell">
            <p>△ AgentAlpha 原创文章</p>
            <h2>新篇随公众号持续更新。</h2>
            <Link href="/#join" className="aa-notes-join">
              加入社区 <ArrowRight aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
