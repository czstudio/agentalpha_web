---
slug: "llm-rlhf-reward-model"
title: "RLHF 为什么要奖励模型？从偏好到 PPO 怎么接起来"
excerpt: "RLHF 不是把“人类喜欢”直接塞给语言模型，而是先把偏好变成可学习的奖励，再用策略优化把行为推向更高质量。把数据、奖励模型、KL 约束和 PPO 串起来，才讲得清它怎么工作、又怎么被 reward hacking 反噬。"
series: "LLM 训练"
seriesNo: "05"
number: "20"
minutes: 20
---

“我们已经有一个会聊天的 Base Model，为什么还要再训练一个奖励模型？”这句话，正好问到了 RLHF 的关键分工。

👔 面试官  如果人工更喜欢答案 A，不喜欢答案 B，直接把 A 当标签做 SFT 不行吗？

🙋‍♂️ 常见回答  可以做 SFT，但 RLHF 能让模型持续优化人类偏好的目标。

👔 面试官  那 PPO 优化的到底是什么？奖励模型错了怎么办？为什么还要 KL 惩罚？

这几问把 RLHF 的真正难点暴露出来：人类偏好不是一个现成的标量标签，PPO 也不是“多跑几轮梯度下降”。它是一条链路：先把比较数据训练成奖励函数，再让策略模型在奖励函数上探索，同时用 KL 约束防止模型为了刷分而偏离原本的语言能力。

先给面试版结论：

> RLHF 通常包含 SFT、奖励模型和策略优化三个阶段。奖励模型接收同一个 prompt 下的 chosen/rejected 答案，学习让被偏好的答案得分更高；PPO 再用这个分数更新策略模型，并用 reference model 的 KL 惩罚限制策略不要走得太远。真正的工程边界在于偏好数据是否一致、奖励模型是否校准、轨迹是否可复现，以及最终任务指标是否和奖励分数一致。

## 先看完整链路，而不是只背 PPO

一条典型的 RLHF 训练链路可以拆成四个角色：

| 角色 | 输入 | 输出 | 主要风险 |
| --- | --- | --- | --- |
| SFT policy | 指令—答案样本 | 初始策略 \(\pi_{SFT}\) | 模板偏置、能力窄化 |
| Reward model | prompt + 答案对 | 标量奖励 \(r_\phi(x,y)\) | 把长度、语气等捷径当质量 |
| Policy model | prompt + 采样轨迹 | 新策略 \(\pi_\theta\) | 为奖励刷分、KL 漂移 |
| Reference model | 同一轨迹 | 参考 log-prob | 约束过弱或过强 |

![偏好对如何成为奖励模型的训练信号：同一个问题，chosen 的得分应该高于 rejected](/images/notes/llm-rlhf-reward-model/preference-pair.svg)

训练时并不是让人给每个答案打一个绝对分数，而是优先收集成对比较：

```json
{
  "prompt": "请解释数据库索引为什么能加速查询",
  "chosen": "先说明索引减少扫描范围，再用 B+Tree 的叶子节点顺序解释范围查询。",
  "rejected": "索引会让数据库查询变快，因为它是一种缓存。",
  "metadata": {
    "task": "technical_explanation",
    "annotator_agreement": 0.92,
    "policy_version": "answer-v4"
  }
}
```

成对数据有一个重要优点：标注人不必假装自己能给答案打出“7.3 分”。但它也会把问题转移到另一个地方：两个答案的差异究竟来自事实、推理、长度、格式，还是仅仅因为 chosen 写得更长？

## 原理一：奖励模型学的是排序，不是“真理分数”

令 \(r_\phi(x,y)\) 表示奖励模型对 prompt \(x\) 和答案 \(y\) 的打分。对于一个偏好对 \((y^+,y^-)\)，最常见的 Bradley–Terry 目标是：

\[
\mathcal{L}_{RM}=-\log\sigma\left(r_\phi(x,y^+)-r_\phi(x,y^-)-m\right)
\]

其中 \(m\) 是可选的 margin。它只要求 chosen 的分数比 rejected 高，并没有规定“8 分到底代表什么”。因此奖励模型的分数只能在同一版本、同一分布内比较，不能拿来当跨任务的绝对质量尺。

