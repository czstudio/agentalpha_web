---
slug: enterprise-tk548
no: "1448"
title: "八股:Prefix LM、Causal LM、Encoder-Decoder 三类架构的适用场景与优缺点"
question: "八股:Prefix LM、Causal LM、Encoder-Decoder 三类架构的适用场景与优缺点"
excerpt: "面试官想考察你对 LLM 底层架构的工程取舍理解，而非死记硬背定义。刁钻点在于：三类架构（Causal LM / Prefix LM / Encoder-Decoder）在训练效率、推理延迟、上下文利用上存在根本性 tr"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4863
updated: "2026-09-29"
---

## 八股:Prefix LM、Causal LM、Encoder-Decoder 三类架构的适用场景与优缺点

#### 1️⃣ 考察意图

面试官想考察你对 LLM 底层架构的**工程取舍**理解，而非死记硬背定义。刁钻点在于：三类架构（Causal LM / Prefix LM / Encoder-Decoder）在**训练效率、推理延迟、上下文利用**上存在根本性 trade-off，而很多人只会背“GPT 是自回归、T5 是编码器-解码器”。答好了能展示：你不仅知道它们长什么样，还能根据任务（如对话、翻译、长文本补全）快速判断选型，并预判部署时的显存/吞吐瓶颈。这是 P1 级面试中区分“调包侠”和“架构师”的关键题。

#### 2️⃣ 标准答

**核心原则**：三类架构本质是“注意力掩码 + 参数共享”的不同组合，决定了它们对**双向上下文**的利用能力和**生成效率**。

**1. Causal LM（如 GPT 系列）**

- **原理**：严格从左到右的因果掩码，每个 token 只能看到自己和左侧 token。
- **适用场景**：自回归生成任务——对话（ChatGPT）、故事续写、代码生成（Codex）。**不需要双向上下文**，因为生成天然是单向的。
- **优点**：推理速度快（KV cache 可复用，O(1) 单步生成），训练简单（next-token prediction），参数量集中在 decoder，无编码器开销。
- **缺点**：无法利用双向上下文（比如文本填空、NER 需要看前后文），长文本依赖时容易“遗忘”早期信息（受限于 RoPE 或 ALiBi 的衰减）。
- **工程取舍**：为了弥补双向性，实践中常加 **prefix-tuning** 或 **prompt engineering**，但本质是“用 prompt 长度换上下文”，导致推理时 KV cache 膨胀。例如 GPT-4 的 128K 上下文，实际推理时显存占用随序列长度平方增长。

**2. Prefix LM（如 UniLM、GLM、ChatGLM 部分变体）**

- **原理**：输入前缀（prefix）部分用双向注意力（类似 BERT），生成部分用因果掩码。本质是“部分双向 + 部分单向”。
- **适用场景**：文本填充（如完形填空、中间补全）、NLU+NLG 混合任务（如信息抽取后生成摘要）。**需要部分双向上下文**，但生成仍保持自回归。
- **优点**：灵活——同一模型可同时做理解（双向）和生成（单向），无需切换架构；参数利用率高（单模型覆盖多任务）。
- **缺点**：训练效率低——每个 batch 内 prefix 长度可变，导致注意力掩码计算不规整，难以利用 FlashAttention 的块优化；推理时 prefix 部分无法用 KV cache（因为双向），必须重新计算，**延迟比 Causal LM 高 20-40%**【通用知识】。
- **实际落地的坑**：在长文本填充任务中，如果 prefix 长度超过 4K，双向注意力的显存开销会爆炸。解法：对 prefix 做**分块双向注意力**（如 GLM-130B 的做法），或改用 Causal LM + 特殊 token 模拟填充。

**3. Encoder-Decoder（如 T5、BART、Flan-T5）**

- **原理**：编码器用全双向注意力（类似 BERT），解码器用因果掩码，两者通过 cross-attention 连接。
- **适用场景**：序列到序列任务——翻译、摘要、表格到文本。**输入和输出语义差异大**，需要编码器充分理解输入。
- **优点**：双向编码带来最佳上下文理解（在 GLUE 等 NLU 任务上通常比 Causal LM 高 2-5 个点）；cross-attention 让解码器能“聚焦”输入关键部分，适合长输入短输出（如摘要）。
- **缺点**：参数量大（编码器+解码器，通常比同规模 Causal LM 多 30-50% 参数），推理慢（两步走：编码器 O(n²) + 解码器 O(m²)），且 cross-attention 的 KV cache 无法跨 batch 复用。
- **工程取舍**：为了加速推理，T5 系列常用 **parameter sharing**（编码器和解码器共享部分层），但会牺牲 1-3% 的 BLEU 分数。另一个坑：在长文本摘要（输入 > 8K）时，编码器的 O(n²) 注意力成为瓶颈，解法是改用 **LongT5** 的局部-全局注意力或 **BigBird** 的稀疏注意力。

**总结选型**：

