---
slug: "tool-retry-policy"
title: "工具调用失败后，Agent 该重试、换工具还是停下？"
excerpt: "失败不是一个简单的真假值。先判断请求有没有到达、外部副作用是否未知、参数有没有问题，再决定重试、换工具、回退还是转人工。"
series: "工具调用"
seriesNo: "10"
number: "45"
minutes: 24
---

一个排班 Agent 调用“改班接口”后等了 10 秒，客户端显示超时。值班同学正准备重试，数据库却告诉他：第一次请求已经成功。第二次重试，把同一个员工改到了另一个班次。

这类事故的根因不是“重试次数太多”，而是系统没有区分**没执行、执行失败、执行结果未知**。Agent 遇到工具异常，第一步是判断状态，再谈补救。

## 先给一个能复述的答案

工具失败处理要先按错误分类：参数或权限错误不重试；可证明未提交的瞬时网络错误可以带幂等键退避重试；超时且有副作用的请求属于未知结果，必须先对账；工具本身不可用时才考虑降级或换工具。每次尝试都写入状态机，重试预算、熔断、人工升级和最终对账要由应用层控制，不能让模型自由决定“再试一次”。

![工具失败从分类、对账到恢复动作的决策路径](/images/notes/tool-retry-policy/retry-decision.svg)

图 1：重试是最后一步，先问清楚副作用是否已经发生。

## 一、先确认请求走到了哪一层

一条工具调用至少经过客户端、网关、工具服务和外部系统。错误发生在哪一层，处理方式完全不同：

| 位置 | 例子 | 默认动作 |
| --- | --- | --- |
| 解析层 | JSON 不合法、字段缺失 | 修正参数或澄清，不重试 |
| 权限层 | scope 不足、审批过期 | 拒绝或申请权限 |
| 路由层 | 服务发现失败、连接被拒 | 有预算地退避重试 |
| 执行层 | 外部系统返回 500 | 查幂等状态后再决定 |
| 回执层 | 已提交但响应丢失 | 对账，禁止盲目重放 |

不要把所有 5xx 都当成“没成功”。数据库可能已经提交，响应只是还没回来。

## 二、一个够用的失败状态机

把调用状态写成显式状态，而不是靠聊天记录猜：

```text
READY
  └─ dispatch → SENT
SENT
  ├─ accepted → COMMITTED
  ├─ rejected → FAILED_PERMANENT
  ├─ transport_error_before_send → RETRYABLE
  └─ timeout_after_send → UNKNOWN
UNKNOWN
  ├─ query_status → COMMITTED
  ├─ query_status → NOT_COMMITTED → RETRYABLE
  └─ query_status → STILL_UNKNOWN → HUMAN_REVIEW
```

![调用状态机：SENT 之后要区分已提交、永久失败、可重试和未知](/images/notes/tool-retry-policy/state-machine.svg)

图 2：未知结果单独成态，避免被误判成失败。

每个状态要记录 `attempt_id`、幂等键、发送时间、外部 request_id 和最后一次回执。状态迁移只允许沿着定义过的边走，不能因为模型一句“再试试”从 `COMMITTED` 回到 `SENT`。

## 三、四种错误，四套处理

### 1. 参数错误：停止并问清楚

`amount_exceeds_balance`、日期格式错误、资源不存在，都说明这次请求本身不成立。重试同样的参数只会浪费预算；应该把错误翻译成用户能回答的问题。

### 2. 瞬时错误：指数退避加抖动

连接被重置、限流、服务暂时不可用，可以在有限预算内重试：

```python
delay = min(base * (2 ** attempt), max_delay)
delay = delay * (0.8 + random.random() * 0.4)
sleep(delay)
```

重试必须带相同的 `idempotency_key`，并设置总时间、最大次数和熔断阈值。指数退避不解决业务重复，只解决短暂拥堵。

### 3. 未知结果：先查询再行动

超时发生在请求发出之后时，先用查询接口按 request_id 或幂等键对账。如果查询接口也不可用，状态就是 `STILL_UNKNOWN`，应该暂停并转人工，而不是换一套参数继续撞。

### 4. 工具能力不足：换工具要重新验收

备用工具不是“同名函数”。它可能返回不同字段、权限范围和一致性语义。切换前要验证输入映射、结果等价性和副作用，否则只是把一个不确定性搬到另一个接口。

## 四、重试预算应该按任务算

全局“最多重试三次”很粗糙。查询订单和发起转账的风险不同，可以给任务定义预算：

