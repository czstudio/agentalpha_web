---
slug: "llm-dpo-vs-ppo"
title: "DPO 和 PPO 到底差在哪？什么时候可以不要奖励模型"
excerpt: "DPO 把偏好优化改成离线分类目标，省掉 PPO 的在线 rollout 和显式奖励模型，但没有消除数据质量、参考策略和分布外风险。把训练目标、链路和选型边界放一起，才讲得清差异。"
series: "LLM 训练"
seriesNo: "05"
number: "21"
minutes: 19
---

“现在大家都用 DPO 了，是不是 PPO 已经过时？”

👔 面试官  DPO 不训练奖励模型，为什么还能做偏好对齐？

🙋‍♂️ 常见回答  DPO 直接用偏好数据优化模型，更简单、更稳定。

👔 面试官  那它和 SFT 有什么区别？chosen/rejected 质量不好时会怎样？什么场景还应该用 PPO？

如果只记住“DPO 更简单”，面试题一换就容易失分。DPO 的关键不是少了一个模块，而是把“奖励最大化 + KL 约束”的最优策略形式代入偏好模型，直接得到一个对 chosen/rejected 的分类式损失。它减少了在线探索和 PPO 调参，却仍然依赖参考模型、偏好数据和近似假设。

先给面试版结论：

> PPO 先训练奖励模型，再在线采样轨迹，用 advantage 更新策略；DPO 直接在离线偏好对上比较当前策略和 reference policy 的相对 log-prob，不显式维护 reward model、value model 或 rollout。DPO 适合偏好边界清晰、数据量够、希望快速迭代的对齐任务；需要在线探索、工具交互、长轨迹信用分配或奖励动态变化时，PPO/其他在线 RL 更合适。

## 一张图先看懂目标函数的“桥”

两种方法并不是完全互斥。它们都在回答一个问题：在保持语言能力的同时，让模型更偏向人类喜欢的答案。

![DPO 将带 KL 约束的奖励优化改写为 chosen/rejected 的相对 log-prob 目标](/images/notes/llm-dpo-vs-ppo/objective-bridge.svg)

| 方法 | 训练数据 | 中间模型 | 是否在线探索 | 主要旋钮 |
| --- | --- | --- | --- | --- |
| SFT | prompt → answer | 无 | 否 | token loss、数据配比 |
| DPO | prompt + chosen/rejected | reference policy | 否 | \(\beta\)、偏好对质量 |
| PPO | prompt + rollout + reward | reward/value/reference | 是 | KL、clip、GAE、采样成本 |

DPO 的“省”主要省在工程链路：不必先把偏好对转换成一个可泛化的 reward model，也不必反复调用当前策略生成新样本。但它的“省”不是免费：如果离线数据覆盖不了模型的新行为，DPO 不会主动探索那些未知区域。

## 原理一：DPO 为什么可以不训练奖励模型

在一个常见的 KL 约束偏好优化设定下，最优策略和奖励之间存在近似关系：

\[
   r(x,y) = \beta \log \frac{\pi^*(y\mid x)}{\pi_{ref}(y\mid x)} + \beta \log Z(x)
\]

把这个关系带入 Bradley–Terry 偏好模型，归一化项 \(Z(x)\) 在 chosen/rejected 的差分中抵消，就得到 DPO 损失：

\[
\mathcal{L}_{DPO}=-\log\sigma\left(\beta\left[\log\frac{\pi_\theta(y^+\mid x)}{\pi_{ref}(y^+\mid x)}-\log\frac{\pi_\theta(y^-\mid x)}{\pi_{ref}(y^-\mid x)}\right]\right)
\]

直觉是：如果当前策略相对 reference 更偏爱 chosen，同时相对降低 rejected，loss 就会下降。DPO 并不是“只训练 chosen”，而是同时利用了 chosen 和 rejected 的相对概率。

一个简化实现如下：

