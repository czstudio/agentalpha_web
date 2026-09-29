---
slug: enterprise-tk362
no: "1262"
title: "如何在LangGraph中实现“人工确认”节点"
question: "如何在LangGraph中实现“人工确认”节点"
excerpt: "面试官想看你是否真正理解 LangGraph 的中断与恢复机制，而非只背概念。这是典型的系统设计 + 工程取舍题，刁钻点在于：人工确认不是简单的“加个 if”，而是涉及状态持久化、图执行流控制、外部交互时序。答好了能展示"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4527
updated: "2026-09-29"
---

## 如何在LangGraph中实现“人工确认”节点

#### 1️⃣ 考察意图

面试官想看你是否真正理解 LangGraph 的**中断与恢复机制**，而非只背概念。这是典型的**系统设计 + 工程取舍**题，刁钻点在于：人工确认不是简单的“加个 if”，而是涉及状态持久化、图执行流控制、外部交互时序。答好了能展示你对 Agent 工程中 Human-in-the-Loop 落地的硬实力，包括 Checkpointer 使用、interrupt_before 配置、以及超时/回退等生产级细节。

#### 2️⃣ 标准答

实现人工确认节点，核心是利用 LangGraph 的 `interrupt_before` 和 `Checkpointer` 机制，让图在指定节点前暂停，等待外部输入后恢复。以下是具体步骤和工程细节：

- **定义图结构**：在 StateGraph 中插入一个特殊节点，如 `human_approval`。该节点不调用 LLM，而是作为暂停点。例如：

`from langgraph.graph import StateGraph**graph = StateGraph(MyState)
graph.add_node("agent", agent_node)
graph.add_node("human_approval", lambda state: state) # 空操作节点
graph.add_edge("agent", "human_approval")
graph.add_edge("human_approval", "finalize")
`
- **配置 Checkpointer**：必须使用 `MemorySaver` 或自定义 Checkpointer 来持久化状态。LangGraph 的 `CompiledGraph` 需要传入 `checkpointer` 参数：
`from langgraph.checkpoint import MemorySaver
checkpointer = MemorySaver()
app = graph.compile(checkpointer=checkpointer, interrupt_before=["human_approval"])
`为什么这么做**：`interrupt_before` 让图在进入 `human_approval` 节点前暂停，此时状态已保存到 Checkpointer。没有 Checkpointer，中断后状态丢失，无法恢复。

- **执行与中断**：调用 `app.invoke` 时，图运行到 `human_approval` 前暂停，返回一个 `RunnableConfig` 对象，包含 `configurable` 字段（如 `thread_id`）。例如：

`config = {"configurable": {"thread_id": "123"}}**result = app.invoke({"input": "生成报告"}, config)
# 此时图暂停，result 包含当前状态
`
- **外部获取确认**：通过 REST API 或 CLI 暴露接口，让用户查看当前状态（如 agent 生成的草稿），并返回确认或修改。例如，用户通过 `/approve` 端点提交：
`@app.post("/approve")
async def approve(thread_id: str, approved: bool, edits: dict = None):
config = {"configurable": {"thread_id": thread_id}}
# 更新状态（如修改草稿）
state = app.get_state(config)
if edits:
state.values["draft"] = edits
# 恢复执行
result = app.invoke(None, config) # 传入 None 表示继续
return result
`实际落地的坑**：用户可能超时或拒绝。解法是设置 `timeout` 参数，超时后自动回退到上一个节点（如重新生成草稿）。例如，用 `asyncio.wait_for` 包装等待逻辑，超时后调用 `app.update_state` 设置回退标志。

- **处理拒绝与修改**：如果用户拒绝，可以更新状态中的 `approved` 字段为 `False`，并在后续节点中触发回退逻辑。例如，在 `finalize` 节点检查 `approved`，若为 False 则跳转到 `agent` 节点重新生成。这需要图中有条件边：

