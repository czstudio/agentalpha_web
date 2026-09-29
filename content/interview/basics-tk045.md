---
slug: basics-tk045
no: "945"
title: "What is the softmax function, and where is it applied in the Transformer model"
question: "What is the softmax function, and where is it applied in the Transformer model"
excerpt: "面试官想验证你对 Transformer 基础组件的理解是否停留在“背公式”层面，还是能深入其工程角色。这道题看似简单，但刁钻点在于：softmax 在 Transformer 中并非“一个函数用两次”，而是承担了两种截"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4215
updated: "2026-09-29"
---

## What is the softmax function, and where is it applied in the Transformer model

#### 1️⃣ 考察意图

面试官想验证你对 Transformer 基础组件的理解是否停留在“背公式”层面，还是能深入其工程角色。这道题看似简单，但刁钻点在于：softmax 在 Transformer 中并非“一个函数用两次”，而是承担了两种截然不同的任务——注意力中的**竞争性归一化**和输出层的**概率校准**。答好了能展示你对数值稳定性、梯度流动和模型设计取舍的硬实力，而非仅仅复述《Attention Is All You Need》。

#### 2️⃣ 标准答

**定义与核心特性**

Softmax 函数将实数向量 z 映射为概率分布：\text{softmax}(z_i) = \frac{e^{z_i}}{\sum_j e^{z_j}}。关键特性：输出和为 1、单调保序（大值更大）、指数放大差异。工程上，标准实现会减去最大值 \max(z) 防止指数溢出，即 \text{softmax}(z_i) = \frac{e^{z_i - \max(z)}}{\sum_j e^{z_j - \max(z)}}。

**在 Transformer 中的两个关键应用**

1. **注意力权重计算（Scaled Dot-Product Attention）**

