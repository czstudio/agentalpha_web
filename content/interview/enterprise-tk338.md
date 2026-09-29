---
slug: enterprise-tk338
no: "1238"
title: "文档怎么存的？粒度是多大？用的什么数据库"
question: "文档怎么存的？粒度是多大？用的什么数据库"
excerpt: "面试官想考察你对RAG系统存储层的工程选型能力，而非单纯背概念。刁钻点在于：文档存储不是“存进去就行”，而是粒度、数据库、检索效率三者耦合的决策。答好了能展示你对检索精度与延迟的权衡、混合检索的工程落地（如双写一致性、分"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3570
updated: "2026-09-29"
---

## 文档怎么存的？粒度是多大？用的什么数据库

#### 1️⃣ 考察意图

面试官想考察你对RAG系统存储层的工程选型能力，而非单纯背概念。刁钻点在于：文档存储不是“存进去就行”，而是粒度、数据库、检索效率三者耦合的决策。答好了能展示你对**检索精度与延迟的权衡**、**混合检索的工程落地**（如双写一致性、分片策略）以及**对主流向量库（Milvus/Qdrant）底层索引（HNSW/IVF）的认知**。这是P1进阶题，区分“调包侠”和“真懂系统设计”的候选人。

#### 2️⃣ 标准答

**存储方案：分层存储，各司其职**

- **元数据层**：用PostgreSQL或MongoDB存文档原始内容、标题、时间戳、权限标签等结构化信息。原因：关系型数据库支持复杂过滤（如WHERE date > '2024-01-01'），且事务性强。
- **向量层**：用Milvus或Qdrant存文本embedding（如OpenAI text-embedding-3-small的1536维向量）。选型关键：Milvus支持GPU加速和混合索引（HNSW+IVF），适合大规模（>1亿向量）；Qdrant原生支持payload过滤，适合中小规模（<1000万向量）。
- **全文检索层**（可选）：Elasticsearch存倒排索引，用于BM25关键词匹配。坑：双写一致性——向量库和ES写入不同步会导致检索结果不一致。解法：用事务性消息队列（如Kafka）保证最终一致性，或采用PostgreSQL的pgvector插件统一存储（牺牲部分向量检索性能）。

**粒度选择：256-512 token是黄金区间**

- **粗粒度（整文档/大段落，>1024 token）**：检索精度低，一个文档可能只匹配一个片段，但召回率低（因为embedding被平均稀释）。适合摘要生成或文档分类。
- **细粒度（句子/小段落，<128 token）**：检索精度高，但计算开销大（向量数量暴增），且上下文碎片化，LLM难以理解完整语义。适合FAQ问答（每个句子对应一个答案）。
- **黄金粒度（256-512 token）**：平衡点。经验值：按Markdown标题或自然段落切分，每个chunk约300 token。例如LangChain的RecursiveCharacterTextSplitter默认chunk_size=1000，但实际调优后建议500-800字符（约250-400 token）。
- **实际落地的坑**：固定粒度切分会切断代码块或表格。解法：用语义分块（Semantic Chunking），如LlamaIndex的SentenceSplitter，基于句子边界和embedding相似度动态合并。

**数据库选型：混合检索的工程取舍**

- **纯向量检索**：Qdrant + HNSW（ef_construct=200, M=16），延迟<10ms（100万向量）。但无法处理精确关键词匹配（如“iPhone 15” vs “iPhone 15 Pro”）。
- **混合检索**：Milvus + 标量过滤（如filter=“category=‘tech’”）+ 向量检索。坑：标量过滤会降低HNSW性能（因为需要遍历多个segment）。解法：用IVF_FLAT索引（nlist=4096），先粗聚类再过滤，延迟从50ms降到20ms。
- **性能优化**：分片策略——按文档ID哈希分片（shard=8），避免热点；缓存层——用Redis缓存高频查询的embedding（如热门FAQ的向量），命中率可达30%，减少向量库QPS。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从存储方案、粒度选择、数据库选型三个层面回答。存储上采用分层架构：PostgreSQL存元数据，Milvus存向量，ES存倒排索引。粒度上，256-512 token是黄金区间，按语义边界切分而非固定长度。数据库选型上，中小规模用Qdrant+HNSW，大规模用Milvus+IVF_FLAT，混合检索时注意标量过滤的性能损耗。总结一句：存储设计是检索精度、延迟、一致性的三角权衡，没有银弹，必须根据业务场景做取舍。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果文档是PDF或图片，怎么存？

