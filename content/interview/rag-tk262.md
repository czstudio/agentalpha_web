---
slug: rag-tk262
no: "1162"
title: "Rerank 用的什么模型？为什么只排前 100 条"
question: "Rerank 用的什么模型？为什么只排前 100 条"
excerpt: "面试官想考察你对 Rerank 模块的工程落地理解，而非单纯背模型名。刁钻点在于：为什么是 100 条？不是 50 或 200？这背后是 Cross-Encoder 的 O(n) 计算成本与检索精度之间的 trade-o"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3850
updated: "2026-09-29"
---

## Rerank 用的什么模型？为什么只排前 100 条

`P1` · `rag` · **🏢 字节**

🏷 标签：`rerank`, `cross-encoder`, `performance-optimization`

#### 1️⃣ 考察意图

面试官想考察你对 Rerank 模块的**工程落地理解**，而非单纯背模型名。刁钻点在于：为什么是 100 条？不是 50 或 200？这背后是 Cross-Encoder 的 O(n) 计算成本与检索精度之间的 trade-off。答好了能展示你对**延迟-精度曲线**的量化感知，以及分页优化、模型选型等实战经验，属于系统设计 + 工程取舍的混合考察。

#### 2️⃣ 标准答

**模型选择：Cross-Encoder 家族**

主流生产级 Rerank 模型是 Cross-Encoder 架构，典型代表：

- **BGE-reranker-base**（BAAI 出品，中文场景首选，参数量约 278M，推理延迟约 15-30ms/条）
- **Cohere rerank-v3**（英文场景，API 调用，延迟约 50-100ms/条）
- **ColBERT v2**（轻量级，用 late interaction 近似 Cross-Encoder，延迟约 5-10ms/条，但精度略低）

为什么不用 Bi-Encoder（如 DPR）做 Rerank？因为 Bi-Encoder 的 embedding 是独立计算的，无法捕捉 query 与 doc 的细粒度交互（如否定词、指代消解）。Cross-Encoder 将 query 和 doc 拼接后做全连接注意力，精度更高，但代价是**计算复杂度 O(n)**——每条候选都要一次 Transformer 前向推理。

**为什么只排前 100 条？**

核心原因：**延迟-精度曲线的拐点**。

- **延迟瓶颈**：假设 BGE-reranker-base 单条推理 20ms，100 条就是 2 秒。如果排 200 条，延迟翻倍到 4 秒，用户可感知的卡顿（通常 3 秒是阈值）。而 50 条延迟 1 秒，但可能漏掉高相关文档。
- **精度收益递减**：实验数据（通用知识）表明，Rerank 前 100 条时，Recall@10 可达 85-90%；扩展到 200 条，Recall 仅提升 2-3%，但延迟翻倍。100 条是**性价比最优解**。
- **分页优化**：实际落地时，对搜索结果的前 3 页（约 30 条）做精排，之后直接跳过或只做轻量级排序（如 BM25 分数截断）。这样既保证头部精度，又避免全量 Rerank 的浪费。

**实际落地的坑 + 解法**

- **坑 1：模型加载慢**。Cross-Encoder 模型加载到 GPU 显存约 1-2GB，如果服务冷启动，首次请求延迟高达 5-10 秒。解法：预加载 + 模型池化（如用 ONNX Runtime 量化，显存降到 500MB，加载时间缩至 1 秒）。
- **坑 2：长文档截断**。Cross-Encoder 通常限制输入长度 512 tokens，长文档会被截断，丢失尾部关键信息。解法：对文档做**滑动窗口**（如 512 tokens 窗口，步长 256），取所有窗口的 max score 作为最终分。
- **坑 3：批量推理的 batch size 选择**。batch size 太小（如 1）浪费 GPU 并行能力；太大（如 64）导致显存溢出。经验值：batch size = 16-32，延迟和吞吐的平衡点。

#### 3️⃣ 答题模板（30 秒电梯版）

> "这个问题我从模型选型、候选数量选择、工程优化三个层面回答。模型层面，主流用 Cross-Encoder 如 BGE-reranker-base，精度高但单条推理成本约 20ms。候选数量选 100 条，因为延迟-精度曲线在 100 条处出现拐点——再增加候选，Recall 提升不足 3% 但延迟翻倍。工程上，我会做分页优化，只对前 3 页精排，并采用滑动窗口处理长文档。总结一句：100 条是延迟和精度的工程平衡点，具体数字需根据业务延迟 SLA 微调。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果业务要求延迟 < 500ms，你怎么调整？

