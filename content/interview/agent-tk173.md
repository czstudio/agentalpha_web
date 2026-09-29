---
slug: agent-tk173
no: "1073"
title: "Agent 的「状态机「模式应该如何设计"
question: "Agent 的「状态机「模式应该如何设计"
excerpt: "面试官想看你能否用有限状态机（FSM）建模 Agent 的行为流程。刁钻点在于：Agent 的状态不是简单的"空闲/运行中/完成"——它涉及多步推理、工具调用、错误恢复、人工审批等复杂状态转换。如何设计状态、转换条件、嵌"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 13
words: 6277
updated: "2026-09-29"
---

## Agent 的「状态机「模式应该如何设计

#### 1️⃣ 考察意图

面试官想看你能否用有限状态机（FSM）建模 Agent 的行为流程。刁钻点在于：Agent 的状态不是简单的"空闲/运行中/完成"——它涉及多步推理、工具调用、错误恢复、人工审批等复杂状态转换。如何设计状态、转换条件、嵌套状态是关键。答好了能展示你的系统建模能力和对 Agent 行为可控性的理解。

#### 2️⃣ 标准答

**1. Agent 状态机设计**

`                    ┌─────────┐**                    │  IDLE   │ ← 等待用户输入
                    └────┬────┘
                         │ 收到请求
                         ▼
                    ┌─────────┐
                    │ PLANNING│ ← LLM 生成执行计划
                    └────┬────┘
                         │ 计划完成
                         ▼
                    ┌─────────┐
              ┌────→│EXECUTING│ ← 执行当前步骤
              │     └────┬────┘
              │          │ 步骤完成
              │          ▼
              │     ┌─────────┐
              │     │OBSERVING│ ← 检查执行结果
              │     └────┬────┘
              │          │
              │     ┌────┴────┐
              │     │         │
              │     ▼         ▼
              │ ┌──────┐ ┌──────┐
              │ │REPLAN│ │ DONE │
              │ └──┬───┘ └──────┘
              │    │ 需要重新规划
              └────┘

              另外有错误/安全状态：
              ┌─────────┐  ┌─────────┐  ┌─────────┐
              │  ERROR  │  │ BLOCKED │  │ HUMAN   │
              │ (重试)  │  │ (安全)  │  │ REVIEW  │
              └─────────┘  └─────────┘  └─────────┘`2. 状态定义**

| 状态 | 说明 | 入口条件 | 退出条件 |
|---|---|---|---|
| IDLE | 等待用户输入 | 初始状态 / 任务完成 | 收到用户请求 |
| PLANNING | LLM 生成执行计划 | 收到新请求 / 需要重规划 | 计划生成完成 |
| EXECUTING | 执行当前步骤（调用工具/LLM） | 计划就绪 / 重规划完成 | 步骤执行完成 |
| OBSERVING | 检查执行结果，决定下一步 | 步骤执行完成 | 结果正常→CONTINUE / 结果异常→ERROR / 需调整→REPLAN / 任务完成→DONE |
| REPLAN | 重新规划剩余步骤 | OBSERVING 判定需要调整 | 新计划生成完成→EXECUTING |
| ERROR | 处理错误（重试/降级/转人工） | 执行失败 | 重试成功→EXECUTING / 重试耗尽→HUMAN |
| BLOCKED | 安全拦截，停止执行 | 安全检查未通过 | 人工审核→HUMAN / 永久拒绝→IDLE |
| HUMAN_REVIEW | 等待人工审批 | 高风险操作 / 错误重试耗尽 | 人工批准→EXECUTING / 人工拒绝→IDLE |
| DONE | 任务完成，返回结果 | 所有步骤完成 | → IDLE |

**3. 工程化实现（LangGraph）**

`from langgraph.graph import StateGraph, END**from typing import TypedDict, Annotated
import operator

class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    plan: list
    current_step: int
    tool_results: dict
    error_count: int
    status: str

def planning_node(state):
    plan = llm_plan(state["messages"])
    return {"plan": plan, "current_step": 0, "status": "executing"}

def executing_node(state):
    step = state["plan"][state["current_step"]]
    result = execute_step(step)
    return {"tool_results": {step["id"]: result}}

def observing_node(state):
    result = state["tool_results"][state["plan"][state["current_step"]]["id"]]
    if is_success(result):
        if state["current_step"] + 1 >= len(state["plan"]):
            return {"status": "done"}
        return {"current_step": state["current_step"] + 1, "status": "executing"}
    else:
        return {"error_count": state["error_count"] + 1, "status": "error"}

def error_node(state):
    if state["error_count"] < 3:
        return {"status": "executing"}  # 重试
    return {"status": "human_review"}  # 转人工

# 构建状态图
graph = StateGraph(AgentState)
graph.add_node("planning", planning_node)
graph.add_node("executing", executing_node)
graph.add_node("observing", observing_node)
graph.add_node("error", error_node)
graph.add_node("human_review", lambda s: s)  # 等待人工

graph.set_entry_point("planning")
graph.add_edge("planning", "executing")
graph.add_conditional_edges("observing", lambda s: s["status"], {
    "executing": "executing",
    "done": END,
    "error": "error",
    "replan": "planning"
})
graph.add_conditional_edges("error", lambda s: s["status"], {
    "executing": "executing",
    "human_review": "human_review"
})
graph.add_edge("human_review", "executing")  # 人工批准后继续执行

app = graph.compile()`4. 嵌套状态机**

