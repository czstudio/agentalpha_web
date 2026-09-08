---
slug: "agent-observability-replay"
title: "Agent 上线后怎么定位问题？从 trace 到可观测性和回放"
excerpt: "最终答案只是 Agent 的最后一帧。要定位线上 Bad Case，必须把规划、检索、工具、模型、状态变化和验收证据串成一条能重放的轨迹。"
series: "Agent 架构"
seriesNo: "06"
number: "28"
minutes: 20
---

线上监控显示：任务成功率从 91% 降到了 84%。

工程师打开几条日志，看到的却是：

```text
request started
tool called
request finished
```

没有模型版本，没有检索候选，没有工具参数，没有重试原因，也没有办法知道“finished”到底是成功交付，还是 Agent 放弃后返回了一段客气话。

这就是很多 Agent 系统的可观测性现状：日志很多，证据很少。

飞书文档里的调试与可观测性题会继续追问：怎样设计全链路 Trace？如何做离线评测、回放评测、灰度评测和线上指标闭环？一次升级让成功率下降 3%，如何止损和定位？这些问题的共同答案是：不要只记录最终文本，要记录每一次决策和状态变化，并让它们可以被安全地重放。

## 先给一个能复述的答案

Agent 可观测性要把一次任务建模成带版本和因果关系的 Trace：根 Span 表示任务，子 Span 分别记录规划、模型生成、检索、工具调用、状态更新和验收。每个 Span 至少带输入摘要、输出摘要、耗时、模型/Prompt/工具版本、token 与成本、错误类型和证据引用；敏感内容要脱敏或只存哈希。线上问题定位按任务、步骤、工具、检索和生成分层归因，而不是把所有失败归给模型。回放使用原始环境快照和工具结果，在隔离沙箱里重建当时状态；对外部副作用使用 dry-run、幂等键和回执，禁止直接重放扣款、发货等动作。

![一次 Agent 任务由多层 Span 组成，最终答案只是最外层结果](/images/notes/agent-observability-replay/trace-tree.svg)

图 1：Trace 要保留决策链，而不是只保留“请求开始”和“请求结束”。

## 一、先把 Agent 任务拆成可观察的层

一个完整任务至少可以分成五层：

1. **Task 层**：用户目标、租户、会话、最终成功与否；
2. **Plan 层**：计划版本、当前步骤、重规划原因、停止条件；
3. **Action 层**：模型输出的工具名、参数、结构化答案和停止动作；
4. **Environment 层**：检索结果、文件片段、网页、测试输出和工具回执；
5. **Evaluation 层**：验收规则、证据、成本、延迟和安全判定。

这五层不能混成一段 Prompt。模型生成的 Action 与环境返回的 Observation 要分开保存，原因不只是训练需要，线上排错同样需要：如果测试日志失败，责任可能在工具；如果模型选择了错误参数，责任才可能在策略。

| 层 | 关键字段 | 用来回答什么 |
| --- | --- | --- |
| Task | run_id、tenant、goal、status | 这次任务是否完成 |
| Plan | plan_version、step、replan_reason | 为什么走这条路线 |
| Action | model、prompt_version、tool_args | 模型做了什么选择 |
| Environment | tool_version、result_digest、latency | 外部世界返回了什么 |
| Evaluation | checks、evidence、cost | 为什么算成功或失败 |

## 二、Trace 不是把所有原文都存下来

可观测性和数据泄露之间需要有明确取舍。每个事件可以把字段分成三类：

- **必须明文**：状态、版本、耗时、错误类型、资源 ID 的脱敏形式；
- **可摘要**：长 Prompt、网页正文、代码片段、模型输出；
- **只存摘要或哈希**：密码、支付信息、个人身份数据、访问令牌。

摘要不能把因果关系抹掉。比如工具返回 200 个商品，日志可以记录 schema、数量、排序摘要和 hash，但至少要保留“模型实际看到的字段集合”和引用 ID，否则无法解释它为什么选了某个商品。

```json
{
  "trace_id": "tr_19a",
  "span_id": "sp_tool_03",
  "parent_id": "sp_plan_02",
  "kind": "tool_call",
  "name": "search_catalog",
  "status": "ok",
  "versions": {"agent": "checkout_v7", "tool": "catalog_v3"},
  "input": {"query_digest": "sha256:...", "filters": ["tenant_a"]},
  "output": {"rows": 20, "schema": "item_v4", "evidence_ids": ["item_77"]},
  "timing_ms": 428,
  "cost": {"tokens": 0, "usd": 0.002},
  "replay": {"fixture_id": "fx_19a_03", "side_effect": false}
}
```

