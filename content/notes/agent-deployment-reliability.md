---
slug: "agent-deployment-reliability"
title: "Agent 上线不是把接口接通：超时、熔断和未知结果要先设计"
excerpt: "Agent 的线上故障很少是模型单点崩溃，更多是工具超时、重复副作用、上下文膨胀和版本漂移叠在一起。可靠部署要先画状态和故障边界，再谈扩容。"
series: "Agent 架构"
seriesNo: "06"
number: "63"
minutes: 24
---

一个退款 Agent 在压测时表现正常，上线后却出现“用户收到两次退款”的投诉。日志里每次请求都只有一次调用，直到工程师查到网关：第一次请求其实已经到达支付系统，只是响应超时，Agent 把它当成失败又重试了一次。

## 先给一个能复述的答案

Agent 可靠性要把**可重试、不可重试、未知结果和需要人工接管**分开设计。部署前先确定每个外部动作的超时、幂等键、重试上限、熔断条件和对账方式；上线后用 trace、队列、版本指纹和回放定位问题。扩容只能提高吞吐，不能自动消除副作用和状态不一致。

![Agent 生产运行的请求、工具和恢复边界](/images/notes/agent-deployment-reliability/reliability-layers.svg)

## 先画状态，而不是先加重试

对外部动作，至少需要四种结果：

| 结果 | 含义 | 下一步 |
| --- | --- | --- |
| confirmed_success | 已拿到成功回执 | 写入状态，继续或完成 |
| confirmed_failure | 明确没有副作用 | 按错误类型重试或回退 |
| unknown | 可能已产生副作用 | 对账查询，不直接重试 |
| blocked | 被权限、预算或熔断拦截 | 转人工或给出可解释失败 |

“请求超时”只是网络层现象，不等于业务层失败。把所有非 2xx 都归成失败，是重复副作用的起点。

## 超时预算要沿链路分配

一次 Agent 任务可能经历网关、编排器、模型、检索和多个工具。总超时应该被拆给每一层：

$$
T_{deadline}=T_{queue}+T_{model}+\sum_{i=1}^{n}T_{tool_i}+T_{reserve}
$$

如果每个工具都拿到完整的请求超时，最后一个工具会在用户已经不耐烦后才返回。剩余预算应该进入状态，让策略知道什么时候停止探索、先返回部分结果或升级人工。

## 重试规则：按错误和副作用分类

```yaml
retry_policy:
  timeout_before_send: retry
  timeout_after_send: unknown_then_reconcile
  invalid_argument: no_retry
  rate_limit: retry_with_backoff
  permission_denied: no_retry_and_audit
  provider_5xx_read_only: retry_once
  provider_5xx_write: unknown_then_reconcile
```

退避只是实现细节。真正重要的是判断请求是否可能已被外部系统接受，以及有没有稳定的幂等键。

![从超时到重试、对账或人工接管的决策路径](/images/notes/agent-deployment-reliability/recovery-path.svg)

## 幂等键不能只在 Agent 层生成

如果幂等键在每次重试时重新生成，外部系统看到的就是两个不同请求。一个可用的键应由任务、动作和业务对象共同决定：

```python
import hashlib

def idempotency_key(run_id: str, action: str, resource_id: str) -> str:
    raw = f"{run_id}:{action}:{resource_id}".encode()
    return hashlib.sha256(raw).hexdigest()[:32]
```

对于跨进程、跨队列的重试，键和请求体摘要都要落在可查询的 ledger 中；否则即使外部服务支持幂等，也无法解释哪个尝试最终生效。

## 熔断与降级

Agent 的“继续尝试”会放大故障。熔断器至少要按工具和租户隔离，记录打开原因和恢复时间。降级也不能只返回“系统繁忙”，可以根据任务类型选择：

1. 只读查询：返回最近一次可信缓存，并标明时间；
2. 低风险生成：缩短上下文，换更快模型；
3. 高风险写入：暂停执行，提供人工处理入口；
4. 证据不足：明确告诉用户缺哪份材料，而不是编造结论。

