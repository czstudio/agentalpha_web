"use client"

import { useEffect } from "react"

/**
 * 全站滚动显影：观察 [data-reveal] 元素，进入视口加 .is-in 触发 CSS 过渡。
 * - 无 JS 时 CSS 隐藏态只作用在 html.js 下，内容永远可见
 * - MutationObserver 兜住客户端路由新挂载的节点
 * - prefers-reduced-motion 下 CSS 直接跳过动画
 */
export function ScrollReveal() {
  useEffect(() => {
    // 环境不支持 IO：跳过动画但不吞内容——全部直接置为可见
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"))
      return
    }
    let raf = 0
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in")
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    )
    const scan = () => {
      raf = 0
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el))
    }
    // MutationObserver 高频触发时用 rAF 合并扫描
    const scheduleScan = () => {
      if (!raf) raf = requestAnimationFrame(scan)
    }
    scan()
    const mo = new MutationObserver(scheduleScan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return null
}

export default ScrollReveal
