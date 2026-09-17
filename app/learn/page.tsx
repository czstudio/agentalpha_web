import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight } from "lucide-react"
import { Navigation } from "@/components/navigation"

export const metadata: Metadata = {
  title: "大模型 Agent 训练营 · AgentAlpha",
  description:
    "项目驱动、导师带教、实战落地：基础课、大模型专项课、Agent 系列课三层课程体系，资料研习、项目实战、深度陪跑三种参与方式。完整介绍见社区文档。",
  alternates: { canonical: "/learn" },
}

/** 社区完整介绍文档（定位、项目战绩、导师、学员结果、参与方式都在这里） */
const COMMUNITY_DOC_URL = "https://agentalpha.feishu.cn/docx/QtYQddrAFoLIb9xFe7PckJnmn1b"

const PRINCIPLES: { name: string; against: string; insist: string }[] = [
  {
    name: "实战为王",
    against: "只看课、只跑示例、只记概念",
    insist: "围绕真实项目拆需求、写代码、做评估、复盘结果",
  },
  {
    name: "产学研结合",
    against: "科研只讲论文，工程只讲框架，产业只讲变现",
    insist: "把论文思路、工程系统和业务场景放进同一个项目训练",
  },
  {
    name: "项目驱动",
    against: "学完没有作品，简历和申请材料仍然是空的",
    insist: "每个阶段都留下可检查、可展示、可讲解的产出",
  },
  {
    name: "长期主义",
    against: "用焦虑和速成承诺制造冲动",
    insist: "承认能力成长需要周期，用扎实训练代替短期幻觉",
  },
]

const COURSE_BLOCKS: { name: string; desc: string; items: string[] }[] = [
  {
    name: "基础课",
    desc: "从 Python 到 Agent 入门，把动手前要补的基础一次补齐。",
    items: ["LLM 与多模态基础", "Python 工程能力", "Agent 最小可用系统"],
  },
  {
    name: "大模型专项课",
    desc: "按深度分三层，按自己的目标选层进入。",
    items: ["入门级：两个月搞定 LLM", "论文级：多模态大模型小班课", "Offer 级：多模态统一模型"],
  },
  {
    name: "Agent 系列课",
    desc: "十个阶段，从单 Agent 一直到 Agentic RL。",
    items: [
      "RAG · Memory · Single Agent",
      "Multi Agent · Deep Research",
      "Coding Agent · 自进化 Agent · Agentic RL",
    ],
  },
]

const PARTICIPATION: { level: string; who: string; support: string }[] = [
  {
    level: "资料研习",
    who: "还在判断方向，想先理解 Agent 项目和学习路线",
    support: "公开资料、项目文档、站内笔记与面试题库",
  },
  {
    level: "项目实战",
    who: "明确想做出一个完整 Agent 项目",
    support: "周任务、作业、代码 Review、阶段验收",
  },
  {
    level: "深度陪跑",
    who: "有求职、申博、比赛、创业或企业落地目标",
    support: "项目打磨、简历与申请材料、讲解稿、模拟面试、高频追问拆解",
  },
]

export default function LearnIndexPage() {
  return (
    <>
      <Navigation />
      <main className="aa-notes learn-home">
        <article className="aa-notes-shell learn-home-shell">
          <nav className="aa-note-breadcrumb">
            <Link href="/">
              <ArrowLeft aria-hidden /> 返回首页
            </Link>
          </nav>

          <header className="learn-home-hero">
            <p className="learn-home-kicker">AGENTALPHA TRAINING · 项目驱动 · 导师带教</p>
            <h1>大模型 Agent 训练营</h1>
            <p className="learn-home-lede">
              围绕真实项目训练：从基础能力到工程能力，从工具使用到系统设计，每个阶段都有可检查、可展示、可讲解的产出。
              社区的项目战绩和学员结果，见<a href="/#proof">首页开源战绩区</a>。
            </p>
          </header>

          <section className="learn-home-block">
            <h2>训练营的方法</h2>
            <div className="learn-home-principles">
              {PRINCIPLES.map((principle) => (
                <div key={principle.name} className="learn-home-principle">
                  <h3>{principle.name}</h3>
                  <p>
                    <span className="learn-home-against">不做</span>
                    {principle.against}
                  </p>
                  <p>
                    <span className="learn-home-insist">坚持</span>
                    {principle.insist}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="learn-home-block">
            <h2>课程体系</h2>
            <div className="learn-home-courses">
              {COURSE_BLOCKS.map((block, index) => (
                <div key={block.name} className="learn-home-course">
                  <span className="learn-home-course-no">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{block.name}</h3>
                  <p>{block.desc}</p>
                  <ul>
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="learn-home-block">
            <h2>三种参与方式</h2>
            <div className="learn-home-part">
              {PARTICIPATION.map((item) => (
                <div key={item.level} className="learn-home-part-card">
                  <h3>{item.level}</h3>
                  <p className="learn-home-part-who">{item.who}</p>
                  <p className="learn-home-part-support">{item.support}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="learn-home-block">
            <h2>已开放的内容</h2>
            <Link href="/learn/claude-code" className="learn-home-open">
              <div>
                <h3>Claude Code 全套教程（23 章 + 4 附录）</h3>
                <p>
                  从 Agentic Loop、工具治理到上下文压缩、系统设计面试，按章组织，站内可直接读。
                </p>
              </div>
              <span className="learn-home-open-go">
                站内阅读 <ArrowUpRight aria-hidden />
              </span>
            </Link>
          </section>

          <section className="learn-home-cta">
            <div>
              <h2>想了解完整的社区介绍</h2>
              <p>
                社区定位、五个代表项目、导师团队、学员 offer 与论文录用结果、参与方式，都整理在这一份文档里，持续更新。
              </p>
            </div>
            <a
              className="learn-home-cta-btn"
              href={COMMUNITY_DOC_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              查看社区完整介绍 <ArrowUpRight aria-hidden />
            </a>
          </section>
        </article>
      </main>
    </>
  )
}
