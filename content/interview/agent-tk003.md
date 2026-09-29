---
slug: agent-tk003
no: "903"
title: "说说 LLM 和 Agent 的核心区别？为什么现在大家都在从 LLM 迈向 Agent"
question: "说说 LLM 和 Agent 的核心区别？为什么现在大家都在从 LLM 迈向 Agent"
excerpt: "面试官想看你是否真正理解 LLM 的局限性，以及 Agent 作为系统级架构的增量价值。这题看似基础，但刁钻点在于：很多人只会背“Agent = LLM + 工具”，却说不清为什么 LLM 本身无法完成真实任务。答好了能"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3419
updated: "2026-09-29"
---

## 说说 LLM 和 Agent 的核心区别？为什么现在大家都在从 LLM 迈向 Agent

#### 1️⃣ 考察意图

面试官想看你是否真正理解 LLM 的局限性，以及 Agent 作为系统级架构的增量价值。这题看似基础，但刁钻点在于：很多人只会背“Agent = LLM + 工具”，却说不清为什么 LLM 本身无法完成真实任务。答好了能展示你对“静态生成 vs 动态执行”的认知深度，以及从模型到系统的工程思维切换——这是大厂做 Agent 落地（如字节 Coze、阿里百炼）的核心门槛。

#### 2️⃣ 标准答

**核心区别：LLM 是推理引擎，Agent 是行动系统。**

LLM 本质是一个**静态文本生成器**：给定 prompt，输出 token，无状态、无目标、无行动。而 Agent 在 LLM 基础上叠加了三个关键层：**规划（Planning）**、**记忆（Memory）**、**工具调用（Tool Use）**，使其能自主执行多步任务。

**1. 规划能力**

- LLM 只能做单轮推理，无法分解复杂目标。Agent 通过 ReAct（Reasoning + Acting）或 Plan-and-Solve 模式，将“帮我订机票”拆解为：查日期 → 搜航班 → 比价 → 下单。
- **工程取舍**：ReAct 用 CoT 推理 + 行动交替，但 token 开销大；Plan-and-Solve 先规划再执行，效率高但容错差。实际落地（如 AutoGPT）常用混合策略：先规划骨架，再逐行动作验证。

**2. 记忆系统**

- LLM 的上下文窗口是短期记忆，超限即遗忘。Agent 需要**结构化记忆**：短期（对话历史）、长期（向量数据库）、工作记忆（当前任务状态）。
- **实际坑**：很多人直接把所有历史塞进 prompt，导致 token 爆炸。解法是用**滑动窗口 + 摘要压缩**：保留最近 N 轮对话，对早期内容用 LLM 生成摘要存入向量库，检索时只取 Top-K 相关片段。例如 LangChain 的 ConversationSummaryMemory 就是典型实现。

**3. 工具调用**

- LLM 无法直接操作外部系统。Agent 通过 Function Calling（如 OpenAI 的 tool_use API）或 ReAct 模式，将自然语言指令转为 API 调用。
- **关键 trade-off**：工具定义越细，LLM 选择越准，但 prompt 越长。实践中用**工具分组 + 路由**：比如“搜索”类工具统一归到 search_group，LLM 先选组，再选具体工具，减少决策空间。

**为什么从 LLM 迈向 Agent？**

- **企业需求驱动**：LLM 只能“聊天”，无法替代人力。Agent 能执行真实任务（如自动回复邮件、操作数据库），直接产生业务价值。
- **技术成熟度**：2023 年 GPT-4 的 Function Calling 和 2024 年 Claude 的 Tool Use 让工具调用稳定可用；向量数据库（Pinecone、Milvus）和 RAG 框架（LlamaIndex）降低了记忆系统门槛。
- **成本下降**：推理成本从 2022 年的 \$0.02/1K tokens 降到 2024 年的 \$0.002/1K tokens，使得多步 Agent 调用在经济上可行。

