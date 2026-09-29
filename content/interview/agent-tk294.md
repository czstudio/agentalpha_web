---
slug: agent-tk294
no: "1194"
title: "为什么 Demo 能跑，但真实业务就各种报错"
question: "为什么 Demo 能跑，但真实业务就各种报错"
excerpt: "面试官想考察你是否真正理解 Agent 从“能跑”到“可靠”之间的系统工程鸿沟。这不是背概念题，而是工程取舍 + 系统设计题。刁钻点在于：Demo 只验证了“Happy Path”，而生产环境要求覆盖所有“Sad Pat"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3399
updated: "2026-09-29"
---

## 为什么 Demo 能跑，但真实业务就各种报错

`P1` · `agent_architecture`

🏷 标签：`demo_vs_production`, `tool_schema`, `error_handling`, `system_engineering`

#### 1️⃣ 考察意图

面试官想考察你是否真正理解 Agent 从“能跑”到“可靠”之间的系统工程鸿沟。这不是背概念题，而是**工程取舍 + 系统设计**题。刁钻点在于：Demo 只验证了“Happy Path”，而生产环境要求覆盖所有“Sad Path”——工具 Schema 的严格性、错误恢复、状态一致性、并发与资源隔离。答好了能展示你对 Agent 落地整条链路的硬实力，包括工具调用、记忆管理、容错策略和可观测性。

#### 2️⃣ 标准答

核心原因：Demo 是“单点功能验证”，生产是“端到端系统可靠性”。差距体现在四个层面：

- **工具 Schema 的严格性缺失**Demo 中工具调用常写死参数或忽略类型检查。生产环境必须用 JSON Schema 或 Pydantic 严格定义参数：必填/可选、类型约束（如 `minimum: 0`）、枚举值（如 `status: ["active", "inactive"]`）。否则 LLM 输出 `{"date": "2024-13-01"}` 或 `{"amount": -100}` 直接崩。
- **坑**：LLM 常生成非法参数（如字符串当数字），需在 Agent 层加输入校验器（如 `jsonschema.validate`），并定义“校验失败”作为工具返回的错误类型，触发重试或回退。
- **Trade-off**：严格校验增加延迟（约 5-10ms/次），但避免下游系统崩溃；宽松校验提升吞吐但引入脏数据。
错误处理与重试策略缺失
- Demo 假设工具永远成功。生产环境需枚举错误类型：网络超时（HTTP 5xx）、业务逻辑错误（如库存不足）、LLM 解析错误（输出非 JSON）。每种错误需独立重试策略：指数退避（初始 1s，最大 30s）用于网络错误；直接返回错误给用户用于业务错误。
- **解法**：在 Agent 执行引擎中嵌入“错误分类器”，如用 `try-except` 捕获异常后匹配错误码，再决定重试或终止。参考 LangGraph 的 `RetryPolicy` 配置。
记忆与状态一致性
- Demo 用单轮对话，无记忆。生产环境需多轮交互，Agent 必须维护会话状态（如用户已确认订单 ID）。若用向量记忆（如 Chroma），需处理过期数据（如 30 分钟后清理）和冲突（同一用户两轮修改同一字段）。
- **坑**：LLM 可能从历史中读取错误信息（如“订单已取消”但实际未取消），需在记忆检索时加时间戳过滤，或使用短期记忆（如 Redis 缓存最近 5 轮）避免污染。
端到端执行链路与可观测性
- Demo 无日志。生产环境需追踪每个 Agent 步骤：LLM 调用耗时、工具调用结果、错误堆栈。用 OpenTelemetry 或 LangSmith 记录 trace，并设置告警（如工具失败率 > 5%）。
- **Trade-off**：整条链路追踪增加存储成本（约 1KB/step），但能快速定位问题（如某工具 Schema 变更导致 30% 调用失败）。

总结：Demo 是“玩具”，生产是“工程”。核心差距在于**工具 Schema 的严格定义、错误处理的分级策略、记忆的时效性管理、以及整条链路可观测性**。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，工具 Schema 的严格性——Demo 忽略参数校验，生产需用 JSON Schema 定义必填/可选/类型，并加输入校验器；第二，错误处理——Demo 假设永远成功，生产需枚举错误类型并配指数退避重试；第三，状态一致性——Demo 无记忆，生产需用时间戳过滤和短期缓存。总结一句：Demo 只验证 Happy Path，生产必须覆盖所有 Sad Path，核心是系统工程能力。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到工具 Schema 校验，如果 LLM 频繁输出非法参数，怎么优化？

> 首先，在 Prompt 中显式给出 Schema 示例（如 JSON 格式），并强调“必须严格遵循类型”。其次，在 Agent 层加后处理：若校验失败，将错误信息（如“参数 amount 应为整数，但收到字符串”）返回给 LLM 要求重试，最多 3 次。最后，若仍失败，回退到人工确认。**Trade-off**：重试增加延迟（约 2-3 次 LLM 调用），但提升成功率（从 70% 到 95%+）。

**追问 2**：生产环境 Agent 如何保证多用户并发下的状态隔离？

> 每个用户会话分配唯一 ID（如 UUID），存储在 Redis 中，键为 `session:{user_id}:{session_id}`。Agent 执行时，从 Redis 读取该会话的短期记忆（最近 5 轮）和工具调用历史。用乐观锁（如版本号）避免并发写冲突：若版本号不匹配，重试读取。**坑**：Redis 内存有限，需设置 TTL（如 30 分钟），并定期清理过期会话。

**追问 3**：如果工具调用返回错误，但 LLM 无法理解错误信息，怎么办？

> 在工具 Schema 中定义标准错误格式：`{"error_code": "INVENTORY_SHORTAGE", "message": "库存不足，剩余 2 件"}`。在 Agent 执行引擎中，将错误信息映射到预定义的“错误处理模板”，如“库存不足”时，LLM 应建议用户减少数量或选择替代品。若 LLM 仍失败，则触发“降级策略”：直接返回固定回复（如“系统繁忙，请稍后重试”）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 回答“因为 Demo 数据量小，生产数据量大” → ✅ 正确切入：核心是工具 Schema 的严格性、错误处理、状态一致性，数据量只是表象，真正问题是系统工程缺失。
- ❌ 回答“因为 LLM 在 Demo 中表现好，生产环境 prompt 不够好” → ✅ 正确切入：Prompt 优化是部分原因，但更关键的是工具调用失败后的容错机制（重试、回退、错误分类），以及记忆管理。
- ❌ 回答“因为 Demo 没有考虑并发” → ✅ 正确切入：并发只是问题之一，还需考虑工具 Schema 校验、错误枚举、状态隔离、可观测性等系统工程整条链路。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“Demo 只测试单文档检索，生产需处理多文档冲突和 Schema 校验”切入，强调工具调用中的参数约束和错误处理。
- **如果你只做过传统 NLP**：用“传统 NLP 的规则引擎 vs Agent 的 LLM 驱动”类比，强调生产环境需像规则引擎一样定义错误码和重试策略。
- **如果你是校招无项目**：聚焦“LangGraph 的 RetryPolicy 和 Pydantic 的 Schema 校验”论文复现 demo，展示对工具 Schema 和错误处理的理解。

#### 7️⃣ 延伸阅读

- 《Building Production-Ready LLM Agents: A Case Study on Tool Schema Design》
- LangGraph 官方文档：RetryPolicy 与 State Management
- 《Error Handling in LLM-Based Systems: A Taxonomy and Best Practices》
- 《Memory Management for Conversational Agents: Short-Term vs Long-Term》
- OpenTelemetry 与 LangSmith 的 Agent 追踪实践

---
