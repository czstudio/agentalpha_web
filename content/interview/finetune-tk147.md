---
slug: finetune-tk147
no: "1047"
title: "SFT 的 loss 如何只计算回答部分？(如何 ignore padding token?)"
question: "SFT 的 loss 如何只计算回答部分？(如何 ignore padding token?)"
excerpt: "面试官真正想看的不是你会不会调 `CrossEntropyLoss(ignore_index=-100)`，而是你是否理解 SFT 训练中 loss 计算的本质——只对模型生成的回答部分做监督，prompt 和 padd"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4934
updated: "2026-09-29"
---

## SFT 的 loss 如何只计算回答部分？(如何 ignore padding token?)

`P1` · `llm_training`

📊 考点：sft · training

🏷 标签：`loss, padding`

#### 1️⃣ 考察意图

面试官真正想看的不是你会不会调 `CrossEntropyLoss(ignore_index=-100)`，而是你是否理解 **SFT 训练中 loss 计算的本质——只对模型生成的回答部分做监督，prompt 和 padding 不参与梯度更新**。这是 P1 进阶题，刁钻点在于：很多人以为“只计算回答部分”就是简单 mask，但实际涉及 **数据构建时的 label 处理、tokenizer 的 padding 策略、以及不同框架（HuggingFace / Megatron / DeepSpeed）下 loss 计算的底层差异**。答好了能展示你对 LLM 训练全流程的掌控力，包括数据 pipeline、loss 设计、以及训练效率优化（如 padding 对显存的影响）。

#### 2️⃣ 标准答

SFT 的 loss 通常是 **自回归交叉熵**，即每个 token 预测下一个 token 的概率。核心原则：**只对回答部分的 token 计算 loss，prompt 和 padding 的 token 不参与**。具体实现分三步：

#### 1. 数据构建：label 处理

- **prompt 部分**：将 label 设为 `-100`（`CrossEntropyLoss` 的 `ignore_index` 默认值），表示忽略。
- **回答部分**：保留真实 token id。
- **padding 部分**：同样设为 `-100`，因为 padding token 没有语义，计算 loss 会引入噪声。

**实际坑**：如果使用 `tokenizer.pad_token_id` 作为 padding，必须确保 label 中对应位置也是 `-100`，否则模型会学习预测 padding token，导致 loss 虚低。**解法**：在 `data_collator` 中手动将 label 中 padding 位置置为 `-100`。

#### 2. 模型前向：loss 计算

- 使用 `CrossEntropyLoss(ignore_index=-100)`，传入 `logits`（shape: `[batch, seq_len, vocab_size]`）和 `labels`（shape: `[batch, seq_len]`）。
- 框架自动忽略 label 为 `-100` 的位置，只计算有效 token 的 loss。

**工程取舍**：为什么不用 `mask` 而是用 `ignore_index`？因为 `ignore_index` 在 PyTorch 底层直接跳过对应位置的梯度计算，比手动 mask 更高效（避免无效 token 的 forward/backward 计算）。但注意：**padding 过多会导致 batch 内有效 token 比例低，显存浪费**。解法：使用 **动态 padding**（按 batch 内最长序列 padding）或 **packing**（将多个短序列拼成一个长序列，减少 padding）。

#### 3. 验证：手动计算 loss

- 打印 loss 值，与手动计算对比：只取回答部分 token 的交叉熵均值。
- 示例：若 batch 内只有一个样本，回答部分有 10 个 token，loss 应为这 10 个 token 的交叉熵均值，而非整个序列（含 padding）的均值。

**实际落地的坑**：HuggingFace `Trainer` 默认使用 `DataCollatorForSeq2Seq`，但 **SFT 场景下需要自定义 DataCollator**，因为默认 collator 不会自动将 prompt 部分的 label 设为 `-100`。**解法**：在 `data_collator` 中，对每个样本，将 `labels` 中 prompt 对应位置（即 `input_ids` 中 prompt 部分）置为 `-100`。

#### 4. 扩展：不同框架的差异

- **HuggingFace Transformers**：`Trainer` 的 `compute_loss` 默认使用 `CrossEntropyLoss(ignore_index=-100)`，但需确保 `labels` 已正确处理。
- **Megatron-LM**：使用 `vocab_parallel_cross_entropy`，同样支持 `ignore_index`，但需注意 tensor parallelism 下的 loss 聚合。
- **DeepSpeed**：`DeepSpeedEngine` 的 loss 计算与 PyTorch 一致，但需确保 `ignore_index` 在 ZeRO 优化下正确传递。

