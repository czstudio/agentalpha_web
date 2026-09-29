---
slug: finetune-tk338
no: "1238"
title: "❓ **Q1：SFT 为什么只对 assistant token 算 loss？多轮时所有 ASST 都要开放吗？**"
question: "❓ **Q1：SFT 为什么只对 assistant token 算 loss？多轮时所有 ASST 都要开放吗？**"
excerpt: "面试官想验证你是否真正动手训过 SFT，而非只背过“只对 assistant 算 loss”的结论。考察类型是工程取舍 + 系统设计。刁钻点在于：多轮场景下，早期 assistant 回复可能包含错误（如幻觉、逻辑断裂）"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4095
updated: "2026-09-29"
---

## ❓ **Q1：SFT 为什么只对 assistant token 算 loss？多轮时所有 ASST 都要开放吗？**

`P1` · `llm_training`

🏷 标签：`sft`, `loss-mask`, `multi-turn`, `llm-training`

#### 1️⃣ 考察意图

面试官想验证你是否真正动手训过 SFT，而非只背过“只对 assistant 算 loss”的结论。考察类型是**工程取舍 + 系统设计**。刁钻点在于：多轮场景下，早期 assistant 回复可能包含错误（如幻觉、逻辑断裂），若全部开放 loss 会污染梯度；若只开最后一轮，又可能丢失对话连贯性。答好了能展示你对 loss mask 机制的底层理解、多轮数据构造的实战经验，以及从 SFT 到 RLHF 的全局视野。

#### 2️⃣ 标准答

**核心原则**：SFT 只对 assistant token 算 loss，因为 user token 是输入条件，模型不需要学习预测它们——预测 user 内容既无意义（训练时 user 输入已知），还会引入噪声（如 user 拼写错误、无关闲聊）。实现上通过 **loss mask**：在 token 级别设置 mask 张量，assistant 部分为 1，其余为 0。

**多轮对话处理**：通常所有 assistant token 都参与 loss 计算，但需分情况讨论：

- **标准做法**：对每轮 user-assistant 对，assistant 部分 mask 为 1。例如 3 轮对话，第 1、2、3 轮 assistant 都算 loss。这能保持对话连贯性，让模型学会在上下文中逐步推理。
- **实战坑**：早期 assistant 回复可能包含错误（如第一轮答错，第二轮纠正）。若全部开放 loss，模型会学到“先错后改”的模式，导致推理时首轮输出质量下降。**解法**：在数据构造时，对早期轮次 assistant 做质量过滤，或只对最后一轮 assistant 算 loss（适用于长链推理任务）。
- **实现细节**：HuggingFace Trainer 中通过 `labels` 参数实现——将 user token 的 labels 设为 -100（忽略），assistant token 设为真实 token ID。多轮时需拼接所有轮次，并在每个 assistant 段设置 labels。注意 **tokenizer 的 add_special_tokens** 设置，避免系统提示符被错误 mask。

**工程取舍**：

- **全部开放 vs 只开最后一轮**：全部开放梯度更稳定，但数据质量要求高；只开最后一轮能聚焦当前回复，但可能丢失上下文依赖。实践中，**通用对话用全部开放，数学/代码等强推理任务用只开最后一轮**。
- **系统提示 & 工具调用**：通常 mask 掉系统提示（固定模板，无学习价值）；工具调用（function call）的输入部分 mask，输出部分开放，让模型学会生成工具调用格式。

**实际落地的坑 + 解法**：

- **坑**：多轮对话中，若某轮 user 输入为空（如仅系统提示），模型会学到“无输入时生成固定回复”。**解法**：数据预处理时过滤空 user 轮次，或将其 user token 的 loss mask 设为 0。
- **坑**：使用 FlashAttention 时，loss mask 需与 attention mask 对齐。若 attention mask 是 causal 的，loss mask 必须确保 assistant token 能看到所有历史 token。**解法**：用 `attention_mask` 参数控制，assistant 部分设为 1，user 部分设为 0（但需保留 causal 结构）。

