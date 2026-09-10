---
slug: "llm-judge-calibration"
title: "让 LLM 给答案打分，为什么也会偏？"
excerpt: "让一个大模型给另一个模型打分很方便，但它可能偏爱更长、更像自己或格式更整齐的答案。可靠的 Judge 要靠评分标准、盲评、程序规则和人工样本一起校准。"
series: "评测"
seriesNo: "09"
number: "42"
minutes: 26
---

团队把两个 Agent 的回答交给同一个评测模型，A 几乎总是赢。人工抽查才发现，A 只是写得更长、爱把结论重复三遍；B 更短，却更准确。把答案顺序一换，胜负也跟着换了。

LLM-as-a-Judge 是有用的放大器，不是天然公正的裁判。它会受位置、长度、文风、品牌名、提示词和上下文顺序影响。要把它用在面试题、RAG 或 Agent 评测里，先定义可观察的 rubric，再用盲评、成对比较、程序断言和人工标注校准。

## 先给一个能复述的答案

LLM Judge 适合评估开放式质量，但不应独自决定硬事实和安全结果。我会把指标拆成可观察维度，明确“满分答案长什么样、哪些错误直接失败”，对候选答案做匿名化和随机顺序，采用成对比较或分维度评分，并测位置偏差、长度偏差、模型自偏好和提示词敏感性。先用人工金样估计 Judge 与人类的一致性，再固定 Judge 版本、rubric、温度和阈值；低置信或高风险样本自动转人工。

![LLM Judge 的 rubric、盲评、校准和人工复核闭环](/images/notes/llm-judge-calibration/judge-loop.svg)

图 1：Judge 不是替代评测设计，而是评测链路中的一个可校准组件。

## 一、先问：这个维度真的适合让模型打分吗？

| 维度 | 首选评测方式 | Judge 的角色 |
| --- | --- | --- |
| JSON 合法 | 程序解析 | 不需要 |
| 金额、日期、状态 | 数据库或程序复算 | 解释异常 |
| 引用是否覆盖 claim | 规则 + 语义检查 | 辅助筛选 |
| 结构、清晰、取舍 | 盲评 / Judge | 主力 |
| 越权、错误写入 | 策略日志、状态断言 | 不能放过 |

指标越客观、越能执行，就越不要交给 Judge 猜。把“订单是否改成功”写成 API 状态断言，比让模型判断“看起来完成了”可靠得多。

## 二、Rubric 要写成观察项，不要写形容词

“回答质量高”不能直接评分。好的 rubric 要写清行为和证据：

```yaml
groundedness:
  weight: 0.4
  score_5: "每个事实 claim 都有精确引用，版本和范围匹配"
  score_3: "核心结论有引用，但有一处定位宽泛或遗漏次要 claim"
  score_1: "引用存在，但不能支持主要结论"
  fail_if:
    - "编造来源"
    - "忽略证据冲突"
clarity:
  weight: 0.2
  score_5: "先给结论，再给必要依据，不重复"
  fail_if:
    - "把不确定说成确定"
```

每个分数都应对应可观测行为，尽量避免“专业、自然、有深度”这种无法复核的词。

## 三、位置偏差和长度偏差怎么测

同一对答案至少评测四次：A/B、B/A、A/A、B/B。记录 Judge 是否因为顺序改变而改变结论，是否把更长答案判得更好。

```python
def pair_consistency(judge, answer_a, answer_b):
    ab = judge(answer_a, answer_b, order="ab")
    ba = judge(answer_b, answer_a, order="ba")
    return {
        "position_flip": ab.winner != invert(ba).winner,
        "score_delta": abs(ab.score_a - invert(ba).score_b),
    }
```

如果交换位置就翻转，说明 Judge 的结果不稳定；如果只增加无信息的套话就加分，说明 rubric 奖励了长度而非质量。

