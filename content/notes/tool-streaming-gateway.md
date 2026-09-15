---
slug: "tool-streaming-gateway"
title: "工具调用为什么要做流式网关：别让用户只看到一个漫长的转圈"
excerpt: "工具流式传输不是把文字切成小段就完事，是把一次调用拆成能排序、能恢复的事件流。顺序、背压、断线续传、权限、最终提交都归网关管，体验和可靠性才不会打架。"
series: "工具调用"
seriesNo: "10"
number: "68"
minutes: 21
---

Agent 调用工具时，用户关心的是“现在到哪一步了，下一步会不会改我的数据”。如果前端只能等完整响应，检索、审批、写入之间的几秒钟就只剩一个转圈。流式网关要送出的不是每个 token，而是带语义、可追踪的生命周期事件。

## 拆完先给结论

把一次工具执行建模为事件序列：`run_started → tool_requested → tool_progress → tool_result → approval_required → committed`。网关负责事件编号、排序、权限过滤、心跳、背压和断线续传；工具服务负责真实执行，不能因为“已经流式展示”就把未提交的中间结果当成事实。最终状态必须由服务端回执确认。

![工具调用事件流与网关边界](/images/notes/tool-streaming-gateway/event-stream.svg)

## 事件要比日志稳定

```json
{
  "event_id": "evt-0042",
  "run_id": "run-20260822-09",
  "seq": 42,
  "type": "tool_progress",
  "tool": "search_policy",
  "visibility": "user",
  "payload": {"stage": "rerank", "completed": 6, "total": 8},
  "created_at": "2026-08-22T14:02:04Z"
}
```

事件字段要有稳定语义。日志可以改变，前端和审计却不能依赖一段自然语言。`seq` 让客户端发现丢包，`visibility` 防止内部 token、敏感参数或凭据意外展示。

## 顺序、背压和心跳

流式系统至少要处理三种异常：

| 异常 | 表现 | 网关动作 |
| --- | --- | --- |
| 事件乱序 | progress 先于 request 到达 | 按 `seq` 缓冲或要求重放 |
| 客户端太慢 | 缓冲区不断增长 | 降采样进度，保留终态 |
| 上游无输出 | 用户以为服务挂了 | 心跳 + 明确的等待状态 |

背压的原则是“可以丢中间进度，不能丢终态”。如果客户端落后，网关可以合并连续进度事件，但 `tool_result`、`approval_required` 和 `committed` 必须保留。

## 断线续传不是重新执行

客户端带上最后看到的序号重新连接：

```python
def resume(run_id: str, last_seq: int, event_store):
    events = event_store.after(run_id, last_seq)
    if not events and event_store.is_terminal(run_id):
        return event_store.snapshot(run_id)
    return {"events": events, "next_seq": events[-1]["seq"] if events else last_seq}
```

恢复读取事件存储或终态快照，不能重新触发工具。对有副作用的写入，恢复路径必须靠执行幂等键查询，不得把连接重试当成业务重试。

![断线后从事件序号恢复，而不是重放工具](/images/notes/tool-streaming-gateway/resume-boundary.svg)

## 事件流和模型 token 流要分层

模型的 token 流适合展示思考中的可读片段，但工具参数、内部提示词和权限决策不能原样暴露。建议分为：

1. **用户可见事件**：阶段、进度、引用和最终摘要；
2. **审计事件**：完整参数哈希、版本、耗时和错误码；
3. **内部调试事件**：仅限受控环境，不进入用户会话。

这样既能提供反馈，也不会把系统内部实现当成产品协议。

## 一个完整任务应该长什么样

以“查政策并生成报销草稿”为例，用户可见的事件可以是：

```text
run_started
  → plan_ready
  → tool_requested(search_policy)
  → tool_progress(rerank 6/8)
  → tool_result(evidence_ids=[e12,e19])
  → approval_required(draft_id=d-42)
  → committed(draft_id=d-42)
```

每个事件都要能在服务端找到对应的状态和证据。`plan_ready` 不能代替真正执行；`tool_result` 不能直接表示业务已经提交；`committed` 必须有数据库回执或第三方确认号。用户看到的是一条故事线，审计系统保存的是可验证的状态转换。

![用户事件、审计事件和执行状态的三层流](/images/notes/tool-output-shaping/streaming-artifact.svg)

## 进度百分比为什么经常骗人

搜索、重排和第三方 API 的工作量通常不可精确预知。把“已经生成 80%”写成百分比，会制造一种任务快结束的错觉。更稳的是发送阶段和可观察计数：`retrieving`、`reranking`、`waiting_provider`、`reconciling`。只有执行器真的知道总量时，才展示 `completed/total`。

进度事件要标记 `confidence` 或 `is_estimate`，前端可以把估算展示成“正在处理”，把确认状态展示成“已完成”。这不是 UI 小细节，而是避免 Agent 把推测伪装成事实。

