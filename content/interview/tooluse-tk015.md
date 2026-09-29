---
slug: tooluse-tk015
no: "915"
title: "如何评估一个「好「的工具设计"
question: "如何评估一个「好「的工具设计"
excerpt: "面试官想看你能否从"设计原则"角度评估工具质量，而非仅看功能是否实现。刁钻点在于：很多人只答"能用就行"，但说不出原子性、幂等性、自描述性等设计原则，以及如何量化评估工具质量。答好了能展示你在 API 设计和 Agent"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4130
updated: "2026-09-29"
---

## 如何评估一个「好「的工具设计

#### 1️⃣ 考察意图

面试官想看你能否从"设计原则"角度评估工具质量，而非仅看功能是否实现。刁钻点在于：很多人只答"能用就行"，但说不出原子性、幂等性、自描述性等设计原则，以及如何量化评估工具质量。答好了能展示你在 API 设计和 Agent 工程方面的成熟度。

#### 2️⃣ 标准答

好的工具设计遵循"ARISE"原则——Atomic（原子性）、Robust（鲁棒性）、Introspective（自描述性）、Stable（稳定性）、Efficient（高效性）：

**1. 原子性（Atomic）—— 一个工具只做一件事**

- **原则**：每个工具只完成一个明确的功能，不混合多个操作。例如 `search` 只搜索，`send_email` 只发邮件，而不是 `search_and_email` 混合工具
- **为什么**：(1) LLM 更容易理解单一功能的工具，选择准确率更高；(2) 单一功能的工具可以灵活组合（如 search→format→send_email）；(3) 错误隔离——一个工具失败不影响其他工具
- **反模式**：`manage_user(action, data)` 工具通过 `action` 参数决定"创建/删除/修改/查询"——LLM 难以判断何时用哪个 action，且一个工具的 bug 影响所有用户管理操作
- **评估指标**：工具功能数 = 1（理想），>1 需要拆分

**2. 鲁棒性（Robust）—— 错误可恢复**

- **原则**：工具在异常输入、网络故障、依赖服务不可用时，返回结构化的错误信息而非崩溃
- **错误处理**：(1) 参数校验失败 → 返回 `{status: "error", error_type: "invalid_param", message: "amount must be positive"}`；(2) 超时 → 返回 `{status: "timeout", message: "search took >5s"}`；(3) 服务不可用 → 返回 `{status: "unavailable", message: "Bing API is down"}`
- **为什么**：Agent 需要根据错误类型决定下一步——重试、换工具、或降级。非结构化错误（如 Python 异常 traceback）LLM 无法理解
- **评估指标**：错误恢复率 = 工具失败后 Agent 能继续执行的比例。目标 >90%

**3. 自描述性（Introspective）—— LLM 能理解何时用、怎么用**

- **原则**：工具的 `name` 和 `description` 足够清晰，LLM 无需额外上下文就能正确选择和使用
- **好的描述**：`"search_web: Search the internet for real-time information. Use this when the user asks about current events, weather, stock prices, or any information that may be outdated in your training data. Parameters: query (string, the search terms), limit (int, max results, default 5)."`
- **差的描述**：`"search: Search tool."`——太简短，LLM 不知道何时用、搜索什么
- **评估指标**：工具选择准确率——给定应该用该工具的问题，LLM 选择该工具的比例。目标 >90%

**4. 稳定性（Stable）—— 高可用、低延迟、行为一致**

- **高可用**：工具服务 SLA >99.9%（每月停机 <43 分钟）
- **低延迟**：P95 延迟 <2s（实时工具 <500ms）
- **行为一致**：相同参数返回相同结果（幂等性）。对于非幂等工具（如 `send_email`），重复调用返回明确的"已发送"状态而非重复发送
- **评估指标**：可用率、P95 延迟、幂等性测试通过率

**5. 高效性（Efficient）—— 资源消耗合理**

- **Token 效率**：工具返回值简洁——返回 Agent 需要的信息而非全部原始数据。例如搜索工具返回 Top-5 结果的摘要（~500 tokens）而非完整网页内容（~5000 tokens）
- **调用效率**：支持批量操作——`search_batch(queries: list)` 一次搜索多个关键词，而非多次调用 `search(query)`
- **评估指标**：平均 token 消耗、单任务平均调用次数