![对照实验检测位置、长度和模型自偏好](/images/notes/llm-judge-calibration/bias-tests.svg)

图 2：先做偏差实验，再相信 Judge 的排名。

## 四、单项评分还是成对比较

### 单项评分

适合长期追踪一组固定维度，例如引用覆盖率、澄清质量和拒答质量。缺点是不同批次的“4 分”可能并不完全同义。

### 成对比较

适合比较两个版本的相对提升，尤其是开放式回答。要随机化顺序，并给 Judge 提供“平局”选项，避免它为了完成任务强行选一个赢家。

不要把成对胜率直接当绝对质量。一个版本可能只是在某一类题上胜出，必须分切片看结果。

## 五、用人类金样校准 Judge

先抽取覆盖各难度、各错误类型的样本，由至少两名人工评审独立打分，讨论分歧后形成金样。然后让 Judge 评同一批，计算：

- **一致率**：Judge 与多数人工标签相同的比例；
- **加权 Kappa**：考虑分数等级和偶然一致；
- **成对 Kendall / Spearman**：看排序是否一致；
- **高风险漏判率**：越权、无依据结论被 Judge 放过的比例。

不要只看平均一致率。一个 Judge 可能在普通文案上很准，却漏掉所有安全违规。

```text
人工金样 → Judge 评分 → 按错误类型切片
             │
       位置偏差 / 长度偏差 / 漏判率
             │
       调 rubric、换模型或转人工
```

## 六、让 Judge 输出理由，但不要把理由当真值

结构化理由方便审计：它应引用 rubric 条款、指出证据位置和具体缺陷，而不是写一段漂亮的解释。理由本身仍可能是事后编造，所以最终分数要能被规则或人工样本复核。

```json
{
  "score": 3,
  "dimensions": {
    "groundedness": {"score": 2, "evidence": ["c2 missing"]},
    "clarity": {"score": 4, "evidence": ["conclusion_first"]}
  },
  "hard_fail": false,
  "confidence": 0.62,
  "needs_human": true
}
```

`needs_human` 的规则应由风险和置信度共同决定，不要让一个低置信的 3 分自动进入排行榜。

## 七、降低 Judge 偏差的工程做法

- 答案匿名化，移除模型名、公司名、格式标记；
- 随机候选顺序，必要时多次采样取多数；
- 先程序检查硬约束，再把剩余开放质量交给 Judge；
- 让 Judge 看到问题、证据和 rubric，不要给无关上下文；
- 固定模型、版本、temperature、max tokens 和提示词；
- 定期用新鲜人工样本复核，监测漂移；
- 高风险样本设置人工兜底和不可自动放行的标签。

## 八、把校准做成一套可重复实验

校准不应是“调一版提示词看平均分”。我会固定一份样本清单和实验指纹：

```yaml
judge_model: judge-model@2025-08
rubric_version: groundedness-v4
temperature: 0
candidate_order: seeded-random
sample_hash: sha256:...
human_labels: panel-2025-08-17
```

每次只改变一个变量，例如 rubric、Judge 模型或候选顺序，然后报告整体与切片结果：普通样本、高风险样本、长答案、短答案、中文和英文。除了平均分，还要看位置翻转率、与人工的加权 Kappa、严重错误漏判率和低置信转人工率。

## 九、阈值要由风险决定

同一个 0.8 分数在客服摘要和退款审批里不能有相同含义。可以把判定分成三档：

| 结果 | 低风险内容 | 高风险内容 |
| --- | --- | --- |
| 自动通过 | 分数达标且无硬失败 | 仅作为候选，必须再过规则 |
| 抽样复核 | 低置信或切片漂移 | 默认进入人工队列 |
| 自动拒绝 | 命中事实/引用硬失败 | 命中越权、副作用或冲突 |

Judge 的 `confidence` 只能说明它对评分的把握，不能替代事实置信度。系统要把“模型觉得 4 分”和“证据确实支持”分开存储，否则排行榜很容易奖励会写长文的模型。

