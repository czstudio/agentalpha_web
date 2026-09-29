import type { ReactNode } from "react"
import Link from "next/link"
import { buildInterviewNav } from "@/lib/nav"
import { SidebarShell } from "@/components/interview/sidebar-shell"
import "./interview.css"

export default function InterviewLayout({ children }: { children: ReactNode }) {
  const groups = buildInterviewNav()

  return (
    <SidebarShell groups={groups}>
      {children}
      <div className="ivu-wide">
        <footer className="ivu-footer">
          <span>
            面试题库 · AgentAlpha 社区原创 · 题目来自社区成员真实面经
          </span>
          <span>
            <Link href="/interview/qa">面试题大全</Link> · <Link href="/notes">系统学习看笔记</Link> ·{" "}
            <Link href="/learn">训练营</Link>
          </span>
        </footer>
      </div>
    </SidebarShell>
  )
}