```python
import torch
import torch.nn.functional as F

def dpo_loss(policy_chosen, policy_rejected,
             ref_chosen, ref_rejected, beta=0.1):
    # 四个输入都是按 token 汇总后的 sequence log-prob
    policy_margin = policy_chosen - policy_rejected
    ref_margin = ref_chosen - ref_rejected
    logits = beta * (policy_margin - ref_margin)
    loss = -F.logsigmoid(logits).mean()
    accuracy = (logits > 0).float().mean()
    return loss, {"preference_accuracy": accuracy.item(),
                  "margin": logits.detach().mean().item()}
```

生产代码还需要决定 log-prob 是按 token sum、mean 还是长度归一化。答案更长时，sum 会天然带来长度影响；mean 又可能稀释关键 token 的差异。这个选择必须和偏好数据的标注标准一起验收，不能只照抄开源实现的默认值。

## 原理二：DPO 的真正地基是偏好对

![DPO 最敏感的不是公式，而是 chosen/rejected 是否同题、可比、覆盖边界](/images/notes/llm-dpo-vs-ppo/preference-quality.svg)

一条偏好对至少应当通过四个检查：

| 检查 | 好的样本 | 危险样本 |
| --- | --- | --- |
| 同题性 | 两个答案回应同一个 prompt | 一个回答问题，一个回答成教程 |
| 质量差异 | 差异来自事实、推理或安全 | 只因为 chosen 更长、更礼貌 |
| 可归因 | 能写出“为什么偏好” | 标注人只说“感觉更好” |
| 覆盖性 | 包含成功、拒答、工具失败、边界 | 全是容易题和标准模板 |

尤其要注意“chosen 不是绝对正确”。如果两个答案都错，只是 chosen 错得更像，DPO 仍会把这个相对偏好学进去。对于高风险任务，应增加独立事实校验、工具结果核对和硬性安全门槛。

### 先清洗，再算 loss

```python
def keep_pair(pair):
    if pair["prompt_id"] == pair["chosen_id"]:
        return False
    if pair["metadata"].get("fact_checked") is False:
        return False
    if pair["chosen"].strip() == pair["rejected"].strip():
        return False
    # 长度差极端时先进入人工复核，不直接训练
    length_ratio = len(pair["chosen"]) / max(1, len(pair["rejected"]))
    return 0.35 <= length_ratio <= 3.0
```

过滤不是越严格越好。过度过滤会把真实失败边界丢掉，模型只看到“完美答案”。更好的做法是把可疑 pair 分成 `train`、`review`、`hard_eval` 三类，保留失败结构，避免用清洗把问题藏起来。

![偏好数据按同题性、事实性、风险和难度切片，避免单一总分掩盖训练盲区](/images/notes/llm-dpo-vs-ppo/dpo-data-slices.svg)

## PPO 什么时候仍然值得用

DPO 的数据是离线的，模型更新不会自动产生新样本。下面几类任务更需要 PPO 或其他在线方法：

1. **奖励来自环境**：游戏、浏览器、代码执行、工具调用的结果要等行动发生后才知道。
2. **长轨迹信用分配**：最终成功取决于很多步，需要探索、归因和中间奖励。
3. **约束动态变化**：策略要根据实时成本、库存、延迟或风险调整行为。
4. **需要主动发现错误**：离线数据没有覆盖的失败模式，需要 rollout 暴露出来。

相反，DPO 更适合文本风格、回答帮助性、拒答边界和固定格式等“能提前比较答案”的任务。也可以先用 DPO 做低成本对齐，再用在线 RL 处理工具交互和任务结果。

## 选型矩阵：不要把算法当信仰

| 问题 | DPO | PPO |
| --- | --- | --- |
| 只有离线偏好对 | 很合适 | 需要额外训练 RM/采样 |
| 需要环境反馈 | 无法直接获得 | 适合在线 rollout |
| 训练基础设施 | 简单，吞吐高 | 复杂，显存和采样成本高 |
| 对数据覆盖要求 | 高，分布外弱 | 可通过探索扩展，但 reward 也会错 |
| 调试重点 | pair 质量、\(\beta\)、reference | KL、advantage、reward hacking |
| 常见失败 | 学到错误相对偏好 | 刷奖励、策略漂移、训练发散 |