```json
{
  "task_id": "schedule_042",
  "max_attempts": 3,
  "max_elapsed_ms": 8000,
  "write_retry": 1,
  "unknown_policy": "reconcile_then_human",
  "fallback": "read_only_summary"
}
```

预算用完要留下明确结果：`retry_exhausted`、`human_review_required` 或 `degraded_read_only`。不要让 Agent 在预算耗尽后继续生成一段“我再试一次”。

![重试预算按任务、工具副作用和状态未知程度分层](/images/notes/tool-retry-policy/retry-budget.svg)

图 3：读操作可以更激进，写操作要把未知结果当成风险。

## 五、如何保证恢复不重复副作用

幂等键不是把请求 ID 换个名字。服务端要真正保存键和结果：

```python
def execute_once(command):
    old = idempotency_store.get(command.key)
    if old:
        return old.result
    result = external_api.send(command.payload)
    idempotency_store.put(command.key, result)
    return result
```

如果“外部调用成功”和“保存幂等记录”之间进程崩溃，仍然会有窗口。高风险系统需要让外部系统原生支持幂等，或用 request_id 查询完成对账；仅靠本地字典不够。

## 六、熔断不是把问题藏起来

连续失败达到阈值后进入 `OPEN`，短时间内拒绝新请求；过一段时间进入 `HALF_OPEN`，用少量探测请求判断是否恢复。熔断期间仍要给用户可解释的降级结果，并记录被拒绝的任务，方便恢复后补偿。

```text
错误率高 → OPEN（保护依赖）
             ↓ 冷却时间
          HALF_OPEN（少量探测）
        ↙ 成功        ↘ 失败
      CLOSED          OPEN
```

熔断保护的是系统，不是让错误凭空消失。监控里要能看到请求被熔断、转人工和最终补偿情况。

## 七、重试、换工具和降级要有决策矩阵

不要把“重试”当成唯一恢复动作。可以把错误状态、外部副作用和备用能力放进一张矩阵，由应用层决定动作：

| 现象 | 副作用状态 | 首选动作 | 禁止动作 |
| --- | --- | --- | --- |
| 连接前失败 | 未发送 | 有预算退避重试 | 无限重试 |
| 参数/权限拒绝 | 未执行 | 澄清或申请权限 | 重试同一参数 |
| 发送后超时 | 未知 | 按幂等键对账 | 盲目重放 |
| 依赖持续 5xx | 未知或失败 | 熔断、读降级、转人工 | 立刻切备用写工具 |
| 备用工具语义不同 | 不确定 | 重新做能力验收 | 只按同名替换 |

换工具前至少检查输入字段映射、数据新鲜度、权限范围、结果等价性和副作用语义。搜索接口可以换成缓存，但扣款接口不能因为“看起来类似”就切到另一个写接口。

![重试、对账、换工具和降级由错误状态与副作用共同决定](/images/notes/tool-retry-policy/fallback-compensation.svg)

图 4：同一个“超时”在读操作和写操作上，恢复动作可能完全不同。

## 八、幂等不够时，要设计补偿事务

幂等键能避免同一个 command 被重复提交，但不能解决跨系统的半成功。例如订单状态改成功，积分扣减失败，Agent 不能简单把订单改回原状态。需要把步骤写成可观察的 saga：每一步有 forward action、compensation action 和人工兜底。

```text
创建退款申请 → 锁定可退余额 → 通知财务
      │              │              │
      └─撤销申请     └─释放锁       └─补发通知/人工确认
```

补偿动作也可能失败，所以状态里要区分 `COMPENSATING`、`COMPENSATED` 和 `COMPENSATION_FAILED`。面试时说“失败就回滚”不够，真正要解释的是回滚由谁触发、是否幂等、失败后谁接手。

## 九、熔断、限流与队列要一起看

单纯增加重试会把一个故障依赖压得更垮。调用层应同时控制并发数、每租户速率、全局预算和队列长度：

```python
if circuit.open(tool) or budget.exhausted(task):
    return degrade("read_only_summary")
if not rate_limiter.allow(ctx.tenant, tool):
    return tool_error("rate_limited", retryable=True)
job = queue.enqueue(command, dedupe_key=command.idempotency_key)
return accepted(job.id)
```

排队后返回 `accepted` 不等于业务完成。用户界面要显示处理中，后台 worker 继续写状态机，完成或失败时再回填真实回执。这样模型不会把异步受理说成“已经退款”。

## 十、多个工具串联时如何处理部分成功

多工具轨迹最容易出现“前两步成功，第三步失败”。每一步都要写依赖、输出和补偿策略，并把后续工具是否允许执行写进状态机：

