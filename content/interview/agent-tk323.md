---
slug: agent-tk323
no: "1223"
title: "如何设计支持流式输出的Agent"
question: "如何设计支持流式输出的Agent"
excerpt: "面试官想看的不是你会不会调 `stream=True`，而是你在实时交互场景下对 Agent 架构的全局把控。核心考察点：① 流式传输的技术选型（SSE vs WebSocket）及其 trade-off；② Agent"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4276
updated: "2026-09-29"
---

## 如何设计支持流式输出的Agent

`P1` · `agent_architecture`

🏷 标签：`streaming`, `sse`, `websocket`, `agent`, `real-time`

#### 1️⃣ 考察意图

面试官想看的不是你会不会调 `stream=True`，而是你在**实时交互场景下对 Agent 架构的全局把控**。核心考察点：① 流式传输的技术选型（SSE vs WebSocket）及其 trade-off；② Agent 内部如何将 LLM 流式输出、工具调用状态、中间推理过程**编排成统一的事件流**；③ 生产级问题：流中断重试、背压控制、多轮上下文一致性。答好了能展示你**从协议层到应用层再到运维层的整条链路设计能力**，这是 P1+ 级别工程师的硬实力。

#### 2️⃣ 标准答

**一、传输层选型：SSE 优先，WebSocket 备选**

- **SSE（Server-Sent Events）**：天然单向推送，基于 HTTP 长连接，浏览器原生支持 `EventSource` API。适合 Agent 场景——客户端只需消费，无需频繁上行。**为什么选它**：Agent 的流式输出本质是服务端主动推送（LLM token、工具调用状态），SSE 的自动重连机制（`Last-Event-ID`）天然解决断线问题，且无 WebSocket 的帧解析开销。
- **WebSocket**：仅当需要客户端实时干预（如用户中途打断 Agent 思考、修改工具参数）时使用。**trade-off**：WebSocket 是全双工，但需要自己实现心跳保活、重连逻辑，且浏览器兼容性不如 SSE（需要 polyfill）。

**二、Agent 内部流式编排：事件驱动架构**

将 Agent 执行过程拆解为**离散事件流**，每个事件携带 `event_id`、`type`、`data`、`timestamp`。典型事件类型：

- `thought`：LLM 的推理过程（如 ReAct 的思考链）
- `tool_call`：工具调用请求（含参数）
- `tool_result`：工具返回结果（可能也是流式的，如数据库查询分页）
- `final_answer`：最终输出

**实现细节**：使用 Python `asyncio.Queue` 作为事件缓冲区，LLM 流式回调（`on_token`）将 token 封装为 `thought` 事件入队；工具调用结果通过 `async for` 分块入队。后端用 FastAPI 的 `StreamingResponse` 将队列事件序列化为 SSE 格式。

**实际落地的坑**：工具调用结果可能很大（如搜索返回 1000 条结果），直接入队会阻塞 LLM 流。**解法**：对工具结果做**分块流式返回**，每块 50 条，事件类型标记为 `tool_result_chunk`，前端按 `event_id` 聚合。

**三、生产级难点与解法**

1. **流中断与重试**：SSE 的 `Last-Event-ID` 机制要求后端记录每个事件的 ID。如果客户端断连重连，后端从断点重放事件。**实现**：用 Redis 缓存最近 1000 个事件（TTL 5 分钟），重连时根据 `Last-Event-ID` 从 Redis 拉取。
2. **背压控制**：LLM 生成速度可能快于前端消费速度（尤其移动端）。**解法**：在 `asyncio.Queue` 设置最大长度（如 500），队列满时 LLM 流式回调阻塞等待，天然实现背压。同时在前端用 `requestAnimationFrame` 控制渲染频率，避免 DOM 更新过载。
3. **并发与乱序**：多轮对话中，用户可能连续发送两条消息，导致 Agent 实例并发。**解法**：每个会话维护一个 `asyncio.Lock`，保证同一会话的 Agent 执行串行；不同会话之间用 `asyncio.gather` 并发处理。

**四、性能优化**

- **异步框架**：FastAPI + `uvicorn` 的异步 worker，单进程可处理数千 SSE 连接。
- **消息队列缓冲**：当 Agent 需要调用外部 API（如搜索），用 Kafka 作为工具调用请求的缓冲队列，避免直接 HTTP 调用阻塞事件循环。
- **LLM 流式加速**：使用 FlashAttention 和 vLLM 的 `async` 接口，将首 token 延迟压到 200ms 以内。

#### 3️⃣ 答题模板（30 秒电梯版）

