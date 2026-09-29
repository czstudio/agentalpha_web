---
slug: tooluse-tk073
no: "973"
title: "什么是 A2A（Agent-to-Agent）协议？解决了什么问题"
question: "什么是 A2A（Agent-to-Agent）协议？解决了什么问题"
excerpt: "面试官想确认你是否真正理解 A2A 协议的设计动机和技术细节，而非仅知道"Google 推出的 Agent 间通信协议"。刁钻点在于：很多人只答"让不同 Agent 互相通信"，但说不出当前 Agent 生态的碎片化问题"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4165
updated: "2026-09-29"
---

## 什么是 A2A（Agent-to-Agent）协议？解决了什么问题

#### 1️⃣ 考察意图

面试官想确认你是否真正理解 A2A 协议的设计动机和技术细节，而非仅知道"Google 推出的 Agent 间通信协议"。刁钻点在于：很多人只答"让不同 Agent 互相通信"，但说不出当前 Agent 生态的碎片化问题、A2A 的核心机制（Agent Card、Task 生命周期）、以及与传统微服务通信的区别。答好了能展示你对 Agent 互操作性的深度理解。

#### 2️⃣ 标准答

**A2A 解决的核心问题：Agent 生态碎片化导致的"协作孤岛"。**

**1. 问题背景**

当前 Agent 框架百花齐放——LangChain、CrewAI、AutoGen、MetaGPT、Google ADK 等，每个框架有自己的 Agent 定义、通信方式、状态管理。结果是：LangChain 的 Agent 无法直接调用 CrewAI 的 Agent，跨框架协作需要手动写适配代码。这就像互联网早期——每个局域网用不同协议，无法互联互通。

**2. A2A 的核心设计**

Google 在 2025 年推出 A2A（Agent-to-Agent Protocol），基于 HTTP + JSON-RPC 2.0，定义了 Agent 间互操作的四个核心机制：

- **Agent Card**：每个 Agent 暴露一个标准化的"名片"（`/.well-known/agent.json`），包含：`name`：Agent 名称
- `description`：能力描述（LLM 可读）
- `capabilities`：支持的功能列表（如 `streaming`、`push-notifications`）
- `skills`：Agent 擅长的任务列表（类似工具定义，但更高级）
- `authentication`：认证方式（如 OAuth 2.0）
Task 生命周期：A2A 用"Task"而非"Message"作为通信单元。Task 有明确的状态机：
- `submitted` → `working` → `input-required`（需要人类输入）→ `completed` / `failed` / `canceled`
- 每个 Task 有唯一 ID，支持异步执行和状态查询
- 比"发消息"更结构化——Task 包含目标、输入、输出、状态，而非无结构的文本消息
Artifact 传输：Task 的输出以"Artifact"形式返回，支持多种格式（文本、文件、图片、结构化数据）。Artifact 有 MIME type 标注，接收方可以根据类型做不同处理Streaming 支持：通过 SSE（Server-Sent Events）支持流式输出——Agent A 可以实时看到 Agent B 的执行进度，而非等到完成才返回

**3. A2A vs 传统微服务通信**

| 维度 | REST/gRPC（微服务） | A2A（Agent） |
|---|---|---|
| 通信单元 | API 请求/响应 | Task（有状态的协作单元） |
| 发现机制 | 服务注册（Consul/Eureka） | Agent Card（标准化名片） |
| 能力描述 | OpenAPI Spec | Agent Card 的 skills 字段 |
| 执行模型 | 同步为主 | 异步为主（Task 生命周期） |
| 错误处理 | HTTP 状态码 | Task 状态（failed/canceled） |
| 语义理解 | 机器解析 | LLM 可读（Agent Card 的 description） |

**4. 实际应用场景**

- **跨框架协作**：LangChain 的 RAG Agent 需要代码审查能力 → 发现 CrewAI 的 CodeReviewer Agent → 通过 A2A 发送 Task → 接收审查结果
- **Agent 市场**：Agent 在 A2A Registry 注册，其他系统按需发现和调用。类似"Agent 的 App Store"
- **人机协作**：Task 状态 `input-required` 支持人类在 Agent 协作中介入——Agent B 需要人类确认时，通过 A2A 通知 Agent A，A 转发给用户

**总结**：A2A 是 Agent 互操作的"HTTP"——定义了 Agent 间发现、通信、协作的标准协议。没有 A2A，Agent 生态就像没有 HTTP 的互联网——每个系统都是孤岛。

