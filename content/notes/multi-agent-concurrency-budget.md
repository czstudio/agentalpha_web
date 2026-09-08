---
slug: "multi-agent-concurrency-budget"
title: "多 Agent 系统为什么越加人越慢？并发、上下文和预算控制"
excerpt: "并发不是把任务数乘上 Agent 数。共享资源、上下文复制和尾延迟会让系统越协作越慢，真正要控制的是拓扑、扇出、token 和失败重试。"
series: "多智能体"
seriesNo: "07"
number: "32"
minutes: 18
---

团队为了让研究 Agent 更快，给一个任务同时启动 12 个检索 Agent。结果搜索接口被限流，协调器等待最慢的那几个，失败后又全部重试，最终比单 Agent 慢了三倍，成本却涨了十倍。

多 Agent 的并发问题，通常不是线程数不够，而是没有画清依赖图、没有设置扇出上限，也没有把“等齐所有人”改成“拿到足够证据就继续”。

## 先给一个能复述的答案

多 Agent 并发设计先画任务 DAG，区分真正独立的节点、共享资源和关键路径。并发度要同时受全局、租户、工具和模型四层预算限制；上下文通过 artifact 引用和摘要传递，避免每个 Agent 复制完整历史。协调器不要无条件等待全部分支，而应设置最小完成数、截止时间和降级策略。评测重点看 P50/P95/P99 延迟、尾部扇出、token、限流、重试放大和单位任务成本，而不是只看平均耗时。

![从任务 DAG 到并发预算：只有独立节点才能安全扇出](/images/notes/multi-agent-concurrency-budget/dag-fanout.svg)

图 1：并发的上限由共享资源和关键路径决定，不是由 Agent 数量决定。

## 一、先画关键路径，再谈并发

把任务画成 DAG：节点是可验收产物，边是数据依赖。没有依赖的检索可以并行；写作依赖证据包，不能和研究完全并行；发布依赖审核通过，更不能用“预计会通过”提前执行。

```text
             ┌─> 研究 A ─┐
需求 ─> 规划 ┤            ├─> 合并证据 ─> 写作 ─> 审核 ─> 发布
             ├─> 研究 B ─┘
             └─> 计算 C ───────────────┘
```

关键路径是规划 → 研究 → 合并 → 写作 → 审核 → 发布；研究 A、B、计算 C 的并行只会缩短它们中最长的那支。若合并本身要等待所有分支，启动更多低质量分支不会改善尾延迟。

## 二、四层预算一起限流

### 全局预算：保护系统

限制整个系统的并发任务数、模型 token、外部请求和队列长度。全局预算触顶时，新的任务排队或降级，不能继续把压力传给下游。

### 租户预算：保护公平

一个大客户不应该因为批量任务把其他租户的延迟拖高。租户配额可按并发槽、token、工具请求和每日金额分别设置。

### 工具预算：保护依赖方

搜索、数据库、代码执行和发布接口的容量不同。Agent 并发度必须经过工具级 semaphore，而不是只在模型调用层限速。

### 任务预算：保护单次执行

每个任务要有 deadline、最大扇出、最大重试、token 上限和金额上限。预算剩余不足时，协调器应选择降级策略，例如只保留两个高质量来源，不再开启新的探索分支。

![四层预算从全局到单任务逐层收紧，避免单个 Agent 把资源吃光](/images/notes/multi-agent-concurrency-budget/budget-layers.svg)

图 2：并发控制不是一个 `max_workers` 参数，而是一组嵌套预算。

## 三、扇出和重试会放大成本

假设每层扇出 4 个 Agent，共 3 层，理论调用数就是 \(4^3=64\)。如果每个节点失败率 10%，并允许两次重试，期望调用量还会继续膨胀。

```python
def reserve_child(parent, task_budget):
    if parent.fanout >= task_budget.max_fanout:
        return False
    if task_budget.remaining_tokens < parent.estimated_tokens:
        return False
    if task_budget.deadline - now() < parent.min_required_time:
        return False
    parent.fanout += 1
    task_budget.remaining_tokens -= parent.estimated_tokens
    return True
```

关键是预留预算，而不是调用结束后再统计。调用中途失败时仍要记账，避免“因为失败所以不算成本”的假象。

