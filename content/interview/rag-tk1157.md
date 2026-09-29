---
slug: rag-tk1157
no: "2057"
title: "文档有章节标题，切完之后标题跟正文分开了，检索的时候怎么知道这个片段属于哪个章节"
question: "文档有章节标题，切完之后标题跟正文分开了，检索的时候怎么知道这个片段属于哪个章节"
excerpt: "面试官想看你是否理解 RAG 系统中“文档结构感知”这一核心问题，而非仅会调包切 chunk。考察类型是工程取舍 + 系统设计。刁钻点在于：候选人常默认“切完就完事”，忽略结构化元数据对检索质量的致命影响——标题与正文分"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3911
updated: "2026-09-29"
---

## 文档有章节标题，切完之后标题跟正文分开了，检索的时候怎么知道这个片段属于哪个章节

`P1` · `rag` · 🏢 字节

#### 1️⃣ 考察意图

面试官想看你是否理解 RAG 系统中“文档结构感知”这一核心问题，而非仅会调包切 chunk。考察类型是**工程取舍 + 系统设计**。刁钻点在于：候选人常默认“切完就完事”，忽略结构化元数据对检索质量的致命影响——标题与正文分离后，检索片段丢失上下文，导致 LLM 生成时“张冠李戴”。答好了能展示你对 chunking 策略、元数据设计、以及检索阶段如何利用结构信息的硬实力，比如能设计出可落地的 section_path 方案。

#### 2️⃣ 标准答

核心思路：**在切分阶段保留文档层级结构，并通过元数据（metadata）将标题与正文绑定**。具体分三步：

- **第一步：解析文档结构，提取层级标题**使用文档解析器（如 python-docx 处理 Word，PyMuPDF 处理 PDF，或 Unstructured.io 做通用解析）识别标题层级。例如，Markdown 文档中 `#` 到 `######` 对应 H1-H6；PDF 中通过字体大小、加粗、段落间距等启发式规则提取。关键点：**不要只切文本，要构建树状结构**，每个节点包含标题文本、层级（level）、正文内容。
- **第二步：设计 Chunking 策略，合并标题与正文**采用**基于标题的语义切分**（Section-based Chunking）：将每个标题及其后续正文（直到下一个同级或更高级标题）作为一个 Chunk。例如：
- H1 "引言" + 正文 → Chunk A
- H2 "背景" + 正文 → Chunk B这样确保每个 Chunk 自带标题上下文。**工程取舍**：这种策略会生成大小不一的 Chunk（短标题可能只有 50 字，长章节可能 2000 字），需要设定最大长度（如 512 tokens）并做二次切分，但必须保留标题前缀。对比“固定大小切分 + overlap”，后者虽简单但丢失结构，检索时无法区分“方法”和“结果”章节的片段。
- **第三步：在 metadata 中记录 section_path**每个 Chunk 的 metadata 字段必须包含 `section_path`，例如 `["报告", "实验部分", "数据集"]`，表示从根到当前章节的完整路径。这样检索时，即使 Chunk 内容只包含“我们使用了 10 万条数据”，也能通过 `section_path` 知道它属于“实验部分 > 数据集”。**实际落地的坑**：如果文档有嵌套列表或表格，标题可能不连续（如表格内无标题），此时需要 fallback 到最近的上层标题，并在 metadata 中标记 `is_fallback: true`，避免误导。
- **检索阶段如何利用**：在向量检索时，将 `section_path` 作为 filter 或 boost 字段。例如，用户问“实验用了多少数据”，可以优先召回 `section_path` 包含“实验”的 Chunk；或者用混合检索（BM25 + 向量），对标题字段加权（如 BM25 中标题权重设为 3，正文为 1）。**具体方法**：使用 Elasticsearch 的 `multi_match` 查询，对 `title` 和 `content` 字段分别设置 boost。
- **备选方案：overlap 的局限性**面试官提到的“加 overlap”是常见但低效的做法。overlap 只能让相邻 Chunk 共享边界文本，但无法解决跨章节的标题归属问题（比如“3.1 方法”的 overlap 可能混入“3.2 结果”的内容）。更优解是**结构化 overlap**：只对同一章节内的相邻 Chunk 加 overlap，跨章节时重置。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，切分前必须解析文档层级结构，用 Section-based Chunking 把标题和正文合并为一个 Chunk；第二，在 metadata 中记录 section_path，比如 `[‘报告’, ‘实验’, ‘数据集’]`，这样检索时能溯源；第三，检索阶段对标题字段加权，或用 section_path 做 filter。总结一句：核心是让 Chunk 自带结构上下文，而不是靠 overlap 硬凑。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果文档是 PDF，标题识别不准（比如字体大小差异小），怎么办？

