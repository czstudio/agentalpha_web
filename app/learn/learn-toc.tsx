"use client"

import { useEffect, useState } from "react"

const ITEMS: { id: string; label: string }[] = [
  { id: "projects", label: "代表项目" },
  { id: "courses", label: "课程体系" },
  { id: "service", label: "带教服务" },
  { id: "fit", label: "适合谁" },
  { id: "mentors", label: "导师" },
  { id: "method", label: "方法" },
  { id: "tracks", label: "成长方向" },
  { id: "results", label: "学员结果" },
  { id: "participate", label: "参与方式" },
  { id: "faq", label: "常见问题" },
]

/** /learn 长页左侧滚动目录：超宽屏显示，滚动高亮当前区块 */
export function LearnToc() {
  const [active, setActive] = useState("")

  useEffect(() => {
    const sections = ITEMS.map((i) => document.getElementById(i.id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // 取视口内最靠上的可见区块作为当前项
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          setActive(visible[0].target.id)
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.2, 0.6] },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="learn-toc" aria-label="本页目录">
      {ITEMS.map((item) => (
        <a key={item.id} href={`#${item.id}`} className={active === item.id ? "is-active" : undefined}>
          {item.label}
        </a>
      ))}
    </nav>
  )
}
