---
slug: "multi-agent-task-decomposition"
title: "一个 Agent 做不完，什么时候该拆成多个？"
excerpt: "多 Agent 的价值不在于复制几个聊天窗口，而在于把互相牵制的目标拆成可验收的责任边界。先判断值不值得拆，再定角色、交接和失败回退。"
series: "多智能体"
seriesNo: "07"
number: "29"
minutes: 18
---

一个“研究并发布行业报告”的 Agent，得同时浏览网页、筛证据、做分析、写稿、审稿和发布。把这些事全塞进一个大提示词，Demo 也许能跑；一到线上，却说不清：它为什么漏了引用？谁确认数字？发布前谁能按下按钮？

多 Agent 不是把一个模型复制成五个窗口，而是把任务拆成几条能独立验收的责任链。拆得好，专业能力可以并行，风险动作有闸门；拆得不好，只会多出五份上下文、五次网络调用，最后互相甩锅。

## 先说结论

是否拆成多个 Agent，先看任务是否同时存在不同专业边界、不同权限边界或可并行的子任务。如果只是同一目标下的连续步骤，单 Agent 加工作流通常更简单；如果研究、计算、写作和发布需要不同工具与验收标准，再考虑拆分。每个 Agent 都要有明确输入、输出、禁止事项和完成条件，协调器只负责路由、状态和预算，不替子 Agent 猜结果。拆分后的收益要用端到端成功率、延迟、成本和错误隔离来证明。

![多 Agent 拆分的判断路径：先判断专业、权限和并行性，再决定是否拆分](/images/notes/multi-agent-task-decomposition/split-decision.svg)

图 1：拆分不是默认动作。三个条件都不满足时，增加 Agent 通常只增加故障面。

## 一、先判断：这真的是多 Agent 问题吗

### 工作流能稳定表达的，不要急着引入协作

如果流程是“查订单 → 校验库存 → 生成退款单”，步骤固定、输入输出明确，工作流比多 Agent 更合适。它能直接写出状态机、超时和重试，也更容易做 exactly-once。

只有任务需要动态选择下一步、不同角色有不同判断标准，或者某一步必须隔离上下文与权限时，多 Agent 才有明显价值。

| 判断问题 | 适合单 Agent / 工作流 | 值得拆成多 Agent |
| --- | --- | --- |
| 子任务是否固定 | 固定顺序、有限分支 | 需要动态路由和专业判断 |
| 工具与权限 | 大致相同 | 数据源、写权限、风险等级不同 |
| 质量标准 | 一个最终结果即可 | 研究、计算、审稿各有验收标准 |
| 并行收益 | 等待很少 | 多个独立证据源可并行 |
| 失败影响 | 可统一重试 | 某个步骤失败不应拖垮全局 |

### 先画责任边界，再取名字

“研究 Agent”“写作 Agent”只是名字，真正重要的是它们的契约。一个角色至少要写清楚：

```yaml
name: evidence_researcher
mission: 为报告结论收集可追溯证据
inputs: [question, time_range, source_allowlist]
outputs: [evidence_bundle]
must:
  - 每条结论携带 source_url 和 quote
  - 标注发布日期与证据强度
must_not:
  - 直接发布内容
  - 把推测写成事实
done_when:
  - 覆盖所有子问题
  - 低于阈值的证据进入 needs_review
```

这个契约能让协调器判断“任务完成”还是“模型说完成了”。没有输出 schema，所谓协作只是自然语言接力，下一位 Agent 只能重新猜上一位到底做了什么。

![责任契约把每个 Agent 的输入、输出、权限和完成条件固定下来](/images/notes/multi-agent-task-decomposition/role-contract.svg)

图 2：角色边界越清楚，协调器越像调度器，而不是第二个全能模型。

## 二、拆分的三种收益，至少拿到一种

### 专业分工：让不同标准分别被满足

研究 Agent 追求覆盖和来源，分析 Agent 追求计算正确，编辑 Agent 追求表达清晰。把三种标准放在同一段提示词里，模型往往优先满足“看起来完整”，牺牲最难检查的证据质量。

### 权限隔离：让高风险动作离模型远一点

