---
slug: agent-tk279
no: "1179"
title: "Workflow vs Agent 的核心区别？什么是「用 Workflow 约束 Agent「"
question: "Workflow vs Agent 的核心区别？什么是「用 Workflow 约束 Agent「"
excerpt: "面试官想看你是否真正理解 Agent 和 Workflow 的本质差异，而非停留在“Agent 智能，Workflow 死板”的表面。这是一道系统设计取舍题，刁钻点在于：很多人会背 Andrew Ng 的 Agentic"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4442
updated: "2026-09-29"
---

## Workflow vs Agent 的核心区别？什么是「用 Workflow 约束 Agent「

`P1` · `agent_architecture`

🏷 标签：`workflow`, `agent`, `comparison`, `constraint`

#### 1️⃣ 考察意图

面试官想看你是否真正理解 Agent 和 Workflow 的本质差异，而非停留在“Agent 智能，Workflow 死板”的表面。这是一道**系统设计取舍题**，刁钻点在于：很多人会背 Andrew Ng 的 Agentic Design Patterns，但说不清何时该用 Workflow、何时该用 Agent，以及“用 Workflow 约束 Agent”具体怎么落地。答好了能展示你对生产级 Agent 系统的工程把控力——知道如何用确定性流程兜底 Agent 的不确定性，避免“Agent 乱飞”的坑。

#### 2️⃣ 标准答

**核心区别：控制流 vs 决策流**

- **Workflow**：预定义的、确定性的控制流。每一步做什么、顺序、条件分支、循环，都在代码里写死。典型例子：LangChain 的 `Chain`、Prefect 的 `Flow`、Airflow 的 DAG。输入输出类型和格式在编译期就确定。
- **Agent**：由 LLM 驱动的决策流。每一步做什么（调用工具、生成回复、继续思考）由模型根据当前状态实时决定。典型例子：AutoGPT、ReAct 模式、OpenAI Function Calling。Agent 的核心是**循环**——LLM 输出 → 执行工具 → 结果反馈 → LLM 再决策。

**关键 trade-off**：Workflow 可预测、可调试、延迟可控，但灵活性差；Agent 灵活、能处理未知场景，但不可预测、可能陷入死循环、成本爆炸。生产环境里，**纯 Workflow 太死，纯 Agent 太野**。

**什么是“用 Workflow 约束 Agent”？**

这是生产级 Agent 系统的核心设计模式——用确定性流程给 Agent 画“安全围栏”。具体做法分三层：

1. **外层 Workflow 编排**：Agent 不是裸奔的，而是被一个 Workflow 包裹。例如：先 Workflow 做意图分类（用分类模型或规则），判断是“查询”还是“操作”，然后分别路由到不同的 Agent 子流程。子流程结束后，Workflow 检查输出格式，再决定是否重试或降级。
2. **中间层约束**：在 Agent 内部，用 Workflow 限制 LLM 的决策空间。例如： - **工具白名单**：Agent 只能调用 Workflow 注册的 5 个工具，不能动态生成新工具。 - **步骤上限**：Agent 最多执行 10 步，超时则 Workflow 强制终止并返回“抱歉，无法完成”。 - **输出 Schema**：Agent 的输出必须符合 JSON Schema，Workflow 做校验，不符合就重试或报错。
3. **内层兜底**：当 Agent 决策失败（如连续 3 次调用工具返回空结果），Workflow 触发降级策略——比如回退到基于规则的问答，或返回预设的“无法处理”模板。

**实际落地的坑 + 解法**：

- **坑**：Agent 在复杂任务中容易“绕圈”——反复调用同一个工具，浪费 token 和时间。**解法**：在 Workflow 层加“去重缓存”。记录 Agent 已经调用过的工具和参数组合，如果重复调用且上次结果为空，直接返回缓存结果，不让 LLM 再试。
坑：Agent 输出格式不稳定，即使给了 JSON Schema，LLM 也可能输出非法 JSON。
- **解法**：Workflow 层做“格式修复”。用 `json.loads()` 失败后，尝试用正则提取 JSON 片段，或者用 `pydantic` 做类型校验并自动补全缺失字段。如果还不行，Workflow 触发重试，但限制最多 2 次，避免无限循环。
坑：Agent 在长对话中“遗忘”上下文。
- **解法**：Workflow 层做“显式记忆管理”。每次 Agent 决策前，Workflow 从外部存储（如 Redis）加载关键上下文摘要，注入到 prompt 中，而不是让 LLM 自己维护。这本质上是 Workflow 接管了记忆的读写控制权。

