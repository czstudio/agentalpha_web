/**
 * 简历分析规则引擎（纯前端、零依赖、简历文本不出浏览器）。
 *
 * 吸收融合自 7 个开源项目的已核实设计（见 _resume_optimizer/research.md）：
 * - Resume-Matcher：弱 bullet 六条判定、AI 味黑名单、四类结构化追问、防编造验证思路
 * - deepakpadhi986/AI-Resume-Analyzer：零 LLM 确定性打分、板块权重
 * - ats-buddy：纯静态站零后端形态
 * - 站内差异化：Agent 岗能力 taxonomy 证据等级评分、bullet 追问预演与翻车风险评级
 */

export interface JobProfile {
  slug: string
  name: string
  desc: string
  core: string[]
  plus: string[]
}

export const JOB_PROFILES: JobProfile[] = [
  {
    slug: "agent-app",
    name: "Agent 应用开发",
    desc: "大模型应用 / Agent 开发 / AI 平台方向，重工程落地与工具链。",
    core: [
      "RAG", "检索", "向量", "Embedding", "召回", "重排", "Rerank",
      "Function Calling", "工具调用", "MCP", "提示词", "Prompt",
      "Agent", "智能体", "多智能体", "记忆", "上下文",
      "LangChain", "LangGraph", "LlamaIndex", "流式", "SSE", "WebSocket",
    ],
    plus: [
      "评测", "评估", "灰度", "监控", "可观测", "trace",
      "vLLM", "部署", "推理", "量化", "缓存",
      "Skill", "A2A", "Claude", "Cursor",
      "Kafka", "Redis", "MySQL", "FastAPI", "微服务",
    ],
  },
  {
    slug: "llm-algo",
    name: "大模型算法",
    desc: "大模型算法 / 后训练 / RLHF 方向，重训练原理与数据工程。",
    core: [
      "微调", "SFT", "LoRA", "QLoRA", "PEFT",
      "RLHF", "DPO", "PPO", "GRPO", "强化学习", "奖励模型", "Reward",
      "Transformer", "注意力", "Attention", "MoE",
      "数据清洗", "数据构造", "配比", "Scaling", "评测", "benchmark",
    ],
    plus: [
      "蒸馏", "量化", "推理部署", "vLLM", "DeepSpeed", "ZeRO", "Megatron",
      "多模态", "VLM", "PyTorch", "分布式", "CUDA", "论文", "arXiv", "顶会",
    ],
  },
  {
    slug: "ai-infra",
    name: "AI Infra",
    desc: "推理引擎 / 训练框架 / 平台方向，重系统与性能。",
    core: [
      "推理", "部署", "vLLM", "KV Cache", "PagedAttention",
      "量化", "INT8", "INT4", "AWQ", "GPTQ",
      "吞吐", "延迟", "QPS", "显存", "GPU", "CUDA", "Triton", "算子",
      "DeepSpeed", "Megatron", "分布式", "ZeRO", "FSDP",
    ],
    plus: [
      "Kubernetes", "K8s", "容器", "Docker", "服务化", "弹性",
      "压测", "性能分析", "nsys", "profiling", "PyTorch", "C++", "Rust",
      "长文本", "投机解码", "Speculative", "PD 分离",
    ],
  },
]

/** 每个能力域的追问模板：全部来自站内真实面经素材，不是编的 */
export interface RadarAxis {
  key: string
  label: string
  hint: string
  words: string[]
  /** 该能力域写上简历后，面试官最可能追问的问题（真实面经原题） */
  probes: string[]
  /** 对应 /interview/qa/<slug> 的补题链接（slug 真实存在） */
  qaSlugs: string[]
}

