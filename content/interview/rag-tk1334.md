---
slug: rag-tk1334
no: "2234"
title: "📌 Q40: What are the common retrieval approaches used in RAG systems"
question: "📌 Q40: What are the common retrieval approaches used in RAG systems"
excerpt: "面试官想考察你对 RAG 检索层的系统性理解，而非简单罗列方法。这题是典型的系统设计 + 工程取舍类型，刁钻点在于：候选人能否从“检索方法”延伸到“场景选型”和“实际落地权衡”。答好了能展示：① 对稀疏/稠密/混合检索的"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4328
updated: "2026-09-29"
---

## 📌 Q40: What are the common retrieval approaches used in RAG systems

`P1` · `rag`

🏷 标签：`rag`, `retrieval`, `sparse`, `dense`, `hybrid`

#### 1️⃣ 考察意图

面试官想考察你对 RAG 检索层的**系统性理解**，而非简单罗列方法。这题是典型的**系统设计 + 工程取舍**类型，刁钻点在于：候选人能否从“检索方法”延伸到“场景选型”和“实际落地权衡”。答好了能展示：① 对稀疏/稠密/混合检索的底层原理和适用边界的清晰认知；② 对延迟、精度、资源消耗等工程约束的敏感度；③ 结合具体业务场景（如客服、知识库、代码搜索）给出推荐方案的能力。

#### 2️⃣ 标准答

RAG 的检索层是系统瓶颈，选错方法直接导致回答质量崩塌。主流方法分三类：稀疏检索、稠密检索、混合检索，外加一些特定场景的变体。

#### 稀疏检索（Sparse Retrieval）

- **核心方法**：BM25（改进版 TF-IDF），基于词频（TF）和逆文档频率（IDF），默认参数 k1=1.5, b=0.75。还有更古老的 TF-IDF 和 Query Likelihood Model。
- **为什么用**：精确匹配强，对专有名词（如“GPT-4”、“HNSW”）和罕见实体（如“Q40”）召回率高。计算快，倒排索引结构下，单次检索延迟 <10ms（百万级文档）。
- **工程取舍**：无法处理语义匹配（“汽车”和“车辆”不匹配），且词袋模型忽略词序。**实际落地的坑**：中文场景下，分词器（如 jieba）的词典质量直接影响 BM25 效果，未登录词（如“Transformer”）会被切碎导致召回失败。解法：构建领域词典，或使用字粒度 BM25（如 char-level n-gram）兜底。

#### 稠密检索（Dense Retrieval）

- **核心方法**：双编码器架构（Dual Encoder），如 DPR（Dense Passage Retriever）、ColBERT（late interaction）、Contriever（无监督）。将 query 和 passage 分别编码为固定维度向量（通常 768 维），通过余弦相似度或点积检索。向量索引常用 HNSW（Hierarchical Navigable Small World）或 IVF（Inverted File Index）。
- **为什么用**：语义匹配强，能处理同义词、近义词和 paraphrase。例如 query “如何修复内存泄漏” 能召回 “Java 堆溢出排查”。在 BEIR 基准上，DPR 的 NDCG@10 比 BM25 平均高 5-10 个点。
- **工程取舍**：① 训练成本高，需要大量 query-passage 配对数据（如 Natural Questions 数据集）。② 推理延迟高，HNSW 索引下百万级文档检索约 20-50ms，比 BM25 慢 2-5 倍。③ **实际落地的坑**：领域漂移（Domain Shift）——在通用语料上训练的 DPR 在医疗、法律等垂直领域效果暴跌。解法：用领域数据微调（如 BioBERT 初始化），或使用 Contriever 这种无监督方法减少标注依赖。

#### 混合检索（Hybrid Retrieval）

- **核心方法**：将稀疏和稠密结果融合，常用策略：① **加权融合**：`score = α * BM25_score + (1-α) * Dense_score`，α 通过网格搜索调优（如 0.3-0.7）。② **Rerank**：先用 BM25 粗召回（top-100），再用交叉编码器（Cross-Encoder，如 Cohere Rerank 3）精排（top-10）。③ **SPLADE**：学习稀疏化向量，兼具稀疏和稠密优势。
- **为什么用**：取长补短——BM25 保精确匹配，稠密保语义匹配。在 BEIR 上，混合检索（BM25 + DPR）的 NDCG@10 比单方法高 3-8 个点。**实际落地的坑**：加权融合时，两个分数尺度不一致（BM25 分数范围 0-10，稠密分数范围 -1 到 1），直接加权会偏向 BM25。解法：对分数做 min-max 归一化或 z-score 标准化。

#### 其他方法

