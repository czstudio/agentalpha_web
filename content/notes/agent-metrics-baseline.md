---
slug: "agent-metrics-baseline"
title: "项目里的指标怎么来的？别只报一个漂亮数字"
excerpt: "指标不是项目最后补的一张表。先定义任务成功、证据、成本和安全，再做基线和对照，才能说清到底变好了多少、为什么变好。"
series: "项目深挖"
seriesNo: "11"
number: "52"
minutes: 27
---

面试官问：“你们 Agent 的准确率是多少？”听着简单，往下追全是细节。

如果回答“离线 92%”，下一句通常是：“准确率怎么算的？谁标的？和什么相比？线上是多少？失败时成本和延迟有没有变？”

## 先给一个能复述的答案

Agent 指标要从任务不变量出发，不能只从模型日志里捡一个漂亮数字。先定义成功标准和失败分类，再建立无 Agent 或旧版本基线，固定数据、模型、工具和评测器，最后用分层指标解释结果：任务成功、步骤与工具、证据与安全、成本与体验。每次上线都要保留实验配置和可回放轨迹，避免把一次 Demo 当成普遍结论。

![Agent 指标从任务定义到线上回归的闭环](/images/notes/agent-metrics-baseline/agent-metrics-loop.svg)

## 先定义“成功”而不是“像不像”

一个客服 Agent 的成功可能同时包括：给出正确政策、引用正确版本、没有越权、在预算内完成、用户愿意接受。把这些压成一个分数，会丢掉失败原因。

```text
task_success = outcome_ok
                AND evidence_ok
                AND policy_ok
                AND side_effect_ok
```

其中任意硬门槛失败，都不能用平均分抵消。软指标如表达清晰度、平均轮数和用户满意度可以单独看，但不能掩盖安全失败。

![指标定义把结果、过程、证据、安全和成本分成可解释的层](/images/notes/agent-metrics-baseline/metric-definition.svg)

## 基线怎么建

至少准备三条线：

1. **无 Agent 基线**：人工流程、规则系统或直接模型回答。
2. **当前线上基线**：真实版本的成功率、延迟、成本和人工接管率。
3. **候选方案**：新 Prompt、检索器、模型路由或工具策略。

测试集、数据切分、随机种子、系统时间和外部工具版本要固定。否则候选变好了，可能只是数据换了。

```json
{
  "experiment_id": "exp_2026_08_19_07",
  "dataset": "support-regression-v4",
  "model": "agent-model@2026-08-12",
  "retriever": "hybrid@r17",
  "tools": "sandbox-image:42",
  "judge": "rubric-v3",
  "seed": 17
}
```

## 指标口径要能被复算

| 指标 | 定义 | 不能混淆的点 |
| --- | --- | --- |
| 任务成功率 | 通过全部硬门槛的任务数 / 总任务数 | 不能只看模型自报成功 |
| 工具正确率 | 参数、顺序和权限均正确的调用数 / 调用数 | 调用了不等于调用正确 |
| 证据覆盖率 | 被有效引用支持的 claim / claim 总数 | 引用存在不等于支持 |
| 成本 | 输入、输出、工具和人工成本之和 | 平均值会隐藏长尾 |
| P95 延迟 | 95% 请求完成时间 | 平均延迟掩盖尾部超时 |

分母必须写清楚。只统计“成功走完”的请求，会把失败样本从分母里删掉，得到一个没有意义的高分。

## 实验对照与归因

一个实验最好只改变一个主要变量：检索器、模型、工具描述或停止策略。多个变量一起换，结果有差异却没有归因。

```python
def compare(control, treatment):
    for metric in METRICS:
        delta = treatment[metric] - control[metric]
        print(metric, delta, confidence_interval(metric))
```

除了均值，还要看分桶：问题类型、租户、文档长度、工具失败类型、模型路由和用户群。一个整体上涨 3% 的版本，可能在高价值客户上下降 8%。

![实验表把基线、变量、指标、置信区间和失败归因放在一起](/images/notes/agent-metrics-baseline/experiment-table.svg)

## LLM Judge 不能单独当裁判

大模型裁判适合初筛和解释，但会偏爱更长、更像自己、更有格式感的答案。要用人工标注样本校准，配合程序规则检查 JSON、引用、权限和副作用。

```text
最终判定 = 程序硬规则 AND 人工校准后的 Judge AND 关键样本复核
```

Judge 版本、rubric 和提示词都要进入实验指纹。换了 Judge，分数变化不能直接归因给 Agent。

## 指标报告要带不确定性

