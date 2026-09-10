---
slug: "tool-a2a-transport"
title: "Agent 之间怎么通信？先把消息信封设计好"
excerpt: "A2A 场景先要说清的不是协议叫什么，而是消息发给谁、谁有权限、版本怎么兼容、重复了怎么办、结果如何回执。把传输层和任务层分开，换队列或网关也不怕。"
series: "工具调用"
seriesNo: "10"
number: "69"
minutes: 21
---

两个 Agent 互相调用时，最容易把“可以发消息”误认为“可以可靠协作”。真正的系统要回答：我在调用谁？对方能做什么？这条消息是否过期？网络重试会不会重复副作用？回复是建议还是承诺？这些问题属于通信边界，不该散落在提示词里。

## 先给一个能复述的答案

把 Agent-to-Agent 设计成两层：传输层负责连接、鉴权、重试、大小限制和事件投递；任务层负责目标、能力、上下文、状态、证据和幂等。先定义稳定 envelope，再把它映射到 HTTP、队列或流式通道。协议名称可以变化，任务合同和可观测字段不能跟着变化。

![Agent-to-Agent 的传输层与任务层分离](/images/notes/tool-a2a-transport/transport-layers.svg)

## 最小 envelope

```json
{
  "envelope_version": "1",
  "message_id": "msg-981",
  "conversation_id": "conv-77",
  "sender": {"id": "router", "tenant": "acme"},
  "receiver": {"id": "billing-agent"},
  "intent": "delegate",
  "capability": "lookup_invoice",
  "payload_ref": "store://payload/981",
  "auth_context": {"scopes": ["invoice:read"]},
  "idempotency_key": "invoice:2026-08:981",
  "expires_at": "2026-08-22T14:10:00Z",
  "reply_to": "queue://agent-events/conv-77"
}
```

大 payload 放引用，避免把整段文档复制到每个 Agent；但引用必须带租户、版本和访问控制。若只把 `payload_ref` 当成公开 URL，权限问题就会被推迟到最危险的地方。

## 能力发现和路由

接收方的能力注册表至少包括：能力名、输入 schema、权限范围、版本、SLO、是否产生副作用。路由器选择能力时要考虑租户、数据位置、当前负载和风险，不是只做字符串匹配。

| 字段 | 例子 | 作用 |
| --- | --- | --- |
| `capability` | `lookup_invoice` | 稳定的任务语义 |
| `schema` | JSON Schema | 参数校验和生成约束 |
| `scopes` | `invoice:read` | 最小权限 |
| `version` | `2.1` | 兼容与灰度 |
| `side_effect` | `none / write` | 是否需要审批 |

## 同步、异步和流式的取舍

| 模式 | 适合 | 主要风险 |
| --- | --- | --- |
| 同步请求 | 短、无副作用查询 | 长任务占用连接 |
| 异步队列 | 长任务、可重试任务 | 状态查询和回执复杂 |
| 流式 | 需要过程反馈 | 背压、乱序、断线 |

任务层的状态机不应依赖某一种传输。无论消息走 HTTP 还是队列，都应该能通过 `message_id + idempotency_key` 查询最终状态。

## 兼容和失败边界

新版本加字段时，接收方可以忽略未知可选字段；改变字段含义或必填约束时必须升版本。常见失败码建议分为：

- `invalid_request`：合同或 schema 不合法；
- `unauthorized`：身份或 scope 不够；
- `unsupported_capability`：没有对应能力；
- `retryable_unavailable`：暂时不可用，可按策略重试；
- `unknown_commit`：副作用状态未知，必须查询；
- `business_rejected`：业务规则拒绝，不应盲目重试。

把所有错误都返回成 500，调用方就无法判断下一步是修参数、换路由还是暂停对账。

![A2A 失败分类与恢复决策](/images/notes/tool-a2a-transport/failure-routing.svg)

## 以“报销 Agent 调用财务 Agent”为例

路由 Agent 只知道用户想查某张发票，不应该把整段会话和所有权限直接转发给财务 Agent。它可以把任务缩成：发票编号、租户、查询能力、截止时间和只读 scope。财务 Agent 返回证据和状态，不返回一个无法验证的“我已经处理好了”。

```json
{
  "intent": "delegate",
  "capability": "invoice.lookup",
  "input": {"invoice_id": "inv-2026-091"},
  "constraints": {"read_only": true, "deadline_ms": 3000},
  "evidence_required": true,
  "reply_mode": "result_or_needs_clarification"
}
```

这层任务合同让接收方不必理解调用方的内部 prompt，也让审计人员能看出“谁委托了什么、在什么权限下完成”。

![消息 envelope 与能力握手](/images/notes/multi-agent-protocol-state/message-envelope.svg)

## 能力发现不是把所有工具广播给所有 Agent

能力注册表可以分为公开元数据和受权详情。公开部分告诉路由器能力名、版本和健康状态；只有在租户、scope 和数据位置校验通过后，才返回输入 schema 和可用实例。能力变化要有生效时间和兼容窗口，避免一个 Agent 刚发现能力就调用了已经撤销的版本。

