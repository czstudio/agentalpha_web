---
slug: enterprise-tk206
no: "1106"
title: "prefix LM 和 causal LM 区别是什么"
question: "prefix LM 和 causal LM 区别是什么"
excerpt: "面试官想考察你对 Transformer 注意力机制变体的工程级理解，而非单纯背定义。核心是区分“双向上下文”与“单向自回归”在训练和推理中的实际影响。刁钻点在于：你是否能讲清楚 Prefix LM 的注意力掩码设计（如"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 11
words: 5197
updated: "2026-09-29"
---

## prefix LM 和 causal LM 区别是什么

#### 1️⃣ 考察意图

面试官想考察你对 Transformer 注意力机制变体的**工程级理解**，而非单纯背定义。核心是区分“双向上下文”与“单向自回归”在训练和推理中的实际影响。刁钻点在于：你是否能讲清楚 Prefix LM 的注意力掩码设计（如 2D 掩码矩阵）如何影响计算效率，以及为什么 Causal LM 在生成任务中更主流。答好了能展示你对模型架构的**系统设计能力**和**工程取舍意识**，这是大厂做模型优化或 RAG 系统的基础。

#### 2️⃣ 标准答

**核心定义与注意力机制差异**

- **Causal LM（因果语言模型）**：严格从左到右的单向注意力。每个 token 只能看到它之前的 token（包括自身），通过上三角掩码（mask）实现。典型代表：GPT 系列（GPT-2、GPT-3、GPT-4）。训练时，每个位置预测下一个 token，损失函数只计算非 padding 部分的交叉熵。
- **Prefix LM（前缀语言模型）**：输入分为两部分——前缀（prefix）和生成部分。前缀内使用**双向注意力**（类似 BERT 的 full attention），生成部分使用**单向因果注意力**。典型代表：GLM（清华）、UniLM（微软）、T5（部分变体）。注意：Prefix LM 的 prefix 长度在训练时固定，推理时整个输入都作为 prefix。

**注意力掩码设计——关键工程细节**

- **Causal LM 掩码**：一个下三角矩阵（包括对角线），形状 `[seq_len, seq_len]`。每个位置 `i` 只能 attend 到 `j <= i` 的位置。实现时用 `torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()` 生成上三角 True 值，然后 mask 掉。
- **Prefix LM 掩码**：一个**分块矩阵**。假设 prefix 长度为 `p`，总序列长度为 `n`。掩码矩阵左上角 `p x p` 区域全为 0（允许双向），右上角 `p x (n-p)` 区域全为 1（prefix 不能 attend 到生成部分），左下角 `(n-p) x p` 区域全为 0（生成部分可以 attend 到 prefix），右下角 `(n-p) x (n-p)` 区域为下三角（生成部分内部因果）。这导致**计算复杂度增加**：Causal LM 的注意力计算是 O(n²)，但 Prefix LM 的 prefix 部分需要 O(p²) 的全连接，生成部分 O((n-p)²) 的因果连接，整体效率略低。

**训练与推理的工程取舍**

- **训练效率**：Causal LM 更简单高效。它不需要区分 prefix 和生成部分，直接对整个序列做因果注意力，梯度计算是标准的自回归方式。Prefix LM 需要**自定义掩码**，在框架（如 PyTorch）中实现时，通常用 `attention_mask` 参数传入，但 `torch.nn.MultiheadAttention` 不支持这种分块掩码，必须手动实现 `scaled_dot_product_attention` 并传入自定义 mask，增加了代码复杂度和调试成本。
- **推理效率**：Causal LM 有成熟的**KV cache 优化**，每次生成一个 token 只需计算新 token 的注意力，缓存之前的 key/value。Prefix LM 的 prefix 部分虽然可以预计算并缓存，但生成部分仍需要因果注意力，且 prefix 的 KV 缓存不能复用（因为 prefix 是双向的，每个生成 token 都要 attend 到整个 prefix），导致**推理延迟更高**。实际落地中，Prefix LM 常用于**文本摘要**或**对话系统**，其中 prefix 是用户输入，生成部分是回复；而 Causal LM 更适合**长文本生成**（如代码补全），因为 KV cache 能显著降低延迟。

**实际落地的坑 + 解法**

- **坑 1：Prefix LM 的 prefix 长度选择**。如果 prefix 太长，双向注意力计算量爆炸；太短，模型无法充分理解上下文。解法：在训练时固定 prefix 长度（如 512），推理时对超过长度的输入做截断或分块处理。例如 GLM 在训练时使用 512 token 的 prefix，推理时如果用户输入超过 512，则用滑动窗口或摘要压缩。
- **坑 2：Causal LM 的上下文窗口限制**。由于单向注意力，模型无法看到未来信息，导致在需要全局理解的场景（如文档分类）表现差。解法：在输入前添加特殊 token（如 `[CLS]`）并只取该 token 的隐状态做分类，但效果不如 BERT 类模型。更优方案是使用 Prefix LM 或 Encoder-Decoder 架构。

**典型代表与选型建议**

