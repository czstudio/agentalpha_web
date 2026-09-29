---
slug: rag-tk050
no: "950"
title: "| 43 | What are embeddings, and how are they utilized in RAG retrieval"
question: "| 43 | What are embeddings, and how are they utilized in RAG retrieval"
excerpt: "面试官想确认你是否真正理解 embedding 的本质，而不仅仅是背定义。考察类型是“概念+工程取舍”，刁钻点在于：很多人能说出“embedding 是把文本转成向量”，但说不清为什么在 RAG 中必须用双编码器（bi-"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4387
updated: "2026-09-29"
---

## | 43 | What are embeddings, and how are they utilized in RAG retrieval

`P0` · `rag`

🏷 标签：`rag`, `embeddings`, `retrieval`, `sentence-bert`

#### 1️⃣ 考察意图

面试官想确认你是否真正理解 embedding 的本质，而不仅仅是背定义。考察类型是“概念+工程取舍”，刁钻点在于：很多人能说出“embedding 是把文本转成向量”，但说不清为什么在 RAG 中必须用双编码器（bi-encoder）而非交叉编码器（cross-encoder），以及 embedding 维度、模型选择如何影响检索召回率。答好了能展示你对向量空间语义映射的直觉、对 RAG 检索阶段延迟-精度 trade-off 的掌控，以及实际落地时处理长文本截断、OOV 等坑的经验。

#### 2️⃣ 标准答

**Embedding 定义与核心逻辑**

Embedding 是将离散符号（词、句子、文档）映射到低维连续向量空间的技术。核心目标是：语义相近的实体在向量空间中距离更近。在 RAG 中，我们通常用 Sentence-BERT（如 all-MiniLM-L6-v2）、OpenAI text-embedding-3-small 或 BGE（BAAI General Embedding）这类模型，将 query 和文档块分别编码为固定维度的向量（如 384 维、768 维或 1536 维）。

**在 RAG 检索中的具体应用**

RAG 检索阶段通常采用**双编码器架构**（bi-encoder）：

- **离线索引**：将文档库切分成块（chunk，如 256 tokens），用 embedding 模型编码，存入向量数据库（如 FAISS、Milvus），构建 HNSW 索引。
- **在线检索**：用户 query 用同一模型编码，通过余弦相似度或内积计算与所有文档向量的距离，返回 Top-K 最相似块。

为什么用双编码器而不是交叉编码器？因为交叉编码器（如 BERT cross-encoder）需要将 query 与每个文档拼接后过 Transformer，计算复杂度 O(NL²)，N 是文档数，L 是序列长度，在百万级文档库上延迟不可接受。双编码器将 query 和文档独立编码，相似度计算退化为向量点积，复杂度 O(Nd)，d 是向量维度，配合 HNSW 近似最近邻搜索可降到 O(log N)。这是典型的**延迟-精度 trade-off**：双编码器牺牲了 query-doc 交互的细粒度建模，换来了可扩展的检索速度。

**实际落地的坑与解法**

- **长文本截断问题**：大多数 embedding 模型有最大输入长度限制（如 512 tokens）。文档块如果超过限制，直接截断会丢失尾部关键信息。解法：采用滑动窗口分块（overlapping chunks），或使用支持更长上下文的模型（如 BGE-M3 支持 8192 tokens）。
- **OOV（未登录词）问题**：领域专有名词（如“GRPO”、“FlashAttention”）在预训练语料中可能未出现。解法：使用子词分词（如 WordPiece、BPE）天然缓解 OOV；更激进的做法是微调领域 embedding 模型，或在检索前用 query 改写（如 LLM 将专有名词扩展为描述性短语）。
- **维度选择**：高维度（如 1536）保留更多信息，但存储和检索成本高；低维度（如 384）更快但可能丢失语义。经验法则：对通用场景 768 维足够，对细粒度语义（如法律合同）建议 1024+。

**常见模型对比**

| 模型 | 维度 | 最大长度 | 适用场景 |
|---|---|---|---|
| all-MiniLM-L6-v2 | 384 | 256 | 轻量级、低延迟 |
| OpenAI text-embedding-3-small | 1536 | 8191 | 通用、高质量 |
| BGE-large-EN-v1.5 | 1024 | 512 | 中英文混合、高召回 |
| Cohere embed-english-v3.0 | 1024 | 512 | 企业级、支持多任务 |

