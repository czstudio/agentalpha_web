---
slug: agent-tk244
no: "1144"
title: "LangGraph vs Langchain 选择原因和技术对比"
question: "LangGraph vs Langchain 选择原因和技术对比"
excerpt: "面试官想考察你对 LangChain 生态的深度理解，而非简单背诵 API。这是一道“工程取舍 + 系统设计”题，刁钻点在于：很多人只把 LangGraph 当作 LangChain 的升级版，却说不清两者在状态管理、图"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4414
updated: "2026-09-29"
---

## LangGraph vs Langchain 选择原因和技术对比

`P1` · `agent_architecture` · **🏢 阿里**

🏷 标签：`langgraph`, `langchain`, `framework`, `comparison`

#### 1️⃣ 考察意图

面试官想考察你对 LangChain 生态的深度理解，而非简单背诵 API。这是一道“工程取舍 + 系统设计”题，刁钻点在于：很多人只把 LangGraph 当作 LangChain 的升级版，却说不清两者在状态管理、图执行、循环控制上的本质差异。答好了能展示你对 Agent 框架的底层认知——知道什么时候该用 DAG（有向无环图），什么时候必须上状态机，以及如何避免“框架锁死”的坑。

#### 2️⃣ 标准答

**核心结论**：LangChain 是链式 DAG 框架，LangGraph 是图状态机框架。选择取决于你的 Agent 是否需要**循环、分支、持久化状态**。

**1. 架构差异**

- **LangChain**：基于 `Chain` 抽象，执行流是线性或简单 DAG（如 `LLMChain` → `RetrievalQA`）。每个节点（Node）是纯函数，输出传给下一个节点。**无内置循环**，要循环只能递归调用 Chain，导致调用栈爆炸。
- **LangGraph**：基于 `StateGraph`，节点是 `State` 的读写操作。支持**显式循环**（通过 `add_conditional_edges` 跳回前序节点），且状态由 `State` 对象统一管理，天然支持**持久化**（通过 `Checkpointer` 接口，可对接 Redis/Postgres）。

**2. 状态管理**

- **LangChain**：状态隐式存在于 `Chain` 的 `input/output` 字典中，跨节点传递靠 `memory` 模块（如 `ConversationBufferMemory`），但 memory 本质是外部存储，与执行流解耦。**坑**：多轮对话中，memory 和 Chain 的输入输出容易不一致，导致上下文丢失。
- **LangGraph**：状态显式定义为 `TypedDict` 或 `Pydantic` 模型，每个节点读写状态字段。**优势**：支持**部分更新**（`add` 操作合并列表，`set` 覆盖字段），且状态变更可被 `Checkpointer` 快照，实现**断点续跑**（如 Agent 中途挂掉，恢复后从断点继续）。

**3. 循环与分支**

- **LangChain**：分支靠 `RunnableParallel`，循环靠 `RunnableLambda` 递归。**实际落地坑**：写一个 ReAct Agent 时，需要手动管理 `while` 循环和 `max_iterations`，代码臃肿且易死循环。
- **LangGraph**：原生支持**条件边**（`add_conditional_edges`），例如：`if tool_call: go_to_tool_node else: go_to_end`。**工程取舍**：图结构让循环可视化（可用 `get_graph().draw_mermaid_png()` 导出），但调试时状态图可能过于复杂（超过 20 个节点时，建议拆分子图）。

**4. 性能与扩展**

- **LangChain**：轻量，启动快（无图编译开销），适合**简单流水线**（如 QA 链、摘要链）。**局限**：多 Agent 协作时，Chain 嵌套导致延迟线性增长。
- **LangGraph**：有图编译开销（首次构建约 50-100ms），但**运行时**节点可并行（通过 `add_node` 的 `parallel` 参数），且支持**流式输出**（`stream_mode="updates"` 逐节点推送）。**推荐场景**：需要**人机交互**（Human-in-the-loop）的 Agent，如审批流、多步工具调用。

**5. 实际落地建议**

