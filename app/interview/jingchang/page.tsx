import type { Metadata } from "next"
import Link from "next/link"
import { getAllQa } from "@/lib/qa"
import { getCategories } from "@/lib/interview"
import { COMPANIES } from "@/lib/companies"
import { TRACKS } from "@/lib/tracks"
import "./jingchang-enhance.css"

const SITE = "https://agentalpha.top"

/** 首屏分组的五厂（COMPANIES 词表顺序），其余公司进矩阵墙 */
const FOCUS = ["bytedance", "alibaba", "tencent", "baidu", "meituan"]

function companySlugs(item: { company: string }) {
  return item.company
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export const metadata: Metadata = {
  title: "大厂大模型 Agent 面试真题库（20 厂 · 含答案与追问）",
  description:
    "字节、阿里、腾讯、百度、美团、京东、快手、DeepSeek、月之暗面等 20 家大厂的大模型与 Agent 岗公开面经高频真题，按公司与岗位方向双维度组织，一题一页带答案、追问与常见错误答法。题目口径：公开面经与岗位 JD 的高频归纳，不是内部真题。",
  keywords: [
    "大厂面试题",
    "大模型面试题",
    "Agent 面试题",
    "字节大模型面试题",
    "阿里大模型面试题",
    "腾讯混元面试题",
    "百度文心面试题",
    "美团大模型面试题",
    "Agent 开发面试",
    "Agent 算法面试",
  ],
  alternates: { canonical: "/interview/jingchang" },
}

export default function JingchangPage() {
  const all = getAllQa()
  const category = getCategories().find((c) => c.cat === "jingchang")
  const items = all.filter((item) => item.category === "jingchang")

  const countByCompany = new Map<string, number>()
  for (const item of items) {
    for (const slug of companySlugs(item)) {
      countByCompany.set(slug, (countByCompany.get(slug) ?? 0) + 1)
    }
  }
  const countByTrack = new Map<string, number>()
  for (const item of all) {
    for (const slug of item.track
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      countByTrack.set(slug, (countByTrack.get(slug) ?? 0) + 1)
    }
  }

  const groups = FOCUS.map((slug) => {
    const company = COMPANIES.find((c) => c.slug === slug)!
    return { company, items: items.filter((item) => companySlugs(item).includes(slug)) }
  }).filter((group) => group.items.length > 0)
  const rest = items.filter((item) => !FOCUS.some((slug) => companySlugs(item).includes(slug)))
  const coveredCompanies = COMPANIES.filter((c) => (countByCompany.get(c.slug) ?? 0) > 0)

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "大厂大模型 Agent 面试真题库",
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.question,
      url: `${SITE}/interview/qa/${item.slug}`,
    })),
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "面试间", item: `${SITE}/interview` },
      { "@type": "ListItem", position: 3, name: "大厂真题库", item: `${SITE}/interview/jingchang` },
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
          <span className="cur">大厂真题库</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">大厂真题 · 20 COMPANIES</p>
        <h1 className="ivc-hero-title">大厂大模型 Agent 面试真题库</h1>
        <p className="ivc-hero-sub">
          {category?.intro || "公开面经高频真题，一题一页带答案与追问。"}
        </p>
        <div className="jc-stats" aria-label="题库规模">
          <div className="jc-stat">
            <b>{items.length}</b>
            <span>大厂真题</span>
          </div>
          <div className="jc-stat">
            <b>{COMPANIES.length}</b>
            <span>覆盖公司</span>
          </div>
          <div className="jc-stat">
            <b>{TRACKS.length}</b>
            <span>岗位方向</span>
          </div>
          <div className="jc-stat">
            <b>{all.length}</b>
            <span>题库总量</span>
          </div>
        </div>
        <p className="ivq-hero-note">
          题目口径：来自公开面经与岗位 JD 的高频归纳，不是内部真题。想按技术方向刷，去
          <a href="/interview/qa">全部题库</a>；想查名词，去<a href="/interview/glossary">术语表</a>。
        </p>
        <div className="ivq-hero-actions">
          <Link className="ivq-hero-btn" href="#companies">
            按公司刷
          </Link>
          <Link className="ivq-hero-btn" href="#tracks">
            按岗位刷
          </Link>
          <span className="ivq-hero-btnnote">{coveredCompanies.length} 家已上线题集</span>
        </div>
        <div className="jc-hero-art" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/interview/jc-hero.jpg" alt="" loading="lazy" />
        </div>
      </header>

      <div className="ivu-wide">
        <section id="companies" className="jc-matrix-sec">
          <div className="jc-sec-head">
            <h2>按公司刷</h2>
            <p>20 家公司的题量与侧重。灰底的还在编纂，亮底的可直接进该公司题集。</p>
          </div>
          <div className="jc-matrix">
            {COMPANIES.map((company) => {
              const n = countByCompany.get(company.slug) ?? 0
              const inner = (
                <>
                  <span className="jc-co-name">{company.name}</span>
                  <span className={`jc-co-count ${n > 0 ? "has" : ""}`}>{n > 0 ? `${n} 题` : "编纂中"}</span>
                  <span className="jc-co-note">{company.note}</span>
                </>
              )
              return n > 0 ? (
                <Link key={company.slug} href={`/interview/company/${company.slug}`} className="jc-co">
                  {inner}
                </Link>
              ) : (
                <div key={company.slug} className="jc-co soon" aria-label={`${company.name} 题集编纂中`}>
                  {inner}
                </div>
              )
            })}
          </div>
        </section>

        <section id="tracks" className="jc-matrix-sec">
          <div className="jc-sec-head">
            <h2>按岗位刷</h2>
            <p>同一批题按岗位方向重组：Agent 开发、Agent 算法、AI 算法应用、多模态、Infra、通用基础。</p>
          </div>
          <div className="jc-tracks">
            {TRACKS.map((track) => {
              const n = countByTrack.get(track.slug) ?? 0
              const inner = (
                <>
                  <span className="jc-track-name">{track.name}</span>
                  <span className="jc-track-note">{track.note}</span>
                  <span className={`jc-track-count ${n > 0 ? "has" : ""}`}>{n > 0 ? `${n} 题` : "标注中"}</span>
                </>
              )
              return n > 0 ? (
                <Link key={track.slug} href={`/interview/track/${track.slug}`} className="jc-track">
                  {inner}
                </Link>
              ) : (
                <div key={track.slug} className="jc-track soon">
                  {inner}
                </div>
              )
            })}
          </div>
        </section>

        {groups.map(({ company, items: groupItems }) => (
          <section key={company.slug} className="ivq-cat">
            <div className="ivq-cat-head">
              <h2 className="ivq-cat-name">
                {company.name}
                <Link href={`/interview/company/${company.slug}`} className="ivq-cat-more">
                  全部{company.name}题 →
                </Link>
              </h2>
              <p className="ivq-cat-intro">{company.note}</p>
            </div>
            <div className="ivq-rows">
              {groupItems.map((item) => (
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
        ))}

        {rest.length > 0 ? (
          <section className="ivq-cat">
            <div className="ivq-cat-head">
              <h2 className="ivq-cat-name">其他公司真题</h2>
            </div>
            <div className="ivq-rows">
              {rest.map((item) => (
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
        ) : null}
      </div>
    </main>
  )
}
