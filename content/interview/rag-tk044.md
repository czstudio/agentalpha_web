---
slug: rag-tk044
no: "944"
title: "What is chunking, and why do we chunk our data?**"
question: "What is chunking, and why do we chunk our data?**"
excerpt: "面试官想确认你对 RAG 基础组件的理解是否停留在“背概念”层面，还是能深入工程取舍。核心考察三点：chunking 的定义、为什么必须做（而非可选项）、以及策略选择对检索性能的直接影响。刁钻点在于：很多人只背“分块是为"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3814
updated: "2026-09-29"
---

## What is chunking, and why do we chunk our data?**

`P0` · `rag`

🏷 标签：`rag`, `chunking`, `retrieval`

#### 1️⃣ 考察意图

面试官想确认你对 RAG 基础组件的理解是否停留在“背概念”层面，还是能深入工程取舍。核心考察三点：**chunking 的定义、为什么必须做（而非可选项）、以及策略选择对检索性能的直接影响**。刁钻点在于：很多人只背“分块是为了适应上下文窗口”，但答不出 chunking 与 embedding 粒度、检索召回率（Recall@k）之间的 trade-off。答好了能展示你对 RAG 整条链路（分块→向量化→检索→生成）的完整流程理解，以及实际调优经验。

#### 2️⃣ 标准答

**Chunking 定义**：将长文本按规则或语义切割成固定大小或可变大小的片段（chunks），每个 chunk 作为独立单元进行向量化、索引和检索。

**为什么必须 chunk？三个核心原因：**

- **LLM 上下文窗口限制**：即使 GPT-4 有 128K 窗口，直接塞整本书会导致注意力分散、关键信息被稀释。实验表明，当输入长度超过 8K tokens 时，模型在长文本中间位置的检索准确率下降 30%+（Liu et al., 2023，“Lost in the Middle”）。chunking 本质是**强制聚焦**，让检索只返回最相关的片段。
- **提高检索精度**：embedding 模型（如 text-embedding-3-small）对短文本的语义捕获更精准。一个 512 tokens 的 chunk 与查询的余弦相似度，比一个 8K tokens 的文档更可靠。原因是 embedding 向量是固定维度（如 1536 维），长文本会压缩信息，导致“语义模糊”——两个不同主题的段落被编码成相似的向量。
- **减少噪声与计算成本**：不 chunk 时，检索系统需要扫描整个文档的向量，计算量随文档长度线性增长。chunking 后，每个 chunk 独立索引，向量数据库（如 Milvus、Pinecone）的 HNSW 索引能更快定位。同时，检索结果中无关段落（噪声）被排除，提升 RAG 的生成质量。

**实际落地的坑 + 解法**：

- **坑**：固定大小 chunk（如 256 tokens）会切断句子或段落，导致语义不完整。例如，一个 chunk 末尾是“然而，这个方案”，下一个 chunk 开头是“并不完美”，检索时单独看第一个 chunk 会误导模型。
- **解法**：使用**递归字符分割**（RecursiveCharacterTextSplitter，LangChain 默认实现），先按段落分割，再按句子，最后按字符，保证语义边界。或者用**语义分割**（如基于 BERT 的 Sentence-BERT 计算句子间相似度，阈值 0.5 时切分），但计算成本高 2-3 倍。

**策略选择 trade-off**：

- **小 chunk（128-256 tokens）**：检索精度高，但索引数量多，存储和检索延迟增加；且可能丢失上下文，导致生成时信息不足。
- **大 chunk（512-1024 tokens）**：上下文完整，但检索噪声大，Recall@k 可能下降 10-15%。实践中常用**重叠分割**（overlap=10-20%），如 chunk 大小 512 tokens，overlap 64 tokens，平衡精度与完整性。

