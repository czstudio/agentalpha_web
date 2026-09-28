---
slug: transformer-attention
term: Transformer 与注意力机制
en: Transformer & Attention
oneLine: Transformer 与注意力机制是大模型的标准骨架。它用自注意力让每个位置的表示直接聚合全序列信息，配合多层堆叠与前馈网络运作，注意力计算量随序列长度呈平方增长。
aliases: [Transformer, 注意力, Attention, 自注意力]
group: basics
tags: [Transformer, 基础概念]
relatedQa: [what-is-autoregressive, what-are-gqa-mqa-mla, what-is-cross-entropy-loss]
relatedTerms: [token, kv-cache, llm]
updated: 2026-09-28
---

## 是什么

自注意力的核心机制是对每个 token 计算 Query、Key、Value 三组向量。模型用 Query 与所有 Key 的点积算权重并加权聚合 Value，多头注意力则并行做多个子空间的聚合。位置信息靠位置编码补进 token 表示，当前主流为旋转位置编码（RoPE）。

Transformer 包含多头注意力、前馈网络、残差连接和归一化，通常堆叠几十层。decoder-only 架构采用带掩码的因果注意力，每个位置只能看到左侧。注意力计算量与序列长度呈平方关系，这是长上下文成本高的根源，GQA、MQA、MLA 和 Flash Attention 都在削减此开销。

## 解决什么问题

过去 RNN 类模型通过逐步传递隐状态处理序列，这种机制导致训练过程无法并行，且远距离信息的依赖会随传递步数逐渐衰减。

注意力机制打破了时序限制，允许序列中任意两个位置直接交互。这使得长程依赖关系被直接建模，同时让全序列的训练计算完全并行。

## 面试怎么考

面试常要求讲清 QKV 的作用与计算流程，答题需准确描述点积算权重与加权聚合的过程。另一常见考题是解释为什么 decoder-only 架构胜出。

注意力平方复杂度引发的性能瓶颈是高频考点。面试官常以此为切入点，延伸提问 KV Cache、GQA 及 Flash Attention 等优化机制。
