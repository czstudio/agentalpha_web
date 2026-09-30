"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Download, FileText, Printer } from "lucide-react"
import {
  buildLatex,
  buildWordHtml,
  emptyResume,
  parseResumeText,
  type ResumeData,
  type ResumeEntry,
} from "@/lib/tools/resume-builder"
import { gradeBullet } from "@/lib/tools/bullet-grader"

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
  const rawRef = useRef<HTMLTextAreaElement>(null)

  // SSR 水合前粘贴的内容事件会丢(按钮灰着),水合后回读一次
  useEffect(() => {
    if (rawRef.current?.value) setRaw(rawRef.current.value)
  }, [])

  const latex = useMemo(() => (data ? buildLatex(data) : ""), [data])
  const ready = raw.trim().length >= 20

  const parse = () => {
    if (!ready) return
    const { data: parsed, loose: looseLines } = parseResumeText(raw)
    setData(parsed)
    setLoose(looseLines)
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
              <span className="tk-privacy">A4 排版,指标位〔〕留空,自己填真实数字</span>
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
