---
slug: basics-tk048
no: "948"
title: "What is cross-entropy loss, and how is it applied during transformer training"
question: "What is cross-entropy loss, and how is it applied during transformer training"
excerpt: "面试官想确认你是否真正理解交叉熵损失在 Transformer 训练中的角色，而非仅背公式。考察类型是“背概念 + 工程取舍”，刁钻点在于：交叉熵看似简单，但面试官会深挖其与 teacher forcing、label"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3340
updated: "2026-09-29"
---

## What is cross-entropy loss, and how is it applied during transformer training

#### 1️⃣ 考察意图

面试官想确认你是否真正理解交叉熵损失在 Transformer 训练中的角色，而非仅背公式。考察类型是“背概念 + 工程取舍”，刁钻点在于：交叉熵看似简单，但面试官会深挖其与 teacher forcing、label smoothing、困惑度的关联，以及为什么它天然适合自回归语言模型。答好了能展示你对损失函数设计动机的洞察，以及处理过拟合/生成多样性的实战经验。

#### 2️⃣ 标准答

**定义与公式**交叉熵损失衡量预测分布 p 与真实分布 y 的差异：H(y, p) = -\sum_{i} y_i \log(p_i)在 Transformer 语言模型训练中，真实分布通常是 one-hot 向量（目标 token 位置为 1，其余为 0），预测分布来自 decoder 输出的 logits 经 softmax 后的概率。

**在 Transformer 训练中的应用**

- **Teacher forcing**：训练时，每个时间步的输入是真实 token（而非模型预测），避免误差累积。对每个位置，计算交叉熵后取平均作为 batch loss。
- **具体流程**：

1. Decoder 输出 logits 矩阵（形状 `[batch_size, seq_len, vocab_size]`）。
2. 对每个时间步，用 softmax 归一化得到概率。
3. 与目标 token 的 one-hot 向量计算交叉熵，忽略 padding 位置（通过 mask）。
4. 所有有效位置 loss 取平均，反向传播。

**为什么交叉熵适合自回归模型**

- 自回归任务本质是分类：每个时间步预测下一个 token 的类别（vocab 大小）。交叉熵直接优化分类准确率，梯度形式为 p_i - y_i，对错误预测惩罚大。
- 与困惑度（PPL）直接挂钩：\text{PPL} = \exp(\text{cross-entropy})，PPL 越低，模型越“不困惑”。

**工程取舍与坑**

- **Label smoothing**：将 one-hot 目标替换为平滑分布（如 0.9 给真实 token，0.1 均分给其他 token）。
- 为什么做：防止模型过度自信（overconfident），提升泛化性和生成多样性。
- 坑：smoothing 系数过大（如 0.3）会导致训练不稳定，PPL 虚高但生成质量下降。实际常用 0.1。
- **实际落地的坑**：
- **Padding mask 遗漏**：未忽略 padding 位置的 loss，导致模型学“预测 [PAD]”的偏差，PPL 虚低但生成乱码。
- **梯度爆炸**：交叉熵在 softmax 前 logits 过大时，梯度接近 0（饱和区）。解法：用 logits 的 L2 正则化或 gradient clipping。

**与对比损失的区别**

- 对比损失（如 InfoNCE）用于表示学习，强调正负样本区分；交叉熵直接优化 token 级分类，更适合生成任务。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、Transformer 应用、工程优化三个层面回答。定义上，交叉熵衡量预测与真实分布的差异，公式为 -sum(y_i * log(p_i))。在 Transformer 训练中，它对 decoder 每个时间步的 logits 计算 softmax 后，与 one-hot 目标计算 loss，配合 teacher forcing 和 padding mask。工程上，常用 label smoothing 防止过拟合，系数设为 0.1。总结一句：交叉熵是自回归语言模型训练的核心损失，直接优化 token 预测准确率，并与困惑度等价。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么不用均方误差（MSE）替代交叉熵？

> 交叉熵的梯度是 p_i - y_i，对错误预测（如真实 token 概率低）惩罚大，收敛快。MSE 的梯度是 (p_i - y_i) \cdot p_i \cdot (1 - p_i)，在概率接近 0 或 1 时梯度消失，导致训练缓慢。此外，交叉熵与 softmax 天然配合，输出概率和为 1，符合分类任务假设。

**追问 2**：训练时 teacher forcing 和推理时自回归的 gap 怎么处理？

> 这是 exposure bias 问题。解法包括：1）Scheduled sampling：训练时以概率用模型预测替换真实输入，概率随训练衰减。2）强化学习（如 RLHF）直接优化生成序列的奖励。3）对比学习（如 SimPO）让模型区分好/坏生成。实际中，scheduled sampling 容易引入噪声，RLHF 更稳定但成本高。

**追问 3**：label smoothing 如何影响生成多样性？

> Label smoothing 让模型对非目标 token 也分配小概率，避免 one-hot 的“绝对自信”。这能提升生成多样性（如 self-BLEU 降低），但过度平滑（系数 > 0.2）会导致生成内容模糊（如重复常见词）。实际调参时，用 PPL 和 self-BLEU 联合评估，找到平衡点。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只背公式，说“交叉熵就是 -sum(y * log(p))”，不提 Transformer 中的 teacher forcing 和 padding mask。→ ✅ 必须结合训练流程：每个时间步的 logits → softmax → 与 one-hot 计算 loss → 忽略 padding → 平均。
- ❌ 认为交叉熵只用于分类，不解释为什么适合自回归生成。→ ✅ 强调自回归本质是逐 token 分类，交叉熵直接优化预测准确率，且与 PPL 等价。
- ❌ 说 label smoothing 总是提升性能，不提 trade-off。→ ✅ 指出系数过大（如 0.3）会导致 PPL 虚高、生成质量下降，实际常用 0.1。

#### 6️⃣ 简历呼应

- **如果你有 LLM 训练项目**：从训练 loss 曲线切入，说明交叉熵配合 label smoothing 如何降低 PPL 并提升生成多样性，可举例你调参时发现 smoothing 系数 0.1 比 0.2 的 self-BLEU 更低。
- **如果你只做过传统 NLP**：用分类任务类比（如情感分析），交叉熵是标准损失，但 Transformer 中多了 teacher forcing 和 mask，强调你理解序列级 loss 计算。
- **如果你是校招无项目**：聚焦论文复现，如 GPT-2 训练用交叉熵 + label smoothing，你实现过从 logits 到 loss 的完整流程，并对比了有无 smoothing 的 PPL 差异。
- 《Attention Is All You Need》中关于训练细节的章节（label smoothing 系数 0.1）
- 《Language Models are Unsupervised Multitask Learners》（GPT-2 训练 loss 设计）
- 《A Survey of Loss Functions for Sequence Generation》
- PyTorch 官方文档：`torch.nn.CrossEntropyLoss` 的 `ignore_index` 参数用法
- 《Label Smoothing: A Recipe for Better Generalization》

---
