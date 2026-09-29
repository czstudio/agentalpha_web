---
slug: agent-tk060
no: "960"
title: "Agent 推理模式有哪些？ReAct 是啥？具体是怎么实现的"
question: "Agent 推理模式有哪些？ReAct 是啥？具体是怎么实现的"
excerpt: "面试官想看你是否真正理解 Agent 推理的工程本质，而非只背概念。这道题表面问“有哪些模式”，但刁钻点在于：ReAct 不是唯一解，而是 trade-off 产物。答好了能展示你对推理-行动耦合的底层理解（如循环终止、"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3710
updated: "2026-09-29"
---

## Agent 推理模式有哪些？ReAct 是啥？具体是怎么实现的

#### 1️⃣ 考察意图

面试官想看你是否真正理解 Agent 推理的工程本质，而非只背概念。这道题表面问“有哪些模式”，但刁钻点在于：**ReAct 不是唯一解，而是 trade-off 产物**。答好了能展示你对推理-行动耦合的底层理解（如循环终止、工具调用解析、状态管理），以及能否在复杂场景下选择合适模式。考察类型：系统设计 + 工程取舍。

#### 2️⃣ 标准答

Agent 推理模式主流有四种：**ReAct**（推理-行动循环）、**Plan-and-Execute**（先规划后执行）、**Chain-of-Thought**（纯推理链）、**Reflexion**（带反馈的自省）。ReAct 是当前最实用的基线，下面重点展开。

**ReAct 核心**：将推理（Reasoning）与行动（Acting）交替，形成“思考→行动→观察”循环。它源自论文《ReAct: Synergizing Reasoning and Acting in Language Models》，本质是让 LLM 在每一步生成结构化输出，驱动工具调用。

**具体实现步骤**：

1. **提示词设计**：定义输出格式，例如：

- `Thought: 我需要计算公司市值，先查股价。`
- `Action: search_tool["AAPL stock price"]`
- `Observation: 150.25 USD`
- `Thought: 股价 150.25，流通股 16B，市值 = 150.25 * 16B = 2.404T。`
- `Final Answer: 市值约 2.4 万亿美元。`关键：用 `Action` 字段触发工具调用，`Observation` 字段注入结果。

1. **工具定义**：每个工具需注册为 JSON schema，包含名称、描述、参数。例如：

`{
"name": "search_tool",
"description": "搜索实时信息",
"parameters": {"query": {"type": "string"}}
}
`模型输出后，解析 `Action` 字段，匹配工具名，提取参数，执行并返回结果。

1. **循环控制**：设置最大步数（如 10 步）和停止条件（检测到 `Final Answer` 或超时）。实际落地坑：模型可能陷入死循环（如重复搜索同一问题），需加“重复检测”逻辑——若连续 3 步 `Action` 相同，强制终止并报错。
2. **错误处理**：工具调用可能失败（如 API 超时），需在 `Observation` 中注入错误信息，让模型重新推理。例如：

- `Observation: Error: search_tool timeout`
- 模型应生成 `Thought: 搜索失败，尝试备用工具。`

**工程取舍**：

- **ReAct vs. Plan-and-Execute**：ReAct 适合动态环境（如实时搜索），但推理开销大（每次循环都调用 LLM）；Plan-and-Execute 适合确定性任务（如代码生成），但无法应对中间变化。实际中，ReAct 更通用，但需控制步数避免成本爆炸。
- **ReAct vs. Chain-of-Thought**：CoT 无工具调用，适合纯推理（如数学题）；ReAct 引入外部知识，但依赖工具质量。若工具返回噪声（如搜索摘要不准确），ReAct 可能被误导，需加 rerank 过滤。

**实际落地的坑 + 解法**：

- **坑**：模型输出格式不稳定（如 `Action` 字段拼写错误）。**解法**：用 few-shot 示例 + 正则回退解析（如匹配 `Action:` 后的内容），若失败则重试一次。
- **坑**：工具调用结果太长（如搜索返回 10 页），超出上下文窗口。**解法**：对 `Observation` 做截断（如取前 500 token），或使用滑动窗口压缩。

