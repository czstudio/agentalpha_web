---
slug: "agent-cost-control"
title: "线上成本突然翻倍，Agent 项目从哪里开始降本"
excerpt: "Agent 账单涨了，先拆清模型、工具、上下文和重试各花了多少，再改路由和上下文。直接换小模型，可能只是把失败和重试一起放大。"
series: "项目深挖"
seriesNo: "11"
number: "53"
minutes: 22
---

线上账单突然翻倍，最容易出现的方案是：“把模型换小一点。”

但 Agent 的成本不只来自一次模型调用：上下文变长会增加输入 token，工具重试会增加请求次数，检索和 OCR 也要收费，人工接管和失败补偿同样是真成本。小模型如果更容易走错工具，最终账单可能更高。

## 能背走的版本

降本要先建立端到端成本账本，再按任务风险做模型路由、上下文压缩、缓存和工具预算。每次优化都要用同一评测集比较任务成功、证据覆盖、P95 延迟和总成本；高风险写操作不能因为便宜就绕过审批和验证。目标不是每个 token 最便宜，而是单位成功任务成本下降。

![Agent 成本从输入上下文到人工接管的成本栈](/images/notes/agent-cost-control/cost-stack.svg)

## 先把账算完整

一次任务成本可以近似写成：

```text
task_cost = model_input + model_output + retrieval + tool_calls
            + storage + human_handoff + failure_recovery
```

按 `trace_id` 聚合，别只盯着模型账单。一个“成功”任务如果经历了四次重试和一次人工接管，就不能按第一次调用的价格计算。

还要分摊固定成本：索引、GPU 常驻、日志存储和评测集运行。短期优化 token，长期可能把缓存、存储或运维成本推高。

## 四种优先级不同的降本手段

### 1. 先减少无效工作

重复检索、重复总结和无意义的反思循环通常是最便宜的优化点。给 Agent 设置停止条件、上下文去重和工具调用上限，比先换模型更稳。

### 2. 再做上下文预算

只把会影响下一步决策的字段交给模型，历史对话按任务压缩，检索结果先摘要再保留证据引用。不要静默截断，必须告诉 Agent 看到的范围和下一步查询方式。

### 3. 按风险做模型路由

简单分类、格式转换和候选排序可以走小模型；复杂规划、冲突判断和高风险动作走更强模型。路由结果要可解释，并且允许失败升级。

![模型路由、缓存和上下文压缩共同决定单位成功任务成本](/images/notes/agent-cost-control/model-routing-cache.svg)

```python
def choose_model(task):
    if task.risk == "write" or task.evidence_conflict:
        return "reasoning-large"
    if task.kind in {"classify", "extract"} and task.input_tokens < 2000:
        return "fast-small"
    return "balanced"
```

### 4. 最后做缓存和批处理

稳定的系统提示、文档摘要和只读工具结果适合缓存；带用户权限、实时状态和副作用的结果不能盲目复用。批处理可以降低吞吐成本，但要确认延迟和数据隔离没有被破坏。

## 成本优化要有护栏

成本预算不能只在账单出来后报警。每个任务开始前估算最大 token、工具次数和人工升级额度，执行中累计消耗，超过阈值就压缩、降级、暂停或转人工。

```python
def spend_or_stop(state, estimate):
    if state.spent + estimate > state.task_budget:
        if state.can_reduce_context:
            return "compress"
        if state.risk == "read_only":
            return "use_fallback"
        return "handoff"
    return "continue"
```

![预算护栏按任务、模型、工具和人工升级设置上限](/images/notes/agent-cost-control/budget-guardrail.svg)

## 成本账本要能落到一次 trace

账单只能告诉你“花了多少钱”，不能告诉你“钱花在哪”。线上排查时，我会让每笔成本都带同一个 `trace_id`，再把模型、检索、工具、存储、人工和失败恢复拆成可聚合事件：

```json
{
  "trace_id": "t_0187",
  "tenant": "acme",
  "task": "contract_review",
  "events": [
    {"kind": "model", "model": "balanced", "input_tokens": 4200, "output_tokens": 780, "cost": 0.031},
    {"kind": "retrieval", "index_version": "legal-v12", "top_k": 20, "cost": 0.002},
    {"kind": "tool", "name": "contract_lookup", "attempt": 1, "status": "timeout", "cost": 0.004},
    {"kind": "tool", "name": "contract_lookup", "attempt": 2, "status": "ok", "cost": 0.004}
  ],
  "outcome": "success"
}
```

