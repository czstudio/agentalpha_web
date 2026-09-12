import type { ReactNode } from "react"
import Link from "next/link"
import "./interview.css"

export default function InterviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ivu-root">
      <header className="ivu-topbar">
        <div className="ivu-topbar-in">
          <Link href="/interview" className="ivu-brand">
            <span className="ivu-brand-square" aria-hidden />
            AgentAlpha <em>· 面试间</em>
          </Link>
          <Link href="/" className="ivu-back">
            ← 返回主站
          </Link>
        </div>
      </header>
      {children}
      <div className="ivu-wide">
        <footer className="ivu-footer">
          <span>
            面试题库 · 内容来自公众号「吴师兄学大模型」原创文章 · 由 AgentAlpha 整理上线
          </span>
          <span>
            <Link href="/notes">系统学习看笔记</Link> · <Link href="/learn">训练营</Link>
          </span>
        </footer>
      </div>
    </div>
  )
}
