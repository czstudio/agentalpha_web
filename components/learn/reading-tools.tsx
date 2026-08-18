"use client"

import { useEffect, useState } from "react"
import { Check, Copy, ListTree } from "lucide-react"

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max <= 0 ? 0 : Math.min(100, (window.scrollY / max) * 100))
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])
  return <div className="learn-progress" style={{ width: `${progress}%` }} aria-hidden="true" />
}

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }
  return (
    <button type="button" onClick={copy} className="learn-code-copy" aria-label="复制代码">
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? "已复制" : "复制"}
    </button>
  )
}

export function MobileToc({ items }: { items: Array<{ id: string; text: string; level: number }> }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="learn-mobile-toc">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <ListTree size={18} /> 本文目录
      </button>
      {open && <nav>{items.map((item) => (
        <a key={item.id} href={`#${item.id}`} style={{ paddingLeft: `${(item.level - 2) * 16 + 12}px` }} onClick={() => setOpen(false)}>
          {item.text}
        </a>
      ))}</nav>}
    </div>
  )
}
