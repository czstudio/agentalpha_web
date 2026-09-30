import type { Metadata } from "next"
import Link from "next/link"
import {
  ScanSearch,
  FileCheck2,
  Radar,
  Compass,
  MessagesSquare,
  FileUser,
  NotebookPen,
  ClipboardList,
  Scale,
  Wrench,
  ShieldCheck,
  Sparkles,
  FileText,
  BookOpenCheck,
  Map,
  History,
  ArrowRight,
  PenLine,
  type LucideIcon,
} from "lucide-react"
import { Navigation } from "@/components/navigation"
import { ToolsEntrance } from "@/components/tools/tools-entrance"
import "./tools.css"

const SITE = "https://agentalpha.top"

export const metadata: Metadata = {
  title: "求职工具箱 · JD 拆解 / 简历体检 / Gap 自测 / 模拟面试 / 投递看板",
  description:
    "面向 AI Agent 岗求职者的免费工具全家桶：JD 人话拆解器、简历体检、面试 Gap 自测、项目匹配器、AI 模拟面试、自我介绍生成器、面试复盘本、投递看板、Offer 对比器。全部浏览器本地运行，不注册、不上传。看懂岗位 → 测出差距 → 做项目 → 改简历 → 模拟面试 → 记录复盘，一条链路。",
  keywords: ["AI 求职工具", "简历优化工具", "JD 分析", "面试自测", "模拟面试", "投递管理"],
  alternates: { canonical: "/tools" },
}

const TOOLS: {
  href: string
  badge: string
  icon: LucideIcon
  title: string
  desc: string
}[] = [
  {
    href: "/tools/jd-analyzer",
    badge: "引流",
    icon: ScanSearch,
    title: "JD 人话拆解器",
    desc: "粘贴目标岗位 JD，拆出岗位画像、考察词、JD 没写但面试会问的隐藏考点，并匹配站内真实面试题。配套大厂 JD 精拆样板库。",
  },
  {
    href: "/tools/resume",
    badge: "诊断",
    icon: FileCheck2,
    title: "AI / Agent 岗简历体检",
    desc: "粘贴简历（可加 JD）做本地分析：逐词对比、能力覆盖证据评级、逐条批注、基于真实面经的追问预演与翻车风险。",
  },
  {
    href: "/tools/gap-test",
    badge: "诊断",
    icon: Radar,
    title: "面试 Gap 自测",
    desc: "八项能力自评 + 真题抽验防虚标，出能力雷达与一句人话结论，短板按优先级排好补课路径。",
  },
  {
    href: "/tools/project-matcher",
    badge: "诊断",
    icon: Compass,
    title: "项目匹配器",
    desc: "选方向、基础、时间，拿三个能写进简历、扛得住追问的项目方案：难度、时间预算、bullet 模板、验收指标。",
  },
  {
    href: "/tools/mock-interview",
    badge: "陪跑",
    icon: MessagesSquare,
    title: "AI 模拟面试",
    desc: "五种面试官人格、三种模式（岗位剧本 / 简历深挖 / 压力追问），逐题作答出复盘报告，错题自动进错题本。",
  },
  {
    href: "/tools/interview-log",
    badge: "管理",
    icon: NotebookPen,
    title: "面试复盘本",
    desc: "面完当天记被问题目、卡壳点、下次策略；自动统计你反复挂在哪一轮哪类主题。数据只存本机。",
  },
  {
    href: "/tools/application-tracker",
    badge: "管理",
    icon: ClipboardList,
    title: "投递看板",
    desc: "未投到 offer 八个状态的看板管理，自动汇总投递漏斗与进面率，告诉你问题在简历还是在面试。",
  },
  {
    href: "/tools/bullet-grader",
    badge: "诊断",
    icon: PenLine,
    title: "简历 Bullet 打分器",
    desc: "粘一条经历十秒打分:动词强度、量化证据、技术深度、结果表达四维，给问题清单和改写骨架。",
  },
  {
    href: "/tools/resume-builder",
    badge: "陪跑",
    icon: FileUser,
    title: "简历生成器",
    desc: "粘贴旧简历或一段话，解析重排成一页 A4 简历；逐条经历打分给改写骨架，本地导出 PDF、Word 和 LaTeX 源码。",
  },
  {
    href: "/tools/offer-compare",
    badge: "决策",
    icon: Scale,
    title: "Offer 对比器",
    desc: "六个维度打分加权重可调，算出加权对比与一句人话结论，附薪资谈判的实用常识。",
  },
]

