---
slug: rag-tk1425
no: "2325"
title: "📌 Q37: How does the chunking strategy differ when dealing with structured documents (like PDFs with tables and figures) versus plain text documents"
question: "📌 Q37: How does the chunking strategy differ when dealing with structured documents (like PDFs with tables and figures) versus plain text documents"
excerpt: "面试官想考察你处理真实RAG场景中“非理想输入”的能力，而非背诵分块算法。核心是区分“纯文本”和“结构化文档”在信息密度、语义边界、多模态内容上的本质差异。刁钻点在于：很多人只会按token数硬切，忽略了表格/图表的结构"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3582
updated: "2026-09-29"
---

## 📌 Q37: How does the chunking strategy differ when dealing with structured documents (like PDFs with tables and figures) versus plain text documents

`P2` · `rag`

🏷 标签：`rag`, `chunking`, `structured-documents`, `pdf`, `multimodal`

#### 1️⃣ 考察意图

面试官想考察你处理真实RAG场景中“非理想输入”的能力，而非背诵分块算法。核心是区分“纯文本”和“结构化文档”在信息密度、语义边界、多模态内容上的本质差异。刁钻点在于：很多人只会按token数硬切，忽略了表格/图表的结构完整性。答好了能展示你对文档解析（LayoutLM、PyMuPDF）、元数据注入、以及检索质量（Recall@K）的工程敏感度，证明你不是只会调API的流水线工人。

#### 2️⃣ 标准答

分块策略差异的核心是：**结构化文档需要“结构感知分块”，纯文本只需“语义边界分块”**。下面从三个维度展开：

- **分块粒度与边界定义****纯文本**：按段落、句子或固定token数（如256/512）切分，边界由语义完整性决定。常用递归字符分割器（RecursiveCharacterTextSplitter），配合重叠（overlap 10-20%）避免上下文断裂。
- **结构化文档**：边界由文档逻辑结构（标题层级、表格、图表）决定。例如，用PyMuPDF提取PDF的标题树（TOC），按章节分块；表格必须整体保留，不能跨行切割，否则检索时丢失行列关系。**坑**：PDF的视觉布局可能和逻辑结构不一致（如两栏排版），需用LayoutLMv3或UniDoc解析视觉token，再映射到文本流。
多模态内容处理
- **纯文本**：无多模态问题，直接embedding。
- **结构化文档**：表格和图表需要独立处理。表格转Markdown（保留表头、对齐）或键值对（如JSON），再喂给embedding模型；图表需OCR+描述（如用LLaVA或GPT-4V生成caption），然后作为独立chunk存储。**为什么这么做**：直接对表格图像做embedding，检索效果差（CLIP模型对密集文本不敏感），而文本化后可用BM25或DPR检索，Recall@K提升30%+【通用知识】。**实际落地的坑**：表格转Markdown后可能丢失视觉对齐信息（如合并单元格），需额外注入元数据（如`<table caption="销售数据">`）。
元数据注入与检索优化
- **纯文本**：元数据简单（来源、时间戳），检索时主要靠embedding相似度。
- **结构化文档**：每个chunk必须携带结构元数据，如`section_title`、`table_caption`、`page_number`。检索时，可做**混合检索**：对标题字段用BM25加权（权重1.5），对内容字段用embedding。**trade-off**：元数据过多会增加索引体积（约20%），但能明显提升精确率（Precision@5从0.6到0.85）。**坑**：如果表格chunk没有标题元数据，用户问“Q3财报中的营收数据”，检索会匹配到无关表格，所以必须用文档解析器（如Camelot）提取表格标题并注入。
工具与工程取舍
- **纯文本**：LangChain的TextSplitters + OpenAI embedding，简单够用。
- **结构化文档**：推荐管道：PyMuPDF（提取文本+布局）→ LayoutLM（识别表格/图表区域）→ Camelot（表格转CSV）→ GPT-4V（图表描述）。**为什么不用统一模型**：端到端模型（如DocTR）精度高但推理慢（单页2秒），而分步管道可并行化，吞吐量提升10倍。**实际落地的坑**：PDF中的扫描件需要OCR（Tesseract），但OCR误差会污染embedding，建议对OCR文本做拼写校正（如用spellchecker）后再分块。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从分块边界、多模态处理、元数据注入三个层面回答。纯文本按段落或token数切分，边界由语义完整性决定；结构化文档必须按标题层级、表格、图表等逻辑结构分块，表格整体保留并转Markdown，图表需OCR+描述。元数据方面，结构化chunk要携带标题、页码等字段，做混合检索。总结一句：结构化文档的分块核心是‘结构感知’，而非纯文本的‘语义感知’，否则检索质量会断崖式下降。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果PDF是扫描件（图片型），你的分块策略怎么调整？

