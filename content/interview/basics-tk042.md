---
slug: basics-tk042
no: "942"
title: "How does masked self-attention differ from regular self-attention, and where is it used in a Transformer"
question: "How does masked self-attention differ from regular self-attention, and where is it used in a Transformer"
excerpt: "面试官想确认你是否真正理解 Transformer 架构中 encoder 和 decoder 的核心设计差异，而不仅仅是背概念。这道题表面是问 masked self-attention 和 regular self-"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 11
words: 5013
updated: "2026-09-29"
---

## How does masked self-attention differ from regular self-attention, and where is it used in a Transformer

#### 1️⃣ 考察意图

面试官想确认你是否真正理解 Transformer 架构中 encoder 和 decoder 的核心设计差异，而不仅仅是背概念。这道题表面是问 masked self-attention 和 regular self-attention 的区别，实际考察三个层次：**数学实现细节**（mask 怎么加、为什么加在 softmax 前）、**设计动机**（为什么 decoder 需要因果性而 encoder 不需要）、**工程落地**（训练时 teacher forcing 下 mask 如何与并行计算共存）。刁钻点在于：很多人能说出“mask 掉未来 token”，但说不清为什么 GPT 系列所有层都用 masked attention 而 BERT 只用 regular。答好了能展示你对自回归生成、双向编码、并行训练这三个关键概念的底层理解，这是大模型面试的硬通货。

#### 2️⃣ 标准答

**核心区别一句话**：regular self-attention 允许每个 token 关注序列中所有位置（包括未来），masked self-attention 通过上三角掩码禁止关注未来位置，保证因果性。

**数学实现细节**：

- 常规 self-attention 计算：`Attention(Q,K,V) = softmax(QK^T / sqrt(d_k)) V`，其中 `QK^T` 矩阵是完整的 n×n 矩阵，每个位置 i 可以 attend 到所有位置 j。
- Masked self-attention 在 softmax 前对 `QK^T` 矩阵施加掩码：将上三角部分（即 j > i 的位置）设为 `-inf`。Softmax 后这些位置的权重变为 0，从而禁止信息从未来流向当前。
- 关键工程细节：**掩码加在 softmax 之前而非之后**，因为 softmax 对 `-inf` 的输出是 0，而对 0 的输出是均匀分布，两者效果完全不同。
- 实际实现中，PyTorch 用 `attn_mask` 参数传入布尔掩码或浮点掩码，FlashAttention 内部通过 block-sparse 方式高效处理掩码，避免显存爆炸。

**使用场景与设计动机**：

- **Regular self-attention**：用于 Transformer encoder（如 BERT、ViT）。Encoder 需要双向上下文理解，例如 BERT 的 MLM 任务中，预测 `[MASK]` 需要看左右两侧的 token。
- **Masked self-attention**：用于 Transformer decoder 的自注意力层（如 GPT 系列、LLaMA）。Decoder 是自回归生成模型，生成第 t 个 token 时只能依赖前 t-1 个 token，否则会泄露未来信息。
- **混合场景**：Encoder-Decoder 架构（如原始 Transformer 的翻译任务）中，decoder 的 cross-attention 层使用 regular self-attention（因为 encoder 输出是完整的），但 decoder 的自注意力层必须用 masked。

**实际落地的坑与解法**：

- **坑 1：训练时 teacher forcing 下的并行计算**。训练时 decoder 一次性输入整个目标序列，但 mask 保证每个位置只看到之前的位置，从而可以并行计算所有位置的 loss。如果忘记加 mask，模型会学到“抄答案”——直接复制未来 token。
- **坑 2：因果掩码与位置编码的交互**。在 RoPE（旋转位置编码）中，mask 需要与相对位置编码配合。RoPE 本身不包含因果性，必须显式加 mask，否则模型会利用位置编码的周期性“偷看”未来 token。
- **解法**：在实现中，通常预计算一个因果掩码矩阵（`torch.tril(torch.ones(n, n))`），并在每个 attention head 计算时广播。对于变长序列，需要结合 padding mask 一起使用：先对 padding 位置设 `-inf`，再叠加因果掩码。

**工程取舍**：

- **为什么不用 regular self-attention 加未来 token 的 0 权重？** 因为 softmax 的归一化特性：如果未来 token 的权重是 0 而非 `-inf`，softmax 会重新分配概率，导致当前 token 的注意力被稀释，模型无法正确聚焦。
- **为什么 GPT 所有层都用 masked attention？** 因为 GPT 是纯 decoder 架构，每一层都需要保持因果性。如果某层用 regular，信息会从未来泄露到当前，破坏自回归性质。而 BERT 的 encoder 所有层都用 regular，因为 MLM 需要双向信息。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，数学实现上，masked self-attention 在 softmax 前将上三角矩阵设为 `-inf`，而 regular 不做任何限制。第二，设计动机上，regular 用于 encoder 的双向上下文建模，masked 用于 decoder 的自回归生成，防止未来信息泄露。第三，工程落地上，训练时通过 mask 实现 teacher forcing 下的并行计算，但要注意与 padding mask 和 RoPE 的交互。总结一句：masked self-attention 是自回归模型的核心机制，它让 Transformer 既能并行训练又能保持因果性。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 masked self-attention 中 mask 要加在 softmax 之前而不是之后？

