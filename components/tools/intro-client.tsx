"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  SENIORITY_OPTIONS,
  buildSelfIntro,
  type IntroResult,
  type Seniority,
} from "@/lib/tools/self-intro"
import { FAMILY_BASE, type FamilySlug } from "@/lib/tools/shared"

const EXAMPLE_H1 = "独立搭了企业知识库 RAG 服务，针对表格解析丢失改版面感知分块，忠实度从 71% 提到 89%"
const EXAMPLE_H2 = "基于 300 条 badcase 迭代分块与 prompt 约束，P95 延迟压到 800ms 以内"

export function IntroClient() {
  const [family, setFamily] = useState<FamilySlug>(FAMILY_BASE[0].slug)
  const [seniority, setSeniority] = useState<Seniority>("fresh")
  const [h1, setH1] = useState("")
  const [h2, setH2] = useState("")
  const [h3, setH3] = useState("")
  const [jd, setJd] = useState("")
  const [result, setResult] = useState<IntroResult | null>(null)
  const [copied, setCopied] = useState(false)

  const h1Ref = useRef<HTMLInputElement>(null)
  const jdRef = useRef<HTMLTextAreaElement>(null)

  // SSR 水合前粘贴的内容事件会丢(按钮灰着),水合后回读一次
  useEffect(() => {
    if (h1Ref.current?.value) setH1(h1Ref.current.value)
    if (jdRef.current?.value) setJd(jdRef.current.value)
  }, [])

  const ready = h1.trim().length >= 10

  const run = () => {
    setResult(
      buildSelfIntro({
        family,
        seniority,
        highlights: [h1, h2, h3],
        jd: jd.trim() || undefined,
      }),
    )
  }

  const fillExample = () => {
    setFamily("rag-eng")
    setSeniority("junior")
    setH1(EXAMPLE_H1)
    setH2(EXAMPLE_H2)
    setH3("")
    setJd("岗位要求：熟悉 RAG 全链路，有向量检索、Rerank 与分块策略的落地经验，能对效果指标负责")
  }

  const copySixty = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.sixty.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="tk-shell">
      <section className="tk-input-card" aria-label="自我介绍输入">
        <p className="tk-label">目标方向</p>
        <div className="tk-chips" role="radiogroup" aria-label="目标方向">
          {FAMILY_BASE.map((f) => (
            <button
              key={f.slug}
              type="button"
              role="radio"
              aria-checked={f.slug === family}
              className={`tk-chip ${f.slug === family ? "tk-chip-on" : ""}`}
              onClick={() => setFamily(f.slug)}
            >
              {f.name}
            </button>
          ))}
        </div>

        <p className="tk-label" style={{ marginTop: 16 }}>当前阶段</p>
        <div className="tk-chips" role="radiogroup" aria-label="当前阶段">
          {SENIORITY_OPTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={s.key === seniority}
              className={`tk-chip ${s.key === seniority ? "tk-chip-on" : ""}`}
              onClick={() => setSeniority(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <p className="tk-label" style={{ marginTop: 16 }}>亮点经历（第一条必填，建议带一个数字）</p>
        <div className="intro-highlights">
          <input
            ref={h1Ref}
            className="intro-input"
            aria-label="第一条亮点经历"
            value={h1}
            onChange={(e) => setH1(e.target.value)}
            placeholder="例：独立搭了企业知识库 RAG 服务，忠实度从 71% 提到 89%"
          />
          <input
            className="intro-input"
            aria-label="第二条亮点经历（可选）"
            value={h2}
            onChange={(e) => setH2(e.target.value)}
            placeholder="第二条（可选）：和第一条换一个技术面"
          />
          <input
            className="intro-input"
            aria-label="第三条亮点经历（可选）"
            value={h3}
            onChange={(e) => setH3(e.target.value)}
            placeholder="第三条（可选）：开源贡献/竞赛/实习补充"
          />
        </div>

        <p className="tk-label" style={{ marginTop: 16 }}>目标岗位 JD（可选，用来对齐关键词）</p>
        <textarea
          ref={jdRef}
          className="tk-textarea"
          aria-label="目标岗位 JD 原文（可选）"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="贴 JD 里「岗位要求」那几行就够，生成器会把命中的技术词挂进你的收尾句"
          rows={4}
          spellCheck={false}
        />

        <div className="tk-input-actions">
          <span className="tk-privacy">生成在你的浏览器本地完成，文本不发送到任何服务器</span>
          <button
            type="button"
            className="tk-run"
            onClick={() => { if (ready) run() }}
            aria-disabled={!ready}
          >
            生成自我介绍
          </button>
        </div>
        <div className="bullet-examples">
          <button type="button" className="mock-end-btn" onClick={fillExample}>
            填入示例（1-3 年 RAG 方向）
          </button>
        </div>
      </section>

      {result && (
        <section className="tk-shell" aria-label="生成结果">
          <div className="tk-block">
            <h3>60 秒版（约 180-220 字，逐句）</h3>
            <p className="tk-block-desc">掐表练：超过 75 秒就砍形容词。〔〕里填你的真实信息。</p>
            <ol className="jda-checklist">
              {result.sixty.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
            <div className="tk-input-actions">
              <span className="tk-privacy">{copied ? "已复制" : "复制后改写成自己的口吻，别背原句"}</span>
              <button type="button" className="mock-end-btn" onClick={copySixty}>
                {copied ? "已复制" : "复制 60 秒版"}
              </button>
            </div>
          </div>

          <div className="tk-block">
            <h3>3 分钟版骨架（五段）</h3>
            <p className="tk-block-desc">每段给了时间预算和一句话要点，正文里的〔〕都要换成你的真实内容。</p>
            <div className="tk-topic-list">
              {result.outline.map((o, i) => (
                <li key={i}>
                  <span className="t">{i + 1}. {o.sec} <span className="tk-note">{o.time}</span></span>
                  <span className="d">{o.tip}。{o.body}</span>
                </li>
              ))}
            </div>
          </div>

          <div className="tk-block">
            <h3>通病检查</h3>
            <ol className="jda-checklist">
              {result.pitfalls.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          </div>

          <div className="tk-block">
            <h3>自我介绍之后的追问预演</h3>
            <ul className="jda-checklist">
              {result.probes.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
            <div className="tk-cta-grid" style={{ marginTop: 12 }}>
              <Link href={`/interview/qa#${result.probeCat}`}>
                <div className="t">先把这些追问刷一遍</div>
                <div className="d">对应方向的速答题库，一题一页带追问点</div>
              </Link>
              <Link href="/tools/mock-interview">
                <div className="t">开一场简历深挖面</div>
                <div className="d">面试官只问你介绍里写过的地方</div>
              </Link>
              <Link href="/tools/bullet-grader">
                <div className="t">先给亮点打分</div>
                <div className="d">四维检查每条经历撑不撑得住追问</div>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
