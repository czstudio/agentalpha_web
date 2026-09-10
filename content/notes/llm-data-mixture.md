---
slug: "llm-data-mixture"
title: "预训练数据不是越多越好：这批数据值得加吗？"
excerpt: "大模型吃下的 token 越多，不代表学到的能力越多。重复网页会放大偏见，模板化代码会挤占推理数据，低质量语料会把训练预算变成噪声。把清洗、配比和能力评测连起来，才知道数据值不值得加。"
series: "LLM 训练"
seriesNo: "05"
number: "23"
minutes: 18
---

“我们又抓了十万亿 token，训练数据肯定更强了。”这句话一出来，数据工程师通常先问：里面到底有多少新东西？

👔 面试官  这些 token 有多少是重复的？中文、代码、数学、对话分别占多少？

🙋‍♂️ 常见回答  先全部混在一起训练，模型会自己学会分布。

👔 面试官  如果重复网页把某个错误观点放大十次，模型的事实能力下降，你怎么证明是数据配比导致的？

预训练数据工程的核心不是“收集更多”，而是把有限的训练预算花在真正有信息增益的 token 上。数据清洗、精确去重、近重复去重、质量打分和混合配比一起决定模型会学到什么；只要一个环节粗糙，规模就可能变成放大噪声的机器。

先给面试版结论：

> 有效训练量不等于原始 token 数，而更接近“去重后、质量可接受、与目标能力相关的 token”。数据管线应保留来源与版本，先做安全和语言过滤，再做文档级/段落级近重复去重，最后按质量、领域、语言和任务目标设定 mixture，并用小规模 ablation 验证每一类数据带来的能力增益。配比没有通用答案，必须和评测切片、训练预算及遗忘风险一起看。

## 第一张图：重复数据为什么会悄悄改变模型

![预训练数据从来源采集到精确去重、近重复聚类和质量抽样的处理路径](/images/notes/llm-data-mixture/dedupe-graph.svg)

同一篇网页可能以不同 URL、不同抓取时间、不同模板出现在语料里。若直接按文档数统计，重复内容会被误认为“更多证据”；按 token 统计，又可能让某种低质量模板挤占稀缺的数学、代码或长文推理数据。

可以先把数据分成四个层次：

| 层次 | 例子 | 典型处理 |
| --- | --- | --- |
| 来源级 | 站点、仓库、书籍、企业文档 | 许可、来源、更新时间 |
| 文档级 | 一篇文章、一个文件、一个对话 | 语言、安全、格式过滤 |
| 片段级 | 段落、函数、代码块 | 近重复、模板、质量抽样 |
| token 级 | 最终送入训练的序列 | 长度、packing、mask、权重 |

每层都应该保留 ID 和版本。否则模型背错某个事实时，你只能重新下载一遍数据，没法定位是哪个来源、哪次清洗或哪条配比带来的。

## 原理一：有效 token 不是总 token

设某个数据桶有原始 token 数 \(T_i\)，经过重复和质量过滤后保留比例为 \(q_i\)，训练时的采样权重为 \(w_i\)，那么它对训练预算的近似贡献可以写成：

\[
   T^{effective}_i=T_i\times q_i\times w_i
\]

如果同一网页重复了 5 次，\(T_i\) 增大了，但信息量不一定增加；如果一桶代码的质量很高但配比过低，模型也可能学不到应有的代码能力。工程上更重要的是比较“每增加一单位 token，能力指标提升了多少”。

### 精确去重和近重复去重

- **精确去重**：对规范化后的全文做 hash，成本低，能清除完全相同的文档。
- **近重复去重**：用 MinHash、SimHash、n-gram 或 embedding 聚类清除改几个标题、换几个空格的复制品。
- **语义去重**：对长文或问答做语义聚类，成本更高，适合在高价值领域做抽样审核。