**总结**：LLM 是 Agent 的“大脑”，但 Agent 才是完整的“身体”。没有规划、记忆、工具的 LLM，就像只有智商没有手脚的天才。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，核心区别——LLM 是静态推理引擎，Agent 是动态行动系统，多了规划、记忆、工具三层。第二，为什么转向 Agent——企业需要能执行任务的数字员工，而 LLM 只能聊天；技术成熟度（Function Calling、向量数据库）和成本下降让 Agent 可落地。第三，总结一句：LLM 是大脑，Agent 是完整的人，没有后者，前者无法创造实际价值。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说 Agent 需要记忆，那短期记忆和长期记忆怎么协同？具体怎么实现？

> 短期记忆用滑动窗口（比如保留最近 20 轮对话），长期记忆用向量数据库（如 Chroma）。协同策略：每次 Agent 行动前，先检查短期记忆是否有相关上下文；如果没有，从长期记忆检索 Top-5 片段，注入 prompt。注意：检索结果要带时间戳，避免过时信息干扰。实际坑：长期记忆的 embedding 模型需要和 Agent 任务对齐，比如客服场景用 sentence-transformers/all-MiniLM-L6-v2，代码场景用 code-bert。

**追问 2**：Agent 的规划能力怎么保证不跑偏？比如 ReAct 模式容易陷入死循环。

> 两个解法：一是**最大步数限制**（比如最多 10 步），超时强制返回；二是**验证节点**（Verification Step），每步执行后让 LLM 自检“当前结果是否接近目标”，如果连续 3 步无进展则回退到上一步。工程上，字节 Coze 的 Agent 用了**状态机**：定义 IDLE、PLANNING、EXECUTING、VERIFYING 四个状态，每个状态有超时和异常处理，避免死循环。

**追问 3**：Agent 的工具调用如果失败（比如 API 超时），怎么处理？

> 重试机制：第一次失败后等待 1 秒重试，最多 3 次。如果仍失败，让 LLM 重新选择工具（比如搜索 API 挂了，改用本地数据库查询）。注意：重试策略要区分**可恢复错误**（网络超时）和**不可恢复错误**（权限不足），后者直接报错并让 Agent 向用户请求权限。实际落地中，阿里百炼的 Agent 用了**熔断机制**：同一工具连续失败 5 次，自动禁用 10 分钟。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Agent 就是 LLM 加个 API 调用” → ✅ 正确切入：Agent 是系统级架构，包含规划、记忆、工具三层，API 调用只是工具层的一部分，缺少规划和记忆的“Agent”只是带工具的 LLM，无法自主执行多步任务。
- ❌ 说“LLM 和 Agent 没有本质区别，只是应用场景不同” → ✅ 正确切入：本质区别在于 LLM 无状态、无目标、无行动，Agent 有状态机、目标分解、行动循环，这是架构层面的差异，不是场景标签。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“RAG 是 Agent 的简化版”切入，说明你的检索模块对应 Agent 的记忆层，但缺少规划和工具调用，所以项目下一步可以扩展为 Agent。
- **如果你只做过传统 NLP**：用“传统 NLP 的 pipeline（分词→NER→分类）类比 Agent 的规划层”，说明 Agent 的规划就是动态 pipeline，只是用 LLM 替代了规则。
- **如果你是校招无项目**：聚焦“ReAct 论文复现 demo”，说明你手动实现了 ReAct 循环（用 GPT-4 API + 简单工具如计算器），并对比了纯 LLM 和 Agent 在“查询天气并提醒带伞”任务上的差异。
- ReAct: Synergizing Reasoning and Acting in Language Models (Yao et al., 2022)
- Toolformer: Language Models Can Teach Themselves to Use Tools (Schick et al., 2023)
- LangChain Agent 官方文档：Agent Types 与 Tool Calling 实现
- 字节 Coze Agent 架构解析：状态机与工具路由设计
- 阿里百炼 Agent 实践：熔断机制与错误恢复策略
