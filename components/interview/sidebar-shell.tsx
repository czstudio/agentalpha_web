"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import type { NavGroup } from "@/lib/nav"

/**
 * 面试间侧边导航壳：桌面 sticky 侧栏 + 移动端抽屉。
 * - 分组可折叠（chevron 旋转 + grid-rows 高度动画）
 * - 当前路由高亮（左侧圆角指示条 + 主题色），父组自动展开
 * - 抽屉：遮罩 fade + 左滑入，ESC 可关，滚动锁定
 */
export function SidebarShell({ groups, children }: { groups: NavGroup[]; children: ReactNode }) {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g) => [g.key, g.open ?? false])),
  )
  const [drawer, setDrawer] = useState(false)

  const isActive = useCallback(
    (href: string, matchPrefix?: string) => {
      const p = (matchPrefix || href) + "/"
      if (href === "/interview") return pathname === "/interview"
      return pathname === href || pathname.startsWith(p)
    },
    [pathname],
  )

  // 当前命中的条目所在组自动展开（仅一次初始化后跟随路由）
  useEffect(() => {
    const hit = groups.filter((g) =>
      g.items.some((it) => pathname === it.href || pathname.startsWith((it.matchPrefix || it.href) + "/")),
    )
    if (hit.length) {
      setOpenGroups((prev) => {
        const next = { ...prev }
        for (const g of hit) if (!next[g.key]) next[g.key] = true
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // 抽屉：ESC + 滚动锁定
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false)
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [drawer])

  // 路由变化收起抽屉
  useEffect(() => {
    setDrawer(false)
  }, [pathname])

  const nav = (
    <nav className="ivs-nav" aria-label="面试间目录">
      {groups.map((group) => {
        const open = openGroups[group.key] ?? false
        return (
          <section key={group.key} className="ivs-group" data-open={open ? "1" : "0"}>
            <button
              type="button"
              className="ivs-group-head"
              aria-expanded={open}
              onClick={() => setOpenGroups((p) => ({ ...p, [group.key]: !open }))}
            >
              <span className="ivs-group-title">{group.title}</span>
              <svg className="ivs-chev" viewBox="0 0 16 16" width="12" height="12" aria-hidden>
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="ivs-group-body">
              <ul className="ivs-list">
                {group.items.map((item) => {
                  const active = isActive(item.href, item.matchPrefix)
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className="ivs-link" data-active={active ? "1" : "0"}>
                        <span className="ivs-link-label">{item.label}</span>
                        {item.badge ? <span className="ivs-badge">{item.badge}</span> : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </section>
        )
      })}
      <p className="ivs-foot">
        题目来自公开面经与社区真实面经
        <br />
        持续更新 · <Link href="/">agentalpha.top</Link>
      </p>
    </nav>
  )

  return (
    <div className="ivu-root">
      <header className="ivu-topbar">
        <div className="ivu-topbar-in">
          <button type="button" className="ivs-burger" aria-label="打开目录" onClick={() => setDrawer(true)}>
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
              <path d="M3 5h14M3 10h14M3 15h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <span>目录</span>
          </button>
          <Link href="/interview" className="ivu-brand">
            <span className="ivu-brand-square" aria-hidden />
            AgentAlpha <em>· 面试间</em>
          </Link>
          <Link href="/" className="ivu-back">
            ← 返回主站
          </Link>
        </div>
      </header>

      {drawer ? <div className="ivs-mask" onClick={() => setDrawer(false)} aria-hidden /> : null}
      <div className="ivs-drawer" data-open={drawer ? "1" : "0"} aria-hidden={drawer ? undefined : true}>
        <div className="ivs-drawer-head">
          <span className="ivs-drawer-title">目录</span>
          <button type="button" className="ivs-drawer-close" aria-label="关闭目录" onClick={() => setDrawer(false)}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {nav}
      </div>

      <div className="ivs-frame">
        <aside className="ivs-aside">{nav}</aside>
        <div className="ivs-main">{children}</div>
      </div>
    </div>
  )
}