只读研究 Agent 不应该拥有发布权限；负责执行数据库变更的 Agent 不应该读取完整用户画像。权限隔离的收益不是“更安全”这么泛，而是即使某个角色被注入，爆炸半径也被限制在它的工具集合内。

### 并行执行：缩短等待，不是盲目加人

三个来源互不依赖时，可以并行检索；但“写稿”必须等待证据包，“发布”必须等待人工确认。并行边界应来自数据依赖图，而不是来自“多开几个模型”。

```text
用户问题
   │
   ▼
协调器 ─────┬──> 研究 A ──┐
            ├──> 研究 B ──┼──> 证据合并 ──> 写作 ──> 审核闸门 ──> 发布
            └──> 计算 C ──┘                         │
                                                  拒绝/返工
```

## 三、任务拆分要以“可验收产物”为单位

不要把“帮我研究一下”作为子任务。它没有边界，也没有完成条件。更好的拆分方式是把目标改成可验收产物：

| 子任务 | 输入 | 产物 | 验收 |
| --- | --- | --- | --- |
| 研究 | 问题、来源范围 | 带引用的证据包 | 每条结论可回链 |
| 计算 | 结构化数据 | 指标与计算过程 | 独立脚本复算一致 |
| 写作 | 证据包、受众 | 初稿 | 无无来源事实、结构完整 |
| 审核 | 初稿、规则 | 审核意见 | 风险项逐条有结论 |
| 发布 | 通过稿件 | 发布请求 | 人工确认、幂等 ID |

证据包可以是这样：

```json
{
  "question": "2026 年企业 Agent 的主要落地场景",
  "claims": [
    {
      "id": "claim_01",
      "text": "客服是样本中出现频率最高的场景",
      "sources": [{"url": "https://example.com/report", "quote": "..."}],
      "confidence": 0.86,
      "status": "verified"
    }
  ],
  "gaps": ["缺少中小企业样本"],
  "expires_at": "2026-09-01"
}
```

## 四、协调器应该做什么，不应该做什么

协调器负责四件事：拆分任务、分配角色、合并产物、处理失败。它不应该重复执行每个子 Agent 的专业工作，否则系统会变成两个全能 Agent 互相覆盖。

最小状态可以这样设计：

```python
def dispatch(task, graph, budget):
    ready = graph.ready_nodes()
    while ready and budget.remaining():
        node = ready.pop()
        result = run_agent(node.role, node.input, node.tool_policy)
        graph.record(node.id, result)
        if result.status == "blocked":
            return ask_for_clarification(node, result.missing)
        if result.status == "failed" and not retryable(result.error):
            return compensate_or_stop(node, result.error)
        ready.extend(graph.unlock(result))
    return graph.final_output()
```

这里的关键不是循环，而是 `ready_nodes`、`blocked` 和 `compensate_or_stop`。没有明确的阻塞和补偿状态，协调器会让多个 Agent 继续围绕一份坏产物工作。

## 五、什么时候拆分会适得其反

- 子任务之间共享大量上下文，拆分后每次都要复制长文本。
- 角色没有独立工具或验收标准，只是换了几个名字。
- 并行任务最终都要串行合并，尾延迟比单 Agent 更长。
- 每个 Agent 都能修改同一份状态，冲突成本超过专业收益。
- 任务失败时没有回滚或人工接管，错误会沿链路放大。

一个实用的决策公式是：

\[
\text{拆分收益}=\text{质量提升}+\text{并行收益}+\text{隔离收益}-\text{通信成本}-\text{协调复杂度}
\]

只要最后一项没有被量化，团队就很容易把“架构更复杂”误认为“能力更强”。

## 拆分方案要先通过一张拓扑评审卡

在真正上线前，我会把每个角色压缩成一张评审卡，逐项回答“它为什么存在、交付什么、失败后谁接手”。这张卡比架构图更适合做变更评审：

```yaml
role: evidence_checker
trigger: claim_conflict || risk_level >= high
input: artifact_id + evidence_refs
output: {decision, gaps, next_owner}
tool_policy: read_only
success: all_claims_have_citations
failure: blocked_with_reason
fallback: human_review
owner: agent-platform
```

如果一个角色只能写“负责提高质量”，却说不清输入、输出、工具和失败接手，它还不是可维护的系统组件。评审卡也要标注触发条件，避免每个任务都启动所有角色；上线后再用真实 trace 统计它带来的质量增量和通信成本。

