---
slug: rag-tk1399
no: "2299"
title: "| 37 | How does the chunking strategy differ when dealing with structured documents (like PDFs with tables and figures) versus plain text documents"
question: "| 37 | How does the chunking strategy differ when dealing with structured documents (like PDFs with tables and figures) versus plain text documents"
excerpt: "这道题考察的是 RAG 系统在异构文档场景下的工程取舍与实战经验，属于系统设计 + debug 混合类型。面试官真正想看的是：你是否处理过真实 PDF（含表格、多列、图表），而非只跑过纯文本 demo。刁钻点在于：纯文本"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4105
updated: "2026-09-29"
---

## | 37 | How does the chunking strategy differ when dealing with structured documents (like PDFs with tables and figures) versus plain text documents

`P2` · `rag`

🏷 标签：`rag`, `chunking`, `structured-documents`, `pdf`, `tables`

#### 1️⃣ 考察意图

这道题考察的是 **RAG 系统在异构文档场景下的工程取舍与实战经验**，属于系统设计 + debug 混合类型。面试官真正想看的是：你是否处理过真实 PDF（含表格、多列、图表），而非只跑过纯文本 demo。刁钻点在于：纯文本按 token 或句子切分就能用，但结构化文档一旦切错（如表格被拆成两半、图表描述丢失），检索召回率直接腰斩。答好了能展示你对文档解析管线（PDF parser → layout detection → chunking → embedding）的端到端理解，以及处理多模态信息的硬实力。

#### 2️⃣ 标准答

**核心差异**：结构化文档需要**布局感知（layout-aware）分块**，保留空间关系和语义完整性；纯文本只需**语义边界分块**，按段落或句子切分即可。

**结构化文档（PDF/表格/图表）分块策略**：

- **第一步：PDF 解析器选型**用 **PyMuPDF（fitz）** 或 **pdfplumber** 提取文本 + 坐标（bbox），不要用 PyPDF2（只拿纯文本，丢失布局）。
- 对复杂多列布局，用 **LayoutLM / Detectron2** 做版面分析（layout detection），识别标题、正文、表格、图表区域。
- **坑**：PDF 中表格可能被渲染为图片，此时 OCR（Tesseract / PaddleOCR）是必须的，但 OCR 输出无结构，需后处理成 Markdown 或 JSON。
第二步：表格分块
- **不要**按行切分表格！否则检索时“表头”和“数据行”分离，召回率暴跌。
- 解法：将整个表格转为 **Markdown 格式**（用 `camelot-py` 或 `tabula-py` 提取），作为单个 chunk。
- 如果表格过大（> 512 tokens），按**逻辑行组**切分（如每 10 行一组），但保留表头重复嵌入。
- **Trade-off**：Markdown 表格 token 开销大（每行加 `|` 和空格），但检索准确率提升 15-20%【通用知识】。
第三步：图表分块
- 纯文本模型无法理解图表像素，必须提取**标题 + 描述**（如“Figure 3: Revenue by quarter”）。
- 用 **多模态模型（GPT-4V / Qwen-VL）** 生成图表摘要，作为该 chunk 的文本内容。
- 坑：图表可能跨页，需合并同一图表的标题和正文引用（如“as shown in Fig 3”），否则 chunk 孤立无上下文。
第四步：混合分块策略
- 对同一 PDF，不同区域用不同策略：正文段落：按 **语义边界**（句号/换行）切分，重叠 10-20 tokens 避免边界断裂。
- 表格：整体保留，或按行组切分 + 表头重复。
- 图表：摘要 + 引用文本合并为一个 chunk。
最终所有 chunk 统一 embedding（如 text-embedding-3-small），但 metadata 标记类型（table/figure/text），用于 rerank 时加权。

**纯文本分块策略**：

- **简单高效**：按段落（`\n\n`）或句子（`spaCy sentencizer`）切分，chunk size 256-512 tokens，重叠 10-20%。
- **语义分块**：用 **LangChain RecursiveCharacterTextSplitter** 或 **Semantic Splitter**（基于 embedding 相似度），避免在句子中间切断。
- **无布局顾虑**：不需要坐标或版面分析，token 开销低，适合大规模语料。

**对比总结**：