## 可观测性要看四条线

| 线索 | 需要记录的字段 | 解决的问题 |
| --- | --- | --- |
| 请求线 | run_id、tenant、deadline、版本 | 一次任务经过了什么链路 |
| 决策线 | 状态摘要、候选动作、策略版本 | 为什么选了这一步 |
| 工具线 | request_id、幂等键、回执、耗时 | 是否产生副作用 |
| 结果线 | 终态、证据、成本、人工接管 | 是否真的完成 |

不要把完整 Prompt 和敏感数据无差别打进日志。可以保留哈希、结构化摘要和可授权回查的引用，让排障和隐私边界同时成立。

## 生产回放：先复现环境，再重放动作

回放 Agent 运行时，不要直接重新执行真实写入。正确顺序是：

1. 读取当时的模型、工具 schema、知识库和系统时间指纹；
2. 用录制的工具回执替代外部真实调用；
3. 只在沙箱里重放模型决策和状态转移；
4. 如果需要真实修复，先生成 dry-run 计划，再经过审批。

这样可以复现“为什么当时选错”，而不是再制造一次副作用。

## 健康检查不只看进程活着

Agent 服务的 readiness 应该包含模型、工具注册、策略版本和关键数据源状态。一个进程返回 200，但工具 schema 已经落后，也不应该接收新任务。

```yaml
readiness:
  api: ok
  model_route: model-x@2026-08-18
  tool_registry: registry@r42
  policy_bundle: policy@p17
  retrieval_index: index@2026-08-22T08:00Z
  write_mode: guarded
```

版本指纹让灰度和事故回滚有依据。否则“同一个版本”可能只是同一个镜像 tag，内部数据和工具协议已经变了。

## 一次线上事故的时间线：超时不等于失败

把退款 Agent 的事故压缩成四个时间点，面试时就能说清楚为什么“重试”不是默认答案：

| 时间 | 事件 | 服务看到的状态 |
| --- | --- | --- |
| T0 | Agent 发送退款请求，带 `refund_id` | `running` |
| T1 | 支付服务已落库，但响应在网关超时 | Agent 看到 `timeout` |
| T2 | Agent 按通用策略再次发送 | 若没有幂等，产生重复副作用 |
| T3 | 对账发现同一订单两条退款 | 只能人工追回或补偿 |

正确做法是让支付服务按 `refund_id` 提供查询接口。T1 之后先进入 `unknown`，查询到已成功就提交；查询不到才在可证明安全的条件下重试。错误信息和用户文案都要区分“未执行”“执行失败”“结果未知”，不能都写成“请稍后再试”。

![未知结果、查询和对账组成的可靠性回路](/images/notes/tool-retry-policy/reconcile-receipt.svg)

## SLI/SLO 要覆盖结果和过程

只看“请求成功率”会漏掉很多 Agent 特有问题。建议至少维护一张切片表：

| 指标 | 定义 | 示例门槛 | 触发动作 |
| --- | --- | --- | --- |
| 任务成功率 | 达到业务完成条件的任务 / 总任务 | ≥ 95% | 看失败类型切片 |
| 引用完整率 | 结论有对应证据的比例 | ≥ 92% | 降低自动回答范围 |
| 工具超时率 | 工具超时 / 工具调用 | ≤ 1% | 熔断或切备用 |
| 未知结果率 | 进入 `unknown` 的副作用请求 | ≤ 0.2% | 强制对账 |
| 重复副作用率 | 同一幂等键产生多次提交 | 0 | 立即停写 |
| P95 | 从接收任务到首个可用结果 | ≤ 3s | 缩短上下文/异步化 |

指标还要按租户、工具、模型版本、任务类型和发布批次切片。全局成功率 99% 可能掩盖某个高风险工具的 10% 未知结果。

![Agent 可靠性指标从运行轨迹到发布门禁](/images/notes/agent-observability-replay/replay-contract.svg)

