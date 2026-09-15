---
slug: "agent-eval-reproducibility"
title: "同一个 Agent 实验，怎样才能复现？"
excerpt: "同一套 Prompt 第二次跑出不一样的结果，别急着怪模型随机。工具、知识库、系统时间、并发、评测器，哪个都可能变了。环境和版本指纹锁不住，结果就没办法解释。"
series: "评测"
seriesNo: "09"
number: "43"
minutes: 21
---

“我昨天改了一个 Prompt，成功率涨了 6 个点。”面试官问：“能重跑吗？”团队重新执行三次，结果分别是 81%、84% 和 78%。后来才发现，知识库在夜里更新过，搜索接口返回顺序也不稳定，Judge 模型还自动切到了新版本。

Agent 实验的可复现，不是要求每个 token 都完全一样，而是要能在约定误差范围内复现结论，并查清偏差来自哪里。没有完整版本指纹，所谓 A/B 结果很可能只是环境漂移。

## 把问题拆开之后

一次 Agent 实验至少要锁住六类变量：任务与数据、模型与采样、Prompt 与代码、工具与知识库、运行环境与时间、评测器与统计方法。每次运行生成不可变的 experiment manifest 和 trace，记录输入快照、依赖版本、随机种子、并发、失败重试和成本。重复运行时先区分确定性指标、统计指标和不可复现因素；报告均值、置信区间、样本量和失败类型，而不是只报一个最好成绩。这样才能判断是改动真的有效，还是一次偶然波动。

![Agent 实验的版本指纹把数据、代码、工具、模型和评测器绑定在一起](/images/notes/agent-eval-reproducibility/experiment-manifest.svg)

图 1：实验结论的最小单位不是一个分数，而是分数对应的一份完整 manifest。

## 一、先定义“可复现”是哪一种

| 类型 | 目标 | 可接受差异 |
| --- | --- | --- |
| 确定性回放 | 同一轨迹和状态能重现 | 输出与关键状态基本一致 |
| 统计复现 | 结论方向在重复运行中保持 | 均值、区间和效应量稳定 |
| 环境复现 | 换机器或时间仍能运行 | 依赖、工具、数据可重建 |
| 业务复现 | 线上同类任务仍有收益 | 线上分布与约束一致 |

开启 LLM 采样时，逐 token 一致并不现实。更重要的是：硬约束没有被破坏、任务成功率的差异落在置信区间之外、失败类型没有悄悄变坏。

## 二、实验 manifest 要记录什么

```yaml
experiment_id: exp_13a71e
parent: exp_6638a2
task_set: agent-eval@sha256:abc123
model:
  name: model-x
  revision: 7f91
  temperature: 0.2
  top_p: 0.9
prompt:
  system: support-agent@42
  tools_schema: tools@19
code:
  git_commit: 8ac4d2
  image: registry/agent:2026.08.19
knowledge: kb_snapshot@2026-08-18
runtime:
  python: 3.12.4
  concurrency: 8
  timezone: Asia/Shanghai
evaluator:
  name: grounded-eval@12
  rubric: rubric@5
  seed: 17
```

如果一个变量无法锁定，就明确写成 `floating` 并说明风险。隐藏的自动升级比显式的不确定更危险。

## 三、随机性要拆成三层

### 模型采样随机

temperature、top_p、seed 影响 token 选择。即使提供 seed，不同硬件、批处理和服务端实现也可能产生微小差异。关注结构化结果和硬约束，不要假设字面完全一致。

### 系统调度随机

并发、超时、重试和工具返回顺序会改变 Agent 看到的上下文。多 Agent 尤其要记录事件顺序和调度策略。

### 数据与环境随机

检索库、库存、网页、系统时间、权限和第三方 API 都可能变化。回放应使用快照或录制的返回，线上实验则记录捕获时刻和版本。

![模型、调度和环境三层随机性共同影响 Agent 轨迹](/images/notes/agent-eval-reproducibility/randomness-layers.svg)

图 2：只锁随机种子，仍然可能锁不住工具顺序和数据世界。

## 四、把每一次运行做成可对账的记录

```json
{
  "run_id": "run_104",
  "experiment_id": "exp_13a71e",
  "input_snapshot": "tasks@sha256:abc123",
  "trace_digest": "trace@sha256:92de",
  "outcome": {"success": 84, "total": 100},
  "hard_failures": {"unauthorized": 0, "bad_write": 1},
  "metrics": {"p95_ms": 4120, "tokens": 184200, "cost": 2.31},
  "artifact_refs": ["answer@104", "judge@12"],
  "status": "complete"
}
```

