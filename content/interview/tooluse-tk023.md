---
slug: tooluse-tk023
no: "923"
title: "面试官问：「MCP 和 Skills 有什么区别？「——你开始支支吾吾"
question: "面试官问：「MCP 和 Skills 有什么区别？「——你开始支支吾吾"
excerpt: "面试官想看的不是你对两个名词的背诵，而是对 Agent 系统中“能力抽象层”与“通信协议层”的本质区分。这是 P1 进阶题，考察类型是系统设计 + 工程取舍。刁钻点在于：很多人把 MCP 当成 Skills 的替代品，或"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4593
updated: "2026-09-29"
---

## 面试官问：「MCP 和 Skills 有什么区别？「——你开始支支吾吾

#### 1️⃣ 考察意图

面试官想看的不是你对两个名词的背诵，而是对 Agent 系统中“能力抽象层”与“通信协议层”的**本质区分**。这是 P1 进阶题，考察类型是**系统设计 + 工程取舍**。刁钻点在于：很多人把 MCP 当成 Skills 的替代品，或把 Skills 当成 MCP 的客户端，实际两者是**正交**的。答好了能展示你对 Agent 架构分层、工具集成模式、以及生产环境选型的硬实力，尤其是面对多工具源、多技能复用的复杂场景时，能做出合理的 trade-off 决策。

#### 2️⃣ 标准答

**核心结论**：MCP（Model Context Protocol）是**通信协议**，Skills 是**能力封装单元**。两者不是二选一，而是 Agent 架构中不同层的组件。

**1. 定义与定位**

- **MCP**：由 Anthropic 提出的开放协议，定义 Agent 与外部工具/数据源之间的标准化交互方式。类似 USB 协议——你不需要关心设备内部如何工作，只要它符合 MCP 规范，Agent 就能动态发现、调用它。MCP 的核心是**工具发现**（通过 `list_tools` 端点）和**工具调用**（通过 `call_tool` 端点），支持实时注册、参数校验、错误处理。
- **Skills**：Agent 内部定义的可复用能力单元，通常包含**自然语言描述**（告诉 LLM 何时用）和**调用逻辑**（代码实现）。Skills 是 Agent 的“肌肉记忆”，比如“处理退款”这个 Skill 可能包含：调用订单 API、检查退款条件、触发退款流程、记录日志。Skills 的核心是**任务分解**和**状态管理**，可以嵌套、组合、复用。

**2. 本质区别**

| 维度 | MCP | Skills |
|---|---|---|
| 抽象层次 | 协议层（如何通信） | 能力层（做什么） |
| 关注点 | 工具集成、动态发现、标准化 | 任务分解、逻辑封装、复用 |
| 生命周期 | 外部服务，独立部署 | 内部定义，随 Agent 启动 |
| 典型场景 | 接入第三方 API（如 Slack、GitHub） | 封装业务逻辑（如“生成周报”） |
| 错误处理 | 协议级错误（超时、认证失败） | 业务级错误（退款失败、数据不一致） |

**3. 实际落地的坑 + 解法**

- **坑 1：把 MCP 当成 Skills 的替代品**。有人用 MCP 封装所有业务逻辑，导致每个 Skill 变成一个 MCP 服务，Agent 启动时拉取几十个工具列表，LLM 上下文被撑爆。**解法**：MCP 只用于**外部工具**（第三方 API、数据库、文件系统），内部业务逻辑用 Skills 封装。一个 Skill 内部可以调用多个 MCP 工具，比如“处理退款” Skill 内部调用 MCP 的“订单查询”和“支付网关”工具。
- **坑 2：Skills 之间共享状态混乱**。多个 Skills 同时操作同一份数据（如用户会话），导致竞态条件。**解法**：引入**技能上下文**（Skill Context），每个 Skill 执行时获得一个隔离的上下文副本，写操作通过事件总线同步。参考 LangChain 的 `BaseTool` 和 `ToolExecutor` 设计模式。
- **坑 3：MCP 工具发现延迟**。生产环境中，MCP 服务可能因为网络抖动导致 `list_tools` 超时，Agent 卡住。**解法**：实现**工具缓存**，首次发现后缓存工具元数据（TTL 5 分钟），并支持降级——缓存失效时使用上次成功的结果，同时异步刷新。

**4. 选型建议**

- **用 MCP**：需要接入第三方工具（Slack、GitHub、数据库）、工具源动态变化（用户自定义插件）、跨 Agent 共享工具。
- **用 Skills**：封装复杂业务逻辑（多步骤、有状态）、需要技能复用（多个 Agent 共享同一技能库）、对延迟敏感（Skills 在进程内调用，MCP 有网络开销）。
- **两者结合**：MCP 提供工具生态，Skills 提供业务编排。例如，一个“智能客服” Agent：MCP 集成订单查询 API、物流 API，Skills 定义“退款处理”“物流查询”“投诉升级”等业务单元。每个 Skill 内部调用 MCP 工具，并维护自己的状态机。

**5. 工程取舍**

