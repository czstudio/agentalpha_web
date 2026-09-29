---
slug: basics-tk044
no: "944"
title: "Explain why self-attention in the decoder is referred to as cross-attention. How does it differ from self-attention in the encoder"
question: "Explain why self-attention in the decoder is referred to as cross-attention. How does it differ from self-attention in the encoder"
excerpt: "这道题看似是背概念，实则考察你对 Transformer 架构中注意力机制数据流的底层理解。面试官想确认你是否清楚：“self-attention”和“cross-attention”的本质区别不在于位置，而在于 Q/K"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 11
words: 5191
updated: "2026-09-29"
---

## Explain why self-attention in the decoder is referred to as cross-attention. How does it differ from self-attention in the encoder

#### 1️⃣ 考察意图

这道题看似是背概念，实则考察你对 Transformer 架构中注意力机制**数据流**的底层理解。面试官想确认你是否清楚：**“self-attention”和“cross-attention”的本质区别不在于位置，而在于 Q/K/V 的来源**。刁钻点在于：很多人误以为 decoder 里只有 self-attention，或者把 masked self-attention 和 cross-attention 混为一谈。答好了能展示你对 Encoder-Decoder 架构中信息流动的精确掌握，以及能清晰区分“建模内部依赖”与“建模跨序列交互”两种能力，这是做多模态、RAG 或序列到序列任务的基础硬实力。

#### 2️⃣ 标准答

首先，一个关键澄清：**decoder 中的 cross-attention 并不是 self-attention**。术语“cross-attention”特指一种注意力机制，它的 Query（Q）来自一个序列，而 Key（K）和 Value（V）来自另一个序列。在原始 Transformer 中，decoder 包含两种注意力层：Masked Self-Attention 和 Cross-Attention。

**1. Cross-Attention 的数据流与角色**

- **数据流**：在 Cross-Attention 层，Q 来自 decoder 上一层的输出（即当前已生成的目标序列表示），而 K 和 V 来自 encoder 的最终输出（即源序列的编码表示）。
- **角色**：它的核心作用是**让 decoder 在生成每个 token 时，能够“关注”到输入序列中与之最相关的部分**。例如在翻译任务中，当生成英文单词“apple”时，cross-attention 的权重会集中在源语言中对应“苹果”的 token 上。这实现了序列到序列的**对齐**。
- **实现细节**：Cross-Attention 通常**不使用掩码**（mask），因为 encoder 的输出是完整的、可见的整个源序列。decoder 需要看到源序列的全部信息来指导当前 token 的生成。

**2. 与 Encoder Self-Attention 的本质区别**

- **Q/K/V 来源**：Encoder Self-Attention 的 Q、K、V 全部来自**同一个序列**（即输入序列本身）。而 Cross-Attention 的 Q 来自 decoder，K/V 来自 encoder，是两个不同序列的交互。
- **建模目标**：Encoder Self-Attention 建模**序列内部的依赖关系**，比如一个句子中“it”和“animal”之间的长距离依赖。Cross-Attention 建模**两个序列之间的映射关系**，即如何将源序列的信息“注入”到目标序列的生成过程中。
- **掩码机制**：Encoder Self-Attention 通常**无掩码**，因为输入序列是完整的，每个 token 都可以看到所有其他 token。而 decoder 中的 Masked Self-Attention 使用**因果掩码**（causal mask），防止当前 token 看到未来的 token。Cross-Attention 则无掩码。

**3. 工程取舍与落地坑**

- **为什么不用 Self-Attention 替代 Cross-Attention？** 如果 decoder 只用 self-attention，它只能基于已生成的目标序列内部信息进行预测，无法获取源序列的任何信息，这相当于一个语言模型，无法完成翻译、摘要等条件生成任务。Cross-Attention 是连接 encoder 和 decoder 的桥梁。
- **实际落地的坑：Cross-Attention 的计算瓶颈**。在长序列生成任务中（如文档摘要），encoder 输出序列可能很长（比如 10K tokens），Cross-Attention 的计算复杂度是 O(L_decoder * L_encoder)，这会导致显存爆炸和解码速度极慢。
- **解法**：实践中常采用**稀疏注意力**（如 Longformer 的 dilated attention）或**近似注意力**（如 Reformer 的 LSH attention）来降低复杂度。更常见的做法是**对 encoder 输出进行压缩**，例如使用 Perceiver 架构中的 cross-attention 将长序列压缩为固定长度的 latent array，或者使用**内存增强注意力**（如 Transformer-XL 的 segment-level recurrence）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，**术语澄清**——decoder 中的 cross-attention 不是 self-attention，它的 Q 来自 decoder，K/V 来自 encoder；第二，**本质区别**——encoder self-attention 建模序列内部依赖，cross-attention 建模跨序列交互；第三，**工程取舍**——cross-attention 的计算复杂度是 O(L_dec * L_enc)，长序列下需要稀疏注意力或压缩机制来优化。总结一句：cross-attention 是 encoder-decoder 架构中实现条件生成的关键桥梁。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果去掉 cross-attention，只用 decoder-only 架构（如 GPT）能完成翻译任务吗？为什么？

