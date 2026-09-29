---
slug: basics-tk006
no: "906"
title: "self attention的公式"
question: "self attention的公式"
excerpt: "这道题看似是“背公式”的基础题，但面试官真正想考察的是：你能否从公式推导出工程设计的核心取舍。刁钻点在于：候选人常只写出 `softmax(QK^T / sqrt(d_k))V`，却说不清为什么除以 `sqrt(d_k)"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4135
updated: "2026-09-29"
---

## self attention的公式

#### 1️⃣ 考察意图

这道题看似是“背公式”的基础题，但面试官真正想考察的是：**你能否从公式推导出工程设计的核心取舍**。刁钻点在于：候选人常只写出 `softmax(QK^T / sqrt(d_k))V`，却说不清为什么除以 `sqrt(d_k)` 而不是其他值，以及 softmax 后的梯度问题。答好了能展示：对 Transformer 底层原理的扎实理解、数值稳定性意识、以及从公式到实际部署的工程直觉（如 FlashAttention 的优化动机）。

#### 2️⃣ 标准答

**核心公式**：`Attention(Q, K, V) = softmax( QK^T / sqrt(d_k) ) V`其中 `Q, K, V` 维度为 `[batch, seq_len, d_k]`，`d_k` 是每个头的维度。

**分步拆解**：

- **步骤 1：计算注意力分数**`S = Q @ K^T`，得到 `[batch, seq_len, seq_len]` 矩阵。每个元素 `S_ij` 表示 query i 与 key j 的相似度。**坑**：当 `d_k` 很大（如 1024）时，点积的方差会随 `d_k` 线性增长（`Var(QK^T) = d_k`），导致 softmax 输入值过大，梯度进入饱和区（接近 0 或 1），反向传播梯度消失。
- **步骤 2：缩放**除以 `sqrt(d_k)` 将方差拉回 1 附近。**为什么是 sqrt(d_k) 而不是 d_k 或 log(d_k)**？因为 `Q` 和 `K` 的每个元素独立同分布（均值为 0，方差为 1），点积的方差是 `d_k`，标准差是 `sqrt(d_k)`。除以标准差使结果方差为 1，保持 softmax 梯度稳定。若用 `d_k` 缩放，方差变为 `1/d_k`，导致注意力分布过于平滑（接近均匀分布），信息区分度下降。
- **步骤 3：Softmax 归一化**对每行（每个 query）做 softmax，确保权重和为 1。**工程取舍**：原生 softmax 计算 `exp(x)` 在 `x` 很大时溢出（如 `exp(100)` 超出 float16 范围）。实际实现用 `softmax(x - max(x))` 技巧，但 FlashAttention 通过分块计算避免了全局 max 的显存开销。
- **步骤 4：加权求和**`Output = softmax(S / sqrt(d_k)) @ V`，得到每个 query 的加权表示。

**多头机制**：将 `Q, K, V` 拆成 `h` 个头（每个头维度 `d_k = d_model / h`），并行计算后拼接，再经过线性投影。**为什么用多头**：单头注意力容易“聚焦”于少数位置（如句首），多头允许模型在不同子空间学习不同的注意力模式（如一个头关注语法，另一个关注语义）。

**代码实现（PyTorch）**：

`def scaled_dot_product_attention(Q, K, V, mask=None):** d_k = Q.size(-1)
 scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
 if mask is not None:
 scores = scores.masked_fill(mask == 0, -1e9)
 attn_weights = torch.softmax(scores, dim=-1)
 return torch.matmul(attn_weights, V)
`实际落地的坑**：

- **显存爆炸**：`QK^T` 矩阵大小为 `[batch, seq_len, seq_len]`，当 `seq_len=8192` 时，单张 A100 80G 也装不下。解法：FlashAttention 通过分块（tiling）和重计算（recomputation）将复杂度从 `O(n^2)` 显存降到 `O(n)`。
- **数值精度**：混合精度训练（FP16）下，`QK^T` 容易溢出。解法：在缩放前将 `Q` 和 `K` 转换为 FP32 计算注意力分数，或使用 BF16（动态范围更大）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从公式推导、缩放因子原理、工程实现三个层面回答。公式是 `softmax(QK^T / sqrt(d_k))V`，核心是除以 `sqrt(d_k)` 控制方差，防止梯度消失。多头机制通过拆分维度让模型学习不同注意力模式。实际部署中要注意显存和数值精度，比如用 FlashAttention 或 BF16 优化。总结一句：self-attention 的本质是让每个 token 通过加权聚合全局信息，缩放因子是数值稳定性的关键。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么不用 `d_k` 或 `log(d_k)` 缩放，而必须是 `sqrt(d_k)`？

