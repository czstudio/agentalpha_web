---
slug: "llm-model-selection"
title: "LLM 选型不是比一个总榜：把任务、成本和失败代价放进同一张表"
excerpt: "模型选型真正要比较的是任务切片上的质量、延迟、成本、稳定性和可控性。先定义不可失败的场景，再用固定数据做路由和灰度，而不是被一个综合分数牵着走。"
series: "LLM 基础"
seriesNo: "04"
number: "72"
minutes: 21
---

“哪个模型最强？”是一个没有上下文的问题。摘要、代码修复、长文检索、结构化输出和工具调用的最优解可能完全不同；一个模型在公开榜单上领先，也不代表它适合你的延迟、数据驻留和预算约束。成熟的选型是把“质量”拆到真实任务里。

## 先给一个能复述的答案

先定义任务切片和不可接受的失败，再固定数据、提示词、工具和评测脚本，比较质量、格式正确率、P95、单位成功任务成本、稳定性、隐私和供应风险。高风险任务优先选可控和可回退的模型，低风险任务可以用小模型或缓存降本。上线后保留路由、版本指纹和灰度，防止“换模型”变成不可解释的全量变化。

![模型选型的质量—成本—风险矩阵](/images/notes/llm-model-selection/model-matrix.svg)

## 先拆任务，而不是先列模型

| 任务切片 | 关键指标 | 典型约束 |
| --- | --- | --- |
| 知识问答 | 引用覆盖、拒答准确 | 证据和隐私 |
| 结构化抽取 | schema 通过率 | 格式稳定 |
| 代码修改 | 测试通过、回归 | 工具和沙箱 |
| 长文分析 | 关键事实召回 | 上下文与成本 |
| 规划与工具 | 任务成功、调用数 | 副作用和超时 |

如果所有切片只用一个平均分，真正重要的错误会被平均数淹没。

## 用多目标评分，不迷信单榜

可以用加权评分做第一轮排序：

$$
Score(m)=w_qQ_m-w_lL_m-w_cC_m-w_rR_m
$$

其中 $Q$ 是质量，$L$ 是延迟，$C$ 是成本，$R$ 是风险。权重来自业务约束，而不是凭感觉。对于“不能产生错误写入”的任务，风险项应该是硬门槛，而不是用高质量分抵消。

## 评测集与提示词要冻结

```yaml
benchmark: agentalpha_model_router_v1
dataset: tasks_20260822_hash_4b1
fixed:
  prompt_version: p17
  tools: toolset_readonly_v3
  temperature: 0
metrics:
  - task_success
  - citation_coverage
  - schema_pass_rate
  - p95_latency
  - cost_per_success
gates:
  - "unsafe_action == 0"
  - "schema_pass_rate >= 99%"
```

比较模型时，提示词、工具、检索证据和重试策略也要固定，否则你测到的是整套系统差异，而不是模型差异。

![从离线切片到线上路由与灰度](/images/notes/llm-model-selection/routing-funnel.svg)

## 什么时候用模型路由

路由可以按任务类型、输入长度、风险、租户或当前负载选择模型。路由器自身也要有稳定规则，不能让一个模型在每次请求里自由挑模型。高风险任务优先高质量和可控模型；摘要、分类和简单抽取可以使用小模型；不确定时回退到人工或更强模型。

## 一次真实的选型题：知识问答和代码修复不是同一个模型

假设团队要做一个内部 Agent，同时支持三类请求：查制度、改代码、生成日报。第一反应往往是“找一个最强模型全部解决”。但这三个任务的失败代价完全不同：制度问答答错会误导员工，代码修改要通过测试，日报则更在意成本和稳定格式。

可以先做一张小而真实的候选表，而不是把几十个模型名称铺满白板：