```python
import hashlib
import re

def normalize(text):
    text = text.lower()
    text = re.sub(r"https?://\S+", "<url>", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def exact_key(text):
    return hashlib.sha256(normalize(text).encode()).hexdigest()

seen = set()
kept = []
for doc in documents:
    key = exact_key(doc["text"])
    if key in seen:
        continue
    seen.add(key)
    kept.append(doc)
```

这个示例只做 exact dedup，不能替代近重复去重。生产管线还要避免把合法的重复结构误删：代码中相似的样板、法律文本的固定条款和不同版本的文档，可能需要保留版本差异并标记，而不是粗暴合并。

## 原理二：质量过滤不是把“长”当成“好”

一条长网页可能只是导航、广告和重复模板；一段短代码却可能包含关键算法。质量打分应至少拆开：

1. **可读性与完整性**：句子是否截断，编码是否损坏，代码是否有上下文。
2. **信息密度**：是否包含可学习的事实、步骤、推理或结构。
3. **来源可信度**：站点、作者、版本和许可是否可追溯。
4. **风险与污染**：隐私、恶意指令、SEO 垃圾、自动生成循环内容。
5. **目标相关性**：对语言、代码、数学、多语或目标领域是否有贡献。

可以把质量分数作为采样信号，而不是唯一硬过滤条件。低分样本不一定全部删除，应该进入 `quarantine` 或人工抽样池，避免一个错误的分类器把长尾能力一起剪掉。

![数据进入训练前要通过许可、隐私、污染、重复和质量五道门，并保留隔离区供人工复核](/images/notes/llm-data-mixture/quality-gates.svg)

## 第二张图：mixture 是预算，不是愿望清单

![把有限训练 token 分成语言、代码、数学、知识和对话桶，并用能力增益动态调整](/images/notes/llm-data-mixture/mixture-budget.svg)

一个可解释的 mixture 表至少包含四列：

| 数据桶 | 目标能力 | 初始权重 | 调整依据 |
| --- | --- | ---: | --- |
| 通用高质量文本 | 语言流畅、常识、长文 | 0.40 | 语言/知识回归 |
| 代码与仓库 | 代码生成、修复、工具使用 | 0.25 | pass@k、编译通过 |
| 数学与推理 | 分步推理、符号操作 | 0.15 | 分层数学集 |
| 对话与指令 | 遵循指令、格式、拒答 | 0.15 | instruction eval |
| 多语/长上下文 | 覆盖和迁移 | 0.05 | 语言/长度切片 |

这只是一个实验起点，不是标准答案。真正有用的是记录每次改变权重后的边际收益：代码桶增加 5%，代码通过率涨了多少，通用能力掉了多少，训练成本增加多少。

### 采样权重与重复次数

一个小而高质量的数据集可能需要过采样，但过采样会增加记忆和过拟合风险。要区分：

- **物理重复**：数据文件真的复制了多份，去重和日志会变复杂；
- **采样重复**：数据只保存一份，但 sampler 赋予更高概率；
- **loss 权重**：样本出现次数不变，训练目标对某类 token 加权。

优先使用可追踪的 sampler/loss 权重，不要把同一文件复制十遍后再猜模型为什么记住了模板。

## 训练数据的泄漏和污染

预训练语料的污染比 SFT 更隐蔽，因为数据规模大、来源杂。至少检查：

1. 评测集及其解析答案是否出现在训练语料；
2. 同一仓库不同 commit 是否把测试答案提前暴露；
3. 新闻、百科和论坛的时间版本是否跨越了评测截止日期；
4. 合成数据是否由同一个模型循环生成，形成风格回声；
5. 站点模板、导航和 SEO 段落是否占据大量 token。

评测污染不是“删掉一个文件”就结束。要记录检测规则、命中的来源、处理动作和剩余风险，并在新数据版本进入训练前重复跑检测。

## 一个可审计的数据 manifest

