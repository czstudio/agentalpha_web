---
slug: finetune-tk033
no: "933"
title: "八股:SFT 的 loss 如何只计算回答部分?(如何 ignore padding token?)"
question: "八股:SFT 的 loss 如何只计算回答部分?(如何 ignore padding token?)"
excerpt: "面试官想验证你是否真正动手训练过 SFT，而非只背过“用-100 mask”这个结论。考察类型是工程实现细节，刁钻点在于：很多人知道要 mask，但说不清在哪一步、用什么参数、为什么是-100而不是0。答好了能展示你对"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4700
updated: "2026-09-29"
---

## 八股:SFT 的 loss 如何只计算回答部分?(如何 ignore padding token?)

`P0` · `llm_training`

📊 考点：sft · training

🏷 标签：`loss-masking, llm`

#### 1️⃣ 考察意图

面试官想验证你是否真正动手训练过 SFT，而非只背过“用-100 mask”这个结论。考察类型是**工程实现细节**，刁钻点在于：很多人知道要 mask，但说不清**在哪一步、用什么参数、为什么是-100而不是0**。答好了能展示你对 HuggingFace Trainer 底层逻辑的熟悉度、对 CrossEntropyLoss ignore_index 机制的理解，以及处理过真实数据拼接时 token 对齐的坑。这是区分“看过源码”和“跑过实验”的关键题。

#### 2️⃣ 标准答

核心思路：在构建 labels 时，将**不需要计算 loss 的位置**（用户输入、padding token）设为 `-100`，利用 CrossEntropyLoss 的 `ignore_index=-100` 参数自动忽略这些位置的梯度回传。

**具体实现步骤（以 HuggingFace Transformers 为例）：**

- **数据预处理阶段**：拼接用户输入（prompt）和回答（response），用 tokenizer 生成 `input_ids` 和 `attention_mask`。关键：**不要直接对拼接后的文本一次性 tokenize**，否则无法区分 prompt 和 response 的边界。
- **构建 labels**：先复制 `input_ids` 为 `labels`，然后将 **prompt 部分** 和 **padding 部分** 的 token id 替换为 `-100`。具体做法：在拼接时记录 prompt 的 token 长度 `prompt_len`。
- `labels[:prompt_len] = -100` （mask 掉用户输入）
- `labels[input_ids == tokenizer.pad_token_id] = -100` （mask 掉 padding）
- 剩余 response 部分的 token id 保持原样（即真实 token id）。
训练时：在 TrainingArguments 中无需额外设置，因为 HuggingFace 的 Trainer 默认使用 CrossEntropyLoss，且 labels 中的 -100 会被自动忽略。如果手写训练循环，需显式设置 nn.CrossEntropyLoss(ignore_index=-100)。

**为什么是-100？**这是 PyTorch 的 CrossEntropyLoss 的约定：`ignore_index` 默认值为 `-100`，任何等于该值的 target 位置不参与 loss 计算。选 `-100` 而非 `0` 是因为 `0` 是有效 token id（如 `<s>` 或 `<pad>` 的 id 可能为 0），用 `-100` 避免冲突。

**实际落地的坑 + 解法：**

- **坑1：token 数量不对齐**。如果 prompt 和 response 分别 tokenize 再拼接，`input_ids` 长度可能不等于 `prompt_len + response_len`（因为 tokenizer 在拼接时可能添加特殊 token，如 `<bos>`、`<eos>`）。**解法**：统一 tokenize 拼接后的完整文本，然后通过 `tokenizer.decode` 或手动计算 token 偏移量来定位 response 起始位置。更稳健的做法是用 `tokenizer.apply_chat_template`（适用于 chat 模型）或直接对 prompt 和 response 分别 tokenize 后手动拼接，并处理特殊 token。
- **坑2：response 末尾的 <eos> token 是否参与 loss**。通常希望模型学习生成 `<eos>`，所以保留它。但如果 response 被截断，截断后的 `<eos>` 可能被丢弃，导致 loss 计算偏差。**解法**：在 tokenize 时设置 `truncation=True, max_length=...`，并确保 response 末尾的 `<eos>` 在截断后仍保留（或手动添加）。
- **坑3：多轮对话场景**。每轮的用户输入和模型回答都要 mask，且历史对话中的模型回答也需要参与 loss 计算（因为模型需要学习上下文）。**解法**：对每轮对话，只 mask 当前轮的用户输入，保留所有历史模型回答的 token 作为 labels。

**工程取舍：**