`trace_digest` 用于确认轨迹是否被改写，`artifact_refs` 让人可以回到具体输出，`hard_failures` 防止平均分掩盖危险样本。

## 五、统计上如何判断改动有效

一次实验只跑一遍，很难区分改动和噪声。对于同一任务集，至少做配对运行：每个任务同时跑基线和新版本，比较任务级差值。

\[
\Delta_i = score_{new,i} - score_{base,i}
\]

报告平均差值、bootstrap 置信区间、通过率变化、硬失败变化和成本变化。若新版本平均分上升，但越权率也上升，就不能说“整体变好”。

```text
改动有效？
  ├─ 任务级差值稳定？        → 配对 bootstrap
  ├─ 高风险错误是否增加？    → 硬门槛单独看
  ├─ 成本和 P95 是否可接受？  → 资源约束
  └─ 各能力切片是否一致？    → 分层报告
```

## 六、怎样定位差异来自哪一层

当结果变化时，做最小化对照：

1. 锁住所有环境，只换 Prompt；
2. 锁住 Prompt，只换模型；
3. 锁住模型和 Prompt，只换工具或知识库；
4. 固定轨迹输入，单独替换 Judge；
5. 对新失败做 trace diff，找第一个分叉点。

一次同时改五个组件，哪怕分数上涨，也没有办法归因。Agent 系统的版本应该像实验设计一样有父子关系，而不是一串“final-v7”文件夹。

![通过分叉实验与 trace diff 定位结果变化的第一处差异](/images/notes/agent-eval-reproducibility/attribution-tree.svg)

图 3：先找第一处分叉，再解释最后的分数差异。

## 七、复现不应变成高成本仪式

不是所有请求都要保存完整原文。可以按风险分层：高风险写操作保存完整脱敏 trace 和工具快照；普通问答保存输入摘要、检索证据、版本和评测结果；低风险探索只保留统计聚合。但一旦某个样本进入回归集，就要升级为可完整回放的记录。

## 八、把 replay bundle 设计成可差分产物

回放不是把旧日志重新打印一遍，而是要能回答“哪一步先变了”。因此 bundle 里除了最终结果，还应保存每个事件的顺序、输入摘要、工具请求与返回摘要、状态哈希和耗时。两次运行做事件级 diff：先比较第一处状态分叉，再检查它是否改变了后续计划、证据或副作用。

```text
run_A: retrieve → plan → tool.search → answer
run_B: retrieve → plan → tool.search ↘ timeout → retry → answer
                                  ↑ first divergence
```

![回放包通过事件级 diff 找到两次实验的第一处分叉](/images/notes/agent-eval-reproducibility/replay-diff.svg)

图 4：先定位第一处分叉，再把差异归因到模型、工具、调度或数据。

## 九、发布结论要附带不确定性

实验报告至少有四块：任务集和版本指纹、重复运行的分布、硬失败与成本、结论的适用范围。不要只写“新版本 +6%”，而要写“在客服退款切片、1000 个配对样本、相同工具快照下，成功率提升 4.8 个百分点，95% bootstrap 区间为 [2.1, 7.4]；越权率无显著变化，P95 增加 180ms”。

如果区间跨过零，结论应标记为“未证实”；如果平均分上升但高风险切片恶化，应直接阻断发布。把不确定性写进报告，才能避免团队只记住最漂亮的一次结果。

## 十、把复现等级写进任务契约

“可复现”不是只有开关两种状态。可以在任务契约中声明等级：

| 等级 | 保存内容 | 适用场景 |
| --- | --- | --- |
| R0 统计复现 | 版本指纹、聚合指标、样本分桶 | 低风险探索 |
| R1 轨迹复现 | 脱敏输入、事件序列、工具返回摘要 | 普通问答与回归 |
| R2 确定性回放 | 状态快照、索引、工具 fixture、随机种子 | 高风险写操作 |
| R3 端到端审计 | 完整证据链、审批、补偿和人工动作 | 金融、权限、发布 |

等级越高，存储和脱敏成本越大，所以应按风险选，不要让所有请求都背负 R3。重要的是一旦样本升级到更高等级，旧记录的版本指纹和 hash 不能丢，这样后续仍能解释“为什么这次回放和当时不同”。

![复现等级从统计指标逐步升级到轨迹、确定性回放和端到端审计](/images/notes/agent-eval-reproducibility/reproducibility-levels.svg)

图 5：复现等级和风险绑定，既保留排查能力，也避免无差别保存所有原始数据。

## 十一、复现包要能被另一个人独立打开

