"use client"

/**
 * 简历生成器 v2:结构化编辑器 + A4 实时预览(交互骨架吸收自酥神 ASU 编辑器:
 * 分区页签 / 实时预览缩放 / 撤销重做 / 本地草稿 / JSON 导入导出)。
 * 保留 v1 能力:粘贴解析、逐条打分、证据审计、JD 对齐、AI 改写(不编造红线不变)。
 * 渲染与解析在浏览器本地完成;唯一联网步骤是 AI 改写,且只在用户点按钮时发生。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Download, FileText, Printer, Redo2, Sparkles, Undo2 } from "lucide-react"
import {
  applyRewrite,
  auditResume,
  classifyProjectInPlace,
  docToLatex,
  docToMarkdown,
  docToWordHtml,
  isEmptyDoc,
  looksLikeResumeJson,
  matchJd,
  migrateV1,
  normalizeDoc,
  parseResumeText,
  projectMetricHints,
  qaLinksFor,
  type AuditItem,
  type BulletObj,
  type ExperienceItem,
  type ResumeDoc,
} from "@/lib/tools/resume-builder"
import { buildResumeHtml } from "@/lib/tools/resume-render"
import { analyzeTextQuality, extractFileText } from "@/lib/tools/resume-import"
import { gradeBullet } from "@/lib/tools/bullet-grader"

const DOC_STORE_KEY = "resume-builder-doc-v2"
const V1_STORE_KEY = "resume-builder-v1"
const RESUME_AI_KEY = "resume-ai-userkey-v1"
const RESUME_DAILY_LIMIT = 5
const AI_PRIVACY_NOTE = "简历全文会发送到服务端调用大模型(这是本页唯一需要联网的一步，其余全部本地)；AI 只改写表达，不编造经历，数字缺了留〔〕占位"

const EXAMPLE_TEXT = `张三
13800138000 | zhangsan@qq.com | github.com/zhangsan

教育背景
河南大学 | 计算机科学与技术 本科 2022.09-2026.06

实习经历
某信息科技公司 | 后端开发实习生 2025.06-2025.09
- 负责开发 RAG 问答系统，使用 LangChain 和 FAISS，提升了问答效果。
- 参与向量检索服务维护，协助排查线上召回问题。

项目经历
企业知识库问答机器人 2025.03-2025.06
- 独立搭建检索问答服务，针对表格类文档解析丢失问题改用版面感知分块。
- 基于 300 条 badcase 迭代 chunk 与 prompt 约束，答案忠实度从 71% 提升到 89%。

专业技能
Python、LangChain、FAISS、MySQL、Docker`

/** 演示文档(非真实候选人):给「载入示例」用,展示分区/色条/重点词加粗的完整效果 */
const SAMPLE_JSON = `{
  "profile": {
    "name": "示例同学",
    "headline": "AI Agent 开发方向｜RAG · Agent 编排 · 大模型应用",
    "location": "意向城市：上海",
    "eyebrow": "2026 届 · 求职中",
    "summary": "大模型应用方向候选人，做过 RAG 问答与 Agent 编排两个完整项目，熟悉检索质量评估与线上问题排查。",
    "contacts": [
      { "label": "电话", "value": "138xxxx0000" },
      { "label": "邮箱", "value": "demo@example.com" },
      { "label": "GitHub", "value": "github.com/yourname", "url": "https://github.com/yourname" }
    ]
  },
  "education": [
    {
      "institution": "示例大学",
      "program": "计算机科学与技术",
      "degree": "本科",
      "dates": "2022.09 - 2026.06",
      "bullets": [{ "text": "主修课程：机器学习、数据结构、分布式系统；GPA 3.6/4.0（专业前 15%）。" }]
    }
  ],
  "experience": [
    {
      "company": "某信息科技公司",
      "team": "AI 应用组 · 后端开发实习生",
      "dates": "2025.06 - 2025.09",
      "tone": "",
      "projects": [
        {
          "name": "企业知识库问答系统（RAG）",
          "subtitle": "面向内部 2000+ 篇文档的检索问答服务",
          "background": [{ "text": "内部文档分散在多个系统，客服答疑平均要翻 3 个系统，检索质量差。" }],
          "impact": [{ "text": "答案忠实度从 71% 提升到 89%（300 条人工标注评测集），客服查证时间缩短一半。" }],
          "responsibilities": [
            { "text": "独立搭建检索问答链路（LangChain + FAISS），针对表格类文档解析丢失问题改用版面感知分块。" },
            { "text": "建立 badcase 归因流程：每周标注 50 条，区分检索失败与生成失败，分别迭代。" }
          ]
        }
      ]
    }
  ],
  "projects": [
    {
      "name": "Agent 评测小工具",
      "role": "独立开发",
      "dates": "2025.03 - 2025.06",
      "scope": "开源项目，GitHub 200+ Star（演示数据）",
      "bullets": [
        { "text": "用〔评测集规模〕条任务对 Agent 多步执行做自动回归，定位工具调用失败模式〔数字〕类。" }
      ]
    }
  ],
  "awards": [{ "name": "校程序设计竞赛二等奖", "date": "2024.10" }],
  "skills": ["Python", "LangChain", "FAISS", "MySQL", "Docker", "Prompt Engineering"],
  "section_titles": { "education": "教育经历", "experience": "实习 / 工作经历", "projects": "技术项目与沉淀" },
  "page_setup": { "accent": "ink", "showPageNumbers": true }
}`

interface AiSuggestion {
  original: string
  rewritten: string
  notes: string[]
  /** 面试承接:这条强表述面试官会追问什么、要准备什么(大胆档必带) */
  prep?: string
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

/* ── 编辑小组件 ── */

function BulletEditor({
  bullet,
  onChange,
  onRemove,
}: {
  bullet: BulletObj
  onChange: (b: BulletObj) => void
  onRemove: () => void
}) {
  const v = bullet.text.trim() ? gradeBullet(bullet.text) : null
  return (
    <div className="rb-bullet">
      <textarea
        className="rb-bullet-input"
        aria-label="经历条目"
        value={bullet.text}
        rows={2}
        onChange={(e) => onChange({ ...bullet, text: e.target.value })}
      />
      <div className="rb-bullet-meta">
        {v ? (
          <>
            <span className={v.score < 50 ? "rb-score bad" : v.score < 75 ? "rb-score mid" : "rb-score ok"}>{v.score} 分</span>
            <span className="rb-worst">{v.problems[0] || "能撑住追问，保持"}</span>
            {!bullet.text.includes("〔") && (
              <button type="button" className="mock-end-btn" onClick={() => onChange({ ...bullet, text: v.rewrite })}>
                按骨架改写
              </button>
            )}
          </>
        ) : (
          <span className="rb-worst">空条目：写你做了什么、难在哪、结果如何</span>
        )}
        <button type="button" className="rb-del" aria-label="删除这条" onClick={onRemove}>
          删除
        </button>
      </div>
      {bullet.text.trim() && (
        <input
          className="rb-field rb-highlight-input"
          aria-label="重点词(可选)"
          placeholder="重点词(可选，逗号分隔)：会按这里加粗；留空自动加粗数字与指标"
          value={(bullet.highlights || []).join(", ")}
          onChange={(e) => {
            const list = e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
            onChange({ ...bullet, ...(list.length ? { highlights: list } : {}) })
          }}
        />
      )}
    </div>
  )
}

function FactGroup({
  label,
  hint,
  bullets,
  onChange,
}: {
  label: string
  hint?: string
  bullets: BulletObj[]
  onChange: (next: BulletObj[]) => void
}) {
  return (
    <div className="rb-factgroup">
      <div className="rb-factgroup-head">
        <span className="rb-factgroup-label">{label}</span>
        {hint && <span className="rb-factgroup-hint">{hint}</span>}
        <button type="button" className="mock-end-btn" onClick={() => onChange([...bullets, { text: "" }])}>
          ＋ 加一条
        </button>
      </div>
      {bullets.length === 0 && <p className="tk-hint">还没有内容。</p>}
      {bullets.map((b, bi) => (
        <BulletEditor
          key={bi}
          bullet={b}
          onChange={(nb) => onChange(bullets.map((x, i) => (i === bi ? nb : x)))}
          onRemove={() => onChange(bullets.filter((_, i) => i !== bi))}
        />
      ))}
    </div>
  )
}

const TONES: Array<{ v: ExperienceItem["tone"]; label: string }> = [
  { v: "", label: "自动(红/灰/蓝轮换)" },
  { v: "red", label: "红" },
  { v: "blue", label: "蓝" },
  { v: "green", label: "绿" },
  { v: "gray", label: "灰" },
]

/* ── 主组件 ── */

type TabKey = "basic" | "education" | "experience" | "projects" | "extras" | "review" | "setup" | "json"

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "basic", label: "基本信息" },
  { key: "education", label: "教育" },
  { key: "experience", label: "实习 / 工作" },
  { key: "projects", label: "项目 / 开源" },
  { key: "extras", label: "奖项技能" },
  { key: "review", label: "体检 · AI" },
  { key: "setup", label: "页面设置" },
  { key: "json", label: "JSON" },
]

