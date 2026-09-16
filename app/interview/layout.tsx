import type { ReactNode } from "react"
import Link from "next/link"
import { getCategoriesWithPosts } from "@/lib/interview"
import { CategoryNav } from "@/components/interview/category-nav"
import "./interview.css"

export default function InterviewLayout({ children }: { children: ReactNode }) {
  // 顶栏 chips 只列已有篇目的分类，避免点了进空页
  const categories = getCategoriesWithPosts(false).map((category) => ({
    cat: category.cat,
    name: category.name,
    count: category.count,
  }))

  return (
    <div className="ivu-root">
      <header className="ivu-topbar">
        <div className="ivu-topbar-in">
          <Link href="/interview" className="ivu-brand">
            <span className="ivu-brand-square" aria-hidden />
            AgentAlpha <em>· 面试间</em>
          </Link>
          <CategoryNav categories={categories} />
          <Link href="/" className="ivu-back">
            ← 返回主站
          </Link>
        </div>
      </header>
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
    </div>
  )
}
