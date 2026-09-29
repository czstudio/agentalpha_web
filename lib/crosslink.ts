/**
 * 站内双向互链（题库 ↔ 面经 ↔ 笔记）：构建期纯函数匹配，无 IO。
 * 匹配口径宁缺毋滥——词干匹配 + 公司名映射，匹配不到就不渲染区块。
 */
import { getAllQa, type QaItem } from "./qa"
import { getAllNotes, type NoteMeta } from "./notes"
import { getMianjingList, type MianjingMeta } from "./mianjing"
import { COMPANIES } from "./companies"

/** 公司中文名（面经 frontmatter）→ 公司 slug（题库 company 字段） */
export function companySlugOf(name: string): string | null {
  const hit = COMPANIES.find(
    (c) => name.includes(c.name) || c.aliases.some((a) => name.includes(a)),
  )
  return hit ? hit.slug : null
}

/** 笔记 slug 里的通用词段，不参与匹配 */
const STOP = new Set([
  "agent", "agents", "llm", "code", "multi", "interview", "why", "how",
  "basics", "practice", "strategy", "design", "system", "exactly", "once",
])

/** 从笔记 slug 提取主题词干：rag-kv-cache → [rag, kv, cache] */
export function noteStems(slug: string): string[] {
  return slug
    .split("-")
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .slice(0, 4)
}

function qaText(qa: QaItem): string {
  return (qa.question + " " + qa.tags.join(" ")).toLowerCase()
}

/** qa → 相关面经：按公司维度（该公司有面经实录才返回） */
export function relatedMianjingForQa(qa: QaItem): MianjingMeta[] {
  const comps = qa.company.split(",").map((s) => s.trim()).filter(Boolean)
  const names = new Set(
    comps
      .map((slug) => COMPANIES.find((c) => c.slug === slug)?.name)
      .filter(Boolean) as string[],
  )
  return getMianjingList().filter((m) =>
    [...names].some((n) => m.company.includes(n)),
  )
}

/** qa → 相关笔记：笔记词干命中该题文本（≥2 词干命中或唯一词干≥3字符命中） */
export function relatedNotesForQa(qa: QaItem, limit = 3): NoteMeta[] {
  const text = qaText(qa)
  const scored = getAllNotes()
    .map((n) => {
      const stems = noteStems(n.slug)
      const hits = stems.filter((s) => text.includes(s)).length
      const strong = stems.some((s) => s.length >= 4 && text.includes(s))
      return { n, score: hits + (strong ? 1 : 0) }
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.n)
}

/** 笔记 → 配套真题：笔记词干命中题目文本，取分最高 */
export function qaForNote(slug: string, limit = 4): QaItem[] {
  const stems = noteStems(slug)
  if (stems.length === 0) return []
  // 单一词干但足够特异（如 rag、moe）时，命中一题即算匹配
  const solo = stems.length === 1 && stems[0].length >= 3
  const list = getAllQa()
  return list
    .map((qa) => {
      const text = qaText(qa)
      const score = stems.reduce((acc, s) => acc + (text.includes(s) ? 1 : 0), 0)
      return { qa, score }
    })
    .filter((x) => x.score >= (solo ? 1 : 2))
    .sort((a, b) => b.score - a.score || a.qa.order - b.qa.order)
    .slice(0, limit)
    .map((x) => x.qa)
}

/** 面经 → 真题：公司聚合链接 + 按面经 tags 主题词挑题 */
export function qaForMianjing(
  m: MianjingMeta,
  limit = 4,
): { companySlug: string | null; items: QaItem[] } {
  const companySlug = companySlugOf(m.company)
  // 面经 tags 多为中文主题词（如「后训练」「评估」），与题库 tags 对齐
  const topics = m.tags.filter((t) => t !== "面经" && t.length >= 2)
  const list = getAllQa()
  const pool = companySlug
    ? list.filter((qa) => qa.company.split(",").map((s) => s.trim()).includes(companySlug))
    : list
  const items = pool
    .map((qa) => {
      const text = qaText(qa)
      const score = topics.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0)
      return { qa, score }
    })
    .filter((x) => x.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.qa)
  if (items.length < limit && companySlug) {
    for (const qa of pool) {
      if (items.length >= limit) break
      if (!items.includes(qa)) items.push(qa)
    }
  }
  return { companySlug, items }
}
