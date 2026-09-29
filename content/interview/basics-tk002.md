---
slug: basics-tk002
no: "902"
title: "GPT和Bert的mask有什么区别"
question: "GPT和Bert的mask有什么区别"
excerpt: "面试官想考察你对 Transformer 架构底层机制的理解深度，而非简单背诵。核心是区分两种 mask 的设计哲学：BERT 的 Masked Language Model (MLM) 是“完形填空”，GPT 的 Ca"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4741
updated: "2026-09-29"
---

## GPT和Bert的mask有什么区别

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 架构底层机制的理解深度，而非简单背诵。核心是区分两种 mask 的设计哲学：BERT 的 Masked Language Model (MLM) 是“完形填空”，GPT 的 Causal Mask 是“接龙”。刁钻点在于：很多人只记得“BERT 双向，GPT 单向”，但说不清具体在注意力矩阵上如何实现、训练和推理阶段的差异、以及为何导致应用场景不同。答好了能展示你对自注意力机制、训练目标与模型行为之间因果关系的硬核理解，这是大模型岗位的基础门槛。

#### 2️⃣ 标准答

**核心差异：一个遮输入，一个遮注意力**

- **BERT 的 Mask：输入层随机替换 + 全可见注意力**
- **训练时**：随机选择 15% 的 token，其中 80% 替换为 `[MASK]`，10% 替换为随机 token，10% 保持不变。模型需要根据上下文预测被遮住的 token。
- **注意力机制**：使用**双向注意力**。注意力矩阵中，每个 token 都能看到序列中所有其他 token（包括被 `[MASK]` 的 token 本身，但 `[MASK]` 的 embedding 已被破坏）。这通过**不施加任何因果 mask** 实现，即注意力分数矩阵 `S` 不做上三角掩码。
- **推理时**：`[MASK]` token 不再出现，模型直接处理完整句子，但此时它已经学会了利用双向上下文信息。这导致了**训练-推理不一致**（discrepancy），是 BERT 的一个已知问题。
- **GPT 的 Mask：注意力矩阵上三角置负无穷**
- **训练时**：使用**因果注意力（Causal Attention）**。在计算注意力分数矩阵 `S = QK^T / sqrt(d_k)` 后，将矩阵的上三角部分（包括对角线？不，GPT 通常允许看到当前位置，即对角线保留）全部设置为 `-inf`。这样经过 softmax 后，当前位置 `i` 只能看到 `j <= i` 的 token。
- **实现细节**：通过一个**上三角矩阵**（`torch.triu`）实现，值为 0 或 `-inf`。例如，PyTorch 代码中 `mask = torch.triu(torch.ones(L, L), diagonal=1).bool()`，然后 `attn_scores.masked_fill_(mask, float('-inf'))`。
- **推理时**：与训练时完全一致，都是自回归地逐个生成 token。每一步只依赖已生成的 token，没有不一致问题。

**工程取舍与落地坑**

- **为什么 BERT 不直接用因果 mask？** 因为理解任务（如情感分类、NER）需要全局上下文。例如判断“苹果很好吃”中的“苹果”是水果还是公司，需要看后面的“好吃”。双向注意力是理解任务的刚需。
- **为什么 GPT 不用双向注意力？** 因为生成任务必须保证因果性。如果生成“我喜欢吃”时能看到后面的“苹果”，模型就会“作弊”，无法学习真正的语言概率分布。这是自回归模型的根本约束。
- **实际落地的坑：BERT 的 [MASK] 比例选择**
- **坑**：15% 的 mask 比例是经验值。如果比例太高，模型学不到足够上下文；太低，训练信号不足。在特定领域（如代码、医疗）可能需要调整。
- **解法**：可以通过实验调优。例如，在代码补全任务中，可以尝试 20% 或 25% 的 mask 比例，因为代码中 token 依赖更稀疏。同时，`[MASK]` 替换策略（80/10/10）是为了缓解训练-推理不一致，但仍有 gap。后续工作如 **ELECTRA** 用判别器替代生成器，彻底避免了 `[MASK]` 问题。
- **实际落地的坑：GPT 的因果 mask 与 KV Cache**
- **坑**：推理时，如果每次都重新计算所有 token 的注意力，复杂度是 O(n²)，非常慢。
- **解法**：使用 **KV Cache**。在自回归生成时，只计算新 token 的 Query，并从缓存中读取之前所有 token 的 Key 和 Value。这要求 mask 必须是**严格因果的**（只依赖过去），否则缓存无法工作。这也是 GPT 架构高效推理的基础。

**变体与演进**

