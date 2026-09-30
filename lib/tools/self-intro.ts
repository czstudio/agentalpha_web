/**
 * 自我介绍生成器引擎(纯前端)。按方向+年限+亮点经历,产 60 秒版逐句稿与
 * 3 分钟版分段骨架,附通病命中与追问预演。指标位一律〔〕留空由用户填真实值,
 * 引擎不编造任何数字(写作红线)。
 * 词表与 resume-analyzer 同源;追问预演只收行为面通用题,不虚构题源。
 */
import { FAMILY_BASE, type FamilySlug } from "@/lib/tools/shared"
import { RADAR_AXES } from "@/lib/tools/resume-analyzer"

export type Seniority = "fresh" | "junior" | "mid" | "senior"

export const SENIORITY_OPTIONS: Array<{ key: Seniority; label: string }> = [
  { key: "fresh", label: "应届/实习" },
  { key: "junior", label: "1-3 年" },
  { key: "mid", label: "3-5 年" },
  { key: "senior", label: "5 年以上" },
]

/** 方向 → 题库分类锚点(追问预演互链用) */
const FAMILY_CAT: Record<FamilySlug, string> = {
  "agent-app": "agent",
  "rag-eng": "rag",
  "llm-algo": "finetune",
  "ai-infra": "inference",
}

export interface IntroInput {
  family: FamilySlug
  seniority: Seniority
  /** 亮点经历,第 1 条必填,2、3 条可选 */
  highlights: string[]
  jd?: string
}

export interface IntroResult {
  /** 60 秒版逐句(共四句,含指标位提示) */
  sixty: string[]
  /** 3 分钟版分段骨架 */
  outline: Array<{ sec: string; time: string; tip: string; body: string }>
  /** 通病命中(规则触发,没触发给两条通用提醒) */
  pitfalls: string[]
  /** 自我介绍后高频追问(行为面通用题 + 方向题库链) */
  probes: string[]
  probeCat: string
  /** JD 里命中亮点方向的技术词 */
  jdHits: string[]
}

const QUANT_RE = [/\d+(\.\d+)?\s*%/, /\d+(\.\d+)?\s*(万|亿|k|K|M|ms|QPS|qps|token|GB|TB|条|次|人|天|周|月|台|个|路|倍)/, /\b\d{2,}\b/]

function hasQuant(s: string): boolean {
  return QUANT_RE.some((re) => re.test(s))
}

/** 从 JD 抽与能力轴对应的技术词(取命中词最多的前两个轴的代表性词) */
export function jdKeywordHits(jd: string): string[] {
  const lower = jd.toLowerCase()
  const hits: string[] = []
  for (const axis of RADAR_AXES) {
    const word = axis.words.find((w) => lower.includes(w.trim().toLowerCase()))
    if (word) hits.push(word.trim())
    if (hits.length >= 2) break
  }
  return hits
}

function seniorityPhrase(s: Seniority): string {
  switch (s) {
    case "fresh":
      return "应届生"
    case "junior":
      return "工作 1-3 年"
    case "mid":
      return "工作 3-5 年"
    case "senior":
      return "工作 5 年以上"
  }
}

