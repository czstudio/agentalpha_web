---
slug: basics-tk019
no: "919"
title: "Multi-Head Attention 的作用是什么"
question: "Multi-Head Attention 的作用是什么"
excerpt: "面试官想考察你对 Transformer 核心机制的理解深度，而非简单背诵“多头就是多个注意力头”。真正意图是：你是否清楚多头注意力（MHA）的设计动机——解决单头注意力在表达能力上的瓶颈，以及它如何通过子空间投影实现“"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4353
updated: "2026-09-29"
---

## Multi-Head Attention 的作用是什么

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 核心机制的理解深度，而非简单背诵“多头就是多个注意力头”。真正意图是：你是否清楚多头注意力（MHA）的设计动机——解决单头注意力在表达能力上的瓶颈，以及它如何通过子空间投影实现“并行关注不同语义关系”。刁钻点在于：很多人只答“多关注不同位置”，却说不透“为什么多头比单头好”以及“头数增加的计算代价与收益权衡”。答好了能展示你对模型容量、参数效率、并行化设计的工程直觉。

#### 2️⃣ 标准答

Multi-Head Attention（MHA）的核心作用是**将模型的能力从“单一视角”扩展到“多视角并行”**，从而在保持计算效率的同时，捕捉序列中更丰富的依赖关系。

**1. 设计动机：单头注意力的瓶颈**

- 单头注意力（Single-Head Attention）对 Q、K、V 做一次线性变换后计算注意力权重，本质是**在一个高维空间内做一次加权平均**。
- 问题：一个注意力分布只能聚焦于一种关系（如语法依赖或语义相似性），无法同时捕捉“主语-谓语”和“形容词-名词”等不同层面的模式。例如在“The cat sat on the mat”中，单头可能只关注“cat-sat”的动词关系，忽略“the-mat”的介词关系。

**2. 多头机制：子空间并行**

- 将 Q、K、V 分别通过 h 个不同的线性投影（权重矩阵 W_Q^i, W_K^i, W_V^i）映射到 d_k 维子空间（通常 d_k = d_model / h）。
- 每个头独立计算缩放点积注意力：Attention(Q_i, K_i, V_i) = softmax(Q_i K_i^T / sqrt(d_k)) V_i。
- 关键 trade-off：**降低每个头的维度（d_k 变小）**，使计算量从单头的 O(n^2 * d_model) 变为 O(n^2 * d_k * h) = O(n^2 * d_model)，**总计算量不变**。这是 MHA 的优雅之处——不增加 FLOPs 却提升容量。
- 实际落地坑：头数 h 不是越大越好。当 d_k 过小时（如 d_k < 16），每个头的表达能力急剧下降，注意力分布趋于均匀（softmax 饱和），导致信息丢失。经验值：BERT-base 用 12 头（d_k=64），GPT-3 用 96 头（d_k=128）。

**3. 拼接与融合**

- 将 h 个头输出拼接成 d_model 维向量，再通过一个线性层 W_O 融合。
- 这步的工程取舍：**W_O 的存在让模型可以学习如何组合不同头的输出**，但增加了参数量（d_model^2）。实践中，W_O 与 QKV 投影矩阵共享部分参数（如 GPT-2 的 tied projections），减少内存占用。

**4. 实际收益**

- 捕捉多粒度关系：例如在 BERT 中，低层头关注语法（如词性标注），高层头关注语义（如指代消解）。论文《What Does BERT Look At?》可视化显示，不同头确实聚焦于不同模式。
- 提升模型容量：头数增加相当于引入更多可学习参数（投影矩阵），但计算量线性增长（O(n^2 * d_model)），比增加 d_model 更高效（d_model 增加会导致二次增长）。
- 并行化友好：每个头独立计算，天然适合 GPU 并行（batch 维度合并），实际推理速度几乎与单头相同。

**5. 变体与演进**

- Multi-Query Attention（MQA）：所有头共享 K、V 投影，仅 Q 独立，减少 KV cache 大小（推理时内存减半），常用于 LLM 推理优化（如 Falcon、PaLM）。
- Grouped-Query Attention（GQA）：折中方案，将头分组，组内共享 K、V，平衡效果与效率（如 LLaMA 2 使用 8 组）。
- FlashAttention：通过分块计算和重计算，避免显存中存储完整注意力矩阵，使 MHA 在长序列（如 8K tokens）下仍可训练。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从设计动机、工作机制、工程取舍三个层面回答。动机上，单头注意力只能捕捉一种关系，多头通过子空间并行让模型同时关注语法、语义等不同模式。机制上，将 QKV 投影到 h 个低维子空间，独立计算后拼接融合，总计算量不变。工程取舍上，头数不是越多越好，d_k 过小会导致注意力均匀化；实际落地中，MQA 和 GQA 通过共享 KV 投影来优化推理内存。总结一句：多头注意力在不增加计算量的前提下，通过多视角并行提升了模型的表达能力和泛化性。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么头数增加时，总计算量不变？能给出具体公式吗？

