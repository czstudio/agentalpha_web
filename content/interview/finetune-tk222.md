---
slug: finetune-tk222
no: "1122"
title: "Q15:大模型训练中常用的优化器有哪些？AdamW 和 Adam 的区别是什么"
question: "Q15:大模型训练中常用的优化器有哪些？AdamW 和 Adam 的区别是什么"
excerpt: "面试官想验证你对优化器原理的“真懂”而非“背概念”。表面是列举优化器，核心是考察：你是否理解 AdamW 为何成为大模型训练的事实标准，以及能否清晰区分 L2 正则化与解耦权重衰减的数学差异。刁钻点在于：很多人误以为 A"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3845
updated: "2026-09-29"
---

## Q15:大模型训练中常用的优化器有哪些？AdamW 和 Adam 的区别是什么

`P0` · `llm_training`

🏷 标签：`optimizer`, `adamw`, `adam`, `training`

#### 1️⃣ 考察意图

面试官想验证你对优化器原理的“真懂”而非“背概念”。表面是列举优化器，核心是考察：**你是否理解 AdamW 为何成为大模型训练的事实标准**，以及能否清晰区分 L2 正则化与解耦权重衰减的数学差异。刁钻点在于：很多人误以为 AdamW 只是 Adam 加 weight decay，但实际是**更新公式的重新推导**。答好了能展示你对训练稳定性、泛化性能的工程直觉，以及阅读原始论文（Decoupled Weight Decay Regularization）的深度。

#### 2️⃣ 标准答

**常用优化器全景**

- **SGD + Momentum**：经典基线，对 CNN 有效，但大模型训练收敛慢、易陷鞍点。
- **Adam**：自适应学习率，结合动量与 RMSProp，适合 NLP 和 Transformer，但存在泛化性差、权重衰减耦合问题。
- **AdamW**：Adam 的修正版，将权重衰减从梯度更新中解耦，直接作用在参数上。**大模型训练首选**（GPT、LLaMA、BERT 均使用）。
- **LAMB**：针对大 batch size 设计，在 BERT 预训练中 batch size 达 65536 时仍稳定，通过逐层学习率缩放避免梯度爆炸。
- **Adafactor**：内存优化版 Adam，将二阶矩估计分解为行/列因子，适合参数规模超 10B 的模型（如 T5）。
- **Sophia**：2023 年新方法，用 Hessian 对角近似替代二阶矩，在 GPT-2 上比 AdamW 快 2 倍，但尚未成为主流。

**AdamW 与 Adam 的核心区别**

- **数学公式差异**：Adam：权重衰减被合并到梯度中，即 `g_t = ∇L(θ_t) + λθ_t`，然后更新 `θ_{t+1} = θ_t - η·m_t/(√v_t+ε)`。
- AdamW：权重衰减从梯度中剥离，直接在参数更新后执行：`θ_{t+1} = θ_t - η·m_t/(√v_t+ε) - η·λθ_t`。
- 关键：Adam 的 λ 被学习率 η 和自适应项 `m_t/(√v_t+ε)` 共同缩放，导致实际衰减量不稳定；AdamW 的 λ 仅被 η 缩放，更可控。
工程取舍：
- Adam 的 L2 正则化在自适应学习率下效果差：当梯度稀疏时，`√v_t` 小，导致权重衰减被放大，破坏泛化。
- AdamW 的解耦让权重衰减与学习率解绑，**对学习率更鲁棒**，在 1e-4 到 1e-3 范围内均能稳定训练。
实际落地的坑：
- 坑：从 Adam 迁移到 AdamW 时，若直接复用 weight decay 值（如 0.01），可能导致模型欠拟合。**解法**：通常需要调大 weight decay 至 0.1-0.5（如 LLaMA 使用 0.1），并配合余弦学习率衰减。
- 坑：混合精度训练（FP16）下，AdamW 的权重衰减若在参数更新前执行，会与梯度缩放冲突。**解法**：在 NVIDIA APEX 或 PyTorch AMP 中，确保 weight decay 在 optimizer.step() 内部正确处理，而非手动加在 loss 上。

**实践建议**