“准确率提升 2%”只有在样本量、置信区间和配对关系说清楚后才有意义。对于同一批问题的 A/B 结果，可以看每道题的成败差异；对于线上流量，则要按用户、租户或会话聚类，避免把同一个用户的多次请求当成完全独立样本。

```python
def paired_delta(control, treatment):
    diff = [int(t) - int(c) for c, t in zip(control, treatment)]
    return sum(diff) / len(diff), bootstrap_ci(diff, rounds=2000)
```

置信区间很宽时，不要急着宣布“新方案更好”；可以先扩大样本、分桶或做回归集复核。面试里能说出“提升是否稳定、在哪些桶里成立”，比报一个精确到小数点的分数更可信。

## 建一张能指导行动的 scorecard

每次实验只保留一张主表，但把硬门槛和软指标分开：

| 层级 | 指标 | 触发动作 |
| --- | --- | --- |
| 硬门槛 | 越权率、错误副作用、引用失真 | 立即阻断发布 |
| 结果 | 任务成功率、拒答准确率 | 决定是否继续灰度 |
| 过程 | 工具正确率、步骤数、重试率 | 定位路由和策略问题 |
| 体验 | P95、用户接受、人工接管 | 调整交互和预算 |
| 成本 | 单位成功任务成本、token 长尾 | 决定路由和缓存 |

不要用一个加权总分掩盖硬失败。一个版本即使成功率上涨，只要越权率超过门槛，就应该回滚，而不是靠权重把总分拉回来。

![评测 scorecard 把硬门槛、结果、过程、体验和成本映射到发布动作](/images/notes/agent-metrics-baseline/metrics-scorecard.svg)

图 3：指标的价值在于告诉团队下一步做什么，而不是给发布会提供一个大数字。

## 从漂移报警走到根因假设

线上指标下降时，先建立假设树，再用切片验证：

```text
成功率下降
├─ 流量变了：新用户 / 新问题 / 新租户
├─ 数据变了：文档版本 / 业务状态 / 语言分布
├─ 依赖变了：模型 / 检索 / 工具 / 延迟
└─ 实现回归：Prompt / schema / 终止条件
```

报警事件要自动附上最近的版本指纹、失败样本链接和受影响分桶。若“合同类问题的引用覆盖率下降”只发生在新文档版本，就优先检查 ingestion 和索引；若只发生在某个模型路由，才去看 Prompt 或模型质量。先找证据，再动参数，避免线上试错。

## 评测集也需要版本和维护者

回归集不是收集几道面试题就结束。每个样本应记录来源、场景、期望动作、证据、敏感级别、最后复核人和失效时间。线上出现新事故时，加入一个最小复现样本，并标注它覆盖哪条规则或失败类型。

这样做的好处是，评测集会随着产品边界增长，而不是随着时间变成一堆没人知道为什么存在的题。删除或修改样本也要留记录，否则历史分数无法比较。

## 线上指标为什么会漂移

用户问题、文档、工具响应、模型版本和流量结构都会变化。线上监控至少包括：任务成功率、拒答率、人工接管、工具错误、引用缺失、成本和 P95 延迟。遇到漂移时，要先按失败类型切片，再决定是数据变化、路由变化还是实现回归。

一个可用的报警不应只说“成功率下降”，而要说明“合同类问题的引用覆盖率从 94% 降到 71%，主要来自新文档版本未进入索引”。只有这种信息能直接指导修复。

## 先看领先指标，再等结果指标变坏

结果指标（任务成功率、投诉率）通常已经滞后；过程指标能更早暴露系统正在变差。例如检索 top-k 的证据覆盖下降、工具 schema 失败增加、重试放大上升，都可能在最终成功率下滑前出现。

| 层级 | 领先信号 | 需要联动的结果 |
| --- | --- | --- |
| 数据 | 新文档未入索引、冲突率上升 | 引用覆盖、拒答准确 |
| 工具 | 超时、参数校验失败 | 任务成功、人工接管 |
| 模型 | 规划步骤变长、无效调用增加 | P95、单位成本 |
| 交互 | 用户重复改写、撤销操作 | 满意度、投诉率 |

报警不要只设一条总线。先按版本、租户、意图和风险切片，再把领先信号与结果指标放在同一条 trace 上。如果过程指标变坏但结果暂时稳定，可以先收窄路由或暂停扩量；如果硬风险已经回归，则直接阻断，不等统计显著性慢慢收敛。

![Agent 指标分成数据、工具、模型和交互四层领先信号，再映射到结果指标和发布动作](/images/notes/agent-metrics-baseline/leading-signals.svg)

