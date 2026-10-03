"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

export interface QaRowItem {
  slug: string
  question: string
  oneLine: string
  category: string
  company?: string
}

export interface QaRowGroup {
  cat: string
  name: string
  intro: string
  items: QaRowItem[]
}

/** slug → { h: 答上次数, m: 没答上次数, last: 最后作答日 }。手动标记已掌握 = m===0 且 (h>0 或 manual) */
type MasteryMap = Record<string, { h: number; m: number; last: string; manual?: number }>

const MASTERED_KEY = "aa-qa-mastered-v1"

export function isMastered(rec: MasteryMap[string] | undefined): boolean {
  return !!rec && rec.m === 0 && (rec.h > 0 || rec.manual === 1)
}

function loadMastery(): MasteryMap {
  try {
    const raw = window.localStorage.getItem(MASTERED_KEY)
    return raw ? (JSON.parse(raw) as MasteryMap) : {}
  } catch {
    return {}
  }
}

type MasteryFilter = "all" | "open" | "done"

const COMPANY_SHORT: Record<string, string> = {
  bytedance: "字节", alibaba: "阿里", tencent: "腾讯", baidu: "百度", meituan: "美团",
  jd: "京东", kuaishou: "快手", pdd: "拼多多", xiaohongshu: "小红书", didi: "滴滴",
  netease: "网易", moonshot: "月之暗面", zhipu: "智谱", minimax: "MiniMax", deepseek: "DeepSeek",
  antgroup: "蚂蚁", bilibili: "B站", huawei: "华为", xiaomi: "小米", douyin: "抖音",
  google: "谷歌", openai: "OpenAI", microsoft: "微软", sensetime: "商汤", iflytek: "讯飞", nio: "蔚来",
}

function companyMeta(company?: string): { count: number; names: string } {
  if (!company) return { count: 0, names: "" }
  const parts = company.split(",").map((s) => s.trim()).filter(Boolean)
  const names = parts.map((p) => COMPANY_SHORT[p] || p)
  return { count: parts.length, names: names.slice(0, 2).join("、") }
}

