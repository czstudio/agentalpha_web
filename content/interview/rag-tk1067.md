---
slug: rag-tk1067
no: "1967"
title: "RAG 效果差时，为什么不能第一反应就怪模型"
question: "RAG 效果差时，为什么不能第一反应就怪模型"
excerpt: "面试官真正想看的不是你会不会调模型，而是你有没有系统调试的工程思维。这道题属于系统设计 + debug 类型，刁钻点在于：候选人容易陷入“模型万能论”或“检索万能论”的单一归因。答好了能展示你具备端到端链路分析能力，能通"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4082
updated: "2026-09-29"
---

## RAG 效果差时，为什么不能第一反应就怪模型

#### 1️⃣ 考察意图

面试官真正想看的不是你会不会调模型，而是你有没有**系统调试的工程思维**。这道题属于**系统设计 + debug** 类型，刁钻点在于：候选人容易陷入“模型万能论”或“检索万能论”的单一归因。答好了能展示你具备**端到端链路分析能力**，能通过消融实验和数据指标（如 Recall@K、Answer Relevancy）精准定位瓶颈，而不是靠直觉甩锅。这在大厂处理线上 RAG 系统（如字节的豆包知识库、阿里的通义文档问答）时是核心硬实力。

#### 2️⃣ 标准答

RAG 效果差，第一反应怪模型，等于医生看到发烧直接开抗生素——**归因偏差**。模型只是链路最后一环，80% 的烂结果来自上游。必须按以下顺序系统排查：

#### 第一步：检索召回率（Recall@K）—— 最常背锅的其实是检索

- **检查指标**：用验证集算 Recall@K（K=5/10）。如果 < 0.7，问题在检索，不在模型。
- **常见坑**：Embedding 模型（如 text-embedding-3-small）对长文档语义捕捉差，导致召回不相关 chunk。**解法**：换用 Cohere Embed v3 或 BGE-M3，或混合检索（BM25 + Dense Embedding），BM25 默认 k1=1.5, b=0.75 对短文本更友好。
- **工程取舍**：纯 Dense 检索召回率高但计算成本大，混合检索增加延迟（约 20-50ms），但能提升 10-15% 的 Recall@K。线上系统通常用两阶段：先 BM25 粗筛 Top-200，再 Embedding 精排 Top-10。

#### 第二步：文档相关性（Precision@K）—— 召回对了，但内容没用

- **检查指标**：Precision@K（Top-K 中真正相关的比例）。如果 < 0.5，说明 chunk 策略有问题。
- **实际落地的坑**：chunk 切得太碎（如 128 tokens），导致上下文断裂；切得太整（如 1024 tokens），引入噪声。**解法**：动态 chunking（如按语义边界切，用 spaCy 或 LangChain 的 RecursiveCharacterTextSplitter），并加 10-20% 的 overlap（如 chunk_size=512, chunk_overlap=64）。
- **进阶**：引入 Reranker（如 Cohere Rerank 3 或 BGE-Reranker-v2），对 Top-10 重排，Precision 能再提 5-10%，但延迟增加 100-200ms。

#### 第三步：提示设计（Prompt Engineering）—— 模型没犯错，是你没教好

- **检查点**：提示是否明确要求“仅基于检索内容回答”？是否给了格式示例？上下文窗口是否超限（如 GPT-4 的 128K 窗口，但中间 token 注意力衰减）？
- **常见坑**：提示写“根据文档回答”，但模型仍会引入预训练知识。**解法**：加硬约束，如“如果检索内容不包含答案，直接说‘无法回答’”，并给 2-3 个 few-shot 示例。
- **工程取舍**：few-shot 示例增加 token 消耗（约 500-1000 tokens），但能提升 Answer Relevancy 10-20%。线上系统需平衡成本和质量。

#### 第四步：模型能力（LLM）—— 最后才怀疑

- **检查指标**：用消融实验——固定检索和提示，换不同模型（如 GPT-4o vs Llama 3.1 70B）。如果差距 < 5%，说明瓶颈不在模型。
- **实际落地的坑**：模型对长上下文的理解能力（如“大海捞针”测试）差异大。GPT-4o 在 128K 窗口的准确率约 95%，而小模型（如 7B）在 32K 时可能掉到 70%。**解法**：优先优化检索和提示，模型升级是最后手段。