重试也要分类：网络超时可以指数退避，schema 错误应返工，权限拒绝不该重试，模型输出不确定时需要换策略而不是重复相同提示。

## 四、上下文不要随拓扑复制

多 Agent 变慢的另一个原因是消息体变胖：协调器把完整历史复制给每个分支，分支又把完整结果传回合并器。token 费用和延迟会随扇出一起增长。

更好的做法是：

- 共享不可变的 artifact，只传 `artifact_id`、版本和摘要；
- 每个角色只接收它需要的字段和约束；
- 对长结果做结构化压缩，保留证据指针；
- 合并器按需拉取原文，而不是默认读取全部内容。

```json
{
  "artifact_id": "ev_12",
  "revision": 3,
  "summary": "18 条来源，覆盖 4 个子问题",
  "fields": ["claims", "sources", "gaps"],
  "expires_at": "2026-08-20T12:00:00Z"
}
```

这会让上下文成本从“每个节点复制一次”变成“只有需要深读的节点拉取一次”。

## 五、不要无条件等所有分支

并行汇聚常见两种策略：

| 策略 | 规则 | 适用场景 | 风险 |
| --- | --- | --- | --- |
| all-of | 所有分支都成功才继续 | 资金、发布、强一致计算 | 慢分支拖垮整体 |
| quorum | 达到 k 个高质量结果就继续 | 多来源研究、分类投票 | 少数关键来源缺失 |
| first-valid | 首个通过校验的结果即可 | 延迟敏感、候选等价 | 可能错过更优结果 |
| deadline | 截止时间到就降级 | 对话、线上应答 | 结果不完整 |

选择策略要写进任务契约。`quorum=3` 不是“收到三个回答”，而是“三个独立来源且证据强度达标”。

![汇聚策略：all-of、quorum、first-valid 与 deadline 对应不同可靠性和延迟取舍](/images/notes/multi-agent-concurrency-budget/join-policies.svg)

图 3：汇聚策略要与任务风险匹配，不能所有场景都等齐或都抢最快。

## 六、尾延迟比平均延迟更诚实

如果 8 个分支里只要最慢的一个完成，整体延迟接近最大值；再加上外部限流和重试，P95/P99 会非常难看。监控时至少记录：

- fanout 数量与实际成功数；
- 每一支的等待、执行、重试和排队时间；
- 合并器等待了多少分支、缺了哪些结果；
- 每个节点的输入 token、输出 token 和工具次数；
- 任务最终是成功、降级、超时还是人工接管。

不要只记录一个 `agent.duration`。没有阶段拆分，就无法知道慢在队列、模型、工具还是合并等待。

## 七、如何设计取消和补偿

当任务超时，协调器要向尚未开始的分支发送 cancel，并让正在运行的工具调用检查 cancellation token。已经产生副作用的动作不能靠“取消消息”回滚，需要对应的补偿命令或人工确认。

```python
async def run_with_deadline(node, ctx):
    try:
        return await asyncio.wait_for(run(node, ctx), timeout=ctx.remaining())
    except asyncio.TimeoutError:
        await emit("node.timed_out", node.id)
        if node.side_effect:
            return await request_compensation(node)
        return {"status": "cancelled"}
```

取消不是失败的同义词：用户主动停止、预算耗尽、deadline 到期和工具故障要分别记录，后续重试策略也不同。

## 八、评测并发是否真的更好

做单 Agent、串行工作流、并发多 Agent 三组基线，固定任务集和质量阈值。除最终成功率外，重点看：

| 指标 | 要回答的问题 |
| --- | --- |
| P95 / P99 | 尾部用户是否更慢 |
| 单任务成本 | 并发收益有没有被 token 吃掉 |
| 限流率 | 是否把压力转移给依赖方 |
| 重试放大倍数 | 一次失败产生了多少额外调用 |
| 降级成功率 | 不等齐全部结果能否完成 |
| 资源公平性 | 租户之间是否互相影响 |

## 九、把并发预算写成可回放账本

并发控制最怕“最后才发现超支”。协调器在创建子任务时就应该写入一条预算账本：预估 token、预估金额、工具配额、截止时间和父任务版本；任务完成后再把预估值替换成实测值。这样一次线上慢请求可以回答“哪一支花掉了预算”，而不是只看到总账单变大。

