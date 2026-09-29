---
slug: rag-tk1231
no: "2131"
title: "你使用 RAG 给大模型一个输入，系统是怎样的工作流程"
question: "你使用 RAG 给大模型一个输入，系统是怎样的工作流程"
excerpt: "面试官想考察你对 RAG 整条链路的工程化理解，而非背诵“检索+生成”的皮毛。这是典型的系统设计 + 工程取舍类问题，刁钻点在于：你是否能区分离线索引与在线推理的职责，能否在检索、排序、生成各环节给出具体方法名和 tra"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3743
updated: "2026-09-29"
---

## 你使用 RAG 给大模型一个输入，系统是怎样的工作流程

`P1` · `rag`

🏷 标签：`rag`, `pipeline`, `retrieval`, `generation`

#### 1️⃣ 考察意图

面试官想考察你对 RAG 整条链路的工程化理解，而非背诵“检索+生成”的皮毛。这是典型的**系统设计 + 工程取舍**类问题，刁钻点在于：你是否能区分离线索引与在线推理的职责，能否在检索、排序、生成各环节给出具体方法名和 trade-off。答好了能展示你从 demo 到生产环境的落地能力，包括对延迟、精度、成本的权衡。

#### 2️⃣ 标准答

RAG 工作流程分**离线索引**和**在线推理**两大阶段，核心是让 LLM 在生成时“看到”外部知识。

**离线索引阶段**：

- **文档分块（Chunking）**：按语义或固定大小切分，常用 RecursiveCharacterTextSplitter（LangChain 默认）或按段落/标题分割。块大小通常 256-512 tokens，重叠 10-20% 避免边界断裂。**坑**：固定大小切分会切断句子，导致检索噪声；解法是用语义分割器（如 NLTK 句子分割 + 滑动窗口）。
- **向量化（Embedding）**：用 BAAI/bge-large-en-v1.5 或 OpenAI text-embedding-3-small 将每个块转为 768/1536 维向量。**取舍**：bge 系列支持 Matryoshka 表示（可截断维度），在精度和存储间灵活调整；OpenAI 模型更通用但成本高。
- **构建索引**：存入向量数据库（如 Milvus、Qdrant、FAISS），使用 HNSW 索引（efConstruction=200, M=16）实现近似最近邻搜索。同时建立倒排索引（BM25）支持关键词检索，默认 k1=1.5, b=0.75。

**在线推理阶段**：

1. **Query 预处理**：用户输入后，先做 Query Rewrite。例如用 LLM 或规则进行拼写纠正、同义扩展（“苹果股价” → “AAPL stock price”）、去停用词。**坑**：直接使用原始 query 检索，长尾问题召回率低；解法是训练一个轻量级 T5 模型做 query 改写。
2. **多路召回**：同时执行向量检索（top-30）和 BM25 检索（top-30），合并后去重。**取舍**：向量检索擅长语义匹配，BM25 擅长精确匹配，多路召回能提升 10-20% 召回率，但增加延迟；生产环境常用异步并发。
3. **重排序（Rerank）**：用 Cross-encoder（如 BAAI/bge-reranker-v2-m3）对合并后的候选块（通常 50-100 个）打分，取 top-3 到 top-5。Cross-encoder 精度高但慢（每对 query-doc 需一次前向），所以只对候选集做。**坑**：直接取 top-k 向量结果，可能漏掉高相关但低语义相似度的块；重排序能修正 5-10% 的排序错误。
4. **Prompt 组装**：将 top-k 块按相关性降序拼接，加上指令模板。例如：注意控制总 token 数（如 4096），避免超出 LLM 上下文窗口。
5. **生成与后处理**：LLM（如 GPT-4、Claude 3.5）生成答案后，做**引用标注**：用正则或 NER 提取答案中与文档块匹配的片段，标记来源。**坑**：LLM 可能幻觉引用不存在的内容；解法是强制要求 LLM 输出时附带 chunk_id，或用验证器检查引用是否真实存在于文档中。

