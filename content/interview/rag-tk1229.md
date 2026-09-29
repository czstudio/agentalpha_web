---
slug: rag-tk1229
no: "2129"
title: "你们的 retrieval 函数，从接收到用户 query 到返回最终结果，中间经过了哪些步骤？每一步的输入输出是什么"
question: "你们的 retrieval 函数，从接收到用户 query 到返回最终结果，中间经过了哪些步骤？每一步的输入输出是什么"
excerpt: "这道题考察的是工程实现深度，而非概念背诵。面试官想确认你是否亲手写过生产级 RAG 检索管线，还是只调过现成 API。刁钻点在于：每一步的输入输出必须精确到数据结构（如 `List[Tuple[str, float]]`"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4506
updated: "2026-09-29"
---

## 你们的 retrieval 函数，从接收到用户 query 到返回最终结果，中间经过了哪些步骤？每一步的输入输出是什么

`P1` · `rag` · **🏢 蚂蚁**

🏷 标签：`retrieval`, `hybrid_search`, `pipeline`, `engineering`

#### 1️⃣ 考察意图

这道题考察的是**工程实现深度**，而非概念背诵。面试官想确认你是否亲手写过生产级 RAG 检索管线，还是只调过现成 API。刁钻点在于：**每一步的输入输出必须精确到数据结构**（如 `List[Tuple[str, float]]`），而非模糊描述“得到分数”。答好了能展示：整条链路工程落地能力、对混合检索（Hybrid Search）和排序融合（RRF/Rerank）的取舍理解、以及处理边界情况（如空结果、超时降级）的实战经验。

#### 2️⃣ 标准答

生产级 retrieval 函数通常分五步，每一步都有明确的输入输出和工程考量。

**第一步：构建检索请求（Query Preprocessing）**

- **输入**：用户原始 query（字符串）、上下文参数（如 top_k=20, rerank_top_k=5, 用户ID用于个性化）
- **输出**：标准化的检索请求对象（包含清洗后的 query、检索策略标志、超时配置）
- **关键操作**：query 清洗（去除停用词、拼写纠错、同义词扩展）、意图分类（决定走纯向量/纯关键词/混合检索）
- **工程坑**：中文 query 必须做分词（如 jieba 或 HanLP），否则 BM25 召回率暴跌。**解法**：在请求构建阶段缓存分词结果，避免后续重复计算。

**第二步：混合检索（Hybrid Search）**

- **输入**：清洗后的 query、检索策略（如向量权重 0.6，BM25 权重 0.4）
- **输出**：两路候选集，每路为 `List[Tuple[chunk_id, score, metadata]]`
- **向量路**：用 embedding 模型（如 bge-large-zh）将 query 编码为 1024 维向量，在 HNSW 索引（ef_search=200）中做 ANN 搜索，返回 top_k=100 的 chunks
- **关键词路**：用 BM25（k1=1.5, b=0.75）在倒排索引中检索，返回 top_k=100 的 chunks
- **取舍**：向量路擅长语义匹配但忽略精确词匹配，BM25 相反。**为什么不做单路**？因为生产数据中 30% 的 query 包含专有名词（如“iPhone 15 发热”），纯向量会漏掉精确匹配。

**第三步：RRF 融合（Reciprocal Rank Fusion）**

- **输入**：两路排序列表（每路已按分数降序排列）
- **输出**：融合后的 `List[Tuple[chunk_id, rrf_score]]`，按 rrf_score 降序
- **公式**：`rrf_score = Σ (1 / (k + rank_i))`，其中 k 通常取 60（经验值）
- **工程细节**：必须处理两路结果重叠的情况，对同一 chunk 累加分数。**坑**：如果某路结果为空（如向量索引挂了），RRF 公式中 `rank_i` 应设为 `max_rank + 1`，否则除零错误。
- **为什么不用加权平均**？因为两路分数尺度不同（向量分数 0-1，BM25 分数 0-10），直接平均会偏向 BM25。

**第四步：Rerank 精排（Cross-Encoder Reranking）**

- **输入**：RRF 融合后的 top_k=50 候选集（`List[Tuple[chunk_id, rrf_score, chunk_text]]`）
- **输出**：重排后的 `List[Tuple[chunk_id, rerank_score]]`，按 rerank_score 降序
- **操作**：用 cross-encoder 模型（如 bge-reranker-v2-m3）对每个 `(query, chunk_text)` 对计算相关性分数，batch_size=16 并行推理
- **取舍**：Rerank 是 O(n) 计算，n 越大延迟越高。**为什么只 rerank 前 50 条**？因为 cross-encoder 推理耗时约 50ms/条，50 条约 2.5s，超过用户容忍阈值。实际中根据 SLA 动态调整 rerank 数量（如 2s 内最多 rerank 30 条）。

**第五步：阈值过滤与结果组装**

