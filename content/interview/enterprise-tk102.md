---
slug: enterprise-tk102
no: "1002"
title: "What is the difference between zero-shot and few-shot prompting"
question: "What is the difference between zero-shot and few-shot prompting"
excerpt: "面试官想考察你对 LLM 核心能力——上下文学习（In-Context Learning, ICL）的理解深度，而非简单背诵定义。刁钻点在于：你是否能说清 zero-shot 和 few-shot 在模型推理机制上的本质"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3856
updated: "2026-09-29"
---

## What is the difference between zero-shot and few-shot prompting

#### 1️⃣ 考察意图

面试官想考察你对 LLM 核心能力——上下文学习（In-Context Learning, ICL）的理解深度，而非简单背诵定义。刁钻点在于：你是否能说清 zero-shot 和 few-shot 在模型推理机制上的本质差异（是“指令遵循” vs “模式匹配”），以及在实际工程中如何根据任务复杂度、token 预算和示例质量做取舍。答好了能展示你对 LLM 行为特性的直觉、工程落地时的成本意识，以及进阶的示例选择策略（如动态 few-shot）。

#### 2️⃣ 标准答

**核心定义与机制差异**

- **Zero-shot**：直接给任务指令，不提供任何输入-输出示例。模型依赖预训练阶段积累的通用知识和指令遵循能力（instruction following）来推理。例如：“将以下句子翻译成法语：Hello world.” 模型靠对“翻译”语义的理解直接输出。
- **Few-shot**：在 prompt 中插入 k 个（通常 1-5 个）输入-输出示例，然后给出新输入。模型利用上下文学习（ICL）能力，从示例中隐式推断任务模式（pattern matching），而非显式学习参数。例如：先给“苹果 -> apple”、“书 -> book”，再问“猫 -> ?”。模型通过类比输出“cat”。

**核心区别：指令遵循 vs 模式匹配**

- Zero-shot 更依赖模型对指令的语义理解，适合简单、通用任务（如情感分类、翻译）。但模型可能因指令歧义或知识盲区而失败。
- Few-shot 通过示例“锚定”任务格式和输出分布，能处理复杂、领域特定任务（如法律合同条款提取）。示例提供了隐式的“输出空间约束”，比如让模型学会输出 JSON 格式而非自由文本。

**工程取舍：性能 vs 成本**

- **性能**：Few-shot 通常更准，尤其当任务需要特定格式或领域知识时。例如，在医疗诊断摘要任务中，zero-shot 可能输出自由文本，而 few-shot 通过示例强制输出结构化字段（如“症状：xxx；诊断：xxx”）。
- **成本**：Few-shot 消耗更多 token，每多一个示例就增加输入长度。对于 GPT-4，1 个示例约 200 token，5 个示例就是 1000 token，按 \$0.03/1K token 计算，成本增加 5 倍。对于高吞吐场景（如客服机器人），必须权衡。
- **示例质量**：示例选择是关键坑。随机选示例可能引入噪声，甚至降低性能。例如，情感分类中若示例全是“正面”，模型会偏向输出正面。解法：用基于检索的动态 few-shot（如基于 embedding 相似度从知识库中选最相关的示例），能提升 5-10% 准确率（参考 DPR 论文思路）。

**实际落地的坑与解法**

- **坑 1**：示例顺序敏感。模型对示例顺序敏感，尤其是开头和结尾的示例影响最大。解法：固定示例顺序，或做多次实验找最优排列。
- **坑 2**：示例与任务不匹配。例如，在代码生成任务中，示例用 Python 但目标语言是 Java，模型会输出 Python 代码。解法：确保示例与目标任务在领域、格式、语言上完全一致。
- **坑 3**：zero-shot 指令模糊。例如，“总结这段文本”可能输出 100 字或 10 字。解法：在指令中显式指定输出长度、格式（如“用 3 个要点总结，每个要点不超过 20 字”）。

**进阶：动态 few-shot 选择**

