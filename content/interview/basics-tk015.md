---
slug: basics-tk015
no: "915"
title: "self-attention 和 target-attention的区别"
question: "self-attention 和 target-attention的区别"
excerpt: "面试官想考察你对 Transformer 架构中两种核心注意力机制的根本性理解，而非简单背诵。这是典型的“背概念”题，但刁钻点在于：很多人能说出“Self-Attention 是 QKV 同源，Cross-Attenti"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4377
updated: "2026-09-29"
---

## self-attention 和 target-attention的区别

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 架构中两种核心注意力机制的根本性理解，而非简单背诵。这是典型的“背概念”题，但刁钻点在于：很多人能说出“Self-Attention 是 QKV 同源，Cross-Attention 是 Q 来自解码器、KV 来自编码器”，却无法解释为什么需要这种设计、以及在实际工程中（如 RAG 或多模态）如何灵活变体。答好了，能展示你对序列建模本质（对齐 vs 融合）的洞察，以及从论文到落地的迁移能力。

#### 2️⃣ 标准答

**核心区别：输入来源与建模目标**

Self-Attention 和 Target-Attention（通常指 Encoder-Decoder Attention，也叫 Cross-Attention）在计算形式上完全一致——都是 Scaled Dot-Product Attention：`Attention(Q,K,V) = softmax(QK^T / sqrt(d_k)) V`。但它们的 **Q、K、V 来源不同**，导致建模目标截然不同。

- **Self-Attention**：Q、K、V 全部来自**同一个序列**。目标是捕捉序列内部的**长程依赖关系**。例如在 BERT 中，每个 token 通过 Self-Attention 看到句子中所有其他 token，从而理解上下文。
- **Target-Attention（Cross-Attention）**：Q 来自**目标序列**（如解码器当前步的隐状态），K、V 来自**源序列**（如编码器输出）。目标是实现**序列间的对齐与信息融合**。例如在机器翻译中，解码器生成英文单词时，通过 Cross-Attention 关注源语言句子中对应的中文词。

**工程取舍与落地坑**

- **为什么编码器只用 Self-Attention，解码器要加 Cross-Attention？**编码器需要充分理解输入序列的全局上下文，Self-Attention 是最直接的方案。解码器如果只用 Self-Attention，只能看到已生成的部分，无法感知源序列信息，因此必须引入 Cross-Attention 来“读取”编码器的输出。**Trade-off**：Cross-Attention 引入了额外的计算开销（O(L_target * L_source)），但换来了序列间对齐的灵活性。在长文本摘要任务中，如果源序列长度 10k tokens，Cross-Attention 的矩阵乘法会非常昂贵，因此实际工程中常采用**局部注意力**（如 Longformer 的滑动窗口）或**稀疏注意力**（如 BigBird）来近似。
- **实际落地的坑：Cross-Attention 的 Key-Value 缓存**在自回归生成（如 GPT 推理）中，解码器每一步都需要重新计算 Cross-Attention 的 K、V。如果不做缓存，每次生成新 token 都要对整个源序列重新编码，导致 O(L_source * L_target^2) 的复杂度。**解法**：将编码器输出的 K、V 矩阵缓存到 GPU 显存中（即 **KV Cache**），解码时只计算当前 Q 与缓存的 K、V 的注意力。这能大幅降低推理延迟，但显存占用会随源序列长度线性增长。在 RAG 场景中，如果检索到的文档很长（如 8k tokens），KV Cache 可能占满显存，需要配合 **FlashAttention** 或 **PagedAttention**（如 vLLM）来优化。

**变体与扩展**

- **多模态 Cross-Attention**：在 LLaVA 等视觉语言模型中，Q 来自文本解码器，K、V 来自视觉编码器（如 CLIP 的视觉特征）。这本质上是 Cross-Attention 的泛化——源序列可以是图像 patch 序列。
- **Self-Attention 的 Mask 变体**：解码器中的 Masked Self-Attention 是 Self-Attention 的特例，通过上三角 Mask 禁止看到未来 token，保证自回归生成的自洽性。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，**输入来源**——Self-Attention 的 QKV 同源，Cross-Attention 的 Q 来自目标序列、KV 来自源序列；第二，**建模目标**——Self-Attention 捕捉序列内部依赖，Cross-Attention 实现序列间对齐；第三，**工程落地**——Cross-Attention 需要 KV Cache 优化推理速度，且长序列下需配合稀疏注意力。总结一句：两者计算形式相同，但输入来源和建模目标不同，决定了它们在 Transformer 架构中的分工。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 Cross-Attention 中 Q 来自解码器，而不是反过来？如果 Q 来自编码器会怎样？

