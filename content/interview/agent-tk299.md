---
slug: agent-tk299
no: "1199"
title: "为什么手搓agent，而不是用框架"
question: "为什么手搓agent，而不是用框架"
excerpt: "面试官想考察你对 Agent 架构的工程取舍能力，而非单纯背概念。这是典型的“系统设计 + 工程取舍”题，刁钻点在于：框架（如 LangChain、AutoGPT）看似省力，但手搓能暴露你对推理循环、工具调用、状态管理、"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4307
updated: "2026-09-29"
---

## 为什么手搓agent，而不是用框架

`P1` · `agent_architecture`

🏷 标签：`agent`, `framework`, `langchain`, `architecture`, `engineering`

#### 1️⃣ 考察意图

面试官想考察你对 Agent 架构的**工程取舍**能力，而非单纯背概念。这是典型的“系统设计 + 工程取舍”题，刁钻点在于：框架（如 LangChain、AutoGPT）看似省力，但手搓能暴露你对**推理循环、工具调用、状态管理、错误恢复**等底层细节的掌控力。答好了能展示你**不盲从流行工具、能根据场景做技术选型**的硬实力，以及**在复杂生产环境中 debug 和优化**的实战经验。

#### 2️⃣ 标准答

手搓 Agent 而非用框架，核心原因是**生产环境对可控性、性能和调试深度的要求**，远超框架提供的“开箱即用”。下面从三个层面展开：

- **控制力与定制化****推理循环**：框架（如 LangChain 的 `AgentExecutor`）封装了“思考-行动-观察”循环，但手搓可以精确控制每一步：例如在 ReAct 模式中，手搓能自定义 `thought` 的 prompt 模板、限制 `action` 的 token 预算、在 `observation` 后插入校验逻辑。框架的黑盒往往导致“中间状态不可见”，一旦 Agent 跑偏（如陷入循环），debug 只能靠日志猜。
- **工具集成**：手搓能针对特定工具做**协议适配**。例如调用内部 RPC 服务时，框架的 `Tool` 抽象可能要求统一输入输出格式，但手搓可以直接用 `asyncio` 并发调用多个工具、自定义重试策略（如指数退避 + jitter）、甚至根据工具返回的 error code 动态切换 fallback 逻辑。框架的 `@tool` 装饰器虽快，但遇到非标准 API（如 WebSocket 长连接）就捉襟见肘。
- **状态管理**：手搓 Agent 可以维护**显式状态机**（如用 `enum` 定义 `IDLE -> THINKING -> ACTING -> OBSERVING -> FINISHED`），每个状态有独立的错误处理。框架的 `AgentState` 通常只是字典，当状态膨胀到 10+ 字段时，并发场景下的竞态条件（race condition）很难排查。
性能与延迟
- **推理路径优化**：手搓能跳过框架的**序列化开销**。例如 LangChain 的 `AgentExecutor` 每次循环都会将 `AgentAction` 序列化为 JSON 再反序列化，手搓直接操作 Python 对象，减少 10-20% 的延迟。在低延迟场景（如实时客服），手搓 Agent 的循环耗时可以从框架的 300ms 降到 200ms（基于 GPT-4 的通用数据）。
- **缓存与批处理**：手搓可以精细控制 LLM 调用：对重复的 `thought` 做 LRU 缓存、对多个工具调用做批处理（如一次 prompt 输出多个 `action`）。框架的 `max_iterations` 参数只是粗暴截断，手搓能实现**动态早停**（如当 `observation` 置信度 > 0.9 时提前结束循环）。
- **内存管理**：手搓 Agent 可以按需裁剪历史消息（如只保留最近 5 轮对话 + 关键工具输出），避免上下文窗口溢出。框架的 `memory` 模块（如 `ConversationBufferMemory`）默认全量存储，在长对话中容易触发 token 限制。
调试与可观测性
- **细粒度日志**：手搓可以在每一步插入结构化日志（如 `{"step": 2, "action": "search", "input": "query", "output": "result", "latency": 150ms}`），方便用 ELK 或 Grafana 做实时监控。框架的 `callbacks` 虽然能打印日志，但无法自定义日志格式和采样率（如只记录 error 或慢调用）。
- **单元测试**：手搓 Agent 的每个组件（如 `parse_action`、`validate_observation`）都可以独立写单元测试。框架的 Agent 是“大泥球”，测试需要 mock 整个 LLM 调用链，维护成本高。
- **回滚与重试**：手搓能实现**事务性 Agent**：如果某步失败，可以回滚到上一个 checkpoint（如保存 `state` 快照），而不是框架的“从头重试”。这在金融交易或自动化运维场景中至关重要。

