---
slug: basics-tk010
no: "910"
title: "Self-Attention 是什么"
question: "Self-Attention 是什么"
excerpt: "面试官想考察的不仅是“背公式”，而是你对 Self-Attention 本质的理解深度和工程直觉。这是一道 基础概念 + 工程取舍 混合题。刁钻点在于：① 能否清晰区分 Self-Attention 与 Cross-At"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3939
updated: "2026-09-29"
---

## Self-Attention 是什么

#### 1️⃣ 考察意图

面试官想考察的不仅是“背公式”，而是你对 Self-Attention 本质的理解深度和工程直觉。这是一道 **基础概念 + 工程取舍** 混合题。刁钻点在于：① 能否清晰区分 Self-Attention 与 Cross-Attention 的适用场景；② 是否理解为什么需要除以 √d（缩放点积），以及不缩放的后果；③ 能否解释多头机制背后的“子空间学习”动机。答好了能展示你对 Transformer 底层原理的扎实掌握，以及从数学到落地的完整流程能力。

#### 2️⃣ 标准答

**定义与核心公式**Self-Attention 是一种序列建模机制，核心是让序列中每个 token 通过“注意力权重”聚合所有其他 token 的信息。给定输入序列 X，通过三个线性变换得到 Q、K、V（维度均为 d_k）：`Attention(Q,K,V) = softmax(QK^T / √d_k) V`其中 QK^T 计算所有 token 对的相似度得分，除以 √d_k 防止 softmax 进入梯度饱和区（即点积方差随 d_k 增大而增大，缩放后保持梯度稳定）。

**为什么必须除以 √d_k？**假设 Q 和 K 的每个元素独立服从标准正态分布，则 QK^T 的每个元素方差为 d_k。若不缩放，当 d_k 很大时（如 1024），点积值会非常大，softmax 输出接近 one-hot，梯度趋近于 0，导致训练困难。除以 √d_k 将方差拉回 1，保持梯度流动。这是一个典型的 **数值稳定性 trade-off**：不缩放 → 梯度消失；缩放 → 保留 softmax 的区分度。

**多头机制：并行子空间学习**多头将 Q、K、V 拆成 h 个头（每个头维度 d_k/h），每个头独立计算 Self-Attention，然后拼接并线性投影。动机：单头注意力只能捕获一种关系模式（如语法依赖或语义相似性），多头允许模型在不同子空间学习不同类型的依赖。例如，一个头可能关注“主谓关系”，另一个头关注“指代消解”。实际中，h 通常取 8-16，d_k 为 64-128。

**实际落地的坑与解法**

- **坑 1：长序列 O(n²) 复杂度**。Self-Attention 计算量随序列长度平方增长。解法：对于 4K+ 长文本，使用 FlashAttention（通过 tiling 和 kernel fusion 减少显存读写）或稀疏注意力（如 Longformer 的滑动窗口 + 全局 token）。
- **坑 2：位置信息缺失**。Self-Attention 是置换不变的（permutation invariant），即打乱 token 顺序后输出不变。解法：必须注入位置编码。常用 RoPE（旋转位置编码）或 ALiBi（线性偏置），前者通过旋转矩阵编码相对位置，后者直接给注意力得分加线性偏置。RoPE 在 LLaMA 系列中表现更优，因为它能外推到更长序列。

**与 Cross-Attention 的区别**

- Self-Attention：Q、K、V 来自同一序列，用于建模序列内部依赖（如 BERT 的 MLM 任务）。
- Cross-Attention：Q 来自一个序列（如解码器），K、V 来自另一个序列（如编码器输出），用于跨序列信息交互（如机器翻译的 encoder-decoder 注意力）。关键取舍：Self-Attention 适合“全局上下文融合”，Cross-Attention 适合“条件生成”。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，数学定义——Self-Attention 通过 QK^T 计算相似度并加权聚合 V，关键细节是除以 √d_k 防止梯度消失；第二，工程动机——多头机制让模型在不同子空间学习不同依赖模式，而位置编码（如 RoPE）解决了置换不变性；第三，与 Cross-Attention 的区别——前者 QKV 同源用于内部建模，后者跨源用于条件生成。总结一句：Self-Attention 是 Transformer 的核心，通过全局注意力捕获上下文，但需注意 O(n²) 复杂度和位置编码的注入。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 Self-Attention 比 RNN 更适合长序列建模？

