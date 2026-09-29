---
slug: basics-tk020
no: "920"
title: "Self-Attention vs Cross-Attention 的区别"
question: "Self-Attention vs Cross-Attention 的区别"
excerpt: "面试官想考察你对 Transformer 核心机制的理解深度，而不仅仅是背定义。这题看似基础，但刁钻点在于：能否从计算图结构、信息流方向和实际工程场景三个维度清晰区分，并举例说明各自在模型中的位置和作用。答好了能展示你对"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4303
updated: "2026-09-29"
---

## Self-Attention vs Cross-Attention 的区别

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 核心机制的理解深度，而不仅仅是背定义。这题看似基础，但刁钻点在于：能否从**计算图结构**、**信息流方向**和**实际工程场景**三个维度清晰区分，并举例说明各自在模型中的位置和作用。答好了能展示你对注意力机制本质的掌握，以及从论文到落地的迁移能力（比如多模态、RAG 中的 Cross-Attention 变体）。考察类型：概念辨析 + 工程取舍。

#### 2️⃣ 标准答

Self-Attention 和 Cross-Attention 的核心区别在于 **Q、K、V 的来源**，这决定了它们的信息交互范围。

**1. 定义与计算差异**

- **Self-Attention**：Q、K、V 全部来自同一个序列（比如一段文本）。公式：`Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V`，其中 Q、K、V 是同一输入经过不同线性投影的结果。典型应用：Transformer 编码器层、解码器的 Masked Self-Attention。
- **Cross-Attention**：Q 来自一个序列（如解码器当前层），K、V 来自另一个序列（如编码器输出）。公式相同，但 Q 和 K 的维度可能不同（比如图像特征维度 2048，文本维度 512），需要投影对齐。典型应用：Transformer 解码器的第二层、多模态融合（如 CLIP 的文本-图像交互）。

**2. 工程取舍：为什么解码器要先用 Self-Attention 再用 Cross-Attention？**

- **Self-Attention 先做**：让解码器内部先完成上下文建模（比如当前 token 与之前生成 token 的关系），避免直接引入外部噪声。如果先做 Cross-Attention，解码器会过早依赖编码器信息，导致自身序列建模能力退化。
- **Cross-Attention 后做**：在内部上下文清晰后，再注入编码器信息（如源语言句子），实现跨序列对齐。这种顺序是 Transformer 论文的经典设计，也是翻译任务中 BLEU 提升 2-3 个点的关键。

**3. 实际落地的坑 + 解法**

- **坑 1：Cross-Attention 的 K、V 缓存爆炸**。在生成式任务（如机器翻译）中，编码器输出作为 K、V 会被解码器每步重复使用，如果序列长度 1024，batch size 64，K、V 缓存可达 1024642*维度 ≈ 几百 MB。解法：使用 **KV-Cache** 技术，只缓存一次，每步复用，并配合 **FlashAttention** 减少显存占用。
- **坑 2：Self-Attention 的 O(n^2) 复杂度**。长序列（如 8K tokens）下，Self-Attention 计算量爆炸。解法：使用 **Sparse Attention**（如 Longformer 的滑动窗口）或 **Linear Attention**（如 Performer 的核方法），但会损失全局依赖。工程上常用 **HNSW** 索引做近似检索替代全量 Self-Attention（比如 RAG 场景）。
- **坑 3：维度不匹配**。Cross-Attention 中，如果 Q 来自文本（d_model=512），K 来自图像（d_model=2048），直接计算会维度错误。解法：在投影层加一个线性层将 K、V 投影到与 Q 相同的维度，或者用 **Adapter** 做降维。

**4. 实例：Transformer 解码器结构**

- 第一层：**Masked Self-Attention**，Q、K、V 都来自解码器输入，mask 掉未来 token，保证自回归。
- 第二层：**Cross-Attention**，Q 来自解码器第一层输出，K、V 来自编码器输出，实现源语言到目标语言的信息传递。
- 第三层：**FFN**，做非线性变换。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、计算差异、工程取舍三个层面回答。定义上，Self-Attention 的 Q、K、V 来自同一序列，Cross-Attention 的 Q 来自一个序列，K、V 来自另一个序列。计算上，Cross-Attention 需要投影对齐维度，且 K、V 可缓存复用。工程上，解码器先 Self-Attention 再 Cross-Attention 是为了避免外部噪声干扰内部建模。总结一句：Self-Attention 捕捉内部依赖，Cross-Attention 实现跨序列交互。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：Cross-Attention 在 RAG 中如何实现？和标准 Transformer 的 Cross-Attention 有何不同？

