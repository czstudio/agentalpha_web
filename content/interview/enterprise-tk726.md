---
slug: enterprise-tk726
no: "1626"
title: "How does a vector database differ from traditional databases"
question: "How does a vector database differ from traditional databases"
excerpt: "面试官想看你能否从数据模型、查询范式、索引结构、性能取舍四个维度，系统性地对比向量数据库与传统数据库（如 MySQL、PostgreSQL）。这不是背概念题，而是工程取舍题——刁钻点在于：很多人只背了“向量数据库做 AN"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3671
updated: "2026-09-29"
---

## How does a vector database differ from traditional databases

#### 1️⃣ 考察意图

面试官想看你能否从**数据模型、查询范式、索引结构、性能取舍**四个维度，系统性地对比向量数据库与传统数据库（如 MySQL、PostgreSQL）。这不是背概念题，而是**工程取舍题**——刁钻点在于：很多人只背了“向量数据库做 ANN 搜索”，但说不清为什么传统 B+ 树在高维空间失效、为什么必须牺牲精度换速度。答好了能展示你对**存储引擎底层原理**和**实际系统设计**的硬实力。

#### 2️⃣ 标准答

#### 数据模型：结构化 vs 高维向量

- **传统数据库**：处理标量数据（整数、字符串、日期），用表/文档组织，有严格 schema。例如 MySQL 存用户 ID、年龄。
- **向量数据库**：核心是**高维浮点向量**（如 768 维 BERT embedding），通常附带 metadata（如文本标签）。数据模型是“向量 + 属性”，schema 灵活但索引只对向量生效。

#### 查询方式：精确匹配 vs 近似最近邻（ANN）

- **传统数据库**：支持精确查询（`WHERE age=30`）、范围查询（`BETWEEN`）、JOIN、聚合。用 B+ 树或哈希索引做 O(log n) 精确查找。
- **向量数据库**：核心操作是**向量距离搜索**（余弦相似度、欧氏距离、内积）。用 ANN 算法（HNSW、IVF、PQ）做近似搜索，返回 Top-K 结果。**关键取舍**：ANN 不是精确的——它牺牲召回率（比如 95%）换毫秒级响应，因为高维空间精确 KNN 是 O(n) 且无法用 B+ 树优化（维度诅咒）。

#### 索引结构：B+ 树 vs 图/量化索引

- **传统数据库**：B+ 树对一维有序数据高效（如按 ID 排序），哈希索引对等值查询快。但高维向量无序且维度高（>100），B+ 树无法剪枝——每个维度都要比较，复杂度指数爆炸。
- **向量数据库**：主流索引：
- **HNSW**（Hierarchical Navigable Small World）：分层图结构，搜索时从粗到细跳转，延迟低（10ms 内），但内存占用高（图边多）。
- **IVF**（Inverted File Index）：用 K-means 聚类分桶，搜索时只查最近几个桶，内存友好但召回率依赖桶数。
- **PQ**（Product Quantization）：压缩向量到码本，减少存储（4x-10x 压缩），但精度损失大。
- **实际落地的坑**：HNSW 在插入新向量时需重建图（或增量更新），高并发写入场景下容易产生碎片，导致查询延迟抖动。解法：用 IVF + PQ 组合索引，或采用 Milvus 的“流式写入 + 定时合并”策略。

#### 性能特征：ACID vs 召回率-延迟权衡