这样才能回答“是上下文变长了，还是工具重试变多了”。成本事件最好和质量事件共用 trace，而不是另建一套无法对齐的报表。涉及人工接管时，还要记录接管原因和处理时长，否则成本会被误记在客服或运营部门身上。

## 单位成功任务成本，比单次调用更有意义

可以把一个时间窗口的成本写成：

```text
cost_per_success = total_cost / successful_tasks
total_cost = model + retrieval + tools + storage + human + recovery
```

如果小模型让成功率从 92% 降到 80%，即使单次请求便宜 40%，单位成功任务成本也可能上升。还要看长尾：平均成本下降但 P95 成本翻倍，通常说明少数复杂任务在无限重试或反复升级。

我会在周报里同时放四个数字：总成本、单位成功任务成本、P95 任务成本和失败恢复成本。前两个看规模，后两个看系统是否把风险推到了少数用户身上。

## 缓存和路由也有安全边界

缓存键至少要包含租户、身份、数据版本、工具版本和请求语义；只用“问题文本”做键，最容易复用到错误权限或旧制度。对于带副作用的工具，只缓存可验证的幂等结果，不缓存“已经执行”的自然语言描述。

模型路由上线前可以先做 shadow：让候选小模型并行产生结果，但不影响真实动作，比较成功率、拒答率、证据覆盖和成本。只有在连续多个版本窗口都过硬门槛，才把流量从 shadow 切到灰度。

## 做一张降本实验表

降本不是一次性改配置，而是一组可回滚实验。每个实验至少写明：

| 实验 | 变化 | 成本目标 | 不能变差的指标 | 回滚条件 |
| --- | --- | --- | --- | --- |
| 路由 v2 | 分类任务走小模型 | 单位成功成本 -20% | 成功率、拒答率 | 成功率下降 > 2pp |
| 上下文 v3 | 历史压缩 + 证据保留 | 输入 token -30% | 引用覆盖、P95 | 引用覆盖下降 > 5pp |
| 工具缓存 | 只读查询缓存 5 分钟 | 工具成本 -15% | 新鲜度、租户隔离 | 出现版本错配 |

先在固定评测集和小流量上比较，再扩到全量。任何“便宜了但解释不了为什么”的结果，都不应该直接合入主路由。

![降本实验用成本目标、质量护栏和回滚条件形成闭环](/images/notes/agent-cost-control/cost-experiment-ledger.svg)

## 用一条完整 trace 检查降本是否真实

例如一个合同审查任务先检索 20 条片段，再调用合同查询工具，工具第一次超时，第二次成功，最后由人工确认一处冲突。账本不能只记最后一次模型调用，而要展开成：

| 成本桶 | 发生了什么 | 优化问题 |
| --- | --- | --- |
| 模型 | 4.2k 输入 token，780 输出 token | 历史上下文是否重复 |
| 检索 | 20 条召回、8 条进入上下文 | 是否可以按问题类型路由 |
| 工具 | 1 次超时 + 1 次成功 | 超时是否太激进，是否应切换只读副本 |
| 人工 | 1 次冲突确认，耗时 3 分钟 | 冲突能否提前结构化呈现 |

下一步动作要对准最贵且最可控的桶，而不是看到模型费用占比高就直接换模型。工具重试造成的浪费，可能比输出 token 更值得先改。

## 最小成本看板应该回答四个问题

每天的看板不必堆满图表，但必须能回答：

1. 哪类任务的单位成功成本最高？
2. 成本上升来自输入变长、重试变多，还是人工接管增加？
3. 哪个模型、工具或索引版本带来回归？
4. 如果今天扩大流量，预算护栏会在哪里触发？

按任务类型、租户、模型版本和风险等级分桶，通常比一张全局平均曲线更快定位问题。看板旁边保留最近三次实验和回滚原因，避免团队重复踩同一个坑。

## 把每次降本写成单位成功任务账单

成本实验最后要落到“完成一个合格任务到底花了多少钱”，而不是停在某次调用的 token 单价。建议把实验、成功定义和所有成本桶绑定到同一张账单：

```yaml
experiment: route-v2
trace_id: tr_44199c
units:
  model: 0.18
  retrieval: 0.02
  tools: 0.11
  retries: 0.04
  human_handoff: 0.00
success: answer_with_citations_and_no_rework
total: 0.35
unit_cost_per_success: 0.35
quality_guardrails:
  citation_coverage: 0.94
  p95_latency_ms: 4200
  rollback: false
```

这里的 `success` 要先定义清楚：是生成了文本，还是用户无需返工、证据完整、没有触发高风险副作用？定义不同，单位成本会完全不同。账单也要保留失败任务的成本，不能只把成功样本留下来，否则模型越容易放弃，报表反而越好看。