> 应对策略：采用多模态方案，先用 OCR（如 Tesseract）提取文本和坐标，再用规则（如字体大小变化 > 2pt、加粗、居中对齐）识别标题。若仍不准，引入轻量分类模型（如 LayoutLMv3）预测段落类型（标题/正文/列表）。工程取舍：模型推理会增加延迟（约 50-100ms/页），适合离线预处理；在线场景可用启发式规则 + 人工标注的 fallback 列表（如常见标题关键词“摘要”“方法”）。

**追问 2**：section_path 存成数组，检索时怎么高效过滤？比如用户问“第三章的内容”。

> 应对策略：将 section_path 序列化为字符串（如 “报告/实验/数据集”），在 Elasticsearch 中用 `prefix` 查询或 `wildcard` 匹配。例如查询 `section_path: “报告/实验/*”` 可召回所有实验章节的 Chunk。更优方案：用嵌套文档（nested）存储，但会增加索引复杂度。取舍：字符串查询简单但无法精确匹配层级（如“实验”可能匹配“实验前”），建议用 `path_hierarchy` tokenizer 将路径拆成多级 token（如 “报告”、“报告/实验”），支持精确过滤。

**追问 3**：如果文档有多个 H1 标题（比如论文的“引言”和“相关工作”），但正文里引用其他章节，怎么处理？

> 应对策略：在 Chunk 的 metadata 中额外记录 `references` 字段，解析文档中的交叉引用（如“详见第 3 节”），将其映射到对应 Chunk 的 ID。检索时，如果用户问题包含“第 3 节”，可以 boost 该 Chunk。实际坑：交叉引用可能跨文档（如“参见附录 A”），需要全局 ID 映射表。工程上，用正则提取引用模式（如“第\d+节”），再查表替换。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “直接加 overlap 就能解决，让相邻 chunk 共享标题文本。”→ ✅ overlap 只能解决边界模糊，无法处理跨章节的标题归属。正确做法是 Section-based Chunking + metadata，让每个 chunk 自带完整路径。
- ❌ “把标题单独存一个字段，检索时用标题字段做 BM25 加权。”→ ✅ 标题单独存会导致正文 chunk 丢失标题上下文，检索时正文片段无法关联标题。必须将标题与正文合并为一个 chunk，再在 metadata 中记录路径。
- ❌ “用固定大小切分，然后对每个 chunk 用 LLM 生成摘要作为标题。”→ ✅ LLM 生成摘要成本高（每 chunk 约 0.1 元），且可能不准确。更高效的是利用文档原生结构，用规则提取标题，仅在规则失败时用 LLM 做 fallback。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在项目中遇到过 PDF 解析标题不准的坑”切入，具体描述如何用 PyMuPDF 提取字体大小、用规则合并标题与正文，并展示 section_path 在检索阶段的 filter 效果（如召回率提升 15%）。
- **如果你只做过传统 NLP**：用“文本分类中的层级标签”类比，说明 section_path 类似于多标签分类的路径（如“体育/足球/英超”），迁移到 RAG 就是让 chunk 带层级元数据。
- **如果你是校招无项目**：聚焦“论文复现 demo”，比如用 LangChain 的 RecursiveCharacterTextSplitter 配合 MarkdownHeaderTextSplitter，展示如何自动提取 Markdown 标题并生成 section_path，附上 GitHub 链接。
- 论文：“Enhancing Retrieval-Augmented Generation with Hierarchical Document Structure”（2024, ACL Workshop）
- 工具：Unstructured.io 文档解析库（支持 PDF/Word/HTML 层级提取）
- 博客：LangChain 官方文档 - “How to split by markdown headers”
- 论文：“LayoutLMv3: Pre-training for Document AI with Unified Text and Image Masking”（2022, KDD）
- 工具：Elasticsearch `path_hierarchy` tokenizer 官方文档
