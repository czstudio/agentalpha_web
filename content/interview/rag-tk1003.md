---
slug: rag-tk1003
no: "1903"
title: "哪些优化适合早做，哪些优化适合后做"
question: "哪些优化适合早做，哪些优化适合后做"
excerpt: "面试官想看你是否具备“工程优先级判断力”——不是背 RAG 组件列表，而是能根据投入产出比（ROI）和系统瓶颈，区分哪些优化是“地基”（必须早做，否则后续全白搭），哪些是“装修”（可以后做，甚至不做）。刁钻点在于：很多人"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4146
updated: "2026-09-29"
---

## 2 哪些优化适合早做，哪些优化适合后做

#### 1️⃣ 考察意图

面试官想看你是否具备“工程优先级判断力”——不是背 RAG 组件列表，而是能根据投入产出比（ROI）和系统瓶颈，区分哪些优化是“地基”（必须早做，否则后续全白搭），哪些是“装修”（可以后做，甚至不做）。刁钻点在于：很多人会无脑堆 Reranker 或 HyDE，但忽略了数据质量这个最大杠杆。答好了能展示你从“调参侠”到“系统架构师”的跃迁，懂 trade-off、懂 MVP 思维。

#### 2️⃣ 标准答

**早做优化（地基层，影响上限）**

- **数据清洗与 Chunking 策略**：这是 RAG 的“第一性原理”。脏数据（重复、噪声、格式混乱）会直接污染 Embedding 和检索结果。Chunking 策略（如基于语义的递归切分 vs 固定 512 token 切分）决定了检索粒度。**坑**：很多人直接上 LangChain 默认 RecursiveCharacterTextSplitter，结果 chunk 边界切断关键实体，导致 Recall 暴跌。**解法**：先用小样本标注，对比不同 chunk size（256/512/1024）在业务 query 上的 Recall@5，选最优。早做，因为改数据清洗和 chunking 成本低（改代码即可），但收益极高（Recall 能提 10-20%）。
- **Embedding 模型选择**：这是召回的天花板。选通用模型（如 text-embedding-ada-002）还是领域微调模型（如 BGE-large-zh 在金融语料上微调）？**Trade-off**：通用模型部署快但领域语义可能偏；微调模型效果好但需要标注数据和训练成本。早做是因为一旦检索链路跑通，换 Embedding 模型需要重新索引所有向量，成本巨大。**建议**：先用开源强基模型（如 BGE-M3）跑基线，若 Recall 不达标再考虑微调。
- **检索算法与索引构建**：HNSW（Hierarchical Navigable Small World）是默认选择，但参数（efConstruction、M）直接影响召回速度和精度。**坑**：有人直接调高 M 到 64 追求高召回，结果索引构建时间从 1 小时变成 10 小时，且内存暴涨。**解法**：先设 M=16, efConstruction=200 跑通，再根据延迟和 Recall 调优。早做是因为索引构建是离线任务，改参数成本低，但影响在线检索延迟。

**后做优化（装修层，锦上添花）**

- **Reranker（重排序）**：Reranker（如 Cohere Rerank、BGE-Reranker）能明显提升 Top-K 精度，但增加 50-200ms 延迟。**为什么后做**：如果基线 Recall@5 已经 80%，Reranker 只能提 5-10%，但延迟翻倍。**实际落地**：先确保检索基线（Recall@10 > 90%），再根据业务对精度的要求决定是否加 Reranker。如果用户对延迟敏感（如实时客服），宁可牺牲一点精度也不加。
- **查询改写与 HyDE**：HyDE（Hypothetical Document Embeddings）通过 LLM 生成伪文档来增强检索，但需要额外调用 LLM（成本高、延迟高）。**为什么后做**：它解决的是“query 太短/模糊”的问题，但如果数据清洗和 Embedding 已经做得很好，HyDE 的边际收益很低。**坑**：有人盲目上 HyDE，结果 LLM 生成的伪文档质量差，反而拉低 Recall。**解法**：先做 query 日志分析，如果 80% 的 query 长度 > 10 个词，HyDE 基本没用。
- **多模态/知识图谱融合**：这些是“豪华装修”。多模态（图片、表格）需要额外 OCR 和视觉模型，知识图谱需要实体链接和关系抽取，工程复杂度指数级上升。**为什么后做**：如果纯文本 RAG 已经满足 90% 的用户需求，多模态就是浪费资源。**建议**：先跑通纯文本 MVP，再根据用户反馈（如“为什么不能搜图片？”）决定是否投入。

