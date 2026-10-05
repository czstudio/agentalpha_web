import Link from "next/link"
import {
  ScanSearch,
  FileCheck2,
  FileUser,
  Radar,
  Compass,
  MessagesSquare,
  NotebookPen,
  ClipboardList,
  PenLine,
  Scale,
  Sparkles,
  ArrowRight,
} from "lucide-react"

/**
 * 首页免费工具区:让工具在用户一眼可见的位置。
 * 文案口径 = 用户真实搜索词(免费/在线/不注册/导出 PDF/Word),不做营销话术。
 */

const TOOLS = [
  { href: "/tools/resume-builder", icon: FileUser, name: "简历生成器", desc: "免费在线制作简历：粘贴旧简历或一段话，解析重排成带配色、自动分页的 A4，数字加粗，导出 PDF/Word，不注册不水印。" },
  { href: "/tools/jd-analyzer", icon: ScanSearch, name: "JD 分析工具", desc: "粘贴招聘 JD，免费拆出考察词、隐藏考点，并匹配站内真实面试题。" },
  { href: "/tools/resume", icon: FileCheck2, name: "简历体检", desc: "简历和 JD 逐词对比，能力证据评级，逐条批注，预演面试官会追问什么。" },
  { href: "/tools/bullet-grader", icon: PenLine, name: "简历 Bullet 打分器", desc: "一条简历经历值多少分，十秒见分晓，给改写骨架。" },
  { href: "/tools/gap-test", icon: Radar, name: "面试 Gap 自测", desc: "八项能力自评加真题抽验，测出你离目标岗位差多远，短板给补课路径。" },
  { href: "/tools/mock-interview", icon: MessagesSquare, name: "AI 模拟面试", desc: "五种面试官人格，岗位剧本、简历深挖、压力追问，答完出复盘报告。" },
  { href: "/tools/project-matcher", icon: Compass, name: "项目匹配器", desc: "按方向和时间推荐能写进简历、扛得住追问的 AI 项目方案。" },
  { href: "/tools/interview-log", icon: NotebookPen, name: "面试复盘本", desc: "面完当天记被问题目和卡壳点，自动统计你反复挂在哪一轮。" },
  { href: "/tools/application-tracker", icon: ClipboardList, name: "投递看板", desc: "求职投递追踪看板，自动算投递漏斗和进面率，数据只存本机。" },
  { href: "/tools/offer-compare", icon: Scale, name: "Offer 对比器", desc: "多个 offer 怎么选？六维打分加权对比，附薪资谈判常识。" },
]

export function HomeTools() {
  return (
    <section id="tools" className="aa-section">
      <div className="section-shell">
        <div className="aa-sec-head" style={{ marginBottom: 24 }} data-reveal>
          <p className="aa-kicker">
            <Sparkles size={13} strokeWidth={2} aria-hidden style={{ verticalAlign: "-1px", marginRight: 6 }} />
            免费求职工具箱 · 10 个在线工具
          </p>
          <h2>简历、JD、面试，一套免费工具全搞定</h2>
          <p className="aa-sec-desc">
            全部免费、无需注册、浏览器本地运行：在线简历制作与导出 PDF、招聘 JD 分析、模拟面试、
            投递管理与 Offer 对比。面向 AI Agent 与大模型岗位求职者，数据不出你的浏览器。
          </p>
        </div>
        <div className="aa-tools-grid">
          {TOOLS.map((tool, toolIndex) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="aa-tool-card"
              data-reveal
              style={{ "--rd": `${(toolIndex % 2) * 60}ms` } as React.CSSProperties}
            >
              <span className="aa-tool-icon">
                <tool.icon size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className="aa-tool-body">
                <span className="aa-tool-name">{tool.name}</span>
                <span className="aa-tool-desc">{tool.desc}</span>
              </span>
              <ArrowRight size={14} strokeWidth={2} aria-hidden className="aa-tool-go" />
            </Link>
          ))}
        </div>
        <div className="aa-tools-more">
          <Link href="/tools" className="aa-btn-primary">
            <span>进入求职工具箱，用全部 10 个工具</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