export function QaRows({ groups }: { groups: QaRowGroup[] }) {
  const [mastery, setMastery] = useState<MasteryMap>({})
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<MasteryFilter>("all")
  const [view, setView] = useState<"tree" | "hot">("tree")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setMastery(loadMastery())
    setReady(true)
  }, [])

  const masteredCount = useMemo(
    () => Object.keys(mastery).filter((slug) => isMastered(mastery[slug])).length,
    [mastery],
  )

  const toggle = (slug: string) => {
    setMastery((prev) => {
      const next: MasteryMap = { ...prev }
      if (isMastered(next[slug])) {
        delete next[slug]
      } else {
        const rec = next[slug] || { h: 0, m: 0, last: "" }
        next[slug] = { ...rec, manual: 1 }
      }
      try {
        window.localStorage.setItem(MASTERED_KEY, JSON.stringify(next))
      } catch {
        // 写不进去就只保留本轮状态
      }
      return next
    })
  }

  const q = query.trim().toLowerCase()

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((it) => {
            if (q && !(it.question.toLowerCase().includes(q) || it.oneLine.toLowerCase().includes(q))) return false
            if (filter === "open" && isMastered(mastery[it.slug])) return false
            if (filter === "done" && !isMastered(mastery[it.slug])) return false
            return true
          }),
        }))
        .filter((group) => group.items.length > 0),
    [groups, q, filter, mastery],
  )

  // 🔥先刷视图：多厂共考题按公司数排序，截前 40
  const hotItems = useMemo(() => {
    const flat = groups.flatMap((g) => g.items.map((it) => ({ ...it, count: companyMeta(it.company).count })))
    return flat
      .filter((it) => it.count >= 2)
      .sort((a, b) => b.count - a.count || a.question.localeCompare(b.question))
      .slice(0, 40)
  }, [groups])

  return (
    <div className="ivq-tools-wrap">
      <div className="ivq-tools">
        <input
          className="ivq-search"
          type="search"
          placeholder="搜题目或答案关键词，如「KV Cache」「量化的坑」"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="搜索题目"
        />
        <div className="ivq-filters" role="radiogroup" aria-label="按掌握度筛选">
          {(
            [
              ["all", "全部"],
              ["open", "没掌握的"],
              ["done", "已掌握"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={filter === value}
              className={`ivq-filter${filter === value ? " is-on" : ""}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ivq-views" role="radiogroup" aria-label="列表视图">
          {([["tree", "按分类"], ["hot", "🔥先刷"]] as const).map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={view === value}
              className={`ivq-filter${view === value ? " is-on" : ""}`}
              onClick={() => setView(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {ready && (
          <span className="ivq-progress">
            已掌握 <b>{masteredCount}</b> / {groups.reduce((n, g) => n + g.items.length, 0)}
          </span>
        )}
      </div>

      {view === "hot" && hotItems.length === 0 && (
        <p className="ivq-empty">暂无多厂共考的题。</p>
      )}

      {view === "hot" ? (
        <div className="ivq-rows">
          {hotItems.map((item) => {
            const on = isMastered(mastery[item.slug])
            const meta = companyMeta(item.company)
            return (
              <div className="ivq-row" key={item.slug}>
                <Link className="ivq-row-main" href={`/interview/qa/${item.slug}`}>
                  <span className="ivq-row-q">
                    {on && <span className="ivq-row-dot" aria-hidden />}
                    Q · {item.question}
                  </span>
                  <span className="ivq-row-a">{item.oneLine}</span>
                  <span className="ivq-row-companies">{meta.names} 等 {meta.count} 家考过</span>
                  <span className="ivq-row-go" aria-hidden>
                    查看答案 →
                  </span>
                </Link>
                <button
                  className={`ivq-row-mark${on ? " is-on" : ""}`}
                  onClick={() => toggle(item.slug)}
                  aria-pressed={on}
                  title={on ? "点一下取消掌握标记" : "点一下标记为已掌握"}
                >
                  {on ? "已掌握" : "标记掌握"}
                </button>
              </div>
            )
          })}
        </div>
      ) : null}

      {ready && visibleGroups.length === 0 && (
        <p className="ivq-empty">
          {q ? "没有命中的题目，换个关键词试试。" : "这个筛选下没有题，换个筛选条件。"}
        </p>
      )}

      {view !== "hot" ? visibleGroups.map((group, gi) => {
        const done = group.items.filter((it) => isMastered(mastery[it.slug])).length
        // 首屏降噪：默认只展开第一组，其余折叠；搜索/筛选命中时全展开
        const expanded = q.trim().length > 0 || filter !== "all" || gi === 0
        return (
          <details className="ivq-cat" key={group.cat} id={group.cat} open={expanded}>
            <summary className="ivq-cat-head">
              <h2 className="ivq-cat-name">{group.name}</h2>
              <p className="ivq-cat-intro">{group.intro}</p>
              {ready && (
                <span className="ivq-cat-count" data-done={done >= group.items.length ? "1" : "0"}>
                  {done >= group.items.length ? "已刷完" : `已掌握 ${done}/${group.items.length}`}
                </span>
              )}
              <span className="ivq-cat-toggle" aria-hidden>
                {expanded ? "收起" : `展开 ${group.items.length} 题`}
              </span>
            </summary>
            <div className="ivq-rows">
              {group.items.map((item) => {
                const on = isMastered(mastery[item.slug])
                return (
                  <div className="ivq-row" key={item.slug}>
                    <Link className="ivq-row-main" href={`/interview/qa/${item.slug}`}>
                      <span className="ivq-row-q">
                        {on && <span className="ivq-row-dot" aria-hidden />}
                        Q · {item.question}
                      </span>
                      <span className="ivq-row-a">{item.oneLine}</span>
                      {(() => {
                        const meta = companyMeta(item.company)
                        return meta.count >= 2 ? (
                          <span className="ivq-row-companies">
                            {meta.count >= 10 ? <i className="is-hot">🔥高频</i> : null}
                            {meta.names} 等 {meta.count} 家考过
                          </span>
                        ) : null
                      })()}
                      <span className="ivq-row-go" aria-hidden>
                        查看答案 →
                      </span>
                    </Link>
                    <button
                      className={`ivq-row-mark${on ? " is-on" : ""}`}
                      onClick={() => toggle(item.slug)}
                      aria-pressed={on}
                      title={on ? "点一下取消掌握标记" : "点一下标记为已掌握"}
                    >
                      {on ? "已掌握" : "标记掌握"}
                    </button>
                  </div>
                )
              })}
            </div>
          </details>
        )
      }) : null}
    </div>
  )
}
