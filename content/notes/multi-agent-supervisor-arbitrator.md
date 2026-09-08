---
slug: "multi-agent-supervisor-arbitrator"
title: "多 Agent 互相甩锅怎么办？从监督者到仲裁器设计"
excerpt: "当多个 Agent 给出冲突结论时，继续让它们自由辩论往往只会制造更多文本。真正的监督者要检查证据、约束和责任，而不是简单投票。"
series: "多智能体"
seriesNo: "07"
number: "31"
minutes: 19
---

三个 Agent 同时分析一次线上故障：一个说是缓存击穿，一个说是数据库连接池耗尽，一个说是用户输入导致的异常。协调器让它们继续讨论，十分钟后得到一段“综合来看，可能与多因素有关”的总结。

这不是协作，是把不确定性包装得更长。多 Agent 需要监督者和仲裁器，不是为了让某个角色拥有更高的模型温度，而是为了把冲突转成可检查的证据、约束和下一步实验。

## 先给一个能复述的答案

监督者负责检查任务是否按计划推进、产物是否满足 schema、风险动作是否越界；仲裁器只在候选结果冲突或无法自动合并时介入。它不应该只按多数票选答案，而要比较证据来源、独立性、时间范围、假设和验证结果。冲突处理顺序通常是：先分类冲突，再尝试规则合并；不能合并时设计最小区分实验；实验仍不能判定时升级人工。每次裁决都保留候选、理由、证据和责任链，方便回放。

![监督者和仲裁器的分工：监督推进与边界，仲裁证据与冲突](/images/notes/multi-agent-supervisor-arbitrator/supervision-boundary.svg)

图 1：监督者看过程是否合规，仲裁器看结果能否被证据支持，二者不要混成一个“总管 Agent”。

## 一、先区分三种“冲突”

### 事实冲突：对同一个事实给出不同值

例如两个检索 Agent 找到不同的发布日期。优先比较来源权威性、时间和原始证据，不要把自然语言的自信程度当成可信度。

### 目标冲突：都正确，但优化目标不同

性能 Agent 说应该缓存，安全 Agent 说敏感结果不能缓存。两边未必谁错，而是需要先明确“当前任务的硬约束”和可接受的折中。

### 状态冲突：基于不同版本做了修改

一个 Agent 基于代码 v10 提交补丁，另一个基于 v11 修改同一文件。这不是辩论问题，而是版本合并问题，需要冲突检测和重放。

| 冲突类型 | 典型信号 | 第一动作 |
| --- | --- | --- |
| 事实 | 同一 claim 的值不同 | 对比来源、时间和证据 |
| 目标 | 指标方向相反 | 重申硬约束和优先级 |
| 状态 | revision 不同 | 版本合并或重新执行 |
| 责任 | 都声称别人应负责 | 回到任务契约和事件链 |

## 二、监督者应该有可执行的检查点

监督者不是在每轮对话里说“做得不错”，而是在状态迁移处运行规则：

```python
def supervise(node, result, state):
    if result.schema_version != node.expected_schema:
        return "reject", "schema_mismatch"
    if not covers(result, node.required_fields):
        return "block", "missing_fields"
    if violates_policy(result, node.tool_policy):
        return "escalate", "policy_violation"
    if result.claims and not all(has_source(c) for c in result.claims):
        return "return", "uncited_claim"
    if result.cost > node.budget:
        return "stop", "budget_exceeded"
    return "accept", None
```

这些检查最好在模型之外执行。模型可以解释为什么缺少证据，不能自行宣布“证据已经足够”。

![监督检查点：schema、字段、权限、引用和预算在状态迁移前逐层拦截](/images/notes/multi-agent-supervisor-arbitrator/supervisor-gates.svg)

图 2：监督者的价值是把“不能继续”变成明确状态，而不是生成一段更有礼貌的拒绝。

## 三、仲裁不要直接投票，先做证据归一化

多数投票只适合候选独立、标准统一、错误代价相近的场景。工程问题通常不是这样：一个候选可能引用官方日志，另一个只凭经验猜测；三票猜测不能压过一票可复现证据。

仲裁前先把候选转换成统一结构：

```json
{
  "claim": "连接池耗尽是主要原因",
  "assumptions": ["流量峰值发生在 10:00-10:05"],
  "evidence": [
    {"type": "metric", "ref": "db.pool.waiters", "value": 82},
    {"type": "log", "ref": "incident-771", "quote": "timeout acquiring connection"}
  ],
  "confidence": 0.78,
  "next_test": "比较连接池等待与请求量时间序列"
}
```