- 固定 few-shot 是静态的，无法适应输入多样性。动态 few-shot 基于输入 embedding 从示例库中检索最相似的 k 个示例（类似 RAG 的检索阶段）。工具：用 Sentence-BERT 或 OpenAI embedding API 计算相似度。效果：在开放域 QA 任务上，动态 few-shot 比随机 few-shot 提升 15-20% 的 F1 分数（参考《Learning to Retrieve Prompts for In-Context Learning》论文）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从机制、工程取舍和进阶策略三个层面回答。机制上，zero-shot 靠指令遵循，few-shot 靠模式匹配；工程上，few-shot 更准但 token 成本高，且示例质量决定成败；进阶上，动态 few-shot 通过检索最相关示例能明显提升性能。总结一句：选 zero-shot 还是 few-shot，取决于任务复杂度、token 预算和示例可用性。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 few-shot 示例选得不好，性能可能比 zero-shot 还差，你怎么避免？

> 这是真实坑。应对：1）示例必须代表任务分布，避免单一类别或格式。例如，情感分类中示例应覆盖正面、负面、中性。2）用交叉验证：从示例库中随机抽 3-5 组示例，在验证集上测试，选最优组。3）如果示例库小，用 zero-shot 作为 baseline，若 few-shot 低于 baseline，则回退到 zero-shot。4）动态 few-shot 能自动选最相关示例，减少人工试错成本。

**追问 2**：在实时系统中，few-shot 的 token 消耗太大，你怎么优化？

> 核心是压缩示例长度。1）用更短的示例：例如，情感分类示例从“这部电影很棒 -> 正面”压缩为“很棒 -> 正面”。2）用示例摘要：对长文本示例，用 LLM 生成摘要作为示例输入。3）用示例索引：如果任务格式固定（如 JSON），只提供 1 个示例，其余用指令描述格式。4）缓存示例 embedding：动态 few-shot 的检索阶段可预计算示例 embedding，避免每次推理都重新计算。

**追问 3**：zero-shot 和 few-shot 在模型微调后还有区别吗？

> 有。微调后，模型对指令的遵循能力更强，zero-shot 性能可能接近 few-shot。但 few-shot 仍能处理微调时未覆盖的领域。例如，微调后的 GPT-4 在通用任务上 zero-shot 准确率可达 90%，但 few-shot 在特定格式（如输出 Markdown 表格）上仍有优势。工程上，微调后优先用 zero-shot 以节省 token，只在复杂任务上 fallback 到 few-shot。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“zero-shot 就是模型没训练过，few-shot 就是训练过” → ✅ 正确说法：两者都是推理时行为，不涉及参数更新。zero-shot 靠指令，few-shot 靠上下文示例。
- ❌ 说“few-shot 一定比 zero-shot 好” → ✅ 正确说法：few-shot 通常更准，但示例质量差时可能更差。需要实验验证，且 token 成本更高。
- ❌ 说“示例越多越好” → ✅ 正确说法：示例数量存在边际效应，通常 3-5 个最佳。超过 5 个可能引入噪声或超出模型上下文窗口。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“动态 few-shot 与 RAG 检索的相似性”切入，说明如何用 embedding 检索示例来提升 few-shot 效果，并对比 token 成本。
- **如果你只做过传统 NLP**：用“监督学习 vs 迁移学习”类比：zero-shot 像零样本分类（如 BERT 的 CLS token），few-shot 像小样本学习（如 prototypical networks），强调 LLM 的 ICL 能力是隐式学习。
- **如果你是校招无项目**：聚焦论文复现：引用《Language Models are Few-Shot Learners》（GPT-3 论文）中的实验，说明 zero-shot 和 few-shot 在算术、翻译等任务上的性能差异，并设计一个简单实验（如用 OpenAI API 在情感分类上对比）。
- 《Language Models are Few-Shot Learners》（GPT-3 论文，定义 zero-shot/few-shot 范式）
- 《Learning to Retrieve Prompts for In-Context Learning》（动态 few-shot 检索方法）
- 《Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?》（示例机制分析）
- 《What Makes Good In-Context Examples for GPT-3?》（示例选择策略）
- OpenAI 官方文档：Prompt Engineering Guide（zero-shot/few-shot 最佳实践）

---