![多 Agent 拆分评审卡把触发条件、输入输出、权限、失败接手和 owner 固定下来](/images/notes/multi-agent-task-decomposition/topology-review-card.svg)

### L5：什么时候应该删除一个 Agent，而不是继续优化它？

当去掉角色后关键切片的质量、风险拦截和恢复能力都没有显著下降，且它带来的通信、延迟和维护成本持续存在，就应该删除或合并。保留角色必须有独立贡献证据，而不是因为“以后也许用得上”。

## 六、如何评测拆分是否值得

至少做三组对照：单 Agent、固定工作流、多 Agent。使用同一批任务和工具配额，比较：端到端成功率、证据完整率、P95 延迟、单任务 token、工具失败恢复率和高风险动作拦截率。

特别要测“局部失败”：研究 B 超时、计算 C 返回脏数据、审稿 Agent 与写作 Agent 意见冲突。一个好的多 Agent 系统应该能局部重试或降级，而不是所有角色重新跑一遍。

## 七、交接协议决定拆分能不能长期维护

拆分之后最容易被忽略的是交接。每个 Agent 都应该交付一个可验证的 artifact，而不是一句“我认为可以”。交接协议至少包含输入范围、完成条件、证据引用、未解决问题、风险等级和下一步 owner。

```json
{
  "artifact_id": "research-12",
  "producer": "retriever",
  "status": "partial",
  "claims": [{"text": "退款规则按地区不同", "evidence": ["doc-v4:p6"]}],
  "gaps": ["缺少海外站点的生效日期"],
  "next_owner": "clarifier"
}
```

协调器合并时先验收字段和证据，再决定是否解锁下一节点。这样一个子 Agent 被替换时，只要它仍遵守契约，下游不需要重写；如果产物标记为 `partial` 或 `blocked`，也能局部补救，不会把不完整结果伪装成成功。

![多 Agent 交接以可验证 artifact 为边界，缺口和 owner 一起进入下一步](/images/notes/multi-agent-task-decomposition/handoff-contract.svg)

图 3：拆分的真正边界不是“角色名字”，而是谁交付什么、由谁验收和如何补救。

## 八、用反事实实验决定是否保留一个角色

当团队争论“这个 Agent 要不要保留”时，不要凭架构偏好。固定数据、工具和质量门槛，分别运行完整拓扑、去掉该角色、把它合并到协调器三组实验，观察证据覆盖、风险拦截、P95 和单位成本。若去掉后质量不降，说明它没有独立贡献；若只在高风险切片有效，可以把它改成按需触发，而不是每次都启动。

## 面试官的三层追问

### L1：什么时候需要多 Agent？

当任务存在清晰的专业分工、权限隔离或可并行子任务，并且每个角色能产出独立验收的结果时，才考虑多 Agent。固定步骤优先用工作流。

### L2：如何避免 Agent 之间互相传一大段文本？

为角色设计结构化产物和版本化状态，只传下一步需要的字段；保留证据指针，不复制整段上下文。共享状态要有 owner 和写入规则。

### L3：如何证明拆分不是为了炫技？

用单 Agent、工作流和多 Agent 做同任务对照，展示质量、延迟、成本和局部失败恢复的变化。如果多 Agent 没有明确收益，就撤回拆分。

### L4：子 Agent 只返回自然语言可以吗？

不建议。自然语言可以作为解释，但交接要有结构化 artifact、证据引用、状态、缺口和 owner；否则下游无法可靠验收、去重和回放。

### L5：什么时候把角色改成按需触发？

当角色只在少数高风险或特殊切片提供增量价值时，按置信度、风险标签或证据缺口触发，并用反事实实验确认它没有成为默认的延迟和成本负担。

## 交接单要把产物、边界和验收写在一起

多 Agent 系统不是把任务转发出去就结束了。一个子 Agent 返回一段自然语言，协调器还得猜它改了什么、证据在哪、下一步能不能继续，最终就会退化成“大家一起聊天”。拆分的最小单位应该是一张可验收的交接单：

