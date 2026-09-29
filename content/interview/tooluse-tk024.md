---
slug: tooluse-tk024
no: "924"
title: "技术选型时：不知道该用 MCP 还是 Skills，还是都用"
question: "技术选型时：不知道该用 MCP 还是 Skills，还是都用"
excerpt: "面试官想看你是否具备工程决策能力，而非单纯背诵概念。这道题属于系统设计 + 工程取舍类型，刁钻点在于：MCP（Model Context Protocol）和 Skills 并非互斥，而是不同抽象层级的产物。答好了能展示"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3681
updated: "2026-09-29"
---

## 技术选型时：不知道该用 MCP 还是 Skills，还是都用

#### 1️⃣ 考察意图

面试官想看你是否具备**工程决策能力**，而非单纯背诵概念。这道题属于**系统设计 + 工程取舍**类型，刁钻点在于：MCP（Model Context Protocol）和 Skills 并非互斥，而是不同抽象层级的产物。答好了能展示你对 Agent 架构的深度理解——知道何时用标准化协议解耦外部工具（MCP），何时用内部逻辑封装复杂流程（Skills），并能给出混合架构的 trade-off 分析。这直接对应一线大厂 Agent 开发中“工具链膨胀”和“业务逻辑复杂化”的真实问题。

#### 2️⃣ 标准答

**核心判断：MCP 和 Skills 是互补的，不是二选一。** 选型取决于你的 Agent 要“连接外部世界”还是“执行内部逻辑”。

#### 1. 先厘清定义

- **MCP**：一种标准化协议，让 Agent 动态发现并调用外部工具（如搜索、数据库、API）。核心价值是**解耦**——工具提供方只需实现 MCP Server，Agent 端无需硬编码。类似 HTTP 之于 Web 服务。
- **Skills**：Agent 内部封装的**可复用流程**，通常包含多步推理、条件分支、状态管理。核心价值是**抽象业务逻辑**——比如“退货审核”技能，内部可能调用多个 MCP 工具（查订单、验库存、发通知），但对外暴露一个简单接口。

#### 2. 决策矩阵：三个场景

- **场景 A：工具多且变化快 → 优先 MCP**
- 例：Agent 需要调用 10+ 个外部 API（天气、股票、邮件、数据库）。用 MCP 后，新增一个工具只需写一个 MCP Server 配置，Agent 端零改动。**坑**：MCP 的发现机制依赖 JSON-RPC，如果工具返回数据格式不统一，需要额外做 schema 校验。解法：在 MCP Server 层加一层 adapter，统一输出为 Agent 可理解的 JSON。
- **trade-off**：MCP 增加了网络开销（每次调用走 RPC），不适合毫秒级响应场景。此时可考虑本地缓存或预加载工具列表。
- **场景 B：流程固定且业务复杂 → 优先 Skills**
- 例：电商 Agent 的“退货审核”流程：验证用户身份 → 检查订单状态 → 计算退款金额 → 触发物流。用 Skills 封装后，内部可写 if-else 逻辑、调用多个子步骤，甚至嵌套其他 Skills。**坑**：Skills 容易变成“上帝类”，所有逻辑堆在一个技能里。解法：遵循单一职责原则，一个 Skill 只做一件事，通过组合模式（Composite Pattern）构建复杂流程。
- **trade-off**：Skills 是硬编码的，修改流程需要改代码并重新部署。如果业务变化频繁（如每周调整审核规则），建议将规则外置到配置中心或 DSL（如 JSON 规则引擎）。
- **场景 C：两者皆有 → 混合架构**
- 最佳实践：**Skills 内部调用 MCP 工具**。例如：
- 定义一个 `OrderQuerySkill`，内部通过 MCP 调用 `get_order` 工具。
- 定义一个 `RefundSkill`，内部依次调用 `validate_user`（MCP）、`check_inventory`（MCP）、`trigger_refund`（MCP），并加入重试逻辑和超时处理。
- **实际落地的坑**：MCP 工具可能超时或返回错误，Skills 需要做容错。解法：在 Skills 层实现 Circuit Breaker（熔断器）模式，连续失败 3 次后降级到人工处理。

#### 3. 选型 checklist

