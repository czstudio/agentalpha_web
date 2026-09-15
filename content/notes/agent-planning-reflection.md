---
slug: "agent-planning-reflection"
title: "规划与反思什么时候有用，什么时候只是让 Agent 多说废话"
excerpt: "Planner 不是拆得越细越聪明，Reflection 也不是补一句“你确定吗”。计划得能落地执行，反馈得真能改方向，什么时候收手也要提前定好。"
series: "Agent 架构"
seriesNo: "06"
number: "26"
minutes: 19
---

你让 Agent “先制定计划，再逐步执行”。它很快交出一份漂亮的五步方案：搜索资料、分析数据、生成报告、检查格式、提交结果。

第一步就卡住了：

工具实际需要的是一个项目 ID，Planner 却只写了“查询相关项目”；第二步依赖第一步的返回字段，计划里完全没有说明；最后一步说“检查完成后提交”，却没有任何可机器判断的完成标准。

这类 Agent 看起来很有条理，其实只是把没想清楚的地方排版得更整齐。

面试里的规划题，常常会继续追问：工作流和 Agent 怎么选？ReAct、Plan-and-Execute、ReWOO、状态机分别适合什么？Planner 发现计划不可执行时如何 Replan？连续反思失败后什么时候降级？这些题都在考同一件事：你有没有把“想一想”变成可执行的控制系统。

## 拆完先给结论

规划的价值不在于生成一段更长的思考，而在于把目标、约束、依赖、验收标准和下一步动作显式化。固定流程优先用工作流或状态机；任务路径不确定、需要根据工具反馈调整时才引入 Agent。Plan-and-Execute 适合先有全局路线再执行，ReAct 适合边观察边决定，ReWOO 适合工具依赖能提前展开的任务。Reflection 只应在出现可验证的失败信号、假设冲突或验收未通过时触发，并且每次反思必须改变计划、参数或策略；没有新证据的“再想一遍”只是成本。

![工作流、ReAct、Plan-and-Execute 与 ReWOO 的选择边界](/images/notes/agent-planning-reflection/pattern-matrix.svg)

图 1：先看不确定性和依赖关系，再决定需要哪种规划模式。

## 一、先判断：这件事真的需要 Agent 吗

很多团队把“流程里加一个模型”叫 Agent，把“模型能自己规划”叫智能。面试官往往会反过来问：如果规则已经明确、步骤稳定、异常有限，为什么不用工作流？

判断可以从四个维度开始：

| 维度 | 工作流 / 状态机更合适 | Agent 更有价值 |
| --- | --- | --- |
| 路径 | 预先知道主要步骤 | 根据观察动态选择工具和路线 |
| 输入 | 字段稳定、格式明确 | 需求模糊，需要澄清和归纳 |
| 验收 | 每一步有确定规则 | 需要综合证据或开放式判断 |
| 失败 | 少量已知分支 | 新情况多，需要恢复和重规划 |

“需要 Agent”不是“越自由越好”。在客服退款、订单扣款、权限变更这类场景，关键动作仍应由状态机、策略引擎和审批边界控制；模型可以帮忙理解意图、补齐参数、解释结果，但不应该自由决定状态跳转。

一个实际项目通常是混合的：外层用状态机守住生命周期，局部用 Agent 处理开放问题，工具层用 Schema 和策略检查约束。把整个系统交给一个循环，出了问题只会得到一句“模型当时这么想的”。

## 二、四种常见模式，各自解决不同问题

### ReAct：观察一次，决定下一步

ReAct 把推理、工具动作和环境观察交替起来。它适合搜索、调试、浏览器操作等每一步都依赖新信息的任务。

优点是灵活，缺点是全局目标容易被局部结果带跑。搜索到一个相关页面后，Agent 可能继续围绕这个页面深挖，却忘了原始任务还有一半没做。

### Plan-and-Execute：先路线，后执行

Plan-and-Execute 让 Planner 先输出任务分解，Executor 按计划逐项完成。它适合依赖关系相对清楚、执行阶段可以并行或复用工具的任务，例如批量整理资料、生成多份格式统一的报告。

问题是计划会过期。第一步的工具结果可能改变后续条件，因此计划必须带依赖、输入输出和重新规划触发器，不能当成一次性作文。

### ReWOO：把工具依赖提前展开

ReWOO 让计划中的工具调用引用前面步骤的变量，减少每一步都重新让模型思考。对工具链稳定、依赖图清晰的任务，它能降低上下文和推理成本。

