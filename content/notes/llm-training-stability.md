---
slug: "llm-training-stability"
title: "训练 loss 降了，模型为什么没变聪明？"
excerpt: "漂亮的 loss 曲线，只说明优化器在当前目标上前进。数据污染、mask 错位、梯度爆炸、学习率不匹配和灾难性遗忘，都可能让 loss 下降、真实能力却不动。用指标矩阵和可回滚实验，才能找到能修的环节。"
series: "LLM 训练"
seriesNo: "05"
number: "22"
minutes: 18
---

“训练 loss 从 2.1 降到 0.6（示意数字），应该已经学得很好了吧？”先别急着庆祝，面试官通常还会追问验证集和线上任务。

👔 面试官  验证集也降了，为什么线上任务成功率不涨？

🙋‍♂️ 常见回答  可能是数据质量不够，再多训练一些看看。

👔 面试官  如果通用能力下降、梯度突然变成 NaN、checkpoint 之间结果抖动，你怎么判断是数据、目标还是优化器的问题？

模型训练不是只看终点分数的考试，而是一套需要持续观测的实验系统。loss 是个很有用的仪表盘，但它只反映“模型是否更擅长完成当前监督目标”，不直接等于事实正确、任务成功、边界安全或推理能力提升。

先给面试版结论：

> 训练稳定性要把目标、数据、优化和行为四层指标放在同一时间轴上看。先确认 tokenization、loss mask、切分和标签没有问题，再排查学习率、有效 batch、梯度范数、混合精度和 checkpoint。对于通用能力下降，要用固定回归集、回放数据和分层曲线区分过拟合、灾难性遗忘、模板偏置与评测漂移，而不是只调学习率或延长训练。

## 第一张图：loss 和能力为什么会错位

![loss、验证集和真实行为可能走向不同方向，排查要先对齐时间轴和数据版本](/images/notes/llm-training-stability/loss-mismatch.svg)

常见的四种错位如下：

| 现象 | 可能含义 | 第一处检查 |
| --- | --- | --- |
| train loss 降、valid loss 升 | 过拟合、泄漏或切分问题 | 数据去重、任务分布、学习率 |
| train/valid 都降、任务成功不涨 | 监督目标和真实目标不一致 | mask、模板、业务评测 |
| loss 抖动、梯度尖峰 | batch/学习率/数值精度不稳 | grad norm、overflow、有效 batch |
| loss 变好、通用回归跌 | 数据配比过窄或遗忘 | replay mix、回归集、训练步数 |

不要一开始就“换更大的模型”。如果标签错了，模型越大只会更快地拟合错误；如果评测切分泄漏，曲线越漂亮越危险。

## 先做目标和数据的 sanity check

### 1. 检查一个 batch 的可视化

随机抽取几个 batch，打印原文、token、mask 和 label，确认：

- assistant 输出不是空的，且没有被截断成只剩模板；
- padding、special token 和 stop token 没有误计入 loss；
- 多轮对话的 role 边界和 chat template 与推理一致；
- 标签版本、工具结果和引用没有错位。

### 2. 用极小数据做过拟合测试

取 8～32 条完全固定的样本，训练到接近 0 loss。如果模型连这组样本都无法复现，优先怀疑实现；如果极小集能过拟合、真实集不涨，再去看数据分布和目标定义。

```python
def assert_batch(batch):
    labels = batch["labels"]
    active = labels.ne(-100)
    assert active.any(), "没有有效监督 token"
    assert active.sum(dim=1).min().item() >= 2, "存在过短目标"
    assert torch.isfinite(batch["input_ids"].float()).all()

def tiny_overfit_check(model, batch, steps=80):
    model.train()
    for step in range(steps):
        out = model(**batch)
        assert torch.isfinite(out.loss), f"loss 在 step={step} 变成非数"
        out.loss.backward()
        optimizer.step()
        optimizer.zero_grad(set_to_none=True)
    return model(**batch).loss.item()
```

