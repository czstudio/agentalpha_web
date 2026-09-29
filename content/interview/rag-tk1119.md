---
slug: rag-tk1119
no: "2019"
title: "What is chunking, and why do we chunk our data"
question: "What is chunking, and why do we chunk our data"
excerpt: "面试官想考察你对 RAG 系统基础组件的理解深度，而非单纯背定义。这是典型的“基础概念 + 工程取舍”型问题，刁钻点在于：chunking 看似简单，但策略选择直接影响检索召回率和下游生成质量，且没有银弹。答好了能展示你"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3964
updated: "2026-09-29"
---

## What is chunking, and why do we chunk our data

#### 1️⃣ 考察意图

面试官想考察你对 RAG 系统基础组件的理解深度，而非单纯背定义。这是典型的“基础概念 + 工程取舍”型问题，刁钻点在于：chunking 看似简单，但策略选择直接影响检索召回率和下游生成质量，且没有银弹。答好了能展示你对 RAG 整条链路（索引→检索→生成）的协同认知，以及从“调参工程师”到“系统设计者”的思维跃迁。

#### 2️⃣ 标准答

Chunking 是将长文档分割成更小、语义自洽的文本片段（chunks）的过程，是 RAG 索引阶段的基石。核心原因有三：**LLM 上下文窗口限制**（如 GPT-4 的 128K tokens 虽大，但长上下文会稀释注意力，导致“大海捞针”问题）；**检索精度**（细粒度 chunk 能匹配用户查询的局部意图，而非整篇文档的模糊语义）；**存储与计算效率**（向量数据库对固定长度向量更友好，且减少冗余计算）。

**主流策略与工程取舍**：

- **固定大小分割**：按字符数或 token 数（如 512 tokens）硬切，带固定 overlap（如 128 tokens）。优点是实现简单、索引均匀；缺点是会切断句子或段落，破坏语义完整性，导致检索到“半句话”的噪声 chunk。
- **递归字符分割**（LangChain 的 `RecursiveCharacterTextSplitter`）：按优先级尝试分隔符（`\n\n` > `\n` > `.` > 空格），优先保留段落和句子边界。这是工业界最常用的 baseline，平衡了语义完整性和实现复杂度。
- **语义分割**（如 Jina AI 的 `Late Chunking` 或基于 embedding 相似度的分割）：用滑动窗口计算相邻句子 embedding 的余弦相似度，在相似度骤降处切分。优点是 chunk 语义自洽；缺点是计算开销大（需预计算全文档 embedding），且阈值敏感。
- **基于 LLM 的智能分割**：用 GPT-4 等模型识别自然章节边界（如 markdown 标题、列表）。精度最高，但延迟和成本不可接受，仅用于离线索引。

**实际落地的坑与解法**：

- **坑 1：chunk 大小与 embedding 模型不匹配**。例如用 `text-embedding-3-small`（最大输入 8191 tokens）却切 512 tokens 的 chunk，导致 embedding 无法捕获长程依赖。解法：chunk 大小应 ≤ embedding 模型最大输入长度的 1/2，并配合 overlap 保留上下文。
- **坑 2：chunk 过小导致检索召回率低**。如切 128 tokens 的 chunk，用户查询“2023 年 Q3 财报的营收增长率”可能只匹配到“营收”子句，漏掉“增长率”上下文。解法：采用“小 chunk 检索 + 大 chunk 生成”的滑动窗口策略（如 LlamaIndex 的 `SentenceWindowNodeParser`），检索时用细粒度 chunk，生成时扩展其前后窗口。
- **坑 3：overlap 引入重复数据**。overlap 过大（如 50%）会导致向量索引中大量相似 chunk，检索时返回重复结果。解法：overlap 控制在 10-20%，并在检索后做去重（如 MMR 算法）。

**策略选择建议**：对于通用文档（新闻、博客），推荐递归字符分割（chunk_size=512, overlap=128）；对于结构化文档（论文、法律合同），推荐语义分割或基于标题的分割；对于代码文档，按函数/类边界分割。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、原因、策略三个层面回答。Chunking 是将长文本分割成语义自洽的片段，核心原因是 LLM 上下文窗口有限、检索精度要求、以及存储效率。策略上，工业界常用递归字符分割（如 512 tokens + 128 overlap），但需注意与 embedding 模型匹配，并避免 chunk 过小导致的召回率下降。总结一句：chunking 没有银弹，必须根据文档类型和下游任务做对比实验。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你如何确定最优的 chunk size？有没有通用公式？

