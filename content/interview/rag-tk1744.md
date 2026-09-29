---
slug: rag-tk1744
no: "2644"
title: "What are the fundamental challenges of RAG systems"
question: "What are the fundamental challenges of RAG systems"
excerpt: "面试官想看你是否真正动手搭过 RAG，而非只背过“检索+生成”的概念。考察类型是系统设计 + 工程取舍。刁钻点在于：很多人只提“检索不准”，但忽略了融合阶段的语义冲突和评估体系的缺失。答好了能展示你对 RAG 整条链路的"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3475
updated: "2026-09-29"
---

## What are the fundamental challenges of RAG systems

#### 1️⃣ 考察意图

面试官想看你是否真正动手搭过 RAG，而非只背过“检索+生成”的概念。考察类型是**系统设计 + 工程取舍**。刁钻点在于：很多人只提“检索不准”，但忽略了**融合阶段的语义冲突**和**评估体系的缺失**。答好了能展示你对 RAG 整条链路的系统性认知，以及从论文（如 Lewis 2020）到落地（如 LangChain 踩坑）的实战经验。

#### 2️⃣ 标准答

RAG 的核心挑战可拆为五个层面，每个都有具体 trade-off 和坑。

- **检索质量：召回率与精度的博弈**
- 问题：检索器（如 BM25 或 DPR）可能返回不相关或缺失关键文档。BM25 对词频敏感，但语义泛化差；DPR 语义好，但训练数据偏差会导致域外失效。
- 工程取舍：用**混合检索**（BM25 + 稠密向量）加**重排序**（如 Cohere Rerank 或 Cross-Encoder）来平衡。代价是延迟增加 50-100ms，需要权衡实时性。
- 落地坑：索引更新滞后。文档被修改后，向量库（如 Faiss）未及时重建，导致检索到过期内容。解法：用**增量索引**（如 Milvus 的 CDC 机制）或设置 TTL 强制刷新。
- **融合困难：多段文本的语义冲突**
- 问题：LLM 收到多段检索结果后，可能因信息矛盾（如“价格是 100 元” vs “价格是 120 元”）或冗余（重复段落）而生成幻觉。
- 解法：用**上下文压缩**（如 LlamaIndex 的 `SentenceWindowRetriever`）或**重排序后截断**（只取 Top-K 且去重）。更高级的是**自适应融合**（如 Self-RAG 用反射令牌决定是否引用检索结果）。
- 为什么这么做：直接拼接所有片段会让 LLM 的注意力分散，增加幻觉概率。压缩后保留关键事实，但可能丢失上下文，需要调 K 值（经验值：K=3-5）。
- **鲁棒性：噪声放大效应**
- 问题：检索错误（如返回无关文档）会被 LLM 放大，生成看似合理但错误的答案。对抗性输入（如故意插入误导文本）更危险。
- 落地坑：用户输入“苹果公司最新产品”，检索器可能返回“苹果（水果）价格”，LLM 生成“苹果很好吃”。解法：加**输入分类器**（如用 BERT 判断意图）或**检索后验证**（用 NLI 模型检查文档与问题的蕴含关系）。
- 工程取舍：验证增加 200ms 延迟，但能降低 30% 幻觉率（来自【通用知识】）。
- **效率：延迟与成本的平衡**
- 问题：检索（向量搜索）+ 生成（LLM 推理）的端到端延迟可能超过 2 秒。索引更新（如全量重建）在百万级文档上耗时数小时。
- 解法：用**近似最近邻搜索**（如 HNSW）替代暴力搜索，牺牲 1% 精度换 10 倍速度。索引更新用**异步批处理**，避免阻塞在线服务。
- 为什么这么做：HNSW 的图结构在内存中，适合低延迟场景；但文档频繁增删时，图重构成本高，需用 IVF 等分层索引。
- **评估：缺乏统一指标**
- 问题：传统指标（如 BLEU、ROUGE）不适用于 RAG，因为它们不衡量忠实度（是否基于检索结果）或答案覆盖率（是否遗漏关键信息）。
- 解法：用**RAGAS**（Faithfulness、Answer Relevancy、Context Precision）或**RGB**（Retrieval-Generation Benchmark）。更细粒度：人工标注 + LLM-as-Judge（如 GPT-4 打分）。
- 落地坑：LLM-as-Judge 有位置偏差（偏好第一个答案）。解法：多次采样取平均，或使用**Pairwise Comparison**（如 Chatbot Arena 方法）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从检索质量、融合困难、鲁棒性、效率和评估五个层面回答。检索层面，混合检索加重排序能提升召回，但增加延迟；融合层面，上下文压缩避免语义冲突；鲁棒性上，加验证器抑制噪声放大；效率用 HNSW 和异步索引；评估用 RAGAS 和 LLM-as-Judge。总结一句：RAG 的挑战本质是精度、延迟和鲁棒性的三角平衡。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到混合检索，具体怎么实现？BM25 和 DPR 的权重怎么调？