export function buildSelfIntro(input: IntroInput): IntroResult {
  const fam = FAMILY_BASE.find((f) => f.slug === input.family) ?? FAMILY_BASE[0]
  const [h1, h2, h3] = input.highlights.map((h) => h.trim()).filter(Boolean)
  const jdHits = input.jd ? jdKeywordHits(input.jd) : []
  const h1HasNum = h1 ? hasQuant(h1) : false

  // ── 60 秒版:四句结构 ──
  const sixty: string[] = []
  sixty.push(
    input.seniority === "fresh"
      ? `面试官好，我是〔名字〕，〔学校/专业〕应届，求职方向是${fam.name}。`
      : `面试官好，我是〔名字〕，${seniorityPhrase(input.seniority)}，一直做${fam.name}方向。`,
  )
  if (h1) {
    sixty.push(
      `最能代表我的一段经历：${h1}${h1HasNum ? "" : "（这里补一个规模或效果数字：〔指标〕从〔原值〕到〔新值〕）"}。`,
    )
  }
  sixty.push(
    h2
      ? `另外我${h2}。`
      : `另外我在〔第二条经历一句话：做了什么＋一个数字〕。`,
  )
  sixty.push(
    jdHits.length > 0
      ? `和这个岗位最相关的是我做过${jdHits.join("和")}相关的工作，希望在这条线上继续做深。`
      : `接下来我想在${fam.name}的〔细分场景〕里做出更深的落地，这也是我投这个岗位的原因。`,
  )
  if (h3) sixty.splice(2, 0, `期间还${h3}。`)

  // ── 3 分钟版:五段骨架 ──
  const outline = [
    {
      sec: "开场定位",
      time: "约 30 秒",
      tip: "一句话立住「谁＋方向＋年限」，不要从大学社团讲起",
      body: input.seniority === "fresh"
        ? `我是〔名字〕，〔学校/专业〕应届，方向${fam.name}。用一句话说清你为什么选这个方向（一门课、一个项目或一段实习都行，要真实）。`
        : `我是〔名字〕，${seniorityPhrase(input.seniority)}，主要做${fam.name}。一句话概括当前定位：〔现在负责什么规模的事〕。`,
    },
    {
      sec: "经历一：深讲",
      time: "约 90 秒",
      tip: "背景与难点 20 秒，你的做法 40 秒，结果数字 30 秒；数字是这段的灵魂",
      body: h1
        ? `背景：〔这段经历要解决什么问题、难在哪〕。做法：${h1}${h1HasNum ? "" : "（补数字：〔指标〕从〔原值〕到〔新值〕）"}。结果：〔一句话收在效果上〕。`
        : `背景：〔要解决的问题〕。做法：〔你具体做的两三步〕。结果：〔指标〕从〔原值〕到〔新值〕。`,
    },
    {
      sec: "经历二：略讲",
      time: "约 60 秒",
      tip: "和经历一互补（换一个技术面或换一种角色），不要同质堆叠",
      body: h2 ? `${h2}。补一句你的取舍：〔为什么这么做、放弃了什么〕。` : `〔第二条经历：做了什么＋一个数字＋一个取舍〕。`,
    },
    {
      sec: "与岗位的匹配",
      time: "约 30 秒",
      tip: "把 JD 里的关键词和你做过的事一一挂上，别让面试官自己找关联",
      body: jdHits.length > 0
        ? `岗位要求里的${jdHits.join("、")}我都有落地经验：〔各对应一句你最相关的证据〕。`
        : `岗位要求的〔JD 关键词〕对应我做过的〔经历〕：〔各一句证据〕。`,
    },
    {
      sec: "收尾",
      time: "约 15 秒",
      tip: "说你想继续解决什么问题，别说「希望贵公司给我机会」",
      body: `我接下来想把〔技术点〕在〔业务场景〕里做到〔目标〕，这和这个岗位的方向是一致的。`,
    },
  ]

  // ── 通病命中 ──
  const pitfalls: string[] = []
  const all = input.highlights.join(" ")
  if (/精通/.test(all)) pitfalls.push("亮点里出现「精通」：面试官会按专家标准追问，没到能讲清底层实现的程度就换成「落地过/深入用过」")
  if (all && !hasQuant(all)) pitfalls.push("亮点没有任何数字：60 秒版至少要有一个规模或效果数字，没有就先跑出数字再面")
  if (/正在学|学习中|计划学/.test(all)) pitfalls.push("「正在学」不放亮点位：放到收尾的「接下来想深入」，亮区位只放已经做出的东西")
  if (input.highlights.filter(Boolean).length < 2) pitfalls.push("只有一条亮点：3 分钟撑不满，补第二条（实习、课程项目或开源贡献都行）")
  if (h1 && h1.length > 120) pitfalls.push("第一条亮点超过 120 字：口头说会超时，砍到 40 字以内，细节留给追问")
  if (input.jd && jdHits.length > 0 && !jdHits.some((w) => all.toLowerCase().includes(w.toLowerCase()))) {
    pitfalls.push(`JD 命中的技术词（${jdHits.join("、")}）在你的亮点里一个都没出现：把最相关的一条换到第一句`)
  }
  if (pitfalls.length === 0) pitfalls.push("结构上没查到通病：练的时候掐表，60 秒版超 75 秒就砍形容词", "每句只留一个信息点，说人话，别背稿")

  // ── 追问预演(行为面通用题,方向互链题库) ──
  const probes = [
    "这段经历里最难的一步是什么，怎么解决的",
    "如果重做一次，你会改哪个决策",
    "你说的那个指标是怎么定义、怎么测的",
    "团队里你的角色边界：哪些是你名下的，哪些是协作的",
    input.seniority === "fresh" ? "为什么选这个方向，而不是算法、开发或产品" : "这些年方向变过吗，为什么收敛到现在这条线",
  ]

  return {
    sixty,
    outline,
    pitfalls,
    probes,
    probeCat: FAMILY_CAT[input.family] ?? "agent",
    jdHits,
  }
}
