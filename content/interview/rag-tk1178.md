---
slug: rag-tk1178
no: "2078"
title: "| 35 | What are the criteria to choose a specific chunking method in RAG"
question: "| 35 | What are the criteria to choose a specific chunking method in RAG"
excerpt: "这道题是典型的系统设计决策题，面试官想看你能否从“背分块方法”升级到“根据场景选方法”。刁钻点在于：没有唯一正确答案，必须展示对文档类型、检索模型、下游任务、资源约束四维度的权衡能力。答好了能展示：① 对 RAG 整条链"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4450
updated: "2026-09-29"
---

## | 35 | What are the criteria to choose a specific chunking method in RAG

`P1` · `rag`

🏷 标签：`rag`, `chunking`, `system-design`, `decision`

#### 1️⃣ 考察意图

这道题是典型的**系统设计决策题**，面试官想看你能否从“背分块方法”升级到“根据场景选方法”。刁钻点在于：没有唯一正确答案，必须展示对文档类型、检索模型、下游任务、资源约束四维度的权衡能力。答好了能展示：① 对 RAG 整条链路（文档解析→检索→生成）的深度理解；② 工程取舍的实战经验（如块大小与检索精度的 trade-off）；③ 能落地而非纸上谈兵。

#### 2️⃣ 标准答

选择分块方法的核心是**匹配文档结构、查询特性、检索模型和下游任务**。以下从四个维度展开，每个维度给出具体方法、取舍和坑。

#### 维度一：文档类型决定分块策略

- **结构化文档（PDF 表格、HTML、Markdown）**：必须保留布局。用**基于语义边界的分块**，如 `langchain` 的 `RecursiveCharacterTextSplitter` 按 `\n\n`、`\n`、句号递归切分，或 `Unstructured` 库的 `partition_pdf` 提取表格和标题。**坑**：直接按固定 token 数切分会破坏表格行，导致检索到残缺数据。解法：先解析为结构化元素（如 `Document` 对象带 `metadata`），再按元素边界分块。
- **纯文本（新闻、论文）**：灵活度高。可用**固定大小分块**（如 512 tokens）配合**重叠策略**（overlap=10-20%），避免切断关键句。**取舍**：固定分块简单但可能丢失段落语义；语义分块（如 `spacy` 的句子分割器）更准但计算开销大。

#### 维度二：查询特性影响块粒度

- **短查询（<10 tokens，如“苹果公司CEO”）**：需要**小粒度块**（128-256 tokens），因为密集检索（如 `text-embedding-ada-002`）对短查询匹配小片段更敏感。**实战**：在 `HotpotQA` 上测试，块大小从 512 降到 256，Recall@5 提升 8%。
- **长查询（>50 tokens，如“总结2023年AI论文趋势”）**：需要**大粒度块**（512-1024 tokens），否则摘要任务会丢失上下文。**取舍**：大块增加检索延迟（embedding 维度固定，但向量库搜索时间随块数减少而降低），需平衡。

#### 维度三：检索模型对块大小的敏感性

- **稀疏检索（BM25）**：依赖关键词密度。块大小应**适中**（256-512 tokens），过小导致关键词稀疏（BM25 默认 `k1=1.5, b=0.75`，短文档 IDF 权重高但 TF 不足），过大则噪声多。**坑**：BM25 对停用词敏感，分块前需做 `nltk` 的停用词过滤。
- **密集检索（DPR、ColBERT）**：对块大小更敏感。DPR 用 `[CLS]` token 做匹配，块大小 256-512 效果最佳（论文《Dense Passage Retrieval》验证）。ColBERT 的后期交互（late interaction）允许更大块（1024 tokens），但需注意 `max_seq_length` 限制（通常 512）。**取舍**：密集检索对块内语义连贯性要求高，语义分块（如 `SentenceTransformer` 的 `max_seq_length` 切分）比固定分块好 5-10% Recall。

#### 维度四：下游任务决定输出格式

- **问答（QA）**：需要**精确片段**。用**小粒度块**（128-256 tokens）配合**重叠**（overlap=20%），确保答案不被切分。**实战**：在 `SQuAD` 上，块大小 256 比 512 的 F1 高 3%。
- **摘要/生成**：需要**完整段落**。用**大粒度块**（512-1024 tokens）或**语义分块**（按段落边界）。**坑**：摘要任务中，块内信息冗余会稀释关键内容，需配合 `max_tokens` 限制（如 GPT-4 的 8K 上下文窗口）。

#### 资源约束与工程取舍

