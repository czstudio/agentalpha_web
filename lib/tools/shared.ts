/**
 * 求职工具共享常量:方向定义与本地存储键的唯一来源。
 * 之前方向 slug+名称散布在 gap-test / mock-client / project-matcher 六处,
 * 存储键在 quiz-client / mock-client 手写三处——加方向或改键名会静默断,统一收这里。
 */

export type FamilySlug = "agent-app" | "rag-eng" | "llm-algo" | "ai-infra"

export interface FamilyBase {
  slug: FamilySlug
  name: string
  /** 该方向的补课路线页 */
  roadmap: string
}

export const FAMILY_BASE: FamilyBase[] = [
  { slug: "agent-app", name: "Agent 应用开发", roadmap: "/roadmap/agent-developer" },
  { slug: "rag-eng", name: "RAG 工程", roadmap: "/roadmap/rag-engineer" },
  { slug: "llm-algo", name: "大模型算法", roadmap: "/roadmap/llm-application" },
  { slug: "ai-infra", name: "AI Infra", roadmap: "/roadmap/ai-infra" },
]

export function familyName(slug: string): string {
  return FAMILY_BASE.find((f) => f.slug === slug)?.name ?? slug
}

export function familyRoadmap(slug: string): string {
  return FAMILY_BASE.find((f) => f.slug === slug)?.roadmap ?? "/roadmap"
}

/** /interview/quiz 的掌握度键。格式 Record<slug, {h,m,last}>,mock 模拟面试错题会合并写这份 */
export const QA_MASTERY_KEY = "aa-qa-mastered-v1"
/** 模拟面试错题 slug 列表(仅本工具的报告计数用;抽题重练走 QA_MASTERY_KEY) */
export const MOCK_WRONG_KEY = "mock-wrong-slugs"

/** 题库分类 → 练这个考点的工具(qa 详情页互链用,空数组=无对应工具) */
export const CAT_TO_TOOLS: Record<string, Array<{ href: string; label: string; why: string }>> = {
  rag: [
    { href: "/tools/jd-analyzer", label: "拆一个 RAG 岗的 JD", why: "看这个考点在真实 JD 里的权重" },
    { href: "/tools/project-matcher", label: "挑个 RAG 项目练手", why: "检索对比/分块实验这类项目能出指标" },
  ],
  eval: [
    { href: "/tools/gap-test", label: "测评测维度的短板", why: "八域雷达里专门有评测一格" },
  ],
  tooluse: [
    { href: "/tools/mock-interview", label: "被追问一轮工具调用", why: "细节人格会抠每个调用失败的兜底" },
  ],
  agent: [
    { href: "/tools/mock-interview", label: "模拟一场 Agent 面", why: "按 agent 方向组卷,含架构挑战人格" },
    { href: "/tools/gap-test", label: "测 Agent 架构域差距", why: "自评加真题抽验,防虚标" },
  ],
  memory: [
    { href: "/tools/gap-test", label: "测记忆与上下文域", why: "八域之一,带真题抽验" },
  ],
  finetune: [
    { href: "/tools/gap-test", label: "选算法方向测训练域", why: "大模型算法方向加权更高" },
  ],
  inference: [
    { href: "/tools/gap-test", label: "选 Infra 方向测部署域", why: "Infra 方向推理部署权重最高" },
  ],
  enterprise: [
    { href: "/tools/jd-analyzer", label: "拆 JD 里的落地要求", why: "企业落地的隐藏考点会标出来" },
    { href: "/tools/resume", label: "体检落地经历的写法", why: "上线/监控经历要带指标才有证据" },
  ],
  safety: [
    { href: "/tools/jd-analyzer", label: "看 JD 里的合规信号", why: "内容安全类隐藏考点的推断映射" },
  ],
  basics: [
    { href: "/roadmap", label: "按学习路线补基础", why: "LLM 基础章节顺序刷效率最高" },
  ],
}