## 背压策略要写成可测试的规则

当客户端速度跟不上上游时，网关可以按优先级处理：

1. 合并同一阶段连续进度，只保留最新快照；
2. 丢弃重复的心跳和低价值日志；
3. 保留所有错误、审批、结果和提交事件；
4. 缓冲超过阈值时发送 `degraded=true`，让客户端知道进度被降采样；
5. 终态落库后关闭连接，客户端可用快照补齐。

```yaml
backpressure:
  buffer_events: 256
  coalesce_types: [tool_progress, heartbeat]
  never_drop: [tool_result, approval_required, committed, failed]
  degraded_after_ms: 8000
resume:
  max_replay_events: 1000
  snapshot_on_terminal: true
```

## 安全边界：流式不等于可以把内部信息吐出去

工具参数可能包含个人信息、访问令牌或内部路径，模型 token 也可能暴露系统提示和未授权证据。网关应该根据事件类型和用户 scope 做二次过滤，并为同一个 `run_id` 生成审计摘要。前端只收到能帮助用户判断“下一步是什么”的信息，不能把调试日志当作产品体验。

## 用回放测试验证断线、乱序和重复

不要只在浏览器里点一次“刷新”。可以对同一事件序列注入延迟、乱序、重复、丢失和客户端慢读，检查客户端最终是否得到同一终态：

| 故障注入 | 预期结果 |
| --- | --- |
| 丢掉 3 个 progress | 重连后补快照或最新进度 |
| 重复 tool_result | 客户端去重，服务端不重复提交 |
| committed 先到 | 按序缓冲或以服务端终态校正 |
| 网关重启 | 任务继续，连接可恢复 |
| scope 变化 | 后续事件按新权限过滤 |

## 一个用户能感知的事件合同

以“导出一份带引用的审计报告”为例，前端真正需要的是可解释的阶段，而不是模型每吐一个 token 就刷新一次：

```json
{
  "run_id": "run-018",
  "seq": 12,
  "type": "tool_progress",
  "phase": "retrieval",
  "message": "已核对 18/24 份材料",
  "progress": {"done": 18, "total": 24},
  "artifact": null,
  "replayable": true
}
```

终态则必须带可下载的 artifact 或明确的失败原因：

```json
{
  "run_id": "run-018",
  "seq": 31,
  "type": "committed",
  "status": "ok",
  "artifact": {"id": "report-20260822-018", "sha256": "..."},
  "citations": ["doc-17#p4", "doc-22#p7"]
}
```

客户端可以丢弃中间进度，但不能丢掉 `committed`、`failed`、`unknown` 和审批事件。事件类型的优先级应写入协议，而不是依赖前端开发者自行猜测。

## 进度不是完成率：给用户一个能行动的状态

“已完成 80%”在检索、审批和外部工具场景里经常不准确。更稳的是报告当前阶段、已确认事实和下一步：

| 阶段 | 用户能看到的状态 | 允许的下一步 |
| --- | --- | --- |
| `retrieving` | 正在核对资料，已找到 18 份 | 等待或取消 |
| `awaiting_approval` | 草稿已生成，等待你确认 | 查看引用、批准或修改 |
| `unknown` | 外部系统是否提交成功仍在确认 | 查看凭证、联系人工 |
| `committed` | 已完成，报告可下载 | 下载或分享 |

这样即使事件被降采样，用户仍然知道系统在做什么、自己能不能继续操作。

## 事件预算也要和任务预算绑定

流式网关容易因为进度过细造成网络和存储放大。可以按任务阶段设置上限：

```yaml
event_budget:
  total: 400
  progress_per_tool: 20
  token_delta_per_second: 8
  replay_retention_minutes: 30
  terminal_event_reserve: 4
rules:
  - "terminal events cannot be coalesced"
  - "progress may be sampled after buffer=256"
  - "artifact reference survives stream close"
```

评测时同时看首事件时间、首个可用结果时间、终态可达率和重连后的快照一致性。只报“首 token 更快”会掩盖终态变慢或重复事件。

## 前端消费协议：让每个事件都能落到一个界面动作

流式接口最容易犯的错，是后端把内部日志原样推给浏览器。前端既不知道哪些事件能展示，也不知道断线后应该保留什么。更稳的做法是把事件分成“可见状态”和“内部审计”两层，并给可见事件一个稳定的 `event_id`：

