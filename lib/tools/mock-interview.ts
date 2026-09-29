/**
 * 模拟面试引擎（纯前端）。与 /interview/quiz 的抽题刷题不同，这里做「岗位剧本」：
 * 面试官人格（开场/反应/追问话术）+ 三种模式（按方向组卷 / 简历深挖 / 压力追问）+ 复盘报告。
 * 简历深挖模式的题目直接来自简历体检引擎的追问预演（真实面经原题），不是编的。
 */
import { analyzeResume } from "@/lib/tools/resume-analyzer"
import type { QaLite } from "@/lib/tools/jd-analyzer"

export type MockMode = "jd" | "resume" | "stress" | "english"
export type PersonaKey = "gentle" | "cold" | "detail" | "arch" | "hr"
export type Rating = "ok" | "partial" | "fail"

export interface Persona {
  key: PersonaKey
  name: string
  desc: string
  opener: string
  ack: string[]
  closing: string
}

export const PERSONAS: Persona[] = [
  {
    key: "gentle",
    name: "温和引导型",
    desc: "会等你把话说完，反应友好，适合第一次练",
    opener: "别紧张，想到哪说到哪就行。我们先从你熟悉的开始。",
    ack: ["嗯，这个方向是对的，继续。", "有细节，不错。", "可以，这块我了解了。", "行，下一个。"],
    closing: "整体聊得不错。回去把刚才卡壳的两处补一补，下次会顺很多。",
  },
  {
    key: "cold",
    name: "冷酷打断型",
    desc: "节奏快，反应冷淡，专治背题感",
    opener: "时间有限，直接开始。回答尽量短，我先问到的先答。",
    ack: ["先说到这。", "我没抓到重点，下一题。", "嗯。", "这个答案太浅了，下一题。"],
    closing: "今天就到这。该说的我都在过程里说了，自己复盘。",
  },
  {
    key: "detail",
    name: "细节抠挖型",
    desc: "每个数字和参数都会被问一句「具体呢」",
    opener: "我习惯抠细节。你说到的每个名词和数字，我都可能追问。",
    ack: ["具体数字是多少？先记下，下一题。", "这里的参数为什么这么设？下一题再说。", "版本呢？算了，继续。", "这个细节我不太信，下一题。"],
    closing: "你说的不少东西没有细节支撑。回去把每个写进简历的数字都准备好来历。",
  },
  {
    key: "arch",
    name: "架构挑战型",
    desc: "不停问「为什么这么设计」「换个方案呢」",
    opener: "我不太在乎你用过什么，我在乎你为什么这么选。开始吧。",
    ack: ["换个方案行不行？记下来，下一题。", "这个设计为什么不是过度设计？", "流量放大十倍它还成立吗？", "行，有取舍意识。"],
    closing: "设计题答得一般。每个技术选择都要能说出「对比过什么、放弃了什么」。",
  },
  {
    key: "hr",
    name: "HR 稳定性观察型",
    desc: "混入动机与规划题，观察你稳不稳",
    opener: "技术部分同事们会聊，我主要想了解你这个人。放轻松。",
    ack: ["好的，了解了。", "嗯，这个回答比较坦诚。", "记下了。", "行，我们继续。"],
    closing: "聊得可以。动机这块建议再想清楚一点，别给人「哪有钱去哪」的印象。",
  },
]

/** 通用 HR 题（常识性求职问题，非任何公司真题） */
export const HR_POOL = [
  "先用两分钟介绍你自己，重点讲和这个岗位相关的经历。",
  "为什么看这个方向的机会？为它做过什么准备？",
  "说一个你最近半年遇到的最难的技术问题，当时怎么定位、怎么解决的。",
  "你的职业规划是什么？三年后想成为什么样的人？",
  "如果同时有几个 offer，你最看重什么？为什么。",
]

/** 压力模式的通用深挖追问(按题序循环) */
const STRESS_PROBES = [
  "你刚才提到的那个点,具体数字是多少?说不出来就是没做过。",
  "为什么选这个方案?当时对比过什么,放弃了什么?",
  "如果流量放大十倍,你这套哪里先出问题?",
  "这个结论怎么验证的?评测集多大、指标是什么?",
  "重来一次你会改哪个设计 decision?为什么。",
]

