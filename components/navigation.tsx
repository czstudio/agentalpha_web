"use client"

import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { AnimatePresence, motion } from "framer-motion"
import { SunMedium, Moon, ArrowRight, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

import { SiteLogo } from "@/components/site-logo"
import dynamic from "next/dynamic"

const Fireworks = dynamic(() => import("@/components/fireworks").then(mod => ({ default: mod.Fireworks })), {
  ssr: false,
  loading: () => null
})
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/contexts/language-context"
import { openEnrollmentDialog } from "@/lib/enrollment-event"

const subscribeToHydration = () => () => undefined

export function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false)
  const [showFireworks, setShowFireworks] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useLanguage()

  const navItems = [
    { label: t.nav.community, href: "/community" },
    { label: t.nav.notes, href: "/notes" },
    { label: t.nav.talks, href: "/#talks" },
    { label: t.nav.resources, href: "/#resources" },
  ]

  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    clickCountRef.current += 1

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0
      setShowFireworks(true)
    } else {
      clickTimerRef.current = setTimeout(() => {
        if (clickCountRef.current === 1) {
          window.location.href = "/#home"
        }
        clickCountRef.current = 0
      }, 500)
    }
  }, [])

  const handleFireworksComplete = useCallback(() => {
    setShowFireworks(false)
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark")
  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <>
      <Fireworks show={showFireworks} onComplete={handleFireworksComplete} />

      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`aa-masthead fixed top-0 left-0 right-0 z-[100] ${scrolled ? "is-scrolled" : ""}`}
      >
        <div className="section-shell">
          <div className="aa-masthead-bar">
            <Link
              href="/"
              onClick={handleLogoClick}
              className="flex items-center gap-2 md:gap-3 group flex-shrink-0 cursor-pointer select-none"
            >
              <SiteLogo />
            </Link>

            <div className="hidden lg:flex items-center gap-1 flex-nowrap">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="aa-nav-link"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />

              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={toggleTheme}
                aria-label={t.nav.toggleTheme}
                disabled={!mounted}
              >
                {!mounted ? (
                  <SunMedium className="w-5 h-5" />
                ) : resolvedTheme === "dark" ? (
                  <SunMedium className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 lg:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={t.nav.toggleMenu}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>

              <div className="hidden md:block">
                <button
                  type="button"
                  className="aa-btn-primary"
                  onClick={openEnrollmentDialog}
                  aria-haspopup="dialog"
                >
                  <span>{t.nav.joinTraining}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-[90] lg:hidden"
              onClick={closeMobileMenu}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-72 sm:w-80 max-w-[85vw] bg-background border-l border-border z-[95] lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">{t.nav.menu}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={closeMobileMenu}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-3 sm:p-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between px-4 py-3 rounded-[10px] hover:bg-muted transition-colors group"
                  >
                    <span className="text-base font-medium text-foreground">
                      {item.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </Link>
                ))}
              </div>

              <div className="p-4 sm:p-6 border-t border-border space-y-3">
                <button
                  type="button"
                  className="aa-btn-primary w-full"
                  onClick={() => {
                    closeMobileMenu()
                    window.requestAnimationFrame(openEnrollmentDialog)
                  }}
                  aria-haspopup="dialog"
                >
                  <span>{t.nav.joinTraining}</span>
                </button>
                <Link href="/#contact" className="aa-btn-ghost w-full" onClick={closeMobileMenu}>
                  {t.nav.contactUs}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
