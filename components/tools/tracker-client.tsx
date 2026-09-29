"use client"

import { useMemo, useState } from "react"
import { useLocalState } from "@/hooks/use-local-state"

const STATUSES = [
  { key: "wish", label: "未投" },
  { key: "applied", label: "已投" },
  { key: "written", label: "笔试" },
  { key: "i1", label: "一面" },
  { key: "i2", label: "二面" },
  { key: "hr", label: "HR 面" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "已拒" },
] as const

type Status = (typeof STATUSES)[number]["key"]

interface AppItem {
  id: string
  company: string
  role: string
  jdUrl: string
  date: string
  status: Status
  note: string
}

const EMPTY: Omit<AppItem, "id"> = { company: "", role: "", jdUrl: "", date: "", status: "wish", note: "" }

export function TrackerClient() {
  const [items, setItems] = useLocalState<AppItem[]>("app-tracker-v1", [])
  const [draft, setDraft] = useState({ ...EMPTY })

  const add = () => {
    if (!draft.company.trim() || !draft.role.trim()) return
    setItems((prev) => [
      { ...draft, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: draft.date || new Date().toISOString().slice(0, 10) },
      ...prev,
    ])
    setDraft({ ...EMPTY })
  }

  const update = (id: string, patch: Partial<AppItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  const remove = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id))

  const stats = useMemo(() => {
    const total = items.length
    const applied = items.filter((it) => it.status !== "wish").length
    const interviewed = items.filter((it) => ["i1", "i2", "hr", "offer"].includes(it.status)).length
    const offer = items.filter((it) => it.status === "offer").length
    const rejected = items.filter((it) => it.status === "rejected").length
    const pending = items.filter((it) => !["offer", "rejected"].includes(it.status)).length
    return { total, applied, interviewed, offer, rejected, pending }
  }, [items])

  const clearAll = () => {
    if (window.confirm(`确定清空全部 ${items.length} 条投递记录？此操作不可恢复。`)) setItems([])
  }

  return (
    <div className="tk-shell">
      <section className="tk-input-card">
        <p className="tk-label">添加投递</p>
        <div className="trk-form">
          <input className="trk-input" placeholder="公司（如 字节跳动）" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
          <input className="trk-input" placeholder="岗位（如 Agent 应用开发）" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          <input className="trk-input" placeholder="投递日期（可留空=今天）" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} type="date" />
          <select
            className="trk-input"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as Status })}
            aria-label="状态"
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <input className="trk-input trk-input-wide" placeholder="JD 链接或备注（可选）" value={draft.jdUrl || draft.note} onChange={(e) => setDraft({ ...draft, jdUrl: e.target.value })} />
          <button type="button" className="tk-run" onClick={add} disabled={!draft.company.trim() || !draft.role.trim()}>
            记一笔
          </button>
        </div>
        <p className="tk-privacy" style={{ marginTop: 10 }}>
          记录只存在你这台设备的浏览器里（不上传、无账号）。换设备或清缓存会丢，重要节点建议同时记到面试复盘本。
        </p>
      </section>

      {items.length > 0 && (
        <>
          <section className="tk-block">
            <h3>投递漏斗</h3>
            <div className="trk-stats">
              <div className="trk-stat"><b>{stats.total}</b><span>在管</span></div>
              <div className="trk-stat"><b>{stats.applied}</b><span>已投出</span></div>
              <div className="trk-stat"><b>{stats.interviewed}</b><span>进入面试</span></div>
              <div className="trk-stat"><b>{stats.offer}</b><span>Offer</span></div>
              <div className="trk-stat"><b>{stats.rejected}</b><span>已拒</span></div>
              <div className="trk-stat"><b>{stats.pending}</b><span>进行中</span></div>
            </div>
            {stats.applied >= 5 && (
              <p className="tk-hint">
                投了 {stats.applied} 家、进面 {stats.interviewed} 家（{Math.round((stats.interviewed / stats.applied) * 100)}%，按进入一面及以后口径统计，笔试不计）。
                进面率低于 20% 先回头改简历（<a href="/tools/resume">简历体检</a>）；进面率高但挂在面试，去
                <a href="/tools/mock-interview">模拟面试</a>补表达。
              </p>
            )}
          </section>

          <section className="tk-block">
            <div className="trk-list-head">
              <h3 style={{ margin: 0 }}>看板</h3>
              <button type="button" className="mock-end-btn" onClick={clearAll}>清空全部</button>
            </div>
            <div className="trk-board">
              {STATUSES.map((s) => {
                const group = items.filter((it) => it.status === s.key)
                if (group.length === 0) return null
                return (
                  <div key={s.key} className="trk-col">
                    <p className="trk-col-title">{s.label} · {group.length}</p>
                    {group.map((it) => (
                      <div key={it.id} className="trk-card">
                        <div className="trk-card-head">
                          <span className="co">{it.company}</span>
                          <button type="button" className="trk-del" onClick={() => remove(it.id)} aria-label="删除">×</button>
                        </div>
                        <span className="ro">{it.role}</span>
                        <span className="dt">{it.date}</span>
                        {it.jdUrl && (
                          <a className="jdlink" href={it.jdUrl.startsWith("http") ? it.jdUrl : undefined} target="_blank" rel="noopener noreferrer">
                            {it.jdUrl.startsWith("http") ? "JD 链接" : it.jdUrl}
                          </a>
                        )}
                        <select
                          className="trk-input trk-status-select"
                          value={it.status}
                          onChange={(e) => update(it.id, { status: e.target.value as Status })}
                          aria-label="改状态"
                        >
                          {STATUSES.map((o) => (
                            <option key={o.key} value={o.key}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}

      {items.length === 0 && (
        <section className="tk-block">
          <h3>从第一封投递开始记</h3>
          <p className="tk-block-desc">
            投递混乱本身就是 offer 少的原因之一：忘了跟进、错过笔试、复盘不出挂在哪一轮。
            每投一家记一笔，状态变了随手改，两周后这里的漏斗就能告诉你问题出在简历还是面试。
          </p>
          <div className="tk-cta-grid">
            <a href="/tools/jd-analyzer">
              <div className="t">投之前拆一下 JD</div>
              <div className="d">看看这个岗真正考什么，再决定投不投</div>
            </a>
            <a href="/tools/interview-log">
              <div className="t">约了面试？记复盘</div>
              <div className="d">面完当天记卡壳点，下次不重复挂</div>
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
