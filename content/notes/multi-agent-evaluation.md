---
slug: "multi-agent-evaluation"
title: "多 Agent 协作怎么评测？不能只看最终答案"
excerpt: "最终答案正确，不代表协作过程可靠。评测多 Agent，要把个体能力、消息质量、协作效率、失败恢复和安全边界拆开看。"
series: "多智能体"
seriesNo: "07"
number: "33"
minutes: 19
---

一个多 Agent 系统在测试集上 90% 的答案是对的，线上却反复出问题：研究 Agent 找到证据却没传给写作 Agent；失败分支不停重试吃光预算；发布 Agent 在审核事件到达前就动手了。

只看最终答案，这些故障都会被藏起来。多 Agent 的评测对象不是一张结果表，而是一条带着角色、消息、状态、成本和风险的协作轨迹。

## 先给一个能复述的答案

多 Agent 评测至少分五层：任务结果、个体产物、协作过程、资源效率、安全与恢复。测试集除了正常任务，还要包含消息丢失、重复、乱序、角色失职、证据冲突、工具超时和预算耗尽。每次运行保留完整 trace、artifact 版本和环境指纹，才能把最终错误归因到拆分、通信、执行、合并还是仲裁。线上指标不能替代离线回归，离线高分也不能证明线上稳定。

![多 Agent 评测的五层指标，从结果下钻到过程、资源和安全](/images/notes/multi-agent-evaluation/evaluation-stack.svg)

图 1：最终答案只是最上层；越往下越接近“为什么会这样”。

## 一、五层评测框架

| 层级 | 核心问题 | 示例指标 |
| --- | --- | --- |
| 任务结果 | 目标是否完成 | 成功率、正确率、约束满足 |
| 个体产物 | 每个 Agent 是否交付合格产物 | 引用完整率、schema 通过率 |
| 协作过程 | 消息与状态是否正常 | 丢失、重复、乱序、冲突率 |
| 资源效率 | 协作是否值得这笔成本 | P95、token、工具调用、扇出 |
| 安全恢复 | 失败是否被隔离和接管 | 越权拦截、恢复率、升级时延 |

五层不是五个互不相关的仪表盘。任务成功率下降时，要能沿 trace 找到哪个产物不合格、哪条消息丢了、哪个重试放大了成本。

## 二、把评测集做成“任务 + 扰动”

正常任务只能验证 happy path。更实用的样本，还要主动加入扰动：

```json
{
  "task_id": "ma_041",
  "goal": "根据三份报告给出带引用的结论",
  "roles": ["researcher", "synthesizer", "reviewer"],
  "fixtures": ["report_a", "report_b", "report_c"],
  "perturbations": [
    {"type": "message_delay", "target": "report_b", "ms": 1200},
    {"type": "duplicate_event", "target": "evidence.ready"},
    {"type": "weak_source", "target": "report_c"}
  ],
  "expected": {
    "must_cite": 2,
    "max_tool_calls": 8,
    "must_not_publish": true
  }
}
```

扰动要有预期行为：延迟不应导致重复副作用；弱来源应降低置信度或触发补充检索；禁止发布的任务即使最终答案正确，也必须保持发布状态不变。

![评测样本由任务、角色、扰动和预期不变量组成](/images/notes/multi-agent-evaluation/fixture-design.svg)

图 2：把故障当作数据集的一部分，系统才能在上线前练习恢复。

## 三、个体贡献不能只看“说得像不像”

对研究 Agent，检查引用能否支撑 claim、来源是否在白名单、证据是否重复；对计算 Agent，独立脚本能否复算；对审核 Agent，是否发现预置风险；对协调器，是否遵守依赖和预算。

可以为每个角色定义局部得分：

\[
S_i = 0.4Q_i + 0.25C_i + 0.2V_i + 0.15E_i
\]

其中 (Q) 是产物质量，(C) 是契约满足，(V) 是验证通过，(E) 是效率。权重只是起点，关键是不要把所有责任压到最终答案上。

对于协作系统，还要问“这个 Agent 是否真的贡献了”。做一次消融实验：去掉研究 B、替换为低能力模型、打乱消息顺序，再看最终结果和资源变化。如果去掉某个角色没有任何影响，它可能只是增加了复杂度。

## 四、过程指标要可定位

下面这些指标比“平均 Agent 得分”更能帮助排错：

