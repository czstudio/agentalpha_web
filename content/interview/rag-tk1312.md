---
slug: rag-tk1312
no: "2212"
title: "项目:你在项目里有没有做过 RAG 里的「召回-过滤-生成「三段式 pipeline?能不能细讲一下"
question: "项目:你在项目里有没有做过 RAG 里的「召回-过滤-生成「三段式 pipeline?能不能细讲一下"
excerpt: "面试官想看你是否真正动手调过 RAG pipeline，而非只背概念。考察类型是工程取舍 + 系统设计。刁钻点在于：三段式看似简单，但每个环节都有大量 trade-off（如召回阶段 BM25 vs 向量检索的互补性、过"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4111
updated: "2026-09-29"
---

## 项目:你在项目里有没有做过 RAG 里的「召回-过滤-生成「三段式 pipeline?能不能细讲一下

`P1` · `rag`

🏷 标签：`rag`, `retrieval`, `reranking`, `pipeline`, `qa`

#### 1️⃣ 考察意图

面试官想看你是否真正动手调过 RAG pipeline，而非只背概念。考察类型是**工程取舍 + 系统设计**。刁钻点在于：三段式看似简单，但每个环节都有大量 trade-off（如召回阶段 BM25 vs 向量检索的互补性、过滤阶段重排序的延迟成本、生成阶段 prompt 长度对幻觉的影响）。答好了能展示你对检索系统、排序模型和 LLM 生成瓶颈的深度理解，以及**用数据驱动调优**的实战能力。

#### 2️⃣ 标准答

我在金融 QA 项目中完整实现了“召回-过滤-生成”三段式 pipeline，核心目标是**在保证召回率的前提下，提升最终答案的准确率和相关性**。下面分阶段拆解：

- **召回阶段：混合检索 + 多路召回**使用 **BM25**（默认 k1=1.5, b=0.75）做关键词匹配，捕获精确术语（如“ROE 20%”）；同时用 **DPR**（基于 BERT-base 的 bi-encoder）做语义检索，处理同义改写（如“净利润率” vs “净利率”）。
- **为什么这么做**：单一检索器有盲区。BM25 对拼写错误和同义词不鲁棒，DPR 对罕见实体（如“2023Q3 财报”）召回差。混合后，**Recall@20 从 65% 提升到 88%**（在内部金融数据集上验证）。
- **实际落地的坑**：向量检索的 embedding 模型选择。初期用通用 Sentence-BERT（all-MiniLM-L6-v2），对金融术语（如“衍生品” vs “衍生工具”）区分度差。换成 **FinBERT**（领域微调版）后，相似度计算准确率提升 12%。
- **工程取舍**：多路召回带来延迟增加（BM25 + DPR 总耗时约 80ms vs 单路 30ms）。通过**异步并行调用**（Python asyncio + 连接池）将延迟压到 50ms 以内。
过滤阶段：重排序 + 规则去重
- 召回 top-20 文档后，用 **Cross-encoder**（如 BGE-Reranker-v2-M3）逐对打分，保留 top-5。Cross-encoder 比 bi-encoder 更精准，但计算成本高（每对约 5ms），所以只对 top-20 重排。
- **为什么这么做**：bi-encoder 的向量相似度是近似匹配，Cross-encoder 能捕捉 query-doc 的细粒度交互（如否定词“不包含”）。在金融 QA 中，重排序将**最终答案准确率从 75% 提升到 88%**。
- **实际落地的坑**：重排序阈值设置。初期固定阈值 0.5，导致低分但相关文档被误杀（如“风险提示”类文档）。改为**动态阈值**（基于 top-5 分数的中位数 + 标准差）后，召回率回升 5%。
- **规则过滤**：去重（基于 Jaccard 相似度，阈值 0.8）、时间过滤（只保留近 3 年财报）、长度过滤（丢弃 < 50 字或 > 2000 字的片段）。
生成阶段：结构化 prompt + 指令约束
- 将 top-5 文档按相关性降序拼接，注入 prompt，格式为：`[文档1] 内容... [文档2] 内容...`。指令明确要求“仅基于给定文档回答，若无法回答则输出‘无相关信息’”。
- **为什么这么做**：减少幻觉。未约束时，LLM（如 GPT-4）会编造数据（如虚构的“2024 年营收”）。加入指令后，**幻觉率从 15% 降至 3%**（人工标注 500 条测试集）。
- **实际落地的坑**：prompt 长度超限。top-5 文档平均 1500 token，加上 query 和指令后接近 4k。使用 **FlashAttention**（v2）优化推理，并设置 **max_tokens=2048** 截断低分文档。
- **关键优化点**：chunk 大小选择。初期用 512 token 固定分块，导致跨块信息断裂（如“净利润”和“增长率”分到不同 chunk）。改为**语义分块**（基于段落边界 + 滑动窗口 256 token 重叠），Recall@5 提升 10%。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从召回、过滤、生成三个层面回答。召回阶段用 BM25 + DPR 混合检索，解决单一检索器的盲区，Recall@20 从 65% 提升到 88%。过滤阶段用 Cross-encoder 重排序 + 动态阈值，准确率从 75% 提升到 88%。生成阶段用结构化 prompt 和指令约束，幻觉率从 15% 降到 3%。总结一句：RAG 的核心不是堆模型，而是用数据驱动调优每个环节的 trade-off。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到混合检索，BM25 和 DPR 的权重怎么配？有没有试过其他检索器？

