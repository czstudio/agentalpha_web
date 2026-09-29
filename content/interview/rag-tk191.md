---
slug: rag-tk191
no: "1091"
title: "结构化数据和非结构化数据在 RAG 里分别怎么处理"
question: "结构化数据和非结构化数据在 RAG 里分别怎么处理"
excerpt: "面试官想看你是否真正理解 RAG 中数据处理的“分治”逻辑，而非只会背概念。这道题属于系统设计 + 工程取舍类型，刁钻点在于：很多人会机械回答“结构化用SQL，非结构化用embedding”，但忽略了两者在检索阶段如何融"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4165
updated: "2026-09-29"
---

## 3 结构化数据和非结构化数据在 RAG 里分别怎么处理

`P1` · `rag`

🏷 标签：`rag`, `structured-data`, `unstructured-data`, `hybrid-retrieval`

#### 1️⃣ 考察意图

面试官想看你是否真正理解 RAG 中数据处理的“分治”逻辑，而非只会背概念。这道题属于**系统设计 + 工程取舍**类型，刁钻点在于：很多人会机械回答“结构化用SQL，非结构化用embedding”，但忽略了**两者在检索阶段如何融合**以及**各自带来的精度/延迟 trade-off**。答好了能展示你对多模态数据源的工程落地能力，包括对“结构化转文本后语义丢失”和“非结构化分块后关系断裂”的认知，以及 Hybrid Search 的实战经验。

#### 2️⃣ 标准答

**结构化数据（如 MySQL 订单表、MongoDB 用户画像）**

- **处理流程**：不直接对表做 embedding，而是通过 **SQL 查询**或 **API 调用**提取关键行/列，再转为自然语言描述。例如：`SELECT order_id, amount, status FROM orders WHERE user_id=123` → 生成文本“用户 123 在 2024-01-01 有一笔金额 100 元的订单，状态为已支付”。
- **为什么这么做**：结构化数据本质是**精确匹配**，embedding 检索会丢失数值精度（比如“金额>100”这种范围查询）。直接转文本后，可以用 BM25 或倒排索引做关键词匹配，保证召回率。
- **实际落地的坑**：转文本时容易丢失**关系信息**，比如多表 join 后的关联。解法：在文本生成时显式保留实体关系，例如“用户 123 的订单 ID 456 关联了商品 ID 789”，并在检索时用 **Graph RAG** 或 **Neo4j** 辅助关系推理。

**非结构化数据（如 PDF 产品手册、Word 文档、网页）**

- **处理流程**：先做 **文档解析**（PDF 用 PyMuPDF 或 Unstructured.io，网页用 BeautifulSoup），然后 **清洗**（去页眉页脚、特殊字符），再 **分块**（chunking）。分块策略推荐 **Semantic Chunking**（基于句子边界或段落，而非固定 token 数），块大小 256-512 tokens，重叠 10-20%。最后用 **text-embedding-3-small** 或 **BGE-M3** 生成 embedding，存入向量数据库（如 Milvus、Qdrant）。
- **为什么这么做**：固定 token 分块会切断语义，比如“苹果公司”被切到两个块里。Semantic Chunking 用 **NLP 模型**检测句子结束或主题切换，保持块内语义完整。
- **实际落地的坑**：PDF 中的表格和图片常被忽略。解法：用 **OCR（Tesseract）** 提取图片文字，表格用 **Camelot** 或 **Tabula** 转为 Markdown 格式，再作为文本块加入索引。

**混合处理（Hybrid Retrieval）**

- **策略一：统一索引**。将结构化转文本后的片段与非结构化文本块混在一起，用同一个向量索引。优点是简单，缺点是结构化文本的语义向量可能被非结构化数据“淹没”，导致精确查询失效。
- **策略二：分别索引 + 融合检索**。结构化数据用 **BM25** 或 **Elasticsearch** 做关键词检索，非结构化数据用 **embedding** 做语义检索。最后用 **RRF（Reciprocal Rank Fusion）** 或 **加权求和** 合并结果。例如：`final_score = 0.3 * BM25_score + 0.7 * cosine_similarity`。权重根据业务场景调优，比如订单查询场景 BM25 权重更高。
- **为什么用 RRF**：它不需要归一化分数，直接基于排名融合，避免不同检索器分数分布不一致的问题。实际测试中，RRF 比加权求和稳定 10-15% 的召回率【通用知识】。