字段命名稳定，比“以后想起来再加日志”重要。没有 `parent_id`，你看到的是一堆事件；有了它，才能画出因果树。

## 三、指标要分层，否则无法归因

Agent 的最终成功率下降，可能由很多原因造成。指标至少分五层：

![Agent 指标从任务成功率下钻到步骤、工具、检索和模型](/images/notes/agent-observability-replay/metric-funnel.svg)

图 2：指标从结果向下钻，直到找到第一个发生变化的层。

| 层级 | 核心指标 | 常见根因 |
| --- | --- | --- |
| 任务 | success rate、完成时间、转人工率 | 目标或验收变化 |
| 步骤 | step pass rate、重试率、空转率 | 计划、状态或停止条件 |
| 工具 | 成功率、P95、超时、配额 | 外部服务和参数 |
| 检索 | Recall@k、证据覆盖、引用支持 | 数据、分块、排序 |
| 生成 | 格式通过率、拒答率、token | 模型、Prompt、上下文 |
| 安全 | 越权拦截、审批拒绝、敏感泄露 | 策略和边界 |

不能只看平均值。Agent 的长尾通常藏在 P95/P99、特定租户、特定工具、特定模型路由或特定任务难度里。一次升级后成功率下降 3%，第一步不是重新训练，而是按版本、租户、模型、工具和题型切片。

## 四、失败分类要让系统知道“谁该背锅”

我会把失败至少分成五类：

1. **输入失败**：用户目标不完整、参数非法、权限未授权；
2. **策略失败**：计划不可执行、停止条件错误、模型选错工具；
3. **工具失败**：超时、限流、服务异常、返回 schema 变化；
4. **环境失败**：数据过期、页面变化、依赖安装失败、外部状态冲突；
5. **评测失败**：验收器误判、证据不完整、指标口径变化。

同一个最终结果“任务失败”，不同类别的修复动作完全不同。工具失败要重试或降级，策略失败要改 Planner 或 Schema，评测失败要修验收器。把五类都统计成模型失败，团队会持续优化错地方。

![Bad Case 归因：从最终失败沿着事件链找到第一个异常节点](/images/notes/agent-observability-replay/failure-attribution.svg)

图 3：先找第一个异常节点，再讨论上游模型还是下游工具。

## 五、回放不能真的“再执行一遍”

回放的目标是重建决策，不是重新制造副作用。需要把一次线上任务分成两种事件：

- **可冻结观察**：检索候选、文件内容、网页快照、工具返回、模型版本；
- **不可直接重放的动作**：扣款、发货、删文件、发外部邮件、修改生产配置。

回放环境应从 fixture 读取冻结观察，对副作用工具强制 dry-run；如果必须调用真实服务，也要用隔离租户、幂等键和人工确认。模型的随机性要记录 seed 或采样参数，不能只记模型名称。

![回放契约把线上快照、隔离执行和版本差异比较连成一条安全链路](/images/notes/agent-observability-replay/replay-contract.svg)

图 4：回放先冻结观察，再隔离执行，最后比较差异；副作用永远停在 dry-run 边界内。

```python
def replay(trace, mode="dry_run"):
    env = FixtureEnv(trace.replay_fixtures)
    for event in trace.events:
        if event.kind == "tool_call":
            result = env.reply(event.span_id)
            assert digest(result) == event.output_digest
        elif event.kind == "side_effect":
            if mode != "dry_run":
                raise RuntimeError("side effect blocked in replay")
            env.record_simulated(event)
    return env.final_state()
```

回放结果最好同时保存“当时结果”和“当前代码重新决策的结果”，这样才能区分数据变化、版本变化和非确定性。

## 六、离线、回放、灰度和线上要连成闭环

四种评测各自回答不同问题：

| 阶段 | 主要问题 | 允许的动作 |
| --- | --- | --- |
| 离线黄金集 | 新版本在固定任务上是否变好 | 完整运行，快速迭代 |
| 历史回放 | 能否解释线上真实 Bad Case | fixture + dry-run |
| 灰度 / 影子 | 真实流量下成本和长尾怎样 | 小比例、可回滚 |
| 线上监控 | 现在是否发生异常 | 告警、限流、止损 |

上线前先用黄金集筛掉明显回退；再回放历史失败；然后用影子流量观察新版本但不执行副作用；最后小比例灰度，设置自动回滚门槛。每一步都要把 trace schema 和版本记录下来，否则不同阶段的指标无法比较。

