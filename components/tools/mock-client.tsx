"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  PERSONAS,
  buildSession,
  buildReport,
  exportTranscript,
  type MockMode,
  type MockSession,
  type PersonaKey,
  type Rating,
} from "@/lib/tools/mock-interview"
import type { QaLite } from "@/lib/tools/jd-analyzer"
import { useLocalState } from "@/hooks/use-local-state"

const MODE_CARDS: Array<{ key: MockMode; name: string; desc: string }> = [
  { key: "jd", name: "岗位剧本面", desc: "按目标方向组 10 题，覆盖该方向的核心考点域" },
  { key: "resume", name: "简历深挖面", desc: "粘贴简历，面试官只问你写过的地方——和真面试的深挖路径一致" },
  { key: "stress", name: "压力追问面", desc: "每题答完追一问：要数字、要对比、要放大十倍之后" },
]

const FAMILY_OPTIONS = [
  { slug: "agent-app", name: "Agent 应用开发" },
  { slug: "rag-eng", name: "RAG 工程" },
  { slug: "llm-algo", name: "大模型算法" },
  { slug: "ai-infra", name: "AI Infra" },
]

const RATING_OPTIONS: Array<{ key: Rating; label: string; cls: string }> = [
  { key: "ok", label: "答上了", cls: "gap-opt-ok" },
  { key: "partial", label: "答了一部分", cls: "gap-opt-unsure" },
  { key: "fail", label: "没答上", cls: "gap-opt-fail" },
]

