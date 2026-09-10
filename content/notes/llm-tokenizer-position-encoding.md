---
slug: "llm-tokenizer-position-encoding"
title: "Tokenizer 和位置编码：模型为什么不按你以为的词来读？"
excerpt: "Token 不是字数，位置也不只是给每个词贴序号。要把分词粒度、上下文长度、位置外推和成本体验连起来，才解释得清同一句话换种语言或变长后为什么表现不同。"
series: "LLM 基础"
seriesNo: "04"
number: "70"
minutes: 21
---

“这个问题明明只有几句话，为什么 token 数这么多？”因为模型处理的不是人眼看到的词，而是 tokenizer 切出来的子词或字节片段；它还需要知道这些片段的相对或绝对位置。分词和位置编码是最基础的工程细节，却会直接影响上下文预算、费用、截断和长文效果。

## 先给一个能复述的答案

Tokenizer 把文本映射成离散 token id，词表和分词规则决定长度与语义粒度；位置编码把顺序信息注入注意力，使模型区分“先发生”和“后发生”。选择 tokenizer 时要看目标语言、代码和特殊符号的切分效率；扩展上下文时还要验证位置编码在训练分布之外是否稳定，不能只把最大长度配置改大。

![文本、token 和位置表示的关系](/images/notes/llm-tokenizer-position-encoding/token-position.svg)

## 为什么 token 数不是字符数

英文常见子词切分，中文可能接近按字切，也可能因为词表覆盖出现不同组合；代码、URL、emoji 和数字又会产生大量碎片。实际预算应该以目标 tokenizer 统计，而不是用字符数乘一个固定比例。

```python
def budget(text: str, tokenizer, *, max_input: int, reserved_output: int):
    ids = tokenizer.encode(text, add_special_tokens=True)
    if len(ids) + reserved_output > max_input:
        raise ValueError("context budget exceeded")
    return {"tokens": len(ids), "remaining": max_input - len(ids) - reserved_output}
```

高频面试题“为什么中文成本可能更高”没有统一答案，要结合具体 tokenizer、词表和模型计费规则测量。把实验输入固定下来，报告 token 数和输出质量，才是可靠结论。

## 位置编码在注意力里做什么

没有位置信息，注意力看到的是一组无序向量。绝对位置编码直接把位置向量加到 token 表示；相对位置方法把距离或旋转关系注入 $Q,K$，使模型能感知相对顺序。一个抽象写法是：

$$
Attention(Q,K,V)=softmax\left(\frac{\phi(Q)\phi(K)^T}{\sqrt{d}}+B_{position}\right)V
$$

$B_{position}$ 可以表示相对位置偏置，$phi$ 也可以代表旋转后的表示。面试时不必把不同实现混为一谈，但要说清楚位置机制会影响长度外推、注意力距离和训练分布。

![位置距离影响注意力的示意](/images/notes/llm-tokenizer-position-encoding/position-distance.svg)

## 位置外推为什么会失效

模型在训练时见过的长度有限。把最大长度从 4k 改成 32k，并不意味着模型学会了 32k 的依赖：远距离 token 可能被稀释，位置相位可能落在未训练区域，检索到的关键段也可能被“中间迷失”。扩展上下文应同时做位置策略、数据或微调、长文评测和系统级上下文压缩。

## 分词效率如何影响产品

| 输入类型 | 可能问题 | 工程动作 |
| --- | --- | --- |
| 中文长文 | token 与字符比例不稳定 | 真实 tokenizer 统计、段落预算 |
| 代码 | 标点和缩进碎片多 | 代码切片、保留结构边界 |
| JSON | 键名和值重复 | schema 压缩、字段筛选 |
| URL / 日志 | 低语义重复串 | 脱敏、摘要、分层存储 |

## 从一小段文本看 BPE 到底做了什么

