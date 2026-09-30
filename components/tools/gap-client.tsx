"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  GAP_DOMAINS,
  GAP_FAMILIES,
  buildGapReport,
  type GapReport,
  type QuizAnswer,
} from "@/lib/tools/gap-test"
import type { QaLite } from "@/lib/tools/jd-analyzer"

const QUIZ_OPTIONS: Array<{ key: QuizAnswer; label: string }> = [
  { key: "ok", label: "能答上" },
  { key: "unsure", label: "不确定" },
  { key: "fail", label: "答不上" },
]

function pickQuizQuestions(
  qaList: QaLite[],
  cat: string,
  count: number,
  exclude: Set<string>,
): QaLite[] {
  const pool = qaList.filter((q) => q.category === cat && !exclude.has(q.slug))
  // 洗牌后取前 N，保证同域多题不重复
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

/** 八边形 SVG 雷达 */
function Radar({ domains }: { domains: GapReport["domains"] }) {
  const R = 96
  const C = 120
  const n = domains.length
  const pt = (i: number, ratio: number) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    return [C + Math.cos(angle) * R * ratio, C + Math.sin(angle) * R * ratio] as const
  }
  const poly = (ratio: number) =>
    domains.map((_, i) => pt(i, ratio).join(",")).join(" ")
  const dataPoly = domains
    .map((d, i) => pt(i, Math.max(d.score, 3) / 100).join(","))
    .join(" ")

  return (
    <svg viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="能力雷达图">
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={poly(r)} fill="none" stroke="#e7decc" strokeWidth="1" />
      ))}
      {domains.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="#e7decc" strokeWidth="1" />
      })}
      <polygon points={dataPoly} fill="rgba(180, 83, 42, 0.18)" stroke="#b4532a" strokeWidth="2" />
      {domains.map((d, i) => {
        const [x, y] = pt(i, Math.max(d.score, 3) / 100)
        return <circle key={d.domain.key} cx={x} cy={y} r="3" fill="#b4532a" />
      })}
    </svg>
  )
}

