---
slug: enterprise-tk704
no: "1604"
title: "Skill 是什么"
question: "Skill 是什么"
excerpt: "面试官想考察你对 Agent 系统中“模块化能力”的理解深度，而非简单背诵定义。这是典型的“概念辨析 + 工程取舍”题，刁钻点在于：很多人把 Skill 等同于 Tool 或 Function Calling，但面试官真"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4424
updated: "2026-09-29"
---

## Skill 是什么

#### 1️⃣ 考察意图

面试官想考察你对 Agent 系统中“模块化能力”的理解深度，而非简单背诵定义。这是典型的“概念辨析 + 工程取舍”题，刁钻点在于：很多人把 Skill 等同于 Tool 或 Function Calling，但面试官真正想看的是你能否区分“原子操作”与“组合流程”，以及能否讲清楚 Skill 在 Agent 架构中的定位——它是连接 LLM 推理与外部世界的“可复用能力单元”。答好了能展示你对 Agent 系统设计的系统性思维，以及在实际框架（如 LangGraph、AutoGPT）中的落地经验。

#### 2️⃣ 标准答

**定义与定位**Skill 是 Agent 中封装特定领域知识、工具调用逻辑与执行流程的**可复用能力模块**。它比 Tool 高一个抽象层级：Tool 是原子操作（如 `send_email` API），Skill 是组合流程（如“发送邮件”Skill 包含：查找联系人 → 生成邮件内容 → 调用 `send_email` Tool → 确认发送状态）。在 LangGraph 中，Skill 通常对应一个子图（Subgraph），在 AutoGPT 中则是一个带自然语言描述的 Python 类。

**核心组成**一个完整的 Skill 包含三部分：

- **触发条件**：自然语言描述或意图匹配规则（如“用户说‘发邮件’时激活”），通常用 embedding + 相似度阈值（如 0.7）或 LLM 分类器判断。
- **执行步骤**：LLM 推理 + 工具调用的编排。例如“数据分析”Skill 的步骤：① LLM 解析用户查询生成 SQL → ② 调用 `query_database` Tool → ③ LLM 检查结果质量 → ④ 调用 `visualize` Tool 生成图表 → ⑤ 返回 Markdown 报告。
- **输出规范**：结构化输出格式（如 JSON Schema），确保下游 Agent 能解析。坑点：输出必须包含“执行状态”（success/fail）和“错误信息”，否则 Agent 无法做错误恢复。

**与 Tool 的关键区别**

| 维度 | Tool | Skill |
|---|---|---|
| 粒度 | 原子操作 | 组合流程 |
| 状态管理 | 无状态 | 有状态（如记录中间结果） |
| 复用方式 | 直接调用 | 需注册到 Agent 并配置触发条件 |
| 典型例子 | `get_weather(lat, lon)` | “旅行规划”Skill（查天气 + 订酒店 + 生成行程） |

**工程取舍**

- **为什么不用纯 Tool 链？** Tool 链缺乏上下文共享。例如“数据分析”Skill 中，SQL 查询结果需要传递给可视化 Tool，如果拆成独立 Tool，每次都要重新传递上下文，增加 token 消耗和延迟。Skill 通过内部状态机（如 LangGraph 的 `State`）共享数据，减少冗余。
- **为什么不用纯 LLM 推理？** 纯 LLM 推理无法保证执行确定性。Skill 通过硬编码的步骤顺序（如先查数据再可视化）确保流程可靠，同时保留 LLM 在步骤内的灵活性（如生成 SQL 语句）。

**实际落地的坑 + 解法**

- **坑**：Skill 的触发条件过于宽松，导致 Agent 误激活。例如“发送邮件”Skill 在用户说“帮我写个邮件草稿”时被触发，但用户实际只想生成内容，不想发送。**解法**：在触发条件中加入“确认机制”——LLM 先输出意图置信度，低于阈值（如 0.8）时反问用户确认。或者用“两步触发”：先匹配关键词，再让 LLM 做二分类。
- **坑**：Skill 内部步骤失败时，Agent 无法优雅降级。例如“数据分析”Skill 中数据库查询超时，整个流程卡死。**解法**：每个步骤设置超时（如 5 秒）和重试策略（最多 3 次），并在输出规范中增加 `fallback_action` 字段（如“返回缓存数据”或“提示用户稍后重试”）。

**典型应用**

