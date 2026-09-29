---
slug: basics-tk121
no: "1021"
title: "| Q21 | How are the outputs of multiple heads combined and projected back in the multi-head attention in the Transformer model"
question: "| Q21 | How are the outputs of multiple heads combined and projected back in the multi-head attention in the Transformer model"
excerpt: "面试官想验证你对Transformer核心组件——多头注意力（Multi-Head Attention）——的实现细节是否理解到位，而非仅停留在“多个头并行计算”的宏观概念。这道题属于工程取舍+系统设计类型，刁钻点在于："
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4101
updated: "2026-09-29"
---

## | Q21 | How are the outputs of multiple heads combined and projected back in the multi-head attention in the Transformer model

#### 1️⃣ 考察意图

面试官想验证你对Transformer核心组件——多头注意力（Multi-Head Attention）——的**实现细节**是否理解到位，而非仅停留在“多个头并行计算”的宏观概念。这道题属于**工程取舍+系统设计**类型，刁钻点在于：多数候选人能背出“拼接+投影”的公式，但说不清**为什么需要投影**、**投影矩阵W_O的维度设计**以及**与残差连接、层归一化的配合**。答好了能展示你对Transformer架构的底层理解、矩阵运算的工程直觉，以及从论文（Vaswani et al., 2017）到实际部署（如FlashAttention中的优化）的落地能力。

#### 2️⃣ 标准答

多头注意力输出的合并与投影，是Transformer中**信息融合与维度对齐**的关键步骤，具体分为三步：

- **第一步：每个头的独立输出**每个注意力头（共h个，通常h=8或16）计算后得到一个序列输出，维度为`(batch_size, seq_len, d_v)`。其中`d_v = d_model / h`（假设d_k=d_v，常见如d_model=512, h=8, d_v=64）。每个头只关注输入的不同子空间（通过不同的Q/K/V投影矩阵W_Q^i, W_K^i, W_V^i实现），输出是“局部视角”的表示。
- **第二步：沿特征维度拼接**将所有h个头的输出沿最后一个维度（特征维度）拼接，得到维度为`(batch_size, seq_len, h * d_v) = (batch_size, seq_len, d_model)`的张量。**注意**：拼接顺序必须与头索引一致，否则会打乱子空间信息。实际实现中（如PyTorch的`torch.cat`或直接reshape），这一步是纯内存操作，无参数学习。
- **第三步：线性投影（W_O）**通过一个可学习的权重矩阵`W_O`（形状为`d_model × d_model`，加上偏置项）将拼接后的张量投影回`d_model`维度。公式为：`MultiHead(Q,K,V) = Concat(head_1,...,head_h) · W_O`这一步的**工程取舍**在于：
- **为什么不用直接求和或平均？** 线性投影允许模型学习**如何加权融合**不同头的信息。例如，某些头可能对语法敏感，另一些对语义敏感，W_O可以动态调整它们的贡献比例。直接平均会丢失这种灵活性。
- **为什么W_O是方阵？** 保持输入输出维度一致，是为了**无缝对接残差连接**（`x + MultiHead(x)`）和层归一化。如果输出维度变化，残差加法会维度不匹配，需要额外投影，增加参数量和计算开销。
- **实际落地的坑**：在训练大模型时，W_O的初始化很关键。若使用默认的均匀分布初始化，可能导致梯度消失或爆炸。**解法**：采用Xavier/Glorot初始化，并配合LayerNorm的scale参数（如`nn.LayerNorm(d_model)`的`elementwise_affine=True`）来稳定训练。
- **第四步：与残差连接和层归一化的配合**投影后的输出直接加到输入上（`x + MultiHead(x)`），然后过LayerNorm。这要求投影后的输出**与输入x的维度、数值范围**大致匹配。实践中，W_O的权重通常初始化为较小值（如标准差0.02），确保残差分支的初始贡献较小，避免破坏预训练稳定性。

**总结**：多头注意力的合并不是简单的“拼起来”，而是通过一个可学习的线性投影，让模型**自适应地融合不同子空间的信息**，同时保持维度一致以支持残差架构。这一设计是Transformer成功的关键之一。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，每个头的输出维度是d_v，拼接后得到d_model；第二，通过一个可学习的线性投影W_O（d_model × d_model）融合多头信息，而不是简单平均，这允许模型动态调整每个头的贡献；第三，投影后的输出与输入维度一致，才能直接加残差连接。总结一句：多头注意力的合并本质是‘拼接+可学习投影’，目的是在保持维度对齐的同时实现子空间信息的自适应融合。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么W_O的维度是d_model × d_model，而不是h × d_v × d_model？如果头数h变化，W_O需要重新训练吗？

