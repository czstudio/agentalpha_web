---
slug: rag-tk1336
no: "2236"
title: "📌 Q42: What are the key metrics for evaluating retrieval quality in RAG"
question: "📌 Q42: What are the key metrics for evaluating retrieval quality in RAG"
excerpt: "面试官想考察你对 RAG 检索质量评估体系的系统性理解，而非零散背诵指标。刁钻点在于：检索质量 ≠ 生成质量，但面试官会看你能否将两者关联，并识别出“高检索分低生成分”的陷阱。答好了能展示：① 对排序/召回/生成/效率四"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4269
updated: "2026-09-29"
---

## 📌 Q42: What are the key metrics for evaluating retrieval quality in RAG

`P1` · `rag`

🏷 标签：`rag`, `evaluation`, `metrics`, `retrieval`

#### 1️⃣ 考察意图

面试官想考察你对 RAG 检索质量评估体系的**系统性理解**，而非零散背诵指标。刁钻点在于：**检索质量 ≠ 生成质量**，但面试官会看你能否将两者关联，并识别出“高检索分低生成分”的陷阱。答好了能展示：① 对排序/召回/生成/效率四层指标的完整认知；② 对指标间 trade-off（如 Recall@k 与 Precision@k 的取舍）的工程直觉；③ 实际落地中如何用指标指导系统优化（如调 chunk size 或 reranker 阈值）。这是区分“背概念”和“真懂 RAG”的关键题。

#### 2️⃣ 标准答

评估 RAG 检索质量，我通常从四个维度切入：**排序质量、召回覆盖、生成影响、效率成本**。每个维度有核心指标和工程取舍。

**一、排序质量指标**

- **MRR（Mean Reciprocal Rank）**：衡量第一个相关文档的排名位置。公式：1/rank。适合“只取 top-1”的场景（如 QA 对）。坑：MRR 对多相关文档不敏感，若答案分散在多个文档中，MRR 会低估检索效果。
- **NDCG@k（Normalized Discounted Cumulative Gain）**：考虑多级相关性（如 0/1/2 分），并对排名靠后的文档做对数折损。适合“需要多文档综合回答”的场景（如摘要生成）。工程取舍：NDCG 需要人工标注相关性等级，成本高；实践中常用 BM25 分数或 embedding 余弦相似度作为代理标签，但会引入噪声。
- **MAP（Mean Average Precision）**：对每个查询计算平均精度，再取所有查询的均值。适合“文档级检索”（如法律案例检索），但对“片段级检索”（如段落检索）不够精细。

**二、召回覆盖指标**

- **Recall@k**：前 k 个文档中相关文档占比。核心 trade-off：k 越大，Recall 越高，但噪声也越多，增加 LLM 上下文窗口压力。实际落地坑：在金融财报 RAG 中，我遇到过 Recall@5 高达 0.9，但 LLM 生成答案仍出错——因为相关文档虽被召回，但排序靠后（第 4-5 位），LLM 注意力被前 3 个不相关文档稀释。解法：结合 reranker（如 Cohere Rerank 3 或 BGE-Reranker）重排，将 Recall@5 转化为 Recall@3 的精度。
- **Precision@k**：前 k 个文档中相关文档占比。与 Recall 呈反比。工程取舍：在电商客服 RAG 中，Precision 比 Recall 更重要——宁可漏掉一个相关文档，也不能给用户一个错误答案。此时我会设 k=3，并调低 chunk size（从 512 降到 256 tokens）来提升 Precision。

**三、生成影响指标**

- **Answer Recall / Answer Precision**：直接评估生成答案是否覆盖了标准答案中的关键实体或事实。用 ROUGE-L（基于最长公共子序列）或 BLEU（基于 n-gram 精确匹配）衡量。坑：ROUGE 对同义词不敏感（如“买” vs “购买”），导致低分；解法：用 BERTScore（基于 embedding 相似度）或 FactScore（基于原子事实分解）替代。
- **Faithfulness（忠实度）**：评估生成答案是否基于检索文档，而非 LLM 幻觉。常用工具：TrueTeacher（Google 2023）或 SelfCheckGPT。实际落地：在医疗 RAG 中，我遇到过检索文档正确但 LLM 自行“脑补”症状，导致 Faithfulness 分数低。解法：在 prompt 中显式要求“只基于以下文档回答”，并加温度=0。

**四、效率指标**