- **AutoGPT**：Skill 是 Python 类，包含 `run()` 方法和 `description` 属性，Agent 通过 LLM 选择调用哪个 Skill。
- **LangGraph**：Skill 是子图，通过 `add_node` 和 `add_edge` 定义步骤，支持条件分支（如 if 查询结果为空则跳转到“生成默认报告”节点）。
- **CrewAI**：Skill 是 Agent 的“角色能力”，例如“研究员”Agent 拥有“文献检索”Skill，包含搜索、摘要、引用格式化三个步骤。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、组成、工程取舍三个层面回答。定义上，Skill 是 Agent 中封装特定领域知识和工具调用逻辑的可复用能力模块，比 Tool 高一个抽象层级。组成上，它包含触发条件、执行步骤和输出规范，典型例子是‘数据分析’Skill 包含查询、清洗、可视化三步。工程取舍上，Skill 通过内部状态共享减少 token 消耗，但需要处理误触发和步骤失败的问题。总结一句：Skill 是 Agent 从‘能调用工具’进化到‘能执行复杂任务’的关键抽象。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：Skill 和 Tool 的边界在哪里？如果 Tool 本身就很复杂（比如一个完整的 RAG 流程），它算 Skill 还是 Tool？

> 边界在于“是否包含决策逻辑”。Tool 是纯执行，不包含 LLM 推理；Skill 至少包含一个 LLM 推理步骤来协调子任务。例如 RAG 流程如果只是“检索 + 生成”，且检索和生成是硬编码的，那它算 Tool；但如果检索前需要 LLM 判断用哪个索引（如向量库 vs 关键词库），那它就是 Skill。实际工程中，我会用“是否可被其他 Skill 复用”来判断：如果 RAG 流程被多个 Skill 调用（如“问答”Skill 和“摘要”Skill 都用到它），就封装成 Tool；否则保持为 Skill 内部步骤。

**追问 2**：如何设计 Skill 的注册和发现机制，让 Agent 能动态加载？

> 核心是“元数据驱动”。每个 Skill 注册时提供：① 唯一 ID；② 自然语言描述（用于 LLM 选择）；③ 输入输出 Schema（JSON Schema）；④ 依赖列表（如需要哪些 Tool）。Agent 启动时加载所有 Skill 到内存，用 embedding 向量化描述，用户请求时做相似度检索（top-3），再让 LLM 从候选列表中选一个。坑点：描述必须包含“边界条件”，例如“数据分析”Skill 的描述要写“仅处理结构化数据，不支持图片分析”，否则 Agent 会误用。优化点：用 LRU 缓存热 Skill，减少加载延迟。

**追问 3**：多个 Skill 之间如何协作？比如“数据分析”Skill 需要调用“数据导出”Skill。

> 有两种模式：① **嵌套调用**：Skill A 内部调用 Skill B，通过 Agent 的全局调度器（如 LangGraph 的 `ParentGraph`）实现。例如“数据分析”Skill 在生成报告后，调用“数据导出”Skill 输出 CSV。② **事件驱动**：Skill A 完成后发布事件（如 `data_analysis_complete`），Agent 的事件总线匹配到 Skill B 订阅了该事件，自动触发。坑点：嵌套调用容易导致循环依赖（如 A 调 B，B 又调 A），需要在注册时做 DAG 检测（拓扑排序）。推荐用事件驱动模式，解耦性更好，但需要额外的事件管理组件（如 Redis Pub/Sub）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 把 Skill 等同于 Function Calling，说“Skill 就是 LLM 调用的函数”。→ ✅ 正确切入：Function Calling 是 Tool 的调用方式，Skill 是更高层的编排单元，包含多个 Tool 调用和 LLM 推理步骤。例如“发送邮件”Skill 包含查找联系人（Tool）、生成内容（LLM）、调用 API（Tool）三步。
- ❌ 只讲概念，不提工程实现，说“Skill 就是模块化设计”。→ ✅ 正确切入：必须给出具体实现细节，比如在 LangGraph 中用 `StateGraph` 定义步骤，用 `add_conditional_edges` 处理分支，用 `timeout` 参数设置超时。
- ❌ 忽略触发条件，只说“Skill 由 LLM 自动选择”。→ ✅ 正确切入：触发条件需要显式定义，包括关键词匹配、embedding 相似度、LLM 分类器，并设置阈值和确认机制，否则会导致误激活。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“RAG 流程本身就是一个 Skill”切入，展示你如何将检索、重排序、生成封装成可复用的模块，并处理了查询改写和结果过滤的边界情况。
- **如果你只做过传统 NLP**：用“意图识别 + 槽位填充”类比 Skill 的触发条件和执行步骤，展示你理解“规则引擎”到“LLM 驱动”的演进，并强调 Skill 的确定性优于纯 LLM 推理。
- **如果你是校招无项目**：聚焦 LangGraph 官方文档中的“Customer Support”示例，复述其中“订单查询”Skill 的实现（包含查询订单、检查物流、生成回复三步），并指出如果增加“退款”分支会如何设计。
- LangGraph 官方文档：Subgraph 与 State management 章节
- AutoGPT 源码：`skills` 目录下的 `execute_skill.py` 实现
- 论文：”Toolformer: Language Models Can Teach Themselves to Use Tools” (2023) —— 理解 Tool 与 Skill 的底层关系
- 博客：”Building Modular AI Agents with LangGraph” by LangChain 团队
- 工具：CrewAI 的 `@skill` 装饰器源码，理解注册机制

---