export function GapClient({ qaList }: { qaList: QaLite[] }) {
  const [familySlug, setFamilySlug] = useState<string>(GAP_FAMILIES[0].slug)
  const [self, setSelf] = useState<Record<string, number>>({})
  const [quiz, setQuiz] = useState<Record<string, QuizAnswer>>({})
  const [quizPicks, setQuizPicks] = useState<Record<string, QaLite[]> | null>(null)
  const [report, setReport] = useState<GapReport | null>(null)
  const [copied, setCopied] = useState(false)

  const copyReport = async () => {
    if (!report) return
    const lines = [
      `AgentAlpha 面试 Gap 自测 · ${report.family.name} · 加权 ${report.total} 分`,
      "",
      report.conclusion,
      "",
      "八项明细：",
      ...report.domains.map((d) => `- ${d.domain.label}：${d.score} 分${d.verified ? (d.adjusted >= d.self ? "（抽验通过）" : "（抽验回落）") : ""}`),
    ]
    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const verifiableDomains = useMemo(
    () => GAP_DOMAINS.filter((d) => (self[d.key] ?? 0) >= 2),
    [self],
  )
  const selfDone = GAP_DOMAINS.every((d) => self[d.key] !== undefined)

  const genQuiz = () => {
    const used = new Set<string>()
    const picks: Record<string, QaLite[]> = {}
    for (const d of verifiableDomains) {
      picks[d.key] = pickQuizQuestions(qaList, d.cat, 2, used)
      picks[d.key].forEach((q) => used.add(q.slug))
    }
    setQuizPicks(picks)
    setQuiz({})
    setReport(null)
  }

  const run = () => {
    setReport(buildGapReport(familySlug, self, quiz))
  }

  const setSelfLevel = (key: string, level: number) => {
    setSelf((prev) => ({ ...prev, [key]: level }))
    setQuizPicks(null)
    setQuiz({})
    setReport(null)
  }

  return (
    <div className="tk-shell">
      <section className="tk-input-card" aria-label="自测输入">
        <p className="tk-label">目标方向</p>
        <div className="tk-chips" role="radiogroup" aria-label="目标方向">
          {GAP_FAMILIES.map((f) => (
            <button
              key={f.slug}
              type="button"
              role="radio"
              aria-checked={f.slug === familySlug}
              className={`tk-chip ${f.slug === familySlug ? "tk-chip-on" : ""}`}
              onClick={() => setFamilySlug(f.slug)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <p className="tk-hint">不同方向的八项能力权重不同：算法岗看训练微调，Infra 岗看推理部署，应用岗看 Agent 与工具调用。</p>

        <p className="tk-label" style={{ marginTop: 18 }}>八项能力自评（凭真实水平选，下一步会被抽题验证）</p>
        <div className="gap-self-table">
          {GAP_DOMAINS.map((d) => (
            <div key={d.key} className="gap-self-row">
              <div className="gap-self-head">
                <span className="t">{d.label}</span>
                <span className="d">{d.hint}</span>
              </div>
              <div className="gap-self-levels" role="radiogroup" aria-label={d.label}>
                {d.levels.map((lv, i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={self[d.key] === i}
                    className={`gap-lv ${self[d.key] === i ? "gap-lv-on" : ""}`}
                    onClick={() => setSelfLevel(d.key, i)}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 常驻进度条:未评完也看得见还差几项、按钮在哪（评审:38 个按钮无 CTA 指引） */}
        <div className="gap-progress-cta" role="status">
          <span className="gap-progress-text">
            {quizPicks
              ? "自评完成，下方抽题验证后出报告"
              : `已评 ${GAP_DOMAINS.filter((d) => self[d.key] !== undefined).length}/8 项，全部评完解锁下一步`}
          </span>
          <button
            type="button"
            className="tk-run"
            onClick={() => { if (selfDone && !quizPicks) genQuiz() }}
            aria-disabled={!selfDone || !!quizPicks}
          >
            {selfDone && verifiableDomains.length === 0 ? "直接出报告" : "生成验证题"}
          </button>
        </div>
      </section>

      {quizPicks && (
        <section className="tk-input-card" aria-label="真题验证">
          <h3 className="tk-label">真题验证<span className="tk-note">防虚标</span></h3>
          <p className="tk-hint" style={{ marginTop: 0 }}>
            凭第一反应选「能答上 / 不确定 / 答不上」，先别看答案；想核对的点开题目自己看。答不上的域，雷达分会回落。
          </p>
          {verifiableDomains.length === 0 && (
            <p className="tk-hint">没有自评达到「做过 demo」的域，跳过抽题直接出报告。</p>
          )}
          {verifiableDomains.map((d) => (
            <div key={d.key} className="gap-quiz-domain">
              <p className="gap-quiz-domain-name">{d.label}</p>
              {(quizPicks[d.key] ?? []).map((q) => (
                <div key={q.slug} className="gap-quiz-item">
                  <div className="gap-quiz-q">
                    <a href={`/interview/qa/${q.slug}`} target="_blank" rel="noopener noreferrer">{q.question}</a>
                  </div>
                  <div className="gap-quiz-opts" data-domain={d.key}>
                    {QUIZ_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`gap-opt ${quiz[d.key] === opt.key ? `gap-opt-${opt.key}` : ""}`}
                        onClick={() => setQuiz((prev) => ({ ...prev, [d.key]: opt.key }))}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div className="tk-input-actions">
            <span className="tk-privacy">每域选一个状态即可（以该域第一题的把握为准）</span>
            <button type="button" className="tk-run" onClick={run}>
              出报告
            </button>
          </div>
        </section>
      )}

      {report && (
        <section className="tk-shell" aria-label="自测报告">
          <div className="tk-block" style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <Radar domains={report.domains} />
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3>目标：{report.family.name} · 加权 {report.total} 分</h3>
              <p className="tk-block-desc" style={{ fontSize: 14.5, lineHeight: 1.85 }}>{report.conclusion}</p>
              <p className="tk-hint">
                雷达已按「{report.family.name}」方向加权：虚标会被抽题拉回，低权重域（如该方向不考的记忆）拉分有限。
              </p>
              <button type="button" className="mock-end-btn" onClick={copyReport} style={{ marginTop: 6 }}>
                {copied ? "已复制，发给导师或朋友看" : "复制报告为文本"}
              </button>
            </div>
          </div>

          <div className="tk-block">
            <h3>八项明细</h3>
            <div className="gap-result-rows">
              {report.domains.map((d) => (
                <div key={d.domain.key} className="gap-result-row">
                  <div className="gap-result-head">
                    <span className="t">{d.domain.label}</span>
                    {d.verified && <span className="tk-note">{d.adjusted >= d.self ? "抽验通过" : "抽验回落"}</span>}
                  </div>
                  <div className="tk-score-track" aria-hidden>
                    <span className={d.score < 50 ? "warn" : undefined} style={{ width: `${d.score}%` }} />
                  </div>
                  <div className="gap-result-links">
                    <a href={`/interview/qa#${d.domain.cat}`}>刷「{d.domain.label}」题库</a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {report.weakest.length > 0 && (
            <div className="tk-block">
              <h3>短板补课路径（按这个方向的重要性排序）</h3>
              <ul className="tk-topic-list">
                {report.weakest.map((d) => (
                  <li key={d.domain.key}>
                    <span className="t">{d.domain.label} · 当前 {d.score} 分</span>
                    <span className="d">
                      先把 <a href={`/interview/qa#${d.domain.cat}`}>{d.domain.label}分类的题目</a>过一遍；
                      {d.adjusted < 1 ? "概念层都还没立起来，配合学习路线的对应章节一起看" : "有基础但缺证据，做一个能出指标的小项目补上这一格"}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="tk-cta-grid" style={{ marginTop: 14 }}>
                <Link href={report.roadmap}>
                  <div className="t">走完整学习路线</div>
                  <div className="d">章节顺序 + 题目 + 术语 + 项目卡，按路线推进</div>
                </Link>
                <Link href="/tools/project-matcher">
                  <div className="t">选个项目补短板</div>
                  <div className="d">按目标方向和可用时间拿项目方案与验收指标</div>
                </Link>
                <Link href="/tools/resume">
                  <div className="t">把已有经历写成证据</div>
                  <div className="d">简历体检：能力覆盖评级 + 追问预演</div>
                </Link>
                <Link href="/interview/quiz">
                  <div className="t">模拟抽题练习</div>
                  <div className="d">按分类抽题自测，错题重抽</div>
                </Link>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