- **交付延迟**：从节点 ready 到 artifact committed 的时间；
- **等待比例**：等待输入、等待锁、等待限流分别占多少；
- **消息健康度**：重复、乱序、无效 schema、无 ACK 的比例；
- **合并损失**：分支产物中有多少字段在合并时丢失；
- **返工率**：监督者拒绝后重新执行的次数；
- **责任完整率**：每个结果能否回到输入版本和工具记录。

```text
任务成功率下降
        │
        ├─ 个体产物不合格？ ─> schema / 引用 / 计算复核
        ├─ 消息链断了？ ─────> 丢失 / 乱序 / 去重日志
        ├─ 合并损失？ ───────> artifact diff
        ├─ 预算耗尽？ ───────> 扇出 / 重试 / token
        └─ 安全拦截失效？ ───> policy decision / side effect
```

## 五、回放、影子和线上实验

### 离线回放：验证确定性与回归

固定事件、工具 mock、模型版本和随机种子，重放同一任务。允许模型输出有少量差异，但关键不变量必须一致：不得越权、引用数量达标、状态不能倒退。

### 影子流量：观察线上分布，不产生副作用

新版本消费真实请求和脱敏数据，但工具调用全部 mock 或只读，比较轨迹、成本和潜在差异。影子结果不能写生产状态。

### 灰度与 canary：只放小部分真实任务

真正有副作用的版本先限定租户、任务类型和金额上限，设置自动回滚指标。不要只看平均成功率，还要看高风险动作拦截和异常升级。

![离线回放、影子流量、灰度和线上监控组成闭环](/images/notes/multi-agent-evaluation/eval-loop.svg)

图 3：评测不是上线前的一次考试，而是从固定轨迹到真实分布的渐进环。

## 六、最终答案的评审也要防偏差

如果使用 LLM-as-a-Judge，评审模型可能被文风、长度或先出现的答案影响。多 Agent 场景还要防止“协作痕迹”被误判成质量：调用很多 Agent 不代表答案更好。

我会混合三种方式：规则校验硬约束，程序复算客观指标，人审或盲评判断表达和取舍。评审输入尽量只包含问题、候选答案和证据，不泄露哪个系统生成，避免品牌或格式偏差。

## 七、一个最小评测记录

```json
{
  "run_id": "run_20260819_0041",
  "task_id": "ma_041",
  "system_revision": "router_12 + model_7",
  "trace_id": "tr_9ab",
  "result": {"success": true, "citations": 3},
  "process": {"messages": 14, "duplicates": 1, "retries": 2},
  "resources": {"input_tokens": 8120, "output_tokens": 2240, "cost": 0.19},
  "safety": {"blocked_side_effects": 1, "human_escalated": false},
  "artifacts": ["ev_12@3", "draft_7@2", "review_4@1"]
}
```

这份记录让你能回答：结果对不对、过程稳不稳、成本值不值、风险有没有被拦截。缺一项，评测就容易退化成漂亮的成功率。

## 八、用因果对照判断角色价值

多 Agent 最容易出现“大家都做了很多事，所以大家都有价值”的错觉。评测时要对角色做受控消融：固定任务、模型版本、预算和工具权限，只改变一个角色或一条协作边，让差异有可归因的来源。

| 实验 | 保留角色 | 观察重点 |
| --- | --- | --- |
| full | planner + retriever + critic | 基线质量、总成本、完整轨迹 |
| -critic | planner + retriever | 错误发现率、返工率是否上升 |
| -retriever | planner + critic | 引用覆盖、幻觉和 token 是否变化 |
| replace-planner | 单 Agent baseline | 是否只是多了一层消息转发 |

角色价值不只看最终分数，还要看它产出的 artifact 是否被下游真正消费。如果 critic 的建议从未改变草稿，或者 planner 只是把任务原样转发，就应该减少角色、合并协议或把它改成按需触发。

同时建立预算账本：每个角色记录输入输出 token、工具调用、等待时间和重试放大。一个角色即使提升了 2pp，如果带来 3 倍成本和明显尾延迟，也可能只适合高风险任务，而不是默认全量开启。

![多 Agent 通过角色消融、替换基线和预算账本，判断每个角色的真实边际价值](/images/notes/multi-agent-evaluation/role-ablation.svg)

