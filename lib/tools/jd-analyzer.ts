/**
 * JD 人话拆解引擎（纯前端、零依赖、JD 文本不出浏览器）。
 * 与 lib/tools/resume-analyzer 共用岗位画像词表；新增：
 * 岗位画像识别、考察词分层、能力维度分组、隐藏要求与业务信号推断、题库匹配。
 * 推断类输出的口径：基于 JD 原文信号 + 行业惯例的规则映射，页面上标注「推断」。
 */
import {
  JOB_PROFILES,
  RADAR_AXES,
  JD_STOPWORDS,
  type JobProfile,
} from "@/lib/tools/resume-analyzer"

export interface QaLite {
  slug: string
  question: string
  oneLine: string
  category: string
  tags: string[]
}

export interface FamilyScore {
  profile: JobProfile
  /** 0-100 归一化命中分 */
  score: number
  hits: number
}

export interface HiddenTopic {
  topic: string
  detail: string
}

export interface JdBreakdown {
  /** 岗位画像识别（按得分降序） */
  families: FamilyScore[]
  /** JD 考察词：核心画像词在前，英文技术词在后 */
  keywords: string[]
  /** 核心画像词命中（JD 里明确写了的） */
  coreHits: string[]
  /** 能力维度分组：RADAR_AXES 词在 JD 里命中的域 */
  dimensions: Array<{ key: string; label: string; hint: string; words: string[] }>
  /** JD 没写但面试会问（规则推断，页面标注） */
  hidden: HiddenTopic[]
  /** 业务信号（规则推断，页面标注） */
  business: HiddenTopic[]
  /** 推荐题 slug（匹配打分 top N） */
  qaPicks: string[]
  /** JD 文本长度（字） */
  length: number
}

/** 隐藏要求映射：JD 信号 → 面试真实考法。全部来自站内题库与面经的高频归纳。 */
const HIDDEN_RULES: Array<{ re: RegExp; topic: string; detail: string }> = [
  { re: /高并发|QPS|大规模|海量|高可用/, topic: "稳定性工程", detail: "JD 只写「扛得住量」，面试会问限流、降级、缓存怎么做，峰值时 Agent 怎么熔断" },
  { re: /上线|灰度|监控|可观测|告警/, topic: "线上运维", detail: "会问上线后看哪些指标、怎么告警、出问题怎么回滚——「上线了」只是故事的一半" },
  { re: /评测|评估|benchmark|效果/, topic: "评测体系", detail: "「效果提升」必须能答出：指标是什么、评测集怎么建、怎么回归不被改坏" },
  { re: /安全|合规|审核|内容风控/, topic: "内容安全与合规", detail: "会问违规内容在哪一层拦、提示注入怎么防、训练数据的合规边界" },
  { re: /成本|降本|预算|ROI/, topic: "成本控制", detail: "会问 Token 账单拆解：一轮任务花在哪、模型分级路由、缓存怎么省" },
  { re: /多智能体|multi-?agent|协作/, topic: "多 Agent 失败模式", detail: "会问子 Agent 崩溃怎么兜底、状态怎么同步、为什么要多 Agent 而不是单 Agent" },
  { re: /流式|实时|低延迟|毫秒/, topic: "流式工程", detail: "会问 SSE 与 WebSocket 怎么选、首 Token 延迟由什么决定、吐字速度怎么提" },
  { re: /Agent|智能体/, topic: "Agent 循环与记忆", detail: "会问死循环怎么治理、上下文快满怎么压缩、记忆什么时候写入什么时候淘汰" },
  { re: /RAG|检索|知识库|向量/, topic: "RAG 链路定位", detail: "会问检索不准从哪一步开始查、知识库更新延迟、badcase 怎么回收成评测集" },
  { re: /微调|SFT|LoRA|训练/, topic: "训练细节", detail: "会问数据怎么构造怎么清洗、LoRA 秩怎么选、微调完变笨怎么办" },
  { re: /多模态|图像|视觉|视频|语音/, topic: "多模态成本", detail: "会问一张图占多少 Token、图文一致性怎么保证、OCR 与 VLM 怎么选" },
]

