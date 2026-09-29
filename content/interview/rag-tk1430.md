---
slug: rag-tk1430
no: "2330"
title: "📌 Q99: A RAG system has high context precision but low faithfulness. How would you address this"
question: "📌 Q99: A RAG system has high context precision but low faithfulness. How would you address this"
excerpt: "面试官想看你能否从“检索好但生成差”的端到端矛盾中，精准定位根因并给出可落地的修复方案。这不是背概念题，而是工程调试 + 系统设计题。刁钻点在于：高 context precision 意味着检索模块没问题，问题100%"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3594
updated: "2026-09-29"
---

## 📌 Q99: A RAG system has high context precision but low faithfulness. How would you address this

`P2` · `rag`

🏷 标签：`rag`, `faithfulness`, `debugging`, `generation`, `system-design`

#### 1️⃣ 考察意图

面试官想看你能否从“检索好但生成差”的端到端矛盾中，精准定位根因并给出可落地的修复方案。这不是背概念题，而是**工程调试 + 系统设计**题。刁钻点在于：高 context precision 意味着检索模块没问题，问题100%出在生成侧，但很多候选人会误归因到检索。答好了能展示你对 RAG 系统各组件耦合关系的深刻理解，以及从 prompt 工程、模型选择到后处理修正的完整调试链。

#### 2️⃣ 标准答

这个问题核心是：检索返回的上下文高度相关（高 precision），但生成器没有忠实利用这些上下文，反而依赖自身参数知识或产生幻觉。修复路径分三层：

- **第一层：Prompt 工程与指令约束**在 system prompt 中加硬约束：“仅基于以下文本回答，不要添加外部知识。如果文本中无答案，直接说‘无法从给定信息中回答’。”
- 使用结构化输出（如 JSON 格式），要求生成器先输出“引用片段”，再输出“答案”，强制对齐上下文。例如：`{"evidence": "...", "answer": "..."}`。
- **工程取舍**：强约束会降低生成流畅度，对开放式问题（如摘要）可能过度截断。需要根据任务类型调整约束强度，比如 QA 任务用硬约束，摘要任务用软约束（如“优先基于文本，可适当补充”）。
第二层：模型选择与微调
- 替换生成器为指令微调模型（如 Llama 3.1-Instruct、Qwen2.5-Instruct），它们对“基于上下文回答”的指令更敏感。实验表明，Instruct 模型在 faithfulness 上比 base 模型高 15-20%【通用知识】。
- 如果预算允许，做 **faithfulness 微调**：构造训练数据，输入为（上下文 + 问题），输出为严格基于上下文的答案。用 NLI 模型（如 DeBERTa-v3）打标，过滤掉与上下文矛盾的答案。
- **实际落地的坑**：微调后模型可能过拟合到训练数据的风格，导致对未见过的上下文泛化差。解法是混合通用指令数据（如 ShareGPT）和 faithfulness 数据，比例 3:1。
第三层：后处理修正与反馈循环
- 引入 **faithfulness 检测模块**：用 NLI 模型（如 BART-large-MNLI）或基于 LLM 的 self-check（让模型自己判断答案是否基于上下文）。如果检测到不忠实，触发重新生成或检索。
- 设计 **重生成策略**：当 faithfulness 分数低于阈值（如 0.7），将原始上下文 + 问题 + 错误答案作为负例，重新生成。可以结合 beam search 生成多个候选，选 faithfulness 最高的。
- **系统设计**：加入反馈循环，记录每次生成的 faithfulness 分数，定期分析低分样本，用于更新 prompt 或微调数据。例如，发现“时间类问题”容易幻觉，就专门增强 prompt 中的时间约束。
第四层：上下文长度与注意力机制
- 检查上下文长度是否过长（如 >4K tokens），导致生成器注意力分散。用 **chunking 策略** 将长上下文切为 512-1024 tokens 的块，并让生成器只关注最相关的块（通过 reranker 或 attention mask）。
- **工程取舍**：切块会丢失跨块依赖，对需要多跳推理的问题不利。解法是保留 top-3 块并拼接，但用特殊分隔符（如 `[SEP]`）标记块边界，让模型知道哪些是独立片段。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从 prompt 约束、模型微调、后处理修正三个层面回答。第一层，在 prompt 中加硬约束和结构化输出，强制生成器引用上下文。第二层，替换为指令微调模型或做 faithfulness 微调，让模型更听话。第三层，引入 NLI 检测模块，低分时触发重生成。总结一句：高 context precision 说明检索没问题，问题全在生成侧，核心是让生成器‘闭嘴’只读上下文。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 prompt 约束和模型微调都试了，faithfulness 还是低，怎么办？