> RAG 中，Cross-Attention 通常用于检索结果与生成模型的融合。标准 Transformer 的 Cross-Attention 是编码器-解码器结构，K、V 来自编码器。RAG 中，检索到的文档片段作为 K、V，生成模型的 Q 来自当前 token。不同点：1）K、V 不是固定编码器输出，而是动态检索的文档，需要实时编码；2）常用 **FiD（Fusion-in-Decoder）** 方法，将多个文档拼接后作为 K、V，但计算量大，工程上会用 **BM25** 先粗筛，再用 **ColBERT** 做细粒度匹配。坑：文档长度不一，需要 padding 和 mask，否则影响注意力分布。

**追问 2**：Self-Attention 的 O(n^2) 复杂度在长序列下怎么优化？给出具体方案。

> 三种主流方案：1）**Sparse Attention**：如 Longformer 的滑动窗口 + 全局 token，复杂度降到 O(n * w)，w 是窗口大小（如 512），但丢失长距离依赖。2）**Linear Attention**：如 Performer 用核方法近似 softmax，复杂度 O(n)，但精度下降 1-2%。3）**FlashAttention**：通过分块计算和 IO 优化，不降低精度，但需要 GPU 支持。工程上，如果序列长度 > 4K，推荐 FlashAttention；如果 > 32K，用 Sparse Attention + 局部窗口。

**追问 3**：多模态模型（如 CLIP）中 Cross-Attention 的 Q、K、V 来源是什么？如何对齐？

> CLIP 不是用 Cross-Attention，而是用对比学习。但类似模型如 **ALBEF** 或 **VLMo** 中，Cross-Attention 的 Q 来自文本 token，K、V 来自图像 patch 特征。对齐方式：1）图像特征通过 **ViT** 编码成 patch embedding（如 16x16 网格），维度 768；文本特征通过 BERT 编码，维度 768。2）如果维度不同，加一个线性投影层对齐。3）训练时用 **ITC（Image-Text Contrastive）** 损失做全局对齐，Cross-Attention 做局部交互。坑：图像 patch 数量多（如 196 个），Cross-Attention 计算量大，常用 **Pooling** 或 **Sparse Attention** 降维。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Self-Attention 和 Cross-Attention 公式不同” → ✅ 公式完全一样，区别只在 Q、K、V 来源。
- ❌ 说“Cross-Attention 只在编码器-解码器结构中出现” → ✅ 多模态、RAG、甚至某些自回归模型（如 GPT 的 Cross-Attention 变体）也用。
- ❌ 说“Self-Attention 比 Cross-Attention 更重要” → ✅ 两者同等重要，只是应用场景不同，没有优劣之分。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索文档作为 K、V 的 Cross-Attention 实现”切入，强调你如何用 FiD 或 ColBERT 优化检索-生成融合，并解决文档长度不一致的 padding 问题。
- **如果你只做过传统 NLP**：用“机器翻译中编码器-解码器 Cross-Attention”类比，说明你理解 Transformer 解码器两层注意力机制的设计意图，并提到 KV-Cache 优化。
- **如果你是校招无项目**：聚焦“Self-Attention 的 O(n^2) 复杂度优化”，展示你对 FlashAttention 或 Sparse Attention 论文的理解，并给出一个 demo（如用 PyTorch 实现 Cross-Attention 并对比维度对齐）。
- “Attention Is All You Need” (Vaswani et al., 2017) - Transformer 原始论文
- “Longformer: The Long-Document Transformer” (Beltagy et al., 2020) - Sparse Attention 实现
- “FlashAttention: Fast and Memory-Efficient Exact Attention” (Dao et al., 2022) - IO 优化
- “FiD: Fusion-in-Decoder for Open-Domain Question Answering” (Izacard et al., 2020) - RAG 中的 Cross-Attention
- “ALBEF: Align Before Fuse” (Li et al., 2021) - 多模态 Cross-Attention 对齐

---