```json
{
  "run_id": "research-184",
  "parent": "merge-12",
  "branch": "search-c",
  "reserved": {"input_tokens": 1800, "output_tokens": 700, "usd": 0.012},
  "actual": {"input_tokens": 2210, "output_tokens": 488, "usd": 0.014},
  "status": "cancelled_after_quorum",
  "reason": "three independent sources already passed"
}
```

预算记录至少要能区分 `reserved`、`committed`、`released` 和 `wasted`。取消一支尚未开始的分支可以释放预算；已经发出请求的 token 不能假装退回；因重复重试浪费的成本要单独归因。对高峰期的系统，还可以按队列等待时间动态收紧扇出：P95 超过门槛时只保留高置信度分支，恢复后再逐步放宽。

![并发预算账本记录预留、实际消耗、取消与浪费，支持按分支回放成本](/images/notes/multi-agent-concurrency-budget/budget-ledger.svg)

图 4：账本把“并发很贵”拆成哪一支、哪一次重试、哪一种工具在消耗预算。

## 把预算做成一张可审计的调度单

预算不只用来拒绝新任务，还要告诉协调器“下一步最值得花钱在哪”。我会在每个汇聚点保留一张调度单，把剩余时间、剩余 token、已拿到的独立证据和还缺的风险项放在一起：

```yaml
run_id: research-184
deadline_ms: 4200
remaining: { tokens: 2860, usd: 0.021, slots: 2 }
evidence: { independent_sources: 2, required: 3, conflicts: 1 }
next:
  - action: retry_search
    reason: "只缺一个独立来源，且预算足够"
  - action: cancel_low_value_branch
    reason: "与已有来源高度重复"
fallback: "交付带缺口的草稿并标记 needs_review"
```

这里的 `next` 不是模型自由发挥的建议，而是根据任务契约生成的候选动作。调度器先过滤违反权限、deadline 或副作用规则的动作，再按“能否补齐关键证据 / 单位成本 / 预计等待”排序。这样，预算耗尽时留下的是一个可解释的降级结果，而不是一堆半截回答。

![调度单把剩余预算、证据缺口和下一步动作连成可审计的决策链](/images/notes/multi-agent-concurrency-budget/scheduling-sheet.svg)

## L5：并发预算怎样避免“省了钱却丢了关键证据”？

不能只按 token 或美元做硬截断。先把任务拆成必需证据、可选证据和冗余证据三类，并给必需证据设置不可绕过的门槛；预算不足时优先取消冗余分支，若仍无法覆盖必需证据就返回 `needs_review`，而不是把低置信结果伪装成成功。评测时要比较“单位成功任务成本”和“关键证据缺失率”，两者必须一起下降或至少不恶化。

## 十、什么时候减少 Agent 反而更快

可以做一个很有说服力的反事实实验：固定任务集、模型和质量门槛，只改变扇出上限、汇聚策略和上下文传递方式。若从 8 个分支减少到 3 个，质量只下降 0.5 个百分点，但 P95 下降 42%、单位成本下降 61%，说明被删掉的是冗余搜索，不是有效能力。

面试中不要说“Agent 越少越好”，而要解释减少的依据：

- 分支是否覆盖了不同来源或不同算法，而不是重复同一检索；
- 合并器是否真的读取了每个结果，还是只取前两个；
- 失败率与重试是否让低质量分支反复占用槽位；
- 删除后是否仍保留关键风险检查和独立证据。

最小系统不是最简单的图，而是能在质量、延迟、成本和风险四个约束下稳定收敛的图。

## 面试官的三层追问

### L1：多 Agent 越并发越快吗？

只对真正独立的子任务有效，整体仍受关键路径、最慢分支和共享资源限制。并发过高会带来限流、排队和重试放大。

### L2：如何控制多 Agent 成本？

设置全局、租户、工具和任务四层预算，限制扇出和重试；上下文传 artifact 引用而不是复制长文本；在 deadline 前按 quorum 或降级策略收敛。

### L3：为什么要看 P99？

多分支汇聚的整体耗时接近最慢分支，平均值会掩盖限流和重试造成的尾部问题。线上体验和资源规划必须看 P95/P99。

### L4：如何证明减少并发没有损失能力？

固定任务和质量门槛，做扇出 1、3、8 的反事实对照，比较证据覆盖、成功率、P95、token 和单位成本；若删掉的分支没有带来独立证据，减少它们就是可解释的优化。