很多团队说“我把日志发你了”，但接手的人仍然需要问：从哪条命令开始？哪些文件是输入？工具返回是录制的还是实时调用？一个合格的 replay bundle 应该不依赖原作者的口头解释，至少包含入口、清单、样本、fixture、结果和差异报告：

```text
replay-bundle/
├── manifest.json        # 版本元组、随机种子、运行入口
├── cases/qa-184.json    # 脱敏输入、期望不变量
├── fixtures/tools/      # 工具返回、错误与超时脚本
├── snapshots/state.json # 关键事件前后的状态哈希
├── run.sh                # 固定依赖的重放命令
└── report/diff.html      # 首处分叉、指标差异与结论
```

入口脚本应先做预检：确认模型和索引快照存在，确认工具处于 fixture 模式，确认数据脱敏版本匹配；预检失败就停止，而不是悄悄切到线上服务。报告里同时标注“无法重放的部分”，例如外部搜索结果或人工审批，避免把部分回放包装成端到端复现。

![Replay bundle 把入口、样本、工具 fixture、状态快照和差异报告装进可独立打开的复现包](/images/notes/agent-eval-reproducibility/replay-bundle.svg)

把复现包当作交付物还有一个好处：代码评审、事故复盘和面试讲解使用同一份证据，不需要为不同场合重新编故事。

## 常见错误

- 只记录 git commit，不记录模型、Prompt、知识库和工具 schema；
- 只设置 seed，却不锁工具返回、并发和时区；
- 只跑一次，报告最好的一次结果；
- 同时改模型、Prompt、检索和评测器，最后无法归因；
- 用“结果不同”直接判失败，没有区分采样差异和硬约束破坏。

## 面试官的三层追问

### L1：LLM 有随机性，怎么谈可复现？

不要求每个 token 一样，而是区分确定性回放和统计复现。锁住模型、Prompt、数据、工具和运行环境，重复运行报告均值、区间、失败类型和硬约束，确保结论方向稳定。

### L2：一个实验 manifest 里最容易漏什么？

知识库快照、工具 schema 和返回、并发与重试、时区、评测器版本，以及自动切换的模型路由。只写代码 commit 远远不够。

### L3：分数变了，如何归因？

做单变量对照和任务级配对运行，再对 trace 做 diff 找第一处分叉。模型、Prompt、工具和 Judge 不要在同一轮无记录地一起换。

### L4：回放为什么要保存状态哈希？

状态哈希能快速判断某个事件前后是否真的改变了上下文、权限或工具结果。它不替代脱敏内容，但可以帮助系统在大量 trace 中定位第一处分叉，并避免只比较最终文本。

### L5：什么时候可以说“新版本有效”？

任务级差值的置信区间应稳定地高于零，关键切片不能出现硬失败回归，成本和延迟也要满足门槛。如果只在一次运行或一个平均分上变好，最多叫“待验证”，不能当作发布结论。

### L5：如果外部工具无法完全复现，实验还算可复现吗？

可以，但要明确复现等级和缺口。把外部工具的请求摘要、返回快照、时间和错误分布录成 fixture，先验证内部策略与状态机；无法录制的实时部分单独做统计复现，并在结论中写出它可能带来的不确定性。关键是不能让重放脚本偷偷访问线上接口后仍标记为 deterministic replay。

## 复现包还要有一张验收卡

“脚本能跑”不等于“结论可以交付”。在 replay bundle 旁边再放一张验收卡，明确哪些检查必须通过、哪些差异可接受、何时应该停止并转人工：

```yaml
bundle: replay-2026-0819-07
mode: deterministic_fixture
must_pass:
  - first_divergence_recorded
  - hard_failures == 0
  - tool_side_effects == 0
  - manifest_hash_matches
allowed_variance:
  score_delta: <= 0.02
  latency_p95_delta: <= 10%
blocked:
  - "fixture 缺失时禁止切线上工具"
  - "状态哈希不一致时停止比较最终文本"
owner: eval-platform
```

验收卡让复现结果从“我本机成功”变成团队共同认可的放行条件。尤其是外部工具不可完全录制时，必须把统计复现和确定性回放分开，不能用一次偶然的最终答案掩盖硬失败或副作用。

![复现验收卡把必须通过、可接受差异和停止条件绑定到同一个 replay bundle](/images/notes/agent-eval-reproducibility/replay-acceptance-card.svg)

## 复现包还要记录“为什么拒绝复现”

复现失败不是一个布尔值。打开包时，先区分样本缺失、工具 fixture 过期、环境不兼容、随机差异超阈值和真正的逻辑回归；不同原因对应的下一步完全不同。把拒绝原因写进验收卡，评测结论才不会被一句“跑不起来”吞掉：