- **基于图的检索**：如 KNN（K-Nearest Neighbors）在向量空间做近似搜索，但 HNSW 更主流。
- **结构化查询**：如 SQL 检索，适用于知识图谱或表格数据（如 WikiTableQuestions）。
- **HyDE（Hypothetical Document Embeddings）**：先让 LLM 生成一个假设文档，再用该文档的 embedding 检索，适合 query 信息不足的场景。

#### 选择依据

- **数据特性**：专有名词多（如代码、法律条款）→ 优先 BM25；语义相似度高（如客服 FAQ）→ 优先稠密。
- **延迟要求**：实时场景（<100ms）→ BM25 或 HNSW 索引；离线场景（>500ms）→ 可加 Rerank。
- **资源约束**：GPU 不足 → 只用 BM25；有 GPU 且数据量大 → 稠密 + HNSW。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从稀疏检索、稠密检索、混合检索三个层面回答。稀疏检索以 BM25 为代表，精确匹配快但语义弱；稠密检索如 DPR 语义强但依赖训练数据和 GPU；混合检索通过加权融合或 Rerank 取长补短，是工业界主流方案。总结一句：选型取决于数据特性、延迟和资源，没有银弹。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到混合检索，具体怎么融合 BM25 和 DPR 的分数？α 怎么调？

> 常用加权融合：`score = α * BM25_norm + (1-α) * Dense_norm`，其中 BM25_norm 和 Dense_norm 是 min-max 归一化后的分数。α 通过网格搜索在验证集上调优，比如在 BEIR 的 SciFact 数据集上，α=0.3 效果最好（NDCG@10 提升 5%）。更鲁棒的做法是用 Rerank：BM25 粗召回 top-100，再用 Cross-Encoder 精排 top-10，这样避免分数尺度问题。

**追问 2**：稠密检索的 embedding 维度怎么选？768 和 384 有什么区别？

> 维度越高，语义表达能力越强，但计算和存储成本也越高。768 维（如 BERT-base）是主流，在 BEIR 上比 384 维（如 Sentence-TinyBERT）的 NDCG@10 高 2-3 个点，但向量索引内存翻倍（百万级文档从 1.5GB 到 3GB）。工程上，如果延迟敏感（如移动端），用 384 维 + 量化（int8）可压缩到 0.75GB，精度损失 <1%。

**追问 3**：如果数据是代码，你会选哪种检索方法？

> 代码场景专有名词多（函数名、变量名），BM25 的精确匹配优势明显。但代码语义也重要（如“排序算法”和“快速排序”），所以推荐混合检索：BM25 做第一轮召回，再用 CodeBERT 或 GraphCodeBERT 做稠密检索。实际落地坑：代码中的注释和文档字符串（docstring）质量差，导致稠密检索效果差。解法：用代码结构（如 AST）增强 embedding，或使用 CodeSearchNet 数据集微调。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只罗列方法名（BM25、DPR、ColBERT）而不解释场景选型 → ✅ 必须给出选择依据，如“专有名词多选 BM25，语义相似度高选 DPR，两者兼顾用混合”。
- ❌ 说“稠密检索一定比稀疏好” → ✅ 指出稠密检索在领域漂移和低资源场景下可能不如 BM25，例如在 BEIR 的 Touche-2020（辩论检索）上 BM25 的 NDCG@10 比 DPR 高 10%。
- ❌ 忽略工程约束，只谈理论 → ✅ 必须提到延迟（BM25 <10ms vs 稠密 20-50ms）、存储（稠密向量索引内存大）、GPU 成本等实际因素。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在某项目中对比了 BM25 和 DPR，发现混合检索在 NDCG@10 上提升 8%”切入，强调调参（α 网格搜索）和归一化细节。
- **如果你只做过传统 NLP**：用“文本分类中的 TF-IDF 和 BERT 类比稀疏/稠密检索”迁移，说明 BM25 像 TF-IDF 的升级版，DPR 像双编码器版的 BERT。
- **如果你是校招无项目**：聚焦“在 BEIR 基准上复现 BM25 和 DPR 的对比实验”，展示对开源工具（pyserini、faiss）和评估指标（NDCG@10）的熟悉度。
- 《Dense Passage Retrieval for Open-Domain Question Answering》（Karpukhin et al., 2020）
- 《SPLADE: Sparse Lexical and Dense Retrieval》（Formal et al., 2021）
- 《BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models》（Thakur et al., 2021）
- 《ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT》（Khattab & Zaharia, 2020）
- 《HyDE: Precise Zero-Shot Dense Retrieval without Relevance Labels》（Gao et al., 2022）

---
