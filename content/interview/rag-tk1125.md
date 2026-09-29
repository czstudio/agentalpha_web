---
slug: rag-tk1125
no: "2025"
title: "Rag常见且chunk的方式有哪些？你用的是什么embedding"
question: "Rag常见且chunk的方式有哪些？你用的是什么embedding"
excerpt: "面试官想考察你对 RAG 系统检索环节的工程落地经验，而非单纯背概念。刁钻点在于：chunk 和 embedding 是 RAG 的“第一公里”，直接影响召回质量，但很多人只知固定长度切分，不知 trade-off。答好"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4244
updated: "2026-09-29"
---

## Rag常见且chunk的方式有哪些？你用的是什么embedding

#### 1️⃣ 考察意图

面试官想考察你对 RAG 系统检索环节的**工程落地经验**，而非单纯背概念。刁钻点在于：chunk 和 embedding 是 RAG 的“第一公里”，直接影响召回质量，但很多人只知固定长度切分，不知 trade-off。答好了能展示你对**检索精度、推理延迟、成本**三者平衡的实战理解，以及是否做过**混合检索**或**多粒度分块**等优化。这是 P1 进阶题，答出“为什么这么选”比“有哪些”更重要。

#### 2️⃣ 标准答

**Chunk 方式：从粗到细的工程取舍**

- **固定长度滑动窗口**：最常见，如 512 tokens 重叠 128。优点是实现简单、延迟可控；缺点是**语义断裂**——一句话可能被切到两个 chunk 里，导致检索时上下文丢失。工程坑：中文 token 数差异大（一个汉字≈1.5 token），需按语言调窗口大小。解法：用 `tiktoken` 预计算 token 数，避免字符数误判。
- **语义分割（Sentence Splitter）**：基于句子边界（句号、换行）或段落切分。工具如 `spaCy` 或 `nltk` 的句子分割器。优点是保留语义完整性；缺点是**长句灾难**——一个 2000 字的句子会撑爆 embedding 模型上下文（如 text-embedding-ada-002 最大 8192 tokens）。解法：设最大 chunk 长度，超长时递归切分（RecursiveCharacterTextSplitter）。
- **递归分割（Recursive Splitter）**：LangChain 默认策略——先按段落切，再按句子切，最后按字符切。优点是**自适应**，适合混合格式文档（Markdown + 代码 + 表格）。坑：递归深度过大时延迟飙升（实测 10 层递归比固定切分慢 3 倍）。解法：限制递归深度为 3，并用 `separators` 参数指定优先级（如 `["\n\n", "\n", ".", " "]`）。
- **基于文档结构（Section-based）**：利用 Markdown 标题、PDF 章节、HTML 标签切分。优点是**结构化检索**——用户问“第二章结论”时能精准命中。工具如 `unstructured` 库。坑：文档结构不统一时（如扫描 PDF 无标题），需 fallback 到语义分割。

**Embedding 模型：选型三要素**

- **text-embedding-ada-002**：OpenAI 闭源，1536 维，成本低（\$0.13/1M tokens），适合英文通用场景。**Trade-off**：维度低导致细粒度语义丢失（如“苹果”和“水果”的区分度差），且无法本地部署。
- **bge-large-zh**：BAAI 开源，1024 维，中文 SOTA。**实战坑**：默认用 `query` 和 `passage` 前缀，不加前缀时 Recall@5 下降 15%（【通用知识】）。解法：检索时加 `"为这个句子生成表示以用于检索相关文章："` 前缀。
- **e5-mistral-7b-instruct**：微软开源，4096 维，基于 Mistral 7B。**Trade-off**：维度高、精度好（MTEB 英文第一），但推理延迟高（GPU 上 100ms/query vs ada 的 10ms）。适合离线索引，在线检索需降维或量化。
- **混合检索（Sparse + Dense）**：如 BM25（稀疏）+ bge（稠密）。**为什么做**：稠密模型对罕见词（如“三体-黑暗森林”）召回差，BM25 靠词频能补上。**坑**：分数归一化——BM25 分数范围 0-10，embedding 余弦相似度 0-1，直接加权会偏斜。解法：用 `Reciprocal Rank Fusion`（RRF）合并排序，k=60 是经验值。

**实际落地的坑 + 解法**