| 步骤 | 结果 | 下一步 |
| --- | --- | --- |
| 查库存 | 成功 | 允许创建订单 |
| 创建订单 | 成功 | 允许支付或等待确认 |
| 支付 | UNKNOWN | 先查支付状态 |
| 发货 | 禁止 | 等支付状态明确 |

遇到部分成功时，回答要列出已确认事实、未知事实和下一次动作，而不是用一句“流程失败”抹平差异。

## 十一、为每次恢复保留 trace 和重放入口

```json
{
  "task_id": "refund_042",
  "attempts": [
    {"n": 1, "state": "UNKNOWN", "request_id": "req_7"},
    {"n": 2, "state": "COMMITTED", "source": "reconcile"}
  ],
  "budget": {"used": 2, "max": 3},
  "operator_action": null
}
```

重放入口默认是 dry-run，先展示将要查询或补偿的资源、策略和幂等键，再由有权限的人确认。任何恢复脚本都不能通过“删掉旧状态”来重新获得执行机会。

## 十二、分层题库：从错误分类到故障演练

### L1：什么时候该重试工具调用？

先确认错误属于可恢复瞬时故障，且请求没有产生未知副作用；再带幂等键、退避和预算重试。参数、权限和业务状态错误不重试。

### L2：超时了怎么知道有没有成功？

不能靠模型猜。使用幂等键、外部 request_id 或查询接口对账；在结果仍未知时进入人工审核，禁止盲目重放写操作。

### L3：换一个工具就能恢复吗？

不一定。备用工具要重新验证输入映射、权限、结果语义和副作用等价性；如果只是返回格式不同，仍要经过同一验收器。

### L1：哪些错误绝对不应该自动重试？

参数校验失败、权限不足、资源不存在和业务状态冲突通常不应重试；它们需要澄清、申请权限或刷新状态。

### L1：指数退避解决了什么，解决不了什么？

它能缓解短暂网络拥堵和限流，不能保证业务幂等，也不能判断请求是否已经产生副作用。

### L1：为什么要把 UNKNOWN 单独建模？

因为“没收到回执”不等于“没执行”。单独建模才能触发对账、暂停后续写操作和人工接管。

### L2：重试预算应该按什么维度分配？

按任务风险、工具副作用、租户配额、总耗时和错误类型分配；读操作可以更宽，写操作要严格限制未知结果重放。

### L2：什么时候应该换备用工具？

原工具持续不可用且备用工具通过能力、权限、数据新鲜度和副作用等价性验收时才切换；不能仅按函数名相似判断。

### L2：异步队列返回 accepted 后，Agent 应该怎么说？

只能说“已受理、正在处理”，给出 job_id 和查询入口；只有收到外部系统确认回执后才可以说完成。

### L2：部分成功时如何避免后续工具继续执行？

每一步写显式前置状态和依赖条件；支付 UNKNOWN 时禁止发货，必须先完成对账或进入人工队列。

### L3：如何设计一套补偿事务？

为每个正向动作定义幂等补偿动作，记录 saga 状态和重试预算；补偿失败进入人工任务，保留原始 request_id 和资源版本。

### L3：怎样做故障演练才能证明恢复策略有效？

注入连接前失败、发送后超时、重复回执、限流、依赖 5xx 和队列积压，检查状态机、幂等、熔断、降级、审计和用户文案是否一致。

### L3：如何判断“重试成功”是不是假成功？

必须把最终状态与外部查询接口或签名回执绑定，不能只看 HTTP 200；对账结果、资源版本和幂等记录要能互相印证。

## 给每次重试发一张恢复决策卡

重试策略最怕“凭感觉再试一次”。把错误类别、发送阶段、幂等证明和下一步动作固定下来，执行器才能保持一致：

```yaml
request_id: refund_042
error: timeout_after_send
phase: sent
side_effect: unknown
idempotency_key: refund_042
budget: 1_of_3
decision: reconcile_first
fallback:
  - query_provider_status
  - if_unknown: human_review
forbidden: blind_replay
```

读请求在确认未发送时可以退避重试；写请求在发送后超时，先对账，只有外部明确失败且幂等键仍有效才允许补偿。决策卡让日志、用户文案和状态机说同一种语言，也能把一次事故直接变成回归样本。

![重试恢复决策卡把错误阶段、未知副作用、预算、对账和禁止动作固定下来](/images/notes/tool-retry-policy/retry-recovery-card.svg)

## UNKNOWN 状态要有一张对账回执

