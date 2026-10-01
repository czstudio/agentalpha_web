"use client"

import Link from "next/link"
import { ArrowDown, ArrowUpRight, Menu, X } from "lucide-react"
import { SiteLogo } from "@/components/site-logo"
import { IDEA_STAR, INKOS_STAR } from "@/lib/stats"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useEffect, useRef, useState, type ReactNode } from "react"

gsap.registerPlugin(ScrollTrigger, useGSAP)

const COMMUNITY_INTRO_URL = "https://agentalpha.feishu.cn/docx/QtYQddrAFoLIb9xFe7PckJnmn1b"

type Heading = { id: string; text: string }

export function CommunityExperience({
  title,
  heroStatement,
  headings,
  children,
}: {
  title: string
  heroStatement: string
  headings: Heading[]
  children: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const footer = useRef<HTMLElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const menuPanel = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "")
  const [footerVisible, setFooterVisible] = useState(false)
  const [indexHidden, setIndexHidden] = useState(false)

  useEffect(() => {
    const sections = headings
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section))
    let frame = 0
    const update = () => {
      frame = 0
      const readingLine = Math.min(220, window.innerHeight * 0.3)
      const current = sections.reduce((match, section) => (
        section.getBoundingClientRect().top <= readingLine ? section : match
      ), sections[0])
      if (current?.id) setActiveId(current.id)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [headings])

  useEffect(() => {
    const index = root.current?.querySelector<HTMLElement>(".community-mobile-index")
    const active = index?.querySelector<HTMLElement>("a.is-active")
    if (!index || !active || window.getComputedStyle(index).display === "none") return

    const target = active.offsetLeft - (index.clientWidth - active.clientWidth) / 2
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    index.scrollTo({ left: Math.max(0, target), behavior: reduced ? "auto" : "smooth" })
  }, [activeId])

  useEffect(() => {
    if (!menuOpen) return
    const scrollY = window.scrollY
    const previousOverflow = document.body.style.overflow
    const previousPosition = document.body.style.position
    const previousTop = document.body.style.top
    const previousLeft = document.body.style.left
    const previousRight = document.body.style.right
    const previousWidth = document.body.style.width
    const previousRootOverflow = document.documentElement.style.overflow
    const previousRootScrollBehavior = document.documentElement.style.scrollBehavior
    document.body.style.overflow = "hidden"
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = "0"
    document.body.style.right = "0"
    document.body.style.width = "100%"
    document.documentElement.style.overflow = "hidden"
    menuPanel.current?.querySelector<HTMLElement>("a")?.focus()

    const wideScreen = window.matchMedia("(min-width: 721px)")
    const closeMenu = (restoreFocus: boolean) => {
      setMenuOpen(false)
      if (restoreFocus) menuButton.current?.focus()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu(true)
        return
      }
      if (event.key !== "Tab") return
      const panel = menuPanel.current
      const button = menuButton.current
      if (!panel || !button) return
      const focusables = [button, ...panel.querySelectorAll<HTMLElement>("a, button")]
      const currentIndex = focusables.indexOf(document.activeElement as HTMLElement)
      event.preventDefault()
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1)
        : (currentIndex === -1 || currentIndex === focusables.length - 1 ? 0 : currentIndex + 1)
      focusables[nextIndex]?.focus()
    }
    const onWideScreen = () => {
      if (wideScreen.matches) closeMenu(false)
    }
    window.addEventListener("keydown", onKeyDown)
    wideScreen.addEventListener("change", onWideScreen)
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.position = previousPosition
      document.body.style.top = previousTop
      document.body.style.left = previousLeft
      document.body.style.right = previousRight
      document.body.style.width = previousWidth
      document.documentElement.style.overflow = previousRootOverflow
      document.documentElement.style.scrollBehavior = "auto"
      window.scrollTo(0, scrollY)
      document.documentElement.style.scrollBehavior = previousRootScrollBehavior
      window.removeEventListener("keydown", onKeyDown)
      wideScreen.removeEventListener("change", onWideScreen)
    }
  }, [menuOpen])

  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y > 160 && y > lastY + 6) setIndexHidden(true)
      else if (y < lastY - 6) setIndexHidden(false)
      lastY = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const element = footer.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: "0px 0px 120px 0px" },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    const intro = gsap.timeline({ defaults: { ease: "power3.out" } })
    intro
      .from(".community-nav", { y: -12, opacity: 0, duration: 0.3, clearProps: "transform" })
      .from(".community-kicker", { y: 10, opacity: 0, duration: 0.25 }, "-=.15")
      .from(".community-hero h1", { y: 10, opacity: 0, duration: 0.35 }, "-=.12")
      .from(".community-hero-statement, .community-hero-actions, .community-hero-stats", { y: 12, opacity: 0, duration: 0.3, stagger: 0.04 }, "-=.18")
      .from(".community-hero-reel", { y: 10, opacity: 0, duration: 0.35, clearProps: "transform" }, "-=.28")

    gsap.to(".community-progress > span", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.25 },
    })

    gsap.utils.toArray<HTMLElement>(".community-chapter").forEach((chapter) => {
      const targets = chapter.querySelectorAll(":scope > .community-chapter-head > *, :scope > .community-chapter-body > *")
      gsap.set(targets, { y: 34, opacity: 0 })
      ScrollTrigger.create({
        trigger: chapter,
        start: "top 82%",
        once: true,
        // once 会 kill trigger 并连带回滚绑定的 tween，所以 tween 必须在 onEnter 里独立创建
        onEnter: () => gsap.to(targets, { y: 0, opacity: 1, duration: 0.7, stagger: 0.045, ease: "power2.out", clearProps: "transform,opacity" }),
      })
    })

    // 路线图：线段先画入，节点随进度弹出（SSR 下无 JS 时保持完整可见）
    const roadmap = root.current?.querySelector<SVGSVGElement>(".community-roadmap")
    if (roadmap) {
      const segs = gsap.utils.toArray<SVGPathElement>(".community-roadmap .rm-seg")
      segs.forEach((seg) => {
        const length = seg.getTotalLength()
        gsap.set(seg, { strokeDasharray: length, strokeDashoffset: length })
      })
      const nodes = roadmap.querySelectorAll<SVGGElement>(".rm-node")
      const pills = roadmap.querySelectorAll<SVGGElement>(".rm-pill")
      gsap.set(nodes, { opacity: 0, scale: 0.5, transformOrigin: "50% 50%" })
      gsap.set(pills, { opacity: 0, y: 6 })
      ScrollTrigger.create({
        trigger: roadmap,
        start: "top 78%",
        once: true,
        onEnter: () => {
          const tl = gsap.timeline({ defaults: { ease: "power2.out" } })
          tl.to(segs, { strokeDashoffset: 0, duration: 0.7, stagger: 0.09, ease: "power2.inOut" }, 0)
          tl.to(nodes, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.09, ease: "back.out(1.7)" }, 0.05)
          tl.to(pills, { opacity: 1, y: 0, duration: 0.35, stagger: 0.06 }, 0.3)
        },
      })
    }
  }, { scope: root })

  return (
    <div className="community-site" id="top" ref={root}>
      <div className="community-progress" aria-hidden="true"><span /></div>
      {menuOpen ? (
        <div
          className="community-menu-overlay"
          aria-hidden="true"
          onClick={() => {
            setMenuOpen(false)
            menuButton.current?.focus()
          }}
        />
      ) : null}
      <nav className="community-nav" aria-label="社区页面导航">
        <Link href="/" className="community-nav-logo" aria-label="AgentAlpha 首页">
          <SiteLogo />
        </Link>
        <div className={menuOpen ? "community-nav-links is-open" : "community-nav-links"} id="community-menu" ref={menuPanel}>
          <a href="#2-代表项目与成员成果" onClick={() => setMenuOpen(false)}>项目</a>
          <a href="#3-课程体系" onClick={() => setMenuOpen(false)}>课程</a>
          <a href="#7-真实结果与学员案例" onClick={() => setMenuOpen(false)}>成果</a>
          <Link href="/#contact" onClick={() => setMenuOpen(false)}>加入社区 <ArrowUpRight size={15} /></Link>
        </div>
        <button className="community-menu-button" ref={menuButton} onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "关闭导航" : "打开导航"} aria-expanded={menuOpen} aria-controls="community-menu">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      <header className="community-hero">
        <span className="community-kicker">AGENTALPHA / 实战型 AI 社区</span>
        <h1 aria-label={title}>
          <span className="community-hero-title-line"><span>把 AI 学习</span></span>
          <span className="community-hero-title-line is-accent"><span>变成真实作品。</span></span>
        </h1>
        <div className="community-hero-reel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="community-hero-illus"
            src="/images/community/illus/hero.webp"
            alt="AgentAlpha 插画：Q版女生与蓝色小机器人击掌，周围漂浮论文、代码与小火箭贴纸"
            width={1024}
            height={1024}
            fetchPriority="high"
          />
        </div>
        <div className="community-hero-statement">
          <p>{heroStatement}</p>
        </div>
        <div className="community-hero-actions">
          <a href={COMMUNITY_INTRO_URL} target="_blank" rel="noopener noreferrer">阅读社区介绍 <ArrowUpRight size={16} /></a>
          <a href="#1-agentalpha-是什么">了解我们 <ArrowDown size={16} /></a>
        </div>
        <dl className="community-hero-stats">
          <div>
            <dt>孵化开源项目与盈利产品</dt>
            <dd>5 个</dd>
          </div>
          <div>
            <dt>Idea2Paper GitHub Star</dt>
            <dd>{IDEA_STAR}</dd>
          </div>
          <div>
            <dt>InkOS GitHub Star</dt>
            <dd>{INKOS_STAR}</dd>
          </div>
        </dl>
      </header>

      <nav className={`community-mobile-index${indexHidden ? " is-hidden" : ""}${footerVisible ? " is-closing" : ""}`} aria-label="社区章节快速导航">
        {headings.map((item, index) => (
          <a href={`#${item.id}`} className={activeId === item.id ? "is-active" : undefined} aria-current={activeId === item.id ? "location" : undefined} key={item.id}>
            <i>{String(index + 1).padStart(2, "0")}</i>
            <span>{item.text.replace(/^\s*\d+\.\s*/, "")}</span>
          </a>
        ))}
      </nav>

      <div className="community-layout">
        <aside className="community-toc">
          <span className="community-toc-label">章节</span>
          <nav>
            {headings.map((item, index) => (
              <a href={`#${item.id}`} className={activeId === item.id ? "is-active" : undefined} aria-current={activeId === item.id ? "location" : undefined} key={item.id}><i>{String(index + 1).padStart(2, "0")}</i><span>{item.text.replace(/^\s*\d+\.\s*/, "")}</span></a>
            ))}
          </nav>
        </aside>
        <main className="community-article">{children}</main>
      </div>

      <footer className="community-footer" ref={footer}>
        <div className="community-footer-message"><span>AGENTALPHA</span><strong>和认真做事的人，<br />一起把事做成。</strong></div>
        <div className="community-footer-actions">
          <Link href="/#contact">开始一次对话 <ArrowUpRight /></Link>
          <a href="#top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>回到顶部 <ArrowDown className="community-arrow-up" /></a>
          <small>© {new Date().getFullYear()} AgentAlpha</small>
        </div>
      </footer>
    </div>
  )
}
