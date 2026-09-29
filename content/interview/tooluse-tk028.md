---
slug: tooluse-tk028
no: "928"
title: "什么是 MCP（模型上下文协议）？讲讲它的核心内容"
question: "什么是 MCP（模型上下文协议）？讲讲它的核心内容"
excerpt: "面试官想看你是否跟上了AI工程化的最新趋势，而非只会调API。MCP（Model Context Protocol）是Anthropic在2024年底提出的开放协议，旨在标准化LLM与外部工具/数据源的交互方式，被称为“"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3929
updated: "2026-09-29"
---

## 什么是 MCP（模型上下文协议）？讲讲它的核心内容

`P1` · `tool_calling` · 🏢 Anthropic

#### 1️⃣ 考察意图

面试官想看你是否跟上了AI工程化的最新趋势，而非只会调API。MCP（Model Context Protocol）是Anthropic在2024年底提出的开放协议，旨在标准化LLM与外部工具/数据源的交互方式，被称为“AI界的USB-C”。这道题考察类型是**系统设计+概念理解**，刁钻点在于：很多人只听过名字，但讲不清MCP与Function Call的本质区别、架构分层、以及为什么需要它。答好了能展示你对Agent生态的全局视野、协议设计思维，以及从“调接口”到“搭系统”的硬实力跃迁。

#### 2️⃣ 标准答

**MCP定义与设计动机**

MCP（Model Context Protocol）是Anthropic提出的开放协议，核心目标是**将LLM与外部工具、数据源的交互方式标准化**。类比：就像USB-C统一了充电和数据传输接口，MCP统一了AI应用调用外部能力的方式。设计动机有三：

- **解耦**：工具提供方（Server）与LLM应用（Client）不再硬编码，Server可独立更新、动态注册。
- **互操作性**：同一个MCP Server可被Claude Desktop、自定义Agent、IDE插件等任意Client复用。
- **安全隔离**：通过协议边界限制LLM的权限，避免直接暴露系统API。

**核心架构：四层模型**

1. **Transport层**：通信载体，支持两种模式

- `stdio`：本地子进程通信，低延迟，适合本地工具（如文件系统、SQLite）。
- `HTTP+SSE`：远程服务，支持跨网络，适合云API（如GitHub、Slack）。
- **工程取舍**：stdio延迟低但无法跨机器，HTTP灵活但需处理认证和重连。实际落地中，本地工具用stdio，远程服务用HTTP+SSE，混合部署时需统一错误码。

1. **Protocol层**：基于JSON-RPC 2.0的消息格式，定义请求/响应结构。关键方法：

- `list_tools`：Client发现Server有哪些工具可用（动态注册）。
- `call_tool`：Client调用具体工具，传入参数，获取结果。
- `read_resource`：访问静态数据（如文件内容、数据库表）。
- `prompts`：获取提示模板，用于引导LLM行为。

1. **Client层**：LLM应用（如Claude Desktop、自定义Agent），负责：

- 管理多个Server连接。
- 将LLM的意图路由到对应Server。
- 处理工具返回结果并反馈给LLM。

1. **Server层**：工具提供方，实现具体逻辑（如文件读写、数据库查询）。每个Server独立部署，通过Transport暴露能力。

**与Function Call的本质区别**

| 维度 | MCP | Function Call |
|---|---|---|
| 定位 | 通信协议 | 模型能力 |
| 标准化 | 开放标准，任意Client/Server可互操作 | 厂商绑定（OpenAI/Anthropic各自实现） |
| 动态性 | Server可动态注册/注销，无需修改Client代码 | 需预定义函数列表，变更需重新部署 |
| 安全 | 协议层隔离，Server可控制权限 | 依赖模型厂商的安全策略 |
| 适用场景 | 多工具、多数据源、跨平台Agent | 单应用内简单工具调用 |

**实际落地的坑与解法**

