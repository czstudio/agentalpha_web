---
slug: rag-tk1174
no: "2074"
title: "| 3 | What are the fundamental challenges of RAG systems"
question: "| 3 | What are the fundamental challenges of RAG systems"
excerpt: "面试官想考察你对 RAG 系统整条链路瓶颈的系统性认知，而非零散知识点。刁钻点在于：区分“知道问题存在”和“能给出工程取舍方案”。答好了能展示你从检索、生成到系统集成的全局视野，以及解决实际落地中 recall/prec"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4120
updated: "2026-09-29"
---

## | 3 | What are the fundamental challenges of RAG systems

`P1` · `rag`

🏷 标签：`rag`, `challenges`, `system-design`, `retrieval`, `generation`

#### 1️⃣ 考察意图

面试官想考察你对 RAG 系统整条链路瓶颈的系统性认知，而非零散知识点。刁钻点在于：区分“知道问题存在”和“能给出工程取舍方案”。答好了能展示你从检索、生成到系统集成的全局视野，以及解决实际落地中 recall/precision 矛盾、幻觉、延迟等问题的硬实力。这是 P1 进阶题，要求你不仅列出挑战，还要给出具体 trade-off 和坑。

#### 2️⃣ 标准答

RAG 系统的核心挑战可归纳为三大层面：检索质量、生成质量、系统集成。每个层面都有具体工程取舍和落地坑。

**1. 检索质量：Recall vs. Precision 的永恒矛盾**

- **挑战**：低 recall 导致关键文档缺失，模型只能“瞎编”；低 precision 引入噪声，干扰生成。语义鸿沟（如用户问“苹果股价”，检索到“水果价格”）是根本原因。
- **解法**：混合检索（BM25 + Dense Embedding）。BM25 擅长精确匹配（k1=1.5, b=0.75 默认参数），DPR/ColBERT 捕捉语义。权重比例需根据场景调优（如客服问答 7:3，技术文档 5:5）。
- **坑**：单一 embedding 模型在跨领域时 recall 骤降。**实际落地**：用 Cohere Embed v3 或 BGE-M3 做多语言/多领域，但计算成本翻倍。Trade-off：混合检索提升 recall 10-15%，但延迟增加 20-30ms，需用 HNSW 索引（ef_search=128）加速。

**2. 生成质量：幻觉与上下文冲突**

- **挑战**：模型不忠实于检索文档，产生幻觉；多文档间信息矛盾（如两篇文档对“2023 年 Q3 营收”给出不同数字）；长上下文下模型“迷失在中间”（Lost in the Middle）。
- **解法**：Rerank 阶段用 Cohere Rerank 或 BGE-Reranker 压缩 Top-K（从 20 降到 5），减少噪声。生成时用 RoPE 位置编码（如 Llama 3 的 8K 上下文）配合 FlashAttention，但长上下文仍会稀释关键信息。
- **坑**：直接拼接所有文档导致 token 浪费。**实际落地**：采用“摘要-检索-生成”流水线，先对文档做 chunking（256 tokens/chunk，重叠 32 tokens），再检索。Trade-off：chunk 越小 precision 越高，但 recall 下降；重叠能缓解，但增加 10% 计算量。

**3. 系统集成：延迟、成本与评估的三角博弈**

- **挑战**：端到端优化困难——检索延迟（50-100ms）+ 生成延迟（1-3s）叠加；评估指标不统一（Recall@K 与 BLEU 不相关）；知识更新时索引版本混乱。
- **解法**：用 GRPO（Group Relative Policy Optimization）微调生成模型，使其更依赖检索结果。评估用 RAGAS（Faithfulness + Answer Relevancy + Context Precision）替代单一指标。
- **坑**：索引更新频率过高导致系统抖动。**实际落地**：采用“增量索引 + 冷热分离”，热数据（最近 7 天）每 30 分钟更新，冷数据每日全量重建。Trade-off：增量更新快（<1s），但可能漏掉全局一致性；全量重建保证质量，但耗时 10 分钟。

**4. 可解释性：黑盒调试难题**