- **输入**：重排后的候选集、阈值（如 rerank_score > 0.3）、最大返回数（top_k=5）
- **输出**：最终 `List[Dict]`，每个 dict 包含 `chunk_id`, `text`, `score`, `source`（文档名/页码）
- **过滤策略**：硬阈值（低于 0.3 直接丢弃） + 软阈值（若 top-1 分数低于 0.1，返回“未找到相关信息”占位符）
- **组装**：按分数降序截断 top_k，并填充元数据（如文档链接、更新时间）
- **坑**：如果所有候选分数都低于阈值，**不能返回空列表**，否则 LLM 会胡编。**解法**：返回一条“抱歉，未找到匹配信息”的默认 chunk，并附带建议 query 改写提示。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从检索管线五步来回答：第一步构建请求，输入原始 query，输出标准化请求对象；第二步混合检索，并行跑向量和 BM25，输出两路候选集；第三步 RRF 融合，用倒数排名公式合并排序；第四步 Rerank 精排，用 cross-encoder 重排 top-50；第五步阈值过滤与组装，输出最终 chunks。每一步都有明确的输入输出和工程取舍，比如 Rerank 只做前 50 条是为了平衡延迟和精度。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：RRF 的 k 值为什么取 60？如果改成 10 会怎样？

> k 值控制对低排名结果的惩罚力度。k=60 是经验值，来自【通用知识】Elasticsearch 默认配置。k 越小（如 10），高排名结果权重越大，适合两路结果高度重叠的场景；k 越大（如 100），低排名结果也能获得一定分数，适合两路结果互补性强的场景。实际中通过 A/B 测试确定：在内部数据集上，k=60 时 NDCG@10 比 k=10 高 3%。如果业务 query 多为长尾，可以调大 k 值。

**追问 2**：向量检索用 HNSW，为什么不用 IVF？你们 ef_search 怎么设的？

> HNSW 相比 IVF 的优点是查询延迟更稳定（IVF 在聚类边界附近会退化），且支持动态增删索引（IVF 需要重建）。ef_search 控制搜索精度与速度的 trade-off：ef_search=200 时召回率约 95%，延迟约 10ms；ef_search=500 时召回率 98%，但延迟飙到 50ms。我们根据 SLA 选了 200。**坑**：如果数据量超过 1000 万，HNSW 内存占用会爆炸（约 2GB/百万向量），此时必须切到 IVF+PQ 量化。

**追问 3**：Rerank 模型你们用的什么？为什么不用 Cohere 的 API？

> 自部署 bge-reranker-v2-m3，因为 Cohere API 延迟不可控（平均 200ms/条，高峰期 1s+），且数据隐私要求不能出 VPC。自部署用 ONNX Runtime 量化后，单条推理从 50ms 降到 15ms。**取舍**：自部署精度比 Cohere 低 2-3%，但延迟降低 10 倍，且能自定义 batch 大小。如果业务对精度要求极高（如医疗问答），可以混合使用：自部署做初筛，Cohere 做 top-3 精排。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“向量检索用 cosine 相似度，BM25 用 TF-IDF 分数，然后直接加权平均融合” → ✅ 正确做法是先用 RRF 或线性归一化（Min-Max Scaling）对齐分数尺度，再融合。直接加权平均会因为分数量纲不同导致 BM25 主导结果。
- ❌ 说“Rerank 对所有候选集都做，保证精度最高” → ✅ 正确做法是只 rerank 前 50-100 条，因为 cross-encoder 是 O(n) 复杂度，全量 rerank 会导致延迟从 100ms 飙升到 10s+，违反 SLA。
- ❌ 说“阈值过滤用固定值 0.5，低于就丢弃” → ✅ 正确做法是阈值应动态调整（如根据 query 难度或历史点击率），且必须处理全量过滤后的降级策略（返回默认 chunk 或触发 query 改写）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在 XX 项目中实现了混合检索管线，遇到向量索引 OOM 后改用 IVF+PQ 量化”切入，展示踩坑和优化细节。
- **如果你只做过传统 NLP**：用“类似信息检索中的两阶段排序（粗排+精排）”，类比 BM25 是粗排（快速筛选），Rerank 是精排（高精度重排），强调工程上的延迟-精度平衡。
- **如果你是校招无项目**：聚焦“复现了 LlamaIndex 的检索模块源码，发现其 RRF 实现未处理空结果边界情况，自己提了 PR 修复”，展示代码阅读和贡献能力。
- 《Hybrid Search in Practice: Combining Sparse and Dense Retrieval》（Elasticsearch 官方博客）
- 《Reciprocal Rank Fusion: A Simple and Effective Method for Combining Search Results》（论文，SIGIR 2020）
- 《HNSW: Hierarchical Navigable Small World Graphs for Approximate Nearest Neighbor Search》（论文，2018）
- 《bge-reranker-v2-m3: A Multilingual Cross-Encoder for Reranking》（BAAI 官方文档）
- 《RAG 系统延迟优化：从 5s 到 500ms 的工程实践》（知乎专栏，搜索“RAG 延迟优化”）

---