| 阶段 | 发送方 | 接收方 | 必须记录 |
| --- | --- | --- | --- |
| discover | capability registry | router | 能力、版本、健康、SLO |
| authorize | router | policy service | 租户、scope、数据域 |
| delegate | router | agent | envelope、deadline、幂等键 |
| accept/reject | agent | router | 合同校验、原因、lease |
| complete | agent | event store | 结果、证据、终态 |

![跨 Agent 交接的验收合同](/images/notes/multi-agent-task-decomposition/handoff-acceptance-contract.svg)

## Lease、deadline 和 hop budget 要一起传

只传一个超时时间不够。长任务可能在中间被重新调度，调用环也可能不断延长。建议 envelope 里同时带：

```yaml
deadline_at: 2026-08-22T14:10:00Z
lease_id: lease-981
hop_count: 2
max_hops: 4
remaining_budget:
  model_tokens: 18000
  tool_calls: 6
  wall_ms: 2400
```

接收方接受任务后要续租或明确拒绝；租约过期后不能继续写入。`hop_count` 和父调用链用于识别循环，剩余预算则让下游知道是否还有空间做重试或澄清。

## 版本兼容要测试“行为”，不只是字段

新增可选字段通常可以向后兼容，但能力的语义变化更危险。例如 `invoice.lookup v2` 把“查到发票”改成“查到发票并自动标记”，字段 schema 可能完全没变，副作用却变了。能力版本发布时要做契约回放：旧调用方、旧数据和失败响应都在新实现上跑一遍，并把 side effect 列为硬门槛。

![协议版本与能力版本的兼容矩阵](/images/notes/mcp-protocol-boundaries/compatibility-matrix-card.svg)

## 安全：跨 Agent 不能继承“万能身份”

调用方的用户身份、Agent 的服务身份和目标资源的授权范围要分开。下游只接收完成该任务所需的最小 scope，结果返回时还要重新做租户隔离和证据过滤。不要因为消息来自“可信 Agent”就跳过鉴权；一旦某个 Agent 被提示注入或凭据泄露，万能身份会把事故扩散到所有能力。

![跨 Agent 调用的信任边界](/images/notes/agent-security-boundaries/trust-boundary.svg)

## 故障恢复的三种不同答案

**尚未接受。** 可以换实例或重试，但要使用同一个幂等键。

**已接受但没有终态。** 先查询 lease、事件和业务状态；不能直接重放可能有副作用的请求。

**已完成但回执丢失。** 用 `message_id` 或业务查询补回证据，向上游发送同一个终态，而不是创建第二个任务。

把这三种情况合并成“请求超时”，是 A2A 系统出现重复扣款、重复写入和互相甩锅的常见原因。

## 一个完整交互：发现能力、租约和结果回执

以报销 Agent 调用财务 Agent 为例，推荐把一次调用拆成四个事件，而不是一个长连接：

```text
discover(capability=expense.validate)
  → offer(version=v2, scope=tenant:acme, lease=30s)
  → invoke(message_id=m-017, deadline=3s, idempotency=k-017)
  → result(status=committed|unknown, evidence=receipt-017)
```

发现阶段只返回能力、版本、租户和可接受的输入输出；调用阶段绑定用户和 Agent 身份；结果阶段必须附带业务凭证或未知查询键。这样能力服务升级时，可以先拒绝不兼容的版本，而不会把协议错误伪装成业务失败。

![A2A 能力发现、租约和结果回执的事件链](/images/notes/multi-agent-protocol-state/message-envelope.svg)

## 结果合同要比自然语言更窄

财务 Agent 返回“看起来没问题”并不能让上游继续。建议把结果合同固定成：

| 字段 | 说明 | 缺失时 |
| --- | --- | --- |
| `status` | `accepted/running/committed/unknown/rejected` | 拒绝采纳 |
| `message_id` | 本次消息唯一标识 | 无法去重 |
| `result_version` | 结果版本或业务凭证版本 | 重新查询 |
| `evidence_refs` | 原文、回执或查询地址 | 不允许生成确定结论 |
| `next_action` | 可继续、查询、人工升级 | 进入安全停止 |

`status=committed` 只表示下游已完成它的合同，不代表上游已经把结果写入自己的状态。上游仍要用 CAS 或版本检查采纳结果，避免旧消息覆盖新状态。

## Lease、deadline 和 hop budget 的关系

一个多 Agent 请求可能跨过多个服务。租约控制责任归属，deadline 控制时间，hop budget 控制链路深度，三者不能只传一个超时数字：

$$
deadline_{child}=\min(deadline_{parent}-network\_reserve, now+lease)
$$

```yaml
delegation_budget:
  deadline_ms: 3000
  network_reserve_ms: 250
  lease_ms: 1200
  max_hops: 3
  max_messages: 8
  on_exhausted: "return unknown_or_handoff"
```

如果 child 的 lease 已过期，parent 不能因为自己还有时间就继续要求执行；否则下游可能在上游已经回退之后产生迟到副作用。