## 十、漂移比一次性偏差更隐蔽

上线后需要持续抽样。模型升级、题目分布变化、答案模板变化都可能让原来的 rubric 失效。每周从新流量中抽取固定比例，加入最近出现的失败类型；如果位置翻转率、严重漏判率或人机分歧连续升高，就暂停自动放行并重新校准。

一条简单的告警规则可以是：

```text
alert if high_risk_miss_rate > gate
    or position_flip_rate > baseline + delta
    or human_judge_disagreement > baseline + delta
```

告警后先锁定版本和样本，不能直接“再加一句提示词”覆盖问题。变化需要有实验记录、回归样本和负责人。

![LLM Judge 校准实验固定模型、rubric、金样和风险阈值](/images/notes/llm-judge-calibration/calibration-manifest.svg)

## 给每次评分附一张 Judge 证据卡

分数只有在能回到输入、rubric 和判断依据时才有审计价值。可以为每个样本保存一张小型证据卡，把“模型打了几分”和“为什么允许这个分数进入下一步”分开：

```json
{
  "sample_id": "qa-184",
  "score": 3,
  "observations": ["引用覆盖 2/3 个 claim", "结论正确但遗漏限制"],
  "evidence": ["c2", "c5"],
  "confidence": 0.62,
  "needs_human": true,
  "judge_fingerprint": "judge-model@2025-08|groundedness-v4"
}
```

`observations` 应描述可观察行为，不能写“整体感觉不错”；`evidence` 要能回到答案片段、程序断言或人工标注。这样当分数异常时，可以先判断是 rubric 误读、证据缺失，还是 Judge 真的偏了。

![Judge 证据卡把评分、观察、引用、置信度和转人工原因固定在一起](/images/notes/llm-judge-calibration/judge-evidence-card.svg)

如果同一个样本在模型升级后从 3 分变成 5 分，系统可以比较两张证据卡，而不是只看排行榜上的分数变化。对高风险任务，`needs_human` 应由硬规则和风险切片共同决定，不能让 Judge 自己决定是否放行。

## Judge 放行单：分数、证据和动作必须在一起

线上真正需要的不是一个分数，而是一个能驱动后续动作的判定包。把 `score`、硬失败、证据片段、人工转派原因和评测指纹放在一起，才能解释为什么某条回答被放行：

```yaml
sample_id: qa-184
decision: review
score: 3
hard_fail: false
evidence: [claim-2, citation-5]
observations:
  - "核心结论有依据，限制条件遗漏"
  - "答案比基线长 41%，未增加新证据"
action: human_review
reason: "高风险切片 + confidence < 0.70"
fingerprint: judge-model@2025-08|groundedness-v4|temp=0
```

`decision` 由规则层根据分数、风险和硬失败计算，Judge 只能提供观察，不应该自己写成 `approved=true`。一旦 rubric、评测模型或阈值升级，旧放行单仍能回到原始证据重算，这比覆盖历史分数更适合做回归。

![Judge 放行单把评分、证据、风险和下一步动作固定成可重算判定](/images/notes/llm-judge-calibration/judge-release-ticket.svg)

## 人机分歧要发一张“校准差异单”

Judge 和人工评审意见不一致时，不要直接把人工标签覆盖掉模型分数。保留两者的观察、冲突维度和后续动作，才能判断是 rubric 漏项、样本含糊，还是 Judge 的系统性偏差：

```yaml
calibration_diff: cd_20260820_09
sample_id: qa-184
judge:
  score: 3
  reason: citation_coverage_partial
human:
  score: 5
  reason: citation_is_sufficient_for_question
disagreement: [evidence_scope]
resolution: rubric_note_added
next_eval: rerun_holdout_slice
owner: eval-team
```

