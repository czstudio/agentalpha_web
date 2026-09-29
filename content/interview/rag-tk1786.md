---
slug: rag-tk1786
no: "2686"
title: "How does RAG work"
question: "How does RAG work"
excerpt: "面试官想确认你是否真正理解RAG的工程本质，而非仅背诵“检索+生成”的皮毛。这是P0基础题，但刁钻点在于：能否清晰区分索引与检索阶段的工程细节，并给出量化权衡（如chunk大小对延迟/召回的影响）。答好了能展示你对系统组"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3765
updated: "2026-09-29"
---

## How does RAG work

#### 1️⃣ 考察意图

面试官想确认你是否真正理解RAG的工程本质，而非仅背诵“检索+生成”的皮毛。这是P0基础题，但刁钻点在于：能否清晰区分索引与检索阶段的工程细节，并给出量化权衡（如chunk大小对延迟/召回的影响）。答好了能展示你对系统组件（embedding模型、向量数据库、LLM）的选型能力，以及处理“检索噪声”和“生成幻觉”的实战经验。

#### 2️⃣ 标准答

RAG（Retrieval-Augmented Generation）的核心是**用外部知识库增强LLM的生成能力**，解决其知识截止和幻觉问题。工作流程分三阶段：

- **索引阶段（Indexing）**
- **文档切分（Chunking）**：将原始文档（如PDF、网页）按语义边界切为chunk。常用策略：固定大小（如512 tokens）或递归分割（RecursiveCharacterTextSplitter，按段落/句子切）。**工程取舍**：chunk太小（<128 tokens）导致上下文碎片化，检索召回率下降；chunk太大（>1024 tokens）增加向量存储成本和检索噪声，且LLM上下文窗口可能溢出。实战中，对技术文档常用256-512 tokens，配合**重叠窗口（overlap=10-20%）** 避免边界信息丢失。
- **向量化（Embedding）**：用嵌入模型（如text-embedding-ada-002、BGE-large-en）将每个chunk转为固定维度向量（如1536维）。**坑**：不同嵌入模型对领域敏感，例如医疗文档用PubMedBERT比通用模型好。需离线批量计算，并归一化向量（L2归一化）以支持余弦相似度搜索。
- **存储（Vector Database）**：向量存入FAISS（内存索引，适合小规模）或Milvus/Pinecone（分布式，支持百万级）。索引结构选**IVF_FLAT**（倒排文件，速度与精度平衡）或**HNSW**（分层可导航小世界，高召回但内存大）。**实际落地的坑**：未做索引压缩（如PQ量化）会导致内存爆炸，例如100万条1536维向量需约5.7GB内存（100万×1536×4字节），用PQ量化可压缩至1/4。
- **检索阶段（Retrieval）**
- **查询嵌入**：用户问题同样用相同嵌入模型转为向量。**注意**：查询通常短且稀疏，直接嵌入可能丢失语义。优化方案：**HyDE（Hypothetical Document Embeddings）**——先用LLM生成一个假设文档（如“关于XX的答案”），再嵌入该文档检索，提升召回率约5-10%（据论文【通用知识】）。
- **相似性搜索**：在向量库中执行**余弦相似度**或**点积**搜索，返回top-k（常用k=5-10）。**工程取舍**：k值小（如3）降低召回，但减少LLM输入噪声；k值大（如20）提升召回，但增加生成延迟和幻觉风险。实战中，对问答场景用k=5，对摘要场景用k=10。
- **重排序（Reranking）**：用交叉编码器（如Cohere rerank-v3、BGE-reranker）对top-k结果重新打分，仅保留top-3。**为什么这么做**：双编码器（检索用）速度快但精度低，交叉编码器精度高但慢，组合后实现“粗筛+精排”。**坑**：重排序模型需与检索模型同领域微调，否则可能降级。
- **生成阶段（Generation）**
- **提示拼接（Prompt Construction）**：将检索到的chunk与原始查询拼接为模板，例如：

`Context: {chunk1}\n{chunk2}\n...**Question: {query}
Answer:
`需控制总token数不超过LLM上下文窗口（如GPT-4的128K）。实际落地的坑**：chunk顺序影响生成质量，按相关性降序排列（最相关在前）可提升答案连贯性。