然后按证据强度、独立性、时效性和与任务的匹配程度排序。`confidence` 是候选人对自己的估计，不能单独决定结果；它只能作为仲裁输入之一。

## 四、最小区分实验比长篇辩论更有用

当两个假设都解释得通，监督者应该要求 Agent 提出能区分它们的最小实验：

| 假设 A | 假设 B | 最小区分实验 | 通过信号 |
| --- | --- | --- | --- |
| 缓存击穿 | 连接池耗尽 | 对齐缓存 miss 与连接池等待时间 | 只有前者峰值同步 |
| OCR 错误 | 布局切片错误 | 固定图像重新跑 OCR / 切片 | 只改切片后答案恢复 |
| 工具超时 | 模型规划错误 | 回放同一计划，替换工具 mock | mock 正常则锁定工具 |

实验要控制变量、设置超时和成本上限，结果也要成为事件。不要让仲裁器在没有新证据时重复“思考”。

```text
候选 A ─┐
        ├─> 证据归一化 ─> 规则合并？ ─是─> 接受/记录
候选 B ─┘                       │
                               否
                                ▼
                         最小区分实验
                          │         │
                       可判定     不可判定
                          │         │
                        裁决       人工升级
```

## 五、仲裁责任要能追到人和版本

每次裁决至少记录：候选结果、来源 Agent、输入状态版本、被采用或拒绝的理由、实验结果、最终责任人和撤销条件。

```json
{
  "decision_id": "dec_19",
  "task_id": "incident_771",
  "candidates": ["cand_a", "cand_b"],
  "chosen": "cand_b",
  "basis": ["official_log", "reproduced_metric"],
  "rejected_because": {"cand_a": "no_direct_evidence"},
  "reviewer": "incident_supervisor",
  "state_version": 14,
  "reversal_condition": "new log contradicts timeline"
}
```

这样后续发现结论错误时，可以撤销一个决策，而不是把所有 Agent 从头再跑一遍。

## 六、如何处理“甩锅”

“我只是执行了上一个 Agent 的计划”通常说明系统没有记录责任边界。每个节点都要记录：接受了哪个输入版本、作出了什么决策、调用了哪些工具、产出了哪个 artifact、哪些约束由谁检查。

出现失败时按事件链回溯：

1. 任务是否被正确拆分？
2. 输入是否满足角色契约？
3. Agent 是否越过自己的工具和写权限？
4. 监督者是否在正确的状态迁移点检查？
5. 仲裁是否引用了过期或非独立证据？

如果每次都只问“哪个 Agent 犯错了”，团队会把系统性缺陷归咎给一个随机输出。

## 七、评测监督与仲裁质量

单看最终答案不够，要准备专门的冲突集：同事实不同来源、证据强弱不一、硬约束与软目标冲突、版本乱序、候选都不完整。指标至少包括：

- 约束拦截率：越界动作是否在副作用前被阻止；
- 证据选择准确率：是否选中更强、更相关的来源；
- 实验效率：能否用最少成本区分假设；
- 错误升级率：无法判断时是否及时交给人，而不是硬选；
- 裁决可解释率：每个结论是否能回到候选和事件。

## 监督与仲裁其实是一台状态机

很多“甩锅”来自状态没有被显式建模：一个 Agent 以为任务仍在草稿态，另一个已经把它当成可发布结果。可以把协作状态限制在几种可审计迁移中：

```text
draft -> candidate_ready -> supervised
  |           |                 |
  |           +-- schema/ACL ---+-- reject -> rework
  |                             |
  +----------------------------+-- conflict -> arbitrate
                                      |
                            resolved / human_escalated
```

每次迁移都要写入 `from_state`、`to_state`、`actor`、`artifact_version` 和 `reason`。监督者负责检查“能不能进入下一状态”，仲裁器负责处理“多个合法候选谁更合适”；如果状态本身不满足前置条件，仲裁器不应该替监督者补洞。

## 不可判定时，升级也要有协议

人工升级不是一句“请人看看”。升级包至少包含：冲突摘要、候选证据、已做实验、未决问题、建议动作和最晚响应时间。人工只需在候选范围内确认或补充信息，处理结果再回写成新的决策记录。

如果同类冲突频繁升级，说明规则、证据归一化或角色契约仍不够清楚。把升级样本按原因分桶，优先补最常见、代价最高的一类，而不是继续增加一个更大的仲裁模型。