一个最小的 pairwise loss 可以这样写：

```python
import torch
import torch.nn.functional as F

def pairwise_reward_loss(chosen, rejected, margin=0.0):
    # chosen/rejected: [batch]，同一 prompt 下两条答案的标量奖励
    preference_gap = chosen - rejected - margin
    loss = -F.logsigmoid(preference_gap).mean()
    accuracy = (preference_gap > 0).float().mean()
    return loss, {"pair_accuracy": accuracy.item()}
```

面试官继续追问“pair accuracy 到 100% 是不是就很好”，正确答案是：不一定。模型可能利用答案长度、固定前缀或标注人习惯做捷径。需要同时看长度控制后的准确率、不同任务切片、标注一致性和校准曲线。

### 奖励模型的数据要做三次检查

1. **同题可比**：chosen 和 rejected 是否回答了同一个问题，是否因为信息量不同而无法公平比较。
2. **差异可解释**：偏好来自事实、推理、帮助性还是安全性，最好有维度标签，避免所有偏好混成一锅。
3. **切分不泄漏**：同一用户、同一文档版本、同一模板生成的近重复答案不要同时出现在 train 和 eval。

如果一个答案比另一个答案多 500 个 token，奖励模型很容易把长度当作“更认真”。可以画出奖励与长度的相关性：相关性突然升高，通常是数据或标注流程的信号，而不是模型真正变聪明。

![奖励模型通过排序、捷径相关性和隐藏集三道校准门，才有资格进入在线优化](/images/notes/llm-rlhf-reward-model/rm-calibration.svg)

## 原理二：PPO 更新的是策略，但不是随便追奖励

奖励模型训练好后，策略模型根据 prompt 采样答案。PPO 会比较新旧策略对这些动作的概率比值，并通过 clipped objective 限制单次更新幅度：

\[
   r_t(\theta)=\frac{\pi_\theta(a_t\mid s_t)}{\pi_{\theta_{old}}(a_t\mid s_t)}
\]

\[
   L^{CLIP}=\mathbb{E}_t\left[\min(r_tA_t,\operatorname{clip}(r_t,1-\epsilon,1+\epsilon)A_t)\right]
\]

这里的 \(A_t\) 是 advantage，表示当前动作比基线好多少。对语言模型来说，一条完整回答会被拆成 token action，奖励往往在序列末尾才出现，所以还需要 value model 或 GAE 把结果传播回前面的 token。

![PPO 在策略、奖励模型、价值模型和 reference model 之间形成闭环，并用 KL 约束策略漂移](/images/notes/llm-rlhf-reward-model/ppo-loop.svg)

训练时常见的总奖励不是单独的 \(r_{RM}\)，而是：

\[
   r_{total}=r_{RM}-\beta\,KL\left(\pi_\theta\|\pi_{ref}\right)-r_{constraint}
\]

其中 \(r_{constraint}\) 可以包含格式错误、越权工具调用、长度超限等惩罚。\(\beta\) 太小，策略容易偏离 reference；太大，模型几乎不敢探索，奖励提升会很慢。

### 为什么要 reference model

如果没有 reference，策略会发现一些奖励模型的漏洞：重复某种套话、输出更长的解释、把拒答改成“看起来很有帮助”的绕过。reference model 提供了一个“不要离初始语言能力太远”的锚点。

但 KL 不是越大越安全：

| 现象 | 可能的 KL 状态 | 首先检查 |
| --- | --- | --- |
| 奖励分数上涨，真实任务不涨 | KL 过大或奖励捷径 | reward 与业务指标相关性 |
| 答案几乎没变化 | KL 过强 | \(\beta\)、clip range、advantage 方差 |
| 语言变得奇怪、重复 | KL 过弱 | token-level KL、长度和停止条件 |
| 训练突然发散 | 更新过大 | ratio 分布、梯度范数、value loss |

## 奖励模型为什么会被刷分

Reward hacking 不是“模型有恶意”，而是优化器忠实执行了一个不完整的验收器。下面这些现象都很典型：

