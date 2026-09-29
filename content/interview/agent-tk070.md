---
slug: agent-tk070
no: "970"
title: "为什么需要 Action、Observation"
question: "为什么需要 Action、Observation"
excerpt: "面试官想考察你对 Agent 系统核心循环（ReAct）的底层理解，而非单纯背概念。这是典型的“系统设计 + debug”混合题。刁钻点在于：很多人只背了“Action 是执行，Observation 是反馈”，但说不清"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3998
updated: "2026-09-29"
---

## 为什么需要 Action、Observation

#### 1️⃣ 考察意图

面试官想考察你对 Agent 系统核心循环（ReAct）的底层理解，而非单纯背概念。这是典型的“系统设计 + debug”混合题。刁钻点在于：很多人只背了“Action 是执行，Observation 是反馈”，但说不清为什么不能把两者合并成一个步骤，或者为什么 Observation 必须结构化而非自然语言。答好了能展示你对 Agent 完整流程、状态管理、错误恢复的实战认知，以及是否踩过 Action 执行失败、Observation 解析错误的坑。

#### 2️⃣ 标准答

Action 和 Observation 是 ReAct 循环（Reasoning + Acting）的骨架，缺一不可。核心原因有三：**解耦执行与感知、提供结构化反馈、支撑错误恢复**。

**1. 解耦执行与感知**

- Action 是模型对外部世界的“写操作”，比如调用 API（`search(query)`）、执行代码（`run_python(code)`）、操作文件（`write_file(path, content)`）。它必须可观测、可回滚。
- Observation 是模型从外部世界“读操作”的结果，比如 API 返回的 JSON、代码执行报错、文件内容。
- **为什么不能合并？** 如果 Action 和 Observation 绑在一起（比如模型直接输出“我搜索了 X，结果是 Y”），模型就无法区分“我做了什么”和“我看到了什么”，导致状态混乱。例如，Action 执行失败（网络超时），Observation 应该是“错误：超时”，而不是模型臆想的“搜索成功”。
- **工程取舍**：Action 必须幂等（idempotent），否则重复执行会污染状态。例如，`send_email()` 不能重复发送，而 `search()` 可以。实践中用 Action ID 去重。

**2. 提供结构化反馈**

- Observation 不是自然语言，而是结构化数据（JSON、状态码、错误栈）。这直接决定了 Agent 的纠错能力。
- **实际落地的坑**：早期 Agent 把 Observation 直接拼到 Prompt 里，结果模型被长文本淹没，忽略关键错误。解法：用 `Observation` 字段显式标记，并设计“关键信息提取器”（如正则匹配错误码），只把结构化摘要注入下一轮 Thought。
- **为什么 Observation 必须结构化？** 模型推理依赖精确信息。如果 Observation 是“搜索返回了 10 条结果，第一条是...”，模型可能误以为所有结果都有效。正确做法：返回 `{"status": "success", "results": [...], "error": null}`，让模型按字段解析。

**3. 支撑错误恢复与循环终止**

- ReAct 循环的终止条件依赖 Observation。例如，Action 是 `solve_math_problem(equation)`，Observation 是 `{"answer": 42}`，模型判断“答案已得”后停止。
- **错误恢复**：如果 Observation 是 `{"error": "API rate limit exceeded"}`，模型应触发重试策略（如等待 5 秒后重试），而非继续推理。
- **工程取舍**：Observation 不能无限累积。实践中用滑动窗口（保留最近 5 轮 Observation）或摘要压缩（用 LLM 把历史 Observation 总结成一句话），避免上下文爆炸。