| 候选 | 制度问答 | 代码修复 | 日报抽取 | P95 | 适合位置 |
| --- | --- | --- | --- | --- | --- |
| 小模型 A | 引用覆盖一般 | 简单补丁稳定 | schema 通过率高 | 低 | 低风险、批量任务 |
| 通用模型 B | 证据解释好 | 中等复杂度 | 成本中等 | 中 | 默认路由 |
| 推理模型 C | 复杂排错强 | 多文件修改强 | 过度思考 | 高 | 高难度回退 |
| 私有模型 D | 数据驻留好 | 工具协议需适配 | 便宜 | 中 | 敏感租户 |

这张表不是最终结论，它的价值是迫使团队把“强”拆成任务上的结果。每个单元格都应该能回到一组固定样本，而不是来自同事的印象。

![按任务切片的模型候选对照](/images/notes/agent-eval-success-rate/metric-slice-dashboard.svg)

## 评测要看分层和尾部，不要只报平均分

一个平均成功率 92% 的模型，可能在 90% 的简单问题上接近满分，却在“写操作前必须确认”这类关键切片上只有 70%。上线前至少要把样本按四个维度切开：任务类型、风险等级、输入长度、数据来源。对每个切片同时报告成功率、格式通过率、引用覆盖、P95、重试率和人工接管率。

单位成功任务成本更接近产品真实支出：

$$
C_{success}(m)=\frac{C_{model}+C_{retrieval}+C_{retry}+C_{human}}{N_{success}}
$$

如果一个便宜模型经常需要重试，分母变小，最后的单位成功成本反而可能高于大模型。对于“错误写入”这种不可接受失败，不能让成本项把风险项抵消，应该采用硬门槛：

```yaml
slice: policy_write_request
hard_gates:
  unsafe_action: 0
  citation_coverage: ">= 0.98"
  schema_pass_rate: ">= 0.995"
soft_metrics:
  p95_latency_ms: 2500
  cost_per_success: "minimize"
```

![从评测切片到发布门槛](/images/notes/agent-eval-success-rate/release-scorecard.svg)

## 路由器应该是小规则，不是第二个黑盒 Agent

路由器可以读取任务分类、风险标签、上下文长度、租户策略和当前负载，然后按显式规则选模型。模型可以帮助做分类，但最终的选择、预算和回退仍由程序执行：

```python
def choose_model(task, policy, health):
    if task.risk in {"write", "permission", "finance"}:
        return policy.high_quality_model
    if task.needs_code and health.get("reasoning") == "healthy":
        return policy.code_model
    if task.input_tokens > policy.long_context_threshold:
        return policy.long_context_model
    if task.batch and task.deadline_minutes > 10:
        return policy.small_batch_model
    return policy.default_model
```

每次路由都记录 `route_reason`、模型版本和命中的规则。这样线上质量下降时，团队可以回答“是模型变了，还是路由把更多长输入送给了它”，而不是重新猜一遍。

## 灰度实验要能解释失败来自哪里

建议把上线分成四个阶段：

1. **离线重放**：同一任务、同一证据、同一工具集合，比较候选模型；
2. **影子流量**：新模型只生成结果，不影响用户和副作用；
3. **小比例灰度**：按租户或任务切片放量，设置硬门槛和自动暂停；
4. **全量与回退**：保留旧版本路由，异常时按版本和切片回退。

不要只看灰度期间的平均成功率。真正有用的是失败切片，例如“长输入 + 中文表格 + 需要引用”的错误率是否升高，或“工具参数 schema 通过但业务校验失败”的比例是否增加。

![模型路由的成本栈与回退位置](/images/notes/agent-cost-control/cost-stack.svg)

## 三种常见的错误选型

**拿公开榜单替代自己的任务集。** 榜单能帮助发现候选，不回答你的数据、工具和风险约束。至少要把榜单模型放进自己的 golden set 重放。

**只测一次性答案，不测重试和人工成本。** Agent 的一次任务可能经历多次工具调用。模型输出看起来不错，但只要经常触发重试，单位成功成本就失真。