> **应对策略**：从并行性和路径长度切入。RNN 是顺序计算，第 t 步依赖第 t-1 步的隐状态，无法并行，且长距离依赖需要经过 O(n) 步才能传递（梯度容易消失）。Self-Attention 通过 QK^T 一步计算所有 token 对，并行度高，且任意两个 token 的路径长度为 1（直接连接），避免了梯度衰减。但代价是 O(n²) 显存，所以长序列需用 FlashAttention 或稀疏注意力做 trade-off。

**追问 2**：多头注意力中，头的数量 h 和每个头的维度 d_k/h 如何选择？有什么经验法则？

> **应对策略**：给出具体数字和 trade-off。经验上，h 通常取 8-16，每个头维度 64-128。例如，BERT-base 用 h=12，d_k=64；GPT-3 用 h=96，d_k=128。如果 h 太大（如 32），每个头维度太小（如 32），表达能力不足；如果 h 太小（如 2），子空间多样性不够。一个实际坑：h 必须能整除 d_k，否则无法均匀拆分。另外，头之间可能存在冗余（部分头学到相似模式），可以用 head pruning 技术（如分析注意力熵）剪掉冗余头以加速推理。

**追问 3**：Self-Attention 的 softmax 可以用其他函数替代吗？比如 ReLU？

> **应对策略**：可以，但需注意数值特性。ReLU 直接替代 softmax 会导致注意力权重不归一化，且负值被截断，丢失信息。实际替代方案有：① **ReLU + 归一化**（如 ReLU 后除以 L1 范数），计算更快但梯度不稳定；② **Sigmoid**（逐元素激活），不归一化，适合稀疏注意力场景；③ **Gated Attention**（如 Linformer 用线性投影近似）。主流仍用 softmax 因为其概率解释和梯度特性，但 ReLU 变体在长序列中可降低计算量（如 ReLU² 在 Efficient Attention 中使用）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 回答“Self-Attention 就是 QKV 计算，公式是 softmax(QK^T)V”，不提除以 √d_k 的原因。✅ 必须解释缩放动机：防止点积方差过大导致 softmax 梯度消失，并给出数学推导（方差 d_k → 缩放后方差 1）。
- ❌ 混淆 Self-Attention 和 Cross-Attention，说“Self-Attention 用于编码器，Cross-Attention 用于解码器”。✅ 准确表述：编码器用 Self-Attention，解码器同时用 Self-Attention（掩码版）和 Cross-Attention（Q 来自解码器，K/V 来自编码器）。
- ❌ 认为多头注意力只是“多个头并行计算”，不提子空间学习动机。✅ 强调：每个头学习不同特征子空间（如语法、语义、指代），拼接后通过线性层融合，增强模型表达能力。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“Self-Attention 在检索增强中的位置编码”切入，比如在长文档检索中如何用 RoPE 处理超长上下文，以及如何用 FlashAttention 优化检索速度。
- **如果你只做过传统 NLP**：用“Self-Attention 替代 LSTM 的动机”类比，强调并行计算和长距离依赖捕获，并对比两者在文本分类任务中的效果差异。
- **如果你是校招无项目**：聚焦“Self-Attention 的数学推导和代码实现”，展示你手写过单头注意力层，并可视化过注意力权重矩阵（如用 SST-2 数据集），分析模型关注模式。
- 《Attention Is All You Need》（Vaswani et al., 2017）—— 原始论文，定义 Self-Attention 和 Transformer。
- 《RoFormer: Enhanced Transformer with Rotary Position Embedding》（Su et al., 2021）—— RoPE 位置编码的论文。
- 《FlashAttention: Fast and Memory-Efficient Exact Attention》（Dao et al., 2022）—— 解决 O(n²) 显存问题的工程方案。
- 《Efficient Transformers: A Survey》（Tay et al., 2020）—— 稀疏注意力、线性注意力等变体综述。
- 《BERT: Pre-training of Deep Bidirectional Transformers》（Devlin et al., 2019）—— Self-Attention 在预训练中的经典应用。

---
