"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export interface NavCategory {
  cat: string
  name: string
  count: number
}

/**
 * 子站顶栏的分类快捷 chips（E6）。
 * 触达区在移动端放大到 44px（见 interview.css 的 max-width:640px 段）。
 */
export function CategoryNav({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname()
  if (!categories.length) return null
  return (
    <nav className="ivu-navchips" aria-label="分类快捷入口">
      <Link href="/interview" className={`ivu-navchip${pathname === "/interview" ? " on" : ""}`}>
        全部
      </Link>
      {categories.map((category) => (
        <Link
          key={category.cat}
          href={`/interview/category/${category.cat}`}
          className={`ivu-navchip${
            pathname === `/interview/category/${category.cat}` ? " on" : ""
          }`}
        >
          {category.name}
          <span style={{ color: "var(--ink-3)", marginLeft: 5 }}>{category.count}</span>
        </Link>
      ))}
    </nav>
  )
}
