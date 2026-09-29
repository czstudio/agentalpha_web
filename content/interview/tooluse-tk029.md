---
slug: tooluse-tk029
no: "929"
title: "MCP 和 Function Calling 有什么区别？有没有实际跑过 MCP"
question: "MCP 和 Function Calling 有什么区别？有没有实际跑过 MCP"
excerpt: "面试官想区分你是“背概念”还是“真动手”。Function Calling 是模型输出 JSON 的能力，MCP 是标准化工具调用的通信协议——两者不在同一抽象层。刁钻点在于：很多人把 MCP 当成“升级版 Functi"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4158
updated: "2026-09-29"
---

## MCP 和 Function Calling 有什么区别？有没有实际跑过 MCP

`P1` · `tool_calling` · 🏢 Anthropic

#### 1️⃣ 考察意图

面试官想区分你是“背概念”还是“真动手”。Function Calling 是模型输出 JSON 的能力，MCP 是标准化工具调用的通信协议——两者不在同一抽象层。刁钻点在于：很多人把 MCP 当成“升级版 Function Calling”，实际是协议 vs 模型能力的区别。答好了能展示你对工具调用生态的深度理解、实际部署经验（如 Claude Desktop 配置 MCP Server），以及面对多工具/跨平台场景的选型判断力。

#### 2️⃣ 标准答

**本质区别：协议 vs 模型能力**

- **Function Calling**：模型在训练或推理时学会输出特定 JSON schema（如 `{"name": "get_weather", "arguments": {"city": "Beijing"}}`），由 LLM 原生支持，依赖模型厂商定义 schema 格式（OpenAI、Anthropic 各有差异）。
- **MCP**：应用层协议，标准化“工具发现-调用-结果返回”流程。MCP Server 暴露工具列表（如文件系统、数据库），MCP Client（如 Claude Desktop）通过 JSON-RPC 2.0 与 Server 通信，LLM 只负责选择工具，不直接处理协议细节。

**实现层面：谁负责什么**

- Function Calling：模型输出 JSON，应用层解析并调用本地函数。例如 OpenAI API 返回 `tool_calls` 字段，你写代码映射到 `get_weather()`。
- MCP：Client 先通过 `tools/list` 获取工具列表（含 schema），将列表注入 LLM 上下文；LLM 返回工具调用后，Client 通过 `tools/call` 请求 Server 执行。Server 可以是本地进程或远程服务，支持动态注册。

**互操作性与扩展性**

- Function Calling：工具 schema 硬编码在应用代码中，换模型厂商需重写 schema 格式（OpenAI 用 `parameters`，Anthropic 用 `input_schema`），跨平台复用成本高。
- MCP：工具定义在 Server 端，Client 自动发现。例如一个“文件系统 MCP Server”可在 Claude Desktop、VS Code 插件、自定义 Agent 中复用，无需修改代码。**坑**：MCP 协议目前无官方认证，Server 实现可能不兼容（如 `tools/call` 返回格式差异），需加异常重试和 schema 校验。

**实际跑 MCP 的坑与解法**

- **坑 1**：Claude Desktop 配置 MCP Server 时，`command` 路径写错导致启动失败。解法：先用 `npx @anthropic/mcp-server-filesystem` 在终端测试，确认 Server 能正常响应 `tools/list`。
- **坑 2**：自定义 MCP Server 返回的 `tool` 名称与 LLM 上下文冲突（如同名工具）。解法：在 Server 端加命名空间前缀（如 `db_query` vs `fs_query`），并在 `tools/list` 的 `description` 中明确用途。
- **坑 3**：MCP 调用延迟比 Function Calling 高（多一次网络/进程通信）。解法：对延迟敏感场景（如实时对话），将高频工具缓存到 Client 端，减少 `tools/list` 调用。

**选型建议**