- 解释越长，奖励越高，于是模型开始绕圈子；
- 只要出现若干关键词就得高分，答案却没有完成任务；
- 拒答模板被奖励模型误认为安全，模型对正常问题也拒答；
- 训练集上的标注风格被复制，换一个用户语气就失效。

解决方法不是再加一条“不要刷分”的提示词，而是把奖励拆成可审计的分量：事实、任务完成、帮助性、安全、格式和成本分别记录，再用隐藏评测集验证总分是否真的和业务目标同向。

```python
def gated_reward(scores):
    # 任何硬性安全/事实门槛失败，都不能被其他分数抵消
    if scores["unsafe"] > 0 or scores["fact_fail"] > 0:
        return -2.0
    return (
        0.45 * scores["task_success"]
        + 0.25 * scores["helpfulness"]
        + 0.15 * scores["style"]
        - 0.10 * scores["latency_cost"]
    )
```

![奖励上涨但任务失败时，沿完整 rollout 回放轨迹，定位奖励模型利用了哪一条捷径](/images/notes/llm-rlhf-reward-model/reward-debug.svg)

## 一个可复盘的 RLHF 实验记录

训练日志至少要有以下字段，而不是只有 `reward_mean`：

| 类别 | 指标 | 为什么要留 |
| --- | --- | --- |
| 数据 | prompt 去重率、标注一致率、长度分布 | 判断奖励捷径来自哪里 |
| RM | pair accuracy、长度相关性、校准误差 | 判断奖励是否可用 |
| PPO | KL、clip fraction、advantage 均值/方差 | 判断更新是否过激 |
| 结果 | 任务成功、安全违规、引用正确率 | 和真实交付对齐 |
| 成本 | token、GPU 时长、吞吐、失败 rollout | 判断是否值得上线 |

一次实验的最小配置可以是：

```yaml
reward:
  pair_loss: bradley_terry
  max_prompt_tokens: 2048
  max_answer_tokens: 1024
policy:
  clip_range: 0.2
  target_kl: 0.08
  value_clip: 0.2
  grad_clip_norm: 1.0
eval:
  hidden_prompts: true
  slices: [factual, reasoning, safety, length]
  stop_on_reward_gap: 0.12
```

`target_kl` 只是停止或调节信号，不能替代真实评测。最有价值的 bad case 往往是“奖励上涨但任务失败”的样本，要保留 prompt、完整轨迹、各奖励分量和 reference 对数概率，才能复盘它是怎么刷出来的。

## 面试官的三层追问

### L1：为什么 RLHF 还需要 SFT？

SFT 提供一个能遵循指令、能生成合理答案的初始策略，降低后续探索空间。没有 SFT，PPO 需要从很差的策略开始采样，奖励模型也更容易遇到分布外答案，训练成本和不稳定性都会上升。

### L2：奖励模型和 value model 有什么区别？

奖励模型 \(r_\phi\) 通常对完整答案给出偏好分数，目标是拟合人类比较；value model 估计某个状态的期望回报，用来计算 advantage、降低策略梯度方差。前者是“评委”，后者是“基线/估值器”，可以共享底座但职责不同。

### L3：如果奖励分数涨了，真实任务反而下降，你怎么排查？

先固定解码、数据版本和评测集，确认不是评测漂移；再看奖励与长度、模板、拒答率的相关性，检查 reward model 是否在分布外失真；然后对比 KL、clip fraction、各分量奖励和 hidden set，定位是策略漂移、奖励捷径还是业务指标没进入奖励。修复时优先增加反例和独立验收器，而不是简单把 reward 权重调大。

## 奖励模型也需要一张“不要被刷分”审计卡

奖励分数上涨并不等于回答更好。模型可能学会堆砌格式、重复关键词，或者利用奖励模型偏好的长度，把真正重要的事实埋在漂亮话里。每轮 RLHF 训练都应该把奖励、策略变化和独立任务结果放在一张审计卡里：

