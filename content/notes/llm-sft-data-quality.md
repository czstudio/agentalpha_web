---
slug: "llm-sft-data-quality"
title: "SFT 不是把答案背下来：一条样本怎样改变模型行为"
excerpt: "监督微调改变的是模型在特定输入下的行为分布。把数据构造、loss mask、质量分层和回归评测拆开，才知道模型到底学会了什么。"
series: "LLM 训练"
seriesNo: "05"
number: "19"
minutes: 18
---

“我们用一百万条客服对话做了 SFT，loss 降得很好。”

👔 面试官 那模型到底学会了什么？

🙋‍♂️ 常见回答 学会了客服知识和回答风格。

👔 面试官 如果训练集里有大量模板化的“您好，请问有什么可以帮您”，模型学会的是知识，还是开场白？如果用户问题写得稍微不同，它还能做对吗？通用能力掉了，你怎么证明是灾难性遗忘，而不是评测集变了？

这几问其实都指向同一件事：SFT 不是把答案灌进参数里，也不是简单地让训练集上的 token 概率变高。它是在一批带条件的示例上，重塑模型“遇到什么输入、应该采取什么输出行为”的概率分布。

下面只回答一个核心问题：**一条 SFT 样本从数据进入训练，再到最终验收，中间到底发生了什么？**

先给面试版结论：

> SFT 用带标签的输入—输出样本训练语言模型，通常只对 assistant 目标 token 计算交叉熵。它能教模型任务格式、风格和局部行为，但不等于可靠地注入知识。高质量 SFT 的关键是数据来源可追溯、指令和答案边界清楚、难例与反例覆盖充分，并用固定回归集同时检查目标能力、格式遵循、安全边界和通用能力是否回退。

## 先把一条样本拆开

很多数据集长这样：

```json
{
  "messages": [
    {"role": "system", "content": "你是订单助手，不能猜测库存。"},
    {"role": "user", "content": "订单 10086 的金额是多少？"},
    {"role": "assistant", "content": "我需要先查询订单，不能凭空猜测金额。"}
  ],
  "metadata": {
    "source": "human_review",
    "policy_version": "order-v3",
    "difficulty": "boundary"
  }
}
```

这里至少有四类信息：

| 部分 | 作用 | 出错后会怎样 |
| --- | --- | --- |
| system / policy | 规定能力边界与角色 | 模型把越权行为当成正常答案 |
| user input | 定义条件 | 任务被截断或模板偏置 |
| assistant target | 训练行为 | 模型学到错误格式或错误事实 |
| metadata | 追溯和分层 | bad case 找不到来源，无法回滚 |

`metadata` 不一定喂给模型，却应该进入数据仓库和实验记录。没有来源、版本、标注人和质量状态的样本，训练时看起来很轻，出问题时却没有办法解释。

![业务日志经过脱敏、去重、质量分层和回归切分，才成为可训练数据](/images/notes/llm-sft-data-quality/data-funnel.svg)

## 原理一：SFT 到底优化了什么

给定输入 token (x) 和目标输出 token (y=(y_1,ldots,y_T))，自回归模型的训练目标通常是：

\[
\mathcal{L}_{SFT}=-\sum_{t=1}^{T}m_t\log p_\theta(y_t\mid x,y_{<t})
\]

其中 (m_t) 是 loss mask。对 user 和 system 部分，常见做法是令 (m_t=0)；对 assistant 目标部分令 (m_t=1)。这意味着模型把前面的指令当作条件，主要学习“在这个条件下，怎样生成目标答案”。

如果把整段对话每个 token 都设成 1，会发生什么？模型也会被要求复现用户问题、角色标签和模板固定前缀。数据里一旦有明显格式偏置，loss 可能降得很漂亮，真实任务却不一定改善。

![SFT 的 loss mask：输入是条件，assistant 输出才是主要监督目标](/images/notes/llm-sft-data-quality/sft-loss.svg)

### 一个可运行的 mask sanity check

