---
slug: rag-tk048
no: "948"
title: "| 19 | What are the popular frameworks to implement a RAG system"
question: "| 19 | What are the popular frameworks to implement a RAG system"
excerpt: "面试官想看你是否真正用过 RAG 框架，而不仅仅是背名字。这道题表面是“列举框架”，实际考察三点：生态理解（能否区分 LangChain 和 LlamaIndex 的定位差异）、工程取舍（知道何时用框架、何时手写）、落地"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4478
updated: "2026-09-29"
---

## | 19 | What are the popular frameworks to implement a RAG system

`P0` · `rag`

🏷 标签：`rag`, `frameworks`, `langchain`, `llamaindex`

#### 1️⃣ 考察意图

面试官想看你是否真正用过 RAG 框架，而不仅仅是背名字。这道题表面是“列举框架”，实际考察三点：**生态理解**（能否区分 LangChain 和 LlamaIndex 的定位差异）、**工程取舍**（知道何时用框架、何时手写）、**落地经验**（是否踩过框架的坑）。刁钻点在于：候选人容易罗列工具名却说不清 trade-off，答好了能展示你对 RAG 整条链路的掌控力——从数据预处理到检索、生成、评估，以及框架选型的决策逻辑。

#### 2️⃣ 标准答

RAG 框架的选型取决于你的场景：是快速原型验证、复杂数据索引，还是生产级端到端系统。以下按生态成熟度排序，重点讲 **LangChain** 和 **LlamaIndex**，再补充其他工具。

- **LangChain**：模块化“瑞士军刀”，核心是 Chain 和 Agent 抽象。**优势**：组件丰富（支持 100+ LLM、检索器、文档加载器），适合快速搭建多步骤流程（如先检索再生成、再调用工具）。
- **实战坑**：早期版本 API 变动频繁，且默认的 `RecursiveCharacterTextSplitter` 按字符切分，容易切碎语义块。**解法**：改用 `SemanticChunking`（基于 embedding 相似度）或固定 token 数 + 重叠窗口（chunk_size=512, overlap=128）。
- **Trade-off**：灵活性高但抽象层厚，调试时得深入源码（比如 `RetrievalQA` 链内部默认用 `stuff` 模式，长上下文会截断）。生产环境建议用 `LCEL`（LangChain Expression Language）显式定义流程，避免黑盒。
LlamaIndex：数据索引“专家”，核心是 Index 和 QueryEngine。
- **优势**：内置 10+ 索引类型（`VectorStoreIndex`、`TreeIndex`、`KeywordTableIndex`），支持复杂查询（如“先摘要再检索”的递归检索）。
- **实战坑**：默认的 `SimpleDirectoryReader` 会加载所有文件，但 PDF 解析质量差（依赖 PyPDF2）。**解法**：替换为 `UnstructuredReader` 或 `LlamaParse`（支持表格/图片提取）。
- **Trade-off**：索引构建快，但查询时若用 `VectorIndexRetriever` 默认 top_k=2，小文档容易漏召回。调参时需结合 `similarity_cutoff`（如 0.7）过滤低分结果。
Haystack（deepset）：端到端框架，强调 pipeline 和组件复用。
- **场景**：适合需要多轮检索+过滤的 QA 系统（如文档问答）。
- **优势**：内置 `EmbeddingRetriever` 和 `BM25Retriever` 混合检索，且支持 `DocumentJoiner` 合并结果。
- **坑**：文档加载器不如 LlamaIndex 丰富，中文支持弱（需自定义分词器）。
RAGAS：评估框架，不是构建工具。
- **核心指标**：`Faithfulness`（生成是否忠实于检索结果）、`AnswerRelevancy`（答案是否匹配问题）、`ContextPrecision`（检索结果是否相关）。
- **用法**：用 LangChain/LlamaIndex 搭好系统后，用 RAGAS 跑 100 个测试样本，定位瓶颈（比如 Faithfulness 低说明生成模型幻觉重，需调 prompt 或加 rerank）。
其他工具：
- **Cohere RAG**：托管服务，内置 rerank 和 citation，适合不想自己搭检索的团队。
- **OpenAI Assistants API**：开箱即用，但检索依赖 OpenAI 内部索引，无法自定义 chunking 策略。
- **自定义实现**：用 FAISS + HuggingFace Embeddings + Transformers 手写，适合对延迟/成本有极致要求（如边缘设备）。**Trade-off**：开发周期长，但可控性最高（比如用 `HNSW` 索引替代 FAISS 的 IVF 以提升召回率）。

