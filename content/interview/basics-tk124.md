---
slug: basics-tk124
no: "1024"
title: "| Q26 | Explain why self-attention in the decoder is referred to as cross-attention. How does it differ from self-attention in the encoder"
question: "| Q26 | Explain why self-attention in the decoder is referred to as cross-attention. How does it differ from self-attention in the encoder"
excerpt: "面试官想确认你是否真正理解 Transformer 解码器的内部机制，而非停留在“背图”层面。这道题表面是术语辨析，实则考察：1）能否准确区分 decoder 中的 masked self-attention 和 cro"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4931
updated: "2026-09-29"
---

## | Q26 | Explain why self-attention in the decoder is referred to as cross-attention. How does it differ from self-attention in the encoder

#### 1️⃣ 考察意图

面试官想确认你是否真正理解 Transformer 解码器的内部机制，而非停留在“背图”层面。这道题表面是术语辨析，实则考察：1）能否准确区分 decoder 中的 masked self-attention 和 cross-attention；2）是否清楚 cross-attention 的 Q/K/V 来源与 encoder self-attention 的本质差异；3）能否指出常见混淆点（如“decoder self-attention 就是 cross-attention”这种错误）。答好了能展示你对序列生成模型底层原理的扎实掌握，以及从工程角度理解注意力机制设计取舍的能力。

#### 2️⃣ 标准答

**核心澄清：术语纠偏**

- 解码器中的“self-attention”特指 **masked self-attention**（因果注意力），它只关注当前 token 及之前位置，通过上三角 mask 实现未来信息不可见。
- **Cross-attention** 是解码器中的第二个注意力子层，其 Query 来自解码器自身（当前生成序列），而 Key 和 Value 来自编码器输出（输入序列的语义表示）。
- 常见误解：有人把 decoder 的 masked self-attention 误称为 cross-attention，这是错的——cross-attention 是跨序列的，而 masked self-attention 仍是同序列内的自注意力。

**差异 1：Q/K/V 来源不同**

- Encoder self-attention：Q、K、V 全部来自同一输入序列（如源语言句子），维度一致，计算的是序列内部 token 间关系。
- Decoder masked self-attention：Q、K、V 全部来自解码器当前生成序列（如目标语言前缀），同样同源，但受因果 mask 约束。
- Cross-attention：Q 来自解码器（目标序列），K 和 V 来自编码器（源序列）。这意味着 cross-attention 的 K/V 维度与编码器输出维度一致（通常为 d_model），而 Q 维度与解码器隐藏状态一致（也是 d_model，但可能经过不同投影）。

**差异 2：作用与信息流**

- Encoder self-attention：建立输入序列的全局依赖，每个 token 能看到所有其他 token，用于理解上下文语义。
- Decoder masked self-attention：建立已生成 token 之间的依赖，但只能看到过去，保证自回归生成时不会“作弊”看到未来 token。
- Cross-attention：让解码器在生成每个 token 时，动态地“关注”输入序列的哪些部分。例如在机器翻译中，生成目标语言单词时，cross-attention 权重会集中在源语言对应词上。

**差异 3：维度与计算细节**

- Cross-attention 的 K/V 序列长度是编码器输出长度（源序列长度），而 Q 序列长度是解码器当前生成长度（目标序列长度）。因此 cross-attention 的注意力矩阵形状为 [目标长度, 源长度]，而 self-attention 是 [序列长度, 序列长度]。
- 实际实现中，cross-attention 的 K/V 投影矩阵与编码器共享权重吗？**不共享**。编码器和解码器有独立的投影参数，但 cross-attention 的 K/V 投影矩阵维度必须与编码器输出匹配。

**工程取舍与坑**

- **为什么 cross-attention 不放在 encoder 里？** 因为编码器只需要理解输入，不需要生成；cross-attention 的目的是让生成过程“参考”输入，所以必须放在解码器。
- **实际落地的坑**：在训练时，cross-attention 的 K/V 缓存（KV cache）需要从编码器输出一次性计算并存储，这会占用大量显存。例如在长文档摘要任务中，编码器输出序列长度可能达到 8K，KV cache 大小约为 2 × 8K × d_model × 2 bytes（FP16），对于 4096 维的模型，单条样本就需要约 128MB。优化策略包括：使用 FlashAttention 减少显存占用，或对编码器输出做压缩（如通过池化或降维投影）。
- **另一个坑**：推理时，cross-attention 的 K/V 是静态的（编码器输出固定），而 masked self-attention 的 K/V 是动态增长的（每生成一个 token 就 append 一次）。因此推理引擎需要分别处理这两种缓存策略。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从术语澄清、核心差异、工程细节三个层面回答。首先，解码器中的 self-attention 是 masked self-attention，不是 cross-attention；cross-attention 是解码器第二个注意力层，Q 来自解码器，K/V 来自编码器。区别在于：1）Q/K/V 来源不同，cross-attention 是跨序列的；2）作用不同，cross-attention 用于融合输入语义；3）维度不同，cross-attention 的 K/V 长度等于编码器输出长度。总结一句：cross-attention 是解码器独有的‘桥梁’，让生成过程参考输入序列。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果我把 cross-attention 换成 self-attention，让解码器只关注自己生成的内容，会怎样？

