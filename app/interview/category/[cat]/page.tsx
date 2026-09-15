import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  getCategories,
  getCategoriesWithPosts,
  getCategory,
  hasCover,
} from "@/lib/interview"
import { InterviewRow } from "@/components/interview/interview-row"
import { CategoryCard } from "@/components/interview/category-card"

interface PageProps {
  params: Promise<{ cat: string }>
}

/** 只预渲染词表里已有的分类 */
export function generateStaticParams() {
  return getCategories().map((category) => ({ cat: category.cat }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cat } = await params
  const category = getCategory(cat)
  if (!category) return {}
  const posts = getCategoriesWithPosts(true).find((item) => item.cat === cat)
  const count = posts?.count || 0
  return {
    title: `${category.name}｜Agent 面试题库 · AgentAlpha 面试间`,
    description: `${category.intro}已上线 ${count} 篇。`.slice(0, 150),
    alternates: { canonical: `/interview/category/${category.cat}` },
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { cat } = await params
  const category = getCategory(cat)
  if (!category) notFound()

  const all = getCategoriesWithPosts(true)
  const self = all.find((item) => item.cat === cat)
  if (!self) notFound()

  const posts = self.posts
  // 置顶真题集：分类元数据指定了 flagship 且该篇已上线时才置顶
  const flagship = category.flagship
    ? posts.find((post) => post.slug === category.flagship)
    : undefined
  const rest = flagship ? posts.filter((post) => post.slug !== flagship.slug) : posts
  const other = all.filter((item) => item.cat !== cat && item.count > 0)
  const total = all.reduce((sum, item) => sum + item.count, 0)

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: "https://agentalpha.top" },
      { "@type": "ListItem", position: 2, name: "面试间", item: "https://agentalpha.top/interview" },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: `https://agentalpha.top/interview/category/${category.cat}`,
      },
    ],
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div
        className="ivu-wide"
        style={{ "--cc": `var(--cat-${category.cat})` } as React.CSSProperties}
      >
        <nav className="ivu-crumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span className="sep">/</span>
          <Link href="/interview">面试间</Link>
          <span className="sep">/</span>
          <span className="cur">{category.name}</span>
        </nav>

        <header className="ivu-cathead">
          <div className="ivu-cathead-kicker">{category.cat.toUpperCase()}</div>
          <h1 className="ivu-cathead-title">{category.name}</h1>
          <p className="ivu-cathead-intro">{category.intro}</p>
          <div className="ivu-cathead-stats">
            <span>
              <b>{self.count}</b>篇已上线
            </span>
            <span>
              <b>{category.planned}</b>篇规划中
            </span>
            <span className="ivu-cathead-src">取材：{category.kbChapter}</span>
          </div>
        </header>

        {flagship ? (
          <>
            <div className="ivu-sec">
              <h2 className="ivu-sec-t">本篇分类真题集</h2>
              <p className="ivu-sec-sub">PICKED</p>
            </div>
            <Link href={`/interview/${flagship.slug}`} className="ivu-pin">
              <span className="ivu-pin-badge">真题集</span>
              <span className="ivu-pin-main">
                <span className="ivu-pin-title">{flagship.title}</span>
                <span className="ivu-pin-sub">
                  共 {flagship.minutes} 分钟 · {flagship.excerpt.slice(0, 46)}…
                </span>
              </span>
              <span className="ivu-pin-go">进入 →</span>
            </Link>
          </>
        ) : null}

        {posts.length ? (
          <>
            <div className="ivu-sec">
              <h2 className="ivu-sec-t">{flagship ? "分类内题目" : "全部题目"}</h2>
              <p className="ivu-sec-sub">共 {posts.length} 篇</p>
            </div>
            <div className="ivu-catlist">
              {(flagship ? rest : posts).map((post) => (
                <InterviewRow
                  key={post.slug}
                  post={post}
                  hasCover={hasCover(post.slug)}
                  showCover
                />
              ))}
              {flagship && rest.length === 0 ? (
                <p className="ivu-empty" style={{ padding: "18px 4px" }}>
                  这个分类暂时只有真题集，配套题解在施工中。
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="ivu-empty">
            <p>
              这个分类还在施工中（规划 {category.planned} 篇）。先去
              <Link href="/interview"> 面试间 </Link>
              看已上线的 {total} 篇。
            </p>
          </div>
        )}

        {other.length ? (
          <>
            <div className="ivu-sec">
              <h2 className="ivu-sec-t">其他分类</h2>
              <p className="ivu-sec-sub">{other.length} 个</p>
            </div>
            <div className="ivu-catgrid">
              {other.map((item) => (
                <CategoryCard key={item.cat} category={item} />
              ))}
            </div>
          </>
        ) : null}

        <div style={{ maxWidth: "var(--measure)", margin: "0 auto" }}>
          <div className="ivu-cta">
            <p className="ivu-cta-text">
              <b>题目常更常新，全部拆自真实面经。</b>想系统上手 Agent 工程，训练营有路线、有项目、有人带。
            </p>
            <div className="ivu-cta-actions">
              <Link href="/learn" className="ivu-btn ivu-btn-primary">
                了解训练营
              </Link>
              <Link href="/interview" className="ivu-btn ivu-btn-ghost">
                全部题目
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
