"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { useRef, type ReactNode } from "react"

gsap.registerPlugin(useGSAP)

/**
 * 工具页入场动效包装:对 [data-anim] 元素分组 stagger 入场。
 * data-anim="hero"   首屏主文案（标题/导语）
 * data-anim="step"   六步流程节点（依次点亮）
 * data-anim="card"   bento 卡片（网格 stagger)
 * prefers-reduced-motion 时完全不注册动画，元素默认可见。
 */
export function ToolsEntrance({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(root)
        const hero = q('[data-anim="hero"]')
        const steps = q('[data-anim="step"]')
        const cards = q('[data-anim="card"]')

        if (hero.length) {
          gsap.from(hero, { y: 18, opacity: 0, duration: 0.55, stagger: 0.09, ease: "power2.out", clearProps: "all" })
        }
        if (steps.length) {
          gsap.from(steps, {
            y: 10,
            opacity: 0,
            duration: 0.4,
            stagger: 0.08,
            delay: 0.25,
            ease: "power1.out",
            clearProps: "all",
          })
        }
        if (cards.length) {
          gsap.from(cards, { y: 14, opacity: 0, duration: 0.5, stagger: 0.055, delay: 0.15, ease: "power2.out", clearProps: "all" })
        }
      })
    },
    { scope: root },
  )

  return <div ref={root}>{children}</div>
}