export function MockClient({ qaList }: { qaList: QaLite[] }) {
  const [mode, setMode] = useState<MockMode>("jd")
  const [family, setFamily] = useState("agent-app")
  const [personaKey, setPersonaKey] = useState<PersonaKey>("gentle")
  const [resumeText, setResumeText] = useState("")
  const [session, setSession] = useState<MockSession | null>(null)
  const [cursor, setCursor] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [ratings, setRatings] = useState<Record<string, Rating>>({})
  const [showAnswer, setShowAnswer] = useState(false)
  const [copied, setCopied] = useState(false)
  const [wrongSlugs, setWrongSlugs] = useLocalState<string[]>("mock-wrong-slugs", [])

  const persona = PERSONAS.find((p) => p.key === personaKey) || PERSONAS[0]
  const current = session?.questions[cursor]
  const report = useMemo(
    () => (session ? buildReport(session.questions, ratings) : null),
    [session, ratings],
  )
  const finished = session !== null && cursor >= session.questions.length

  const start = () => {
    setSession(buildSession({ mode, familySlug: family, personaKey, qaList, resumeText }))
    setCursor(0)
    setAnswers({})
    setRatings({})
    setShowAnswer(false)
    setCopied(false)
  }

  const rate = (r: Rating) => {
    if (!current) return
    setRatings((prev) => ({ ...prev, [current.id]: r }))
    if (r !== "ok" && current.qaSlug) {
      setWrongSlugs((prev) => (prev.includes(current.qaSlug!) ? prev : [...prev, current.qaSlug!]))
    }
  }

  const next = () => {
    setCursor((c) => c + 1)
    setShowAnswer(false)
  }

  const endEarly = () => setCursor(session?.questions.length ?? 0)

  const copyTranscript = async () => {
    if (!session) return
    try {
      await navigator.clipboard.writeText(exportTranscript(session, answers, ratings))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 剪贴板被禁时提示手动复制
      setCopied(false)
    }
  }

  /* ───────── 设置阶段 ───────── */
  if (!session) {
    return (
      <div className="tk-shell">
        <section className="tk-input-card">
          <p className="tk-label">面试模式</p>
          <div className="mock-mode-grid">
            {MODE_CARDS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`mock-mode-card ${mode === m.key ? "mock-mode-on" : ""}`}
                onClick={() => setMode(m.key)}
              >
                <span className="t">{m.name}</span>
                <span className="d">{m.desc}</span>
              </button>
            ))}
          </div>

          {mode === "resume" && (
            <>
              <p className="tk-label" style={{ marginTop: 16 }}>粘贴简历（面试官会逐条深挖你写过的经历）</p>
              <textarea
                className="tk-textarea"
                rows={8}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder={"把项目、实习、技能贴进来（至少 60 字）。面试题会来自你写下的每一条经历——和真实面试官拿到你简历后的提问路径一致。"}
                spellCheck={false}
              />
            </>
          )}

          <p className="tk-label" style={{ marginTop: 16 }}>目标方向</p>
          <div className="tk-chips" role="radiogroup" aria-label="目标方向">
            {FAMILY_OPTIONS.map((f) => (
              <button
                key={f.slug}
                type="button"
                role="radio"
                aria-checked={family === f.slug}
                className={`tk-chip ${family === f.slug ? "tk-chip-on" : ""}`}
                onClick={() => setFamily(f.slug)}
              >
                {f.name}
              </button>
            ))}
          </div>

          <p className="tk-label" style={{ marginTop: 16 }}>面试官人格</p>
          <div className="mock-mode-grid">
            {PERSONAS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`mock-mode-card ${personaKey === p.key ? "mock-mode-on" : ""}`}
                onClick={() => setPersonaKey(p.key)}
              >
                <span className="t">{p.name}</span>
                <span className="d">{p.desc}</span>
              </button>
            ))}
          </div>

          <div className="tk-input-actions">
            <span className="tk-privacy">整场面试在你的浏览器本地运行；作答与错题只存在本机，不上传</span>
            <button
              type="button"
              className="tk-run"
              onClick={start}
              disabled={mode === "resume" && resumeText.trim().length < 60}
            >
              开始面试
            </button>
          </div>
          {mode === "resume" && resumeText.trim().length > 0 && resumeText.trim().length < 60 && (
            <p className="tk-hint">简历内容太少（至少 60 字），把项目经历贴全才能生成深挖题。</p>
          )}
        </section>
      </div>
    )
  }

  /* ───────── 复盘报告 ───────── */
  if (finished) {
    return (
      <div className="tk-shell">
        <section className="tk-block" style={{ textAlign: "left" }}>
          <h3>本场复盘 · {report?.score ?? 0} 分（{report?.total ?? 0}/{session.questions.length} 题）</h3>
          <p className="tk-block-desc">{session.persona.closing}</p>
          <div className="mock-score-row">
            <span className="ok">答上了 {report?.okCount}</span>
            <span className="partial">答了一部分 {report?.partialCount}</span>
            <span className="fail">没答上 {report?.failCount}</span>
          </div>
          <p className="mock-advice">{report?.advice}</p>

          {report && report.bySource.length > 0 && (
            <div className="mock-source-stats">
              {report.bySource.map((s) => (
                <div key={s.source} className="mock-source-row">
                  <span className="src">{s.source}</span>
                  <span className={`ratio ${s.fail === 0 ? "good" : s.fail >= s.total / 2 ? "bad" : ""}`}>
                    {s.total - s.fail}/{s.total}
                  </span>
                </div>
              ))}
            </div>
          )}

          {wrongSlugs.length > 0 && (
            <p className="tk-hint">
              错题已记入本机错题本（共 {wrongSlugs.length} 题），
              去 <Link href="/interview/quiz">模拟抽题</Link> 可以优先重抽它们。
            </p>
          )}

          <div className="tk-input-actions">
            <span className="tk-privacy">{copied ? "已复制，粘贴给朋友或存档都可以" : "导出本场问答记录（纯文本）"}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="tk-run" style={{ background: "#374151" }} onClick={copyTranscript}>
                {copied ? "已复制" : "复制 transcript"}
              </button>
              <button type="button" className="tk-run" onClick={() => setSession(null)}>
                再来一场
              </button>
            </div>
          </div>
        </section>

        <div className="tk-block">
          <h3>答完后接着做</h3>
          <div className="tk-cta-grid">
            <Link href="/interview/quiz">
              <div className="t">重刷本场错题</div>
              <div className="d">抽题自测会优先出现你没答上的题</div>
            </Link>
            <Link href="/tools/gap-test">
              <div className="t">整体差距定位</div>
              <div className="d">八域雷达 + 真题抽验，看短板在哪个域</div>
            </Link>
            <Link href="/tools/interview-log">
              <div className="t">真面完记一笔</div>
              <div className="d">复盘本记录真实面试的卡壳点，数据只存本机</div>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  /* ───────── 面试进行中 ───────── */
  const answeredCount = Object.keys(ratings).length
  return (
    <div className="tk-shell">
      <section className="tk-input-card">
        <div className="mock-progress">
          <span className="mock-persona-tag">{session.persona.name}</span>
          <div className="mock-progress-track" aria-hidden>
            <span style={{ width: `${(answeredCount / session.questions.length) * 100}%` }} />
          </div>
          <span className="mock-progress-num">{answeredCount}/{session.questions.length}</span>
          <button type="button" className="mock-end-btn" onClick={endEarly}>
            结束本场
          </button>
        </div>

        <div className="mock-bubble" aria-live="polite">
          {answeredCount === 0 && !showAnswer
            ? session.persona.opener
            : showAnswer
              ? session.persona.ack[(answeredCount - 1 + session.persona.ack.length) % session.persona.ack.length]
              : session.persona.ack[Math.max(answeredCount - 1, 0) % session.persona.ack.length]}
        </div>

        {current && (
          <>
            <div className="mock-question">
              <span className="src">{current.source}</span>
              <p className="q">{current.question}</p>
            </div>

            <textarea
              className="tk-textarea"
              rows={5}
              value={answers[current.id] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))}
              placeholder="像在面试里一样，开口说——用打字的方式。先结论，再展开，最后给数字。"
              spellCheck={false}
            />

            {!showAnswer ? (
              <div className="tk-input-actions">
                <span className="tk-privacy">答完再亮参考答案，先别翻</span>
                <button
                  type="button"
                  className="tk-run"
                  onClick={() => setShowAnswer(true)}
                  disabled={(answers[current.id] ?? "").trim().length === 0}
                >
                  说完了
                </button>
              </div>
            ) : (
              <div className="mock-answer-zone">
                {current.followUp && ratings[current.id] === undefined && (
                  <div className="mock-followup">
                    <span className="tag">追问</span>
                    {current.followUp}
                  </div>
                )}
                {current.qaSlug && (
                  <p className="mock-ref">
                    参考答法：
                    <a href={`/interview/qa/${current.qaSlug}`} target="_blank" rel="noopener noreferrer">
                      {qaList.find((q) => q.slug === current.qaSlug)?.question ?? "速答页"}
                    </a>
                    （先自评再看，对自己诚实一点）
                  </p>
                )}
                <div className="gap-quiz-opts">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`gap-opt ${ratings[current.id] === opt.key ? opt.cls : ""}`}
                      onClick={() => rate(opt.key)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {ratings[current.id] !== undefined && (
                  <div className="tk-input-actions">
                    <span className="tk-privacy">{cursor + 1 === session.questions.length ? "最后一题了" : "自评已记录"}</span>
                    <button type="button" className="tk-run" onClick={next}>
                      {cursor + 1 === session.questions.length ? "出复盘报告" : "下一题"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
