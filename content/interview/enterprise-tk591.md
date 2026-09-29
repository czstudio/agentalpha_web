---
slug: enterprise-tk591
no: "1491"
title: "是否把复用能力沉淀为 Skill/命令，而非临时对话"
question: "是否把复用能力沉淀为 Skill/命令，而非临时对话"
excerpt: "这道题考察的是 Agent 工程中的模块化与复用设计，属于系统设计+工程取舍类型。面试官想看你是否理解：为什么不能把 Agent 能力都写成临时对话（即每次在 prompt 里手写指令），而应沉淀为 Skill/命令。刁"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3618
updated: "2026-09-29"
---

## 是否把复用能力沉淀为 Skill/命令，而非临时对话

#### 1️⃣ 考察意图

这道题考察的是 Agent 工程中的**模块化与复用设计**，属于系统设计+工程取舍类型。面试官想看你是否理解：为什么不能把 Agent 能力都写成临时对话（即每次在 prompt 里手写指令），而应沉淀为 Skill/命令。刁钻点在于：**复用不是银弹**，过度抽象会带来维护成本。答好了能展示你对 Agent 架构的实战经验、对可维护性与扩展性的权衡能力，以及从“能用”到“好用”的工程思维。

#### 2️⃣ 标准答

核心原则：**复用能力应沉淀为 Skill/命令，但需按场景分层设计，避免过度抽象**。

**为什么不能只用临时对话？**

- **不可复用**：每次写 prompt 描述“查订单状态”，不同 Agent 实例或对话轮次都得重写，导致开发效率低。
- **不一致**：不同开发者写的 prompt 风格不同，输出格式不统一，下游解析困难。
- **难维护**：修改逻辑（如订单状态字段变更）需搜索所有相关 prompt 替换，容易遗漏。
- **无版本控制**：临时对话是文本，无法像代码一样做 diff、回滚、单元测试。

**如何沉淀为 Skill/命令？**

- **定义 Skill 接口**：每个 Skill 有明确输入输出 schema（如 JSON Schema），例如 `OrderQuerySkill` 输入 `{order_id: string}`，输出 `{status: string, eta: string}`。使用 Pydantic 或 Zod 做校验。
- **注册到 Agent 技能库**：用函数注册表（如 `skill_registry = {"order_query": OrderQuerySkill}`），Agent 通过意图识别（如 LLM 调用 + 分类器）选择 Skill。
- **支持参数化调用**：Skill 内部可调用外部 API 或数据库，返回结构化结果。例如 `OrderQuerySkill` 调用订单系统 REST API，再格式化输出。
- **动态加载**：用插件机制（如 Python 的 `importlib`）热加载新 Skill，无需重启 Agent 服务。

**实际落地的坑 + 解法**：

- **坑**：过度抽象导致 Skill 粒度太细，比如把“查询订单”拆成“查订单号”“查物流”“查退款”，每个 Skill 只有几行代码，却增加了注册和路由成本。
- **解法**：按**业务原子性**划分，一个 Skill 对应一个完整用户意图（如“查订单”包含状态+物流+退款信息），内部用子函数拆分。参考 LangChain 的 `Tool` 设计：一个 Tool 是一个函数，参数用 `args_schema` 定义，避免碎片化。
- **坑**：Skill 与临时对话混用，导致 Agent 决策混乱。比如用户说“帮我查一下订单，顺便推荐个商品”，Agent 可能同时触发 `OrderQuerySkill` 和 `RecommendSkill`，但输出格式冲突。
- **解法**：设计**优先级路由**：Skill 执行时锁定输出格式，临时对话只处理非结构化回复。用 `skill_priority` 字段（如 0-10），高优先级 Skill 覆盖低优先级输出。

**工程取舍（trade-off）**：