**核心原则**：先保证核心链路（数据→Chunking→Embedding→检索）的 Recall 和延迟达标，再根据业务指标（如用户满意度、转化率）决定优化优先级。**不要为了炫技而优化**。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，早做的是数据清洗、Chunking 策略和 Embedding 模型选择，因为它们决定了检索的上限，且改造成本低但收益高；第二，后做的是 Reranker、HyDE 和多模态融合，因为它们边际收益递减且增加延迟或成本；第三，核心原则是‘先地基后装修’，用 Recall@K 和延迟指标驱动决策，避免过度优化。总结一句：RAG 优化的本质是工程取舍，不是技术堆砌。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 Chunking 策略很重要，具体怎么选？有没有通用的规则？

> **应对策略**：没有银弹，但有方法论。先分析文档类型：如果是长文档（如论文），用语义切分（如基于段落或标题）；如果是短文本（如 FAQ），用固定 256 token 切分。**具体做法**：用小样本（100 个 query + 对应文档）做 A/B 测试，对比不同 chunk size 和 overlap（如 128 token overlap 能减少边界切断）。**数字**：通用经验是 chunk size 在 256-512 之间，overlap 设为 10-20%。**坑**：不要用 LangChain 默认的 1000 token，那会导致检索粒度太粗。

**追问 2**：如果预算有限，只能做 3 个优化，你选哪 3 个？为什么？

> **应对策略**：选数据清洗、Chunking 策略、Embedding 模型选择。理由：这三个是“地基”，直接影响 Recall。Reranker 和 HyDE 是“装修”，预算有限时先保证地基稳。**具体数字**：数据清洗和 Chunking 能提 Recall 10-20%，Embedding 模型选择能提 5-15%，而 Reranker 只能提 5-10% 但增加延迟。**取舍**：如果业务对延迟敏感（如 <200ms），Reranker 直接砍掉。

**追问 3**：你怎么衡量“早做”的优化是否到位？有没有量化指标？

> **应对策略**：用 Recall@K 和 Precision@K。早做优化（数据清洗、Chunking、Embedding）的目标是 Recall@10 > 90%，延迟 < 100ms。如果达不到，说明地基没打好。**具体做法**：先跑基线（用 BM25 或简单 Embedding），然后逐步替换组件，记录每个步骤的 Recall 变化。**坑**：不要只看 Recall，还要看延迟和内存占用。比如 HNSW 的 M 参数调高能提 Recall，但延迟和内存也会涨，需要 trade-off。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “先做 Reranker，因为它能直接提升精度。” → ✅ “Reranker 是后做优化，因为如果检索基线 Recall 低，Reranker 也救不回来。先确保数据清洗和 Chunking 到位，再考虑 Reranker。”
- ❌ “Chunking 用固定 512 token 就行，不用纠结。” → ✅ “Chunking 策略需要根据文档类型和 query 长度做 A/B 测试。固定 512 token 可能切断关键实体，导致 Recall 下降。建议先用小样本验证。”
- ❌ “HyDE 是必选项，能解决 query 模糊问题。” → ✅ “HyDE 是锦上添花，不是必选项。如果 query 日志显示大部分 query 长度 > 10 个词，HyDE 的边际收益很低，且增加延迟和成本。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“实际踩坑”角度切入，比如“我在项目中先做了数据清洗，发现 Recall 提升了 15%，然后才加 Reranker，但延迟从 50ms 涨到 200ms，最后根据业务需求砍掉了 Reranker。” 展示工程决策力。
- **如果你只做过传统 NLP**：用“信息检索”类比迁移，比如“传统 NLP 中特征工程是地基，RAG 中数据清洗和 Chunking 就是地基。我做过文本分类的特征选择，类似地，RAG 中 Embedding 模型选择决定了召回上限。”
- **如果你是校招无项目**：聚焦“论文复现 demo”，比如“我复现了 BGE-M3 的论文，对比了不同 Chunking 策略在 MS MARCO 数据集上的 Recall，发现语义切分比固定切分高 8%。” 展示动手能力和分析能力。
- 《RAG 系统优化路线图：从 MVP 到生产级》（博客，作者：Jerry Liu）
- 《BGE-M3: Multi-lingual, Multi-granularity Embedding Model》（论文，BAAI）
- 《HNSW: Hierarchical Navigable Small World Graphs for Approximate Nearest Neighbor Search》（论文，Yury Malkov）
- 《HyDE: Precise Zero-Shot Dense Retrieval without Relevance Labels》（论文，Gao et al.）
- 《LangChain 文档：Chunking 策略最佳实践》（官方文档）

---