/** 英文模式的追问(练「用英文讲技术」:题干中文、追问英文,作答建议用英文) */
const ENGLISH_PROBES = [
  "Can you walk me through the trade-offs you just described, in English?",
  "Give me the concrete numbers behind that result — in English, please.",
  "How would you explain this design decision to a non-Chinese-speaking teammate?",
  "What broke first under load, and how did you find out? Answer in English.",
  "If you had to redo this project, what would you change and why? In English.",
]

/** 各方向的技术题分类组合（与 Gap 自测的方向口径一致） */
const FAMILY_CATS: Record<string, string[]> = {
  "agent-app": ["agent", "tooluse", "memory", "rag", "eval", "enterprise", "jingchang"],
  "rag-eng": ["rag", "eval", "basics", "enterprise", "jingchang"],
  "llm-algo": ["finetune", "basics", "eval", "inference", "jingchang"],
  "ai-infra": ["inference", "basics", "finetune", "enterprise"],
}

export interface MockQuestion {
  id: string
  question: string
  /** 题目来源标签：能力域 / 简历经历 / HR 题 */
  source: string
  /** 参考答案页 slug（技术题有） */
  qaSlug?: string
  /** 压力模式：本题提交后面试官的追问 */
  followUp?: string
}

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

/** 按方向组卷：每个分类 1-2 题，共约 10 题；HR 人格追加 2 道 HR 题 */
function buildJdSet(familySlug: string, qaList: QaLite[], persona: PersonaKey, total = 10): MockQuestion[] {
  const cats = FAMILY_CATS[familySlug] ?? FAMILY_CATS["agent-app"]
  const perCat = Math.max(1, Math.floor(total / cats.length))
  const questions: MockQuestion[] = []
  for (const cat of cats) {
    const pool = qaList.filter((q) => q.category === cat)
    for (const q of pick(pool, perCat)) {
      questions.push({
        id: q.slug,
        question: q.question,
        source: cat,
        qaSlug: q.slug,
      })
    }
  }
  return finalize(pick(questions, total), persona)
}

/** 简历深挖：题目来自简历体检的追问预演（真实面经原题） */
function buildResumeSet(resumeText: string, familySlug: string, persona: PersonaKey): MockQuestion[] {
  const report = analyzeResume(resumeText, familySlug === "ai-infra" ? "ai-infra" : familySlug === "llm-algo" ? "llm-algo" : "agent-app")
  const questions: MockQuestion[] = []
  // id 带经历序号防撞:两条经历前 12 字相同也不会串自评
  report.bullets.slice(0, 6).forEach((bullet, bi) => {
    bullet.probes.slice(0, 2).forEach((p, i) => {
      questions.push({
        id: `resume-b${bi}-p${i}`,
        question: p.q,
        source: `简历「${bullet.text.slice(0, 18)}…」`,
      })
    })
  })
  // 简历命中能力域但没被 bullet 覆盖的，补域级追问
  report.radar.filter((c) => c.level > 0).slice(0, 3).forEach((cell, ci) => {
    cell.axis.probes.slice(0, 1).forEach((p) => {
      questions.push({ id: `axis-${ci}-${cell.axis.key}`, question: p, source: cell.axis.label })
    })
  })
  if (questions.length === 0) {
    report.radar.slice(0, 3).forEach((cell, ci) => {
      questions.push({ id: `axis-f${ci}-${cell.axis.key}`, question: cell.axis.probes[0], source: cell.axis.label })
    })
  }
  return finalize(questions.slice(0, 10), persona)
}

function finalize(questions: MockQuestion[], persona: PersonaKey): MockQuestion[] {
  const out = [...questions]
  if (persona === "hr") {
    out.splice(1, 0, { id: "hr-0", question: HR_POOL[0], source: "HR 题" })
    out.push({ id: "hr-last", question: HR_POOL[HR_POOL.length - 1], source: "HR 题" })
  }
  return out
}

export interface MockSession {
  mode: MockMode
  persona: Persona
  questions: MockQuestion[]
}

