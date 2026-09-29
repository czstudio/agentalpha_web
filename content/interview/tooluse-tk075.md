---
slug: tooluse-tk075
no: "975"
title: "什么是「Skill「？在 Agent 系统中起什么作用"
question: "什么是「Skill「？在 Agent 系统中起什么作用"
excerpt: "面试官想看你能否区分"Skill"和"Tool"的概念差异，以及 Skill 在 Agent 架构中的定位。刁钻点在于：很多人把 Skill 等同于 Tool，但 Skill 是更高层次的抽象——包含多步骤逻辑、状态管理"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4013
updated: "2026-09-29"
---

## 什么是「Skill「？在 Agent 系统中起什么作用

#### 1️⃣ 考察意图

面试官想看你能否区分"Skill"和"Tool"的概念差异，以及 Skill 在 Agent 架构中的定位。刁钻点在于：很多人把 Skill 等同于 Tool，但 Skill 是更高层次的抽象——包含多步骤逻辑、状态管理、触发条件。答好了能展示你对 Agent 能力建模的深度理解。

#### 2️⃣ 标准答

**Skill 是 Agent 的"能力单元"——比 Tool 更高级、比 Agent 更轻量。**

**1. Skill 的定义**

Skill 是一个可复用的能力模块，包含：

- **触发条件**（Trigger）：何时使用这个 Skill。例如 `intent == "code_review"` 或 `language == "python"`
- **执行逻辑**（Logic）：多步骤的工具调用 + LLM 推理。例如 `read_file → analyze_code → check_style → generate_report`
- **输入输出定义**（I/O Schema）：输入参数和输出格式的 JSON Schema
- **状态管理**（State）：Skill 执行过程中的中间状态。例如"已读取文件""已分析代码""已生成报告"
- **错误处理**（Error Handling）：某步骤失败时的降级策略

**2. Skill vs Tool vs Agent**

| 维度 | Tool（工具） | Skill（技能） | Agent（智能体） |
|---|---|---|---|
| 抽象层级 | 最低（原子操作） | 中间（多步骤组合） | 最高（自主决策） |
| 复杂度 | 单次调用 | 多步编排 | 多 Skill + 自主规划 |
| 状态 | 无状态 | 有状态（执行过程） | 有状态（长期记忆） |
| 决策能力 | 无（被动调用） | 有限（按预定义流程） | 完全自主 |
| 类比 | 函数 | 设计模式 | 应用程序 |
| 示例 | `search("query")` | `review_code(file_path)` | Code Review Agent |

**3. Skill 在 Agent 架构中的作用**

- **模块化能力**：Agent 的能力由多个 Skill 组合而成。例如文档助手 Agent 有 `summarize`、`translate`、`extract_keywords` 三个 Skill。新增能力只需添加新 Skill，不需要修改 Agent 核心
- **复用与共享**：Skill 可以跨 Agent 共享。例如 `summarize` Skill 可以被文档助手、邮件助手、会议记录助手共用。类似软件工程中的"库"或"组件"
- **动态加载**：Agent 根据任务需求动态加载 Skill。例如处理"代码问题"时加载 `review_code` Skill，处理"数据分析"时加载 `analyze_data` Skill。减少上下文占用（不加载不需要的 Skill 描述）
- **独立测试**：Skill 可以独立测试和评估。例如测试 `summarize` Skill 的准确率，不需要启动整个 Agent

**4. Skill 的实现方式**

- **声明式 Skill**：用 YAML/JSON 定义流程，引擎执行。例如：`name: review_code trigger: {intent: "code_review", language: "python"} steps:   - tool: read_file     input: {path: "$user.file_path"}   - tool: analyze_code     input: {code: "$step1.content"}   - llm: {prompt: "Review this code for bugs and security: $step2.analysis"} output: {report: "$step3.response"}`
- **编程式 Skill**：用 Python 函数实现，框架调用。例如 LangChain 的 `Tool` 可以包含多步逻辑
- **混合式**：流程声明式 + 关键步骤编程式。平衡灵活性和可维护性

#### 3️⃣ 答题模板（30 秒电梯版）