![单位成功任务账单把模型、检索、工具、重试和人工成本汇总到同一条 trace](/images/notes/agent-cost-control/unit-success-ledger.svg)

### L3：降本实验怎样避免“只优化了报价单”？

把成本分解到任务级 trace，并同时记录成功定义、质量护栏和人工接管。如果单次调用便宜了，但失败、重试或返工增加，单位成功任务成本就没有真正下降。

## 四个常见坑

### 只看 token 单价

单价低但成功率低，会带来重试、人工和返工成本。应比较单位成功任务成本，而不是单次请求价格。

### 缓存没有权限和版本

缓存键里没有租户和版本，一个租户的答案就可能复给另一个租户；旧制度缓存太久，用户会拿到已废止的条款。成本是省了，线上事故也跟着来了。

### 为了省钱取消验证

减少测试、审计和回放会让错误变得更晚、更贵。高风险动作的验证成本属于交付成本，不是可以随手剪掉的“额外开销”。

### 无限自动降级

一旦小模型失败就不断换模型，会形成成本失控的升级链。路由要有总预算、最大升级次数和最终停止条件。

## L1 / L2 / L3 分层追问

**L1：** Agent 线上成本从哪里来？

模型输入输出、检索、工具、存储、人工接管和失败恢复都要按 trace 计账；不能只看模型 token。

**L2：** 为什么不直接换小模型？

先建立成功任务成本基线，确认主要浪费来自无效上下文、重复工具还是模型本身；换小模型要用成功率、证据、安全和重试成本一起验证。

**L3：** 如何做动态模型路由？

按任务类型、风险、输入规模和证据冲突路由，失败可升级但受总预算和次数限制；路由决策与版本要进入评测和审计。

**L1：** 为什么平均成本下降还要看 P95？

少数复杂任务可能在重试、升级或人工接管上失控，平均值会把这部分掩盖；P95 能暴露长尾账单。

**L2：** 怎样判断一次缓存是否安全？

检查租户、身份、数据版本、工具版本和副作用语义是否进入缓存键；只读结果可以短时缓存，写操作必须重新鉴权并验证幂等。

**L2：** shadow 小模型时看哪些指标？

看任务成功率、证据覆盖、拒答率、工具选择、P95 延迟和单位成功成本；不能只看输出文本像不像。

**L2：** 工具失败成本应该算到谁头上？

按原始任务的 `trace_id` 归集，并单独标记超时、重试、切换和人工接管，才能知道是工具质量还是路由策略造成的。

**L3：** 成本和质量互相冲突时怎么决策？

先按风险设硬门槛：安全、权限和关键任务成功率不能跌破；在门槛内再优化单位成功成本和延迟，并保留灰度与回滚开关。

**L3：** 如何证明降本不是把工作推给人工？

把人工接管率、接管时长、返工率和用户二次提交一起纳入成本账本；如果模型账单下降而人工工时上升，说明只是成本转移。

**L3：** 一次降本实验怎样可复现？

固定评测集、路由版本、模型版本、缓存命中规则和统计窗口，记录候选方案、置信区间与回滚条件；不要只保留一个最终数字。

**L1：** 成本应该按什么粒度归集？

以任务 `trace_id` 为主键，向下关联模型、检索、工具、存储和人工事件；按请求或按部门汇总都可以，但不能丢掉任务级明细。

**L2：** 如何定位一次成本暴涨？

先比较同类任务的输入 token、工具尝试次数、模型升级次数和人工接管率，再对照路由、提示词、索引和工具版本，通常能在一条 trace 内找到增量来源。

**L3：** 什么情况下不应该降级模型？

涉及写操作、权限冲突、证据矛盾或高损失决策时，模型降级必须先通过安全和质量硬门槛；没有足够证据时宁可暂停或转人工，也不要为了预算继续自动执行。

## 给每次降本实验发一张单位成功账单

成本优化最容易出现“调用价格下降了，业务却更贵了”的错觉。比如把模型换成便宜版本后，重试次数增加，人工复核变多，最后每个成功完成的订单反而多花钱。所以我会把成本和结果放进同一张账单，按成功任务而不是单次请求核算：

```yaml
cost_ticket: ct_252a04
experiment: route-simple-questions-to-small-model
scope: 10000 requests / 24h
spend:
  input_tokens: 18.4M
  output_tokens: 2.1M
  tool_calls: 3200
  human_review_minutes: 410
outcomes:
  completed_tasks: 8120
  hard_failures: 96
  unknown_results: 184
unit_cost:
  provider: 0.0018 USD/task
  all_in: 0.0047 USD/completed_task
guardrails:
  answer_success_delta: -0.4pp
  p95_latency_delta: +80ms
  rollback_if: all_in > 0.0055
```

