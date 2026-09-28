"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export interface DailyQaItem {
  slug: string
  question: string
  oneLine: string
  category: string
}

/** 按当天日期固定抽一题：同一天所有人看到的都是同一道 */
function pickDaily(items: DailyQaItem[]): DailyQaItem | null {
  if (!items.length) return null
  const now = new Date()
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 100000
  return items[hash % items.length]
}

export function DailyQuestion({ items }: { items: DailyQaItem[] }) {
  const [item, setItem] = useState<DailyQaItem | null>(null)

  useEffect(() => {
    setItem(pickDaily(items))
  }, [items])

  if (!item) return null
  const now = new Date()
  const label = `${now.getMonth() + 1} 月 ${now.getDate()} 日`

  return (
    <aside className="ivd-card" aria-label="今日一题">
      <div className="ivd-head">
        <span className="ivd-kicker">今日一题</span>
        <span className="ivd-date">{label}</span>
      </div>
      <Link className="ivd-q" href={`/interview/qa/${item.slug}`}>
        {item.question}
      </Link>
      <p className="ivd-a">{item.oneLine}</p>
      <div className="ivd-foot">
        <Link className="ivd-link" href={`/interview/qa/${item.slug}`}>
          看完整速答 →
        </Link>
        <Link className="ivd-link ivd-link--ghost" href="/interview/quiz">
          开一场模拟面试 →
        </Link>
      </div>
    </aside>
  )
}
