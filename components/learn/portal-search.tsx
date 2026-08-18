"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"

type SearchItem = { slug: string; title: string; summary: string; tags: string[] }

export function PortalSearch({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState("")
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-CN")
    if (!normalized) return []
    return items
      .filter((item) => [item.title, item.summary, ...item.tags].join(" ").toLocaleLowerCase("zh-CN").includes(normalized))
      .slice(0, 8)
  }, [items, query])

  return (
    <div className="learn-search">
      <Search aria-hidden="true" size={18} />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索概念、章节或工程问题"
        aria-label="搜索知识库"
      />
      {query && (
        <div className="learn-search-results" role="listbox">
          {results.length ? results.map((item) => (
            <Link key={item.slug} href={`/learn/claude-code/${item.slug}`}>
              <strong>{item.title}</strong>
              <span>{item.summary}</span>
            </Link>
          )) : <p>已批准内容中暂无匹配结果。</p>}
        </div>
      )}
    </div>
  )
}