### L5：预算耗尽时应该继续重试吗？

先判断失败类型和副作用：权限拒绝、schema 错误和已知业务拒绝不应盲重试；若剩余预算不足以完成一条安全闭环，应提前降级、请求澄清或转人工，并把“预算不足”作为明确终态记录。

## 预算耗尽要返回可解释的“降级回执”

预算到顶不等于任务失败，更不等于可以把半截结果包装成成功。协调器应该返回一张回执，明确已经完成什么、还缺什么、哪些副作用状态未知，以及用户下一步能否安全恢复：

```yaml
budget_receipt: br_20260820_11
run_id: run_501
limits:
  global_ms: 3000
  tenant_tokens: 42000
  tool_calls: 24
used:
  elapsed_ms: 2980
  tokens: 41720
  tool_calls: 24
completed: [policy_lookup, order_status]
pending: [refund_risk_check, receipt_verify]
unknown_side_effects: []
decision: degrade
response_contract:
  answerable: false
  missing_evidence: [refund_risk_check]
  next_action: ask_user_or_resume
```

`completed` 只能放有确定回执的步骤；`pending` 是尚未执行或尚未验收的步骤；`unknown_side_effects` 只要非空，就禁止自动重放写操作。这样用户可以看到“订单状态已核对，但退款资格还没有证据”，而不是收到一句模糊的“系统繁忙”。恢复时以 `run_id` 和幂等键接续，不重复执行已经完成的查询。

![并发预算降级回执：把已完成、待办与未知副作用分开](/images/notes/multi-agent-concurrency-budget/budget-degrade-receipt.svg)

## 降级之后还要核对“未完成分支的副作用”

预算用完时，调度器通常会取消还没返回的分支。但“取消请求已经发出”不等于“远端没有执行”：请求可能已经到达支付、工单或外部搜索服务，只是回包排在取消信号之后。面试里如果把所有取消分支都当成 no-op，最容易漏掉的就是这类未知副作用。

我会给每次降级补一张 branch closeout 回执。先按 `branch_id` 列出 `completed`、`cancelled` 和 `unknown`，再分别查工具日志、供应商状态和幂等账本。`unknown` 分支在对账完成前保持冻结，禁止自动重放写操作；如果已经产生副作用，就走补偿或人工接管，而不是把它从 DAG 里抹掉。

~~~yaml
branch_closeout_receipt: bcr_20260820_32
task_id: refund-review-20260820-17
run_id: run-7f31
branches:
  completed: [policy_lookup, order_status]
  cancelled: [receipt_verify]
  unknown: [refund_risk_check]
side_effects:
  unknown: [refund_risk_check]
reconciliation:
  providers_checked: [risk-api, order-ledger]
  compensations_pending: []
decision: freeze_unknown_then_resume
~~~

这张回执的重点不是“取消了几个任务”，而是把每个分支的副作用状态单独落账。恢复时只重放没有发送证据的步骤；已发送但未知的步骤先查询最终状态，再决定是否补偿。这样预算降级不会把一次局部超时变成重复退款或重复建单。

![并发分支关闭回执：取消、未知与补偿路径分开核对](/images/notes/multi-agent-concurrency-budget/branch-closeout-card.svg)

### L5：为什么取消任务不能证明没有副作用？

取消只改变了本地调度状态，无法撤回已经离开进程的请求。只有供应商最终状态、请求日志和幂等账本互相对上，才能把分支从 `unknown` 关闭。

### L5：预算不足时能不能先给部分答案？

只有当 `response_contract.answerable=true` 且缺口不影响关键决策时才可以；涉及退款、付款、权限或其他副作用时，缺任何必需证据都只能说明当前进度并请求恢复，不能替用户做决定。

## 预算账本要预留“回滚与对账”配额

调度器把所有 token 和工具调用用完，往往就没有资源处理取消分支的对账、补偿和最终回执。生产预算不能只写 happy path，还要单独预留 recovery reserve：当主流程触发降级时，保留一小段时间和调用额度给未知副作用查询、幂等确认和用户可读的收口。否则系统会在最需要收尾的时候再次超时。

