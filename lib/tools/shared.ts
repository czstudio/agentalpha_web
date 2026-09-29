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