```json
{
  "dataset_version": "pretrain-v7-2026-08",
  "source": "web-crawl-2026-07",
  "license": "mixed-reviewed",
  "documents": 18420000,
  "tokens_before": 920000000000,
  "tokens_after_exact_dedup": 610000000000,
  "tokens_after_quality": 382000000000,
  "buckets": {
    "general": 0.40,
    "code": 0.25,
    "math": 0.15,
    "dialogue": 0.15,
    "multilingual": 0.05
  },
  "checks": {
    "pii_scan": "pass-with-quarantine",
    "benchmark_contamination": "pass",
    "near_duplicate_sample": "reviewed"
  }
}
```

manifest 的意义是可复现：训练失败时你能回答“这次到底用了哪一版数据”，能力变化时也能回到具体 bucket 做 ablation。

## 用小规模实验验证配比

不要直接用完整训练预算试错。可以固定模型、tokenizer、优化器和总 token，做三组或四组 mixture ablation：

```python
mixtures = {
    "baseline": {"general": .40, "code": .25, "math": .15,
                 "dialogue": .15, "multilingual": .05},
    "code_plus": {"general": .35, "code": .35, "math": .15,
                  "dialogue": .10, "multilingual": .05},
    "quality_plus": {"general": .50, "code": .20, "math": .15,
                     "dialogue": .10, "multilingual": .05},
}

for name, weights in mixtures.items():
    result = train_fixed_budget(weights, tokens=2_000_000_000)
    report(name, {
        "code_pass": result.code_pass,
        "math_acc": result.math_acc,
        "general_perplexity": result.general_ppl,
        "long_context": result.long_context,
        "cost_gpu_hours": result.gpu_hours,
    })
```

报告时不要只给一个平均分。数据配比的价值往往体现在切片：代码生成提升但自然语言回退，或者短文本不变而长上下文变好。只有切片和成本同时呈现，才能做出可解释的取舍。

![配比消融矩阵把每个数据桶的增益、回归、成本和置信度放在一起比较](/images/notes/llm-data-mixture/ablation-matrix.svg)

## 近重复、记忆与能力的关系

去重不是越多越好，也不是越少越“记知识”。重复数据可能帮助模型记住稳定事实和常见代码模式，但也可能放大错误、版权风险和模板偏置。一个实用的判断方式是：

- 对高频重复簇抽样，看它们是否来自可信、互相独立的来源；
- 对去重前后做小模型对照，比较事实、长尾和记忆评测；
- 对不同版本文档保留时间和来源标签，避免把更新当噪声删除；
- 对高风险 benchmark 做单独隔离，不让“为了覆盖”变成泄漏。

最终目标不是让语料看起来干净，而是让每个 token 的训练价值和风险都能被说明。

## 面试官的三层追问

### L1：为什么预训练数据不是越多越好？

重复、低质量、模板化和污染数据会占用训练预算，并把错误或偏见重复放大。有效 token 更接近去重、质量过滤和目标相关性之后的可学习信息，而不是下载文件的总大小。

### L2：精确去重和近重复去重有什么区别？

精确去重对规范化全文做 hash，只能删除完全相同的文本；近重复去重还要识别改标题、空格、模板或少量内容后的复制品，通常用 MinHash、SimHash、n-gram 或聚类。近重复阈值过严会误删版本差异，过松又会放大重复，需要按领域抽样验收。

### L3：怎么证明某类数据真的提升了模型能力？

固定模型、tokenizer、总 token、训练步数和评测版本，只改变该 bucket 的采样权重，做小规模 ablation。报告目标能力、通用回归、安全、污染风险和训练成本的切片结果，再决定是否扩大预算。不能只因为某类数据量大，就推断它带来了能力。

## 配比实验要同时记住数据、预算和污染检查

“代码数据占 20%，网页数据占 60%”听起来很具体，仍然回答不了三个问题：样本有没有重复，训练预算是否按 token 而不是文件数分配，评测集里有没有混入同源文本。配比实验应当带一张可审计的实验卡：