## 七、一次成功率下降 3% 的排查剧本

假设周一发布了 `agent_v8`，周二成功率从 91% 降到 88%。我会按以下顺序：

1. **止损**：暂停扩大灰度，保留旧版本，必要时把高风险任务切回人工；
2. **切片**：按版本、模型、工具、租户、任务难度和时间段切分；
3. **找首个变化**：看任务层下降是否能下钻到某个步骤、工具或验收器；
4. **抽样回放**：选代表性成功和失败 trace，用同一 fixture 比较 v7/v8；
5. **验证假设**：如果工具 schema 变了，先修兼容；如果 Prompt 变了，比较 Action；如果评测口径变了，先恢复指标；
6. **修复与回归**：把最小复现加入回归集，修复后再走离线、回放和小流量灰度。

这套流程的关键是先保住线上，再用证据缩小范围。没有必要一开始就调大模型温度或换一个模型。

## 八、一个可观测性最小实现

生产实现不必一开始就造复杂平台，但要把事件模型稳定下来：

```python
with trace.task(goal, tenant, versions) as task:
    with task.span("plan", plan_version=3) as span:
        plan = planner.make(task.input)
        span.record("plan_digest", digest(plan))

    for step in plan.steps:
        with task.span("step", step_id=step.id) as span:
            result = executor.run(step)
            span.record("status", result.status)
            span.record("failure_class", classify(result))

    task.evaluate(checks=["goal", "constraints", "evidence", "cost"])
```

这里的重点不是 API 长什么样，而是每个 span 都有父子关系、版本、状态和结果摘要，评测也作为 trace 的一部分，而不是另一个孤岛服务。

## 面试官的三层追问

### L1：Agent Trace 和普通 API 日志有什么不同？

Agent Trace 要记录一条多步决策链，包含规划、模型动作、环境观察、工具、状态变化和验收，而不是只有请求开始结束。它还需要版本、父子关系、成本和证据引用，才能定位某一步让结果改变的原因。

### L2：怎么做线上 Bad Case 回放？

保存当时的模型、Prompt、工具、检索、环境快照和随机参数；回放时用 fixture 重放观察，对副作用工具强制 dry-run，并用幂等键保护真实边界。比较原始结果和当前版本结果，区分版本、数据和随机性变化。

### L3：成功率下降 3% 怎么定位？

先止损、冻结灰度，再按版本、租户、模型、工具和任务切片；从任务指标向下钻到步骤、工具、检索、生成和验收，找到第一个变化节点；抽样 trace 做回放，把最小复现加入回归集，修复后重新走离线、回放和灰度。

## Trace 还要有一张脱敏和可回放契约

“把日志存下来”不等于能回放。原始 Prompt 可能带个人信息，工具参数可能带 token，业务结果又可能包含不可长期保存的订单字段。更稳的做法是给每类字段声明脱敏动作、回放来源和保留期限：

```yaml
trace_contract: trace-v5
trace_id: tr_20260820_91
fields:
  user_prompt: {class: pii_possible, action: redact, replay: synthetic}
  tool_args: {class: sensitive, action: hash_selected, replay: fixture_ref}
  tool_result: {class: business, action: sample_and_encrypt, replay: artifact_ref}
  policy_decision: {class: audit, action: keep, replay: exact}
  model_output: {class: derived, action: keep_with_ttl, replay: snapshot}
retention:
  hot_days: 7
  cold_days: 30
replay_gate:
  require: [prompt_shape, tool_schema, policy_snapshot]
  prohibit: [real_credentials, raw_access_tokens]
```

回放不一定要还原每个字符，但必须还原会影响决策的形状：Prompt 的槽位、工具 schema、策略版本、检索证据 ID 和环境 fixture。`policy_decision` 需要精确保留，避免同一条 trace 在新策略下被误解释；长文本可以摘要或加密采样，但要保留 digest 和 artifact 引用。热数据用于快速排查，冷数据用于审计，超过期限自动清理或重新匿名化。

![可观测性回放契约：字段分类、脱敏动作、回放来源与保留策略](/images/notes/agent-observability-replay/trace-replay-contract.svg)

### L5：脱敏后回放结果和线上不一样怎么办？

先把差异拆成预期差异和意外差异：PII 被替换、随机数固定属于预期；工具 schema、策略快照或证据版本不同属于意外。回放报告要同时展示字段动作和差异原因，不能把“脱敏导致不同”当成万能解释。

## 从一条线上 Trace 产出最小复现包

