---
slug: basics-tk030
no: "930"
title: "为什么在attention中要进行scaled(为什么除以√d_k)"
question: "为什么在attention中要进行scaled(为什么除以√d_k)"
excerpt: "面试官想考察你是否真正理解 Transformer 中 `scaled dot-product attention` 的设计动机，而非死记公式。这属于工程取舍 + 数学原理类问题，刁钻点在于：很多人知道“防止 softm"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3507
updated: "2026-09-29"
---

## 为什么在attention中要进行scaled(为什么除以√d_k)

#### 1️⃣ 考察意图

面试官想考察你是否真正理解 Transformer 中 `scaled dot-product attention` 的设计动机，而非死记公式。这属于**工程取舍 + 数学原理**类问题，刁钻点在于：很多人知道“防止 softmax 梯度消失”，但说不清为什么点积方差会随维度增长，以及 `√d_k` 这个具体系数怎么来的。答好了能展示你对数值稳定性、概率分布和训练动态的底层理解，这是大模型训练调优的硬实力。

#### 2️⃣ 标准答

核心原因：**控制点积值的方差，避免 softmax 进入梯度饱和区**。

**1. 问题根源：点积方差随维度膨胀**

- 假设 Query 向量 `q` 和 Key 向量 `k` 的每个元素独立同分布，均值为 0，方差为 1（经过 LayerNorm 后常见）。
- 点积 `q·k = Σ(q_i * k_i)`，共 `d_k` 项。每项 `q_i * k_i` 的方差为 1（因为 Var(q_i*k_i) = Var(q_i)Var(k_i) = 11 = 1）。
- 所以点积的方差 = `d_k`，标准差 = `√d_k`。
- 当 `d_k` 较大时（如 GPT-3 中 `d_k=128`），点积值会分布在 `[-128, 128]` 量级，远大于 softmax 的敏感区间 `[-5, 5]`。

**2. 对 softmax 的灾难性影响**

- Softmax 函数在输入值很大时（如 128），`e^128` 会溢出（float32 最大约 `e^88`），直接 NaN。
- 即使不溢出，softmax 输出会**极度接近 one-hot**：最大值对应的概率接近 1，其余接近 0。
- 梯度问题：softmax 在极端概率处的梯度极小（接近 0），导致反向传播时梯度消失，模型几乎不更新。

**3. 为什么除以 √d_k 而不是 d_k 或其他**

- 目标是让点积的方差回到 1。除以 `√d_k` 后，新方差 = `d_k / (√d_k)^2 = 1`。
- 为什么不是除以 `d_k`？那样方差会变成 `1/d_k`，点积值集中在 0 附近，softmax 输出过于均匀（接近 uniform），**区分度不足**，模型难以学习注意力聚焦。
- 这是一个**精确的 trade-off**：`√d_k` 恰好将分布拉回标准正态，softmax 输入落在 `[-3, 3]` 区间，梯度充足且数值稳定。

**4. 实际落地的坑与解法**

- **坑**：在混合精度训练（FP16/BF16）中，即使 scaled，大 `d_k`（如 256）的点积仍可能溢出。例如训练 LLaMA 时，`d_k=128` 的 FP16 点积最大值约 64K，`e^64` 仍溢出。
- **解法**：FlashAttention 在 kernel 内做 online softmax，通过减去最大值（`max(q·k)`）将指数范围压缩到 `[-inf, 0]`，再除以 `√d_k`。实际代码中常先做 `q·k / √d_k`，再 `softmax`，但 FlashAttention 会动态调整数值范围。
- **另一个坑**：某些实现（如早期 BERT）忘记除以 `√d_k`，训练时 loss 震荡不收敛。修复后收敛速度提升 2-3 倍【通用知识】。

**5. 数学验证**