**换模型时顺手改 prompt 和检索。** 这会让实验失去归因。模型、提示词、工具 schema、证据和采样参数应该分开做对照，任何同时变化都要写进实验记录。

## 把选型结果写成一页可交接的记录

最终文档不应该只有“选了模型 B”。它至少包含：任务切片、样本版本、候选版本、门槛、主要失败、路由规则、灰度比例、回退条件和下一次复测时间。新同事拿到记录，应该能在本地重放出同样的结论。

## 选型实验的最小可复现实验包

为了避免“上次测试挺好”的口头结论，可以把一次比较打成一个 manifest：

```yaml
selection_run: model-choice-2026-08-22.2
dataset: agent-golden-240@sha256:abc...
prompt_bundle: support-v17
retriever: hybrid-v9
models:
  - name: model-small
    route: fast
  - name: model-large
    route: hard_cases
sampling: {temperature: 0, seed: 42}
metrics: [task_success, citation_coverage, schema_pass, p95_ms, cost_per_success]
artifacts: [raw_outputs, grader_trace, failure_slices]
```

固定 `temperature` 和 `seed` 不是为了让大模型永远确定，而是让两次对照的差异更容易归因。线上仍要补一组不同日期、不同租户和工具回执的真实切片，防止离线样本过于整齐。

## 从“平均分”切到“最坏切片”

一个模型整体得分 0.91，可能是常见问答 0.98、长文引用 0.72、工具参数 0.68 的平均结果。对 Agent 来说，后两类往往更影响用户和事故半径。因此建议把发布分数写成硬门槛：

$$
release\_score=\min\{citation\_coverage,tool\_schema\_pass,abstention\_safety\}-\lambda\,cost\_per\_success
$$

不是所有指标都要压成一个数，但明确“任一高风险切片失败就不放量”比一张总分表更可靠。

![按任务切片比较模型质量和发布门槛](/images/notes/agent-eval-success-rate/metric-slice-dashboard.svg)

## 路由器的输入不要只放用户问题

路由器至少可以看到任务类型、语言、上下文长度、是否调用工具、风险等级和剩余预算：

```python
def route(req):
    if req.risk == "high" or req.side_effect:
        return "model-large"  # 仍需审批，模型大小不等于授权
    if req.context_tokens > 12000:
        return "long-context"
    if req.requires_tool and req.tool_schema_tokens > 3000:
        return "tool-stable"
    if req.language == "zh" and req.task == "policy_quote":
        return "citation-strong"
    return "model-small"
```

路由规则最好是小而可解释的决策树；如果再加一个模型去决定用哪个模型，却没有独立评测和预算，很容易变成第二个黑盒。

## 失败归因要看“首次出错的位置”

一次任务最终失败，不一定是模型本身错了。可以把 trace 切成：输入解析、上下文装配、模型决策、工具参数、工具回执、证据合并和终态提交。首个失败位置决定修复方向：

| 首个失败 | 可能修复 |
| --- | --- |
| 输入解析 | schema、澄清问题、tokenizer |
| 上下文装配 | 过滤、去重、预算和版本 |
| 模型决策 | 候选动作、few-shot、路由 |
| 工具参数 | 类型校验、示例和错误回传 |
| 工具回执 | 超时、幂等、重试和熔断 |
| 证据合并 | 引用对齐、冲突处理 |
| 终态提交 | 状态机、回执账本、人工升级 |

![模型发布的失败切片与回退决策](/images/notes/agent-eval-success-rate/release-scorecard.svg)

## 选型记录要写“放弃了什么”

除了选中模型，也应记录放弃候选的原因：成本超预算、长文格式不稳、工具参数错误率高，还是数据合规不可接受。这样后续模型升级时，可以直接复测原失败切片，而不是重复一轮泛化 benchmark。

## 把一次选型做成可复盘的发布包

