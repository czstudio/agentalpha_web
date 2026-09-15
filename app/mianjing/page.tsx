import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Clock3 } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { getMianjingList } from "@/lib/mianjing"

export const metadata: Metadata = {
  title: "面经 · 面试笔记",
  description: "真实面试的完整复盘：每道题怎么拆、追问往哪挖、坑踩在哪里。从现场回来，不带修饰。",
  alternates: { canonical: "/mianjing" },
}

export default function MianjingIndexPage() {
  const list = getMianjingList()

  return (
    <>
      <Navigation />
      <main className="mj-index">
        <header className="mj-index-hero">
          <div className="aa-notes-shell">
            <p className="mj-index-kicker">面经 · 面试笔记</p>
            <h1>从现场回来的面试，<br /><em>原样摊开。</em></h1>
            <p className="mj-index-lede">
              每篇都是一个真实轮次的完整复盘：题目怎么拆、追问往哪挖、坑踩在哪里、最后怎么收。不修饰，不带答案腔。
            </p>
          </div>
        </header>

        <div className="aa-notes-shell mj-list">
          {list.map((doc) => (
            <Link key={doc.slug} href={`/mianjing/${doc.slug}`} className="mj-card">
              <div className="mj-card-top">
                <span className="mj-company-pill">{doc.company}</span>
                <span className="aa-note-minutes">
                  <Clock3 aria-hidden /> {doc.minutes} 分钟读完
                </span>
              </div>
              <h2>{doc.title}</h2>
              <p className="mj-card-role">{doc.role}</p>
              <p className="mj-card-excerpt">{doc.excerpt}</p>
              <div className="mj-card-foot">
                <span className="mj-tags">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="mj-tag">{tag}</span>
                  ))}
                </span>
                <span className="mj-card-date">{doc.date}</span>
              </div>
              <span className="mj-card-cta">
                阅读面经 <ArrowRight aria-hidden />
              </span>
            </Link>
          ))}
        </div>

        <section className="aa-notes-outro mj-outro">
          <div className="aa-notes-shell">
            <p>△ AgentAlpha 面试笔记</p>
            <h2>题是新的，判断力是练出来的。</h2>
            <Link href="/#join" className="aa-notes-join">
              加入社区 <ArrowUpRight aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