图 4：领先指标让团队在结果指标翻车前发现趋势，并把报警连接到具体动作。

## Scorecard 必须能直接触发动作

一张漂亮的指标表如果不能回答“现在要不要扩量”，就还不是工程门槛。建议把每个指标写成“信号—阈值—动作—负责人”四元组，并区分硬阻断与观察项：

```yaml
release: agent-v4
window: 2026-08-12..2026-08-19
gates:
  - name: cross_tenant_leak
    signal: security.violation_count
    threshold: "== 0"
    action: block_and_rollback
    owner: security-oncall
  - name: task_success
    signal: task.success_rate
    threshold: ">= 0.82 and lower_ci >= 0.79"
    action: expand_10_percent
    owner: agent-team
  - name: p95_latency
    signal: latency.p95_ms
    threshold: "<= 1800"
    action: hold_and_slice_by_intent
    owner: runtime-team
```

硬门槛命中时不等平均分回升；观察项则先按意图、租户、模型和工具版本分桶，确认是局部漂移还是全局回归。每个动作都要留 `decision_id` 和复查时间，避免报警在群里滚过之后没人知道最后做了什么。

![发布 scorecard 把指标阈值、阻断动作、负责人和复查时间连接成决策回路](/images/notes/agent-metrics-baseline/scorecard-action.svg)

## 四个常见坑

### 先选指标，再找能让它好看的样本

指标应在实验前冻结，样本和分桶规则不能根据结果临时调整。

### 只报平均值

平均延迟和平均成本会掩盖长文档、复杂工具链和失败重试的长尾。至少补 P95、P99 和失败分桶。

### 把模型自评当事实

模型说“已完成”只是一个观察，不是外部状态。要用工具回执、数据库状态和证据引用确认结果。

### 指标没有版本

没有数据集、模型、工具和 Judge 指纹，几周后你无法解释指标变化，也无法复现实验。

## L1 / L2 / L3 追问：从数字到决策

**L1：** Agent 项目最重要的指标是什么？

取决于任务，但通常先锁定任务成功和安全硬门槛，再看证据、成本、延迟和体验；不能用平均分掩盖硬失败。

**L2：** 如何证明一个新版本真的更好？

固定数据和环境，建立当前线上与无 Agent 基线，只改变主要变量，比较分层指标和置信区间，并保留可回放轨迹。

**L3：** 线上下降但离线没变怎么查？

按用户、问题类型、工具错误、文档版本、模型路由和延迟分桶，检查分布漂移、版本组合和评测集覆盖；不要只调大离线分数。

**L1：** 为什么不能只报一个总分？

总分会把越权、错误副作用和引用缺失等硬失败平均掉。结果、过程、证据、安全、成本和体验应分层展示。

**L1：** P95 比平均延迟多说明什么？

P95 能看到长文档、复杂工具链和重试造成的尾部体验，平均值可能把少数严重超时藏起来。

**L1：** Judge 分数变高就代表 Agent 变好了吗？

不一定。Judge 可能偏爱更长或更像自己的答案，必须用人工校准、程序硬规则和关键样本复核。

**L2：** 指标提升 2% 如何判断是否可信？

报告样本量、配对方式、置信区间和分桶结果；区间很宽时扩大样本或做回归验证，不用一个小数点宣布胜利。

**L2：** 任务成功率和工具正确率为什么要分开？

任务可能靠人工补救成功，但工具参数、顺序或权限已经错了。拆开才能定位过程风险，避免把补救结果算成 Agent 的正确能力。

**L2：** 如何设计一张发布 scorecard？

把越权和副作用设为硬门槛，再列结果、过程、体验和成本指标及触发动作；硬门槛失败直接阻断，不能用加权总分抵消。

**L2：** 线上漂移怎么区分数据问题和实现回归？

按问题类型、用户、文档版本、模型路由、工具错误和延迟切片，对照版本指纹与失败样本，先验证假设再改实现。

**L3：** 怎样把一次线上事故转成评测样本？

保留最小输入、身份、期望动作、证据、实际轨迹和失败类型，脱敏后加入回归集，标注覆盖规则与维护人，并跑旧版本基线。

**L3：** 多租户产品的指标如何防止平均数掩盖风险？

按租户、数据敏感级别和流量分层报告，低流量高风险租户单独设硬门槛；不能用大租户的成功率覆盖小租户的越权。

**L5：** 如果任务成功率、P95 和成本同时变好，但越权回归样本失败，能否扩量？

不能。越权和副作用错误是硬门槛，不能用加权总分抵消；先阻断并回滚或收窄路由，定位权限、缓存和版本组合，修复后重新跑安全回归，再看其他指标是否仍然成立。