面试官问“你会选哪个”，最好按约束回答：先说任务是否有可离线比较的结果，再说数据覆盖和在线成本，最后给出分阶段方案，而不是直接报一个流行算法名。

## DPO 的三个隐藏旋钮

### 1. Reference policy 不是摆设

reference 通常是 SFT checkpoint，提供“不要偏离初始行为太远”的基线。reference 版本变了，DPO 的相对 log-prob 就变了，实验不能只记录 policy checkpoint 而不记录 reference。

### 2. \(\beta\) 控制偏好强度与保守程度

\(\beta\) 较大时，模型更努力拉开 chosen/rejected 的差距，但也更容易破坏通用能力；较小时，更新保守，可能只学到表层风格。应同时观察偏好准确率、KL、通用回归和输出长度。

### 3. 序列长度归一化会改变偏好含义

如果 chosen 通常比 rejected 更长，token sum 会奖励长度；如果全部做 mean，短答案里一个关键错误的影响可能被稀释。可以在训练前做长度匹配实验，分别报告 sum、mean 和长度分桶结果。

![reference 漂移会改变同一偏好对的相对 log-prob，训练记录必须固定并标注 reference 版本](/images/notes/llm-dpo-vs-ppo/reference-drift.svg)

## 一个最小的离线验收闭环

不要只看 DPO loss。至少保留 base/SFT/DPO 三组，评测同一批 prompt：

```python
def compare(rows):
    for model in ["base", "sft", "dpo"]:
        subset = [row for row in rows if row["model"] == model]
        print(model, {
            "pair_win_rate": mean(x["pair_win"] for x in subset),
            "fact_pass": mean(x["fact_pass"] for x in subset),
            "safe_pass": mean(x["safe_pass"] for x in subset),
            "format_valid": mean(x["format_valid"] for x in subset),
            "length_p95": percentile([x["tokens"] for x in subset], 95),
        })
```

同时切出四类样本：正常任务、事实核验、拒答边界、长上下文。DPO 可能让“偏好胜率”上涨，却让拒答率或引用正确率下降。这个时候不要用一个总分掩盖 trade-off，要回到具体样本解释变化。

## 偏好训练也要发一张可回放的验收卡

一组 chosen/rejected 只能说明相对偏好，不能自动证明模型学会了业务目标。训练结束后，我会给每个 checkpoint 发一张验收卡，把偏好对来源、reference、hard eval 和行为变化放在一起：

```yaml
preference_receipt: dpo-20260820-03
policy: dpo@step-1800
reference: sft@step-9200
pair_set: support-quality-v7
coverage: [normal, factual, refusal, tool_result]
metrics:
  pair_win_rate: 0.74
  fact_pass: 0.91
  refusal_pass: 0.96
  tool_success: 0.68
  kl_to_reference: 0.087
decision: canary_only
reason: "tool_result slice below gate"
```

`coverage` 用来防止偏好数据只覆盖语气和格式；`tool_success` 则提醒我们，DPO 的离线胜率不能代替真实环境回报。`decision` 由硬门槛计算：如果事实、安全或工具结果任一关键切片回退，就只能进 canary，不能因为总胜率上涨直接全量发布。回放时固定 pair set、reference 和 tokenizer 版本，才能解释同一偏好对为什么在新 checkpoint 上翻转。

![DPO 验收卡把偏好对、reference、分层指标和发布动作绑定在一起](/images/notes/llm-dpo-vs-ppo/preference-replay-card.svg)

## 偏好对发布前还要做一次“标签稳定性复核”

一组 chosen/rejected 可能只是标注者当时的措辞偏好，换个表达、缩短答案或补上工具结果后，偏好就翻转。DPO 会把这种翻转当成强监督信号，所以数据发布前要抽样做 paraphrase、盲评和结果复核，测出偏好到底来自任务质量，还是来自长度、格式和语气。