`UNKNOWN` 不是“失败但再试一次”，而是外部世界可能已经发生变化。恢复器应该先发对账回执，证明查到了什么、仍然缺什么，以及哪些动作被明确禁止：

```yaml
reconcile_receipt: rec_20260820_22
request_id: refund_042
observed: sent_timeout
provider_query:
  status: pending
  provider_ref: p-881
  checked_at: 2026-08-20T18:50:00Z
local_state: UNKNOWN
forbidden: [blind_replay, duplicate_refund]
next:
  - wait_for_callback
  - if_deadline_exceeded: human_review
evidence: [request-log-42, provider-response-19]
```

本地状态只有在外部查询、签名回执或幂等记录互相印证后才能进入 `COMMITTED` 或 `FAILED`。如果供应商仍返回 `pending`，用户文案必须说“正在确认”，不能说“退款失败”或“已完成”。对账回执也应进入回放集，后续故障演练要验证同一状态不会触发重复写。

![UNKNOWN 对账回执把外部状态、禁止动作、下一步和证据固定下来](/images/notes/tool-retry-policy/reconcile-receipt.svg)

## 对账成功后还要做一次“重复提交探针”

查到供应商状态并不代表本地幂等链路没有漏洞。实际事故里，第一次请求已经成功，状态查询也返回 `COMMITTED`，但重试入口仍可能在读到旧缓存后再次提交。对账结束后，我会用原来的幂等键做一次受控的 duplicate probe，并同时看业务账本和幂等记录，确认第二次请求没有新增效果。

~~~yaml
duplicate_probe_receipt: dpr_20260820_33
tool: refund.create
operation: order-8848
idempotency_key: refund-order-8848-v3
probes:
  first: COMMITTED
  second: IDEMPOTENT_REPLAY
  downstream_audit: one_effect
expected_effects: 1
observed_effects: 1
decision: retry_path_safe
~~~

探针必须在隔离订单或可撤销的测试租户上执行，不能拿真实退款做实验。若第二次请求返回新的业务单号、账本出现两笔写入，或者幂等键没有进入供应商的审计链，就把重试路径标成不安全，立即关闭自动重放并补上供应商侧去重。这个步骤把“理论上幂等”变成“同一请求真的只产生一次效果”。

![重复提交探针：同一幂等键经过重放仍只留下一个业务效果](/images/notes/tool-retry-policy/duplicate-probe-card.svg)

### L5：为什么最终状态查询通过了，还要重放一次相同请求？

因为状态查询只证明某一次请求的结果，不证明所有入口都遵守同一幂等键。受控重放能验证缓存、队列、SDK 和供应商四层是否真的共享去重语义。

### L5：为什么 UNKNOWN 状态必须让用户看见？

因为隐藏 UNKNOWN 会让用户重复提交，也会让系统误把可能成功的写操作当失败重放。用户不需要内部日志，但需要知道当前正在确认、预计下一步和是否应该停止重复操作。

## 重试策略要按“副作用阶段”切开

“网络错误就重试”这个规则太粗。一次调用在发送前、发送中、发送后，风险完全不同：发送前通常没有外部副作用，发送后超时则可能已经写成功。恢复器应该把阶段写入回执，并为每个阶段指定允许动作：

~~~yaml
retry_stage_policy: rsp_20260820_41
tool: order.create
stages:
  before_send:
    examples: [validation_failed, connection_not_opened]
    action: fail_or_retry_with_budget
  during_send:
    examples: [socket_reset, gateway_timeout]
    action: query_request_status_first
  after_response:
    examples: [local_commit_failed]
    action: reconcile_then_resume_local_commit
hard_stop:
  - provider_ref_missing_after_send
  - idempotency_scope_mismatch
  - permission_changed
decision: no_blind_replay
~~~

阶段判断不能只靠异常字符串，最好由客户端记录“是否拿到 provider request_id、是否写入本地 outbox、是否收到业务回执”等事实。遇到分类不确定时，宁可进入 UNKNOWN 和人工对账，也不要把未知阶段当作发送前错误。这样重试策略虽然多几条分支，却能把最危险的重复副作用挡在恢复器之外。

![重试阶段策略：发送前、发送中、回执后分别决定重试、对账或停止](/images/notes/tool-retry-policy/retry-stage-policy-card.svg)

### L5：为什么异常类型不够用来决定是否重试？

同一个 timeout 可能发生在连接尚未建立，也可能发生在供应商已完成写入之后。重试决策要结合发送阶段、request_id、outbox 和幂等记录；异常只提供线索，不能单独作为副作用判断。

### L5：为什么“重试次数”不能单独作为可靠性指标？

