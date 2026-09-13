"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { InterviewMeta } from "@/lib/interview"

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
}: {
  posts: InterviewMeta[]
  covers: Record<string, boolean>
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
      <header className="ivu-list-head">
        <div className="ivu-list-kicker">AGENTALPHA INTERVIEW ROOM</div>
        <h1 className="ivu-list-title">面试间</h1>
        <p className="ivu-list-sub">
          {posts.length} 道真实面试场上的 Agent 题。每道题都允许翻书——题干来自面试官原话，解法附论文原文。
        </p>
      </header>

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
    </div>
  )
}
