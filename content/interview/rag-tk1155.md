---
slug: rag-tk1155
no: "2055"
title: "做完Embedding就直接去向量库搜了？你的知识库是怎么建的？文档怎么解析的？Chunk怎么切的？这些都不讲"
question: "做完Embedding就直接去向量库搜了？你的知识库是怎么建的？文档怎么解析的？Chunk怎么切的？这些都不讲"
excerpt: "面试官在追问“做完Embedding就直接去向量库搜了”时，真正想看的是你是否理解RAG系统的离线知识库构建是一个系统工程，而非简单调用API。考察类型为系统设计+工程取舍，刁钻点在于：很多人只关注在线检索（embedd"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4509
updated: "2026-09-29"
---

## 做完Embedding就直接去向量库搜了？你的知识库是怎么建的？文档怎么解析的？Chunk怎么切的？这些都不讲

`P1` · `rag` · 🏢 京东

#### 1️⃣ 考察意图

面试官在追问“做完Embedding就直接去向量库搜了”时，真正想看的是你是否理解RAG系统的**离线知识库构建**是一个系统工程，而非简单调用API。考察类型为**系统设计+工程取舍**，刁钻点在于：很多人只关注在线检索（embedding+搜索），却忽略了文档解析、chunk策略、元数据设计等前置步骤，这些才是决定RAG效果上限的关键。答好了能展示你对**整条链路质量把控**的硬实力，包括处理非结构化数据（PDF/扫描件）、平衡检索粒度与计算成本、以及如何通过元数据提升召回率。

#### 2️⃣ 标准答

知识库构建不是“文档→embedding→向量库”三步走，而是一个**离线处理Pipeline**，包含四个核心阶段：文档解析、智能Chunk切分、向量化与索引构建、元数据增强。下面逐一拆解。

#### 阶段一：文档解析（Document Parsing）

- **输入**：PDF、Word、扫描件、网页等非结构化数据。
- **方法**：使用**MinerU**或**LayoutLMv3**做版面分析（Layout Analysis），识别标题、段落、表格、图片、页眉页脚等区域。对扫描件必须加**OCR**（如PaddleOCR或Tesseract），否则纯文本提取会丢失信息。
- **坑与解法**：PDF中常见“文本层乱序”（如多栏排版被按行读取），导致语义断裂。解法：用**版面还原算法**（如MinerU的PDF-Extract-Kit）按阅读顺序重组文本块，而非直接按坐标拼接。
- **输出**：结构化文档（JSON格式），每个元素带类型（title/paragraph/table）和层级（h1/h2/h3）。

#### 阶段二：智能Chunk切分（Chunking Strategy）

- **核心原则**：Chunk太小（<100 token）导致上下文丢失，太大（>1000 token）增加检索噪声且embedding语义模糊。通用推荐**300-500 token**，但必须动态调整。
- **方法**：采用**语义Chunking**而非固定长度切分。使用**RecursiveCharacterTextSplitter**（LangChain实现）或**Semantic Splitter**（如Jina AI的Late Chunking），以段落边界、标题层级、句子完整性为分割点。对表格和代码块，保留完整结构（如用Markdown格式包裹）。
- **Overlap设计**：设置**50-100 token**的overlap，避免边界信息丢失。例如，一个Chunk的末尾10%与下一个Chunk的开头10%重叠，确保跨Chunk的实体（如“张三”在Chunk A结尾，“的论文”在Chunk B开头）能被检索到。
- **元数据注入**：每个Chunk携带**文档ID、标题、章节路径、页码、创建时间**等元数据。这能支持后续的**过滤检索**（如只搜2024年后的文档）和**引用溯源**（返回原文位置）。
- **坑与解法**：长文档（如技术手册）中，Chunk可能跨越不同主题。解法：用**主题分割**（如基于BERT的Topic Segmentation）或**LLM辅助分割**（让LLM判断段落边界），但成本高，仅对关键文档使用。

#### 阶段三：向量化与索引构建（Embedding & Indexing）

- **Embedding模型**：选择**BGE-M3**（多语言、支持8192 token长度）或**E5-mistral-7b**（高精度但慢）。对中文场景，BGE-M3是性价比首选，支持稠密+稀疏混合检索。
- **向量库**：使用**Milvus**或**Qdrant**，建**IVF_FLAT**索引（平衡速度与精度）或**HNSW**（高召回但内存大）。同时建**BM25全文索引**（如Elasticsearch），用于混合检索（向量+关键词），弥补embedding对专有名词（如“GRPO算法”）的弱匹配。
- **坑与解法**：向量库的**维度爆炸**（BGE-M3输出1024维）。解法：用**量化**（如PQ量化）压缩到256维，牺牲5%精度换取3倍速度提升。

#### 阶段四：元数据增强（Metadata Enrichment）

