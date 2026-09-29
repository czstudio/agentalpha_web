/**
 * 项目匹配器（纯前端）。
 * 数据源：lib/column 的 PROJECTS 项目卡（社区面试宝典高频项目池，count=出现频次），
 * 本文件给每个项目补匹配元数据：方向亲和、难度、最少周数、简历写法、验收指标。
 * 红线：简历 bullet 模板里的指标位置一律留空（〔〕占位），由用户填真实值，系统不编数。
 */
import { PROJECTS } from "@/lib/column"

export type MatcherFamily = "agent-app" | "llm-algo" | "ai-infra" | "rag-eng"
export type SkillLevel = "zero" | "api" | "demo" | "shipped"
export type TimeBudget = "2w" | "1m" | "3m"

export interface ProjectMeta {
  /** 与 PROJECTS.name 一致 */
  name: string
  /** 方向亲和分（0-2） */
  affinity: Record<MatcherFamily, number>
  /** 难度 1-3 */
  difficulty: 1 | 2 | 3
  /** 最少需要的专注周数（业余时间口径） */
  minWeeks: 2 | 4 | 6
  /** 简历 bullet 模板：〔〕为用户必须填真实值的指标位 */
  bullet: string
  /** 验收指标：做完后应该能拿出来的东西 */
  acceptance: string
  /** 对应题库分类（面试追问从真实题库抽） */
  cats: string[]
}

