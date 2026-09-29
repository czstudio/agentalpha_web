---
slug: tooluse-tk080
no: "980"
title: "什么是 Agent 的「能力声明「？为什么重要"
question: "什么是 Agent 的「能力声明「？为什么重要"
excerpt: "面试官想看你能否设计 Agent 的能力声明（Capability Declaration）机制。刁钻点在于：能力声明不只是"写个描述"，还需要结构化的能力描述、版本管理、动态更新。答好了能展示你在 API 设计和 Ag"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4491
updated: "2026-09-29"
---

## 什么是 Agent 的「能力声明「？为什么重要

#### 1️⃣ 考察意图

面试官想看你能否设计 Agent 的能力声明（Capability Declaration）机制。刁钻点在于：能力声明不只是"写个描述"，还需要结构化的能力描述、版本管理、动态更新。答好了能展示你在 API 设计和 Agent 互操作性方面的经验。

#### 2️⃣ 标准答

**能力声明是 Agent 的"接口契约"——用结构化方式描述 Agent 能做什么、怎么做、有什么约束。**

**1. 能力声明的内容**

一个完整的能力声明包含：

`{**  "agent_name": "CodeReviewer",
  "version": "1.2.0",
  "description": "Reviews code for bugs, security issues, and style violations",
  "skills": [
    {
      "name": "review_python",
      "description": "Review Python code for bugs and PEP 8 compliance",
      "input_schema": {
        "type": "object",
        "properties": {
          "code": {"type": "string", "description": "Python code to review"},
          "focus": {"type": "string", "enum": ["bugs", "security", "style", "all"]}
        },
        "required": ["code"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "issues": {"type": "array", "items": {"type": "object"}},
          "summary": {"type": "string"}
        }
      },
      "constraints": {
        "max_code_length": 10000,
        "supported_languages": ["python"],
        "avg_latency_ms": 3000
      }
    }
  ],
  "capabilities": ["streaming", "push-notifications"],
  "authentication": {"type": "oauth2", "token_url": "https://..."},
  "limits": {"max_concurrent_tasks": 10, "rate_limit": "10/min"}
}`2. 为什么重要**

- **发现基础**：其他 Agent 通过能力声明判断"这个 Agent 能帮我做什么"。没有能力声明，其他 Agent 无法知道你的能力
- **调度依据**：Orchestrator 根据能力声明的 `constraints`（延迟、并发限制）做任务调度。例如选择 `avg_latency_ms < 5000` 的 Agent
- **兼容性保证**：`version` + `input_schema` 让调用方知道"用什么参数格式调用"。版本变更时调用方可以判断是否需要适配
- **安全边界**：`limits` 和 `authentication` 让其他 Agent 知道"怎么调用安全"。未声明的能力不允许被调用（最小权限原则）

**3. 能力声明 vs API 文档 vs Agent Card**

| 维度 | API 文档（OpenAPI） | Agent Card（A2A） | 能力声明 |
|---|---|---|---|
| 面向对象 | 开发者（人类） | Agent（LLM） | 两者 |
| 格式 | YAML/JSON | JSON | JSON |
| 语义理解 | 机器可解析 | LLM 可读 | 两者 |
| 动态更新 | 静态 | 支持运行时更新 | 支持版本+动态更新 |
| 约束描述 | 无 | 基础（capabilities） | 完整（constraints+limits） |

**4. 能力声明的最佳实践**

- **描述要 LLM 可读**：`description` 用自然语言写，包含"何时用""做什么""输出什么"。LLM 根据描述决定是否选择该 Agent
- **Schema 要严格**：`input_schema` 用 JSON Schema 定义，包含类型、必填、枚举值、范围约束。让 LLM 生成的参数可校验
- **约束要明确**：`constraints` 包含性能限制（延迟、并发）、数据限制（最大输入长度）、依赖限制（需要什么环境）
- **版本要语义化**：MAJOR.MINOR.PATCH，MAJOR 变更意味着 breaking change，调用方需要适配

#### 3️⃣ 答题模板（30 秒电梯版）