> 应对策略：W_O是单个矩阵，形状为d_model × d_model，等价于将拼接后的h*d_v维向量投影到d_model。如果写成h × d_v × d_model，那是一个3D张量，但实际实现中通过reshape和矩阵乘法等价于单次投影。头数h变化时，W_O必须重新训练，因为拼接后的特征空间结构变了（例如h=8时拼接顺序是头1到头8，h=16时顺序和维度都不同）。但在一些变体（如GQA, MQA）中，通过共享K/V头来减少参数量，W_O的维度设计会相应调整。

**追问 2**：在FlashAttention中，多头注意力的合并投影如何优化？是否还保留W_O？

> 应对策略：FlashAttention的核心优化在注意力计算阶段（通过分块和重计算减少显存），但**合并投影W_O仍然保留**，因为它是多头注意力的必要组件。不过，FlashAttention在实现中会将W_O的矩阵乘法与后续的残差连接、LayerNorm融合（kernel fusion），减少显存读写。例如，在H100 GPU上，FlashAttention-2将W_O的投影与dropout、残差加法合并为一个kernel，提升吞吐量约20%。W_O的参数量不变，但计算效率更高。

**追问 3**：如果去掉W_O，直接对多头输出求和，模型会怎样？有没有论文尝试过？

> 应对策略：去掉W_O相当于强制所有头等权重融合，模型表达能力下降。实验表明（如《Analyzing Multi-Head Self-Attention》），某些头在训练后确实有冗余，但W_O允许模型**学习哪些头更重要**。例如，在机器翻译任务中，去掉W_O后BLEU下降约1-2个点。有论文（如《Multi-Head Attention: Collaborate Instead of Concatenate》）尝试用门控机制或注意力池化替代W_O，但参数量和计算开销更高，未成为主流。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“多头输出直接相加，然后过一层全连接层” → ✅ 正确说法：先沿特征维度拼接，再通过一个线性投影（W_O），不是直接相加。相加会丢失每个头的独立维度信息。
- ❌ 说“W_O的维度是h × d_model × d_model，每个头有自己的投影矩阵” → ✅ 正确说法：W_O是单个d_model × d_model矩阵，作用于拼接后的向量。每个头有自己的Q/K/V投影矩阵（W_Q^i, W_K^i, W_V^i），但输出投影是共享的。
- ❌ 说“拼接后维度是hd_v，投影后维度不变” → ✅ 正确说法：拼接后维度是hd_v = d_model，投影后维度仍是d_model，但投影的目的是融合信息，不是改变维度（方阵投影）。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“多头注意力输出投影与检索结果融合”角度切入。例如，在RAG中，检索到的文档通过多头注意力编码后，W_O投影可以视为“将不同检索源的证据加权融合”，类似地，你可以在项目中使用W_O来平衡不同检索策略（如BM25 vs Dense Retrieval）的贡献。
- **如果你只做过传统NLP**：用“特征拼接+线性变换”类比迁移。例如，在文本分类中，你曾将多个特征（词性、实体、情感）拼接后通过全连接层，这与多头注意力的W_O投影本质相同——都是学习特征融合权重。强调你对“维度对齐”和“可学习融合”的理解。
- **如果你是校招无项目**：聚焦论文复现demo。例如，你从零实现了Transformer的MultiHeadAttention模块，包括W_O的初始化（Xavier）、与残差连接的配合，并在MNIST分类任务上验证了梯度传播正确性。可以展示代码片段（如PyTorch的`nn.Linear(d_model, d_model)`）和训练曲线。
- Vaswani et al., "Attention Is All You Need" (2017) - 原始论文，Section 3.2 详细描述多头注意力公式
- PyTorch官方文档：`nn.MultiheadAttention` 实现源码（含W_O的forward逻辑）
- "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness" (2022) - 讨论W_O在kernel fusion中的优化
- "Analyzing Multi-Head Self-Attention: Specialized Heads Do the Heavy Lifting" (2019) - 分析W_O对头贡献的调节作用
- "Efficient Transformers: A Survey" (2022) - 综述多头注意力变体（如GQA, MQA）中W_O的设计差异

---