![跨 Agent 的期限、租约与跳数预算](/images/notes/multi-agent-task-decomposition/handoff-acceptance-contract.svg)

## 兼容性测试要覆盖行为

字段兼容只是第一关。更容易出事故的是旧客户端仍能发送，但新服务对状态、错误码或未知字段的理解发生变化。可以维护一张行为矩阵：

```yaml
compatibility_tests:
  - client: v1
    server: v2
    case: unknown_required_capability
    expect: reject_with_capability_mismatch
  - client: v1
    server: v2
    case: duplicate_message
    expect: same_result_same_receipt
  - client: v2
    server: v1
    case: extra_optional_field
    expect: ignore_and_process
  - client: v2
    server: v1
    case: unknown_status
    expect: safe_stop
```

每个版本都要有 replay fixture，特别是 `unknown`、延迟到达和重复结果。协议升级不能只跑 schema validator。

![协议字段与行为兼容的矩阵](/images/notes/mcp-protocol-boundaries/compatibility-matrix-card.svg)

## 安全授权要跟着每一跳走

下游收到的不应是“用户拥有所有权限”，而是一张有范围、有期限的授权票据：

```json
{
  "subject": "finance-agent",
  "on_behalf_of": "user-19",
  "tenant": "acme",
  "scopes": ["expense.read"],
  "resources": ["claim:2026-018"],
  "expires_at": "2026-08-22T10:30:00Z",
  "delegation_depth": 1
}
```

每次再委派都要减少 scope 或增加明确的审批，不能无限继承。发生提示注入或凭据泄露时，最小授权能把事故限制在一条任务链，而不是整个 Agent 网络。

## 重试矩阵：按失败阶段决定谁可以重试

A2A 调用不能套一个“失败就重试”的通用策略。发现阶段失败可以换能力提供方；执行阶段超时要先查询状态；结果校验失败可以要求补充字段，但不能重复提交副作用：

| 失败阶段 | 可重试者 | 重试条件 | 用户状态 |
| --- | --- | --- | --- |
| discover | 路由器 | 能力版本仍满足约束 | 继续处理中 |
| accept | 上游 Agent | 未生成执行凭证 | 等待接单 |
| invoke | 下游 Agent | 幂等键未落账 | 处理中 |
| result | 结果合并器 | 只读且证据可补齐 | 正在核对 |
| commit | 人工/业务系统 | 外部状态已确认 | 不自动重复 |

每个 retry 都要带同一个 `task_id` 和 `idempotency_key`，并在 trace 中记录“为什么允许这一次重试”。这条记录既方便排查，也能防止多个 Agent 同时把同一个超时当成自己的重试机会。

## 可观测性要跨越调用边界

上游的 trace 不能在下游重新生成一条孤立链路。至少透传 `trace_id`、`parent_span_id`、`task_id`、租户和协议版本；下游再补充自己的能力、模型和工具字段。跨 Agent 的耗时可以拆成发现、排队、执行、回执和合并五段，才能定位到底是网络慢还是下游排队。

## 高频追问

**L1：Agent 间调用和普通 API 有什么不同？**

传输上可以复用 API 基础设施，但任务结果通常是异步、分阶段且带证据的；需要额外的能力、状态和交接合同。

**L2：为什么要把 payload 放引用？**

可以减少复制和泄漏风险，统一版本与权限；但引用服务必须支持鉴权、过期和审计。

**L2：协议版本和能力版本怎么区分？**

协议版本描述 envelope 的结构，能力版本描述某个任务输入输出与行为。两者独立演进，不能用一个版本号掩盖所有变化。

**L3：调用方收到超时怎么做？**

先查 `message_id` 或幂等键对应的状态；只有确认未执行且错误可重试时才重发。

**L5：如何防止 Agent 之间形成调用环？**

在 envelope 记录 hop count、父调用链和总 deadline；路由器对重复路径和预算耗尽直接拒绝或升级。

## 60 秒面试回答

我会把 A2A 分成传输层和任务层。传输层处理连接、鉴权、大小、重试和事件投递，任务层定义目标、能力、输入 schema、权限、状态、证据和幂等键。先固定 envelope，再映射到同步 API、队列或流式通道。错误要区分参数、权限、暂不可用、业务拒绝和未知副作用，超时先查状态而不是盲目重放；所有消息带 trace、版本和 hop budget，避免调用环。

## 自检清单

- [ ] 能画出传输层与任务层的边界
- [ ] envelope 有身份、能力、版本、scope、幂等和过期
- [ ] 失败码能指导下一步动作
- [ ] 有调用环、超时和跨租户访问的防护

## 相关阅读

- [工具调用契约：先定义输入输出](/notes/tool-function-contract)
- [多智能体交接合同](/notes/agent-handoff-contract)
- [MCP 边界：协议接入不等于权限放开](/notes/mcp-protocol-boundaries)

## 资料来源

- 《Agent 岗面试宝典 v3 · 精华版》（本地飞书资料整理）
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
