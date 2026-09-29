---
slug: rag-tk265
no: "1165"
title: "What are the different types of chunking methods?**"
question: "What are the different types of chunking methods?**"
excerpt: "面试官想考察你对 RAG 系统底层数据预处理的理解深度，而非简单背诵方法名。这是典型的“工程取舍 + 系统设计”题，刁钻点在于：chunking 看似简单，但直接决定检索召回率和下游生成质量，且没有银弹。答好了能展示你对"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4279
updated: "2026-09-29"
---

## What are the different types of chunking methods?**

`P1` · `rag`

🏷 标签：`rag`, `chunking`, `methods`

#### 1️⃣ 考察意图

面试官想考察你对 RAG 系统底层数据预处理的理解深度，而非简单背诵方法名。这是典型的“工程取舍 + 系统设计”题，刁钻点在于：chunking 看似简单，但直接决定检索召回率和下游生成质量，且没有银弹。答好了能展示你对信息检索（IR）和 NLP 的交叉理解，以及在实际系统中做 trade-off 的硬实力。面试官会通过你能否说出每种方法的适用边界和落地坑来区分“会用工具”和“懂原理”。

#### 2️⃣ 标准答

Chunking 方法按粒度从粗到细、从规则到语义，可以分为五大类。核心原则是：**chunk 是检索的基本单元，必须兼顾语义完整性与检索效率**。

- **固定大小分割（Fixed-size Chunking）****做法**：按字符数或 token 数（如 512 tokens）硬切，通常带 overlap（如 10-20%）。
- **优点**：实现简单，计算开销低，适合快速原型。
- **缺点**：严重破坏语义边界，比如一句话被切到两个 chunk 里，导致检索时上下文丢失。
- **工程取舍**：overlap 越大，语义连续性越好，但存储和检索成本线性增长。实践中，overlap 设为 chunk size 的 10-15% 是常见平衡点。
- **落地坑**：对代码或表格这类结构化内容，固定切分会直接切碎逻辑单元，导致检索结果完全不可用。**解法**：先用正则检测代码块/表格，再对非结构化文本用固定切分。
递归分割（Recursive Chunking）
- **做法**：按优先级列表（段落 `\n\n` > 句子 `\n` > 短语 `,`）递归切分，直到每个 chunk 不超过最大 token 数。LangChain 的 `RecursiveCharacterTextSplitter` 是典型实现。
- **优点**：保留自然语言结构，比固定切分语义更完整。
- **缺点**：依赖分隔符质量，对无标点文本（如日志、代码）效果差。
- **工程取舍**：分隔符优先级顺序决定了 chunk 的“语义粒度”。若优先按句子切，chunk 可能过短；若优先按段落切，chunk 可能过长。**解法**：根据文档类型动态调整优先级，比如技术文档优先按代码块切，新闻优先按段落切。
语义分割（Semantic Chunking）
- **做法**：利用 embedding 模型（如 Sentence-BERT, Instructor）计算句子间相似度，当相似度低于阈值时切分。更高级的用 LLM 直接判断边界（如 LlamaIndex 的 `SemanticSplitterNodeParser`）。
- **优点**：理论上最接近“语义完整单元”，适合长文档。
- **缺点**：计算成本高（O(n²) 的相似度矩阵），且阈值敏感——阈值太高 chunk 太碎，太低 chunk 太长。
- **落地坑**：embedding 模型对短文本（<10 tokens）的相似度计算不稳定，容易产生噪声边界。**解法**：先做句子合并（如 2-3 句一组），再计算组间相似度，降低噪声。
- **trade-off**：语义分割 vs 递归分割：前者质量更高但延迟增加 3-5 倍，适合离线索引；后者适合在线实时处理。
文档结构感知分割（Document Structure-aware Chunking）
- **做法**：利用文档的显式结构（Markdown 标题、HTML 标签、PDF 章节、表格）作为切分锚点。例如，按 `#` 标题切分，每个标题下的内容作为一个 chunk。
- **优点**：保留文档的层级关系，检索时可以携带上下文（如“在第三章第二节中”）。
- **缺点**：依赖文档格式规范，对非结构化或格式混乱的文档（如扫描 PDF）无效。
- **工程取舍**：结构感知 vs 语义分割：前者提供可解释的层级，后者更灵活。实践中常结合：先用结构感知切出大块，再对块内用语义分割做细粒度调整。
混合方法（Hybrid Chunking）
- **做法**：组合上述方法。例如：先按文档结构切分，再对每个结构块用递归分割控制大小；或者对同一文档同时用固定和语义分割，结果做合并或投票。
- **优点**：取长补短，适应多种文档类型。
- **缺点**：系统复杂度高，参数调优成本大。
- **落地坑**：混合方法容易引入冗余 chunk（同一内容被多次切分），导致检索结果重复。**解法**：用 Jaccard 相似度去重，或设置 chunk 最小间隔（如 50 tokens 内不重复切分）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从规则方法、语义方法和混合方法三个层面回答。规则方法包括固定大小和递归分割，优点是简单高效，但会破坏语义边界；语义方法利用 embedding 或 LLM 检测边界，质量更高但计算成本大；混合方法结合两者，适合复杂文档。总结一句：没有最好的 chunking，只有最适合文档类型和业务场景的 chunking，核心 trade-off 是语义完整性与检索效率的平衡。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你如何评估不同 chunking 方法的好坏？用什么指标？