- 工具数量 > 5 且提供方不同 → MCP
- 流程步骤 > 3 且涉及条件分支 → Skills
- 需要动态扩展工具 → MCP
- 需要复用业务逻辑 → Skills
- 团队有协议开发经验 → MCP；否则先 Skills 快速迭代，后续重构为 MCP

**总结**：MCP 解决“如何调用外部工具”的标准化问题，Skills 解决“如何编排内部流程”的复用问题。两者结合，才能构建一个既灵活又可维护的 Agent 系统。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，MCP 和 Skills 是不同抽象层级——MCP 是外部工具协议，Skills 是内部流程封装。第二，选型取决于场景：工具多且变化快用 MCP，流程固定且业务复杂用 Skills。第三，最佳实践是混合架构——Skills 内部调用 MCP 工具，实现分层解耦。总结一句：不要二选一，而是根据工具数量和流程复杂度做组合决策。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果工具数量很少（比如只有 2 个），还需要用 MCP 吗？

> 不需要。MCP 的引入成本（写 Server、维护协议）在工具少时得不偿失。直接用函数调用（Function Calling）硬编码更高效。但要注意：如果未来可能扩展到 5+ 个工具，建议一开始就用 MCP，避免后期重构。一个经验法则：工具数量 < 3 且不变化，用硬编码；否则用 MCP。

**追问 2**：Skills 和 MCP 在性能上有啥区别？怎么优化？

> MCP 每次调用走网络 RPC，延迟约 10-50ms（取决于网络），而 Skills 是进程内调用，延迟 < 1ms。优化策略：① 对高频 MCP 工具做本地缓存（如查询用户信息）；② 用批量 MCP 调用（一次请求获取多个工具结果）；③ 在 Skills 层做异步编排，避免串行等待。**坑**：缓存可能导致数据不一致，需要设置合理的 TTL（如 5 秒）。

**追问 3**：如果第三方工具不支持 MCP，怎么办？

> 写一个适配器（Adapter）层。例如，对方提供 REST API，你写一个 MCP Server 封装它，对外暴露 MCP 协议。内部做协议转换、错误码映射、重试逻辑。这相当于把“非标准化”变成“标准化”，代价是增加一个维护点。如果第三方 API 变化频繁，建议在适配器层加版本控制。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “MCP 是 Skills 的升级版，所以只用 MCP 就行。” → ✅ “MCP 和 Skills 是不同维度：MCP 是协议，Skills 是流程。MCP 不能替代 Skills 的内部编排能力，Skills 也不能替代 MCP 的标准化发现。两者是互补关系。”
- ❌ “Skills 就是写一堆 if-else，没啥技术含量。” → ✅ “Skills 的核心是抽象和复用。好的 Skills 设计应遵循单一职责、组合模式，并支持配置化。比如用 JSON 定义流程步骤，而不是硬编码 if-else，这样业务方可以自助修改。”
- ❌ “MCP 太复杂，小项目用不上。” → ✅ “MCP 的复杂度是线性的：工具越多，收益越大。小项目可以先用函数调用，但架构上预留 MCP 接口，方便后续扩展。不要因为‘现在简单’就放弃可扩展性。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“工具调用与知识检索的协同”切入。例如，用 MCP 调用搜索引擎和数据库，用 Skills 封装“多轮问答”流程，内部结合 RAG 的检索-生成逻辑。
- **如果你只做过传统 NLP**：用“微服务 vs 单体应用”类比。MCP 像微服务的 API 网关，Skills 像业务逻辑层。迁移思路：把传统 NLP 的 pipeline（分词→NER→分类）封装成 Skills，把外部数据源（如知识库）通过 MCP 接入。
- **如果你是校招无项目**：聚焦论文复现。例如，复现 ReAct 论文时，用 Skills 实现“思考-行动-观察”循环，用 MCP 调用计算器或搜索工具。展示你对 Agent 架构的理解，而非实际项目经验。
- MCP 官方规范（Model Context Protocol Specification）
- LangChain Skills 设计模式（LangChain Skills Documentation）
- ReAct: Synergizing Reasoning and Acting in Language Models
- Circuit Breaker 模式在 Agent 中的应用（Martin Fowler 博客）
- 工具调用中的协议设计：从 Function Calling 到 MCP（Anthropic 技术博客）

---