模型选型不应只留下一个“推荐某模型”的结论。最小发布包至少包括：冻结的评测集和提示词、候选模型版本、解码参数、工具 schema、硬件与并发、每个切片的原始结果、失败归因和回退条件。没有这些信息，三个月后换供应商时只能凭记忆争论。

```yaml
selection_receipt:
  task: policy_qa_and_code_fix
  dataset_sha256: 7a3b...
  prompt_version: prompt-2026-08-18
  candidates: [model-a@2026-08-10, model-b@2026-08-12]
  traffic_plan:
    canary: 0.05
    holdout: 0.10
  stop_if:
    - "schema_pass_rate < 0.995"
    - "high_risk_slice_success < 0.97"
    - "cost_per_task > 0.08"
```

### 线上路由也要能解释

路由器输出的不只是模型名，还应返回选择依据和预算剩余，例如 `reason=needs_citation`、`max_tokens=1200`、`fallback=model-small`。这样运营同学看到一次慢请求时，可以判断是长文策略触发，还是路由规则误判，而不是把问题都甩给模型供应商。

如果两个候选模型在质量上接近，优先选择适配层更薄、回退更清楚、证据链更完整的那个。工程上的可替换性本身就是长期成本，不能只用一次 benchmark 的小数点后两位决定。

## 选型后的第二轮：验证迁移成本

候选模型即使离线分数更高，也可能因为 tokenizer、工具调用格式、流式协议或合规区域不同而不适合直接替换。上线前应做一次“兼容性演练”：用真实请求回放，只替换模型适配层，比较输入 token、工具参数、引用结构和终态状态是否一致。迁移成本本身就是选型目标的一部分。

演练结果最好形成一张差异表：哪些输出只是措辞变化，哪些是数字、字段或权限语义变化；只有前一类可以直接放行，后一类必须进入人工复核或回退路径。

最终还要给业务一个简单的选择理由：这次为什么选它、牺牲了什么、下次什么信号出现就要重评。结论能被复述，才真正完成了选型交接。

如果供应商的价格或区域策略变化，也应触发同一套重评，而不是等成本异常后临时换模型。选型包保留了原始切片，重跑会很快，争论也会少很多。

## 高频追问

**L1：模型选型看哪些指标？**

真实任务质量、格式通过率、延迟、成本、稳定性、隐私合规和供应风险，不能只看公开榜单。

**L2：为什么要按任务切片评测？**

不同模型能力分布不同，平均分会掩盖关键任务的尾部失败；路由也需要知道模型在哪些切片上可靠。

**L2：便宜模型一定更划算吗？**

要看单位成功任务成本。若便宜模型失败后触发重试、人工或错误写入，整体成本可能更高。

**L3：换模型怎样避免线上波动？**

冻结任务集和版本，先离线回归，再小流量灰度，持续比较质量、P95、成本和错误切片，保留一键回退。

**L5：模型输出不稳定时是换模型还是改提示词？**

先定位不稳定来自任务边界、证据、工具 schema、采样还是模型能力。改提示词、增加约束和换模型都应由对照实验决定。

## 60 秒面试回答

我会先拆任务切片并定义不可接受的失败，再冻结数据、提示词、工具和评测脚本。每个模型比较真实任务质量、引用或 schema 通过率、P95、单位成功成本、稳定性和隐私风险，使用多目标评分但对高风险错误设硬门槛。线上根据任务类型、风险和长度做受限路由，先离线回归再灰度，所有请求记录模型版本和路由理由，保留回退。

## 自检清单

- [ ] 能把“模型最强”改写为任务切片问题
- [ ] 评测冻结数据、提示词和工具
- [ ] 同时比较质量、P95、成本和风险
- [ ] 路由有规则、版本和回退

## 相关阅读

- [LLM 推理优化](/notes/llm-inference-optimization)
- [评测不能只看成功率](/notes/agent-eval-success-rate)
- [线上成本控制](/notes/agent-cost-control)

## 资料来源

- 《Agent 岗面试宝典 v3 · 精华版》（本地飞书资料整理）
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