## 仲裁结果要交付一份可撤销的裁决包

仲裁器输出不能只有“选 A”。下游需要知道它比较了哪些候选、依据什么证据、哪些规则没有通过，以及出现新证据时如何撤销：

```json
{
  "decision_id": "arb_204",
  "conflict": "policy_version_mismatch",
  "candidates": ["claim_a", "claim_b"],
  "evidence": [{"ref": "doc-v7:p4", "strength": "primary"}],
  "rule_checks": {"freshness": "pass", "tenant": "pass", "side_effect": "blocked"},
  "decision": "claim_a",
  "confidence": "bounded",
  "revoke_when": ["newer_policy", "evidence_deleted"],
  "next_owner": "supervisor"
}
```

`confidence=bounded` 表示当前证据足够做有限动作，但不代表事实永远正确。把撤销条件和下一位 owner 写进裁决包，能让系统在文档更新或权限变化时主动回到监督状态，而不是继续沿用旧结论。

![仲裁裁决包记录候选、证据、规则检查、撤销条件和下一位 owner](/images/notes/multi-agent-supervisor-arbitrator/arbitration-packet.svg)

### L5：为什么裁决记录必须写撤销条件？

因为 Agent 的结论依赖版本、权限和外部事实。没有撤销条件，后续系统只能把旧结论当成永久事实；写明触发器后，监督者才能在新证据出现时阻断、重审或升级人工。

![监督者控制状态迁移与硬门槛，仲裁器处理候选冲突，无法判定时按协议升级人工](/images/notes/multi-agent-supervisor-arbitrator/arbitration-record.svg)

## 面试官的三层追问

### L1：多个 Agent 结论冲突怎么办？

先按事实、目标、状态和责任分类，再归一化候选的证据、假设和版本。能按规则合并就合并，不能合并就设计最小区分实验，仍无法判断时人工升级。

### L2：为什么不能简单多数投票？

因为候选的证据强度、独立性和错误代价不同。多数猜测不能压过一条可复现的官方日志；投票只有在候选标准统一时才有意义。

### L3：监督者和仲裁器有什么区别？

监督者检查过程和边界：schema、权限、预算、引用和状态迁移；仲裁器处理多个合法候选之间的冲突，比较证据并决定是否实验或升级。一个更大的模型不等于监督器。

### L4：监督者自己出错了怎么办？

监督者也要有独立的 schema、权限和状态校验，关键副作用前保留不可伪造的工具回执；必要时用第二条规则链或人工抽检复核，不能让同一模型既产出又宣布合格。

### L4：什么时候应该直接人工升级，而不是继续做区分实验？

涉及不可逆写入、合规、用户权益或实验成本超过风险价值时，直接升级；升级包带齐候选、证据和已做实验，人工做最后授权，不让系统在不确定状态里无限循环。

### L5：如何判断仲裁器是不是只是在“改写多数意见”？

做合成冲突集和证据交换实验，检查它是否能识别来源强弱、版本冲突和不可判定样本；若无新证据却总选多数，应该降低其自动裁决权限。

### L5：冲突规则越来越多，怎样避免监督系统本身失控？

把规则按硬约束、版本、权限、质量和偏好分层，给每条规则 owner、测试样本和失效日期；规则之间冲突时先停在安全状态，再由负责人合并，而不是让模型自行解释优先级。

## 裁决包要能说明“为什么信它，也何时撤销它”

仲裁器输出一句“采用 Agent A 的结论”很轻，无法支撑后续执行。更稳的做法是交付一份裁决包：它把候选结论、证据、冲突类型、当前状态和撤销条件写在一起，协调器只消费通过检查的字段。

```json
{
  "ruling_id": "rule_20260819_18",
  "claim": "订单可以按现行政策退款",
  "selected": "agent-policy-v4",
  "alternatives": ["agent-policy-v3"],
  "evidence": [
    {"source": "policy-2026-08", "version": "v4", "locator": "p3"}
  ],
  "conflict": {"type": "state", "detected": true, "resolved_by": "freshness"},
  "valid_until": "2026-08-19T18:00:00Z",
  "revoke_if": ["source_version_changed", "receipt_mismatch"],
  "owner": "policy-supervisor"
}
```

`alternatives` 保留了被否决的候选，方便复盘仲裁器是不是总偏爱某个角色；`valid_until` 和 `revoke_if` 把裁决当成有条件的状态，而不是永久真理；`receipt_mismatch` 则要求真正执行后再确认一次副作用。这样监督者的职责从“选一个答案”变成“交付一份可验证、可撤销的决定”。