export const RADAR_AXES: RadarAxis[] = [
  {
    key: "rag",
    label: "RAG 链路",
    hint: "检索、分块、召回、重排这条链有没有写具体",
    words: ["RAG", "检索", "向量", "召回", "重排", "Rerank", "Embedding", "chunk", "分块", "知识库"],
    probes: ["检索不准你怎么定位是哪个环节的问题？", "RAG 效果用什么指标衡量？", "文档更新了知识库怎么增量更新？"],
    qaSlugs: ["advanced-rag-paradigms", "rag-effect-eval", "rag-hardest-in-production"],
  },
  {
    key: "tooluse",
    label: "工具调用",
    hint: "Function Calling / MCP / Skill 的实操",
    words: ["Function Calling", "工具调用", "MCP", "Skill", "A2A", "API 调用", "插件", "tool"],
    probes: ["工具调用失败怎么兜底？", "Function Calling 和 MCP 什么场景选哪个？", "调用的准确率抓在哪个环节？"],
    qaSlugs: ["mcp-what-and-core", "function-calling-principle", "fc-vs-mcp-when", "agent-skill-what"],
  },
  {
    key: "agent",
    label: "Agent 架构",
    hint: "规划、循环、反思、拆任务的设计判断",
    words: ["Agent", "智能体", "ReAct", "规划", "反思", "任务拆解", "多智能体", "Multi-Agent", "编排", "workflow"],
    probes: ["为什么用多 Agent 不用单 Agent？", "子 Agent 之间怎么划分任务、怎么共享状态？", "Agent 出错怎么降级？"],
    qaSlugs: ["mcp-what-and-core", "function-calling-principle"],
  },
  {
    key: "memory",
    label: "记忆与上下文",
    hint: "长对话、记忆分层、上下文压缩的经验",
    words: ["记忆", "Memory", "上下文", "压缩", "摘要", "长对话", "多轮", "滑动窗口"],
    probes: ["历史压缩的总结什么时候触发、为什么按 token 数不按轮次？", "长期记忆什么信息值得写入、怎么淘汰？", "上下文快满了怎么处理？"],
    qaSlugs: ["agent-skill-what"],
  },
  {
    key: "eval",
    label: "评测",
    hint: "怎么证明做得好：指标、回归、裁判模型",
    words: ["评测", "评估", "指标", "Hit@", "忠实度", "回归", "Golden", "裁判", "judge", "bad case", "A/B"],
    probes: ["优化前后怎么证明变好了？", "LLM 裁判本身不准怎么办？", "bad case 怎么回收成评测集？"],
    qaSlugs: ["rag-effect-eval"],
  },
  {
    key: "train",
    label: "训练与微调",
    hint: "SFT/LoRA/RLHF 有没有动手做过",
    words: ["微调", "SFT", "LoRA", "QLoRA", "RLHF", "DPO", "PPO", "GRPO", "训练"],
    probes: ["LoRA 的秩怎么选？", "为什么选 GRPO 不选 PPO？", "微调数据怎么构造、怎么清洗？"],
    qaSlugs: ["how-llm-learns-tool-calling"],
  },
  {
    key: "deploy",
    label: "推理与部署",
    hint: "上线经验：吞吐、延迟、成本、监控",
    words: ["部署", "上线", "推理", "vLLM", "吞吐", "延迟", "QPS", "显存", "灰度", "监控", "服务化"],
    probes: ["延迟和吞吐怎么权衡的？", "上线后怎么监控和降级？", "成本怎么控制的？"],
    qaSlugs: ["websocket-vs-sse-llm"],
  },
  {
    key: "depth",
    label: "项目深度",
    hint: "有没有难点、取舍、复盘，而不是功能清单",
    words: ["难点", "瓶颈", "优化", "提升", "降低", "缩短", "踩坑", "复盘", "取舍", "从 0 到 1", "重构"],
    probes: ["这个项目最难的地方在哪？", "如果重来一次你会改哪个设计？", "失败了的那版为什么不行？"],
    qaSlugs: ["rag-hardest-in-production"],
  },
]

