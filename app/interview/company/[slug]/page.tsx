import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { COMPANIES, getCompany, getQaByCompany } from "@/lib/companies"
import { FACTORY_QUESTIONS } from "@/lib/factory-questions"
import { getMianjingList } from "@/lib/mianjing"
import { EXTERNAL_QUESTIONS, EXTERNAL_SOURCES, EXTERNAL_PROCESS } from "@/lib/company-external-questions"
import { getAllJd } from "@/lib/jd"

const SITE = "https://agentalpha.top"

interface PageProps {
  params: Promise<{ slug: string }>
}

/** 外部开源题库（链接级参考，内容以原仓库为准；公司覆盖来自仓库自述） */
const EXTERNAL_REPOS: Array<{ name: string; url: string; note: string; covers: string[] }> = [
  {
    name: "ai-engineering-interview-questions-company-wise",
    url: "https://github.com/pallavi-shekhar/ai-engineering-interview-questions-company-wise",
    note: "35 家公司 AI 工程面试题（含 DeepSeek / 月之暗面 / 智谱 / 阿里通义 / OpenAI / Google 等），按主题+公司分节",
    covers: ["deepseek", "moonshot", "zhipu", "alibaba", "openai", "google"],
  },
  {
    name: "AgentGuide · 12-company-interview-cases",
    url: "https://github.com/adongwanai/AgentGuide/blob/main/docs/04-interview/12-company-interview-cases.md",
    note: "12 家大厂真实面经案例集锦（中文，按公司整理）",
    covers: ["cn"],
  },
  {
    name: "AIGC-Interview-Book",
    url: "https://github.com/WeThinkIn/AIGC-Interview-Book",
    note: "「三年面试五年模拟」AIGC / LLM / Agent 算法岗面试书，含公司题库与面经（中文）",
    covers: ["cn"],
  },
  {
    name: "hello-agents · 面试问题总结",
    url: "https://github.com/datawhalechina/hello-agents/blob/main/Extra-Chapter/Extra01-%E9%9D%A2%E8%AF%95%E9%97%AE%E9%A2%98%E6%80%BB%E7%BB%93.md",
    note: "Datawhale 出品的 LLM / VLM / Agent 秋招八股合集（中文）",
    covers: ["cn"],
  },
  {
    name: "FAANG-Coding-Interview-Questions · AI 公司篇",
    url: "https://github.com/ombharatiya/FAANG-Coding-Interview-Questions/blob/main/AI-Companies-Interview-Questions.md",
    note: "基于 1500+ 候选人面经整理的顶级 AI 实验室面试流程与题目（英文）",
    covers: ["openai", "google"],
  },
  {
    name: "LLM_Interview_Prepare",
    url: "https://github.com/Joining-AI/LLM_Interview_Prepare",
    note: "大模型常见面试题与面试经验整理（中文）",
    covers: ["cn"],
  },
  {
    name: "llm_interview_note",
    url: "https://github.com/wdndev/llm_interview_note",
    note: "LLM 知识体系与面试题笔记（中文）",
    covers: ["cn"],
  },
  {
    name: "llm-interview-questions",
    url: "https://github.com/MisterBooo/llm-interview-questions",
    note: "大模型面试题图解 100 题，分 14 个模块（中文）",
    covers: ["cn"],
  },
]

function normalizeCompany(raw: string): string {
  return raw.replace(/[""\s]/g, "")
}

/** 面经的公司字段是中文别名（如「字节跳动」「月之暗面（Kimi）」），用名称+别名做包含匹配 */
function mianjingMatches(mianjingCompany: string, company: { name: string; aliases: string[] }): boolean {
  const raw = normalizeCompany(mianjingCompany)
  if (!raw || raw === "某大厂") return false
  if (raw.includes(company.name)) return true
  return company.aliases.some((a) => a && (raw.includes(a) || company.name.includes(raw)))
}

export function generateStaticParams() {
  // 只静态化已有题目的公司页，避免空集合页被判薄页
  return COMPANIES.filter((c) => getQaByCompany(c.slug).length > 0).map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const company = getCompany(slug)
  if (!company) return {}
  const qa = getQaByCompany(slug)
  const mianjing = getMianjingList().filter((m) => mianjingMatches(m.company, company))
  const description = `${company.name}大模型 Agent 方向面试准备${qa.length > 0 ? `：${mianjing.length} 篇真实面经实录、${qa.length} 道高频归纳速答` : ""}，附该公司 JD 原文链接与开源题库参考，一题一页带答案与追问。`.slice(0, 160)
  return {
    title: `${company.name}大模型 Agent 面试题（面经实录 + 高频归纳）· 公司题库`,
    description,
    keywords: [`${company.name} 面试题`, `${company.name} 面经`, ...company.aliases.map((a) => `${a} 面试题`), "大模型面试题", "Agent 面试题"],
    alternates: { canonical: `/interview/company/${company.slug}` },
    openGraph: { title: `${company.name}大模型 Agent 面试题`, description },
  }
}

