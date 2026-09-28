"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

export interface QuizQaItem {
  slug: string
  question: string
  oneLine: string
  category: string
  minutes: number
}

export interface QuizCategory {
  cat: string
  name: string
  count: number
}

type Phase = "setup" | "run" | "report"

/** slug → 答题统计。h=答上次数 m=没答上次数，last 为最后作答日期 */
type MasteryMap = Record<string, { h: number; m: number; last: string }>

interface QuizRun {
  date: string
  total: number
  hit: number
  missed: string[]
}

const MASTERED_KEY = "aa-qa-mastered-v1"
const HISTORY_KEY = "aa-quiz-history-v1"

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 隐私模式等场景写入失败就放弃，不影响答题
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function shuffle<T>(list: T[]): T[] {
  const arr = list.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function isMissed(map: MasteryMap, slug: string): boolean {
  const rec = map[slug]
  return !!rec && rec.m > rec.h
}

export function QuizClient({ items, categories }: { items: QuizQaItem[]; categories: QuizCategory[] }) {
  const [phase, setPhase] = useState<Phase>("setup")
  const [picked, setPicked] = useState<string[]>([]) // 本轮抽中的题，按作答顺序
  const [cursor, setCursor] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [hits, setHits] = useState<string[]>([])
  const [missed, setMissed] = useState<string[]>([])
  const [mastery, setMastery] = useState<MasteryMap>({})
  const [history, setHistory] = useState<QuizRun[]>([])
  const [ready, setReady] = useState(false)

  // 配置项
  const [activeCats, setActiveCats] = useState<string[]>([])
  const [want, setWant] = useState(10)
  const [priorMissed, setPriorMissed] = useState(true)

  useEffect(() => {
    setMastery(loadJson<MasteryMap>(MASTERED_KEY, {}))
    setHistory(loadJson<QuizRun[]>(HISTORY_KEY, []))
    setActiveCats(categories.map((c) => c.cat))
    setReady(true)
  }, [categories])

  const bySlug = useMemo(() => new Map(items.map((it) => [it.slug, it])), [items])

  const pool = useMemo(
    () => items.filter((it) => activeCats.length === 0 || activeCats.includes(it.category)),
    [items, activeCats],
  )

  const toggleCat = (cat: string) => {
    setActiveCats((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]))
  }

  const start = useCallback(() => {
    let ordered: QuizQaItem[]
    if (priorMissed) {
      const missedFirst = shuffle(pool.filter((it) => isMissed(mastery, it.slug)))
      const unseen = shuffle(pool.filter((it) => !mastery[it.slug] && !isMissed(mastery, it.slug)))
      const rest = shuffle(pool.filter((it) => mastery[it.slug] && !isMissed(mastery, it.slug)))
      ordered = [...missedFirst, ...unseen, ...rest]
    } else {
      ordered = shuffle(pool)
    }
    const chosen = ordered.slice(0, Math.min(want, ordered.length))
    if (!chosen.length) return
    setPicked(chosen.map((it) => it.slug))
    setCursor(0)
    setRevealed(false)
    setHits([])
    setMissed([])
    setPhase("run")
  }, [pool, priorMissed, mastery, want])

  const judge = useCallback(
    (hit: boolean) => {
      if (!revealed) return
      const slug = picked[cursor]
      if (!slug) return
      const newHits = hit ? [...hits, slug] : hits
      const newMissed = hit ? missed : [...missed, slug]
      setHits(newHits)
      setMissed(newMissed)
      setMastery((prev) => {
        const rec = prev[slug] || { h: 0, m: 0, last: today() }
        const updated: MasteryMap = {
          ...prev,
          [slug]: { h: rec.h + (hit ? 1 : 0), m: rec.m + (hit ? 0 : 1), last: today() },
        }
        saveJson(MASTERED_KEY, updated)
        return updated
      })
      if (cursor + 1 >= picked.length) {
        const run: QuizRun = {
          date: new Date().toISOString(),
          total: picked.length,
          hit: newHits.length,
          missed: newMissed,
        }
        setHistory((prev) => {
          const merged = [run, ...prev].slice(0, 30)
          saveJson(HISTORY_KEY, merged)
          return merged
        })
        setPhase("report")
      } else {
        setCursor((c) => c + 1)
        setRevealed(false)
      }
    },
    [revealed, picked, cursor, hits, missed],
  )

  // 键盘：空格亮答案，1/2 自评
  useEffect(() => {
    if (phase !== "run") return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        return
      }
      if (e.key === "1") judge(true)
      if (e.key === "2") judge(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase, revealed, judge])

  if (!ready) return <div className="ivz-skeleton" aria-hidden />

  /* ── 配置步 ── */
  if (phase === "setup") {
    const recent = history.slice(0, 5)
    return (
      <div className="ivz-setup">
        <section className="ivz-panel">
          <h2 className="ivz-panel-t">第一步 · 选范围</h2>
          <p className="ivz-panel-d">点分类挑掉不想练的，再定一轮抽几题。题库共 {items.length} 题。</p>
          <div className="ivz-chips">
            {categories.map((c) => {
              const on = activeCats.includes(c.cat)
              return (
                <button
                  key={c.cat}
                  className={`ivz-chip${on ? " is-on" : ""}`}
                  onClick={() => toggleCat(c.cat)}
                  aria-pressed={on}
                >
                  {c.name} <span>{c.count}</span>
                </button>
              )
            })}
          </div>
          <h2 className="ivz-panel-t">第二步 · 一轮抽几题</h2>
          <div className="ivz-counts" role="radiogroup" aria-label="每轮题数">
            {[5, 10, 15, 20].map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={want === n}
                className={`ivz-count${want === n ? " is-on" : ""}`}
                onClick={() => setWant(n)}
              >
                {n} 题
              </button>
            ))}
          </div>
          <label className="ivz-opt">
            <input type="checkbox" checked={priorMissed} onChange={(e) => setPriorMissed(e.target.checked)} />
            优先抽没答上过和没见过的题
          </label>
          <div className="ivz-actions">
            <button className="ivz-btn ivz-btn--primary" onClick={start} disabled={pool.length === 0}>
              抽 {Math.min(want, pool.length)} 题，开始
            </button>
            <span className="ivz-actions-note">
              范围内共 {pool.length} 题 · 空格亮答案，1 答上了，2 没答上
            </span>
          </div>
        </section>
        {recent.length > 0 && (
          <section className="ivz-panel ivz-panel--muted">
            <h2 className="ivz-panel-t">最近的练习</h2>
            <ul className="ivz-history">
              {recent.map((r, i) => (
                <li key={i}>
                  <span>{r.date.slice(5, 10).replace("-", " 月 ")} 日</span>
                  <b>
                    {r.hit}/{r.total}
                  </b>
                  <span>
                    {r.total ? Math.round((r.hit / r.total) * 100) : 0}% 答上
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    )
  }

  /* ── 作答步 ── */
  if (phase === "run") {
    const item = bySlug.get(picked[cursor])
    if (!item) return null
    return (
      <div className="ivz-run">
        <div className="ivz-progress">
          <div className="ivz-progress-bar">
            <span style={{ width: `${(cursor / picked.length) * 100}%` }} />
          </div>
          <span className="ivz-progress-num">
            {cursor + 1} / {picked.length}
          </span>
        </div>
        <div className="ivz-qcat">{categories.find((c) => c.cat === item.category)?.name}</div>
        <h2 className="ivz-q">{item.question}</h2>
        <p className="ivz-hint">先自己开口说一遍，说不全再亮答案。说得出来才算会。</p>
        {revealed ? (
          <div className="ivz-answer">
            <span className="ivz-answer-label">参考答案</span>
            <p>{item.oneLine}</p>
          </div>
        ) : (
          <button className="ivz-btn ivz-btn--ghost" onClick={() => setRevealed(true)}>
            亮出参考答案
          </button>
        )}
        <div className={`ivz-judge${revealed ? "" : " is-waiting"}`}>
          <button className="ivz-judge-btn ivz-judge-btn--hit" onClick={() => judge(true)} disabled={!revealed}>
            答上了 <kbd>1</kbd>
          </button>
          <button className="ivz-judge-btn ivz-judge-btn--miss" onClick={() => judge(false)} disabled={!revealed}>
            没答上 <kbd>2</kbd>
          </button>
        </div>
        <Link className="ivz-skip" href={`/interview/qa/${item.slug}`}>
          看这题的完整速答页
        </Link>
      </div>
    )
  }

  /* ── 报告步 ── */
  const total = picked.length
  const score = total ? Math.round((hits.length / total) * 100) : 0
  const verdict =
    score >= 90
      ? "这个范围你可以收了，换个没刷过的分类再来一轮。"
      : score >= 70
        ? "有底子，漏的这几题去速答页把追问点补上。"
        : score >= 40
          ? "窟窿不小，先把错题的速答页过一遍，再抽同分类练一轮。"
          : "这个分类先别急着模拟，回题库把速答从头刷一遍再来。"
  return (
    <div className="ivz-report">
      <section className="ivz-panel ivz-panel--score">
        <p className="ivz-score-kicker">本轮报告</p>
        <p className="ivz-score">
          <b>{hits.length}</b>/{total}
          <span>{score}% 答上</span>
        </p>
        <p className="ivz-verdict">{verdict}</p>
        <div className="ivz-actions">
          <button className="ivz-btn ivz-btn--primary" onClick={start}>
            再来一轮（优先错题）
          </button>
          <button
            className="ivz-btn ivz-btn--ghost"
            onClick={() => {
              setPhase("setup")
            }}
          >
            重选范围
          </button>
        </div>
      </section>
      {missed.length > 0 && (
        <section className="ivz-panel">
          <h2 className="ivz-panel-t">这几题没答上（{missed.length}）</h2>
          <div className="ivz-misslist">
            {missed.map((slug) => {
              const it = bySlug.get(slug)
              if (!it) return null
              return (
                <Link className="ivz-missrow" href={`/interview/qa/${slug}`} key={slug}>
                  <span className="ivz-missrow-q">{it.question}</span>
                  <span className="ivz-missrow-go">去补 →</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
