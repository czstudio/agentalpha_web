"use client"

import { useState } from "react"
import Link from "next/link"
import {
  matchProjects,
  FAMILY_OPTIONS,
  SKILL_OPTIONS,
  TIME_OPTIONS,
  familyLabel,
  type MatcherFamily,
  type SkillLevel,
  type TimeBudget,
  type MatcherRecommendation,
} from "@/lib/tools/project-matcher"

const DIFF_LABEL = ["", "入门", "进阶", "高阶"]

export function MatcherClient() {
  const [family, setFamily] = useState<MatcherFamily>("agent-app")
  const [skill, setSkill] = useState<SkillLevel>("api")
  const [time, setTime] = useState<TimeBudget>("1m")
  const [result, setResult] = useState<MatcherRecommendation[] | null>(null)

  const run = () => setResult(matchProjects(family, skill, time))

  return (
    <div className="tk-shell">
      <section className="tk-input-card" aria-label="匹配输入">
        <p className="tk-label">目标方向</p>
        <div className="tk-chips" role="radiogroup" aria-label="目标方向">
          {FAMILY_OPTIONS.map((f) => (
            <button
              key={f.slug}
              type="button"
              role="radio"
              aria-checked={family === f.slug}
              className={`tk-chip ${family === f.slug ? "tk-chip-on" : ""}`}
              onClick={() => { setFamily(f.slug); setResult(null) }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p className="tk-label" style={{ marginTop: 16 }}>现有基础</p>
        <div className="tk-chips" role="radiogroup" aria-label="现有基础">
          {SKILL_OPTIONS.map((s) => (
            <button
              key={s.slug}
              type="button"
              role="radio"
              aria-checked={skill === s.slug}
              title={s.hint}
              className={`tk-chip ${skill === s.slug ? "tk-chip-on" : ""}`}
              onClick={() => { setSkill(s.slug); setResult(null) }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <p className="tk-label" style={{ marginTop: 16 }}>可投入时间</p>
        <div className="tk-chips" role="radiogroup" aria-label="可投入时间">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t.slug}
              type="button"
              role="radio"
              aria-checked={time === t.slug}
              title={t.hint}
              className={`tk-chip ${time === t.slug ? "tk-chip-on" : ""}`}
              onClick={() => { setTime(t.slug); setResult(null) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="tk-input-actions">
          <span className="tk-privacy">匹配在你的浏览器本地完成，不收集任何输入</span>
          <button type="button" className="tk-run" onClick={run}>
            拿项目方案
          </button>
        </div>
      </section>

      {result && (
        <section className="tk-shell" aria-label="推荐结果">
          {result.map((r, i) => (
            <div key={r.meta.name} className="tk-block">
              <h3>
                {i === 0 ? "主推" : i === 1 ? "备选" : "第三个"}：{r.meta.name}
                <span className="pm-diff">{DIFF_LABEL[r.meta.difficulty]}</span>
                {r.timeFit === "over" && <span className="tk-note">时间不够</span>}
                {r.timeFit === "tight" && <span className="tk-note">时间刚好</span>}
              </h3>
              <ul className="pm-reasons">
                {r.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <div className="pm-sec">
                <p className="pm-sec-t">简历 bullet 模板<span className="tk-note">〔〕里填你的真实数字，没有就先做出数字</span></p>
                <p className="pm-bullet">{r.meta.bullet}</p>
              </div>
              <div className="pm-sec">
                <p className="pm-sec-t">验收指标（做完应该拿得出手的证据）</p>
                <p className="pm-bullet">{r.meta.acceptance}</p>
              </div>
              <div className="pm-sec">
                <p className="pm-sec-t">这个项目会被问的真题</p>
                <div className="pm-cat-links">
                  {r.meta.cats.map((cat) => (
                    <Link key={cat} href={`/interview/qa#${cat}`} className="pm-cat-link">
                      {catName(cat)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="tk-block">
            <h3>拿到项目之后</h3>
            <div className="tk-cta-grid">
              <Link href="/tools/gap-test">
                <div className="t">先测当前差距</div>
                <div className="d">八项能力雷达，确认项目要补的就是你的短板</div>
              </Link>
              <Link href="/tools/resume">
                <div className="t">做完写进简历</div>
                <div className="d">体检工具会检查 bullet 有没有指标、撑不撑得住追问</div>
              </Link>
              <Link href="/roadmap">
                <div className="t">配套学习路线</div>
                <div className="d">章节顺序 + 术语 + 项目卡，边做边补理论</div>
              </Link>
              <Link href="/tools/jd-analyzer">
                <div className="t">对着目标 JD 校准</div>
                <div className="d">拆目标 JD 的考察词，项目亮点往这上面靠</div>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function catName(cat: string): string {
  const names: Record<string, string> = {
    rag: "RAG 检索增强",
    agent: "Agent 架构",
    tooluse: "工具调用",
    memory: "记忆与上下文",
    multiagent: "多智能体",
    eval: "评测",
    finetune: "训练微调",
    inference: "推理部署",
    basics: "LLM 基础",
    enterprise: "工程落地",
    safety: "安全合规",
    prompt: "提示工程",
  }
  return names[cat] ?? cat
}
