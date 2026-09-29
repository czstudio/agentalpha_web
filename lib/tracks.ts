import { getAllQa, type QaItem } from "@/lib/qa"

/**
 * 岗位维度词表与聚合。
 * track 字段的口径：题目考察重心对应的岗位方向（来自公开面经与 JD 归纳），
 * 一道题可跨岗位（逗号分隔多值）。
 */
export interface Track {
  slug: string
  name: string
  /** 该岗位一句话画像（筛选/导语文案用） */
  note: string
}

export const TRACKS: Track[] = [
  { slug: "agent-dev", name: "Agent 开发", note: "Agent 应用与平台工程：工具调用、上下文工程、记忆系统、多 Agent 编排、上线与稳定性。" },
  { slug: "agent-algo", name: "Agent 算法", note: "Agentic RL 与后训练：SFT/RLHF/DPO/GRPO、奖励设计、轨迹数据、评测对齐。" },
  { slug: "ai-app", name: "AI 算法应用", note: "大模型应用算法：RAG 全链路、检索排序、微调选型、业务效果优化。" },
  { slug: "multimodal", name: "多模态算法", note: "视觉语言模型与多模态：融合架构、CLIP 系、VLM 评估与训练。" },
  { slug: "infra", name: "AI Infra", note: "推理与训练系统：vLLM、量化、并行策略、显存与吞吐优化、服务化。" },
  { slug: "algo-general", name: "通用算法基础", note: "各岗通用底座：Transformer、注意力、采样参数、正则化等基础原理。" },
]

export function getTrack(slug: string): Track | null {
  return TRACKS.find((t) => t.slug === slug) || null
}

/** 该岗位方向的速答题（frontmatter track 字段，逗号分隔多值） */
export function getQaByTrack(trackSlug: string): QaItem[] {
  return getAllQa().filter((item) =>
    item.track
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .includes(trackSlug),
  )
}
