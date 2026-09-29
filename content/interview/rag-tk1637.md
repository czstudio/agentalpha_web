---
slug: rag-tk1637
no: "2537"
title: "为何在获取输入词向量之后需要对矩阵乘以embedding size的开方？意义是什么"
question: "为何在获取输入词向量之后需要对矩阵乘以embedding size的开方？意义是什么"
excerpt: "面试官想考察你对 Transformer 初始化细节的深层理解，而非简单背诵。这属于数值稳定性 + 工程取舍类型。刁钻点在于：大多数人只知道“乘以 sqrt(d_model)”，但说不清为什么是开方、为什么不是其他缩放因"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4446
updated: "2026-09-29"
---

## 为何在获取输入词向量之后需要对矩阵乘以embedding size的开方？意义是什么

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 初始化细节的深层理解，而非简单背诵。这属于**数值稳定性 + 工程取舍**类型。刁钻点在于：大多数人只知道“乘以 sqrt(d_model)”，但说不清为什么是开方、为什么不是其他缩放因子。答好了能展示你对方差传播、梯度流和模型训练稳定性的硬核认知，证明你不仅会用框架，还懂底层数学原理。

#### 2️⃣ 标准答

**核心原因：保持方差稳定，防止后续 Attention 计算中数值爆炸或梯度消失。**

Transformer 的输入是词向量（embedding）与位置编码（positional encoding）相加。两者方差若不匹配，会导致训练不稳定。具体推导如下：

1. **词向量的方差问题**假设词向量每个维度独立采样自均值为 0、方差为 1 的分布（如 Xavier 初始化）。那么一个 d_model 维的词向量，其每个元素的方差为 1，但**整个向量的 L2 范数期望是 sqrt(d_model)**，方差则是 d_model（因为各维度独立，方差相加）。如果不缩放，直接与位置编码相加，位置编码通常也初始化为方差 1，两者量级不匹配——词向量方差是 d_model，位置编码方差是 1，相加后词向量主导，位置信息被淹没。
2. **乘以 sqrt(d_model) 的数学意义**乘以 sqrt(d_model) 后，词向量每个元素的方差变为 d_model（因为 Var(cX) = c² Var(X)），整个向量的方差变为 d_model²。但注意：**实际目的是让词向量与位置编码的方差在同一量级**。位置编码（如正弦编码）每个元素方差约为 0.5，乘以 sqrt(d_model) 后词向量方差为 d_model，而位置编码方差为 0.5，两者相加后方差约为 d_model + 0.5，词向量仍占主导，但量级差距从 d_model:1 缩小到 d_model:0.5，相对可控。更关键的是，后续 Attention 的 QK^T 计算中，点积的方差会随 d_model 增长，缩放后能保持方差为 O(1)，避免 softmax 进入饱和区。
3. **工程取舍：为什么不直接用 1 或 d_model？**

- 若直接用 1（不缩放）：词向量方差为 d_model，位置编码方差为 1，相加后方差 ~ d_model，Attention 中 QK^T 方差 ~ d_model²，softmax 输入过大，梯度消失。
- 若直接用 d_model：词向量方差变为 d_model²，位置编码方差 1，相加后方差 ~ d_model²，Attention 中 QK^T 方差 ~ d_model⁴，数值直接爆炸。
- 乘以 sqrt(d_model) 是**折中方案**：使词向量方差与 d_model 线性相关，而非平方相关，配合后续 LayerNorm 和残差连接，保持梯度流稳定。

1. **实际落地的坑 + 解法****坑**：在混合精度训练（FP16）中，若 d_model 很大（如 4096），乘以 sqrt(d_model) 后词向量数值范围可能超过 FP16 表示上限（65504），导致溢出。**解法**：在 embedding 层后加一个可学习的缩放参数（如 `scale = nn.Parameter(torch.ones(1))`），或者先除以 d_model 再乘以 sqrt(d_model) 的变体，但更常见的是**在初始化时直接调整 embedding 矩阵的方差**，例如用 `nn.init.normal_(embedding.weight, mean=0, std=1/sqrt(d_model))`，这样无需显式缩放。PyTorch 的 `nn.Embedding` 默认初始化方差为 1，所以需要手动处理。
2. **论文依据**

- 《Attention Is All You Need》原文：`We also multiply the embeddings by sqrt(d_model)`，但未详细解释。
- 《On Layer Normalization in the Transformer Architecture》指出，该缩放是为了让 embedding 与 positional encoding 的方差匹配，避免训练初期梯度不稳定。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数值稳定性、方差匹配、工程取舍三个层面回答。第一，词向量初始方差为 1，但 d_model 维向量方差为 d_model，与位置编码方差 1 不匹配，相乘后 Attention 中 QK^T 方差会爆炸。第二，乘以 sqrt(d_model) 使词向量方差变为 d_model，与位置编码相加后量级可控，softmax 不会饱和。第三，实际中要注意 FP16 溢出，可以用初始化调整替代显式缩放。总结一句：这是 Transformer 初始化中保持方差稳定的关键设计，防止梯度消失或爆炸。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么不是乘以 d_model 或者除以 d_model？具体数学推导是什么？

