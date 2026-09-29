import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getAllQa } from "@/lib/qa"
import { TRACKS, getTrack, getQaByTrack } from "@/lib/tracks"

const SITE = "https://agentalpha.top"

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return TRACKS.filter((t) => getQaByTrack(t.slug).length > 0).map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const track = getTrack(slug)
  if (!track) return {}
  return {
    title: `${track.name}面试题 · 高频真题与答案`,
    description: `${track.note}站内按该岗位方向归纳的公开面经高频题，一题一页带答案、追问与常见错误答法。`,
    alternates: { canonical: `/interview/track/${slug}` },
  }
}

export default async function TrackPage({ params }: PageProps) {
  const { slug } = await params
  const track = getTrack(slug)
  if (!track) notFound()
  const qa = getQaByTrack(slug)

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: `${track.name}面试题`, item: `${SITE}/interview/track/${slug}` },
    ],
  }
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${track.name}面试题`,
    numberOfItems: qa.length,
    itemListElement: qa.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.question,
      url: `${SITE}/interview/qa/${item.slug}`,
    })),
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      <div className="ivu-wide">
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <Link href="/interview/jingchang">大厂真题库</Link>
          <span className="sep">/</span>
          <span className="cur">{track.name}</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">岗位方向 · TRACK</p>
        <h1 className="ivc-hero-title">{track.name}面试题</h1>
        <p className="ivc-hero-sub">{track.note}</p>
        <div className="ivq-hero-actions">
          <span className="ivq-hero-btnnote">{qa.length} 道题 · 题目口径为公开面经与岗位 JD 的高频归纳</span>
        </div>
      </header>

      <div className="ivu-wide">
        <section className="ivq-cat">
          <div className="ivq-rows">
            {qa.map((item) => (
              <div className="ivq-row" key={item.slug}>
                <Link className="ivq-row-main" href={`/interview/qa/${item.slug}`}>
                  <span className="ivq-row-q">Q · {item.question}</span>
                  <span className="ivq-row-a">{item.oneLine}</span>
                  <span className="ivq-row-go" aria-hidden>
                    查看答案 →
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="ivq-cat">
          <div className="ivq-cat-head">
            <h2 className="ivq-cat-name">其他岗位方向</h2>
          </div>
          <div className="ivq-rows">
            {TRACKS.filter((t) => t.slug !== slug && getQaByTrack(t.slug).length > 0).map((t) => (
              <div className="ivq-row" key={t.slug}>
                <Link className="ivq-row-main" href={`/interview/track/${t.slug}`}>
                  <span className="ivq-row-q">{t.name} · {getQaByTrack(t.slug).length} 题</span>
                  <span className="ivq-row-a">{t.note}</span>
                  <span className="ivq-row-go" aria-hidden>
                    进入 →
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