> 先做OCR（Tesseract或PaddleOCR），但OCR输出是纯文本，丢失了布局信息。我会用LayoutLMv3对OCR结果做视觉-文本对齐，识别表格区域和标题。然后，对表格区域用Camelot提取结构化数据，对图表区域用GPT-4V生成描述。**关键取舍**：OCR精度影响后续所有步骤，如果字符错误率>5%，建议用DocTR（端到端）替代分步管道，虽然慢但精度高。

**追问 2**：表格分块后，用户问“比较Q1和Q2的营收”，怎么保证检索到两个表格？

> 这需要**语义分块+元数据关联**。首先，每个表格chunk携带`table_caption`（如“Q1营收”），并用时间实体识别（如Spacy的NER）提取年份和季度。检索时，对用户query做实体解析（“Q1”和“Q2”），然后做**时间范围过滤**，而不是单纯靠embedding相似度。**坑**：如果表格标题不统一（如“Q1数据” vs “第一季度”），需要做同义词归一化，否则检索会漏掉。

**追问 3**：结构化文档分块后，chunk数量比纯文本多50%，怎么控制检索延迟？

> 用**分层索引**：第一层用标题元数据做粗筛（BM25），第二层对候选chunk做embedding精排。这样，粗筛阶段可过滤掉80%无关chunk，延迟从200ms降到50ms。**trade-off**：粗筛的召回率会下降5-10%，但可以通过调整BM25的k1参数（从1.5降到1.2）来补偿。另外，对高频表格chunk做缓存（如Redis），避免重复embedding。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “结构化文档和纯文本一样，按固定token数切分就行，只是多一个OCR步骤。” → ✅ “固定token数切分会破坏表格和图表的结构完整性，导致检索时丢失行列关系或上下文。必须按逻辑结构分块，表格整体保留，图表单独描述。”
- ❌ “表格直接转成图片，用多模态embedding模型检索。” → ✅ “多模态模型（如CLIP）对密集文本的检索效果差，Recall@K通常低于0.5。表格应转成Markdown或键值对文本化，再用BM25或DPR检索，效果更好。”
- ❌ “结构化文档分块后，元数据不重要，直接embedding就行。” → ✅ “元数据是结构化文档检索的命脉。没有标题或页码元数据，用户问‘第三页的表格’时，检索会完全失效。必须注入结构元数据，并做混合检索。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“处理包含表格的PDF财报”切入，强调你用LayoutLM解析结构、Camelot提取表格、元数据注入后Recall@K提升30%的实战经验。
- **如果你只做过传统NLP**：用“文档结构解析”类比“句法分析”，说明结构化文档分块类似解析树，需要保留层次关系；并提到你复现了LayoutLM论文，验证了结构感知分块的优势。
- **如果你是校招无项目**：聚焦“表格分块对检索质量的影响”这个demo，用DocVQA数据集对比固定token分块和结构感知分块的F1分数，展示你对工程取舍的理解。

#### 7️⃣ 延伸阅读

- LayoutLMv3: Pre-training for Document AI with Unified Text and Image Masking
- Camelot: A Python library for PDF table extraction
- UniDoc: A Unified Document Understanding Framework

---
