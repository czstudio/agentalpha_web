---
slug: rag-tk057
no: "957"
title: "| Q1 | CNNs and RNNs don’t use positional embeddings. Why do transformers use positional embeddings"
question: "| Q1 | CNNs and RNNs don’t use positional embeddings. Why do transformers use positional embeddings"
excerpt: "面试官想验证你是否真正理解 Transformer 架构的设计动机，而非死记硬背。这题是典型的“架构对比+设计取舍”类问题，刁钻点在于：它要求你从并行计算与序列建模的根本矛盾出发，解释为什么 CNN/RNN 天然有位置感"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4630
updated: "2026-09-29"
---

## | Q1 | CNNs and RNNs don’t use positional embeddings. Why do transformers use positional embeddings

`P0` · `rag`

🏷 标签：`transformer`, `positional-encoding`, `self-attention`, `architecture`

#### 1️⃣ 考察意图

面试官想验证你是否真正理解 Transformer 架构的设计动机，而非死记硬背。这题是典型的“架构对比+设计取舍”类问题，刁钻点在于：它要求你从并行计算与序列建模的根本矛盾出发，解释为什么 CNN/RNN 天然有位置感而 Transformer 没有。答好了能展示你对自注意力机制本质的洞察、对工程权衡（trade-off）的敏感度，以及是否接触过实际落地中的位置编码变体（如 RoPE、ALiBi）。面试官会通过追问看你是否只是背了“因为自注意力是并行的”这句空话。

#### 2️⃣ 标准答

**核心矛盾：并行计算 vs 序列顺序**

Transformer 的核心是自注意力（Self-Attention），它通过计算所有 token 两两之间的注意力分数来捕捉依赖关系。这个操作是**完全并行的**——输入序列的所有 token 同时进入注意力层，模型在数学上无法区分“I love you”和“you love I”中 token 的排列差异。如果不加位置编码，对模型来说，“I”在位置 0 和位置 2 的表示是完全相同的。

**CNN 和 RNN 为什么不需要？**

- **CNN**：通过卷积核的滑动窗口隐含位置信息。例如一个 kernel_size=3 的卷积，位置 i 的输出只依赖 i-1, i, i+1 的输入，这种局部感受野天然编码了相对位置。但 CNN 的缺点是感受野有限，长距离依赖需要堆叠多层或使用空洞卷积。
- **RNN**：通过循环步骤的顺序处理天然编码位置。第 t 步的隐状态 h_t 是 h_{t-1} 和 x_t 的函数，序列顺序被隐式地“刻”在计算图中。但 RNN 的致命问题是无法并行，且存在梯度消失/爆炸问题。

**Transformer 的解法：注入位置信号**

Transformer 通过向输入 embedding 中添加位置编码（Positional Encoding）来显式注入位置信息。常见方案有：

1. **正弦/余弦固定编码（Sinusoidal）**：原版 Transformer 使用，公式为 PE(pos, 2i) = sin(pos/10000^(2i/d_model))，PE(pos, 2i+1) = cos(pos/10000^(2i/d_model))。优点是无需学习、可外推到任意长度（理论上），但实际外推效果有限，因为频率分布是固定的。
2. **可学习位置编码（Learnable）**：BERT、GPT 等模型使用，将位置索引映射为一个可训练的 embedding 矩阵。优点是灵活，模型可自适应调整；缺点是无法外推到训练时未见过的长度（如 BERT 最大 512，GPT-2 最大 1024）。
3. **相对位置编码（Relative Position）**：如 Transformer-XL 和 Shaw et al. 的工作，不编码绝对位置，而是编码 token 之间的相对距离。更符合语言直觉（“I love you”中“love”和“you”的距离是 1，与它们在句子中的绝对位置无关）。
4. **旋转位置编码（RoPE）**：当前主流方案（LLaMA、Mistral、Qwen 等使用），通过旋转矩阵对 query 和 key 施加位置依赖，使得注意力分数天然依赖相对位置。RoPE 的优势是相对位置编码、可外推、且不影响向量范数。
5. **ALiBi（Attention with Linear Biases）**：给注意力分数加上一个与 token 距离成正比的负偏置，越远的 token 偏置越大。优点是极其简单、训练稳定、外推能力强（如 MPT-7B 使用）。

**实际落地的坑与解法**

- **坑 1：长度外推失败**。用可学习位置编码的模型，在推理时遇到比训练时更长的序列，位置索引超出 embedding 矩阵范围，直接报错或性能骤降。**解法**：切换到 RoPE 或 ALiBi，或者用插值法（Position Interpolation）将位置索引压缩到训练范围内。
- **坑 2：位置编码与 embedding 的融合方式**。原版是直接相加，但有人发现相加会导致位置信号和语义信号互相干扰。**解法**：尝试拼接（concat）或门控融合（如 Transformer-XL 的做法），但会增加参数量。工程上通常先做加法，因为简单且效果足够。
- **坑 3：相对位置编码的显存爆炸**。如果实现不当，计算所有 token 对的相对位置矩阵需要 O(n²) 显存。**解法**：使用 T5 的简化版相对位置编码（只分 buckets，不精确计算每个距离），或使用 FlashAttention 的块内相对位置计算。