这个测试不是为了证明模型最终有效，而是为了把“代码管线错误”和“训练策略选择错误”分开。面试时能说出这一层，通常比背十个优化器名词更有说服力。

## 再看优化器：有效 batch 比显卡 batch 更重要

训练稳定性常被一个误区拖累：把单卡 batch size 当成真正 batch。梯度累积、数据并行和序列长度都会改变每次更新看到的 token 数。

\[
   B_{tokens}=B_{device}\times N_{gpu}\times K_{accum}\times L_{avg}
\]

同一个 learning rate，在有效 token batch 差 8 倍时，更新噪声和稳定性可能完全不同。实验记录至少要写清：设备 batch、梯度累积、平均序列长度、global token batch 和 warmup 步数。

### 梯度范数与混合精度

```python
scaler.scale(loss).backward()
scaler.unscale_(optimizer)

grad_norm = torch.nn.utils.clip_grad_norm_(
    model.parameters(), max_norm=1.0
)
if not torch.isfinite(grad_norm):
    optimizer.zero_grad(set_to_none=True)
    scaler.update()
    raise RuntimeError("gradient overflow: skip and inspect batch")

scaler.step(optimizer)
scaler.update()
```

![训练监控把 loss、梯度范数、溢出和有效 token 放在同一时间轴，异常 batch 才能被定位](/images/notes/llm-training-stability/grad-monitor.svg)

梯度裁剪是保险丝，不是发动机。若每一步都触发裁剪，说明学习率、数据异常、loss scale 或有效 batch 可能有更深的问题。要把 `grad_norm_before_clip`、overflow 次数和被跳过的 batch 记录下来，而不是只留最终 loss。

## 训练稳定性指标矩阵

![从优化器到能力回归的训练稳定性矩阵：每个异常都要绑定可验证的下一步](/images/notes/llm-training-stability/forgetting-matrix.svg)

| 层 | 必看指标 | 异常时优先问什么 |
| --- | --- | --- |
| 数据 | token 长度、重复率、标签覆盖、难度分布 | 是否某一模板占满了 batch？ |
| 目标 | active token 数、label entropy、mask 比例 | 模型到底在学答案还是前缀？ |
| 优化 | loss、grad norm、learning rate、overflow | 更新是否过大或被跳过？ |
| 表征 | 激活均值/方差、logit entropy | 是否出现饱和或塌缩？ |
| 行为 | 任务成功、事实、安全、长度、拒答 | loss 的提升是否代表交付？ |
| 回归 | base/SFT/当前 checkpoint 分层差异 | 哪类通用能力开始掉？ |

每一个指标都要有“异常后动作”。例如 `grad_norm` 连续尖峰时，先保存 offending batch 的样本 ID；`format_valid` 下降时，先查模板和解码，而不是直接增加训练轮数。

## 灾难性遗忘：不是一句“混点通用数据”

灾难性遗忘通常表现为：目标任务上涨，模型在原来擅长的能力上显著下降。原因可能包括：

1. 新数据分布过窄，更新方向长期偏向少数任务；
2. 学习率或训练轮数过大，参数离 base/SFT 太远；
3. 目标标签和原能力发生冲突，模型被迫覆盖旧行为；
4. 评测 prompt、解码参数或语言分布变了，造成假性回归。

稳妥的排查顺序是：固定回归集与解码 → 按 checkpoint 画曲线 → 按任务和语言切片 → 做 replay mix / 降学习率 / 早停对照。不要把所有通用数据无差别混入，否则你很难知道保留下来的是什么、牺牲掉的又是什么。

一个简单的 replay 配比可以先作为实验起点：

```yaml
mix:
  target_task: 0.55
  boundary_cases: 0.15
  general_replay: 0.20
  safety_regression: 0.10
schedule:
  warmup_ratio: 0.05
  max_epochs: 2
  early_stop_on: [task_success, regression_floor]
```

配比不是标准答案。每次调整都要记录样本数、有效 token、任务成功率和回归底线，避免“比例看起来合理”却没有证据。