## 失败注入要模拟真实的“半成功”

演练不只关掉服务，还要主动制造回执丢失、重复事件和版本漂移：

```yaml
fault_injection:
  - case: response_lost_after_commit
    tool: payment.refund
    expected: unknown_then_reconcile
  - case: duplicate_event
    tool: ticket.create
    expected: idempotent_single_commit
  - case: stale_policy_version
    tool: policy.search
    expected: reject_old_evidence
  - case: stream_disconnect
    tool: report.export
    expected: resume_or_artifact_lookup
checks:
  - no_duplicate_side_effect
  - terminal_state_is_recoverable
  - user_message_matches_state
```

如果只做“服务返回 500”的演练，系统很容易在真正的半成功场景里继续重试。每次演练都应留下 `trace_id`、状态迁移、幂等查询和最终对账结果，下一轮才能复现。

## Outbox、幂等键和回执账本

对于需要写入外部系统的动作，可以把“准备提交”和“发送请求”拆开：

```python
def commit_once(store, gateway, action):
    receipt = store.find_receipt(action.idempotency_key)
    if receipt and receipt.status in {"committed", "reconciled"}:
        return receipt
    store.append_outbox(action.idempotency_key, action.payload)
    try:
        result = gateway.execute(action.payload, idempotency_key=action.idempotency_key)
    except TimeoutError:
        store.mark_unknown(action.idempotency_key)
        return {"status": "unknown"}
    store.save_receipt(action.idempotency_key, result)
    return result
```

`outbox` 不是保证外部系统一定成功，而是保证本地有一份待发送记录；`receipt` 则让重试、查询和对账沿同一个键收敛。对不能提供幂等接口的第三方，要把动作放到人工确认或可撤销队列中。

## 发布与回滚：把模型版本也当作依赖

Agent 的可靠性不仅受代码影响，还受模型、Prompt、检索器和工具 schema 影响。可以把一次发布打成可回退的 bundle：

```yaml
bundle: agent-support-2026-08-22.3
model: route-small@2026-08-18
prompt: support-v17
retriever: hybrid-v9
tool_schema: payment-v4
gates:
  shadow_unknown_rate: "<= 0.003"
  citation_coverage: ">= 0.92"
  p95_ms: "<= 3000"
rollback_to: agent-support-2026-08-22.2
```

先跑影子流量，再做小租户灰度；若未知结果、重复副作用或引用覆盖越过门槛，回滚整套 bundle，而不是只换模型让问题更难复现。

![线上漂移、灰度和回滚的发布路径](/images/notes/offline-eval-online-drift/drift-triage.svg)

## 用户侧的失败文案也要和状态匹配

| 内部状态 | 用户应该知道什么 | 可继续动作 |
| --- | --- | --- |
| `failed_before_execute` | 请求还没有执行 | 修改参数后重试 |
| `failed_after_validate` | 参数或权限不满足 | 补充信息/申请权限 |
| `unknown` | 系统正在确认是否已执行 | 等待查询或人工对账 |
| `committed` | 已完成，返回凭证 | 查看详情或撤销 |

如果内部已经是 `unknown`，界面却显示“失败，可再次提交”，用户就会亲手触发重复副作用。可靠性最终要落到用户看见的下一步。

## 事故复盘不要只写“模型不稳定”

一次 Agent 事故复盘至少应按时间线回答：请求输入是什么、当时采用了哪个策略版本、工具有没有收到请求、回执是否落库、状态何时变成 `unknown`、谁批准了重试、最终如何对账。可以用五列记录：

| 时间 | 状态 | 证据 | 动作 | 下一步 |
| --- | --- | --- | --- | --- |
| 10:01:02 | executing | request hash | payment.refund | 等回执 |
| 10:01:05 | unknown | gateway timeout | 禁止重试 | 查询 refund_id |
| 10:01:07 | reconciled | receipt-18 | 提交终态 | 通知用户 |