> "Skill是Agent的能力单元——比Tool高级（多步骤+状态管理），比Agent轻量（无自主决策）。定义包含：触发条件、执行逻辑（多步工具调用+LLM推理）、I/O Schema、状态管理、错误处理。作用：模块化能力（新增能力加Skill不改Agent核心）、复用共享（summarize Skill跨Agent复用）、动态加载（按任务加载减少上下文）、独立测试。实现：声明式YAML定义流程+编程式关键步骤。类比：Tool是函数，Skill是设计模式，Agent是应用程序。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：Skill 和 LangChain 的 Chain/Agent 有什么区别？

> LangChain 的概念演进：Tool → Chain → Agent。(1) Tool 是单次调用（如 `search`）；(2) Chain 是多个 Tool 的顺序组合（如 `search → summarize → send_email`），无决策能力，按预定义流程执行；(3) Agent 有 LLM 决策能力，可以根据中间结果决定下一步调用什么工具。Skill 概念最接近 Chain——多步骤编排+预定义流程。但 Skill 额外有触发条件、状态管理、错误处理，比 Chain 更完整。LangChain 的 LangGraph 实际上是在实现 Skill 的概念——图结构定义多步流程+条件分支+状态管理

**追问 2**：Skill 的触发条件怎么设计？LLM 怎么知道何时用哪个 Skill？

> 三种触发方式：(1) 意图分类——用小模型做意图分类，输出 Skill 名称。例如用户说"帮我审查代码"→意图`code_review`→触发`review_code` Skill。延迟低（<50ms）但准确率依赖分类模型；(2) LLM 决策——把所有 Skill 的描述传给 LLM，LLM 选择合适的 Skill。准确率高但延迟大（>500ms）且占上下文；(3) 规则匹配——关键词触发（如"代码"→`review_code`）。最快但覆盖率低。实际系统用混合：规则快速过滤→意图分类精确匹配→LLM 兜底处理长尾

**追问 3**：Skill 的状态管理怎么做？如果执行到一半失败了怎么恢复？

> 两种状态管理方案：(1) 内存状态——Skill 执行过程中的中间结果存在内存中（如 Python dict）。简单但不持久——进程重启后丢失。适合短时 Skill（<5分钟）；(2) 持久化状态——中间结果存入数据库/Redis，支持故障恢复。每个 Skill 执行有一个 `execution_id`，中间结果按 `execution_id` 索引。失败后用 `execution_id` 查询已完成的步骤，从失败点重试而非从头开始。类似于工作流引擎的 checkpoint 机制。实现方式：用 LangGraph 的 checkpoint 或自研状态存储

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "Skill 就是 Tool 的另一个名字" → ✅ "Skill 比 Tool 高一个层级——Tool 是单次原子调用，Skill 是多步骤编排+状态管理。一个 Skill 可能内部调用多个 Tool。"
- ❌ "Skill 是 Agent 的小型化" → ✅ "Skill 没有自主决策能力——按预定义流程执行，不自己决定下一步做什么。Agent 有 LLM 决策能力，可以动态规划。Skill 是Agent的能力组件，不是小型Agent。"
- ❌ "所有 Agent 都应该用 Skill 架构" → ✅ "简单 Agent（单步工具调用）不需要 Skill 抽象——直接用 Tool 就行。Skill 适合复杂多步骤任务（如代码审查、数据分析）。过度抽象增加复杂度。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 框架项目**：从"Skill 架构设计"切入，描述你实现的声明式 Skill 引擎，给出 Skill 数量和复用率数据
- **如果你只做过工作流引擎**：用"BPMN 工作流"迁移——工作流中的步骤、网关、事件直接映射到 Skill 的 steps、trigger、error_handling
- **如果你是校招无项目**：设计 5 个 Skill（如 summarize、translate、review_code），实现声明式+编程式混合引擎
- "Skill-Based Agent Architecture" (Wang et al., 2024)
- "LangGraph: Stateful Multi-Step Agent Orchestration" (LangChain, 2024)
- "Composable Agents with Skill Modules" (Qin et al., 2023)

---