**总结**：快速原型用 LangChain，数据索引复杂用 LlamaIndex，生产评估用 RAGAS，定制化场景手写。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从生态定位、工程取舍、评估完整流程三个层面回答。生态上，LangChain 适合快速搭建多步骤流程，LlamaIndex 专精数据索引，Haystack 做端到端 pipeline。工程上，框架省时间但牺牲控制力，比如 LangChain 的默认 chunking 会切碎语义，得手动调参。评估上，RAGAS 能量化 Faithfulness 和 ContextPrecision，定位瓶颈。总结一句：选框架看场景——原型用 LangChain，索引用 LlamaIndex，生产评估用 RAGAS，极致定制手写。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 LangChain 的坑，具体怎么调试？比如检索结果不准怎么办？

> 先分两步：检索召回低还是生成质量差。召回低：检查 chunking 策略（用 `SemanticChunking` 替代固定切分），调 `top_k`（从 5 试到 20），加 `MMR`（最大边际相关性）去重。生成差：检查 `RetrievalQA` 的 prompt 模板（默认太简单，加“如果检索结果无关，请说不知道”），或换 `map_reduce` 模式处理长上下文。工具层面：用 LangSmith 追踪每一步的输入输出，定位是 embedding 模型（如 `text-embedding-3-small` 维度 1536）还是 rerank 环节（加 `CohereRerank` 提分 5-10%）。

**追问 2**：LlamaIndex 的索引类型怎么选？比如什么时候用 `TreeIndex` 而不是 `VectorStoreIndex`？

> `VectorStoreIndex` 适合语义相似度检索，比如问答场景；`TreeIndex` 适合层级化文档（如书籍章节），它递归构建树结构，查询时从根节点向下遍历，减少搜索空间。Trade-off：`TreeIndex` 构建慢（O(n log n)），且对文档结构敏感；`VectorStoreIndex` 快但依赖 embedding 质量。实战中，如果文档有明确标题/段落，用 `TreeIndex` 结合 `KeywordTableIndex` 做混合检索；否则无脑用 `VectorStoreIndex` + `HNSW` 索引。

**追问 3**：RAGAS 的 Faithfulness 分数低，怎么优化？

> Faithfulness 衡量生成是否忠实于检索结果。分数低说明模型“编造”了检索中没有的信息。解法：1）加 prompt 约束：“仅基于以下上下文回答，不要添加外部知识”；2）降低生成温度（从 0.7 降到 0.1）；3）加 rerank 过滤低分文档（用 `CohereRerank` 或 `bge-reranker-v2-m3`）；4）如果检索结果本身噪声大，用 `LLM-as-judge` 做二次过滤（让 LLM 判断文档是否相关）。实测：加 rerank 后 Faithfulness 从 0.65 提到 0.82。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只罗列框架名（“LangChain、LlamaIndex、Haystack”）不解释区别 → ✅ 必须给出定位差异（LangChain 是流程编排，LlamaIndex 是数据索引）和适用场景（原型 vs 生产）。
- ❌ 说“框架都一样，选哪个都行” → ✅ 必须指出 trade-off（框架省时间但牺牲控制力，手写可控但开发周期长），并给具体决策依据（如数据量 < 1 万条用 LlamaIndex，> 10 万条用自定义 FAISS）。
- ❌ 不提评估（“搭好就行”） → ✅ 必须带 RAGAS 或类似工具，说明如何量化指标（Faithfulness、ContextPrecision）并定位瓶颈。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“框架选型决策”切入，比如“在 XX 项目中，我对比了 LangChain 和 LlamaIndex，发现 LlamaIndex 的 `TreeIndex` 更适合层级文档，最终用混合索引（Vector + Keyword）将召回率提升 15%”。
- **如果你只做过传统 NLP**：用“检索系统类比”迁移，比如“传统信息检索用 BM25，RAG 框架相当于把 BM25 换成 embedding 检索 + 生成模型，LangChain 的 `RetrievalQA` 链类似 pipeline 封装”。
- **如果你是校招无项目**：聚焦“论文复现 demo”，比如“我复现了 RAG 论文（Lewis 2020），用 LangChain 的 `VectorStoreIndex` 和 `OpenAI` 模型，在 100 条 SQuAD 数据上跑通，并用 RAGAS 评估 Faithfulness 达到 0.78”。
- LangChain 官方文档：LCEL 和 RetrievalQA 链详解
- LlamaIndex 论文：LlamaIndex: A Data Framework for LLM Applications
- RAGAS 论文：RAGAS: Automated Evaluation of Retrieval Augmented Generation
- Haystack 实战：Building a QA System with Haystack 2.0
- 自定义 RAG 实现：FAISS + HuggingFace Embeddings + Transformers 手写教程

---
