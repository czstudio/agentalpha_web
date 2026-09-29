---
slug: eval-tk110
no: "1010"
title: "你说混合检索把召回率从 0.72 提到了 0.89，这个数字怎么来的"
question: "你说混合检索把召回率从 0.72 提到了 0.89，这个数字怎么来的"
excerpt: "面试官真正想看的是：你是否具备科学评估的工程化思维，而不是只会背概念或拍数字。这道题是典型的“debug + 系统设计”混合型考察，刁钻点在于：候选人往往只记得优化后的数字，却说不清测试集怎么来的、指标怎么算的、有没有过"
tags: ["真题解析", "评测"]
category: "eval"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4043
updated: "2026-09-29"
---

## 你说混合检索把召回率从 0.72 提到了 0.89，这个数字怎么来的

`P1` · `evaluation` · 🏢 腾讯

#### 1️⃣ 考察意图

面试官真正想看的是：你是否具备**科学评估的工程化思维**，而不是只会背概念或拍数字。这道题是典型的“debug + 系统设计”混合型考察，刁钻点在于：候选人往往只记得优化后的数字，却说不清测试集怎么来的、指标怎么算的、有没有过拟合。答好了能展示：你懂如何构建高质量评估集、能解释指标计算细节、能识别评估中的偏差（如数据泄露、场景覆盖不足），这是大厂做 RAG 系统迭代的核心硬实力。

#### 2️⃣ 标准答

这个数字不是拍脑袋，而是基于一套**可复现的评估流水线**，分三步构建：

**第一步：测试集构建（200 条 query，覆盖 4 个场景）**

- **场景划分**：从线上日志随机采样 200 条真实用户 query，按难度分为：简单（50 条，答案在单文档首段）、中等（80 条，需跨段落拼接）、复杂（50 条，需多文档推理）、噪声（20 条，无答案或歧义 query）。
- **标注参考答案**：每条 query 由 2 名标注员独立标注“支持证据”（supporting passage），不一致时由 senior 仲裁。关键：**证据必须精确到文档 ID + 段落号**，不能只给摘要，否则 Recall 计算会虚高。
- **防数据泄露**：确保测试集 query 和文档库中的文档**不来自同一时间窗口**（比如用上周的 query 配上周之前的文档），否则模型可能“记住”答案。

**第二步：指标计算（Recall@K，K=5）**

- **公式**：Recall@5 = (测试集中至少有一个支持证据出现在 Top-5 检索结果中的 query 数) / 总 query 数。
- **为什么用 Recall@5 而非 Precision**：RAG 场景下，检索是“召回管道”，后续有 rerank 和 LLM 生成，所以更关心**是否漏掉关键证据**，而非检索结果是否精确。Precision 是 rerank 阶段的事。
- **混合检索实现**：用 BM25（k1=1.5, b=0.75）做稀疏检索 + 用 DPR（dense passage retriever，基于 BERT 的 768 维 embedding）做稠密检索，然后按 **RRF（Reciprocal Rank Fusion）** 融合，公式：score = 1/(k + rank_sparse) + 1/(k + rank_dense)，k 取 60。这个 k 值是个 trade-off：k 越小，稀疏检索权重越大（适合精确匹配）；k 越大，稠密检索权重越大（适合语义匹配）。实测 k=60 在内部数据集上平衡最好。

**第三步：结果验证（人工抽检 50 条校准）**

- **自动化评估的坑**：RAGAS 等工具算 Recall 时，依赖 embedding 相似度判断“是否命中”，但 embedding 可能把语义相近但证据不同的 passage 误判为命中。比如 query “苹果公司最新财报”，检索到“苹果公司 2023 年营收”，embedding 相似度高，但实际财报内容不同。
- **解法**：人工抽检 50 条（按场景分层抽样），让标注员看 Top-5 结果中是否真的包含支持证据。发现 RAGAS 的 Recall 比人工高约 8%（因为 embedding 误判），所以最终数字 0.89 是**人工校准后的值**（RAGAS 原始 0.97，人工校准后 0.89）。
- **从 0.72 到 0.89 的增量**：基线是纯 BM25（Recall@5=0.72），混合检索后提升到 0.89。提升主要来自复杂场景（从 0.55 到 0.82），因为稠密检索能捕获同义改写（如“苹果公司” vs “Apple Inc.”），而 BM25 会漏掉。