## checkpoint 不是越晚越好

训练时保存 checkpoint 的价值，不只是断点续训，更是观察行为变化。建议至少保存：

- 固定步数的模型权重和 optimizer/scaler 状态；
- 数据版本、代码 commit、tokenizer 和 chat template；
- 同一回归集上的能力、边界、安全、长度四层指标；
- 最佳目标分、最佳综合分和最后一步三个候选。

很多线上事故来自“最后一个 checkpoint”而不是“最佳 checkpoint”。如果目标任务在 step 1800 达到峰值，step 2400 的 loss 更低但通用能力跌了，就应该让选择规则明确拒绝后者。

![checkpoint 选择同时看目标任务、通用回归和安全底线，而不是盲选最后一步](/images/notes/llm-training-stability/checkpoint-timeline.svg)

## 一套可执行的排查顺序

当“loss 降但效果不涨”时，按下面顺序做小实验：

1. **实现层**：tiny overfit、mask 可视化、tokenizer/chat template 对照。
2. **数据层**：去重、泄漏、标签冲突、任务/长度/难度分布。
3. **优化层**：学习率 × 有效 batch、梯度裁剪、混合精度、warmup。
4. **评测层**：固定 prompt、解码、评测器和版本，检查是否发生漂移。
5. **行为层**：base/SFT/当前 checkpoint 的 hard cases 与回归底线。

每一步只改一个变量，并保留失败实验。失败记录本身就是训练系统的知识库，否则团队会反复踩同一个“看起来只是调参”的坑。

## 给 checkpoint 发一张行为放行单

checkpoint 选择不该靠“最后一步”或单一总分。每个候选都应该生成一张行为放行单，把目标任务、通用回归、安全底线和训练元数据放在一起：

```yaml
checkpoint: step-1800
base_revision: sft-42
metrics:
  target_success: 0.84
  general_holdout: 0.91
  safety_block_rate: 1.00
  format_valid: 0.98
guardrails:
  regression_floor: pass
  nan_steps: 0
  replay_mix: 0.20
decision: canary
rejected:
  - step-2400: "目标 loss 更低，但通用 holdout -4.3pp"
```

放行单还要链接 offending batch、评测配置和 checkpoint hash。这样当线上行为变化时，可以区分是模型权重、模板、解码还是数据版本造成的；如果一个候选没有通过安全底线，即使目标分最高，也只能标成 `rejected`。

![checkpoint 行为放行单同时检查目标能力、通用回归、安全底线和训练指纹](/images/notes/llm-training-stability/checkpoint-release-ticket.svg)

## Canary 还要比较“行为差异”，不只比较分数

两个 checkpoint 都过了硬门槛，仍可能在工具调用、拒答边界或回答长度上产生不同风险。进入 canary 前，我会固定一组代表性任务做行为差异卡：

```yaml
behavior_diff: bd_20260820_05
baseline: step-1800
candidate: step-2400
replay_set: agent-hardcases-v6
changes:
  tool_calls:
    success: +2.1pp
    duplicate_calls: +0.4pp
  refusal:
    safe_boundary: +0.8pp
    over_refusal: +1.9pp
  output:
    tokens_p95: +18%
gates:
  duplicate_calls_max: 0.2%
  over_refusal_max: 1.0%
decision: reject
reason: "安全边界虽提升，但重复调用和过度拒答超限"
```

行为差异卡把“目标成功率上涨”拆回用户真正感知的动作；`gates` 仍由规则层计算，不能用目标指标抵消重复副作用或安全回退。拒绝的 checkpoint 也保留回放和原因，未来数据修复后可以重新验证，而不是直接丢弃。

![Checkpoint 行为差异卡：把工具、拒答和长度变化与发布门槛放在一起](/images/notes/llm-training-stability/behavior-diff-card.svg)

## 异常 batch 还要进入“隔离区”，不能只跳过