> 检查上下文质量：高 precision 不代表上下文包含足够信息。可能是检索返回的文档虽然相关，但缺失关键细节（如只返回了摘要而非原文）。解法：增加检索深度（如 top-k 从 5 提到 10），并用 reranker 过滤掉低信息密度的文档。另外，检查生成器的 tokenizer 是否截断了上下文（如 Llama 2 的 4K 窗口），如果截断，用 sliding window 或 chunking 策略。

**追问 2**：你提到用 NLI 模型检测 faithfulness，但 NLI 模型本身也有误差，怎么处理？

> 用集成策略：同时用两个 NLI 模型（如 BART-large-MNLI 和 DeBERTa-v3-large），取平均分数。如果两者分歧大（如一个判 0.9，一个判 0.3），则标记为“不确定”，触发人工审核或重生成。另外，NLI 模型对否定句和反事实句敏感，需要做数据增强：在训练数据中加入“答案与上下文矛盾”的负例，提升鲁棒性。

**追问 3**：在系统设计中，如何衡量 faithfulness 改进的效果？

> 用两个指标：**Faithfulness Score**（NLI 模型判定的比例）和 **Human Evaluation**（抽样 200 条，让标注员判断答案是否基于上下文）。同时监控 **Context Precision** 是否下降（防止修复 faithfulness 时误伤检索）。如果 faithfulness 提升但 precision 下降，说明修复过度，需要调整阈值或约束强度。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 直接说“增加检索结果数量”或“优化 embedding 模型” → ✅ 高 context precision 说明检索没问题，问题在生成侧，不要动检索。
- ❌ 只提 prompt 工程，不提模型微调或后处理 → ✅ 需要展示完整调试链：prompt → 模型 → 后处理 → 反馈循环。
- ❌ 说“用更大的模型（如 GPT-4）就能解决” → ✅ 大模型也可能不忠实，需要具体方法（如指令约束、NLI 检测），而不是依赖模型规模。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在 XX 项目中遇到过类似问题”切入，描述你如何用 NLI 检测 + 重生成修复 faithfulness，并给出具体指标提升（如从 0.6 到 0.85）。
- **如果你只做过传统 NLP**：用“文本摘要中的忠实度问题”类比，说明你如何用 NLI 模型检测摘要是否忠实于原文，并迁移到 RAG 场景。
- **如果你是校招无项目**：聚焦“我复现过一篇 faithfulness 检测的论文（如《Faithfulness in RAG: A Survey》）”，并描述你如何用 BART-large-MNLI 在 HotpotQA 上做实验，对比不同 prompt 的效果。

#### 7️⃣ 延伸阅读

- 《Faithfulness in RAG: A Survey》—— 系统梳理 faithfulness 检测与修复方法
- 《Self-Check: A Method for Detecting Hallucinations in LLMs》—— 基于 LLM 的 self-check 技术
- 《DeBERTa: Decoding-enhanced BERT with Disentangled Attention》—— NLI 模型基础
- 《Llama 3.1: A Foundation Model for Instruction Following》—— 指令微调模型

# 第 1 章 · RAG（检索增强生成） · 综合 真题答 (下)