> 实现上，用 `pyserini` 做 BM25 检索，`sentence-transformers` 生成 DPR 向量，存入 Faiss。权重调优用**网格搜索**：在验证集上测试 0.3/0.7、0.5/0.5、0.7/0.3 等组合，以 Recall@K 为目标。经验值：BM25 权重 0.4、DPR 0.6 在通用场景下表现好。注意：权重固定后，重排序器（如 Cohere Rerank）能进一步修正，所以混合检索的权重不必太精确。

**追问 2**：RAG 的幻觉和纯 LLM 的幻觉有什么区别？怎么针对性解决？

> 纯 LLM 幻觉源于参数化知识不足或错误；RAG 幻觉更多是**检索噪声**（无关文档）或**融合错误**（LLM 忽略检索结果）。解法不同：纯 LLM 用**检索增强训练**（如 RAG-Token 微调）；RAG 用**检索后验证**（如 NLI 检查）或**自反思**（如 Self-RAG 的反射令牌）。落地时，优先用验证器，因为微调成本高。

**追问 3**：你怎么评估 RAG 系统的忠实度？有没有具体指标？

> 用 RAGAS 的 `faithfulness` 指标：将生成答案拆成原子声明，用 NLI 模型检查每个声明是否被检索文档支持。分数范围 0-1，0.8 以上算好。注意：NLI 模型（如 DeBERTa）对长文本有偏见，所以先分句再评估。更鲁棒的做法是**人工抽样**：每 100 个样本抽 10 个，让标注员打分，与 RAGAS 分数做相关性分析。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提“检索不准”，然后说“用更好的 embedding 解决” → ✅ 必须系统化：检索不准只是冰山一角，还要讲融合冲突、噪声放大、评估缺失，并给出具体方法（如混合检索、上下文压缩、RAGAS）。
- ❌ 说“RAG 没有幻觉，因为基于检索” → ✅ 纠正：RAG 仍有幻觉，源于检索噪声或 LLM 忽略检索结果。要提验证器和自反思机制。
- ❌ 把评估简单说成“用 BLEU 就行” → ✅ 指出 BLEU 不衡量忠实度，推荐 RAGAS 或 LLM-as-Judge，并说明位置偏差等坑。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在项目中遇到检索噪声导致幻觉”切入，讲你如何用混合检索 + 重排序解决，并量化效果（如幻觉率降 30%）。
- **如果你只做过传统 NLP**：用“信息检索与文本生成的矛盾”类比，比如 BM25 的精确匹配 vs 语义检索的泛化，迁移到 RAG 的融合挑战。
- **如果你是校招无项目**：聚焦论文复现，比如复现 Lewis 2020 的 RAG 模型，在 Natural Questions 上分析检索器对答案准确率的影响，并设计消融实验。
- Lewis et al., “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks”, 2020
- Shao et al., “Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection”, 2023
- RAGAS: “RAGAS: Automated Evaluation of Retrieval Augmented Generation”, 2023
- LangChain 官方文档：Contextual Compression Retriever
- Milvus 文档：Incremental Indexing with CDC