**总结**：位置编码是 Transformer 为并行计算付出的代价，也是其灵活性的来源。选择哪种方案取决于任务需求——固定编码适合简单任务，可学习编码适合固定长度，RoPE/ALiBi 是当前长序列场景的标配。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，Transformer 的自注意力是并行计算的，模型在数学上无法区分 token 顺序，而 CNN 通过卷积核位置、RNN 通过循环步骤天然编码了顺序。第二，位置编码的作用就是显式注入位置信号，常见方案有正弦/余弦固定编码、可学习编码、RoPE、ALiBi 等。第三，实际落地中要注意长度外推问题，RoPE 和 ALiBi 是目前长序列场景的首选。总结一句：位置编码是 Transformer 为并行性付出的必要代价，也是其灵活性的关键设计。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 RoPE 比正弦/余弦编码更适合长序列？

> 正弦/余弦编码的频率是固定的，当序列长度超过训练时的最大长度时，模型没见过那些位置的编码，外推效果差。RoPE 通过旋转矩阵编码相对位置，注意力分数只依赖 token 间的相对距离，与绝对位置无关。理论上，只要模型能处理任意长度的相对距离，就能外推。实际中，LLaMA 用 RoPE 在 2048 长度上训练，可以外推到 4096 甚至更长。但 RoPE 也有坑：旋转矩阵的维度是 d_model/2，如果 d_model 太小，旋转角度分辨率不够，长距离依赖会模糊。

**追问 2**：如果让你设计一个位置编码，你会怎么选？给一个具体场景。

> 假设场景是 100k 级别的长文档理解（如法律合同分析）。我会选 ALiBi，因为它极其简单——只需在注意力分数上加一个线性偏置，不增加任何参数，训练稳定，且外推能力经过验证（MPT-7B 在 2k 训练、65k 推理上表现良好）。如果任务需要精细的相对位置建模（如代码生成），我会选 RoPE，因为它能区分不同距离的依赖强度。但 RoPE 的实现稍复杂，需要修改 attention 计算逻辑。

**追问 3**：位置编码和位置 embedding 有什么区别？为什么原版论文叫“Positional Encoding”而不是“Positional Embedding”？

> 严格来说，Encoding 是固定函数生成的（如正弦/余弦），Embedding 是可学习的。原版论文用 Encoding 强调其位置编码是固定的、无需训练的。但后续工作中两者混用，BERT 的“Position Embeddings”是可学习的。实际工程中，大家更关心的是位置信号是否可学习、能否外推，而不是名称。面试官问这个可能是想看你是否读过原论文的细节。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “因为 Transformer 没有循环结构，所以需要位置编码。” → ✅ 要具体说明“没有循环结构”导致什么后果：自注意力是排列等变的（permutation equivariant），即打乱输入顺序，输出也会等比例打乱，模型无法区分“I love you”和“you love I”。
- ❌ “位置编码就是加一个向量，没什么好说的。” → ✅ 要展开不同方案的 trade-off：固定编码 vs 可学习 vs RoPE vs ALiBi，并给出选择依据（长度外推、参数量、实现复杂度）。
- ❌ “CNN 和 RNN 不需要位置编码，因为它们有记忆。” → ✅ CNN 没有记忆，它靠卷积核的局部感受野隐含位置；RNN 靠循环步骤的顺序处理隐含位置。两者都是“隐含”而非“显式”，但方式不同。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“长文档检索中的位置编码选择”切入，说明在检索阶段（如 Dense Retrieval）和生成阶段（如 LLM 推理）分别用什么位置编码，以及长度外推对 RAG 系统的影响（如检索到的文档超过模型最大长度时如何处理）。
- **如果你只做过传统 NLP**：用“CNN 的卷积核位置 vs Transformer 的绝对位置”类比，说明传统模型如何隐含位置信息，而 Transformer 需要显式注入。可以提到你在文本分类任务中对比过有无位置编码的准确率差异。
- **如果你是校招无项目**：聚焦“RoPE 的数学原理与实现”，展示你读过 LLaMA 论文并复现过 RoPE 的旋转矩阵计算。可以提到你在小规模实验（如 512 长度训练、1024 长度推理）中验证了 RoPE 的外推能力。
- 《Attention Is All You Need》原论文（Vaswani et al., 2017）—— 正弦/余弦位置编码的原始出处
- 《RoFormer: Enhanced Transformer with Rotary Position Embedding》（Su et al., 2021）—— RoPE 论文
- 《Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation》（Press et al., 2021）—— ALiBi 论文
- 《Transformer-XL: Attentive Language Models Beyond a Fixed-Length Context》（Dai et al., 2019）—— 相对位置编码的经典工作
- 《Position Interpolation for Extending Context Window》（Chen et al., 2023）—— 解决长度外推的插值方法

---