如果冲突不可判定，就把 `selected` 留空并升级人工，不能为了让流程继续而随机投票。系统宁愿慢一拍，也不要把没有证据的多数意见变成不可逆动作。

![可撤销的多 Agent 裁决包](/images/notes/multi-agent-supervisor-arbitrator/revocable-ruling-package.svg)

### L5：裁决撤销后，已经执行的副作用怎么办？

撤销只改变后续状态，不会神奇地抹掉已发生的动作。裁决包应绑定补偿动作或人工复核入口，执行器发现 `revoke_if` 命中时停止后续步骤、对账现有回执，并按业务支持的方式退款、回滚或标记待处理。

## 仲裁裁决还要留下“少数意见与撤销窗口”

仲裁器给出一个结论，并不意味着所有证据都一致。若只保存最终 winner，后续很难知道哪个候选被否决、为什么被否决，以及新证据出现时能否快速撤回。对高风险裁决，我会把少数意见、证据差异和撤销窗口写进裁决包。

一份可回放的裁决回执可以包含：

~~~yaml
minority_opinion_receipt: mor_20260820_30
case_id: case_449
candidates:
  - id: plan_a
    decision: selected
    evidence: [e12, e19]
  - id: plan_b
    decision: rejected
    evidence: [e22]
minority_opinion:
  owner: verifier-2
  concern: "plan_a 的来源版本晚于授权快照"
  severity: high
revoke_window:
  expires_at: 2026-08-20T19:00:00Z
  trigger: source_version_mismatch
next_owner: supervisor
decision: selected_with_watch
~~~

少数意见不是让系统永远投票，而是把“尚未解决的不确定性”显式交接给下一位 owner。撤销窗口内出现触发条件时，监督者可以暂停状态迁移、重新取证或升级人工；窗口过期后也要保留历史意见，避免复盘时只剩一句“仲裁通过”。

![可撤销裁决包：候选、证据、少数意见、触发条件和下一位 owner](/images/notes/multi-agent-supervisor-arbitrator/minority-opinion-card.svg)

### L5：为什么仲裁器只保留最终结论不够？

因为最终结论会掩盖仍然存在的证据冲突。保留少数意见和撤销窗口，才能让新证据触发可控回滚，而不是重新猜测当时为什么选择了某个方案。

## 把高风险裁决和副作用执行拆成两阶段提交

仲裁器选出一个候选，并不等于可以立刻写数据库、发消息或修改权限。高风险场景要把裁决和执行拆开：第一阶段只生成带版本和撤销条件的 `prepared ruling`，监督者检查 schema、权限、预算和证据；第二阶段执行器根据批准的 ruling 调用工具，拿到真实回执后再把状态提交为 `committed`。任何一方失败，都停在可重试或人工升级的状态。

```yaml
ruling_commit_receipt: rcr_20260820_17
ruling_id: arb_204
phase_1:
  selected: refund_plan_a
  policy_version: policy-v4
  side_effect: refund_order_881
  authorization: pending_supervisor
phase_2:
  authorization: approved
  idempotency_key: refund-881-v4
  tool_receipt: tool://refund/881/commit-2
  state: committed
verification:
  expected_amount: 1280.50
  actual_amount: 1280.50
  receipt_match: true
revoke_after_commit: compensate_or_human_review
```

这套两阶段不是为了把流程变复杂，而是把“选择正确”与“动作真的发生”分成两个可验收问题。`idempotency_key` 防止重试重复写入，`receipt_match` 防止工具返回成功但实际金额不一致；若撤销发生在提交之后，也只能走补偿或人工对账，不能假装副作用没有发生。

![裁决两阶段提交：先准备并授权，再执行、核对回执与处理补偿](/images/notes/multi-agent-supervisor-arbitrator/ruling-commit-card.svg)

### L5：为什么仲裁器不能直接调用工具完成它选中的方案？

仲裁器最适合比较证据和候选，不适合同时持有最终写权限。拆开后，监督者可以在副作用前检查授权和版本，执行器可以独立验证幂等与回执，任一环节异常都能停在安全状态。

## 仲裁分数要能解释“为什么升级人工”

把候选按一个总分排序很方便，但它会把证据冲突、风险和成本压成一个不可解释的数字。更实用的做法是先做硬门禁，再做可解释的比较：证据是否独立、版本是否一致、方案是否满足权限与预算、失败时能否补偿。任何硬门禁失败都不能被“平均分很高”覆盖；多个候选都过门禁但差距很小时，应该把不确定性显式升级，而不是假装模型很有把握。

