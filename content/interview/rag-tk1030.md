---
slug: rag-tk1030
no: "1930"
title: "什么情况下应该先动 Chunk，什么情况下应该先动 Rerank，什么情况下该动 Prompt"
question: "什么情况下应该先动 Chunk，什么情况下应该先动 Rerank，什么情况下该动 Prompt"
excerpt: "面试官想看你是否具备 RAG 系统调试的优先级判断力，而非只会背概念。这是一道工程取舍+系统设计题，刁钻点在于：候选人常机械回答“先改 chunk 再 rerank 最后 prompt”，但实际场景中，瓶颈可能出现在任意"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4116
updated: "2026-09-29"
---

## 3 什么情况下应该先动 Chunk，什么情况下应该先动 Rerank，什么情况下该动 Prompt

#### 1️⃣ 考察意图

面试官想看你是否具备 RAG 系统调试的**优先级判断力**，而非只会背概念。这是一道**工程取舍+系统设计**题，刁钻点在于：候选人常机械回答“先改 chunk 再 rerank 最后 prompt”，但实际场景中，瓶颈可能出现在任意环节，且改动成本差异巨大（改 prompt 成本最低，改 chunk 需重建索引）。答好了能展示你**从指标反推根因**的实战能力，以及**对检索-排序-生成整条链路杠杆的量化理解**。

#### 2️⃣ 标准答

**核心原则：从指标反推根因，按“成本-收益”排序。** 不要死记顺序，而是看当前系统的**失败模式**。

#### 场景一：先动 Chunk（召回层问题）

- **触发信号**：Recall@K 低（如 < 70%），或检索结果中**相关片段被截断**（chunk 太小）、**包含大量无关内容**（chunk 太大）。
- **具体操作**：
- 若 chunk 太小（如 128 tokens），导致实体/关系跨块断裂 → 增大 chunk size（如 512 tokens）并加 10-20% 重叠（overlap）。
- 若 chunk 太大（如 1024 tokens），导致语义稀释 → 改用**语义分块**（Semantic Chunking），按段落边界或 embedding 相似度切分。
- **为什么先动**：召回是 RAG 的**天花板**——如果相关文档都没捞到，后续 rerank 和 prompt 再优化也无效。改动成本中等（需重建索引），但收益上限高。
- **实际落地的坑**：增大 chunk 后，embedding 向量维度不变但内容变长，可能导致**语义坍缩**（长文本 embedding 平均化）。解法：改用**ColBERT 的 late interaction** 或 **HyDE**（假设性文档嵌入）来缓解。

#### 场景二：先动 Rerank（排序层问题）

- **触发信号**：Recall@K 达标（如 > 80%），但 **MRR（Mean Reciprocal Rank）低**，或 Top-1 结果不相关，而 Top-5 里有正确答案。
- **具体操作**：
- 若未使用 reranker → 引入交叉编码器（Cross-Encoder），如 BGE-Reranker-v2 或 Cohere Rerank 3.5。
- 若已有 reranker → 检查是否**过拟合**（只在训练集上表现好）或**阈值不合理**（如过滤掉低分但相关的文档）。
- **为什么先动**：当召回已覆盖但排序不准时，rerank 是**性价比最高的杠杆**——一个轻量级交叉编码器（如 110M 参数）就能明显提升 Top-1 准确率，且无需重建索引。改动成本低（只需加一个 API 调用或模型推理）。
- **实际落地的坑**：reranker 的推理延迟可能成为瓶颈。解法：对 Top-100 结果 rerank，而非全量；或使用 **ColBERT-v2** 的近似排序（代价更低）。

#### 场景三：先动 Prompt（生成层问题）

- **触发信号**：检索结果质量高（Recall 和 MRR 都好），但**模型输出不符合指令**（如格式错误、幻觉、过度重复）。
- **具体操作**：
- 若模型忽略上下文 → 在 prompt 中显式强调“仅基于以下文档回答”，并加 few-shot 示例。
- 若输出过长/过短 → 添加长度约束（如“不超过 3 句话”）。
- 若幻觉严重 → 使用**结构化输出**（如 JSON schema）或 **chain-of-thought** 引导模型先提取证据再回答。
- **为什么先动**：改 prompt 成本最低（无需改索引或模型），且能快速验证是否生成层瓶颈。但注意：prompt 优化**不能弥补检索缺陷**——如果相关文档没被召回，再好的 prompt 也无效。
- **实际落地的坑**：过度优化 prompt 可能导致**过拟合**（只在特定数据集上有效）。解法：使用 **prompt 模板版本控制**，并做 A/B 测试（如对比有无 few-shot 的准确率）。