**总结**：Action 是 Agent 的“手”，Observation 是“眼”。没有 Action，模型只是空想；没有 Observation，模型无法感知真实世界，会陷入幻觉循环。ReAct 循环的精髓就是“想-做-看-再想”，每一步都依赖前一步的精确反馈。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，Action 和 Observation 解耦了执行与感知，避免模型混淆‘我做了什么’和‘我看到了什么’；第二，Observation 必须结构化，提供精确反馈，否则模型会忽略关键错误；第三，它们支撑错误恢复和循环终止，比如 API 超时后触发重试。总结一句：没有 Action 和 Observation，Agent 就是一个闭门造车的推理器，无法与真实世界交互。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 Observation 很大（比如返回 1000 行日志），你怎么处理？

> 用“摘要 + 关键帧”策略。首先，对 Observation 做结构化解析，提取关键字段（如错误码、状态码、关键数据行）。其次，用滑动窗口保留最近 3 轮完整 Observation，更早的用 LLM 压缩成一句话摘要。例如，`{"summary": "前 5 轮搜索均返回空结果，第 6 轮找到目标"}`。工程取舍：摘要会丢失细节，所以对“错误恢复”场景，保留原始 Observation 的哈希值，方便回溯。

**追问 2**：Action 执行失败（比如 API 挂了），Agent 怎么知道该重试还是放弃？

> 依赖 Observation 中的错误类型。如果是临时错误（HTTP 429、503），用指数退避重试（最多 3 次，间隔 1s/2s/4s）。如果是永久错误（HTTP 400、401），直接标记为“不可恢复”，让模型换策略。实践中，在 Action 定义里加 `retry_policy` 字段，比如 `{"action": "search", "retry": {"max_attempts": 3, "backoff": "exponential"}}`。模型通过 Observation 中的 `attempt` 计数决定下一步。

**追问 3**：Thought 和 Action 之间为什么需要显式区分？不能直接输出 Action 吗？

> 可以，但会丢失推理过程。Thought 是模型内部推理的“日志”，用于解释为什么选这个 Action。没有 Thought，Agent 变成黑盒，无法 debug。例如，模型输出 `Action: search("weather")`，但 Observation 返回错误，没有 Thought 你就不知道模型是猜的还是推理的。工程取舍：Thought 会增加 Token 消耗，但换来可解释性和调试能力。实践中，对高精度场景（如金融交易）保留 Thought，对低延迟场景（如简单问答）可省略。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Action 就是模型输出，Observation 就是模型输入” → ✅ 正确：Action 是模型对外部系统的调用，Observation 是外部系统的响应，两者都是 Agent 框架管理的，不是模型直接生成的。
- ❌ 说“Observation 可以省略，模型自己推理就行” → ✅ 正确：Observation 是 Agent 与真实世界的唯一接口，省略后模型会基于幻觉推理，导致错误累积。
- ❌ 说“Action 和 Observation 的顺序不重要” → ✅ 正确：ReAct 循环严格遵循 Thought → Action → Observation → Thought，顺序错乱会导致状态机崩溃（比如模型在 Observation 之前就输出下一个 Action）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索结果作为 Observation”切入，说明 Action 是 `retrieve(query)`，Observation 是 `{"docs": [...], "relevance_scores": [...]}`，然后模型根据 Observation 决定是否重新检索或直接回答。
- **如果你只做过传统 NLP**：用“对话系统中的用户反馈”类比：Action 是模型输出回复，Observation 是用户的下一条消息（或评分），模型根据 Observation 调整策略。
- **如果你是校招无项目**：聚焦 ReAct 论文（Yao et al., 2023）的复现 demo，说明你手动实现了 Action 和 Observation 的循环，并分析了不同 Observation 格式对任务成功率的影响。
- ReAct: Synergizing Reasoning and Acting in Language Models (Yao et al., 2023)
- Toolformer: Language Models Can Teach Themselves to Use Tools (Schick et al., 2023)
- LangChain Agent 源码中的 `AgentExecutor` 实现（`_take_next_step` 方法）
- “Action and Observation in Agent Systems” – 一篇关于结构化 Observation 设计的博客（作者：Lilian Weng）
- 指数退避重试策略的 RFC 规范（RFC 7231, Section 6.3.2）

---