- **XLNet**：使用**排列语言模型（Permutation Language Model）**，通过打乱 token 顺序，让模型在自回归框架下学到双向上下文。它仍然使用因果 mask，但通过排列组合实现了“伪双向”。
- **UniLM**：在预训练时动态切换 mask 类型，让一个模型同时支持理解（双向）和生成（单向）任务。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，**实现层面**，BERT 的 mask 是在输入层随机替换 token 为 `[MASK]`，注意力是全双向的；GPT 的 mask 是在注意力矩阵的上三角置为负无穷，实现因果约束。第二，**训练目标层面**，BERT 是完形填空，GPT 是自回归预测下一个 token。第三，**工程取舍**，BERT 的双向注意力适合理解任务，但存在训练-推理不一致；GPT 的因果注意力保证了生成的一致性，但牺牲了上下文广度。总结一句：两种 mask 本质是‘理解’与‘生成’两种范式在注意力机制上的具体映射。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：BERT 的 `[MASK]` 策略中，为什么要有 10% 替换为随机 token 和 10% 保持不变？直接全部替换为 `[MASK]` 不行吗？

> 不行。如果全部替换为 `[MASK]`，模型在预训练时只见过 `[MASK]` 这种特殊 token，微调时却要处理正常 token，会导致严重的分布偏移。10% 保持不变是为了让模型知道“即使 token 没被遮，也要输出正确表示”；10% 替换为随机 token 是为了让模型学会“即使输入是错的，也要根据上下文纠错”。这 80/10/10 的比例是 Google 团队通过实验找到的平衡点，目的是最小化预训练-微调之间的 gap。

**追问 2**：GPT 的因果 mask 在实现时，对角线（当前位置）是可见还是不可见？为什么？

> 对角线通常是可见的。因为自回归任务中，预测第 `i` 个 token 时，模型应该能看到第 `i` 个 token 本身（通过其 embedding），但注意力计算时，`Q_i` 和 `K_i` 的点积会给出一个分数，这个分数代表“当前位置对自己的关注程度”。如果对角线不可见，模型就失去了“自我关注”的能力，这会影响表示学习。实际上，GPT 的 mask 是 `torch.triu(..., diagonal=1)`，即只遮住严格上三角（`j > i`），对角线（`j == i`）保留。

**追问 3**：如果我想用 BERT 做生成任务，或者用 GPT 做分类任务，你会怎么改造 mask？

> 用 BERT 做生成：可以借鉴 **UniLM** 的思路，在注意力矩阵上动态应用不同的 mask 模式。例如，对于编码器部分用双向 mask，解码器部分用因果 mask，并通过一个特殊的 `[SEP]` token 分隔。但效果通常不如原生 GPT，因为 BERT 的预训练目标不是自回归。用 GPT 做分类：最简单的方法是在序列末尾加一个 `[CLS]` token，然后取它的 hidden state 做分类。但 GPT 的单向性会损失后文信息，效果不如 BERT。更好的做法是使用 **Prefix LM**，即输入前缀用双向 mask，生成部分用因果 mask，如 GLM 和 ChatGLM 的做法。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“BERT 的 mask 是随机遮住 token，GPT 的 mask 是遮住后面的 token” → ✅ 必须精确：BERT 的 mask 是**输入层替换**（`[MASK]` token），GPT 的 mask 是**注意力矩阵上三角置负无穷**。前者改变输入，后者改变计算过程。
- ❌ 说“BERT 是双向的，所以所有 token 都能互相看到” → ✅ 必须区分训练和推理：训练时被 `[MASK]` 的 token 看不到自己的真实值（因为被替换了），但能看到其他 token；推理时没有 `[MASK]`，所有 token 都能互相看到。
- ❌ 说“GPT 的 mask 就是上三角全为 0” → ✅ 必须强调是 `-inf` 而不是 0，因为 softmax 后 `-inf` 会变成 0，而 0 经过 softmax 后不是 0，会导致信息泄露。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成”的视角切入，说明 BERT 类模型（如 DPR）用于检索时，双向 mask 能更好地理解 query 和 document 的语义；GPT 类模型用于生成时，因果 mask 保证了流畅性。可以提到你在项目中如何选择 mask 类型来优化 pipeline。
- **如果你只做过传统 NLP**：用“完形填空 vs 接龙”的类比迁移，说明两种 mask 对应不同的语言建模范式。可以提到你如何从 LSTM 的双向/单向理解过渡到 Transformer 的 mask 机制，强调对注意力矩阵的数学理解。
- **如果你是校招无项目**：聚焦论文复现，说明你手写过简化版 BERT 和 GPT 的注意力代码，对比过两种 mask 对 loss 曲线和生成质量的影响。可以提到你使用 Hugging Face 的 `transformers` 库可视化过注意力热力图，直观展示了双向和单向的差异。
- BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding (Devlin et al., 2019)
- Improving Language Understanding by Generative Pre-Training (Radford et al., 2018) - GPT 原始论文
- XLNet: Generalized Autoregressive Pretraining for Language Understanding (Yang et al., 2019)
- UniLM: Unified Language Model Pre-training for Natural Language Understanding and Generation (Dong et al., 2019)
- ELECTRA: Pre-training Text Encoders as Discriminators Rather Than Generators (Clark et al., 2020) - 解决 `[MASK]` 问题的方案

---
