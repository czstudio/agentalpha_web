---
slug: tooluse-tk071
no: "971"
title: "MCP 和 Function Calling 的区别"
question: "MCP 和 Function Calling 的区别"
excerpt: "面试官想考察你对工具调用（Tool Calling）的底层理解深度，而非单纯背概念。核心是：MCP（Model Context Protocol）和 Function Calling 本质上是不同抽象层的产物。Funct"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4330
updated: "2026-09-29"
---

## MCP 和 Function Calling 的区别

#### 1️⃣ 考察意图

面试官想考察你对工具调用（Tool Calling）的底层理解深度，而非单纯背概念。核心是：**MCP（Model Context Protocol）和 Function Calling 本质上是不同抽象层的产物**。Function Calling 是模型侧的原生能力（API 参数），MCP 是应用侧的协议标准（服务发现与调用）。刁钻点在于：很多人误以为 MCP 是 Function Calling 的替代品，实际它们是互补关系。答好了能展示你对 LLM 生态分层（模型层 vs 应用层）的清晰认知，以及工程落地的系统设计能力。

#### 2️⃣ 标准答

**核心区别：抽象层级与设计哲学**

- **Function Calling**：是模型 API 的一个参数（如 OpenAI `tools` 参数），属于**模型原生能力**。模型在生成时，根据用户 query 和预定义的 tool schema（JSON Schema），决定是否调用、调用哪个 tool，并输出结构化的函数参数。本质是**模型推理时的一个决策点**。
- **MCP**：是应用层的一个**开放协议**，类似 HTTP 之于 Web。它定义了 LLM 应用如何动态发现、调用、管理外部工具/数据源。MCP 不关心模型内部如何决策，只关心应用如何与工具服务端通信（如通过 `list_tools` 发现工具，通过 `call_tool` 执行调用）。

**关键差异对比（工程取舍）**

| 维度 | Function Calling | MCP |
|---|---|---|
| **抽象层** | 模型推理层 | 应用集成层 |
| **工具注册** | 静态：开发者写死在 API 请求的 `tools` 参数里 | 动态：MCP 客户端通过协议从服务端发现工具列表 |
| **调用流程** | 模型输出 `tool_calls` → 应用执行 → 结果回传模型 | 应用通过 MCP 客户端调用服务端 → 服务端执行 → 结果回传应用（模型不直接参与） |
| **扩展性** | 差：每加一个工具都要改代码、改 prompt、改 schema | 好：工具作为独立服务部署，MCP 客户端自动发现 |
| **状态管理** | 无：每次调用都是独立的 | 有：MCP 支持资源（Resources）和提示（Prompts），可维护上下文状态 |

**实际落地的坑 + 解法**

- **坑 1：Function Calling 的 schema 膨胀**。当工具数量超过 20 个时，`tools` 参数会变得巨大（OpenAI 限制 `tools` 总 token 数约 8k），导致模型推理变慢、成本飙升。
- **解法**：引入**工具路由层**。先用一个轻量级分类器（如 BM25 + 小模型）粗筛工具，只把 Top-5 的 schema 传给 Function Calling。MCP 天然支持这种模式：MCP 客户端可以维护一个工具索引，按需查询。
- **坑 2：MCP 的延迟问题**。MCP 服务端是独立进程，每次 `call_tool` 都有网络开销（即使本地 IPC 也有延迟）。对于高频工具（如计算器），延迟可能从 Function Calling 的 5ms 飙升到 50ms。
- **解法**：对延迟敏感的工具，用**本地缓存 + 预加载**。MCP 客户端可以预拉取高频工具的 schema 和资源，避免每次发现。或者混合使用：高频工具走 Function Calling 直接嵌入，低频工具走 MCP 动态发现。

**为什么这么做（trade-off）**

- **Function Calling 适合**：工具数量少（<10）、调用频率高、延迟敏感的场景（如实时对话中的计算器、搜索）。因为它是模型原生，延迟最低（<10ms）。
- **MCP 适合**：工具数量多（>50）、需要动态发现、跨服务集成的场景（如企业级 RAG 系统，需要连接数据库、API、文件系统）。因为它的扩展性和解耦性更好，但牺牲了延迟（50-200ms）。

