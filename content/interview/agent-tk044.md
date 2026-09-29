---
slug: agent-tk044
no: "944"
title: "Agent 的规划模块是怎么实现的"
question: "Agent 的规划模块是怎么实现的"
excerpt: "面试官想考察你对 Agent 架构中“规划”与“执行”分离的设计理解，而非单纯背诵 ReAct 或 CoT 概念。刁钻点在于：规划模块不是一次生成完整计划，而是动态调整的循环过程。答好了能展示你对任务分解、工具调用、错误"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3559
updated: "2026-09-29"
---

## Agent 的规划模块是怎么实现的

#### 1️⃣ 考察意图

面试官想考察你对 Agent 架构中“规划”与“执行”分离的设计理解，而非单纯背诵 ReAct 或 CoT 概念。刁钻点在于：规划模块不是一次生成完整计划，而是动态调整的循环过程。答好了能展示你对任务分解、工具调用、错误恢复的工程落地能力，以及区分“静态规划”与“动态规划”的硬实力。

#### 2️⃣ 标准答

Agent 的规划模块实现核心是 **Plan-Execute 循环**，而非一次性输出。主流方案分三层：

- **任务分解（Task Decomposition）**用 CoT（Chain-of-Thought）或 Tree-of-Thought（ToT）将用户意图拆解为子任务。例如，用户说“帮我订去北京的机票和酒店”，模型先输出 Thought：“需要先查航班，再查酒店，最后确认支付”。工程取舍：CoT 简单但易陷入局部最优；ToT 通过 BFS/DFS 搜索多路径，但计算成本高（GPT-4 调用量翻倍）。实际中常用 CoT + 人工预设模板（如“先查后订”）平衡。
- **动态规划（Dynamic Planning）**采用 **ReAct** 模式：Thought → Action → Observation → 修正。例如，Agent 先执行“查航班”Action，若 API 返回“无直达”，Observation 触发修正：Thought 改为“查中转航班”，再执行新 Action。实际落地的坑：API 错误（如超时）会导致循环死锁。解法：加入 **重试机制**（最多 3 次）和 **回退策略**（若连续失败，回退到上一步重新规划）。例如，在 LangChain 的 AgentExecutor 中设置 `max_iterations=5` 和 `early_stopping_method="generate"`。
- **规划与执行分离（Plan-Execute Architecture）**将规划器（Planner）和执行器（Executor）解耦。Planner 用 LLM（如 GPT-4）生成步骤列表，Executor 逐步调用工具（如搜索、数据库）。为什么这么做：避免 LLM 在每一步都重新规划，减少 token 消耗和幻觉。例如，在旅行助手 Agent 中，Planner 输出：

`Step 1: Search flights (tool: flight_api)**Step 2: Search hotels (tool: hotel_api)
Step 3: Confirm payment (tool: payment_gateway)
`Executor 按序执行，若 Step 1 失败，Planner 重新生成剩余步骤（如“改为查火车票”）。工程取舍：分离增加系统复杂度（需维护状态机），但提升可观测性（可记录每步日志）。实际中，用 Hugging Face Transformers Agent** 的 `run` 方法或 **AutoGPT** 的 `execute` 循环实现。

- **记忆与上下文管理**规划模块依赖短期记忆（当前步骤）和长期记忆（历史错误）。例如，用 **ChromaDB** 存储失败案例，下次类似任务直接复用修正策略。坑：记忆膨胀导致上下文窗口溢出。解法：用 **滑动窗口**（保留最近 5 步）或 **摘要压缩**（用 LLM 总结关键信息）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，任务分解，用 CoT 或 ToT 将用户意图拆成子任务；第二，动态规划，通过 ReAct 循环让模型根据 Observation 修正计划；第三，规划与执行分离，用 Planner 生成步骤列表、Executor 逐步调用工具，避免 token 浪费。总结一句：Agent 规划不是一次生成，而是 Plan→Execute→Observation→修正的完整流程，核心是平衡灵活性和稳定性。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 Planner 生成的步骤列表有逻辑错误（比如先订酒店再查航班），怎么处理？

> 应对策略：引入 **验证器（Validator）** 模块。在 Planner 输出后，用另一个 LLM 调用（或规则引擎）检查步骤顺序。例如，用 GPT-4 的 `function calling` 模式，让模型输出 JSON 格式的步骤，然后校验依赖关系（如“查航班”必须在“订酒店”之前）。若校验失败，重新生成。实际中，在 LangChain 的 `PlanAndExecute` agent 中，Validator 是可选组件，但生产环境必须启用，否则用户会投诉。

**追问 2**：ReAct 模式中，如果 Observation 返回空值（比如搜索无结果），Agent 怎么继续？

> 应对策略：设计 **Fallback 策略**。在 Observation 为空时，Agent 应输出 Thought：“搜索无结果，尝试更宽松的查询条件”，然后执行新 Action（如“搜索‘北京到上海 机票’改为‘北京到上海 交通’”。具体实现：在 Prompt 中注入“若 Observation 为空，则修改查询参数”的指令。若连续 3 次失败，回退到 Planner 重新生成步骤。例如，在 AutoGPT 中，用 `retry_after_failure` 参数控制。

**追问 3**：规划模块如何支持多 Agent 协作？

> 应对策略：采用 **Hierarchical Planning**。主 Planner 将任务分配给子 Agent（如“搜索 Agent”和“支付 Agent”），子 Agent 各自执行 Plan-Execute 循环。通信通过共享内存（如 Redis）或消息队列（如 RabbitMQ）实现。工程取舍：增加通信开销，但提升并行度。实际中，用 **CrewAI** 框架的 `Task` 和 `Agent` 类实现，每个子 Agent 有独立规划器。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“规划模块就是让 LLM 输出一个步骤列表，然后按顺序执行” → ✅ 正确切入：规划是动态循环，必须包含错误恢复和修正机制，不能一次生成就完事。
- ❌ 说“用 ReAct 就够了，不需要规划与执行分离” → ✅ 正确切入：ReAct 适合简单任务，但复杂任务（如多步工具调用）需要分离，否则 token 消耗和幻觉率会飙升。
- ❌ 说“规划模块只依赖 LLM，不需要外部工具” → ✅ 正确切入：规划必须与工具调用（如 API、数据库）绑定，否则无法落地。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“规划模块与检索的交互”切入，强调 Planner 如何决定何时检索（如“先检索知识库，再生成回答”），并对比 ReAct 与 Plan-Execute 在检索场景的差异。
- **如果你只做过传统 NLP**：用“任务分解类比”迁移，比如将 CoT 比作传统 NLP 中的序列标注（如 NER 的 BIO 标签），强调规划是“动态序列生成”，而非静态模板。
- **如果你是校招无项目**：聚焦论文复现，比如用 Hugging Face Transformers Agent 实现一个“天气查询 Agent”，展示 CoT + ReAct 的代码片段，并说明如何用 `max_iterations` 防止死循环。
- 《ReAct: Synergizing Reasoning and Acting in Language Models》（Yao et al., 2023）
- 《Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Dividing and Conquering》（Wang et al., 2023）
- 《Tree-of-Thought: Deliberate Problem Solving with Large Language Models》（Yao et al., 2023）
- LangChain 官方文档：Agent 与 Plan-Execute 架构
- AutoGPT 源码分析：规划与执行循环的实现细节

---
