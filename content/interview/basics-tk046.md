---
slug: basics-tk046
no: "946"
title: "What is the purpose of residual (skip) connections in Transformer model layers"
question: "What is the purpose of residual (skip) connections in Transformer model layers"
excerpt: "面试官想考察你对 Transformer 架构底层设计原理的理解，而非简单背诵“残差连接解决梯度消失”。刁钻点在于：能否区分残差连接在 Transformer 中与在 ResNet 中的不同角色？能否解释为什么没有残差连"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3486
updated: "2026-09-29"
---

## What is the purpose of residual (skip) connections in Transformer model layers

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 架构底层设计原理的理解，而非简单背诵“残差连接解决梯度消失”。**刁钻点**在于：能否区分残差连接在 Transformer 中与在 ResNet 中的不同角色？能否解释为什么没有残差连接，Transformer 的深层堆叠（如 12 层以上）会直接崩溃？答好了能展示：对深度学习训练稳定性（梯度流、信息瓶颈）的深刻理解，以及从工程角度解释“为什么 Transformer 必须用 Pre-LN + 残差”的取舍。

#### 2️⃣ 标准答

残差连接在 Transformer 中的核心目的是**解决深度网络训练中的两大问题：梯度消失和信息退化**。具体从三个层面展开：

- **梯度流保命通道**：在反向传播中，梯度需要从顶层逐层乘以各层的雅可比矩阵回传到底层。在深层 Transformer 中，如果子层（Self-Attention 或 FFN）的雅可比矩阵的奇异值小于 1，梯度会指数级衰减。残差连接提供了一条“短路”：梯度可以直接通过恒等映射（identity mapping）回传，绕过子层的梯度缩放。实际训练中，移除残差连接后，6 层 Transformer 的底层梯度范数会下降 3-5 个数量级，导致底层参数几乎不更新。
- **信息流保真通道**：前向传播中，每一层子层都会对输入进行非线性变换。深层堆叠时，原始输入信息（如位置编码、词义）会被逐层“稀释”或“覆盖”。残差连接让原始信息可以直接传递到高层，保留低层特征。例如，在 12 层 BERT 中，第 1 层的词向量信息通过残差连接直接影响到第 12 层的输出，这对语义理解至关重要。
- **具体实现与变体**：Transformer 原文使用 **Post-LN**（输出 = LayerNorm(x + Sublayer(x))），但现代实践（如 GPT-2、LLaMA）普遍改用 **Pre-LN**（输出 = x + Sublayer(LayerNorm(x))）。**工程取舍**：Post-LN 在训练初期梯度不稳定，需要 warmup；Pre-LN 梯度更平滑，允许更大学习率，但理论上会轻微降低模型容量。实际落地中，Pre-LN + 残差连接是主流，因为训练稳定性收益远大于容量损失。
- **实际落地的坑 + 解法**：坑在于**残差连接与 LayerNorm 的顺序**。如果使用 Post-LN 且不配合 warmup，前几轮训练 loss 会直接爆炸。解法：① 使用 Pre-LN 并移除 warmup，节省 10-20% 训练时间；② 在残差连接前加入 dropout（如 0.1），防止过拟合；③ 对于超深模型（如 48 层），可引入 **ReZero** 技巧：残差连接前乘以一个可学习的标量（初始化为 0），让网络从恒等映射开始训练，逐步学习子层贡献。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从梯度流、信息流和工程实现三个层面回答。梯度层面，残差连接为反向传播提供短路，防止梯度消失，让深层网络可训练。信息层面，它保留低层特征，避免信息被逐层稀释。工程层面，现代实现普遍采用 Pre-LN + 残差连接，以牺牲少量容量换取训练稳定性。总结一句：残差连接是 Transformer 能堆叠 12 层以上的基础保障，没有它，深层 Transformer 的梯度会直接消失。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 ResNet 的残差连接和 Transformer 的残差连接在实现上不同？ResNet 是 Conv 层，Transformer 是 Attention/FFN 层，有什么本质区别？