/** 弱动词 → 强动词建议（Resume-Matcher 通用短语判定的中文化） */
const WEAK_VERBS: Array<{ word: string; suggest: string[] }> = [
  { word: "负责", suggest: ["主导", "设计并实现", "落地"] },
  { word: "参与", suggest: ["承担其中…模块", "独立完成", "协作交付"] },
  { word: "协助", suggest: ["完成", "推动"] },
  { word: "了解", suggest: ["掌握", "对比选型后采用"] },
  { word: "熟悉", suggest: ["用于生产", "落地到"] },
  { word: "学习了", suggest: ["实现", "应用"] },
]

/** 中文 AI 味与空话黑名单（Resume-Matcher 黑名单分组法的中文化 + oil-tone 词表） */
const FLUFF_WORDS = [
  "赋能", "闭环", "抓手", "全方位", "深度融合", "生态共建", "降本增效", "打通",
  "护城河", "颠覆性", "革命性", "深度参与", "积极配合", "相关工作", "勇于挑战",
  "精益求精", "吃苦耐劳", "追求极致", "大显身手",
]

const QUANT_PATTERNS = [/\d+(\.\d+)?\s*%/, /\d+(\.\d+)?\s*(万|亿|k|K|M|ms|QPS|token|GB|TB|条|次|人|天|周|月)/, /\b\d{2,}\b/]
const ACTION_VERBS = /(实现|开发|搭建|设计|优化|上线|落地|重构|主导|提出|对比|选型|调优|解决|定位)/
const RESULT_WORDS = /(提升|提高|降低|减少|缩短|下降|覆盖|达到|稳定|支持|替换|节省|增收)/

/** 中文简历红旗：过度声称与复刻项目（吸收自 wyh0626/resume-optimizer 的红旗审计思路） */
const OVERCLAIM_WORDS = ["精通"]
const REPLICA_MARKS = ["仿写", "复刻", "克隆", "clone", "高仿", "仿照"]

/** JD 解析时忽略的英文停用词 */
const JD_STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "your", "our", "are", "will", "have", "has",
  "from", "that", "this", "who", "not", "all", "any", "can", "must", "should",
  "job", "work", "team", "role", "plus", "etc", "us", "we", "or", "in", "on",
  "to", "of", "a", "an", "is", "as", "by", "at", "be", "it", "its",
])

export interface JdReport {
  /** JD 里出现的所有考察词（词表命中 + 英文技术词） */
  keywords: string[]
  hits: string[]
  missing: string[]
  /** 命中率 0-100 */
  score: number
}

