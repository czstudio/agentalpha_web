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
  /** 人话翻译（规则从 JD 原文结构生成,不做无依据推断） */
  plain: string[]
  /** 级别判断（JD 信号推断） */
  seniority: string
  /** 行动清单（基于考察词缺口与隐藏考点生成） */
  checklist: string[]
}

/** 级别判断:只依据 JD 明示的年限/头衔词 */
function judgeSeniority(jdText: string): string {
  if (/实习|应届|助理|校招|trainee|intern/i.test(jdText)) return "入门级（实习/校招口径）"
  if (/资深|专家|高级|Lead|负责人|架构师|5\s*年以上|8\s*年以上|senior|staff/i.test(jdText)) return "高级（资深/带头人口径）"
  if (/1-3\s*年|三年以内|1~3年|2\s*年以上|3\s*年以上/.test(jdText)) return "中级（1-3 年口径）"
  return "JD 未明示年限,按中级准备,面试时先问清"
}

/** 人话翻译:从 JD 原文拆职责/要求结构,转述成段(引用 JD 实际出现的词) */
function buildPlain(jdText: string, families: FamilyScore[], coreHits: string[], business: HiddenTopic[]): string[] {
  const lines: string[] = []
  // 职责段:抓「岗位职责/工作职责/你将」后的第一二条
  const dutyMatch = jdText.match(/(?:岗位职责|工作职责|你将|职位职责)[:：]?\s*([\s\S]{10,180}?)(?:任职要求|岗位要求|要求|我们期望|$)/)
  const duties = dutyMatch
    ? dutyMatch[1].split(/[;；\n]|(?=[一二三四五六七八九十1-9][、.．])/).map(s => s.replace(/^[\s一二三四五六七八九十1-9、.．-]+/, "").trim()).filter(s => s.length >= 8).slice(0, 2)
    : []
  const topFamily = families[0]
  if (duties.length > 0) {
    lines.push(`核心工作两三件事:${duties.join(';')}。落在「${topFamily.profile.name}」的职责范围里。`)
  } else if (coreHits.length > 0) {
    lines.push(`从考察词看,这个岗的日常大概率围绕${coreHits.slice(0, 4).join('、')}展开,属于「${topFamily.profile.name}」方向。`)
  } else {
    lines.push(`JD 里没出现方向性关键词,画像识别也区分不开——这种 JD 建议直接看团队和业务线判断,或拿去问在职的人。`)
  }
  if (business.length > 0) {
    lines.push(`业务上大概率是${business.map(b => b.topic.replace(/（推断）/, '')).join('、')}——准备项目故事时往这个场景靠。`)
  }
  const reqMatch = jdText.match(/(?:任职要求|岗位要求|我们要找|要求)[:：]?\s*([\s\S]*)$/)
  const reqCount = reqMatch ? reqMatch[1].split(/\n|[;；]/).filter(s => s.trim().length >= 6).length : 0
  if (reqCount > 0) {
    lines.push(`任职要求 ${reqCount} 条,其中明确点名了 ${coreHits.length} 个核心考察词——这些是简历筛选的硬门槛,对不上就没有然后了。`)
  }
  return lines
}

/** 行动清单:从缺口/隐藏考点/业务信号生成可执行的下一步 */
function buildChecklist(coreHits: string[], hidden: HiddenTopic[], qaPicks: string[], cats: string[]): string[] {
  const list: string[] = []
  if (coreHits.length > 0) {
    list.push(`把简历技能段对着这些词过一遍:${coreHits.slice(0, 6).join('、')}——做过的补进简历,没做过的先别写`)
  }
  for (const h of hidden.slice(0, 3)) {
    list.push(`预演追问「${h.topic}」:${h.detail.slice(0, 30)}…`)
  }
  if (qaPicks.length > 0) {
    list.push(`先刷匹配出来的 ${qaPicks.length} 道题,答不上的就是你的优先补课区`)
  }
  list.push('用项目匹配器按「这个方向 + 你的基础 + 可投入时间」拿一个项目方案,补上简历里最缺的那格证据')
  return list.slice(0, 6)
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
  const families = scoreFamilies(jdText)
  const hidden = HIDDEN_RULES.filter((r) => r.re.test(jdText)).map(({ topic, detail }) => ({ topic, detail }))
  const business = BUSINESS_RULES.filter((r) => r.re.test(jdText)).map(({ topic, detail }) => ({ topic, detail }))
  const qaPicks = matchQa(jdText, coreHits, qaList)
  const dimensions = matchDimensions(jdText)
  return {
    families,
    keywords,
    coreHits,
    dimensions,
    hidden,
    business,
    qaPicks,
    length: jdText.trim().length,
    plain: buildPlain(jdText, families, coreHits, business),
    seniority: judgeSeniority(jdText),
    checklist: buildChecklist(coreHits, hidden, qaPicks, dimensions.map((d) => d.key)),
  }
}