~~~yaml
preference_stability_receipt: psr_20260820_40
pair_id: pair-4481
annotator_agreement: 0.82
paraphrase_flip_rate: 0.06
length_bias_delta: 0.02
tool_result_checked: true
hard_cases_sampled: 120
decision: admit_with_slice_monitoring
~~~

如果翻转集中在某个主题、标注员或答案长度区间，就不能把全部 pair 混成一个训练集。可以重标、分桶或降低该切片权重，并在 DPO 后的 hard eval 里保留同一批样本。这样 preference win rate 上涨时，团队知道上涨的是任务偏好，而不是更长、更会迎合的文案。

![偏好稳定性卡：改写、盲评和工具结果复核共同检查标签是否可训练](/images/notes/llm-dpo-vs-ppo/preference-stability-card.svg)

### L5：为什么一条偏好对不能直接当成“真答案”？

偏好是相对判断，可能受长度、语气和展示格式影响。只有在改写、盲评和任务结果复核后仍稳定，才能说明这条 pair 真的携带了可迁移的偏好信号。

### L5：偏好胜率提升但工具成功率下降，先改算法还是改数据？

先抽样失败轨迹，判断 chosen/rejected 是否没有表达工具结果、重试和副作用边界；若反馈缺失，优先补环境结果和 hard eval，再决定继续 DPO 还是换 online RL。算法不是数据缺口的替代品。

## DPO 发布还要检查“偏好迁移”

偏好对在训练集上稳定，不代表它能迁移到新任务。模型可能学会“拒绝得更有礼貌”“答案更长”“格式更像 chosen”，但在工具参数、事实引用或长上下文里仍然失败。因此我会把每轮 DPO 分成同分布、近邻迁移和环境任务三组，分别记录偏好胜率与真实结果：

~~~yaml
preference_transfer_receipt: ptr_20260820_44
checkpoint: dpo-v7
sets:
  in_distribution:
    pair_win_rate: 0.84
    task_success: 0.82
  near_transfer:
    pair_win_rate: 0.77
    task_success: 0.74
  tool_environment:
    pair_win_rate: 0.79
    task_success: 0.61
    duplicate_side_effect: 0
checks:
  citation_support_delta: -0.02
  refusal_precision_delta: +0.04
decision: keep_text_alignment_and_hold_tool_rollout
~~~

如果 in-distribution 的 win rate 上涨，但环境任务没有同步改善，通常说明偏好标签没有覆盖真实反馈，或者模型把评分器的表面特征学得太好。此时不应该用更多普通文本 pair 去“补分”，而要把工具结果、引用支持和副作用纳入 hard eval，必要时换成带环境反馈的训练路径。

![DPO 偏好迁移验收：同分布、近邻迁移和工具环境三组指标分开发布](/images/notes/llm-dpo-vs-ppo/preference-transfer-card.svg)

### L5：偏好胜率上涨而任务成功率下降，最先检查什么？

先检查 chosen/rejected 是否主要编码了长度、语气和格式，而没有编码工具结果、事实和安全边界；再检查评测是否复用了训练 pair。确认数据和评测独立后，才决定修改算法或换成 online RL。

## 面试官的三层追问

### L1：DPO 和 SFT 最核心的区别是什么？

SFT 让模型提高 chosen 答案的 token 概率；DPO 同时比较 chosen 和 rejected，并相对于 reference 调整两者的概率差。DPO 的监督信号不是“这个答案是什么”，而是“在同一个问题下，哪个答案更值得偏好”。

### L2：DPO 为什么不需要显式 reward model？

在特定的 KL 正则和偏好模型假设下，可以把最优策略与隐式奖励的关系代入偏好概率，得到直接比较 policy/reference log-prob 的目标。它是把奖励学习和策略优化合并成了一个离线损失，不代表奖励假设消失了。

### L3：DPO 训练后偏好胜率涨了，但线上工具任务没涨，你怎么办？

