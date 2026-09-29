---
slug: rag-tk1750
no: "2650"
title: "What are the common retrieval approaches used in RAG systems"
question: "What are the common retrieval approaches used in RAG systems"
excerpt: "面试官想考察你对 RAG 检索层的系统化认知，而非简单罗列方法名。这道题是典型的工程取舍 + 系统设计类型，刁钻点在于：候选人常只背了 BM25 和 DPR，但说不清为什么在 2024 年混合检索是标配，以及不同场景下如"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4310
updated: "2026-09-29"
---

## What are the common retrieval approaches used in RAG systems

#### 1️⃣ 考察意图

面试官想考察你对 RAG 检索层的**系统化认知**，而非简单罗列方法名。这道题是典型的**工程取舍 + 系统设计**类型，刁钻点在于：候选人常只背了 BM25 和 DPR，但说不清**为什么在 2024 年混合检索是标配**，以及**不同场景下如何量化选型**。答好了能展示：① 对稀疏/稠密/混合检索的底层原理和 trade-off 有实操理解；② 能根据数据特性（如领域、文档长度）和业务约束（延迟、成本）做决策；③ 知道最新进展（如 ColBERT-v2 的延迟优化、SPLADE 的端到端学习）。这直接对应一线大厂 RAG 系统的落地能力。

#### 2️⃣ 标准答

RAG 检索层的主流方法可归为三类：**稀疏检索**、**稠密检索**、**混合检索**。选型核心是权衡**精确匹配 vs 语义匹配**、**延迟 vs 召回率**。

#### 稀疏检索：精确匹配的基石

- **BM25**：基于词频（TF）和逆文档频率（IDF），默认参数 k1=1.5, b=0.75。适合**关键词精确匹配**场景，如法律条款、代码片段。**坑**：对同义词/语义变体完全失效，比如“car”搜不到“automobile”。解法：搭配同义词扩展（如 WordNet 或自定义词典）。
- **TF-IDF**：更基础，无词频饱和和文档长度归一化，实际工程中已被 BM25 取代。
- **SPLADE**：一种可学习的稀疏检索，通过 MLM 头输出词项权重，兼顾稀疏性和语义。**trade-off**：比 BM25 召回高 10-15%，但推理延迟增加 2-3 倍（因为需要过 Transformer）。

#### 稠密检索：语义匹配的利器

- **双编码器（Dual Encoder）**：如 DPR、Contriever。将 query 和 doc 分别编码为向量，用余弦相似度检索。**优势**：语义泛化强，能处理“如何做蛋糕”匹配“烘焙教程”。**坑**：对长文档（>512 tokens）效果差，因为平均池化会丢失细节。解法：用 ColBERT 的**后期交互（Late Interaction）**，保留每个 token 的向量，通过 MaxSim 计算细粒度匹配，在 BEIR 上比 DPR 高 3-5 个点。
- **ColBERT-v2**：引入残差压缩和端到端训练，延迟优化到单机 50ms 内（100 万文档），适合生产环境。**trade-off**：存储开销大（每个 token 一个向量），需要 4 倍于 DPR 的磁盘空间。
- **E5 / BGE**：当前 SOTA 的通用 embedding 模型，在 MTEB 上 NDCG@10 达 60+，但领域微调后效果更佳（如金融用 FinBERT 微调）。

#### 混合检索：取长补短

- **BM25 + Dense**：最常用组合。用 BM25 做第一轮粗筛（召回 top-200），再用稠密向量重排（rerank top-20）。**为什么这么做**：BM25 保证精确匹配不遗漏，稠密提升语义排序质量。**坑**：两阶段延迟叠加，端到端可能超过 200ms。解法：用 HNSW 索引优化稠密检索，将粗筛和重排合并为一次 ANN 搜索。
- **HyDE（Hypothetical Document Embeddings）**：先用 LLM 生成一个假设文档（如“这篇论文讲的是……”，再编码检索）。**适用场景**：query 极短（如“AI 安全”），直接编码语义模糊。**坑**：依赖 LLM 生成质量，延迟增加 1-2 秒。解法：仅对长尾 query 启用，或预计算常见 query 的 HyDE 向量。
- **SPLADE + Dense**：端到端学习稀疏和稠密权重，在 BEIR 上比 BM25+Dense 高 2-3 个点，但训练成本高（需要 4 块 A100 训 2 天）。

#### 其他方法

- **基于图的检索**：如 KNN 图（HNSW），用于稠密向量的近似最近邻搜索，延迟 <10ms（100 万文档）。**坑**：构建图耗时，且对数据分布敏感（如聚类数据效果差）。
- **结构化查询**：如 SQL 检索元数据（日期、作者），适合企业知识库。**坑**：需要预定义 schema，灵活性差。

