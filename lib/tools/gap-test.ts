/**
 * 面试 Gap 自测引擎（纯前端）。
 * 八个能力域与简历体检的 RADAR_AXES 对齐，但把「项目深度」换成可测的「工程落地」；
 * 每个域映射题库分类，自评后用真实题抽验防虚标：
 * 自评会的域抽 2 题，答不上则该域分数回落——雷达反映的是「能复述的证据」，不是自信心。
 */

export interface GapDomain {
  key: string
  label: string
  hint: string
  /** 对应题库分类（content/interview/categories.json） */
  cat: string
  /** 自评档位文案 */
  levels: string[]
}

export const GAP_DOMAINS: GapDomain[] = [
  {
    key: "rag",
    label: "RAG 链路",
    hint: "分块、召回、重排、引用溯源，以及检索不准的排查",
    cat: "rag",
    levels: ["没接触", "看过文章", "搭过 demo", "做过带指标的完整链路"],
  },
  {
    key: "tooluse",
    label: "工具调用",
    hint: "Function Calling / MCP 的实操与准确率优化",
    cat: "tooluse",
    levels: ["没接触", "看过文章", "调通过 API", "做过失败处理与准确率优化"],
  },
  {
    key: "agent",
    label: "Agent 架构",
    hint: "循环、规划、反思、workflow 与 Agent 的取舍",
    cat: "agent",
    levels: ["没接触", "看过文章", "跑过框架", "自己设计过循环与降级"],
  },
  {
    key: "memory",
    label: "记忆与上下文",
    hint: "分层记忆、上下文压缩、多轮状态管理",
    cat: "memory",
    levels: ["没接触", "看过文章", "用过现成方案", "自己设计过分层与淘汰"],
  },
  {
    key: "eval",
    label: "评测",
    hint: "评测集、指标、回归、LLM 裁判的使用边界",
    cat: "eval",
    levels: ["没接触", "知道指标", "跑过现成评测", "从零建过评测集与回归"],
  },
  {
    key: "train",
    label: "训练与微调",
    hint: "SFT / LoRA / RLHF 的动手与数据构造",
    cat: "finetune",
    levels: ["没接触", "看过原理", "跑过微调脚本", "自己构造过数据并分析过曲线"],
  },
  {
    key: "deploy",
    label: "推理与部署",
    hint: "vLLM、量化、吞吐延迟显存账",
    cat: "inference",
    levels: ["没接触", "知道概念", "部署过一次", "做过性能对比与调优"],
  },
  {
    key: "ship",
    label: "工程落地",
    hint: "监控告警、成本控制、安全合规、转人工",
    cat: "enterprise",
    levels: ["没接触", "有概念", "参与过上线", "负责过指标与 badcase 闭环"],
  },
]

/** 目标方向（与简历体检的岗位画像一致），并给出补课路线链接 */
export const GAP_FAMILIES = [
  { slug: "agent-app", name: "Agent 应用开发", roadmap: "/roadmap/agent-developer", weights: { rag: 1, tooluse: 1.3, agent: 1.3, memory: 1, eval: 1.1, train: 0.7, deploy: 0.8, ship: 1 } },
  { slug: "llm-algo", name: "大模型算法", roadmap: "/roadmap/llm-application", weights: { rag: 0.7, tooluse: 0.6, agent: 0.6, memory: 0.4, eval: 1.2, train: 1.5, deploy: 0.8, ship: 0.7 } },
  { slug: "ai-infra", name: "AI Infra", roadmap: "/roadmap/ai-infra", weights: { rag: 0.4, tooluse: 0.4, agent: 0.3, memory: 0.3, eval: 0.8, train: 1.2, deploy: 1.6, ship: 1.1 } },
  { slug: "rag-eng", name: "RAG 工程", roadmap: "/roadmap/rag-engineer", weights: { rag: 1.6, tooluse: 0.8, agent: 0.7, memory: 0.6, eval: 1.3, train: 0.6, deploy: 0.9, ship: 1 } },
] as const

export type QuizAnswer = "ok" | "unsure" | "fail"

export interface GapDomainResult {
  domain: GapDomain
  /** 自评 0-3 */
  self: number
  /** 抽验修正后 0-3（可能带 0.5） */
  adjusted: number
  /** 0-100，按方向权重加权前的原始分 */
  score: number
  /** 该域是否抽验过 */
  verified: boolean
}

export interface GapReport {
  family: (typeof GAP_FAMILIES)[number]
  domains: GapDomainResult[]
  /** 加权总分 0-100 */
  total: number
  /** 得分最低的域（按方向权重修正后的短板） */
  weakest: GapDomainResult[]
  /** 一句人话结论 */
  conclusion: string
  /** 建议路线 */
  roadmap: string
}

/** 自评 + 抽验答案 → 域分。答不上 → 回落到 1；不确定 → 降 1 档；能答 → +0.5 封顶 3 */
function adjust(self: number, answer: QuizAnswer | undefined): number {
  if (answer === undefined) return self
  if (answer === "fail") return Math.min(self, 1)
  if (answer === "unsure") return Math.max(0.5, self - 1)
  return Math.min(3, self + 0.5)
}

export function buildGapReport(
  familySlug: string,
  self: Record<string, number>,
  quiz: Record<string, QuizAnswer>,
): GapReport {
  const family = GAP_FAMILIES.find((f) => f.slug === familySlug) || GAP_FAMILIES[0]

  const domains: GapDomainResult[] = GAP_DOMAINS.map((domain) => {
    const s = self[domain.key] ?? 0
    const adj = adjust(s, quiz[domain.key])
    return {
      domain,
      self: s,
      adjusted: adj,
      score: Math.round((adj / 3) * 100),
      verified: quiz[domain.key] !== undefined,
    }
  })

  const weights = family.weights as Record<string, number>
  const weightSum = domains.reduce((sum, d) => sum + (weights[d.domain.key] ?? 1), 0)
  const total = Math.round(
    domains.reduce((sum, d) => sum + (d.adjusted / 3) * 100 * (weights[d.domain.key] ?? 1), 0) / weightSum,
  )

  const weakest = [...domains].sort((a, b) => {
    const wa = (weights[a.domain.key] ?? 1) * (3 - a.adjusted)
    const wb = (weights[b.domain.key] ?? 1) * (3 - b.adjusted)
    return wb - wa
  }).filter((d) => d.adjusted < 2.5).slice(0, 3)

  const weakLabels = weakest.map((d) => d.domain.label)
  let conclusion: string
  if (total >= 70) {
    conclusion = weakLabels.length > 0
      ? `基础盘扎实，方向内的短板集中在${weakLabels.join("、")}。把这几块对应的题库分类过一遍，做一两个能产出指标的小项目，就可以开始投了。`
      : `各域都有实打实的证据，当前主要任务不是补课，是把经历按「规模-指标-取舍」重写进简历，然后多轮模拟面试。`
  } else if (total >= 45) {
    conclusion = `当前更像「能跑通 Demo 的水平」，离「能扛线上 badcase 的工程要求」主要差在${weakLabels.join("、")}。优先把前两块按题库分类补完，再做一个带评测集的小项目。`
  } else {
    conclusion = `先补地基：LLM 基础 + ${weakLabels.slice(0, 2).join("、")}。别急着铺开，按学习路线走完一个方向，用一个完整项目把链路走通，比什么都会一点更有面试价值。`
  }

  return { family, domains, total, weakest, conclusion, roadmap: family.roadmap }
}
