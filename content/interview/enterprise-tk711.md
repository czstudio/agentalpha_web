---
slug: enterprise-tk711
no: "1611"
title: "Transform 的架构，Encoder 和 Decoder 是什么"
question: "Transform 的架构，Encoder 和 Decoder 是什么"
excerpt: "面试官想确认你是否真正理解 Transformer 的不对称双塔设计，而非只背过“Encoder 是双向，Decoder 是单向”这种口诀。考察类型是基础架构辨析 + 工程取舍。刁钻点在于：能否讲清为什么 Decoder"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4549
updated: "2026-09-29"
---

## Transform 的架构，Encoder 和 Decoder 是什么

#### 1️⃣ 考察意图

面试官想确认你是否真正理解 Transformer 的**不对称双塔设计**，而非只背过“Encoder 是双向，Decoder 是单向”这种口诀。考察类型是**基础架构辨析 + 工程取舍**。刁钻点在于：能否讲清为什么 Decoder 需要 Masked Self-Attention 和 Cross-Attention 这两层，而 Encoder 不需要；以及这种设计如何影响训练和推理效率。答好了能展示你对序列建模本质的把握，以及从架构层面理解 BERT/GPT/T5 等模型差异的能力。

#### 2️⃣ 标准答

Transformer 架构的核心是 Encoder-Decoder 结构，但两者角色完全不同，不能混为一谈。

**整体骨架**：输入序列先经过 Embedding + 位置编码（如 Sinusoidal 或 RoPE），然后进入 Encoder 堆栈（N=6 层），输出一组上下文表示（contextualized representations）。Decoder 堆栈（同样 N=6 层）以 Encoder 输出为条件，自回归地生成目标序列。

**Encoder：双向上下文编码器**

- 每层包含 **Multi-Head Self-Attention** 和 **Feed-Forward Network (FFN)**，外加 LayerNorm 和残差连接。
- Self-Attention 是**双向的**：每个 token 可以 attend 到序列中所有其他 token（包括未来的）。这适合理解整个句子的语义，比如 BERT 的 MLM 任务。
- 输出是固定长度的向量序列，每个向量对应输入 token 的上下文表示。
- **为什么没有 Mask？** 因为 Encoder 的任务是理解，不是生成。它需要全局视野来提取特征，不需要因果约束。

**Decoder：因果自回归生成器**

- 每层包含 **Masked Self-Attention**、**Cross-Attention** 和 **FFN**。
- **Masked Self-Attention**：使用上三角掩码（mask），确保每个 token 只能 attend 到它自己及之前的 token（因果性）。这是自回归生成的关键——防止信息泄露。
- **Cross-Attention**：Query 来自 Decoder 的当前层，Key 和 Value 来自 Encoder 的最后一层输出。这允许 Decoder 在生成每个 token 时，动态地“查阅”输入序列的哪些部分最相关。
- **为什么需要两层 Attention？** 一层负责保持生成序列的内部一致性（因果性），另一层负责与输入序列对齐（条件性）。合起来就是“条件自回归”。

**关键工程取舍**

- **训练 vs 推理效率**：训练时 Decoder 可以并行（Teacher Forcing），一次性输入整个目标序列，利用 Mask 保证因果性。推理时必须逐 token 生成，每次只产生一个 token，然后拼回序列再输入。这导致推理延迟高，所以实际部署常用 KV Cache 优化——缓存之前 token 的 Key 和 Value，避免重复计算。
- **实际落地的坑**：训练时 Decoder 的 Cross-Attention 层容易过拟合到 Encoder 输出，导致推理时如果输入分布偏移（比如用户输入了训练集没见过的句式），生成质量骤降。解法：在训练时对 Encoder 输出做 Dropout（比如 0.1），或者用 Scheduled Sampling 混合 Teacher Forcing 和自生成。

**典型模型变体**

- **纯 Encoder**：BERT、RoBERTa。适合分类、NER、QA 等理解任务。
- **纯 Decoder**：GPT 系列、LLaMA。适合文本生成、对话、代码补全。
- **Encoder-Decoder**：T5、BART。适合翻译、摘要、文本转换等需要“理解+生成”的任务。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，整体架构——输入经过 Embedding + 位置编码后进入 Encoder 和 Decoder 堆栈。第二，角色差异——Encoder 用双向 Self-Attention 做全局理解，输出上下文表示；Decoder 用 Masked Self-Attention 保证因果性，再用 Cross-Attention 对齐输入，实现条件自回归生成。第三，工程取舍——训练时 Decoder 可并行，推理时必须逐 token 生成，所以要用 KV Cache 优化。总结一句：Encoder 是理解器，Decoder 是生成器，两者通过 Cross-Attention 桥接。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 BERT 只用 Encoder，GPT 只用 Decoder，而 T5 要用 Encoder-Decoder？

