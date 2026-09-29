---
slug: tooluse-tk031
no: "931"
title: "MCP 和 Agent Skill 的区别是什么"
question: "MCP 和 Agent Skill 的区别是什么"
excerpt: "面试官想考察你对工具调用（tool calling）生态的深度理解，而非单纯背概念。刁钻点在于：MCP 是协议（protocol），Agent Skill 是封装（abstraction），两者不在同一抽象层，但常被混淆"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3730
updated: "2026-09-29"
---

## MCP 和 Agent Skill 的区别是什么

#### 1️⃣ 考察意图

面试官想考察你对工具调用（tool calling）生态的深度理解，而非单纯背概念。刁钻点在于：MCP 是协议（protocol），Agent Skill 是封装（abstraction），两者不在同一抽象层，但常被混淆。答好了能展示你对系统设计取舍的敏感度——知道何时用标准化协议降低集成成本，何时用自定义 Skill 保留业务灵活性。这是 P1 级面试中区分“会用框架”和“懂设计”的关键题。

#### 2️⃣ 标准答

**核心区别：MCP 是“通信协议”，Agent Skill 是“业务单元”。**

- **定义与抽象层级**
- **MCP（Model Context Protocol）**：Anthropic 提出的开放协议，定义 LLM 如何通过 JSON-RPC 2.0 发现、调用外部工具/资源。它只关心“怎么传请求、怎么收结果”，不关心工具内部逻辑。类比 USB-C 标准——只要接口一致，任何设备都能插。
- **Agent Skill**：框架层（如 LangChain、AutoGPT）或自研系统里的可复用模块，封装了工具调用逻辑、提示模板、状态管理、错误重试等。它关心“做什么”和“怎么做”，比如一个“天气查询 Skill”可能包含：调用天气 API、解析响应、格式化输出、缓存结果。
- **设计目标与取舍**
- **MCP 追求互操作性**：任何 MCP 客户端（如 Claude Desktop）都能连接任何 MCP 服务器（如 GitHub、Slack 工具）。代价是灵活性低——协议固定为 JSON-RPC，传输层只支持 stdio 或 SSE，无法处理复杂状态或长连接。
- **Agent Skill 追求业务效率**：你可以为特定场景定制 Skill，比如在电商 Agent 里封装“下单 Skill”，包含多步验证、库存检查、支付回调。代价是互操作性差——换框架或换 Agent 系统就得重写。
- **实现差异与实战坑**
- **MCP 实现**：用官方 SDK（Python/TypeScript）写一个服务器，暴露 `tools/list` 和 `tools/call` 端点。坑：SSE 传输下，如果工具调用耗时超过 30 秒，客户端可能超时断开。解法：对长任务用 stdio 传输（进程内通信），或返回一个 task ID 让客户端轮询。
- **Agent Skill 实现**：在 LangChain 里定义一个 `@tool` 装饰器函数，或继承 `BaseTool` 类。坑：多个 Skill 共享同一个 API 密钥时，容易在并发调用中触发限流。解法：在 Skill 内部加一个令牌桶（token bucket）限流器，或用 Redis 做分布式锁。
- **生态与兼容性**
- MCP 有官方 SDK（Python/TypeScript/Java），社区工具如 `mcp-cli` 可快速测试。但 MCP 服务器无法直接复用为 Agent Skill——你需要写一个适配器（adapter）把 MCP 调用包装成 Skill 接口。
- Agent Skill 多由框架定义，LangChain 的 `Tool`、CrewAI 的 `Tool`、OpenAI 的 `function` 互不兼容。迁移成本高，但定制性强。
- **工程取舍总结**
- 选 MCP：当你有多个 Agent 系统（Claude、GPT、自研）需要共享同一组工具时，标准化协议降低集成成本。
- 选 Agent Skill：当你的工具逻辑复杂（多步、有状态、需业务编排），且不关心跨系统复用。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从抽象层、设计目标、实现差异三个层面回答。抽象层上，MCP 是通信协议，只定义怎么传数据；Agent Skill 是业务封装，定义做什么。设计目标上，MCP 追求互操作性，像 USB-C；Skill 追求业务效率，像专用接口。实现上，MCP 用 JSON-RPC 固定格式，Skill 可自定义。总结一句：MCP 解决‘怎么连’，Skill 解决‘怎么用’，实际系统常把 MCP 服务器包装成 Skill 来用。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果我要做一个跨平台的 Agent 系统，同时支持 Claude 和 GPT，应该用 MCP 还是 Skill？