> 那模型就变成了纯语言模型，无法参考输入序列。例如在机器翻译中，解码器只能根据目标语言前缀生成，完全忽略源语言句子，结果就是输出一个随机的、与输入无关的句子。这本质上退化为无条件语言生成。实际中，这种设计在无条件文本生成任务（如 GPT 系列）中可行，但在条件生成任务（翻译、摘要、问答）中完全失效。

**追问 2**：cross-attention 的 K/V 投影矩阵和编码器的 self-attention 投影矩阵是否共享？为什么？

> 不共享。编码器和解码器有独立的参数集，包括 self-attention 和 cross-attention 的投影矩阵。原因：1）编码器 self-attention 的 Q/K/V 都来自同一空间（输入序列），而 cross-attention 的 Q 来自解码器空间，K/V 来自编码器空间，投影需要分别适应不同分布；2）共享参数会限制模型表达能力，因为编码器和解码器学习到的语义表示可能不同（编码器关注源语言，解码器关注目标语言）。实验表明，不共享参数能提升 BLEU 分数约 1-2 点【通用知识】。

**追问 3**：在推理时，cross-attention 的 KV cache 如何管理？和 masked self-attention 的 KV cache 有何不同？

> Cross-attention 的 KV cache 是静态的：编码器输出一次性计算后，K 和 V 矩阵固定不变，可以预计算并存储在显存中，每个解码步骤直接读取。Masked self-attention 的 KV cache 是动态增长的：每生成一个 token，就将其 K 和 V 追加到缓存中，因此缓存大小随生成步数线性增长。实际工程中，cross-attention 的 KV cache 通常与编码器输出绑定，而 masked self-attention 的 KV cache 需要支持增量更新。优化策略包括：对 cross-attention 的 KV cache 使用共享内存（避免重复拷贝），对 masked self-attention 的 KV cache 使用环形缓冲区（限制最大长度）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“解码器的 self-attention 就是 cross-attention，因为它关注编码器输出” → ✅ 纠正：解码器有两个注意力层，第一个是 masked self-attention（关注自身），第二个才是 cross-attention（关注编码器输出）。术语必须精确。
- ❌ 说“cross-attention 的 Q/K/V 都来自编码器” → ✅ 纠正：Q 来自解码器，K 和 V 来自编码器。这是跨序列注意力的核心特征。
- ❌ 说“cross-attention 和 encoder self-attention 的计算公式不同” → ✅ 纠正：计算公式都是 Scaled Dot-Product Attention（softmax(QK^T/√d)V），区别在于输入来源和 mask 策略。cross-attention 通常不加 mask（因为源序列全部可见），而 decoder self-attention 加因果 mask。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从 cross-attention 类比到检索增强中的“查询-文档”交互，说明 cross-attention 本质上是“查询（解码器状态）与文档（编码器输出）的注意力融合”，可以引申到 RAG 中如何设计查询与文档的注意力机制。
- **如果你只做过传统 NLP**：用“编码器提取输入特征，解码器通过 cross-attention 动态选择特征”类比到传统 Seq2Seq 中的注意力机制（如 Bahdanau Attention），说明 cross-attention 是 Transformer 版本的“软对齐”。
- **如果你是校招无项目**：聚焦论文复现，说明自己实现过 Transformer 翻译模型，并在解码器中可视化 cross-attention 权重，观察到生成目标词时权重集中在源语言对应词上，验证了 cross-attention 的对齐功能。
- Vaswani et al., "Attention Is All You Need" (2017) — 原始 Transformer 论文，第 3 节详细描述 decoder 结构
- Bahdanau et al., "Neural Machine Translation by Jointly Learning to Align and Translate" (2015) — 传统注意力机制，理解 cross-attention 的前身
- Rabe & Staats, "Self-Attention Does Not Need O(n²) Memory" (2021) — FlashAttention 原理，优化 cross-attention 显存
- 博客：The Annotated Transformer (Harvard NLP) — 逐行代码实现，清晰展示 cross-attention 的 Q/K/V 来源
- 论文：Shazeer, "Fast Transformer Decoding: One Write-Head is All You Need" (2019) — 多查询注意力（MQA），优化推理时 KV cache 管理

---
