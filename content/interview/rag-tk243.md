---
slug: rag-tk243
no: "1143"
title: "Q19: 在RAG里的「召回-过滤-生成「三段式 pipeline能细讲一下吗？**"
question: "Q19: 在RAG里的「召回-过滤-生成「三段式 pipeline能细讲一下吗？**"
excerpt: "面试官想看你是否真正理解RAG pipeline的工程本质，而非背概念。这道题是典型的系统设计+工程取舍类型，刁钻点在于：多数候选人只会说“召回用向量，生成用LLM”，但无法解释三段之间的耦合关系（如召回数量如何影响重排"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4273
updated: "2026-09-29"
---

## Q19: 在RAG里的「召回-过滤-生成「三段式 pipeline能细讲一下吗？**

`P1` · `rag`

🏷 标签：`rag`, `pipeline`, `retrieval`, `reranking`, `generation`

#### 1️⃣ 考察意图

面试官想看你是否真正理解RAG pipeline的工程本质，而非背概念。这道题是典型的**系统设计+工程取舍**类型，刁钻点在于：多数候选人只会说“召回用向量，生成用LLM”，但无法解释三段之间的耦合关系（如召回数量如何影响重排序延迟、过滤策略如何影响幻觉率）。答好了能展示你对检索系统（BM25/DPR/HNSW）、排序模型（Cross-encoder/ColBERT）、生成控制（prompt压缩/上下文窗口）的实战理解，以及端到端调优的全局观。

#### 2️⃣ 标准答

RAG的三段式pipeline是：**Retrieval → Filtering → Generation**。每一段都有明确的输入输出和trade-off，下面拆开讲。

#### 召回阶段（Retrieval）

- **目标**：从知识库中快速找到与query最相关的k个文档片段。
- **常用方法**：**稀疏检索**：BM25（默认k1=1.5, b=0.75），对关键词匹配敏感，适合术语密集场景（如医疗、法律）。
- **稠密检索**：DPR（双塔BERT）、Contriever（无监督训练），用embedding做ANN搜索（HNSW索引，ef_construction=200, M=16），对语义相似度更好。
- **混合检索**：BM25+稠密检索加权融合（如RRF，Reciprocal Rank Fusion），权重通常设为0.3:0.7。
工程取舍：召回数量k的选择。k太小（<5）容易漏掉关键信息；k太大（>50）会拖慢后续重排序和生成。实际落地中，k=20是常见起点，再根据延迟预算调整。坑+解法：稠密检索的embedding模型如果没做domain adaption（比如直接用开源的BGE-base），在垂直领域（如金融财报）召回率会暴跌20%+。解法：用领域数据微调embedding模型（如SimCSE或GTR），或加BM25做兜底。

#### 过滤阶段（Filtering）

- **目标**：从召回的k个片段中选出最相关、最不冗余的m个（m < k），送入生成器。
- **常用技术**：**重排序（Reranking）**：用Cross-encoder（如Cohere rerank-v3、BGE-reranker-v2）对每个(query, doc)对打分，复杂度O(k * L)，L为文档长度。通常k=20时，rerank延迟约50-100ms（GPU上）。
- **阈值过滤**：设定相似度阈值（如cosine > 0.7），低于阈值的直接丢弃。注意：阈值需要根据embedding模型和数据集调，否则容易全丢或全留。
- **多样性选择**：MMR（Maximal Marginal Relevance），平衡相关性和多样性，参数λ=0.5-0.7。避免生成时重复引用同一段内容。
工程取舍：rerank vs. 直接取top-k。rerank能提升2-5个点的Recall@m，但增加延迟。如果延迟敏感（如实时对话），可以只用稠密检索的top-k，跳过rerank。坑+解法：Cross-encoder的输入长度限制（通常512 tokens），长文档需要截断。解法：先做chunking（固定256 tokens，overlap 32），再rerank每个chunk，最后合并分数。

#### 生成阶段（Generation）

- **目标**：将过滤后的m个片段与query拼接，输入LLM生成答案。
- **关键设计**：**上下文压缩**：用LLMLingua或选择性上下文（Selective Context）压缩冗余内容，减少token消耗。例如，对金融财报，只保留数字和结论句。
- **提示设计**：用结构化prompt，如“根据以下文档回答：\n{context}\n问题：{query}\n答案：”。加指令“如果文档不包含答案，请说‘无法回答’”，减少幻觉。
- **上下文窗口**：LLM的窗口长度（如GPT-4 128k、Llama-3 8k）限制m个片段的总长度。实际中，m=3-5，每个片段300-500 tokens，总长1.5-2.5k tokens。
工程取舍：生成质量 vs. 延迟。用更长的上下文（m=10）可能提升准确率，但生成延迟线性增长（LLM的attention计算是O(n^2)）。解法：用FlashAttention或KV cache优化，或限制m≤5。坑+解法：LLM会“忽略”上下文中的矛盾信息，导致幻觉。解法：在prompt中加入“如果文档间存在矛盾，请指出并优先采用多数观点”，或加一个验证步骤（如用另一个LLM做fact-check）。

