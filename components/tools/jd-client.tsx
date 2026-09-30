"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { breakdownJd, type JdBreakdown, type QaLite } from "@/lib/tools/jd-analyzer"

const DAILY_BROWSER_QUOTA = 5
const USAGE_KEY = "jd-ai-usage-v1"
const USERKEY_STORE = "jd-ai-userkey-v1"

interface UserKeyConfig {
  apiKey: string
  baseUrl: string
  model: string
}

const DEFAULT_USER_CONFIG: UserKeyConfig = {
  apiKey: "",
  baseUrl: "https://api.huohuaapi.com/v1",
  model: "deepseek-v4-flash",
}

function loadUserKey(): UserKeyConfig {
  try {
    const raw = window.localStorage.getItem(USERKEY_STORE)
    if (!raw) return { ...DEFAULT_USER_CONFIG }
    const parsed = JSON.parse(raw) as Partial<UserKeyConfig>
    return { ...DEFAULT_USER_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_USER_CONFIG }
  }
}

interface AiUsage {
  date: string
  count: number
}

function todayKey(): string {
  // 用户本地时区的「今天」，避免 UTC 让额度在早 8 点才刷新
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function loadUsage(): AiUsage {
  try {
    const raw = window.localStorage.getItem(USAGE_KEY)
    if (!raw) return { date: todayKey(), count: 0 }
    const parsed = JSON.parse(raw) as AiUsage
    return parsed.date === todayKey() ? parsed : { date: todayKey(), count: 0 }
  } catch {
    return { date: todayKey(), count: 0 }
  }
}

const PLACEHOLDER = `粘贴 JD 原文（职位描述 + 任职要求都贴进来效果最好），例如：

岗位职责：
1. 负责智能体（Agent）平台的核心功能研发，包括工具调用、记忆、多 Agent 编排
2. 优化大模型应用的线上效果与稳定性，控制推理成本
任职要求：
1. 熟悉 LLM API 与流式输出，有 Function Calling / MCP 实践经验
2. 熟悉 RAG 全链路，有向量检索、重排落地经验
3. 扎实的后端功底，熟悉高并发服务开发`

interface JdSample {
  company: string
  slug: string
  title: string
  role: string
}

export function JdClient({ qaList, jdSamples }: { qaList: QaLite[]; jdSamples: JdSample[] }) {
  const [text, setText] = useState("")
  const [report, setReport] = useState<JdBreakdown | null>(null)
  const jdInputRef = useRef<HTMLTextAreaElement>(null)

  const [aiText, setAiText] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [aiState, setAiState] = useState<"idle" | "loading" | "done" | "error" | "disabled" | "site-quota">("idle")
  const [aiError, setAiError] = useState("")
  const [aiUsage, setAiUsage] = useState<AiUsage>({ date: todayKey(), count: 0 })
  const [userCfg, setUserCfg] = useState<UserKeyConfig>({ ...DEFAULT_USER_CONFIG })
  const [showKeyPanel, setShowKeyPanel] = useState(false)

  useEffect(() => {
    setAiUsage(loadUsage())
    setUserCfg(loadUserKey())
    // SSR 水合前用户就可能粘贴了 JD(React state 还是空，按钮会灰着），水合完成后回读一次输入框，不让已填的内容丢事件
    if (jdInputRef.current?.value) setText(jdInputRef.current.value)
  }, [])

  const saveUserCfg = (cfg: UserKeyConfig) => {
    setUserCfg(cfg)
    try {
      window.localStorage.setItem(USERKEY_STORE, JSON.stringify(cfg))
    } catch {
      // 隐私模式存不进就算了
    }
  }

  const run = () => {
    setReport(breakdownJd(text, qaList))
    setAiText("")
    setAiState("idle")
    setAiError("")
  }

  const runAi = async () => {
    if (aiUsage.count >= DAILY_BROWSER_QUOTA && !userCfg.apiKey) {
      setAiState("disabled")
      return
    }
    setAiState("loading")
    setAiError("")
    try {
      const res = await fetch("/api/llm-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jd: text,
          apiKey: userCfg.apiKey || undefined,
          baseUrl: userCfg.apiKey ? userCfg.baseUrl : undefined,
          model: userCfg.apiKey ? userCfg.model : undefined,
        }),
      })
      const data = (await res.json()) as {
        enabled?: boolean
        text?: string
        model?: string
        error?: string
        scope?: string
      }
      if (!data.enabled) {
        setAiState("disabled")
        setAiError("ai_off")
        return
      }
      if (res.status === 429) {
        setAiState(data.scope === "ip" ? "disabled" : "site-quota")
        return
      }
      if (!res.ok || !data.text) {
        setAiState("error")
        setAiError(data.error ?? `http_${res.status}`)
        return
      }
      setAiText(data.text)
      setAiModel(data.model ?? "")
      setAiState("done")
      if (!userCfg.apiKey) {
        const next = { date: todayKey(), count: aiUsage.count + 1 }
        setAiUsage(next)
        try {
          window.localStorage.setItem(USAGE_KEY, JSON.stringify(next))
        } catch {
          // 隐私模式写不进就算了，界面照常用
        }
      }
    } catch {
      setAiState("error")
      setAiError("network")
    }
  }

  const qaBySlug = (slug: string) => qaList.find((q) => q.slug === slug)

  return (
    <div className="tk-shell">
      <section className="tk-input-card" aria-label="JD 输入">
        <textarea
          ref={jdInputRef}
          className="tk-textarea"
          aria-label="目标岗位 JD 原文"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={14}
          spellCheck={false}
        />
        <div className="tk-input-actions">
          <span className="tk-privacy">规则拆解在你的浏览器本地完成，文本不发送到任何服务器；「AI 深度拆解」在拆解结果区，可选用，那一步才会把 JD 发到服务端</span>
          <button
            type="button"
            className="tk-run"
            onClick={() => { if (text.trim().length >= 50) run() }}
            aria-disabled={text.trim().length < 50}
          >
            开始拆解
          </button>
        </div>
        {text.trim().length > 0 && text.trim().length < 50 && (
          <p className="tk-hint">内容太少（至少 50 字），把职责和要求两段都贴进来。</p>
        )}
      </section>

      {report && (
        <section className="tk-shell" aria-label="拆解结果">

          <div className="tk-block jda-plain">
            <h3>人话速览<span className="tk-note">规则生成 · 引号内均来自你的 JD 原文</span></h3>
            <div className="jda-plain-body">
              {report.plain.map((line) => (
                <p key={line.slice(0, 16)}>{line}</p>
              ))}
              <p className="jda-seniority">级别判断:{report.seniority}</p>
            </div>
          </div>

          <div className="tk-block">
            <h3>岗位画像识别</h3>
            <p className="tk-block-desc">按 JD 里出现的考察词给三个岗位方向打分。分数只看「JD 提没提」，混招的 JD 会两个都高。</p>
            {report.families.map((f) => (
              <div key={f.profile.slug} className="tk-score-item">
                <span className="tk-score-label">{f.profile.name}</span>
                <div className="tk-score-track" aria-hidden>
                  <span className={f.score < 35 ? "warn" : undefined} style={{ width: `${f.score}%` }} />
                </div>
                <span className={`tk-score-num ${f.score < 35 ? "warn" : ""}`}>{f.score}</span>
              </div>
            ))}
            <p className="tk-hint">
              最接近的是「{report.families[0].profile.name}」：{report.families[0].profile.desc}
            </p>
          </div>

          {report.coreHits.length > 0 && (
            <div className="tk-block">
              <h3>JD 明确写的考察词</h3>
              <p className="tk-block-desc">这些是 JD 原文里出现的核心词，简历里应该能对上大多数。</p>
              <div className="tk-tags">
                {report.coreHits.map((w) => (
                  <span key={w} className="tk-tag on">{w}</span>
                ))}
                {report.keywords
                  .filter((w) => !report.coreHits.includes(w))
                  .slice(0, 24)
                  .map((w) => (
                    <span key={w} className="tk-tag">{w}</span>
                  ))}
              </div>
              <p className="tk-hint">绿色是核心考察词，灰色是 JD 里出现的技术词。对着这份清单改简历的技能与项目段落。</p>
            </div>
          )}

          {report.dimensions.length > 0 && (
            <div className="tk-block">
              <h3>能力维度分组</h3>
              <p className="tk-block-desc">把考察词归进能力域，看这个岗的重心压在哪几块。</p>
              <div className="tk-dim-grid">
                {report.dimensions.map((d) => (
                  <div key={d.key} className="tk-dim-card">
                    <div className="t">{d.label}</div>
                    <div className="d">{d.hint} · 命中：{d.words.slice(0, 6).join("、")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.hidden.length > 0 && (
            <div className="tk-block">
              <h3>JD 没写但面试会问<span className="tk-note">规则推断</span></h3>
              <p className="tk-block-desc">按 JD 信号映射的隐藏考点，来自站内题库与真实面经的高频归纳。</p>
              <ul className="tk-topic-list">
                {report.hidden.map((h) => (
                  <li key={h.topic}>
                    <span className="t">{h.topic}</span>
                    <span className="d">{h.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.business.length > 0 && (
            <div className="tk-block">
              <h3>业务场景推断<span className="tk-note">推断</span></h3>
              <p className="tk-block-desc">从 JD 的业务词反推这个岗大概在做什么场景，准备项目故事时往这个方向靠。</p>
              <ul className="tk-topic-list">
                {report.business.map((b) => (
                  <li key={b.topic}>
                    <span className="t">{b.topic}</span>
                    <span className="d">{b.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.qaPicks.length > 0 && (
            <div className="tk-block">
              <h3>先刷这几题</h3>
              <p className="tk-block-desc">按 JD 考察词从站内 {qaList.length} 题真实题库里匹配出来的，一题一页带答案。</p>
              <div className="tk-list">
                {report.qaPicks.map((slug) => {
                  const q = qaBySlug(slug)
                  if (!q) return null
                  return (
                    <Link key={slug} href={`/interview/qa/${slug}`}>
                      {q.question}
                      <span className="sub">{q.oneLine}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          <div className="tk-block">
            <h3>行动清单<span className="tk-note">照着做就行</span></h3>
            <ol className="jda-checklist">
              {report.checklist.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>

          <div className="tk-block jda-block">
            <h3>
              AI 深度拆解
              <span className="tk-note">大模型生成 · 需人工核验</span>
            </h3>
            <p className="tk-block-desc">
              规则拆解看词面命中，AI 拆解看岗位判断:把这份 JD 再交给大模型按面试官视角过一遍。
              免费额度:每个浏览器每天 {DAILY_BROWSER_QUOTA} 次（今天已用 {aiUsage.count} 次），输入与结果都不出你的浏览器和服务端，不用于其他用途。
            </p>

            {aiState === "idle" && (
              <button type="button" className="tk-run jda-run" onClick={runAi} disabled={aiUsage.count >= DAILY_BROWSER_QUOTA && !userCfg.apiKey}>
                {userCfg.apiKey
                  ? "用我的 key 拆解"
                  : aiUsage.count >= DAILY_BROWSER_QUOTA
                    ? "今日免费次数已用完（或填自己的 key 解锁）"
                    : `用 AI 再拆一遍（剩 ${DAILY_BROWSER_QUOTA - aiUsage.count} 次）`}
              </button>
            )}
            {aiState === "loading" && (
              <p className="jda-status">正在拆解，大约 5-15 秒，别关页面…</p>
            )}
            {aiState === "disabled" && (
              <>
                <p className="jda-status">
                  {aiError === "ai_off" || !userCfg.apiKey
                    ? "站点免费 AI 额度暂未开放/已用完。规则拆解（上方）不受影响；等不及的话，在下面填一个自己的大模型 API key 立即用。"
                    : "今天的免费次数用完了，明天再来。上面的规则拆解不限额，随时可用。"}
                </p>
                <details className="jda-keypanel" open={showKeyPanel} onToggle={(e) => setShowKeyPanel((e.target as HTMLDetailsElement).open)}>
                  <summary>用自己的 API key（立即解锁，额度算你自己的）</summary>
                  <div className="jda-keypanel-body">
                    <p className="jda-keypanel-hint">
                      填一个 OpenAI 兼容中转/官方的 key。key 只存你这台浏览器（localStorage),请求经本站转发但不落库、不记录；
                      默认按 huohua 中转 + deepseek-v4-flash 填好，可改成你自己的端点与模型。
                    </p>
                    <input
                      className="trk-input jda-key-input"
                      type="password"
                      placeholder="API Key(如 sk-…)"
                      value={userCfg.apiKey}
                      onChange={(e) => saveUserCfg({ ...userCfg, apiKey: e.target.value.trim() })}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <div className="jda-key-row">
                      <input
                        className="trk-input"
                        placeholder="Base URL"
                        value={userCfg.baseUrl}
                        onChange={(e) => saveUserCfg({ ...userCfg, baseUrl: e.target.value.trim() })}
                        spellCheck={false}
                      />
                      <input
                        className="trk-input"
                        placeholder="模型名"
                        value={userCfg.model}
                        onChange={(e) => saveUserCfg({ ...userCfg, model: e.target.value.trim() })}
                        spellCheck={false}
                      />
                    </div>
                    <button
                      type="button"
                      className="tk-run"
                      onClick={runAi}
                      disabled={userCfg.apiKey.length < 20}
                    >
                      {userCfg.apiKey.length >= 20 ? "用我的 key 拆解" : "填入 key 后解锁（至少 20 位）"}
                    </button>
                  </div>
                </details>
              </>
            )}
            {aiState === "site-quota" && (
              <p className="jda-status">今天全站 AI 额度已用完（每日 3 元预算控制），明天自动恢复。规则拆解不受影响。</p>
            )}
            {aiState === "error" && (
              <p className="jda-status">
                AI 拆解出错了({aiError})。可能是服务波动，稍后重试；上面的规则拆解结果是完整的。
              </p>
            )}
            {aiState === "done" && (
              <>
                <div className="jda-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiText}</ReactMarkdown>
                </div>
                <p className="tk-hint">
                  由 {aiModel} 生成，结论按「大概率/可能」的推断口径读，投递决策请结合官方 JD 与公开面经。
                  有用的话，把关键考点抄进你的准备清单。
                </p>
              </>
            )}
          </div>

          <div className="tk-block">
            <h3>下一步</h3>
            <div className="tk-cta-grid">
              <Link href="/tools/resume">
                <div className="t">简历对着这份 JD 体检</div>
                <div className="d">把简历和这段 JD 一起粘进体检工具，逐词看命中与缺口</div>
              </Link>
              <Link href="/tools/gap-test">
                <div className="t">测离这个岗差多远</div>
                <div className="d">八项能力自评加真题验证，出短板清单和补课路径</div>
              </Link>
              <Link href="/jd">
                <div className="t">看大厂 JD 精拆样例</div>
                <div className="d">字节/阿里/腾讯/百度/美团/小红书热门岗的人工深拆版</div>
              </Link>
              <Link href="/tools/project-matcher">
                <div className="t">缺项目？选一个做</div>
                <div className="d">按目标岗位和可用时间拿项目方案与验收指标</div>
              </Link>
            </div>
          </div>

          <p className="tk-foot">
            说明：隐藏考点与业务场景为基于 JD 信号和行业惯例的规则推断（页面已标注），不代表该公司的实际考法；
            考察词清单为词表匹配结果。准备方向请结合目标公司的公开面经交叉验证。
          </p>
        </section>
      )}
    </div>
  )
}
