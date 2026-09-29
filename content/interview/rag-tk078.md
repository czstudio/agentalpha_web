---
slug: rag-tk078
no: "978"
title: "📌 Q6: After tokenization, how are tokens converted into embeddings in the Transformer model"
question: "📌 Q6: After tokenization, how are tokens converted into embeddings in the Transformer model"
excerpt: "面试官想考察你对 Transformer 最基础组件的理解深度，而非仅仅背诵“查表”二字。这是一道背概念 + 工程取舍混合题。刁钻点在于：1）你是否清楚 embedding 层本质是可训练参数矩阵，而非固定映射；2）你是"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3708
updated: "2026-09-29"
---

## 📌 Q6: After tokenization, how are tokens converted into embeddings in the Transformer model

`P0` · `rag`

🏷 标签：`tokenization`, `embeddings`, `transformer`, `positional-encoding`

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 最基础组件的理解深度，而非仅仅背诵“查表”二字。这是一道**背概念 + 工程取舍**混合题。刁钻点在于：1）你是否清楚 embedding 层本质是**可训练参数矩阵**，而非固定映射；2）你是否能区分**查表**与**矩阵乘法**在实现上的等价性；3）你是否知道位置编码的叠加方式（加在输入而非权重上）及其设计动机。答好了能展示你对模型底层实现细节的掌控力，这是做 RAG 或 LLM 调优的硬基础。

#### 2️⃣ 标准答

Tokenization 输出的是整数索引序列，例如 `[101, 2045, 1996, 102]`。接下来通过两步转换为 embedding：**Token Embedding** 和 **Positional Encoding**。

**第一步：Token Embedding（查表）**

- 核心是一个可训练的参数矩阵 `W_e ∈ R^(V×d)`，其中 `V` 是词表大小（如 GPT-2 的 50257），`d` 是隐藏维度（如 768）。
- 每个 token 索引 `i` 直接取矩阵的第 `i` 行作为其 embedding 向量。这本质是 **nn.Embedding** 层的操作，底层实现为 `W_e[i]`，等价于 one-hot 向量与矩阵相乘的简化版。
- **工程取舍**：为什么不直接用 one-hot 乘矩阵？因为查表操作是 O(1) 的，而 one-hot 乘矩阵是 O(V·d)，且 one-hot 向量稀疏浪费显存。查表是工程上的标准优化。
- **实际落地的坑**：Embedding 层参数量巨大（V×d），在词表大（如 100k+）时是显存瓶颈。解法：**权重绑定**（Weight Tying），即让 embedding 层与输出层（lm_head）共享权重矩阵，可减少约 30% 参数量（参考 Press & Wolf 2017 论文）。但注意这要求输出层也使用相同维度，且可能限制表达能力。

**第二步：叠加位置编码**

- 原始 embedding 不含位置信息，必须显式注入。Transformer 采用**加法**而非拼接，因为加法保持维度不变，计算高效。
- **绝对位置编码（Sinusoidal）**：使用固定频率的正余弦函数生成位置向量，直接加到 token embedding 上。优点是无额外参数，可外推到更长序列（但实际外推效果差）。常见于原始 Transformer 论文。
- **相对位置编码（RoPE）**：通过旋转矩阵对 query 和 key 的 embedding 进行变换，使内积只依赖相对位置。这是当前主流（如 LLaMA、Mistral），因为**天然支持长度外推**，且训练更稳定。实现上，RoPE 在 attention 计算前对 Q/K 做旋转，而非直接加在输入上。
- **工程取舍**：Sinusoidal 简单但外推能力弱；RoPE 效果好但需修改 attention 实现（如 FlashAttention 需特殊支持）。在 RAG 场景中，RoPE 更优，因为检索常涉及长文档。

**第三步：多模态场景的扩展**

- 如果输入包含图像，需额外图像 embedding 层（如 ViT 的 patch embedding），将图像块投影到与文本相同的 d 维空间，然后与文本 embedding 拼接或交替输入。此时 embedding 层不再是单一矩阵，而是多个模态的映射器。