`disagreement` 要指向具体维度，不要只写“主观不同”；`resolution` 说明是补 rubric、补证据、改样本，还是接受人工覆盖。校准后必须重跑固定 holdout，并记录位置顺序、模型版本和阈值，避免一次讨论变成不可复现的口头结论。

![Judge 与人工评审的校准差异单：分数、理由、冲突维度与复跑动作](/images/notes/llm-judge-calibration/judge-disagreement-ticket.svg)

### L5：人机分歧时应该让谁“说了算”？

高风险任务由人工或硬规则拥有最终放行权，但分歧不能被抹掉；低风险任务可以接受经过校准的 Judge。关键是把分歧原因、风险切片和复跑结果留下来，而不是简单投票。

## L5：为什么 Judge 分数上涨，排行榜仍可能没有意义？

可能是样本更容易、答案更长或 rubric 奖励了格式，而不是能力真的提高。先用固定 holdout 和 A/A 噪声上限校正，再按风险、长度、语言和错误类型分层；只有在主要切片的人工一致性、硬失败漏判率和成本都不恶化时，分数上涨才值得进入版本结论。

## 常见错误

- 让 Judge 同时判断事实、风格、安全和成本，结果每个维度都模糊；
- 不随机答案顺序，位置偏差被误认为能力差距；
- 只报告平均分，不报告与人工的一致性和漏判率；
- 用开放文本理由替代结构化证据；
- 评测模型升级后仍沿用旧阈值，没有重新校准。

## 面试官的三层追问

### L1：LLM-as-a-Judge 有哪些偏差？

常见有位置偏差、长度偏差、格式和品牌偏差、自偏好、提示词敏感以及对安全错误的漏判。要通过匿名化、随机顺序、成对对照和人工金样来测。

### L2：哪些指标不能交给 Judge？

JSON 合法、金额、日期、状态、权限和副作用应由程序、数据库和策略日志校验。Judge 主要处理开放式的清晰、取舍、解释和表达质量。

### L3：怎么知道 Judge 可信？

用覆盖不同难度和错误类型的人工金样做校准，计算一致率、排序相关和高风险漏判率；固定评测配置，定期用新样本重测，低置信样本转人工。

### L1：为什么要做 A/A 对照？

如果两个完全相同的答案被判出明显差异，说明 Judge 本身不稳定；A/A 可以估计噪声上限，避免把随机波动当成版本提升。

### L2：怎么区分位置偏差和真实质量差异？

交换候选顺序并重复采样，比较同一对答案的 winner 是否翻转；同时做 A/A 和 B/B，观察 Judge 是否对格式或长度有固定偏好。

### L2：人工金样数量要多大？

先按风险和错误类型分层覆盖，再根据置信区间决定数量；高风险漏判比普通样本平均一致率更优先，不能只追求一个大总数。

### L3：Judge 换模型后旧分数还能比较吗？

不能直接横向比较。要在重叠金样上做桥接实验，记录模型、rubric、温度和阈值版本，必要时重算历史结果。

### L3：为什么 Judge 的解释不能直接当证据？

解释可能是事后编造。它只能帮助定位 rubric 条款，最终仍要回到程序断言、引用片段、策略日志或人工样本。

### L2：什么时候应关闭自动放行？

高风险漏判超过门槛、样本分布发生明显变化、Judge 或 rubric 升级尚未完成桥接，或者人工分歧持续扩大时，应先转人工。

### L4：Judge 给出很有说服力的理由，为什么仍然不能直接采信？

理由只是模型生成的解释，不等于事实证据。它可以帮助定位 rubric 条款和答案片段，但必须再对照程序断言、引用范围、策略日志或人工金样。如果理由说得很完整，却引用了不存在的证据，应该按证据缺失处理，而不是因为文风流畅提高分数。

## Judge 打完分还要做一次“分歧采样”