export function ResumeBuilderClient() {
  const [doc, setDoc] = useState<ResumeDoc | null>(null)
  const [loose, setLoose] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>("basic")
  const [raw, setRaw] = useState("")
  const [savedAt, setSavedAt] = useState("")
  const [zoom, setZoom] = useState<"auto" | 0.65 | 0.8 | 1>("auto")
  const [fitScale, setFitScale] = useState(0.72)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(0)
  const [srcDoc, setSrcDoc] = useState("")
  const [copiedTex, setCopiedTex] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  // 撤销 / 重做
  const historyRef = useRef<{ stack: string[]; index: number; skip: boolean }>({ stack: [], index: -1, skip: false })
  const [histMeta, setHistMeta] = useState({ canUndo: false, canRedo: false })
  // AI 改写
  const [aiState, setAiState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [aiItems, setAiItems] = useState<AiSuggestion[]>([])
  const [aiError, setAiError] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [aiQuota, setAiQuota] = useState(RESUME_DAILY_LIMIT)
  const [aiStrength, setAiStrength] = useState<"safe" | "bold">("safe")
  const [userCfg, setUserCfg] = useState<UserKeyCfg>({ apiKey: "", baseUrl: "", model: "" })
  // 文件导入
  const [importState, setImportState] = useState<"idle" | "loading">("idle")
  const [importNote, setImportNote] = useState("")
  // JD 对齐
  const [jd, setJd] = useState("")
  // JSON 页签草稿
  const [jsonDraft, setJsonDraft] = useState("")
  const jsonRef = useRef<HTMLTextAreaElement>(null)

  /* 挂载:恢复草稿(v2 → v1 迁移),读用户 key 与额度 */
  useEffect(() => {
    try {
      const savedV2 = localStorage.getItem(DOC_STORE_KEY)
      if (savedV2) {
        const parsed = JSON.parse(savedV2) as { doc?: unknown; loose?: string[]; savedAt?: string }
        if (looksLikeResumeJson(parsed.doc)) {
          setDoc(normalizeDoc(parsed.doc))
          setLoose(Array.isArray(parsed.loose) ? parsed.loose : [])
          setSavedAt(parsed.savedAt || "")
        }
      } else {
        const savedV1 = localStorage.getItem(V1_STORE_KEY)
        if (savedV1) {
          const migrated = migrateV1(JSON.parse(savedV1))
          if (migrated && !isEmptyDoc(migrated)) {
            setDoc(migrated)
            setLoose([])
          }
        }
      }
    } catch {
      // 忽略损坏草稿
    }
    setUserCfg(loadUserKeyCfg())
    setAiQuota(readQuota())
  }, [])

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

  const docJson = doc ? JSON.stringify(doc) : ""

  /* 自动保存(防抖) */
  useEffect(() => {
    if (!doc) return
    const timer = setTimeout(() => {
      const at = new Date().toISOString().slice(0, 16).replace("T", " ")
      try {
        localStorage.setItem(DOC_STORE_KEY, JSON.stringify({ doc, loose, savedAt: at }))
        setSavedAt(at)
      } catch {
        // 存储满等情况静默失败
      }
    }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docJson])

  /* 撤销/重做历史:输入防抖入栈 */
  useEffect(() => {
    if (!doc) return
    const h = historyRef.current
    if (h.skip) {
      h.skip = false
      return
    }
    const timer = setTimeout(() => {
      const current = JSON.stringify(doc)
      if (h.stack[h.index] === current) return
      h.stack = h.stack.slice(0, h.index + 1)
      h.stack.push(current)
      if (h.stack.length > 60) h.stack.shift()
      h.index = h.stack.length - 1
      setHistMeta({ canUndo: h.index > 0, canRedo: false })
    }, 650)
    return () => clearTimeout(timer)
  }, [docJson]) // eslint-disable-line react-hooks/exhaustive-deps

  const undo = useCallback(() => {
    const h = historyRef.current
    if (h.index <= 0) return
    h.index -= 1
    h.skip = true
    setDoc(normalizeDoc(JSON.parse(h.stack[h.index])))
    setHistMeta({ canUndo: h.index > 0, canRedo: h.index < h.stack.length - 1 })
  }, [])
  const redo = useCallback(() => {
    const h = historyRef.current
    if (h.index >= h.stack.length - 1) return
    h.index += 1
    h.skip = true
    setDoc(normalizeDoc(JSON.parse(h.stack[h.index])))
    setHistMeta({ canUndo: h.index > 0, canRedo: h.index < h.stack.length - 1 })
  }, [])

  /* Ctrl+Z / Ctrl+Shift+Z(输入框内保留浏览器原生撤销) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (target && (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable)) return
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo])

  /* 预览:防抖重建 iframe 文档 */
  useEffect(() => {
    if (!doc) {
      setSrcDoc("")
      return
    }
    const timer = setTimeout(() => setSrcDoc(buildResumeHtml(doc)), 400)
    return () => clearTimeout(timer)
  }, [docJson]) // eslint-disable-line react-hooks/exhaustive-deps

  const syncPageCount = useCallback(() => {
    try {
      const n = Number(frameRef.current?.contentWindow?.document?.documentElement?.dataset?.pageCount || "1")
      setPageCount(Number.isFinite(n) && n > 0 ? n : 1)
    } catch {
      setPageCount(1)
    }
  }, [])

  /* 预览列宽自适应:A4 宽 210mm ≈ 794px,默认缩到正好放进列里 */
  useEffect(() => {
    const el = viewportRef.current
    if (!el || !doc) return
    const measure = () => setFitScale(Math.max(0.4, Math.min(1, (el.clientWidth - 2) / 794)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [docJson]) // eslint-disable-line react-hooks/exhaustive-deps

  const effScale = zoom === "auto" ? fitScale : zoom

  const patch = useCallback((fn: (d: ResumeDoc) => void) => {
    setDoc((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev)) as ResumeDoc
      fn(next)
      return next
    })
  }, [])

  /* ── 第一步:粘贴解析 ── */
  const ready = raw.trim().length >= 20
  const parse = () => {
    if (!ready) return
    const { data: parsed, loose: looseLines } = parseResumeText(raw)
    setDoc(parsed)
    setLoose(looseLines)
    setAiItems([])
    setAiState("idle")
    historyRef.current = { stack: [], index: -1, skip: false }
    setHistMeta({ canUndo: false, canRedo: false })
    setActiveTab("basic")
  }

  const loadSample = () => {
    try {
      setDoc(normalizeDoc(JSON.parse(SAMPLE_JSON)))
      setLoose([])
      setRaw("")
      historyRef.current = { stack: [], index: -1, skip: false }
      setHistMeta({ canUndo: false, canRedo: false })
      setActiveTab("basic")
    } catch {
      // 内置常量,不应发生
    }
  }

  /* ── 文件导入(PDF/DOCX → 本地文本 → 填进粘贴框,由用户点「解析并生成」) ── */
  const importFile = async (file: File) => {
    setImportState("loading")
    setImportNote(`正在解析 ${file.name}…`)
    try {
      const { text, method, quality } = await extractFileText(file)
      const q = quality.passed ? "" : `（检测提示：${quality.reasons.join("；")}，建议校对后再解析）`
      setRaw((prev) => (prev.trim() ? `${prev}\n\n${text}` : text))
      setImportNote(`${method}${q}：文字已填进下面的输入框，确认无误后点「解析并生成」。`)
    } catch (e) {
      setImportNote(e instanceof Error ? e.message : "解析失败，请复制文字粘贴。")
    } finally {
      setImportState("idle")
    }
  }

  /* ── 证件照:本地压缩成 data URL 存进文档 ── */
  const importPhoto = (file: File) => {
    if (!/^image\/(?:png|jpeg|webp)$/i.test(file.type)) {
      window.alert("请选择 PNG、JPG 或 WebP 图片。")
      return
    }
    const reader = new FileReader()
    reader.onerror = () => window.alert("照片读取失败。")
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => window.alert("照片格式无法识别。")
      img.onload = () => {
        const scale = Math.min(1, 700 / Math.max(img.naturalWidth, img.naturalHeight))
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height)
        const src = canvas.toDataURL("image/jpeg", 0.9)
        patch((d) => {
          d.profile.photo = { src, crop: { x: 50, y: 50, zoom: 1 }, confirmed: true }
        })
      }
      img.src = String(reader.result || "")
    }
    reader.readAsDataURL(file)
  }

  const setPhotoCrop = (key: "x" | "y" | "zoom", value: number) =>
    patch((d) => {
      if (!d.profile.photo) return
      d.profile.photo.crop[key] = value
      d.profile.photo.confirmed = true
    })

  /* ── 审计 / JD / AI ── */
  const audit: AuditItem[] = useMemo(() => (doc ? auditResume(doc) : []), [docJson]) // eslint-disable-line react-hooks/exhaustive-deps
  const metricHints = useMemo(() => (doc ? projectMetricHints(doc) : []), [docJson]) // eslint-disable-line react-hooks/exhaustive-deps
  const align = useMemo(() => (doc && jd.trim().length >= 20 ? matchJd(doc, jd) : null), [docJson, jd]) // eslint-disable-line react-hooks/exhaustive-deps

  const runAi = useCallback(async () => {
    if (!doc || aiState === "loading") return
    if (aiQuota <= 0 && !userCfg.apiKey) {
      setAiState("error")
      setAiError("今天的免费次数(5 次)用完了。明天再来，或在下面填自己的 API key(不计免费额度)。")
      return
    }
    setAiState("loading")
    setAiError("")
    try {
      const res = await fetch("/api/llm-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: docToMarkdown(doc),
          jd: jd.trim() || undefined,
          strength: aiStrength,
          apiKey: userCfg.apiKey || undefined,
          baseUrl: userCfg.apiKey ? userCfg.baseUrl || undefined : undefined,
          model: userCfg.apiKey ? userCfg.model || undefined : undefined,
        }),
      })
      const json = (await res.json()) as { enabled?: boolean; items?: AiSuggestion[]; error?: string; detail?: string; model?: string }
      if (!res.ok || json.error) {
        const map: Record<string, string> = {
          too_short: "简历内容太短，至少 30 字再试。",
          not_configured: "AI 深度改写还没开放。可以在下面填自己的 API key 立即使用。",
          bad_key: "你填的 API key 格式不对(少于 20 个字符)，请求被拒绝；请在下方面板检查是否复制完整。",
          quota: "免费额度用完了(全站或本机)。明天再来，或用自己的 API key(不计免费额度)。",
          upstream: `模型通道出了问题(${json.detail || "未知"})，稍后再试，或换自己的 key/模型。`,
          bad_output: "模型这次没按格式返回，再试一次通常就好。",
        }
        throw new Error(map[json.error || ""] || "请求失败，稍后再试。")
      }
      setAiItems(json.items || [])
      setAiModel(json.model || "")
      setAiState("done")
      bumpQuota()
    } catch (e) {
      setAiState("error")
      setAiError(e instanceof Error ? e.message : "请求失败")
    }
  }, [doc, aiState, aiQuota, userCfg, jd, aiStrength]) // eslint-disable-line react-hooks/exhaustive-deps

  const applySuggestion = (item: AiSuggestion) => {
    patch((d) => {
      applyRewrite(d, item.original, item.rewritten)
    })
    setAiItems((prev) => prev.filter((it) => it !== item))
  }

  /* ── 导出 ── */
  const exportHtml = () => {
    if (!doc) return
    download(buildResumeHtml(doc), `${doc.profile.name || "简历"}-${new Date().toISOString().slice(0, 10)}.html`, "text/html")
  }
  const exportJson = () => {
    if (!doc) return
    download(JSON.stringify({ doc, loose }, null, 2), `简历数据-${new Date().toISOString().slice(0, 10)}.json`, "application/json")
  }
  const importJsonFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown
        const value = parsed && typeof parsed === "object" && "doc" in (parsed as Record<string, unknown>) ? (parsed as Record<string, unknown>).doc : parsed
        if (!looksLikeResumeJson(value)) throw new Error("bad")
        setDoc(normalizeDoc(value))
        setLoose([])
        setAiItems([])
        setActiveTab("basic")
      } catch {
        window.alert("这个文件不是简历数据(JSON)。支持本工具导出的格式，以及酥神简历编辑器导出的 JSON。")
      }
    }
    reader.readAsText(file)
  }
  const printPdf = () => {
    const win = frameRef.current?.contentWindow
    if (!win) return
    try {
      win.focus()
      win.print()
    } catch {
      window.print()
    }
  }
  const copyTex = async () => {
    if (!doc) return
    try {
      await navigator.clipboard.writeText(docToLatex(doc))
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
      if (target === "skills") d.skills.push(line.replace(/^\s*(?:[•·●▪]\s*|[-–—]\s+|\d+[.、)]\s+)/, ""))
      else {
        if (!d.customs.length) d.customs.push({ title: "其他经历", items: [] })
        d.customs[0].items.push({ title: line, dates: "", bullets: [] })
      }
    })
  const dismissLoose = (i: number) => setLoose((prev) => prev.filter((_, j) => j !== i))

  const restart = () => {
    if (!window.confirm("清空当前简历，回到第一步重新开始？(本机自动保存的草稿也会清掉)")) return
    setDoc(null)
    setLoose([])
    setRaw("")
    setAiItems([])
    setAiState("idle")
    localStorage.removeItem(DOC_STORE_KEY)
    setSavedAt("")
    historyRef.current = { stack: [], index: -1, skip: false }
    setHistMeta({ canUndo: false, canRedo: false })
  }

  const applyJsonDraft = () => {
    try {
      const value = JSON.parse(jsonDraft) as unknown
      if (!looksLikeResumeJson(value)) throw new Error("bad")
      setDoc(normalizeDoc(value))
      setAiItems([])
      window.alert("已应用。数据不规范的部分已按默认值修正。")
    } catch {
      window.alert("JSON 解析失败：请检查格式(顶层必须是对象)。")
    }
  }

  const iframeHeight = pageCount > 0 ? pageCount * (297 + 10) * 3.7795 + 30 : 1200

  return (
    <div className="tk-shell">
      {/* ── 第一步(尚无数据时显示) ── */}
      {!doc && (
        <section className="tk-input-card rb-chrome" aria-label="简历来源">
          <p className="tk-label">第一步：把简历给过来</p>
          <p className="rb-input-hint">
            四种都行：上传 PDF/Word 简历（本地解析，扫描件不支持）；把旧简历全文粘进来重新优化；胡乱写一段你的学校、实习、项目，乱一点没关系；
            或者点「载入示例简历」从一份完整的示范开始。解析完在编辑区逐条改。
          </p>
          <textarea
            className="tk-textarea"
            aria-label="简历原文或一段经历描述"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={9}
            spellCheck={false}
            placeholder={EXAMPLE_TEXT.slice(0, 60) + "……"}
          />
          <div className="tk-input-actions">
            <span className="tk-privacy">解析和排版全部在你的浏览器本地完成，文本不发送到任何服务器</span>
            <button type="button" className="tk-run" onClick={parse} aria-disabled={!ready}>
              解析并生成
            </button>
          </div>
          <div className="bullet-examples">
            <label className="mock-end-btn rb-file-label">
              {importState === "loading" ? "解析中…" : "上传 PDF / Word"}
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                aria-label="上传 PDF 或 Word 简历"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importFile(f)
                  e.target.value = ""
                }}
              />
            </label>
            <button type="button" className="mock-end-btn" onClick={() => setRaw(EXAMPLE_TEXT)}>
              填入示例文本
            </button>
            <button type="button" className="mock-end-btn" onClick={loadSample}>
              载入示例简历(结构化)
            </button>
            <label className="mock-end-btn rb-file-label">
              导入数据(JSON)
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
          </div>
          {importNote && (
            <p className="tk-hint" style={{ marginTop: 8 }}>{importNote}</p>
          )}
        </section>
      )}

      {doc && (
        <div className="rb-grid">
          {/* ── 编辑列 ── */}
          <div className="rb-chrome tk-shell" aria-label="简历编辑">
            <div className="rb-tabs" role="tablist" aria-label="简历分区">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.key}
                  className={`rb-tab${activeTab === t.key ? " is-active" : ""}`}
                  onClick={() => {
                    setActiveTab(t.key)
                    if (t.key === "json") setJsonDraft(JSON.stringify({ doc, loose }, null, 2))
                  }}
                >
                  {t.label}
                  {t.key === "review" && audit.length > 0 && <span className="rb-tab-badge">{audit.length}</span>}
                </button>
              ))}
            </div>

            <div className="rb-tabpanel" role="tabpanel">
              {activeTab === "basic" && (
                <section className="tk-input-card">
                  <p className="tk-label">基本信息</p>
                  <div className="rb-form">
                    <input className="rb-field" aria-label="姓名" value={doc.profile.name} placeholder="姓名" onChange={(e) => patch((d) => { d.profile.name = e.target.value })} />
                    <div className="rb-form-row">
                      <input className="rb-field" aria-label="眉标(姓名右侧小字,可选)" value={doc.profile.eyebrow} placeholder="眉标(可选)：如 2026 届 · 求职中" onChange={(e) => patch((d) => { d.profile.eyebrow = e.target.value })} />
                      <input className="rb-field" aria-label="城市" value={doc.profile.location} placeholder="城市/意向城市" onChange={(e) => patch((d) => { d.profile.location = e.target.value })} />
                    </div>
                    <input className="rb-field" aria-label="一句话定位" value={doc.profile.headline} placeholder="一句话定位：求职方向 + 两个最硬的技术域" onChange={(e) => patch((d) => { d.profile.headline = e.target.value })} />
                    <textarea className="rb-field" aria-label="个人概述(可选)" rows={3} value={doc.profile.summary} placeholder="个人概述(可选)：2-3 行说清方向、做过的最完整的事、可迁移的能力。会显示在绿色概述条里" onChange={(e) => patch((d) => { d.profile.summary = e.target.value })} />
                  </div>
                  <div className="rb-factgroup" style={{ marginTop: 12 }}>
                    <div className="rb-factgroup-head">
                      <span className="rb-factgroup-label">证件照(可选)</span>
                      {doc.profile.photo?.confirmed ? (
                        <button
                          type="button"
                          className="rb-del"
                          onClick={() => patch((d) => { delete d.profile.photo })}
                        >
                          移除照片
                        </button>
                      ) : (
                        <label className="mock-end-btn rb-file-label">
                          上传照片
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            aria-label="上传证件照"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) importPhoto(f)
                              e.target.value = ""
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {doc.profile.photo?.confirmed ? (
                      <div className="rb-photo-row">
                        <img className="rb-photo-preview" src={doc.profile.photo.src} alt="证件照预览" />
                        <div className="rb-photo-controls">
                          <label>水平 <input type="range" min={0} max={100} value={doc.profile.photo.crop.x} aria-label="照片水平位置" onChange={(e) => setPhotoCrop("x", Number(e.target.value))} /></label>
                          <label>垂直 <input type="range" min={0} max={100} value={doc.profile.photo.crop.y} aria-label="照片垂直位置" onChange={(e) => setPhotoCrop("y", Number(e.target.value))} /></label>
                          <label>缩放 <input type="range" min={100} max={200} value={Math.round(doc.profile.photo.crop.zoom * 100)} aria-label="照片缩放" onChange={(e) => setPhotoCrop("zoom", Number(e.target.value) / 100)} /></label>
                          <p className="tk-hint">照片只存你本机浏览器，导出文件里才会带上。</p>
                        </div>
                      </div>
                    ) : (
                      <p className="tk-hint">国内投递常要证件照；不上传就排无照片版，版面自动留白。</p>
                    )}
                  </div>
                  <div className="rb-factgroup" style={{ marginTop: 12 }}>
                    <div className="rb-factgroup-head">
                      <span className="rb-factgroup-label">联系方式</span>
                      <button type="button" className="mock-end-btn" onClick={() => patch((d) => { d.profile.contacts.push({ label: "", value: "" }) })}>
                        ＋ 加一项
                      </button>
                    </div>
                    {doc.profile.contacts.length === 0 && <p className="tk-hint">电话、邮箱、GitHub 主页都放这里，会排成胶囊。</p>}
                    {doc.profile.contacts.map((c, i) => (
                      <div className="rb-contact-row" key={i}>
                        <input className="rb-field" aria-label={`联系方式${i + 1}标签`} style={{ maxWidth: 90 }} placeholder="标签" value={c.label} onChange={(e) => patch((d) => { d.profile.contacts[i].label = e.target.value })} />
                        <input className="rb-field" aria-label={`联系方式${i + 1}内容`} placeholder="内容" value={c.value} onChange={(e) => patch((d) => { d.profile.contacts[i].value = e.target.value })} />
                        <button type="button" className="rb-del" aria-label={`删除联系方式${i + 1}`} onClick={() => patch((d) => { d.profile.contacts.splice(i, 1) })}>
                          删除
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === "education" && (
                <section className="tk-input-card">
                  <div className="rb-sec-head">
                    <p className="tk-label">教育经历</p>
                    <button type="button" className="mock-end-btn" onClick={() => patch((d) => { d.education.push({ institution: "", program: "", degree: "", dates: "", bullets: [] }) })}>
                      加一条
                    </button>
                  </div>
                  <p className="tk-hint" style={{ marginTop: 0 }}>学校 | 专业｜学历 | 时间。交换/合作办学可以写在补充说明里。</p>
                  {doc.education.length === 0 && <p className="tk-hint">还没有内容，点右上角「加一条」。</p>}
                  {doc.education.map((e, ei) => (
                    <div className="rb-entry-card" key={ei}>
                      <div className="rb-entry-fields">
                        <input className="rb-field" aria-label="学校" value={e.institution} placeholder="学校" onChange={(ev) => patch((d) => { d.education[ei].institution = ev.target.value })} />
                        <input className="rb-field" aria-label="专业与学历" value={[e.program, e.degree].filter(Boolean).join("｜")} placeholder="专业｜学历" onChange={(ev) => { const v = ev.target.value; patch((d) => { const [p, dg] = v.split("｜"); d.education[ei].program = (p || "").trim(); d.education[ei].degree = (dg || "").trim() }) }} />
                        <input className="rb-field" aria-label="时间" value={e.dates} placeholder="2022.09-2026.06" onChange={(ev) => patch((d) => { d.education[ei].dates = ev.target.value })} />
                        <button type="button" className="rb-del" aria-label={`删除教育第${ei + 1}条`} onClick={() => patch((d) => { d.education.splice(ei, 1) })}>
                          删除条目
                        </button>
                      </div>
                      <FactGroup label="补充说明" bullets={e.bullets} onChange={(next) => patch((d) => { d.education[ei].bullets = next })} />
                    </div>
                  ))}
                </section>
              )}

              {activeTab === "experience" && (
                <section className="tk-input-card">
                  <div className="rb-sec-head">
                    <p className="tk-label">实习 / 工作经历</p>
                    <button
                      type="button"
                      className="mock-end-btn"
                      onClick={() => patch((d) => { d.experience.push({ company: "", team: "", dates: "", tags: [], links: [], tone: "", projects: [{ name: "", subtitle: "", background: [], impact: [], responsibilities: [{ text: "" }] }] }) })}
                    >
                      加一段经历
                    </button>
                  </div>
                  <p className="tk-hint" style={{ marginTop: 0 }}>
                    每段经历 = 公司条 + 项目条。项目条分三层写：背景（为什么做）、指标与效果（结果数字）、我的职责（你名下的事）。
                    这是面试官读简历的顺序，也是这套排版的骨架。
                  </p>
                  {doc.experience.length === 0 && <p className="tk-hint">还没有内容，点右上角「加一段经历」。</p>}
                  {doc.experience.map((exp, ei) => (
                    <div className="rb-entry-card" key={ei}>
                      <div className="rb-entry-fields">
                        <input className="rb-field" aria-label="公司" value={exp.company} placeholder="公司" onChange={(ev) => patch((d) => { d.experience[ei].company = ev.target.value })} />
                        <input className="rb-field" aria-label="部门与职位" value={exp.team} placeholder="部门 · 职位" onChange={(ev) => patch((d) => { d.experience[ei].team = ev.target.value })} />
                        <input className="rb-field" aria-label="时间" value={exp.dates} placeholder="2025.06-2025.09" onChange={(ev) => patch((d) => { d.experience[ei].dates = ev.target.value })} />
                        <select className="rb-field" aria-label="色条颜色" value={exp.tone || ""} onChange={(ev) => patch((d) => { d.experience[ei].tone = ev.target.value as ExperienceItem["tone"] })}>
                          {TONES.map((t) => (
                            <option key={t.v} value={t.v}>{t.label}</option>
                          ))}
                        </select>
                        <button type="button" className="rb-del" aria-label={`删除经历第${ei + 1}段`} onClick={() => patch((d) => { d.experience.splice(ei, 1) })}>
                          删除这段经历
                        </button>
                      </div>
                      {exp.projects.map((proj, pi) => (
                        <div className="rb-proj" key={pi}>
                          <div className="rb-entry-fields">
                            <input className="rb-field" aria-label="项目名" value={proj.name} placeholder="项目名" onChange={(ev) => patch((d) => { d.experience[ei].projects[pi].name = ev.target.value })} />
                            <input className="rb-field" aria-label="副标题" value={proj.subtitle} placeholder="副标题(可选)：一句话说明项目规模/对象" onChange={(ev) => patch((d) => { d.experience[ei].projects[pi].subtitle = ev.target.value })} />
                          </div>
                          <div className="rb-factgroup-head" style={{ marginBottom: 4 }}>
                            <span className="tk-hint" style={{ margin: 0 }}>把所有条目按「背景/指标与效果/我的职责」自动重新分层</span>
                            <button
                              type="button"
                              className="mock-end-btn"
                              onClick={() => patch((d) => { classifyProjectInPlace(d.experience[ei].projects[pi]) })}
                            >
                              一键分层
                            </button>
                          </div>
                          <FactGroup label="背景" hint="为什么做这件事" bullets={proj.background} onChange={(next) => patch((d) => { d.experience[ei].projects[pi].background = next })} />
                          <FactGroup label="指标与效果" hint="结果数字，写口径" bullets={proj.impact} onChange={(next) => patch((d) => { d.experience[ei].projects[pi].impact = next })} />
                          <FactGroup label="我的职责" hint="你名下的事" bullets={proj.responsibilities} onChange={(next) => patch((d) => { d.experience[ei].projects[pi].responsibilities = next })} />
                        </div>
                      ))}
                      <button
                        type="button"
                        className="mock-end-btn"
                        onClick={() => patch((d) => { d.experience[ei].projects.push({ name: "", subtitle: "", background: [], impact: [], responsibilities: [{ text: "" }] }) })}
                      >
                        ＋ 加一个项目
                      </button>
                    </div>
                  ))}
                </section>
              )}

              {activeTab === "projects" && (
                <>
                  {(
                    [
                      { key: "projects" as const, title: "技术项目与沉淀", hint: "课程设计、开源工具、独立项目都放这里" },
                      { key: "open_source" as const, title: "开源贡献", hint: "给开源仓库提的 PR、维护的仓库、写的文档" },
                    ]
                  ).map(({ key, title, hint }) => (
                    <section className="tk-input-card" key={key}>
                      <div className="rb-sec-head">
                        <p className="tk-label">{title}</p>
                        <button type="button" className="mock-end-btn" onClick={() => patch((d) => { d[key].push({ name: "", role: "", dates: "", scope: "", bullets: [{ text: "" }] }) })}>
                          加一条
                        </button>
                      </div>
                      <p className="tk-hint" style={{ marginTop: 0 }}>{hint}。</p>
                      {doc[key].length === 0 && <p className="tk-hint">还没有内容。</p>}
                      {doc[key].map((p, si) => (
                        <div className="rb-entry-card" key={si}>
                          <div className="rb-entry-fields">
                            <input className="rb-field" aria-label="项目名" value={p.name} placeholder="项目名" onChange={(ev) => patch((d) => { d[key][si].name = ev.target.value })} />
                            <input className="rb-field" aria-label="角色" value={p.role} placeholder="角色(可选)：独立开发 / Contributor" onChange={(ev) => patch((d) => { d[key][si].role = ev.target.value })} />
                            <input className="rb-field" aria-label="时间" value={p.dates} placeholder="2025.03-2025.06" onChange={(ev) => patch((d) => { d[key][si].dates = ev.target.value })} />
                            <input className="rb-field" aria-label="一句话范围" value={p.scope} placeholder="一句话范围(可选)" onChange={(ev) => patch((d) => { d[key][si].scope = ev.target.value })} />
                            <input className="rb-field" aria-label="链接" value={p.url} placeholder="链接(可选)：GitHub / 演示地址" onChange={(ev) => patch((d) => { d[key][si].url = ev.target.value })} />
                            <button type="button" className="rb-del" aria-label={`删除${title}第${si + 1}条`} onClick={() => patch((d) => { d[key].splice(si, 1) })}>
                              删除条目
                            </button>
                          </div>
                          <FactGroup label="条目" bullets={p.bullets} onChange={(next) => patch((d) => { d[key][si].bullets = next })} />
                        </div>
                      ))}
                    </section>
                  ))}
                </>
              )}

              {activeTab === "extras" && (
                <>
                  <section className="tk-input-card">
                    <div className="rb-sec-head">
                      <p className="tk-label">奖项</p>
                      <button type="button" className="mock-end-btn" onClick={() => patch((d) => { d.awards.push({ name: "", date: "" }) })}>
                        加一项
                      </button>
                    </div>
                    {doc.awards.length === 0 && <p className="tk-hint">竞赛获奖、奖学金都放这里。没有就空着，不硬凑。</p>}
                    {doc.awards.map((a, i) => (
                      <div className="rb-contact-row" key={i}>
                        <input className="rb-field" aria-label={`奖项${i + 1}名称`} placeholder="奖项名称" value={a.name} onChange={(e) => patch((d) => { d.awards[i].name = e.target.value })} />
                        <input className="rb-field" aria-label={`奖项${i + 1}时间`} style={{ maxWidth: 130 }} placeholder="2024.10" value={a.date} onChange={(e) => patch((d) => { d.awards[i].date = e.target.value })} />
                        <button type="button" className="rb-del" aria-label={`删除奖项${i + 1}`} onClick={() => patch((d) => { d.awards.splice(i, 1) })}>
                          删除
                        </button>
                      </div>
                    ))}
                  </section>
                  <section className="tk-input-card">
                    <div className="rb-sec-head">
                      <p className="tk-label">技能</p>
                      <button type="button" className="mock-end-btn" onClick={() => patch((d) => { d.skills.push("") })}>
                        加一项
                      </button>
                    </div>
                    {doc.skills.length === 0 && <p className="tk-hint">写你真的会用东西：语言、框架、工具。别堆名词，面试官会挑一个问到底。</p>}
                    <div className="rb-form">
                      {doc.skills.map((s, i) => (
                        <div className="rb-skill-row" key={i}>
                          <input className="rb-field" aria-label={`技能${i + 1}`} value={s} onChange={(e) => patch((d) => { d.skills[i] = e.target.value })} />
                          <button type="button" className="rb-del" aria-label={`删除技能${i + 1}`} onClick={() => patch((d) => { d.skills.splice(i, 1) })}>
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="tk-input-card">
                    <div className="rb-sec-head">
                      <p className="tk-label">自定义栏目</p>
                      <button type="button" className="mock-end-btn" onClick={() => patch((d) => { d.customs.push({ title: "校园经历", items: [] }) })}>
                        加一个栏目
                      </button>
                    </div>
                    <p className="tk-hint" style={{ marginTop: 0 }}>学生工作、社团、志愿经历放这里。标题自己定（校园经历 / 社区与开源 / 其他）。</p>
                    {doc.customs.map((s, si) => (
                      <div className="rb-entry-card" key={si}>
                        <div className="rb-entry-fields">
                          <input className="rb-field" aria-label={`自定义栏目${si + 1}标题`} value={s.title} placeholder="栏目标题" onChange={(e) => patch((d) => { d.customs[si].title = e.target.value })} />
                          <button type="button" className="rb-del" aria-label={`删除栏目${si + 1}`} onClick={() => patch((d) => { d.customs.splice(si, 1) })}>
                            删除栏目
                          </button>
                        </div>
                        {s.items.map((it, ii) => (
                          <div className="rb-proj" key={ii}>
                            <div className="rb-entry-fields">
                              <input className="rb-field" aria-label="条目名" value={it.title} placeholder="条目名：学生会技术部部长" onChange={(e) => patch((d) => { d.customs[si].items[ii].title = e.target.value })} />
                              <input className="rb-field" aria-label="时间" value={it.dates} placeholder="2023.09-2024.06" onChange={(e) => patch((d) => { d.customs[si].items[ii].dates = e.target.value })} />
                              <button type="button" className="rb-del" aria-label={`删除条目${ii + 1}`} onClick={() => patch((d) => { d.customs[si].items.splice(ii, 1) })}>
                                删除条目
                              </button>
                            </div>
                            <FactGroup label="条目" bullets={it.bullets} onChange={(next) => patch((d) => { d.customs[si].items[ii].bullets = next })} />
                          </div>
                        ))}
                        <button type="button" className="mock-end-btn" onClick={() => patch((d) => { d.customs[si].items.push({ title: "", dates: "", bullets: [{ text: "" }] }) })}>
                          ＋ 加一条目
                        </button>
                      </div>
                    ))}
                  </section>
                </>
              )}

              {activeTab === "review" && (
                <>
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

                  {metricHints.length > 0 && (
                    <section className="tk-input-card" aria-label="缺指标提示">
                      <p className="tk-label">这几个项目整块没有数字({metricHints.length} 个)</p>
                      <p className="tk-hint" style={{ marginTop: 0 }}>
                        面试官读项目先扫数字。不是让你编：规模、耗时、效果任选其一，做过测量就有——没测过的先回去把口径补上再写。
                      </p>
                      {metricHints.map((h, i) => (
                        <div key={i} className="rb-audit-item">
                          <p className="rb-audit-text"><b>{h.where}</b></p>
                          <p className="rb-audit-flag">{h.hint}</p>
                        </div>
                      ))}
                    </section>
                  )}

                  {audit.length > 0 && (
                    <section className="tk-input-card" aria-label="证据审计">
                      <p className="tk-label">证据体检：这几条面试时容易被问穿({audit.length} 条)</p>
                      <p className="tk-hint" style={{ marginTop: 0 }}>
                        规则来自真实面试官的审查习惯：规划写成已交付、「第一/首个」说不清比较范围、指标没有口径、团队成果算成个人的。被标出的条目要么补证据，要么改表述；
                        右边的真题链接是你补证据时要过的关。
                      </p>
                      {audit.map((item, i) => {
                        const links = qaLinksFor(item.text)
                        return (
                          <div key={i} className="rb-audit-item">
                            <p className="rb-audit-text">{item.text}</p>
                            {item.flags.map((f, j) => (
                              <p key={j} className={f.level === "risk" ? "rb-audit-flag risk" : "rb-audit-flag"}>
                                <b>{f.kind}</b>:{f.note}
                              </p>
                            ))}
                            <p className="rb-audit-links">
                              <a href="/tools/mock-interview">用 AI 模拟面试练这条追问</a>
                              {links.map((l) => (
                                <a key={l.href} href={l.href}>{l.label}</a>
                              ))}
                            </p>
                          </div>
                        )
                      })}
                    </section>
                  )}

                  <section className="tk-input-card" aria-label="JD 对齐">
                    <p className="tk-label">对着 JD 查覆盖(可选)</p>
                    <p className="tk-hint" style={{ marginTop: 0 }}>
                      贴上目标 JD，工具逐词对照你的简历：命中的是你已有的证据，缺失的只代表「简历里没写」，不代表你不能干。缺的部分优先回去补真实经历，而不是硬塞词。
                    </p>
                    <textarea className="tk-textarea" aria-label="目标岗位 JD" rows={4} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="贴 JD 里「岗位要求」那几行" spellCheck={false} />
                    {align && (
                      <p className="tk-hint">
                        词面命中 {align.hits.length}/{align.total}。{align.hits.length > 0 && `已覆盖：${align.hits.slice(0, 8).join("、")}${align.hits.length > 8 ? "…" : ""}。`}
                        {align.missing.length > 0 && (
                          <>
                            简历里没出现：{align.missing.join("、")}。
                            {align.missing.length > align.hits.length ? "缺失多于命中：这份 JD 和你的现有经历差距偏大，考虑先补项目再投。" : "核心词基本覆盖，投前把 JD 关键词对应的经历放到更显眼的位置。"}
                          </>
                        )}
                      </p>
                    )}
                  </section>

                  <section className="tk-input-card" aria-label="AI 深度改写">
                    <div className="rb-sec-head">
                      <p className="tk-label">AI 深度改写(可选)</p>
                      <span className="tk-note">{userCfg.apiKey ? "用自己的 key" : `今日免费 ${aiQuota}/${RESUME_DAILY_LIMIT} 次`}</span>
                    </div>
                    <p className="tk-hint" style={{ marginTop: 0 }}>
                      把每条经历交给模型改写，你逐条决定要不要采用。AI 不编造经历：数字缺了留〔〕占位，公司学校职位原样保留。
                    </p>
                    <div className="rb-strength" role="radiogroup" aria-label="包装强度">
                      <span className="tk-note">包装强度：</span>
                      <label className={aiStrength === "safe" ? "rb-strength-opt is-active" : "rb-strength-opt"}>
                        <input type="radio" name="rb-strength" value="safe" checked={aiStrength === "safe"} onChange={() => setAiStrength("safe")} />
                        稳妥（只重排表达，不升级角色）
                      </label>
                      <label className={aiStrength === "bold" ? "rb-strength-opt is-active" : "rb-strength-opt"}>
                        <input type="radio" name="rb-strength" value="bold" checked={aiStrength === "bold"} onChange={() => setAiStrength("bold")} />
                        大胆（owner 式框定，每条配「面试怎么接」）
                      </label>
                    </div>
                    {aiStrength === "bold" && (
                      <p className="tk-hint" style={{ marginTop: 4 }}>
                        大胆档的边界：可以写「负责核心模块」这类职责框定，但公司、学校、岗位、数字和事实边界一律不升级；
                        每条建议都会给「面试怎么接」——答不住就按里面的降级说法改回去。
                      </p>
                    )}
                    <div className="tk-input-actions">
                      <span className="tk-privacy">{AI_PRIVACY_NOTE}</span>
                      <button type="button" className="tk-run" onClick={runAi} disabled={aiState === "loading" || !doc}>
                        {aiState === "loading" ? "改写中…" : "AI 改写全部经历"}
                      </button>
                    </div>
                    <details className="jda-keypanel">
                      <summary>
                        {userCfg.apiKey ? "已配置自己的 API key(点击可修改或清除)" : "用自己的 API key(不计免费额度，更快更稳)"}
                      </summary>
                      <div className="jda-keypanel-body">
                        <p className="jda-keypanel-hint">
                          Key 只存在你这台浏览器(localStorage)，请求时经本站转发但不落库、不记录。兼容 OpenAI 接口格式的中转或官方 API 都可以用。
                          {userCfg.apiKey && " 已保存的 key 会优先于站点免费额度使用；想恢复免费额度就清除 key。"}
                        </p>
                        <input
                          className="trk-input jda-key-input"
                          type="password"
                          aria-label="API key"
                          placeholder="sk-…(至少 20 个字符)"
                          value={userCfg.apiKey}
                          onChange={(e) => {
                            const cfg = { ...userCfg, apiKey: e.target.value }
                            setUserCfg(cfg)
                            try {
                              if (cfg.apiKey) localStorage.setItem(RESUME_AI_KEY, JSON.stringify(cfg))
                              else localStorage.removeItem(RESUME_AI_KEY)
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
                        {userCfg.apiKey && userCfg.apiKey.length < 20 && (
                          <p className="jda-keypanel-hint" style={{ color: "#b3261e" }}>
                            这个 key 不到 20 个字符，发请求会被拒绝；请检查是否复制完整，或清空改用站点免费额度。
                          </p>
                        )}
                      </div>
                    </details>
                    {aiState === "error" && <p className="mock-followup" style={{ marginTop: 10 }}>{aiError}</p>}
                    {aiState === "done" && (
                      <div style={{ marginTop: 12 }}>
                        <p className="tk-hint" style={{ marginTop: 0 }}>
                          {aiModel && `模型 ${aiModel} · `}建议 {aiItems.length} 条。点「采用」写回简历，不合适的不用。
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
                            {item.prep && (
                              <p className="rb-audit-flag rb-prep">
                                <b>面试怎么接</b>:{item.prep}
                              </p>
                            )}
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
                </>
              )}

              {activeTab === "setup" && (
                <section className="tk-input-card">
                  <p className="tk-label">页面设置</p>
                  <p className="tk-hint" style={{ marginTop: 0 }}>
                    分页、页边距、页眉页脚都在这里调。预览里每一页就是一张 A4，打印和导出 HTML 是同一个排版。
                  </p>
                  <div className="rb-form-row" style={{ marginTop: 10 }}>
                    <label className="rb-ps-label">
                      排版模板
                      <select className="rb-field" aria-label="排版模板" value={doc.page_setup.template} onChange={(e) => patch((d) => { d.page_setup.template = e.target.value as ResumeDoc["page_setup"]["template"] })}>
                        <option value="asu">高密度（色带 · 信息密）</option>
                        <option value="classic">经典正式（黑白 · HR 通用）</option>
                        <option value="clean">极简留白（弱装饰 · 大间距）</option>
                      </select>
                    </label>
                    <label className="rb-ps-label">
                      主色
                      <select className="rb-field" aria-label="简历主色" value={doc.page_setup.accent} onChange={(e) => patch((d) => { d.page_setup.accent = e.target.value as ResumeDoc["page_setup"]["accent"] })}>
                        <option value="ink">经典蓝墨</option>
                        <option value="clay">陶土暖橙</option>
                        <option value="olive">橄榄绿</option>
                        <option value="slate">石墨灰</option>
                      </select>
                    </label>
                    <label className="rb-ps-label">
                      内容字号 px
                      <input className="rb-field" type="number" min={8} max={20} step={0.5} placeholder="默认 11" aria-label="内容字号" value={doc.page_setup.contentFontSize} onChange={(e) => patch((d) => { d.page_setup.contentFontSize = e.target.value })} />
                    </label>
                    <label className="rb-ps-label">
                      内容行距
                      <input className="rb-field" type="number" min={1.1} max={2.6} step={0.05} placeholder="默认 1.48" aria-label="内容行距" value={doc.page_setup.contentLineHeight} onChange={(e) => patch((d) => { d.page_setup.contentLineHeight = e.target.value })} />
                    </label>
                  </div>
                  <div className="rb-form-row">
                    <label className="rb-ps-label">上边距 mm<input className="rb-field" type="number" min={0} max={60} aria-label="上边距" value={doc.page_setup.marginTopMm} onChange={(e) => patch((d) => { d.page_setup.marginTopMm = Number(e.target.value) || 0 })} /></label>
                    <label className="rb-ps-label">下边距 mm<input className="rb-field" type="number" min={0} max={60} aria-label="下边距" value={doc.page_setup.marginBottomMm} onChange={(e) => patch((d) => { d.page_setup.marginBottomMm = Number(e.target.value) || 0 })} /></label>
                    <label className="rb-ps-label">左边距 mm<input className="rb-field" type="number" min={0} max={60} aria-label="左边距" value={doc.page_setup.marginLeftMm} onChange={(e) => patch((d) => { d.page_setup.marginLeftMm = Number(e.target.value) || 0 })} /></label>
                    <label className="rb-ps-label">右边距 mm<input className="rb-field" type="number" min={0} max={60} aria-label="右边距" value={doc.page_setup.marginRightMm} onChange={(e) => patch((d) => { d.page_setup.marginRightMm = Number(e.target.value) || 0 })} /></label>
                  </div>
                  <div className="rb-form-row">
                    <label className="rb-ps-label rb-ps-wide">页眉文字(可留空)<input className="rb-field" aria-label="页眉文字" value={doc.page_setup.headerText} onChange={(e) => patch((d) => { d.page_setup.headerText = e.target.value })} /></label>
                    <label className="rb-ps-label rb-ps-wide">页脚文字(可留空)<input className="rb-field" aria-label="页脚文字" value={doc.page_setup.footerText} onChange={(e) => patch((d) => { d.page_setup.footerText = e.target.value })} /></label>
                  </div>
                  <label className="rb-ps-check">
                    <input type="checkbox" checked={doc.page_setup.showPageNumbers} onChange={(e) => patch((d) => { d.page_setup.showPageNumbers = e.target.checked })} />
                    显示页码(页脚右侧「第 X 页 · 共 Y 页」)
                  </label>
                </section>
              )}

              {activeTab === "json" && (
                <section className="tk-input-card">
                  <div className="rb-sec-head">
                    <p className="tk-label">JSON 源数据</p>
                    <button type="button" className="mock-end-btn" onClick={applyJsonDraft}>
                      应用到编辑器
                    </button>
                  </div>
                  <p className="tk-hint" style={{ marginTop: 0 }}>
                    高级用法：直接编辑源数据。兼容本工具导出的格式，也兼容酥神简历编辑器导出的 JSON（多余字段会自动忽略）。
                  </p>
                  <textarea
                    ref={jsonRef}
                    className="tk-textarea rb-json-area"
                    aria-label="简历 JSON 源数据"
                    rows={20}
                    value={jsonDraft}
                    onChange={(e) => setJsonDraft(e.target.value)}
                    spellCheck={false}
                  />
                </section>
              )}
            </div>
          </div>

          {/* ── 预览列 ── */}
          <div className="rb-preview-col">
            <div className="rb-toolbar-sticky rb-chrome">
              <div className="rb-toolbar">
                <span className="rb-toolbar-btns">
                  <button type="button" className="mock-end-btn" onClick={undo} aria-disabled={!histMeta.canUndo} title="撤销 Ctrl+Z">
                    <Undo2 size={13} strokeWidth={2} aria-hidden /> 撤销
                  </button>
                  <button type="button" className="mock-end-btn" onClick={redo} aria-disabled={!histMeta.canRedo} title="重做 Ctrl+Shift+Z">
                    <Redo2 size={13} strokeWidth={2} aria-hidden /> 重做
                  </button>
                </span>
                <span className="tk-privacy">
                  {savedAt ? `已自动保存到本机(${savedAt}) · ${pageCount || 1} 页 A4` : "A4 排版 · 指标位〔〕留空，自己填真实数字"}
                </span>
                <span className="rb-toolbar-btns">
                  <button type="button" className="tk-run rb-print-btn" onClick={printPdf}>
                    <Printer size={14} strokeWidth={2} aria-hidden /> 打印 / 存 PDF
                  </button>
                  <button type="button" className="mock-end-btn" onClick={exportHtml}>
                    <Download size={13} strokeWidth={2} aria-hidden /> HTML
                  </button>
                  <button type="button" className="mock-end-btn" onClick={() => download(docToWordHtml(doc), `${doc.profile.name || "简历"}.doc`, "application/msword")}>
                    <Download size={13} strokeWidth={2} aria-hidden /> Word
                  </button>
                  <button type="button" className="mock-end-btn" onClick={() => download(docToLatex(doc), `${doc.profile.name || "简历"}.tex`, "application/x-tex")}>
                    <FileText size={13} strokeWidth={2} aria-hidden /> LaTeX
                  </button>
                </span>
              </div>
              <div className="rb-toolbar" style={{ marginTop: -4 }}>
                <span className="rb-toolbar-btns">
                  <label className="rb-zoom">
                    缩放
                    <select aria-label="预览缩放" value={zoom} onChange={(e) => setZoom(e.target.value === "auto" ? "auto" : (Number(e.target.value) as 0.65 | 0.8 | 1))}>
                      <option value="auto">适配宽度</option>
                      <option value="0.65">65%</option>
                      <option value="0.8">80%</option>
                      <option value="1">100%</option>
                    </select>
                  </label>
                  <button type="button" className="mock-end-btn" onClick={() => download(docToMarkdown(doc), `${doc.profile.name || "简历"}.md`, "text/markdown")}>
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
                  <button type="button" className="mock-end-btn" onClick={loadSample}>
                    载入示例
                  </button>
                  <button type="button" className="rb-del" onClick={restart}>
                    重新开始
                  </button>
                </span>
              </div>
            </div>

            <div className="rb-frame-viewport" ref={viewportRef} style={{ height: iframeHeight * effScale }}>
              <iframe
                ref={frameRef}
                className="rb-frame"
                title="简历 A4 预览"
                srcDoc={srcDoc}
                sandbox="allow-same-origin allow-scripts allow-modals"
                style={{ transform: `scale(${effScale})`, height: iframeHeight }}
                onLoad={syncPageCount}
              />
            </div>

            <details className="rb-tex rb-chrome">
              <summary>LaTeX 源码(贴进 Overleaf，编译器选 XeLaTeX)</summary>
              <pre className="rb-tex-pre">{doc ? docToLatex(doc) : ""}</pre>
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
