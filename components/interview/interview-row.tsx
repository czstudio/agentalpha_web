import Link from "next/link"
import type { InterviewMeta } from "@/lib/interview"

function norm(s: string): string {
  return s.replace("面试官问：", "").replace(/？/g, "?").replace(/\s+/g, "").toLowerCase()
}

/**
 * 分类页用的文章行（紧凑列表形态）。
 * 与列表页的卡片（InterviewCard）区分：分类页是「目录感」，列表页是「杂志感」。
 */
export function InterviewRow({
  post,
  hasCover,
  showCover = false,
}: {
  post: InterviewMeta
  hasCover?: boolean
  showCover?: boolean
}) {
  const sub = norm(post.question) === norm(post.title) ? post.excerpt : post.question
  return (
    <Link href={`/interview/${post.slug}`} className="ivu-catrow">
      <div className="ivu-catrow-no" aria-hidden>
        {post.no}
      </div>
      <div className="ivu-catrow-main">
        <h3 className="ivu-catrow-title">{post.title}</h3>
        <p className="ivu-catrow-q">{sub}</p>
        <div className="ivu-catrow-meta">
          {post.tags.length ? (
            <span className="ivu-catrow-tags">
              {post.tags.map((tag) => (
                <span key={tag} className="ivu-chip">
                  {tag}
                </span>
              ))}
            </span>
          ) : null}
          <span>{post.minutes} 分钟</span>
          {showCover && hasCover ? <span>含题图</span> : null}
          {post.updated ? <span className="ivu-updated">更新 {post.updated}</span> : null}
        </div>
      </div>
    </Link>
  )
}