**总结**：核心是 **数据构建时 label 处理** + **loss 函数参数设置**。忽略 padding 只是基础，真正考验的是对数据 pipeline 的掌控。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据构建、loss 计算、验证三个层面回答。数据构建时，将 prompt 和 padding 部分的 label 设为 `-100`，回答部分保留真实 token id；loss 计算时，使用 `CrossEntropyLoss(ignore_index=-100)`，框架自动忽略无效 token；验证时，手动计算回答部分 token 的交叉熵均值，与打印的 loss 对比。总结一句：SFT loss 只计算回答部分，本质是 label 处理 + loss 参数设置，但实际落地需注意动态 padding 和自定义 data collator。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 prompt 和回答之间没有分隔符（如 `<|im_start|>`），怎么区分 prompt 和回答？

> 应对策略：在数据构建时，通过 **tokenizer 的 return_offsets_mapping** 或 **手动记录 token 位置** 来区分。具体做法：将 prompt 和回答拼接后，记录 prompt 的 token 长度，然后在 `labels` 中将前 `prompt_len` 个 token 置为 `-100`。注意：如果 tokenizer 在拼接时添加了特殊 token（如 `<s>`），需一并处理。工程上，建议在数据预处理阶段就生成 `labels`，避免在线计算。

**追问 2**：如果 batch 内序列长度差异很大，动态 padding 和 packing 哪个更好？

> 应对策略：**动态 padding** 简单易实现，但 padding 比例高时显存浪费严重（如 50% 是 padding）。**Packing** 将多个短序列拼成一个长序列，减少 padding，但需注意 **attention mask 的处理**（每个序列内部不能跨序列 attention）。实际落地中，如果序列长度分布均匀（如 80% 在 512-1024 之间），动态 padding 足够；如果分布极不均匀（如 20% 是 2048，80% 是 128），建议用 packing，但需实现自定义 `DataCollator` 和 `attention_mask`。**取舍**：packing 提升显存利用率，但增加代码复杂度，且可能影响训练稳定性（不同序列的 loss 权重需归一化）。

**追问 3**：如果使用 `flash_attention`，`ignore_index` 还能正常工作吗？

> 应对策略：能。`flash_attention` 只影响 attention 计算，不影响 loss 计算。`CrossEntropyLoss(ignore_index=-100)` 在 PyTorch 层面处理，与 attention 无关。但需注意：`flash_attention` 要求 `attention_mask` 正确设置（padding 位置为 `0`），否则 attention 会计算 padding 位置的注意力，导致梯度异常。**解法**：在 `data_collator` 中生成 `attention_mask`，padding 位置为 `0`，非 padding 位置为 `1`。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “直接设置 `CrossEntropyLoss(ignore_index=tokenizer.pad_token_id)` 就行。” → ✅ “`ignore_index` 应设为 `-100`，而不是 `pad_token_id`。因为 `pad_token_id` 可能是 0（如 GPT-2），而 0 是有效 token id，会导致模型学习预测 padding token。正确做法是将 label 中 padding 位置设为 `-100`，再传入 `ignore_index=-100`。”
- ❌ “SFT loss 计算整个序列（含 prompt）的交叉熵，因为 prompt 也能提供监督信号。” → ✅ “SFT 只监督回答部分，因为 prompt 是输入，模型不应学习预测 prompt 本身。如果计算 prompt 的 loss，模型会倾向于复制 prompt，导致生成质量下降。这是 SFT 与预训练（全序列 loss）的核心区别。”

#### 6️⃣ 简历呼应

- **如果你有 SFT 训练项目**：从“数据 pipeline 优化”角度切入，强调你如何通过自定义 `data_collator` 处理 prompt/padding 的 label，并对比了动态 padding 和 packing 的显存效率。
- **如果你只做过传统 NLP（如文本分类）**：用“交叉熵的 `ignore_index` 参数”类比迁移，说明你理解 loss 计算的底层机制，并强调 SFT 中 label 处理的特殊性（prompt 部分需 mask）。
- **如果你是校招无项目**：聚焦 HuggingFace 官方文档中 `DataCollatorForSeq2Seq` 的源码分析，展示你通过阅读源码理解了 SFT loss 的细节，并实现了一个 demo（如用 `transformers` 训练一个简单的对话模型）。

#### 7️⃣ 延伸阅读

- HuggingFace Transformers 文档：`DataCollatorForSeq2Seq` 源码与 `Trainer` 的 `compute_loss` 方法
- 论文：`Training Language Models with Language Model Feedback`（SFT loss 设计细节）
- 博客：`How to Train a Chat Model with SFT`（含数据构建和 loss 验证的代码示例）
- 工具：`trl` 库的 `SFTTrainer`（封装了 SFT 训练流程，含 loss 处理）
- 论文：`Packing: Towards 2x Faster Training of Large Language Models`（packing 策略详解）

---
