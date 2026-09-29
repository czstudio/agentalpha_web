---
slug: multiagent-tk138
no: "1038"
title: "CrewAI 的 「Crew → Agent → Task「 三层模型如何工作？和 LangGraph 的图模型有什么区别"
question: "CrewAI 的 「Crew → Agent → Task「 三层模型如何工作？和 LangGraph 的图模型有什么区别"
excerpt: "面试官想看你能否对比不同框架的抽象模型，而非只会用其中一个。刁钻点在于：CrewAI 的三层模型和 LangGraph 的图模型代表了两种截然不同的设计哲学——"声明式角色分工" vs "命令式状态机"。很多人只答"Cr"
tags: ["真题解析", "多智能体"]
category: "multiagent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 11
words: 5216
updated: "2026-09-29"
---

## CrewAI 的 「Crew → Agent → Task「 三层模型如何工作？和 LangGraph 的图模型有什么区别

#### 1️⃣ 考察意图

面试官想看你能否对比不同框架的抽象模型，而非只会用其中一个。刁钻点在于：CrewAI 的三层模型和 LangGraph 的图模型代表了两种截然不同的设计哲学——"声明式角色分工" vs "命令式状态机"。很多人只答"CrewAI 简单，LangGraph 灵活"，但说不清在什么复杂度下该切换。答好了能展示你的架构设计判断力。

#### 2️⃣ 标准答

**CrewAI 和 LangGraph 代表了 Multi-Agent 编排的两种范式：声明式 vs 命令式。**

**1. CrewAI 三层模型**

- **Crew（团队）**：最高层容器，定义 Agent 集合、Task 列表、Process 类型（Sequential/Hierarchical）。Crew 负责按 Process 策略调度 Task 的执行顺序
- **Agent（成员）**：每个 Agent 有 `role`（角色名）、`goal`（目标）、`backstory`（背景故事）、`tools`（可用工具）。Backstory 是 CrewAI 的核心创新——通过角色扮演约束 LLM 的行为风格
- **Task（任务）**：定义 `description`（任务描述）、`expected_output`（预期输出格式）、`agent`（分配给哪个 Agent）。Task 可以设置 `context`（依赖其他 Task 的输出）和 `async_execution`（异步执行）

**Sequential Process 示例**：

`researcher = Agent(role="研究员", goal="收集信息", backstory="...")**writer = Agent(role="撰稿人", goal="写报告", backstory="...")

task1 = Task(description="研究AI安全", agent=researcher, expected_output="研究笔记")
task2 = Task(description="写报告", agent=writer, expected_output="Markdown报告", context=[task1])

crew = Crew(agents=[researcher, writer], tasks=[task1, task2], process=Process.sequential)
result = crew.kickoff()`Hierarchical Process**：CrewAI 自动创建一个 Manager Agent，Manager 根据任务描述决定分配给哪个 Agent，支持动态任务分配。

**2. LangGraph 图模型**

- **StateGraph**：定义状态 schema（TypedDict），每个节点接收和返回该状态
- **Node（节点）**：每个节点是一个函数/Runnable，接收 state 返回更新后的 state
- **Edge（边）**：普通边（A→B）和条件边（根据 state 值决定走 B 还是 C）
- **核心差异**：LangGraph 显式控制每一步的流转，支持循环、分支、并行、中断

**LangGraph 示例**：

`class State(TypedDict):**    messages: list
    research: str
    draft: str

def research_node(state):
    # 调用研究 Agent
    return {"research": result}

def write_node(state):
    # 用 state["research"] 写报告
    return {"draft": result}

def should_continue(state):
    if len(state["draft"]) < 100:
        return "rewrite"
    return "end"

graph = StateGraph(State)
graph.add_node("research", research_node)
graph.add_node("write", write_node)
graph.add_node("rewrite", rewrite_node)
graph.add_edge("research", "write")
graph.add_conditional_edges("write", should_continue)
graph.add_edge("rewrite", "write")
app = graph.compile()`3. 两种模型的对比**

| 维度 | CrewAI 三层模型 | LangGraph 图模型 |
|---|---|---|
| 抽象层级 | 高（声明式：定义角色和任务） | 低（命令式：定义节点和边） |
| 控制流 | 固定（Sequential/Hierarchical） | 任意（DAG + 循环 + 条件） |
| 状态管理 | 隐式（Task 的 context 依赖） | 显式（StateGraph schema） |
| 并行支持 | 弱（async_execution 但无依赖管理） | 强（`Send` API 支持 fan-out） |
| 人工审批 | 无原生支持 | `interrupt_before` 原生支持 |
| 调试 | 黑盒（只能看最终输出） | 白盒（每步 state 可检查） |
| 学习曲线 | 低（10 分钟上手） | 高（需理解状态机） |
| 适合复杂度 | 低-中（2-5 Agent，线性流程） | 中-高（5+ Agent，复杂流程） |

**4. 什么时候该切换？**