> 评估分两个维度：检索质量和下游生成质量。检索质量用 Recall@k 和 MRR（Mean Reciprocal Rank），看 chunk 是否包含正确答案；生成质量用 Faithfulness（忠实度）和 Answer Relevancy，看 chunk 是否提供足够上下文。实践中，先离线建一个标注数据集（文档 + 问题 + 答案），对每种 chunking 方法跑检索，计算 Recall@5 和 MRR。如果 Recall 低，说明 chunk 切得太碎或边界错误；如果 MRR 低，说明 chunk 顺序或结构丢失。另外，chunk 的“语义完整性”可以用 BERTScore 或 NLI 模型（如 DeBERTa）自动评估——看 chunk 内句子间的逻辑连贯性。

**追问 2**：chunk size 怎么选？512 tokens 和 1024 tokens 有什么区别？

> 取决于检索模型和 LLM 的上下文窗口。512 tokens 适合密集检索（如 DPR），因为 embedding 模型对短文本更稳定；1024 tokens 适合稀疏检索（如 BM25），因为能捕获更多关键词。trade-off 是：chunk 越大，检索召回率越高（因为包含更多上下文），但噪声也越多，导致 LLM 生成时注意力分散。实践中，对于问答类任务，chunk size 设为 256-512 tokens 效果最好；对于摘要类任务，可以放大到 1024-2048 tokens。一个落地经验：先用 512 tokens 跑基线，然后按 128 tokens 步长调参，观察 Recall@5 的边际收益，收益小于 1% 时停止。

**追问 3**：如果文档是 PDF 或扫描件，chunking 怎么做？

> PDF 的挑战在于格式丢失（如表格、多栏布局）。解法分三步：先用 OCR（如 Tesseract）或 PDF 解析库（如 PyMuPDF）提取文本和坐标信息；然后根据坐标重建段落结构（如 y 轴相近的文本合并为同一段落）；最后用结构感知分割，按标题或章节切分。对于表格，用 Camelot 或 Tabula 提取为结构化数据，单独作为 chunk。一个坑：PDF 中的页眉页脚会被误认为正文，导致 chunk 包含无关信息。解法：检测重复文本模式（如“第 1 页 / 共 10 页”），在预处理时过滤掉。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“chunking 就是按固定 token 数切分，简单好用” → ✅ 正确切入：固定切分只适合快速原型，实际生产必须考虑语义完整性和文档结构，否则检索质量会断崖式下降。
- ❌ 说“语义分割最好，因为最智能” → ✅ 正确切入：语义分割计算成本高且阈值敏感，适合离线索引；在线实时处理时，递归分割或结构感知更实用，不能盲目追求“智能”。
- ❌ 说“chunk size 越大越好，因为上下文多” → ✅ 正确切入：chunk 越大，噪声越多，LLM 的注意力会被稀释，导致生成质量下降。需要根据任务类型（问答 vs 摘要）和检索模型（密集 vs 稀疏）做实验确定最优值。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在项目中对比了固定分割和语义分割，发现语义分割在 Recall@5 上提升 12%，但延迟增加了 4 倍，最终采用混合方法：先按标题切，再对长段落用语义分割”切入，展示工程取舍能力。
- **如果你只做过传统 NLP**：用“文本分割”类比，比如“传统 NLP 中的句子分割和段落分割，在 RAG 中升级为 chunking，核心挑战从语法边界变为语义边界”，展示迁移学习思维。
- **如果你是校招无项目**：聚焦“我在课程项目中复现了 LangChain 的 RecursiveCharacterTextSplitter，并对比了不同分隔符优先级对检索效果的影响”，展示动手能力和对开源工具的理解。
- LangChain 官方文档：RecursiveCharacterTextSplitter 源码与参数详解
- LlamaIndex 博客：Semantic Chunking 与 SentenceWindowNodeParser 实践
- 论文：Chunking Strategies for Retrieval-Augmented Generation (2024)
- 论文：Dense Passage Retrieval (DPR) 中的段落分割策略
- 工具：Unstructured.io 的文档解析与 chunking 库

---