## 给每个角色建立“贡献—成本—风险”卡

消融实验只告诉你去掉一个角色后发生了什么，还需要把结果压成一张可比较的角色卡。角色卡同时记录它改变的下游 artifact、增加的资源、触碰的权限和适用任务：

```yaml
role: critic
artifact: citation_review
downstream_consumed: true
quality_delta: +6.2pp_groundedness
cost_delta: +18%_tokens
latency_delta: +240ms_p95
risk: can_block_low_confidence_answer
route: high_risk_only
```

如果 `downstream_consumed=false`，即使角色输出很长，也不能把它计入协作收益；如果质量提升只出现在高风险切片，就把它按路由条件启用，而不是默认全量运行。角色卡还要链接消融 trace 和失败样本，方便后续合并角色或更换模型时复查。

![多 Agent 角色卡把下游消费、质量增益、资源代价和路由边界放在一起](/images/notes/multi-agent-evaluation/role-contribution-card.svg)

这种记录能把“要不要再加一个 critic”从偏好问题变成预算与风险问题：它究竟减少了哪类错误，代价是否值得，什么时候应该关闭。

## 评测报告要把“角色有用”写成可回放结论

角色评测最终要交付的是一条可复查结论，而不是一句“critic 很有帮助”。建议把基线、消融、下游消费和路由边界写成统一记录：

```json
{
  "role": "critic",
  "baseline": "planner+retriever",
  "candidate": "planner+retriever+critic",
  "slice": "high_risk_private_docs",
  "n": 480,
  "delta": {"groundedness": 0.062, "p95_ms": 240, "cost": 0.18},
  "downstream_consumed": true,
  "hard_failures": {"cross_tenant": 0, "publish_before_review": 0},
  "decision": "route_high_risk_only",
  "replay": "ablation-critic-204"
}
```

这里同时保存质量、成本、尾延迟和安全硬失败，避免角色只因为提高平均分就被默认全量开启。`downstream_consumed` 和 `replay` 是关键：前者证明产物改变了系统，后者让别人能复跑同一对照。

![角色评测报告把基线、消融、下游消费、风险护栏和路由决策连成回放结论](/images/notes/multi-agent-evaluation/role-eval-report.svg)

## 角色评测结论要带“默认开启”的回滚条件

一个角色在当前样本上有边际收益，不等于它应该永久进入默认路由。评测报告还要声明什么情况会撤回：收益低于阈值、成本超预算、风险护栏触发，或下游根本没有消费它的产物。这样路由决策才是可逆的，而不是一次性的架构投票：

```yaml
route_decision: role_routing_20260820_02
role: citation-verifier
baseline: planner-r17
candidate: planner-r17 + verifier-r3
benefit:
  supported_claim_rate: "+8.4pp"
  task_success: "+2.1pp"
cost:
  p95_latency: "+310ms"
  token_cost: "+18%"
guards:
  unauthorized_write: "no increase"
  escalation_rate: "+0.6pp"
default: canary_10
rollback_if:
  - "task_success_delta < +1pp for 2 days"
  - "p95_latency > 1.5s"
  - "unsupported_claim_rate > 3%"
```

角色的价值要在“加入、消融、替换基线、真实下游消费”四个状态间反复检查。达不到默认开启条件时，可以保留在高风险任务或灰度流量里，而不是把它删掉或全量打开。

![角色路由回滚卡把收益、成本、护栏、灰度比例和撤回条件放在同一张决策单上](/images/notes/multi-agent-evaluation/role-routing-rollback-card.svg)

## L5：角色消融通过了，为什么仍可能不适合默认开启？

因为收益可能只出现在高风险切片，或被成本和尾延迟抵消。把结果按任务风险、证据缺口和资源预算分层，先设置路由条件；只有在主要切片的质量提升超过成本、P95 和安全门槛时，才扩大范围。多 Agent 不是角色越多越好，而是每个角色都要有明确的边际价值。

## 九、常见错误

- 只测正常路径，不测消息延迟、重复和预算耗尽；
- 把每个 Agent 的自评分数相加，假设就是团队质量；
- 用最终答案掩盖引用丢失和状态越权；
- 影子流量仍调用真实发布接口，造成不可逆副作用；
- 评测集不锁版本，失败后无法知道是模型、工具还是路由变了。

## 面试官的三层追问

