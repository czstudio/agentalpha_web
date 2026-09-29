---
slug: basics-tk041
no: "941"
title: "How are the outputs of multiple heads combined and projected back in the multi-head attention in the Transformer model"
question: "How are the outputs of multiple heads combined and projected back in the multi-head attention in the Transformer model"
excerpt: "面试官想确认你是否真正理解 Transformer 中多头注意力（MHA）的实现细节，而非只背公式。这是典型的背概念 + 工程取舍题，刁钻点在于：很多人只记得“拼接后投影”，但说不清维度变换的具体数值（如 d_model"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3867
updated: "2026-09-29"
---

## How are the outputs of multiple heads combined and projected back in the multi-head attention in the Transformer model

#### 1️⃣ 考察意图

面试官想确认你是否真正理解 Transformer 中多头注意力（MHA）的**实现细节**，而非只背公式。这是典型的**背概念 + 工程取舍**题，刁钻点在于：很多人只记得“拼接后投影”，但说不清**维度变换的具体数值**（如 d_model=512, h=8, d_k=d_v=64）、**为什么需要投影矩阵 W_O**（而非直接拼接）、以及**投影后的维度一致性**。答好了能展示你对 Transformer 架构的底层理解，以及从论文到代码的落地能力。

#### 2️⃣ 标准答

多头注意力的输出合并与投影分三步：**独立计算 → 拼接 → 线性投影**。下面以 Transformer 原文参数（d_model=512, h=8, d_k=d_v=64）为例拆解。

**第一步：每个头独立计算注意力输出**

- 每个头对输入 Q、K、V 做缩放点积注意力：`head_i = Attention(QW_i^Q, KW_i^K, VW_i^V)`，输出维度为 `(batch_size, seq_len, d_v)`，即 `(B, T, 64)`。
- 关键：每个头的 W_i^Q、W_i^K、W_i^V 是独立的线性投影矩阵，维度均为 `(d_model, d_k)` 或 `(d_model, d_v)`，确保每个头从不同子空间学习。

**第二步：沿特征维度拼接**

- 将 8 个头的输出 `head_1` 到 `head_8` 沿最后一个维度（特征维度）拼接，得到 `(B, T, 8*64) = (B, T, 512)`。
- 工程取舍：**为什么拼接而非求和/平均？** 拼接保留了每个头的独立信息，让后续投影层学习如何融合；若直接求和，头间信息会混叠，降低模型容量。代价是计算量增加（需额外投影矩阵 W_O），但这是 Transformer 性能的关键。

**第三步：通过 W_O 线性投影回 d_model**

- 拼接结果乘以投影矩阵 `W_O`，维度为 `(d_model, d_model)`，即 `(512, 512)`，输出 `(B, T, 512)`。
- 公式：`MultiHead(Q,K,V) = Concat(head_1,...,head_h) * W_O`。
- **为什么需要 W_O？** 直接拼接的输出维度是 `h*d_v`，但后续 FFN 层期望输入为 `d_model`，所以必须投影对齐。W_O 还负责**跨头信息融合**，让模型学习哪些头的信息更重要（类似加权求和，但更灵活）。

**实际落地的坑 + 解法**

- **坑：维度不匹配**。若 d_model 不能被 h 整除（如 d_model=511, h=8），d_k=d_v 无法取整，导致拼接后维度不等于 d_model。解法：**强制 d_model % h == 0**，这是 Transformer 设计的基本约束。PyTorch 的 `nn.MultiheadAttention` 会检查此条件并报错。
- **坑：投影矩阵初始化**。W_O 若初始化不当（如全零），会导致梯度消失。解法：使用 **Xavier/Glorot 初始化**，保持输入输出方差一致，加速收敛。
- **坑：内存爆炸**。拼接操作本身不占额外内存（视图变换），但 W_O 矩阵乘法在长序列（如 T=4096）时计算量大。解法：使用 **FlashAttention** 或 **分块矩阵乘法**，减少显存占用。

**代码级验证**（与 PyTorch 官方实现对比）：

