---
slug: tooluse-tk085
no: "985"
title: "Agent 网关的「请求/响应转换「如何实现"
question: "Agent 网关的「请求/响应转换「如何实现"
excerpt: "面试官想看你能否设计网关的数据转换层——让不同格式的请求/响应在 Agent 和工具之间无损耗传递。刁钻点在于：数据转换不只是 JSON 字段映射，还需要处理编码、Header 注入、错误码统一等。答好了能展示你在数据工"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3786
updated: "2026-09-29"
---

## Agent 网关的「请求/响应转换「如何实现

#### 1️⃣ 考察意图

面试官想看你能否设计网关的数据转换层——让不同格式的请求/响应在 Agent 和工具之间无损耗传递。刁钻点在于：数据转换不只是 JSON 字段映射，还需要处理编码、Header 注入、错误码统一等。答好了能展示你在数据工程和 API 设计方面的经验。

#### 2️⃣ 标准答

请求/响应转换从"Schema 映射、编码转换、Header 注入、错误码统一"四个维度实现：

**1. Schema 映射（Schema Mapping）**

- 定义字段映射规则：`source_field → target_field`。例如 Agent 发送 `{query: "weather"}`，工具期望 `{search_text: "weather"}`，映射规则 `query → search_text`
- 实现：(1) JSON Path/JQ 表达式——`{search_text: .query}` 灵活但性能一般；(2) 预编译映射表——启动时编译映射规则为函数，运行时直接调用。性能好但灵活性差；(3) JSON Schema 转换——用 Schema 定义源格式和目标格式，自动生成映射函数
- **嵌套映射**：`{user: {name: "Alice"}}` → `{user_name: "Alice"}` 需要支持嵌套路径展开
- **数组映射**：`{tags: ["a", "b"]}` → `{tag_list: "a,b"}` 需要支持数组→字符串转换

**2. 编码转换（Encoding Conversion）**

- **UTF-8 ↔ Base64**：文件上传时 Agent 发送 Base64 编码的文件内容，网关解码为二进制传给文件存储服务
- **JSON ↔ Protobuf**：HTTP JSON 请求转换为 gRPC Protobuf 消息（参见 Q2）
- **JSON ↔ Form Data**：某些旧 API 只接受 form-data 格式，网关做 JSON→form-data 转换
- **日期格式**：Agent 发送 ISO 8601（`2024-12-01T10:30:00Z`），工具期望 Unix timestamp（`1733057400`），网关自动转换

**3. Header 注入（Header Injection）**

- 网关自动在请求中注入标准 Header：`Authorization: Bearer {token}` — 认证信息
- `X-Trace-Id: {uuid}` — 链路追踪 ID
- `X-Tenant-Id: {tenant_id}` — 租户标识
- `X-Request-Id: {uuid}` — 请求唯一标识
- `X-Agent-Id: {agent_id}` — Agent 标识
价值：Agent 和工具都不需要自己注入这些 Header，网关统一处理。工具后端从 Header 中提取追踪信息，便于日志关联条件注入：不同工具需要不同的 Header。网关根据路由配置决定注入哪些 Header

**4. 错误码统一（Error Code Normalization）**

- 不同工具返回不同的错误格式：HTTP API：`{status: 404, message: "Not Found"}`
- gRPC：`{code: 5, details: "Not Found"}`（gRPC NOT_FOUND = code 5）
- MCP：`{error: {code: -32602, message: "Invalid params"}}`
网关统一为标准错误格式：

`{**  "error": {
    "type": "not_found",
    "code": 404,
    "message": "Resource not found",
    "retryable": false,
    "details": {...}
  }
}`错误码映射表**：维护 `tool_name + original_error → standard_error` 映射表。新工具上线时配置错误码映射**`retryable`**** 字段**：标注错误是否可重试。`timeout` → retryable=true，`invalid_params` → retryable=false。Agent 根据 `retryable` 决定是否重试

#### 3️⃣ 答题模板（30 秒电梯版）

> "请求/响应转换四维：Schema映射——字段名映射（query→search_text），JQ表达式或预编译映射表，支持嵌套展开和数组转字符串。编码转换——UTF-8↔Base64、JSON↔Protobuf、JSON↔form-data、日期格式自动转换。Header注入——自动注入Authorization/X-Trace-Id/X-Tenant-Id/X-Agent-Id，工具不需要自己处理。错误码统一——各工具不同错误格式统一为{error:{type,code,message,retryable}}，retryable字段指导Agent是否重试。"

#### 4️⃣ 高频追问 & 应对
**追问 1**：JQ 表达式的性能怎么样？会不会成为瓶颈？

> JQ 性能：单次解析约 0.1-1ms，对于大多数场景可接受。但在 1000 QPS 下可能成为瓶颈。优化方案：(1) 预编译——JQ 表达式在启动时编译为字节码，运行时直接执行。性能提升 5-10 倍；(2) 缓存——相同请求参数的转换结果缓存（TTL 5 分钟），命中率约 30%；(3) 热路径用硬编码——高频工具的映射规则直接写代码而非 JQ，性能最优但灵活性差。建议：低频工具用 JQ（灵活），高频工具用硬编码（性能）

**追问 2**：错误码映射表怎么维护？新工具上线时怎么配置？

> 管理方案：(1) 声明式配置——新工具在注册中心声明错误码映射 `{"404": {"type": "not_found", "retryable": false}, "429": {"type": "rate_limited", "retryable": true}}`；(2) 自动推断——如果工具未声明映射，网关根据 HTTP 状态码自动推断（200→success, 4xx→client_error, 5xx→server_error）；(3) 运行时学习——工具返回的错误如果未在映射表中，网关记录并归类，运维人员定期审核后加入映射表

**追问 3**：转换过程中数据丢失怎么办？比如源格式有字段但目标格式没有？

> 处理策略：(1) 严格模式——目标格式缺少源字段时报错，拒绝转换。适用于数据完整性要求高的场景；(2) 宽松模式——多余字段忽略，继续转换。适用于容忍数据丢失的场景；(3) 扩展模式——多余字段保留在 `extra` 字段中 `{...mapped_fields, extra: {unmapped_field: value}}`。不丢数据但目标工具需要处理 `extra` 字段。建议默认用宽松模式+日志记录被丢弃的字段，便于排查

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "转换就是改字段名" → ✅ "不只是字段名——还需要编码转换（Base64/Protobuf）、Header注入（追踪/认证）、错误码统一（不同格式→标准格式）。是完整的数据管道。"
- ❌ "让 Agent 适配各工具的数据格式" → ✅ "Agent 适配 N 个工具 = O(N) 复杂度。网关统一转换 = O(1) 复杂度（Agent 只用标准格式）。且工具变更格式时不影响 Agent。"
- ❌ "错误码直接透传就行" → ✅ "不同工具的错误格式差异大——HTTP 404、gRPC code 5、MCP -32602。Agent 无法理解所有格式。需要网关统一为标准错误格式+retryable标注。"

#### 6️⃣ 简历呼应

- **如果你有数据管道项目**：从"网关数据转换层"切入，描述你实现的 Schema 映射+编码转换+错误码统一体系
- **如果你只做过 ETL**：用"ETL 数据转换"迁移——字段映射、编码转换等概念直接适用
- **如果你是校招无项目**：实现一个请求/响应转换中间件，支持 JSON 字段映射+Base64 解码+错误码统一
- "Data Transformation in API Gateways" (Kong, 2024)
- "JQ: JSON Query Language" (jqlang, 2024)
- "Error Handling in Distributed Systems" (Microsoft, 2023)

---