/** 从 JD 文本抽取考察词并与简历对比（Resume-Matcher 的 resume-vs-JD 思路的纯前端版） */
export function analyzeJd(jdText: string, resumeText: string, profileSlug: string): JdReport {
  const profile = JOB_PROFILES.find((p) => p.slug === profileSlug) || JOB_PROFILES[0]
  const jdLower = jdText.toLowerCase()
  const resumeLower = resumeText.toLowerCase()

  // 1) 词表命中：岗位画像 + 能力雷达的全部词，出现在 JD 里的都算考察词
  const lexicon = new Set<string>([...profile.core, ...profile.plus, ...RADAR_AXES.flatMap((a) => a.words)])
  const tabled = [...lexicon].filter((w) => jdLower.includes(w.trim().toLowerCase()))

  // 2) 英文技术词：连续字母数字串（vLLM、LangChain、Python3、C++ 等），去停用词、去纯数字
  const latin = Array.from(jdText.matchAll(/[A-Za-z][A-Za-z0-9+#./-]{1,}/g))
    .map((m) => m[0].replace(/[.\/-]+$/, ""))
    .filter((w) => w.length >= 2 && !JD_STOPWORDS.has(w.toLowerCase()) && !/^\d+$/.test(w))
  const latinSet = Array.from(new Set(latin))

  // 合并去重（词表词优先，英文词里去掉与词表重复的大小写变体）
  const keywords = Array.from(new Set([...tabled, ...latinSet])).slice(0, 60)
  const hits = keywords.filter((w) => resumeLower.includes(w.trim().toLowerCase()))
  const missing = keywords.filter((w) => !resumeLower.includes(w.trim().toLowerCase()))
  const score = keywords.length > 0 ? Math.round((hits.length / keywords.length) * 100) : 0
  return { keywords, hits, missing, score }
}

export interface BulletFinding {
  /** 原文截断 */
  text: string
  problems: string[]
  suggestion: string
  /** 追问预演：这条 bullet 会引来什么问题 */
  probes: Array<{ q: string; risk: "low" | "mid" | "high" }>
}

export interface RadarCell {
  axis: RadarAxis
  /** 0 未出现 / 1 只写名词 / 2 描述了用法 / 3 有指标结果 */
  level: 0 | 1 | 2 | 3
  evidence: string
}

export interface ResumeReport {
  profile: JobProfile
  score: { total: number; match: number; bullet: number; radar: number; structure: number }
  matched: { core: string[]; plus: string[] }
  missingCore: string[]
  radar: RadarCell[]
  bullets: BulletFinding[]
  fluff: string[]
  structure: string[]
  quantRatio: number
  bulletTotal: number
}

function splitBullets(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•·\-*\d.、)（(]+/, "").trim())
    .filter((line) => line.length >= 8 && line.length <= 200)
}

function has(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase())
}

const LEVEL_LABEL = ["缺失", "只挂名词", "描述了用法", "有指标结果"]

export function radarLevelLabel(level: number): string {
  return LEVEL_LABEL[level] ?? "缺失"
}