> 这是注意力机制的一个关键工程细节。Softmax 对 `-inf` 的输出是 0，而对 0 的输出是 `1/n`（均匀分布）。如果 mask 加在 softmax 之后，未来 token 的权重是 0，但 softmax 已经对当前 token 的注意力做了归一化，导致当前 token 的注意力被稀释到其他位置。更严重的是，如果未来 token 的权重是 0，softmax 会重新分配概率，使得当前 token 的注意力分布发生变化，模型无法正确学习。因此，必须在 softmax 前将未来位置设为 `-inf`，这样 softmax 后这些位置的权重精确为 0，且不影响其他位置的归一化。

**追问 2**：在 FlashAttention 中，masked self-attention 是如何高效实现的？

> FlashAttention 通过分块（tiling）和重计算（recomputation）来减少显存占用。对于因果掩码，它利用上三角矩阵的稀疏性：在计算每个 block 时，只计算下三角部分的注意力分数，跳过上三角部分。具体来说，FlashAttention 在 forward 时对每个 block 检查是否完全在 mask 的上三角区域（即所有 j > i），如果是则直接跳过该 block 的计算。这比传统实现中先计算完整矩阵再 mask 要高效得多，因为避免了大量无效的矩阵乘法。此外，FlashAttention 的 backward 也利用了 mask 的稀疏性，只回传下三角部分的梯度。

**追问 3**：如果我在 decoder 的 cross-attention 层也用了 masked self-attention，会发生什么？

> 这是一个常见的错误。Cross-attention 中，query 来自 decoder，key 和 value 来自 encoder。Encoder 的输出是完整的序列，没有未来信息的概念。如果在这里加因果掩码，decoder 的每个位置只能 attend 到 encoder 的前几个位置，导致生成时无法利用 encoder 的完整上下文。例如在翻译任务中，生成第 5 个目标词时，如果只能看到 encoder 的前 3 个源词，翻译质量会急剧下降。正确做法是 cross-attention 使用 regular self-attention，只对 padding 位置做 mask。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“masked self-attention 就是 attention 时把未来 token 的权重设为 0” → ✅ 正确说法是“在 softmax 前将未来 token 的注意力分数设为 `-inf`”，因为 softmax 对 0 和 `-inf` 的处理完全不同，前者会导致注意力稀释。
- ❌ 说“BERT 的 encoder 也用 masked self-attention” → ✅ BERT 的 encoder 用 regular self-attention，它的 mask 是 MLM 的 token-level mask（把 `[MASK]` 位置遮住），不是因果 mask。两者概念不同。
- ❌ 说“masked self-attention 只在 decoder 的自注意力层用” → ✅ 正确，但需要补充：GPT 系列所有层都用 masked，而原始 Transformer 的 decoder 中 cross-attention 用 regular。

#### 6️⃣ 简历呼应

- **如果你有 LLM 训练项目**：从“训练时因果掩码与 FlashAttention 的兼容性”切入，展示你对高效训练的理解。例如：“我在训练 1B 参数量的 GPT 模型时，发现 FlashAttention 的因果掩码实现比 naive mask 节省 30% 显存。”
- **如果你只做过传统 NLP**：用“RNN 的隐状态 vs Transformer 的 mask”做类比迁移。例如：“RNN 通过时间步顺序天然保证因果性，而 Transformer 通过 mask 在并行计算中模拟这种顺序依赖。”
- **如果你是校招无项目**：聚焦“手动实现一个简化版 Transformer decoder”的 demo。例如：“我在课程项目中用 PyTorch 实现了 masked self-attention，对比了有无 mask 时 BLEU 分数的差异，验证了因果性的必要性。”
- 《Attention Is All You Need》原始论文（Vaswani et al., 2017）—— 理解 masked self-attention 的原始设计
- 《FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness》（Dao et al., 2022）—— 高效实现因果掩码
- 《RoFormer: Enhanced Transformer with Rotary Position Embedding》（Su et al., 2021）—— 因果掩码与 RoPE 的交互
- PyTorch 官方文档 `torch.nn.TransformerDecoderLayer` —— 查看 mask 参数的具体用法
- 《The Annotated Transformer》博客（Harvard NLP）—— 逐行代码实现 masked self-attention

---