> 这是任务需求决定的。BERT 做理解任务（分类、NER），需要双向上下文，所以 Encoder 足够。GPT 做生成任务，需要因果自回归，所以 Decoder 足够。T5 做翻译、摘要这类“理解输入 + 生成输出”的任务，必须同时有 Encoder 提取输入特征和 Decoder 条件生成。工程上，Encoder-Decoder 参数量更大，训练更慢，但表达能力更强；纯 Decoder 架构更简洁，适合大规模预训练（GPT 系列）。一个取舍：纯 Decoder 模型（如 GPT-3）也能做翻译，但需要把源语言和目标语言拼成一个序列，效果通常不如专门的 Encoder-Decoder 模型。

**追问 2**：Decoder 的 Cross-Attention 层，Query、Key、Value 分别来自哪里？为什么这样设计？

> Query 来自 Decoder 当前层的输出（经过 Masked Self-Attention 后），Key 和 Value 都来自 Encoder 最后一层的输出。这样设计的原因是：Query 代表“当前生成的 token 需要什么信息”，Key 代表“输入序列中每个 token 提供什么信息”，Value 代表“输入序列中每个 token 的实际内容”。通过计算 Query 和 Key 的相似度得到注意力权重，再加权求和 Value，Decoder 就能动态地从输入序列中提取最相关的信息。一个细节：Cross-Attention 没有 Mask，因为 Decoder 可以访问整个输入序列，不需要因果约束。

**追问 3**：如果去掉 Decoder 的 Masked Self-Attention，只保留 Cross-Attention，会怎样？

> 那 Decoder 就失去了自回归能力。每个 token 的生成将不再依赖之前生成的 token，而是只依赖 Encoder 输出。这会导致生成序列内部不一致——比如翻译时，第一个词和第二个词可能来自不同的语义方向。实际上，这相当于一个“非自回归 Transformer”（NAT），它确实存在（如 Mask-Predict），但需要额外的迭代精炼步骤来保证序列一致性，且通常质量低于自回归模型。所以，Masked Self-Attention 是自回归生成的核心，不能去掉。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “Encoder 和 Decoder 结构一样，只是 Decoder 多了一个 Mask。” → ✅ 结构完全不同：Encoder 只有 Self-Attention + FFN，Decoder 有 Masked Self-Attention + Cross-Attention + FFN。Cross-Attention 是 Decoder 独有的，不是“多了一个 Mask”那么简单。
- ❌ “Decoder 的 Self-Attention 是单向的，所以叫 Masked Self-Attention。” → ✅ 单向是结果，Mask 是手段。准确说：Decoder 使用上三角掩码强制因果性，使得每个 token 只能 attend 到它自己及之前的 token，从而实现单向自回归。
- ❌ “Encoder 和 Decoder 的层数必须一样。” → ✅ 没有这个规定。T5 的 Encoder 和 Decoder 层数可以不同（比如 Encoder 12 层，Decoder 6 层），取决于任务和计算资源。实际中常设为相同以简化设计，但不是必须。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“Encoder 理解用户查询，Decoder 生成答案”切入，强调 Cross-Attention 在检索增强中的作用——Encoder 输出作为 Key/Value，Decoder 动态关注检索到的文档片段。
- **如果你只做过传统 NLP（如 LSTM 机器翻译）**：用“LSTM 的 Encoder 是双向 RNN，Decoder 是单向 RNN + Attention”做类比，说明 Transformer 用 Self-Attention 替代了 RNN 的循环结构，解决了长距离依赖和并行化问题。
- **如果你是校招无项目**：聚焦“从零实现简化 Transformer”的 demo，用 PyTorch 实现一个 Encoder-Decoder 结构用于翻译，并对比 BLEU 分数。强调你理解 Mask 矩阵的构造和 Cross-Attention 的维度变化。
- 《Attention Is All You Need》（Vaswani et al., 2017）——原始论文，必读
- 《BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding》
- 《Language Models are Few-Shot Learners》（GPT-3 论文）——纯 Decoder 架构的极致
- 《Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer》（T5 论文）——Encoder-Decoder 的工程实践
- 《The Annotated Transformer》（Harvard NLP 博客）——带代码的逐行解析，适合动手实现

---