### L1：多 Agent 评测看哪些指标？

分任务结果、个体产物、协作过程、资源效率、安全恢复五层。除了成功率，还看 schema、引用、消息健康、P95、token、越权拦截和人工升级。

### L2：如何评测某个 Agent 的真实贡献？

做消融实验，去掉或替换该角色，观察最终质量、失败类型和资源变化；同时检查它的局部产物是否被后续使用，不能只看它说了多少内容。

### L3：离线高分但线上翻车怎么办？

检查评测集和线上分布是否一致，补充真实失败轨迹和扰动样本；用影子流量观察新版本，再通过受限 canary 验证副作用和尾延迟。

### L4：一个角色的局部产物很好，但最终答案没变，算有贡献吗？

先确认产物是否被下游读取、是否改变了关键状态或减少了失败；如果只是生成了没有被消费的文本，不能把“写得好”当作系统贡献。

### L4：角色消融结果受随机性影响很大怎么办？

固定环境和版本，使用多次运行或配对样本比较，报告均值、方差和失败类型；不要挑一次最好的运行作为结论。

### L5：怎样防止 Agent 为了拿高分互相串通？

把角色权限、可见上下文和可写状态限制在必要范围，加入独立规则校验和不可伪造的工具回执；评测中加入角色失职、消息篡改和预算耗尽的扰动。

### L5：什么时候应该拆成多个 Agent，什么时候合并？

只有在角色拥有不同权限、不同工具、不同评价标准，或确实能并行降低关键路径时才拆分。若只是把一段 Prompt 拆成多条消息，应优先合并，减少状态同步和失败面。

### L5：如何证明一个角色没有“看起来有用但实际无效”？

先检查它的 artifact 是否被下游消费，再做固定样本上的角色消融和替换基线，比较最终质量、失败类型、成本与尾延迟。如果去掉角色后结果不变，或者只改变了表达而没有改变任务不变量，就应合并、按需触发或删除；不要用角色输出长度证明它有价值。

## 从“角色有用”到“路由可发布”：做一次切片回放

角色消融通过，并不等于可以把它接进默认路由。真正要发布的是一条“在什么任务上启用、出了什么问题如何撤回”的路由规则。建议把评测结果按任务风险、证据缺口和资源预算切成几组，再对每组做加入角色、去掉角色、替换角色三种配对回放。

```yaml
route_replay: rr_20260820_17
role: citation_verifier
baseline: single_writer
candidate: writer_plus_verifier
slices:
  - name: low_risk_short
    n: 120
    quality_delta: +0.2pp
    p95_delta_ms: +188
    decision: keep_off
  - name: high_risk_citation
    n: 80
    quality_delta: +8.4pp
    citation_support_delta: +11.2pp
    p95_delta_ms: +310
    decision: canary_only
  - name: tool_write_action
    n: 40
    quality_delta: +1.0pp
    blocked_side_effects: 3
    decision: require_human
rollback:
  trigger: "citation_support_delta < 3pp OR p95 > budget"
  owner: eval-oncall
```

这里的 `decision` 比一个总平均分更接近生产现实：低风险短问题没有必要支付额外尾延迟，高风险引用问题可以灰度启用，带写操作的任务则先经过人工。发布单必须同时留下基线、切片样本数、失败类型和撤回条件，下一次模型或工具升级时才能复用同一组回放。

![多 Agent 角色按任务切片回放，再决定默认关闭、灰度或人工接管](/images/notes/multi-agent-evaluation/slice-replay-card.svg)

### L5：为什么总平均分上涨，仍不能直接全量发布？

因为平均值会把高风险收益和低风险损耗混在一起。要看每个切片是否满足质量、P95、成本和安全门槛；如果只有高风险切片有收益，就把角色放进条件路由，而不是让所有请求都经过它。

## 评测结果要带“角色版本和证据 lineage”

同一题集在角色 prompt、工具 schema 或评测器升级后，分数不再是同一把尺子。评测报告除了总分和切片，还要记录每个角色版本、路由规则、证据来源和 artifact lineage；出现回归时先判断是能力变化，还是评测链变了。没有 lineage 的高分不能进入发布单。

