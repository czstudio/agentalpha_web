---
slug: rag-tk061
no: "961"
title: "什么是 RAG？详细描述一个完整 RAG 系统的详细工作流程"
question: "什么是 RAG？详细描述一个完整 RAG 系统的详细工作流程"
excerpt: "这道题看似基础，但面试官真正想看的不是你会背“检索+生成”的定义，而是你是否亲手搭过一套 RAG 系统，并踩过其中的坑。考察类型是工程取舍 + 系统设计，刁钻点在于：候选人往往只讲流程（索引→检索→生成），却忽略了每个环"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4836
updated: "2026-09-29"
---

## 什么是 RAG？详细描述一个完整 RAG 系统的详细工作流程

`P0` · `rag`

🏷 标签：`rag`, `retrieval`, `generation`, `vector-database`

#### 1️⃣ 考察意图

这道题看似基础，但面试官真正想看的不是你会背“检索+生成”的定义，而是**你是否亲手搭过一套 RAG 系统，并踩过其中的坑**。考察类型是**工程取舍 + 系统设计**，刁钻点在于：候选人往往只讲流程（索引→检索→生成），却忽略了每个环节的**具体参数选择、性能瓶颈和 trade-off**。答好了能展示：对 RAG 整条链路的工程化理解、对检索质量与生成质量之间权衡的敏感度，以及解决实际落地问题（如延迟、幻觉、上下文窗口溢出）的硬实力。

#### 2️⃣ 标准答

RAG（Retrieval-Augmented Generation）的核心是**用外部知识库的检索结果，为 LLM 提供事实上下文，减少幻觉并提升时效性**。一个完整系统分三个阶段，每个阶段都有工程细节。

#### 阶段一：索引（Indexing）—— 把知识库变成可检索的向量空间

1. **文档分块（Chunking）**：不是简单按字数切。固定大小切（如 512 tokens）会导致语义断裂；语义切分（如 LangChain 的 `RecursiveCharacterTextSplitter` 按段落/句子切）更好，但计算开销大。**坑**：块太小（<100 tokens）导致检索缺乏上下文，块太大（>1000 tokens）导致 LLM 上下文窗口浪费且检索精度下降。**解法**：根据下游任务调参，通常 256-512 tokens 是甜区，配合 20% 的 overlap 避免边界信息丢失。
2. **向量化（Embedding）**：选模型是 trade-off。`text-embedding-ada-002`（1536 维）精度高但贵且慢；`BGE-large-zh`（1024 维）中文场景性价比高；`ColBERT` 用 token-level 交互，检索更准但索引体积大。**实际落地**：用 `Sentence-BERT` 做离线批量 embedding，缓存到磁盘，避免每次查询都重算。
3. **存储到向量数据库**：FAISS 适合单机（IVF+PQ 索引，内存可控），Pinecone/Weaviate 适合分布式。**关键参数**：`nlist`（IVF 聚类数）影响检索速度——`nlist=100` 时召回率约 85%，`nlist=1000` 时召回率 95%+ 但建索引慢 10 倍。**坑**：忘记做元数据过滤（如只检索 2024 年的文档），导致结果污染。

#### 阶段二：检索（Retrieval）—— 从向量空间召回最相关块

1. **查询向量化**：用同一 embedding 模型将用户 query 转向量。**注意**：query 和文档的 embedding 模型必须一致，否则余弦相似度无意义。
2. **相似度检索**：默认用余弦相似度（cosine similarity），但 FAISS 默认用 L2 距离，需显式归一化向量。**算法选择**：HNSW（Hierarchical Navigable Small World）召回率最高（~99%），但建图慢且内存大；IVF（Inverted File Index）速度快但召回率略低（~95%）。**工程取舍**：线上服务用 IVF+PQ 压缩到 1/10 内存，离线评估用 HNSW 保精度。
3. **Top-K 返回**：K 值不是越大越好。K=3 时生成质量高但可能遗漏关键信息；K=10 时上下文窗口易超限（如 GPT-4 的 8K 窗口），且噪声块会干扰 LLM。**解法**：动态 K——根据 query 复杂度（如用 `intent classifier` 判断）调整，简单问题 K=3，复杂问题 K=7。
4. **混合检索（Hybrid Search）**：稠密向量（embedding）擅长语义匹配，但丢失关键词精确匹配（如“RAG 2024 论文”）。**解法**：结合 BM25（稀疏检索），加权融合分数（如 `score = 0.7 * cosine_sim + 0.3 * BM25_score`）。**坑**：BM25 的 `k1` 和 `b` 参数需调优（默认 `k1=1.5, b=0.75` 适合短文本，长文本需增大 `b` 到 0.85）。

#### 阶段三：生成（Generation）—— 用检索结果增强 LLM 输出