**实际落地坑**：在电商场景，BM25 对“苹果手机”匹配“iPhone”失败，而稠密检索对“红色连衣裙”匹配“红裙”成功，但误召回“红色汽车”。解法：混合检索 + 领域微调（用电商 query-doc 对微调 BGE），将 NDCG@10 从 0.45 提升到 0.62。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从稀疏检索、稠密检索、混合检索三个层面回答。稀疏检索如 BM25 适合精确匹配，但语义泛化差；稠密检索如 DPR 或 ColBERT 擅长语义匹配，但对长文档和精确词项处理弱；混合检索如 BM25+Dense 或 HyDE 取长补短，是当前生产标配。总结一句：选型取决于数据特性——短文本用稠密，长文本用混合，关键词场景用稀疏。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 ColBERT 的后期交互，能具体说说它比 DPR 好在哪吗？

> 核心区别：DPR 将 query 和 doc 各编码为一个向量，用点积计算相似度，丢失了 token 级交互信息。ColBERT 保留每个 token 的向量（query 维度 32，doc 维度 128），通过 MaxSim 操作——对每个 query token，取与所有 doc token 的最大相似度，再求和。这能捕捉“query 中的‘蛋糕’匹配 doc 中的‘烘焙’”，而 DPR 可能因平均池化稀释了这种匹配。在 BEIR 上，ColBERT-v2 比 DPR 高 3-5 个 NDCG 点，但存储开销大 4 倍。工程上，可以用残差压缩（每个 token 只存 2 字节）来缓解。

**追问 2**：在延迟敏感场景（如搜索 <100ms），你怎么选型？

> 优先用 BM25 + HNSW 索引的稠密检索。具体：① 用 BM25 做第一轮粗筛（top-100），延迟 <10ms；② 用 HNSW 索引的稠密向量做 ANN 搜索（top-20），延迟 <20ms；③ 合并结果后，用轻量级 reranker（如 MiniLM 交叉编码器）重排 top-5，延迟 <30ms。总延迟 <60ms。如果资源紧张，可以砍掉 reranker，直接用 BM25 排序，但 NDCG@10 会下降 10-15%。另一个技巧：对高频 query 预计算检索结果，缓存命中率可达 30%。

**追问 3**：HyDE 的假设文档怎么生成？有什么坑？

> 用 LLM 生成：输入 query “AI 安全”，输出“这篇论文讨论 AI 系统的安全性，包括对抗攻击和防御方法”。然后编码这个假设文档去检索。坑：① LLM 可能生成无关内容（如“AI 安全很重要”），导致检索漂移。解法：用 prompt 约束输出格式，如“生成一段 50 字的学术摘要”。② 延迟高：每次检索多一次 LLM 调用。解法：仅对 query 长度 <5 词或首次检索失败时启用。③ 假设文档长度影响效果：太长会稀释语义，建议 50-100 tokens。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提 BM25 和 DPR，说“其他方法不重要” → ✅ 必须覆盖混合检索（BM25+Dense、HyDE）和最新进展（ColBERT、SPLADE），展示系统化认知。
- ❌ 说“稠密检索一定比稀疏好” → ✅ 强调 trade-off：稠密在精确匹配（如 ID、代码）上弱于 BM25，且对长文档效果差。正确说法是“取决于场景，混合检索通常最优”。
- ❌ 只讲理论，不提工程坑 → ✅ 必须给具体数字（如延迟 50ms、NDCG 提升 5 个点）和落地解法（如 HNSW 索引、缓存），证明有实战经验。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在项目中对比了 BM25 和 DPR，发现 BM25 在代码搜索上 NDCG@10 高 15%，但语义搜索差，最终用 BM25+Dense 混合检索，延迟控制在 80ms 内”切入，展示选型决策。
- **如果你只做过传统 NLP**：用“我在文本分类中用过 TF-IDF 和 BERT embedding，迁移到 RAG 检索时，发现 BM25 类似 TF-IDF 的精确匹配，而 DPR 类似 BERT 的语义编码，混合检索就是两者结合”类比，展示迁移能力。
- **如果你是校招无项目**：聚焦“我复现了 BEIR 基准上的 BM25、DPR 和 ColBERT，发现 ColBERT 在 SciFact 数据集上 NDCG@10 达 0.72，比 DPR 高 8 个点，但存储开销大 3 倍”的论文复现 demo，展示动手能力。
- 《ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT》
- 《SPLADE: Sparse Lexical and Expansion Model for First Stage Ranking》
- 《HyDE: Precise Zero-Shot Dense Retrieval without Relevance Labels》
- 《BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models》
- 《HNSW: Efficient and Robust Approximate Nearest Neighbor Search using Hierarchical Navigable Small World Graphs》