- **用 CrewAI**：角色分工明确、流程线性、快速原型。如"PM→设计师→工程师"的瀑布流
- **切换到 LangGraph**：(1) 需要循环（如"写→审→改→再审"）；(2) 需要条件分支（如"如果代码有 bug 则走修复流程，否则走测试流程"）；(3) 需要 Human-in-the-Loop；(4) 需要状态持久化和恢复
- **经验法则**：如果 CrewAI 的 Sequential Process 无法表达你的流程（需要 if/else/loop），就该切换到 LangGraph

#### 3️⃣ 答题模板（30 秒电梯版）

> "CrewAI 是声明式三层模型——Crew 定义团队，Agent 定义角色（role+goal+backstory），Task 定义任务。流程固定（Sequential/Hierarchical），适合角色明确的线性场景。LangGraph 是命令式图模型——StateGraph 定义状态 schema，Node 是状态转换函数，Edge 支持条件路由和循环。核心区别：CrewAI 隐式管理状态，控制流固定；LangGraph 显式管理状态，控制流任意。切换信号：需要循环/条件/人工审批时从 CrewAI 切换到 LangGraph。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：CrewAI 的 Hierarchical Process 中的 Manager Agent 是怎么做任务分配的？

> Manager Agent 用 LLM 做任务分配：将所有 Agent 的 role/goal/backstory 和当前 Task description 传给 LLM，让 LLM 输出"分配给哪个 Agent"。和 AutoGen GroupChat 的 auto 策略类似，但区别是：(1) Manager 只负责分配不参与执行，GroupChat 的所有 Agent 都可以参与对话；(2) Manager 可以拆分任务——如果 Task 太复杂，Manager 可以拆成多个子 Task 分配给不同 Agent。坑：Manager 的分配质量依赖 LLM 能力，GPT-4 的分配准确率约 85%，GPT-3.5 约 65%。建议用强模型做 Manager。

**追问 2**：CrewAI 的 async_execution 能实现真正的并行吗？

> 不能。CrewAI 的 `async_execution=True` 只表示"这个 Task 不需要等待上一个 Task 完成就可以开始"，但实际执行还是单线程的——CrewAI 内部用 Python 的 asyncio 做协程切换，而非多线程/多进程。真正的并行需要：(1) 每个 Agent 运行在独立进程中（用 multiprocessing）；(2) 或用 LangGraph 的 `Send` API 做 fan-out——一个节点同时向多个节点发送消息，这些节点并行执行。CrewAI 在 roadmap 中计划支持真正的并行，但目前（2025年初）还是顺序执行。

**追问 3**：LangGraph 的状态 schema 用 TypedDict，类型安全怎么保证？

> TypedDict 只在静态检查时（mypy/pyright）有效，运行时不强制。生产环境的类型安全方案：(1) Pydantic Model——用 `BaseModel` 替代 TypedDict，运行时自动校验类型和约束；(2) LangGraph 的 `Channel` API——定义状态的读写接口，支持自定义 reducer（如 list 的 append reducer）；(3) 单元测试——对每个节点的输入/输出做断言。推荐：简单项目用 TypedDict + mypy，复杂项目用 Pydantic + Channel。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "CrewAI 太简单了，生产环境不能用" → ✅ "CrewAI 适合 2-5 Agent 的线性流程，10 分钟上手，开发效率高。生产环境的关键是'匹配复杂度'——简单场景用 CrewAI，复杂场景用 LangGraph。用 LangGraph 做简单任务反而增加开发成本。"
- ❌ "LangGraph 什么都能做，不需要 CrewAI" → ✅ "LangGraph 的灵活性带来的是复杂性——定义 StateGraph + Node + Edge 需要更多代码和设计。CrewAI 的声明式模型在简单场景下效率高 3-5 倍。框架选择是工程取舍，不是'越灵活越好'。"
- ❌ "CrewAI 的 Backstory 只是 prompt trick，没什么技术含量" → ✅ "Backstory 是行为约束的有效手段——研究表明角色扮演能明显提升 LLM 的任务专注度（+30%）和输出质量（+15%）。CrewAI 把它产品化为框架级特性，降低了 prompt engineering 门槛。"

#### 6️⃣ 简历呼应

- **如果你有 Multi-Agent 项目**：从"框架选型对比"切入，描述你在项目中用 CrewAI 做原型、LangGraph 做生产化的过程，给出选型理由和迁移成本
- **如果你只做过单 Agent**：用"从单 Agent 到多 Agent 的编排需求"切入，说明你理解多 Agent 编排的核心挑战（任务分配、状态管理、错误恢复）
- **如果你是校招无项目**：用同一个任务（如"写技术博客"）分别用 CrewAI 和 LangGraph 实现，对比开发时间、代码量、灵活性，写一篇对比博客
- "CrewAI: Framework for Orchestrating Role-Playing AI Agents" (CrewAI, 2024)
- "LangGraph: Building Stateful Multi-Actor Applications" (LangChain, 2024)
- "Multi-Agent System Design Patterns" (Ji et al., 2024)

---