```yaml
replay_acceptance: ra_fced4d
bundle: replay-agent-r39-0042
status: rejected
reason:
  code: fixture_expired
  detail: "search-tool fixture v8 已超过保留期"
checks:
  manifest: pass
  dataset_hash: pass
  state_hash: pass
  tool_fixture: fail
  deterministic_seed: pass
next:
  owner: platform-eval
  action: "刷新 fixture 后重跑同一 bundle"
  stop_if: "刷新后仍出现 first_divergence"
```

拒绝复现不能直接当作新版本失败，也不能当作通过。它应该进入单独的“不可判定”队列，保留原始版本与责任人，避免团队为了让报表变绿而删除难复现样本。

![复现验收拒绝卡把失败原因、检查项、责任人和重跑条件固定下来](/images/notes/agent-eval-reproducibility/replay-rejection-card.svg)

## 复现包打开前还要做一次“环境漂移扫描”

manifest 完整不等于运行环境真的一致。镜像标签可能指向了新 digest，GPU 驱动、时区或工具 fixture 也可能在不知不觉中变化。打开 replay bundle 时，我会先扫运行时指纹，再决定是直接比较结果，还是降级为“只能做方向性参考”。

~~~yaml
environment_drift_receipt: edr_2a3ccc
bundle_id: replay-bundle-184
expected:
  image_digest: sha256:11ac...
  python: 3.12.4
  cuda: 12.4
  timezone: Asia/Shanghai
observed:
  image_digest: sha256:11ac...
  python: 3.12.4
  cuda: 12.5
  timezone: Asia/Shanghai
drift: [cuda]
decision: replay_with_drift_warning
~~~

漂移扫描不一定要让所有任务停止，但必须改变结论等级：数值敏感的训练和延迟实验应阻断，业务行为回放可以在标注差异后继续。把 drift 写进报告，别人才能知道“结果不同”究竟来自模型改动，还是环境已经换了。

![环境漂移扫描卡：运行时指纹不同就降低复现结论等级](/images/notes/agent-eval-reproducibility/environment-drift-card.svg)

### L5：为什么 manifest 一样，仍可能不能直接比较？

manifest 记录的是预期依赖，运行时指纹记录的是实际依赖。镜像、驱动、时区或外部 fixture 发生漂移时，表面配置相同，结果仍可能来自不同环境。

## L5：为什么“无法复现”必须单独计数？

因为把不可判定样本混入通过或失败，会让版本比较失真。单独计数能暴露评测基础设施的健康度：如果不可判定率上升，先修复数据、fixture 和环境锁定，再讨论模型质量。

## L5：为什么复现脚本应该允许主动失败？

因为静默降级最危险：fixture 缺失、版本不匹配或状态哈希变化时，如果脚本继续跑完，团队会把不完整的结果当成证据。主动失败会让缺口尽早暴露，也迫使交付人补齐依赖或明确复现等级。

## 十二、复现失败时先缩小差异面

复现失败不等于只能把整套系统再跑一遍。更有效的做法是把差异拆成“同输入、同模型、同工具、同环境”四个开关，先做一个最小 replay matrix。每次只打开一个差异，观察第一处分叉落在哪一层。这样能把“今天分数低了”变成一条可执行的排查路径。

```yaml
replay_matrix:
  baseline: {data: fixed, model: fixed, tools: fixed, env: fixed}
  input_only: {data: new, model: fixed, tools: fixed, env: fixed}
  tool_only: {data: fixed, model: fixed, tools: new, env: fixed}
  runtime_only: {data: fixed, model: fixed, tools: fixed, env: new}
decision:
  first_divergence: tool_only
  trace_span: "checkout:tool.call[2]"
  conclusion: "工具返回顺序改变，不能归因于模型升级"
  next_action: "锁定排序并补充契约测试"
```

![复现差异矩阵](/images/notes/agent-eval-reproducibility/replay-matrix-card.svg)

这里的关键不是把所有组合跑满，而是让每个组合都有明确目的：输入开关用来排除数据漂移，工具开关用来排除外部状态，环境开关用来发现驱动、时区或并发差异。若多个开关同时变化，结果只能作为线索，不能直接写成“模型变好了”。

### L5：为什么不直接做全量笛卡尔积？

因为组合数会随着依赖数指数增长，而且很多组合并不能回答新的问题。面试时可以说，我会先根据 trace 的第一处分叉选择最有信息量的单变量对照；只有在两个差异高度耦合、单变量无法解释时，才补最小的二变量实验，并把未覆盖组合明确标成未知。