export function buildSession(opts: {
  mode: MockMode
  familySlug: string
  personaKey: PersonaKey
  qaList: QaLite[]
  resumeText?: string
}): MockSession {
  const persona = PERSONAS.find((p) => p.key === opts.personaKey) || PERSONAS[0]
  let questions: MockQuestion[]
  if (opts.mode === "resume" && opts.resumeText && opts.resumeText.trim().length >= 60) {
    questions = buildResumeSet(opts.resumeText, opts.familySlug, opts.personaKey)
  } else {
    questions = buildJdSet(opts.familySlug, opts.qaList, opts.personaKey)
  }
  if (opts.mode === "stress") {
    questions = questions.map((q, i) => ({ ...q, followUp: STRESS_PROBES[i % STRESS_PROBES.length] }))
  }
  if (opts.mode === "english") {
    questions = questions.map((q, i) => ({
      ...q,
      followUp: ENGLISH_PROBES[i % ENGLISH_PROBES.length],
      source: q.source === "HR 题" ? q.source : `${q.source} · 英文作答`,
    }))
  }
  return { mode: opts.mode, persona, questions }
}

export interface MockReportCard {
  /** 0-100 */
  score: number
  total: number
  okCount: number
  partialCount: number
  failCount: number
  /** 按 source 分组的自评统计 */
  bySource: Array<{ source: string; total: number; fail: number }>
  /** 答得最差的两三个来源域 */
  weakest: string[]
  advice: string
}

const RATING_SCORE: Record<Rating, number> = { ok: 100, partial: 60, fail: 20 }

export function buildReport(questions: MockQuestion[], ratings: Record<string, Rating>): MockReportCard {
  const answered = questions.filter((q) => ratings[q.id])
  const score = answered.length
    ? Math.round(answered.reduce((s, q) => s + RATING_SCORE[ratings[q.id]], 0) / answered.length)
    : 0
  const sourceMap = new Map<string, { total: number; fail: number }>()
  for (const q of answered) {
    const entry = sourceMap.get(q.source) ?? { total: 0, fail: 0 }
    entry.total++
    if (ratings[q.id] !== "ok") entry.fail++
    sourceMap.set(q.source, entry)
  }
  const bySource = [...sourceMap.entries()]
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.fail / b.total - a.fail / a.total)
  const weakest = bySource.filter((s) => s.fail > 0).slice(0, 3).map((s) => s.source)

  let advice: string
  if (score >= 80) {
    advice = "这套卷面已经能见人了。剩下的问题不是知识，是表达顺序：先结论、再展开、最后给数字。练三遍就行。"
  } else if (score >= 55) {
    advice = `过半能答但有水分，重点补${weakest.slice(0, 2).join("、") || "薄弱域"}。这些题在题库里都有速答版，答不上的逐条过一遍再约下一场。`
  } else {
    advice = `当前不建议约真面试。${weakest.slice(0, 2).join("、") || "整体"}基本答不上，先用 Gap 自测定位短板，按学习路线把对应章节过完，再回来重跑这一场。`
  }

  return {
    score,
    total: answered.length,
    okCount: answered.filter((q) => ratings[q.id] === "ok").length,
    partialCount: answered.filter((q) => ratings[q.id] === "partial").length,
    failCount: answered.filter((q) => ratings[q.id] === "fail").length,
    bySource,
    weakest,
    advice,
  }
}

/** transcript 导出为纯文本（复制给朋友看 / 自己存档） */
export function exportTranscript(session: MockSession, answers: Record<string, string>, ratings: Record<string, Rating>): string {
  const lines: string[] = [
    `AgentAlpha 模拟面试记录 · ${session.persona.name} · ${new Date().toLocaleDateString("zh-CN")}`,
    "",
  ]
  session.questions.forEach((q, i) => {
    lines.push(`Q${i + 1}（${q.source}）：${q.question}`)
    lines.push(`我：${answers[q.id]?.trim() || "（未作答）"}`)
    if (ratings[q.id]) lines.push(`自评：${ratings[q.id] === "ok" ? "答上了" : ratings[q.id] === "partial" ? "答了一部分" : "没答上"}`)
    lines.push("")
  })
  return lines.join("\n")
}
