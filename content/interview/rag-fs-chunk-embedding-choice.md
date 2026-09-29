---
slug: rag-fs-chunk-embedding-choice
no: "27"
title: "RAG 检索真题 · Rag常见且chunk的方式有哪些？你用的是什么embedding"
question: "Rag常见且chunk的方式有哪些？你用的是什么embedding？"
excerpt: "真题完整解析：面试官想考察你对RAG系统“数据入口”的工程理解，而非背诵概念。刁钻点在于：chunking不是一刀切，embedding也不是越贵越好。答好了能展示你从数据预处理到检索整条链路的权衡能力——比如如何平衡召回率与延迟、如何处理跨…"
tags: ["真题解析", "RAG 检索"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4081
updated: "2026-09-29"
---

## Rag常见且chunk的方式有哪些？你用的是什么embedding

#### 1️⃣ 考察意图

面试官想考察你对RAG系统“数据入口”的工程理解，而非背诵概念。刁钻点在于：chunking不是一刀切，embedding也不是越贵越好。答好了能展示你从数据预处理到检索整条链路的权衡能力——比如如何平衡召回率与延迟、如何处理跨段落语义断裂、如何根据文档类型（代码/法律/新闻）选择策略。这属于“系统设计+工程取舍”型问题，能暴露候选人是否真的调过线上RAG流水线。

#### 2️⃣ 标准答

**常见Chunk方式（按实用频率排序）：**

- **固定长度滑动窗口（Fixed-size Sliding Window）**最基础，比如按512 tokens切，重叠128 tokens。
- 优点：实现简单，延迟可控，适合通用场景。
- 坑：语义断裂——比如一句话被切到两个chunk里，检索时可能漏掉关键上下文。
- 解法：用重叠窗口+后处理合并（如按句子边界对齐），或配合rerank阶段做上下文扩展。
- **语义分割（Semantic Chunking）**基于句子边界（NLP工具如spaCy）或段落（空行/缩进）切分。
- 优点：保留语义完整性，召回质量高。
- 坑：文档结构不规则时（如Markdown表格、代码块），分割点可能错位。
- 解法：先用正则或文档解析器（如Unstructured.io）提取结构化元素，再按段落切。
- **递归分割（Recursive Chunking）**先按大粒度（章节）切，再按小粒度（段落）细分，类似LangChain的`RecursiveCharacterTextSplitter`。
- 优点：适应不同层级，适合长文档（如论文、技术文档）。
- 坑：递归深度控制不好会导致chunk数量爆炸。
- 解法：设定最大chunk size（如1024 tokens）和最小chunk size（如128 tokens），超出则继续递归。
- **基于文档结构（Document Structure Chunking）**利用标题、列表、代码块等标记（如Markdown的`#`、HTML的`<h1>`）。
- 优点：对结构化文档（如API文档、法律合同）效果极佳。
- 坑：依赖解析器质量，非结构化文档（如纯文本）无效。
- 解法：结合`python-docx`或`BeautifulSoup`解析后，按标题层级切分。

**Embedding模型选择（按场景推荐）：**

- **通用英文场景**：`text-embedding-3-small`（OpenAI，1536维，性价比高）或`text-embedding-ada-002`（旧版，但稳定）。
- 为什么：推理快（<50ms/请求），支持多语言，但中文效果不如专用模型。
- 坑：OpenAI embedding有token限制（ada-002是8191 tokens），超长文本需截断或分段。
- **中文场景**：`BAAI/bge-large-zh-v1.5`（1024维）或`moka-ai/m3e-base`（768维）。
- 为什么：中文语义理解强，bge在C-MTEB上Recall@10达0.85+。
- 坑：bge-large-zh需要GPU推理（约2GB显存），CPU部署延迟高（>200ms/请求）。
- 解法：用`bge-small-zh`（384维）做快速检索，再用大模型rerank。
- **高精度场景**：`intfloat/e5-mistral-7b-instruct`（4096维）或`Cohere embed-english-v3.0`。
- 为什么：e5用指令微调，支持长上下文（32k tokens），适合法律/医学文档。
- 坑：推理成本高（7B模型需A100），延迟>1s/请求。
- 解法：仅用于离线索引，线上用蒸馏版（如`e5-base-v2`）。

**实际落地的坑+解法：**

- **坑1：chunk大小与embedding维度不匹配**比如用512 tokens的chunk，但embedding模型只支持256 tokens输入（如旧版`text-embedding-ada-002`）。解法：chunk size设为模型最大输入长度的80%（留余量），或分段embed后取平均。
- **坑2：混合检索时稀疏与稠密向量冲突**比如BM25召回结果与dense embedding召回结果差异大，融合后反而降低MRR。解法：用加权融合（如BM25权重0.3，dense权重0.7），或先做rerank再融合。
- **坑3：多语言文档的chunking**比如中英文混排的文档，按token切分可能把中文词切碎。解法：用语言检测（如`langdetect`）后，分别用不同分词器（中文用jieba，英文用spaCy）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从chunking策略、embedding选择、工程取舍三个层面回答。chunking方面，我常用固定长度滑动窗口（512 tokens+128重叠）做基线，语义分割（按句子边界）提升召回，递归分割处理长文档。embedding方面，中文场景用bge-large-zh-v1.5，英文用text-embedding-3-small，高精度用e5-mistral-7b。关键取舍是：chunk大小影响检索粒度，embedding维度影响延迟和成本。总结一句：没有万能方案，必须根据文档类型和延迟预算做A/B测试。”

#### 4️⃣ 高频追问 & 应对

**追问1**：你如何评估chunk策略的好坏？具体用什么指标？

> 用Recall@k和MRR。比如在自定义问答数据集上，固定长度chunk（512 tokens）的Recall@5是0.72，语义分割（按段落）是0.81。但语义分割的chunk数量多30%，导致检索延迟增加15%。所以我会画Pareto曲线，选Recall@5>0.8且延迟<100ms的配置。另外，用NDCG评估排序质量，避免chunk太碎导致rerank负担。

**追问2**：如果文档是PDF，chunking时怎么处理表格和图片？

> 先用PyMuPDF或pdfplumber提取文本和表格，表格用markdown格式保留（如`| col1 | col2 |`）。图片用OCR（如Tesseract）转文本后嵌入。坑是表格转文本后语义可能丢失，解法是单独建一个“表格chunk”索引，检索时用关键词匹配（BM25）召回，再与文本chunk融合。

**追问3**：你用的embedding模型是开源的，如何保证线上推理延迟？

> 用ONNX Runtime或TensorRT量化。比如bge-large-zh从FP32转FP16，推理速度提升2倍，精度下降<1%。另外，用向量数据库（如Milvus）的GPU索引（IVF_PQ）加速检索，延迟从200ms降到30ms。如果预算有限，用bge-small-zh（384维）做第一轮检索，再用bge-large-zh rerank top-100。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“chunk大小固定为512 tokens，embedding用text-embedding-ada-002” → ✅ 应强调“根据文档类型调整：代码文档用递归分割（按函数块），新闻用固定长度（256 tokens），法律用语义分割（按段落）”。
- ❌ 说“embedding模型越贵越好，比如用e5-mistral-7b” → ✅ 应指出“高精度模型适合离线索引，线上用轻量模型+rerank组合，否则延迟和成本不可控”。
- ❌ 说“chunking和embedding是独立的两个步骤” → ✅ 应说明“chunk大小影响embedding的语义密度，比如512 tokens的chunk用bge-large-zh（1024维）比用ada-002（1536维）更匹配，因为bge的维度更低，对长文本的压缩更鲁棒”。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“我在XX项目中对比了固定长度和语义分割chunk，发现语义分割在Recall@5上提升12%，但延迟增加20%，最终用混合策略（70%语义+30%固定）”切入。
- **如果你只做过传统NLP**：用“文本分类中的句子分割类比chunking，embedding类似词向量但需要上下文建模”迁移，并强调“我复现了bge-large-zh的C-MTEB评测，理解了维度与召回的关系”。
- **如果你是校招无项目**：聚焦“我复现了LangChain的RecursiveCharacterTextSplitter，并对比了bge-small-zh和text-embedding-3-small在SQuAD上的Recall@5，发现bge在中文上高5%”。
- 《Dense Passage Retrieval for Open-Domain Question Answering》（Karpukhin et al., 2020）
- 《BGE: A Family of Bilingual General Embeddings》（BAAI, 2023）
- 《E5: A Family of Text Embeddings with Instruction Tuning》（Wang et al., 2023）
- LangChain官方文档：RecursiveCharacterTextSplitter与SemanticChunker对比
- Milvus向量数据库：IVF_PQ索引参数调优指南
