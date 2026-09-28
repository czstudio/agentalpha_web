import fs from "node:fs"
import path from "node:path"
import { CHAPTERS, PROJECTS, type ColumnChapter, type ProjectItem } from "@/lib/column"
import { getAllQa, type QaItem } from "@/lib/qa"
import { getAllGlossary, GLOSSARY_GROUPS, type GlossaryItem } from "@/lib/glossary"

/**
 * 学习路线（/roadmap）：把 12 章专栏、14 个分类题库、术语库与项目卡
 * 组装成「方向 → 章节顺序 → 题目 → 术语 → 项目」的结构。
 * 导语正文在 content/roadmap/<slug>.md（gemini 撰写，oil-tone 过闸）。
 */
export interface Roadmap {
  slug: string
  name: string
  /** 一句话定位（hero 副标题） */
  tagline: string
  /** 岗位关键词（索引页卡片与 SEO） */
  roles: string[]
  /** 章节学习顺序（CHAPTERS.no），渲染章节路线 */
  chapters: number[]
  /** 题库分类（lib/interview categories cat 词表） */
  cats: string[]
  /** 术语分组（lib/glossary GLOSSARY_GROUPS.group） */
  glossaryGroups: string[]
  /** 项目卡分组（lib/column PROJECTS.group） */
  projectGroups: string[]
}

export const ROADMAPS: Roadmap[] = [
  {
    slug: "agent-developer",
    name: "Agent 应用开发",
    tagline: "从会调模型到能交付 Agent 系统：架构、记忆、工具调用、多智能体与评估。",
    roles: ["AI Agent 开发", "Agent 算法", "AI 应用工程师"],
    chapters: [4, 8, 1, 5, 7, 2, 12, 11],
    cats: ["agent", "memory", "tooluse", "multiagent", "prompt", "safety", "eval"],
    glossaryGroups: ["agent", "eval"],
    projectGroups: ["Agent 架构项目", "多智能体项目", "工具调用项目", "评测项目"],
  },
  {
    slug: "rag-engineer",
    name: "RAG 工程师",
    tagline: "把知识库做成能上线、能评测、能迭代的产品：检索、重排、评测与治理。",
    roles: ["RAG 工程师", "大模型应用开发", "AI 搜索/问答"],
    chapters: [1, 7, 4, 2, 12, 11],
    cats: ["rag", "eval", "enterprise"],
    glossaryGroups: ["rag"],
    projectGroups: ["RAG 项目"],
  },
  {
    slug: "llm-application",
    name: "LLM 应用开发",
    tagline: "应用侧的全栈路线：基础、微调、提示工程与企业落地，广度优先。",
    roles: ["大模型应用开发", "AI 产品工程师", "AI 后端"],
    chapters: [2, 3, 4, 8, 10, 7, 11, 12],
    cats: ["basics", "finetune", "prompt", "enterprise", "safety"],
    glossaryGroups: ["basics", "finetune"],
    projectGroups: ["LLM 基础项目", "LLM 训练项目"],
  },
  {
    slug: "ai-infra",
    name: "AI Infra",
    tagline: "推理与训练的底层：KV Cache、推理框架、量化与显存账，深挖工程细节。",
    roles: ["AI Infra", "推理引擎", "训练框架"],
    chapters: [2, 9, 3, 12, 11],
    cats: ["inference", "finetune"],
    glossaryGroups: ["inference"],
    projectGroups: ["编程题项目"],
  },
]

export function getRoadmap(slug: string): Roadmap | null {
  return ROADMAPS.find((r) => r.slug === slug) || null
}

/** 方向的章节列表（按 ROADMAP.chapters 顺序） */
export function roadmapChapters(r: Roadmap): ColumnChapter[] {
  return r.chapters
    .map((no) => CHAPTERS.find((c) => c.no === no))
    .filter((c): c is ColumnChapter => Boolean(c))
}

/** 方向的题库分类与题目数 */
export function roadmapCats(r: Roadmap): { cat: string; name: string; count: number }[] {
  const all = getAllQa()
  return r.cats
    .map((cat) => ({
      cat,
      name: cat,
      count: all.filter((item) => item.category === cat).length,
    }))
    .filter((entry) => entry.count > 0)
}

/** 方向的术语（按分组取） */
export function roadmapTerms(r: Roadmap): GlossaryItem[] {
  const all = getAllGlossary()
  return all.filter((item) => r.glossaryGroups.includes(item.group))
}

/** 方向的项目卡 */
export function roadmapProjects(r: Roadmap): ProjectItem[] {
  return PROJECTS.filter((p) => r.projectGroups.includes(p.group))
}

/** 方向的题目总数 */
export function roadmapQaCount(r: Roadmap): number {
  const all = getAllQa()
  return all.filter((item) => r.cats.includes(item.category)).length
}

export { GLOSSARY_GROUPS }

const roadmapRoot = path.join(process.cwd(), "content", "roadmap")

/** 方向导语正文（content/roadmap/<slug>.md，gemini 撰写）；没有文件则空串 */
export function getRoadmapLead(slug: string): string {
  const file = path.join(roadmapRoot, `${slug}.md`)
  if (!fs.existsSync(file)) return ""
  const raw = fs.readFileSync(file, "utf8")
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/)
  return (match ? match[1] : raw).trim()
}
