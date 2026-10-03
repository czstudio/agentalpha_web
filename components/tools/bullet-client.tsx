"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { gradeBullet, type BulletVerdict } from "@/lib/tools/bullet-grader"

const PLACEHOLDER = `粘一条简历经历，例如：

负责开发 RAG 问答系统，使用 LangChain 和 FAISS，提升了问答效果。`

const EXAMPLE_BAD = "负责开发 RAG 问答系统，使用 LangChain 和 FAISS，提升了问答效果。"
const EXAMPLE_GOOD = "独立搭建企业知识库 RAG 服务：针对表格类文档解析丢失问题改用版面感知分块，基于 300 条 badcase 迭代 chunk 与 prompt 约束，答案忠实度从 71% 提升到 89%,P95 延迟控制在 800ms 内。"

export function BulletClient() {
  const [text, setText] = useState("")
  const [verdict, setVerdict] = useState<BulletVerdict | null>(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // SSR 水合前粘贴的内容事件会丢（按钮灰着），水合后回读一次
  useEffect(() => {
    if (inputRef.current?.value) setText(inputRef.current.value)
  }, [])

  const run = () => setVerdict(gradeBullet(text))

  const copyRewrite = async () => {
    if (!verdict) return
    try {
      await navigator.clipboard.writeText(verdict.rewrite)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="tk-shell">
      <section className="tk-input-card" aria-label="经历输入">
        <textarea
          ref={inputRef}
          className="tk-textarea"
          aria-label="待打分的简历经历"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={5}
          spellCheck={false}
        />
        <div className="tk-input-actions">
          <span className="tk-privacy">评分在你的浏览器本地完成，文本不发送到任何服务器</span>
          <button
            type="button"
            className="tk-run"
            onClick={() => { if (text.trim().length >= 10) run() }}
            aria-disabled={text.trim().length < 10}
          >
            打分
          </button>
        </div>
        <div className="bullet-examples">
          <button type="button" className="mock-end-btn" onClick={() => setText(EXAMPLE_BAD)}>
            试一条典型弱写法
          </button>
          <button type="button" className="mock-end-btn" onClick={() => setText(EXAMPLE_GOOD)}>
            对照一条强写法
          </button>
        </div>
      </section>

      {verdict && (
        <section className="tk-shell" aria-label="评分结果">
          <div className="tk-block">
            <h3>这条经历的得分:{verdict.score}</h3>
            <p className="tk-block-desc">
              {verdict.score >= 75
                ? "能撑住追问的写法。保持:动词具体、有数字、有难点、有结果。"
                : verdict.score >= 45
                  ? "有骨架但证据不足，按下面四维补齐后能上一个台阶。"
                  : "典型流水账写法。面试官扫一眼就跳过，按改写骨架重写。"}
            </p>
            {verdict.dims.map((d) => (
              <div key={d.key} className="tk-score-item">
                <span className="tk-score-label">{d.label}</span>
                <div className="tk-score-track" aria-hidden>
                  <span className={d.score < 50 ? "warn" : undefined} style={{ width: `${d.score}%` }} />
                </div>
                <span className={`tk-score-num ${d.score < 50 ? "warn" : ""}`}>{d.score}</span>
                <span className="bullet-dim-note">{d.note}</span>
              </div>
            ))}
          </div>

          {verdict.problems.length > 0 && (
            <div className="tk-block">
              <h3>问题清单</h3>
              <ol className="jda-checklist">
                {verdict.problems.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="tk-block">
            <h3>改写骨架<span className="tk-note">〔〕里填你的真实数字，没有就先做出数字</span></h3>
            <p className="pm-bullet">{verdict.rewrite}</p>
            <div className="tk-input-actions">
              <span className="tk-privacy">{copied ? "已复制" : "复制后照着填，不要照抄空骨架"}</span>
              <button type="button" className="mock-end-btn" onClick={copyRewrite}>
                {copied ? "已复制" : "复制骨架"}
              </button>
            </div>
          </div>

          <div className="tk-block">
            <h3>下一步</h3>
            <div className="tk-cta-grid">
              <Link href="/tools/resume">
                <div className="t">整份简历体检</div>
                <div className="d">逐条批注 + 追问预演，看每条经历的翻车风险</div>
              </Link>
              <Link href="/tools/mock-interview">
                <div className="t">这条经历会被怎么追问</div>
                <div className="d">简历深挖模式，面试官专问你写过的地方</div>
              </Link>
              <Link href="/tools/project-matcher">
                <div className="t">没经历可写？</div>
                <div className="d">按方向和时间拿一个能出指标的项目</div>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