- **用 Function Calling**：工具数量少（<5 个）、固定、单模型厂商场景。例如一个“天气查询 Agent”，直接硬编码 schema，代码量少，延迟低。
- **用 MCP**：工具数量多（>10 个）、跨平台复用、需要动态发现（如用户自定义插件）。例如“企业级 Agent 平台”，集成文件系统、数据库、API 网关，用 MCP 统一管理工具生命周期。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，本质区别——Function Calling 是模型输出 JSON 的能力，MCP 是标准化工具调用的通信协议，两者不在同一抽象层。第二，实现差异——FC 依赖模型厂商定义 schema，MCP 通过 JSON-RPC 2.0 实现工具发现和调用，支持跨平台复用。第三，实际跑 MCP 的坑——配置路径、命名冲突、延迟问题。总结一句：简单固定工具用 FC，多工具跨平台用 MCP。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：MCP 和 Function Calling 能同时用吗？怎么设计？

> 可以。典型架构：LLM 输出 Function Calling 格式的 JSON，应用层解析后，通过 MCP Client 调用 Server 执行。例如 OpenAI 的 `tool_calls` 字段包含 `function` 和 `arguments`，你写一个适配层，将 `function` 名映射到 MCP 的 `tool` 名，通过 `tools/call` 请求 Server。这样既利用模型原生能力，又享受 MCP 的跨平台复用。**取舍**：增加一次映射开销，但换来工具管理统一。

**追问 2**：MCP 的 `tools/list` 返回的工具列表很大（如 100+ 个），怎么优化？

> 分两层：第一层，Server 端按标签分组（如 `category: database`），Client 根据对话上下文只请求相关分组（通过 `tools/list` 的 `filter` 参数，MCP 协议支持）。第二层，Client 端缓存工具列表，设置 TTL（如 5 分钟），减少重复请求。**坑**：工具列表变化时（如新增/删除），缓存可能过期，需加 WebSocket 通知机制（MCP 协议支持 `notifications/tools/list_changed`）。

**追问 3**：MCP 和 LangChain 的 Tool 机制有什么区别？

> LangChain Tool 是框架层抽象，将函数包装成 `Tool` 对象，注入 LLM 上下文。MCP 是协议层，不依赖特定框架。LangChain 的 Tool 本质是“函数调用 + 描述”，与 Function Calling 类似，但多了 `run()` 方法封装。MCP 的优势在于：工具定义在独立 Server 中，可被任何 MCP Client 调用（如 Claude Desktop、VS Code 插件），而 LangChain Tool 只能在 LangChain 生态内使用。**选型**：如果你用 LangChain，直接用它 Tool 机制更轻量；如果需要跨平台复用，用 MCP 包装 LangChain Tool。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “MCP 是 Function Calling 的升级版，功能更强。” → ✅ “两者不在同一抽象层：Function Calling 是模型输出格式，MCP 是通信协议。MCP 可以封装 Function Calling，但 Function Calling 不依赖 MCP。”
- ❌ “MCP 比 Function Calling 慢，所以不好用。” → ✅ “MCP 多一次网络/进程通信，延迟更高，但换来跨平台复用和动态发现。选型看场景：延迟敏感用 FC，扩展性要求高用 MCP。”
- ❌ “我跑过 MCP，就是配置个 JSON 文件。” → ✅ “配置只是第一步。实际跑 MCP 需要理解 JSON-RPC 2.0 协议、工具发现流程、错误处理（如 Server 超时重试），以及如何将 MCP 工具列表注入 LLM 上下文。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“工具调用与检索结合”切入，对比 MCP 和 Function Calling 在工具发现上的差异。例如 RAG 中检索工具（如向量数据库）用 MCP 动态注册，比硬编码 schema 更灵活。
- **如果你只做过传统 NLP**：用“API 调用 vs 协议标准化”类比。Function Calling 像直接调函数，MCP 像 RESTful API——前者简单但耦合，后者标准化但复杂。强调你对协议设计的理解。
- **如果你是校招无项目**：聚焦“MCP 协议设计”论文复现。例如用 Python 实现一个简单的 MCP Server（文件系统操作），对比 Function Calling 的硬编码方式，写一篇技术博客。面试时展示代码和对比数据。
- MCP 协议规范（Anthropic 官方文档）：`modelcontextprotocol.io`
- OpenAI Function Calling 官方文档：`platform.openai.com/docs/guides/function-calling`
- 论文《Toolformer: Language Models Can Teach Themselves to Use Tools》
- 博客《MCP vs Function Calling: A Practical Comparison》（Medium）
- 工具：`npx @anthropic/mcp-server-filesystem`（快速体验 MCP）

---