/** 业务信号映射：JD 信号 → 场景推断（置信度：中） */
const BUSINESS_RULES: Array<{ re: RegExp; topic: string; detail: string }> = [
  { re: /客服|工单|售后|售后/, topic: "客服场景（推断）", detail: "核心指标大概率是转人工率与解决率；人机协作边界是必考题" },
  { re: /电商|商品|交易|订单|营销/, topic: "交易场景（推断）", detail: "Agent 给错信息损失是真实的，稳定性与回滚的权重比炫技高" },
  { re: /搜索|推荐|问答/, topic: "搜索场景（推断）", detail: "延迟敏感、相关性标准严格；字面检索原理（BM25 类）可能被掰开问" },
  { re: /知识库|文档|办公|企业|私有化/, topic: "企业知识场景（推断）", detail: "大概率考权限怎么带进检索、知识库增量更新、多知识源融合" },
  { re: /语音|音频|视频|多模态/, topic: "多模态场景（推断）", detail: "多模态上下文成本与图文一致性是特色考点" },
  { re: /平台|开发者|生态|API/, topic: "平台场景（推断）", detail: "做的东西给开发者用：API 设计、Schema 清晰度、文档都是考核面" },
]

/** 考察词抽取：画像词表命中 + 英文技术词（与 resume-analyzer 同口径，但不依赖简历） */
function extractKeywords(jdText: string): { keywords: string[]; coreHits: string[] } {
  const jdLower = jdText.toLowerCase()
  const coreHits: string[] = []
  for (const p of JOB_PROFILES) {
    for (const w of p.core) {
      if (jdLower.includes(w.trim().toLowerCase())) coreHits.push(w)
    }
  }
  const axisWords = RADAR_AXES.flatMap((a) => a.words).filter((w) => jdLower.includes(w.trim().toLowerCase()))
  const latin = Array.from(jdText.matchAll(/[A-Za-z][A-Za-z0-9+#./-]{1,}/g))
    .map((m) => m[0].replace(/[.\/-]+$/, ""))
    .filter((w) => w.length >= 2 && !JD_STOPWORDS.has(w.toLowerCase()) && !/^\d+$/.test(w))
  const keywords = Array.from(new Set([...coreHits, ...axisWords, ...latin]))
  return { keywords: keywords.slice(0, 60), coreHits: Array.from(new Set(coreHits)) }
}

function scoreFamilies(jdText: string): FamilyScore[] {
  const jdLower = jdText.toLowerCase()
  const scored = JOB_PROFILES.map((profile) => {
    const core = profile.core.filter((w) => jdLower.includes(w.trim().toLowerCase())).length
    const plus = profile.plus.filter((w) => jdLower.includes(w.trim().toLowerCase())).length
    return { profile, hits: core * 2 + plus, score: 0 }
  })
  const max = Math.max(...scored.map((s) => s.hits), 1)
  return scored
    .map((s) => ({ ...s, score: Math.round((s.hits / max) * 100) }))
    .sort((a, b) => b.score - a.score)
}

function matchDimensions(jdText: string): JdBreakdown["dimensions"] {
  const jdLower = jdText.toLowerCase()
  return RADAR_AXES.filter((axis) =>
    axis.words.some((w) => jdLower.includes(w.trim().toLowerCase())),
  ).map((axis) => ({
    key: axis.key,
    label: axis.label,
    hint: axis.hint,
    words: axis.words.filter((w) => jdLower.includes(w.trim().toLowerCase())),
  }))
}

/** 题库匹配：JD 考察词与题目文本的交集打分，core 词权重翻倍 */
function matchQa(jdText: string, coreHits: string[], qaList: QaLite[], limit = 10): string[] {
  const jdLower = jdText.toLowerCase()
  const coreSet = new Set(coreHits.map((w) => w.toLowerCase()))
  const probeWords = new Set<string>(coreSet)
  for (const axis of RADAR_AXES) {
    for (const w of axis.words) {
      const word = w.trim().toLowerCase()
      if (word.length >= 2 && jdLower.includes(word)) probeWords.add(word)
    }
  }

  const scored = qaList.map((q) => {
    const hay = `${q.question} ${q.oneLine} ${q.tags.join(" ")}`.toLowerCase()
    let score = 0
    for (const w of probeWords) {
      if (hay.includes(w)) score += coreSet.has(w) ? 2 : 1
    }
    return { slug: q.slug, score }
  })
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.slug)
}

export function breakdownJd(jdText: string, qaList: QaLite[]): JdBreakdown {
  const { keywords, coreHits } = extractKeywords(jdText)
  return {
    families: scoreFamilies(jdText),
    keywords,
    coreHits,
    dimensions: matchDimensions(jdText),
    hidden: HIDDEN_RULES.filter((r) => r.re.test(jdText)).map(({ topic, detail }) => ({ topic, detail })),
    business: BUSINESS_RULES.filter((r) => r.re.test(jdText)).map(({ topic, detail }) => ({ topic, detail })),
    qaPicks: matchQa(jdText, coreHits, qaList),
    length: jdText.trim().length,
  }
}
