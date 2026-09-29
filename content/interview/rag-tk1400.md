---
slug: rag-tk1400
no: "2300"
title: "| 53 | How do you balance relevance and diversity when retrieving document chunks for RAG"
question: "| 53 | How do you balance relevance and diversity when retrieving document chunks for RAG"
excerpt: "面试官想考察你能否在 RAG 检索中解决“高相关性但内容冗余”这一核心工程矛盾。这不是背概念题，而是系统设计 + 工程取舍题。刁钻点在于：单纯追求相关性会导致检索结果全是同一段落的变体，LLM 无法获得多角度信息；而强行"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3527
updated: "2026-09-29"
---

## | 53 | How do you balance relevance and diversity when retrieving document chunks for RAG

`P2` · `rag`

🏷 标签：`rag`, `diversity`, `mmr`, `retrieval`, `relevance`

#### 1️⃣ 考察意图

面试官想考察你能否在 RAG 检索中解决“高相关性但内容冗余”这一核心工程矛盾。这不是背概念题，而是**系统设计 + 工程取舍**题。刁钻点在于：单纯追求相关性会导致检索结果全是同一段落的变体，LLM 无法获得多角度信息；而强行引入多样性又会引入噪声，降低生成质量。答好了能展示你对检索排序的算法设计能力、对 MMR 等经典方法的参数调优经验，以及用评估指标量化 trade-off 的工程思维。

#### 2️⃣ 标准答

核心矛盾：相关性高的 chunk 往往语义重叠（如同一篇文章的连续段落），导致 LLM 输入上下文被冗余信息填满，无法覆盖不同视角。平衡方案分三层：**算法层**、**检索层**、**评估层**。

**1. 算法层：MMR（Maximal Marginal Relevance）**

MMR 是经典解法，公式为：`MMR = argmax[ λ * Sim(Q, D_i) - (1-λ) * max Sim(D_i, D_j) ]`

- `Sim(Q, D_i)`：chunk 与查询的相关性（用 embedding 余弦相似度或 BM25 分数）。
- `max Sim(D_i, D_j)`：chunk 与已选集合中最近 chunk 的相似度（惩罚冗余）。
- `λ`：平衡参数，λ=1 纯相关，λ=0 纯多样。

**工程取舍**：λ 的调优依赖场景。例如在 FAQ 问答中，λ 设 0.7-0.8 即可（问题明确，冗余容忍度低）；在开放域摘要中，λ 需降到 0.4-0.5 以覆盖多角度。**实际落地的坑**：MMR 是贪心算法，复杂度 O(N²)，当候选 chunk 数 N>1000 时，每次排序都计算两两相似度会拖慢延迟。**解法**：先粗排（用 BM25 或 embedding 召回 top-200），再对 top-200 做 MMR 精排，将复杂度控制在可接受范围。

**2. 检索层：多路召回 + 聚类**

- **多路召回**：同时用 BM25（关键词匹配）和 Dense Retrieval（语义匹配）各召回 top-K，合并后去重。BM25 擅长抓取精确术语，Dense 擅长语义泛化，天然互补。
- **聚类后选择**：对召回结果做 K-Means 聚类（k 设为期望的多样性数，如 5），每类选一个代表 chunk（选离聚类中心最近的）。**坑**：聚类数 k 难定，可用肘部法则或固定为 3-5，但需注意聚类本身有计算开销。

**3. 评估层：联合指标**

不能只看相关性（如 NDCG@K），必须加多样性指标：

- **Intra-list Diversity**：计算已选 chunk 两两之间的平均余弦距离，值越大越多样。
- **Distinct n-grams**：统计生成答案中不重复的 n-gram 比例（如 distinct-1/2/3），反映信息覆盖度。
- **联合指标**：`Score = α * NDCG@K + β * Intra-list Diversity`，α+β=1，通过线上 A/B 实验调优。