- **MCP 的代价**：标准化带来灵活性，但增加网络延迟和协议解析开销。如果所有工具都在本地，用 MCP 是过度设计，直接用函数调用（Function Calling）更高效。
- **Skills 的代价**：内部封装导致复用性受限，不同 Agent 的 Skills 可能重复实现。需要引入**技能注册中心**（类似 MCP 的发现机制）来管理 Skills 的元数据，但会增加架构复杂度。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，MCP 是通信协议，Skills 是能力封装，两者是正交的，不是替代关系。第二，MCP 关注工具集成和动态发现，Skills 关注任务分解和逻辑复用。第三，选型时，接入第三方工具用 MCP，封装业务逻辑用 Skills，生产环境建议两者结合——MCP 提供工具生态，Skills 提供业务编排。总结一句：MCP 是 Agent 的‘USB 接口’，Skills 是 Agent 的‘肌肉记忆’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果我的 Agent 只用内部 API，还需要 MCP 吗？

> 不需要。MCP 的价值在于标准化和动态发现，如果所有工具都是内部 API 且固定不变，直接用 Function Calling 更轻量。但要注意：如果未来需要接入第三方工具，或工具列表会动态变化（比如用户自定义插件），MCP 的提前引入能降低迁移成本。一个 trade-off：MCP 增加约 20-50ms 的协议解析延迟，而 Function Calling 是零开销。所以，如果延迟敏感且工具固定，选 Function Calling；如果灵活性和可扩展性优先，选 MCP。

**追问 2**：Skills 和 MCP 工具如何共享同一个 LLM 上下文？

> 核心是**上下文隔离**。MCP 工具调用时，LLM 上下文只包含工具返回的结果，不包含工具内部状态。Skills 执行时，可以访问完整的 Agent 上下文（用户意图、历史对话、当前状态）。一个常见做法：Skills 内部维护一个**技能上下文**（Skill Context），包含当前技能需要的变量（如订单 ID、用户 ID），而 MCP 工具只接收参数和返回结果。这样，Skills 可以组合多个 MCP 工具的结果，而 MCP 工具保持无状态。参考 OpenAI 的 `function_call` 和 Anthropic 的 `tool_use` 设计，两者在上下文管理上本质一致。

**追问 3**：MCP 和 Skills 在错误处理上有什么不同？

> MCP 的错误是协议级的，比如超时（默认 30 秒）、认证失败（401）、工具不存在（404）。Agent 需要处理这些错误并决定是否重试或降级。Skills 的错误是业务级的，比如“退款失败：余额不足”。Skills 内部可以包含重试逻辑（最多 3 次，指数退避）、回滚操作（如取消订单）、或触发人工审核。一个关键区别：MCP 错误通常由 Agent 框架捕获并返回给 LLM 重新规划，而 Skills 错误由 Skills 自身处理，只有无法恢复时才上报给 Agent。生产环境中，建议 MCP 工具实现**幂等性**（如订单查询），Skills 实现**事务性**（如退款操作需要回滚）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“MCP 是 Skills 的升级版，以后 Skills 会被 MCP 取代” → ✅ 正确切入：MCP 和 Skills 是不同抽象层次，MCP 是协议，Skills 是能力，两者可以共存。MCP 不会取代 Skills，就像 HTTP 协议不会取代业务逻辑。
- ❌ 说“Skills 就是 MCP 工具的封装，没有本质区别” → ✅ 正确切入：Skills 可以包含多个 MCP 工具调用、状态管理、业务规则，而 MCP 工具是单一功能的无状态接口。Skills 是“业务流程”，MCP 工具是“原子操作”。
- ❌ 说“MCP 只能用于外部工具，Skills 只能用于内部逻辑” → ✅ 正确切入：MCP 也可以用于内部工具（如数据库查询），但会增加不必要的网络开销。Skills 也可以调用外部 API（通过 MCP），但更常见的做法是 Skills 内部调用 MCP 工具。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“工具集成 vs 能力封装”角度切入，说明 RAG 中的检索器（MCP 工具）和生成器（Skills）如何分层。强调你如何用 MCP 动态接入多个数据源（如 Elasticsearch、Pinecone），用 Skills 封装查询改写、结果重排等业务逻辑。
- **如果你只做过传统 NLP**：用“函数调用 vs 业务流程”类比。传统 NLP 中，意图识别（Skills）和实体抽取（MCP 工具）是分离的。说明你理解 MCP 是标准化接口，Skills 是业务逻辑单元，两者结合能构建更灵活的 Agent。
- **如果你是校招无项目**：聚焦 MCP 和 Skills 的论文/博客理解。可以提 Anthropic 的 MCP 规范（2024 年发布）和 OpenAI 的 Function Calling（2023 年），对比两者的设计哲学。强调你做过一个 demo：用 MCP 集成天气 API，用 Skills 封装“生成出行建议”业务逻辑。
- Anthropic MCP 规范（2024）：Model Context Protocol 官方文档
- OpenAI Function Calling 文档：Function Calling 与 Tool Use 的最佳实践
- LangChain Tool 设计模式：BaseTool、ToolExecutor 与 Agent 上下文管理
- “Skills vs Tools: A Practical Guide to Agent Architecture” by LangChain Blog
- “MCP: The USB-C for AI Agents” by Anthropic Engineering Blog

---