> 单头注意力计算量：O(n^2 * d_model)（假设 n 为序列长度）。多头注意力中，每个头维度 d_k = d_model / h，计算量 O(n^2 * d_k * h) = O(n^2 * d_model)。关键在投影矩阵：单头需要 3 个 d_model×d_model 矩阵（3d_model^2 参数），多头需要 3h 个 d_model×d_k 矩阵（3d_modeld_kh = 3*d_model^2 参数），参数量相同。但注意：拼接后的 W_O 增加 d_model^2 参数，所以总参数量略增（约 33%），但 FLOPs 不变。

**追问 2**：你提到 d_k 过小会导致注意力均匀化，具体原因是什么？如何选择头数？

> 缩放点积注意力中，softmax 的输入是 QK^T / sqrt(d_k)。当 d_k 很小时（如 d_k=8），QK^T 的方差变小（因为点积期望为 0，方差为 d_k），除以 sqrt(d_k) 后方差变为 1。但实际中，如果 d_k 过小，QK^T 的数值范围会压缩，导致 softmax 输出接近均匀分布（所有位置权重相近），失去聚焦能力。经验法则：d_k 至少 32，常见 64 或 128。头数选择需平衡：BERT 用 12 头（d_model=768），GPT-3 用 96 头（d_model=12288），保持 d_k=128。若 d_model 较小（如 512），头数建议 8（d_k=64）。

**追问 3**：MQA 和 GQA 相比标准 MHA，在效果和效率上具体差多少？

> MQA 将 KV 投影共享，KV cache 大小降为 1/h，推理时内存带宽需求减少约 50%（假设 batch size 1）。效果上，论文《Fast Transformer Decoding》显示 MQA 在翻译任务上 BLEU 下降约 0.5-1 点，但在生成任务（如摘要）中几乎无损失。GQA 是折中：将 h 个头分为 g 组，组内共享 KV。LLaMA 2 使用 8 组（32 头），效果与 MHA 持平，推理速度提升约 30%。实际选择：若对延迟敏感（如在线服务），用 GQA；若内存受限（如移动端），用 MQA。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“多头注意力就是多个注意力头并行计算，每个头关注不同位置” → ✅ 必须解释“为什么不同头能关注不同位置”：因为每个头有独立的 QKV 投影矩阵，它们学习到不同的线性变换，从而在子空间中捕捉不同的模式（如语法、语义、位置关系）。不是“位置”不同，而是“语义关系”不同。
- ❌ 说“头数越多越好，能提升模型容量” → ✅ 必须指出 trade-off：头数增加导致 d_k 减小，当 d_k < 16 时注意力分布均匀化，效果反而下降。同时，头数增加会增大 KV cache（推理时），影响内存和延迟。实际中，头数通常为 8-96，且需与 d_model 匹配。
- ❌ 说“多头注意力计算量比单头大” → ✅ 必须纠正：总 FLOPs 相同（O(n^2 * d_model)），因为每个头维度降低。但参数量略增（多了 W_O 矩阵），不过现代 GPU 对矩阵乘法高度优化，实际速度几乎一致。

#### 6️⃣ 简历呼应

- **如果你有 LLM 训练/推理项目**：从“实际部署中如何选择头数”切入，结合你项目中遇到的 KV cache 瓶颈，对比 MHA 和 GQA 的推理延迟差异（如 LLaMA 2 的 8 组 GQA 比 32 头 MHA 快 30%），展示工程落地经验。
- **如果你只做过传统 NLP（如 LSTM/CRF）**：用“特征工程”类比——单头注意力像只用一个特征模板（如词性），多头像同时使用多个模板（词性、句法、语义），然后通过线性层自动学习如何组合这些特征。强调多头注意力是“自动化的多视角特征提取”。
- **如果你是校招无项目**：聚焦论文复现——用 PyTorch 实现 MHA 时，注意 d_k 和 d_model 的整除关系，以及 FlashAttention 的分块策略。可以提你复现了《Attention Is All You Need》中的 MHA 代码，并对比了不同头数下的注意力可视化结果。
- 《Attention Is All You Need》（Vaswani et al., 2017）——多头注意力的原始论文
- 《What Does BERT Look At? An Analysis of BERT’s Attention》（Clark et al., 2019）——可视化不同头的注意力模式
- 《Fast Transformer Decoding: One Write-Head is All You Need》（Shazeer, 2019）——MQA 论文
- 《GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints》（Ainslie et al., 2023）——GQA 论文
- 《FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness》（Dao et al., 2022）——优化 MHA 计算效率

---