- 大模型训练标配：**AdamW + 余弦学习率衰减 + warmup**（前 2000 步线性升温至峰值 lr）。
- 超参数：β1=0.9, β2=0.95（LLaMA 设置），ε=1e-8，weight decay=0.1。
- 内存优化：使用 Adafactor 或 8-bit Adam（bitsandbytes 库）减少显存占用。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，常用优化器包括 SGD、Adam、AdamW、LAMB、Adafactor 等，大模型训练以 AdamW 为主；第二，AdamW 与 Adam 的核心区别在于权重衰减是否解耦——Adam 将 weight decay 作为 L2 正则化加入梯度，导致衰减量被自适应学习率扭曲，而 AdamW 直接对参数做衰减，更稳定；第三，实际落地时需注意 weight decay 值需调大（如 0.1），并配合余弦衰减和 warmup。总结一句：AdamW 通过解耦权重衰减，解决了 Adam 在大模型上的泛化问题，成为事实标准。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么说 Adam 的权重衰减是“耦合”的？能举个具体例子吗？

> 假设参数 θ 的梯度 g 很小（接近 0），Adam 的自适应项 `m_t/(√v_t+ε)` 会放大更新步长，此时 L2 正则化项 λθ 也被放大，导致权重衰减过度。例如在稀疏特征场景下，低频参数的梯度小，Adam 会对其施加过强的衰减，破坏模型对长尾模式的记忆。AdamW 将 λθ 独立于自适应项，无论梯度大小，衰减量始终为 η·λθ，更可控。

**追问 2**：LAMB 优化器在什么场景下比 AdamW 更优？它的核心创新是什么？

> LAMB 专为大 batch size 设计。当 batch size 超过 4096 时，AdamW 的逐层学习率不一致会导致梯度爆炸或消失。LAMB 通过计算每层参数的更新幅度与参数幅度的比值（trust ratio），对每层学习率进行自适应缩放，确保更新步长与参数范数成比例。例如在 BERT 预训练中，batch size 从 256 提升到 65536 时，LAMB 仍能保持收敛，而 AdamW 需要大量调参。但 LAMB 计算开销略高，且在小 batch 下无优势。

**追问 3**：Adafactor 如何节省显存？它适合所有大模型吗？

> Adafactor 将二阶矩估计 `v_t` 分解为行因子 `R_t` 和列因子 `C_t` 的乘积，显存从 O(n²) 降至 O(n)。例如在 T5-11B 中，Adafactor 相比 AdamW 节省约 40% 显存。但缺点是对学习率敏感，且在某些任务（如 GPT-2 文本生成）上收敛速度略慢于 AdamW。适合参数规模超 10B 且显存受限的场景，如 T5、PaLM。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“AdamW 就是 Adam 加 weight decay，效果更好” → ✅ 必须强调“解耦”的数学差异：Adam 的 weight decay 是 L2 正则化，AdamW 是独立操作，更新公式不同。
- ❌ 说“大模型训练只用 AdamW，其他优化器没用” → ✅ 应提及 LAMB（大 batch）、Adafactor（内存优化）、Sophia（加速），展示知识广度。
- ❌ 说“weight decay 越大越好，能防止过拟合” → ✅ 需说明 weight decay 过大会导致欠拟合（如 LLaMA 用 0.1 而非 0.01），且需配合学习率衰减。

#### 6️⃣ 简历呼应

- **如果你有 LLM 预训练项目**：从实际调参经验切入，例如“在训练 1.3B 参数模型时，我从 Adam 切换到 AdamW 后，验证集困惑度下降 0.3，且对学习率从 3e-4 到 1e-3 都稳定”。
- **如果你只做过传统 CV 任务**：用 SGD+Momentum 类比，说明“CNN 中 SGD 的权重衰减是隐式 L2，而 Transformer 的自适应优化器需要解耦，这是架构差异导致的”。
- **如果你是校招无项目**：聚焦论文复现，例如“我复现了 GPT-2 训练，对比 Adam 和 AdamW 在 WikiText-103 上的权重范数变化，发现 AdamW 的权重范数更平滑，验证了解耦效果”。

#### 7️⃣ 延伸阅读

- Decoupled Weight Decay Regularization (Loshchilov & Hutter, 2019) —— AdamW 原始论文
- Large Batch Optimization for Deep Learning: Training BERT in 76 minutes (You et al., 2020) —— LAMB 论文
- Adafactor: Adaptive Learning Rates with Sublinear Memory Cost (Shazeer & Stern, 2018)
- Sophia: A Scalable Stochastic Second-order Optimizer for Language Model Pre-training (Liu et al., 2023)
- PyTorch 官方文档：torch.optim.AdamW 与 torch.optim.Adam 的源码对比

---