`all_in` 把模型、工具、重试、人工和失败重做都算进去，`completed_tasks` 给分母定了口径，`unknown_results` 单独列出，避免把未对账的副作用伪装成成功。实验结束后还要按用户、任务类型和风险等级切片；总体便宜但高风险任务变贵，不能算真正降本。

账单的价值不只是报财务数字。它把路由、缓存、上下文裁剪和降级策略变成可比较的实验单元：下一次换模型时沿用相同样本、同一成功定义和回滚门槛，才知道节省来自策略改进，而不是流量恰好变简单。

![单位成功任务成本账单](/images/notes/agent-cost-control/unit-success-cost-ticket.svg)

### L5：如果便宜路由让成功率只下降 0.4 个百分点，应该立即上线吗？

不应该只看平均值。我会先检查硬失败、越权和高价值任务切片；若损失集中在关键业务，就按风险路由保留贵模型。只有在关键切片通过门槛、总成本下降且观察期内可回滚时，才扩大流量。

## 降本实验还要记录“成本转移”

把供应商账单压下来，并不等于任务真的更便宜。小模型可能让重试变多，工具调用变长，人工需要花更多时间校对，用户还会再次提交同一个请求。只看模型 token 费用，会把这些成本藏到别的团队或下一次请求里。

所以每次降本实验都要补一张成本转移回执，和原来的成功率、延迟一起对账：

~~~yaml
cost_shift_receipt: csr_1e0f3b
experiment: small-model-first-v4
window: 2026-08-20T09:00:00Z/2026-08-20T18:00:00Z
model_cost:
  before: 0.0031_usd_per_task
  after: 0.0018_usd_per_task
secondary_cost:
  tool_retry_rate: 3.2% -> 5.9%
  human_minutes: 410 -> 685
  resubmission_rate: 4.1% -> 6.4%
risk_slices:
  payment_write: protected_by_strong_model
  knowledge_qa: passed
decision: hold
~~~

这里的 all-in 成本至少要包括模型、工具、重试、人工接管、返工和用户二次提交；如果某项暂时无法折算，就保留原始计数，不要假装它是零。实验结论也要按任务类型和风险切片输出：总体便宜但高价值任务的人工复核翻倍，说明路由只是成本转移，不能直接扩大流量。

![降本实验的成本转移回执：模型账单下降不代表全链路更便宜](/images/notes/agent-cost-control/cost-shift-card.svg)

### L5：什么时候便宜模型反而更贵？

当它把失败从模型账单转移到重试、人工和用户返工时，便宜模型就更贵。我的判断标准是单位成功任务的 all-in 成本和风险切片，而不是单次调用价格；只有质量、人工负担和关键任务门槛都通过，降本才成立。

## 成本结算要按任务状态分账

单看一条请求的 token 费用，最容易漏掉的是“任务还没结束”。一个工具请求超时后，系统可能进入重试、人工接管或待对账；这几种状态都消耗了资源，却不能都算作成功。成本看板应该先把任务按生命周期分桶，再计算单位成功成本：

~~~yaml
cost_ledger: cl_9feea0
window: 2026-08-20T09:00:00Z/2026-08-20T18:00:00Z
states:
  succeeded: 8120
  recovered: 940
  human_handoff: 410
  unknown: 184
spend_by_state:
  succeeded: 38.2_usd
  recovered: 11.6_usd
  human_handoff: 19.4_usd
  unknown: 3.1_usd
unit_cost:
  completed_task: 0.0047_usd
  attempted_request: 0.0031_usd
unknown_policy: exclude_from_success_and_report_separately
decision: keep_route_for_low_risk_only
~~~

`recovered` 不能直接并入成功，也不能当成失败丢掉。它表示系统付出额外重试或人工成本后完成了任务，适合单独观察；`unknown` 则要进入待对账队列，避免一次副作用不确定的调用被重复计费或重复执行。按状态分账后，路由优化就不再是“哪个模型单价低”，而是“哪个策略用更少的全链路资源完成一个可验证任务”。

![成本按任务状态分账：成功、恢复、人工接管和未知状态分别核算](/images/notes/agent-cost-control/state-cost-ledger-card.svg)

### L5：为什么 recovered 不能直接算成功？

因为 recovered 代表系统用额外重试、补偿或人工才完成，它的质量结果可能合格，但成本和风险已经改变。我会把它单列，并同时看恢复率、恢复成本和最终副作用；只有这些指标都在门槛内，才把路由扩大。

