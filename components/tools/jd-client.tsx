"use client"

import { useState } from "react"
import Link from "next/link"
import { breakdownJd, type JdBreakdown, type QaLite } from "@/lib/tools/jd-analyzer"

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

  const run = () => {
    setReport(breakdownJd(text, qaList))
  }

  const qaBySlug = (slug: string) => qaList.find((q) => q.slug === slug)

  return (
    <div className="tk-shell">
      <section className="tk-input-card" aria-label="JD 输入">
        <textarea
          className="tk-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={14}
          spellCheck={false}
        />
        <div className="tk-input-actions">
          <span className="tk-privacy">分析在你的浏览器本地完成，JD 文本不发送到任何服务器</span>
          <button
            type="button"
            className="tk-run"
            onClick={run}
            disabled={text.trim().length < 50}
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
