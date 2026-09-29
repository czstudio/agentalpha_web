---
slug: basics-tk072
no: "972"
title: "self-attention 在计算的过程中，如何对padding位做mask"
question: "self-attention 在计算的过程中，如何对padding位做mask"
excerpt: "面试官想考察你对 Transformer 底层实现的工程级理解，而非仅仅背诵“加一个极大负数”的口诀。这是典型的系统设计 + debug 类问题，刁钻点在于：你是否清楚 mask 操作的具体位置（在 softmax 前还"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4466
updated: "2026-09-29"
---

## self-attention 在计算的过程中，如何对padding位做mask

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 底层实现的**工程级理解**，而非仅仅背诵“加一个极大负数”的口诀。这是典型的**系统设计 + debug 类**问题，刁钻点在于：你是否清楚 mask 操作的**具体位置**（在 softmax 前还是后？）、**数值选择**（为什么是 -1e9 而非 -inf？）、以及**与 causal mask 的叠加顺序**。答好了能展示你手写过 Transformer 代码、踩过数值稳定性坑的硬实力，这是区分“调包侠”和“真懂原理”的关键。

#### 2️⃣ 标准答

Padding mask 的核心目标：让 softmax 对 padding 位置的注意力权重趋近于 0，从而模型不会关注这些无效 token。具体实现分四步：

- **生成 mask 矩阵**：假设 batch size = 2，序列长度 = 5，实际长度分别为 3 和 4。生成一个布尔矩阵 `mask`，形状 `[batch, 1, 1, seq_len]`（适配多头注意力维度），padding 位置为 `True`，有效位置为 `False`。例如 `mask[0] = [False, False, False, True, True]`。
- **计算注意力分数**：先正常计算 `scores = Q @ K^T / sqrt(d_k)`，形状 `[batch, heads, seq_len, seq_len]`。此时 scores 中所有位置都包含有效值，包括 padding 位置与有效位置的交互。
- **应用 mask**：使用 `scores = scores.masked_fill(mask, -1e9)`。关键细节：
- **为什么是 -1e9 而非 -inf**：因为 float16 下 -inf 会溢出为 NaN，导致梯度爆炸。实际工程中，PyTorch 的 `masked_fill` 常用 `-1e9` 或 `-1e10`，确保 softmax 后权重 < 1e-15。
- **mask 广播**：mask 形状 `[batch, 1, 1, seq_len]` 会自动广播到 `[batch, heads, seq_len, seq_len]`，覆盖所有 query 位置对 padding key 的注意力。
- **叠加 causal mask**：如果同时需要 causal mask（防止看到未来 token），需先应用 padding mask，再应用 causal mask。因为 causal mask 是上三角矩阵，padding mask 是行级 mask，两者用 `torch.logical_or` 合并后统一 masked_fill。
- **softmax 归一化**：对 masked scores 沿最后一个维度（key 维度）做 softmax。padding 位置对应的权重被压制到接近 0，有效位置的权重重新归一化（总和仍为 1）。

**实际落地的坑**：

- **batch 内长度不一致**：常见做法是 padding 到 batch 内最大长度，但会导致计算浪费。优化方案：使用 `flash_attention` 的 varlen 模式（如 xformers 的 `BlockDiagonalMask`），直接跳过 padding 计算，节省 30%-50% 显存。
- **mask 类型混淆**：padding mask 是**对 key 的 mask**（忽略无效 key），而 causal mask 是**对 query 的 mask**（限制 query 能看到哪些 key）。两者维度不同，不能混用。
- **数值精度**：在混合精度训练（AMP）中，float16 的 -1e9 可能被截断为 -65504（float16 最小值），但依然足够让 softmax 输出接近 0。如果使用 bfloat16，-1e9 是合法值，无需担心。

**工程取舍**：直接在 scores 上 masked_fill 比在 softmax 后手动置零更优，因为 softmax 的指数计算会放大数值差异，前置 mask 能保证数值稳定性。但代价是 mask 操作增加了显存占用（需要存储 mask 矩阵），对于超长序列（如 8K+），建议用 `flash_attention` 的隐式 mask 来避免显存爆炸。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从 mask 生成、数值填充、与 causal mask 叠加三个层面回答。首先，根据 batch 内实际长度生成布尔 mask 矩阵，padding 位为 True；其次，在注意力分数计算后，用 masked_fill 将 padding 位置填充为 -1e9（而非 -inf，避免 float16 溢出），再通过 softmax 使权重趋近于 0；最后，如果需要同时使用 causal mask，用 logical_or 合并两个 mask 再统一应用。总结一句：padding mask 的本质是让模型忽略无效 token，核心在于数值稳定性和 mask 维度的正确广播。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么不用 -inf 而用 -1e9？在什么场景下 -inf 会出问题？

