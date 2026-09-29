---
slug: rag-tk203
no: "1103"
title: "从用户提问到模型回答，中间数据流是怎么走的"
question: "从用户提问到模型回答，中间数据流是怎么走的"
excerpt: "面试官想看你是否真正理解 RAG 系统从输入到输出的完整数据流，而不仅仅是背出“检索-生成”两个词。这是典型的系统设计 + 工程取舍题，刁钻点在于：多数人只讲流程骨架，但讲不清每个环节的数据形态变化（字符串→向量→排序分"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4699
updated: "2026-09-29"
---

## 4 从用户提问到模型回答，中间数据流是怎么走的

`P1` · `rag`

🏷 标签：`rag`, `data-flow`, `pipeline`, `tracing`

#### 1️⃣ 考察意图

面试官想看你是否真正理解 RAG 系统从输入到输出的完整数据流，而不仅仅是背出“检索-生成”两个词。这是典型的**系统设计 + 工程取舍**题，刁钻点在于：多数人只讲流程骨架，但讲不清每个环节的数据形态变化（字符串→向量→排序分数→拼接文本→token 序列）和关键决策点（如 query 改写时机、chunk 粒度对检索的影响）。答好了能展示你对 RAG pipeline 有端到端的掌控力，能定位瓶颈、做优化，这是大厂做 RAG 落地最看重的硬实力。

#### 2️⃣ 标准答

RAG 数据流可以拆成 6 个阶段，每个阶段数据形态和关键操作都不同：

**阶段 1：Query 预处理与改写**

- **输入**：用户原始字符串（如“苹果公司最新财报”）
- **操作**：分词、拼写纠正（用 SymSpell 或自建词典）、停用词过滤。更关键的是 **Query 改写**：用一个小 LLM（如 GPT-3.5-turbo）或规则生成 2-3 个变体（如“苹果 2024 Q3 财报”“AAPL 收益报告”），因为用户口语化 query 和文档库的书面语存在语义 gap。
- **输出**：多个 query 字符串（原始 + 改写），每个约 10-50 tokens。
- **坑**：改写太多会引入噪声，实践中【通用知识】通常保留 3 个变体，用 BM25 粗筛后再合并结果。

**阶段 2：Embedding 编码**

- **输入**：每个 query 字符串
- **操作**：用 embedding 模型（如 text-embedding-3-small，维度 1536）编码为稠密向量。注意**归一化**：向量必须 L2 归一化，否则内积相似度会受向量长度干扰。
- **输出**：多个 1536 维浮点向量，每个 query 对应一个。
- **工程取舍**：用 batch 编码（比如一次送 8 个 query）能提升吞吐，但延迟会增加一个 batch 的等待时间。线上服务通常单 query 编码，离线批量处理才用 batch。

**阶段 3：向量检索（ANN）**

- **输入**：query 向量
- **操作**：在向量数据库（如 Milvus、FAISS）中执行近似最近邻搜索。常用 HNSW 索引，参数 efSearch=128（控制搜索精度-速度 trade-off）。返回 top-k 候选文档 ID 及余弦相似度分数。
- **输出**：例如 top-50 的 (doc_id, score) 对。
- **坑**：HNSW 索引在插入新文档后需要重建或增量更新，否则召回率会下降。线上方案是双索引轮换：一个用于查询，一个后台重建。

**阶段 4：重排序（Rerank）**

- **输入**：top-50 候选文档原文 + query
- **操作**：用 cross-encoder（如 BGE-Reranker-v2-m3）对每个 (query, doc) 对计算精确匹配分数。cross-encoder 比双塔 embedding 更准，但计算量是 O(n) 而非 O(1)，所以只对 top-k 做。
- **输出**：重新排序后的 top-5 文档 ID 及分数。
- **工程取舍**：重排序模型通常用 FP16 推理，batch size=1 时延迟约 20-50ms。如果对延迟敏感（<200ms），可以跳过重排序，只靠 embedding 检索，但答案质量会下降 10-15%（【通用知识】参考 KDD 2021 论文）。

**阶段 5：Prompt 拼接**

- **输入**：top-5 文档原文 + 原始 query
- **操作**：按 prompt 模板拼接，例如：注意**上下文窗口限制**：如果文档总长度超过 LLM 的 max_tokens（如 4096），需要截断或分 chunk。常用策略是保留最相关的文档全文，截断不相关的。
- **输出**：一个字符串，约 2000-4000 tokens。
- **坑**：文档顺序影响 LLM 注意力——最相关的文档放前面，否则 LLM 可能忽略它（“lost in the middle”现象，参考 Liu et al. 2023）。

**阶段 6：LLM 生成与后处理**

- **输入**：拼接后的 prompt（token 序列）
- **操作**：LLM（如 GPT-4、Claude 3）自回归生成，用 FlashAttention 加速。生成后可能做后处理：去重（如果 LLM 重复了）、格式化（加 bullet points）、引用标注（标记答案来自哪个文档）。
- **输出**：最终用户看到的文本字符串。
- **坑**：LLM 可能“幻觉”出不在 context 中的信息。解决方案是加 system prompt 约束（“只基于 context 回答”），并在后处理中用 NER 检测实体是否在 context 中出现。