**总结**：Token 到 embedding 的核心是查表 + 加位置编码。查表是 O(1) 的工程优化，位置编码的选择（RoPE vs Sinusoidal）直接影响模型的外推能力。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，Token Embedding 本质是查一个可训练矩阵，用 nn.Embedding 实现，工程上比 one-hot 乘矩阵高效。第二，必须叠加位置编码，常用 RoPE 或 Sinusoidal，RoPE 在长度外推上更优。第三，实际落地要注意权重绑定减少参数量，以及多模态场景下需要额外的图像 embedding 层。总结一句：查表 + 位置编码，缺一不可。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么位置编码用加法而不是拼接？

> 拼接会使维度翻倍，增加后续 attention 的计算量（O(2d)^2 vs O(d)^2）。加法保持维度不变，且实验证明足够表达位置信息。另外，加法可以看作将位置信息作为偏置项注入，与 token 语义信息解耦。如果拼接，模型需要额外学习位置与语义的交互，训练难度更大。

**追问 2**：权重绑定（Weight Tying）在什么情况下不适用？

> 当 embedding 维度与输出层维度不一致时无法绑定。例如，某些模型在输出层使用更大的隐藏层（如 2d）以增强分类能力。另外，权重绑定假设 token 的输入分布与输出分布相似，但在多语言模型中，输入和输出的词表可能不同（如编码器-解码器架构），此时无法绑定。实践中，如果词表很大（>100k），绑定能显著节省显存，但可能降低 1-2% 的 perplexity。

**追问 3**：RoPE 是如何实现相对位置编码的？

> RoPE 对每个 token 的 query 和 key 向量施加旋转矩阵，旋转角度与位置索引成正比。具体地，对于位置 m 的向量 x，RoPE 将其分为 2 维一组，每组旋转 m·θ_i 弧度，其中 θ_i = 10000^(-2i/d)。这样，query 和 key 的内积自然包含 (m-n) 的余弦项，即相对位置。优点是无需额外参数，且支持长度外推（因为旋转角度是连续的）。实现时，只需在 attention 前对 Q/K 做一次旋转，计算量可忽略。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “Embedding 层是固定的，用 Word2Vec 或 GloVe 初始化。” → ✅ “Embedding 层是可训练参数，随机初始化或从预训练权重加载。固定 embedding 只在少数场景（如小样本）使用，且会限制模型表达能力。”
- ❌ “位置编码是加到 attention 权重上的。” → ✅ “位置编码是加到 token embedding 上的，而非 attention 权重。只有 RoPE 等相对编码才在 attention 计算中修改 Q/K。”
- ❌ “Token embedding 和位置编码是拼接在一起的。” → ✅ “是加法，不是拼接。拼接会导致维度膨胀，增加计算量。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“位置编码对检索长文档的影响”切入，举例 RoPE 如何让模型处理 32k 上下文，对比 Sinusoidal 在 4k 外就失效的坑。强调你实际调过 RoPE 的 base frequency 参数。
- **如果你只做过传统 NLP**：用“词向量类比”迁移，说 Word2Vec 是固定矩阵，而 Transformer 的 embedding 是端到端训练的，且必须加位置编码。展示你对“查表 vs 矩阵乘”的工程理解。
- **如果你是校招无项目**：聚焦“权重绑定”论文复现，说你在小型 Transformer 上实现了 weight tying，对比了有无绑定的 perplexity 和参数量，发现绑定后参数量减少 30% 但性能仅下降 0.5%。展示动手能力。
- 《Attention Is All You Need》原始论文（Sinusoidal 位置编码）
- RoFormer: Enhanced Transformer with Rotary Position Embedding（RoPE 论文）
- Using the Output Embedding to Improve Language Models（Weight Tying 论文）
- FlashAttention 官方文档（RoPE 在 FlashAttention 中的实现）
- Hugging Face Transformers 源码中 `BertEmbeddings` 类的实现（查表 + 位置编码）

---
