---
slug: basics-tk119
no: "1019"
title: "| Q19 | What is the purpose of scaling in the self-attention mechanism in the Transformer model"
question: "| Q19 | What is the purpose of scaling in the self-attention mechanism in the Transformer model"
excerpt: "面试官想考察你对 Transformer 核心机制的理解深度，而非简单背诵“除以 sqrt(d_k)”。这属于工程取舍 + 数学推导型问题。刁钻点在于：你是否能解释“为什么是 sqrt(d_k) 而不是其他常数”，以及“"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3303
updated: "2026-09-29"
---

## | Q19 | What is the purpose of scaling in the self-attention mechanism in the Transformer model

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 核心机制的理解深度，而非简单背诵“除以 sqrt(d_k)”。这属于**工程取舍 + 数学推导**型问题。刁钻点在于：你是否能解释“为什么是 sqrt(d_k) 而不是其他常数”，以及“不缩放会怎样”。答好了能展示：扎实的数学直觉（方差分析）、对梯度稳定性的理解、以及从论文到落地的工程思维。面试官会通过追问验证你是否真的懂，还是只会背公式。

#### 2️⃣ 标准答

**核心问题**：在点积自注意力中，当 Query 和 Key 的维度 d_k 较大时，点积值的方差会随 d_k 线性增长，导致 softmax 输出进入饱和区（接近 one-hot），梯度消失。

**缩放因子**：除以 sqrt(d_k)，将点积方差稳定在 1 左右。

**数学推导**：

- 假设 Q 和 K 的元素独立同分布，均值为 0，方差为 1（LayerNorm 后的常见情况）。
- 点积 `Q·K^T` 的均值为 0，方差为 d_k（因为 d_k 个独立随机变量乘积的方差累加）。
- 除以 sqrt(d_k) 后，方差变为 1，保持稳定。

**为什么是 sqrt(d_k) 而不是其他**：

- 除以 d_k 会过度压缩，导致方差过小（1/d_k），softmax 输出过于均匀，注意力“模糊”，模型难以聚焦。
- 除以 sqrt(d_k) 是方差归一化的标准做法，使 softmax 输入分布保持稳定，梯度流更健康。

**实际落地的坑 + 解法**：

- **坑**：在训练初期，如果 Q/K 初始化不当（如方差过大），即使有缩放，点积值仍可能过大。这会导致 softmax 输出接近 one-hot，梯度消失。
- **解法**：使用 Xavier/Glorot 初始化或 Kaiming 初始化，确保 Q/K 的方差在合理范围。同时，在 Transformer 中配合 Pre-LN（先 LayerNorm 再 Attention）结构，进一步稳定训练。

**工程取舍**：

- 缩放因子是“计算开销几乎为零”的改进，但效果显著。没有它，深层 Transformer（如 12 层以上）几乎无法训练，梯度会爆炸或消失。
- 在 FlashAttention 等高效实现中，缩放因子被集成到内核中，无需额外操作，但数学原理不变。

**论文依据**：

- “Attention Is All You Need” (Vaswani et al., 2017) 中明确给出缩放因子 1/sqrt(d_k)。
- 后续工作如 “On Layer Normalization in the Transformer Architecture” (Xiong et al., 2020) 进一步分析了 Pre-LN 和缩放因子的协同作用。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数学推导、工程取舍、实际坑点三个层面回答。数学上，点积方差随 d_k 线性增长，除以 sqrt(d_k) 将其归一化到 1，避免 softmax 饱和。工程上，这是零开销的改进，但必须配合正确的初始化。实际坑点在于训练初期 Q/K 方差失控，需要用 Pre-LN 或 Xavier 初始化兜底。总结一句：缩放因子是 Transformer 训练稳定的基石，没有它，深层模型无法收敛。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果我把缩放因子改成除以 d_k 会怎样？

> 除以 d_k 会导致方差过小（1/d_k），softmax 输入分布过于集中，输出接近均匀分布。注意力机制失效，模型无法学习到有效的注意力权重。实验上，在 IWSLT 机器翻译任务中，除以 d_k 的模型 BLEU 分数会下降 5-8 个点，且训练损失下降极慢。这验证了缩放因子需要精确匹配方差归一化的需求。

**追问 2**：在多头注意力中，每个头的 d_k 不同（如 d_k=64 vs d_k=128），缩放因子需要调整吗？

> 需要。每个头独立计算缩放因子，因为 d_k 是每个头的维度。如果 d_k 不同（例如在混合精度或模型压缩中），必须分别除以 sqrt(d_k)。否则，大 d_k 的头会主导注意力，导致训练不稳定。实际中，标准 Transformer 所有头使用相同的 d_k（如 d_model / num_heads），所以缩放因子统一。

**追问 3**：FlashAttention 中如何处理缩放因子？

> FlashAttention 将缩放因子集成到分块计算中。在 tiling 过程中，每个分块的点积结果会先乘以 1/sqrt(d_k)，再进行 softmax。这避免了在全局矩阵上额外操作，同时保持了数学等价性。关键点是：缩放因子必须在 softmax 之前应用，否则梯度计算会出错。FlashAttention 的 CUDA 内核中，缩放因子是硬编码的常数，不增加额外开销。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 回答“缩放因子是为了防止数值溢出，因为点积值太大” → ✅ 正确切入：核心是防止 softmax 饱和导致的梯度消失，而非数值溢出。数值溢出可以通过 FP16 混合精度解决，但梯度消失是结构性问题。
- ❌ 回答“缩放因子是除以 d_k 的平方根，这是经验值，没有理论依据” → ✅ 正确切入：有严格的数学推导，基于 Q/K 元素独立同分布假设，方差分析直接导出 sqrt(d_k)。这不是经验值，而是理论最优解。
- ❌ 回答“缩放因子只影响训练，不影响推理” → ✅ 正确切入：推理时同样需要缩放，因为 softmax 输出分布必须合理，否则注意力权重会偏向极端值，影响生成质量。训练和推理的数学公式完全一致。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-阅读”框架切入，说明缩放因子在阅读器（Transformer）中的关键作用，以及如何影响检索结果的注意力权重。可以提到在长文档检索中，d_k 较大时缩放因子更关键。
- **如果你只做过传统 NLP**：用“词向量归一化”类比，说明缩放因子类似于 L2 归一化，目的是控制向量内积的方差。可以提到在文本分类任务中，如果不缩放，注意力机制会失效。
- **如果你是校招无项目**：聚焦论文复现，说明你在小型 Transformer（如 2 层、d_model=128）上对比了有无缩放因子的训练曲线，验证了梯度消失现象。可以提到使用 IWSLT 数据集，有缩放因子时 BLEU 提升 3-5 个点。
- “Attention Is All You Need” (Vaswani et al., 2017) - 原始论文，缩放因子定义
- “On Layer Normalization in the Transformer Architecture” (Xiong et al., 2020) - Pre-LN 与缩放因子协同分析
- “FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness” (Dao et al., 2022) - 高效实现中的缩放因子处理
- “Scaling Vision Transformers” (Dosovitskiy et al., 2021) - 视觉 Transformer 中缩放因子的经验
- “The Annotated Transformer” (Harvard NLP) - 代码级实现，含缩放因子细节

---