> 存储方案不变，但增加预处理层：用OCR（如Tesseract或PaddleOCR）提取文字，然后按文本流程处理。图片本身用多模态embedding（如CLIP）存向量，检索时文本query也映射到同一向量空间。坑：OCR错误率约5-10%，需要后处理（如拼写校正）。解法：对OCR结果做模糊匹配（如fuzzywuzzy），或直接用多模态模型（如GPT-4V）做端到端理解。

**追问 2**：你们线上向量库的QPS和延迟是多少？怎么优化的？

> 以Milvus为例：单机8核32G，100万向量（768维），HNSW索引（ef=200），QPS约500，P99延迟30ms。优化点：① 用IVF_FLAT（nlist=4096）替代HNSW，QPS提升到2000，但召回率从99%降到95%（trade-off）；② 加Redis缓存热门query，命中率25%，QPS提升到2500；③ 分片数从4增加到8，避免单shard热点。

**追问 3**：如果文档更新频繁，怎么保证向量库和元数据库的一致性？

> 采用双写+补偿机制：写操作先入Kafka，消费者同时更新PostgreSQL和Milvus。如果Milvus写入失败，记录到死信队列（DLQ），定时重试。坑：Milvus不支持事务，无法回滚。解法：用PostgreSQL的pgvector插件统一存储（牺牲向量检索性能），或采用Qdrant（支持事务性写入）。对于非关键场景，接受最终一致性（延迟<1秒）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “文档直接存成一个大文本，用向量数据库存embedding，粒度无所谓。” → ✅ 必须说明粒度选择依据（256-512 token），并给出切分策略（语义分块 vs 固定长度），否则面试官认为你没踩过坑。
- ❌ “用Pinecone就行，它最方便。” → ✅ 不能只提工具名，要给出选型理由（如Milvus适合自建、Qdrant适合中小规模、Pinecone适合快速原型），并对比索引类型（HNSW vs IVF）和成本。
- ❌ “向量库和元数据库分开存，不用管一致性。” → ✅ 必须提到双写一致性问题，并给出解法（消息队列、pgvector、最终一致性），否则暴露工程经验不足。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“我们线上用Milvus存100万文档，粒度256 token，但发现标量过滤导致延迟飙升，后来改用IVF_FLAT+分片优化”切入，展示实战调优。
- **如果你只做过传统NLP**：类比“文档存储类似信息检索中的倒排索引，但向量库多了embedding层，粒度选择类似TF-IDF的文档长度归一化”，展示迁移能力。
- **如果你是校招无项目**：聚焦“我复现过LangChain的文档切分，对比了RecursiveCharacterTextSplitter和Semantic Chunking在Recall@10上的差异”，展示动手能力。
- 《Dense Passage Retrieval for Open-Domain Question Answering》（Karpukhin et al., 2020）——DPR论文，理解向量检索基础
- 《Efficient and Robust Retrieval for Large-Scale RAG Systems》（Milvus技术博客）——混合检索工程实践
- 《Semantic Chunking: A Better Way to Split Documents for RAG》（LlamaIndex博客）——语义分块原理
- 《HNSW vs IVF: A Practical Guide to Vector Index Selection》（Qdrant文档）——索引选型对比
- 《Building Production-Ready RAG Systems: Consistency, Latency, and Scalability》（Anthropic技术报告）——系统设计最佳实践

---