重试可能掩盖了错误分类，也可能把一个已成功的写操作重复执行。可靠性要同时看未知结果率、对账成功率、重复副作用率、预算耗尽后的人工接管和最终任务成功，而不是只看重试后 200 了几次。

## 补偿动作要有独立账本，终态必须和业务账对齐

多步工具链里，回滚、退款冲正、删除临时资源都属于新的副作用，不能只在异常处理函数里顺手调用。每次补偿都应该有自己的 `compensation_id`、原始操作引用、目标资源版本和预期效果；补偿完成后，再把供应商回执、本地 outbox 和业务账本做一次终态对账。

这能避免“主操作失败，所以补偿一定成功”的危险假设。若补偿请求本身进入 UNKNOWN，系统应暂停后续自动动作并把原操作与补偿操作放在同一条恢复链上；若补偿只完成了一部分，则状态必须是 `PARTIAL_COMPENSATED`，而不是把整个任务标记为成功。恢复器只推进明确的状态，不靠异常栈推断业务事实。

~~~yaml
compensation_ledger: cl_20260820_62
workflow: shipment-cancel-8848
original:
  operation_id: ship-create-19
  provider_status: COMMITTED
  business_effect: shipment_created
compensation:
  compensation_id: cancel-19
  target_resource_version: shipment-v4
  expected_effect: shipment_cancelled
  provider_status: COMMITTED
reconciliation:
  provider_receipt: receipt-cancel-19
  local_outbox: applied
  business_ledger: one_cancel_effect
  side_effects: 1
decision: compensated
~~~

![补偿账本卡：原操作、补偿操作和业务终态用同一个恢复链对账](/images/notes/tool-retry-policy/compensation-ledger-card.svg)

### L5：为什么补偿成功也不能直接把原任务标记为成功？

补偿成功只说明副作用被抵消或资源回到某个状态，不代表用户原本要求的任务完成。系统要同时记录原操作结果、补偿结果和对用户的最终语义；例如订单创建后又取消，正确状态是“创建已发生、随后已取消”，而不是“从未创建”。

## 重试策略要有“重复副作用预算”

重试不是免费动作。查询型工具多跑几次通常只是浪费；扣款、发消息、改权限则可能把一次失败放大成多次业务效果。面试里可以把它讲成一个预算问题：每一种副作用允许出现几次，谁批准超预算，超预算后如何转人工。

```yaml
side_effect_budget:
  contract: seb_20260820_112
  action: grant_workspace_access
  idempotency_key: req_8f2c
  max_business_effects: 1
  retry_budget: 2
  unknown_budget: 0
  over_budget:
    action: freeze_and_reconcile
    owner: access-ops
  evidence:
    - provider_receipt
    - final_resource_state
```

![重试副作用预算：幂等键、业务效果上限、UNKNOWN 预算和超限动作](/images/notes/tool-retry-policy/side-effect-budget-card.svg)

### L5：为什么 UNKNOWN 预算可以是零？

“允许出现一个未知状态”并不等于系统更健壮。对于权限、扣款等高风险动作，未知状态本身就是阻断信号：在外部状态未对账之前，不允许继续重试，也不允许向用户报成功。预算的作用，是提前把“什么时候必须停”写清楚。

## 60 秒面试回答

我不会把工具失败简单处理成再试一次，而会先区分参数、权限、瞬时网络、执行失败和结果未知。可证明未发送的瞬时错误，在预算内用相同幂等键指数退避；超时发生在发送之后，就先按 request_id 对账。状态机要显式记录 SENT、COMMITTED、FAILED 和 UNKNOWN，未知状态不允许直接重放。工具不可用时可以降级或换工具，但要重新验证结果和副作用，预算耗尽就转人工并保留补偿记录。

## 带走一张检查清单

- [ ] 是否能区分“未发送”和“已发送但回执丢失”？
- [ ] 是否有幂等键、request_id 和对账接口？
- [ ] 参数/权限错误是否明确禁止重试？
- [ ] 重试是否有退避、抖动、总时限和熔断？
- [ ] 未知结果、预算耗尽和降级是否能转人工并回溯？

## 相关笔记

- [Function Calling 不是模型会调函数就完事：先把契约验清楚](/notes/tool-function-contract)
- [Code Agent 跑到一半挂了，怎样恢复又不重复执行？](/notes/code-agent-resume-exactly-once)
- [工具调用怎么做权限控制和审计？](/notes/tool-permission-audit)

## 参考

- AgentAlpha《Agent 岗面试宝典 v3》：工具调用章节
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