- **传统数据库**：强调 ACID（原子性、一致性、隔离性、持久性），写操作有 WAL（Write-Ahead Logging），读操作可缓存。延迟稳定（1-10ms），但高维搜索无法优化。
- **向量数据库**：**核心指标是召回率@Top-K 和 QPS**。例如 HNSW 在 1M 向量上，ef_search=200 时召回率 99%，延迟 5ms；ef_search=100 时召回率 95%，延迟 2ms。**工程取舍**：必须根据业务场景调参——搜索精度高则延迟高，反之亦然。没有免费的午餐。
- **扩展性**：传统数据库通过主从复制（读写分离）或分库分表（Sharding）扩展，但跨分片 JOIN 复杂。向量数据库天然支持**分布式分片**（如 Milvus 用一致性哈希分片向量），并行搜索后合并结果，水平扩展性好（线性扩展 QPS 到 10 万+）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据模型、查询方式、索引结构、性能取舍四个层面回答。数据模型上，传统数据库处理标量数据，向量数据库处理高维向量；查询方式上，传统用精确匹配，向量用 ANN 近似搜索；索引上，B+ 树在高维空间失效，HNSW/IVF 通过图或量化实现高效搜索；性能上，传统强调 ACID，向量强调召回率-延迟权衡。总结一句：向量数据库是为高维非结构化数据设计的专用引擎，牺牲了精确性和通用性，换来了毫秒级相似性搜索能力。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 B+ 树不能用于高维向量搜索？

> 因为维度诅咒。B+ 树假设数据在一维上有序（如数值大小），但高维向量（如 768 维）在任意维度上都不单调——两个向量可能在维度 1 上接近，但在维度 2 上远离。B+ 树剪枝时，必须检查所有维度，导致复杂度 O(d * log n)，d 很大时退化为 O(n)。实际中，用 B+ 树做 100 维向量搜索，比暴力扫描还慢。向量数据库用 HNSW 的图结构，通过“邻居关系”绕过维度诅咒。

**追问 2**：向量数据库如何保证数据一致性？能替代传统数据库吗？

> 不能替代，只能互补。向量数据库通常牺牲强一致性（如 Milvus 默认最终一致性）来换取高吞吐。例如写入后立即查询可能漏掉最新向量。解法：用双写策略——metadata 存传统数据库（如 PostgreSQL），向量存向量库，通过事务协调（如两阶段提交）保证最终一致。业务场景如推荐系统：用户行为写入 MySQL 做事务，embedding 异步写入 Milvus，容忍秒级延迟。

**追问 3**：你如何选择 HNSW 和 IVF 索引？

> 看内存和召回率要求。HNSW 适合内存充足（>10GB）、要求低延迟（<10ms）的场景，如实时搜索；IVF 适合内存受限、可接受稍高延迟（20-50ms）的场景，如离线批处理。具体调参：HNSW 调 ef_construction（建图质量）和 M（邻居数），IVF 调 nlist（桶数）和 nprobe（搜索桶数）。一个坑：IVF 的 nlist 太大（如 1000）会导致桶内向量太少，召回率下降；太小（如 10）则桶内向量太多，搜索慢。经验值：nlist = sqrt(N)，nprobe = 10-20。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “向量数据库就是存向量的数据库，查询更快。” → ✅ 必须点出“为什么快”：因为用 ANN 索引（HNSW/IVF）牺牲精度换速度，且 B+ 树在高维空间失效。
- ❌ “向量数据库支持 SQL 查询。” → ✅ 向量数据库通常只支持向量搜索，metadata 查询用 filter 但性能差（如 Milvus 的 scalar filtering 需额外索引）。正确说法是“核心是 ANN 搜索，SQL 是附加功能”。
- ❌ “向量数据库可以替代传统数据库做所有事。” → ✅ 强调互补：向量数据库不保证 ACID，不支持复杂 JOIN，适合非结构化数据搜索，不适合事务处理。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“为什么用向量数据库做文档检索”切入，对比用 Elasticsearch（BM25）和 Milvus（HNSW）的召回率差异，展示你对索引选择的工程判断。
- **如果你只做过传统数据库**：用“B+ 树 vs HNSW”类比——B+ 树像按字母排序的字典，HNSW 像社交网络（朋友的朋友），突出你对底层数据结构的理解。
- **如果你是校招无项目**：聚焦论文复现——提《Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs》，说明你理解 HNSW 的跳表思想，并做过小规模实验（如 10 万 GloVe 向量对比暴力搜索）。
- 《Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs》（HNSW 论文）
- 《Product Quantization for Nearest Neighbor Search》（PQ 论文）
- 《Billion-scale similarity search with GPUs》（FAISS 论文）
- Milvus 官方文档：索引类型与调参指南
- pgvector 源码分析：PostgreSQL 如何用 IVFFlat 实现向量搜索

---
