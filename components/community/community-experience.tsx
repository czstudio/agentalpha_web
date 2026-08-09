"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowDown, ArrowUpRight, Menu, X } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, useState, type ReactNode } from "react"

gsap.registerPlugin(ScrollTrigger, useGSAP)

type Heading = { id: string; text: string }

export function CommunityExperience({
  title,
  description,
  headings,
  children,
}: {
  title: string
  description: string
  headings: Heading[]
  children: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useGSAP(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    const intro = gsap.timeline({ defaults: { ease: "power3.out" } })
    intro
      .from(".community-nav", { y: -18, opacity: 0, duration: 0.55 })
      .from(".community-kicker", { y: 14, opacity: 0, duration: 0.45 }, "-=.2")
      .from(".community-hero-title-line > span", { yPercent: 115, duration: 0.85, stagger: 0.08 }, "-=.18")
      .from(".community-hero-copy, .community-hero-actions", { y: 18, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=.45")
      .from(".brand-lockup", { clipPath: "inset(0 100% 0 0)", duration: 1.05 }, "-=.8")
      .from(".brand-signal", { scaleX: 0, transformOrigin: "left center", duration: 0.75 }, "-=.7")
      .from(".brand-node", { scale: 0, opacity: 0, duration: 0.35, stagger: 0.07 }, "-=.5")

    gsap.to(".community-progress > span", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.25 },
    })

    gsap.utils.toArray<HTMLElement>(".community-chapter").forEach((chapter) => {
      gsap.from(chapter.querySelectorAll(":scope > .community-chapter-head > *, :scope > .community-chapter-body > *"), {
        y: 34,
        opacity: 0,
        duration: 0.7,
        stagger: 0.045,
        ease: "power2.out",
        scrollTrigger: { trigger: chapter, start: "top 82%", once: true },
      })
    })

    gsap.utils.toArray<HTMLElement>(".community-figure").forEach((figure) => {
      gsap.from(figure.querySelector("img"), {
        scale: 1.035,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: { trigger: figure, start: "top 88%", once: true },
      })
    })
  }, { scope: root })

  return (
    <div className="community-site" ref={root}>
      <div className="community-progress" aria-hidden="true"><span /></div>
      <nav className="community-nav" aria-label="社区页面导航">
        <Link href="/" className="community-nav-logo" aria-label="AgentAlpha 首页">
          <Image src="/logo-light.png" alt="AgentAlpha" width={708} height={231} priority />
        </Link>
        <div className={menuOpen ? "community-nav-links is-open" : "community-nav-links"}>
          <a href="#2-代表项目与成员成果" onClick={() => setMenuOpen(false)}>项目</a>
          <a href="#3-课程体系" onClick={() => setMenuOpen(false)}>课程</a>
          <a href="#7-真实结果与学员案例" onClick={() => setMenuOpen(false)}>成果</a>
          <Link href="/#contact" onClick={() => setMenuOpen(false)}>加入社区 <ArrowUpRight size={15} /></Link>
        </div>
        <button className="community-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "关闭导航" : "打开导航"} aria-expanded={menuOpen}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      <header className="community-hero">
        <div className="community-hero-copyblock">
          <span className="community-kicker">AGENTALPHA / 实战型 AI 社区</span>
          <h1 aria-label={title}>
            <span className="community-hero-title-line"><span>把 AI 学习</span></span>
            <span className="community-hero-title-line is-accent"><span>变成真实作品。</span></span>
          </h1>
          <p className="community-hero-copy">{description}</p>
          <div className="community-hero-actions">
            <a href="#1-agentalpha-是什么">认识我们 <ArrowDown size={16} /></a>
            <Link href="/#contact">加入或合作 <ArrowUpRight size={16} /></Link>
          </div>
        </div>

        <div className="brand-stage" aria-label="AgentAlpha 品牌标识动画">
          <span className="brand-stage-label">BUILD / RESEARCH / SHIP</span>
          <div className="brand-lockup">
            <Image src="/logo-light.png" alt="AgentAlpha" width={708} height={231} priority />
          </div>
          <div className="brand-signal" aria-hidden="true">
            <span className="brand-node is-one" />
            <span className="brand-node is-two" />
            <span className="brand-node is-three" />
          </div>
          <p>从想法、代码到可验证的结果</p>
        </div>
      </header>

      <div className="community-marquee" aria-hidden="true">
        <div>真实项目 · 研究协作 · 工程训练 · 职业成长 · 商业落地 · 真实项目 · 研究协作 · 工程训练 · 职业成长 · 商业落地 ·</div>
      </div>

      <div className="community-layout">
        <aside className="community-toc">
          <span className="community-toc-label">EXPLORE</span>
          <nav>
            {headings.map((item, index) => (
              <a href={`#${item.id}`} key={item.id}><i>{String(index + 1).padStart(2, "0")}</i><span>{item.text.replace(/^\s*\d+\.\s*/, "")}</span></a>
            ))}
          </nav>
        </aside>
        <main className="community-article">{children}</main>
      </div>

      <footer className="community-footer">
        <div><span>AGENTALPHA</span><strong>和认真做事的人，<br />一起把事做成。</strong></div>
        <Link href="/#contact">开始一次对话 <ArrowUpRight /></Link>
      </footer>
    </div>
  )
}