训练前不必先跑完整个 epoch。先用 tokenizer 检查角色边界，确认 assistant token 的 mask 没有错位：

```python
from dataclasses import dataclass

@dataclass
class Turn:
    role: str
    text: str

def build_labels(turns, tokenizer):
    input_ids, labels = [], []
    for turn in turns:
        ids = tokenizer.encode(f"<{turn.role}> {turn.text}")
        input_ids.extend(ids)
        labels.extend(ids if turn.role == "assistant" else [-100] * len(ids))
    return input_ids, labels

turns = [
    Turn("system", "不能猜库存"),
    Turn("user", "还有多少件？"),
    Turn("assistant", "我需要先查询库存。"),
]
ids, labels = build_labels(turns, tokenizer)
assert all(label == -100 for label in labels[:len(labels) - 5])
assert any(label != -100 for label in labels)
```

生产实现还要处理 special token、padding、截断、packing 和多轮对话，但这个小检查能先抓住最贵的一类错误：模型根本没有在你以为的答案上学习。

## 原理二：数据质量不是“人工看过”四个字

一条人工标注也可能有问题。面试时可以把质量拆成五个维度：

1. **事实正确**：答案与业务真相、版本和权限一致。
2. **任务相关**：回答解决了用户要求，没有为了显得完整而引入无关内容。
3. **行为可执行**：需要调用工具时，是否给出明确的动作、参数和失败边界。
4. **表达稳定**：格式、语言、引用和结构符合产品契约，但不是每句话都被模板锁死。
5. **风险可控**：隐私、越权、危险操作和拒答边界经过单独标记。

可以给每个样本一个质量记录，而不是只留一个 `approved=true`：

```json
{
  "sample_id": "order-10086-007",
  "source_id": "ticket-2026-0819-12",
  "labels": {
    "factual": "verified",
    "task_fit": "strong",
    "tool_boundary": "needs_lookup",
    "style": "natural",
    "safety": "pass"
  },
  "review": {
    "annotator": "reviewer-12",
    "policy_version": "order-v3",
    "checked_at": "2026-08-19T16:00:00Z"
  }
}
```

这份记录让你能做分层采样：上线前重点看 `needs_lookup`、`factual=uncertain` 和新版本政策样本，而不是随机抽一百条重复的问候语。

## 训练集最常见的四种污染

### 模板偏置：模型只会背开场白

如果每条答案都从“您好，感谢您的咨询”开始，模型会把这段前缀当成高收益 token。解决方法不是把礼貌全部删掉，而是控制模板比例，加入不同语气和不同任务长度的样本，并把“是否真正解决问题”放进评测。

### 答案污染：错误会被放大成确定性

同一错误事实在多条日志里重复出现，去重后仍可能进入训练集。要先按事实实体、文档版本和来源聚类，再做抽样核验。重复出现不是正确性的证据，反而可能让错误变得更难纠正。

### 数据泄漏：训练集和评测集长得太像

按时间随机切分并不总可靠。模板、用户问题和答案可能只是换了订单号，语义上仍是同一个样本。更稳的做法是按任务、用户、文档版本或业务事件分组切分，再用近重复检索做泄漏检查。

### 难例缺失：平均分高，边界题全错

只收集成功工单，模型会学到“标准路径”，却没有见过拒答、超时、权限不足、冲突版本和空结果。难例不是少数异常，而是决定线上风险的主样本。

## 该不该把知识写进 SFT

这是面试里很容易答过头的问题。

适合 SFT 的通常是稳定、可复用的行为：输出格式、工具调用协议、拒答边界、任务分解方式、表达风格和少量稳定规则。频繁变化的商品价格、政策版本、用户画像和长尾知识，更适合放在检索或工具层。

可以用一张简单的判断表：