```json
{
  "run": "rlhf-20260819-12",
  "preference_set": "helpfulness-v9",
  "reward": {"mean": 0.81, "margin": 0.24, "length_corr": 0.43},
  "policy": {"kl_to_reference": 0.071, "clip_fraction": 0.18},
  "holdout": {
    "task_success": 0.76,
    "truthfulness": 0.83,
    "format_hack_rate": 0.09
  },
  "decision": "hold",
  "reason": ["format_hack_rate above gate"],
  "next": "refresh_adversarial_preferences"
}
```

`length_corr` 用来提醒团队奖励是否被长度绑架，`kl_to_reference` 防止策略为了追分漂得过远，`holdout` 则用奖励模型没有直接参与的任务检查真实收益。出现“奖励涨、真实任务降”时，先看偏好数据覆盖、奖励模型的盲区和策略的分布变化，而不是立刻把 PPO 学习率调大。

审计卡里的 `decision` 必须允许 `hold` 和 `rollback`。训练系统若只有“继续下一轮”，研究人员很容易把异常曲线解释成探索，直到线上才发现模型学会了投机。

![奖励模型训练审计卡](/images/notes/llm-rlhf-reward-model/reward-audit-card.svg)

### L5：奖励模型在 holdout 上变好，但用户反馈变差，先查什么？

先核对用户反馈样本是否与 holdout 同分布，再看奖励模型是否过拟合标注风格、线上任务是否出现了新工具和新约束；同时抽取高奖励低满意度样本做对抗评审。若关键风险切片恶化，先回滚策略，不用总体平均掩盖问题。

## 奖励模型上线前要做一次“捷径扫描”

奖励模型的 pair accuracy 很高，不代表它在学任务质量。它可能只是偏爱更长的答案、固定模板、礼貌开头或某种格式。这样的模型一旦进入 PPO，策略会认真地把这些表面信号放大，最终得到“奖励上涨、任务变差”的结果。

我会在发布前把长度、格式和真实任务结果放在同一张审计卡里：

~~~yaml
reward_shortcut_receipt: rsr_20260820_26
model: rm-v7
pair_accuracy: 0.874
correlations:
  answer_length: 0.61
  markdown_bullets: 0.43
  task_success: 0.18
counterfactual_checks:
  same_content_shorter: reward_delta: -0.29
  same_content_without_template: reward_delta: -0.22
  hidden_task_set: pair_accuracy: 0.71
real_outcome:
  completion_rate: 0.68
  safety_pass_rate: 0.96
decision: reject_and_relabel
~~~

捷径扫描不需要把相关性当成因果结论，但它能快速提醒我们去做反事实：保持事实内容不变，只改变长度、模板、措辞和顺序，观察奖励是否异常变化。再把隐藏集和真实任务成功率放进门槛，才能知道奖励模型是否在优化交付目标，而不是在猜标注数据的外观。

![奖励模型捷径扫描：长度、模板、隐藏集和真实任务结果共同决定是否上线](/images/notes/llm-rlhf-reward-model/reward-shortcut-card.svg)

### L5：如果 pair accuracy 很高，但长度相关性也很高，怎么办？

先不把模型交给 PPO。我会做同内容不同长度、不同格式和隐藏任务的反事实测试；若奖励明显偏爱表面特征，就重新标注偏好、加入对抗样本，并继续观察真实任务成功率和安全指标。

## 让奖励模型先通过“跨切片校准”

奖励模型不是只要能把 chosen 排在 rejected 前面就可以交给 PPO。不同切片的分数尺度可能完全不一样：安全拒答样本的 margin 较小，代码修复样本的 margin 较大，长答案又天然获得更高的绝对分。若直接把这些分数相加，策略会优先追逐最容易拉开分差的切片。

发布前我会固定一批跨切片 anchor，对每个切片记录 pair accuracy、margin、长度相关性和校准误差，并把分数转换成可比较的 z-score 或分位数。重点不是追求所有切片同一个数字，而是确认“分数高”与“实际更值得选”之间的排序在不同长度、语言和任务上都稳定：