```yaml
budget_ledger: bl_20260820_28
task: refund-review-20260820-17
planned:
  main_tokens: 42000
  tool_calls: 24
reserve:
  reconciliation_tokens: 3200
  reconciliation_calls: 3
  deadline_ms: 700
consumed:
  main_tokens: 41720
  tool_calls: 24
trigger: main_budget_exhausted
closeout:
  query_unknown_branches: allowed
  replay_write_commands: blocked
  user_response: progress_with_missing_evidence
decision: degrade_with_reserve
```

![并发预算账本：主流程消耗与恢复配额分开，降级后仍能完成未知分支对账](/images/notes/multi-agent-concurrency-budget/recovery-reserve-card.svg)

### L5：为什么恢复配额不能和普通重试共用？

普通重试服务于主路径，可能被瞬时错误放大；恢复配额服务于副作用确认和安全收口，必须在主预算耗尽后仍然可用。两者混在一起，最容易出现“重试把最后的对账资源也吃掉”的死循环。

## 并发取消要有“停止新工作、收拢在途、关闭未知”三步

取消一个分支只发一个 cancel 信号，通常解决不了已经派发到远端的工具调用。调度器应先阻止该分支继续领取新任务，再向可取消的执行器发送停止请求，同时把不可确认的请求迁移到 `unknown`，交给恢复配额做幂等查询。只有供应商回执、幂等账本和本地状态对齐后，分支才可以从 `unknown` 关闭。

这套语义也适用于 deadline：超时不等于失败，超时后的写操作不能自动重试；只读分支可以丢弃结果，副作用分支必须进入对账。汇聚器要知道哪些分支是必需的、哪些可以降级，不能因为一个可选研究分支取消就把整个任务标成成功。

```yaml
cancel_protocol: cap_20260820_49
branch: order_lookup
steps:
  - {seq: 1, action: stop_new_work, state: draining}
  - {seq: 2, action: cancel_inflight, provider_ack: pending, state: unknown}
  - {seq: 3, action: reconcile_request_id, result: committed, state: closed}
rules:
  timeout_after_write: no_auto_retry
  readonly_timeout: drop_or_degrade
  required_branch_unknown: block_commit
  optional_branch_unknown: report_gap
decision: cancel_with_reconciliation
```

![并发取消协议：先停止新工作，再收拢在途请求，最后用恢复配额关闭 unknown](/images/notes/multi-agent-concurrency-budget/cancel-reconcile-card.svg)

### L5：为什么超时后不能把所有分支都当失败？

超时只说明本地没有在 deadline 内拿到回执，远端可能已经成功、仍在处理或从未收到。读操作可以按策略降级，写操作必须保留 unknown 并做对账；把它直接标成失败会诱发重复副作用。

## 60 秒面试回答

我会先把任务画成 DAG，只有无依赖的节点才并发。并发受全局、租户、工具和单任务四层预算限制，任务契约写明最大扇出、deadline、token 和重试上限。长上下文通过 artifact 引用和结构化摘要传递，避免每个 Agent 复制完整历史。汇聚策略按风险选择 all-of、quorum、first-valid 或 deadline，不无条件等齐所有分支。监控重点看 P95/P99、排队和工具等待、重试放大、token 成本、限流率及降级成功率。

## 带走一张并发检查清单

- [ ] 是否画出了任务 DAG 和关键路径？
- [ ] 是否有全局、租户、工具、任务四层预算？
- [ ] 最大扇出、重试、token、deadline 是否在调用前预留？
- [ ] 上下文是否通过 artifact 引用而不是整段复制？
- [ ] 汇聚策略是否明确 all-of、quorum 或 deadline？
- [ ] 是否记录 P95/P99、排队、限流、重试放大和单位成本？

## 相关笔记

- [为什么一个 Agent 做不完的事，要拆成多个 Agent？](/notes/multi-agent-task-decomposition)
- [多 Agent 互相甩锅怎么办？从监督者到仲裁器设计](/notes/multi-agent-supervisor-arbitrator)
- [Agent 上线后怎么定位问题？从 trace 到可观测性和回放](/notes/agent-observability-replay)
- [大模型推理优化不是只换量化：吞吐、延迟和显存怎么一起看](/notes/llm-inference-optimization)

## 参考

- [Agent 岗面试宝典 v3：调度与资源管理考点（本地导入）](/content/imports/agent-interview-v3.feishu.md)
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