训练遇到 overflow、异常梯度或标签错位时，直接 `skip` 会让曲线看起来恢复，却把问题样本从实验记录里抹掉。我会把触发异常的 batch 放进隔离区，保存数据版本、mask 摘要、梯度统计和复现命令；后续只有在修复数据或数值配置后，才允许带着新的回执重新放行。

~~~yaml
anomaly_quarantine_receipt: aqr_20260820_39
run_id: sft-20260820-12
batch_id: shard-04-batch-188
signals:
  grad_norm: 184.2
  amp_overflow: true
  invalid_label_ratio: 0.03
quarantine:
  artifact: artifact://train/anomaly/188
  replay_command: replay://sft-12/batch-188
  auto_update: false
resolution: pending_data_review
~~~

隔离的目标不是让训练永远停住，而是让保护动作和根因调查并行：可以先跳过当前步保护主流程，同时保留样本和上下文；如果同一类异常重复出现，就停止发布并回查数据管线。这样“曲线平了”不会被误读成“训练已经稳定”。

![异常 batch 隔离卡：保护训练、保存证据并等待数据复核](/images/notes/llm-training-stability/anomaly-quarantine-card.svg)

### L5：为什么跳过异常 batch 也要留完整回执？

因为跳过是处置，不是解释。没有 batch、数据版本和复现入口，后续无法判断异常是偶发数值问题，还是同一类坏样本会继续污染训练。

### L5：两个 checkpoint 都通过门槛，为什么还要做行为差异回放？

因为平均指标可能掩盖关键切片和动作变化。行为回放能发现重复工具调用、过度拒答、输出膨胀等线上成本和风险，帮助选择更可逆、更容易解释的候选。

## L5：为什么不能用一个加权总分自动选 checkpoint？

因为安全和格式这类指标通常是硬门槛，不应被目标任务的高分抵消；不同任务切片的回归也可能在平均值里被稀释。先过滤违反硬门槛的候选，再在通过者中比较目标能力、成本和稳定性，并保留被拒绝 checkpoint 的原因，才能让选择可解释、可回滚。

## 面试官的三层追问

### L1：为什么 loss 降了，任务成功率可能不涨？

因为 loss 只衡量训练目标 token 的概率，不一定覆盖任务完成、工具结果、事实正确和安全边界。数据模板、mask、评测切分或监督目标与真实交付不一致时，loss 下降仍可能对应错误行为。

### L2：怎么区分过拟合和灾难性遗忘？

过拟合通常表现为 train/valid 差距扩大、目标任务在训练分布上继续涨；灾难性遗忘表现为新任务涨的同时，固定的旧能力回归集下降。需要按 checkpoint、任务切片和 replay 对照共同判断，不能只看一条验证曲线。

### L3：梯度爆炸时，你会先调小学习率还是先查数据？

先保存触发异常的 batch，检查长度、标签、数值范围和混合精度，再看梯度范数与有效 batch。可以临时裁剪和跳过异常步保护训练，但如果异常由坏样本或 mask 错位引起，只调学习率会掩盖根因。

## checkpoint 晋级要看“能否前进，也能否退回”

训练发布不是在一串 checkpoint 里挑最高分，而是一个带回滚能力的晋级流程。候选 checkpoint 先进入离线 replay，过硬门槛后进入小流量 canary；canary 期间比较工具调用、拒答和成本等行为差异，只有没有新增不可逆风险，才允许扩大流量。若回归触发，系统应能回到上一个已验收版本，并保留这次拒绝的证据。

```yaml
checkpoint_promotion: cpp_20260820_52
candidate: step-2400
previous_good: step-1800
stages:
  offline_replay:
    target_success: 0.84
    safety_pass: 1.00
    decision: pass
  canary_5_percent:
    duplicate_tool_call: 0.004
    over_refusal: 0.009
    p95_tokens_delta: 0.11
    decision: hold
gates:
  duplicate_tool_call_max: 0.002
  over_refusal_max: 0.010
rollback:
  target: step-1800
  smoke_replay: pass
decision: rollback
reason: duplicate_tool_call_above_gate
```