> "这个问题我从传输层、编排层、生产层三个层面回答。传输层优先选 SSE，因为它天然支持服务端推送和自动重连，比 WebSocket 更适合 Agent 的单向流场景；编排层将 Agent 执行拆解为 thought/tool_call/tool_result/final_answer 事件流，用 asyncio.Queue 做缓冲；生产层重点解决流中断重试（Redis 缓存事件）、背压控制（队列限长）、并发乱序（会话级锁）。总结一句：流式 Agent 的核心不是 LLM 流式，而是将整个 Agent 执行过程事件化、可重放、可中断恢复。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果用户中途打断 Agent 思考，怎么实现？

> 需要 WebSocket 支持客户端上行。前端发送 `cancel` 消息，后端收到后：① 取消当前 LLM 流式调用（`asyncio.Task.cancel()`）；② 清空事件队列；③ 向 LLM 发送一个特殊 prompt 要求它基于已有结果生成摘要。注意：取消后需要保持会话上下文一致，不能丢失之前生成的 token。**trade-off**：完全取消 vs 允许 LLM 继续生成但忽略结果——前者节省算力但可能丢失有用中间结果，后者反之。推荐前者，因为用户打断通常意味着方向错误。

**追问 2**：SSE 的并发连接数上限是多少？怎么突破？

> 浏览器对同一域名的 SSE 连接数限制为 6-8 个（HTTP/1.1），HTTP/2 可突破到 100+。**解法**：① 使用 HTTP/2 多路复用；② 如果必须用 HTTP/1.1，将 SSE 连接分散到多个子域名（如 sse1.example.com, sse2.example.com）；③ 后端用 Nginx 做 SSE 代理时，注意 `proxy_buffering off`，否则 Nginx 会缓存整个响应导致流式失效。

**追问 3**：工具调用结果很大（如返回 10MB JSON），怎么流式返回？

> 分块策略：① 将工具结果按逻辑分片（如每页 100 条记录），每个分片作为一个独立 SSE 事件，事件类型 `tool_result_chunk`，带 `chunk_index` 和 `total_chunks`；② 前端用 `Map<event_id, chunk[]>` 聚合，等所有 chunk 到齐后渲染；③ 如果结果需要实时展示（如搜索结果的渐进式加载），前端直接渲染每个 chunk。**注意**：分块大小要平衡——太小增加事件数（SSE 开销），太大失去流式意义。推荐每块 50-100 条记录或 10KB。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 直接说“用 WebSocket 实现流式输出，因为它是全双工” → ✅ 先分析场景：Agent 流式输出是服务端主导的单向推送，SSE 更轻量、自带重连、浏览器兼容性好。WebSocket 只在需要客户端实时干预时才用。
- ❌ 只关注 LLM 的流式调用（`stream=True`），忽略工具调用和中间状态的流式 → ✅ 将整个 Agent 执行过程事件化，包括 thought、tool_call、tool_result，每个阶段都流式推送，让前端实时展示“Agent 正在思考/调用工具/获取结果”。
- ❌ 认为流式输出就是不断往 response 里写数据，不考虑断线重连 → ✅ 必须实现断点续传：SSE 的 `Last-Event-ID` + 后端 Redis 缓存事件，保证重连后从断点继续推送。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“RAG 的流式输出”切入，对比 RAG 只需流式返回检索结果+LLM 生成，而 Agent 需要编排多步工具调用和推理过程。强调你如何将 RAG 的流式经验迁移到 Agent 的事件流设计。
- **如果你只做过传统 NLP**：用“流式文本生成”类比，说明传统 seq2seq 的 beam search 流式输出 vs Agent 的流式输出差异——后者需要处理非文本事件（工具调用状态）。展示你对异步编程（asyncio）和事件驱动架构的理解。
- **如果你是校招无项目**：聚焦论文复现，如 ReAct 论文中 Agent 的思考-行动-观察循环，说明如何将每个步骤映射为 SSE 事件。强调你实现过基于 FastAPI+SSE 的 demo，并测试过 100 并发下的延迟。

#### 7️⃣ 延伸阅读

- 《ReAct: Synergizing Reasoning and Acting in Language Models》（论文，Agent 思考-行动循环的原始框架）
- 《Server-Sent Events (SSE) in FastAPI》（FastAPI 官方文档，SSE 实现细节）
- 《vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention》（论文，LLM 流式推理加速）
- 《Building Event-Driven Microservices》（Sam Newman 著，事件驱动架构设计模式）
- 《WebSocket vs SSE: A Performance Comparison》（博客，SSE 和 WebSocket 的基准测试数据）

---