仲裁结果还要保存被淘汰候选和淘汰理由。这样新证据到来时可以增量重算，也能判断系统是在稳定选择，还是长期偏爱某个角色的措辞。人工接管不是失败，而是一个带上下文的状态：交给谁、需要补哪份证据、何时重新评估，都要写进 ruling。

```yaml
arbitration_gate: ag_20260820_38
case: refund_881
hard_gates:
  evidence_version_match: pass
  authorization_scope: pass
  budget_limit: pass
  compensation_plan: pass
candidates:
  - {id: plan_a, evidence_independence: 0.82, risk: low, decision: selected}
  - {id: plan_b, evidence_independence: 0.79, risk: low, decision: held_as_alternative}
  - {id: plan_c, evidence_independence: 0.91, risk: high, decision: rejected_risk}
uncertainty:
  margin: 0.03
  trigger: margin_below_0.05
  next_owner: human_reviewer
decision: selected_with_human_review
```

![仲裁升级卡：先过硬门禁，再看证据与风险；差距过小时保留候选并升级人工](/images/notes/multi-agent-supervisor-arbitrator/arbitration-escalation-card.svg)

### L5：为什么“模型自信度高”不能替代仲裁门禁？

自信度通常反映模型对自身输出的偏好，不等于证据新鲜、权限有效或副作用可补偿。硬门禁负责不可妥协的边界，置信度只用于排序和决定是否需要额外复核。

## 仲裁器还要做“裁决后漂移探针”

裁决通过时的证据、权限和预算，可能在真正执行前已经变化：文档版本更新、票据被撤销、预算被前一个任务消耗。于是执行器不能只相信 `ruling_id`，而要在提交前重新比较裁决快照和当前状态；若发生漂移，就把裁决标成 stale，回到澄清、重算或人工复核。

```yaml
post_ruling_drift_probe: prd_20260820_86
ruling_id: arb_204
prepared_snapshot:
  evidence_version: docs-v12
  policy_version: policy-v4
  budget_remaining: 240
current_at_commit:
  evidence_version: docs-v13
  policy_version: policy-v4
  budget_remaining: 80
drift:
  evidence_changed: true
  budget_changed: true
action: stale_ruling_recompute
side_effect: blocked
```

![仲裁后漂移探针：提交前重新核对证据、策略和预算快照，漂移就阻断副作用](/images/notes/multi-agent-supervisor-arbitrator/post-ruling-drift-card.svg)

### L5：为什么已经批准的 ruling 还要在执行前重验？

批准只代表某个时间点的事实成立，不代表执行时仍成立。高风险动作必须绑定证据、权限和预算快照，并在 compare-and-set 失败时停止，避免旧裁决穿透到新状态。

## 60 秒面试回答

我会先区分事实冲突、目标冲突、状态冲突和责任冲突。监督者在节点交付时检查 schema、必填字段、权限、引用和预算，结果不合格就阻断或返工；仲裁器不按模型自信或简单多数投票，而是把候选统一成 claim、assumptions、evidence 和 next_test，比较来源、时效和独立性。能规则合并就合并，不能就设计最小区分实验，仍不可判定则升级人工。每次裁决保留候选、版本、理由和撤销条件，便于回放和追责。

## 带走一张冲突处理清单

- [ ] 是否把监督过程和仲裁结果分成两个职责？
- [ ] 候选结果是否都带证据、假设、版本和下一步验证？
- [ ] 是否有 schema、权限、引用和预算检查点？
- [ ] 冲突是否优先通过最小区分实验解决？
- [ ] 无法判断时是否有人工升级，而不是强行投票？
- [ ] 裁决是否记录理由、责任和撤销条件？

## 相关笔记

- [多 Agent 不是群聊：角色分工、消息协议和状态同步怎么做](/notes/multi-agent-protocol-state)
- [多 Agent 系统为什么越加人越慢？并发、上下文和预算控制](/notes/multi-agent-concurrency-budget)
- [Agent 安全不是加一句提示词：权限、工具和数据边界怎么设计](/notes/agent-security-boundaries)
- [Agent 上线后怎么定位问题？从 trace 到可观测性和回放](/notes/agent-observability-replay)

## 参考

- [Agent 岗面试宝典 v3：共识与冲突解决考点（本地导入）](/content/imports/agent-interview-v3.feishu.md)
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