**总结**：Workflow 是骨架，Agent 是血肉。用 Workflow 约束 Agent，就是用确定性流程兜底不确定性决策，实现“可控的智能”。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，核心区别是控制流 vs 决策流——Workflow 预定义每一步，Agent 由 LLM 实时决策。第二，‘用 Workflow 约束 Agent’是生产级设计模式，分三层：外层 Workflow 做编排和路由，中间层限制工具白名单和步骤上限，内层做降级兜底。第三，关键坑包括 Agent 绕圈、输出格式不稳定、记忆丢失，解法分别是去重缓存、格式修复和显式记忆管理。总结一句：Workflow 给 Agent 画安全围栏，让智能可控。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：那你怎么设计一个“Agent + Workflow”混合系统？给个具体例子。

> 以客服系统为例：外层 Workflow 先做意图分类（用 BERT 分类器，不是 LLM，因为延迟低），分到“订单查询”“退换货”“投诉”等。每个意图对应一个 Agent 子流程，Agent 只能调用该意图绑定的工具（如订单 Agent 只能查订单 API、退换货 Agent 只能调用售后接口）。Agent 内部设步骤上限 5 步，超时则 Workflow 触发降级——返回“转人工”按钮。关键取舍：意图分类用 BERT 而非 LLM，因为延迟从 2 秒降到 50 毫秒，且分类准确率 95% 够用；Agent 用 GPT-4o，但只在需要复杂推理时调用，简单查询直接走规则。

**追问 2**：Agent 的“决策流”会不会导致不可复现？怎么保证可调试？

> 会。解决方案是 Workflow 层做“全量日志 + 快照”。每次 Agent 决策前，Workflow 记录当前状态（对话历史、工具调用结果、LLM 输出）到结构化日志（如 JSON Lines）。如果出问题，可以回放日志，逐帧检查 LLM 的决策逻辑。另外，可以在 Workflow 层加“确定性种子”——如果 LLM 支持（如 GPT-4o 的 `seed` 参数），固定 seed 让相同输入产生相同输出，方便复现。但注意：seed 只保证相同 prompt 下输出一致，如果 Agent 决策改变了上下文，后续输出仍会不同。

**追问 3**：如果 Agent 需要动态创建新工具（比如根据用户需求生成 SQL 查询），Workflow 怎么约束？

> 这种情况，Workflow 不能完全限制工具白名单，但可以做“沙箱化约束”。例如：Agent 可以动态生成 SQL，但 Workflow 在中间层拦截，用 SQL 解析器检查生成的 SQL 是否只包含 SELECT 语句，禁止 INSERT/UPDATE/DELETE/DROP。同时，Workflow 限制 SQL 查询的超时时间（如 5 秒）和返回行数（如 100 行）。如果 Agent 生成的 SQL 违反规则，Workflow 直接拒绝并让 Agent 重新生成。这本质上是 Workflow 从“工具白名单”升级为“工具行为白名单”。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Agent 就是 Workflow 的一种，只是更智能” → ✅ 正确区分：Workflow 是确定性控制流，Agent 是 LLM 驱动的决策流，两者是正交概念，不是包含关系。
- ❌ 说“用 Workflow 约束 Agent 就是给 Agent 加 prompt 限制” → ✅ 正确理解：约束是系统架构层面的，包括外层编排、中间层工具/步骤限制、内层降级，prompt 只是其中一环，且最不可靠。
- ❌ 说“纯 Agent 更好，Workflow 过时了” → ✅ 正确观点：生产环境必须混合，纯 Agent 不可控、成本高、延迟大，Workflow 是兜底和优化的关键。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“RAG 流程本身就是 Workflow”切入——检索是确定性的（BM25/向量检索），生成是 Agent 决策（选哪个文档、怎么组织回答）。用 Workflow 约束 Agent 就是给 RAG 加“检索结果校验”和“生成格式控制”。
- **如果你只做过传统 NLP**：用“规则系统 vs 统计模型”类比——Workflow 像规则系统（确定、可调试），Agent 像统计模型（灵活、不可控）。用 Workflow 约束 Agent 就像用规则后处理来兜底模型输出。
- **如果你是校招无项目**：聚焦 Andrew Ng 的 Agentic Design Patterns 论文，复现一个“ReAct + Workflow 约束”的 demo（如天气查询 Agent，Workflow 限制只能调用天气 API，步骤上限 3 步）。面试时重点讲设计取舍。

#### 7️⃣ 延伸阅读

- Andrew Ng, “Agentic Design Patterns” (2024) - 定义了 Agent 的四种模式：Reflection、Tool Use、Planning、Multi-agent
- LangChain 官方文档: “How to add workflow constraints to agents” - 具体代码实现
- Prefect 文档: “Workflow orchestration for LLM applications” - 生产级 Workflow 设计
- “ReAct: Synergizing Reasoning and Acting in Language Models” (2022) - Agent 决策流的理论基础
- “Toolformer: Language Models Can Teach Themselves to Use Tools” (2023) - Agent 工具调用的早期工作

---