- **选 LangChain**：你的任务无循环（如单轮 QA、文档摘要）、团队无状态管理经验、需要快速原型。
- **选 LangGraph**：你的 Agent 需要**多步推理**（如 ReAct、Plan-and-Execute）、**状态持久化**（如客服对话）、**条件分支**（如根据用户意图切换流程）。
- **混合使用**：LangGraph 节点内部可以调用 LangChain 的 `Runnable`（如 `LLMChain`），两者兼容。**坑**：注意版本对齐，LangGraph 0.1.x 依赖 LangChain 0.2.x，混用 0.1.x 的 Chain 会报 `RunnableSequence` 兼容错误。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从架构、状态管理、循环控制三个层面回答。架构上，LangChain 是线性 DAG，LangGraph 是图状态机；状态管理上，LangChain 靠外部 memory，LangGraph 靠内置 State 对象并支持持久化；循环控制上，LangChain 需手动递归，LangGraph 原生支持条件边。总结一句：无循环选 LangChain，有循环/状态持久化选 LangGraph。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果我的 Agent 需要同时调用 5 个工具，LangGraph 怎么保证不超时？

> 用 `add_node` 的 `parallel` 参数，配合 `asyncio.gather` 并发调用工具。但注意：LLM 调用是串行的（因为依赖前序推理结果），工具调用可以并行。实际落地时，设置 `max_concurrency=5`，并给每个工具节点加超时（`timeout=30s`）。坑：如果工具返回结果需要合并（如多个搜索结果的去重），需要在合并节点用 `reduce` 操作（`add` 模式）处理列表。

**追问 2**：LangGraph 的状态持久化怎么实现断点续跑？

> 通过 `Checkpointer` 接口，常用 `SqliteSaver`（本地测试）或 `PostgresSaver`（生产）。每次节点执行后，`Checkpointer` 保存状态快照。恢复时，用 `graph.resume(thread_id, checkpoint_id)` 从指定断点继续。工程取舍：快照频率越高，恢复粒度越细，但 I/O 开销越大。推荐每 3-5 个节点保存一次，或只在关键决策点（如工具调用前）保存。

**追问 3**：LangGraph 和 AutoGen 相比，优势在哪？

> LangGraph 更轻量（无分布式通信层），适合单进程 Agent。AutoGen 强在多 Agent 对话（每个 Agent 独立进程，通过消息队列通信）。选型：如果 Agent 间需要实时辩论（如两个 LLM 互相反驳），用 AutoGen；如果只是单 Agent 多步工具调用，LangGraph 更简单。注意：AutoGen 的 `GroupChat` 在 10+ Agent 时会出现消息风暴，需要手动限流。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “LangGraph 就是 LangChain 的升级版，以后都用 LangGraph。” → ✅ “两者定位不同：LangChain 是链式框架，LangGraph 是图状态机。简单流水线用 LangChain 更轻量，复杂 Agent 用 LangGraph 更可控。”
- ❌ “LangGraph 的状态管理用 `State` 对象，比 LangChain 的 `memory` 好一万倍。” → ✅ “`State` 对象确实更优雅，但 `memory` 在简单场景（如单轮对话）反而更直接。选型要看状态复杂度：如果只是存历史消息，`memory` 够用；如果需要存中间变量（如工具调用结果），必须用 `State`。”
- ❌ “LangGraph 支持循环，所以可以写无限循环的 Agent。” → ✅ “循环必须有终止条件（如 `max_iterations` 或 `max_time`），否则会死循环。实际落地中，建议在条件边里加 `if iteration > 10: go_to_end`，并配合 `Checkpointer` 保存中间状态，防止崩溃后丢失。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“多步检索”切入，对比 LangChain 的 `RetrievalQA`（单步检索）和 LangGraph 的“检索→重排序→生成”循环（如检索结果不满意则重新检索）。强调你用 LangGraph 实现了**自适应检索**，减少了 30% 的无效检索。
- **如果你只做过传统 NLP**：用“流水线 vs 状态机”类比：传统 NLP 的 pipeline（分词→词性标注→句法分析）是 LangChain 的 DAG；而需要回退修正的流程（如实体识别错误后重新分词）是 LangGraph 的循环。展示你理解**有状态 vs 无状态**的工程取舍。
- **如果你是校招无项目**：聚焦 LangGraph 官方示例（如 ReAct Agent），复现并分析其状态图。在简历中写：“基于 LangGraph 实现 ReAct Agent，对比 LangChain 版本，发现状态管理代码量减少 40%，调试效率提升 50%。” 面试时主动画出状态图。

#### 7️⃣ 延伸阅读

- LangGraph 官方文档：StateGraph 与 Checkpointer 详解
- 论文：ReAct: Synergizing Reasoning and Acting in Language Models
- 博客：LangChain vs LangGraph: When to Use Which (LangChain Blog)
- 工具：LangSmith 的 Trace 功能（可视化 LangGraph 执行流）
- 论文：Toolformer: Language Models Can Teach Themselves to Use Tools

---