#### 综合判断流程

1. **先看 Recall**：若 < 70%，先动 chunk（或检索策略，如 BM25 + DPR 混合）。
2. **再看 MRR**：若 Recall 达标但 MRR < 0.6，先动 rerank。
3. **最后看生成质量**：若前两者都好但输出差，先动 prompt。
4. **成本考量**：改 prompt（分钟级）< 改 rerank（小时级）< 改 chunk（天级，需重建索引）。优先选成本低、收益高的改动。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，先看指标——Recall 低先动 chunk，MRR 低先动 rerank，生成质量差先动 prompt；第二，看成本——改 prompt 最快，改 rerank 次之，改 chunk 最慢；第三，看杠杆——chunk 决定召回天花板，rerank 提升排序精度，prompt 优化生成质量。总结一句：**从指标反推根因，按成本-收益排序，不要死记顺序。**”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 Recall 和 MRR 都低，你同时改 chunk 和 rerank，怎么评估各自贡献？

> 用**消融实验**：先只改 chunk（如从 256 到 512 tokens），记录 Recall 变化；若 Recall 提升但 MRR 没变，说明 chunk 是主因；若 Recall 没变但 MRR 提升，说明 chunk 不是瓶颈。再改 rerank（如引入 Cross-Encoder），对比 MRR 增量。注意：改 chunk 后需重建索引，所以先做小规模实验（如 10% 数据），确认收益后再全量。

**追问 2**：你的系统用了 BM25 和 DPR 混合检索，但 Recall 还是低，怎么办？

> 先排查混合策略：BM25 和 DPR 的权重是否合理（如 0.5:0.5）？尝试**动态权重**（根据 query 类型调整，如长 query 侧重 BM25，短 query 侧重 DPR）。若仍不行，考虑**查询改写**（Query Rewriting）：用 LLM 将用户 query 改写为更利于检索的形式（如“苹果公司”改为“Apple Inc. 2023 年财报”）。注意：查询改写会增加延迟，需权衡。

**追问 3**：你提到改 prompt 成本最低，但实际中改 prompt 后效果不稳定，怎么解决？

> 使用**prompt 模板版本控制**（如 Git 管理），并做 A/B 测试：对 10% 流量用新 prompt，对比旧 prompt 的准确率和用户满意度。若波动大，检查是否**few-shot 示例过少**（至少 3-5 个）或**指令模糊**（如“用中文回答”比“回答”更明确）。另一个坑：LLM 对 prompt 顺序敏感，尝试**随机打乱 few-shot 示例**来验证稳定性。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “先改 chunk，再改 rerank，最后改 prompt，这是标准流程。” → ✅ “标准流程是错的。实际中，如果 Recall 达标但生成质量差，先改 prompt 成本更低；如果 Recall 低，才先改 chunk。**顺序取决于失败模式，而非固定步骤。**”
- ❌ “改 chunk 就是增大 size，改 rerank 就是加模型，改 prompt 就是加指令。” → ✅ “改 chunk 要考虑语义完整性（如用 Semantic Chunking），改 rerank 要关注延迟和阈值，改 prompt 要避免过拟合。**每个改动都有 trade-off，不能一刀切。**”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“实际调试经历”切入，举例说明你如何通过指标（Recall/MRR）定位瓶颈，并描述改动前后的量化对比（如 Recall 从 65% 提升到 82%）。
- **如果你只做过传统 NLP**：用“搜索系统类比”迁移——Chunk 类似索引粒度（如倒排索引的 term 选择），Rerank 类似排序模型（如 LTR），Prompt 类似查询改写。强调你理解“从指标反推根因”的通用方法论。
- **如果你是校招无项目**：聚焦“论文复现 demo”——如复现 LlamaIndex 的“RAG 调试指南”，用公开数据集（如 Natural Questions）模拟不同失败模式，并记录优化顺序。突出你的**系统化思维**。
- 《RAG 系统调试：从指标到根因》（LlamaIndex 官方博客）
- 《ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction》（SIGIR 2020）
- 《HyDE: Precise Zero-Shot Dense Retrieval without Relevance Labels》（ACL 2023）
- 《BGE-Reranker-v2: A Lightweight Cross-Encoder for RAG》（BAAI 技术报告）
- 《Prompt Engineering Guide》（DAIR.AI 开源项目）

---
