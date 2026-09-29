---
slug: rag-tk1242
no: "2142"
title: "你的 Rerank 模型用的什么？跟 Embedding 模型是怎么配合的"
question: "你的 Rerank 模型用的什么？跟 Embedding 模型是怎么配合的"
excerpt: "面试官想验证你对 RAG 两阶段检索架构的工程落地深度，而非仅背概念。考察类型是系统设计 + 工程取舍。刁钻点在于：很多人只知“Embedding 检索 + Rerank 精排”的流程，但说不清为什么需要两阶段（计算成本"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4186
updated: "2026-09-29"
---

## 你的 Rerank 模型用的什么？跟 Embedding 模型是怎么配合的

`P1` · `rag` · **🏢 阿里**

🏷 标签：`rerank`, `embedding`, `two_stage_retrieval`

#### 1️⃣ 考察意图

面试官想验证你对 RAG 两阶段检索架构的**工程落地深度**，而非仅背概念。考察类型是**系统设计 + 工程取舍**。刁钻点在于：很多人只知“Embedding 检索 + Rerank 精排”的流程，但说不清**为什么需要两阶段**（计算成本 vs 精度 trade-off）、**模型选型依据**（同系列 vs 跨系列）、以及**实际调参坑**（如 Rerank 的输入长度截断）。答好了能展示你对检索系统的端到端把控力，包括召回率、精度、延迟的平衡，以及处理长文档、噪声数据的实战经验。

#### 2️⃣ 标准答

我的 Rerank 模型用的是 **BAAI/bge-reranker-v2-m3**（基于 mT5 架构），Embedding 模型是 **BAAI/bge-large-en-v1.5**（基于 BERT）。选择同系列（BGE 家族）是为了**向量空间对齐**——Embedding 和 Rerank 在预训练时共享部分语料，能减少跨模型带来的语义漂移。

**两阶段检索流程**：

- **第一阶段（粗排）**：Embedding 模型将用户 query 和文档库（100 万级）转为 1024 维向量，用 **HNSW**（ef_construction=200, M=32）索引检索 Top 100。这一步侧重**高召回**，容忍一些噪声。
- **第二阶段（精排）**：Rerank 模型对 Top 100 的 query-doc 对进行交叉编码（cross-encoder），输出相关性分数（0-1），取 Top 5 送入 LLM。这一步侧重**高精度**，过滤掉语义相似但无关的噪声。

**为什么这么做**：

- **计算成本 trade-off**：Embedding 检索是 O(log N) 的近似搜索，适合海量数据；Rerank 是 O(N) 的交叉编码，计算量随候选数线性增长。所以粗排候选数不能太大（我设 100），否则延迟爆炸（Rerank 100 条约 200ms，1000 条就 2s+）。
- **同系列优势**：BGE 的 Embedding 和 Rerank 在训练时用了相同的负采样策略（如 hard negative mining），所以 Rerank 对 Embedding 召回的假阳性（false positive）有更好的纠偏能力。跨系列（如用 OpenAI Embedding + Cohere Rerank）可能因分布差异导致精度下降 5-10%。

**实际落地的坑 + 解法**：

- **坑 1：输入长度截断**。Rerank 模型最大输入 512 tokens，长文档（如 PDF 报告）会被截断，丢失关键信息。解法：在 Embedding 检索阶段，对长文档做**滑动窗口分块**（chunk size=256, overlap=32），每个 chunk 单独生成向量；Rerank 时对 query 和每个 chunk 打分，取最高分作为文档分数。
- **坑 2：Rerank 分数分布偏移**。BGE-Reranker 的分数集中在 0.9-1.0 区间，导致 Top 5 区分度不够。解法：对分数做**softmax 归一化**（temperature=0.1），拉大差距；或者用**阈值过滤**（只保留分数 > 0.95 的文档），避免低质量结果污染 LLM。
- **坑 3：延迟优化**。Rerank 是 CPU 密集型（交叉编码），GPU 推理时 batch size 设 32 可压到 50ms/100 条。如果延迟敏感，可降级为**单阶段**（仅 Embedding 检索 Top 10），但精度会掉 10-15%（在 MS MARCO 数据集上验证过）。

