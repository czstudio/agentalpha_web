import { getAllQa, type QaItem } from "@/lib/qa"
import { getAllGlossary, type GlossaryItem } from "@/lib/glossary"
import { getAllInterview, type InterviewMeta } from "@/lib/interview"

/**
 * 分类学习路径聚合：把速答题、术语、深度文（含对比文）、项目包
 * 按分类串成「概念 → 刷题 → 深挖 → 实战」的教程结构。
 * 分类页 /interview/category/[cat] 与学习路径页共用。
 */

/** 术语分组与题库分类的对应（一组术语可服务多个分类） */
export const GROUP_TO_CATS: Record<string, string[]> = {
  basics: ["basics"],
  rag: ["rag"],
  agent: ["agent", "memory", "tooluse", "multiagent", "prompt"],
  inference: ["inference"],
  finetune: ["finetune"],
  eval: ["eval"],
  safety: ["safety"],
}

export interface CategoryLearnData {
  /** 分类内的速答题（按 order） */
  qa: QaItem[]
  /** 分类相关的术语（按分组映射） */
  terms: GlossaryItem[]
  /** 深度文（非对比、非项目包） */
  deeps: InterviewMeta[]
  /** 对比型解析 */
  comparisons: InterviewMeta[]
  /** 项目面试包 */
  packs: InterviewMeta[]
  /** 章节导读（flagship 由页面另行处理，这里给全部章导学备查） */
  guide: InterviewMeta | null
}

export function getCategoryLearnData(cat: string): CategoryLearnData {
  const qa = getAllQa()
    .filter((item) => item.category === cat)
    .sort((a, b) => a.order - b.order)
  const termGroups = Object.entries(GROUP_TO_CATS)
    .filter(([, cats]) => cats.includes(cat))
    .map(([group]) => group)
  const terms = getAllGlossary().filter((item) => termGroups.includes(item.group))
  const posts = getAllInterview().filter((post) => post.category === cat)
  const isComparison = (post: InterviewMeta) => (post.tags || []).some((t) => t.includes("对比选型"))
  const isPack = (post: InterviewMeta) => (post.tags || []).some((t) => t.includes("项目面试"))
  const isGuide = (post: InterviewMeta) => post.slug.endsWith("-chapter-guide")
  return {
    qa,
    terms,
    deeps: posts.filter((p) => !isComparison(p) && !isPack(p) && !isGuide(p)),
    comparisons: posts.filter(isComparison),
    packs: posts.filter(isPack),
    guide: posts.find(isGuide) || null,
  }
}

/** 速答题在分类内的相邻题（详情页串行导航用） */
export function getQaNeighbors(cat: string, slug: string): { prev: QaItem | null; next: QaItem | null; index: number; total: number } {
  const list = getAllQa()
    .filter((item) => item.category === cat)
    .sort((a, b) => a.order - b.order)
  const idx = list.findIndex((item) => item.slug === slug)
  if (idx === -1) return { prev: null, next: null, index: 0, total: list.length }
  return {
    prev: idx > 0 ? list[idx - 1] : null,
    next: idx < list.length - 1 ? list[idx + 1] : null,
    index: idx + 1,
    total: list.length,
  }
}