它不适合强交互环境：如果搜索结果高度不确定，提前展开的计划可能从第三步就失效。选择 ReWOO 的前提，是你真的知道哪些变量会变，哪些关系可以提前固定。

### 状态机：把可接受的状态变化写死

状态机不是“没有智能”，而是把重要边界变成可以验证的状态变化。订单系统可以有 `created → paid → shipped → delivered`，每次跳转都有条件和幂等键；模型只负责解释用户意图和收集缺失字段。

| 模式 | 最强的地方 | 最容易坏的地方 | 适合题型 |
| --- | --- | --- | --- |
| ReAct | 适应新观察 | 走偏、空转 | 开放搜索、调试 |
| Plan-and-Execute | 全局路线清楚 | 计划过期 | 多步骤报告、批处理 |
| ReWOO | 依赖可展开、成本低 | 结果一变全线失效 | 稳定工具链 |
| 状态机 | 边界和恢复可验证 | 对开放问题表达力弱 | 交易、审批、运维 |

## 三、计划要写成数据，不要只写成自然语言

一个可执行计划至少要包含：目标、步骤 ID、输入、输出、依赖、可用工具、验收标准、最大重试次数和失败转移。这样 Executor 才能在失败时反馈具体信息，而不是把一句“做得不对”丢回 Planner。

```json
{
  "goal": "生成本月销售异常报告",
  "constraints": {"period": "2026-08", "tenant": "shop_a", "max_cost": 2.0},
  "steps": [
    {
      "id": "fetch_orders",
      "depends_on": [],
      "tool": "query_orders",
      "input": {"period": "${period}", "tenant": "${tenant}"},
      "output": "orders",
      "accept": ["rows > 0", "schema == order_v3"],
      "on_failure": "replan"
    },
    {
      "id": "detect_anomaly",
      "depends_on": ["fetch_orders"],
      "tool": "run_anomaly_model",
      "input": {"rows": "${orders}"},
      "output": "anomalies",
      "accept": ["confidence >= 0.8"],
      "on_failure": "ask_user"
    }
  ]
}
```

计划里的 `accept` 比“检查一下结果”重要得多。没有验收标准，Executor 即使拿到空数据，也可以非常自信地进入下一步。

![结构化计划如何连接依赖、工具、验收和失败转移](/images/notes/agent-planning-reflection/plan-schema.svg)

图 2：计划的每一步都要能回答“依赖什么、产出什么、怎样算成功、失败去哪儿”。

## 四、Planner 和 Executor 要互相说人话，也说机器话

Planner 不应该只向 Executor 发送一段解释。反馈至少要结构化成四类：

- **输入问题**：缺少参数、类型不符、权限不足；
- **工具问题**：超时、限流、外部服务异常；
- **计划问题**：依赖不存在、路径不可执行、验收标准冲突；
- **结果问题**：工具成功但结果为空、证据不足、验证未通过。

不同类型的失败，恢复策略不能一样。输入问题通常要澄清或补参；工具问题可以退避、换工具或延迟；计划问题需要 Replan；结果问题需要回到假设层，而不是盲目重试同一个动作。

```python
def handle_failure(step, result):
    kind = classify(result)
    if kind == "input":
        return "ask_user", {"missing": result.missing_fields}
    if kind == "tool":
        return "retry_or_fallback", {"attempt": step.attempt + 1}
    if kind == "plan":
        return "replan", {"failed_step": step.id, "reason": result.reason}
    if kind == "result":
        return "revise_hypothesis", {"evidence": result.evidence}
    return "human_review", {"raw": result.raw}
```

一个经验是：不要把完整历史每次都重新塞给 Planner。传入失败步骤、已有输出、不可变约束和新证据即可；上下文越大，Planner 越容易重复解释过去，而不是修改未来。

## 五、Reflection 必须有触发器和产物

“请反思一下”不是机制。Reflection 只有在有新信息时才有价值，触发器可以来自：

1. 验收条件未通过；
2. 新证据与计划假设冲突；
3. 同一步骤连续失败；
4. 预算、时延或权限即将越界；
5. 用户补充了影响目标的硬约束。

每次反思都要产出可比较的变化：修改哪个假设、删除哪个步骤、替换什么工具、增加什么约束、把任务降级到哪里。若新计划和旧计划完全相同，却消耗了更多 token，那不是反思，是重新排版。

![Reflection 只有在失败或新证据出现时触发，并且必须产生可验证的计划变化](/images/notes/agent-planning-reflection/reflection-loop.svg)

