---
slug: rag-tk1007
no: "1907"
title: "文档清洗、切块、Embedding、入库、检索、生成分别怎么串起来"
question: "文档清洗、切块、Embedding、入库、检索、生成分别怎么串起来"
excerpt: "面试官想考察你是否真正动手搭过 RAG 系统，而非只背概念。核心是看你对数据流中每个环节的“衔接点”和“工程取舍”的理解——比如切块大小如何影响检索精度、Embedding 模型选择对延迟的 trade-off、入库时索"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4619
updated: "2026-09-29"
---

## 2 文档清洗、切块、Embedding、入库、检索、生成分别怎么串起来

#### 1️⃣ 考察意图

面试官想考察你是否真正动手搭过 RAG 系统，而非只背概念。核心是看你对数据流中每个环节的“衔接点”和“工程取舍”的理解——比如切块大小如何影响检索精度、Embedding 模型选择对延迟的 trade-off、入库时索引参数如何调优。刁钻点在于：很多人只讲“用 LangChain 串起来”，但说不出为什么某一步必须异步、为什么 chunk overlap 设 10% 而非 50%。答好了能展示端到端系统设计能力，以及踩过坑的实战经验。

#### 2️⃣ 标准答

RAG 流水线从原始文档到 LLM 生成，分 6 个阶段，每个阶段有明确输入输出和衔接细节：

- **文档清洗**：输入是 PDF/HTML/Word，输出是纯文本。关键操作：用 `pdfplumber` 或 `PyMuPDF` 提取文本，去除 HTML 标签（`BeautifulSoup`）、统一编码（UTF-8）、处理表格和页眉页脚。坑：PDF 中表格常被乱序提取，需用 `camelot` 或 `tabula` 单独解析表格行，再按位置合并到文本流。工程取舍：清洗粒度——过度清洗（如删除所有标点）会丢失语义，保留停用词但去掉噪声（如 `<script>` 标签）。
- **切块（Chunking）**：输入是清洗后的长文本，输出是固定大小或语义边界的块。常用策略：固定 token 数（如 512 tokens）加 10% 重叠（overlap），或用 `langchain.text_splitter.RecursiveCharacterTextSplitter` 按段落/句子递归切分。为什么用重叠？避免关键信息被切在边界丢失。坑：重叠比例过高（>30%）会导致检索结果冗余，增加 Embedding 和存储成本；过低（<5%）则召回率下降。实战中，对技术文档用 256 tokens + 15% overlap，对新闻用 512 tokens + 10% overlap。
- **Embedding**：输入是每个文本块，输出是固定维度向量（如 768 维）。常用模型：`BAAI/bge-large-en-v1.5`（中文用 `bge-large-zh`）或 `text-embedding-ada-002`。关键参数：batch size（如 32）控制 GPU 显存，`normalize_embeddings=True` 确保余弦相似度计算正确。工程取舍：模型精度 vs 延迟——BGE 比 ada-002 精度高 2-3%（MTEB 基准），但推理慢 2 倍；对实时系统，用 `onnxruntime` 量化 BGE 到 FP16 可提速 40%。
- **入库（Indexing）**：输入是向量 + 原始文本 + 元数据（如文档 ID、切块序号），输出是向量数据库索引。常用库：`FAISS`（本地）、`Milvus`（分布式）、`Pinecone`（托管）。关键步骤：建索引时选 `IVF_FLAT`（Inverted File with Flat）或 `HNSW`（Hierarchical Navigable Small World）。HNSW 召回率更高（>95%），但内存占用大；IVF 适合海量数据（>1M 向量），但需调 `nlist`（如 `nlist=100`）。坑：忘记存原始文本，检索后无法返回内容；元数据未索引，无法按文档过滤。
- **检索（Retrieval）**：输入是用户 query，输出是 top-k 文本块。流程：query 经相同 Embedding 模型编码，用 ANN（Approximate Nearest Neighbor）算法在索引中搜索。关键参数：`k`（如 5-10）、`ef_search`（HNSW 搜索宽度，越大越准但慢）。实战中，先用 `k=10` 粗召回，再用 `reranker`（如 `Cohere rerank-v3`）精排到 `k=3`，提升生成质量。坑：query 编码时未用相同模型版本，导致向量空间偏移；未做 query 预处理（如拼写纠正），影响召回。
- **生成（Generation）**：输入是 query + 检索结果，输出是 LLM 回答。关键步骤：拼接 prompt 模板，如 `"基于以下上下文：{context}，回答：{query}"`。参数：`temperature=0.1`（低随机性）、`max_tokens=512`。坑：检索结果过长超过 LLM 上下文窗口（如 4K tokens），需截断或分块生成；未加系统提示（如“如果上下文不相关，说不知道”），导致幻觉。
- **串起来（Pipeline Orchestration）**：用 `LangChain` 的 `RetrievalQA` 链或自定义 `asyncio` 异步流。关键点：每个步骤加异常处理（如 Embedding 超时重试 3 次）、日志（记录每步耗时和 token 数）、缓存（对相同 query 缓存检索结果，用 `redis` 或 `lru_cache`）。工程取舍：同步 vs 异步——对单用户用同步简单，对高并发用 `asyncio.gather` 并行 Embedding 和检索，减少 P99 延迟 30%。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据流、工程取舍、异常处理三个层面回答。数据流上，文档清洗→切块→Embedding→入库→检索→生成，每个步骤有明确输入输出和工具选择，比如切块用 RecursiveCharacterTextSplitter 加 10% 重叠。工程取舍上，Embedding 模型选 BGE 还是 ada-002 取决于精度和延迟 trade-off，检索后加 reranker 提升 top-k 质量。异常处理上，每个步骤加重试和缓存，避免单点故障。总结一句：RAG 不是简单串 API，而是每个衔接点都要考虑数据一致性、延迟和成本。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果文档是 1000 页的 PDF，切块后 Embedding 耗时太长怎么办？