排查线上 Bad Case 时，完整日志往往太大，只有输入输出又太少。更实用的做法是生成一个最小复现包：保留会影响决策的版本、事件顺序、工具观察和策略结果，把无关的大段文本替换成 digest 或脱敏 fixture。复现包可以在本地、CI 和灰度环境复用，且默认不会触发真实副作用。

```yaml
replay_fixture: fx_20260820_91
source_trace: tr_20260820_91
keep:
  - prompt_slots
  - plan_edges
  - evidence_ids
  - policy_decisions
  - tool_schema_and_observation
  - seed_and_sampling
replace:
  user_pii: synthetic_fixture
  raw_document: encrypted_artifact_ref
  write_tool: dry_run_response
assertions:
  - "same first_failed_span"
  - "no real_side_effect"
  - "citation_ids_subset_of_evidence"
  - "policy_decision_is_unchanged"
```

复现包的关键不是把每个字符原封不动地复制下来，而是保留“会改变分支”的形状：工具返回是空、超时还是成功，权限决策是否拒绝，证据 ID 是否过期，Planner 是否走了另一条边。回放报告同时展示原始结果、候选版本结果和差异字段，修复后再把这个包加入黄金集或线上回归集。

![最小复现包冻结决策形状，隔离副作用，再比较首个异常 Span](/images/notes/agent-observability-replay/replay-fixture-card.svg)

### L5：为什么不能只保存失败时的最终 Prompt？

最终 Prompt 看不到它是怎样由规划、检索、权限和工具观察拼出来的，也无法判断失败发生在生成前还是生成后。最小复现包要保留事件顺序和关键中间状态，才能定位第一个异常 Span。

## 回放集要维护“断言”和“差异预算”

把线上坏案例存成 fixture 还不够；没有断言，回放只能输出两份文本，无法判断修复是否真的有效。我会给每个 fixture 写最小可验证断言：首个失败 Span、拒答边界、引用集合、工具副作用数和最终状态。允许模型版本变化带来的表面差异，但对安全策略、工具参数和事实支持设硬门槛，超过差异预算就阻断发布。

```yaml
replay_assertion_matrix: ram_20260820_42
fixture: fx_20260820_91
assertions:
  first_failed_span: tool.call_3
  policy_decision: deny
  citation_ids_subset_of_evidence: true
  real_side_effect_count: 0
  final_state: pending
diff_budget:
  wording_tokens: 24
  latency_ms: 120
  tool_args_shape: 0
  policy_decision: 0
  unsupported_claims: 0
result:
  model_candidate: blocked_on_policy_diff
  human_review: required
```

![回放断言矩阵：把首个失败、策略、引用、副作用和状态写成硬断言并设置差异预算](/images/notes/agent-observability-replay/replay-assertion-matrix-card.svg)

### L5：为什么不能用“最终答案相似”作为回放通过条件？

最终答案相似，可能只是模型把错误说得更像；真正要守住的是拒答、证据支持、工具参数和副作用。回放断言必须覆盖这些决策边界，文本相似度只能作为辅助信号。

## Trace 脱敏不能破坏回放需要的因果关系

可观测性日志既不能把用户隐私和密钥原文到处复制，也不能脱敏到只剩一段无法关联的摘要。我的做法是把敏感字段分成三层：不可恢复的哈希用于关联，受控 artifact 保存原文引用，公开 trace 只留类型、长度、版本和摘要。回放器默认读取脱敏 fixture；只有获得授权的离线任务，才能按 `evidence_ref` 取原始 artifact，而且仍然走 dry-run。

脱敏后要做一致性校验：同一个用户、任务和工具请求在不同 Span 中应保持稳定 pseudonym，参数结构和数组长度不应被改写；否则回放会把原本一次调用拼成两次，或误判幂等。密钥、token 和个人信息即使在测试 fixture 中也不应直接出现，使用格式保持但不可用的替身更安全。

```yaml
trace_redaction: tr_20260820_43
fields:
  user_id: {public: stable_pseudonym, raw: restricted_artifact}
  api_key: {public: masked_shape, raw: never_store}
  tool_args: {public: canonical_hash_plus_shape, raw: restricted_artifact}
  evidence_text: {public: excerpt_hash, raw: gated_artifact}
invariants:
  parent_child_links_preserved: true
  idempotency_key_stable: true
  array_lengths_preserved: true
  secrets_replayable: false
replay_mode: dry_run_only
decision: safe_fixture
```

![Trace 脱敏回放卡：公开摘要、受控 artifact 和因果关联同时保留](/images/notes/agent-observability-replay/trace-redaction-replay-card.svg)