| 内容 | 变化频率 | 错误代价 | 更合适的承载方式 |
| --- | --- | --- | --- |
| JSON 输出协议 | 低 | 中 | SFT + schema 校验 |
| 工具参数边界 | 中 | 高 | SFT 行为 + 执行器校验 |
| 今日库存 | 高 | 高 | 实时工具 / 数据库 |
| 企业制度 | 中高 | 高 | 版本化 RAG + 引用 |
| 品牌语气 | 低 | 中 | SFT + style eval |

如果每次知识更新都重新 SFT，成本、回滚和遗忘风险都会增加。面试官追问“为什么不用 RAG”时，不要回答“微调更快”，而要先说清楚这条知识的更新频率、错误代价和是否需要可追溯引用。

## 训练参数怎么和问题对应

SFT 不是参数越大越好。一个可解释的起点是：

```yaml
model: base-model-v2
max_seq_length: 4096
learning_rate: 2.0e-5
epochs: 2
warmup_ratio: 0.03
packing: true
loss_on: assistant_only
eval_every_steps: 200
save_best_by: task_success_and_regression
```

参数需要和数据量、序列长度、可训练参数量、batch size 以及目标任务一起看。尤其注意三个信号：

- 训练 loss 降、验证 loss 升：可能过拟合或切分泄漏不足；
- 目标任务涨、通用能力跌：可能数据配比过窄、学习率过大或训练轮数过多；
- loss 平稳、格式仍错：先查模板、mask 和 tokenizer，不要急着换更大模型。

小规模实验应该一次只改一个变量。否则即使结果变好，也不知道是数据清洗、学习率、训练轮数还是评测波动带来的。

## 从“训练完成”到“行为验收”

验收至少分四层：

1. **目标能力**：真实任务成功率、工具参数正确率、结构化输出可解析率。
2. **边界行为**：无权限、无结果、冲突版本、恶意输入和超时是否按约定处理。
3. **通用回归**：基础推理、语言理解、多语言、长文本和原模型强项是否明显下降。
4. **数据与成本**：推理长度、拒答率、延迟、显存和样本覆盖是否达到上线要求。

![SFT 训练完成后，按能力、边界、通用回归和成本做闭环验收](/images/notes/llm-sft-data-quality/eval-loop.svg)

### 一个最小的离线对照实验

至少保留三组：base、SFT、SFT + 规则/工具。每组使用相同的任务集和评测器，输出分层结果：

```python
def summarize(rows):
    groups = {}
    for row in rows:
        group = groups.setdefault(row["model"], [])
        group.append(row)

    for model, items in groups.items():
        print(model, {
            "task_success": mean(x["task_success"] for x in items),
            "format_valid": mean(x["format_valid"] for x in items),
            "unsafe_action": mean(x["unsafe_action"] for x in items),
            "regression": mean(x["regression"] for x in items),
            "latency_ms_p95": percentile([x["latency_ms"] for x in items], 95),
        })
```

不要把所有指标平均成一个总分。一个模型如果任务成功率上涨 3%，但越权动作也上涨 0.5%，这不是简单的“平均分变好”，而是需要产品和安全共同决定的 trade-off。

## 训练集发布前要做一次污染对账

清洗后的样本数变多、loss 变低，都不能证明训练集可以发布。上线前至少做一次来源、去重、评测集重叠和答案边界的对账，把“看起来干净”变成可以签字的发布回执：

~~~yaml
sft_release_receipt: sft_20260820_08
source_window: "2026-07-01/2026-08-15"
counts:
  raw: 182400
  after_dedupe: 147920
  after_quality_gate: 119360
dedupe:
  exact_overlap: 0
  semantic_overlap_over_0_92: 4360
split_overlap:
  train_dev: 0
  train_eval: 0
leakage:
  benchmark_answers: 0
  future_policy_docs: 0
hard_cases:
  unsupported_answer: 218
  tool_schema_mismatch: 94
mask_check:
  assistant_tokens_only: true
decision: publish_with_exclusions
~~~