复杂 Agent 可以用嵌套状态机——外层状态机管理"任务级"状态（规划→执行→完成），内层状态机管理"步骤级"状态（如工具调用内部的"参数构建→API调用→结果解析→错误重试"）。LangGraph 支持子图（subgraph）实现嵌套。

#### 3️⃣ 答题模板（30 秒电梯版）

> "Agent 状态机9个状态：IDLE→PLANNING→EXECUTING→OBSERVING→(CONTINUE/REPLAN/ERROR/DONE)。错误处理：ERROR状态重试3次后转HUMAN_REVIEW。安全拦截：BLOCKED状态停止执行。实现用LangGraph StateGraph——节点=状态处理函数，边=状态转换，条件边根据state['status']路由。嵌套：外层任务级状态机+内层步骤级状态机（LangGraph subgraph）。优势：状态显式可控、转换条件清晰、支持断点恢复和人工审批。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：状态机和 ReAct 的"Think-Act-Observe"循环有什么关系？

> ReAct 循环本质是一个简化版状态机——Think=PLANNING+EXECUTING，Act=EXECUTING，Observe=OBSERVING。状态机是对 ReAct 的"显式化"——把隐式的状态转换变成显式的图结构。好处：(1) 可以添加 ReAct 没有的状态（如 ERROR、HUMAN_REVIEW、BLOCKED）；(2) 可以控制状态转换条件（如"重试不超过3次"、"高危操作必须人工审批"）；(3) 支持断点恢复——状态持久化后可以从任意状态恢复执行。ReAct 是"隐式状态机"（状态在 LLM 的 prompt 中隐含），StateGraph 是"显式状态机"（状态在代码中显式定义）。生产环境推荐显式状态机。

**追问 2**：状态持久化怎么做？Agent 执行到一半服务重启了怎么办？

> 状态持久化方案：(1) **LangGraph 的 checkpointer**——每个节点执行后自动保存 state 到 SQLite/PostgreSQL。服务重启时从最后一个 checkpoint 恢复；(2) **状态序列化**——AgentState 用 JSON 序列化存储，包含 messages、plan、current_step、tool_results 等完整信息。反序列化后可以从任意状态恢复；(3) **幂等执行**——恢复后重新执行当前步骤时，工具调用必须是幂等的（相同参数产生相同结果）。非幂等操作（如发邮件）需要用"已执行标记"跳过。实现：LangGraph 的 `MemorySaver`（内存）或 `SqliteSaver`（持久化），一行代码接入。

**追问 3**：多 Agent 系统中，每个 Agent 有自己的状态机，怎么协调？

> 两层协调：(1) **Orchestrator 状态机**——管理全局流程（分配任务→等待Worker→汇总结果→返回用户）。Orchestrator 的状态包括 `ASSIGNING`、`WAITING`、`AGGREGATING`、`DONE`；(2) **Worker 状态机**——每个 Worker 有自己的 `PLANNING→EXECUTING→OBSERVING` 状态机，独立运行。Worker 完成后通知 Orchestrator；(3) **状态同步**——Orchestrator 通过消息队列（如 Redis Stream）接收 Worker 的状态更新。如果 Worker 进入 ERROR 状态且重试耗尽，Orchestrator 决定是否重新分配给其他 Worker 或转人工。实现：LangGraph 的多 Actor 模式——每个 Worker 是一个子图，Orchestrator 是父图，通过 `send()` API 分配任务。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "Agent 不需要状态机，让 LLM 自己决定下一步就行" → ✅ "LLM 自己决定=隐式状态机，缺乏可控性。显式状态机能添加错误恢复、人工审批、安全拦截等控制逻辑，是生产环境的必需品。"
- ❌ "状态越多越好，覆盖所有场景" → ✅ "状态过多增加复杂度和维护成本。推荐 5-10 个核心状态，边缘场景用'状态+条件变量'处理，而非新增状态。"
- ❌ "状态机一旦定义就不能改" → ✅ "LangGraph 支持动态修改图结构——可以根据任务类型加载不同的状态机。简单任务用精简状态机（3个状态），复杂任务用完整状态机（9个状态）。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 架构项目**：从"状态机设计"切入，描述你用 LangGraph 实现的 9 状态 Agent 状态机，给出数据（如错误恢复率 92%、断点恢复延迟 <500ms）
- **如果你只做过工作流引擎**：用"BPMN 状态机"类比——Agent 状态机和 BPMN 的工作流状态机是相同的概念，核心差异是 Agent 的状态转换由 LLM 决定（概率性）而非规则决定（确定性）
- **如果你是校招无项目**：用 LangGraph 实现 5 状态的 Agent 状态机（PLANNING→EXECUTING→OBSERVING→ERROR→DONE），演示错误恢复和断点恢复
- "LangGraph: Stateful Agent Orchestration" (LangChain, 2024)
- "Finite State Machines for AI Systems" (Suresh et al., 2023)
- "State Machine Design Patterns for Agent Systems" (Ji et al., 2024)

---