以英文代码标识符 `get_user_profile` 为例，词表可能已有 `get`、`_`、`user`、`profile`，也可能只覆盖其中一部分，最终 token 序列依赖训练语料和合并规则。BPE 的直觉是从字符开始，反复把高频相邻片段合并；Unigram 则更像从候选片段中选择概率更高的切分。两者都不是“按单词切开”的简单分词器。

中文、代码和混合文本要单独测量。中文词表覆盖不足时，一个专业词可能被切成多个字节片段；代码中的路径、括号和缩进又会产生大量短 token。真正影响成本的是目标 tokenizer 对真实输入的统计，而不是“中文通常几个字一个 token”这种经验句。

![不同输入类型的 token 预算与结构边界](/images/notes/multimodal-to-transformer/token-budget-ledger.svg)

## 特殊 token 不是普通文字

系统提示、角色分隔、工具调用起止符和结束 token 都可能占用预算。若应用层把一段 JSON 当成普通文本拼进 prompt，模型可能看不出字段边界；如果把控制 token 过滤掉，训练或推理协议又可能不完整。工程上要同时记录：

| 项目 | 需要确认的事实 |
| --- | --- |
| 角色标记 | chat template 是否自动添加 |
| 工具标记 | 调用名、参数和结果如何分隔 |
| 结束标记 | 何时停止生成，是否允许继续工具循环 |
| 截断方向 | 从历史、证据还是输出预留中删减 |
| 解码一致性 | tokenizer 与服务端版本是否相同 |

同一段消息用不同 chat template 编码，token 数可能不同，甚至影响模型行为。部署前应把模板版本作为模型版本的一部分记录。

## 位置编码：从绝对编号到相对旋转

绝对位置编码直接把位置向量加入 token 表示；相对位置方法则让注意力看到 token 之间的距离。以旋转位置编码为例，可以把每两个维度看成一个二维平面，位置 $p$ 对第 $i$ 个频率施加角度 $p\theta_i$：

$$
\begin{aligned}
q'_{2i}&=q_{2i}\cos(p\theta_i)-q_{2i+1}\sin(p\theta_i)\\
q'_{2i+1}&=q_{2i}\sin(p\theta_i)+q_{2i+1}\cos(p\theta_i)
\end{aligned}
$$

这里的关键不是背公式，而是理解“位置越远，旋转相位如何变化”会影响长度外推和远距离依赖。不同实现的缩放、频率和训练长度不能混成一个“RoPE 开关”。

![位置编码在注意力中的相对距离](/images/notes/llm-transformer-vs-rnn/position-encoding.svg)

## 用真实样本做 token 预算实验

准备四组固定样本：中文制度、Python 代码、JSON 工具参数和混合日志。分别用线上 tokenizer 统计 token/字符、特殊 token 占比、截断率和输出质量，并把结果写入预算表：

```python
def profile(samples, tokenizer):
    rows = []
    for name, text in samples.items():
        ids = tokenizer.encode(text, add_special_tokens=True)
        rows.append({
            "name": name,
            "chars": len(text),
            "tokens": len(ids),
            "tokens_per_char": round(len(ids) / max(len(text), 1), 3),
        })
    return rows
```

不要用实验结果直接宣布“中文更贵”。应同时报告模型、tokenizer、计费规则、模板和样本版本；换一个词表或服务商，结论可能改变。

## 上下文扩展的三条路和一个坑

扩大长文能力通常有三条路：继续训练或微调长位置数据、对位置频率做缩放、通过检索和分阶段推理减少真正送入模型的长度。它们可以组合，但每一条都要重新测 needle、长距离引用、代码括号闭合和 P95。

最大的坑是只把 `max_position_embeddings` 配置改大。配置允许输入更长，不代表模型在新位置上学过稳定的相对关系；如果中间事实召回下降，应该回到分块、证据选择和位置策略，而不是继续加窗口数字。

![预填充、解码和缓存共同消耗上下文预算](/images/notes/llm-kv-cache/prefill-decode-cache.svg)

## 线上 token 预算不是“字数除以四”