## 指标字典要和一次结果绑定

“成功率”这三个字在不同团队里可能指三件事：模型打分超过阈值、用户点击了完成，或者副作用真的落库。面试和上线都不能只报一个数字，最好给每个指标发一份口径快照，连同本次评测一起保存：

```yaml
metric: completed_task_rate
definition: 业务目标已完成且副作用可核对
numerator:
  include: [status=COMMITTED, receipt_verified=true]
  exclude: [policy_block, user_cancelled]
denominator:
  include: [eligible=true]
  unknown: separate_bucket
slices: [tenant, task_type, model_version]
window: 2026-08-19T00:00:00Z/2026-08-19T23:59:59Z
version: metric-contract-v3
owner: agent-platform
```

这份字典的价值是让同一条 SQL、同一份回放脚本和同一张看板使用相同口径。`unknown` 单列，避免超时或未对账的任务被随手塞进失败；`receipt_verified` 把“接口返回 200”与“业务真的完成”区分开；`slices` 则防止总体平均掩盖某个租户或高风险任务的回归。

指标快照和结果一起留存，下一版本才有可能做公平对比。否则你会遇到一种很尴尬的进步：数字变好了，只是因为分母悄悄换了。

![指标口径快照卡](/images/notes/agent-metrics-baseline/metric-definition-snapshot.svg)

### L5：业务方临时修改成功定义怎么办？

允许新增口径，但不能覆盖历史版本。为新定义生成 `metric-contract-v4`，在同一批样本上并行计算旧、新两套结果，并在发布说明里写清差异；只有完成迁移和回溯后，才把新口径设为默认。

## 指标发布前先做一次“分母对账”

指标变好有时只是 eligible 条件变严、超时样本被排除，或者某个高风险租户不再进入统计。发布前可以生成一张分母对账卡，把被纳入、被排除和未知的数量并列出来：

~~~yaml
metric_denominator_reconciliation: mdr_20260820_09
metric: completed_task_rate
counts:
  total_requests: 12000
  eligible: 10840
  excluded_policy_block: 620
  excluded_user_cancel: 210
  unknown_timeout: 330
numerator:
  committed_and_verified: 9130
rate:
  reported: 0.842
  if_unknown_as_failure: 0.843
  if_unknown_as_excluded: 0.862
decision:
  status: publish_with_unknown_bucket
  alert: "unknown > 2%"
~~~

同一版本同时跑旧、新口径，确认未知桶没有被偷偷归入成功或失败。尤其是多租户产品，要把高风险租户和低流量分桶单独看，避免整体平均掩盖边界回归。

![指标分母对账卡把纳入、排除、未知和不同口径的结果放在一起](/images/notes/agent-metrics-baseline/denominator-reconciliation-card.svg)

### L5：为什么未知桶不能直接算失败？

直接算失败会把环境故障和业务失败混在一起，直接排除又会美化结果。正确做法是保留独立 unknown 桶，给它设上限和清理责任，同时报告“未知算失败”和“未知排除”两种敏感性结果。

## 指标发布前做一次“版本差异单”

指标字典解决“怎么算”，但发布还要解决“这次为什么变”。候选版本的 scorecard 应该把变化拆成数据、模型、工具、评测器和流量切片五类，并明确哪些变量没有变、哪些变量无法隔离。这样业务方看到成功率上涨时，团队不会把索引更新或样本筛选误说成模型能力提升。

```yaml
metric_diff: md_20260820_05
baseline: {version: prod-v4, dataset: golden-v3, n: 800}
candidate: {version: prod-v5, dataset: golden-v3, n: 800}
changed:
  - prompt: citation-contract-v2
unchanged:
  - model: model-v7
  - index: kb-20260818
  - tool_schema: billing-v3
observed:
  success_rate: {from: 0.78, to: 0.83}
  citation_support: {from: 0.74, to: 0.86}
  p95_ms: {from: 520, to: 610}
unknown: [long_tail_tenant_b]
decision: canary_with_long_tail_watch
```

如果 `unknown` 里有关键租户或高风险动作，发布单不能只写“总体通过”。可以先把路由限制到已覆盖切片，再补齐缺失样本；如果无法隔离变量，就把结论降级为“相关性观察”，下一轮用固定回放或消融实验补因果证据。

![指标版本差异单把变更变量、固定变量、结果变化和未知切片放在同一张发布记录里](/images/notes/agent-metrics-baseline/metric-diff-card.svg)

### L5：为什么指标上涨后仍要记录 unknown？