> 可以，但需要改变范式。Decoder-only 模型（如 GPT）通过**因果语言建模**来生成，它没有显式的 cross-attention 层。要完成翻译，通常需要将源语言句子作为 prompt 的一部分输入，例如“Translate English to French: 'Hello' ->”。模型通过 self-attention 在 prompt 内部建立源和目标之间的关联。但这种方式**缺乏显式的对齐机制**，对于长句子或低资源语言，效果通常不如 encoder-decoder 架构。Encoder-decoder 的 cross-attention 提供了更直接、更可控的源-目标信息交互路径。

**追问 2**：在 cross-attention 中，为什么通常不使用掩码？如果给 cross-attention 加上因果掩码会怎样？

> 因为 encoder 的输出是完整的、全局的源序列，decoder 在生成每个 token 时，理论上应该能看到源序列的全部信息来做出最优决策。如果加上因果掩码，意味着 decoder 在生成第 t 个 token 时，只能看到 encoder 输出的前 t 个 token 的信息，这破坏了源序列的完整性，会导致生成质量下降，尤其是对于需要全局理解的任务（如摘要）。但在某些**流式翻译**场景中，为了降低延迟，可能会使用**局部 cross-attention**，只关注 encoder 输出的一个滑动窗口，这是一种工程取舍。

**追问 3**：Cross-attention 和 Multi-Head Attention 是什么关系？Cross-attention 可以用单头吗？

> Cross-attention 是一种**注意力机制的类型**（定义了 Q/K/V 的来源），而 Multi-Head Attention 是一种**实现方式**（将 Q/K/V 投影到多个子空间并行计算注意力）。Cross-attention 完全可以采用 Multi-Head 的形式，即 Multi-Head Cross-Attention，这是 Transformer 中的标准做法。单头 cross-attention 理论上可行，但多头机制能捕捉不同子空间下的对齐模式（例如一个头关注语法对齐，另一个头关注语义对齐），通常效果更好。这是一个**容量与效率的 trade-off**：单头计算更快，但表达能力受限；多头效果更好，但计算和显存开销更大。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 错误答法：“Decoder 中的 self-attention 就是 cross-attention，因为 decoder 要关注 encoder 的输出。”→ ✅ 正确切入：必须明确区分 decoder 中的两种注意力：**Masked Self-Attention**（Q/K/V 都来自 decoder 自身，用于建模目标序列内部依赖）和 **Cross-Attention**（Q 来自 decoder，K/V 来自 encoder，用于建模源-目标交互）。两者是独立的层，不能混为一谈。
- ❌ 错误答法：“Cross-attention 和 self-attention 的计算公式不同。”→ ✅ 正确切入：两者的计算公式（Softmax(QK^T/√d)V）**完全相同**。区别仅在于 Q/K/V 的来源不同。面试官在考察你是否理解注意力机制的**数据流**而非数学公式。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成”对齐角度切入。将 retriever 返回的文档片段视为 encoder 输出，generator 的 cross-attention 层负责关注相关文档。可以提到你如何可视化 cross-attention 权重来调试检索质量，例如发现模型忽略了关键文档片段时，如何调整 chunking 策略或 reranker 阈值。
- **如果你只做过传统 NLP**：用“序列到序列”的经典任务（如机器翻译、文本摘要）作为类比。强调 cross-attention 是实现“条件生成”的关键，可以对比传统 Seq2Seq 模型（如 LSTM+Attention）中 attention 的计算方式，说明 Transformer 的 cross-attention 如何通过并行计算和长距离依赖建模来提升效果。
- **如果你是校招无项目**：聚焦论文复现。可以提到你手写过 Transformer 的 cross-attention 层（基于 PyTorch），并对比了有无 cross-attention 时模型在翻译任务上的 BLEU 分数差异。强调你理解了 cross-attention 中 Q/K/V 的维度匹配问题（例如 decoder hidden size 与 encoder hidden size 不一致时需要线性投影）。
- 《Attention Is All You Need》 (Vaswani et al., 2017) - 原始 Transformer 论文，定义 cross-attention 和 self-attention。
- 《BERT: Pre-training of Deep Bidirectional Transformers》 - 展示 encoder-only 架构中 self-attention 的应用。
- 《Language Models are Few-Shot Learners》 (GPT-3) - 展示 decoder-only 架构中无 cross-attention 的生成范式。
- 《Longformer: The Long-Document Transformer》 - 探讨长序列下 cross-attention 的稀疏化优化。
- 《Perceiver: General Perception with Iterative Attention》 - 展示如何用 cross-attention 将任意长度输入压缩为固定长度 latent。

---