- **检索延迟（p95）**：从查询到返回 top-k 文档的时间。目标：<200ms（实时对话场景）。坑：HNSW 索引的 ef_search 参数调大（如从 128 到 512）会提升 Recall 但延迟翻倍。取舍：在离线批处理场景（如文档分析）可容忍 1-2s 延迟，但实时场景必须用量化（如 int8 量化 embedding）或近似搜索。
- **吞吐量（QPS）**：每秒处理的查询数。与延迟相关但不同：高 QPS 需要并行化（如多 GPU 部署 embedding 模型）或缓存（如用 Redis 缓存高频查询的检索结果）。

**总结**：没有万能指标。在电商场景优先 Precision@k + Faithfulness，在学术搜索场景优先 Recall@k + NDCG。关键是用指标指导系统迭代，而非盲目优化单一数字。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从排序质量、召回覆盖、生成影响、效率成本四个层面回答。排序层面用 MRR 和 NDCG@k 评估排名准确性，召回层面用 Recall@k 和 Precision@k 评估覆盖度，生成层面用 Answer Recall 和 Faithfulness 关联检索与生成，效率层面关注 p95 延迟和 QPS。总结一句：指标选择取决于业务场景——电商重 Precision，学术搜索重 Recall，且必须用 Faithfulness 兜底防止幻觉。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 Recall@5 很高但生成答案质量很差，你会怎么排查？

> 首先检查排序：用 NDCG@5 看相关文档是否排在 top-3。如果 NDCG 低，说明检索结果虽覆盖但排序混乱，LLM 注意力被稀释。解法：加 reranker（如 BGE-Reranker）或调 embedding 模型（如从 text-embedding-ada-002 换为 bge-large-en-v1.5）。其次检查 chunk 质量：用 chunk overlap（如 10% 重叠）避免信息断裂。最后检查 prompt：是否显式要求“只基于文档回答”，并加 few-shot 示例。

**追问 2**：在实时对话场景中，如何平衡 Recall 和延迟？

> 核心取舍：HNSW 索引的 ef_search 参数。ef_search=128 时 Recall@10 约 0.9，延迟 50ms；ef_search=512 时 Recall 提升到 0.95，但延迟 200ms。解法：① 对高频查询用缓存（如 Redis，TTL=5min）；② 对长尾查询用低 ef_search（如 128）快速返回；③ 用量化 embedding（如 int8 量化，精度损失 <1% 但速度提升 2x）。如果延迟仍超标，考虑用 BM25 作为 fallback（延迟 <10ms），但牺牲 Recall。

**追问 3**：你如何定义“相关性”来标注 NDCG 的 ground truth？

> 分三级：0（不相关）、1（部分相关，如包含关键词但无核心信息）、2（完全相关，如直接回答查询）。标注时用“答案覆盖度”而非“关键词匹配”——例如查询“苹果公司 2023 年营收”，文档只提“苹果”但无营收数据，标 1 而非 2。实际落地坑：人工标注成本高，我会先用 LLM（如 GPT-4）自动标注，再抽样 10% 人工校验，一致性达 0.85 以上才用。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提 Recall@k 和 Precision@k，忽略排序指标（MRR/NDCG）和生成指标（Faithfulness）。✅ 必须强调：检索质量最终服务于生成质量，Faithfulness 是“兜底指标”，否则高 Recall 可能对应高幻觉。
- ❌ 说“NDCG 比 MRR 好，所以只用 NDCG”。✅ 说明 trade-off：NDCG 需要多级相关性标注，成本高；MRR 适合单答案场景（如 FAQ）。选择取决于业务数据可用性。
- ❌ 忽略效率指标，只说“检索质量只看准确率”。✅ 在面试中主动提 p95 延迟和 QPS，展示工程落地意识。例如：“在实时场景，我会优先优化延迟，再提升 Recall。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在 XX 项目中用 Recall@5 和 NDCG@10 评估检索质量，发现高 Recall 低生成分，于是引入 reranker 并调 chunk size，最终生成准确率提升 12%”切入，展示指标驱动迭代。
- **如果你只做过传统 NLP**：用“传统 IR 中的 MAP 和 NDCG 迁移到 RAG，但需额外关注 Faithfulness 指标”类比，强调 RAG 的“检索-生成”耦合特性。
- **如果你是校招无项目**：聚焦“在 KILT 基准上复现 RAG 论文，用 Recall@5 和 NDCG@10 评估，并分析指标与生成准确率的相关性”，展示对公开基准的熟悉度。
- KILT: a Benchmark for Knowledge Intensive Language Tasks（2021）
- RAGAS: Automated Evaluation of Retrieval Augmented Generation（2023）
- TrueTeacher: Learning Factual Consistency Evaluation with Large Language Models（2023）
- BERTScore: Evaluating Text Generation with BERT（2020）
- HNSW: Efficient and Robust Approximate Nearest Neighbor Search（2016）

---
