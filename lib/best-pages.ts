import { getAllQa, type QaItem } from "@/lib/qa"
import { getAllInterview } from "@/lib/interview"
import { getAllGlossary } from "@/lib/glossary"

/**
 * 宽泛词聚合大页（/interview/best/<slug>）的数据层。
 * 目标：搜索用户搜「Agent 面试题」这类宽泛词时，命中一个把该方向
 * 高频题 + 一句话答案全部装下的单页（对标小林 74 题单页 / JavaGuide
 * 聚合页的占位形态），而不是只有链接的目录页。
 */

export interface BestPageDef {
  slug: string
  /** 页面 H1 与 SEO 主词 */
  title: string
  /** meta description */
  description: string
  keywords: string[]
  /** 收录的分类白名单（有序） */
  cats: string[]
  /** 每分类收几道（合计约 40-60，页面保持单屏可滚完） */
  perCat: number
  /** 开篇导语 */
  intro: string
}

export const BEST_PAGES: BestPageDef[] = [
  {
    slug: "agent",
    title: "AI Agent 面试题（60 问，含答案）",
    description:
      "AI Agent 面试高频 60 问，每题附一句能直接说出口的答案：Agent 架构、ReAct、记忆系统、工具调用、MCP、多智能体、Agentic RL、评估。来自 2582 道真题图谱与 2400+ 篇真题解析的归纳，附考察意图与追问链的完整解析链接。",
    keywords: ["AI Agent 面试题", "Agent 面试", "Agent 八股文", "大模型 Agent 面试", "Agent 开发面试"],
    cats: ["agent", "memory", "multiagent", "tooluse", "eval"],
    perCat: 12,
    intro:
      "以下 60 道是 Agent 岗面试被问最多的题，来自社区 2582 道真题图谱的高频聚类。每题先给一句能直接说出口的答案——时间紧就背结论，每题右侧有完整解析（含面试官追问与常见坑）。",
  },
  {
    slug: "rag",
    title: "RAG 面试题（50 问，含答案）",
    description:
      "RAG 面试高频 50 问，每题附一句话答案：切分、Embedding、混合检索、Rerank、评测、GraphRAG、知识库更新、权限过滤。字节/阿里/百度 RAG 岗高频归纳，附完整解析链接。",
    keywords: ["RAG 面试题", "RAG 八股文", "RAG 面试", "大模型 RAG 面试", "检索增强生成 面试"],
    cats: ["rag"],
    perCat: 50,
    intro:
      "RAG 是面试问得最密的方向（真题图谱 1094 道关联题）。以下 50 道按「基础 → 检索 → 生成 → 评测 → 工程化」排列，每题一句话答案先行，完整解析链接在右侧。",
  },
  {
    slug: "llm",
    title: "大模型面试八股文（60 问，含答案）",
    description:
      "大模型面试高频 60 问：Transformer、KV Cache、训练微调（LoRA/RLHF/GRPO）、推理部署（vLLM/量化/投机解码）、幻觉与评估。算法岗与应用岗通用，每题一句话答案 + 完整解析链接。",
    keywords: ["大模型面试八股文", "大模型面试题", "LLM 面试题", "大模型 八股", "GPT 面试题"],
    cats: ["basics", "finetune", "inference"],
    perCat: 20,
    intro:
      "大模型岗绕不开的地基题：架构、训练、推理三层各 20 问。每题一句话答案先行——面试现场先给结论再展开，完整解析看右侧链接。",
  },
  {
    slug: "mcp",
    title: "MCP 面试题（20 问，含答案）",
    description:
      "MCP（模型上下文协议）面试高频 20 问：协议结构、传输方式、与 Function Calling 区别、安全风险、server 实现。2026 年工具调用方向最高频新增考点。",
    keywords: ["MCP 面试题", "MCP 是什么", "模型上下文协议", "MCP 八股"],
    cats: ["tooluse"],
    perCat: 20,
    intro:
      "MCP 是 2025-2026 面试的新增必考点（字节/阿里/百度/B站都问）。以下 20 道从「是什么」问到「手写一个 server」，每题一句话答案先行。",
  },
]

export interface BestSection {
  cat: string
  catName: string
  items: QaItem[]
}

export interface BestPageData {
  def: BestPageDef
  sections: BestSection[]
  total: number
  terms: { slug: string; term: string; oneLine: string }[]
  tkCount: number
}

export function getBestPage(slug: string): BestPageData | null {
  const def = BEST_PAGES.find((p) => p.slug === slug)
  if (!def) return null
  const all = getAllQa()
  const sections: BestSection[] = []
  for (const cat of def.cats) {
    const items = all
      .filter((item) => item.category === cat)
      .slice(0, def.perCat)
    if (items.length) sections.push({ cat, catName: cat, items })
  }
  const total = sections.reduce((n, s) => n + s.items.length, 0)
  const cats = new Set(def.cats)
  const terms = getAllGlossary()
    .filter((t) => cats.has(t.group))
    .slice(0, 12)
    .map((t) => ({ slug: t.slug, term: t.term, oneLine: t.oneLine }))
  const tkCount = getAllInterview().filter((p) => p.slug.includes("-tk")).length
  return { def, sections, total, terms, tkCount }
}
