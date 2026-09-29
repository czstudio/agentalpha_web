---
slug: rag-tk1182
no: "2082"
title: "| 40 | What are the common retrieval approaches used in RAG systems"
question: "| 40 | What are the common retrieval approaches used in RAG systems"
excerpt: "面试官想看你是否真正理解RAG系统的检索层设计，而非背诵概念。考察类型是工程取舍+系统设计。刁钻点在于：多数人只会罗列BM25和DPR，但面试官期待你讲出为什么在工业界混合检索是标配、何时该放弃稠密检索、以及检索效率与精"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4603
updated: "2026-09-29"
---

## | 40 | What are the common retrieval approaches used in RAG systems

`P1` · `rag`

🏷 标签：`rag`, `retrieval`, `sparse-retrieval`, `dense-retrieval`, `hybrid-retrieval`

#### 1️⃣ 考察意图

面试官想看你是否真正理解RAG系统的检索层设计，而非背诵概念。考察类型是**工程取舍+系统设计**。刁钻点在于：多数人只会罗列BM25和DPR，但面试官期待你讲出**为什么在工业界混合检索是标配**、**何时该放弃稠密检索**、以及**检索效率与精度的具体权衡**。答好了能展示你对检索整条链路（召回→排序→融合）的实战认知，以及面对不同业务场景（如低延迟、长尾查询）的决策能力。

#### 2️⃣ 标准答

RAG系统的检索层设计，核心是平衡**召回率、精度、延迟和成本**。主流方法分四类，每类有明确的适用边界和坑。

#### 稀疏检索（Sparse Retrieval）

- **代表方法**：BM25（默认k1=1.5, b=0.75）、TF-IDF、QL（Query Likelihood）。
- **原理**：基于词袋模型+倒排索引，通过词频和逆文档频率计算相关性。
- **为什么用**：对精确匹配（如人名、产品ID、法律条款）极其稳定，零训练成本，延迟<10ms（百万级文档）。
- **坑与解法**：语义鸿沟——查询"苹果手机"无法匹配"iPhone"。**解法**：对query做同义词扩展（如WordNet或基于embedding的query改写），或结合实体链接。
- **工程取舍**：BM25的k1和b参数需调优。k1控制词频饱和度，b控制文档长度归一化。在长文档场景（如论文检索），b设0.9以上可惩罚过长文档；短文本（如FAQ）b设0.3-0.5更优。

#### 稠密检索（Dense Retrieval）

- **代表方法**：DPR（双编码器）、ColBERT（后期交互）、Contriever（无监督）、GTR（T5-based）。
- **原理**：用BERT等模型将query和文档编码为固定维度向量（如768维），通过余弦相似度或内积检索，依赖近似最近邻（ANN）索引（如HNSW、IVF-PQ）。
- **为什么用**：捕捉语义相似性，对同义词、改写、抽象概念有效。在MS MARCO上，DPR的Recall@100可达85%+，远超BM25的70%+。
- **坑与解法**：**领域漂移**：通用DPR在医疗/法律领域Recall暴跌20%+。**解法**：用领域数据微调双编码器（如BioBERT+DPR），或使用Contriever这种无监督方法。
- **长尾查询**：罕见实体（如"2023年诺贝尔化学奖得主"）向量空间稀疏。**解法**：混合检索兜底。
- **索引更新成本**：新增100万文档需重新编码和重建HNSW图，耗时数小时。**解法**：采用增量索引（如FAISS的IDMap+Flat），或分片索引（按时间/类别分片）。
工程取舍：向量维度与检索速度的权衡。768维HNSW的Recall@10约95%，但内存占用高；用PCA降维至256维，Recall下降3-5%，但内存减少70%。

#### 混合检索（Hybrid Retrieval）

- **代表方法**：BM25+DPR加权融合（如Reciprocal Rank Fusion, RRF）、Learned Sparse Retrieval（SPLADE、UniCOIL）。
- **原理**：稀疏和稠密结果按分数或排名加权合并，或训练一个模型同时输出稀疏和稠密表示（如SPLADE用MLM头生成词权重）。
- **为什么用**：单一方法有盲区。BM25漏语义匹配，DPR漏精确匹配。混合后，在BEIR基准上平均NDCG@10提升8-15%。
- **坑与解法**：**权重难调**：RRF的k值（默认60）对结果敏感。**解法**：用验证集做网格搜索，或采用学习型融合（如LightGBM对特征排序）。
- **延迟叠加**：同时跑BM25和向量检索，延迟翻倍。**解法**：并行执行，或用SPLADE这种单模型输出两种表示，减少一次网络调用。
实际落地：在电商搜索中，BM25负责品牌/型号精确匹配，DPR负责"类似款"语义推荐，RRF融合后Top10点击率提升12%。

#### 分层检索（Multi-Stage Retrieval）