对账重点不是追求保留最多样本，而是确认每一条留下来的样本都知道从哪里来、要教什么、会不会把评测答案提前泄露。抽样审计时把原文、清洗后文本、标签和排除原因放在同一行；发现 train/eval 重叠或无依据答案时，宁可减少数量，也不要把污染带进模型行为。

![SFT 数据发布回执把来源、去重、泄漏、难例和 mask 校验串成一条可审计链路](/images/notes/llm-sft-data-quality/data-release-receipt.svg)

## L5：为什么清洗后样本越多不等于质量越高？

因为重复模板、评测泄漏和无依据答案也会被“保留下来”。质量要看覆盖、边界和独立评测，不看单纯的清洗后数量；一份更小但来源清楚、无重叠、能覆盖失败类型的训练集，往往比大而杂的语料更可靠。

## 面试官的三层追问

### L1：SFT 和预训练有什么区别？

预训练在大规模无标注语料上学习通用语言分布；SFT 在带任务标签的输入—输出样本上调整行为。前者解决“能不能理解和生成语言”，后者解决“面对这类任务时应该怎样回答或行动”。

### L2：为什么只对 assistant token 算 loss？

因为 user/system 是条件，目标是学习 assistant 在这些条件下的输出。这样可以减少模型对模板和用户问题本身的重复学习，也更接近任务监督。不过具体 mask 仍要结合 chat template、special token 和多轮训练目标验证，不能只背规则。

### L3：SFT 后通用能力下降，你怎么排查？

先确认评测集、采样和解码参数没有变化；再按数据来源、任务类型和训练步数做曲线，检查是否过拟合、数据配比过窄、知识泄漏或模板偏置；最后对比降学习率、减少 epochs、混入通用回放数据和参数高效微调。每个修复都要在目标集和固定回归集上同时验证。

## 样本发布要有“难度分桶”和阻断条件

清洗后的样本不能直接混成一个大文件训练。先按任务类型、推理步数、拒答边界和工具调用分桶，再为每桶设置最低覆盖和最高污染率。这样既能防止简单模板把训练曲线“刷好看”，也能在发布前发现关键边界题缺失。

```yaml
dataset_release: sft-v6
mixture:
  basic_qa: {target_ratio: 0.30, min_valid: 18000}
  multi_step_reasoning: {target_ratio: 0.25, min_valid: 12000}
  refusal_and_policy: {target_ratio: 0.20, min_valid: 9000}
  tool_use: {target_ratio: 0.15, min_valid: 7000}
  hard_negative: {target_ratio: 0.10, min_valid: 5000}
gates:
  duplicate_rate_max: 0.08
  eval_overlap_max: 0.01
  unsafe_answer_rate_max: 0.005
  missing_boundary_labels: 0
decision: blocked_until_gates_pass
```

发布门禁最好同时看总量和分桶下限。某一桶样本不足时，与其用相似模板补齐，不如把训练范围写小并标记能力缺口；否则模型会在常见题上变得流畅，却在工具失败、权限拒绝和不确定性表达上继续犯错。训练后仍要回到固定回归集，检查通用能力、目标能力和拒答边界是否一起变化。

![SFT 数据发布按能力分桶，并用重复、泄漏和边界标签门禁阻断污染样本](/images/notes/llm-sft-data-quality/mixture-gate-card.svg)

### L5：为什么不能用模板扩写快速补足缺失分桶？

模板扩写通常只增加表面变体，不会增加新的边界、工具故障或反事实结构，还可能把同一个错误答案复制很多遍。缺口应该先被记录和验收，再决定补数据还是收窄训练目标。

## 训练集要做“对话级污染”检查，而不只是文本去重

同一条问答改几个字，仍然可能把评测答案泄漏进训练集；按字符串去重抓不到这种污染。更稳妥的做法是以任务或事件为单位建立指纹，把问题、证据片段、工具参数和最终答案一起比对，再对近邻样本做人工抽检。发现 train 与 dev 共享同一业务事件时，优先把整组事件隔离，而不是只删掉一个字符串相同的样本。

