import Link from "next/link"
import { getGuide } from "@/lib/tools/guides"

/**
 * 工具页长文使用指南(服务端渲染,SSR HTML 里完整可见,SEO 长尾承接)。
 * 数据在 lib/tools/guides.ts,本组件只负责渲染:引导语 + 小节 + 段内链接。
 */

function renderInline(text: string) {
  // 段内 [文字](/path) 转 Link
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (m) {
      return (
        <Link key={i} href={m[2]} className="tg-link">
          {m[1]}
        </Link>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function ToolsGuide({ slug }: { slug: string }) {
  const guide = getGuide(slug)
  if (!guide) return null
  return (
    <section className="tk-guide" aria-label="使用指南">
      <h2>{guide.title}</h2>
      <p className="tk-guide-lead">{renderInline(guide.lead)}</p>
      {guide.sections.map((sec) => (
        <div key={sec.h} className="tk-guide-sec">
          <h3>{sec.h}</h3>
          {sec.paras.map((p, i) => (
            <p key={i}>{renderInline(p)}</p>
          ))}
        </div>
      ))}
    </section>
  )
}