export function analyzeResume(text: string, profileSlug: string): ResumeReport {
  const profile = JOB_PROFILES.find((p) => p.slug === profileSlug) || JOB_PROFILES[0]
  const lower = text.toLowerCase()
  const bullets = splitBullets(text)

  // 1) 岗位匹配
  const matchedCore = profile.core.filter((w) => has(lower, w))
  const matchedPlus = profile.plus.filter((w) => has(lower, w))
  const missingCore = profile.core.filter((w) => !has(lower, w))
  const matchScore = Math.round(
    (matchedCore.length / Math.max(profile.core.length, 1)) * 75 +
      (matchedPlus.length / Math.max(profile.plus.length, 1)) * 25,
  )

  // 2) 能力雷达：证据等级 = 名词(1) + 动作动词(2) + 同条数字(3)
  const radar: RadarCell[] = RADAR_AXES.map((axis) => {
    const hitBullets = bullets.filter((b) => axis.words.some((w) => has(b, w)))
    if (hitBullets.length === 0) {
      return { axis, level: 0 as const, evidence: "简历里没有出现这个能力域的词" }
    }
    let level: 1 | 2 | 3 = 1
    let evidence = `出现于 ${hitBullets.length} 条经历，只有名词`
    for (const b of hitBullets) {
      const hasAction = ACTION_VERBS.test(b)
      const hasQuant = QUANT_PATTERNS.some((re) => re.test(b))
      if (hasQuant) {
        level = 3
        evidence = `「${b.slice(0, 30)}…」带动作和数字，证据最硬`
        break
      }
      if (hasAction && level < 2) {
        level = 2
        evidence = `「${b.slice(0, 30)}…」描述了怎么用`
      }
    }
    return { axis, level, evidence }
  })
  const radarScore = Math.round((radar.reduce((s, r) => s + r.level, 0) / (RADAR_AXES.length * 3)) * 100)

  // 3) bullet 质量 + 追问预演
  const findings: BulletFinding[] = []
  let quantCount = 0
  for (const b of bullets.slice(0, 40)) {
    const problems: string[] = []
    let suggestion = ""
    const weak = WEAK_VERBS.find((v) => b.includes(v.word))
    if (weak) {
      problems.push(`弱动词「${weak.word}」`)
      suggestion = `换成：${weak.suggest.slice(0, 2).join(" / ")}`
    }
    const bQuant = QUANT_PATTERNS.some((re) => re.test(b))
    if (bQuant) quantCount++
    else if (ACTION_VERBS.test(b)) {
      problems.push("没有数字")
      suggestion = suggestion || "补规模或效果：处理量、耗时、准确率、成本，至少一个"
    }
    if (!RESULT_WORDS.test(b) && ACTION_VERBS.test(b) && !bQuant) problems.push("没有结果")

    // 追问预演：bullet 命中哪些能力域，就挂那些域的真实面试题
    const hitAxes = RADAR_AXES.filter((ax) => ax.words.some((w) => has(b, w)))
    if (hitAxes.length > 0) {
      const risk: "low" | "mid" | "high" = bQuant && RESULT_WORDS.test(b) ? "low" : bQuant ? "mid" : "high"
      findings.push({
        text: b.slice(0, 60),
        problems,
        suggestion: suggestion || (risk === "high" ? "这条撑不住追问：要么补事实，要么降级措辞" : ""),
        probes: hitAxes
          .slice(0, 2)
          .flatMap((ax) => ax.probes.slice(0, 2))
          .slice(0, 3)
          .map((q) => ({ q, risk })),
      })
    } else if (problems.length > 0) {
      findings.push({ text: b.slice(0, 60), problems, suggestion, probes: [] })
    }
  }

  const bulletTotal = bullets.length
  const quantRatio = bulletTotal > 0 ? quantCount / bulletTotal : 0
  const bulletScore = Math.round(quantRatio * 70 + (findings.length < Math.max(bulletTotal * 0.5, 1) ? 30 : 10))

  // 4) 结构与用词
  const structure: string[] = []
  if (!/(邮箱|@|mail|电话|手机|联系方式)/i.test(text)) structure.push("缺联系方式（邮箱或电话）")
  if (!/(教育|本科|硕士|博士|大学|学院|学校)/.test(text)) structure.push("缺教育经历")
  if (!/(技能|技术栈|技术专长|工具)/.test(text)) structure.push("缺技能板块")
  if (bulletTotal < 5) structure.push("条目太少：项目与经历加起来不足 5 条")
  if (bulletTotal > 28) structure.push("条目过多：超过 28 行，重点被稀释，砍到一页以内")
  const overclaims = OVERCLAIM_WORDS.reduce((n, w) => n + (text.split(w).length - 1), 0)
  if (overclaims > 0) structure.push(`「${OVERCLAIM_WORDS[0]}」出现 ${overclaims} 次：写「精通」的每一项都会被面试官往死里问，只留你真能接住的那几个`)
  const replicas = bullets.filter((b) => REPLICA_MARKS.some((m) => b.toLowerCase().includes(m)))
  if (replicas.length > 0) structure.push(`复刻型项目 ${replicas.length} 条（仿写/复刻/克隆）：可以写，但要写清你的增量改动，否则追问「和原版的区别」就见底`)
  const fluff = FLUFF_WORDS.filter((w) => text.includes(w))
  if (fluff.length > 0) structure.push(`空话词 ${fluff.length} 处：面试官看到这些词不加分，具体做的事才加分`)

  const structureScore = Math.max(0, 100 - structure.length * 18 - fluff.length * 4)
  const total = Math.round(matchScore * 0.4 + bulletScore * 0.25 + radarScore * 0.2 + structureScore * 0.15)

  return {
    profile,
    score: { total: Math.min(100, total), match: matchScore, bullet: bulletScore, radar: radarScore, structure: structureScore },
    matched: { core: matchedCore, plus: matchedPlus },
    missingCore: missingCore.slice(0, 12),
    radar,
    bullets: findings.slice(0, 12),
    fluff,
    structure,
    quantRatio,
    bulletTotal,
  }
}