```yaml
handoff_id: h_20260819_31
from: planner
to: retriever
intent: 找到退款政策的现行版本
input:
  tenant: team-alpha
  query: 退款期限
  max_sources: 5
constraints:
  - only_active_versions
  - no_cross_tenant_data
deliverable:
  type: evidence_bundle
  fields: [source_id, version, quote, locator, freshness]
acceptance:
  must_have: [at_least_one_current_source, trace_id]
  reject_if: [missing_locator, stale_version]
deadline_ms: 1200
on_failure: return_no_evidence
```

`deliverable` 把下一棒需要的字段写清楚，`acceptance` 让协调器可以自动验收，`on_failure` 则防止子 Agent 在没找到依据时凭感觉写答案。交接单还带租户和版本约束，说明“能查什么”跟“要交什么”一样重要。

面试时可以用一个简单判断：如果把这个角色替换成一个普通函数，输入、输出和失败状态仍然清楚，那它可能只是一个工具；如果需要独立的权限、专业标准和可并行验收，才值得让它成为 Agent。这个判断能避免为了显得复杂而拆分。

![多 Agent 交接验收单](/images/notes/multi-agent-task-decomposition/handoff-acceptance-contract.svg)

### L5：子 Agent 返回“没有证据”，协调器应该重试还是换角色？

先按失败类型处理：查询超时可以在预算内重试，权限拒绝不能重试，证据为空则检查过滤条件和索引新鲜度；只有确认输入范围或专业能力不匹配，才把交接单转给另一个角色。每次转移都保留原始 `handoff_id`，方便回放拆分是否真的有效。

## 拆分之后还要做一次“拓扑消融”

多 Agent 的角色越多，图看起来越专业，但额外的路由、交接和上下文传递也可能让系统更慢、更贵、更难回滚。拆分设计完成后，我会做一个小型消融：同一批任务分别跑单 Agent、固定工作流和多 Agent，比较收益是否来自真正的专业边界。

回执至少记录三种拓扑和局部失败恢复：

~~~yaml
topology_ablation_receipt: tar_6fbc60
eval_set: support-triage-v2
routes:
  single_agent:
    success_rate: 0.71
    p95_latency_ms: 6200
    cost_per_task: 0.004
  workflow:
    success_rate: 0.79
    p95_latency_ms: 5900
    cost_per_task: 0.005
  multi_agent:
    success_rate: 0.82
    p95_latency_ms: 8700
    cost_per_task: 0.009
local_recovery_rate: 0.88
decision: keep_multi_agent_for_high_risk_only
~~~

如果多 Agent 只带来很小的成功率提升，却把成本和长尾延迟翻倍，就应该缩小适用范围，而不是继续加角色。消融结果还要按权限冲突、工具失败和交接缺口切片，确认多 Agent 的价值来自边界隔离或并行，而不是重复调用更多模型。

![多 Agent 拆分的拓扑消融：单 Agent、工作流和多 Agent 用同一批任务对照](/images/notes/multi-agent-task-decomposition/topology-ablation-card.svg)

### L5：什么时候应该把多 Agent 收缩成工作流？

当步骤固定、角色没有独立权限或专业标准，且多 Agent 没有显著提升成功率和局部恢复能力时，我会收缩成工作流。保留清晰的状态和回退，比为了“看起来智能”增加协作者更重要。

## 交接协议还要做“边界丢失”测试

多 Agent 的问题不只在于某个角色答错，也在于交接过程中关键约束被截断。比如研究 Agent 找到了带租户和版本的证据，写作 Agent 却只收到一段摘要；执行 Agent 得到“建议退款”，却没收到审批范围和幂等键。交接验收不能只看消息送达，要主动删掉一项字段，确认协调器会拒绝不完整的包：

~~~yaml
handoff_boundary_probe: hbp_2b2b84
handoff_id: h_8842
required_fields:
  - trace_id
  - tenant
  - source_version
  - acceptance
  - forbidden_actions
mutations:
  - remove: source_version
    expected: reject_missing_evidence_version
  - remove: forbidden_actions
    expected: route_to_policy_review
  - change: tenant
    expected: reject_scope_mismatch
observed:
  all_mutations_blocked: true
decision: contract_passed
~~~

