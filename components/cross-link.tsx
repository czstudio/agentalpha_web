import Link from "next/link"

export interface RelLinkItem {
  href: string
  label: string
  note?: string
}

/** 站内互链区块：题库 ↔ 面经 ↔ 笔记 的相关推荐（无内容不渲染） */
export function CrossLinks({
  title,
  items,
  variant = "qa",
}: {
  title: string
  items: RelLinkItem[]
  variant?: "qa" | "note" | "mianjing"
}) {
  if (items.length === 0) return null
  return (
    <section className={`xl-rel xl-rel--${variant}`} aria-label={title}>
      <p className="xl-rel-t">{title}</p>
      <div className="xl-rel-list">
        {items.map((it) => (
          <Link key={it.href} href={it.href} className="xl-rel-item">
            <span className="xl-rel-label">{it.label}</span>
            {it.note ? <span className="xl-rel-note">{it.note}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  )
}