> 从概率角度：假设 `Q, K` 元素独立且均值为 0、方差为 1，则 `QK^T` 的方差是 `d_k`（因为 `Var(Σ q_i k_i) = Σ Var(q_i)Var(k_i) = d_k`）。除以 `sqrt(d_k)` 使方差为 1，保持 softmax 输入的稳定。若用 `d_k`，方差变为 `1/d_k`，注意力分布过于平滑（接近均匀分布），模型难以区分重要 token；若用 `log(d_k)`，方差仍随 `d_k` 增长，梯度问题未解决。这是数学推导和实验验证的结果，原始 Transformer 论文附录中有详细证明。

**追问 2**：self-attention 的时间复杂度是 `O(n^2 d)`，如何优化长序列场景？

> 主流优化分三类：1）**稀疏注意力**（如 Longformer、BigBird）：限制每个 token 只关注局部窗口和少量全局 token，复杂度降到 `O(n)`。2）**线性注意力**（如 Performer、Linformer）：用核方法或低秩近似将 `QK^T` 矩阵分解，复杂度降到 `O(n d^2)`。3）**FlashAttention**：通过分块计算和重计算，将显存复杂度从 `O(n^2)` 降到 `O(n)`，但计算复杂度仍是 `O(n^2 d)`。实际部署中，对于 8K 以下序列，FlashAttention 足够；更长序列（如 128K）需结合稀疏注意力。

**追问 3**：softmax 在反向传播时有什么数值问题？如何解决？

> Softmax 反向传播公式是 `∂L/∂S = (P - y) @ V^T`，其中 `P` 是 softmax 输出，`y` 是 one-hot 标签。问题在于：当 `P` 接近 one-hot（如 `[0.99, 0.01]`）时，梯度 `P - y` 中非目标位置的梯度接近 0，导致梯度消失。解法：1）**Label Smoothing**：将 one-hot 标签替换为 `(1-ε) * one-hot + ε / n`，防止 softmax 输出极端值。2）**Gradient Clipping**：限制梯度范数。3）**混合精度训练**：在 FP16 下，softmax 的 `exp` 容易溢出，需用 FP32 计算注意力分数后再转回 FP16。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只背公式，不解释缩放因子 → ✅ 必须说明 `sqrt(d_k)` 的数学推导（方差控制）和工程意义（防止梯度消失）。
- ❌ 认为多头就是简单重复计算 → ✅ 强调多头在不同子空间学习不同模式，且每个头维度 `d_k` 变小，计算量不变。
- ❌ 忽略数值稳定性，直接写 `softmax(QK^T)V` → ✅ 必须提到溢出问题（`exp` 大值）和实际实现技巧（减 max、FlashAttention 分块）。

#### 6️⃣ 简历呼应

- **如果你有 LLM 训练项目**：从“训练稳定性”切入，比如在训练 7B 模型时，发现 loss 震荡，通过调整 `sqrt(d_k)` 的缩放因子（如改用 `d_k^0.5` 的变体）或加入 LayerNorm 前归一化解决。
- **如果你只做过传统 NLP（如 BERT 微调）**：用“长文本分类”类比，比如在 512 序列上微调时，发现 `QK^T` 矩阵中某些 token 的注意力分数异常高，通过检查缩放因子和 mask 定位问题。
- **如果你是校招无项目**：聚焦“从零实现”的 demo，比如用 PyTorch 复现单头 self-attention，并对比 `sqrt(d_k)` 与 `d_k` 缩放下的梯度分布，展示对数值稳定性的理解。
- 《Attention Is All You Need》（Vaswani et al., 2017）—— 原始论文，公式推导和实验细节。
- 《FlashAttention: Fast and Memory-Efficient Exact Attention》（Dao et al., 2022）—— 工程优化核心论文。
- 《Efficient Transformers: A Survey》（Tay et al., 2022）—— 长序列注意力优化综述。
- PyTorch 官方文档 `torch.nn.functional.scaled_dot_product_attention` —— 实际 API 实现细节。
- 《The Annotated Transformer》（Harvard NLP）—— 代码级解读，含数值稳定性处理。

---