### L5：为什么只保存 hash 仍然不够？

hash 适合判断两个值是否相同，却无法恢复参数结构、证据位置和版本关系。回放需要最小结构化摘要与受控原文引用；同时对密钥等不可恢复字段明确禁止回放，避免为了调试扩大泄露面。

## 回放还要区分“状态漂移”和“策略漂移”

同一条 fixture 在新版本上失败，至少有两种解释：模型或 Prompt 的策略变了，或者工具、知识库、权限和时间窗口等环境状态变了。如果把两者混在一起，修复会变成盲目换模型。我会在回放报告里同时运行两条路径：冻结原始 Observation 的 `closed_world` 回放，用来判断策略漂移；允许更新后的工具 fixture 但固定模型版本的 `environment_refresh` 回放，用来判断状态漂移。

```yaml
drift_split_probe: dsp_20260820_94
fixture: fx_20260820_91
closed_world:
  model: router-v4
  observations: recorded
  policy_diff: true
  first_failed_span: plan.step_2
environment_refresh:
  model: router-v4
  observations: tool-fixture-v5
  policy_diff: false
  first_failed_span: tool.search_catalog
classification: environment_drift
next: pin_fixture_and_add_policy_regression
```

![回放漂移拆分卡：用冻结观察和刷新环境两条路径拆开策略漂移与状态漂移](/images/notes/agent-observability-replay/drift-split-replay-card.svg)

### L5：为什么同一模型也会让回放结果变化？

模型相同不代表环境相同。检索索引、权限、时间、工具版本、排序和外部库存都可能改变 Observation；回放必须说明哪些输入冻结、哪些允许刷新，才能判断失败责任。

## 60 秒面试回答

我会把一次 Agent 任务建模成带版本和因果关系的 Trace：根层是任务，下面是规划、模型动作、检索、工具、状态和验收 Span。模型生成的 Action 与环境返回的 Observation 分开记录，长文本脱敏或存摘要，但保留证据 ID、版本、耗时、成本和失败类型。指标按任务、步骤、工具、检索、生成和安全分层，失败先归因输入、策略、工具、环境或评测。回放使用冻结 fixture 和 dry-run，不重新执行扣款、发货等副作用。线上异常先止损和切片，再找第一个异常节点，用回放验证并加入回归集。

## 容易被扣分的说法

- “把 Prompt 和最终答案打到日志里就够了。”——看不到中间决策和工具观察。
- “成功率下降就换模型。”——可能是工具、数据、验收器或版本切片问题。
- “回放就是重新调用线上工具。”——会重做副作用，也无法复现当时环境。
- “只保存原文最方便排查。”——隐私和安全风险会跟着日志扩散。
- “平均延迟正常，所以系统没问题。”——Agent 的长尾和特定租户可能已经失控。

## 带走一张可观测性检查清单

- [ ] Task、Plan、Action、Environment、Evaluation 是否都有结构化 Span？
- [ ] 每个事件是否带 parent_id、版本、耗时、成本和状态？
- [ ] 模型动作与工具观察是否分开记录？
- [ ] 长文本是否脱敏，同时保留证据 ID 和摘要一致性？
- [ ] 指标是否能按任务、步骤、工具、检索、模型和安全切片？
- [ ] 回放是否使用 fixture、dry-run 和幂等键保护副作用？
- [ ] 失败修复是否会沉淀为黄金集、回放集或线上回归集？

## 本篇总结

- Agent 的最终答案只是最后一帧，真正有用的是完整决策链。
- Trace 要记录计划、动作、观察、工具、状态、验收和版本因果。
- 指标从任务向步骤、工具、检索、生成和安全下钻，才能定位根因。
- 回放重建决策，不重新制造副作用；冻结观察比重新请求线上接口可靠。
- 线上异常先止损和切片，再用最小复现推动修复和回归。

## 相关内容

- [规划与反思什么时候有用](/notes/agent-planning-reflection)
- [Agent 安全不是加一句提示词](/notes/agent-security-boundaries)
- [代码 Agent 说测试全绿，为什么还不敢合并](/notes/code-agent-green-tests)
- [RAG 答案为什么仍然会错](/notes/rag-evaluation-practice)

## 参考资料

1. AgentAlpha《Agent 岗面试宝典 v3》第 4 章：Agent 调试与可观测性题群。
2. OpenTelemetry, *Traces and Spans*（官方文档）。
3. Sculley et al., *Hidden Technical Debt in Machine Learning Systems*（2015）。