- **LLM生成**：调用LLM（如GPT-4、Claude-3）生成答案。**可选优化**：使用**指令微调**（如RAG-specific prompt）或**少样本示例**（few-shot）引导输出格式。**工程取舍**：温度参数（temperature）设低（0.1-0.3）可减少幻觉，但牺牲多样性；设高（0.7-1.0）适合创意场景。
- **端到端优化**
- **评估指标**：检索召回率（Recall@k）、生成准确率（F1）、答案忠实度（Faithfulness）。**工具**：RAGAS框架提供自动化评估。
- **常见问题**：检索噪声（不相关chunk）导致幻觉，解法是**重排序+阈值过滤**（如相似度<0.7丢弃）；生成重复，解法是**去重（MMR算法）** 或**多样性惩罚**。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从索引、检索、生成三个层面回答。索引阶段，文档切分为chunk（如256 tokens）并嵌入为向量，存入向量数据库（如FAISS）。检索阶段，用户查询嵌入后执行相似性搜索，可选重排序提升精度。生成阶段，将检索结果与查询拼接为提示，输入LLM生成答案。总结一句：RAG通过外部知识检索增强LLM生成，核心是平衡检索召回与生成质量。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如何选择chunk大小？有什么量化依据？

> 根据文档类型和LLM上下文窗口。技术文档用256-512 tokens，新闻用128-256 tokens。量化依据：在验证集上测试不同chunk大小（如128、256、512）的Recall@5和生成F1。例如，对QA数据集，256 tokens的Recall@5比512高5%，但生成F1低3%，需根据场景权衡。工具：LangChain的`RecursiveCharacterTextSplitter`支持自动调参。

**追问 2**：检索结果不相关怎么办？如何debug？

> 三步排查：1）检查嵌入模型是否匹配领域（如用`text-embedding-ada-002`对中文文档效果差，换`BGE-large-zh`）；2）检查chunk质量（是否包含噪声，如页眉页脚）；3）检查重排序阈值（如相似度<0.5的chunk丢弃）。实战解法：用**查询扩展（Query Expansion）**——用LLM生成同义查询（如“XX的替代方案”），多路检索后合并结果。

**追问 3**：RAG和微调（Fine-tuning）的区别？何时选RAG？

> RAG适合动态知识（如实时新闻）和低频查询（如长尾问题），成本低（无需训练）；微调适合静态知识（如公司内部规范）和高频查询，但需标注数据且易过拟合。**工程取舍**：RAG延迟高（检索+生成约2-5秒），微调延迟低（仅生成约0.5秒）。实战中，对客服系统，80%高频问题用微调，20%长尾用RAG。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只背“检索+生成”流程，不提chunk大小、嵌入模型选型等工程细节 → ✅ 必须给出具体数字（如256 tokens）和工具名（如FAISS、BGE），并解释trade-off（如chunk大小对召回/延迟的影响）。
- ❌ 认为RAG能完全消除幻觉 → ✅ 强调RAG只能减少幻觉，但检索噪声（不相关chunk）仍会导致生成错误，需配合重排序和阈值过滤。
- ❌ 忽略评估指标，只说“效果好” → ✅ 必须提Recall@k、F1、Faithfulness等量化指标，并给出工具（如RAGAS）。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“chunk大小对召回率的影响”切入，展示你做过A/B测试（如256 vs 512 tokens），并提重排序优化（如用Cohere rerank提升F1 5%）。
- **如果你只做过传统NLP**：用“信息检索（BM25）到向量检索（DPR）”的演进类比，强调RAG是“检索+生成”的融合，并提你熟悉TF-IDF/BM25的排序原理。
- **如果你是校招无项目**：聚焦论文复现（如Lewis 2020的RAG论文），描述你实现过端到端demo（用LangChain+FAISS），并提评估指标（如Recall@5）。
- Lewis et al., “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks” (2020)
- Karpathy, “RAG vs Fine-tuning” (博客，2023)
- RAGAS: “RAG Assessment” (GitHub开源框架)
- LangChain官方文档: “RAG with Vector Stores” (教程)
- Pinecone, “What is RAG?” (技术博客)