**总结**：结构化数据走精确路线（SQL + BM25），非结构化走语义路线（embedding + chunking），融合时用 RRF 或加权策略。关键 trade-off 是：结构化转文本会丢失关系，非结构化分块会破坏语义，需要根据 query 类型动态路由。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据预处理、检索策略、融合方案三个层面回答。结构化数据通过 SQL 提取关键字段转为自然语言文本，用 BM25 做精确检索；非结构化数据先解析清洗，再用 Semantic Chunking 分块后生成 embedding 做语义检索。最后用 RRF 或加权融合两者结果。总结一句：结构化保精度，非结构化保语义，混合检索是 RAG 落地的标配。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果用户问“上个月订单金额大于 500 的客户有哪些”，你的系统怎么处理？

> 这种**精确范围查询**不能靠 embedding。我会在检索层加一个 **Query Router**：先用 LLM 或规则判断 query 是否包含数值/日期/比较词（如“大于”“上个月”），如果是，直接路由到 SQL 执行器，生成 `SELECT customer_id FROM orders WHERE amount > 500 AND date >= '2024-01-01'`，结果转为文本返回。非结构化数据只做辅助上下文。这个方案 trade-off 是增加了路由延迟（约 50ms），但避免了 embedding 检索的精度损失。

**追问 2**：非结构化数据分块时，怎么避免切断关键实体关系？

> 使用 **Semantic Chunking** 结合 **实体识别**。具体做法：先用 spaCy 或 NER 模型识别块内的实体（如人名、产品名），如果实体被切到两个块边界，就调整分块点，确保实体完整。另一个解法是 **Sliding Window + Overlap**：块重叠 20%，并在检索时用 **Max Marginal Relevance** 去重，避免重复信息。实际项目中，这种策略比固定分块召回率提升 8-12%【通用知识】。

**追问 3**：结构化数据转文本后，如果表有 100 列，怎么避免生成冗余描述？

> 用 **Schema Filtering**：只提取 query 相关的列。比如 query 是“查询用户余额”，就只转 `user_id` 和 `balance` 列，忽略其他。具体实现：在预处理阶段，用 LLM 或规则对每个 query 做 **Column Selection**，生成动态 SQL。trade-off 是增加了预处理延迟，但减少了无用文本对检索的干扰。另一个坑是：如果 query 模糊，可能漏掉关键列，这时需要 fallback 到全表转文本。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “结构化数据直接存到向量数据库，非结构化数据也存到向量数据库，统一检索。” → ✅ “结构化数据不适合直接 embedding，因为数值精度和范围查询会丢失。应该先转文本，再用 BM25 或 SQL 做精确检索，与语义检索分开。”
- ❌ “非结构化数据分块时，固定 512 tokens 就行。” → ✅ “固定分块会切断语义，推荐 Semantic Chunking 或基于段落的分块，并加 10-20% 重叠。表格和图片需要单独处理。”
- ❌ “混合检索时，直接拼接两个检索结果列表。” → ✅ “直接拼接会导致分数不可比。应该用 RRF 或加权融合，并考虑 query 类型动态调整权重。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在项目中处理过 MySQL 订单表和 PDF 产品手册”切入，详细描述你如何用 SQL 转文本 + BM25 做精确检索，以及如何用 Semantic Chunking 处理 PDF。强调你遇到过“表格丢失”的坑并用 OCR 解决。
- **如果你只做过传统 NLP**：用“信息检索中的精确匹配 vs 语义匹配”类比，说明结构化数据类似倒排索引，非结构化类似向量检索。展示你对 BM25 和 embedding 的 trade-off 理解。
- **如果你是校招无项目**：聚焦“Hybrid Search 论文复现”，比如复现过 RRF 融合算法，或用 LangChain 的 `MultiQueryRetriever` 做过 demo。强调你对数据预处理细节（如分块策略）的掌握。
- 《Hybrid Search: Combining Sparse and Dense Retrieval for Better RAG》—— Pinecone 博客
- 《Semantic Chunking for RAG: A Practical Guide》—— LlamaIndex 文档
- 《Reciprocal Rank Fusion (RRF) Explained》—— 论文《A Simple and Efficient Fusion Approach》
- 《Unstructured Data Processing for RAG: PDF, Tables, and Images》—— Unstructured.io 官方指南
- 《Query Routing in RAG Systems: From Rule-Based to LLM-Based》—— 知乎专栏

---