先确认离线 pair 是否覆盖工具调用、失败重试和最终结果；再检查 chosen 是否只体现语言风格、长度或格式，而没有体现任务成功；接着把工具执行结果加入 hard eval，必要时用 DPO 做文本行为对齐、再用在线 RL 优化环境回报。不能用更多普通对话 pair 去替代缺失的环境反馈。

## 偏好数据要做盲化与反事实检查

偏好标注最容易把“看起来更像好答案”误当成“真的更能完成任务”。尤其是 Agent 场景，chosen 可能只是语气更顺，却没有执行工具、引用证据或处理失败。发布前我会把答案顺序随机化、隐藏模型版本，并对关键 pair 做反事实改写：只替换一个工具结果、事实引用或拒答边界，再看标注是否仍然稳定。

```yaml
preference_blind_audit: pba_20260820_27
pair: task_1842
blind:
  answer_order: shuffled
  model_identity: hidden
  length_normalized: true
counterfactuals:
  remove_citation: rejected
  swap_tool_receipt_to_timeout: rejected
  keep_fact_change_tone_only: tie
agreement:
  expert_vs_blind: 0.86
  retry_consistency: 0.81
gates:
  style_only_pairs_max: 0.10
  unresolved_conflict: 0
decision: accept_for_dpo
```

![偏好盲化审计卡：打乱顺序、隐藏身份，并用反事实确认偏好来自事实与任务结果](/images/notes/llm-dpo-vs-ppo/preference-blind-audit-card.svg)

### L5：为什么只看标注一致率还不够？

多人一致可能只是共同偏爱更长、更礼貌或格式更漂亮的答案。要把一致率和反事实稳定性、事实支持、工具成功率放在一起，才能判断 pair 是否真的携带可迁移的行为信号。

## 偏好 pair 要按“任务结果”分桶，而不是只按文本质量

对话式 DPO 数据很容易被“写得更像人”带偏：chosen 更长、更礼貌、更有结构，于是标注者一致选择它；但在 Agent 任务里，真正重要的可能是是否调用了正确工具、是否引用了当前版本、是否在权限不足时停下来。数据清洗时应把 pair 按任务结果分桶，至少区分纯文本回答、工具调用、代码修改、检索引用和拒答边界。

每个 pair 都要保留可验证的 outcome，而不是只存两段字符串。若 chosen 的事实来自过期文档，或者 rejected 虽然语气差但完成了正确动作，应该进入人工复核或 tie，而不是强行喂给 DPO。训练集的长度、模型来源和主题也要做分层抽样，避免一个高频模板贡献大多数梯度。

```yaml
preference_buckets: pbf_20260820_35
buckets:
  text_quality: {weight: 0.20, verify: style_and_fact}
  tool_outcome: {weight: 0.30, verify: receipt_and_state}
  code_patch: {weight: 0.20, verify: tests_and_diff}
  grounded_rag: {weight: 0.20, verify: citation_and_version}
  refusal_boundary: {weight: 0.10, verify: acl_and_risk}
rules:
  stale_fact_pair: quarantine
  chosen_without_outcome: tie_or_review
  style_only_pair_ratio_max: 0.10
  same_template_share_max: 0.08
eval:
  report_by_bucket: true
  report_length_normalized: true
decision: train_only_after_outcome_closure
```

![DPO 偏好分桶卡：按工具结果、代码测试、引用版本和拒答边界分层，而不是只看文案好不好看](/images/notes/llm-dpo-vs-ppo/preference-outcome-buckets-card.svg)

### L5：为什么把所有 pair 混成一个总体胜率会掩盖问题？

总体胜率可能被大量简单文本题拉高，却掩盖工具任务和拒答边界退化。按 bucket 报告能看到模型究竟学会了什么；如果只提升了 style bucket，就不应把它宣传成 Agent 能力提升。

## 偏好分桶之后还要做“梯度占比审计”

