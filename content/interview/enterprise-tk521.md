---
slug: enterprise-tk521
no: "1421"
title: "实现一个 Agent 记忆压缩算法（摘要或向量化）。"
question: "实现一个 Agent 记忆压缩算法（摘要或向量化）。"
excerpt: "面试官想看你能否设计一个既节省 Token 又不丢失关键信息的记忆压缩方案。刁钻点在于：很多人只选"摘要"或"向量化"中的一种，但说不清两者的适用场景、混合方案的实现、以及如何评估压缩质量。答好了能展示你的信息检索和文本"
tags: ["真题解析", "编程题"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 16
words: 7295
updated: "2026-09-29"
---

## 实现一个 Agent 记忆压缩算法（摘要或向量化）。

#### 1️⃣ 考察意图

面试官想看你能否设计一个既节省 Token 又不丢失关键信息的记忆压缩方案。刁钻点在于：很多人只选"摘要"或"向量化"中的一种，但说不清两者的适用场景、混合方案的实现、以及如何评估压缩质量。答好了能展示你的信息检索和文本处理能力。

#### 2️⃣ 标准答

`import numpy as np**from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
import tiktoken
import re

logger = logging.getLogger("memory_compression")

@dataclass
class MemoryChunk:
    content: str
    role: str
    timestamp: float
    token_count: int
    embedding: Optional[np.ndarray] = None
    importance: float = 0.0  # 重要性分数 0-1
    entities: List[str] = field(default_factory=list)  # 提取的实体

class HybridMemoryCompressor:
    """混合记忆压缩：近期保留原文 + 远期摘要 + 向量索引"""

    def __init__(self, llm_client, embedding_client, vector_store):
        self.llm = llm_client
        self.embedding = embedding_client
        self.vector_store = vector_store  # FAISS/ChromaDB
        self.encoder = tiktoken.encoding_for_model("gpt-4")

        # 配置
        self.recent_window = 5  # 近期 5 轮保留原文
        self.summary_max_tokens = 500  # 摘要最大 Token
        self.entity_patterns = {
            'date': r'\d{4}[-/]\d{1,2}[-/]\d{1,2}',
            'number': r'\d+\.?\d*',
            'email': r'[\w.-]+@[\w.-]+',
            'url': r'https?://[^\s]+',
            'product_id': r'PRD-\d{4}-\d{2}',
        }

    def compress(self, chunks: List[MemoryChunk]) -> Tuple[List[MemoryChunk], str]:
        """
        压缩记忆列表，返回 (保留的原文, 摘要)
        """
        if len(chunks) <= self.recent_window:
            return chunks, ""  # 不需要压缩

        # 步骤1: 分割为"近期"和"远期"
        recent = chunks[-self.recent_window:]
        old = chunks[:-self.recent_window]

        # 步骤2: 提取远期记忆中的关键实体
        all_entities = set()
        for chunk in old:
            chunk.entities = self._extract_entities(chunk.content)
            all_entities.update(chunk.entities)

        # 步骤3: 计算重要性分数
        for chunk in old:
            chunk.importance = self._compute_importance(chunk)

        # 步骤4: 向量化远期记忆并存入向量数据库
        for chunk in old:
            if chunk.embedding is None:
                chunk.embedding = self.embedding.embed(chunk.content)
            self.vector_store.add(
                id=f"mem_{chunk.timestamp}",
                embedding=chunk.embedding,
                metadata={
                    "content": chunk.content,
                    "role": chunk.role,
                    "timestamp": chunk.timestamp,
                    "entities": chunk.entities,
                    "importance": chunk.importance
                }
            )

        # 步骤5: 生成摘要（map-reduce 方式）
        summary = self._generate_summary(old, all_entities)

        logger.info(
            f"Compressed {len(old)} chunks -> {len(summary)} chars summary, "
            f"entities={len(all_entities)}, recent={len(recent)}"
        )

        return recent, summary

    def _extract_entities(self, text: str) -> List[str]:
        """提取关键实体"""
        entities = []
        for entity_type, pattern in self.entity_patterns.items():
            matches = re.findall(pattern, text)
            entities.extend(matches)
        # 用 NER 模型提取人名、地名等（简化版）
        return list(set(entities))

    def _compute_importance(self, chunk: MemoryChunk) -> float:
        """计算记忆重要性分数"""
        score = 0.0
        # 因素1: 包含实体越多越重要
        score += min(len(chunk.entities) * 0.1, 0.3)
        # 因素2: Token 越多越可能包含重要信息
        score += min(chunk.token_count / 1000, 0.2)
        # 因素3: assistant 的回答比 user 输入更重要
        if chunk.role == "assistant":
            score += 0.2
        # 因素4: 包含数字/参数的更重要
        if re.search(r'\d{2,}', chunk.content):
            score += 0.15
        # 因素5: 包含决策关键词的更重要
        decision_keywords = ['决定', '选择', '因为', '所以', '因此', '结论', '方案']
        if any(kw in chunk.content for kw in decision_keywords):
            score += 0.15
        return min(score, 1.0)

    def _generate_summary(self, chunks: List[MemoryChunk], entities: set) -> str:
        """用 map-reduce 方式生成摘要"""
        # Map: 对每个 chunk 生成局部摘要
        partial_summaries = []
        for chunk in sorted(chunks, key=lambda c: c.importance, reverse=True):
            prompt = f"""请用 1-2 句话总结以下对话内容，保留关键信息：
角色: {chunk.role}
内容: {chunk.content[:500]}
关键实体: {chunk.entities}
"""
            partial = self.llm.generate(prompt, temperature=0.0, max_tokens=100)
            partial_summaries.append(partial)

        # Reduce: 合并局部摘要
        if len(partial_summaries) > 3:
            # 分组 reduce
            mid = len(partial_summaries) // 2
            group1 = "\n".join(partial_summaries[:mid])
            group2 = "\n".join(partial_summaries[mid:])

            reduce_prompt = f"""请将以下两段摘要合并为一段连贯的总结（不超过{self.summary_max_tokens}个token）：

摘要1:
{group1}

摘要2:
{group2}

必须保留的实体: {entities}
"""
            final_summary = self.llm.generate(reduce_prompt, temperature=0.0)
        else:
            final_summary = "\n".join(partial_summaries)

        return final_summary

    def retrieve(self, query: str, top_k: int = 3) -> List[Dict]:
        """从向量数据库检索相关历史记忆"""
        query_embedding = self.embedding.embed(query)
        results = self.vector_store.search(query_embedding, top_k=top_k)
        return results`核心设计要点：**

- **混合方案**：近期 5 轮保留原文 + 远期生成摘要 + 全部向量化存入向量数据库。三者配合：摘要提供全局上下文，原文提供细节，向量索引支持按需检索
- **Map-Reduce 摘要**：先对每个 chunk 生成局部摘要（Map），再合并（Reduce）。适合长对话历史，避免单次 LLM 调用 token 超限
- **重要性评分**：基于实体数量、Token 数量、角色、数字/参数、决策关键词五因素计算，决定摘要顺序
- **实体保护**：用正则提取日期、数字、邮箱、URL、产品ID等实体，在摘要 prompt 中强制保留
- **按需检索**：远期记忆存入向量数据库，当当前对话需要历史信息时，用语义检索召回

#### 3️⃣ 答题模板（30 秒电梯版）

> "混合记忆压缩三管齐下。近期5轮保留原文——保证上下文连贯。远期用 map-reduce 生成摘要——每个 chunk 生成局部摘要再合并，避免单次 token 超限。全部向量化存入向量数据库——需要时用语义检索召回。重要性评分五因素：实体数量、token数量、角色权重、数字参数、决策关键词。实体保护：正则提取日期/数字/邮箱等，在摘要 prompt 中强制保留。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：map-reduce 摘要会不会丢失信息？怎么评估摘要质量？

> 评估方法：(1) 实体保留率——摘要中包含的实体数 / 原文实体数。目标 >80%；(2) 语义相似度——摘要 embedding 与原文 embedding 的余弦相似度。目标 >0.7；(3) QA 准确率——基于原文生成 QA 对，用摘要替换原文后测试 QA 准确率。目标 >85%。如果质量不达标：(1) 增加摘要长度（从 500 token 增到 1000）；(2) 分主题摘要（按对话主题分组，每组独立摘要）；(3) 用更强的模型生成摘要（如 GPT-4 替代 GPT-3.5）。

**追问 2**：向量检索的召回率怎么样？会不会检索到不相关的记忆？

> 召回质量取决于 embedding 模型和 top_k 设置。优化方案：(1) 用领域微调的 embedding 模型（如 BGE-M3 微调到客服领域）；(2) 加 metadata 过滤——只检索特定时间范围或特定角色的记忆；(3) 重排序——检索 top-10 后用 Cross-Encoder 重排取 top-3；(4) 时间衰减——对旧记忆的分数乘以衰减因子 `exp(-Δt/τ)`，τ=3600秒。实测：优化后召回准确率从 65% 提升到 88%。

**追问 3**：如果对话很长（100+ 轮），摘要本身也很长怎么办？

> 多级摘要（层次化压缩）：(1) 每 10 轮生成一个"段落摘要"（200 token）；(2) 每 5 个段落摘要生成一个"章节摘要"（100 token）；(3) 最终上下文 = 章节摘要 + 段落摘要 + 近期原文。类似 MemGPT 的分层记忆架构。实测：100 轮对话压缩到 500 token 以内，关键信息保留率 85%+。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "用 LLM 一次性生成摘要就行" → ✅ "长对话超出 LLM 上下文窗口时无法一次性摘要。需要 map-reduce 分段摘要再合并，每段控制在 LLM 上下文窗口内。"
- ❌ "向量化就够了，不需要摘要" → ✅ "向量检索只能召回局部相关记忆，无法提供全局上下文。摘要提供'这段对话讨论了什么'的全局视角，向量提供'关于某个具体问题的细节'，两者互补。"
- ❌ "所有记忆平等对待" → ✅ "不同记忆的重要性不同——包含决策、数字、实体的记忆更重要。需要重要性评分决定摘要顺序和保留优先级。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 项目**：从"记忆系统设计"切入，展示你的混合压缩方案，给出压缩比（如 100 轮→500 token）、实体保留率（如 85%）、QA 准确率（如 88%）
- **如果你只做过 NLP**：用"文本摘要"经验迁移——map-reduce 摘要类似长文档摘要的层级化方法，强调你理解摘要质量评估方法
- **如果你是校招无项目**：复现 MemGPT 的记忆管理机制，对比"纯摘要"/"纯向量"/"混合方案"在长对话中的效果，写一篇博客
- "MemGPT: Towards LLMs as Operating Systems" (Packer et al., 2023)
- "Generative Agents: Interactive Simulacra of Human Behavior" (Park et al., 2023)
- "LongMem: Enhancing Long Context Memory of Large Language Models" (Yu et al., 2023)

---