- **Causal LM**：GPT-2/3/4、LLaMA、Mistral、Qwen。适合**自回归生成**任务（文本续写、代码生成、翻译）。
- **Prefix LM**：GLM-130B、UniLM、T5（部分变体）。适合**理解+生成**混合任务（摘要、问答、对话），其中 prefix 是输入上下文，生成部分是输出。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从注意力机制、工程实现、应用场景三个层面回答。注意力层面，Causal LM 是严格单向的上三角掩码，Prefix LM 是分块掩码，前缀内双向、生成部分单向。工程层面，Causal LM 训练简单、推理有 KV cache 优化；Prefix LM 需要自定义掩码，计算复杂度更高，但能利用双向上下文。应用层面，Causal LM 适合纯生成任务，Prefix LM 适合理解+生成混合任务。总结一句：选型取决于任务是否需要双向上下文，以及是否容忍推理延迟。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：Prefix LM 的注意力掩码具体怎么实现？能给出 PyTorch 伪代码吗？

> 可以。假设 `batch_size=1, seq_len=10, prefix_len=4`。先创建全 1 掩码 `mask = torch.ones(10, 10)`。然后设置前缀内双向：`mask[:4, :4] = 0`（允许 attend）。设置前缀不能 attend 到生成部分：`mask[:4, 4:] = 1`（mask 掉）。设置生成部分 attend 到前缀：`mask[4:, :4] = 0`。设置生成部分内部因果：`mask[4:, 4:] = torch.triu(torch.ones(6, 6), diagonal=1)`。最后 `mask = mask.bool()`，在 `scaled_dot_product_attention` 中传入 `attn_mask=mask`。注意：PyTorch 2.0 的 `F.scaled_dot_product_attention` 支持 `attn_mask` 参数，但必须是布尔型或浮点型，且形状需匹配。

**追问 2**：Causal LM 的 KV cache 在 Prefix LM 中能用吗？为什么？

> 部分能用。Prefix LM 的 prefix 部分可以预计算 KV 并缓存，因为 prefix 是固定的，且每个生成 token 都要 attend 到整个 prefix。但生成部分的 KV cache 机制与 Causal LM 相同：每次生成新 token 时，只需计算新 token 的 key/value，并 append 到缓存中。问题在于：Prefix LM 的生成部分需要 attend 到 prefix 的 KV，而 prefix 的 KV 缓存是完整的（不是因果的），所以推理时 prefix 的 KV 缓存可以复用，但生成部分的 KV cache 仍需要逐 token 更新。整体推理延迟比 Causal LM 高约 20-30%（具体取决于 prefix 长度）。

**追问 3**：为什么 GPT 系列不用 Prefix LM 架构？有什么 trade-off？

> 核心是**生成质量 vs 训练效率**的取舍。GPT 系列追求极致的生成流畅度和长文本连贯性，Causal LM 的因果注意力天然适合自回归生成，且训练简单、推理高效。Prefix LM 虽然能利用双向上下文，但训练时需要设计掩码，推理时 prefix 的 KV 缓存无法完全复用，导致延迟增加。此外，Prefix LM 在生成部分仍使用因果注意力，所以生成质量与 Causal LM 差异不大。GPT 团队选择 Causal LM 是因为它在**规模扩展**上更友好：训练效率高，推理延迟低，适合大规模部署。如果任务需要双向理解（如摘要），GPT 系列会通过 prompt engineering 或 fine-tuning 来弥补，而不是改架构。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Prefix LM 就是 Encoder-Decoder 架构，比如 T5”。 → ✅ 正确区分：Prefix LM 是 Decoder-only 架构，但前缀部分用双向注意力；Encoder-Decoder 有独立的编码器和解码器，编码器用双向注意力，解码器用因果注意力。Prefix LM 更轻量，参数更少，适合单卡部署。
- ❌ 说“Causal LM 只能做生成，不能做理解任务”。 → ✅ 正确说法：Causal LM 可以做理解任务（如分类），但需要特殊设计（如取最后一个 token 的隐状态），效果通常不如双向模型。Prefix LM 在理解任务上更自然，因为前缀部分能看到完整上下文。
- ❌ 说“Prefix LM 的推理延迟和 Causal LM 一样”。 → ✅ 正确说法：Prefix LM 推理延迟更高，因为前缀的 KV 缓存不能完全复用，且生成部分需要 attend 到整个前缀，计算量更大。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索增强生成中的上下文融合”切入。RAG 中，检索到的文档作为 prefix，生成回答时使用 Prefix LM 可以更好地融合检索结果与用户问题，提升回答准确性。可以对比 Causal LM 在 RAG 中的表现，分析 Prefix LM 的 ROUGE/BLEU 提升。
- **如果你只做过传统 NLP**：用“序列标注 vs 序列生成”类比。序列标注（如 NER）需要双向上下文，类似 Prefix LM 的前缀部分；序列生成（如机器翻译）需要单向，类似 Causal LM。迁移时强调注意力掩码的设计思路。
- **如果你是校招无项目**：聚焦“论文复现 demo”。在 GitHub 上实现一个简化版 Prefix LM（基于 GPT-2 修改注意力掩码），在 CNN/DailyMail 摘要数据集上对比 Causal LM 的 ROUGE 分数，并分析推理延迟差异。面试时展示代码和实验结果。
- 《GLM: General Language Model Pretraining with Autoregressive Blank Infilling》（清华，2021）
- 《UniLM: Unified Language Model Pre-training for Natural Language Understanding and Generation》（微软，2019）
- 《Attention Is All You Need》（Vaswani et al., 2017）——注意力机制基础
- 《Scaling Laws for Neural Language Models》（Kaplan et al., 2020）——Causal LM 的扩展性分析
- PyTorch 官方文档：`torch.nn.functional.scaled_dot_product_attention` 的 `attn_mask` 参数用法

---