| 维度 | 结构化文档 | 纯文本 |
|---|---|---|
| 解析复杂度 | 高（需 OCR / layout detection） | 低（直接读文本） |
| 分块粒度 | 按逻辑区域（表格/图表/段落） | 按语义边界（段落/句子） |
| 信息保留 | 保留空间关系（表格行列、图表标题） | 仅保留文本顺序 |
| 检索准确率 | 依赖 chunk 完整性，易因切错下降 | 稳定，但无结构信息 |
| 工程成本 | 高（多模型调用、后处理） | 低（单模型） |

**实际落地坑 + 解法**：

- **坑**：PDF 中表格被 OCR 识别为散乱文本，行列错乱。**解法**：用 `paddleocr` 的表格识别模式（`table_structure=True`），输出 HTML 格式，再转 Markdown。
- **坑**：多列布局导致文本顺序错乱（如先读右列再读左列）。**解法**：用 **LayoutLMv3** 做版面排序，按阅读顺序（top-to-bottom, left-to-right）重组文本流。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，结构化文档需要布局感知分块，用 PyMuPDF 提取坐标，对表格用 camelot 转 Markdown 整体保留，对图表用多模态模型生成摘要；第二，纯文本只需按段落或语义边界切分，用 RecursiveCharacterTextSplitter 即可；第三，核心取舍是结构化分块 token 开销大但检索准确率提升 15-20%，而纯文本高效但丢失结构信息。总结一句：结构化文档分块是‘先解析再切分’，纯文本是‘直接切分’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 PDF 中有扫描件（图片型 PDF），你怎么处理？

> 用 OCR 管线：PaddleOCR 或 Tesseract 提取文本 + 坐标，然后对表格区域用 `paddleocr` 的表格识别模式输出 HTML。但 OCR 有错别字，需用拼写纠正（如 `symspell`）或 LLM 后处理。坑：扫描件多列布局时，OCR 输出顺序可能乱，需用版面分析模型（如 Detectron2）重排阅读顺序。

**追问 2**：表格 chunk 太大（超过 512 tokens），怎么切分而不丢失语义？

> 按逻辑行组切分，每 10-15 行一组，但每组重复嵌入表头（如列名）。Trade-off：重复表头增加 token 开销 10-20%，但检索时表头作为上下文，准确率提升 30%【通用知识】。另一种方案：用列式 embedding，将每列单独编码，但实现复杂且依赖列对齐。

**追问 3**：你怎么评估分块策略的好坏？

> 用两个指标：**检索召回率**（Recall@k）和 **chunk 利用率**（有效 chunk 占比）。在 DocVQA 或自己标注的 PDF 数据集上，对比不同策略：布局感知分块 vs 纯文本分块，看 Recall@5 提升多少。坑：chunk 利用率低说明切分过细，浪费 embedding 存储和检索时间。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “结构化文档和纯文本都用同样的分块策略，比如按 token 数切分。”→ ✅ “结构化文档必须布局感知，表格整体保留，图表生成摘要；纯文本按语义边界切分。统一策略会导致表格被切碎、图表信息丢失。”
- ❌ “用 PyPDF2 提取 PDF 文本，然后直接分块。”→ ✅ “PyPDF2 只拿纯文本，丢失布局信息。必须用 PyMuPDF 或 pdfplumber 提取坐标，对多列布局用版面分析模型重排。”
- ❌ “图表直接忽略，只处理文本。”→ ✅ “图表包含关键信息（如趋势图、流程图），必须用多模态模型生成摘要，或提取标题 + 描述作为 chunk。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在项目中处理过含表格的 PDF，用 camelot 提取表格并转 Markdown 分块，检索准确率提升 20%”切入，强调实战坑（如表格跨页、OCR 错字）。
- **如果你只做过传统 NLP**：用“文本分块类似句子分割，但结构化文档需要版面分析，类似 OCR 后处理”类比，展示迁移能力，并提一句“我读过 LayoutLM 论文”。
- **如果你是校招无项目**：聚焦“我复现过 DocVQA 上的分块对比实验，用 PyMuPDF + camelot 实现布局感知分块，对比纯文本分块，Recall@5 从 0.6 提升到 0.75”，展示动手能力。
- LayoutLMv3: Pre-training for Document AI with Unified Text and Image Masking
- camelot-py: PDF Table Extraction for Humans
- PaddleOCR: Practical Ultra Lightweight OCR System
- LangChain RecursiveCharacterTextSplitter 文档
- DocVQA: A Dataset for Visual Question Answering on Documents

---
