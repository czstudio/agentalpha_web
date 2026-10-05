import Link from "next/link"
import { getToolCrossLinks, SITE_RESOURCES } from "@/lib/tools/cross-links"

/**
 * 工具页互链模块(SSR):配套工具(带使用顺序) + 全部工具 + 站内资源。
 * 每个工具页固定渲染,保证任意工具页都能一跳到达其余工具与三大资源域。
 */
export function ToolsCrossLinks({ slug }: { slug: string }) {
  const { related, others } = getToolCrossLinks(slug)
  return (
    <nav className="tk-cross" aria-label="配套工具与站内资源">
      {related.length > 0 && (
        <section className="tk-cross-sec">
          <h2>配套工具，接着用</h2>
          <p className="tk-cross-lead">按上面的使用顺序排的：从哪一步接着走，每张卡片写了为什么。</p>
          <div className="tk-cross-grid">
            {related.map((r) => (
              <Link key={r.href} href={r.href} className="tk-cross-card">
                <span className="t">{r.name}</span>
                <span className="w">{r.why}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="tk-cross-sec">
        <h2>全部免费工具</h2>
        <div className="tk-cross-all">
          {others.map((o) => (
            <Link key={o.href} href={o.href} className="tk-cross-chip" title={o.desc}>
              {o.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="tk-cross-sec tk-cross-res-sec">
        <h2>站内资源</h2>
        <div className="tk-cross-res">
          {SITE_RESOURCES.map((r) => (
            <Link key={r.href} href={r.href} className="tk-cross-res-item">
              <span className="t">{r.name}</span>
              <span className="w">{r.why}</span>
            </Link>
          ))}
        </div>
      </section>
    </nav>
  )
}