```ts
type UiEvent =
  | { type: "task.started"; event_id: string; task_id: string; at: string }
  | { type: "step.updated"; event_id: string; step: string; state: "running" | "done" | "blocked" }
  | { type: "artifact.ready"; event_id: string; artifact_id: string; download_url: string }
  | { type: "task.ended"; event_id: string; status: "succeeded" | "failed" | "unknown" };

function applyEvent(state: ViewState, event: UiEvent): ViewState {
  if (state.seen.has(event.event_id)) return state; // 幂等消费
  state.seen.add(event.event_id);
  if (event.type === "task.ended") return { ...state, terminal: event.status };
  if (event.type === "artifact.ready") return { ...state, artifacts: [...state.artifacts, event.artifact_id] };
  return { ...state, last: event };
}
```

这样重连时可以从最后一个 `event_id` 请求快照；快照用于恢复界面，事件用于补齐审计，不需要把工具再执行一次。内部的 SQL、模型草稿和凭据引用只写审计流，绝不能因为“调试方便”混入用户事件。

网关还应给每个任务设置最大缓冲量。缓冲达到上限时，优先合并连续的进度事件，保留工具开始、工具结束、错误和终态；如果仍然溢出，就暂停低优先级 token 增量，而不是丢掉能证明副作用状态的回执。

### 断线、重连和终态的验收表

| 场景 | 网关动作 | 前端动作 | 不能发生 |
| --- | --- | --- | --- |
| 首次连接 | 先发 `task.started`，再发增量事件 | 建立任务时间线 | 先收到完成再补开始 |
| 连接中断 | 保留游标和终态快照 | 带 `last_event_id` 重连 | 从头重跑副作用工具 |
| 事件乱序 | 按序号缓冲，超时转 `unknown` | 显示“正在核对” | 把旧事件覆盖新状态 |
| 网关重启 | 从持久化日志恢复 | 合并快照与未消费事件 | 生成第二个 `task_id` |
| 终态已发 | 冻结任务状态，允许下载产物 | 显示明确的成功/失败 | 继续发送“进度 99%” |

验收时至少做一次“断在工具写入之后、回执到达之前”的演练。这个窗口决定系统是否会把未知副作用误判为失败，也是流式 Agent 和普通聊天流最本质的差别。

服务端还要限制单个连接的生命周期。连接超过上限时先发一个可恢复的 `stream.paused`，把任务游标和快照写入持久层，再让客户端按游标重连。这样网络层的连接回收不会改变任务本身，也不会逼着用户重新提交同一个问题。

对下载类产物，终态事件只携带稳定的 `artifact_id`，短时签名 URL 由文件服务单独签发，避免把权限和长连接生命周期绑在一起。

最终验收应包含一条完整用户路径：打开任务、离开页面、重新进入、看到当前状态、下载产物并查看引用。只在开发者工具里看到事件滚动，不代表普通用户真的能理解任务发生了什么。

把这条路径录成回放 fixture，后续每次改网关都自动重放，能及早发现“事件合同没变但界面语义变了”的回归。

验收记录同时保存浏览器尺寸与网络条件，避免只在本机高速网络下得出结论。

## 高频追问

**L1：SSE 和 WebSocket 怎么选？**

单向服务端事件、浏览器重连和 HTTP 基础设施兼容性优先时可以用 SSE；需要双向实时控制时再考虑 WebSocket。关键仍是事件合同和恢复，而不是协议名。

**L2：流式返回结果是不是更快？**

首个事件更快，不代表最终完成时间更短。要分别监控 TTFB、工具执行时长、终态时长和断线率。

**L2：进度事件可以由模型生成吗？**

模型可以描述阶段，但真实进度应来自工具网关或执行器。否则“已完成 80%”只是文案，不是事实。

**L3：如何保证工具结果只提交一次？**

给每次副作用操作绑定幂等键，终态提交在服务端落库；流式客户端只展示，不承担提交责任。

**L5：网关挂了会不会丢任务？**

事件流和任务状态要解耦。网关只负责转发与恢复，真实任务状态保存在持久化执行器；重连后读取快照或事件日志。

## 回到面试：怎么聊这个话题

我把工具流式设计成有序事件协议，而不是 token 透传。每个事件有 run_id、seq、type、可见性和时间，网关处理权限、背压、心跳和断线续传。客户端断线按最后序号读取事件或终态快照，不重新执行工具；中间进度可以合并，但结果、审批和 committed 不能丢。模型生成的描述只能算提示，真实进度与副作用状态来自执行器和服务端回执。

## 自检清单

- [ ] 能画出工具事件生命周期
- [ ] 事件有序号、可见性和终态
- [ ] 背压可以丢进度但不丢提交状态
- [ ] 断线恢复不会重复执行副作用

## 相关阅读

- [Function Calling 不是模型会调函数就完事：先把契约验清楚](/notes/tool-function-contract)
- [工具调用失败后，Agent 该重试、换工具还是停下？](/notes/tool-retry-policy)
- [Agent 上线不是把接口接通：超时、熔断和未知结果要先设计](/notes/agent-deployment-reliability)

## 资料来源

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
