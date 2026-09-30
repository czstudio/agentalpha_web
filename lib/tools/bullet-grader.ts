/**
 * 简历 Bullet 打分器引擎(纯前端)。一条经历的体检:
 * 弱动词/无量化/无结果/名词堆砌四类问题 + 四维评分 + 改写骨架(指标位留空,不编数)。
 * 词表与 resume-analyzer 同源(真实面经归纳),不另起炉灶。
 */
import { RADAR_AXES } from "@/lib/tools/resume-analyzer"

const WEAK_VERBS = ["负责", "参与", "协助", "了解", "熟悉", "学习了", "帮忙", "支持"]
const ACTION_HINT: Record<string, string> = {
  负责: "换成「主导 / 设计并实现 / 落地」,并补你具体做的部分",
  参与: "换成「独立完成 X 模块 / 协作交付」,说清你名下的东西",
  协助: "换成「完成 / 推动」,协助显得你只是旁观",
  了解: "换成「掌握并用于…」,了解等于没用过",
  熟悉: "换成「落地到…」,熟悉是嘴上功夫",
  学习了: "换成「实现 / 应用」,学习不是产出",
  帮忙: "换成「承担」,说清你负责的部分",
  支持: "换成「交付 / 维护」,给出范围",
}

const QUANT_RE = [/\d+(\.\d+)?\s*%/, /\d+(\.\d+)?\s*(万|亿|k|K|M|ms|QPS|qps|token|GB|TB|条|次|人|天|周|月|台|个|路|倍)/, /\b\d{2,}\b/]
const RESULT_WORDS = /(提升|提高|降低|减少|缩短|下降|覆盖|达到|稳定|支持|替换|节省|增收|优化|收敛|降到|升到)/
const DEPTH_WORDS = /(难点|瓶颈|踩坑|取舍|对比|选型|定位|排查|重构|兜底|降级|压缩|裁剪|回归|闭环)/

export interface BulletVerdict {
  /** 0-100 */
  score: number
  dims: Array<{ key: string; label: string; score: number; note: string }>
  problems: string[]
  /** 改写骨架:〔〕为用户必须填真实值的指标位 */
  rewrite: string
  axisHit: string[]
}

function has(hay: string, w: string): boolean {
  return hay.includes(w)
}

export function gradeBullet(raw: string): BulletVerdict {
  const text = raw.trim()
  const lower = text.toLowerCase()

  // 维度一:动词强度
  const weak = WEAK_VERBS.filter((w) => has(text, w))
  let verbScore = weak.length === 0 ? 85 : Math.max(30, 85 - weak.length * 25)
  if (/主导|设计并实现|独立完成|落地|搭建|重构/.test(text)) verbScore = Math.min(100, verbScore + 15)
  const verbNote = weak.length === 0 ? "动词有力,能看出你亲手做了什么" : `弱动词「${weak.join("、")}」:面试官读不出你的角色`

  // 维度二:量化
  const quantHit = QUANT_RE.some((re) => re.test(text))
  const quantScore = quantHit ? (RESULT_WORDS.test(text) ? 95 : 75) : 25
  const quantNote = quantHit ? "有数字,可追问时有据可查" : "没有数字:规模、耗时、效果至少给一个"

  // 维度三:技术深度
  const axisHit = RADAR_AXES.filter((a) => a.words.some((w) => lower.includes(w.trim().toLowerCase()))).map((a) => a.label)
  const depthHit = DEPTH_WORDS.test(text)
  const techScore = Math.min(100, axisHit.length * 28 + (depthHit ? 25 : 0) + (axisHit.length > 0 ? 10 : 0))
  const techNote =
    axisHit.length === 0
      ? "没有出现具体技术域:面试官无法判断深挖方向"
      : `命中 ${axisHit.join("、")}${depthHit ? ",且带难点/取舍表述" : ",但缺「难点/取舍/排查」类深度表述"}`

  // 维度四:结果表达
  const resultHit = RESULT_WORDS.test(text)
  const resultScore = resultHit ? 90 : 20
  const resultNote = resultHit ? "有结果导向的表述" : "只写了做了什么,没写带来了什么变化"

  const score = Math.round(verbScore * 0.3 + quantScore * 0.25 + techScore * 0.25 + resultScore * 0.2)

  const problems: string[] = []
  for (const w of weak) problems.push(`弱动词「${w}」:${ACTION_HINT[w] ?? "换成更具体的动作"}`)
  if (!quantHit) problems.push("无量化:补规模或效果数字,没有就先做出数字再写")
  if (!depthHit && axisHit.length > 0) problems.push("缺深度信号:补一句难点或取舍(为什么这么做、放弃了什么)")
  if (!resultHit) problems.push("无结果:这条经历的产出是什么,对业务/用户意味着什么")

  // 改写骨架:保留原句的技术名词,拼结构化模板
  const rewrite = `[${weak[0] ? ACTION_HINT[weak[0]].split("换成「")[1]?.split("」")[0] ?? "主导" : "主导"}] ${
    axisHit.slice(0, 2).join(" + ") || "某技术域"
  } 相关工作,针对〔遇到的难点一句话〕采取〔你的做法〕,〔规模数字〕场景下〔指标〕从〔原值〕到〔新值〕`

  return {
    score,
    dims: [
      { key: "verb", label: "动词强度", score: verbScore, note: verbNote },
      { key: "quant", label: "量化证据", score: quantScore, note: quantNote },
      { key: "tech", label: "技术深度", score: techScore, note: techNote },
      { key: "result", label: "结果表达", score: resultScore, note: resultNote },
    ],
    problems,
    rewrite,
    axisHit,
  }
}