Judge 的平均分很漂亮，不代表它在所有切片上都可靠。它可能对长答案、熟悉格式或自己的模型风格更宽容，却在拒答、引用和工具轨迹上持续误判。校准不能只看总体相关系数，还要把 Judge 与人工差异最大的样本抽出来复核。

我会给每轮放行保留一张分歧采样回执：

~~~yaml
judge_slice_audit: jsa_20260820_27
judge_version: judge-v5
human_sample:
  size: 180
  strata:
    refusal: 40
    citation: 45
    tool_trace: 35
    long_context: 60
disagreement:
  score_gap_gt_2: 23
  systematic_patterns:
    - accepts_uncited_claim
    - rewards_longer_answer
manual_resolution:
  accepted_judge: 11
  corrected_judge: 12
decision: recalibrate_refusal_and_citation_rubric
~~~

分歧样本要保留 Judge 的分数、理由、引用位置和人工结论，方便判断是 rubric 不清、证据缺失还是模型偏好。若误差集中在高风险切片，即使总体相关性达标也不能放行；先修 rubric、补金样，再用同一批历史分歧样本确认改动真的有效。

![Judge 分歧采样：从总体分数下钻到拒答、引用、工具轨迹和长上下文切片](/images/notes/llm-judge-calibration/slice-audit-card.svg)

### L5：为什么 Judge 和人工平均相关性高，仍不能完全替代人工？

因为平均值会掩盖高风险切片和系统性偏差。我会优先抽查差异最大的样本，尤其是安全、拒答和引用；只有分歧可解释、风险切片达标且保留人工升级通道，Judge 才能承担更多自动评测。

## Judge 升级要做一次“桥接回放”

换 Judge 模型、rubric 或提示词后，历史分数通常不能直接拼接。即使新 Judge 更强，分数尺度和偏好也可能变化；如果不做桥接，团队会把评分器变化误认为被测 Agent 变好了或变坏了。

我会保留一组跨版本的重叠金样，用旧 Judge、新 Judge 和人工结论同时回放：

~~~yaml
judge_bridge_receipt: jbr_20260820_36
old_judge: judge-v4
new_judge: judge-v5
overlap_set: golden-2026q3
sample_size: 240
bridge:
  score_mean_old: 3.42
  score_mean_new: 3.68
  rank_correlation: 0.81
  high_risk_flip_rate: 0.03
  human_adjudication_rate: 0.12
scale_change: calibrated_to_4point
decision: publish_new_series_with_break_marker
~~~

`break_marker` 表示历史曲线在这里换了尺子，不能用一条连续折线讲“持续上涨”。如果新旧 Judge 在高风险样本上的排序差异很大，先回到 rubric 和人工金样查原因；如果只是整体尺度平移，可以做校准，但仍要保留原始分数和版本。桥接实验的目标不是强行让两个 Judge 一样，而是让差异可解释、可交接。

![Judge 桥接回放：旧模型、新模型和人工金样用重叠集合对齐尺度与高风险分歧](/images/notes/llm-judge-calibration/judge-bridge-card.svg)

### L5：为什么新 Judge 平均分更高，不能直接宣布模型进步？

因为平均分可能来自评分尺度变化或 rubric 变宽。先用重叠金样做桥接，确认高风险切片没有系统性翻转，并在报表上标出换尺子的断点；桥接完成前只做并行观察，不把新旧分数直接合并。

## Judge 要允许“低置信度，不强行排序”

开放式 Agent 评测里，两个答案可能都部分正确，或者证据不足以支持细粒度比较。强迫 Judge 给出 1 到 4 的确定分数，会把犹豫伪装成精确数据，尤其容易放大长度、格式和自偏好。可以给 rubric 加 `tie`、`abstain` 和 `needs_evidence` 三个出口，并把触发理由写回评测报告。

成对比较时，先做答案顺序交换，再让 Judge 输出结构化理由：硬失败、证据支持、任务结果、表达质量和不确定性。若两次顺序交换结果冲突，或 Judge 置信度低于门槛，样本进入人工队列，不参与自动发布分数；这比让评分器“猜一个”更能保护回归信号。

