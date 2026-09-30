"use client"

import { useMemo, useState } from "react"
import { useLocalState } from "@/hooks/use-local-state"

const ROUNDS = ["笔试", "一面", "二面", "三面", "HR 面", "其他"] as const
const RESULTS = [
  { key: "pass", label: "通过" },
  { key: "fail", label: "挂了" },
  { key: "pending", label: "待定" },
] as const

type Result = (typeof RESULTS)[number]["key"]

interface LogEntry {
  id: string
  date: string
  company: string
  role: string
  round: string
  result: Result
  questions: string
  stuck: string
  next: string
}

const EMPTY: Omit<LogEntry, "id"> = {
  date: "",
  company: "",
  role: "",
  round: "一面",
  result: "pending",
  questions: "",
  stuck: "",
  next: "",
}

export function LogClient() {
  const [entries, setEntries] = useLocalState<LogEntry[]>("interview-log-v1", [])
  const [draft, setDraft] = useState<LogEntry>({ ...EMPTY, id: "" })
  const [showForm, setShowForm] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = () => {
    if (!draft.company.trim()) return
    if (draft.id) {
      setEntries((prev) => prev.map((it) => (it.id === draft.id ? (draft as LogEntry) : it)))
    } else {
      setEntries((prev) => [
        { ...draft, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: draft.date || new Date().toISOString().slice(0, 10) },
        ...prev,
      ])
    }
    setDraft({ ...EMPTY, id: "" })
    setShowForm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const edit = (it: LogEntry) => {
    setDraft(it)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const remove = (id: string) => {
    if (window.confirm("删除这条复盘？")) setEntries((prev) => prev.filter((it) => it.id !== id))
  }

  const stats = useMemo(() => {
    const fails = entries.filter((e) => e.result === "fail")
    const byRound = ROUNDS.map((r) => ({ round: r, n: fails.filter((e) => e.round === r).length })).filter((x) => x.n > 0)
    return { total: entries.length, fails: fails.length, byRound }
  }, [entries])

  const stuckTopics = useMemo(() => {
    const text = entries.map((e) => e.stuck).join(" ")
    const topics = ["项目", "RAG", "Agent", "工具调用", "MCP", "推理", "微调", "系统设计", "算法", "HR"]
    return topics.filter((t) => (text.match(new RegExp(t, "g")) ?? []).length >= 2)
  }, [entries])

  return (
    <div className="tk-shell">
      <section className="tk-input-card">
        <div className="trk-list-head">
          <p className="tk-label" style={{ margin: 0 }}>
            面试复盘本{saved && <span className="tk-note">已保存</span>}
          </p>
          {!showForm && (
            <button type="button" className="tk-run" style={{ padding: "6px 18px" }} onClick={() => { setDraft({ ...EMPTY, id: "" }); setShowForm(true) }}>
              记一笔
            </button>
          )}
        </div>

        {showForm && (
          <div className="log-form">
            <div className="log-form-row">
              <input className="trk-input" placeholder="公司" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
              <input className="trk-input" placeholder="岗位" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
              <select className="trk-input" value={draft.round} onChange={(e) => setDraft({ ...draft, round: e.target.value })} aria-label="轮次">
                {ROUNDS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <input className="trk-input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} aria-label="日期" />
              <select className="trk-input" value={draft.result} onChange={(e) => setDraft({ ...draft, result: e.target.value as Result })} aria-label="结果">
                {RESULTS.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
            <textarea className="tk-textarea" rows={3} placeholder="被问了什么题？原样记下来（越具体越好，这是你私人的面经）" value={draft.questions} onChange={(e) => setDraft({ ...draft, questions: e.target.value })} spellCheck={false} />
            <textarea className="tk-textarea" rows={2} placeholder="卡壳点：哪题没答上、哪里被追问到底了" value={draft.stuck} onChange={(e) => setDraft({ ...draft, stuck: e.target.value })} spellCheck={false} />
            <textarea className="tk-textarea" rows={2} placeholder="下次策略：同类题怎么答、要补什么" value={draft.next} onChange={(e) => setDraft({ ...draft, next: e.target.value })} spellCheck={false} />
            <div className="tk-input-actions">
              <span className="tk-privacy">记录只存在本机浏览器，不上传、不公开；想沉淀成公开面经再单独整理</span>
              <button type="button" className="tk-run" onClick={save} disabled={!draft.company.trim()}>
                {draft.id ? "保存修改" : "保存"}
              </button>
            </div>
          </div>
        )}
      </section>

      {stats.total > 0 && (
        <section className="tk-block">
          <h3>复盘统计 · {stats.total} 场</h3>
          {stats.byRound.length > 0 && (
            <p className="tk-block-desc">
              挂科轮次分布：{stats.byRound.map((r) => `${r.round} × ${r.n}`).join("，")}。
              连续两轮挂在同一轮，说明问题不在运气：一轮挂补八股，二三轮挂补项目深度与系统设计。
            </p>
          )}
          {stuckTopics.length > 0 && (
            <p className="tk-hint">
              反复出现的卡壳主题：{stuckTopics.join("、")}。这些就是你的优先补课区，
              去 <a href="/interview/qa">题库</a> 按分类逐条过，或用 <a href="/tools/gap-test">Gap 自测</a> 复核。
            </p>
          )}
        </section>
      )}

      {entries.length > 0 && (
        <section className="tk-block">
          <h3>复盘时间线</h3>
          <div className="log-timeline">
            {entries.map((it) => (
              <article key={it.id} className={`log-entry log-${it.result}`}>
                <header className="log-entry-head">
                  <span className="co">{it.company}</span>
                  <span className="ro">{it.role} · {it.round}</span>
                  <span className={`badge-${it.result}`}>
                    {it.result === "pass" ? "通过" : it.result === "fail" ? "挂了" : "待定"}
                  </span>
                  <span className="dt">{it.date}</span>
                </header>
                {it.questions && (
                  <details className="log-detail">
                    <summary>被问题目</summary>
                    <p>{it.questions}</p>
                  </details>
                )}
                {it.stuck && (
                  <details className="log-detail" open>
                    <summary>卡壳点</summary>
                    <p>{it.stuck}</p>
                  </details>
                )}
                {it.next && (
                  <details className="log-detail">
                    <summary>下次策略</summary>
                    <p>{it.next}</p>
                  </details>
                )}
                <footer className="log-actions">
                  <button type="button" onClick={() => edit(it)}>编辑</button>
                  <button type="button" onClick={() => remove(it.id)}>删除</button>
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}

      {entries.length === 0 && !showForm && (
        <section className="tk-block">
          <h3>面完就忘，是求职期最大的浪费</h3>
          <p className="tk-block-desc">
            每场面试都是一次付费调研：面试官替你标出了不会的地方。当天记三样：被问的题、卡壳点、下次怎么答，
            三场之后你会清楚地看到自己反复挂在哪类问题上。
          </p>
          <div className="tk-cta-grid">
            <a href="/tools/mock-interview">
              <div className="t">卡壳的题当场重练</div>
              <div className="d">模拟面试重跑同类题，当场补上</div>
            </a>
            <a href="/tools/application-tracker">
              <div className="t">配合投递看板</div>
              <div className="d">投递状态 + 面试复盘，完整求职台账</div>
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