**重排序（Rerank）环节**：检索出的 Top-K 块（如 50 个）可以用交叉编码器（如 Cohere rerank-v3）重新排序，因为此时计算量可控（K 很小）。这是 RAG 中常见的两阶段检索策略：第一阶段用双编码器快速召回，第二阶段用交叉编码器精排。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，embedding 的本质是将文本映射到语义向量空间，核心是让相似内容距离更近；第二，在 RAG 中，我们采用双编码器架构，query 和文档独立编码，用向量相似度检索，这是为了在百万级文档上保持低延迟；第三，实际落地要注意长文本截断、OOV 和维度选择，通常配合重排序环节来弥补双编码器的精度损失。总结一句：embedding 是 RAG 检索的基石，选对模型和架构决定了召回率天花板。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么不用交叉编码器直接做检索？双编码器到底损失了什么？

> 交叉编码器将 query 和文档拼接后过 Transformer，能建模 query-doc 的细粒度交互（如词对齐、指代消解），精度更高。但复杂度是 O(NL²)，N 是文档数，L 是序列长度。假设文档库 100 万，每篇 512 tokens，一次检索需要 100 万次前向传播，延迟在秒级甚至分钟级。双编码器将复杂度降到 O(Nd)，配合 HNSW 索引可做到 10ms 内。损失的是对 query 中关键实体与文档中对应实体的精确匹配能力——比如 query 是“苹果公司的营收”，双编码器可能把“苹果”理解为水果，而交叉编码器能通过“公司”上下文纠正。这个损失通过重排序环节弥补。

**追问 2**：embedding 模型怎么选？比如 OpenAI 的 text-embedding-3-small 和 BGE 有什么区别？

> 核心看三个维度：领域适配性、延迟要求、成本。OpenAI 的模型在通用英文上表现好，但无法本地部署，有数据隐私风险，且每次调用有成本。BGE 系列开源，可微调，对中英文混合场景更友好。具体选型：如果文档库是英文技术文档，all-MiniLM-L6-v2 足够（384 维，速度快）；如果是法律合同（长文本、术语多），BGE-M3 支持 8192 tokens 且多语言；如果预算充足且对隐私不敏感，OpenAI text-embedding-3-small 是安全牌。一个实战经验：在 MS MARCO 数据集上，BGE-large-EN-v1.5 的 Recall@10 比 all-MiniLM 高 5-8%，但推理时间多 3 倍。

**追问 3**：embedding 向量维度怎么定？是不是越高越好？

> 不是。高维度（如 1536）能编码更多语义信息，但维度灾难会导致距离度量失效（高维空间中所有点几乎等距），且存储和检索成本线性增长。经验法则：对通用场景 768 维是 sweet spot；对细粒度语义（如生物医学、法律）建议 1024+；对移动端或低延迟场景 384 维足够。一个实际取舍：OpenAI text-embedding-3-small 支持动态降维（通过 dimensions 参数），可以在 256-1536 之间选择，这允许你在不换模型的情况下做精度-速度权衡。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“embedding 就是词向量，比如 Word2Vec” → ✅ 正确切入：强调句子/文档级 embedding，以及双编码器架构在 RAG 中的核心作用。Word2Vec 是静态词向量，无法处理一词多义，而现代 embedding 模型（如 Sentence-BERT）是上下文相关的。
- ❌ 说“embedding 维度越高越好，因为信息更多” → ✅ 正确切入：指出维度灾难和实际 trade-off，给出具体数字（384 vs 768 vs 1536）和场景建议。
- ❌ 说“RAG 检索直接用 embedding 模型就行，不需要重排序” → ✅ 正确切入：解释双编码器的精度损失，以及重排序环节如何用交叉编码器弥补，强调两阶段检索是工业级 RAG 的标准做法。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从实际选型切入，比如“我在项目中对比了 all-MiniLM 和 BGE 在 Recall@10 上的差异，发现 BGE 在长尾查询上提升 12%，但推理时间增加 3 倍，最终采用两阶段策略：BGE 检索 + Cohere rerank”。
- **如果你只做过传统 NLP**：用类比迁移，比如“我做过文本分类，embedding 是特征提取的核心，RAG 中类似但需要双编码器架构来解耦 query 和文档，这跟分类中的 siamese network 思路一致”。
- **如果你是校招无项目**：聚焦论文复现，比如“我复现了 DPR（Dense Passage Retrieval）论文，用 BERT 做双编码器，在 Natural Questions 数据集上 Recall@20 达到 78%，理解了 embedding 训练中的负采样策略和 in-batch negatives 技巧”。
- Dense Passage Retrieval (DPR) 论文：Karpukhin et al., 2020
- Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks, Reimers & Gurevych, 2019
- BGE: BAAI General Embedding 技术报告：Li et al., 2023
- FAISS: A Library for Efficient Similarity Search, Johnson et al., 2019
- RAG 实战：LangChain 官方文档中关于 embedding 模型选择和向量数据库配置的最佳实践

---