**与 embedding 模型协同**：chunk 大小应与 embedding 模型的训练数据分布匹配。例如，text-embedding-ada-002 在 256-512 tokens 上表现最佳；而 Cohere embed-english-v3.0 支持 512 tokens 上限。超出模型最大输入长度时，必须截断或分段。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、原因、策略三个层面回答。定义上，chunking 是将长文本切割成独立片段用于检索。原因有三：LLM 上下文窗口有限、提高 embedding 检索精度、减少噪声。策略上，固定大小简单但会切碎语义，推荐递归分割或语义分割，并配合重叠参数。总结一句：chunking 是 RAG 检索质量的基石，策略选择直接影响 Recall@k 和生成效果。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 chunk 大小影响检索精度，具体怎么选？有公式吗？

> 没有通用公式，但经验法则：chunk 大小 = embedding 模型最大输入长度的 50-80%。例如 text-embedding-3-small 最大 8192 tokens，但实际用 512-1024 tokens 效果更好。可以跑 A/B 测试：固定 k=5，对比不同 chunk 大小的 Recall@5。如果下游任务需要长上下文（如文档摘要），用 1024 tokens + overlap 128 tokens；如果问答（如 FAQ），用 256 tokens 更精准。

**追问 2**：如果文档是表格或代码，chunking 策略要改吗？

> 必须改。表格用 Markdown 格式保留结构，按行或单元格分割，避免切碎表头与数据。代码按函数或类分割（如 Python 的 `ast` 模块解析），保证每个 chunk 是完整逻辑块。通用文本分割器（如 RecursiveCharacterTextSplitter）对代码效果差，因为分隔符（`\n\n`）可能出现在注释中。推荐用 Unstructured 库的 `partition_pdf` 或 `partition_html` 处理结构化数据。

**追问 3**：chunking 和检索后处理（如 rerank）是什么关系？能互相替代吗？

> 不能替代，是互补。chunking 决定检索的候选集质量，rerank（如 Cohere Rerank 3）对 top-k 结果重新排序。如果 chunk 太粗（如 2048 tokens），rerank 能纠正部分噪声，但计算成本高（O(k * chunk_len)）。最佳实践：先用小 chunk（256 tokens）保证高召回，再用 rerank 精排 top-10。chunking 是“第一次过滤”，rerank 是“第二次精筛”。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “chunking 就是把文本切成固定大小，比如 512 tokens。” → ✅ “固定大小是基础，但必须考虑语义边界，否则会切碎句子。实践中用递归分割或语义分割，并配合重叠参数。”
- ❌ “chunk 越大越好，因为上下文更完整。” → ✅ “大 chunk 会导致检索噪声增加，embedding 向量语义模糊。需要权衡精度与完整性，通常 256-512 tokens 是 sweet spot。”
- ❌ “chunking 和 embedding 模型无关，随便选。” → ✅ “chunk 大小必须匹配 embedding 模型的最大输入长度，否则会被截断。例如 text-embedding-3-small 支持 8192 tokens，但实际用 512 tokens 效果更好。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“chunking 策略对比实验”切入，展示你如何用 Recall@k 和下游准确率评估不同策略（固定 256 vs 512 vs 语义分割），并提到你用了 RecursiveCharacterTextSplitter 和 overlap 参数解决语义断裂问题。
- **如果你只做过传统 NLP**：用“文档分类中的文本分段”类比，说明 chunking 类似将长文档拆成段落进行分类，避免全局特征被局部噪声淹没。强调你对 embedding 模型（如 BERT）输入长度限制的理解。
- **如果你是校招无项目**：聚焦论文复现，提到你读过“Lost in the Middle”并实现了一个简易 RAG demo，用不同 chunk 大小测试检索效果，发现 256 tokens 比 1024 tokens 的 Recall@5 高 15%。
- “Lost in the Middle: How Language Models Use Long Contexts” (Liu et al., 2023)
- LangChain 文档：RecursiveCharacterTextSplitter 实现与参数调优
- Cohere 博客：Chunking Strategies for RAG
- Pinecone 指南：Chunking for Vector Search
- Unstructured 库：处理 PDF、表格、代码等结构化文档的分块

---