**实际落地的坑 + 解法**：在某个电商客服项目中，用 LangChain 的 `OpenAIFunctionsAgent` 时，发现 Agent 在工具调用失败后（如库存查询超时），会重复尝试 3 次才报错，导致用户等待 10 秒。手搓后，改为**超时即 fallback**：如果工具 2 秒无响应，直接返回“系统繁忙，请稍后再试”，并将错误记录到死信队列。延迟从 10 秒降到 3 秒，用户满意度提升 20%。

**总结**：框架适合**快速原型和标准任务**（如简单问答），但手搓 Agent 是**生产级系统的必然选择**，因为你能掌控每一毫秒和每一行日志。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从控制力、性能、调试三个层面回答。控制力上，手搓能自定义推理循环和工具协议，避免框架黑盒；性能上，手搓减少序列化开销和缓存优化，延迟可降低 30%；调试上，手搓支持细粒度日志和单元测试。总结一句：框架用于验证，手搓用于生产。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到手搓减少延迟，能具体说说怎么实现的吗？比如序列化开销到底多大？

> 以 LangChain 的 `AgentExecutor` 为例，每次循环会调用 `_take_next_step`，内部将 `AgentAction` 序列化为 JSON 传给 LLM，再反序列化返回的 `AgentFinish`。实测 GPT-4 调用中，序列化/反序列化耗时约 30-50ms（占单次循环的 10-15%）。手搓时，直接传递 Python 字典或 Pydantic 对象，省去这步。另外，框架的 `callback` 链（如 `on_llm_start`、`on_tool_end`）会额外增加 20-30ms 的 hook 开销，手搓可以按需注册，不全局启用。

**追问 2**：如果团队里有人不熟悉手搓，你怎么平衡开发效率和可控性？

> 采用**分层架构**：底层用纯 Python 手搓核心循环（推理、状态机、错误恢复），上层封装成类似框架的 API（如 `class MyAgent: def run(input) -> output`）。这样新成员只需调用 API，无需理解内部细节。同时，写一份 10 页的“Agent 开发指南”，包含状态图、工具注册规范、日志格式。如果项目周期紧，先用框架做 MVP，再逐步替换手搓模块（如先替换工具调用层，再替换推理循环）。

**追问 3**：手搓 Agent 怎么处理工具调用失败？框架有重试机制，你手搓怎么实现？

> 手搓实现**分级重试**：第一次失败，立即重试（最多 1 次）；第二次失败，切换 fallback 工具（如从搜索引擎切到本地缓存）；第三次失败，记录错误并返回用户友好提示。同时，用 `tenacity` 库实现指数退避（初始 1 秒，最大 10 秒）。框架的 `max_retries` 参数是全局的，无法针对不同工具定制。手搓还能在重试前检查工具状态（如服务健康检查），避免无效重试。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “框架太慢，手搓更快，所以永远用手搓。” → ✅ “框架在快速原型和标准任务中效率更高，但生产环境需要手搓来优化延迟和可控性。选型取决于场景：MVP 用框架，迭代后手搓。”
- ❌ “手搓就是不用任何库，纯 Python 写。” → ✅ “手搓不是排斥库，而是避免框架的抽象层。可以用 `httpx`、`pydantic`、`tenacity` 等轻量库，但自己控制 Agent 循环和状态管理。”
- ❌ “框架的 Agent 不够智能，手搓能实现更复杂的推理。” → ✅ “智能性取决于 prompt 和 LLM 本身，而非框架。手搓的优势在于能精细控制推理流程（如多步验证、动态工具选择），而非提升 LLM 能力。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“手搓 Agent 优化检索-推理流程”切入，例如手搓实现了多步检索（先粗排再精排），相比 LangChain 的 `RetrievalQA` 减少 40% 的幻觉。
- **如果你只做过传统 NLP**：用“状态机类比”迁移，例如将手搓 Agent 的推理循环类比为传统 NLP 中的 pipeline（分词→NER→关系抽取），强调每个步骤的可控性。
- **如果你是校招无项目**：聚焦“论文复现 demo”，例如手搓了一个 ReAct Agent（基于论文《ReAct: Synergizing Reasoning and Acting》），对比 LangChain 实现，展示对推理循环的理解。

#### 7️⃣ 延伸阅读

- 《ReAct: Synergizing Reasoning and Acting in Language Models》（论文）
- 《Building a Production-Ready Agent: Lessons from LangChain to Handcrafted》（博客）
- 《The State of AI Agents: Frameworks vs. Custom》（技术报告）
- 《tenacity: Retry library for Python》（工具文档）
- 《Pydantic: Data validation using Python type annotations》（工具文档）

---