- **代表方法**：粗排（BM25/向量检索）→ 精排（交叉编码器如Cohere rerank-v3、MonoT5）。
- **原理**：第一阶段用轻量方法召回Top 100-1000，第二阶段用高精度模型重排序Top 10-50。
- **为什么用**：交叉编码器精度高但延迟大（单次推理10-50ms），无法直接对百万级文档排序。分层后，总延迟控制在200ms内，精度接近全量交叉编码器。
- **坑与解法**：**精排模型过拟合**：在训练数据上NDCG高，但线上长尾查询效果差。**解法**：用对比学习或硬负样本挖掘（如从BM25召回中选Top 100作为负样本）。
- **级联误差**：粗排漏掉相关文档，精排无法补救。**解法**：粗排阶段提高召回率（如Recall@100设95%+），牺牲部分精度。

**总结**：工业级RAG系统通常采用**混合检索+分层排序**架构。例如，字节跳动的搜索系统先用BM25+向量检索（RRF融合）召回Top 200，再用交叉编码器重排序Top 20，最后用LLM生成答案。核心原则是：**根据业务场景选择检索方法，而非盲目堆叠**。

#### 3️⃣ 答题模板（30 秒电梯版）

> "这个问题我从三个层面回答：第一，稀疏检索如BM25，适合精确匹配，零训练成本但语义弱；第二，稠密检索如DPR，捕捉语义但依赖领域微调和ANN索引；第三，混合检索如BM25+DPR+RRF，是工业标配，能平衡召回和精度。实际落地时，还要考虑分层排序，用交叉编码器精排Top 20。总结一句：没有银弹，根据查询类型和延迟要求选择组合。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到混合检索用RRF融合，但RRF的k值怎么调？有没有更好的融合方法？

> **应对策略**：RRF的k值默认60，但经验上k=30-100之间效果稳定。更优方案是学习型融合：用LightGBM或XGBoost，以BM25分数、向量相似度、文档长度、query长度等作为特征，训练一个排序模型。在电商场景，这种方法比RRF的NDCG@10提升5-8%。另外，可以尝试自适应权重，比如对精确查询（如产品ID）加大BM25权重，对语义查询（如"推荐类似款"）加大向量权重。

**追问 2**：稠密检索的向量索引，HNSW和IVF-PQ怎么选？线上延迟要求50ms内。

> **应对策略**：HNSW适合高召回率场景（Recall@10>95%），但内存占用大（768维向量，100万文档约3GB）。IVF-PQ通过乘积量化压缩向量，内存减少80%，但Recall下降5-10%。线上50ms延迟：如果文档量<100万，用HNSW（efSearch=128，延迟约10ms）；如果>1000万，用IVF-PQ（nlist=4096，nprobe=100，延迟约30ms）。还可以用GPU加速（如RAPIDS cuVS），延迟可降至5ms。

**追问 3**：你的检索方法在长文档（如论文全文）上效果不好，怎么优化？

> **应对策略**：长文档有两个问题：一是向量平均池化丢失细节，二是BM25受文档长度惩罚。解法：1）**文档分块**：按段落或滑动窗口切分（如512 tokens），每块独立编码和索引，检索时返回Top K块，再聚合到文档级别。2）**ColBERT后期交互**：保留每个token的向量，检索时计算query token与文档token的最大相似度，对长文档更鲁棒。3）**分层检索**：先检索段落，再用文档级交叉编码器重排序。在MS MARCO长文档任务上，ColBERT比DPR的Recall@100高10%。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只罗列方法名称（"有BM25、DPR、混合检索"），不解释原理和取舍 → ✅ 必须讲出每个方法的**适用场景**和**工程坑**，比如"BM25适合精确匹配但语义弱，DPR需要领域微调否则Recall暴跌"。
- ❌ 说"混合检索就是BM25+向量检索加权"而不提具体融合方法 → ✅ 必须给出具体方法名（RRF、学习型融合）和参数（RRF的k=60），并说明为什么RRF比简单加权好（对分数尺度不敏感）。
- ❌ 忽视分层检索，只讲单阶段检索 → ✅ 必须提到粗排+精排架构，并解释为什么需要（交叉编码器精度高但延迟大），以及级联误差的解法。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从项目中的检索方法选择切入，比如"在XX项目中，我们对比了BM25和DPR，发现DPR在长尾查询上Recall低，最终采用BM25+DPR+RRF混合检索，Top10准确率提升15%"。强调你调过k1/b参数或做过领域微调。
- **如果你只做过传统NLP**：用文本分类或信息检索类比，比如"传统NLP中TF-IDF类似BM25，而BERT分类类似稠密检索，两者互补"。展示你能迁移知识，并提到你了解ANN索引（如HNSW）的原理。
- **如果你是校招无项目**：聚焦论文复现，比如"我复现过DPR在Natural Questions上的实验，发现训练时负样本选择（BM25 Top 100作为硬负样本）对效果影响很大"。展示你对细节的理解，并提到你读过ColBERT或SPLADE论文。
- 《Dense Passage Retrieval for Open-Domain Question Answering》（Karpukhin et al., 2020）
- 《ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT》（Khattab & Zaharia, 2020）
- 《SPLADE: Sparse Lexical and Expansion Model for First Stage Ranking》（Formal et al., 2021）
- 《BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models》（Thakur et al., 2021）
- FAISS官方文档：HNSW与IVF-PQ的工程实践指南

---