- 假设 `q, k ~ N(0, 1)`，`d_k=64`。未缩放：点积方差 64，标准差 8，softmax 输入 `[-24, 24]`，`e^24 ≈ 2.6e10`，softmax 输出几乎 one-hot。缩放后：方差 1，输入 `[-3, 3]`，softmax 输出平滑，梯度正常。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数学原理、梯度影响、工程取舍三个层面回答。数学上，Q 和 K 元素独立同分布时，点积方差等于 d_k，导致 softmax 输入过大。除以 √d_k 将方差归一化到 1，避免 softmax 进入梯度饱和区。工程上，这个系数是精确的 trade-off：除以 d_k 会让注意力过于均匀，不除则梯度消失。总结一句：scaled 是为了在数值稳定性和注意力区分度之间取得平衡。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 d_k 很小（比如 8），还需要 scaled 吗？

> 理论上不需要，因为方差只有 8，点积值在 `[-8, 8]`，softmax 梯度尚可。但实践中建议保留，原因有二：一是保持代码统一性，避免条件分支；二是当 d_k 极小时（如 1），点积方差为 1，除以 √1=1 无影响，不引入额外开销。实际中 d_k 很少小于 16，所以 scaled 是安全默认值。

**追问 2**：为什么不用除以 d_k 的 1/2 次方以外的系数，比如除以 d_k 的 1/3 次方？

> 数学推导决定了必须是 √d_k。因为方差是 d_k 的线性函数，要归一化到 1，必须除以标准差 √d_k。如果除以 d_k^(1/3)，方差变为 d_k^(1/3)，仍随 d_k 增长，无法解决梯度问题。这个系数不是拍脑袋的，是从概率分布推导出的精确解。

**追问 3**：在 multi-head attention 中，每个 head 的 d_k 可能不同（如 64 vs 128），scaled 系数怎么处理？

> 每个 head 独立计算，各自除以自己的 √d_k。因为每个 head 的 Q、K 矩阵独立，点积分布独立。实践中所有 head 的 d_k 通常相同（如 d_model / num_heads），所以系数一致。如果 head 维度不同（如某些稀疏注意力变体），必须分别缩放，否则不同 head 的 softmax 输出尺度不匹配，影响后续拼接。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “除以 √d_k 是为了防止数值溢出，因为 e^x 在 x 很大时会爆炸。” → ✅ 数值溢出只是表面现象，核心是梯度消失。即使使用 FP64 不溢出，softmax 的梯度仍会消失，模型不收敛。要强调“梯度饱和”而非“数值溢出”。
- ❌ “除以 √d_k 是因为点积结果太大，softmax 输出太集中。” → ✅ 只说“太大”不够精确。要给出数学推导：方差 = d_k，所以标准差 = √d_k，除以它才能归一化。面试官期待你展示推导过程。

#### 6️⃣ 简历呼应

- **如果你有 LLM 训练项目**：从实际训练稳定性切入，比如“我在训练 1.3B 模型时，发现移除 scaled 后 loss 在 200 步内从 3.2 升到 8.5，加上后恢复收敛，验证了梯度消失问题。”
- **如果你只做过传统 NLP（如 BERT 微调）**：用类比迁移，比如“BERT 的 attention 也用了 scaled，我在微调时发现不 scaled 会导致 attention 矩阵稀疏，模型只关注少数 token，影响分类效果。”
- **如果你是校招无项目**：聚焦论文复现，比如“我复现了 Attention Is All You Need 中的 scaled dot-product，用 PyTorch 验证了 d_k=64 时未缩放 softmax 输出熵从 2.3 降到 0.1，缩放后恢复。”
- Attention Is All You Need (Vaswani et al., 2017) – 原始论文，公式 1 和 3.2.1 节
- FlashAttention: Fast and Memory-Efficient Exact Attention (Dao et al., 2022) – 在线 softmax 数值稳定方案
- The Annotated Transformer (Harvard NLP) – 带代码的逐行解释
- 为什么 Transformer 需要 scaled dot-product attention？ – Jay Alammar 博客图解
- 深度学习中的数值稳定性：Softmax 与 Cross-Entropy 的陷阱 – 知乎专栏

---