`def should_continue(state):**return "agent" if not state["approved"] else "finalize"
graph.add_conditional_edges("human_approval", should_continue)
`
- **对比 HumanInputTool**：LangChain 的 `HumanInputTool` 是同步阻塞的，适合简单场景（如单次输入），但无法持久化状态，且不支持多轮交互。LangGraph 的 interrupt 机制是异步的，状态持久化在 Checkpointer 中，支持复杂工作流（如多步审核、回退）。**工程取舍**：interrupt 机制更灵活但需要额外管理 Checkpointer 和线程 ID，HumanInputTool 更简单但无法用于生产级多 Agent 系统。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，图结构层面，插入一个空操作节点作为暂停点，并用 `interrupt_before` 配置；第二，状态持久化层面，必须使用 Checkpointer 保存状态，通过 `thread_id` 恢复执行；第三，外部交互层面，通过 REST API 获取用户确认，处理超时和拒绝。总结一句：LangGraph 的 interrupt 机制本质是异步的 Human-in-the-Loop，比 HumanInputTool 更适合生产级 Agent。”

#### 4️⃣ 高频追问 & 应对
追问 1**：如果用户修改了状态，如何保证图后续节点能正确读取修改后的数据？

> 通过 `app.get_state(config)` 获取当前状态，然后直接修改 `state.values` 中的字段（如 `draft`），再调用 `app.update_state(config, state.values)` 更新 Checkpointer。注意：修改后必须确保状态 schema 一致，否则会报错。例如，如果状态是 TypedDict，修改字段类型要匹配。工程上，建议在用户接口层做校验，防止非法输入。

**追问 2**：多个用户同时操作同一个线程 ID 会怎样？如何避免竞态？

> LangGraph 的 Checkpointer 默认不支持并发写同一 `thread_id`，会抛出 `ConcurrentUpdateError`。解法是使用分布式锁（如 Redis 锁）或为每个用户分配独立线程 ID。生产级方案：在 API 层用 `thread_id` 加用户 ID 前缀（如 `user123:thread456`），确保唯一性。如果必须共享，用乐观锁：读取状态时记录版本号，更新时检查版本是否变化。

**追问 3**：interrupt_before 和 interrupt_after 有什么区别？什么场景用哪个？

> `interrupt_before` 在节点执行前暂停，适合需要用户确认输入的场景（如审核 agent 输出）；`interrupt_after` 在节点执行后暂停，适合需要用户查看结果后再决策的场景（如用户选择下一步动作）。工程取舍：`interrupt_before` 更安全，因为节点未执行，状态未变；`interrupt_after` 可能产生脏状态，需要额外清理逻辑。例如，报告生成 Agent 用 `interrupt_before` 让用户审核草稿，而多步 Agent 用 `interrupt_after` 让用户选择分支。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“直接在节点里用 `input()` 等待用户输入” → ✅ 正确做法是用 `interrupt_before` 配合 Checkpointer，因为 `input()` 是同步阻塞，无法用于生产级 API 服务，且状态不持久化。
- ❌ 说“不需要 Checkpointer，用全局变量存状态就行” → ✅ 必须用 Checkpointer，因为全局变量在并发或重启时会丢失，且 LangGraph 的 `interrupt_before` 依赖 Checkpointer 来恢复执行。
- ❌ 说“用户拒绝后直接结束图” → ✅ 正确做法是设计回退逻辑，如跳转到前一个节点重新生成，而不是硬终止，因为用户可能想修改后重试。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“人工审核检索结果”切入，展示如何用 interrupt 机制让用户确认检索片段后再生成答案，减少幻觉。强调 Checkpointer 用于记录审核日志。
- **如果你只做过传统 NLP**：用“状态机类比”迁移，说传统流程用 if-else 控制人工介入，LangGraph 用 interrupt 实现异步状态机，更优雅。举例：文本分类任务中，让用户确认分类结果后再训练。
- **如果你是校招无项目**：聚焦 LangGraph 官方文档中的“Human-in-the-Loop”示例，复现一个简单 demo：用户输入问题，agent 生成答案后暂停，用户修改后继续。强调对 interrupt 和 Checkpointer 的理解。
- LangGraph 官方文档：Human-in-the-Loop 教程
- 论文：ReAct: Synergizing Reasoning and Acting in Language Models（理解 Agent 循环）
- 博客：Building Production-Ready AI Agents with LangGraph（实战经验）
- 工具：LangSmith 用于调试 Checkpointer 状态
- 论文：Toolformer: Language Models Can Teach Themselves to Use Tools（理解工具调用与中断）

---