> 核心区别在于**子层雅可比矩阵的谱性质**。ResNet 的卷积层是局部线性变换，雅可比矩阵的奇异值通常接近 1，梯度消失不严重；残差连接更多是为了缓解“退化问题”（degradation，即深层网络准确率饱和）。Transformer 的 Self-Attention 层通过 softmax 产生概率分布，其雅可比矩阵的奇异值可能远小于 1（尤其当注意力权重集中时），梯度消失更致命。因此，Transformer 对残差连接的依赖更强，且必须配合 LayerNorm 稳定分布。

**追问 2**：如果移除所有残差连接，只保留 LayerNorm，Transformer 能训练吗？为什么？

> 不能。LayerNorm 只稳定激活值的均值和方差，不解决梯度流问题。移除残差连接后，梯度需要经过每一层子层的雅可比矩阵连乘。以 12 层 Transformer 为例，如果每层雅可比矩阵的最大奇异值为 0.8，12 次连乘后梯度范数衰减到 0.8^12 ≈ 0.069，接近零。实验验证：移除残差连接的 6 层 Transformer，训练 loss 在 10k 步后仍不下降，而带残差连接的版本在 2k 步内收敛。

**追问 3**：Pre-LN 和 Post-LN 在训练稳定性上的具体差异是什么？你如何选择？

> Post-LN 在训练初期，子层输出与残差分支相加后，激活值分布不稳定，导致梯度爆炸。因此需要 warmup（如前 10% 步数学习率从 0 线性增长）。Pre-LN 在子层前做 LayerNorm，稳定了子层输入分布，梯度更平滑，可以省去 warmup 或使用更大学习率（如 3e-4 vs 1e-4）。选择策略：小模型（<1B 参数）用 Post-LN + warmup 可能略优；大模型（>1B 参数）或训练资源有限时，无脑选 Pre-LN，省心且稳定。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只回答“残差连接解决梯度消失”，不展开具体机制和 Transformer 特殊性。 → ✅ 必须区分 ResNet 和 Transformer 的差异，强调 Transformer 中梯度消失更严重，且需要配合 LayerNorm。
- ❌ 说“残差连接让网络更深，所以性能更好”，不解释为什么更深能更好。 → ✅ 要指出深层能学习更复杂的特征交互（如长距离依赖），但前提是训练稳定，残差连接是稳定的前提。
- ❌ 混淆残差连接和跳跃连接（skip connection），认为它们完全等价。 → ✅ 残差连接是跳跃连接的一种特例，强调“恒等映射”分支，而非简单的特征拼接或相加。

#### 6️⃣ 简历呼应

- **如果你有 LLM 预训练项目**：从训练稳定性角度切入，描述你在训练 7B 模型时如何选择 Pre-LN 并调整学习率，以及观察到的梯度范数变化曲线。
- **如果你只做过传统 CV 模型**：用 ResNet 做类比，但强调 Transformer 中残差连接对梯度流的依赖更强，因为 Attention 层的雅可比矩阵更不稳定。
- **如果你是校招无项目**：聚焦经典论文《Attention Is All You Need》和《Deep Residual Learning》，复现一个 6 层 Transformer，对比有无残差连接的 loss 曲线，展示对原理的动手验证。
- 《Attention Is All You Need》 - 原始 Transformer 论文，残差连接 + Post-LN 实现
- 《Deep Residual Learning for Image Recognition》 - ResNet 残差连接原理
- 《On Layer Normalization in the Transformer Architecture》 - Pre-LN vs Post-LN 实验对比
- 《ReZero is All You Need: Fast Convergence at Large Depth》 - ReZero 技巧，可学习残差缩放
- 《Transformers without Tears: Improving the Normalization of Self-Attention》 - 探讨 Transformer 训练稳定性

---