**实际落地的坑 + 解法**：

- **坑**：测试集 query 分布与线上不一致。比如线上 60% 是简单 query，但测试集里复杂 query 占 50%，导致 Recall 虚低。
- **解法**：按线上日志的 query 分布**加权计算 Recall**，而不是简单平均。比如简单 query 权重 0.6，复杂 0.3，噪声 0.1，最终 Recall 更贴近线上真实表现。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从测试集构建、指标计算、结果验证三个层面回答。测试集是 200 条真实 query，覆盖简单/中等/复杂/噪声四个场景，并人工标注了支持证据。指标用 Recall@5，混合检索用 BM25 + DPR 做 RRF 融合。关键数字 0.89 是人工抽检 50 条校准后的值，因为 RAGAS 的 embedding 判断会虚高约 8%。总结一句：这个数字是科学评估流水线的输出，不是拍脑袋。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你用的 DPR 是哪个 checkpoint？为什么不用 ColBERT 或 Cohere embedding？

> **应对策略**：DPR 用的是 Facebook 的 `facebook/dpr-ctx_encoder-single-nq-base`，因为它是开箱即用的稠密检索模型，且与 BM25 互补性好。ColBERT 的 late interaction 虽然精度更高，但推理延迟是 DPR 的 3-5 倍（因为要计算 token-level 交互），不适合线上实时检索。Cohere embedding 是商业 API，成本高且不可控。这里 trade-off 是：DPR 在精度和延迟之间平衡，适合作为混合检索的稠密组件。

**追问 2**：你怎么保证测试集没有过拟合？比如你调了 k 值，会不会恰好对这套测试集最优？

> **应对策略**：过拟合风险确实存在。解法是：把测试集拆成 dev（150 条）和 holdout（50 条）。调参（如 RRF 的 k 值、BM25 的 k1）只在 dev 上做，holdout 只用于最终验证。另外，holdout 的 query 来自**不同时间窗口**（比如 dev 用上周 query，holdout 用上上周），避免时间相关性。最终数字 0.89 是 holdout 上的结果，不是 dev 上的。

**追问 3**：如果线上 query 分布变了，比如突然多了很多长尾 query，你的 Recall 会掉吗？

> **应对策略**：会掉。所以评估不是一次性的，而是**持续监控**。做法是：每周从线上日志采样 50 条 query，自动标注（用已有的支持证据库，如果 query 相似度 > 0.9 则复用标注），然后跑 Recall 监控。如果连续两周 Recall 下降超过 5%，就触发重新调参或更新 embedding 模型。另外，测试集需要定期更新（比如每月一次），加入新的 query 类型。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“我用 RAGAS 跑了一下，Recall 就是 0.89” → ✅ 必须说明测试集来源、标注方式、人工校准过程，否则面试官会认为你缺乏工程验证能力。
- ❌ 说“混合检索就是 BM25 + embedding 拼接” → ✅ 要具体到融合方法（RRF 或加权平均），并给出 k 值或权重，展示你做过调参。
- ❌ 说“Recall 从 0.72 到 0.89，提升了 23%” → ✅ 要说明基线是什么（纯 BM25），以及提升主要来自哪个场景（复杂 query），否则显得数字空洞。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“如何构建测试集”切入，强调你用了线上真实 query 并做了人工标注，展示你对评估质量的重视。可以提你用了 RRF 融合，并解释了 k 值的调参过程。
- **如果你只做过传统 NLP**：用“分类任务中的 F1 评估”类比，说明 Recall 在 RAG 中的角色类似“召回率”，并强调你理解评估集构建的难点（如数据泄露、场景覆盖）。
- **如果你是校招无项目**：聚焦“论文复现”，比如你复现了 DPR 论文中的评估流程，并自己构建了一个 100 条 query 的 demo 测试集，用 BM25 + DPR 跑 Recall@5，展示了从理论到实践的能力。
- 《Dense Passage Retrieval for Open-Domain Question Answering》（Karpukhin et al., 2020）
- 《ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT》（Khattab & Zaharia, 2020）
- 《Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods》（Cormack et al., 2009）
- RAGAS 官方文档：评估指标详解（Recall@K、Faithfulness、Answer Relevance）
- 《Evaluating RAG Systems: A Practical Guide》（博客，作者：Jerry Liu，LlamaIndex 创始人）

---