> "能力声明是Agent的接口契约——结构化描述Agent能做什么。内容包括：agent_name+version（语义化版本）、description（LLM可读的能力描述）、skills（每个skill有name+description+input_schema+output_schema+constraints）、capabilities（streaming/push等）、authentication、limits（并发/频率）。重要性：发现基础（其他Agent据此判断能力）、调度依据（根据constraints做任务分配）、兼容性保证（version+schema让调用方适配）、安全边界（limits+auth定义安全约束）。vs API文档：能力声明同时面向人类和LLM，支持动态更新和约束描述。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：能力声明和 MCP 的 tool definition 有什么区别？

> 三个区别：(1) 粒度——MCP tool definition 描述单个工具（如 `search`），能力声明描述整个 Agent 的所有 skills（可能包含多个工具的组合）；(2) 约束——MCP tool definition 只有参数 Schema，能力声明额外有 constraints（延迟、并发、数据限制）和 limits（频率限制）；(3) 动态性——MCP tool definition 是静态的（工具定义不变），能力声明支持动态更新（Agent 新增 skill 后更新声明，其他 Agent 实时感知）。关系：能力声明可以包含 MCP tool definitions——Agent 在能力声明中引用其 MCP Server 暴露的工具

**追问 2**：能力声明如果和实际行为不一致怎么办？

> 一致性保障：(1) 自动化验证——注册中心定期发送测试 Task 验证 Agent 的实际行为是否与声明一致。例如声明支持 `review_python`，发送测试代码验证确实能审查；(2) 用户反馈——调用方 Agent 评分"声明与实际是否一致"，低分 Agent 被标记；(3) 版本约束——声明版本与代码版本绑定，代码变更时同步更新声明。不一致时降级信任分。关键认知：能力声明是"承诺"而非"保证"——需要验证机制保证一致性

**追问 3**：能力声明会不会泄露 Agent 的商业机密？比如暴露了内部实现细节？

> 好问题。防御方案：(1) 声明最小化——只暴露"能做什么"和"怎么调用"，不暴露"怎么实现"。例如声明 `review_python` skill，但不暴露内部用了什么模型、什么 prompt、什么规则引擎；(2) 分级声明——公开声明（Agent Card）只包含基本信息（name、description、skills），详细声明（constraints、limits）需要认证后才能查看；(3) 抽象参数——input_schema 用业务参数（如 `code`、`focus`）而非技术参数（如 `model`、`temperature`）。调用方不需要知道你用什么模型

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "能力声明就是写个 README" → ✅ "README 是给人类看的，能力声明是给 Agent（LLM）看的。需要结构化 JSON 格式，包含 LLM 可读的 description 和机器可校验的 Schema。"
- ❌ "能力声明写一次就行了" → ✅ "能力声明需要随 Agent 能力变化动态更新——新增 skill、修改参数、调整限制都需要同步更新声明。过期声明导致调用方做出错误决策。"
- ❌ "能力声明越详细越好" → ✅ "过度详细的声明占用 LLM 上下文（如果传给 LLM 做选择）。最佳长度约 200-500 tokens——包含核心信息但不冗余。详细约束可以分层——基础信息在 Agent Card，详细约束在认证后查看。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 平台项目**：从"能力声明系统"切入，描述你设计的能力声明格式和注册发现机制
- **如果你只做过 API 设计**：用"OpenAPI Spec"迁移——参数定义、版本管理、错误处理等概念直接适用，额外需要的是"LLM 可读性"和"动态更新"
- **如果你是校招无项目**：设计一套 Agent 能力声明格式，实现声明注册+验证+发现机制
- "Agent Card Specification" (Google A2A, 2025)
- "Capability-Based Security in Agent Systems" (Ji et al., 2025)
- "API Description Formats: OpenAPI vs Agent Card" (Wang et al., 2025)

---

**本章学习完毕**
← 返回 Agent 岗面试宝典 v3 · 精华版　|　📝 建议整理错题笔记　|　🎯 标记掌握程度
