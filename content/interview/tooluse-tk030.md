---
slug: tooluse-tk030
no: "930"
title: "Function Calling 也属于工具调用，请问什么场景下使用 Function Calling，什么场景下使用 MCP"
question: "Function Calling 也属于工具调用，请问什么场景下使用 Function Calling，什么场景下使用 MCP"
excerpt: "面试官想考察的不是背诵FC和MCP的定义，而是你在真实工程中做架构取舍的能力。这是典型的“场景分析+系统设计”题，刁钻点在于：很多人以为MCP是FC的升级版，但实际两者是互补关系。答好了能展示你对工具调用生态的深度理解—"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3225
updated: "2026-09-29"
---

## Function Calling 也属于工具调用，请问什么场景下使用 Function Calling，什么场景下使用 MCP

#### 1️⃣ 考察意图

面试官想考察的不是背诵FC和MCP的定义，而是你在真实工程中做架构取舍的能力。这是典型的“场景分析+系统设计”题，刁钻点在于：很多人以为MCP是FC的升级版，但实际两者是互补关系。答好了能展示你对工具调用生态的深度理解——知道何时用轻量原生方案，何时引入标准化协议，以及如何做混合架构。这直接对应一线大厂Agent系统设计岗位的硬实力。

#### 2️⃣ 标准答

**核心原则：Function Calling是模型原生能力，MCP是标准化协议层。选择取决于工具集规模、变更频率、安全需求和生态兼容性。**

#### 场景一：使用Function Calling

- **单一模型+固定工具集**：比如内部CRM系统，只有5个API（查订单、改地址、发通知等），模型（如GPT-4o）原生支持FC，直接定义JSON Schema即可，零额外基础设施。
- **低延迟要求**：FC是模型推理时直接输出函数调用，延迟增加<50ms（相比纯文本生成）。MCP需要额外HTTP/SSE通信，增加100-300ms。
- **工具变更极少**：FC的工具定义硬编码在prompt或system message中，更新需重新部署模型或改代码。适合周级甚至月级变更的场景。
- **实际落地的坑**：FC的tool_choice参数容易踩坑——设成“auto”时模型可能跳过调用，设成“required”又可能强行调用。解法：对关键工具用`tool_choice: {"type": "function", "function": {"name": "xxx"}}`强制指定，配合fallback逻辑。

#### 场景二：使用MCP

- **多工具（>10个）**：FC的prompt会塞满工具定义，token消耗激增（每个工具定义约200-500 tokens，10个就2k-5k tokens），且模型容易混淆。MCP通过动态注册和按需加载，只暴露当前上下文相关的工具。
- **频繁变更**：MCP Server独立部署，工具更新无需改模型代码。比如电商大促期间，临时加一个“秒杀库存查询”工具，MCP只需新写一个Server，FC则要改prompt并重新测试。
- **跨平台/跨模型**：MCP是标准化协议，一个Server可同时服务Claude、GPT、开源模型。FC是模型厂商私有的，换模型就得重写工具定义。
- **安全隔离**：MCP支持权限控制（如只读/读写），第三方工具通过MCP接入时，可限制其访问范围。FC直接暴露给模型，安全风险更高。
- **实际落地的坑**：MCP的传输层选型——HTTP轮询延迟高，SSE（Server-Sent Events）需保持长连接。解法：对实时性要求高的工具（如股票报价），用WebSocket替代SSE，但需自己实现MCP传输层扩展。

#### 混合架构：MCP Server内部封装FC

- **最佳实践**：核心内部API（如用户鉴权、支付）用FC直接调用，保证低延迟；外部第三方服务（如天气、物流查询）通过MCP接入，利用其标准化和动态注册能力。MCP Server内部可调用FC作为子步骤，实现兼容。
- **决策矩阵**：
- 工具数量<5且不变更 → FC
- 工具数量5-10且低频变更 → FC（但考虑未来扩展性可上MCP）
- 工具数量>10或高频变更或跨模型 → MCP
- 混合需求 → MCP封装FC

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从工具集规模、变更频率、安全需求三个层面回答。工具少且固定用FC，延迟低、零基础设施；工具多或频繁变更用MCP，动态注册、跨平台兼容。实际落地常用混合架构：核心API用FC保证性能，外部服务用MCP标准化接入。总结一句：FC是轻量原生方案，MCP是标准化协议层，两者互补而非替代。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：MCP和Function Calling在token消耗上具体差多少？你如何量化？

> FC每个工具定义占用200-500 tokens（取决于参数复杂度），10个工具就是2k-5k tokens，每次请求都携带。MCP通过动态注册，只暴露当前上下文相关的工具，平均每次请求只带2-3个工具定义，token消耗降低60-80%。但MCP有额外协议开销（如JSON-RPC头部），约50-100 tokens。量化方法：用tiktoken库统计实际prompt长度，对比两种方案在相同任务下的token消耗。

**追问 2**：如果工具需要实时数据（如股票价格），FC和MCP谁更合适？

> FC更合适，因为模型推理时直接输出函数调用，延迟最低。MCP的SSE或HTTP轮询会引入额外网络延迟。但FC需要模型自己决定何时调用，如果工具返回数据变化快（如每秒更新），模型可能调用过时。解法：FC配合缓存策略（如5秒内复用结果），或MCP用WebSocket实现实时推送，但需自己扩展协议。

**追问 3**：MCP Server如何保证高可用？如果Server挂了，Agent怎么办？

> MCP Server需设计为无状态，支持水平扩展。挂掉时，Agent应有fallback机制：1）重试策略（指数退避，最多3次）；2）降级到FC直接调用（如果工具同时支持FC和MCP）；3）返回用户“服务暂不可用”并记录日志。实际落地中，MCP Server的监控和熔断是关键，比如用Prometheus监控响应时间，超过2秒自动熔断。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “MCP是Function Calling的升级版，以后都用MCP。” → ✅ “两者是互补关系。FC是模型原生能力，适合轻量场景；MCP是标准化协议，适合复杂生态。选择取决于具体需求，不是替代关系。”
- ❌ “FC只能用于OpenAI模型。” → ✅ “FC是模型厂商提供的原生能力，OpenAI、Claude、Gemini、通义千问等都支持，但定义格式不同。MCP是跨模型的标准化协议，可统一管理。”
- ❌ “MCP比FC更安全，所以所有场景都用MCP。” → ✅ “MCP提供安全隔离，但增加了复杂度和延迟。内部API用FC更高效，外部第三方服务用MCP更安全。安全是trade-off，不是绝对优势。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从工具调用与检索的协同切入，比如“在RAG系统中，内部知识库检索用FC（低延迟），外部API查询（如天气、新闻）用MCP，实现混合架构”。
- **如果你只做过传统NLP**：用API网关类比，FC像直接调用函数，MCP像通过网关统一管理。强调“架构设计能力”而非模型细节。
- **如果你是校招无项目**：聚焦论文和开源项目，比如“读过MCP论文和OpenAI FC文档，自己用FastAPI实现过一个MCP Server，对比过token消耗和延迟”。
- MCP官方规范文档（Anthropic发布）
- OpenAI Function Calling官方指南（含tool_choice详解）
- 《Building Effective Agents》——Anthropic关于Agent架构的博客
- LangChain工具调用文档（对比FC和MCP的集成方式）
- 《Tool Learning with Foundation Models》综述论文（涵盖FC、MCP、Toolformer等）

---