> 应对策略：分两步优化。第一，用 `pdfplumber` 按页提取，只对正文页（跳过封面、目录）做 Embedding，减少 30% 数据量。第二，用 `onnxruntime` 量化 BGE 模型到 FP16，batch size 设 64，在单张 A10 GPU 上每秒处理 200 个块。如果仍慢，改用 `text-embedding-3-small`（1536 维，但推理快 3 倍），牺牲 1-2% 精度换 50% 延迟降低。最后，对非实时场景，用 `asyncio` 异步分批入库，避免阻塞。

**追问 2**：检索结果质量差，怎么排查？

> 应对策略：三步定位。第一步，检查 query 和文档的 Embedding 模型是否一致——常见坑是生产环境用了不同版本。第二步，计算检索结果的余弦相似度分布，如果 top-1 相似度 <0.5，说明切块粒度太大或 query 太短，尝试缩小 chunk size 到 128 tokens。第三步，加 `reranker` 验证——用 `Cohere rerank-v3` 对 top-20 重排，如果重排后 top-3 与原始 top-3 完全不同，说明 ANN 索引参数（如 `ef_search`）过小，调大 2 倍。

**追问 3**：生成阶段出现幻觉，怎么在 pipeline 层面解决？

> 应对策略：在 prompt 模板加约束，如 `"如果上下文不包含答案，回答'无法从给定文档中找到'。"` 同时，在检索后加 `relevance filter`——用 `cross-encoder`（如 `ms-marco-MiniLM-L-6-v2`）对 top-k 块打分，丢弃分数 <0.3 的块。如果所有块都低分，直接返回“无相关信息”。最后，在生成后加 `fact-check` 模块，用 `BERTScore` 对比生成内容与检索块的 token 重叠，低于 0.5 则重试或降级。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“用 LangChain 的 RetrievalQA 链一键搞定，不用管细节” → ✅ 正确切入：必须解释每个步骤的输入输出和参数调优，比如切块用 RecursiveCharacterTextSplitter 而非固定字符切分，因为后者会破坏语义边界。
- ❌ 说“Embedding 模型选 OpenAI 的 ada-002 最好，因为官方推荐” → ✅ 正确切入：要对比 BGE 和 ada-002 的 trade-off——BGE 在中文和领域数据上精度更高，但延迟和成本需评估；对实时系统，可能选 `text-embedding-3-small` 更优。
- ❌ 说“入库时用 FAISS 默认参数就行” → ✅ 正确切入：必须调 `nlist`（如 `nlist=100` 对 10 万向量）和 `nprobe`（如 `nprobe=10`），否则召回率可能低于 80%；对海量数据，需考虑 IVF 或 HNSW 的索引类型选择。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“端到端延迟优化”切入，讲如何用异步 pipeline 和缓存将 P99 从 5s 降到 2s，并对比 BGE 和 ada-002 的召回率差异。
- **如果你只做过传统 NLP**：用“文本分类的预处理流程”类比——清洗类似去停用词，切块类似分句，Embedding 类似 TF-IDF 向量化，强调“检索是分类的逆过程”。
- **如果你是校招无项目**：聚焦“论文复现”——讲如何用 `langchain` 和 `FAISS` 实现 `Retrieval-Augmented Generation` 论文中的最小 demo，并调参优化 chunk size 和 overlap。
- 《Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks》（Lewis et al., 2020）
- 《Dense Passage Retrieval for Open-Domain Question Answering》（Karpukhin et al., 2020）
- 《BGE: A High-Performance Embedding Model for RAG》（BAAI, 2023）
- 《LangChain Documentation: RetrievalQA and Text Splitters》
- 《FAISS: A Library for Efficient Similarity Search》（Facebook AI, 2019）

---