```yaml
mixture_run: mix_20260819_06
sources:
  - name: web-clean
    token_weight: 0.55
    quality_filter: q4+
    dedup_cluster: web-v8
  - name: code-curated
    token_weight: 0.25
    quality_filter: executable_tests
    dedup_cluster: code-v5
  - name: reasoning-dialogue
    token_weight: 0.20
    quality_filter: human-reviewed
budget:
  total_tokens: 8.0B
  epochs: 1.2
gates:
  near_duplicate_rate_max: 0.08
  eval_contamination: 0
  license_review: passed
ablation: [web-clean, code-curated, reasoning-dialogue]
```

`token_weight` 比文件数量更接近真实训练预算，`dedup_cluster` 让近重复检查有落点，`eval_contamination` 则把“数据看起来更强”与“答案被背过”区分开。实验结束后固定总 token、训练步数和评测切片，才有资格把能力变化归因到配比。

还要保留失败实验。某类数据被移除后代码能力下降，说明它有贡献；某类数据比例增加但污染门槛被打穿，则应记录为不可上线，而不是只留下最好看的那组曲线。

![预训练数据配比实验卡](/images/notes/llm-data-mixture/mixture-experiment-card.svg)

### L5：污染检查发现少量近重复，是否必须丢掉整批数据？

不一定。先按来源、重复簇和评测关联度分层：与评测集高度相似的样本必须隔离，普通网页近重复可以重新采样或降权。关键是记录处置规则和剩余污染率，并用不含争议样本的干净评测集复核能力变化。

## 配比实验还要做一次“污染回溯”

某个数据桶让验证集分数上升，不一定是能力真的变强，也可能是训练数据和评测样本发生了近重复、模板泄漏或时间穿越。数据配比实验结束后，我会沿着样本指纹反查来源、时间和相似邻居，确保增益没有来自污染。

回溯回执可以把配比结果和污染审计绑在一起：

~~~yaml
mixture_contamination_receipt: mcr_20260820_28
experiment: code_plus_dialogue-v3
eval_set: coding-hidden-2026q3
sampled_eval_cases: 1200
near_duplicate_hits: 7
template_overlap:
  train_to_eval: 0.8%
  threshold: 1.0%
time_leakage_cases: 0
source_trace:
  buckets_checked: [code, math, knowledge, dialogue]
  quarantined_records: 19
gain_after_cleanup:
  pass_rate_delta: +2.1pp
decision: accept_with_quarantine
~~~

污染审计不只查精确重复，还要查近重复、固定题面、答案模板和评测发布时间。发现少量命中时可以隔离并重跑；如果增益主要由泄漏样本贡献，就不能把它写成模型能力提升。配比结论应带上清洗前后差异和置信区间，方便下一轮实验复用同一口径。

![训练数据配比的污染回溯：样本指纹、模板重叠、时间泄漏与清洗后增益](/images/notes/llm-data-mixture/contamination-receipt-card.svg)

### L5：为什么数据桶配比带来的分数提升，不能直接当成能力增益？

因为评测集可能被近重复、模板或时间信息污染。我的做法是先做指纹和时间回溯，再比较清洗前后结果；只有污染受控、隐藏集和真实任务也同步提升，才把增益归因给配比。

## 把配比写成“有效 token 账本”

数据桶的比例只是入口，真正要交给训练器的是经过过滤、去重、采样和分片之后的有效 token。比如 `code` 桶标称 25%，但其中 8% 被许可证规则隔离、12% 和网页代码近重复、长样本又因为上下文上限被截断，最终进入 optimizer 的有效 token 可能只有 18%。如果只在配置文件里写 `code: 0.25`，训练结束后很难解释“为什么这轮代码能力没有涨”。

我会在每个 epoch 结束时生成一张账本，把原始 token、各道处置损耗和最终 token 放在一起：