一个聊天请求的真实输入通常包含系统指令、工具 schema、历史摘要、检索证据和用户问题。即使用户只输入 20 个汉字，工具定义也可能带来几千 token。可以把账单拆成槽位：

| 槽位 | 例子 | 需要关注的指标 |
| --- | --- | --- |
| system | 安全和输出格式 | 版本变化、固定成本 |
| tools | 函数名、参数 schema | 工具数量、重复字段 |
| history | 近期消息和摘要 | 压缩后信息保留率 |
| evidence | 检索片段、引用 | 片段长度、重复率 |
| user | 当前问题 | token/字符比 |

每次发布都应记录这些槽位的 token 分布。系统指令或工具 schema 变长时，用户问题没有变化，P95 和费用也可能突然上升。

![不同内容槽位的 token 预算账本](/images/notes/multimodal-to-transformer/token-budget-ledger.svg)

## RoPE 外推的直觉：相对角度要保持可用

RoPE 将查询和键按位置旋转，使注意力可以利用相对位置信息。可以把二维分量的旋转写成：

$$
\begin{bmatrix}q'_0\\q'_1\end{bmatrix}=
\begin{bmatrix}\cos\theta_p&-\sin\theta_p\\\sin\theta_p&\cos\theta_p\end{bmatrix}
\begin{bmatrix}q_0\\q_1\end{bmatrix}
$$

$$
\theta_p=p\cdot\omega_i,\qquad \omega_i=base^{-2i/d}
$$

外推时如果直接把位置 `p` 拉长，高频维度的相位变化会变得过快，模型在训练范围外难以保持稳定的相对关系。缩放策略的本质是改变频率或有效位置，而不是简单把配置项变大。

![绝对位置、相对旋转与长上下文外推](/images/notes/llm-transformer-vs-rnn/position-encoding.svg)

## 分词器变更也是模型兼容性变更

模型服务升级时，不能只比较 checkpoint 名称。至少要核对：

1. tokenizer 文件和词表 hash 是否一致；
2. special token id 是否变化；
3. chat template 是否插入了不同的角色标记；
4. 相同输入的 token 数和截断位置是否变化；
5. 训练、评测和线上是否使用同一套编码逻辑。

```yaml
tokenizer_contract:
  vocab_sha256: 3e1b...
  special_tokens: {bos: 1, eos: 2, pad: 0}
  chat_template: chatml-v4
  max_input_tokens: 16384
  regression:
    - "same_text_same_ids"
    - "tool_schema_budget_stable"
    - "unicode_roundtrip"
```

如果 `same_text_same_ids` 失败，就应当把它当作需要重新评测的模型版本，而不是无感切换。

## 位置策略的验收样本

长上下文评测不能只用自然语言摘要。建议混入代码括号、JSON、表格、中文英文混排、同名实体和中间位置的唯一数字，并检查：

| 样本 | 观察点 |
| --- | --- |
| JSON 嵌套 8 层 | 括号和引号是否闭合 |
| 旧/新政策同名 | 是否引用当前版本 |
| 中间段唯一编号 | needle 是否可定位 |
| 中英文混排 | token 比例和截断位置 |
| 工具 schema + 长历史 | 是否保留终态和错误说明 |

评测报告中同时列 token 数、位置、引用、格式错误和 P95，才能判断问题来自 tokenizer、位置策略还是上下文装配。

## 把 token 预算分成可检查的槽位

线上最常见的事故不是模型突然变笨，而是系统把预算用在了历史消息，最后没有空间放工具 schema 和终态。可以在请求进入模型前生成一张预算账本：

| 槽位 | 默认上限 | 超限动作 |
| --- | ---: | --- |
| system / 安全规则 | 1,200 | 只允许版本化替换 |
| 工具 schema | 2,000 | 只保留当前候选工具 |
| 用户问题 | 1,000 | 请求澄清，不静默截断 |
| 检索证据 | 6,000 | 先去重，再按引用覆盖裁剪 |
| 历史摘要 | 2,000 | 重新抽取事实，不继续堆叠 |
| 输出与终态 | 1,500 | 降低候选动作数，保留终态 |

