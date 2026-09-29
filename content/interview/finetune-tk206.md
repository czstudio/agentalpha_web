---
slug: finetune-tk206
no: "1106"
title: "Function Call 训练数据怎么构建"
question: "Function Call 训练数据怎么构建"
excerpt: "面试官想考察你对 LLM 训练数据构建的工程化理解，而非背诵论文。刁钻点在于：Function Call 数据不是简单“指令+回复”，它涉及函数定义、参数绑定、多轮上下文、边界情况（如无参数、参数缺失、多函数选择）。答好"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3255
updated: "2026-09-29"
---

## Function Call 训练数据怎么构建

`P1` · `llm_training`

📊 考点：fine-tuning

🏷 标签：`training-data, function-call, data-construction`

#### 1️⃣ 考察意图

面试官想考察你对 LLM 训练数据构建的工程化理解，而非背诵论文。刁钻点在于：Function Call 数据不是简单“指令+回复”，它涉及函数定义、参数绑定、多轮上下文、边界情况（如无参数、参数缺失、多函数选择）。答好了能展示你从数据驱动角度优化模型能力的硬实力，包括数据质量、多样性、覆盖度，以及如何通过 badcase 反哺迭代。

#### 2️⃣ 标准答

构建 Function Call 训练数据，核心是**从真实场景出发，覆盖函数定义、调用、边界和错误恢复**。以下是分步方法：

- **数据来源与种子函数库**从开源数据集（如 ToolBench、Gorilla、API Bank）或内部日志中提取 100-500 个真实 API，每个 API 包含：函数名、参数列表（含类型、必选/可选）、描述。
- 关键：函数名需无歧义（如 `get_weather` 而非 `weather`），参数名遵循 camelCase 或 snake_case 统一风格，避免模型混淆。
生成调用样本
- 基于种子函数，用规则或 LLM 生成“用户指令→函数调用”对。例如：指令：“北京明天天气如何？” → 调用：`get_weather(location="北京", date="2024-03-15")`
- 覆盖场景：单函数调用、多函数并行（如同时查天气和航班）、多步链式调用（先查航班再订票）。
工程取舍：规则生成保证格式正确但缺乏多样性；LLM 生成丰富但可能引入幻觉。实践中混合使用：规则生成 60% 基础样本，LLM 生成 40% 复杂样本，并人工校验 10%。边界与错误覆盖
- 必须包含：无参数调用（`get_time()`）、参数缺失（用户未提供必选参数）、参数类型错误（`location=123`）、多函数歧义（“查天气”对应 `get_weather` 和 `get_forecast`）。
- 实际落地的坑：模型在参数缺失时容易“编造”默认值（如 `location="北京"` 当用户没说）。解法：在训练数据中显式加入“参数缺失→返回错误提示”的样本，并让模型学会输出 `{"error": "missing_required_param", "param": "location"}`。
多轮上下文数据
- 模拟真实对话：用户先问“北京天气”，再问“那上海呢？” → 模型需继承上一轮函数上下文，输出 `get_weather(location="上海")`。
- 数据格式：用 `[{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]` 结构，并在 assistant 回复中嵌入函数调用标记（如 `<function_call>get_weather(...)</function_call>`）。
日志驱动反哺
- 从线上日志收集 badcase：模型误调用、参数错误、拒绝调用（应调用时没调）。例如，用户说“帮我订机票”，模型输出 `book_flight()` 但参数为空。解法：将这些 badcase 标注后加入训练集，并增加“参数缺失→追问用户”的样本。
- 迭代周期：每周收集 500-1000 条 badcase，清洗后增量微调，避免灾难性遗忘。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据来源、样本生成、边界覆盖三个层面回答。数据来源上，基于开源 API 库和内部日志构建种子函数；样本生成上，混合规则和 LLM 生成，覆盖单调用、多调用和链式调用；边界覆盖上，重点处理参数缺失、类型错误和多函数歧义，并通过日志 badcase 反哺。总结一句：高质量 Function Call 数据的关键是真实场景覆盖 + 边界错误处理 + 持续迭代。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你怎么保证生成的数据不重复或低质量？

> 用去重策略：基于函数名和参数值的哈希去重（如 `hash("get_weather(location=北京)")`），并设置相似度阈值（如编辑距离 < 0.2 视为重复）。质量上，用规则校验：参数类型匹配、必选参数存在、函数名在库中。对 LLM 生成的数据，随机抽 5% 人工审核，若错误率 > 10% 则重跑生成。

**追问 2**：如果模型在线上频繁拒绝调用（应调用时没调），怎么修？

> 这是典型的“欠调用”问题。解法：在训练数据中增加“明确调用意图”的样本，例如用户说“帮我查一下” → 模型输出 `search()`。同时，从日志中收集“用户预期调用但模型没调”的 badcase，标注后加入训练。还可以在 prompt 中加指令：“当用户请求涉及可用函数时，必须输出函数调用，除非明确拒绝。”

**追问 3**：多函数并行调用（如同时查天气和航班）的数据怎么构造？

> 构造“复合指令”样本，如“查北京明天天气和后天去上海的航班”。模型需输出并行调用：`[get_weather(location="北京", date="2024-03-15"), search_flights(from="北京", to="上海", date="2024-03-16")]`。数据格式用 JSON 数组，并在训练时让模型学会用 `[` 和 `]` 包裹。难点是参数冲突（如两个函数都有 `date` 参数），需在数据中显式区分。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提“用 GPT 生成数据” → ✅ 必须说明混合策略：规则生成保证格式正确，LLM 生成增加多样性，并人工校验。
- ❌ 忽略边界情况（如参数缺失、类型错误） → ✅ 重点覆盖这些场景，并让模型学会输出错误提示而非编造。
- ❌ 认为数据一次构建就够 → ✅ 强调日志驱动反哺，每周迭代，避免模型在线上退化。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索增强生成”角度切入，说明 Function Call 数据构建类似 RAG 中的 query-document 对，但更强调参数绑定和错误处理。
- **如果你只做过传统 NLP**：用“序列标注”类比，函数名和参数是标签，用户指令是输入，需覆盖 OOV（未登录词）和边界情况。
- **如果你是校招无项目**：聚焦开源数据集（如 ToolBench）的复现，展示你理解数据格式、生成逻辑和边界覆盖，并附上 GitHub demo。

#### 7️⃣ 延伸阅读

- ToolBench: An Open Platform for Training Large Language Models with Tool-Use Capabilities
- Gorilla: Large Language Model Connected with Massive APIs
- API Bank: A Benchmark for Tool-Augmented LLMs
- 论文：Data Augmentation for Function-Calling in LLMs via Rule-Based and LLM-Based Generation
- 博客：How to Build High-Quality Training Data for Tool-Use LLMs (Anthropic 内部技术分享)

---