**总结**：整个流程从字符串到向量到排序分数再到 token 序列，每个阶段都有明确的输入输出和 trade-off。实际落地时，用 OpenTelemetry 打点每个阶段的耗时，能快速定位瓶颈（比如 embedding 编码或重排序是主要延迟源）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：数据形态变化、关键操作、工程取舍。第一，输入是用户 query 字符串，经过预处理和改写生成多个变体；第二，每个变体通过 embedding 模型编码为向量，在向量数据库做 ANN 检索，返回 top-k 候选；第三，候选文档经重排序后与 query 拼接成 prompt，送入 LLM 生成答案。每个环节都有坑：比如 query 改写数量、HNSW 索引更新策略、文档顺序影响 LLM 注意力。总结一句：RAG 数据流是字符串→向量→排序分数→token 序列的转换，每个转换点都是优化机会。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果用户 query 很短（比如“苹果”），检索效果差怎么办？

> 这是 query 稀疏性问题。应对：1）Query 改写阶段生成扩展变体，比如“苹果公司 2024 年 财报”“苹果手机 最新 评测”，用同义词或知识图谱扩展。2）混合检索：同时用 BM25（基于关键词）和向量检索，BM25 对短 query 更鲁棒，因为不依赖语义编码。3）如果用户历史可用，用 session 上下文补全 query（比如之前问了“苹果股价”，现在问“最新”就补成“苹果最新股价”）。工程上，短 query 的 embedding 向量质量差，所以优先用 BM25 召回 top-100，再向量检索重排。

**追问 2**：如何保证检索结果不重复（比如多个 chunk 来自同一文档）？

> 这是去重问题。应对：1）在重排序阶段，对候选文档按 source 分组，每个 source 最多保留 1-2 个 chunk。2）用 Maximal Marginal Relevance（MMR）算法，在相关性和多样性之间做 trade-off：先选最相关的，然后选与已选集合差异最大的。3）更简单的方法：在 prompt 拼接时，如果多个 chunk 来自同一文档，只保留最相关的一个，避免 LLM 看到冗余信息。坑：过度去重可能丢失关键细节，所以 MMR 的 lambda 参数（控制多样性权重）需要调优，【通用知识】通常设为 0.3-0.5。

**追问 3**：如果 LLM 生成答案时引用了不在 context 中的信息，怎么检测？

> 这是幻觉检测。应对：1）后处理阶段用 NER 提取答案中的实体（人名、日期、数字），然后检查每个实体是否在 context 文档中出现。2）更精确的方法：用一个小模型（如 DeBERTa-based 的 NLI 模型）判断答案是否被 context 蕴含（entailment）。如果 NLI 输出“contradiction”或“neutral”，则标记为幻觉。3）工程上，可以在 prompt 中加入“请只基于 context 回答，否则说‘无法回答’”，并设置 LLM 的 temperature=0 减少随机性。坑：NLI 模型有延迟（约 10ms/判断），只对关键答案做，不全部检测。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只讲“检索-生成”两步，不提 query 改写、重排序、后处理等中间环节 → ✅ 必须拆成 5-6 个阶段，每个阶段说明输入输出和数据形态变化。
- ❌ 说“向量检索用余弦相似度就行”，不提 HNSW 索引参数或索引更新策略 → ✅ 要给出具体工程细节（如 efSearch=128、双索引轮换），展示落地经验。
- ❌ 认为重排序是可选且无代价的 → ✅ 必须说明重排序的延迟 trade-off（20-50ms vs 10-15% 质量提升），并给出适用场景（高精度场景必用，低延迟场景跳过）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从实际优化经历切入，比如“我在项目中用 OpenTelemetry 打点发现 embedding 编码占 40% 延迟，于是改用更小的模型 text-embedding-3-small 并做 batch 编码，延迟降低 30%”。
- **如果你只做过传统 NLP**：用信息检索类比，比如“这就像传统 IR 系统的 query 解析-倒排索引-排序，但 RAG 多了 embedding 编码和 LLM 生成两个新阶段，每个阶段都有新的 trade-off”。
- **如果你是校招无项目**：聚焦论文复现，比如“我读过《Lost in the Middle》论文，知道文档顺序影响 LLM 注意力，所以在 prompt 拼接时把最相关文档放前面”。
- 《Lost in the Middle: How Language Models Use Long Contexts》（Liu et al., 2023）
- 《When Not to Trust Your LLM: Detecting Hallucinations with NLI》（KDD 2021）
- 《RAGAS: Automated Evaluation of Retrieval Augmented Generation》（Shahul et al., 2023）
- 《HNSW: Hierarchical Navigable Small World Graphs for Approximate Nearest Neighbor Search》（Malkov & Yashunin, 2016）
- 《Query Rewriting for Retrieval-Augmented Generation》（Google Research, 2023）

---