- 纯生成（对话、代码）→ **Causal LM**（效率优先）
- 填充/混合任务（文本补全、NLU+NLG）→ **Prefix LM**（灵活优先）
- 强理解+生成（翻译、摘要）→ **Encoder-Decoder**（质量优先）

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从**注意力机制、训练效率、推理延迟**三个层面回答。Causal LM 用因果掩码，适合纯生成，推理快但缺双向上下文；Prefix LM 用部分双向掩码，适合填充任务，但训练和推理效率低；Encoder-Decoder 用全双向编码器，适合序列到序列任务，质量最高但参数量和延迟最大。总结一句：选型取决于任务是否需要双向上下文、对延迟的容忍度，以及是否愿意为质量牺牲效率。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说 Causal LM 推理快，那为什么 GPT-4 的 128K 上下文推理还是慢？

> 核心原因是 **KV cache 随序列长度线性增长**，而注意力计算是 O(n²)。Causal LM 的单步生成是 O(1)，但长上下文下 KV cache 显存占用（2 × n × d × layers × precision）会爆炸。例如 128K 上下文、d=8192、32 层、FP16，KV cache 约 128K × 8K × 32 × 2 bytes ≈ 64GB，远超单卡显存。解法：用 **Multi-Query Attention**（共享 KV head）减少 cache 大小，或 **FlashAttention** 的 IO 优化避免显存瓶颈。但本质是“用计算换显存”，延迟仍受限于访存带宽。

**追问 2**：Prefix LM 和 Encoder-Decoder 在长文本任务上谁更优？

> 没有绝对优劣，取决于任务。如果输入和输出长度接近（如长文档对话），Prefix LM 更优——它不需要 cross-attention 的额外开销，且参数更少。如果输入远长于输出（如 10K 文档摘要到 200 字），Encoder-Decoder 更优——编码器能压缩输入信息，cross-attention 让解码器聚焦关键部分。实际中，长文本场景下两者都被 **Causal LM + 长上下文**（如 YaRN、NTK-aware RoPE）逐渐替代，因为 Causal LM 的推理优化更成熟（如 vLLM 的 PagedAttention）。

**追问 3**：你提到了 FlashAttention，它在三类架构上的加速效果一样吗？

> 不一样。FlashAttention 主要优化 **因果掩码下的块稀疏计算**，对 Causal LM 加速最明显（约 2-4 倍）。对 Prefix LM，由于 prefix 部分是双向注意力，无法直接利用因果掩码的稀疏性，加速效果打折扣（约 1.5-2 倍）。对 Encoder-Decoder，编码器的全双向注意力可以用 FlashAttention 加速，但解码器的 cross-attention 是 O(n×m) 的密集计算，FlashAttention 无法优化。所以实践中，Encoder-Decoder 的推理瓶颈常在 cross-attention，解法是 **cross-attention 的 KV cache 分页**（如 vLLM 的优化）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Causal LM 不能做 NLU 任务” → ✅ 正确说法：Causal LM 可以做 NLU（如 GPT-3 在 SuperGLUE 上表现不错），但需要大量 prompt engineering 或 fine-tuning，且效果通常不如双向模型。本质是“能做但效率低”，不是“不能做”。
- ❌ 说“Encoder-Decoder 一定比 Causal LM 好” → ✅ 正确说法：在翻译/摘要等强对齐任务上 Encoder-Decoder 更好，但在对话/代码生成上 Causal LM 更快且效果不差。选型要基于任务特性，而非“架构越复杂越好”。
- ❌ 说“Prefix LM 是 Encoder-Decoder 的简化版” → ✅ 正确说法：Prefix LM 是单模型架构，没有独立的编码器和解码器，而是通过注意力掩码区分。两者本质不同：Prefix LM 是“部分双向”，Encoder-Decoder 是“全双向 + cross-attention”。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索后生成”角度切入——Causal LM 适合直接生成答案，Encoder-Decoder 适合对检索结果做摘要（如 T5 在 RAG 中的使用），Prefix LM 适合填充式问答（如检索到中间段落时补全）。强调你根据任务选型，并对比过延迟。
- **如果你只做过传统 NLP**：用“序列标注 vs 序列生成”类比——Causal LM 像单向 LSTM（只往前看），Encoder-Decoder 像 BiLSTM+Attention（双向编码+对齐），Prefix LM 像 BiLSTM+单向解码（部分双向）。迁移你熟悉的架构理解。
- **如果你是校招无项目**：聚焦论文复现——提你读过 T5 的“Exploring the Limits of Transfer Learning”和 GPT-3 的论文，并自己实现过一个小对比实验（如用 HuggingFace 的 GPT-2 和 T5-small 在 CNN/DailyMail 上做摘要，比较 ROUGE 和推理速度）。展示动手能力和理论结合。
- 《Attention Is All You Need》（原始 Transformer 论文，理解 Encoder-Decoder 基础）
- 《Language Models are Unsupervised Multitask Learners》（GPT-2，Causal LM 的经典实现）
- 《Unified Language Model Pre-training for Natural Language Understanding and Generation》（UniLM，Prefix LM 的起源）
- 《Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer》（T5，Encoder-Decoder 的工程实践）
- 《FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness》（理解注意力加速原理）

---