```yaml
contamination_probe: cp_20260820_33
unit: task_event
fingerprints:
  prompt_semantic: sha256:...
  evidence_ids: [kb_118, kb_204]
  tool_args_shape: crm.refund.v3
  answer_claims: [refund_window, approval_owner]
splits:
  train: 184000
  dev: 12000
  regression: 6000
findings:
  exact_overlap: 0
  semantic_overlap: 37
  shared_business_event: 12
gates:
  shared_event_in_train_dev: 0
  manual_review_pending: 0
decision: release_after_event_isolation
```

![SFT 对话级污染探针：把问题、证据、工具参数和答案声明合并指纹再做切分](/images/notes/llm-sft-data-quality/conversation-contamination-card.svg)

### L5：为什么语义近邻也可能算泄漏？

如果训练样本和评测样本只是换了人名、日期或表述，模型仍可能直接记住答案路径，离线分数会被高估。是否泄漏要看它们是否共享同一事实、事件和工具结果，而不只是看文本相似度阈值。

## 对话打包要检查“边界”和 loss mask 的双重一致

SFT 数据看起来是多轮对话，送进训练器后却常被拼成一个长序列。只要 turn 边界、角色标记或 assistant mask 有一处偏移，模型就可能在 loss 里学习 system 规则、用户隐私甚至工具原始回执，而不是学习应当生成的答案。我的做法是对每条样本保留 token 级 `role_spans`，在 packing 前后各跑一次 mask sanity check：assistant token 必须被训练，system/user 默认不计 loss，工具观察只有在明确要学习格式时才纳入。

多轮样本还要按任务事件切分，不能为了提高吞吐把两个不同用户或不同权限上下文拼到同一条序列。packing 的边界信息要进入 manifest，训练后用一小批可读样本反解 token，确认模型学到的是“如何回答”，而不是“如何复述输入”。

```yaml
conversation_pack_probe: cpp_20260820_40
sample: task_event_8842
turns:
  - {role: system, span: [0, 41], loss: 0}
  - {role: user, span: [42, 88], loss: 0}
  - {role: assistant, span: [89, 151], loss: 1}
  - {role: tool, span: [152, 210], loss: 0}
  - {role: assistant, span: [211, 260], loss: 1}
packing:
  max_length: 4096
  cross_event_concat: false
gates:
  role_span_roundtrip: pass
  assistant_tokens_nonzero_loss: true
  system_and_user_leakage: 0
decision: trainable
```

![SFT 对话打包探针：角色边界、assistant mask 和事件隔离一起验收](/images/notes/llm-sft-data-quality/conversation-pack-mask-card.svg)

### L5：为什么训练 loss 下降仍要做 token 级 mask 回放？

loss 下降只说明优化器找到了更容易预测的目标，不能证明目标就是 assistant 输出。mask 偏移时，模型可能在复述用户问题或工具结果，训练曲线反而更漂亮；token 级回放才能确认监督信号落在正确角色上。

## mask 通过之后还要看“监督信号覆盖率”

token 级 mask 没有错，只能说明该训练哪些 token；它不能保证每类关键任务真的获得了足够监督。如果一批数据里 90% 都是普通问答，拒答、工具调用、冲突证据和超时恢复即使 mask 正确，也可能只贡献很少的有效梯度。我的数据报告会同时列出 assistant loss token 数、按任务/风险切片的覆盖率和每类样本的梯度占比。

可以先用一个简单的覆盖率检查发现“有样本、没信号”的 bucket：

\[
coverage_b=
\frac{\text{assistant loss tokens in bucket }b}
{\text{all loss tokens}}
\]

它不是质量分数，而是监督预算的可见账本。覆盖率过低时，先检查 packing、截断和模板边界，再决定是否重采样；覆盖率过高也要警惕某类简单模板把梯度占满。