**精度提升数据**：在内部 QA 数据集上，加入 Rerank 后，Recall@5 从 0.72 提升到 0.89，Precision@5 从 0.65 提升到 0.83。代价是端到端延迟从 30ms 增加到 250ms（含网络开销），但仍在可接受范围。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从模型选型、两阶段配合、实际坑点三个层面回答。模型层面，我用 BGE 同系列（Embedding 用 bge-large-en-v1.5，Rerank 用 bge-reranker-v2-m3），保证向量空间对齐。配合层面，Embedding 粗排 Top 100，Rerank 精排 Top 5，平衡召回率和计算成本。坑点包括长文档截断（用滑动窗口分块解决）和分数分布偏移（用 softmax 归一化）。总结一句：两阶段检索是 RAG 精度的关键，但必须根据数据规模和延迟要求做工程取舍。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果数据量达到 1 亿级，你的两阶段方案还能用吗？怎么优化？

> 1 亿级时，Embedding 检索用 HNSW 索引的内存会爆炸（约 100GB+），需要改用 **IVF+PQ**（倒排索引 + 乘积量化）压缩向量到 128 维，召回率从 0.95 降到 0.88，但内存降到 20GB。Rerank 阶段候选数从 100 降到 50，因为粗排精度下降后，更多噪声会进入精排，增加 Rerank 负担。另外，可以引入**级联 Rerank**：先用轻量级 Rerank（如 MiniLM 交叉编码器）排 Top 50，再用重模型（如 BGE-Reranker）排 Top 10，延迟从 500ms 降到 200ms。

**追问 2**：你怎么评估 Rerank 模型的效果？有没有离线指标？

> 离线用 **NDCG@10** 和 **MRR** 评估。具体做法：构建人工标注的 query-doc 相关性数据集（3 级：相关/部分相关/不相关），对比 Rerank 前后排序变化。另外，用 **A/B 测试** 看线上指标：用户点击率（CTR）提升 5% 以上，或 LLM 回答的准确率（人工评估）提升 10%。注意：Rerank 分数不能直接用于 LLM 的 prompt，需要做归一化或阈值过滤，否则 LLM 会过度依赖分数。

**追问 3**：如果 Embedding 和 Rerank 不是同系列，会有什么问题？怎么解决？

> 跨系列（如 OpenAI Embedding + Cohere Rerank）的主要问题是**分布不匹配**：OpenAI 的向量空间是 1536 维，Cohere 的 Rerank 可能对某些语义维度不敏感，导致假阳性率上升。解法：1）在 Rerank 训练时，用 Embedding 召回的 hard negative 做微调（fine-tune），强制模型适应 Embedding 的分布；2）在推理时，对 Rerank 分数做**校准**（calibration），用温度缩放（temperature scaling）调整分数分布。实测跨系列精度比同系列低 3-5%，但灵活性更高（可换更便宜的 Embedding）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “我用 OpenAI Embedding 和 Cohere Rerank，直接拼起来就行。” → ✅ “我会优先选同系列（如 BGE），保证向量空间对齐；如果跨系列，必须做微调或分数校准，否则精度下降明显。”
- ❌ “Rerank 候选数越大越好，能召回更多相关文档。” → ✅ “Rerank 候选数要 trade-off：100 条是常见上限，超过 200 条延迟线性增长，且精度提升边际递减（从 100 到 200 只提升 1-2%）。建议根据延迟预算动态调整。”
- ❌ “Rerank 分数直接传给 LLM 做 prompt。” → ✅ “Rerank 分数分布可能偏移（如集中在 0.9-1.0），直接传给 LLM 会导致模型过度依赖分数。应该做归一化或阈值过滤，或者只传排序结果不传分数。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“两阶段检索的精度提升”切入，展示你对比过有无 Rerank 的 Recall@5 数据（如从 0.72 到 0.89），并提到长文档分块和延迟优化。
- **如果你只做过传统 NLP**：用“信息检索中的粗排 + 精排”类比（如 BM25 粗排 + BERT 精排），强调 Embedding 是“语义召回”，Rerank 是“语义精排”，并迁移到 RAG 场景。
- **如果你是校招无项目**：聚焦“BGE 同系列论文复现”，说明你读过 BAAI 的技术报告（如《BGE: A Family of Embedding Models》），并自己实现过两阶段流水线（用 HuggingFace 的 transformers 库），对比过不同候选数的精度。
- 《BGE: A Family of Embedding Models》（BAAI 技术报告，解释同系列设计）
- 《ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction》（两阶段检索的经典论文）
- 《Reranking for RAG: A Practical Guide》（博客，讲 Rerank 的工程坑和调参）
- 《HNSW: Hierarchical Navigable Small World Graphs》（HNSW 索引原理）
- 《MS MARCO Passage Ranking Dataset》（Rerank 评估的基准数据集）

---
