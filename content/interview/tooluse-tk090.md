---
slug: tooluse-tk090
no: "990"
title: "工具注册中心应该包含哪些元数据"
question: "工具注册中心应该包含哪些元数据"
excerpt: "面试官想看你能否设计完整的工具元数据模型。刁钻点在于：元数据太少（如只有名称和地址）无法支撑智能路由和安全管理；太多则增加注册和查询的开销。答好了能展示你在数据建模和 API 设计方面的经验。"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4779
updated: "2026-09-29"
---

## 工具注册中心应该包含哪些元数据

> 配图（无描述）

#### 1️⃣ 考察意图

面试官想看你能否设计完整的工具元数据模型。刁钻点在于：元数据太少（如只有名称和地址）无法支撑智能路由和安全管理；太多则增加注册和查询的开销。答好了能展示你在数据建模和 API 设计方面的经验。

#### 2️⃣ 标准答

工具元数据从"基本信息、接口契约、运行时信息、能力声明、安全信息"五个维度设计：

**1. 基本信息（Basic Info）**

`{**  "tool_id": "search_web_v1",
  "name": "search_web",
  "description": "Search the internet for real-time information using Bing Search API",
  "version": "1.2.0",
  "author": "search-team",
  "category": "search",
  "tags": ["web", "realtime", "bing"]
}`
- `tool_id`：全局唯一标识（name + version）
- `description`：LLM 可读的能力描述，影响工具选择准确率
- `category` + `tags`：用于分类浏览和搜索
2. 接口契约（Interface Contract）**

`{**  "input_schema": {
    "type": "object",
    "properties": {
      "query": {"type": "string", "description": "Search query", "maxLength": 500},
      "limit": {"type": "integer", "default": 5, "minimum": 1, "maximum": 20}
    },
    "required": ["query"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "results": {"type": "array", "items": {"type": "object"}},
      "total": {"type": "integer"}
    }
  },
  "error_codes": [
    {"code": "RATE_LIMITED", "message": "Search API rate limit exceeded", "retryable": true},
    {"code": "INVALID_QUERY", "message": "Query is empty or too long", "retryable": false}
  ],
  "examples": [
    {"input": {"query": "OpenAI GPT-5"}, "output": {"results": [...], "total": 5}}
  ]
}`
- `input_schema`/`output_schema`：JSON Schema 格式的参数定义，支持运行时校验
- `error_codes`：预定义错误码，网关据此做错误码统一映射
- `examples`：示例输入输出，帮助 LLM 理解工具用法
3. 运行时信息（Runtime Info）**

`{**  "endpoints": [
    {"url": "http://search-svc:8080/api/search", "protocol": "http", "region": "us-east"},
    {"url": "http://search-svc-eu:8080/api/search", "protocol": "http", "region": "eu-west"}
  ],
  "health_check": {"url": "http://search-svc:8080/health", "interval_seconds": 10},
  "metrics": {"avg_latency_ms": 800, "p99_latency_ms": 2000, "success_rate": 0.98, "qps": 150}
}`
- `endpoints`：多地域多实例的访问地址
- `health_check`：健康检查配置
- `metrics`：实时性能指标，用于智能路由
4. 能力声明（Capability Declaration）**

`{**  "capabilities": ["streaming", "batch", "caching"],
  "task_domains": ["search", "information_retrieval"],
  "supported_languages": ["zh", "en", "ja"],
  "max_input_size": 500,
  "max_output_size": 10000,
  "cost_per_call": 0.001,
  "concurrency_limit": 50
}`
- `capabilities`：支持的功能（流式、批量、缓存）
- `task_domains`：适用的任务领域，用于能力匹配
- `cost_per_call`：每次调用的成本，用于成本优化路由
5. 安全信息（Security Info）**

`{**  "required_permissions": ["search:read"],
  "authentication": {"type": "oauth2", "token_url": "https://auth.example.com/token"},
  "audit_level": "full",
  "data_classification": "public",
  "rate_limit": {"qps": 100, "daily_quota": 10000}
}`
- `required_permissions`：调用此工具需要的权限
- `authentication`：认证方式
- `audit_level`：审计级别（none/summary/full）
- `data_classification`：数据处理级别（public/internal/confidential）

#### 3️⃣ 答题模板（30 秒电梯版）

> "工具元数据五维：基本信息——tool_id/name/description(LLM可读)/version/category/tags。接口契约——input_schema/output_schema(JSON Schema)+error_codes+examples。运行时信息——多地域endpoints+health_check+实时metrics(延迟/成功率/QPS)。能力声明——capabilities(streaming/batch)+task_domains+cost_per_call+concurrency_limit。安全信息——required_permissions+authentication(OAuth2)+audit_level+data_classification+rate_limit。总结一句：元数据是Agent工具选择的唯一依据——描述质量直接影响选择准确率。"

#### 4️⃣ 高频追问 & 应对
追问 1**：元数据太详细会不会泄露敏感信息？

> 分级暴露：(1) 公开元数据——name/description/category/tags/input_schema/output_schema。所有 Agent 可见，用于工具发现和选择；(2) 认证后可见——endpoints/metrics/capabilities/cost_per_call。需要认证才能查看，防止攻击者探测内部架构；(3) 管理员可见——required_permissions/authentication/rate_limit/data_classification。仅运维和安全团队可见

**追问 2**：metrics（延迟/成功率）是实时的还是历史的？

> 混合方案：(1) 实时 metrics——最近 5 分钟的滑动窗口数据，用于实时路由决策。数据存在 Redis 中，每次调用更新；(2) 历史 metrics——按小时/天聚合的历史数据，用于容量规划和趋势分析。数据存在时序数据库（如 InfluxDB）；(3) 注册中心暴露实时 metrics（5分钟窗口），历史 metrics 单独查询。避免注册中心存储大量历史数据

**追问 3**：工具的 description 变了算不算 breaking change？

> 算"行为变更"但不影响 Schema 兼容性。description 变化会影响 LLM 的工具选择——即使参数不变，LLM 可能选择不同的工具或生成不同参数。处理方式：(1) description 变更需要走灰度发布——先在 10% 流量上测试新 description 的工具选择准确率；(2) 如果准确率下降 >3%，回滚 description 变更；(3) description 版本化——元数据中记录 description 的变更历史，支持回溯

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "元数据只要有名称和地址就够了" → ✅ "名称和地址只够做静态路由。Agent 需要 description 做工具选择、schema 做参数校验、metrics 做智能路由、security 做权限控制。元数据越完整，Agent 的决策越准确。"
- ❌ "元数据写一次就不用改了" → ✅ "metrics 需要实时更新（每5分钟），endpoints 在扩缩容时更新，version 在升级时更新。元数据是动态的，需要持续维护。"
- ❌ "所有元数据都对所有 Agent 公开" → ✅ "安全信息（权限、认证、限流）不应对普通 Agent 公开——攻击者可以据此设计攻击策略。需要分级暴露。"

#### 6️⃣ 简历呼应

- **如果你有元数据设计项目**：从"工具元数据模型"切入，描述你设计的五维元数据体系和分级暴露策略
- **如果你只做过 API 文档**：用"OpenAPI Spec"迁移——参数定义、错误码、示例等概念直接适用，额外需要的是"运行时 metrics"和"安全信息"
- **如果你是校招无项目**：设计一套工具元数据格式，实现注册+查询+分级暴露
- "OpenAPI Specification 3.1" (OpenAPI Initiative, 2024)
- "Agent Card: Metadata for Tool Discovery" (Google A2A, 2025)
- "Service Metadata Models" (Consul, 2024)

---