> 延迟 500ms 意味着只能排 25 条（单条 20ms）。我会做**级联 Rerank**：先用轻量级模型（如 ColBERT v2，单条 5ms）排 100 条，取 top 25 交给 BGE-reranker-base 精排。这样总延迟 = 1005ms + 2520ms = 1s，还是超了。进一步优化：将 ColBERT 的候选数降到 50 条，总延迟 = 505ms + 2520ms = 750ms，仍超。最终方案：**只对前 10 条做 Cross-Encoder**，其余用 BM25 分数截断，延迟 = 10*20ms = 200ms，满足 SLA。代价是尾部精度下降，但头部精度不变。

**追问 2**：Rerank 模型怎么训练？用什么样的数据？

> 训练数据是**query-doc 对 + 相关性标签**（0/1 或 1-5 分）。常用数据集：MS MARCO（英文）、DuReader（中文）。训练时用 pairwise loss（如 RankNet 的交叉熵）或 listwise loss（如 LambdaRank）。注意：负样本要**hard negative mining**——从 BM25 或 Bi-Encoder 召回的高分但无关文档中采样，否则模型学不会区分模糊边界。实际落地时，我会用业务日志中的用户点击数据做微调，比如把点击的 doc 作为正样本，展示但未点击的作为负样本。

**追问 3**：如果候选文档数量是 1000 条，你怎么处理？

> 1000 条全量 Rerank 不现实（延迟 20s）。我会用**两阶段召回**：第一阶段用 BM25 或 Bi-Encoder 粗排，取 top 200；第二阶段用 Cross-Encoder 精排 top 100。如果 200 条仍太多，可以引入**近似最近邻（ANN）** 索引（如 HNSW）加速粗排，将候选数降到 100 以内。另一种思路：**分桶 Rerank**——将 1000 条按 BM25 分数分成 10 个桶（每桶 100 条），对每个桶内做 Rerank，然后跨桶合并结果。这样总延迟 = 10 * 100 * 20ms = 20s，还是不行。最终方案：只对 top 3 桶（300 条）做 Rerank，其余丢弃，延迟 = 3 * 100 * 20ms = 6s，可接受。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“用 GPT-4 做 Rerank” → ✅ 正确切入：GPT-4 延迟高（秒级）且成本贵（每条 \$0.01），不适合生产级 Rerank。应该用轻量级 Cross-Encoder 如 BGE-reranker-base。
- ❌ 说“排 100 条是因为模型输入限制” → ✅ 正确切入：模型输入限制（如 512 tokens）是文档长度问题，不是候选数量问题。100 条是延迟-精度 trade-off 的工程决策。
- ❌ 说“Rerank 和 Embedding 模型一样” → ✅ 正确切入：Embedding 模型（Bi-Encoder）独立编码 query 和 doc，Rerank 模型（Cross-Encoder）拼接后交互编码，计算复杂度差一个数量级。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从项目中的延迟优化切入，比如“我在项目中用 BGE-reranker-base 做 Rerank，通过实验发现 100 条时 Recall 达到 88%，延迟 2.1s，符合业务 SLA”。可以提分页优化和 batch size 调优的具体数字。
- **如果你只做过传统 NLP**：用文本分类做类比，比如“Cross-Encoder 类似文本对分类任务，每条候选都要做一次推理，所以候选数量必须控制”。强调你对 Transformer 推理复杂度的理解。
- **如果你是校招无项目**：聚焦论文复现，比如“我复现过 ColBERT 论文，理解 late interaction 如何降低 Cross-Encoder 的计算成本”。可以提 MS MARCO 数据集上的实验，展示你对延迟-精度曲线的量化分析。
- BAAI/BGE 官方文档：BGE-reranker 模型使用指南
- ColBERTv2: Effective and Efficient Retrieval via Lightweight Late Interaction（论文）
- MS MARCO Passage Ranking 数据集与基线
- ONNX Runtime 模型量化教程（用于加速 Cross-Encoder 推理）
- 字节跳动 RAG 实践：Rerank 模块的延迟优化方案（技术博客）

---
