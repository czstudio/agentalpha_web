"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import useSWR from "swr"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, SunMedium, Moon, ArrowRight, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

import { SiteLogo } from "@/components/site-logo"
import { fetcher } from "@/lib/fetcher"

const navItems = [
  { label: "首页", href: "#home" },
  { label: "新人必逛", href: "#onboard" },
  { label: "高阶玩法", href: "#advanced" },
  { label: "Talk & 圆桌会", href: "#talks" },
  { label: "资源合集", href: "#resources" },
  { label: "兄弟社区", href: "#", dropdown: true },
]

type Partner = {
  id: string
  name: string
  website?: string | null
  url?: string | null
}

type PublicData = {
  communities: Partner[]
}

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const { data } = useSWR<PublicData>(mounted ? "/api/public/data" : null, fetcher)

  const communities = (data?.communities || []).slice(0, 3)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark")

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-card backdrop-blur-2xl shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="section-shell">
        <div className="flex h-20 items-center justify-between gap-4">
          <Link href="#home" className="flex items-center gap-3 group">
            <SiteLogo />
          </Link>

          <div className="hidden lg:flex items-center gap-1 flex-nowrap">
            {navItems.map((item) =>
              item.dropdown ? (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(true)}
                  onMouseLeave={() => setOpenDropdown(false)}
                >
                  <button className="px-4 py-2 text-sm font-medium text-foreground/75 hover:text-foreground transition-all duration-200 hover:bg-primary/10 rounded-lg relative group flex items-center gap-1 whitespace-nowrap">
                    {item.label}
                    <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary group-hover:w-3/4 transition-all duration-300" />
                  </button>
                  <AnimatePresence>
                    {openDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 w-80 glass-card rounded-xl border border-white/10 shadow-2xl overflow-hidden"
                      >
                        <div className="p-3 space-y-2">
                          {communities.length > 0 ? (
                            communities.map((community) => (
                              <a
                                key={community.id}
                                href={community.website || community.url || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-primary/10 transition-all group"
                              >
                                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                  {community.name}
                                </span>
                                <ExternalLink className="w-3 h-3 text-foreground/50 flex-shrink-0" />
                              </a>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-foreground/60">
                              暂无兄弟社区（可在后台“合作伙伴”中添加）
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-foreground/75 hover:text-foreground transition-all duration-200 hover:bg-primary/10 rounded-lg relative group whitespace-nowrap"
                >
                  {item.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary group-hover:w-3/4 transition-all duration-300" />
                </Link>
              ),
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={toggleTheme}
              aria-label="切换主题"
              disabled={!mounted}
            >
              {resolvedTheme === "dark" ? <SunMedium className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button
              asChild
              className="hidden md:inline-flex relative overflow-hidden bg-gradient-to-r from-primary via-primary to-accent hover:shadow-lg hover:shadow-primary/40 transition-all duration-300 border-0 shimmer"
            >
              <Link href="#join">
                <span className="relative z-10 font-semibold">加入训练营</span>
                <ArrowRight className="relative z-10 ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="md:hidden">
              <Link href="#join">加入</Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