const FLOW: { step: string; label: string; desc: string; href: string }[] = [
  { step: "1", label: "看懂岗位", desc: "拆目标 JD 与考察词", href: "/jd" },
  { step: "2", label: "测出差距", desc: "自测短板与补课路径", href: "/tools/gap-test" },
  { step: "3", label: "做项目", desc: "按时间拿项目方案", href: "/tools/project-matcher" },
  { step: "4", label: "改简历", desc: "查证据与追问风险", href: "/tools/resume" },
  { step: "5", label: "模拟面试", desc: "面试演练与错题本", href: "/tools/mock-interview" },
  { step: "6", label: "记录复盘", desc: "复盘与投递看板迭代", href: "/tools/interview-log" },
]

const HERO_CHIPS: { icon: LucideIcon; text: string }[] = [
  { icon: Wrench, text: "10 个工具" },
  { icon: ShieldCheck, text: "纯浏览器本地运行" },
  { icon: Sparkles, text: "免费 · 无需注册" },
]

const LIBS: { href: string; icon: LucideIcon; tint: string; title: string; desc: string }[] = [
  {
    href: "/jd",
    icon: FileText,
    tint: "tint-brand",
    title: "大厂 JD 拆解库",
    desc: "热门岗位精拆：硬技能、隐藏考点、能力模型与准备计划",
  },
  {
    href: "/interview/qa",
    icon: BookOpenCheck,
    tint: "tint-brand",
    title: "面试题库",
    desc: "179 道高频题速答，一题一页带答案与追问",
  },
  {
    href: "/roadmap",
    icon: Map,
    tint: "tint-brand",
    title: "学习路线",
    desc: "四个方向的章节顺序、题目与项目卡",
  },
  {
    href: "/mianjing",
    icon: History,
    tint: "tint-brand",
    title: "真实面经",
    desc: "一手面经复盘，追问链原样保留",
  },
]

export default function ToolsIndexPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: SITE },
      { "@type": "ListItem", position: 2, name: "求职工具箱", item: `${SITE}/tools` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Navigation />
      <ToolsEntrance>
      <main className="tk-main">
        <header className="tk-hero">
          <p className="tk-kicker" data-anim="hero">免费工具 · TOOLBOX</p>
          <h1 data-anim="hero">AI Agent 岗求职工具箱</h1>
          <p className="tk-lede" data-anim="hero">
            看懂岗位 → 测出差距 → 做项目 → 改简历 → 模拟面试 → 记录复盘，一条链路的十个免费工具。
            全部纯前端实现：不注册、不上传，你的简历、JD 和面试记录不出浏览器。
          </p>
          <div className="tk-hero-chips">
            {HERO_CHIPS.map((c) => (
              <span key={c.text} className="tk-hero-chip">
                <c.icon aria-hidden size={16} />
                {c.text}
              </span>
            ))}
          </div>
        </header>

        <section className="tk-block" style={{ marginBottom: 24 }}>
          <h3>求职路径</h3>
          <div className="tools-flow">
            {FLOW.map((f) => (
              <Link key={f.step} href={f.href} className="tools-flow-step" data-anim="step">
                <span className="no">{f.step}</span>
                <span className="lb">{f.label}</span>
                <span className="ds">{f.desc}</span>
                <ArrowRight aria-hidden className="arr" size={16} />
              </Link>
            ))}
          </div>
        </section>

        <div className="tk-index-grid">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="tk-index-card" data-anim="card">
              <span className="tk-card-top">
                <span className="tk-icon-chip">
                  <t.icon aria-hidden size={20} />
                </span>
                <span className="badge">{t.badge}</span>
              </span>
              <span className="t">{t.title}</span>
              <span className="d">{t.desc}</span>
              <span className="go">
                打开工具 <ArrowRight aria-hidden size={13} />
              </span>
            </Link>
          ))}
        </div>

        <section className="tk-block" style={{ marginTop: 24 }}>
          <h3>内容库配套</h3>
          <p className="tk-block-desc">工具的判断依据全部来自站内真实内容，不是拍脑袋的规则：</p>
          <div className="tk-lib-grid">
            {LIBS.map((l) => (
              <Link key={l.href} href={l.href} className="tk-lib-card" data-anim="card">
                <span className={`tk-lib-icon ${l.tint}`}>
                  <l.icon aria-hidden size={16} />
                </span>
                <span className="t">{l.title}</span>
                <span className="d">{l.desc}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      </ToolsEntrance>
    </>
  )
}