## 可复现还要报告“重复次数和不确定性”

同一 manifest 重跑一次，只能证明这一次能跑通，不能证明结论稳定。Agent 任务受采样、并发、外部状态和 Judge 波动影响，至少要按任务配对重复多次，报告均值、置信区间、失败类型和不可判定率。高风险动作或长尾切片可以增加重复次数，简单格式题则不必把预算浪费在无信息的重复上。

重复实验不是把所有轨迹强行做成一致：先定义允许的差异预算，再判断任务级结论是否稳定。若平均成功率不变但 unknown 或安全拒绝波动很大，仍应阻断发布；若只有措辞变化而 claim、工具参数和最终状态一致，可以把它归入可接受表面差异。

```yaml
repro_stats: rs_3fbb0f
manifest: exp_8842_v7
replications:
  low_risk: 3
  high_risk: 8
  long_tail: 10
report:
  paired_success_rate: {mean: 0.82, ci95: [0.79, 0.85]}
  unknown_rate: {mean: 0.018, ci95: [0.010, 0.030]}
  safety_violation: {mean: 0.0, ci95: [0.0, 0.0]}
  wording_variance_budget: 24
gates:
  hard_state_diff: 0
  ci_crosses_release_floor: false
decision: stable_enough_for_canary
```

![复现实验统计卡：按风险和长尾分配重复次数，报告置信区间与硬状态差异](/images/notes/agent-eval-reproducibility/repro-stats-card.svg)

### L5：为什么成功率均值不变，仍可能不能发布？

均值会掩盖 unknown、安全违规和高风险切片的波动。发布门禁应对硬状态、拒答和副作用设置零容忍或独立上限，同时报告置信区间；平均值稳定不代表边界稳定。

## 复现包还要记录“第一处分叉”

一份 manifest 能说明“应该使用哪些版本”，但还不能告诉你两次运行从哪里开始变得不同。对 Agent 轨迹，可以把每个 step 的输入摘要、工具请求、返回摘要、状态哈希和随机性来源串成有序 digest；比较两次运行时找到第一处分叉，再按模型、工具、知识库、并发和外部时间逐层归因。这样复现失败也有结果，而不是只得到一句“这次不一样”。

```yaml
trace_divergence_pack: tdp_a2c4dd
run_a: exp_b71afd
run_b: exp_20260820_31_replay
first_divergence:
  step: 7
  field: tool_response_hash
  expected: sha256:aaa...
  actual: sha256:bbb...
candidate_causes: [external_service_time, tool_fixture_revision]
checks:
  prompt_digest_match: true
  model_revision_match: true
  kb_snapshot_match: true
  concurrency_match: false
decision: classify_as_environment_drift
```

![轨迹分叉回放：从 step digest 找到第一次差异，再按环境层级归因](/images/notes/agent-eval-reproducibility/trace-divergence-pack-card.svg)

### L5：为什么 manifest 一样，仍然不能直接说实验可复现？

manifest 只描述预期配置，外部工具返回、时区、并发交错和隐式缓存仍可能改变轨迹。要把这些动态输入也做快照或显式标记；无法锁定时，结论应降级为统计复现或环境漂移观察。

## 和面试官把话题聊开

Agent 实验的可复现不是要求每个 token 完全一样，而是让同一结论在约定误差内稳定，并能解释差异来源。我会生成一份不可变 manifest，锁住任务和数据快照、模型与采样、Prompt 和代码、工具 schema 与返回、知识库、并发时区、评测器和统计方法。每次运行保存 trace digest、状态、副作用、成本和硬失败。改动采用任务级配对实验，报告均值、置信区间、切片结果和风险变化；如果分数变化，再用单变量对照和 trace diff 找第一处分叉。这样结果才可回放、可归因、可审计。

## 带走一张检查清单

- [ ] 是否明确要复现轨迹、统计结论还是业务收益？
- [ ] manifest 是否包含数据、模型、Prompt、工具、环境和评测器？
- [ ] 是否记录并发、重试、时区和知识库快照？
- [ ] 是否用配对运行和置信区间，而非单次最好成绩？
- [ ] 是否能通过 trace diff 找到第一处结果分叉？

## 相关笔记

- [离线评测 95 分，线上为什么还是翻车？](/notes/offline-eval-online-drift)
- [让 LLM 给答案打分，为什么也会偏？](/notes/llm-judge-calibration)
- [Agent 上线后怎么定位问题？从 trace 到可观测性和回放](/notes/agent-observability-replay)

## 参考

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