账本还要记录编码器版本。因为同一段中文在 tokenizer 变更后可能占用不同 token，只有按实际 `encode` 结果计算，才能让预算和截断行为可复现。

### 一个最小的兼容性回归

```python
def assert_token_contract(encode, samples, max_delta=0.03):
    for sample in samples:
        old_ids = sample["old_ids"]
        new_ids = encode(sample["text"])
        delta = abs(len(new_ids) - len(old_ids)) / max(1, len(old_ids))
        assert delta <= max_delta, (sample["name"], delta)
        assert encode.decode(new_ids) == sample["text"]
```

回归样本不能只放英文句子。中文标点、emoji、代码块、函数名、长数字和多轮 chat template 都应覆盖，否则上线后才会发现某类输入突然被截断。

## 位置外推的排查顺序

遇到长文本质量下降时，先固定 tokenizer 和上下文装配，再比较位置策略；不要同时换模型、换模板和换 RoPE scaling。排查顺序建议是：短文本基线 → 中间位置 needle → 跨窗口引用 → 长输出格式。每一步都保留相同的随机种子与解码参数，才能知道回归究竟来自位置表示还是采样噪声。

最后要把预算账本接到用户体验：当只剩下很少的输出空间时，界面应提示“请缩小问题范围”或先生成摘要，而不是让模型在最后一个 token 被截断，留下半个 JSON 让用户猜。

如果产品支持多模型路由，tokenizer 账本还应随模型绑定，不能先用模型 A 估算、再把同一预算交给模型 B。不同词表和 chat template 会让同一输入占用不同长度，路由切换必须重新计算并记录原因。

这也解释了为什么“上下文还有 10% 空间”不能直接等同于“还能再塞一段文字”：系统还要为结束标记、工具回执和结构化输出预留固定槽位。

## 高频追问

**L1：tokenizer 做什么？**

把文本编码为模型词表中的 token id，解码时再还原文本。它决定输入长度、未知符号处理和部分语义粒度。

**L2：位置编码和 attention 是什么关系？**

attention 本身对输入排列近似置换不变，需要位置机制提供顺序或相对距离信息。

**L2：为什么改大 max context 不够？**

模型可能没有在更长位置上训练过，位置外推和信息聚合会退化；还要配合长文数据、位置策略和评测。

**L3：如何评估 tokenizer？**

用真实中文、代码、表格、日志和多语言样本测 tokens/字符、截断率、成本和任务质量，不要只看词表大小。

**L5：上下文很长但模型仍漏掉中间信息怎么办？**

先做证据定位和分段摘要，把关键事实放入可检索结构；长上下文是容量，不等于稳定的注意力和推理。

## 60 秒面试回答

Tokenizer 把文本切成模型处理的 token，分词粒度直接影响上下文预算和成本；位置编码让 attention 感知顺序和相对距离。工程上我会用目标 tokenizer 测真实中文、代码、JSON 和日志的 token 分布，设计截断和结构化压缩。扩展上下文不能只改最大长度，还要验证位置外推、中间信息召回、长文任务质量和尾延迟，必要时先检索和分块，再把小而关键的证据送给模型。

## 自检清单

- [ ] 能区分字符、词、token 和 token id
- [ ] 能解释位置编码为何影响顺序和长度
- [ ] 能用真实语料测 token 预算
- [ ] 不把最大上下文配置等同于长文能力

## 相关阅读

- [Attention 与上下文窗口](/notes/llm-attention-context)
- [KV Cache 为什么影响推理延迟](/notes/llm-kv-cache)
- [LLM 长上下文如何评测](/notes/llm-long-context)

## 资料来源

- 《Agent 岗面试宝典 v3 · 精华版》（本地飞书资料整理）
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