- **坑 1**：chunk 大小与 embedding 模型上下文不匹配。例如用 512 tokens chunk 但 embedding 模型支持 8192，浪费模型能力。解法：**动态 chunk**——根据文档长度自适应，短文档用大 chunk（如 1024 tokens），长文档用小 chunk（如 256 tokens）。
- **坑 2**：embedding 模型更新后需重索引。例如从 ada-002 切到 bge，旧向量与新向量不兼容。解法：**版本化索引**——在向量库（如 Milvus）中加 `model_version` 字段，查询时按版本过滤。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从 chunk 策略、embedding 选型、混合检索三个层面回答。chunk 方面，我常用递归分割加语义 fallback，因为固定长度会切碎句子；embedding 方面，中文场景首选 bge-large-zh，英文用 ada-002，但都会配合 BM25 做混合检索以补足罕见词召回。总结一句：没有万能配置，必须根据文档类型和延迟要求做 A/B 测试，比如用 Recall@5 和 P99 延迟作为决策指标。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你如何评估 chunk 大小对检索质量的影响？

> 用 **Recall@k** 和 **MRR** 做离线评估。具体做法：构造 1000 条 QA 对，每个问题对应一个 ground truth chunk。然后遍历 chunk 大小（256/512/1024 tokens），计算每个配置下的 Recall@5。经验值：512 tokens 在通用文档上 Recall@5 最高（约 0.85），但代码文档用 256 tokens 更好（因为函数体短）。**坑**：chunk 重叠率（overlap）也影响 Recall——20% 重叠比 0% 重叠 Recall 高 5%，但索引存储量增加 25%，需 trade-off。

**追问 2**：你的 embedding 模型如何做量化加速？

> 用 **int8 量化** 或 **二进制量化（BQ）**。例如 bge-large-zh 原始 1024 维 float32 向量（4KB/个），int8 量化后 1KB/个，检索速度提升 2-3 倍，Recall@5 下降不到 1%。**工程坑**：量化后余弦相似度计算需用 int8 点积，不能用 float32 库（如 faiss 的 `IndexFlatIP` 不支持 int8），需改用 `IndexScalarQuantizer`。如果延迟要求更高（如 <10ms），可降维到 256 维（用 PCA），但 Recall 下降 3-5%。

**追问 3**：如果文档是混合语言（中英混杂），你怎么处理？

> 用 **多语言 embedding 模型**，如 `intfloat/multilingual-e5-large`（支持 100 种语言）。**坑**：中文 token 数比英文多（一个中文词≈2 tokens vs 英文 1 token），导致 chunk 大小需按语言动态调整。解法：用 `langdetect` 检测段落语言，中文 chunk 设 256 tokens，英文设 512 tokens。如果混合语言在同一句（如“请参考 Section 3.2”），则 fallback 到字符级切分。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “chunk 大小固定为 512 tokens 就行，embedding 用 OpenAI 的 ada-002 最省事。” → ✅ “固定大小会切碎语义，需根据文档类型调整；ada-002 适合英文，中文场景 bge 更好，且需配合 BM25 做混合检索。”
- ❌ “embedding 模型越新越好，比如 e5-mistral-7b 精度最高。” → ✅ “精度高但延迟高，在线检索需量化或降维；离线索引可以用，但线上要权衡成本。”
- ❌ “chunk 重叠率越高越好，能避免上下文丢失。” → ✅ “重叠率 20% 是经验值，过高（如 50%）会导致索引膨胀 2 倍，且检索时重复结果多，需用去重逻辑。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在 XX 项目中对比了固定长度和语义分割的 Recall@5，发现语义分割在技术文档上高 12%，但延迟高 30%，最终用递归分割加动态 chunk 平衡”切入。
- **如果你只做过传统 NLP**：用“传统文本分类中句子分割是预处理，RAG 中 chunk 是检索单元，我迁移了 spaCy 句子分割器，但加了最大长度限制避免 embedding 溢出”类比。
- **如果你是校招无项目**：聚焦“我复现了 LangChain 的 RecursiveCharacterTextSplitter，并在 WikiQA 数据集上对比了不同 chunk 大小的 MRR，发现 512 tokens 最优，并写了博客记录实验过程”。
- 《Dense Passage Retrieval for Open-Domain Question Answering》（Karpukhin et al., 2020）——DPR 论文，理解稠密检索基础
- LangChain 文档：RecursiveCharacterTextSplitter 源码与参数调优
- BAAI/bge-large-zh 模型卡（Hugging Face）——中文 embedding 选型参考
- 《Hybrid Search: Combining Sparse and Dense Retrieval》（Nils Reimers, 2022）——混合检索原理与 RRF 实现
- Milvus 官方博客：向量索引量化与降维实战（int8 量化 vs PQ）
