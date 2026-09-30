"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Download, FileText, Printer, Sparkles } from "lucide-react"
import {
  auditResume,
  buildLatex,
  buildMarkdown,
  buildWordHtml,
  emptyResume,
  matchJd,
  parseResumeText,
  type AuditItem,
  type ResumeData,
  type ResumeEntry,
} from "@/lib/tools/resume-builder"
import { gradeBullet } from "@/lib/tools/bullet-grader"

const RESUME_STORE_KEY = "resume-builder-v1"
const RESUME_AI_KEY = "resume-ai-userkey-v1"
const RESUME_DAILY_LIMIT = 5

const EXAMPLE = `张三
13800138000 | zhangsan@qq.com | github.com/zhangsan

教育背景
河南大学 | 计算机科学与技术 本科 2022.09-2026.06

实习经历
某信息科技公司 | 后端开发实习生 2025.06-2025.09
- 负责开发 RAG 问答系统,使用 LangChain 和 FAISS,提升了问答效果。
- 参与向量检索服务维护,协助排查线上召回问题。

项目经历
企业知识库问答机器人 2025.03-2025.06
- 独立搭建检索问答服务,针对表格类文档解析丢失问题改用版面感知分块。
- 基于 300 条 badcase 迭代 chunk 与 prompt 约束,答案忠实度从 71% 提升到 89%。

专业技能
Python、LangChain、FAISS、MySQL、Docker`

const SECTION_TITLES: Array<{ key: "education" | "experience" | "projects" | "extras"; title: string; hint: string }> = [
  { key: "education", title: "教育背景", hint: "学校 | 专业与学历 | 时间" },
  { key: "experience", title: "实习与工作", hint: "公司 | 职位 | 时间,下面一条一条写经历" },
  { key: "projects", title: "项目经历", hint: "项目名 | 角色可选 | 时间" },
  { key: "extras", title: "其他经历", hint: "获奖、开源、校园经历都放这里" },
]

interface AiSuggestion {
  original: string
  rewritten: string
  notes: string[]
}

interface UserKeyCfg {
  apiKey: string
  baseUrl: string
  model: string
}