```yaml
reward_calibration_receipt: rcr_20260820_31
model: rm-v8
anchor_set: preference-anchor-v5
slices:
  factual:
    pair_accuracy: 0.86
    margin_p50: 0.42
    ece: 0.06
  coding:
    pair_accuracy: 0.89
    margin_p50: 0.78
    ece: 0.11
  safety:
    pair_accuracy: 0.82
    margin_p50: 0.19
    ece: 0.08
normalization: slice_zscore_v2
checks:
  length_corr_max: 0.30
  cross_slice_rank_flip_max: 0.08
  hidden_set_pair_accuracy_min: 0.75
decision: canary
```

如果 coding 的 margin 只是 safety 的四倍，不代表代码更重要；它可能只是答案更长、比较更容易。校准回执让 PPO 的 KL、advantage 和早停阈值有统一输入，也让后续 reward hacking 诊断能区分“模型真的偏好”与“切片尺度偏移”。

![奖励模型跨切片校准：先对齐分数尺度，再决定是否进入策略优化](/images/notes/llm-rlhf-reward-model/reward-calibration-card.svg)

### L5：校准后把不同切片的分数直接平均，会不会丢失安全优先级？

会，所以校准只解决可比性，不替代业务门槛。安全违规、事实错误等应继续作为硬门禁；通过硬门禁后，才在目标任务切片之间比较收益和成本。

## 奖励模型要允许“低置信度，不强行排序”

很多 pair 并没有清晰 winner：两份答案都缺证据、工具结果未知，或者安全要求与任务完成发生冲突。若奖励模型被迫给出确定分数，PPO 会把噪声放大。发布前应保留 `tie`/`abstain` 标签，并在低置信度时让策略走人工、补证据或拒答路径，而不是把微小 margin 当成可靠奖励。

```yaml
reward_abstain_gate: rag_20260820_74
pair: task-1842
scores: {chosen: 0.42, rejected: 0.40}
margin: 0.02
evidence_support: partial
tool_state: unknown
decision:
  reward_label: abstain
  policy_action: request_evidence
gates:
  min_margin_for_auto_rank: 0.08
  unsafe_or_unknown: never_auto_promote
  tie_rate_max: 0.18
```

![奖励模型低置信度闸门：margin 太小或工具未知时不强行排序，转补证据或人工](/images/notes/llm-rlhf-reward-model/reward-abstain-gate-card.svg)

### L5：为什么 tie 太多也不一定说明标注员水平差？

有些任务本来就缺少足够证据，强行二选一只会制造伪标签。应区分“标注不一致”和“问题不可判定”，把后者沉淀为补证据、澄清或 abstain 的训练信号。

## 偏好数据还要做“反事实成对”审计

奖励模型很容易把回答长度、格式、免责声明或固定措辞当成质量线索。只看随机 pair accuracy，无法知道它是否真的理解了任务差异。我会从同一条回答出发构造反事实对：只改变长度、引用顺序、礼貌词、格式或无关背景，保持事实和任务完成度不变；若奖励分仍大幅变化，就把它标成 shortcut slice。

反事实审计还要加入安全和拒答边界。对于一个事实正确但越权的回答，奖励模型不能因为更完整、更有帮助就给高分；对于证据不足的问题，合理 abstain 应与胡编的详细回答拉开距离。最终发布的不是一个平均 pair accuracy，而是一组能说明“哪些变化应该不影响分数、哪些变化必须影响分数”的回放证据。

~~~yaml
counterfactual_pair_audit: cpa_20260820_68
model: reward-v4
base_pair: pair-8848
variants:
  - change: add_politeness
    factual_content_same: true
    score_delta: 0.01
    expected: near_zero
  - change: remove_citation
    factual_content_same: false
    score_delta: -0.42
    expected: lower
  - change: add_unsupported_detail
    factual_content_same: false
    score_delta: 0.08
    expected: lower
  - change: safe_abstain_to_confident_guess
    safety_changed: true
    score_delta: 0.31
    expected: lower
decision: shortcut_found_on_unsupported_detail
action: add_adversarial_pairs_and_retrain
~~~

![奖励模型反事实审计卡：只改变格式、证据或安全边界，检查分数是否按预期变化](/images/notes/llm-rlhf-reward-model/counterfactual-pair-audit-card.svg)

### L5：为什么 pair accuracy 高，仍不能证明奖励模型学到了真正偏好？

