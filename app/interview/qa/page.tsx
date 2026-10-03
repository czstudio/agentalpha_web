import type { Metadata } from "next"
import Link from "next/link"
import { getAllQa, getQaGrouped, orderQaCategories } from "@/lib/qa"
import { getCategories } from "@/lib/interview"
import { COMPANIES, getQaByCompany } from "@/lib/companies"
import { QaRows, type QaRowGroup } from "@/components/interview/qa-rows"
import { DailyQuestion, type DailyQaItem } from "@/components/interview/daily-question"
import { IDEA_STAR, IDEA_HF, INKOS_STAR, INKOS_SIGNED, SUBMARINE_USERS } from "@/lib/stats"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "Agent 面试题大全（含答案，持续更新）",
  description:
    "大模型 Agent 岗高频面试题大全：自进化 Agent、Agentic RL、多智能体、DeepSearch、Code Agent、记忆系统、评测与可观测、工具调用与 MCP、Agent 架构、训练与微调（LoRA/RLHF/DPO）、推理与部署（KV Cache/量化）、企业落地，RAG 与 LLM 基础也持续更新，一题一页给出口语化参考答案，面试前速刷。",
  keywords: [
    "Agent 面试题",
    "大模型面试题",
    "自进化 Agent 面试题",
    "Agentic RL 面试题",
    "DeepSearch 面试题",
    "多智能体面试题",
    "LLM 面试题及答案",
    "Agent 面试",
    "vLLM 面试题",
    "LoRA 面试题",
    "RLHF 面试题",
    "大模型八股文",
    "AI 产品经理面试题",
    "大模型岗面试",
    "Agent 八股文",
    "RAG 面试题",
  ],
  alternates: { canonical: "/interview/qa" },
}

/**
 * 社区实战项目（数字已核实，勿改动）：项目题要结合真实项目讲，
 * 每卡一句「面试里怎么讲它」，把项目绑定到对应考点。入口统一到 /projects。
 */
const QA_PROJECTS = [
  {
    name: "Idea2Paper",
    tag: "AI 科研智能体",
    metrics: `GitHub ${IDEA_STAR} Star · ${IDEA_HF}`,
    how: "多智能体评审 + 向量知识库：讲项目架构与评测时用它当主案例。",
  },
  {
    name: "InkOS",
    tag: "AI 小说智能体",
    metrics: `GitHub ${INKOS_STAR} Star · ${INKOS_SIGNED} 部签约`,
    how: "长程规划与记忆管理：讲记忆系统、长文一致性时用它。",
  },
  {
    name: "潜艇 AI",
    tag: "TikTok 跨境电商引擎",
    metrics: SUBMARINE_USERS,
    how: "工具链编排与内容生成管线：讲 Agent 落地与增长复盘时用它。",
  },
  {
    name: "SellAI Pro",
    tag: "企业定制电商",
    metrics: "多模块实战",
    how: "多模块企业级交付：讲权限边界与成本控制时用它。",
  },
]

export default function QaHubPage() {
  const all = getAllQa()
  const cats = orderQaCategories(getCategories())
  const groups = getQaGrouped(cats)
  const rowGroups: QaRowGroup[] = groups.map((group) => {
    const category = cats.find((c) => c.cat === group.cat)
    return {
      cat: group.cat,
      name: category?.name || group.cat,
      intro: category?.intro || "",
      items: group.items.map((it) => ({
        slug: it.slug,
        question: it.question,
        oneLine: it.oneLine,
        category: it.category,
        company: it.company,
      })),
    }
  })
  const dailyItems: DailyQaItem[] = all.map((it) => ({
    slug: it.slug,
    question: it.question,
    oneLine: it.oneLine,
    category: it.category,
  }))

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Agent 面试题大全",
    numberOfItems: all.length,
    itemListElement: all.map((item, i) => ({
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
      { "@type": "ListItem", position: 3, name: "面试题大全", item: `${SITE}/interview/qa` },
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
          <span className="cur">题库</span>
        </nav>
      </div>

      <header className="ivu-wide ivc-hero ivq-hero">
        <p className="ivc-hero-kicker">高频题速答 · QUICK ANSWERS</p>
        <h1 className="ivc-hero-title">Agent 面试题大全</h1>
        <p className="ivc-hero-sub">
          {rowGroups.reduce((n, g) => n + g.items.length, 0)} 道真实高频题，一题一页。每页先给一句能直接说出口的结论，再补追问点和常见的坑。面试前速刷，面试中救场。
        </p>
        <p className="ivq-hero-note">
          题目来自社区成员的真实面经与公开面经汇总，按大家实际会搜的说法组织。
          想看逐层拆解的长文，去<a href="/interview">深度解析</a>；想按学习路线刷，去
          <a href="/interview#chapters">专栏目录</a>。
        </p>
        {(() => {
          const withQa = COMPANIES.filter((c) => getQaByCompany(c.slug).length > 0)
          if (withQa.length === 0) return null
          return (
            <p className="ivq-company-line">
              按公司刷：
              {withQa.map((c) => (
                <Link key={c.slug} href={`/interview/company/${c.slug}`}>
                  {c.name}
                </Link>
              ))}
            </p>
          )
        })()}
        <div className="ivq-hero-actions">
          <Link className="ivq-hero-btn" href="/interview/quiz">
            开一场模拟面试
          </Link>
          <span className="ivq-hero-btnnote">抽题自评，错题优先重抽</span>
        </div>
        <DailyQuestion items={dailyItems} />
      </header>

      <div className="ivu-wide">
        <section className="qap-projects" aria-label="结合真实项目刷题">
          <div className="qap-projects-head">
            <p className="qap-projects-t">结合真实项目刷题</p>
            <p className="qap-projects-d">
              项目题别只背概念：这四个社区实战项目都有真实用户和线上数据，讲项目时把它们当主案例更有说服力。
              <Link href="/projects">全部项目 →</Link>
            </p>
          </div>
          <div className="qap-projects-grid">
            {QA_PROJECTS.map((p) => (
              <Link key={p.name} href="/projects" className="qap-proj-card">
                <p className="qap-proj-name">{p.name}</p>
                <p className="qap-proj-tag">{p.tag}</p>
                <p className="qap-proj-metrics">{p.metrics}</p>
                <p className="qap-proj-how">{p.how}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="ivu-wide">
        <QaRows groups={rowGroups} />
      </div>

      <div className="ivu-wide">
        <aside className="ivq-cta">
          <div>
            <p className="ivq-cta-t">刷完速答，再往深走一层</p>
            <p className="ivq-cta-d">
              速答帮你把结论说出口，深度解析帮你扛住追问：18 篇逐层拆解的长文，以及按章刷题的完整学习路线。
            </p>
          </div>
          <div className="ivq-cta-links">
            <Link className="ivq-cta-btn" href="/interview">
              看深度解析
            </Link>
            <Link className="ivq-cta-btn ivq-cta-btn--ghost" href="/learn">
              训练营
            </Link>
          </div>
        </aside>
      </div>
    </main>
  )
}