这种边界测试很适合在每次 schema 升级后自动运行。它不要求每个 Agent 都知道全局细节，只要求下游在缺少自己依赖的字段时明确拒绝，而不是凭上下文补全。对可选字段也要写清楚默认值和风险等级：可以缺少展示摘要，但不能默认缺少租户、版本或禁止动作就等于“无限制”。

![多 Agent 交接边界探针：删除关键字段或篡改租户时，下一棒必须拒绝或转审](/images/notes/multi-agent-task-decomposition/handoff-boundary-probe-card.svg)

### L5：为什么字段丢失比 Agent 直接报错更危险？

直接报错会暴露故障边界，字段丢失却可能让下游用默认值继续执行，最后造成无证据回答或越权副作用。我会把必填字段、拒绝原因和转人工路径写入交接契约，并用删除字段、篡改版本和租户的探针持续验证。

## 拆分之后要按关键路径分配预算，不是每个 Agent 平分 token

多 Agent 的总成本和延迟取决于关键路径：几个并行研究可以同时跑，但最终仲裁和写操作仍在串行尾部。若给每个角色相同 token 和时间预算，低价值的旁支可能把关键路径拖到超时。调度器应按任务风险、依赖关系和剩余 deadline 动态分配预算，并在可控边界上提前收敛证据。

我会把每个子任务的预算、最晚交付时间和降级动作写进 handoff。只读研究 Agent 超时可以缩小候选集或交一份带缺口的证据包；写入 Agent 超时则不能用“部分完成”替代真实回执。最终报告同时列出并行节省的时间、额外 token 和局部恢复率，避免只看总成功率。

```yaml
critical_path_budget: cpb_a5252c
task: enterprise_refund_review
deadline_ms: 1800
branches:
  - {role: policy_research, budget_ms: 500, tokens: 1800, fallback: cite_gap}
  - {role: order_lookup, budget_ms: 600, tokens: 1400, fallback: read_back}
  - {role: risk_reviewer, budget_ms: 450, tokens: 1200, fallback: human_review}
serial_tail:
  - {role: supervisor, budget_ms: 220, tokens: 900, requires: [research, lookup, risk]}
gates:
  side_effect_before_all_receipts: blocked
  partial_evidence_reported: true
decision: prioritize_critical_path
```

![多 Agent 关键路径预算：并行分支有降级，串行尾部只在证据齐备后提交](/images/notes/multi-agent-task-decomposition/critical-path-budget-card.svg)

### L5：为什么并行分支越多，P95 可能反而越差？

串行尾部要等待最慢分支，分支越多，遇到长尾的概率越高；还会增加合并、去重和上下文成本。并行前要确认子任务真的独立，并给每条分支设置 deadline、降级和取消条件，而不是无限加人。

## 60 秒面试回答

我先不假设多 Agent 一定更好。先判断任务是否有不同专业标准、权限边界或可并行的子任务；如果只是固定的连续步骤，我会用工作流。真正拆分时，每个 Agent 都有明确输入、输出 schema、工具权限、禁止事项和完成条件，协调器只负责路由、状态、预算和失败回退。子任务必须产出可验收的证据包、计算结果或审核意见，不能只返回一段“我完成了”。最后用单 Agent、工作流、多 Agent 的对照实验验证端到端成功率、P95 延迟、token 成本和局部失败恢复率。

## 带走一张拆分检查清单

- [ ] 是否存在独立的专业、权限或并行边界？
- [ ] 每个 Agent 是否都有结构化输入、输出和完成条件？
- [ ] 协调器是否掌握预算、状态和失败回退？
- [ ] 高风险动作是否与只读研究角色隔离？
- [ ] 是否有单 Agent、工作流和多 Agent 的对照基线？
- [ ] 某个子任务失败时，系统能否局部重试或人工接管？

## 相关笔记

- [规划与反思什么时候有用，什么时候只是让 Agent 多说废话](/notes/agent-planning-reflection)
- [Agent 安全不是加一句提示词：权限、工具和数据边界怎么设计](/notes/agent-security-boundaries)
- [Agent 上线后怎么定位问题？从 trace 到可观测性和回放](/notes/agent-observability-replay)
- [代码 Agent 为什么总要先读仓库，再开始写？](/notes/code-agent-repo-context)

## 参考

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
