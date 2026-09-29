---
slug: tooluse-tk018
no: "918"
title: "MCP 由哪几部分组成"
question: "MCP 由哪几部分组成"
excerpt: "面试官考察你对 MCP（Model Context Protocol）架构的底层理解，而非简单背诵组件名称。这是典型的系统设计 + 概念辨析题，刁钻点在于：很多人只记得“Client/Server/Transport”三"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3946
updated: "2026-09-29"
---

## MCP 由哪几部分组成

`P0` · `tool_calling` · 🏢 Anthropic

#### 1️⃣ 考察意图

面试官考察你对 MCP（Model Context Protocol）架构的底层理解，而非简单背诵组件名称。这是典型的**系统设计 + 概念辨析**题，刁钻点在于：很多人只记得“Client/Server/Transport”三层，却忽略了**协议层（JSON-RPC 2.0）** 和**生命周期管理**。答好了能展示你对 Agent 工具调用标准化协议的全景认知，以及从“调 API”到“设计通信协议”的工程思维跃迁。

#### 2️⃣ 标准答

MCP 由 **四层核心组件 + 可选扩展** 构成，按职责从下往上拆解：

**1. 传输层（Transport Layer）**

- 定义通信载体，当前支持两种模式：
- **stdio**：本地进程间通信，通过 stdin/stdout 交换 JSON 消息。适合本地 Agent 或 CLI 工具，延迟低（<1ms），但无法跨机器。
- **SSE（Server-Sent Events）**：基于 HTTP 的远程通信，服务端推送事件流。适合云端部署，但需处理 CORS 和重连逻辑。
- **工程取舍**：stdio 性能好但无状态，SSE 支持远程但引入网络抖动。实际落地中，**本地开发用 stdio，生产环境用 SSE + 心跳保活**。

**2. 协议层（Protocol Layer）**

- 基于 **JSON-RPC 2.0** 规范，定义消息格式：
- **请求（Request）**：含 `id`、`method`、`params`，例如 `{"id":1, "method":"tools/call", "params":{"name":"add","arguments":{"a":1,"b":2}}}`。
- **通知（Notification）**：无 `id`，服务端主动推送（如资源变更通知）。
- **错误（Error）**：标准错误码（-32700 解析错误、-32600 无效请求等）。
- **关键方法**：服务端必须实现 `initialize`（握手）、`tools/list`（工具列表）、`tools/call`（调用工具）、`resources/list`（资源列表）等。
- **坑**：JSON-RPC 2.0 要求 `id` 唯一，但 MCP 允许 `id` 为 `null` 表示通知。很多新手混淆请求和通知，导致客户端收不到响应。

**3. 客户端层（Client Layer）**

- 即 LLM 应用或 Agent，负责：
- 发起 `initialize` 握手，协商协议版本（当前 v1.0）。
- 调用 `tools/list` 获取工具列表，构建 prompt 让 LLM 选择工具。
- 解析 LLM 输出，调用 `tools/call` 执行工具，并将结果返回给 LLM。
- **实际落地的坑**：客户端必须处理**超时**（工具调用可能卡死）和**重试**（网络抖动）。例如，设置 30 秒超时，失败后重试 2 次，若仍失败则返回错误给 LLM 并让 LLM 决定下一步。

**4. 服务端层（Server Layer）**

- 提供具体工具或数据源，实现标准接口：
- **工具（Tool）**：如加法、搜索、数据库查询，通过 `tools/call` 暴露。
- **资源（Resource）**：如文件、API 数据，通过 `resources/read` 暴露。
- **提示（Prompt）**：预定义模板，通过 `prompts/get` 暴露。
- **生命周期**：服务端有 `initialized`（握手完成）、`running`（正常服务）、`shutdown`（关闭）状态。客户端需在关闭时发送 `shutdown` 通知。

**5. 可选扩展**

- **认证**：OAuth 2.0 或 API Key，在 SSE 模式下通过 HTTP Header 传递。
- **日志**：`logging/message` 通知，服务端可输出调试日志。
- **缓存**：客户端可缓存 `tools/list` 结果（TTL 5 分钟），减少重复请求。