**变体**：

- **ReAct + 记忆**：用向量数据库存储历史 `Thought` 和 `Observation`，避免重复推理。例如，LangChain 的 `ConversationalAgent` 实现。
- **ReAct + 规划**：先让模型生成高维计划（如“步骤1：查股价；步骤2：计算市值”），再逐步骤执行 ReAct。这减少循环次数，但增加一次规划调用。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，Agent 推理模式有 ReAct、Plan-and-Execute、CoT、Reflexion，核心区别是推理与行动的耦合度。第二，ReAct 是推理-行动交替循环，通过结构化输出（Thought/Action/Observation）驱动工具调用，实现动态决策。第三，实现关键包括提示词设计、工具注册、循环控制和错误处理，实际落地需注意格式解析和上下文截断。总结一句：ReAct 是 Agent 的基线模式，适合动态场景，但需 trade-off 步数与成本。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：ReAct 和 Plan-and-Execute 在什么场景下选哪个？

> 选 ReAct 当任务不确定性强（如“搜索某公司新闻并总结”），需要实时调整；选 Plan-and-Execute 当任务可分解为固定步骤（如“生成报告：先查数据，再画图，最后写结论”）。工程上，ReAct 更灵活但成本高（每步一次 LLM 调用），Plan-and-Execute 更高效但容错差（规划失败则全盘错）。实际中，我常用混合方案：先规划，再对每个步骤用 ReAct 执行。

**追问 2**：如何防止 ReAct 陷入死循环？

> 三个策略：1）设置最大步数（如 10 步），超时强制返回当前结果；2）检测重复 Action（如连续 3 步相同），触发回退或报错；3）引入“终止令牌”，让模型在 `Final Answer` 后停止生成。此外，可加“思考预算”限制 token 数，避免模型无限推理。

**追问 3**：ReAct 中工具调用结果太长怎么办？

> 核心是截断和压缩。1）对 `Observation` 做 token 截断（如取前 500 token），保留关键信息；2）使用滑动窗口，只保留最近 N 步的观察；3）若工具支持，加参数控制返回长度（如搜索 API 的 `max_results`）。更高级方案：用摘要模型压缩观察结果，但会增加延迟。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只背概念：“ReAct 就是思考-行动循环，CoT 是思考链。” → ✅ 深入实现细节：讲提示词格式、工具解析、循环控制，并对比实际 trade-off（如步数 vs. 成本）。
- ❌ 忽略工程坑：“ReAct 实现很简单，用 LangChain 就行。” → ✅ 指出具体坑：格式不稳定、上下文溢出、死循环，并给解法（正则回退、截断、重复检测）。
- ❌ 混淆模式：“ReAct 和 CoT 一样，都是推理。” → ✅ 明确区别：CoT 无工具调用，ReAct 有外部交互；ReAct 适合动态场景，CoT 适合纯推理。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成循环”切入，类比 ReAct 的“推理-行动循环”，强调工具调用（如搜索 API）与 RAG 的检索器异同，展示对状态管理的理解。
- **如果你只做过传统 NLP**：用“序列决策”类比，将 ReAct 的每一步视为一个“动作选择”（类似强化学习），强调提示词设计如何约束模型输出，展示迁移能力。
- **如果你是校招无项目**：聚焦论文复现，讲 ReAct 论文中的实验设置（如 HotpotQA 数据集），并提一个 demo（如用 OpenAI API 实现简单搜索 Agent），展示动手能力。
- 《ReAct: Synergizing Reasoning and Acting in Language Models》 - 原始论文
- 《Plan-and-Solve Prompting》 - Plan-and-Execute 变体
- 《Reflexion: Language Agents with Verbal Reinforcement Learning》 - Reflexion 模式
- LangChain Agent 文档 - 工程实现参考
- 《Toolformer: Language Models Can Teach Themselves to Use Tools》 - 工具调用基础

---