function loadUserKeyCfg(): UserKeyCfg {
  try {
    const raw = localStorage.getItem(RESUME_AI_KEY)
    if (raw) return JSON.parse(raw) as UserKeyCfg
  } catch {
    // 忽略损坏数据
  }
  return { apiKey: "", baseUrl: "https://api.huohuaapi.com/v1", model: "deepseek-v4-flash" }
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob(["\ufeff", content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function BulletRow({
  text,
  onChange,
  onRemove,
}: {
  text: string
  onChange: (v: string) => void
  onRemove: () => void
}) {
  const v = text.trim() ? gradeBullet(text) : null
  return (
    <div className="rb-bullet">
      <textarea
        className="rb-bullet-input"
        aria-label="经历条目"
        value={text}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="rb-bullet-meta">
        {v ? (
          <>
            <span className={v.score < 50 ? "rb-score bad" : v.score < 75 ? "rb-score mid" : "rb-score ok"}>
              {v.score} 分
            </span>
            <span className="rb-worst">{v.problems[0] || "能撑住追问,保持"}</span>
            {!text.includes("〔") && (
              <button type="button" className="mock-end-btn" onClick={() => onChange(v.rewrite)}>
                按骨架改写
              </button>
            )}
          </>
        ) : (
          <span className="rb-worst">空条目:写你做了什么、难在哪、结果如何</span>
        )}
        <button type="button" className="rb-del" aria-label="删除这条" onClick={onRemove}>
          删除
        </button>
      </div>
    </div>
  )
}

export function ResumeBuilderClient() {
  const [raw, setRaw] = useState("")
  const [data, setData] = useState<ResumeData | null>(null)
  const [loose, setLoose] = useState<string[]>([])
  const [copiedTex, setCopiedTex] = useState(false)
  const [savedAt, setSavedAt] = useState<string>("")
  const [jd, setJd] = useState("")
  const [showAlign, setShowAlign] = useState(false)
  // AI 改写
  const [aiState, setAiState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [aiItems, setAiItems] = useState<AiSuggestion[]>([])
  const [aiError, setAiError] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [aiQuota, setAiQuota] = useState(RESUME_DAILY_LIMIT)
  const [userCfg, setUserCfg] = useState<UserKeyCfg>({ apiKey: "", baseUrl: "", model: "" })
  const [showKeyPanel, setShowKeyPanel] = useState(false)
  const [aiNote, setAiNote] = useState("AI 只改写表达,不编造经历;数字缺了留〔〕占位")
  const rawRef = useRef<HTMLTextAreaElement>(null)

  // 挂载:回读水合前的粘贴 + 恢复本地草稿 + 读取用户 key 配置
  useEffect(() => {
    if (rawRef.current?.value) setRaw(rawRef.current.value)
    try {
      const saved = localStorage.getItem(RESUME_STORE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as { data: ResumeData; loose: string[]; savedAt: string }
        if (parsed?.data && typeof parsed.data === "object" && parsed.data.name !== undefined) {
          setData(parsed.data)
          setLoose(Array.isArray(parsed.loose) ? parsed.loose : [])
          setSavedAt(parsed.savedAt || "")
        }
      }
    } catch {
      // 忽略损坏草稿
    }
    setUserCfg(loadUserKeyCfg())
    setAiQuota(readQuota())
  }, [])

  // 自动保存(有数据且与上次快照不同时写入,防抖)
  const dataJson = data ? JSON.stringify({ data, loose }) : ""
  useEffect(() => {
    if (!data) return
    const timer = setTimeout(() => {
      const at = new Date().toISOString().slice(0, 16).replace("T", " ")
      try {
        localStorage.setItem(RESUME_STORE_KEY, JSON.stringify({ data, loose, savedAt: at }))
        setSavedAt(at)
      } catch {
        // 存储满等情况静默失败
      }
    }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataJson])

  const readQuota = () => {
    try {
      const rec = JSON.parse(localStorage.getItem("resume-ai-quota-v1") || "") as { day: string; count: number }
      const day = new Date().toISOString().slice(0, 10)
      return rec.day === day ? RESUME_DAILY_LIMIT - rec.count : RESUME_DAILY_LIMIT
    } catch {
      return RESUME_DAILY_LIMIT
    }
  }
  const bumpQuota = () => {
    const day = new Date().toISOString().slice(0, 10)
    try {
      const rec = JSON.parse(localStorage.getItem("resume-ai-quota-v1") || "") as { day: string; count: number }
      const count = rec.day === day ? rec.count + 1 : 1
      localStorage.setItem("resume-ai-quota-v1", JSON.stringify({ day, count }))
    } catch {
      localStorage.setItem("resume-ai-quota-v1", JSON.stringify({ day, count: 1 }))
    }
    setAiQuota(readQuota())
  }

  const latex = useMemo(() => (data ? buildLatex(data) : ""), [data])
  const ready = raw.trim().length >= 20

  const parse = () => {
    if (!ready) return
    const { data: parsed, loose: looseLines } = parseResumeText(raw)
    setData(parsed)
    setLoose(looseLines)
    setAiItems([])
    setAiState("idle")
  }

  // 证据审计(本地规则,无 AI)
  const audit = useMemo(() => (data ? auditResume(data) : []), [dataJson]) // eslint-disable-line react-hooks/exhaustive-deps
  // JD 对齐(本地规则词面匹配)
  const align = useMemo(() => (data && jd.trim().length >= 20 ? matchJd(data, jd) : null), [dataJson, jd]) // eslint-disable-line react-hooks/exhaustive-deps

  const runAi = useCallback(async () => {
    if (!data || aiState === "loading") return
    if (aiQuota <= 0 && !userCfg.apiKey) {
      setAiState("error")
      setAiError("今天的免费次数(5 次)用完了。明天再来,或在下面填自己的 API key(不计免费额度)。")
      return
    }
    setAiState("loading")
    setAiError("")
    try {
      const res = await fetch("/api/llm-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: buildMarkdown(data),
          jd: jd.trim() || undefined,
          apiKey: userCfg.apiKey || undefined,
          baseUrl: userCfg.apiKey ? userCfg.baseUrl || undefined : undefined,
          model: userCfg.apiKey ? userCfg.model || undefined : undefined,
        }),
      })
      const json = (await res.json()) as {
        enabled?: boolean
        items?: AiSuggestion[]
        error?: string
        detail?: string
        model?: string
      }
      if (!res.ok || json.error) {
        const map: Record<string, string> = {
          too_short: "简历内容太短,至少 30 字再试。",
          not_configured: "AI 深度改写还没开放。可以在下面填自己的 API key 立即使用。",
          quota: "免费额度用完了(全站或本机)。明天再来,或用自己的 API key(不计免费额度)。",
          upstream: `模型通道出了问题(${json.detail || "未知"}),稍后再试,或换自己的 key/模型。`,
          bad_output: "模型这次没按格式返回,再试一次通常就好。",
        }
        throw new Error(map[json.error || ""] || "请求失败,稍后再试。")
      }
      setAiItems(json.items || [])
      setAiModel(json.model || "")
      setAiState("done")
      bumpQuota()
    } catch (e) {
      setAiState("error")
      setAiError(e instanceof Error ? e.message : "请求失败")
    }
  }, [data, aiState, aiQuota, userCfg, jd])

  const applySuggestion = (item: AiSuggestion) => {
    setData((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev)) as ResumeData
      for (const group of [next.experience, next.projects, next.extras]) {
        for (const entry of group) {
          const idx = entry.bullets.findIndex((b) => b.trim() === item.original.trim())
          if (idx >= 0) {
            entry.bullets[idx] = item.rewritten
            return next
          }
        }
      }
      return next
    })
    setAiItems((prev) => prev.filter((it) => it !== item))
  }

  const exportJson = () => {
    if (!data) return
    const blob = new Blob(["\ufeff", JSON.stringify({ data, loose }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `简历数据-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJsonFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { data?: ResumeData; loose?: string[] }
        if (!parsed?.data || typeof parsed.data !== "object") throw new Error("bad")
        setData(parsed.data)
        setLoose(Array.isArray(parsed.loose) ? parsed.loose : [])
        setAiItems([])
      } catch {
        window.alert("这个文件不是本工具导出的简历数据(JSON)。")
      }
    }
    reader.readAsText(file)
  }

  const patch = (fn: (d: ResumeData) => void) => {
    setData((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev)) as ResumeData
      fn(next)
      return next
    })
  }

  const updateEntry = (key: "education" | "experience" | "projects" | "extras", i: number, field: "org" | "role" | "time", value: string) =>
    patch((d) => {
      d[key][i][field] = value
    })
  const removeEntry = (key: "education" | "experience" | "projects" | "extras", i: number) =>
    patch((d) => {
      d[key].splice(i, 1)
    })
  const addEntry = (key: "education" | "experience" | "projects" | "extras") =>
    patch((d) => {
      d[key].push({ org: "", role: "", time: "", bullets: [""] })
    })

  const bulletOps = {
    set: (key: "education" | "experience" | "projects" | "extras", ei: number, bi: number, v: string) =>
      patch((d) => {
        d[key][ei].bullets[bi] = v
      }),
    remove: (key: "education" | "experience" | "projects" | "extras", ei: number, bi: number) =>
      patch((d) => {
        d[key][ei].bullets.splice(bi, 1)
      }),
    add: (key: "education" | "experience" | "projects" | "extras", ei: number) =>
      patch((d) => {
        d[key][ei].bullets.push("")
      }),
  }

  const copyTex = async () => {
    try {
      await navigator.clipboard.writeText(latex)
      setCopiedTex(true)
      setTimeout(() => setCopiedTex(false), 2000)
    } catch {
      setCopiedTex(false)
    }
  }

  const assignLoose = (i: number, target: "skills" | "extras") =>
    patch((d) => {
      const line = loose[i]
      if (!line) return
      if (target === "skills") d.skills.push(line.replace(BULLET_PREFIX, ""))
      else d.extras.push({ org: line.replace(BULLET_PREFIX, ""), role: "", time: "", bullets: [] })
    })
  const dismissLoose = (i: number) => setLoose((prev) => prev.filter((_, j) => j !== i))

  return (
    <div className="tk-shell">
      {/* ── 输入区(打印时隐藏) ── */}
      <section className="tk-input-card rb-chrome" aria-label="简历来源">
        <p className="tk-label">第一步:把简历给过来</p>
        <p className="rb-input-hint">
          三种都行:把旧简历全文粘进来重新优化；或者胡乱写一段你的学校、实习、项目，乱一点没关系，解析完你可以逐条改。
        </p>
        <textarea
          ref={rawRef}
          className="tk-textarea"
          aria-label="简历原文或一段经历描述"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={9}
          spellCheck={false}
          placeholder={EXAMPLE.slice(0, 60) + "……"}
        />
        <div className="tk-input-actions">
          <span className="tk-privacy">解析和排版全部在你的浏览器本地完成,文本不发送到任何服务器</span>
          <button
            type="button"
            className="tk-run"
            onClick={() => { if (ready) parse() }}
            aria-disabled={!ready}
          >
            解析并生成
          </button>
        </div>
        <div className="bullet-examples">
          <button type="button" className="mock-end-btn" onClick={() => setRaw(EXAMPLE)}>
            填入示例简历
          </button>
        </div>
      </section>

      {data && (
        <div className="rb-grid">
          {/* ── 编辑列 ── */}
          <div className="rb-chrome tk-shell" aria-label="简历编辑">
            <section className="tk-input-card">
              <p className="tk-label">基本信息</p>
              <div className="rb-form">
                <input className="rb-field" aria-label="姓名" value={data.name} placeholder="姓名" onChange={(e) => patch((d) => { d.name = e.target.value })} />
                <input className="rb-field" aria-label="联系方式" value={data.contact} placeholder="电话 | 邮箱 | 主页" onChange={(e) => patch((d) => { d.contact = e.target.value })} />
                <textarea className="rb-field" aria-label="一句话简介(可选)" rows={2} value={data.summary} placeholder="一句话简介(可选):求职方向 + 最硬的一条证据" onChange={(e) => patch((d) => { d.summary = e.target.value })} />
              </div>
            </section>

            {loose.length > 0 && (
              <section className="tk-input-card">
                <p className="tk-label">有几行没认出来是哪部分({loose.length} 行)</p>
                {loose.map((line, i) => (
                  <div key={i} className="rb-loose-row">
                    <span className="rb-loose-text">{line}</span>
                    <span className="rb-loose-ops">
                      <button type="button" className="mock-end-btn" onClick={() => { assignLoose(i, "skills"); dismissLoose(i) }}>归入技能</button>
                      <button type="button" className="mock-end-btn" onClick={() => { assignLoose(i, "extras"); dismissLoose(i) }}>归入其他</button>
                      <button type="button" className="rb-del" onClick={() => dismissLoose(i)}>不要了</button>
                    </span>
                  </div>
                ))}
              </section>
            )}

            {/* ── JD 对齐(本地词面匹配) ── */}
            <section className="tk-input-card" aria-label="JD 对齐">
              <div className="rb-sec-head">
                <p className="tk-label">对着 JD 查覆盖(可选)</p>
                <button type="button" className="mock-end-btn" onClick={() => setShowAlign((v) => !v)}>
                  {showAlign ? "收起" : "展开"}
                </button>
              </div>
              {showAlign && (
                <>
                  <p className="tk-hint" style={{ marginTop: 0 }}>
                    贴上目标 JD,工具逐词对照你的简历:命中的是你已有的证据,缺失的只代表「简历里没写」,不代表你不能干。缺的部分优先回去补真实经历,而不是硬塞词。
                  </p>
                  <textarea
                    className="tk-textarea"
                    aria-label="目标岗位 JD"
                    rows={4}
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    placeholder="贴 JD 里「岗位要求」那几行"
                    spellCheck={false}
                  />
                  {align && (
                    <p className="tk-hint">
                      词面命中 {align.hits.length}/{align.total}。{align.hits.length > 0 && `已覆盖:${align.hits.slice(0, 8).join("、")}${align.hits.length > 8 ? "…" : ""}。`}
                      {align.missing.length > 0 && (
                        <>
                          简历里没出现:{align.missing.join("、")}。
                          {align.missing.length > align.hits.length ? "缺失多于命中:这份 JD 和你的现有经历差距偏大,考虑先补项目再投。" : "核心词基本覆盖,投前把 JD 关键词对应的经历放到更显眼的位置。"}
                        </>
                      )}
                    </p>
                  )}
                </>
              )}
            </section>

            {/* ── 证据审计(本地规则) ── */}
            {audit.length > 0 && (
              <section className="tk-input-card" aria-label="证据审计">
                <p className="tk-label">证据体检:这几条面试时容易被问穿({audit.length} 条)</p>
                <p className="tk-hint" style={{ marginTop: 0 }}>
                  规则来自真实面试官的审查习惯:规划写成已交付、「第一/首个」说不清比较范围、指标没有口径、团队成果算成个人的。被标出的条目要么补证据,要么改表述。
                </p>
                {audit.map((item, i) => (
                  <div key={i} className="rb-audit-item">
                    <p className="rb-audit-text">{item.text}</p>
                    {item.flags.map((f, j) => (
                      <p key={j} className={f.level === "risk" ? "rb-audit-flag risk" : "rb-audit-flag"}>
                        <b>{f.kind}</b>:{f.note}
                      </p>
                    ))}
                  </div>
                ))}
              </section>
            )}

            {/* ── AI 深度改写 ── */}
            <section className="tk-input-card" aria-label="AI 深度改写">
              <div className="rb-sec-head">
                <p className="tk-label">AI 深度改写(可选用)</p>
                <span className="tk-note">{userCfg.apiKey ? "用自己的 key" : `今日免费 ${aiQuota}/${RESUME_DAILY_LIMIT} 次`}</span>
              </div>
              <p className="tk-hint" style={{ marginTop: 0 }}>
                把每条经历交给模型改写:动词、量化、难点、结果四个维度重排,输出「原文 → 改写 → 问题说明」,
                你逐条决定要不要采用。AI 不编造经历:数字缺了留〔〕占位,公司学校职位原样保留。
              </p>
              <div className="tk-input-actions">
                <span className="tk-privacy">简历全文会发送到服务端调用大模型(这是本页唯一需要联网的一步,其余全部本地)</span>
                <button type="button" className="tk-run" onClick={runAi} disabled={aiState === "loading" || !data}>
                  {aiState === "loading" ? "改写中…" : "AI 改写全部经历"}
                </button>
              </div>
              {!userCfg.apiKey && (
                <details className="jda-keypanel">
                  <summary>用自己的 API key(不计免费额度,更快更稳)</summary>
                  <div className="jda-keypanel-body">
                    <p className="jda-keypanel-hint">
                      Key 只存在你这台浏览器(localStorage),请求时经本站转发但不落库、不记录。兼容 OpenAI 接口格式的中转或官方 API 都可以用。
                    </p>
                    <input
                      className="trk-input jda-key-input"
                      type="password"
                      aria-label="API key"
                      placeholder="sk-…"
                      value={userCfg.apiKey}
                      onChange={(e) => {
                        const cfg = { ...userCfg, apiKey: e.target.value }
                        setUserCfg(cfg)
                        try {
                          localStorage.setItem(RESUME_AI_KEY, JSON.stringify(cfg))
                        } catch {
                          // 忽略
                        }
                      }}
                    />
                    <div className="jda-key-row">
                      <input
                        className="trk-input jda-key-input"
                        aria-label="接口地址"
                        placeholder="https://api.huohuaapi.com/v1"
                        value={userCfg.baseUrl}
                        onChange={(e) => {
                          const cfg = { ...userCfg, baseUrl: e.target.value }
                          setUserCfg(cfg)
                          try {
                            localStorage.setItem(RESUME_AI_KEY, JSON.stringify(cfg))
                          } catch {
                            // 忽略
                          }
                        }}
                      />
                      <input
                        className="trk-input jda-key-input"
                        aria-label="模型名"
                        placeholder="deepseek-v4-flash"
                        value={userCfg.model}
                        onChange={(e) => {
                          const cfg = { ...userCfg, model: e.target.value }
                          setUserCfg(cfg)
                          try {
                            localStorage.setItem(RESUME_AI_KEY, JSON.stringify(cfg))
                          } catch {
                            // 忽略
                          }
                        }}
                      />
                    </div>
                  </div>
                </details>
              )}
              {aiState === "error" && <p className="mock-followup" style={{ marginTop: 10 }}>{aiError}</p>}
              {aiState === "done" && (
                <div style={{ marginTop: 12 }}>
                  <p className="tk-hint" style={{ marginTop: 0 }}>
                    {aiModel && `模型 ${aiModel} · `}建议 {aiItems.length} 条。点「采用」写回简历,不合适的不用。
                  </p>
                  {aiItems.map((item, i) => (
                    <div className="rb-ai-item" key={i}>
                      <p className="rb-ai-orig">{item.original}</p>
                      <p className="rb-ai-new">
                        <Sparkles size={12} strokeWidth={2} aria-hidden style={{ verticalAlign: "-1px", marginRight: 4 }} />
                        {item.rewritten}
                      </p>
                      {item.notes?.map((n, j) => (
                        <p key={j} className="rb-audit-flag">· {n}</p>
                      ))}
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <button type="button" className="mock-end-btn" onClick={() => applySuggestion(item)}>
                          采用
                        </button>
                        <button type="button" className="rb-del" onClick={() => setAiItems((prev) => prev.filter((_, j) => j !== i))}>
                          不用
                        </button>
                      </div>
                    </div>
                  ))}
                  {aiItems.length === 0 && <p className="tk-hint">建议都已处理完。可以再点一次「AI 改写全部经历」看有没有新建议。</p>}
                </div>
              )}
            </section>

            {SECTION_TITLES.map(({ key, title, hint }) => (
              <section className="tk-input-card" key={key} aria-label={title}>
                <div className="rb-sec-head">
                  <p className="tk-label">{title}</p>
                  <button type="button" className="mock-end-btn" onClick={() => addEntry(key)}>
                    加一条
                  </button>
                </div>
                <p className="tk-hint" style={{ marginTop: 0 }}>{hint}</p>
                {(data[key] as ResumeEntry[]).length === 0 && <p className="tk-hint">还没有内容。点右上角「加一条」,或回到第一步重新解析。</p>}
                {(data[key] as ResumeEntry[]).map((entry, ei) => (
                  <div className="rb-entry-card" key={ei}>
                    <div className="rb-entry-fields">
                      <input className="rb-field" aria-label={`${title}第${ei + 1}条主体`} value={entry.org} placeholder={key === "education" ? "学校" : key === "experience" ? "公司" : "项目名"} onChange={(e) => updateEntry(key, ei, "org", e.target.value)} />
                      <input className="rb-field" aria-label="角色或专业" value={entry.role} placeholder={key === "education" ? "专业与学历" : "职位或角色(可选)"} onChange={(e) => updateEntry(key, ei, "role", e.target.value)} />
                      <input className="rb-field" aria-label="时间" value={entry.time} placeholder="2025.06-2025.09" onChange={(e) => updateEntry(key, ei, "time", e.target.value)} />
                      <button type="button" className="rb-del" aria-label={`删除${title}第${ei + 1}条`} onClick={() => removeEntry(key, ei)}>删除条目</button>
                    </div>
                    {entry.bullets.map((b, bi) => (
                      <BulletRow key={bi} text={b} onChange={(v) => bulletOps.set(key, ei, bi, v)} onRemove={() => bulletOps.remove(key, ei, bi)} />
                    ))}
                    <button type="button" className="mock-end-btn" onClick={() => bulletOps.add(key, ei)}>
                      加一条经历
                    </button>
                  </div>
                ))}
              </section>
            ))}

            <section className="tk-input-card" aria-label="专业技能">
              <div className="rb-sec-head">
                <p className="tk-label">专业技能</p>
                <button type="button" className="mock-end-btn" onClick={() => patch((d) => { d.skills.push("") })}>
                  加一项
                </button>
              </div>
              {data.skills.length === 0 && <p className="tk-hint">写你真的会用东西:语言、框架、工具。别堆名词,面试官会挑一个问到底。</p>}
              <div className="rb-form">
                {data.skills.map((s, i) => (
                  <div className="rb-skill-row" key={i}>
                    <input className="rb-field" aria-label={`技能${i + 1}`} value={s} onChange={(e) => patch((d) => { d.skills[i] = e.target.value })} />
                    <button type="button" className="rb-del" aria-label={`删除技能${i + 1}`} onClick={() => patch((d) => { d.skills.splice(i, 1) })}>删除</button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── 预览列(打印只保留这一块) ── */}
          <div className="rb-preview-col" id="rb-print-root">
            <div className="rb-toolbar rb-chrome">
              <span className="tk-privacy">
                {savedAt ? `已自动保存到本机(${savedAt})` : "A4 排版;指标位〔〕留空,自己填真实数字"}
              </span>
              <span className="rb-toolbar-btns">
                <button type="button" className="tk-run rb-print-btn" onClick={() => window.print()}>
                  <Printer size={14} strokeWidth={2} aria-hidden /> 打印 / 存 PDF
                </button>
                <button type="button" className="mock-end-btn" onClick={() => download(buildWordHtml(data), "简历.doc", "application/msword")}>
                  <Download size={13} strokeWidth={2} aria-hidden /> Word
                </button>
                <button type="button" className="mock-end-btn" onClick={() => download(latex, "简历.tex", "application/x-tex")}>
                  <FileText size={13} strokeWidth={2} aria-hidden /> LaTeX
                </button>
              </span>
            </div>
            <div className="rb-toolbar rb-chrome" style={{ marginTop: -4 }}>
              <span className="tk-privacy">换个地方继续编辑或备份:</span>
              <span className="rb-toolbar-btns">
                <button type="button" className="mock-end-btn" onClick={() => download(buildMarkdown(data), "简历.md", "text/markdown")}>
                  Markdown
                </button>
                <button type="button" className="mock-end-btn" onClick={exportJson}>
                  导出数据(JSON)
                </button>
                <label className="mock-end-btn rb-file-label">
                  导入数据
                  <input
                    type="file"
                    accept=".json,application/json"
                    aria-label="导入简历数据 JSON"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) importJsonFile(f)
                      e.target.value = ""
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="mock-end-btn"
                  onClick={() => {
                    if (window.confirm("清空当前简历,回到第一步重新开始?(本机自动保存的草稿也会清掉)")) {
                      setData(null)
                      setLoose([])
                      setRaw("")
                      setAiItems([])
                      setAiState("idle")
                      localStorage.removeItem(RESUME_STORE_KEY)
                      setSavedAt("")
                    }
                  }}
                >
                  重新开始
                </button>
              </span>
            </div>

            <div className="rb-paper" aria-label="简历预览">
              <p className="rb-name">{data.name || "姓名"}</p>
              {data.contact && <p className="rb-contact">{data.contact}</p>}
              {data.summary && <p className="rb-summary">{data.summary}</p>}

              {[
                { title: "教育背景", entries: data.education },
                { title: "实习与工作", entries: data.experience },
                { title: "项目经历", entries: data.projects },
                { title: "其他经历", entries: data.extras },
              ].map(
                ({ title, entries }) =>
                  entries.length > 0 && (
                    <div className="rb-sec" key={title}>
                      <p className="rb-sec-t">{title}</p>
                      {entries.map((e, i) => (
                        <div className="rb-entry" key={i}>
                          <p className="rb-entry-head">
                            <span className="rb-org">{[e.org, e.role].filter(Boolean).join(" · ")}</span>
                            {e.time && <span className="rb-time">{e.time}</span>}
                          </p>
                          {e.bullets.filter(Boolean).length > 0 && (
                            <ul className="rb-ul">
                              {e.bullets.filter(Boolean).map((b, j) => (
                                <li key={j}>{b}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  ),
              )}

              {data.skills.filter(Boolean).length > 0 && (
                <div className="rb-sec">
                  <p className="rb-sec-t">专业技能</p>
                  <p className="rb-skills">{data.skills.filter(Boolean).join(" · ")}</p>
                </div>
              )}
            </div>

            <details className="rb-tex rb-chrome">
              <summary>LaTeX 源码(贴进 Overleaf,编译器选 XeLaTeX)</summary>
              <pre className="rb-tex-pre">{latex}</pre>
              <div className="tk-input-actions">
                <span className="tk-privacy">{copiedTex ? "已复制" : "想自己调排版就复制源码去改"}</span>
                <button type="button" className="mock-end-btn" onClick={copyTex}>
                  {copiedTex ? "已复制" : "复制 LaTeX 源码"}
                </button>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  )
}

const BULLET_PREFIX = /^\s*(?:[•·●▪]\s*|[-–—]\s+|\d+[.、)]\s+)/