- **坑1：工具调用超时**。LLM生成工具调用参数后，Server执行可能耗时过长（如查询大表）。**解法**：在Server端实现异步回调，Client设置超时阈值（如30秒），超时后重试或降级。
- **坑2：参数格式不匹配**。LLM生成的JSON参数可能不符合Server预期（如类型错误、缺少必填字段）。**解法**：Server端做严格参数校验，返回明确错误码（如`-32602` Invalid params），Client根据错误码调整LLM的prompt。
- **坑3：多Server冲突**。多个Server暴露同名工具导致路由混乱。**解法**：Client端维护工具命名空间（如`file:read` vs `db:read`），或通过Server元数据（如`server_id`）区分。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从协议定义、核心架构、与Function Call对比三个层面回答。MCP是Anthropic提出的开放协议，标准化LLM与外部工具的交互，类似AI的USB-C。架构分Transport、Protocol、Client、Server四层，基于JSON-RPC 2.0通信。与Function Call的本质区别是：MCP是通信协议，强调互操作性和动态注册；Function Call是模型能力，更灵活但碎片化。总结一句：MCP是Agent生态走向标准化的关键一步，解决了工具调用的‘方言’问题。”

#### 4️⃣ 高频追问 & 应对

**追问1**：MCP和OpenAI的Function Call哪个更好？你会怎么选？

> 没有绝对好坏，取决于场景。如果项目是单应用、工具固定（如一个聊天机器人只查天气），Function Call更轻量，无需额外Server部署。但如果涉及多工具、多数据源（如Agent同时操作文件、数据库、GitHub），MCP的标准化和动态注册优势明显。实际落地中，我倾向混合：核心工具用MCP Server，临时工具用Function Call兜底。注意：MCP的Server启动开销（约100ms）在低延迟场景不可忽略。

**追问2**：MCP如何保证安全性？比如恶意Server注入？

> 安全分三层：Transport层、Protocol层、Server层。Transport层：stdio模式限制本地进程，HTTP+SSE需TLS加密和OAuth认证。Protocol层：Client应校验所有Server返回的数据，防止LLM被注入恶意内容（如伪造工具结果引导模型行为）。Server层：Server自身需做权限控制（如文件系统Server只允许读取特定目录）。实际坑：LLM可能被Server返回的恶意文本诱导调用危险工具，解法是在Client端加内容过滤（如正则匹配敏感操作）。

**追问3**：MCP的JSON-RPC 2.0协议有什么局限性？你会怎么改进？

> 主要局限：① 无流式支持，大结果（如读取10MB文件）需一次性传输，内存压力大。② 无优先级队列，多个工具调用可能乱序。③ 错误码不够细化（只有标准JSON-RPC错误码）。改进方向：① 引入分块传输（类似HTTP chunked encoding），Server返回`result.partial`标记。② Client端实现请求队列，按工具类型分配优先级（如读操作优先于写操作）。③ 扩展错误码，增加`-32999`（工具超时）、`-32998`（参数校验失败）等自定义码。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 把MCP说成“Anthropic的API封装”或“Claude专属功能” → ✅ 强调它是开放协议，任何LLM应用（包括OpenAI模型）都可以实现Client端，只是Anthropic率先推广。
- ❌ 只背定义，不提与Function Call的对比 → ✅ 必须对比，这是面试官最想听的差异点，展示你对两种方案的工程取舍理解。
- ❌ 忽略Transport层的选择（stdio vs HTTP） → ✅ 必须提两种模式及适用场景，展示你对实际部署的考虑。

#### 6️⃣ 简历呼应

- **如果你有Agent项目**：从“我在XX项目中用MCP替代了Function Call，解决了工具动态注册问题”切入，展示你踩过的坑（如超时、参数校验）和优化方案。
- **如果你只做过传统后端**：用“RESTful API vs RPC”类比MCP vs Function Call，强调协议标准化对微服务架构的启发，展示迁移能力。
- **如果你是校招无项目**：聚焦MCP论文（Anthropic官方博客）和开源实现（如modelcontextprotocol/servers），描述你复现的demo（如用MCP Server包装本地文件系统+SQLite），展示学习能力和技术敏感度。
- Anthropic官方博客：Introducing the Model Context Protocol
- MCP规范文档：modelcontextprotocol.io/specification
- 开源MCP Server集合：github.com/modelcontextprotocol/servers
- 论文：Tool Learning with Foundation Models（综述MCP类协议的设计动机）
- 博客：MCP vs Function Call: A Practical Comparison（社区实战分析）

---