#### 3️⃣ 答题模板（30 秒电梯版）

> "好工具设计遵循ARISE原则：Atomic原子性——一个工具一件事，便于LLM选择和组合。Robust鲁棒性——错误返回结构化信息（status+error_type+message），Agent可据此决定重试/换工具/降级。Introspective自描述性——name和description足够清晰，LLM无需额外上下文就能正确选择。Stable稳定性——SLA>99.9%、P95<2s、幂等性。Efficient高效性——返回值简洁（500token而非5000）、支持批量操作。评估：工具选择准确率>90%、错误恢复率>90%。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：工具描述写多长合适？太长会不会影响 LLM 推理？

> 最佳长度约 50-150 tokens。太短（<30 tokens）LLM 不知道何时用；太长（>200 tokens）占用上下文窗口且 LLM 可能忽略关键信息。写法：(1) 第一句话说明功能——"Search the internet for real-time information"；(2) 第二句话说明使用场景——"Use when user asks about current events, weather, stock prices"；(3) 参数说明——每个参数一句话，包含类型和含义。避免在描述中写示例代码——太占 token 且 LLM 不需要

**追问 2**：非幂等工具（如 send_email）怎么处理重复调用？

> 三层防护：(1) 请求 ID（idempotency key）——每次调用附带唯一 ID，服务端记录已处理的 ID。相同 ID 的重复请求返回"已处理"而非重复执行。类似于 Stripe 的 idempotency key；(2) 状态检查——执行前先检查"是否已经发送过"。例如 `send_email` 前检查 `outbox` 表是否已有相同 `message_hash` 的记录；(3) 确认机制——高风险非幂等工具（如 `transfer_money`）在执行前要求用户确认，确认后才真正执行。如果 Agent 因网络重试触发重复调用，服务端根据 idempotency key 返回上次的结果

**追问 3**：工具的返回值应该返回原始数据还是处理后的数据？

> 返回"Agent 需要的信息"而非"全部原始数据"。原则：(1) 摘要而非全文——搜索工具返回标题+摘要+URL，而非完整网页内容。Agent 不需要 5000 tokens 的原始 HTML；(2) 结构化而非非结构化——返回 JSON `{title, summary, url, published_date}` 而非纯文本；(3) 过滤而非全量——只返回与查询相关的字段。例如 `get_user` 只返回 `{name, email}` 而非完整的用户记录（包含密码哈希等敏感字段）。例外：如果 Agent 的任务需要原始数据（如代码分析 Agent 需要完整源代码），则返回完整数据

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "工具功能越多越好，减少调用次数" → ✅ "多功能工具降低 LLM 选择准确率且增加 bug 影响范围。应该拆分为原子工具，通过组合实现复杂功能。"
- ❌ "工具描述随便写写就行，LLM 会自己理解" → ✅ "工具描述是 LLM 选择工具的唯一依据。描述不清会导致工具选择准确率从 90% 降到 60%。需要像写 API 文档一样认真写工具描述。"
- ❌ "工具出错直接抛异常就行" → ✅ "异常 traceback 对 LLM 不可读。需要捕获异常并返回结构化错误 `{status, error_type, message}`，让 Agent 能据此决定下一步。"

#### 6️⃣ 简历呼应

- **如果你有工具设计项目**：从"Agent 工具集设计"切入，描述你设计的工具集遵循 ARISE 原则，给出工具选择准确率和错误恢复率数据
- **如果你只做过 API 设计**：用"RESTful API 设计原则"迁移——资源粒度、错误处理、版本管理等概念直接适用，额外需要的是"LLM 可读性"和"Token 效率"
- **如果你是校招无项目**：设计一套 Agent 工具（5-10 个），对比好描述 vs 差描述对工具选择准确率的影响
- "API Design Guidelines" (Google, 2024)
- "Tool Design for LLM Agents" (Qin et al., 2023)
- "Gorilla: Large Language Model Connected with Massive APIs" (Patil et al., 2023)

---