export default async function CompanyPage({ params }: PageProps) {
  const { slug } = await params
  const company = getCompany(slug)
  if (!company) notFound()
  const qaAll = getQaByCompany(slug)
  // 单厂独占题优先；多厂共考的单独折叠
  const sole = qaAll.filter((i) => !i.company.includes(","))
  const shared = qaAll.filter((i) => i.company.includes(","))
  const factoryGroups = FACTORY_QUESTIONS[slug] || []
  const mianjing = getMianjingList()
    .filter((m) => mianjingMatches(m.company, company))
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)))
  const jdDocs = getAllJd().filter((doc) => doc.company === slug)
  const external = EXTERNAL_REPOS.filter((r) => r.covers.includes(slug) || r.covers.includes("cn")).slice(0, 4)
  const extQ = EXTERNAL_QUESTIONS[slug] || []
  const extProcess = EXTERNAL_PROCESS[slug] || ""
  const extQBySrc = extQ.reduce<Record<string, string[]>>((acc, item) => {
    ;(acc[item.src] ||= []).push(item.q)
    return acc
  }, {})

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${company.name}大模型 Agent 面试题`,
    numberOfItems: qaAll.length,
    itemListElement: qaAll.map((item, i) => ({
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
      { "@type": "ListItem", position: 3, name: `${company.name}面试题`, item: `${SITE}/interview/company/${company.slug}` },
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
          <span className="cur">{company.name}面试题</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">公司题库 · {company.name}</p>
        <h1 className="ivc-hero-title">{company.name}大模型 Agent 面试题</h1>
        <p className="ivc-hero-sub">{company.note}</p>
        <p className="ivq-hero-note">
          题目口径：来自 {company.aliases.join("、")} 等公开渠道的面经与岗位 JD 高频归纳，不是内部真题。
          按大家实际被问到的方向整理，每题一页带答案与追问。
        </p>
        <p className="ivq-hero-stats">
          {mianjing.length > 0 ? <span>面经实录 {mianjing.length} 篇</span> : null}
          {qaAll.length > 0 ? <span>归纳速答 {qaAll.length} 道</span> : null}
          {jdDocs.length > 0 ? <span>JD 样本 {jdDocs.length} 条</span> : null}
        </p>
      </header>

      {mianjing.length > 0 ? (
        <div className="ivu-wide">
          <div className="ivu-sec">
            <h2 className="ivu-sec-t">面经实录</h2>
            <p className="ivu-sec-sub">真实轮次与日期的完整复盘，{company.name}怎么考、追问往哪个方向挖，看这几篇最直接。</p>
          </div>
          <div className="ivq-rows">
            {mianjing.map((m) => (
              <Link className="ivq-row" key={m.slug} href={`/mianjing/${m.slug}`}>
                <span className="ivq-row-q">{m.title}</span>
                <span className="ivq-row-a">
                  {m.company} · {m.round}
                  {m.date ? ` · ${m.date}` : ""}
                </span>
                <span className="ivq-row-go" aria-hidden>
                  看完整复盘 →
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {factoryGroups.length > 0 ? (
        <div className="ivu-wide">
          <div className="ivu-sec">
            <h2 className="ivu-sec-t">{company.name}真题清单</h2>
            <p className="ivu-sec-sub">
              {factoryGroups.reduce((n, g) => n + g.questions.length, 0)} 题 · 来自社区面试宝典第 12 章
            </p>
          </div>
          <div className="fac-groups">
            {factoryGroups.map((g) => (
              <details key={g.name} className="fac-group">
                <summary>
                  <span className="fac-group-name">{g.name}</span>
                  <span className="fac-group-count">{g.questions.length} 题</span>
                </summary>
                <ol className="fac-qs">
                  {g.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </div>
      ) : null}

      {jdDocs.length > 0 ? (
        <div className="ivu-wide">
          <div className="ivu-sec">
            <h2 className="ivu-sec-t">该公司 JD 样本</h2>
            <p className="ivu-sec-sub">岗位要求原文可溯源，先看 JD 再刷题，方向不跑偏。</p>
          </div>
          <div className="ivq-rows">
            {jdDocs.map((doc) => (
              <div className="ivq-row" key={doc.slug}>
                <Link className="ivq-row-main" href={`/jd/${doc.company}/${doc.slug}`}>
                  <span className="ivq-row-q">{doc.title}</span>
                  <span className="ivq-row-a">{doc.summary}</span>
                </Link>
                {doc.sourceUrl ? (
                  <a className="ivq-row-go ivq-row-go--ext" href={doc.sourceUrl} target="_blank" rel="noopener noreferrer">
                    查看原 JD ↗{doc.sourceName ? ` · ${doc.sourceName}` : ""}
                  </a>
                ) : (
                  <span className="ivq-row-go">来源：公开 JD 与面经汇总</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ivu-wide">
        {sole.length > 0 ? (
          <>
            <div className="ivu-sec">
              <h2 className="ivu-sec-t">带解析的{company.name}高频题</h2>
              <p className="ivu-sec-sub">单厂独占 {sole.length} 道 · 口径为公开面经与 JD 的高频归纳</p>
            </div>
            <div className="ivq-rows">
              {sole.map((item) => (
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

        {shared.length > 0 ? (
          <details className="fac-shared">
            <summary>多厂共考的题（{shared.length} 道，非{company.name}独占）</summary>
            <div className="ivq-rows">
              {shared.map((item) => (
                <div className="ivq-row" key={item.slug}>
                  <Link className="ivq-row-main" href={`/interview/qa/${item.slug}`}>
                    <span className="ivq-row-q">Q · {item.question}</span>
                    <span className="ivq-row-a">{item.oneLine}</span>
                  </Link>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {sole.length === 0 && shared.length === 0 ? (
          <p className="ivq-empty">
            这个公司的解析题正在补充，先看上方真题清单，或去
            <a href="/interview/qa">全部题库</a>
            按方向刷。
          </p>
        ) : null}
      </div>

      {extQ.length > 0 ? (
        <div className="ivu-wide">
          <div className="ivu-sec">
            <h2 className="ivu-sec-t">开源社区真题补充 · {extQ.length} 题</h2>
            <p className="ivu-sec-sub">
              从开源公司题库仓库整理的{company.name}方向真题，保持原文（英文原题不译），仅作外部参考补充，内容以原仓库为准。
            </p>
          </div>
          {extProcess ? (
            <div className="cqe-process">
              <b>面试流程（社区整理）</b>
              <p>{extProcess}</p>
            </div>
          ) : null}
          {Object.entries(extQBySrc).map(([src, questions]) => {
            const repo = EXTERNAL_SOURCES[src]
            if (!repo) return null
            return (
              <details className="fac-group" key={src} open={src === "agentguide"}>
                <summary>
                  <span className="fac-group-name">{repo.name}</span>
                  <span className="fac-group-count">{questions.length} 题</span>
                </summary>
                <ol className="fac-qs">
                  {questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
                <p className="cqe-src">
                  来源：<a href={repo.url} target="_blank" rel="noopener noreferrer">{repo.url}</a>
                </p>
              </details>
            )
          })}
        </div>
      ) : null}

      {external.length > 0 ? (
        <div className="ivu-wide">
          <div className="ivu-sec">
            <h2 className="ivu-sec-t">外部题库参考（开源社区）</h2>
            <p className="ivu-sec-sub">以下为开源社区维护的公司维度题库，内容以原仓库为准，仅作外部参考链接。</p>
          </div>
          <div className="ivq-rows">
            {external.map((repo) => (
              <a className="ivq-row" key={repo.url} href={repo.url} target="_blank" rel="noopener noreferrer">
                <span className="ivq-row-q">{repo.name} ↗</span>
                <span className="ivq-row-a">{repo.note}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ivu-wide">
        <aside className="ivq-cta">
          <div>
            <p className="ivq-cta-t">按公司刷之外，再按方向刷一遍</p>
            <p className="ivq-cta-d">
              公司面经反映侧重，方向题库保证覆盖面：14 个分类的速答题、深度解析和学习路线都在面试间。
            </p>
          </div>
          <div className="ivq-cta-links">
            <Link className="ivq-cta-btn" href="/interview/qa">
              全部题库
            </Link>
            <Link className="ivq-cta-btn ivq-cta-btn--ghost" href="/interview">
              深度解析
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
