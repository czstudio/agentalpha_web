---
slug: rag-tk093
no: "993"
title: "09｜Agent 如何利用上下文信息增强 RAG 检索"
question: "09｜Agent 如何利用上下文信息增强 RAG 检索"
excerpt: "面试官想考察你是否理解 RAG 在对话场景下的核心问题：静态检索 vs 动态上下文。这不是背概念题，而是系统设计 + 工程取舍题。刁钻点在于：多数人只会说“把历史拼接进 query”，但忽略了上下文长度爆炸、噪声引入、以"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3556
updated: "2026-09-29"
---

## 09｜Agent 如何利用上下文信息增强 RAG 检索

`P1` · `rag`

🏷 标签：`agent`, `rag`, `context`, `retrieval`

#### 1️⃣ 考察意图

面试官想考察你是否理解 RAG 在对话场景下的核心问题：**静态检索 vs 动态上下文**。这不是背概念题，而是**系统设计 + 工程取舍**题。刁钻点在于：多数人只会说“把历史拼接进 query”，但忽略了上下文长度爆炸、噪声引入、以及 Agent 记忆与检索的协同。答好了能展示你对 RAG 系统从检索到生成整条链路的把控力，以及处理真实对话数据（如 MultiWOZ）的实战经验。

#### 2️⃣ 标准答

核心思路：Agent 利用上下文增强 RAG 检索，本质是**将对话历史、用户意图、系统状态转化为检索信号**，避免“问东答西”。具体分 5 个层面：

- **上下文压缩（Context Compression）**将冗长对话历史压缩为结构化摘要或关键实体列表。方法：用 LLM 生成“当前用户目标摘要”（如“用户想订餐厅，偏好中餐、人均 200”），替代原始历史。
- 工具：LangChain 的 `ContextualCompressionRetriever`，或自定义 prompt 压缩。
- 坑：压缩会丢失细节（如用户刚改过时间），需保留最近 1-2 轮原始文本作为 fallback。
- Trade-off：压缩减少 token 开销（从 4k 到 200），但可能丢失长程依赖；适合高频对话，不适合法律等需完整记录的场景。
上下文感知查询重写（Context-Aware Query Rewriting）将当前 query 与历史结合，生成自包含的检索 query。
- 方法：用 LLM 或小模型（如 T5-base）做 query rewriting，例如“它好吃吗？”→“北京烤鸭店味道如何？”。
- 论文参考：`Query2Doc`（2023）用 LLM 生成伪文档辅助检索。
- 工程实现：在 Agent 的 `retrieve` 步骤前插入 rewrite 模块，缓存重写结果避免重复计算。
- 坑：重写可能引入幻觉（如用户没提的实体），需用 NER 校验实体一致性。
动态索引过滤（Dynamic Index Filtering）根据上下文（如时间、领域、用户角色）缩小检索范围。
- 方法：在向量数据库（如 Milvus）中为文档打标签（`domain=restaurant`），检索时用 `filter` 参数限定。
- 示例：用户问“推荐一个”，Agent 从对话状态中提取 `domain=hotel`，只检索酒店文档。
- 优势：大幅提升召回率（从 60% 到 85%），降低无关噪声。
- 坑：标签体系需提前设计，动态领域切换时可能漏检（如用户从订餐改问天气）。
记忆增强检索（Memory-Augmented Retrieval）利用 Agent 的短期记忆（如 ConversationBufferMemory）存储已检索结果，避免重复检索。
- 方法：维护一个 `retrieval_cache`，key 为 query embedding，value 为文档 ID 列表；命中时直接返回。
- 进阶：用 `Recency` 和 `Importance` 加权，优先返回最近或高相关结果（类似 MemGPT 的 tiered memory）。
- 坑：缓存过期问题——用户改口后（如“算了，换中餐”），旧缓存需失效，用 `context_hash` 检测变化。
结构化上下文编码（Structured Context Encoding）将上下文编码为向量，与 query 向量拼接或交叉注意力。
- 方法：用 ColBERT 的 late interaction 或 Cohere 的 `rerank` 模型，将历史作为额外输入。
- 论文：`REPLUG`（2023）将检索结果作为上下文，再生成 query 的 embedding。
- 坑：计算成本高（O(n*m)），适合离线或低延迟场景；线上常用简单拼接 + 轻量 rerank。

**实际落地坑 + 解法**：在客服场景中，用户说“上次那个问题还没解决”，Agent 需从历史中定位“上次问题”。解法：用 `session_id` 索引对话，提取最近 3 轮中的问题实体（如“退款失败”），作为 query 前缀。效果：检索准确率从 72% 提升至 91%。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，上下文压缩与查询重写，解决历史噪声和 query 歧义；第二，动态索引过滤与记忆增强，提升检索效率和准确性；第三，结构化编码，处理复杂上下文。总结一句：核心是让 Agent 把对话状态转化为检索信号，而非简单拼接历史。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：上下文压缩时，如何平衡压缩率和信息保留？

> 用**分层压缩**：对最近 2 轮保留原文，对更早历史用 LLM 生成 50 字摘要。设置 `compression_ratio` 阈值（如 0.3），当压缩后 token 数超过原始 30% 时回退。实战中，用 `rouge-l` 评估摘要与原文的实体覆盖率，低于 0.7 时触发重压缩。

**追问 2**：动态索引过滤时，如果用户跨领域查询（如先订餐后问天气），如何避免过滤失效？

> 用**领域切换检测**：在 Agent 的 `state` 中维护 `current_domain`，当用户 query 的 embedding 与当前领域文档的相似度低于阈值（如 0.5）时，触发全库检索。同时，保留一个 `fallback_index`（如通用知识库），确保跨领域不遗漏。

**追问 3**：记忆增强缓存如何应对用户改口？

> 用**上下文哈希**：对最近 3 轮对话计算 `hash(history_text)`，作为缓存 key 的一部分。当 hash 变化时，清空该 session 的缓存。进阶：用 `semantic_change_detection`（如 embedding 余弦距离 > 0.3）触发缓存失效，避免频繁清空。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “直接把所有历史拼接进 query，用长上下文模型处理。”→ ✅ 长上下文模型（如 GPT-4-128k）成本高且噪声多，应先用压缩或重写减少 token，再用动态过滤提升精度。
- ❌ “用 RAG 时，上下文只影响生成，不影响检索。”→ ✅ 上下文必须同时影响检索和生成：检索阶段用上下文重写 query 或过滤索引，生成阶段用上下文做 rerank 或 prompt 增强。
- ❌ “记忆增强就是存下所有检索结果，下次直接用。”→ ✅ 记忆需考虑时效性和相关性：用 recency 加权和 context_hash 检测变化，否则会返回过时信息。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“上下文压缩 + 动态过滤”切入，展示你在客服或问答系统中如何用 `ContextualCompressionRetriever` 和 Milvus filter 提升 recall@10 从 65% 到 82%。
- **如果你只做过传统 NLP**：用“查询重写”类比 query expansion，展示你如何用 T5 做 query rewriting，并在 TREC 数据集上对比 BM25 基线。
- **如果你是校招无项目**：聚焦“记忆增强”论文复现，用 MemGPT 的 tiered memory 思路，在 MultiWOZ 上实现一个 demo，对比缓存命中率。
- 《REPLUG: Retrieval-Augmented Black-Box Language Models》（2023）
- 《Query2Doc: Query Expansion via Pseudo-Documents》（2023）
- 《MemGPT: Towards LLMs as Operating Systems》（2023）
- LangChain 官方文档：Contextual Compression Retriever
- Milvus 文档：Dynamic Index Filtering with Scalar Fields

---