#### 3️⃣ 答题模板（30 秒电梯版）

> "A2A 是 Google 2025年推出的 Agent 间互操作协议，解决 Agent 生态碎片化导致的协作孤岛。核心设计四个机制：Agent Card——标准化名片暴露能力，LLM可读，类似Agent的API文档。Task生命周期——用Task而非Message通信，有submitted→working→completed状态机，支持异步。Artifact传输——多格式输出（文本/文件/图片），有MIME type标注。Streaming——SSE支持实时进度。A2A vs 微服务：Task比API请求更有状态，Agent Card比OpenAPI更LLM友好。总结一句：A2A是Agent互操作的HTTP。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：A2A 和 MCP 的关系是什么？会冲突吗？

> 互补不冲突。分层关系：(1) MCP（Anthropic）——定义 Agent 如何调用工具（Agent → Tool），解决"单个 Agent 的能力扩展"；(2) A2A（Google）——定义 Agent 如何与 Agent 通信（Agent → Agent），解决"多 Agent 的协作"；(3) 实际场景：Agent A 通过 A2A 发现 Agent B → A 向 B 发送 Task → B 内部用 MCP 调用工具完成 Task → B 通过 A2A 返回 Artifact 给 A。两者在传输层都基于 JSON-RPC，可以共存于同一系统。类比：MCP 类似 USB（设备接口标准），A2A 类似 HTTP（网络通信标准）

**追问 2**：Agent Card 的 skills 和 MCP 的 tools 有什么区别？

> 三个区别：(1) 粒度不同——MCP tools 是原子操作（如 `search`、`send_email`），A2A skills 是任务级能力（如 `review_code`、`analyze_data`），一个 skill 可能内部调用多个 tools；(2) 执行模型不同——MCP tool 是同步调用（请求→响应），A2A skill 是异步 Task（提交→执行→状态查询→结果获取），可能执行几分钟甚至几小时；(3) 状态管理——MCP tool 无状态（每次调用独立），A2A skill 有状态（Task 有生命周期，可以暂停、恢复、取消）

**追问 3**：A2A 的安全性怎么保证？Agent 间通信会不会被窃听或篡改？

> 四层安全：(1) 传输层——HTTPS/TLS 1.3 加密通信，防止窃听；(2) 身份认证——Agent Card 中声明认证方式（如 OAuth 2.0、mTLS），通信前双向认证；(3) 权限控制——Agent A 只能调用 Agent B Card 中声明的 skills，不能越权访问；(4) 审计日志——所有 A2A 通信（Task 提交、状态变更、Artifact 传输）记录审计日志，支持事后追溯。额外风险：恶意 Agent 在 Card 中声明虚假能力（如声称自己是"安全审查Agent"但实际窃取数据），需要信任评分机制和官方 Registry 验证

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "A2A 就是让 Agent 互相发消息" → ✅ "A2A 不是简单的消息传递，而是基于 Task 的结构化协作——有明确的状态机、Artifact 传输、异步执行。类似微服务的 Saga 模式而非简单的 HTTP 调用。"
- ❌ "A2A 会取代 MCP" → ✅ "A2A 和 MCP 互补——A2A 管 Agent-Agent 通信，MCP 管 Agent-Tool 通信。一个完整的 Agent 系统需要两者：用 A2A 协作，用 MCP 调用工具。"
- ❌ "A2A 只适用于 Google 的 Agent" → ✅ "A2A 是开放协议，任何框架的 Agent 都可以实现。LangChain、CrewAI、AutoGen 都可以暴露 Agent Card 支持 A2A。协议的开放性是核心价值。"

#### 6️⃣ 简历呼应

- **如果你有多 Agent 项目**：从"跨框架 Agent 协作"切入，描述你用 A2A 实现的不同框架 Agent 间的任务分发和结果聚合
- **如果你只做过微服务**：用"服务网格"迁移——A2A 的 Agent Card 类似服务注册，Task 生命周期类似 Saga，通信网关类似 Istio
- **如果你是校招无项目**：用 A2A 协议实现两个 Agent 的协作（如 RAG Agent + Code Review Agent），测试任务分发和结果聚合
- "A2A Protocol Specification" (Google, 2025)
- "Agent Interoperability: A Survey" (Wang et al., 2025)
- "MCP vs A2A: Complementary Protocols" (Anthropic, 2025)

---