> 没有通用公式，但可以通过对比实验确定。具体做法：对同一数据集，固定 embedding 模型和检索算法（如 BM25 + DPR），遍历 chunk_size（256/512/1024 tokens）和 overlap（10%/20%），用 Recall@k 和 MRR 评估检索质量，用 ROUGE-L 评估下游生成。经验法则：对于问答类任务，chunk_size=512 是安全起点；对于摘要类任务，chunk_size=1024 更好。注意：chunk_size 必须 ≤ embedding 模型最大输入长度，且与 overlap 之和不超过该长度。

**追问 2**：如果用户查询是“2023 年 Q3 财报的营收增长率”，但 chunk 只包含“营收”而没有“增长率”，怎么解决？

> 这是典型的“chunk 过小导致语义断裂”问题。解法有三：1）采用滑动窗口策略，检索时用细粒度 chunk（如 256 tokens），生成时扩展其前后各 256 tokens 的上下文；2）使用语义分割，确保“营收”和“增长率”在同一 chunk 内；3）在检索后增加 rerank 阶段，用 cross-encoder（如 Cohere rerank）对候选 chunk 做语义匹配，过滤掉不完整的 chunk。

**追问 3**：chunking 和 embedding 模型如何协同？比如用 ColBERT 这种 late interaction 模型还需要 chunking 吗？

> 需要，但策略不同。ColBERT 的 late interaction 机制允许 token 级匹配，理论上可以处理更长上下文，但实际中仍受限于索引效率和内存。对于 ColBERT，chunk 可以更大（如 2048 tokens），因为其匹配粒度更细，不需要像 DPR 那样依赖 chunk 的全局语义。但 chunking 仍是必要的，否则单文档的向量索引会爆炸（ColBERT 每个 token 一个向量）。协同原则：embedding 模型越粗粒度（如 DPR），chunk 应越小；越细粒度（如 ColBERT），chunk 可越大。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只背定义：“Chunking 就是把文档切成小块，因为 LLM 有 token 限制。” → ✅ 深入原因：“Chunking 不仅为了 token 限制，更为了检索精度——细粒度 chunk 能匹配局部查询，避免整篇文档的语义稀释。同时需考虑与 embedding 模型的协同，以及 overlap 对召回率的影响。”
- ❌ 说“chunk size 越大越好，因为上下文更多。” → ✅ 指出 trade-off：“chunk 过大会引入噪声，降低检索精度；过小会丢失上下文。工业界常用 512 tokens 作为起点，并通过对比实验调优。”
- ❌ 忽略工程落地：“用 GPT-4 做语义分割最准。” → ✅ 考虑成本：“GPT-4 分割延迟高、成本贵，仅用于离线索引。线上推荐递归字符分割或基于 embedding 相似度的语义分割。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“chunking 策略对比实验”切入，展示你如何用 Recall@k 和 ROUGE-L 评估不同 chunk_size，并最终选择递归字符分割 + 滑动窗口策略，使检索召回率提升 15%。
- **如果你只做过传统 NLP**：用“文本分割”类比——chunking 类似于传统 NLP 中的句子分割或段落分割，但多了与向量检索的协同。强调你理解分割粒度对下游任务的影响，并愿意学习新工具（如 LangChain 的 splitter）。
- **如果你是校招无项目**：聚焦论文复现——读过《Chunking Strategies for RAG》或 LangChain 官方文档，并自己用 Python 实现了一个对比实验（固定 256/512/1024 tokens，用 `sentence-transformers` 计算 embedding，用 `faiss` 检索），输出分析报告。
- LangChain 官方文档：Text Splitters 模块（RecursiveCharacterTextSplitter 等）
- Jina AI 博客：Late Chunking in Long-Context Embedding Models
- 论文：Chunking Strategies for Retrieval-Augmented Generation (2024)
- 工具：LlamaIndex 的 SentenceWindowNodeParser 与 HierarchicalNodeParser
- 博客：OpenAI Cookbook - How to chunk text for RAG
