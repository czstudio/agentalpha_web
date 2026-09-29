---
slug: tooluse-tk032
no: "932"
title: "Function Calling、Skill、MCP 这三个有什么区别"
question: "Function Calling、Skill、MCP 这三个有什么区别"
excerpt: "面试官想看你是否真正理解 Agent 工具调用的分层架构，而非只背概念。这道题考察的是系统设计 + 概念辨析能力，刁钻点在于：很多人把 Function Calling 当成一个功能，把 Skill 当成一个文件夹，把"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4570
updated: "2026-09-29"
---

## Function Calling、Skill、MCP 这三个有什么区别

#### 1️⃣ 考察意图

面试官想看你是否真正理解 Agent 工具调用的分层架构，而非只背概念。这道题考察的是**系统设计 + 概念辨析**能力，刁钻点在于：很多人把 Function Calling 当成一个功能，把 Skill 当成一个文件夹，把 MCP 当成一个库，却说不清它们之间的**抽象层级**和**设计意图**。答好了能展示你对 Agent 生态的全局视野，知道什么时候该用底层机制、什么时候该上协议标准，以及如何做工程取舍。

#### 2️⃣ 标准答

这三个概念分别对应 Agent 工具调用的**实现层、封装层、协议层**。下面从底层到顶层逐一拆解。

**1. Function Calling：LLM 输出结构化参数的底层机制**

- **本质**：LLM 在生成文本时，通过特殊 token 或 logit bias 输出一个 JSON 格式的函数调用请求，包含函数名和参数。宿主（如你的 Python 代码）解析后执行真实函数，将结果返回给 LLM 继续生成。
- **具体实现**：OpenAI 的 `tools` 参数、Anthropic 的 `tool_use` block、Google 的 `function_declarations`。底层依赖模型微调（如 GPT-4 的 function calling 训练数据）或推理时约束（如使用 JSON mode + 正则）。
- **工程取舍**：Function Calling 是**无状态**的，每次调用都是独立请求。好处是简单、延迟低；坏处是 LLM 无法记住之前调用过的工具状态，比如你调了两次 `get_weather`，它不知道第一次返回了什么。所以复杂任务需要外部记忆（如对话历史）。
- **实际坑**：参数格式冲突。比如你定义 `temperature` 参数，LLM 可能输出 `"temperature": 25`（数字）或 `"temperature": "25"`（字符串），导致 JSON 解析失败。解法：在 schema 中明确 `type: number`，并在宿主端做类型强制转换。

**2. Skill：高层业务封装**

- **本质**：Skill 是一个**可复用的任务单元**，包含工具定义、提示词模板、状态管理、甚至子 Agent。比如一个“发送邮件” Skill，内部封装了 `get_recipient`、`compose_body`、`send_email` 三个 Function Calling，外加一个提示词“请先确认收件人，再写正文，最后发送”。
- **典型框架**：LangChain 的 `Tool` + `AgentExecutor`、AutoGPT 的 `Command`、字节 Coze 的 `Plugin`。Skill 可以组合，比如“写周报” Skill 调用“获取本周任务” Skill + “生成 Markdown” Skill。
- **工程取舍**：Skill 增加了**抽象成本**。好处是业务逻辑内聚，比如你改邮件模板只需改一个 Skill，不用改每个 Function Calling 的 prompt。坏处是 Skill 之间可能有**隐式依赖**，比如“发送邮件” Skill 依赖“获取联系人” Skill，如果后者挂了，前者也废了。解法：用 DAG（有向无环图）显式声明依赖，并在运行时做拓扑排序。
- **实际坑**：Skill 的提示词污染。比如你在“发送邮件” Skill 里写了“请用礼貌语气”，结果 LLM 在调用 `get_recipient` 时也用了礼貌语气，导致参数输出异常（如把收件人写成“尊敬的张三”）。解法：将 Skill 的提示词限定在**编排层**，不渗透到子 Function Calling 的 prompt 中。

**3. MCP：标准化互操作协议**

- **本质**：Model Context Protocol，由 Anthropic 提出，是一个**开放协议**，定义了工具发现（`list_tools`）、调用（`call_tool`）、传输层（stdio/HTTP/WebSocket）。它让任何 MCP 兼容的客户端（如 Claude Desktop）都能动态发现并调用远程服务器上的工具，无需硬编码。
- **核心组件**：MCP Server（提供工具）、MCP Client（消费工具）、Transport（stdio 用于本地，SSE 用于远程）。工具描述用 JSON-RPC 2.0 格式。
- **工程取舍**：MCP 解决了**工具生态碎片化**问题。以前每个 Agent 框架都要自己写工具适配器（比如 LangChain 的 `OpenAI Tools` 适配器、AutoGPT 的 `Command` 适配器），现在只要实现 MCP 协议，所有兼容客户端都能用。代价是**协议开销**：每次工具调用都要经过 JSON-RPC 序列化/反序列化，延迟比直接 Function Calling 高 10-50ms（本地 stdio 模式）到 200ms+（远程 HTTP 模式）。
- **实际坑**：MCP 的**工具发现**可能泄露敏感信息。比如你暴露了一个 `delete_user` 工具，MCP Client 调用 `list_tools` 时就能看到它的描述。解法：在 MCP Server 端做**访问控制**，比如只对特定 Client ID 暴露特定工具集。

