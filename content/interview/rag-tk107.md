---
slug: rag-tk107
no: "1007"
title: "为什么不能把 RAG 简单理解成“检索 + Prompt”"
question: "为什么不能把 RAG 简单理解成“检索 + Prompt”"
excerpt: "面试官想看你是否真正理解 RAG 的工程本质，而非停留在“检索文档塞进 Prompt”的浅层认知。考察类型是工程取舍 + 系统设计。刁钻点在于：很多人把 RAG 等同于“向量数据库 + 大模型”，忽略了检索质量、上下文窗"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3848
updated: "2026-09-29"
---

## 1 为什么不能把 RAG 简单理解成“检索 + Prompt”

`P1` · `rag`

🏷 标签：`rag`, `misconception`, `retrieval`, `prompt-engineering`

#### 1️⃣ 考察意图

面试官想看你是否真正理解 RAG 的工程本质，而非停留在“检索文档塞进 Prompt”的浅层认知。考察类型是**工程取舍 + 系统设计**。刁钻点在于：很多人把 RAG 等同于“向量数据库 + 大模型”，忽略了检索质量、上下文窗口利用、模型对齐、评估完整流程等核心挑战。答好了能展示你对信息检索（IR）、LLM 推理机制和系统工程的硬实力，说明你踩过坑、能落地。

#### 2️⃣ 标准答

把 RAG 简化成“检索 + Prompt”是新手最常见的误解，它掩盖了三个核心层面的复杂性：**检索质量决定上限**、**LLM 对检索结果的利用能力**、以及**系统工程的协同设计**。

#### 1. 检索质量：不是“搜到就行”，而是“搜对且排好”

- **检索器选择**：BM25（稀疏检索）和 Dense Embedding（如 DPR、ColBERT）各有 trade-off。BM25 对精确关键词匹配好，但语义泛化差；Dense 检索语义强，但容易“召回不相关”或“漏掉稀有词”。实际落地常用**混合检索**（Hybrid Search），用加权融合（如 Reciprocal Rank Fusion）或学习型排序（如 Cohere Rerank 3）做二次排序。
- **实际坑**：一次线上事故，用户搜“苹果手机价格”，BM25 召回“苹果种植技术”，Dense 召回“手机壳价格”。原因是 embedding 模型没区分“苹果（品牌）”和“苹果（水果）”。**解法**：引入实体消歧（Entity Disambiguation）或 Query Rewriting（如用 LLM 把 query 改写为“苹果公司 iPhone 价格”）。
- **Trade-off**：检索精度（Precision）和召回率（Recall）不可兼得。高精度意味着可能漏掉相关文档，低精度则噪声淹没关键信息。实践中用 Top-K 截断 + Reranker 做平衡，K 值通常设为 20-50，Reranker 再压缩到 3-5 条。

#### 2. LLM 利用能力：不是“喂进去就能用”

- **上下文窗口限制**：简单拼接 10 篇文档，即使窗口够大（如 128K tokens），LLM 也会出现“迷失在中间”（Lost in the Middle）现象——对开头和结尾的文档关注度高，中间的被忽略。**解法**：用滑动窗口或分层摘要（Hierarchical Summarization）压缩长上下文，或只保留 Reranker 输出的 Top-3 文档。
- **指令对齐**：LLM 默认不会“严格基于检索内容回答”。需要 Prompt 工程（如“只根据以下文档回答，如果文档没有答案，说不知道”）或**指令微调**（如用 RAG 数据微调模型，让模型学会“忽略无关文档”）。实际案例：在 Llama 2 上微调时，发现模型会“编造”文档中没有的信息，原因是训练数据中检索文档和答案不完全对齐。**解法**：用负样本训练（Negative Sampling），让模型学会拒绝回答。

#### 3. 系统工程：远不止“检索 + Prompt”

- **索引构建**：Chunking 策略（固定大小 vs. 语义分割）、元数据过滤（如时间戳、来源）、向量索引（HNSW vs. IVF）都影响检索效率。Trade-off：HNSW 检索快但内存大，IVF 节省内存但精度略低。
- **评估完整流程**：需要专门指标，如**忠实度（Faithfulness）**（答案是否基于检索文档）、**答案覆盖率（Answer Coverage）**（是否遗漏关键信息）。用 LLM-as-Judge（如 GPT-4 打分）或人工标注做迭代。没有评估，RAG 就是黑盒。

