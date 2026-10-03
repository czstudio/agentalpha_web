import Link from "next/link"
import { SiteLogo } from "@/components/site-logo"

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "内容",
    links: [
      { label: "Agent 面试题库", href: "/interview/qa" },
      { label: "深度解析", href: "/interview" },
      { label: "面经实录", href: "/mianjing" },
      { label: "学习笔记", href: "/notes" },
      { label: "公众号文章", href: "/articles" },
      { label: "术语库", href: "/interview/glossary" },
    ],
  },
  {
    title: "工具",
    links: [
      { label: "简历体检", href: "/tools/resume" },
      { label: "简历生成器", href: "/tools/resume-builder" },
      { label: "JD 分析", href: "/tools/jd-analyzer" },
      { label: "AI 模拟面试", href: "/tools/mock-interview" },
      { label: "全部 10 个工具", href: "/tools" },
    ],
  },
  {
    title: "社区",
    links: [
      { label: "实战项目", href: "/projects" },
      { label: "学员成果", href: "/projects/stories.html" },
      { label: "训练营", href: "/learn" },
      { label: "学习路线", href: "/roadmap" },
      { label: "关于社区", href: "/community" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="aa-footer">
      <div className="section-shell">
        <div className="aa-footer-top">
          <div className="aa-footer-brand">
            <SiteLogo />
            <p className="aa-footer-tagline">
              把 AI 学习变成真实作品：一题一页的面试题库、扛得住追问的实战项目、本地运行的求职工具。
            </p>
          </div>
          <nav className="aa-footer-cols" aria-label="页脚导航">
            {COLUMNS.map((col) => (
              <div key={col.title} className="aa-footer-col">
                <p className="aa-footer-col-title">{col.title}</p>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="aa-footer-bottom">
          <span>© {new Date().getFullYear()} AgentAlpha · 大模型 Agent 实战社区</span>
          <span className="aa-footer-meta">持续更新 · 全部页面可搜索、可被 AI 引用</span>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