**实际落地的坑 + 解法**：延迟瓶颈通常在 Embedding 和 Rerank。生产环境用 GPU 推理（如 Triton Inference Server）或量化模型（INT8）加速；如果仍超 500ms，可降级为仅向量检索（跳过重排序），牺牲 5% 精度换取 2 倍速度。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从离线索引、在线推理、工程优化三个层面回答。离线索引包括文档分块（256-512 tokens）、向量化（bge-large）和构建 HNSW+BM25 双索引；在线推理包括 query 改写、多路召回、Cross-encoder 重排序、prompt 组装和引用验证；工程优化上，延迟瓶颈在 Embedding 和 Rerank，常用量化模型或降级策略。总结一句：RAG 不是简单的检索+生成，而是每个环节都需要根据精度和延迟做取舍。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果用户 query 是模糊的（如“讲一下那个模型”），你怎么处理？

> 采用 Query 分解 + 多轮澄清。先用 LLM 检测 query 是否模糊（如代词过多），如果是，则生成 2-3 个候选子问题（如“你指的是 GPT-4 还是 LLaMA？”），让用户选择。或者用历史对话上下文补全：从 chat history 中提取最近提到的实体，替换模糊词。**取舍**：多轮交互增加用户负担，适合复杂场景；简单场景直接用 LLM 做隐式消歧（如“那个模型” → 根据对话历史推断）。

**追问 2**：如何评估 RAG 系统的端到端质量？

> 用 RAGAS 框架的 4 个指标：Faithfulness（答案是否基于文档）、Answer Relevance（答案是否相关）、Context Precision（检索块是否精确）、Context Recall（是否遗漏关键块）。生产环境还需监控用户反馈（点赞/点踩）和延迟 P99。**坑**：Faithfulness 依赖 LLM 作为 judge，可能引入偏见；解法是人工标注 500 条测试集做校准。

**追问 3**：如果文档库有 1000 万条，如何保证检索延迟 <200ms？

> 采用分片（Sharding）+ 量化（PQ）。将向量库按 ID 哈希分到 8 个 shard，每个 shard 独立 HNSW 索引（efSearch=64），并行检索后合并。同时用 Product Quantization（PQ）将向量压缩到 32 字节（原 768 维 float32 需 3072 字节），精度损失 <1%，但延迟降低 3-5 倍。**取舍**：PQ 需要训练码本，适合静态库；动态库用 IVF-PQ 混合索引。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只讲“检索+生成”两步，不提分块、重排序、引用验证 → ✅ 必须覆盖离线索引和在线推理的 5-6 个环节，每个环节给出具体方法名和 trade-off。
- ❌ 说“用最先进的模型就行”，不提延迟和成本 → ✅ 强调工程取舍，如“用 bge-reranker-v2-m3 但只对 top-50 做重排序，避免全量计算”。
- ❌ 忽略 query 预处理，直接拿原始 query 检索 → ✅ 必须包含 query rewrite 或 query 分解，并说明为什么（长尾问题召回率低）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从实际踩坑切入，如“我在项目中遇到分块边界切断句子导致检索噪声，改用语义分割器后召回率提升 8%”，并展示你如何用 RAGAS 评估。
- **如果你只做过传统 NLP**：用信息检索类比，如“RAG 的检索部分类似 BM25 的升级版，但多了语义匹配；生成部分类似 seq2seq 的 prompt 工程”，强调你理解检索和生成的衔接。
- **如果你是校招无项目**：聚焦论文复现，如“我复现了 Facebook 的 RAG 论文（Lewis et al., 2020），用 DPR 做检索、BART 做生成，并对比了不同 chunk size 对准确率的影响”，展示你对经典工作的理解。
- “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks” (Lewis et al., 2020)
- “REALM: Retrieval-Augmented Language Model Pre-Training” (Guu et al., 2020)
- “RAGAS: Automated Evaluation of Retrieval Augmented Generation” (Es et al., 2023)
- “HNSW: Efficient and Robust Approximate Nearest Neighbor Search” (Malkov & Yashunin, 2016)
- “BGE: BAAI General Embedding” (Xiao et al., 2023)

---