- **内存**：块数越多，向量库索引越大（HNSW 的 `M` 参数影响内存）。**取舍**：大块减少索引大小但降低检索精度，小块反之。推荐用 `faiss` 的 `IVF` 索引（`nlist=100`）平衡。
- **延迟**：小块增加检索次数（需查更多块），但单次 embedding 更快。**实战**：在 100 万文档场景，块大小 512 比 256 的 P99 延迟低 30%（因为块数减半）。
- **重叠策略**：overlap=10-20% 是安全默认值，但需注意重叠部分在检索时可能重复，导致 `rerank` 阶段去重开销。**解法**：用 `mmr`（最大边际相关性）去重。

**总结**：没有万能分块方法。推荐构建一个**分块策略选择器**：输入文档类型、查询长度、任务类型，输出块大小、重叠率、分块方法（固定/语义/递归）。在 `MultiNews` 和 `HotpotQA` 上验证，可得到决策树：结构化文档用递归分块+256 tokens，短查询用 128 tokens+20% overlap，长查询用 512 tokens+10% overlap。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从四个维度回答：文档类型、查询特性、检索模型、下游任务。文档类型决定分块边界（结构化用递归分块，纯文本用固定分块）；查询特性影响块粒度（短查询用小块 128-256 tokens，长查询用大块 512-1024 tokens）；检索模型对块大小敏感（BM25 适中 256-512，DPR 256-512 最优）；下游任务决定输出格式（QA 需精确片段，摘要需完整段落）。总结一句：没有万能方法，需根据场景构建分块策略选择器，在 benchmark 上验证。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果文档是 PDF 表格，你怎么分块？具体用什么工具？

> 用 `Unstructured` 库的 `partition_pdf` 提取表格为 `Table` 对象，保留行列结构。然后按表格行分块（每行 128 tokens），配合 `metadata` 记录表头。**坑**：表格跨页时需合并，用 `pdfplumber` 检测页面边界。**取舍**：按行分块丢失列关联，但检索精度高；按整个表格分块（1024 tokens）适合摘要任务。

**追问 2**：你的分块策略在 100 万文档规模下，延迟和内存怎么优化？

> 用 `faiss` 的 `IVF` 索引（`nlist=100`）减少搜索时间，块大小统一为 256 tokens 以平衡精度和索引大小。内存优化：用 `product quantization`（PQ）压缩 embedding 到 32 字节（原 768 维 float32 是 3072 字节），精度损失 <2%。**取舍**：PQ 压缩增加检索延迟（需解码），但内存降低 96 倍。

**追问 3**：如果查询是模糊的（如“最近有什么新闻”），你怎么调整分块？

> 模糊查询需要**大粒度块**（1024 tokens）和**语义分块**（按段落边界），因为意图不明确，需提供完整上下文。配合 `HyDE`（假设文档嵌入）生成伪文档再检索，提升召回。**坑**：大块增加噪声，需用 `rerank`（如 `Cohere rerank`）过滤 Top-10 结果。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“固定 512 tokens 分块最好，因为 GPT-4 上下文窗口大” → ✅ 正确切入：固定分块会破坏语义，需根据文档类型和查询特性动态调整。例如，PDF 表格用递归分块，短查询用 128 tokens。
- ❌ 说“重叠越大越好，避免信息丢失” → ✅ 正确切入：重叠增加索引大小和检索冗余，推荐 10-20% 并配合 `mmr` 去重。过度重叠（>50%）会降低检索效率。
- ❌ 说“用 `langchain` 的 `CharacterTextSplitter` 就行” → ✅ 正确切入：`CharacterTextSplitter` 按字符切分，忽略语义边界。应改用 `RecursiveCharacterTextSplitter` 或 `spacy` 的句子分割器。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在项目中遇到过 PDF 表格分块导致检索失败”切入，展示你如何用 `Unstructured` 和重叠策略解决，并给出 Recall 提升数据（如 8%）。
- **如果你只做过传统 NLP**：用“文本分类中的句子分割类比 RAG 分块”迁移，强调语义边界的重要性，并提到你复现过 `langchain` 的递归分块。
- **如果你是校招无项目**：聚焦“我读过《Dense Passage Retrieval》论文，验证了块大小 256 对 DPR 最优”，并展示你写过一个分块策略选择器的 demo（用 Python 和 `faiss`）。
- 《Dense Passage Retrieval for Open-Domain Question Answering》（Karpukhin et al., 2020）
- 《ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT》（Khattab & Zaharia, 2020）
- LangChain 文档：`RecursiveCharacterTextSplitter` 和 `Unstructured` 库
- Faiss 官方教程：`IVF` 和 `Product Quantization` 优化
- 《HyDE: Precise Zero-Shot Dense Retrieval without Relevance Labels》（Gao et al., 2022）

---