```yaml
effective_token_ledger: etl_20260820_07
run: pretrain-mix-v12
sources:
  - name: web-clean
    raw_tokens: 4.2B
    filtered_tokens: 3.7B
    dedup_removed: 0.4B
    truncated_tokens: 0.1B
    effective_tokens: 3.2B
  - name: code-curated
    raw_tokens: 2.1B
    filtered_tokens: 1.8B
    dedup_removed: 0.2B
    truncated_tokens: 0.05B
    effective_tokens: 1.55B
weights_after_filter:
  web-clean: 0.58
  code-curated: 0.28
  reasoning-dialogue: 0.14
gates:
  total_effective_tokens: 5.5B
  weight_delta_max: 0.03
  license_review: passed
decision: publish_manifest
```

这张账本有两个好处。第一，采样权重不再被文件数误导；第二，下一轮可以针对损耗最大的桶做实验，而不是盲目把原始数据再扩大一倍。若某桶的 `raw_tokens` 很大但 `effective_tokens` 很小，它更像是清洗问题，不是“训练预算不够”。

各桶的真实占比也可以用一个公式概括：

$$
E_i = \frac{p_i \times q_i \times w_i}{\sum_j p_j \times q_j \times w_j}
$$

其中 \(p_i\) 是采样比例，\(q_i\) 是过滤后保留率，\(w_i\) 是有效 token 权重。面试时不要只说“我把代码数据调到 20%”，要说明调的是 \(p_i\)，最终验收看的是 \(E_i\)。

![有效 token 账本把原始规模、过滤损耗和最终训练权重串起来](/images/notes/llm-data-mixture/effective-token-ledger-card.svg)

### L5：为什么要记录过滤损耗，而不是只记录最终配比？

因为损耗本身就是数据质量信号。相同的最终权重，可能来自高质量小数据，也可能来自大量污染后勉强凑出的数据；没有损耗明细，就无法定位预算到底浪费在哪里。

### L5：为什么总 token 一样，训练影响仍可能不同？

因为长答案可能被截断，模板 token 可能不计 loss，低质量样本还会在过滤阶段消失。只报总 token 会把这些差异藏起来；有效 token 账本能说明每个桶真正参与了多少更新。

## 调 mixture 时要锁定总 token，避免“变好”只是因为吃得更多

把代码权重从 20% 调到 30% 的同时又把总训练 token 增加一倍，最后能力上升并不能归因于配比。每次 mixture ablation 都要锁定总有效 token、训练步数和优化器设置，只改变桶权重，并把过滤损耗后的真实 token 作为分母。对小桶可以做温度采样或重复上限，但要把重复次数和记忆风险写进实验卡。

配比变更还需要保留“旧 mix 继续可复现”的入口。线上发现通用能力或安全回归时，能够迅速回到上一个 manifest，比重新猜一个权重更重要。评测报告按领域、语言、代码、长上下文和污染切片展示，避免一个总体分数掩盖某个桶被过采样。

```yaml
mixture_ablation: ma_20260820_41
fixed:
  effective_tokens: 5.5B
  optimizer: adamw_v3
  steps: 180000
variants:
  - {name: base, web: 0.58, code: 0.28, dialogue: 0.14}
  - {name: code_plus, web: 0.50, code: 0.36, dialogue: 0.14}
  - {name: dialogue_plus, web: 0.54, code: 0.28, dialogue: 0.18}
gates:
  total_token_delta: 0
  repeat_cap: 3
  safety_regression: 0
  old_manifest_replayable: true
decision: compare_by_slice
```

![数据配比消融卡：固定有效 token，只改变桶权重，并保留旧 manifest 回滚](/images/notes/llm-data-mixture/mixture-ablation-card.svg)

### L5：为什么把一个数据桶重复三遍可能比少采样更危险？

重复会让模型更快记住模板、个人信息或错误格式，并不等于增加了三倍有效信息。重复上限、近重复检测和记忆评测要一起看；如果小桶很有价值，优先提高质量或做任务化采样，而不是无限复制。