- **复用 vs 灵活性**：Skill 固定了输入输出，复用性强但灵活性差；临时对话可自由发挥但不可复用。建议：**80% 高频能力用 Skill，20% 长尾需求用临时对话**。
- **抽象粒度**：太粗（一个 Skill 做所有事）导致难以扩展；太细（每个字段一个 Skill）增加维护成本。经验值：**一个 Skill 对应一个 API 端点或一个数据库查询**。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，为什么不能只用临时对话——不可复用、不一致、难维护；第二，如何沉淀为 Skill——定义接口、注册技能库、支持参数化调用；第三，实际落地的坑与取舍——避免过度抽象、设计优先级路由。总结一句：高频能力用 Skill 保证复用性，低频需求用临时对话保持灵活性。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果用户需求跨多个 Skill，比如“查订单并推荐相似商品”，你怎么设计？

> 用**技能编排（Skill Orchestration）**：Agent 先通过意图识别拆解为子任务，按依赖关系顺序执行。例如 `OrderQuerySkill` 先返回订单详情，`RecommendSkill` 基于订单商品 ID 调用推荐系统。输出合并时用模板（如 `f"订单状态：{status}，推荐商品：{items}"`）。注意：编排逻辑写在 Agent 的 planner 中，不要硬编码在 Skill 里，保持 Skill 独立。

**追问 2**：Skill 的输入输出 schema 变更了，如何保证兼容性？

> 用**版本化 API 设计**：每个 Skill 有 `version` 字段，Agent 路由时根据版本选择对应处理逻辑。例如 `OrderQuerySkillV1` 输出 `{status: string}`，`V2` 输出 `{status: string, eta: string}`。Agent 的解析器按版本兼容处理：如果下游需要 `eta` 但 V1 没有，则返回默认值。同时，用单元测试覆盖所有版本，确保回滚安全。

**追问 3**：Skill 和临时对话的边界怎么定？比如用户说“随便推荐一个”，这算 Skill 还是临时对话？

> 边界按**可预测性**划分：如果用户意图明确且高频（如“查订单”），用 Skill；如果意图模糊或低频（如“随便推荐”），用临时对话。具体实现：Agent 先尝试匹配 Skill，匹配置信度低于阈值（如 0.7）则 fallback 到临时对话。阈值通过 A/B 测试调整，参考 OpenAI 的 function calling 设计：function 调用失败时，LLM 自动生成自然语言回复。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “所有能力都应该做成 Skill，这样最规范。” → ✅ “过度抽象会增加维护成本，建议 80% 高频能力用 Skill，20% 长尾需求用临时对话，保持灵活性。”
- ❌ “Skill 就是写一个函数，注册到列表里就行。” → ✅ “Skill 需要定义输入输出 schema、版本控制、错误处理、优先级路由，还要考虑编排和兼容性，不是简单注册。”
- ❌ “临时对话完全没用，应该全部替换。” → ✅ “临时对话适合长尾需求或快速原型，比如用户问‘今天天气怎么样’，没必要写一个 WeatherSkill，用 prompt 处理更高效。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“RAG 中的工具调用”切入，对比临时对话（每次写 prompt 查数据库）与 Skill（封装为 `RetrieveSkill`，支持参数化查询）的差异，强调复用减少 prompt 长度和 token 消耗。
- **如果你只做过传统 NLP**：用“意图识别 + 槽位填充”类比，Skill 相当于预定义的意图模板，临时对话相当于自由文本分类。强调 Skill 的 schema 校验类似槽位验证，复用性更强。
- **如果你是校招无项目**：聚焦“论文复现”，比如参考 ReAct 论文中的工具调用设计，实现一个简单的 Skill 注册表 demo（Python 类 + 函数装饰器），展示对模块化设计的理解。
- 《ReAct: Synergizing Reasoning and Acting in Language Models》—— 工具调用与推理结合
- LangChain Tool 设计文档 —— 函数注册、参数 schema、错误处理
- 《Toolformer: Language Models Can Teach Themselves to Use Tools》—— 工具学习的自动化
- OpenAI Function Calling 官方指南 —— 结构化输出与技能路由
- 《Modular RAG: Transforming RAG Systems into Lego-like Frameworks》—— 模块化 Agent 设计

---