如果“模型输出了错误解释”只是最后一行，修复重点应放在状态、回执和文案，而不是盲目换模型。

![故障归因、回放和修复动作的链路](/images/notes/agent-observability-replay/failure-attribution.svg)

## 重试策略必须知道动作类型

```yaml
retry_policy:
  read:
    max_attempts: 2
    backoff_ms: [100, 500]
  idempotent_write:
    max_attempts: 1
    after_timeout: reconcile
  non_idempotent_write:
    max_attempts: 0
    after_timeout: human_review
  model_only:
    max_attempts: 1
    preserve: [state, evidence, budget]
```

对模型调用重试也要注意上下文和预算：如果第一次已经调用了昂贵工具，第二次不应再次执行同一副作用动作，而是复用回执或从状态继续。

## 线上观测要留出“未知”仪表盘

运营看板建议单独显示 `unknown` 数量、平均对账时长、未对账年龄、涉及工具和租户。把它们混进失败率会让团队误以为“重试就能解决”。当未知任务超过阈值时，可以自动暂停该工具的写能力，只保留查询和人工入口。

```yaml
unknown_watch:
  alert_if: "count_5m > 20 or oldest_age_min > 10"
  action: [pause_write, notify_owner, open_reconcile_queue]
  exempt: [sandbox, dry_run]
```

## 高频追问

**L1：Agent 线上最常见的可靠性问题是什么？**

超时导致的未知结果、重复副作用、上下文膨胀、工具版本漂移和无法回放。它们通常不是单个模型错误，而是状态和外部系统边界没设计好。

**L2：超时后为什么不能直接重试？**

因为请求可能已经到达外部系统并成功，只是回执丢了。先判断动作是否有副作用；不确定时应带幂等键查询或对账。

**L2：熔断之后 Agent 应该怎么办？**

根据任务风险返回缓存、切换只读路径、缩短任务或升级人工，并把熔断原因写入终态。不能让模型继续盲试同一个坏工具。

**L3：如何做 Agent 灰度？**

按租户、任务类型和工具风险切分，锁定模型、Prompt、工具 schema、索引和策略版本，观察成功、未知结果、P95、成本和人工接管，再逐步扩大。

**L3：怎么验证恢复逻辑真的有效？**

在沙箱注入超时、断连、重复回执、版本不兼容和未知结果，检查状态终态、ledger、告警和回放是否一致。

**L5：高并发时首先扩哪里？**

先看瓶颈是模型、工具、队列还是状态存储；对昂贵工具做并发预算和租户隔离，对模型请求做路由和缓存。盲目增加 Agent 副本可能放大外部副作用。

## 60 秒面试回答

我会把 Agent 线上可靠性拆成状态、超时、幂等、恢复和观测五部分。每个工具先定义请求是否可能产生副作用、超时后的结果分类、重试上限和对账方式；写操作使用稳定的任务级幂等键，未知结果不能直接重试。总 deadline 要沿队列、模型和工具链路分配，剩余预算进入 Agent 状态。上线时记录 run、决策、工具回执和终态的结构化 trace，按租户和任务类型灰度，并用沙箱故障注入验证熔断、降级和回放。这样扩容只是容量手段，状态和副作用仍然可解释。

## 自检清单

- [ ] 能区分明确失败和未知结果
- [ ] 每个写操作都有稳定幂等键和对账路径
- [ ] deadline 会沿链路分配并进入状态
- [ ] 熔断、降级和人工接管有可解释终态
- [ ] 有版本指纹、结构化 trace 和沙箱故障注入

## 相关阅读

- [工具调用失败后如何恢复](/notes/tool-retry-policy)
- [Code Agent 的 exactly-once 恢复](/notes/code-agent-resume-exactly-once)
- [一次实验怎样算可复现](/notes/agent-eval-reproducibility)

## 资料来源

- 《Agent 岗面试宝典 v3 · 精华版》（本地飞书资料整理）
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)：把面试追问落到可运行、可复盘的实现
