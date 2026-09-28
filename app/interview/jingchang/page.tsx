import type { Metadata } from "next"
import Link from "next/link"
import { getAllQa } from "@/lib/qa"
import { getCategories } from "@/lib/interview"
import { COMPANIES } from "@/lib/companies"

const SITE = "https://agentalpha.top"

/** 索引页聚焦的五厂（COMPANIES 词表顺序） */
const FOCUS = ["bytedance", "alibaba", "tencent", "baidu", "meituan"]

export const metadata: Metadata = {
  title: "五厂大模型 Agent 面试真题集（字节/阿里/腾讯/百度/美团，含答案）",
  description:
    "字节、阿里、腾讯、百度、美团五厂大模型与 Agent 岗的公开面经高频真题，一题一页带答案、追问与常见错误答法。题目口径：公开面经与岗位 JD 的高频归纳，不是内部真题。",
  keywords: [
    "五厂面试题",
    "字节大模型面试题",
    "阿里大模型面试题",
    "腾讯混元面试题",
    "百度文心面试题",
    "美团大模型面试题",
    "大厂 Agent 面经",
    "大模型真题",
  ],
  alternates: { canonical: "/interview/jingchang" },
}

export default function JingchangPage() {
  const all = getAllQa()
  const category = getCategories().find((c) => c.cat === "jingchang")
  const items = all.filter((item) => item.category === "jingchang")
  const groups = FOCUS.map((slug) => {
    const company = COMPANIES.find((c) => c.slug === slug)!
    return {
      company,
      items: items.filter((item) =>
        item.company
          .split(",")
          .map((s) => s.trim())
          .includes(slug),
      ),
    }
  }).filter((group) => group.items.length > 0)
  const rest = items.filter(
    (item) =>
      !FOCUS.some((slug) =>
        item.company
          .split(",")
          .map((s) => s.trim())
          .includes(slug),
      ),
  )

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "五厂大模型 Agent 面试真题集",
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
      { "@type": "ListItem", position: 3, name: "五厂真题集", item: `${SITE}/interview/jingchang` },
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
          <span className="cur">五厂真题集</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">五厂真题 · JINGCHANG</p>
        <h1 className="ivc-hero-title">五厂大模型 Agent 面试真题集</h1>
        <p className="ivc-hero-sub">
          {category?.intro || "字节、阿里、腾讯、美团、百度五厂的公开面经高频真题，一题一页带答案与追问。"}
        </p>
        <p className="ivq-hero-note">
          题目口径：来自公开面经与岗位 JD 的高频归纳，不是内部真题。想按技术方向刷，去
          <a href="/interview/qa">全部题库</a>；想查名词，去<a href="/interview/glossary">术语表</a>。
        </p>
        <div className="ivq-hero-actions">
          <Link className="ivq-hero-btn" href="/interview/qa">
            按方向刷全部题库
          </Link>
          <span className="ivq-hero-btnnote">{items.length} 道五厂真题</span>
        </div>
      </header>

      <div className="ivu-wide">
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
              <h2 className="ivq-cat-name">其他来源真题</h2>
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