- 位置：自注意力（Self-Attention）和交叉注意力（Cross-Attention）中，对 Query 和 Key 的点积得分做 softmax。
- 公式：\text{Attention}(Q,K,V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V。
- 为什么用 softmax：它强制注意力权重竞争——每个位置必须“抢”到有限的总和 1，迫使模型聚焦关键 token。例如，在机器翻译中，解码器对源语言“bank”的注意力必须从“河岸”和“银行”中二选一，softmax 的指数放大特性让差异更尖锐。
- 工程取舍：softmax 的指数计算在长序列（如 8K tokens）中开销大。实际落地中，FlashAttention 通过分块计算和在线 softmax 技巧（如 tiling + rescaling）避免显存爆炸，但代价是实现复杂度高。
- 坑与解法：数值不稳定常见于大 logits（如训练初期）。解法是除以 \sqrt{d_k}（缩放因子）控制方差，以及使用混合精度训练时对 softmax 输入做 clip（如限制在 [-50, 50] 内）。

1. **输出层概率化（LM Head）**

- 位置：Transformer 解码器最后一层，将 logits（通常维度为 vocab_size）转为 token 概率。
- 公式：P(\text{next token}) = \text{softmax}(\text{logits})。
- 为什么用 softmax：提供概率解释，便于计算交叉熵损失（-\log P(\text{target})）。但注意，这里 softmax 不涉及“竞争性”选择——它只是归一化，实际采样时可能用 top-k 或 temperature 调整分布。
- 工程取舍：vocab_size 大（如 50K-100K）时，全 softmax 计算昂贵。工业界常用**自适应 softmax**（Adaptive Softmax）或**分块 softmax**（如 Megatron-LM 的 tensor parallelism 中拆分 vocab），牺牲部分精度换吞吐。
- 坑与解法：训练时 logits 可能发散（如梯度爆炸），导致 softmax 输出接近 one-hot，梯度消失。解法是配合 LayerNorm 和梯度裁剪，或使用 label smoothing（如 0.1）软化目标分布。

**替代方案与 trade-off**

- 注意力中：ReLU 或 sigmoid 可替代 softmax（如 ReLU Attention 论文）。ReLU 无归一化，计算更快，但缺乏竞争性，在长上下文任务中可能注意力分散。
- 输出层：可改用 sigmoid（多标签分类）或 Gumbel-Softmax（离散采样），但交叉熵损失要求概率和为 1，softmax 仍是标准选择。

**总结**：Softmax 在 Transformer 中不是“一个函数用两次”，而是两种不同角色——注意力中的**竞争归一化**和输出层的**概率校准**。理解其数值稳定性、计算开销和替代方案，是区分“背公式”和“真懂”的关键。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、两个核心应用和工程取舍三个层面回答。定义上，softmax 将实数向量归一化为和为 1 的概率分布，通过减去最大值保证数值稳定。在 Transformer 中，它出现在两个地方：一是注意力机制中，对 QK 点积做 softmax，强制 token 间竞争注意力权重；二是输出层，将 logits 转为概率用于损失计算。总结一句：softmax 在注意力中负责‘聚焦’，在输出层负责‘校准’，两者角色不同，但都依赖其指数放大和归一化特性。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么注意力中要用 softmax，而不是直接归一化（如除以 L1 范数）？

> 直接 L1 归一化（除以绝对值之和）虽然也输出和为 1，但缺乏指数放大效应。Softmax 的指数函数能放大大值、压制小值，让注意力更尖锐——这对长序列中的关键 token 识别至关重要。例如，在翻译“I love you”时，softmax 能让“love”的注意力权重远高于“I”和“you”，而 L1 归一化可能让三者接近。代价是 softmax 计算更贵（指数运算），但 FlashAttention 已通过分块优化缓解。

**追问 2**：如果 softmax 输入全是负数，输出会怎样？这在实际训练中常见吗？

> 输入全负时，softmax 输出仍为概率分布（和为 1），但每个值接近均匀分布（因为指数函数在负区间变化平缓）。这在训练初期常见，因为 logits 方差小（如 LayerNorm 后输出接近零均值）。解法是确保模型初始化合理（如 Xavier 初始化），或使用 temperature 参数（如 T=0.1）放大差异。实际中，若注意力 softmax 输出长期均匀，说明模型未学到有效模式，需检查学习率或数据质量。

**追问 3**：在输出层，softmax 和 temperature 缩放的关系是什么？为什么 temperature 能控制生成多样性？

> Temperature 是在 softmax 前对 logits 除以 T：\text{softmax}(\text{logits}/T)。T>1 时，logits 被压缩，softmax 输出更均匀（多样性高）；T<1 时，logits 被放大，输出更尖锐（确定性高）。T=0 时退化为 argmax。工程上，T 不改变 softmax 的数学性质，只调节分布的“陡峭度”。注意，T 过高（如 T=5）会导致采样随机性过大，生成无意义内容；T 过低（如 T=0.1）则容易重复。实际中常用 T=0.7-1.0 平衡。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只说“softmax 在注意力中计算权重，在输出层计算概率”，不区分角色差异。→ ✅ 明确点出：注意力中的 softmax 是“竞争归一化”，输出层是“概率校准”，两者目的不同——前者聚焦 token，后者适配损失函数。
- ❌ 认为 softmax 输出是“概率”，忽略其数值稳定性问题（如溢出）。→ ✅ 主动提及减去最大值技巧，并说明在混合精度训练中需 clip logits 防止 NaN。
- ❌ 说“softmax 是唯一选择”，不提替代方案。→ ✅ 给出 ReLU Attention 或 sigmoid 的 trade-off，展示对前沿论文的了解。

#### 6️⃣ 简历呼应

- **如果你有 LLM 训练项目**：从“训练中 softmax 梯度消失”切入，结合 label smoothing 或 gradient clipping 的实战经验，展示对数值稳定性的理解。
- **如果你只做过传统 NLP（如文本分类）**：用“softmax 在分类任务中输出概率”类比 Transformer 输出层，再对比注意力中的“竞争性”差异，体现迁移能力。
- **如果你是校招无项目**：聚焦 FlashAttention 论文中的 online softmax 技巧，或复现一个 mini Transformer 时遇到的 softmax 溢出 bug，展示动手能力。
- 《Attention Is All You Need》（Vaswani et al., 2017）—— softmax 在 Transformer 中的原始定义
- 《FlashAttention: Fast and Memory-Efficient Exact Attention》（Dao et al., 2022）—— online softmax 分块计算
- 《ReLU Attention: Replacing Softmax with ReLU in Transformers》（Wortsman et al., 2023）—— 替代方案分析
- 《Adaptive Softmax for Efficient Language Modeling》（Grave et al., 2017）—— 输出层优化
- 《On the Numerical Stability of Softmax》（Blanchard et al., 2020）—— 数值稳定性深入分析

---