> 权重基于**召回率曲线**动态调整。初期固定 BM25:DPR = 0.5:0.5，但发现 DPR 对长尾实体召回差。改为**自适应权重**：对 query 长度 < 5 词时 BM25 权重 0.7（短查询偏关键词），> 10 词时 DPR 权重 0.7（长查询偏语义）。也试过 **ColBERT**（late interaction），在延迟和精度间平衡，但部署成本高（需 GPU），最终没上线。在 Natural Questions 数据集上，ColBERT 的 Recall@20 比 DPR 高 3%，但延迟增加 2 倍。

**追问 2**：重排序的 Cross-encoder 模型怎么选？有没有考虑过用 LLM 做 rerank？

> 选型看**精度 vs 延迟**。BGE-Reranker-v2-M3 在 BEIR 基准上 NDCG@10 为 0.62，延迟 5ms/对；Cohere Rerank 3 精度更高（NDCG@10 0.65），但延迟 15ms/对且收费。LLM 做 rerank（如 GPT-4 打分）精度最好（NDCG@10 0.70），但延迟 500ms+，适合离线场景。线上选 BGE 是因为**性价比最优**。注意：LLM rerank 有位置偏差（偏好开头文档），需随机打乱输入顺序。

**追问 3**：生成阶段怎么处理多文档矛盾？比如两个文档对同一问题给出不同答案？

> 用**置信度投票**。每个文档的 Cross-encoder 分数作为权重，LLM 生成时在 prompt 中标注“文档 A（置信度 0.9）: 内容... 文档 B（置信度 0.6）: 内容...”。LLM 会优先采纳高置信度文档。如果矛盾无法调和（如两个文档都高置信度），输出“存在矛盾信息，请参考原始文档”。在金融 QA 中，矛盾率约 5%，通过此方法将准确率从 82% 提升到 87%。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “我直接用向量检索，效果很好，不需要 BM25。” → ✅ “向量检索对同义词好，但对精确术语和拼写错误差。混合检索是工业界标配，能互补盲区。”
- ❌ “重排序用 Cross-encoder 就行，不用调参。” → ✅ “Cross-encoder 的阈值和 top-k 需要调优。固定阈值会误杀低分相关文档，动态阈值更鲁棒。”
- ❌ “生成阶段把文档全塞进 prompt，LLM 自己会处理。” → ✅ “不约束 prompt 会导致幻觉和上下文长度超限。必须用指令限制回答范围，并截断低分文档。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“混合检索的权重调优”切入，展示你如何用 Recall@k 曲线做决策，并提到你对比过 BM25、DPR、ColBERT 的 trade-off。
- **如果你只做过传统 NLP**：用“信息检索 vs 语义匹配”类比迁移。比如 BM25 像 TF-IDF 的升级版，Cross-encoder 像 BERT 的 fine-grained 分类。强调你理解检索系统的核心指标（Recall、Precision）。
- **如果你是校招无项目**：聚焦论文复现。提到你在 Natural Questions 数据集上复现了 DPR 论文，并对比了 BM25 和 DPR 的 Recall@20。展示你对 RAG 各环节的**理论理解**和**动手能力**。
- Karpukhin et al., "Dense Passage Retrieval for Open-Domain Question Answering", EMNLP 2020
- Khattab & Zaharia, "ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT", SIGIR 2020
- BGE-Reranker: "BGE Reranker v2.0: A Strong Reranker for Information Retrieval", 2024
- Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", NeurIPS 2020
- 博客：RAG Pipeline 调优指南（含 chunking、retrieval、reranking 的工程实践）

---