这里的 `hold` 和 `rollback` 是一等状态，不是发布失败后才临时补的脚本。`previous_good`、回滚 smoke replay 和 offending slice 一起保存，下一轮模型或数据修复后才能复用这次经验。这样团队讨论的是“候选在哪个门被挡住”，而不是“为什么线上感觉不太对”。

![checkpoint 晋级卡：离线回放、灰度观察和可验证回滚组成发布路径](/images/notes/llm-training-stability/checkpoint-promotion-card.svg)

### L5：如果 canary 只有很少流量，怎么判断应该回滚？

先设置高风险动作的零容忍或极低阈值，例如重复写入、越权和安全绕过；对低频指标同时报告置信区间和样本数。不能因为样本少就忽略确定性的坏动作，也不能把一次偶然波动直接当成普遍回归。

## 训练回滚要保存“优化器状态”和精确数据游标

只把模型权重退回上一个 checkpoint，不一定能真正回到上一个行为。Adam 的动量、学习率调度器、混合精度 scaler 和数据游标都会影响下一步更新；如果这些状态错位，回滚后可能再次撞上同一异常，或者比较实验时混入不同数据顺序。发布卡里要把可恢复状态一起固化，并先做 smoke replay 再继续训练。

```yaml
rollback_bundle: rb_20260820_68
checkpoint: step-1800
files:
  weights: sha256:weights-1800
  optimizer: sha256:adam-1800
  scheduler: sha256:cosine-1800
  scaler: sha256:amp-1800
  data_cursor: shard-07@offset-44218
restore_checks:
  seed: 17
  first_batch_hash: sha256:batch-1801
  smoke_loss_delta_max: 0.0001
decision: rollback_reproducible
```

![训练回滚包：权重、优化器、调度器、scaler 和数据游标共同恢复](/images/notes/llm-training-stability/rollback-state-bundle-card.svg)

### L5：为什么恢复了同一个权重，loss 仍可能对不上？

因为下一步更新还依赖优化器动量、学习率、随机种子、混合精度状态和数据顺序。缺任何一项，回滚只是“加载了旧文件”，不是恢复了旧实验。

## 梯度异常要和数据指纹绑定，不能只看曲线尖峰

训练曲线突然抬头时，最省事的解释是“学习率太大”；但同样的尖峰也可能来自损坏样本、极长序列、错误的 loss mask、异常 token 比例或某个数据源突然切换。排查时要把每个异常 batch 的数据指纹、有效 token、长度分布、mask 比例和混合精度状态写入隔离回执，之后才能复现并判断是数据问题还是优化问题。

隔离不等于静默丢弃。异常 batch 进入 quarantine 后，训练主线可以先跳过，但回放任务要在相同 seed、相同 tokenizer 和相同 loss 配置下重跑；如果重跑仍然异常，就把它归到数据或标签缺陷，如果只在混合精度下异常，则优先检查 scaler、溢出和算子稳定性。每个分类都要保留下一步动作，避免团队只盯着红色曲线争论。

~~~yaml
anomaly_batch_fingerprint: abf_20260820_63
run: sft-agent-v3
step: 1864
batch_hash: sha256:batch-1864
stats:
  samples: 32
  effective_tokens: 11840
  max_seq_len: 8192
  masked_ratio: 0.71
  grad_norm: 48.2
  amp_overflow: 1
  data_sources: [feishu-import, tool-traces]
replay:
  same_seed: true
  same_tokenizer: tok-v7
  loss_delta: 0.00002
  reproduced: true
classification: mixed_precision_overflow
action: lower_scaler_growth_and_replay
~~~

![异常 batch 指纹卡：数据、mask、梯度和混合精度状态一起进入隔离与复现链](/images/notes/llm-training-stability/anomaly-batch-fingerprint-card.svg)

### L5：为什么不能只把异常 batch 删除后继续训练？

删除会让训练暂时变平，却丢掉了定位根因的证据；同类数据再次出现时问题还会回来。正确做法是隔离、保留指纹、在独立回放里确认分类，再决定修数据、改数值配置还是有条件地重新纳入。