const M: ProjectMeta[] = [
  {
    name: "RAG 检索方法对比评测",
    affinity: { "agent-app": 2, "llm-algo": 1, "ai-infra": 0, "rag-eng": 2 },
    difficulty: 2, minWeeks: 4,
    bullet: "搭建〔N 篇/类〕文档的知识库 RAG，对比 BM25/向量/混合三路召回并消融重排，Recall@K 从〔x〕提到〔y〕，P95 延迟〔z〕ms",
    acceptance: "对比表 + 检索召回示例 + 性能-召回 Pareto 图",
    cats: ["rag", "eval"],
  },
  {
    name: "RAG 系统自动化评估与错误归因",
    affinity: { "agent-app": 1, "llm-algo": 1, "ai-infra": 0, "rag-eng": 2 },
    difficulty: 2, minWeeks: 4,
    bullet: "为〔场景〕RAG 建自动化评估流水线：〔N〕条评测集 + LLM 裁判抽检，错误归因到检索/生成两段，迭代〔k〕轮后忠实度从〔x〕到〔y〕",
    acceptance: "评估一致性报告 + 错误归因周报模板",
    cats: ["eval", "rag"],
  },
  {
    name: "文档分块策略对 RAG 效果的影响实验",
    affinity: { "agent-app": 1, "llm-algo": 0, "ai-infra": 0, "rag-eng": 2 },
    difficulty: 1, minWeeks: 2,
    bullet: "在〔文档类型〕上实验〔n〕种分块策略（固定/递归/父子索引），Recall@K 与 F1 对比后选定〔策略〕，线上 badcase 率降〔x〕%",
    acceptance: "Recall@K 和 F1 对比图 + 最佳分块参数建议",
    cats: ["rag"],
  },
  {
    name: "RAG 生成忠实度提升与幻觉检测",
    affinity: { "agent-app": 1, "llm-algo": 1, "ai-infra": 0, "rag-eng": 2 },
    difficulty: 2, minWeeks: 4,
    bullet: "针对〔场景〕的幻觉问题加引用溯源与拒答约束，建〔N〕条 badcase 检测集，忠实度从〔x〕提升到〔y〕，误拒率控制在〔z〕%",
    acceptance: "忠实度修正前后指标对比 + 错误案例分析",
    cats: ["rag", "safety"],
  },
  {
    name: "Agent 长期记忆机制设计与评估",
    affinity: { "agent-app": 2, "llm-algo": 0, "ai-infra": 0, "rag-eng": 0 },
    difficulty: 3, minWeeks: 6,
    bullet: "为〔场景〕Agent 设计分层记忆（工作记忆/情景/语义），上下文压缩按 token 阈值触发，多轮任务成功率从〔x〕到〔y〕，单轮 token 降〔z〕%",
    acceptance: "记忆系统架构图 + 评估指标对比表",
    cats: ["memory", "agent"],
  },
  {
    name: "Agent 工具选择与排序模块",
    affinity: { "agent-app": 2, "llm-algo": 0, "ai-infra": 0, "rag-eng": 0 },
    difficulty: 2, minWeeks: 4,
    bullet: "为〔N 个〕工具的 Agent 做选择与排序：描述改写 + 检索式路由，工具选择准确率从〔x〕到〔y〕，无效调用降〔z〕%",
    acceptance: "工具选择代码 + 对比实验报告",
    cats: ["tooluse"],
  },
  {
    name: "Agent 自动化评测与迭代系统",
    affinity: { "agent-app": 2, "llm-algo": 0, "ai-infra": 0, "rag-eng": 1 },
    difficulty: 2, minWeeks: 4,
    bullet: "建 Agent 回归评测：〔N〕个任务脚本 + 通过率/步数/成本三指标，提示词或模型迭代〔k〕版无回归，线上通过率从〔x〕到〔y〕",
    acceptance: "自动化评测流水线 + 回滚机制文档",
    cats: ["eval", "agent"],
  },
  {
    name: "基于 MCTS 的 Agent 规划与决策",
    affinity: { "agent-app": 2, "llm-algo": 1, "ai-infra": 0, "rag-eng": 0 },
    difficulty: 3, minWeeks: 6,
    bullet: "在〔任务〕上用 MCTS 替代线性规划做 Agent 决策，搜索深度-成功率曲线显示深度〔d〕后收益饱和，成功率较贪心策略提升〔x〕%",
    acceptance: "MCTS 实现代码 + 搜索深度-成功率曲线",
    cats: ["agent"],
  },
  {
    name: "从零实现带掩码的 Attention 机制",
    affinity: { "agent-app": 0, "llm-algo": 2, "ai-infra": 1, "rag-eng": 0 },
    difficulty: 2, minWeeks: 2,
    bullet: "从零实现多头注意力（含因果掩码与缩放），单元测试对齐 PyTorch 参考实现，数值误差〔x〕以内",
    acceptance: "实现代码 + 正确性验证测试",
    cats: ["basics"],
  },
  {
    name: "MoE 路由机制实现与分析",
    affinity: { "agent-app": 0, "llm-algo": 2, "ai-infra": 1, "rag-eng": 0 },
    difficulty: 3, minWeeks: 4,
    bullet: "实现 MoE 路由（Top-K + 负载均衡损失），在〔配置〕下分析专家负载分布，均衡损失权重对负载不均衡度的影响曲线",
    acceptance: "MoE 实现代码 + 负载均衡分析图",
    cats: ["basics", "finetune"],
  },
  {
    name: "DPO 与 PPO 在 RLHF 中的对比",
    affinity: { "agent-app": 0, "llm-algo": 2, "ai-infra": 0, "rag-eng": 0 },
    difficulty: 3, minWeeks: 6,
    bullet: "在〔数据集/N 条偏好对〕上对比 DPO 与 PPO：训练稳定性、显存、胜率，DPO 胜率〔x〕% vs PPO〔y〕%，显存降〔z〕%",
    acceptance: "训练日志 + 胜率对比图",
    cats: ["finetune"],
  },
  {
    name: "LoRA 微调效果与参数分析",
    affinity: { "agent-app": 0, "llm-algo": 2, "ai-infra": 0, "rag-eng": 0 },
    difficulty: 2, minWeeks: 4,
    bullet: "对〔基座〕做 LoRA 微调（〔N〕条指令数据），rank ∈ {〔范围〕} 的效果-成本曲线，选定 rank〔r〕，评测任务分数从〔x〕到〔y〕",
    acceptance: "微调对比报告 + 秩影响曲线",
    cats: ["finetune"],
  },
  {
    name: "多 Agent 协作系统设计与实现",
    affinity: { "agent-app": 2, "llm-algo": 0, "ai-infra": 0, "rag-eng": 0 },
    difficulty: 3, minWeeks: 6,
    bullet: "实现〔角色数〕角色协作系统（消息总线 + 状态隔离 + 冲突仲裁），子 Agent 失败注入实验下主流程成功率〔x〕%，端到端延迟〔y〕s",
    acceptance: "架构设计文档 + 原型代码 + 性能指标",
    cats: ["multiagent", "agent"],
  },
  {
    name: "LLM-as-a-Judge 偏见分析与缓解",
    affinity: { "agent-app": 1, "llm-algo": 1, "ai-infra": 0, "rag-eng": 1 },
    difficulty: 2, minWeeks: 4,
    bullet: "量化裁判模型的位置/长度/自我偏好偏见，双向交换 + rubric 约束后与人工标注一致性从 κ=〔x〕到〔y〕",
    acceptance: "偏见分布报告 + 缓解前后一致性对比",
    cats: ["eval"],
  },
  {
    name: "Function Call 能力训练与优化",
    affinity: { "agent-app": 2, "llm-algo": 1, "ai-infra": 0, "rag-eng": 0 },
    difficulty: 3, minWeeks: 6,
    bullet: "构造〔N〕条工具调用样本微调〔基座〕，调用格式合法率从〔x〕到〔y〕，消融显示负样本混入贡献〔z〕%",
    acceptance: "消融实验报告 + 微调模型",
    cats: ["tooluse", "finetune"],
  },
  {
    name: "KV-cache 实现与性能分析",
    affinity: { "agent-app": 0, "llm-algo": 0, "ai-infra": 2, "rag-eng": 0 },
    difficulty: 2, minWeeks: 2,
    bullet: "实现 KV Cache（含 Paged 分块与前缀复用），〔batch/config〕下解码吞吐提升〔x〕倍，显存占用降〔y〕%",
    acceptance: "KV-cache 代码 + 加速比曲线",
    cats: ["inference"],
  },
]