- **目的**：让检索结果更精准。例如，用户问“2024年财报”，通过元数据过滤只返回2024年的Chunk。
- **方法**：在Chunk入库时，用LLM（如GPT-4o-mini）自动提取**摘要、关键词、实体**（人名/公司名/日期），作为元数据字段。这能支持**结构化查询**（如“搜索‘苹果’且日期>2023-01-01”）。
- **工程取舍**：元数据提取增加离线处理时间（每文档多花2-5秒），但能明显提升在线检索的**Precision@5**（从70%到85%+）。对实时性要求高的场景，可只提取关键字段（如日期、文档类型）。

**总结**：知识库构建是“解析→Chunk→向量化→元数据”的完整流程，每一步都有trade-off。面试官问“这些都不讲”，其实是在考察你是否把RAG当作**系统工程**而非API调用。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从文档解析、Chunk切分、索引构建三个层面回答。文档解析用MinerU做版面分析和OCR，解决PDF乱序问题；Chunk切分采用语义分割+50 token overlap，并注入元数据支持过滤检索；索引构建用BGE-M3做embedding，同时建BM25索引做混合检索。总结一句：知识库构建是系统工程，每一步的取舍决定了RAG的最终效果。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你的Chunk大小为什么选300-500 token？有实验数据支撑吗？

> 这是基于**BEIR benchmark**的通用结论。实验显示：Chunk在300-500 token时，检索Recall@10最高（约85%），低于200 token时丢失上下文导致Recall下降10%，高于1000 token时embedding语义模糊（向量距离无法区分细粒度差异）。具体到业务，如果文档是技术手册（密集术语），我会缩到200-300 token；如果是新闻（长段落），扩到500-700 token。实际落地时，我会用**A/B测试**对比不同chunk size的NDCG@10，选最优值。

**追问 2**：你提到混合检索，向量和BM25的权重怎么配？为什么？

> 权重配比取决于场景。对**开放域问答**（如客服），向量占70%、BM25占30%，因为语义匹配更重要；对**专有名词密集**场景（如法律合同），BM25占50%以上，因为“GRPO算法”这类词向量可能匹配不到。具体实现：用**RRF（Reciprocal Rank Fusion）** 合并结果，公式为`score = 1/(k + rank_vector) + 1/(k + rank_bm25)`，k取60（经验值）。工程上，我会在离线用**Grid Search**调参，选Recall@10最高的权重。

**追问 3**：文档解析中，表格和图片怎么处理？直接丢弃吗？

> 不丢弃。表格用**Table Transformer**（微软开源）检测并转为Markdown格式（如`| 列1 | 列2 |`），作为Chunk的一部分。图片用**CLIP**或**BLIP-2**生成描述文本（如“图表显示2023年营收增长20%”），嵌入到相邻Chunk的元数据中。坑是：图片描述可能不准确，导致检索噪声。解法：只对关键图片（如数据图表）生成描述，对装饰性图片（如logo）直接跳过。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“我用LangChain的默认TextSplitter，chunk_size=500，overlap=50，效果还行” → ✅ 正确切入：必须解释为什么选这个参数，以及如何根据文档类型动态调整（如对代码块用`PythonCodeSplitter`，对表格保留完整结构）。
- ❌ 说“文档解析用PyPDF2直接提取文本，简单快速” → ✅ 正确切入：PyPDF2无法处理扫描件和乱序排版，必须用MinerU或LayoutLMv3做版面分析，并加OCR。
- ❌ 说“元数据就是存个文档ID和标题，没什么用” → ✅ 正确切入：元数据是提升检索精度的关键，支持过滤检索（如按日期/类型）和引用溯源，还能用于后续的rerank阶段（如按时间衰减排序）。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“离线Pipeline优化”角度切入，强调你如何用MinerU解决PDF乱序问题，以及如何通过语义Chunking+元数据提升检索Recall@10（从70%到85%）。
- **如果你只做过传统NLP**：用“文本分割”类比Chunking，强调你理解语义边界的重要性（如用BERT做Topic Segmentation），并展示你熟悉BM25和向量检索的混合策略。
- **如果你是校招无项目**：聚焦“论文复现”，提到你读过《Dense Passage Retrieval for Open-Domain QA》和《ColBERT: Efficient and Effective Passage Search》，并实现过基于BGE-M3的简单知识库demo，包括文档解析和chunk切分。
- 《Dense Passage Retrieval for Open-Domain Question Answering》（Karpukhin et al., 2020）
- 《ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT》（Khattab & Zaharia, 2020）
- MinerU: PDF-Extract-Kit 开源工具（GitHub）
- 《When Chunking is Not Enough: A Study of Document Segmentation for Retrieval-Augmented Generation》（2024, arXiv）
- Milvus 官方文档：IVF_FLAT vs HNSW 索引对比