> 核心原因是 float16 的数值范围限制。float16 能表示的最小负数是 -65504，-inf 在 float16 中会被表示为 NaN，导致 softmax 输出全 NaN，梯度爆炸。而 -1e9 在 float16 中会被截断为 -65504，但依然足够让 softmax 输出 < 1e-15。在 bfloat16 或 float32 中，-inf 是安全的，但为了兼容混合精度训练，业界统一用 -1e9。如果你用 PyTorch 的 `nn.Transformer`，它内部用的是 `float('-inf')`，但实际在 AMP 下会自动转为 -1e9。

**追问 2**：padding mask 和 attention mask 在维度上有什么区别？如何实现 batch 内变长序列的高效 mask？

> padding mask 是 `[batch, 1, 1, seq_len]`，只对 key 维度 mask；attention mask（如 causal mask）是 `[1, 1, seq_len, seq_len]`，对 key 和 query 的交互 mask。对于变长序列，高效做法是使用 `flash_attention` 的 varlen 模式：将序列拼接为 1D 连续张量，并传入 `cu_seqlens`（每个序列的起始位置索引），attention 计算时自动跳过 padding 区域。这比 padding 到最大长度节省约 40% 的 FLOPs。

**追问 3**：在训练和推理时，padding mask 的处理方式有何不同？

> 训练时，padding mask 必须显式应用，因为 batch 内序列长度不同。推理时，如果采用动态 batch（如 vLLM 的 continuous batching），每个请求的序列长度实时变化，padding mask 需要动态生成。如果采用静态 batch（如固定长度 2048），padding 位在推理时依然需要 mask，否则模型会“看到”无效 token 并产生错误 logits。但注意：推理时 causal mask 是固定的，padding mask 是动态的，两者需要实时合并。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“在 softmax 之后将 padding 位置的权重手动置为 0” → ✅ 正确做法是在 softmax 之前 masked_fill，因为 softmax 的指数计算会放大数值，后置置零会导致有效位置的权重总和不为 1，破坏概率分布。
- ❌ 说“padding mask 和 causal mask 直接相加” → ✅ 正确做法是用 `torch.logical_or` 合并两个布尔 mask，再统一 masked_fill。直接相加会导致数值重叠（如 -1e9 + -1e9 = -2e9），虽然不影响 softmax 结果，但不符合语义。
- ❌ 说“padding mask 只对 key 做，不对 query 做” → ✅ 严格来说，padding mask 是对 key 的 mask，但实现时 mask 矩阵会广播到所有 query 位置。如果 query 本身是 padding 位（如 decoder 的 self-attention），也需要对 query 做 mask，但通常通过 causal mask 间接处理。

#### 6️⃣ 简历呼应

- **如果你有 LLM 训练/微调项目**：从“混合精度训练下 mask 数值选择”切入，结合你项目中遇到的 NaN 问题，展示你如何用 -1e9 替代 -inf 解决梯度爆炸。
- **如果你只做过传统 NLP（如 BERT 分类）**：用“序列标注任务中 padding 对 loss 的影响”类比，说明你理解 padding mask 如何避免模型学习无效位置的表示，并对比过有无 mask 的 F1 分数差异。
- **如果你是校招无项目**：聚焦“手写 MiniTransformer 时踩过的 mask 广播坑”，展示你从 PyTorch 官方教程中复现的 masked attention 代码，并解释为什么 mask 维度需要 `[batch, 1, 1, seq_len]` 而非 `[batch, seq_len]`。
- 《Attention Is All You Need》原始论文（Section 3.2.3：Masked Attention）
- PyTorch 官方教程：`nn.Transformer` 中的 `src_key_padding_mask` 实现
- FlashAttention 论文（Dao et al., 2022）：varlen 模式下的隐式 mask 机制
- xformers 库的 `BlockDiagonalMask` 文档：高效变长序列 attention
- 《The Annotated Transformer》博客（Harvard NLP）：逐行代码解析 mask 实现

---