#### 三段衔接

- **召回→过滤**：k和m的比例。k=20, m=5是常见配置，但需要根据数据分布调。如果知识库噪声大（如网页爬取），k可以放大到50，然后用rerank过滤到5。
- **过滤→生成**：过滤后的片段需要保留原始位置信息（如文档ID、段落序号），方便生成时引用。否则LLM可能胡编来源。
- **端到端优化**：可以用REALM或Atlas的思路，将检索器、reranker、生成器联合训练，但成本高。实际中，更常见的是分别调优：先固定检索器，调reranker阈值；再固定reranker，调生成prompt。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从召回、过滤、生成三个层面回答。召回阶段，我用BM25+稠密检索混合，k=20，用HNSW索引加速；过滤阶段，用Cross-encoder rerank，结合MMR去重，m=5；生成阶段，用结构化prompt和上下文压缩，限制总长2k tokens。总结一句：三段式pipeline的核心是平衡召回率、延迟和生成质量，每个环节的trade-off都需要根据场景调优。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果召回结果全是噪声，怎么处理？

> 先检查检索器：如果是稠密检索，可能是embedding模型没做domain adaption，需要微调或加BM25兜底。如果是BM25，可能是query太短（如“价格”），需要query expansion（如用LLM生成同义词）。过滤阶段：降低rerank阈值（如从0.7降到0.5），或加一个分类器（如fastText）预过滤。生成阶段：在prompt中加“如果文档不相关，请忽略”，或让LLM输出“无法回答”。

**追问 2**：如何评估三段式pipeline的整体效果？

> 用端到端指标：F1、ROUGE-L、BLEU评估生成答案质量；用检索指标：Recall@k、MRR评估召回；用排序指标：NDCG@m评估过滤。注意：生成指标容易受LLM本身影响，建议做ablation study（去掉过滤 vs. 保留过滤），看指标变化。实际中，用KILT benchmark或自建数据集（1000条query+golden答案）做评测。

**追问 3**：如果知识库有1亿条文档，如何保证召回延迟在100ms内？

> 用分片索引（sharding）：按文档ID哈希分到多个HNSW索引，并行检索。用量化（如PQ，Product Quantization）压缩embedding，从float32降到int8，召回率损失<1%，速度提升3-5倍。用近似最近邻搜索（如Faiss的IVF-PQ），nprobe=10，召回率>95%。如果仍超时，减少k（如从20降到10），或跳过rerank，直接用top-k生成。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“召回用向量检索，生成用GPT，过滤用阈值” → ✅ 必须具体：向量检索用哪个模型（DPR/Contriever）、索引类型（HNSW/IVF）、阈值怎么定（基于验证集调优）。
- ❌ 说“过滤阶段就是取top-k” → ✅ 过滤包括rerank、去重（MMR）、阈值过滤，三者组合才能提升生成质量。
- ❌ 说“生成阶段直接拼接上下文” → ✅ 需要上下文压缩、prompt设计、矛盾处理，否则LLM容易幻觉。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“我在XX项目中用BM25+Cohere rerank，k=20, m=5，生成准确率提升15%”切入，强调调参过程（如MMR的λ从0.5调到0.7）。
- **如果你只做过传统NLP**：用“信息检索中的pipeline类比：召回类似TF-IDF检索，过滤类似排序模型（如LambdaMART），生成类似seq2seq”迁移，展示理解深度。
- **如果你是校招无项目**：聚焦“在KILT benchmark上复现了DPR+Cross-encoder+LLaMA，对比了不同过滤策略的F1差异”，展示论文复现和实验设计能力。
- Karpukhin et al., "Dense Passage Retrieval for Open-Domain Question Answering" (DPR, 2020)
- Khattab & Zaharia, "ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT" (2020)
- Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (RAG, 2020)
- Guu et al., "REALM: Retrieval-Augmented Language Model Pre-Training" (2020)
- Faiss官方文档：HNSW和IVF-PQ索引调优指南

---
