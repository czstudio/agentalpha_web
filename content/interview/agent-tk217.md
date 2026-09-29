---
slug: agent-tk217
no: "1117"
title: "Workflow 和 Agent 的边界在哪里"
question: "Workflow 和 Agent 的边界在哪里"
excerpt: "面试官想考察你对 Agent 架构本质的理解深度，而非单纯背概念。这是典型的“系统设计+工程取舍”题，刁钻点在于：Workflow 和 Agent 并非非黑即白，边界模糊处（如 ReAct 模式）才是真正考验。答好了能展"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3846
updated: "2026-09-29"
---

## 3 Workflow 和 Agent 的边界在哪里

`P1` · `agent_architecture`

🏷 标签：`agent`, `workflow`, `architecture`, `decision-making`

#### 1️⃣ 考察意图

面试官想考察你对 Agent 架构本质的理解深度，而非单纯背概念。这是典型的“系统设计+工程取舍”题，刁钻点在于：Workflow 和 Agent 并非非黑即白，边界模糊处（如 ReAct 模式）才是真正考验。答好了能展示你从“调 API 的工程师”到“能设计可扩展 AI 系统的架构师”的硬实力——包括对控制流、状态管理、工具调用时机的权衡，以及在实际业务中如何根据任务确定性选择方案。

#### 2️⃣ 标准答

**核心定义：控制流 vs 自主性**

- **Workflow**：预定义的步骤序列，控制流是静态的、确定的。比如一个客服退货流程：用户输入订单号 → 校验 → 生成退货标签 → 通知物流。每一步的输入输出和顺序都硬编码在 DAG 或状态机中。
- **Agent**：自主决策的循环，控制流是动态的、由 LLM 驱动的。核心是“观察-思考-行动”循环（ReAct 模式），每一步由 LLM 决定调用哪个工具、生成什么回复，直到任务完成或达到终止条件。

**关键区别：三个维度**

1. **控制流**：Workflow 是 if-else 或状态机（如 LangGraph 的 `StateGraph`），Agent 是 LLM 驱动的循环（如 OpenAI 的 `function calling` + `while` 循环）。
2. **状态管理**：Workflow 的状态是显式的、结构化的（如 JSON 字段），每一步更新明确；Agent 的状态是隐式的、存储在 LLM 的对话历史中（context window），可能包含多轮推理痕迹。
3. **工具调用时机**：Workflow 的工具调用是预编排的（如第 3 步调用数据库，第 5 步调用邮件 API）；Agent 的工具调用是动态决策的（LLM 决定何时调用搜索、计算器或数据库）。

**边界模糊场景：ReAct 模式中的嵌套**

- 最典型的模糊地带：Agent 内部可以嵌套 Workflow。例如，一个客服 Agent 处理复杂投诉时，它自主决定“需要查订单历史”，然后调用一个预定义的 Workflow（查订单 → 查物流 → 查退款状态）作为子任务。这个 Workflow 是确定的，但被 Agent 动态触发。
- 工程取舍：这种嵌套设计能平衡灵活性和可靠性。Agent 负责高层的决策（“该做什么”），Workflow 负责底层的执行（“怎么做”），避免 LLM 在确定性步骤上犯错（如查数据库的 SQL 语法）。

**实际落地的坑 + 解法**

- **坑**：在纯 Agent 系统中，LLM 可能陷入无限循环（如反复调用搜索工具而不生成最终答案），导致 token 成本爆炸。
- **解法**：引入“最大步数限制”（如 max_iterations=10）和“终止条件检测”（如 LLM 输出包含 `FINAL_ANSWER` 标记）。更鲁棒的做法是混合架构：用 Workflow 处理确定性子任务（如数据验证），用 Agent 处理开放探索（如多轮协商），并在 Agent 循环中嵌入 Workflow 作为“安全网”。

**工程取舍总结**