> 乘以 d_model 会使方差变为 d_model²，Attention 中 QK^T 方差 ~ d_model⁴，softmax 输入过大，梯度消失。除以 d_model 会使方差变为 1/d_model，词向量量级太小，位置编码主导，信息丢失。数学上，假设词向量 x ~ N(0, I)，则 E[||x||²] = d_model，乘以 c 后 E[||cx||²] = c² d_model。要让与位置编码（方差 1）相加后方差为 O(d_model)，需 c² d_model ≈ d_model，即 c ≈ 1，但这样方差仍为 d_model，不匹配。实际目标是让 QK^T 方差为 O(1)，需 c = 1/sqrt(d_model) 使词向量方差为 1，但原文用了 sqrt(d_model)，说明他们更关注 embedding 与 positional encoding 的相加而非 Attention 输入方差。这是一个 trade-off：优先保证相加后信息不丢失，再靠 LayerNorm 归一化。

**追问 2**：如果我用可学习的缩放参数代替固定 sqrt(d_model)，效果会更好吗？

> 不一定。可学习参数会增加训练难度，因为梯度需要同时调整缩放和 embedding 权重，可能导致收敛变慢。固定 sqrt(d_model) 是经验最优解，已被大量实验验证。可学习参数在 d_model 很小时（如 128）可能有用，但大模型（如 GPT-3 的 12288）中，固定缩放更稳定。实际中，更常见的做法是**在 embedding 层后加 LayerNorm**，这样缩放参数被归一化吸收，无需显式处理。例如 BERT 的 embedding 层后直接接 LayerNorm，不乘 sqrt(d_model)。

**追问 3**：在 RoPE（旋转位置编码）中，还需要这个缩放吗？

> 需要，但原因不同。RoPE 将位置信息直接注入 Q 和 K 的旋转矩阵中，不涉及与 embedding 相加。但词向量本身的方差仍需要控制，因为 Q 和 K 的初始化方差会影响 Attention 分数。RoPE 论文中，Q 和 K 的权重初始化通常用 Xavier，方差为 1/d_model，乘以 sqrt(d_model) 后 QK^T 方差为 O(1)。所以缩放仍然必要，但可以放在权重初始化中，而非 embedding 后。实际实现中，很多代码库（如 LLaMA）在 embedding 后不乘 sqrt(d_model)，而是通过初始化控制。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “乘以 sqrt(d_model) 是为了让 embedding 的范数变成 1，方便计算。”→ ✅ 正确说法：是为了匹配位置编码的方差，防止 Attention 中数值爆炸。范数归一化是 LayerNorm 做的事，不是这个缩放的目的。
- ❌ “这是 Transformer 的固定设计，没有为什么，记住就行。”→ ✅ 必须给出数学推导：方差传播、softmax 饱和区、梯度消失。面试官要听的是“为什么是 sqrt”而不是“是什么”。
- ❌ “乘以 sqrt(d_model) 后，embedding 的方差变成 d_model，与位置编码相加后方差更大，不合理。”→ ✅ 正确理解：位置编码方差约 0.5，相加后方差约 d_model + 0.5，量级匹配。关键是后续有 LayerNorm 和残差连接，能进一步归一化。

#### 6️⃣ 简历呼应

- **如果你有 Transformer 训练项目**：从实际调参经验切入，比如“我在训练 6 层 Transformer 时，发现去掉 sqrt(d_model) 后 loss 震荡，加上后收敛稳定，梯度范数从 100+ 降到 10 左右。”
- **如果你只做过传统 NLP（如 LSTM）**：类比 LSTM 的梯度裁剪，说明 Transformer 中数值稳定性更关键，因为 Attention 的 softmax 对输入范围敏感。
- **如果你是校招无项目**：聚焦论文复现，比如“我复现 Attention Is All You Need 时，发现不乘 sqrt(d_model) 会导致训练失败，通过阅读源码和论文推导才理解原因。”
- 《Attention Is All You Need》原文，Section 3.4 Embeddings and Softmax
- 《On Layer Normalization in the Transformer Architecture》——分析 embedding 缩放与 LayerNorm 的关系
- 《The Annotated Transformer》——Harvard NLP 的代码注释版，包含 sqrt(d_model) 的详细解释
- 《RoFormer: Enhanced Transformer with Rotary Position Embedding》——RoPE 中 QK 初始化的方差控制
- PyTorch `nn.Embedding` 源码——默认初始化方差为 1，需手动调整
