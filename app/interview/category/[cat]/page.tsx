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
import { getCategoryLearnData, GROUP_TO_CATS } from "@/lib/learn-path"
import { getAllGlossary } from "@/lib/glossary"
import fs from "node:fs"
import path from "node:path"

/** 该分类第一张可用的手绘概念图 */
function categoryDiagram(cat: string): string | null {
  const names = fs.readdirSync(path.join(process.cwd(), "public", "images", "diagrams"))
  const groups = Object.entries(GROUP_TO_CATS).filter(([, cats]) => cats.includes(cat)).map(([g]) => g)
  const terms = getAllGlossary().filter((t) => groups.includes(t.group))
  for (const t of terms) {
    if (names.includes(`${t.slug}.webp`)) return `/images/diagrams/${t.slug}.png`
  }
  return null
}

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
    title: `${category.name} · Agent 面试题库`,
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
  // 深度列表排除对比文与项目包（它们在学习路径区单独露出），排除置顶篇
  const rest = posts.filter(
    (post) =>
      (!flagship || post.slug !== flagship.slug) &&
      !(post.tags || []).some((t) => t.includes("对比选型") || t.includes("项目面试")),
  )
  // 量大时截断：默认只展示前 48，其余进分页视图
  const restShown = rest.length > 60 ? rest.slice(0, 48) : rest
  const restHidden = rest.length - restShown.length
  const other = all.filter((item) => item.cat !== cat && item.count > 0)
  const total = all.reduce((sum, item) => sum + item.count, 0)

  // 教程化学习路径数据：术语 → 速答题 → 深挖 → 实战
  const learn = getCategoryLearnData(cat)
  const catDiagram = categoryDiagram(cat)

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
              <span className="ivu-pin-badge">
                {flagship.slug.endsWith("-chapter-guide") ? "章节导读" : "真题集"}
              </span>
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

        {/* ── 系统学习路径：一个分类一站学完 ── */}
        <div className="ivu-sec">
          <h2 className="ivu-sec-t">系统学习路径</h2>
          <p className="ivu-sec-sub">LEARN PATH</p>
        </div>
        {catDiagram ? (
          <figure className="glo-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={catDiagram} alt={`${category.name}手绘概念图`} loading="lazy" />
          </figure>
        ) : null}

        <div className="learn-steps">
          <div className="learn-step">
            <span className="learn-step-no">1</span>
            <div className="learn-step-body">
              <p className="learn-step-t">先建立概念</p>
              <p className="learn-step-d">{learn.terms.length} 个术语的一句话定义与机制，链到术语页。</p>
              {learn.terms.length > 0 ? (
                <div className="learn-terms">
                  {learn.terms.slice(0, 8).map((t) => (
                    <Link key={t.slug} href={`/interview/glossary/${t.slug}`}>
                      {t.term}
                    </Link>
                  ))}
                  {learn.terms.length > 8 ? (
                    <Link className="learn-terms-more" href="/interview/glossary">
                      全部 {learn.terms.length} 个 →
                    </Link>
                  ) : null}
                </div>
              ) : (
                <p className="learn-step-empty">这个方向的术语页在补，先从刷题开始。</p>
              )}
            </div>
          </div>
          <div className="learn-step">
            <span className="learn-step-no">2</span>
            <div className="learn-step-body">
              <p className="learn-step-t">刷透高频题</p>
              <p className="learn-step-d">
                {learn.qa.length} 道速答题，每题一页：先这样答 → 面试官追问 → 回答的坑。往下就是完整题单。
              </p>
            </div>
          </div>
          <div className="learn-step">
            <span className="learn-step-no">3</span>
            <div className="learn-step-body">
              <p className="learn-step-t">深挖机制与选型</p>
              <p className="learn-step-d">
                {learn.deeps.length} 篇深度解析{learn.comparisons.length > 0 ? ` + ${learn.comparisons.length} 篇对比选型` : ""}
                ，逐层拆到原理与工程取舍。
              </p>
            </div>
          </div>
          <div className="learn-step">
            <span className="learn-step-no">4</span>
            <div className="learn-step-body">
              <p className="learn-step-t">实战检验</p>
              {learn.packs.length > 0 ? (
                <div className="learn-packs">
                  {learn.packs.map((p) => (
                    <Link key={p.slug} href={`/interview/${p.slug}`}>
                      {p.title}
                    </Link>
                  ))}
                </div>
              ) : null}
              <p className="learn-step-d">
                项目面试包讲「项目怎么讲才扛住追问」；再按公司检验：
                <Link href="/interview/jingchang">五厂真题集</Link>。
              </p>
            </div>
          </div>
        </div>

        {learn.qa.length > 0 ? (
          <>
            <div className="ivu-sec">
              <h2 className="ivu-sec-t">速答题单</h2>
              <p className="ivu-sec-sub">共 {learn.qa.length} 道</p>
            </div>
            <div className="ivq-rows">
              {learn.qa.map((item) => (
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
          </>
        ) : null}

        {posts.length ? (
          <>
            <div className="ivu-sec">
              <h2 className="ivu-sec-t">{flagship ? "分类内题目" : "全部题目"}</h2>
              <p className="ivu-sec-sub">共 {posts.length} 篇</p>
            </div>
            <div className="ivu-catlist">
              {restShown.map((post) => (
                <InterviewRow
                  key={post.slug}
                  post={post}
                  hasCover={hasCover(post.slug)}
                  showCover
                />
              ))}
              {restHidden > 0 ? (
                <Link href={`/interview/category/${category.cat}/all`} className="ivu-catlist-more">
                  还有 {restHidden} 篇真题解析 · 进入分页列表 →
                </Link>
              ) : null}
              {rest.length === 0 ? (
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
              <b>培养能解决真实问题、能落地的 AI 人才。</b>训练营以实战为核心——面试题里的答案，在开源项目和论文里亲手做出来。
            </p>
            <div className="ivu-cta-actions">
              <Link href="/learn" className="ivu-btn ivu-btn-primary">
                查看学习路线
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