```yaml
eval_lineage: el_20260820_72
suite: agent-role-v5
role_versions:
  planner: p-12
  verifier: v-08
  executor: e-19
router_policy: route-31
tool_schema: crm.v4
evidence_set: golden-2026w34
metrics:
  task_success: 0.84
  citation_support: 0.91
  p95_ms: 1280
checks:
  compared_to: suite-v4-compatible
  evaluator_changed: false
decision: publishable_with_canary
```

![多 Agent 评测 lineage：角色、路由、工具 schema 和证据集一起锁定分数语义](/images/notes/multi-agent-evaluation/eval-lineage-card.svg)

### L5：为什么评测器升级后不能直接沿用旧阈值？

评测器本身改变了分数分布和错误边界，旧阈值可能把回归隐藏，也可能把正常波动误判为失败。应先在固定黄金集上做交叉校准，再决定新阈值和是否能与历史结果比较。

## 角色消融要保持预算、信息和验收器不变

把一个 Agent 从配置里删掉，再比较最终分数，通常不能证明它没有价值：剩下的角色可能获得了更多 token、更多工具调用次数，或者看到了原本不该看的中间结果。严谨的消融实验要固定任务集、消息预算、工具额度、随机种子和评测器，只改变是否允许某个角色产出；同时记录它原本承担的失败兜底、证据收集或冲突发现功能。

角色价值也不一定体现在总分上。一个仲裁器可能只减少 0.5% 的平均错误，却挡住了所有越权样本；一个检索角色可能不提高答案分，但能把引用覆盖率从 0.6 提到 0.9。报告应把贡献、成本和被消除后的风险变化放在同一张卡里，再决定默认开启、按切片开启还是只保留人工诊断。

~~~yaml
role_ablation: ra_20260820_67
suite: multi-agent-v5
fixed:
  seed: 17
  message_budget: 12000
  tool_call_budget: 8
  evaluator: judge-v3
variants:
  - name: full
    roles: [planner, retriever, verifier, arbitrator]
    task_success: 0.84
    hard_safety_failure: 0
    cost_usd: 0.021
  - name: without_arbitrator
    roles: [planner, retriever, verifier]
    task_success: 0.845
    hard_safety_failure: 2
    cost_usd: 0.018
contribution:
  arbitrator: blocks_2_high_risk_cases
decision: keep_for_risky_slices
~~~

![多 Agent 角色消融卡：固定预算与评测器，只改变角色是否存在并记录风险贡献](/images/notes/multi-agent-evaluation/role-ablation-card.svg)

### L5：为什么删掉一个角色后总分上升，仍可能不能合并？

因为它可能牺牲了低频但高风险的保护能力，或者让其他角色获得了额外预算。要先核对实验是否只改变一个变量，再看硬失败、切片风险和证据质量；平均分上升不能覆盖确定性的越权或错误副作用。

## 60 秒面试回答

多 Agent 不能只看最终答案。我会建立五层评测：任务结果、个体产物、消息和状态协作、资源效率、安全与恢复。测试集由任务加扰动组成，覆盖消息丢失、重复、乱序、角色失职、证据冲突、工具超时和预算耗尽。每次运行保存 trace、artifact 版本、模型和工具环境；用规则校验硬约束，程序复算客观指标，人审或盲评处理表达。上线前做离线回放、影子流量和受限 canary，重点看 P95/P99、重试放大、越权拦截和人工升级，而不是只看平均成功率。

## 带走一张评测检查清单

- [ ] 是否把任务、个体、协作、效率、安全五层指标拆开？
- [ ] 评测集是否包含消息、工具、预算和权限扰动？
- [ ] 是否记录 trace、artifact、版本、环境和成本？
- [ ] 是否做角色消融，验证每个 Agent 的实际贡献？
- [ ] 是否区分离线回放、影子流量和真实 canary？
- [ ] 线上是否有自动回滚与人工接管条件？

## 相关笔记

- [多 Agent 结论打架怎么办？监督者和仲裁器各管什么](/notes/multi-agent-supervisor-arbitrator)
- [多 Agent 为什么越加人越慢？先管并发和预算](/notes/multi-agent-concurrency-budget)
- [Agent 上线后怎么定位问题？从 trace 到可观测性和回放](/notes/agent-observability-replay)
- [RAG 怎么评测才不自欺？把“答得像”拆开看](/notes/rag-evaluation-practice)

## 参考

- AgentAlpha《Agent 岗面试宝典 v3》：多智能体评测章节
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