> 这是由序列生成的方向决定的。解码器需要**动态地**从源序列中提取信息来生成当前 token，因此 Q 必须是解码器的当前状态，这样每次生成的 token 不同，Q 就不同，关注的位置也会变化。如果 Q 来自编码器（固定），那么解码器每一步看到的源序列信息都一样，无法根据已生成内容调整关注点，相当于“静态对齐”，会严重降低生成质量。在机器翻译中，这会导致“漏翻”或“重复翻译”。

**追问 2**：在 RAG 场景中，检索到的文档作为上下文，应该用 Self-Attention 还是 Cross-Attention 处理？

> 两种方案都有。**方案一**：将检索文档拼接到用户 query 前面，一起输入 LLM 的 Self-Attention 层。优点是实现简单，但文档很长时，Self-Attention 的计算复杂度是 O((L_query + L_doc)^2)，非常昂贵。**方案二**：用 Cross-Attention 单独处理文档，即 LLM 的某些层额外插入 Cross-Attention，Q 来自 query，K、V 来自文档。优点是计算复杂度降为 O(L_query * L_doc)，且文档可以独立编码并缓存。实际工程中，方案二更常用（如 RAG 中的 FiD 模型），但需要修改模型架构。**Trade-off**：方案一兼容性好，方案二效率高。

**追问 3**：Self-Attention 和 Cross-Attention 在梯度传播上有什么不同？

> 核心区别在于**梯度来源**。Self-Attention 的梯度只来自当前序列内部的损失，而 Cross-Attention 的梯度会同时反向传播到编码器和解码器。这意味着 Cross-Attention 训练时，编码器会收到解码器的梯度信号，从而调整源序列的表示以更好地服务目标序列。例如在图像描述任务中，Cross-Attention 的梯度会迫使视觉编码器学习到“可描述”的特征，而不是通用的分类特征。这也是为什么端到端训练比两阶段训练效果更好的原因之一。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Self-Attention 和 Cross-Attention 的计算公式不同” → ✅ 正确：两者计算公式完全一样，都是 Scaled Dot-Product Attention，区别仅在于 QKV 的来源。
- ❌ 说“Cross-Attention 只存在于编码器-解码器架构中” → ✅ 正确：Cross-Attention 是更通用的概念，可以出现在任何需要对齐两个序列的地方，如多模态模型（Q 来自文本，KV 来自图像）或 RAG（Q 来自 query，KV 来自文档）。
- ❌ 说“Self-Attention 不需要 Mask” → ✅ 正确：解码器中的 Self-Attention 需要 Mask 来防止看到未来 token，这是自回归生成的关键约束。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索文档与 query 的对齐”切入，对比用 Self-Attention 拼接 vs Cross-Attention 独立编码的工程取舍，并提到 KV Cache 和 FlashAttention 的优化。
- **如果你只做过传统 NLP**：用“机器翻译中的编码器-解码器结构”作为类比，说明 Self-Attention 是“理解源语言”，Cross-Attention 是“对齐目标语言”，并延伸到文本摘要、对话生成等任务。
- **如果你是校招无项目**：聚焦论文复现，比如用 PyTorch 实现一个简化版 Transformer，分别可视化 Self-Attention 和 Cross-Attention 的注意力热力图，分析在 IWSLT 数据集上的关注模式差异。
- 《Attention Is All You Need》（Vaswani et al., 2017）—— Transformer 原始论文，定义 Self-Attention 和 Cross-Attention
- 《Longformer: The Long-Document Transformer》（Beltagy et al., 2020）—— 稀疏注意力处理长序列的工程方案
- 《FlashAttention: Fast and Memory-Efficient Exact Attention》（Dao et al., 2022）—— 优化 Self-Attention 计算和显存
- 《FiD: Leveraging Passage Retrieval with Generative Models for Open Domain Question Answering》（Izacard & Grave, 2020）—— RAG 中 Cross-Attention 的典型应用
- 《LLaVA: Large Language and Vision Assistant》（Liu et al., 2023）—— 多模态 Cross-Attention 的实践案例

---