**总结**：MCP 本质是**标准化工具调用协议**，核心是 JSON-RPC 2.0 + 四层架构。面试官期待你从“调 API”升级到“设计通信协议”，并理解各层的工程取舍。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从传输层、协议层、客户端、服务端四个层面回答。传输层支持 stdio 和 SSE，协议层基于 JSON-RPC 2.0 定义请求/通知/错误格式，客户端负责握手和工具调用，服务端实现具体工具和资源。此外还有认证、日志等可选扩展。总结一句：MCP 是 Agent 工具调用的标准化协议，核心是 JSON-RPC 2.0 + 四层架构。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：MCP 和 Function Calling 有什么区别？

> 核心区别是**标准化 vs 定制化**。Function Calling 是 OpenAI 等厂商的私有协议，格式随版本变化（如 GPT-4 的 `functions` 参数到 GPT-4o 的 `tools` 参数）。MCP 是开放协议，通过 JSON-RPC 2.0 统一了工具发现（`tools/list`）和调用（`tools/call`），且支持资源、提示等扩展。工程取舍：Function Calling 集成简单（一行代码），但绑定厂商；MCP 灵活但需自己实现客户端和服务端。实际落地中，**如果只用单一模型，Function Calling 更快；如果多模型或自建 Agent，MCP 更优**。

**追问 2**：MCP 的 stdio 模式如何保证安全？

> stdio 模式本质是本地进程间通信，安全风险在于**恶意子进程**。解法：1）客户端启动服务端时，限制子进程权限（如 `seccomp` 或 `AppArmor`）。2）服务端实现白名单机制，只允许调用预定义工具。3）对工具输入做参数校验（如防止 SQL 注入）。实际坑：很多开发者忽略 stdio 模式下的路径遍历攻击，例如工具接受文件路径参数，攻击者可能传入 `../../etc/passwd`。解法：服务端对路径做 `realpath` 解析并限制在沙箱目录内。

**追问 3**：MCP 如何处理高并发？

> MCP 本身不处理并发，依赖传输层。stdio 模式是单进程，需客户端控制并发（如串行调用或使用进程池）。SSE 模式基于 HTTP，可借助反向代理（如 Nginx）做负载均衡。工程取舍：SSE 支持长连接，但服务端需维护连接池，否则内存泄漏。实际解法：1）服务端使用异步框架（如 FastAPI + asyncio）。2）客户端设置最大并发数（如 10），避免打垮服务端。3）对耗时工具（如数据库查询）设置超时和熔断。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只回答“MCP 由客户端和服务端组成”，忽略传输层和协议层 → ✅ 必须明确四层：传输层（stdio/SSE）、协议层（JSON-RPC 2.0）、客户端、服务端，并说明各层职责。
- ❌ 混淆 MCP 和 REST API，说“MCP 就是 HTTP 接口” → ✅ 强调 MCP 基于 JSON-RPC 2.0，是 RPC 风格，不是 RESTful。REST 面向资源，MCP 面向方法（如 `tools/call`）。
- ❌ 认为 MCP 只支持工具，忽略资源和提示 → ✅ 补充 MCP 支持 Tool、Resource、Prompt 三种能力，并说明各自用途（工具用于执行，资源用于读取，提示用于模板）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“工具调用标准化”切入，对比 MCP 和自定义工具注册（如用 FastAPI 写工具接口），强调 MCP 的 `tools/list` 自动发现能力减少了硬编码。
- **如果你只做过传统 NLP**：用“协议分层”类比 OSI 模型，说明 MCP 的传输层（物理层）、协议层（网络层）、客户端/服务端（应用层），展示迁移能力。
- **如果你是校招无项目**：聚焦 JSON-RPC 2.0 的请求/通知/错误格式，用 Python 实现一个简易 MCP Server（加法工具），并输出通信日志，展示动手能力。
- MCP 官方规范（Anthropic）：Model Context Protocol Specification v1.0
- JSON-RPC 2.0 规范：JSON-RPC 2.0 Request/Response/Notification 格式
- 论文：Toolformer: Language Models Can Teach Themselves to Use Tools（理解工具调用动机）
- 博客：Building a MCP Server in Python（实战教程，含 stdio 和 SSE 实现）
- 工具：MCP Inspector（官方调试工具，可视化 MCP 通信日志）

---