## 训练稳定性要同时看梯度噪声和恢复点

loss 曲线平滑，不代表优化真的稳定。不同 batch 的梯度方向可能互相抵消，最后只留下一个看起来正常的平均值。一个常用的诊断量是梯度噪声尺度：

$$
GNS = \frac{\operatorname{Var}(g)}{\lVert \mathbb{E}[g] \rVert^2 + \epsilon}
$$

它不是发布门槛，却能帮助解释“为什么 batch size 调大后 loss 变稳，泛化却变差”。恢复训练时还要同时固定权重、优化器状态、随机种子和数据游标，否则相同 checkpoint 也可能走出另一条轨迹。

```yaml
stability_checkpoint:
  contract: gns_20260820_116
  checkpoint: step_184000
  optimizer_state: sha256:opt-9f21
  data_cursor: shard-07/offset-18320
  random_state: seed-42
  diagnostics:
    gradient_noise_scale: 3.8
    clip_rate: 0.014
    canary_loss_delta: 0.006
```

![训练稳定性回执：梯度噪声、裁剪比例、优化器状态和精确数据游标一起保存](/images/notes/llm-training-stability/stability-checkpoint-card.svg)

### L5：为什么恢复了同一个权重，loss 仍可能对不上？

Adam 的动量、学习率调度器和下一个数据 shard 都会影响下一步更新。只恢复模型权重，相当于换了优化器和数据顺序；这不是“偶尔有一点差异”，而是恢复契约不完整。

## 60 秒面试回答

“训练稳定性不能只看 loss，要把数据、监督目标、优化器和行为回归放在同一时间轴。我的第一步是做 tiny overfit 和 batch 可视化，确认 tokenizer、mask、标签和切分没问题；第二步记录有效 token batch、学习率、grad norm、overflow 和 checkpoint；第三步用固定的目标能力、边界、安全和通用回归集判断行为是否真的改善。loss 降但任务不涨，优先查目标错位和评测漂移；目标涨但通用能力跌，则按 checkpoint 做 replay、降学习率、减少 epochs 和早停对照。每次只改一个变量，并保留完整实验元数据。”

## 容易被扣分的说法

- “loss 越低模型越强。”——没有说明监督目标和真实任务的关系。
- “梯度爆炸就把 learning rate 调小。”——可能真正的问题是坏 batch、mask 或数值精度。
- “灾难性遗忘就是多加通用数据。”——需要分层 replay 和固定回归证据。
- “最后一个 checkpoint 就是最好的。”——训练过程中的能力峰值可能更早出现。
- “指标越多越专业。”——没有异常动作和样本回放，指标只是装饰。

## 带走一张检查清单

- [ ] 是否做过极小数据过拟合和随机 batch 可视化？
- [ ] 是否记录有效 token batch，而不是只记录 device batch？
- [ ] grad norm、overflow、mask 比例和异常样本是否可追溯？
- [ ] 是否有固定解码参数和版本化的目标/回归评测？
- [ ] 是否按 checkpoint 观察目标能力、通用能力和安全边界？
- [ ] 每个修复是否只改变一个变量，并保留失败实验？

## 参考资料

1. LoRA: Low-Rank Adaptation of Large Language Models (https://arxiv.org/abs/2106.09685)
2. Llama 3 Model Card and training details (https://arxiv.org/abs/2407.21783)
3. PyTorch Automatic Mixed Precision examples (https://pytorch.org/docs/stable/notes/amp_examples.html)

## AgentAlpha 大模型 Agent 训练营

想把训练稳定性这类专题系统练一遍，可以看 [AgentAlpha 大模型 Agent 训练营](https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb)。训练阶段的关键习惯是留好记录：数据版本、mask 检查、异常 batch、checkpoint 对照和回归底线，让“为什么变好、为什么变坏”都能复盘。

先证明模型在学对的目标，再讨论它学得快不快。