图 3：反思是控制回路，不是额外的聊天气泡。

### 设置停止条件，避免无限反思

至少要有三类停止条件：

- **成功停止**：验收条件全部通过，并且没有未处理的硬约束；
- **失败停止**：同一根因达到重试上限、证据互相矛盾或权限不足；
- **预算停止**：步骤数、token、时间或工具费用达到上限。

达到失败停止后，系统应该明确降级：请求用户澄清、转人工、交付部分结果，或输出可复盘的失败报告。继续让模型“再试一次”，通常只会把坏状态拖得更长。

![规划停止条件：成功、预算耗尽、无变化和高风险审批分别走不同出口](/images/notes/agent-planning-reflection/stop-conditions.svg)

图 4：停止条件是 Planner 的一等公民，不能让“再试一次”成为默认分支。

## 六、如何让计划可回放

线上 Bad Case 不是靠模型记忆复盘。每个计划版本都要记录：输入目标、约束快照、Planner 版本、工具版本、每一步状态、观察摘要、验收结果和重规划原因。

可以把每次状态变化写成事件：

```json
{
  "run_id": "run_902",
  "plan_version": 3,
  "event": "replan",
  "step": "detect_anomaly",
  "reason": "confidence=0.42 < 0.8",
  "evidence_ids": ["tool_12", "tool_13"],
  "next": "ask_user",
  "timestamp": "2026-08-19T10:22:31Z"
}
```

回放时优先使用原始工具结果和确定性快照，不要重新调用外部接口。否则你复现的可能只是今天的结果，而不是线上当时发生的那一次。

## 七、一个真实的取舍：少规划一步，反而更可靠

做知识库报告 Agent 时，团队曾经把流程拆成十一个小步骤。每步都写了摘要，确实很“专业”，但平均耗时翻了两倍，且摘要之间不断丢失过滤条件。

后来把任务改成四个阶段：澄清范围、并行取证、冲突核对、交付验收。中间的排序和格式化交给程序；只有证据不足或发现冲突时才触发反思。步骤少了，失败也更容易定位，因为每个阶段的输入输出边界清楚。

规划的目标不是让 Agent 说出更多步骤，而是让关键决策更可见、失败更可恢复。能由代码保证的就不要交给模型；真正需要开放判断的地方，再让 Agent 参与。

## 面试官的三层追问

### L1：工作流和 Agent 什么时候选哪个？

路径、输入和验收稳定时优先工作流或状态机；任务需要根据环境观察动态选工具、处理开放问题或澄清需求时才引入 Agent。生产系统通常是两者组合：代码守住边界，模型处理不确定性。

### L2：Planner 生成的计划不可执行怎么办？

Executor 要返回结构化失败类型、缺失输入、新证据和已完成步骤，而不是只返回自然语言。Planner 根据失败类型选择补参、重试、换工具或 Replan，并保留不可变约束；重规划要产生新的计划版本，不能静默覆盖旧版本。

### L3：反思失败三次以后怎么办？

设置任务级和根因级上限。达到上限后停止自动循环，按场景请求澄清、转人工或交付部分结果，并输出带 trace 的失败报告。继续反思的成本和风险都应高于明确降级。

## 计划执行要发一张“状态—动作—停止”回执

计划写得很漂亮，不代表执行器能安全地照着走。真实任务会遇到工具超时、前置条件变化和预算耗尽；如果计划里没有明确的状态和停止条件，Agent 只能靠模型临场解释，最后就会出现“已经反思三轮，但谁也说不清下一步为什么还要继续”。

我会让 Planner 输出一张可消费的计划回执：

```yaml
plan_run: plan_af7023
goal: 核对订单退款资格并提交申请
steps:
  - id: check_policy
    requires: [order_id]
    produces: [policy_evidence]
  - id: check_status
    requires: [order_id]
    produces: [order_state]
  - id: submit_refund
    requires: [policy_evidence, order_state]
    side_effect: write
stop:
  success_if: [policy_evidence.valid, order_state.refundable]
  pause_if: [evidence_conflict, approval_missing]
  fail_if: [budget_exhausted, unknown_side_effect]
reflection:
  max_rounds: 2
  trigger: step_failed_or_new_evidence
```

执行器只推进满足 `requires` 的步骤；触发 `pause_if` 时交给人工或上层协调器，触发 `fail_if` 时保留当前状态，不再让模型“再试一次看看”。`reflection` 也被限制在具体事件上，不能把反思当成无限聊天。