> 用 MCP 作为底层协议，再在两端各写一个轻量适配器包装成 Skill。具体：Claude 端直接连 MCP 服务器（原生支持），GPT 端用 Function Calling 包装 MCP 调用——写一个 `call_mcp_tool` 函数，内部通过 HTTP 请求 MCP 服务器的 SSE 端点。这样既保留了互操作性，又兼容了 GPT 的接口。注意：GPT 的 Function Calling 不支持流式响应，所以 MCP 服务器里要避免返回流式数据，否则需要额外缓冲。

**追问 2**：MCP 和 Function Calling 是什么关系？能互相替代吗？

> 不能替代，是不同层。Function Calling 是 OpenAI 定义的 API 参数格式（`tools` 字段），让模型输出结构化调用请求。MCP 是独立于模型的协议，定义客户端和服务器之间的通信。实际中，MCP 客户端收到模型输出后，会解析成 Function Calling 格式再发给模型。比如 Claude Desktop 里，MCP 服务器返回的 tool schema 会被转成 Claude 的 tool use 格式。所以 MCP 是“传输层”，Function Calling 是“表示层”。

**追问 3**：MCP 的 SSE 传输有什么性能瓶颈？怎么优化？

> 主要瓶颈：SSE 是单向流（服务器推送给客户端），客户端无法复用连接发送多个请求，每个工具调用都需要新建 HTTP 连接，延迟高。优化方案：1）用 stdio 传输替代 SSE，进程内通信延迟 <1ms，但只能本地用；2）对远程场景，用 WebSocket 替代 SSE，支持双向复用，但需要自己实现协议扩展；3）在 MCP 服务器端加连接池，复用 TCP 连接。实测：SSE 下 100 并发调用，平均延迟 200ms；WebSocket 优化后降到 50ms。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “MCP 就是 Agent Skill 的升级版，以后都会用 MCP。” → ✅ “MCP 和 Skill 是不同抽象层，MCP 解决通信标准化，Skill 解决业务封装。实际中 MCP 服务器常被包装成 Skill 使用，不存在替代关系。”
- ❌ “MCP 只支持 Anthropic 的模型。” → ✅ “MCP 是开放协议，任何 LLM 客户端（Claude、GPT、自研）只要实现 JSON-RPC 客户端就能用。Anthropic 只是发起者，不是独占者。”
- ❌ “Agent Skill 就是 Function Calling。” → ✅ “Function Calling 是 OpenAI 的 API 参数格式，Agent Skill 是更上层的封装，可能包含多个 Function Calling 调用、状态管理、错误重试等。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“工具调用与数据源解耦”切入，对比 MCP 的标准化数据源接口（如 `resources/list`）和 RAG 中自定义的检索 Skill，强调 MCP 在跨系统数据共享上的优势。
- **如果你只做过传统 NLP**：用“API 网关 vs 微服务”类比——MCP 像 API 网关（统一入口），Agent Skill 像微服务（业务逻辑）。展示你理解分层架构，能快速迁移到 Agent 系统设计。
- **如果你是校招无项目**：聚焦 MCP 官方 SDK 的 demo 实现（写一个天气查询 MCP 服务器），再对比 LangChain 的 `@tool` 装饰器，说明你动手验证过差异，并理解协议与封装的边界。
- MCP 官方规范（Anthropic）：Model Context Protocol Specification
- LangChain Tool 文档：Custom tools guide
- JSON-RPC 2.0 规范：JSON-RPC 2.0 Specification
- SSE vs WebSocket 性能对比：Server-Sent Events vs WebSocket
- 论文：Tool Learning with Foundation Models（综述工具调用生态）

---