export interface MatcherRecommendation {
  meta: ProjectMeta
  /** PROJECTS 里的频次与产出（可能缺，容错） */
  count?: number
  output?: string
  score: number
  /** 时间是否够 */
  timeFit: "fit" | "tight" | "over"
  reasons: string[]
}

const TIME_WEEKS: Record<TimeBudget, number> = { "2w": 2, "1m": 4, "3m": 12 }

const SKILL_FIT: Record<SkillLevel, number> = { zero: 1, api: 2, demo: 3, shipped: 3 }

export function matchProjects(
  family: MatcherFamily,
  skill: SkillLevel,
  time: TimeBudget,
): MatcherRecommendation[] {
  const weeks = TIME_WEEKS[time]
  const skillCap = SKILL_FIT[skill]

  const scored = M.map((meta) => {
    let score = meta.affinity[family] * 30
    const timeFit: MatcherRecommendation["timeFit"] =
      weeks >= meta.minWeeks + 2 ? "fit" : weeks >= meta.minWeeks ? "tight" : "over"
    if (timeFit === "over") score -= 45
    if (timeFit === "tight") score -= 10
    // 零基础对难度 3 降权；有上线经验对难度 1 降权（太浅）
    if (meta.difficulty > skillCap) score -= (meta.difficulty - skillCap) * 18
    if (skill === "shipped" && meta.difficulty === 1) score -= 15
    if (skill === "zero" && meta.difficulty === 1) score += 12
    // 高频项目加分（面试官见过 = 有共识语境）
    const inPool = PROJECTS.find((p) => p.name === meta.name)
    if (inPool) score += Math.min(inPool.count, 120) * 0.1
    return { meta, count: inPool?.count, output: inPool?.output, score: Math.round(score), timeFit, reasons: [] as string[] }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => {
      const reasons: string[] = []
      reasons.push(`与${familyLabel(family)}方向的考点重合度高`)
      if (r.timeFit === "fit") reasons.push(`时间充裕：最少 ${r.meta.minWeeks} 周，你有 ${weeks} 周`)
      if (r.timeFit === "tight") reasons.push(`时间刚好：最少 ${r.meta.minWeeks} 周，你有 ${weeks} 周，砍掉锦上添花的功能`)
      if (r.timeFit === "over") reasons.push(`时间不够：这个项目最少 ${r.meta.minWeeks} 周，建议只在时间升档后做`)
      if (r.count) reasons.push(`面试宝典高频项目（出现 ${r.count} 次）`)
      if (skill === "zero" && r.meta.difficulty === 1) reasons.push("入门友好：不需要先补太多基础")
      if (skill === "shipped" && r.meta.difficulty === 3) reasons.push("强度匹配：你已经上过线，这个项目有增量")
      return { ...r, reasons }
    })
}

export function familyLabel(family: MatcherFamily): string {
  return (
    {
      "agent-app": "Agent 应用开发",
      "llm-algo": "大模型算法",
      "ai-infra": "AI Infra",
      "rag-eng": "RAG 工程",
    } as const
  )[family]
}

export const SKILL_OPTIONS: Array<{ slug: SkillLevel; label: string; hint: string }> = [
  { slug: "zero", label: "零基础", hint: "会写 Python，没碰过大模型" },
  { slug: "api", label: "调过 LLM API", hint: "用 SDK 或接口做过调用" },
  { slug: "demo", label: "做过 RAG/Agent demo", hint: "跑通过完整链路的玩具版" },
  { slug: "shipped", label: "有上线或深度项目", hint: "带真实用户或指标闭环" },
]

export const TIME_OPTIONS: Array<{ slug: TimeBudget; label: string; hint: string }> = [
  { slug: "2w", label: "2 周（业余）", hint: "每天 2-3 小时" },
  { slug: "1m", label: "1 个月", hint: "每天半天或周末整块" },
  { slug: "3m", label: "3 个月", hint: "假期或全力求职期" },
]