这张回执让计划从一段文字变成一个小型状态机：成功、暂停、失败都能在 trace 里定位，回放时还能判断是计划错了、证据变了，还是执行器没有遵守边界。

![计划执行状态回执](/images/notes/agent-planning-reflection/plan-state-receipt.svg)

## 重规划之后还要做一次“不可变约束回放”

Reflection 能改变计划，但不能偷偷改变任务的硬约束。每次 replan 都保存旧版和新版计划，抽出不能变的 tenant、预算、禁止动作、审批要求和截止时间，分别在新计划上做一次 dry-run；如果约束消失或被改写，直接把计划打回人工，而不是继续执行一个“更聪明但不再合规”的方案。

~~~yaml
replan_invariant_receipt: rir_015f0f
plan_before: plan_07
plan_after: plan_08
invariants:
  tenant_id: team-alpha
  budget_usd: 0.50
  forbidden_actions: [refund_without_approval]
  deadline: 2026-08-20T20:00:00Z
checks:
  preserved: [tenant_id, budget_usd, forbidden_actions, deadline]
  changed: [tool_order, evidence_source]
decision: replan_allowed
~~~

重规划的验收重点是“改变了什么、没有改变什么”。如果只是换了工具顺序和证据来源，可以继续；如果预算、租户或审批门槛被模型顺手改掉，应该停在 `blocked`，等人确认新的任务合同。

![重规划约束回放：新计划可以变，但租户、预算和禁止动作必须原样保留](/images/notes/agent-planning-reflection/replan-invariant-card.svg)

### L5：为什么 Reflection 不能重写所有约束？

因为反思的权限是修正路径，不是修改目标合同。把硬约束锁在执行器和状态回执里，才能防止模型为了“完成任务”把预算、租户或审批要求一起放宽。

### L5：为什么“计划完成”不等于“业务完成”？

因为计划完成只说明步骤跑完，业务完成还需要副作用回执和证据验证。比如退款接口返回成功，但支付系统仍处于未知状态，计划应停在 `pending_reconcile`，而不是把自然语言总结写成“退款已完成”。

## 重规划前要检查“证据新鲜度”和计划租约

计划不是生成出来就永久有效。工具观察、库存、权限和用户意图都可能在执行中变化；如果 Planner 拿着十分钟前的证据继续提交写操作，计划本身再漂亮也已经过期。每个计划要带 `plan_version`、证据快照和短租约，执行器在关键副作用前重新读回；租约过期只允许重新规划，不允许直接沿用旧步骤。

```yaml
plan_lease: pl_1d42ef
plan_version: 08
evidence_snapshot:
  order_state: ev_441
  policy: ev_442
  acl_epoch: 418
issued_at: 2026-08-20T09:30:00Z
expires_at: 2026-08-20T09:35:00Z
before_write:
  reread_required: [order_state, approval, acl_epoch]
  stale_action: replan
  old_plan_execution: blocked
decision: lease_valid
```

![计划租约卡：证据快照、有效窗口与副作用前读回共同阻止旧计划继续写入](/images/notes/agent-planning-reflection/plan-lease-freshness-card.svg)

### L5：为什么只给计划加版本号还不够？

版本号只能标识“哪份计划”，不能说明它依赖的订单、权限和政策是否仍是最新事实。计划要和证据快照、租约过期时间绑定，关键写操作前还要读回当前状态。

## Reflection 也要有预算和“必须改变什么”的契约

反思不是免费再问一次模型。没有预算时，Agent 可能在同一个错误假设上循环；没有变化契约时，第二份计划只是第一份计划换了措辞。每次 Reflection 都要携带触发原因、允许消耗的 token/时间、待验证假设和最小变化类型，例如改工具参数、换检索范围、缩小目标或转人工；如果无法产生变化，就立即停止并报告缺口。

把 Reflection 分成诊断和重规划两步也更容易回放。诊断只读取失败 trace 和当前证据，不能写外部状态；重规划输出新版本计划和差异摘要，再由 policy gate 判断是否允许继续。这样既能复盘“为什么重规划”，又能防止模型把反思当成无约束的长篇自言自语。

```yaml
reflection_contract: rc_ff07be
trigger: tool_timeout_after_policy_pass
budget: {tokens: 1200, wall_ms: 500}
hypotheses: [provider_slow, stale_cursor, wrong_retry_scope]
diagnosis:
  reads: [trace, receipt, cursor_state]
  side_effects: 0
replan:
  allowed_changes: [retry_scope, cursor_reset, human_escalation]
  must_change: true
  plan_diff_required: true
stop:
  no_new_evidence: escalate
  budget_exhausted: report_gap
decision: replan_only_if_diff_exists
```