```yaml
judge_abstain_gate: jag_20260820_54
pair: task_1842
rubric:
  hard_failure: [unsafe_action, unsupported_claim, wrong_tool_state]
  soft_quality: [clarity, tradeoff, completeness]
outputs:
  order_ab: {winner: A, confidence: 0.62}
  order_ba: {winner: tie, confidence: 0.41}
decision:
  status: needs_evidence
  reasons: [order_flip, citation_scope_unclear]
gates:
  auto_score: false
  human_queue: true
  preserve_raw_votes: true
```

![Judge 低置信闸门：顺序交换冲突或证据不足时保留 tie/abstain，转人工而不是硬排序](/images/notes/llm-judge-calibration/judge-abstain-gate-card.svg)

### L5：为什么 abstain 不能被当成 Judge 失败？

在证据不足或答案都不满足 rubric 时，拒绝强排是有效信息，说明评测器识别到了不可判定边界。只要记录触发原因、人工结论和后续 rubric 修订，abstain 能帮助清理金样，而强行排序反而会污染回归趋势。

## Judge 评测要报告“可比较区间”，不是只报一个分数

当 Judge 换模型、换提示词或换顺序时，分数的绝对值会移动。真正有用的发布信息，不是“这版 8.6 分”，而是：在同一批重叠样本上，结论是否稳定，哪些切片仍处于不可比较区间，哪些分歧必须交给人工。

```yaml
judge_comparability:
  contract: jcp_20260820_114
  overlap_set: eval_overlap_v3
  pairwise_agreement: 0.84
  confidence_interval: [0.79, 0.88]
  non_comparable_slices:
    - long_context_over_32k
    - refusal_with_citation
  release_rule:
    require_human_review: true
    max_unresolved_disagreement: 12
    keep_ties: true
```

![Judge 可比较区间：重叠样本、置信区间、高风险切片和人工复核门槛](/images/notes/llm-judge-calibration/judge-comparability-card.svg)

### L5：为什么“平均分更高”仍然不能直接说明版本更好？

平均分把不同难度、不同风险的样本压成了一个数字。只要长上下文或拒答切片出现系统性分歧，整体均值就可能掩盖真实退化。可比较区间把“这两个分数能不能放在一起比”先说清楚，避免把量尺变化误判成模型进步。

## 60 秒面试回答

LLM-as-a-Judge 适合扩大开放式质量评测，但不是天然公正的裁判。我会先把 rubric 写成可观察行为，硬事实、金额、权限和副作用由程序或状态断言完成，Judge 只评清晰、取舍、解释和引用质量。候选答案匿名化并随机顺序，用单项评分或带平局的成对比较，同时做 A/B 与 B/A 对照，测位置、长度和自偏好。再用人工金样校准，报告一致性、排序相关和高风险漏判率，固定模型与提示词版本，低置信或高风险样本自动转人工。

## 带走一张检查清单

- [ ] rubric 是否描述可观察行为和硬失败条件？
- [ ] 硬事实是否由程序或环境状态校验？
- [ ] 是否做了答案匿名化和顺序交换实验？
- [ ] 是否有覆盖高风险样本的人工金样？
- [ ] 是否记录 Judge 版本、提示词、置信度和转人工原因？

## 相关笔记

- [RAG 答案看着对，怎么证明它真的有依据？](/notes/rag-grounded-evidence)
- [一次 Agent 实验怎样算可复现？从版本指纹到结果归因](/notes/agent-eval-reproducibility)
- [Agent 评测不能只看成功率：从结果到轨迹的五层指标](/notes/agent-eval-success-rate)

## 参考

- [Agent 岗面试宝典 v3：LLM-as-a-Judge 考点（本地导入）](/content/imports/agent-interview-v3.feishu.md)
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
