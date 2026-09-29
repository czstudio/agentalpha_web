---
slug: rag-tk1725
no: "2625"
title: "在RAG里的「召回-过滤-生成「三段式 pipeline能细讲一下吗"
question: "在RAG里的「召回-过滤-生成「三段式 pipeline能细讲一下吗"
excerpt: "面试官想看你是否真正理解RAG pipeline的工程落地细节，而非背诵“检索-增强-生成”的教科书定义。考察类型是系统设计+工程取舍，刁钻点在于：多数人只讲流程，但说不出每个环节的量化权衡（如召回Top-K选多少、过滤"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3430
updated: "2026-09-29"
---

## 在RAG里的「召回-过滤-生成「三段式 pipeline能细讲一下吗

#### 1️⃣ 考察意图

面试官想看你是否真正理解RAG pipeline的工程落地细节，而非背诵“检索-增强-生成”的教科书定义。考察类型是**系统设计+工程取舍**，刁钻点在于：多数人只讲流程，但说不出每个环节的量化权衡（如召回Top-K选多少、过滤用MMR还是阈值、生成时如何防止上下文污染）。答好了能展示你对信息检索、排序模型、LLM推理瓶颈的硬核理解，以及从端到端优化视角（如REALM、FiD）的全局观。

#### 2️⃣ 标准答

RAG的标准三段式是 **Retrieve → Filter → Generate**，但实际落地时每段都有坑和trade-off。

**召回阶段：构建索引与混合检索**

- **索引构建**：用稠密向量（如DPR、Contriever）或稀疏向量（BM25）。稠密检索依赖embedding模型，常用`text-embedding-3-small`或`bge-large`，但注意**领域漂移**：通用embedding在金融/医疗语料上Recall可能掉20%+，需微调或加领域数据。
- **检索策略**：混合检索（BM25 + 稠密）是标配，权重通常设0.3/0.7（稀疏/稠密），用`Reciprocal Rank Fusion`合并结果。**坑**：BM25默认参数`k1=1.5, b=0.75`对长文档不友好，长文档得分偏高，需调`b`到0.3-0.5。
- **召回数量**：Top-K选多少？经验值：K=20-50。K太小漏召回，K太大增加过滤和生成开销。**工程取舍**：K=50时生成延迟比K=10高2-3倍（因上下文变长），但F1可能只涨1-2%，所以常用动态K：根据查询复杂度（如查询长度、实体数）调整。

**过滤阶段：去重、排序与多样性**

- **去重**：用`MinHash`或`SimHash`对召回片段去重，避免生成时重复信息导致幻觉。**坑**：语义重复（如“苹果公司”和“Apple Inc.”）需用embedding相似度阈值（cosine>0.9）过滤。
- **重排序**：用Cross-encoder（如`Cohere rerank-v3`或`BGE-reranker-v2`）对Top-K结果打分，取Top-N（N=3-5）。Cross-encoder比Bi-encoder准，但计算量大（O(N*L)），所以只对Top-K重排。**实际落地的坑**：Cross-encoder对长文本（>512 tokens）会截断，导致漏掉关键信息，需用`sliding window`或`Longformer`变体。
- **多样性选择**：用MMR（Maximal Marginal Relevance）平衡相关性和多样性，参数`lambda=0.5`。**为什么这么做**：避免生成时只依赖单一来源（如维基百科），导致答案片面。例如，问“特斯拉股价”，MMR能同时召回财报和新闻，而非全是财报。

**生成阶段：上下文拼接与幻觉控制**

- **上下文拼接**：将过滤后的Top-N片段按相关性降序拼接，用`[SEP]`或`\n\n`分隔。注意**上下文窗口**：LLM（如Llama 3 8B）有8K-128K窗口，但长上下文会稀释注意力，建议限制在4K tokens内，超出部分用`sliding window`或`压缩`（如`LLMLingua`）。
- **提示设计**：用结构化prompt，如`"基于以下文档：\n{docs}\n回答：{query}"`。**坑**：不加指令时LLM可能直接复制文档（导致幻觉），需加`"如果文档不包含答案，说'无法回答'"`。
- **幻觉控制**：用`Self-RAG`或`Corrective RAG`，在生成后做事实核查（如用NLI模型检查答案是否被文档支持）。**工程取舍**：加核查增加20-30%延迟，但能降低幻觉率50%+（【通用知识】）。

**优化方向**：端到端训练（如REALM、FiD）可联合优化检索和生成，但计算成本高，适合离线场景。动态调整各阶段参数（如根据查询类型切换K值）是更实用的工程方案。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从召回、过滤、生成三个层面回答。召回阶段用混合检索（BM25+稠密）和动态Top-K；过滤阶段用Cross-encoder重排加MMR保证多样性；生成阶段控制上下文长度并用Self-RAG防幻觉。总结一句：RAG的瓶颈不在单点，而在三段的衔接和参数调优。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果召回结果全是噪声，怎么诊断和修复？

> 先量化噪声比例：用`query-doc relevance score`（如Cross-encoder得分<0.3的视为噪声）。修复分三步：1）检查embedding模型是否领域适配，若否，用`LoRA`微调；2）调整检索权重，增加BM25的稀疏匹配（如`b`调低到0.3）；3）在过滤阶段加`hard negative mining`，用`Contrastive Learning`训练重排器。

**追问 2**：生成时上下文太长导致LLM忽略关键信息，怎么处理？

> 用`Lost in the Middle`现象（LLM更关注开头和结尾），所以把最相关片段放开头和结尾。具体做法：重排后Top-1放开头，Top-2放结尾，中间放次要片段。或用`FlashAttention`加速长上下文推理，但注意显存占用（8K tokens约2GB显存）。

**追问 3**：怎么评估RAG pipeline的整体质量？

> 用`RAGAS`框架：召回用`Recall@K`和`MRR`，过滤用`NDCG@N`，生成用`Faithfulness`（NLI模型检查）和`Answer Relevancy`（embedding相似度）。端到端用`F1`和`ROUGE-L`。注意：`Faithfulness`比`ROUGE-L`更关键，因为RAG核心是减少幻觉。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“召回用向量检索就够了，BM25过时了” → ✅ 正确切入：混合检索是标配，BM25在低频词和精确匹配上比稠密强，尤其在领域数据上。
- ❌ 说“过滤阶段直接取Top-5就行，不用重排” → ✅ 正确切入：Top-5可能全是噪声，Cross-encoder重排能提升生成质量10-20%（【通用知识】），但需注意计算开销。
- ❌ 说“生成阶段用长上下文模型（如128K）就能解决所有问题” → ✅ 正确切入：长上下文会稀释注意力，导致LLM忽略关键信息，需控制上下文长度并用结构化拼接。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“混合检索+动态K”切入，强调你如何调BM25参数和Cross-encoder重排，并给出F1提升数据（如从0.65到0.72）。
- **如果你只做过传统NLP**：用“信息检索+排序模型”类比，说你熟悉BM25和Cross-encoder（如BERT-based reranker），并展示你如何迁移到RAG。
- **如果你是校招无项目**：聚焦REALM论文复现，说你实现过端到端训练，并对比了不同检索策略的Recall@K，用公开数据集（如KILT）验证。
- 《REALM: Retrieval-Augmented Language Model Pre-Training》
- 《FiD: Fusion-in-Decoder for Open-Domain Question Answering》
- 《Lost in the Middle: How Language Models Use Long Contexts》
- 《RAGAS: Automated Evaluation of Retrieval Augmented Generation》
- 《Corrective RAG: Self-Correcting Retrieval-Augmented Generation》