1. **Prompt 模板设计**：典型模板是 `System: 基于以下上下文回答问题。\nContext: {retrieved_chunks}\nQuestion: {query}\nAnswer:`。**关键**：如果检索结果为空，必须显式告诉 LLM “不要编造”，否则幻觉率飙升 40%+。
2. **重排序（Reranker）**：检索出的 Top-K 块可能包含噪声。用 `Cohere Rerank` 或 `BGE-Reranker` 对块重新排序，只取 Top-3 送入 LLM。**trade-off**：增加 50-100ms 延迟，但答案准确率提升 15-20%。
3. **查询重写（Query Rewriting）**：用户 query 可能模糊（如“它是什么原理？”），需用 LLM 重写为独立问题（如“RAG 系统的检索原理是什么？”）。**坑**：重写本身可能引入幻觉，所以只对低置信度 query 执行（用 `embedding 相似度 < 0.6` 判断）。
4. **上下文窗口管理**：如果检索块总长度超过 LLM 窗口（如 4K tokens），需截断。**解法**：按重排序分数截断，保留最高分块，丢弃低分块；或用 `sliding window` 分段生成再合并。

**总结**：一个完整 RAG 系统不是“embedding + LLM”的简单拼接，而是**索引策略、检索算法、生成模板三者协同调优**的工程系统。实际落地中，80% 的收益来自索引和检索阶段的细节（chunking 策略、混合检索、reranker），而非 LLM 本身。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从索引、检索、生成三个层面回答。索引阶段，关键是 chunking 策略和 embedding 模型选择，我常用 512 tokens 加 overlap 切分，用 BGE 做向量化；检索阶段，混合 BM25 和稠密检索，用 HNSW 索引保证召回率；生成阶段，用 reranker 过滤噪声，并动态调整 Top-K。总结一句：RAG 的核心不是 LLM，而是检索质量，80% 的优化空间在索引和检索环节。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果检索结果全是噪声，LLM 生成答案会变差，你怎么避免？

> 这是典型“垃圾进垃圾出”问题。解法有三层：第一，检索前用 query 重写，把模糊 query 转化为精确问题；第二，检索后用 reranker 过滤，只保留置信度 > 0.7 的块；第三，生成时在 prompt 中加指令“如果上下文不相关，请回答‘无法从给定信息中找到答案’”。实际落地中，我还会在检索阶段加一个“相关性阈值”（如 cosine_sim < 0.5 的块直接丢弃），避免低质量块进入 prompt。

**追问 2**：你的 RAG 系统延迟太高，怎么优化？

> 延迟瓶颈通常在检索和生成。检索侧：用 IVF+PQ 索引替代 HNSW，内存压缩 10 倍，查询时间从 200ms 降到 20ms；用缓存（如 Redis）缓存高频 query 的检索结果。生成侧：用更小的 LLM（如 GPT-3.5 替代 GPT-4）或量化模型（如 4-bit 量化）；如果必须用大模型，用 streaming 输出减少首 token 延迟。另外，异步 pipeline 设计——检索和生成并行，检索结果准备好后立即触发生成，总延迟可降 30%。

**追问 3**：你怎么评估 RAG 系统的效果？

> 分两部分：检索质量用 Recall@K 和 MRR（Mean Reciprocal Rank），生成质量用答案准确率（人工标注或 LLM-as-judge）。具体指标：Recall@5 应 > 0.85，MRR > 0.7；答案准确率用 GPT-4 打分（1-5 分），平均分 > 4.0。另外，必须测幻觉率——用“上下文无关”测试：把检索结果替换为随机文本，看 LLM 是否仍自信回答，正常系统应拒绝回答。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只讲流程不讲参数：说“用向量数据库检索”，不提索引类型（HNSW vs IVF）和参数（nlist、efSearch）。✅ 必须给出具体选择：如“线上用 IVF+PQ，nlist=1000，efSearch=200，召回率 95%，延迟 30ms”。
- ❌ 认为 embedding 模型越强越好：盲目用 OpenAI 的 ada-002，忽略成本和延迟。✅ 根据场景选：中文场景用 BGE-large-zh，成本低且精度接近；离线批量用 ColBERT 提高召回率。
- ❌ 忽视 chunking 策略：说“按 512 字切分”，不解释为什么。✅ 必须给出 trade-off：固定大小切分简单但语义断裂，语义切分更准但慢；实际用 256-512 tokens + 20% overlap 作为基线，再根据任务调优。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“实际踩坑”切入，比如“我在项目中遇到 chunking 导致语义断裂，改用语义切分后 Recall@5 提升 12%”，并展示你调参的具体数字（如 nlist、K 值）。
- **如果你只做过传统 NLP**：用“信息检索”类比迁移，比如“RAG 的检索阶段类似 BM25 的扩展，但用 embedding 替代了词频统计”，并强调你对 BM25 参数（k1、b）的理解。
- **如果你是校招无项目**：聚焦论文复现，比如“我复现了 Lewis 2020 的 RAG 论文，用 HuggingFace 的 DPR 模型在 Natural Questions 上达到 Recall@5=0.82”，并展示你对索引和检索环节的细节理解。
- Lewis et al., “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks” (2020) —— RAG 开山论文
- Karpukhin et al., “Dense Passage Retrieval for Open-Domain Question Answering” (2020) —— DPR 模型详解
- LangChain 官方文档：Chunking 策略对比（RecursiveCharacterTextSplitter vs Semantic Chunker）
- Pinecone 博客：“Hybrid Search: Combining Sparse and Dense Retrieval” —— 混合检索实战
- Cohere 博客：“What is Reranking?” —— Reranker 原理与效果评估

---
