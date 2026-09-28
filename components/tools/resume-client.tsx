"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  analyzeResume,
  analyzeJd,
  JOB_PROFILES,
  radarLevelLabel,
  type ResumeReport,
  type JdReport,
} from "@/lib/tools/resume-analyzer"

const PLACEHOLDER = `粘贴简历全文（项目、实习、技能都包含进来效果最好），例如：

XX 大学 · 计算机 · 2026 届
实习：XX 公司 Agent 开发实习
- 负责 RAG 问答系统的开发，用 LangChain 搭建了知识库问答
- 参与多智能体客服系统，实现工单自动分派
项目：个人 Agent 助手
- 开发了一个能调用搜索和日历工具的助手`

export function ResumeClient() {
  const [text, setText] = useState("")
  const [jd, setJd] = useState("")
  const [profileSlug, setProfileSlug] = useState(JOB_PROFILES[0].slug)
  const [report, setReport] = useState<ResumeReport | null>(null)
  const [jdReport, setJdReport] = useState<JdReport | null>(null)

  const run = () => {
    setReport(analyzeResume(text, profileSlug))
    setJdReport(jd.trim().length >= 20 ? analyzeJd(jd, text, profileSlug) : null)
  }

  const activeProfile = useMemo(
    () => JOB_PROFILES.find((p) => p.slug === profileSlug) || JOB_PROFILES[0],
    [profileSlug],
  )

  return (
    <div className="rt-shell">
      <section className="rt-input-card" aria-label="简历输入">
        <div className="rt-profile-row" role="radiogroup" aria-label="目标岗位">
          {JOB_PROFILES.map((p) => (
            <button
              key={p.slug}
              type="button"
              role="radio"
              aria-checked={p.slug === profileSlug}
              className={`rt-chip ${p.slug === profileSlug ? "rt-chip-on" : ""}`}
              onClick={() => setProfileSlug(p.slug)}
              title={p.desc}
            >
              {p.name}
            </button>
          ))}
        </div>
        <p className="rt-profile-desc">{activeProfile.desc}</p>
        <textarea
          className="rt-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={14}
          spellCheck={false}
        />
        <textarea
          className="rt-textarea rt-jd"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder={"可选：粘贴目标岗位的 JD（职位描述）原文，体检会逐词对比你的简历和 JD 的差距\n\n例：岗位要求：1. 熟悉 RAG 全链路，有向量检索、Rerank 落地经验；2. 熟悉 Function Calling / MCP…"}
          rows={6}
          spellCheck={false}
        />
        <div className="rt-input-actions">
          <span className="rt-privacy">分析在你的浏览器本地完成，文本不发送到任何服务器</span>
          <button
            type="button"
            className="rt-run"
            onClick={run}
            disabled={text.trim().length < 60}
          >
            开始体检
          </button>
        </div>
        {text.trim().length > 0 && text.trim().length < 60 && (
          <p className="rt-hint">内容太少（至少 60 字），把项目和实习经历都贴进来。</p>
        )}
      </section>

      {report && (
        <section className="rt-report" aria-label="体检报告">
          <div className="rt-scorebar">
            <div className="rt-total">
              <span className="rt-total-num">{report.score.total}</span>
              <span className="rt-total-label">综合分</span>
            </div>
            <div className="rt-sub-scores">
              <ScoreBar label="岗位匹配" value={report.score.match} />
              <ScoreBar label="经历质量" value={report.score.bullet} />
              <ScoreBar label="能力覆盖" value={report.score.radar} />
              <ScoreBar label="结构完整" value={report.score.structure} />
            </div>
          </div>

          {jdReport && (
            <Block
              title={`目标 JD 对比 · 命中 ${jdReport.hits.length}/${jdReport.keywords.length} 词`}
              desc={`JD 命中率 ${jdReport.score}%。缺失的词分两种：真做过但没写的，补进简历；没做过的，先别写，去题库补课再写。`}
            >
              <div className="rt-tags">
                {jdReport.hits.map((w) => (
                  <span key={w} className="rt-tag on">{w}</span>
                ))}
                {jdReport.missing.map((w) => (
                  <span key={w} className="rt-tag off">{w}</span>
                ))}
              </div>
              {jdReport.missing.length > 0 && (
                <p className="rt-hint">
                  高频缺失词建议优先处理：{jdReport.missing.slice(0, 8).join("、")}。
                  相关考点在<Link href="/interview/qa">速答题库</Link>按词搜索就能找到。
                </p>
              )}
            </Block>
          )}

          <Block title="能力覆盖（证据评级）" desc="三级证据：只挂名词 < 描述了用法 < 带指标结果。面试官看的是证据，不是名词。">
            <div className="rt-radar">
              {report.radar.map((cell) => (
                <div key={cell.axis.key} className={`rt-radar-row lv${cell.level}`}>
                  <div className="rt-radar-head">
                    <span className="rt-radar-label">{cell.axis.label}</span>
                    <span className={`rt-lv rt-lv${cell.level}`}>{radarLevelLabel(cell.level)}</span>
                  </div>
                  <div className="rt-lv-bar" aria-hidden>
                    {[1, 2, 3].map((i) => (
                      <span key={i} className={cell.level >= i ? "on" : ""} />
                    ))}
                  </div>
                  <p className="rt-radar-ev">{cell.evidence}{cell.axis.hint ? ` · ${cell.axis.hint}` : ""}</p>
                  {cell.level < 3 && (
                    <p className="rt-radar-qa">
                      补课：
                      {cell.axis.qaSlugs.map((s, i) => (
                        <span key={s}>
                          {i > 0 && "、"}
                          <Link href={`/interview/qa/${s}`}>相关题</Link>
                        </span>
                      ))}
                      {cell.level > 0 && "（把这条经历的指标结果补进简历）"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Block>

          <Block
            title={`岗位匹配 · ${report.profile.name}`}
            desc={`核心词命中 ${report.matched.core.length} 个，加分词命中 ${report.matched.plus.length} 个。`}
          >
            <div className="rt-tags">
              {report.matched.core.map((w) => (
                <span key={w} className="rt-tag on">{w}</span>
              ))}
              {report.missingCore.map((w) => (
                <span key={w} className="rt-tag off">{w}</span>
              ))}
            </div>
            {report.missingCore.length > 0 && (
              <p className="rt-hint">灰色是这版简历没出现的核心词。没做过的别硬写，做过但没写的补上。</p>
            )}
          </Block>

          {report.bullets.length > 0 && (
            <Block
              title="逐条批注与追问预演"
              desc="每条写了能力的经历，都列面试官最可能追问的真实问题。绿色=你简历里有据可查，黄色=要补事实，红色=建议降级措辞或删掉。"
            >
              <div className="rt-bullets">
                {report.bullets.map((b, i) => (
                  <article key={i} className="rt-bullet">
                    <p className="rt-bullet-text">{b.text}</p>
                    {b.problems.length > 0 && (
                      <p className="rt-bullet-problem">
                        {b.problems.join("；")}
                        {b.suggestion ? ` → ${b.suggestion}` : ""}
                      </p>
                    )}
                    {b.probes.length > 0 && (
                      <ul className="rt-probes">
                        {b.probes.map((p, j) => (
                          <li key={j} className={`risk-${p.risk}`}>
                            <span className="rt-risk-dot" aria-hidden />
                            {p.q}
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </Block>
          )}

          {(report.structure.length > 0 || report.fluff.length > 0) && (
            <Block title="结构与用词" desc="硬性结构问题和空话词，这些是最快能改的分数。">
              <ul className="rt-structure">
                {report.structure.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              {report.fluff.length > 0 && (
                <p className="rt-hint">
                  检出空话词：{report.fluff.join("、")}。删掉换成具体做的事和数字。
                </p>
              )}
            </Block>
          )}

          <p className="rt-foot">
            量化密度：{Math.round(report.quantRatio * 100)}%（带数字的经历 {report.bulletTotal} 条里占比）。
            经验参考：能撑住深挖的简历，这个数字通常在 40% 以上。
          </p>
        </section>
      )}
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rt-score-item">
      <span className="rt-score-label">{label}</span>
      <div className="rt-score-track" aria-hidden>
        <span className={value < 50 ? "warn" : undefined} style={{ width: `${value}%` }} />
      </div>
      <span className={`rt-score-num ${value < 50 ? "warn" : ""}`}>{value}</span>
    </div>
  )
}

function Block({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rt-block">
      <h3>{title}</h3>
      {desc && <p className="rt-block-desc">{desc}</p>}
      {children}
    </div>
  )
}