- **用 -100 vs 用 0**：`-100` 是 PyTorch 默认，兼容性最好；如果用 `0` 需显式设置 `ignore_index=0`，但 `0` 可能被 tokenizer 用作 `<pad>` id，导致意外 mask 掉 padding。
- **在数据预处理时 mask vs 在 loss 函数中动态 mask**：预处理时 mask 更高效（避免每次 forward 都计算 mask），但灵活性低（如需要动态调整 mask 策略时需重新处理数据）。推荐预处理时 mask，因为 SFT 数据通常固定。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据预处理、loss 计算、工程坑三个层面回答。数据预处理时，将 labels 中用户输入和 padding 部分设为 -100；训练时利用 CrossEntropyLoss 的 ignore_index=-100 自动忽略这些位置。关键坑是 token 对齐和多轮对话的 mask 策略。总结一句：SFT loss mask 的本质是 token 级别的 label 替换，-100 是 PyTorch 的约定，不是随便选的。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果我想让模型只学习回答中的某些 token（比如只学习实体词），怎么改？

> 在构建 labels 时，对 response 部分进一步细分：用 NER 或规则标记出需要学习的 token 位置，将不需要学习的 token 也设为 -100。例如，只保留名词和动词，其他词类 mask 掉。但要注意：这可能导致模型只生成实体词而忽略语法结构，实际效果往往不好。更常见的做法是**对 response 整体计算 loss**，因为 SFT 的目标是学习完整的回复格式和风格。

**追问 2**：为什么 HuggingFace 的 Trainer 默认就能处理 -100？它底层怎么做的？

> Trainer 在 `compute_loss` 中调用模型的 `forward` 方法，模型（如 LlamaForCausalLM）内部会计算 `logits` 和 `labels` 的交叉熵。具体在 `transformers` 源码的 `CausalLMOutputWithPast` 中，loss 计算调用了 `nn.CrossEntropyLoss(ignore_index=-100)`。如果 labels 中有 -100，这些位置的 loss 为 0，梯度不更新。可以查看 `modeling_llama.py` 中的 `LlamaForCausalLM.forward` 方法验证。

**追问 3**：如果我用 DeepSpeed ZeRO-3 或 FSDP，-100 的 mask 机制会受影响吗？

> 不会。ZeRO-3 和 FSDP 只影响模型参数和优化器状态的分片，不影响 loss 计算逻辑。loss 计算仍在每个 GPU 上独立进行，-100 的 mask 机制在单卡和多卡下行为一致。唯一需要注意的是：如果使用 `padding` 且 `attention_mask` 未正确设置，可能导致不同序列长度不一致，但 -100 mask 本身不受影响。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “把用户输入部分的 loss 设为 0，然后手动乘上一个 mask 矩阵。”→ ✅ “正确做法是将 labels 中对应位置设为 -100，利用 CrossEntropyLoss 的 ignore_index 参数。手动乘 mask 矩阵容易出错（如梯度可能被 mask 值污染），且效率低。”
- ❌ “用 attention_mask 来忽略 padding 的 loss。”→ ✅ “attention_mask 只控制注意力计算，不控制 loss 计算。必须单独在 labels 中用 -100 来 mask loss。”
- ❌ “把 padding token 的 label 设为 0，因为 0 是 pad id。”→ ✅ “0 可能是有效 token id（如 `<s>`），用 -100 更安全。如果 tokenizer 的 pad_token_id 是 0，设 ignore_index=0 也可以，但需确认没有其他 token id 为 0。”

#### 6️⃣ 简历呼应

- **如果你有 SFT 训练项目**：从“我在项目中踩过 token 对齐的坑”切入，详细描述如何用 `tokenizer.apply_chat_template` 处理多轮对话，并验证 loss 曲线。
- **如果你只做过传统 NLP（如文本分类）**：用“交叉熵 loss 的 ignore_index 在分类任务中用于忽略 padding”类比，说明迁移到 SFT 时只需将 labels 中不需要计算的位置替换为 -100。
- **如果你是校招无项目**：聚焦“我复现过 HuggingFace 的 causal LM 训练 demo”，展示对 `transformers` 源码中 `CausalLMOutputWithPast` 和 `CrossEntropyLoss` 的理解，并手动实现一个简单的 SFT 数据预处理脚本。

#### 7️⃣ 延伸阅读

- HuggingFace Transformers 文档：`Trainer` 和 `DataCollatorForLanguageModeling` 的源码解析
- PyTorch 官方文档：`torch.nn.CrossEntropyLoss` 的 `ignore_index` 参数说明
- 论文：`Training Language Models with Language Model Feedback`（SFT loss mask 的常见实现）
- 博客：`How to train your own SFT model with HuggingFace`（实战教程，含 token 对齐坑点）
- 工具：`trl` 库的 `SFTTrainer` 源码（内置 loss mask 逻辑，可对比手写实现）

---