## 配比账本还要检查“跨桶竞争”

即使每个桶都有自己的有效 token，混合后仍可能出现一个桶抢走另一个桶的训练机会：长代码样本占用更多序列位置，短对话样本虽然条数多，却在 token 预算里几乎没有声音；高损耗桶不断重采样，也会挤压本来稳定的通用数据。我会在 manifest 里同时记录序列占用、token 占用和 optimizer step 占用，按阶段观察桶之间的实际竞争。

```yaml
mixture_competition_audit: mca_20260820_85
run: pretrain-mix-v13
buckets:
  code: {token_share: 0.31, sequence_share: 0.18, step_share: 0.34}
  web: {token_share: 0.48, sequence_share: 0.56, step_share: 0.45}
  dialogue: {token_share: 0.21, sequence_share: 0.26, step_share: 0.21}
checks:
  max_step_share_delta: 0.05
  long_sequence_cap: 0.20
  resample_budget_logged: true
decision: rebalance_sequence_packing
```

![训练数据配比竞争审计卡：同时看 token、序列和 optimizer step 的真实占用](/images/notes/llm-data-mixture/mixture-competition-card.svg)

### L5：为什么 token 配比相同，训练影响仍可能不同？

序列长度、packing、梯度累积和重采样都会改变某个桶实际参与更新的次数。只看 token 百分比会漏掉这些竞争关系；要把 token、序列、step 和有效梯度一起回放，才能解释能力变化。

## 60 秒面试回答

“预训练数据工程的目标是最大化有效信息，而不是最大化原始 token。我的流程会记录来源、版本和许可，先做安全/语言/格式过滤，再做 exact 与 near-duplicate 去重，按质量、领域、语言和任务目标分桶。mixture 先设一个可解释的预算，再用固定总 token 的 ablation 比较代码、数学、通用、长上下文和多语切片，同时观察污染、记忆、成本与遗忘风险。对于高价值但小规模的数据，优先使用可追踪的采样权重，不复制文件制造假规模。最终每个数据版本都用 manifest 固化，确保能力变化可以回溯到具体来源和配比。”

## 容易被扣分的说法

- “数据越多越好，模型会自己过滤。”——优化器不会自动理解版权、污染和业务风险。
- “去重就是对全文做 hash。”——这漏掉了大量近重复和模板复制。
- “长文本就是高质量文本。”——广告、导航和循环生成内容也可能很长。
- “把代码数据加到 50% 就会更会写代码。”——需要固定预算和能力 ablation 证明。
- “不同版本文档都是重复，可以全部删掉。”——版本差异可能是模型需要学习的时间信息。

## 带走一张检查清单

- [ ] 每个数据桶是否有来源、许可、时间和版本？
- [ ] 是否同时做 exact、near-duplicate 和污染检测？
- [ ] 质量分数是否拆成完整性、信息密度、可信度、风险和目标相关性？
- [ ] mixture 是否记录有效 token、采样权重和重复次数？
- [ ] 是否用固定预算做过至少一轮 bucket ablation？
- [ ] 是否同时报告目标能力、通用回归、安全、记忆和训练成本？

## 参考资料

1. Scaling Laws for Neural Language Models (https://arxiv.org/abs/2001.08361)
2. Deduplicating Training Data Makes Language Models Better (https://arxiv.org/abs/2107.06499)
3. The Pile: An 800GB Dataset of Diverse Text for Language Modeling (https://arxiv.org/abs/2101.00027)
4. DataComp-LM: In search of the next generation of training sets (https://arxiv.org/abs/2406.11794)

## AgentAlpha 大模型 Agent 训练营

LLM 训练这一组从 SFT 行为、RLHF/DPO 偏好，到稳定性和预训练数据配比，最终都回到一个问题：你能不能解释模型为什么获得某项能力，以及为此付出了什么代价。

[查看 AgentAlpha 大模型 Agent 训练营](https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb)