- **Workflow 适合**：确定性任务（如表单填写、数据 ETL）、高可靠性要求（如金融交易）、低延迟场景（预编排可优化）。
- **Agent 适合**：开放探索（如创意写作、复杂推理）、多轮交互（如客服投诉）、任务边界模糊（如“帮我规划旅行”）。
- **混合架构**：80% 的常见场景用 Workflow 快速处理，20% 的边缘/复杂场景降级到 Agent。例如，电商客服中，退货流程（固定步骤）用 Workflow，投诉（需协商）用 Agent。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从控制流、状态管理和工具调用时机三个层面回答。Workflow 是静态的、预定义的步骤序列，适合确定性任务；Agent 是动态的、LLM 驱动的自主循环，适合开放探索。边界模糊在 ReAct 模式中，Agent 可以嵌套 Workflow 作为子任务。总结一句：选择取决于任务确定性——高确定性用 Workflow，低确定性用 Agent，实际系统往往是混合架构。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 Agent 嵌套 Workflow，那怎么保证嵌套的 Workflow 不会破坏 Agent 的自主性？

> 核心是“职责分离”：Agent 只决定“调用哪个 Workflow”，不干预 Workflow 内部执行。实现上，Workflow 封装成工具（tool），Agent 通过 function calling 调用它，Workflow 返回结构化结果（如 JSON），Agent 再基于结果继续推理。这样 Agent 保持自主决策，Workflow 保证确定性。例如，LangChain 的 `Tool` 类可以包装一个 `StateGraph` 作为子图。

**追问 2**：在延迟敏感场景（如实时客服），Agent 的 LLM 调用太慢，怎么优化？

> 两种策略：1）预判降级：对高频场景（如查订单状态）用 Workflow 直接响应，避免 LLM 调用；2）缓存 Agent 的中间推理结果：对相似问题复用之前的思考链（如使用 `semantic cache` 匹配意图）。更激进的做法是“Agent 预热”：在用户输入前，用历史数据预生成 Agent 的初始推理，减少首 token 延迟。实际案例中，某电商客服系统将 70% 的请求用 Workflow 处理，Agent 只处理剩余 30%，平均响应时间从 3s 降到 0.5s。

**追问 3**：如果任务边界模糊，怎么在运行时动态判断用 Workflow 还是 Agent？

> 用“意图分类器”做路由：一个轻量级模型（如 BERT 或 GPT-3.5-turbo 的 few-shot 分类）判断用户意图的确定性。如果确定性高（如“退货”），路由到 Workflow；如果低（如“投诉”），路由到 Agent。这个分类器本身可以是一个小 Agent（用 LLM 做分类），但注意成本。工程取舍：分类器精度不够会导致误路由，所以需要 fallback 机制——Workflow 失败时自动降级到 Agent，Agent 超时或循环时回退到 Workflow 兜底。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Agent 就是 Workflow 的升级版，Agent 能替代 Workflow” → ✅ 正确切入：两者是互补关系，Agent 适合开放探索，Workflow 适合确定性任务，混合架构才是工程最优解。
- ❌ 说“边界就是看有没有 LLM 调用，有 LLM 就是 Agent” → ✅ 正确切入：LLM 只是工具，Workflow 也可以调用 LLM（如用 LLM 做分类节点），关键区别是控制流是否由 LLM 动态决定。
- ❌ 说“ReAct 模式就是 Agent，没有 Workflow 成分” → ✅ 正确切入：ReAct 模式中，Agent 的每一步（如调用搜索工具）本身可以是一个 Workflow（如搜索→解析→总结），边界是模糊的，需要具体分析。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“RAG 的检索-生成流程是 Workflow，但查询重写和结果排序可以用 Agent 动态决策”切入，展示你如何用混合架构优化 RAG 的准确率和延迟。
- **如果你只做过传统 NLP**：用“流水线（Pipeline）类比 Workflow，用对话系统类比 Agent”迁移，强调控制流从静态到动态的演进，以及如何在现有系统中逐步引入 Agent 能力。
- **如果你是校招无项目**：聚焦论文复现，如“ReAct 论文中 Agent 的循环结构，以及如何用 LangGraph 实现 Workflow 嵌套”，展示你对前沿架构的理解和动手能力。

#### 7️⃣ 延伸阅读

- ReAct: Synergizing Reasoning and Acting in Language Models (Yao et al., 2022)
- LangGraph 官方文档：StateGraph 与 Agent 的嵌套设计
- Building Agentic RAG with LlamaIndex (Jerry Liu, 2024)
- The Rise of Agentic Workflows (Andrew Ng, 2024)
- Toolformer: Language Models Can Teach Themselves to Use Tools (Schick et al., 2023)

---
