"use client"

import { useEffect, useRef } from "react"

/**
 * 面经详情页的阅读增强：顶部进度条 + 目录滚动跟随。
 * 用滚动位置直接计算当前节（最近标题法），不依赖 IntersectionObserver 的边界行为。
 */
export function ReadingExtras() {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".aa-note-toc a[href^='#']"))
    const targets = links
      .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
      .filter((el): el is HTMLElement => Boolean(el))
    if (links.length === 0 || targets.length === 0) return
    const pairs = links
      .map((a, i) => ({ a, el: targets[i] }))
      .filter((p) => p.el)

    let active: HTMLAnchorElement | null = null
    const update = () => {
      if (bar) {
        const doc = document.documentElement
        const total = doc.scrollHeight - doc.clientHeight
        const pct = total > 0 ? Math.min(100, (doc.scrollTop / total) * 100) : 0
        bar.style.width = `${pct}%`
      }
      const line = window.scrollY + 96
      let current: HTMLAnchorElement | null = null
      for (const { a, el } of pairs) {
        if (el.getBoundingClientRect().top + window.scrollY <= line) current = a
        else break
      }
      if (current !== active) {
        active?.classList.remove("on")
        active = current
        active?.classList.add("on")
      }
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  return <div className="mj-progress" ref={barRef} aria-hidden />
}