**论文参考**：LLaMA 系列 SFT 论文（如《LLaMA: Open and Efficient Foundation Language Models》）明确采用 assistant-only loss mask；多轮变体可参考《Training Language Models with Multi-turn Dialogue Data》。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，SFT 只对 assistant token 算 loss 是因为 user token 是输入条件，预测它们无意义且会引入噪声，通过 loss mask 实现。第二，多轮时通常所有 assistant 都开放，但需注意早期轮次可能包含错误，实战中我会对数据做质量过滤或只开最后一轮。第三，实现上注意 labels 设为 -100 忽略 user token，以及 FlashAttention 的 mask 对齐。总结一句：核心是平衡梯度稳定性和数据质量，具体取舍取决于任务类型。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果多轮对话中，某轮 assistant 回复是正确的，但 user 输入有错别字，你会怎么处理？

> 我会在数据预处理阶段对 user 输入做标准化（如拼写纠正），但不会改变 loss mask 策略——user token 依然 mask 掉，因为模型不需要学习预测它们。如果错别字影响语义（如“苹果”写成“苹朵”），我会在 tokenizer 层面添加自定义词典，或直接替换为正确文本。注意：不要对 user 输入做过度修改，否则会破坏对话的真实分布。

**追问 2**：SFT 的 loss mask 和 RLHF 中 reward model 的 loss 设计有什么异同？

> 相同点：都通过 mask 控制哪些 token 参与计算。不同点：SFT 的 mask 是硬性的（0/1），只对 assistant token 算交叉熵；RLHF 的 reward model 通常对完整序列算 pairwise loss（如 Bradley-Terry 模型），mask 用于忽略 padding token。另外，RLHF 中 reward model 的 loss 是全局的（整个序列一个 reward），而 SFT 是 token 级别的。实战中，SFT 的 mask 更简单，RLHF 需处理 preference 对的构造。

**追问 3**：如果训练数据中，某轮对话的 assistant 回复长度超过模型最大长度，你会怎么截断？

> 我会优先截断 user 部分，保留完整的 assistant 回复。因为 assistant 回复是 loss 计算的核心，截断它会丢失关键信息。具体做法：从对话开头开始，按轮次依次丢弃 user-assistant 对，直到剩余长度能容纳最后一轮 assistant。注意：不要截断中间轮次，否则会破坏上下文连贯性。如果最后一轮 assistant 仍超长，则从中间截断（保留开头和结尾，如 2048 token 中保留前 1024 和后 1024）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “SFT 对所有 token 算 loss，包括 user 和 system，因为模型需要学习整个对话模式。” → ✅ “只对 assistant token 算 loss，因为 user 和 system 是输入条件，模型不需要预测它们；预测 user 会引入噪声，且浪费计算资源。”
- ❌ “多轮对话中，只对最后一轮 assistant 算 loss，因为早期轮次不重要。” → ✅ “通常所有 assistant 都参与 loss 计算，但早期轮次若包含错误，可考虑质量过滤或只开最后一轮；具体取舍取决于任务，通用对话用全部开放，推理任务用只开最后一轮。”

#### 6️⃣ 简历呼应

- **如果你有 SFT 项目**：从“多轮数据构造”角度切入，描述你如何设计 loss mask 策略（如对早期错误轮次做 mask），并对比不同策略对生成质量的影响（如 BLEU、人工评估）。
- **如果你只做过传统 NLP**：用“序列标注”类比——SFT 的 loss mask 类似 NER 中只对实体 token 算 loss，其他 token 忽略；多轮对话类似多句子拼接，需在 token 级别设置 mask。
- **如果你是校招无项目**：聚焦 LLaMA-Factory 的 SFT 实现，描述你如何修改 `trainer.py` 中的 loss mask 逻辑，并在 Alpaca 数据集上验证效果；可提及 HuggingFace 的 `DataCollatorForSeq2Seq` 的 mask 机制。

#### 7️⃣ 延伸阅读

- 《LLaMA: Open and Efficient Foundation Language Models》——SFT 训练细节
- 《Training Language Models with Multi-turn Dialogue Data》——多轮 SFT 变体
- HuggingFace 官方文档：`DataCollatorForSeq2Seq` 的 loss mask 实现
- LLaMA-Factory 源码：`src/llmtuner/train/sft/trainer.py` 中的 loss mask 逻辑
- 《FlashAttention: Fast and Memory-Efficient Exact Attention》——attention mask 与 loss mask 对齐

---