分桶只是报告层，如果训练采样仍让高频文本题贡献了 80% 的梯度，工具和拒答 bucket 还是会被淹没。我会在每轮训练记录各 bucket 的有效 pair 数、token 数和 loss 权重，区分“数据很多”和“真正影响参数更新”两件事。发现某个关键 bucket 贡献过低时，优先调整采样或权重，并用固定验证集检查是否出现过拟合。

```yaml
gradient_share_audit: gsa_20260820_81
checkpoint: dpo-v8
buckets:
  text_quality: {pairs: 12000, tokens: 1.8e6, gradient_share: 0.48}
  tool_outcome: {pairs: 3200, tokens: 0.9e6, gradient_share: 0.27}
  grounded_rag: {pairs: 1800, tokens: 0.6e6, gradient_share: 0.16}
  refusal_boundary: {pairs: 900, tokens: 0.3e6, gradient_share: 0.09}
gates:
  refusal_boundary_min_share: 0.08
  tool_outcome_min_share: 0.20
  eval_split_frozen: true
decision: keep_sampling_mix
```

![DPO 梯度占比审计卡：按 bucket 对比 pair、token 和真实更新贡献](/images/notes/llm-dpo-vs-ppo/gradient-share-audit-card.svg)

### L5：为什么 pair 数量多不等于训练影响大？

长文本会贡献更多 token，重复模板也可能因为权重累积占据梯度。必须同时看 pair、token 和 gradient share；只有关键任务 bucket 在更新中有足够质量与权重，偏好迁移才有机会改善。

## 60 秒面试回答

“PPO 是在线方法：先训练奖励模型，再采样轨迹，用 advantage 更新策略，并通过 reference KL 控制漂移。DPO 则利用 KL 偏好优化的闭式关系，直接在 chosen/rejected 离线数据上比较当前策略和 reference 的相对 log-prob，不显式训练 reward/value model，也没有在线 rollout。DPO 更适合可提前比较的文本偏好，PPO 更适合工具、代码、游戏等需要环境反馈和探索的任务。实际选型我会先看反馈是否可离线获得，再看数据覆盖、在线成本和失败代价，并用事实、安全、任务结果和长度分桶评测，而不只看 DPO loss 或 pair win rate。”

## 容易被扣分的说法

- “DPO 就是更简单的 PPO。”——两者的数据分布和优化链路不同。
- “DPO 没有 reward model，所以没有奖励假设。”——它只是把假设隐含进目标函数。
- “chosen 一定是真答案。”——偏好对可能只是相对更好，仍需事实和安全校验。
- “\(\beta\) 越大越好。”——偏好强度、KL 漂移和通用能力要一起看。
- “工具任务也直接 DPO。”——没有环境结果时，模型只能学表面偏好。

## 带走一张检查清单

- [ ] 任务结果是否能在离线阶段公平比较？
- [ ] chosen/rejected 是否同题、可归因、事实可核验？
- [ ] reference checkpoint、token 归一化和 \(\beta\) 是否版本化？
- [ ] 是否有 base/SFT/DPO 三组和分层 hard eval？
- [ ] 是否同时报告偏好胜率、事实、安全、格式、长度和 KL？
- [ ] 对需要探索的工具任务，是否准备 online RL 或环境反馈方案？

## 参考资料

1. Direct Preference Optimization: Your Language Model is Secretly a Reward Model (https://arxiv.org/abs/2305.18290)
2. Hugging Face TRL DPO Trainer (https://huggingface.co/docs/trl/dpo_trainer)
3. InstructGPT: Training language models to follow instructions with human feedback (https://arxiv.org/abs/2203.02155)
4. DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (https://arxiv.org/abs/2402.03300)

## AgentAlpha 大模型 Agent 训练营

DPO 解决的是“已有偏好对，如何低成本对齐”。下一篇训练稳定性会继续追问：为什么 loss 一路下降，模型的真实行为却没有改善，甚至出现灾难性遗忘？

查看 AgentAlpha 大模型 Agent 训练营 (https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb)

先判断反馈来自数据还是环境，再决定用离线偏好还是在线探索。下篇见。