**总结**：RAG 是系统工程，模型只是组件。用数据驱动（Recall、Precision、Answer Relevancy）定位瓶颈，别让模型背锅。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从检索质量、文档相关性、提示设计、模型能力四个层面回答。检索层面，先算 Recall@K，低于 0.7 就换混合检索或调 chunk 策略；文档层面，检查 Precision@K，低于 0.5 就加 Reranker 或动态 chunking；提示层面，加硬约束和 few-shot；模型层面，最后才用消融实验对比。总结一句：RAG 效果差，80% 的锅在检索和提示，模型只是背锅侠。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说 Recall@K 低于 0.7 就换检索，具体怎么换？线上系统延迟怎么控制？

> 换检索分三步：1）加 BM25 做粗筛（Top-200），用 Elasticsearch 实现，延迟约 5ms；2）用 Embedding 模型精排（Top-10），延迟约 20-30ms；3）可选加 Reranker（Top-5），延迟约 100ms。线上系统通常用两阶段：BM25 + Embedding，延迟可控在 50ms 内。如果对延迟敏感（如实时问答），可以牺牲一点 Recall，只用 BM25 或轻量 Embedding（如 all-MiniLM-L6-v2）。

**追问 2**：如果 Recall 和 Precision 都正常，但模型回答还是错，怎么排查？

> 做消融实验：固定检索结果和提示，换不同模型（如 GPT-4o vs Claude 3.5）。如果 GPT-4o 正确而 Claude 错误，说明模型能力是瓶颈；如果都错，问题在检索或提示。还可以做“大海捞针”测试：在检索内容中插入正确答案，看模型能否提取。如果模型能提取，说明提示设计有问题；如果不能，说明模型对长上下文理解差。

**追问 3**：你提到动态 chunking，具体怎么实现？有什么 trade-off？

> 动态 chunking 按语义边界切分，比如用 spaCy 的句子分割器或 LangChain 的 RecursiveCharacterTextSplitter（按段落、句子、字符递归切）。Trade-off：语义 chunking 能提升 Precision（减少噪声），但计算开销大（约 10-20ms 每文档），且对短文本（< 100 tokens）效果不明显。线上系统通常对长文档（> 1000 tokens）用动态 chunking，短文档用固定 chunk_size=256。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “RAG 效果差，肯定是模型不行，换 GPT-4o 就好了。” → ✅ “先查检索 Recall@K，低于 0.7 就换混合检索；再查提示设计，加硬约束；最后才考虑换模型。模型升级成本高，且不一定解决根本问题。”
- ❌ “检索没问题，因为 Embedding 模型是开源的。” → ✅ “Embedding 模型质量需要量化验证，用 Recall@K 和 Precision@K 指标。开源模型（如 BGE-M3）不一定比商业模型（如 OpenAI text-embedding-3-small）差，但需要针对领域数据微调。”
- ❌ “提示设计很简单，写清楚就行。” → ✅ “提示设计需要系统测试：加 few-shot 示例、硬约束（如‘仅基于检索内容’）、格式模板。用 Answer Relevancy 指标量化效果，A/B 测试不同版本。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“系统调试”角度切入，强调你如何用 Recall@K 和 Precision@K 定位检索瓶颈，并引入混合检索或 Reranker 提升 15% 准确率。举例：在文档问答系统中，通过消融实验发现检索是瓶颈，换用 BM25 + BGE-M3 后 Recall 从 0.6 提到 0.8。
- **如果你只做过传统 NLP**：用“分类任务”类比——RAG 效果差就像分类模型准确率低，不能只怪分类器，要先查特征工程（检索）和标签质量（提示）。强调你具备端到端调试思维。
- **如果你是校招无项目**：聚焦论文复现 demo，比如复现“Lost in the Middle”论文（Liu et al., 2023），展示你理解长上下文对模型的影响，并知道如何通过优化检索位置来提升效果。
- “Lost in the Middle: How Language Models Use Long Contexts” (Liu et al., 2023) —— 理解长上下文对模型的影响
- “RAG vs Fine-tuning: Pipelines, Trade-offs, and a Case Study” (Lewis et al., 2020) —— RAG 系统设计原则
- “BM25+25: A Variant of BM25 with Improved Performance” (Lv & Zhai, 2011) —— BM25 调参细节
- “Cohere Rerank 3: A State-of-the-Art Reranker for RAG” (Cohere Blog, 2024) —— Reranker 实战
- “LangChain RecursiveCharacterTextSplitter” 官方文档 —— 动态 chunking 实现