**总结**：两者不是替代关系，而是**分层协作**。Function Calling 解决“模型如何决定调用”，MCP 解决“应用如何执行调用”。一个成熟的系统应该：用 Function Calling 做决策，用 MCP 做执行层。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从抽象层、工程取舍、实际落地三个层面回答。抽象层上，Function Calling 是模型原生能力，MCP 是应用层协议，两者互补。工程取舍上，Function Calling 延迟低但扩展性差，MCP 扩展性好但延迟高。实际落地中，我倾向于混合架构：高频工具用 Function Calling 直接嵌入，低频工具用 MCP 动态发现。总结一句：Function Calling 管决策，MCP 管执行。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：那 MCP 和 Function Calling 能同时用吗？怎么设计？

> 能。典型架构是：模型层用 Function Calling 输出 `tool_calls`，应用层拦截这个输出，解析出工具名和参数，然后通过 MCP 客户端去调用对应的 MCP 服务端。关键设计点：MCP 服务端的工具 schema 必须与 Function Calling 的 schema 保持一致（通常用 JSON Schema 统一）。坑：如果 MCP 服务端返回错误，应用需要决定是重试、降级（用另一个工具）还是直接报错给用户。我一般用**熔断 + 降级**：连续失败 3 次后，切换到备选工具（如从数据库查询降级到本地缓存）。

**追问 2**：MCP 的 `list_tools` 返回的 schema 和 Function Calling 的 `tools` 参数格式一样吗？

> 不完全一样。MCP 的 `list_tools` 返回的是 JSON-RPC 格式，包含 `name`、`description`、`inputSchema`（JSON Schema）。Function Calling 的 `tools` 参数是 OpenAI 定义的格式，包含 `type: "function"`、`function.name`、`function.description`、`function.parameters`（JSON Schema）。但两者底层都是 JSON Schema，所以可以互相转换。实际落地时，我会写一个**适配器层**，把 MCP 的 schema 转成 Function Calling 的格式。注意：MCP 的 `inputSchema` 可能包含 `$ref` 引用，需要先解析扁平化。

**追问 3**：MCP 和 Function Calling 在安全方面有什么不同？

> Function Calling 的安全完全依赖应用层：开发者要自己校验模型输出的参数（如防止 SQL 注入）。MCP 协议本身提供了**权限控制**：MCP 服务端可以定义 `capabilities`（如只允许读操作），客户端可以请求 `scope`（如只访问特定资源）。实际坑：MCP 的权限模型是服务端声明的，客户端不强制校验。所以安全底线还是应用层：我一般会在 MCP 客户端加一层**参数白名单**，只允许调用预定义的参数组合（如 `search` 工具只允许 `query` 和 `limit` 参数，拒绝 `delete` 参数）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “MCP 是 Function Calling 的升级版，以后会取代它。” → ✅ “两者是不同抽象层的产物，Function Calling 解决模型决策，MCP 解决应用集成，互补而非替代。”
- ❌ “MCP 就是 Function Calling 的标准化。” → ✅ “MCP 标准化的是工具发现和调用协议，不是模型决策逻辑。Function Calling 的标准化是 OpenAI 的 `tools` 参数格式，两者标准化的对象不同。”
- ❌ “Function Calling 只能用于 OpenAI，MCP 是开源的。” → ✅ “Function Calling 是模型能力，OpenAI、Anthropic、Google 都支持，只是 API 格式不同。MCP 是协议，任何模型都可以通过应用层接入。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“工具路由”角度切入。例如：“在 RAG 系统中，我用 Function Calling 做查询路由（决定用检索还是生成），用 MCP 做数据源发现（动态连接不同数据库）。这解决了工具 schema 膨胀和跨服务集成的问题。”
- **如果你只做过传统 NLP**：用“API 网关 vs 微服务”类比迁移。例如：“Function Calling 像单体 API，所有工具定义写死在代码里；MCP 像微服务网关，工具作为独立服务注册发现。我理解这是从单体到微服务的演进。”
- **如果你是校招无项目**：聚焦论文复现 demo。例如：“我复现了 OpenAI 的 Function Calling 示例，并对比了 MCP 的 Python SDK。在 demo 中，我实现了混合调用：高频计算器用 Function Calling，低频天气查询用 MCP，验证了延迟差异。”
- OpenAI Function Calling 官方文档（`tools` 参数详解）
- Anthropic Tool Use 文档（对比 OpenAI 的 `tools` 格式差异）
- MCP 协议规范（`list_tools`、`call_tool` 的 JSON-RPC 定义）
- 论文：ToolLLM（工具调用路由与调度）
- 博客：Building a Hybrid Tool Calling System with MCP and Function Calling（工程实践）

---