未知桶可能正好包含长尾租户、写操作或安全边界样本。把它们直接并入失败会污染总分，直接忽略又会掩盖风险；单列 unknown 才能决定先灰度观察、补样本还是阻断发布。

## 指标字典还要有“口径版本”和兼容窗口

指标定义不是一次性文档：业务把“成功”从“返回 200”改成“状态已提交”，评测器就会出现新旧口径并存。每个指标应有版本、分子、分母、排除条件、unknown 处理和适用流量；口径升级先双跑一段时间，报告里同时展示旧、新两条序列，并标记断点，不能直接覆盖历史数据。

发布候选版本时，分数差异要绑定指标版本。若新口径成功率下降，但真实状态成功率不变，可能只是把未知从成功里移出来；这不是模型退化，也不能用旧口径把风险抹掉。双跑期间把每个样本映射到两个 decision，保留无法映射的原因，下一轮再决定是否迁移历史报表。

```yaml
metric_contract: mc_20260820_56
name: task_success
v1:
  numerator: http_2xx
  denominator: accepted_requests
  unknown: excluded
v2:
  numerator: business_state_committed
  denominator: eligible_tasks
  unknown: separate_bucket
compat_window:
  dual_run_days: 14
  sample_mapping: per_trace
  break_marker: required
gates:
  historical_overwrite: false
  unknown_reason_recorded: true
decision: publish_v2_with_bridge
```

![指标口径桥接卡：旧新定义双跑，逐 trace 映射并保留换尺子的断点](/images/notes/agent-metrics-baseline/metric-contract-bridge-card.svg)

### L5：为什么同名指标也不能直接拼成一条趋势线？

分子、分母或 unknown 处理一旦变化，数值就不再处在同一把尺子上。必须标记 metric version 和 break marker；桥接完成前只能并行观察，不能把新旧点连接成“持续上涨”。

## 指标合同要把“分母”也版本化

同一个“成功率”如果换了分母，趋势图就不再连续：有的版本把 unknown 排除，有的版本把人工接管算成功，还有的版本只统计完成写入的任务。每个指标应保存定义版本、纳入/排除规则、切片字段、统计窗口和 break marker；版本切换时先并行计算一段时间，桥接完成后再决定能否连接趋势线。

```yaml
metric_contract_version: mcv_20260820_103
metric: task_success_rate
version: v3
numerator: [state_validated, user_acceptance]
denominator: all_eligible_tasks
unknown: separate_bucket
window: rolling_7d
slices: [tenant, task_risk, tool_path, model_revision]
break_marker: 2026-08-20T00:00:00Z
decision: bridge_old_and_new_for_14d
```

![指标合同版本：分子、分母、unknown 与切片共同决定一条趋势线是否可比较](/images/notes/agent-metrics-baseline/metric-contract-version-card.svg)

### L5：为什么“指标上涨”仍不能证明版本更好？

可能是分母缩小、unknown 被排除，或高风险任务流量下降。先核对 metric contract、流量构成和硬失败，再看置信区间与切片；没有同口径基线，单点上涨只是一条相关性信号。

## 60 秒面试回答

我会先定义任务成功和不能违反的硬门槛，再建立无 Agent、当前线上和候选版本三条基线。实验指纹锁住数据、模型、工具、Judge 和随机种子；指标分成任务结果、过程工具、证据安全、成本体验四层，报告分母、长尾和失败分桶。上线后保留轨迹与版本，遇到漂移先按失败类型归因。这样指标不是一张宣传表，而是能复算、能解释、能指导下一轮改动的工程证据。

## 交付前检查清单

- [ ] 成功标准和硬门槛已写成可执行条件
- [ ] 无 Agent、线上版本和候选版本基线齐全
- [ ] 数据、模型、工具、Judge 和随机种子有指纹
- [ ] 指标定义写明分子、分母和分桶
- [ ] 有人工校准与程序硬规则，不只依赖 Judge
- [ ] 线上报警能指出失败类型和可能原因

## 相关阅读

- [Agent 评测不能只看成功率：从结果到轨迹的五层指标](/notes/agent-eval-success-rate)
- [让 LLM 给答案打分，为什么也会偏？](/notes/llm-judge-calibration)
- [同一个 Agent 实验，怎样才能复现？](/notes/agent-eval-reproducibility)
- [离线评测 95 分，线上为什么还是翻车？](/notes/offline-eval-online-drift)

## 资料来源

- AgentAlpha《Agent 岗面试宝典 v3》（未公开讲义）
- ARIS in AI Offer：指标、基线和实验设计的分层写法
