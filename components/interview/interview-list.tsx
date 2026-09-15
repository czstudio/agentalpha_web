"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { InterviewCategoryWithCount, InterviewMeta } from "@/lib/interview"
import { CategoryCard } from "@/components/interview/category-card"

const ALL = "全部"

function norm(s: string): string {
  return s.replace("面试官问：", "").replace(/？/g, "?").replace(/\s+/g, "").toLowerCase()
}

function InterviewCard({ post, hasCover }: { post: InterviewMeta; hasCover: boolean }) {
  const sub = norm(post.question) === norm(post.title) ? post.excerpt : post.question
  return (
    <Link href={`/interview/${post.slug}`} className="ivu-card">
      <div className="ivu-card-cover">
        {hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/images/interview/${post.slug}/cover-800.webp`} alt="" loading="lazy" />
        ) : null}
      </div>
      <span className="ivu-card-no">No.{post.no}</span>
      <div className="ivu-card-body">
        <h3 className="ivu-card-title">{post.title}</h3>
        <p className="ivu-card-q">{sub}</p>
        <div className="ivu-card-meta">
          {post.tags.map((tag) => (
            <span key={tag} className="ivu-chip">
              {tag}
            </span>
          ))}
          <span>{post.minutes} 分钟</span>
        </div>
      </div>
    </Link>
  )
}

export function InterviewList({
  posts,
  covers,
  categories,
  totalPlanned,
  variant = "full",
}: {
  posts: InterviewMeta[]
  covers: Record<string, boolean>
  categories: InterviewCategoryWithCount[]
  totalPlanned: number
  /** full=完整列表页；archive=只渲染「全部题目」筛选与网格（专栏页尾部的档案区） */
  variant?: "full" | "archive"
}) {
  const tags = useMemo(() => {
    const set = new Set<string>()
    for (const post of posts) for (const tag of post.tags) set.add(tag)
    return [ALL, ...Array.from(set)]
  }, [posts])

  const [active, setActive] = useState(ALL)
  const shown = active === ALL ? posts : posts.filter((post) => post.tags.includes(active))

  return (
    <div className="ivu-wide">
      {variant === "full" ? (
        <header className="ivu-list-head">
          <div className="ivu-list-kicker">AGENTALPHA INTERVIEW ROOM</div>
          <h1 className="ivu-list-title">面试间</h1>
          <p className="ivu-list-sub">
            {posts.length} 道真实面试场上的 Agent 题，按 {categories.length} 个主题分类组织。
            每道题都允许翻书——题干来自面试官原话，解法附论文原文。
          </p>
        </header>
      ) : null}

      {variant === "full" && categories.length ? (
        <>
          <div className="ivu-sec">
            <h2 className="ivu-sec-t">按主题找题</h2>
            <p className="ivu-sec-sub">
              {posts.length} / {totalPlanned} 篇
            </p>
          </div>
          <div className="ivu-catgrid">
            {categories.map((category) => (
              <CategoryCard key={category.cat} category={category} />
            ))}
          </div>
        </>
      ) : null}

      <div className="ivu-sec" style={variant === "archive" ? { marginTop: 0 } : undefined}>
        <h2 className="ivu-sec-t" id="archive">全部题目</h2>
        <p className="ivu-sec-sub">按题号排序</p>
      </div>

      <div className="ivu-tags" role="tablist" aria-label="按概念筛选">
        {tags.map((tag) => (
          <button
            key={tag}
            className={`ivu-tag${tag === active ? " on" : ""}`}
            onClick={() => setActive(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="ivu-grid">
        {shown.map((post) => (
          <InterviewCard key={post.slug} post={post} hasCover={covers[post.slug]} />
        ))}
        {shown.length === 0 ? <p className="ivu-empty">这个标签下还没有题。</p> : null}
      </div>

      {variant === "full" ? (
        <div className="ivu-cta" style={{ maxWidth: "var(--measure)", margin: "48px auto 0" }}>
          <p className="ivu-cta-text">
            <b>AgentAlpha，立志打造 AI 界的黄埔军校。</b>题库陪你练面试，训练营陪你做出能改变生活、最后改变世界的项目。
          </p>
          <div className="ivu-cta-actions">
            <Link href="/learn" className="ivu-btn ivu-btn-primary">
              看训练营的项目安排
            </Link>
            <Link href="/notes" className="ivu-btn ivu-btn-ghost">
              先看免费笔记
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