**实际落地的坑**：多样性指标可能被“噪声 chunk”刷高（如完全不相关的 chunk 距离大但无意义）。**解法**：在多样性计算前先过滤掉相关性低于阈值（如余弦相似度<0.3）的 chunk，确保多样性建立在有效信息上。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从算法层、检索层、评估层三个层面回答。算法层用 MMR 公式 `λ * 相关度 - (1-λ) * 冗余度` 直接平衡，λ 根据场景调优；检索层用多路召回（BM25 + Dense）和聚类后选择来天然引入多样性；评估层用 NDCG@K 和 Intra-list Diversity 联合指标量化 trade-off。总结一句：没有万能参数，必须通过线上实验找到 λ 和 α 的最优值。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：MMR 的 λ 怎么调？有没有通用经验值？

> 没有通用值，但可以给经验范围：FAQ/知识库问答（问题明确）λ 设 0.7-0.8；开放域摘要/多角度分析 λ 设 0.4-0.5。调优方法：在验证集上遍历 λ（步长 0.1），用联合指标 `0.5*NDCG@K + 0.5*Intra-list Diversity` 选最优。注意：λ 对结果敏感，0.1 的差异可能让 ROUGE-L 掉 3-5 个点，所以必须做网格搜索。

**追问 2**：如果用户查询很短（如“苹果”），怎么保证多样性？

> 短查询语义模糊，直接 MMR 可能选出“苹果公司”和“苹果水果”的混合结果。解法：先用查询扩展（如用 LLM 生成 3-5 个相关子问题：“苹果公司的产品”、“苹果的营养价值”等），对每个子问题分别检索，再合并去重。这样从意图层面保证多样性，比 MMR 在结果层面做后处理更有效。

**追问 3**：MMR 的 O(N²) 复杂度怎么优化？能上生产吗？

> 能上生产，但需优化：1）先粗排召回 top-200（用 HNSW 索引或 BM25），再对 top-200 做 MMR，复杂度降到 O(200²) 约 4 万次计算，毫秒级完成。2）用近似最近邻（如 Faiss 的 IndexIVF）加速相似度计算，将余弦距离计算替换为内积近似。3）如果候选集固定（如每周更新一次），可以预计算所有 chunk 两两相似度矩阵，MMR 时直接查表。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“直接用 MMR 就行，λ 设 0.5 平衡” → ✅ 必须强调 λ 依赖场景，并给出调优方法（网格搜索 + 联合指标），否则显得没实战经验。
- ❌ 说“多样性就是随机采样几个 chunk” → ✅ 随机采样会引入噪声，正确做法是聚类后选代表或 MMR 惩罚冗余，确保多样性建立在相关性基础上。
- ❌ 说“评估只看 ROUGE-L 或 BLEU” → ✅ 这些指标只衡量相关性，必须加多样性指标（Intra-list Diversity / Distinct n-grams）才能全面评估平衡效果。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在 XX 项目中用 MMR 解决了检索冗余问题”切入，给出 λ 调优的具体数值（如 λ=0.6 时 ROUGE-L 提升 5%），并提到用 Intra-list Diversity 做离线评估。
- **如果你只做过传统 NLP**：用“文本摘要中的最大边际相关性（MMR）与 RAG 中的 MMR 本质相同”类比，强调你理解贪心算法在序列选择中的 trade-off，并展示你熟悉 BM25 和 embedding 相似度计算。
- **如果你是校招无项目**：聚焦“在 MS MARCO 数据集上复现 MMR 算法”的 demo，说明你对比了 λ=0.3/0.5/0.7 下的 NDCG@K 和 Distinct-2 变化，并给出可视化图表。
- 《The MMR (Maximal Marginal Relevance) Algorithm》 - Carbonell & Goldstein, 1998
- 《Dense Passage Retrieval for Open-Domain Question Answering》 - Karpukhin et al., 2020
- 《Improving Retrieval-Augmented Generation with MMR and Clustering》 - 知乎技术博客（通用知识）
- 《Faiss: A Library for Efficient Similarity Search》 - Facebook AI Research
- 《Evaluating Diversity in Text Generation: A Survey》 - 综述论文（通用知识）

---