**总结关系**：Function Calling 是**实现机制**（怎么让 LLM 输出参数），Skill 是**业务单元**（怎么组织多个工具完成一个任务），MCP 是**互操作标准**（怎么让不同系统发现和调用工具）。三者可以共存：一个 Skill 内部用 Function Calling 调用工具，而该工具通过 MCP 协议暴露给外部客户端。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，Function Calling 是底层机制，解决‘LLM 如何输出结构化参数’；第二，Skill 是高层封装，解决‘如何组织多个工具完成一个业务任务’；第三，MCP 是标准化协议，解决‘不同系统如何发现和调用工具’。总结一句：Function Calling 是手，Skill 是工具箱，MCP 是工具箱的通用接口标准。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：那在实际项目中，你会怎么选择用 Function Calling 还是 MCP？

> 看场景。如果只是给 LLM 加一个简单工具（比如计算器），直接 Function Calling 就够了，代码量少、延迟低。但如果你的工具需要被多个客户端复用（比如公司内部的 API 网关），或者工具集经常动态变化（比如用户自定义插件），那就上 MCP。一个典型取舍：用 MCP 的 stdio 模式本地调用，延迟增加约 20ms，但换来的是工具热更新能力——你改 MCP Server 代码，客户端无需重启。

**追问 2**：Skill 和 MCP 的 Tool 有什么区别？感觉都是封装。

> 关键区别在**抽象层级**。MCP 的 Tool 是**原子操作**，比如 `get_weather`、`send_email`，每个 Tool 对应一个 Function Calling。而 Skill 是**复合操作**，比如“写周报” Skill 内部可能调用 5 个 MCP Tool（获取任务、生成摘要、格式化等）。所以 MCP 解决的是“工具怎么被调用”，Skill 解决的是“工具怎么被编排”。一个 Skill 可以依赖多个 MCP Server 上的 Tool。

**追问 3**：MCP 和 Function Calling 在参数校验上有什么不同？

> Function Calling 的参数校验由宿主代码做，比如你写一个 `validate_params` 函数。MCP 的校验在协议层：MCP Server 收到 `call_tool` 请求后，会先校验参数是否符合 JSON Schema，不符合则返回错误码 `-32602`（Invalid params）。好处是标准化，坏处是 Schema 必须严格定义，比如枚举值、正则表达式都得写清楚，否则 LLM 容易输出非法参数。实际中我会在 MCP Server 端做双重校验：协议层校验格式，业务层校验语义（比如邮箱格式）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Function Calling 是 OpenAI 独有的功能，MCP 是 Anthropic 的” → ✅ 正确说法：Function Calling 是通用机制，OpenAI、Anthropic、Google 都有实现；MCP 是 Anthropic 提出的开放协议，但任何框架都可以实现。
- ❌ 说“Skill 就是多个 Function Calling 的集合” → ✅ 正确说法：Skill 除了工具集合，还包含提示词、状态管理、错误处理等编排逻辑，是一个完整的业务单元。
- ❌ 说“MCP 比 Function Calling 更高级，所以应该全用 MCP” → ✅ 正确说法：MCP 有协议开销，简单场景用 Function Calling 更高效；MCP 适合跨平台、动态工具集场景。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从工具调用角度切入，比如“在 RAG 系统中，我用 Function Calling 让 LLM 调用检索工具，用 Skill 封装了‘多轮检索+重排序’流程，用 MCP 将检索服务暴露给其他 Agent 使用”。
- **如果你只做过传统 NLP**：用 API 设计类比，比如“Function Calling 像 REST API 的单个端点，Skill 像微服务，MCP 像 gRPC 协议——都是不同抽象层级的设计模式”。
- **如果你是校招无项目**：聚焦论文复现，比如“我复现了 Anthropic 的 MCP 论文，用 Python 实现了一个简单的 MCP Server，支持动态工具注册和 JSON-RPC 调用”。
- Anthropic MCP 规范文档（2024）
- OpenAI Function Calling 官方指南（2023）
- LangChain Tool 与 AgentExecutor 源码分析
- 《Building Agentic Systems: From Function Calling to MCP》博客（2024）
- JSON-RPC 2.0 规范（用于理解 MCP 传输层）

---