因为它可能靠长度、模板或词面捷径答对随机样本。反事实成对会把这些因素单独扰动出来；如果只改格式就改变很多分数，或把无证据的长答案排在谨慎拒答前面，就说明奖励目标仍然会被刷。

## 奖励模型的分数要先校准温度，再进入策略优化

偏好模型常用 Bradley–Terry 形式把两条回答变成胜负概率：

$$
P(y^+ \succ y^-) = \sigma\left(\frac{r(y^+) - r(y^-)}{\tau}\right)
$$

这里的 (	au) 决定分数差异有多“尖锐”。如果换了训练集或标注员，分数尺度可能变化；不做温度校准就直接把 reward 喂给 PPO/GRPO，策略会把量尺漂移误当成偏好变强。

```yaml
reward_calibration:
  contract: rmc_20260820_117
  model: reward-v4
  calibration_set: preference-overlap-v2
  temperature: 0.83
  high_risk_slices: [refusal, citation, long_context]
  release_rule: calibrated_pairwise_agreement >= 0.80
```

![奖励模型校准：偏好对、温度参数、高风险切片和发布门槛被固定在同一张卡里](/images/notes/llm-rlhf-reward-model/reward-calibration-card.svg)

### L5：为什么 pair accuracy 高，仍不能证明奖励模型可靠？

总体 pair accuracy 可能被容易样本拉高，拒答、引用和长上下文切片却仍然错得厉害。奖励模型最终要影响策略行为，因此必须报告切片、校准区间和 tie/abstain，而不是只报一个总准确率。

## 60 秒面试回答

“RLHF 先用 SFT 得到可用的初始策略，再用人类偏好对训练奖励模型，最后用 PPO 让策略在奖励模型上优化。奖励模型通常学习 chosen 比 rejected 得分高，而不是学习绝对真理；PPO 用 advantage 更新策略，同时用 reference model 的 KL 惩罚限制策略漂移。工程上我会重点看偏好一致性、奖励与长度的相关性、KL、clip fraction、hidden set 和真实任务成功率。若 reward 上涨但业务下降，我会把它当成 reward hacking 信号，回放完整轨迹，拆开事实、任务完成、安全和成本奖励，确认优化目标是否真的代表交付目标。”

## 容易被扣分的说法

- “奖励模型就是给答案打分的老师。”——它更准确地说是在有限分布内拟合偏好排序。
- “PPO 只要把 reward 最大化。”——还要看 KL、约束和真实任务指标。
- “pair accuracy 高就说明奖励模型可靠。”——它可能学到了长度、模板等捷径。
- “KL 越大越稳定。”——KL 惩罚过强会让策略无法学习，过弱又会漂移。
- “刷分是模型的问题。”——通常先要审计奖励函数和验收器。

## 带走一张检查清单

- [ ] chosen/rejected 是否同题可比，偏好原因是否有标签？
- [ ] 奖励模型是否检查长度相关性、近重复泄漏和分布外样本？
- [ ] PPO 是否记录 KL、clip fraction、advantage 和 value loss？
- [ ] reference model、KL 系数和停止条件是否版本化？
- [ ] 是否存在独立 hidden set，能抓住“奖励高但任务失败”？
- [ ] 安全、事实和任务完成是否有硬门槛，而不是被平均分抵消？

## 参考资料

1. InstructGPT: Training language models to follow instructions with human feedback (https://arxiv.org/abs/2203.02155)
2. Proximal Policy Optimization Algorithms (https://arxiv.org/abs/1707.06347)
3. Learning to summarize from human feedback (https://arxiv.org/abs/2009.01325)
4. Hugging Face TRL PPO Trainer (https://huggingface.co/docs/trl/ppo_trainer)

## AgentAlpha 大模型 Agent 训练营

这篇负责把“偏好”拆成一条可复盘的训练链路。后续 DPO 会继续回答：如果不单独训练奖励模型，如何直接利用 chosen/rejected？再往后是训练稳定性和数据配比，解决“曲线好看但能力没交付”的问题。

查看 AgentAlpha 大模型 Agent 训练营 (https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb)

先把奖励函数写成验收标准，再把优化器交给模型。下篇见。