`# 伪代码：手动实现 vs nn.MultiheadAttention
import torch.nn as nn
mha = nn.MultiheadAttention(embed_dim=512, num_heads=8)
# 手动：head_i = attention(...) -> concat -> W_O
# 官方：mha(q, k, v) 内部自动完成
# 对比输出：均方误差应 < 1e-6
`注意：官方实现中 W_O 是 `nn.Linear(512, 512)`，且 bias 默认为 False（原文无 bias）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：**维度变换**、**拼接 vs 其他融合方式**、**投影矩阵 W_O 的作用**。首先，每个头输出维度 d_v=64，8 个头拼接成 512 维，再通过 W_O 投影回 512。其次，拼接保留头间独立性，比求和更优。最后，W_O 不仅对齐维度，还学习跨头权重。总结一句：多头注意力的输出合并本质是‘独立计算 → 拼接 → 线性融合’，确保信息不丢失且维度一致。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 W_O 的维度是 `(d_model, d_model)`，而不是 `(h*d_v, d_model)`？

> 应对策略：W_O 的输入维度是 `h*d_v`，输出是 `d_model`，所以严格说是 `(h*d_v, d_model)`。但 Transformer 原文中 d_model = h * d_v（如 512 = 864），所以简写为 (d_model, d_model)。若 d_model ≠ hd_v（如某些变体），W_O 维度必须为 `(h*d_v, d_model)`。这是**维度一致性**的工程细节，面试官可能故意挖坑。

**追问 2**：如果去掉 W_O，直接拼接后输入 FFN，会怎样？

> 应对策略：FFN 的输入维度固定为 d_model，若拼接后维度是 hd_v（≠ d_model），会报维度错误。即使维度巧合相等（如 d_model = hd_v），去掉 W_O 会导致**跨头信息无法融合**，每个头独立输出，模型容量下降。实验表明，去掉 W_O 后 BLEU 分数下降约 2-3 点（参考《Attention is All You Need》消融实验）。所以 W_O 是**必要组件**，非可选项。

**追问 3**：在 PyTorch 的 `nn.MultiheadAttention` 中，W_O 的 bias 参数有什么作用？

> 应对策略：原文无 bias，但 PyTorch 实现默认 `bias=True`。bias 提供**平移不变性**，在微调任务中可能提升性能（如 BERT 使用 bias）。但若追求严格复现（如训练 GPT），应设置 `bias=False`。取舍点：bias 增加少量参数（0.2% 左右），但可能引入过拟合风险，尤其在数据量小时。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “每个头输出直接求和，然后投影。” → ✅ “必须拼接，求和会丢失头间独立性，导致信息混叠。正确做法是沿特征维度拼接，再通过 W_O 投影。”
- ❌ “W_O 的维度是 (d_model, hd_v)，但通常 d_model = hd_v，所以一样。” → ✅ “严格说 W_O 是 (hd_v, d_model)，但原文假设 d_model = hd_v，所以简写。面试中要指出这个假设，体现严谨性。”
- ❌ “拼接后维度不变，直接输入 FFN。” → ✅ “拼接后维度是 hd_v，必须投影回 d_model 才能输入 FFN。若 d_model ≠ hd_v，投影是强制步骤。”

#### 6️⃣ 简历呼应

- **如果你有 LLM 训练项目**：从“我在训练 7B 模型时，发现 W_O 初始化影响收敛速度，改用 Xavier 后 loss 下降更快”切入，展示实战经验。
- **如果你只做过传统 NLP**：用“类似 CNN 中多通道卷积后拼接再 1x1 卷积”类比，说明多头注意力也是“多通道 → 拼接 → 融合”的范式。
- **如果你是校招无项目**：聚焦“从零实现 MHA 并对比 PyTorch 官方输出”的 demo，强调你验证了维度变换和数值精度，体现工程能力。
- 《Attention is All You Need》原文 Section 3.2：多头注意力公式与维度定义
- PyTorch 官方文档：`nn.MultiheadAttention` 源码解析（forward 函数）
- 博客：The Annotated Transformer（Harvard NLP 实现，含 W_O 维度推导）
- 论文：Analyzing Multi-Head Self-Attention: Specialized Heads Do the Heavy Lifting（分析 W_O 对头间信息融合的影响）
- 工具：Hugging Face Transformers 源码中 `BertSelfAttention` 类的 `output_projection` 实现

---