```yaml
supervision_coverage_audit: sca_20260820_92
run: sft-v12
buckets:
  tool_call: {samples: 4200, loss_tokens: 0.18, target: [0.15, 0.25]}
  refusal: {samples: 1800, loss_tokens: 0.04, target: [0.08, 0.12]}
  grounded_answer: {samples: 9200, loss_tokens: 0.58, target: [0.45, 0.65]}
  ordinary_qa: {samples: 28000, loss_tokens: 0.20, target: [0.15, 0.30]}
checks:
  mask_shift: false
  truncated_assistant_spans: 37
  decision: rebalance_refusal_before_next_run
```

![SFT 监督覆盖率卡：把 mask 正确性与任务桶实际获得的 loss 预算分开检查](/images/notes/llm-sft-data-quality/supervision-coverage-card.svg)

### L5：mask 全对了，为什么拒答能力仍然不涨？

因为 mask 只管哪些 token 进入 loss，不管拒答样本占比、难度、事实边界和梯度竞争。还要检查拒答、工具错误、越权和冲突证据等风险桶的覆盖率，并用固定对抗集确认行为真的改变。

## 60 秒面试回答

“SFT 是在带标签的输入—输出样本上优化自回归交叉熵，通常只对 assistant 输出 token 计算 loss。它主要改变模型的任务行为、格式和风格，不等于可靠地把所有业务知识写进参数。我的数据流程会先做脱敏、去重、版本和事实核验，再按任务、难度、风险和来源分层，保留可追溯 metadata。训练前先做 mask sanity check，训练后用目标能力、边界安全、通用回归和成本四层评测。若 loss 下降但效果不涨，我优先查模板、数据污染、评测切分和监督目标，而不是盲目加训练轮数。”

## 容易被扣分的说法

- “SFT 就是把知识写进模型。”——忽略更新频率、可追溯性和遗忘。
- “数据越多越好。”——重复、污染和模板偏置会让更多数据放大错误。
- “训练 loss 越低越好。”——目标错、mask 错或评测错时，低 loss 没有交付意义。
- “只要人工标注就可靠。”——标注也需要来源、版本、事实核验和抽检。
- “把所有失败样本都塞进训练集。”——先分清模型错误、工具错误、环境故障和标签错误。

## 带走一张检查清单

- [ ] 每条样本能否追溯到来源、版本、标注和审核时间？
- [ ] system、user、assistant 的边界和 loss mask 是否经过 token 级检查？
- [ ] 数据是否覆盖拒答、权限、超时、空结果、冲突版本等难例？
- [ ] train/dev/regression 是否按事件或任务去重，而不是简单随机切分？
- [ ] 目标能力提升时，通用、安全、延迟和显存是否同步回归？
- [ ] bad case 能否判断来自数据、监督目标、优化参数还是评测器？

## 参考资料

1. Stanford Alpaca, Self-Instruct (https://github.com/tatsu-lab/stanford_alpaca)
2. Llama 3 Herd of Models (https://arxiv.org/abs/2407.21783)
3. InstructGPT: Training language models to follow instructions with human feedback (https://arxiv.org/abs/2203.02155)
4. Hugging Face TRL SFT Trainer (https://huggingface.co/docs/trl/sft_trainer)

## AgentAlpha 大模型 Agent 训练营

AgentAlpha 的路线从 RAG、记忆系统、单 Agent、多 Agent、DeepSearch、高效推理，推进到 Code Agent、自进化编码、Agentic RL 和综合项目。

LLM 训练阶段先用 SFT 建立可控行为，再进入 RLHF、DPO、PPO 与训练稳定性专题。阶段交付不是“跑出一个 loss 曲线”，而是一份可复现的训练记录：数据版本、mask 检查、对照实验、bad case、回归结果和部署取舍都要能被复盘。

查看 AgentAlpha 大模型 Agent 训练营 (https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb)

如果你只想先看路线图，发「路线」；想判断自己适合从哪个项目开始，发「项目」；正在准备面试，发「追问」。

先把样本写清楚，再让模型学会负责。下篇见。