- **挑战**：检索和生成都是黑盒，难以定位错误源头（是检索漏了，还是模型没读对？）。
- **解法**：在 pipeline 中插入日志（检索 Top-5 文档 ID + 相似度分数，生成时输出 attention 权重）。用 LangSmith 或 Weights & Biases 追踪 trace。
- **坑**：日志量过大影响性能。**实际落地**：只记录失败案例（如用户反馈“答案不对”），采样率 1%，用异步写入。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从检索质量、生成质量、系统集成三个层面回答。检索层面，核心是 recall 与 precision 的矛盾，我用混合检索（BM25 + Dense）加 HNSW 索引解决；生成层面，幻觉和上下文冲突靠 rerank 和 chunking 优化；系统层面，延迟与成本平衡通过增量索引和 GRPO 微调。总结一句：RAG 的挑战本质是信息密度与计算效率的 trade-off，没有银弹，只能按业务场景定制。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到混合检索，具体怎么调 BM25 和 Dense 的权重？有没有场景只用一种？

> 权重调优用网格搜索（grid search）在验证集上最大化 Recall@5。比如客服问答场景，BM25 权重 0.7 时 Recall 最高，因为用户问题常含精确实体（订单号、产品名）。但技术文档检索（如 API 文档）语义相似更重要，Dense 权重可到 0.8。只用一种的场景：如果数据全是短文本（<50 tokens），BM25 足够；如果数据是长文档且语义差异大，Dense 更好。但混合检索通常更鲁棒，除非延迟敏感（如实时对话），才放弃混合。

**追问 2**：Rerank 阶段怎么选模型？Cohere Rerank 和 BGE-Reranker 有什么区别？

> Cohere Rerank 是商业 API，延迟低（<10ms/query），适合生产环境，但成本高（每千次 \$0.01）。BGE-Reranker 是开源模型（如 BGE-Reranker-v2-m3），可本地部署，但需要 GPU（A10 以上），延迟 20-30ms。Trade-off：Cohere 省心但贵，BGE 可控但需运维。实际落地：如果 QPS < 100，用 BGE 省钱；如果 QPS > 1000，用 Cohere 避免 GPU 瓶颈。

**追问 3**：你提到 GRPO 微调，具体怎么操作？和直接 SFT 有什么区别？

> GRPO 是强化学习微调，目标是让生成模型更依赖检索上下文。具体做法：定义 reward 函数（如 Faithfulness 分数 + 答案相关性），用 PPO 优化。和 SFT 区别：SFT 只学习“模仿”正确答案，但可能忽略检索文档；GRPO 通过 reward 惩罚“不忠实于上下文”的输出。比如，SFT 后模型可能直接背出训练数据中的答案，而 GRPO 强制它引用检索结果。但 GRPO 训练不稳定，需要调 clip 参数（0.2）和 learning rate（1e-6），且 reward 模型质量很关键。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只列挑战（“检索不准、生成幻觉、延迟高”），不给具体数字或解法 → ✅ 每个挑战都要有 trade-off 和落地坑，比如“BM25 默认参数 k1=1.5 在短文本上 recall 低，需调为 1.2”
- ❌ 说“用更好的模型解决一切”（如“用 GPT-5 就解决了”） → ✅ 强调工程取舍，比如“GPT-5 虽强，但延迟和成本翻倍，实际用 7B 模型加 rerank 更划算”
- ❌ 忽略评估，只说“效果很好” → ✅ 必须提具体指标（Recall@5、Faithfulness 分数），并说明评估的难点（如 BLEU 与检索质量不相关）

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从项目中的具体挑战切入，比如“在客服问答中，我遇到低 recall 问题，用混合检索（BM25 + BGE-M3）将 Recall@5 从 0.6 提升到 0.85，但延迟增加了 30ms，后用 HNSW 索引优化到 15ms”。
- **如果你只做过传统 NLP**：用类比迁移，比如“传统信息检索的 TF-IDF 与 BM25 取舍，对应 RAG 中 Dense 与 Sparse 的 trade-off；传统摘要的冗余问题，对应 RAG 中多文档冲突”。
- **如果你是校招无项目**：聚焦论文复现，比如“我复现了‘Lost in the Middle’论文，发现 Llama 2 在 4K 上下文时，关键信息在开头和结尾的准确率差 20%，这解释了 RAG 中 chunking 和 rerank 的必要性”。
- “Lost in the Middle: How Language Models Use Long Contexts” (Liu et al., 2023)
- “RAGAS: Automated Evaluation of Retrieval Augmented Generation” (Es et al., 2023)
- “BGE-M3: Multi-Lingual, Multi-Granularity Embedding” (BAAI, 2024)
- “GRPO: Group Relative Policy Optimization for LLM Alignment” (DeepSeek, 2024)
- “HNSW: Efficient and Robust Approximate Nearest Neighbor Search” (Malkov & Yashunin, 2016)

---