## 预算要分成“可花的钱”和“必须留下的钱”

一个总 token 上限并不能控制 Agent 成本。规划、检索、工具重试和最终回答分别有不同的边际收益；如果规划阶段把预算花光，真正需要证据的步骤反而会被截断。更稳的做法是给每个阶段一个软预算和硬预算：软预算触发模型降级、压缩上下文或减少候选，硬预算则停止新增工作并返回可解释的 partial。

预算账本还要记录拒绝、缓存命中和空转 token。缓存命中不是“免费”，它可能增加索引维护和失效检查；被策略拒绝的工具调用也消耗了规划和评估成本。只有把这些状态放在同一条 trace 上，才能区分“模型变便宜了”和“系统少做了无效工作”。

~~~yaml
budget_scope: bs_15abb3
task: invoice-audit-8848
budgets:
  planning: {soft_tokens: 1800, hard_tokens: 2600}
  retrieval: {soft_calls: 4, hard_calls: 6}
  tools: {soft_calls: 3, hard_calls: 4}
  recovery: {soft_usd: 0.03, hard_usd: 0.05}
observed:
  cache_hits: 5
  policy_denials: 1
  wasted_tokens: 420
  completed_task_cost_usd: 0.018
actions:
  on_soft_limit: compress_and_route_down
  on_hard_limit: return_partial_with_owner
decision: within_budget_with_recovery_reserve
~~~

![Agent 成本预算卡：规划、检索、工具和恢复各有软硬上限，拒绝与缓存也进入账本](/images/notes/agent-cost-control/budget-scope-card.svg)

### L5：为什么只限制总 token，仍然可能出现高成本失败？

因为总预算没有说明钱花在哪个阶段。规划可能反复思考，工具可能不断重试，最后却没有留下证据或完成写入。分阶段预算能在风险尚未扩大时停止空转，并保留恢复和人工接管的资源。

## 单位成功成本要把恢复和人工也算进去

只看 token 单价会鼓励系统多失败几次再重试。更接近业务的指标是：

$$
C_{success} = \frac{C_{model}+C_{retrieval}+C_{tool}+C_{storage}+C_{human}+C_{recovery}}{N_{validated\ success}}
$$

分母必须是经过状态或人工验收的成功任务，而不是“返回了文本”的请求。`C_recovery` 包括重复副作用的补偿、人工接管和失败重跑；把它们记进同一条 trace，才能比较“便宜但常失败”的路由和“贵一点但一次成功”的路由。

```yaml
unit_success_cost_formula: usc_013049
window: 2026-08-20
cost: {model: 0.18, retrieval: 0.03, tool: 0.11, storage: 0.02, human: 0.24, recovery: 0.06}
validated_success: 1000
unit_success_cost: 0.00064
excluded: [aborted_before_execution]
decision: compare_routes_by_validated_success
```

![单位成功成本：模型、工具、人工和失败恢复都归到同一条成功任务账本](/images/notes/agent-cost-control/unit-success-cost-formula-card.svg)

### L5：为什么便宜模型的 token 成本更低，单位成功成本却更高？

它可能需要更多重试、人工接管或补偿动作。分子如果漏掉恢复成本，分母又把未验证的返回算成成功，路由就会被错误激励；先按 trace 完成成本归集，再谈降本。

## 一分钟版本

我会先按 trace 建立端到端成本账本，把 token、检索、工具、存储、人工和失败恢复都算进去，然后优化无效工作、上下文预算、风险路由和缓存。简单任务走小模型，复杂规划和写操作走强模型，但所有升级都受任务预算和安全护栏约束。每次优化用同一评测集比较单位成功任务成本、成功率、证据覆盖、P95 延迟和人工接管率，避免得到一个便宜但不可靠的 Agent。

## 交付前检查清单

- [ ] 成本可以按 trace 拆到模型、工具和人工
- [ ] 统计单位成功任务成本和长尾，不只看平均 token
- [ ] 上下文、重试、反思和工具次数有预算
- [ ] 路由按风险与任务类型可解释、可升级
- [ ] 缓存绑定租户、版本和有效期
- [ ] 降本实验同时验证成功率、证据、安全和延迟

## 相关阅读

- [工具调用失败后，Agent 该重试、换工具还是停下？](/notes/tool-retry-policy)
- [工具返回一大段 JSON，为什么 Agent 反而更容易做错](/notes/tool-output-shaping)
- [Agent 评测不能只看成功率：从结果到轨迹的五层指标](/notes/agent-eval-success-rate)
- [同一个 Agent 实验，怎样才能复现？](/notes/agent-eval-reproducibility)