**总结**：RAG 是检索、排序、生成、评估的完整流程系统，每个环节都有工程取舍。简单理解成“检索 + Prompt”会导致上线后效果差、难排查。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，检索质量决定上限，BM25 和 Dense 各有 trade-off，需要混合检索 + Reranker 平衡精度和召回；第二，LLM 对检索结果的利用能力不是天然的，需要 Prompt 工程或指令微调来对齐，否则会出现‘迷失在中间’或编造信息；第三，系统工程涉及索引构建、评估完整流程，远不止‘检索 + Prompt’。总结一句：RAG 是检索、排序、生成、评估的完整流程，每个环节都需要工程取舍。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说检索质量决定上限，那如果检索结果很差，LLM 能自己纠正吗？

> 不能。LLM 没有“自我纠正”能力，它会基于检索内容生成，如果检索到噪声，LLM 会“自信地编造”。实际测试中，用 TruthfulQA 数据集对比：直接 Prompt 准确率 40%，RAG 检索 Top-1 准确率 60%，但检索 Top-5 噪声多时准确率反而降到 50%。**解法**：引入“检索置信度”阈值，低于阈值时触发“我不知道”或二次检索。或者用 Reranker 过滤掉低分文档。

**追问 2**：你提到“迷失在中间”，具体怎么解决？有量化数据吗？

> 有。Liu et al. (2023) 论文显示，当上下文窗口超过 10 个文档时，中间文档的利用率下降 30-40%。**解法**：① 用 Reranker 压缩到 Top-3 文档，避免长上下文；② 用滑动窗口 + 分层摘要，把长文档拆成多个摘要再拼接；③ 在 Prompt 中显式排序，把最相关文档放开头和结尾。实际项目中，我们用了“文档重排序 + 摘要压缩”，准确率从 65% 提升到 82%。

**追问 3**：你怎么评估 RAG 系统的忠实度？有没有自动化方法？

> 用 LLM-as-Judge 做自动化评估。具体方法：把检索文档和生成答案输入 GPT-4，让 GPT-4 判断答案是否完全基于文档。指标用 F1 或准确率。但注意 GPT-4 有偏见（如偏好长答案），所以需要人工抽样校验。**实际坑**：一次评估中，GPT-4 给“编造”答案打了高分，因为答案“看起来合理”。**解法**：加入“否定测试”——把检索文档换成无关文档，看模型是否拒绝回答。如果模型还生成答案，说明忠实度差。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “RAG 就是检索文档然后拼到 Prompt 里，LLM 会自动理解。” → ✅ “LLM 不会自动理解，需要 Prompt 工程或指令微调来对齐，否则会出现‘迷失在中间’或编造信息。检索质量也决定上限，需要混合检索 + Reranker。”
- ❌ “检索用向量数据库就行，BM25 过时了。” → ✅ “BM25 对精确关键词匹配依然有效，Dense 检索语义强但容易漏掉稀有词。实际落地常用混合检索，用 Reciprocal Rank Fusion 融合结果。”
- ❌ “RAG 上线后不用评估，效果好就行。” → ✅ “需要专门评估指标如忠实度、答案覆盖率，用 LLM-as-Judge 或人工标注做迭代。没有评估，RAG 就是黑盒，问题难排查。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索质量优化”切入，讲你如何用混合检索 + Reranker 解决召回噪声问题，并给出量化提升（如准确率从 60% 到 80%）。
- **如果你只做过传统 NLP**：用“信息检索 vs. 生成”类比迁移，讲 BM25 和 Dense 的 trade-off 与 NLP 中的 TF-IDF vs. Word2Vec 类似，强调工程取舍。
- **如果你是校招无项目**：聚焦论文复现，讲你读过 Liu et al. (2023) “Lost in the Middle” 和 RAG 评估论文，并自己用 LangChain 搭过 demo 对比不同检索策略。
- Liu et al. (2023) “Lost in the Middle: How Language Models Use Long Contexts”
- Lewis et al. (2020) “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks”
- Karpukhin et al. (2020) “Dense Passage Retrieval for Open-Domain Question Answering”
- 博客：LangChain 官方文档 “RAG Evaluation with LLM-as-Judge”
- 工具：Cohere Rerank 3、FAISS (HNSW)、BM25 (Elasticsearch)

---