![Reflection 契约卡：触发原因、预算、可变假设和计划差异共同限制反思循环](/images/notes/agent-planning-reflection/reflection-budget-contract-card.svg)

### L5：为什么“再思考一次”不能算 Reflection 成功？

成功不在于输出更多文字，而在于新证据、计划差异或动作边界发生可验证变化。若第二次反思没有改变假设、参数、路由或停止条件，就应停止循环并把缺口交给人工或用户。

## 计划质量要看“完成价值 / 副作用预算”，不是步骤越多越聪明

Planner 很容易生成看起来完整、实际不可执行的长计划。可以用一个粗粒度目标函数提醒自己：

$$
V(plan)=\sum_t \gamma^t\,U(a_t)-\lambda\,Risk(plan)-\mu\,Cost(plan)
$$

计划只有在预期收益超过风险和成本时才值得继续展开。Reflection 的职责不是把计划写得更长，而是根据新证据删掉低价值步骤、缩短租约，并明确哪些不变量绝对不能改。

```yaml
plan_value_review:
  contract: pvr_4bc729
  horizon: 5
  expected_utility: 0.82
  risk: 0.18
  tool_cost: 0.11
  discount: 0.90
  replan_if:
    - evidence_age_minutes_gt: 10
    - invariant_violation: true
    - expected_value_below: 0.40
```

![计划价值复核：预期收益、风险、工具成本和证据新鲜度决定是否重规划](/images/notes/agent-planning-reflection/plan-value-review-card.svg)

## 聊透之后怎么收尾

我会先判断任务的不确定性：固定路径和严格边界用工作流或状态机，只有需要基于工具观察动态决策时才引入 Agent。ReAct 适合边观察边行动，Plan-and-Execute 适合依赖相对清楚的多步骤任务，ReWOO 适合工具依赖能提前展开的链路。无论哪种模式，计划都用结构化数据表达目标、依赖、输入输出、验收和失败转移。Reflection 只在验收失败、假设冲突或预算越界时触发，每次必须改变计划、参数或策略；达到重试、时间或成本上限后明确降级。这样规划才是控制系统，不是让模型多写一段思考。

## 容易被扣分的说法

- “Agent 先规划得越详细越好。”——细节越多，计划过期和维护成本越高。
- “反思就是再调用一次大模型。”——没有触发器和产物，无法证明它改变了决策。
- “失败就让 Planner 重新生成计划。”——没有失败分类，工具故障和策略错误会被混在一起。
- “状态机太死，不适合 Agent。”——交易、权限和副作用本来就需要可验证状态边界。
- “达到上限后继续重试，说不定就成功。”——这通常是成本失控和副作用重复的开端。

## 带走一张规划检查清单

- [ ] 是否先证明任务需要 Agent，而不是把固定流程模型化？
- [ ] 计划是否包含依赖、输入输出、验收和失败转移？
- [ ] Executor 返回的失败是否区分输入、工具、计划和结果问题？
- [ ] Replan 是否有版本、原因和不可变约束？
- [ ] Reflection 是否由新证据触发，并且一定产生变化？
- [ ] 是否设置成功、失败和预算三类停止条件？
- [ ] 线上计划能否用原始工具结果和版本快照回放？

## 本篇总结

- 规划的价值是显式化目标、依赖、验收和恢复，不是输出更长的思考。
- ReAct、Plan-and-Execute、ReWOO、状态机各有边界，生产系统通常混用。
- Planner 与 Executor 之间必须传结构化失败，而不是模糊的“做得不对”。
- Reflection 需要触发器、变化和停止条件，不能让模型无限自问自答。
- 能由代码保证的边界交给代码，真正开放的决策才交给 Agent。

## 相关内容

- [Agent 已经会 ReAct，为什么还要做 Agentic RL？](/notes/agentic-rl-react)
- [记忆系统不是聊天记录：短期、长期和压缩到底怎么分工](/notes/agent-memory-system)
- [代码 Agent 为什么总要先读仓库，再开始写？](/notes/code-agent-repo-context)
- [Code Agent 跑到一半挂了，怎样恢复又不重复执行？](/notes/code-agent-resume-exactly-once)

## 参考资料

1. Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*（2022）。
2. Xu et al., *ReWOO: Decoupling Reasoning from Observations for Efficient Augmented Language Models*（2023）。
