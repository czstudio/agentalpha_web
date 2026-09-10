---
slug: llm-transformer-vs-rnn
title: Transformer 为什么跑赢 RNN？别只说“因为能并行”
excerpt: RNN 不是突然“过时”了，而是顺序依赖在大规模训练和长上下文里越来越昂贵。把训练、推理、位置和工程取舍拆开，才讲得清 Transformer 为什么占上风。
series: "LLM 基础"
seriesNo: "04"
number: "15"
minutes: 20
---

面试官经常把这道题问得很轻，像是在等一句口号：

> “Transformer 相比 RNN，到底好在哪里？”

只回答“Transformer 可以并行，RNN 不能并行”，面试官很快会继续追问：推理时不是仍然要一个 token 一个 token 地生成吗？Transformer 没有循环，顺序信息从哪里来？长序列的 `O(T²)` 不也很贵吗？

稳妥的回答，不是宣布 RNN 已经没用了，而是把**训练并行性、长距离依赖、位置信息、推理瓶颈和使用场景**放在一张图里比较。下面按这五个问题走一遍。

## §0 TL;DR：先把结论讲完整

1. **RNN 的核心限制是时间步依赖**：第 `t` 步必须等第 `t-1` 步的隐藏状态，训练无法像 Transformer 一样把整段序列同时送进矩阵乘法。
2. **Transformer 用 Self-Attention 直接建立任意位置之间的连接**，长距离路径从很多步缩成一次注意力读取，更容易学习远距离关系。
3. **Transformer 的代价不是消失了，而是换了位置**：训练阶段获得更好的并行性，但 Attention 的关系矩阵带来 `O(T²)` 的序列长度成本。
4. **生成推理仍然是自回归的**。每次只生成一个新 token，不过历史 K/V 可以缓存，瓶颈会从“重复计算”转为 KV 读取和调度。
5. **没有位置编码，Transformer 不知道顺序**。绝对位置、相对位置、RoPE、ALiBi 都是在给注意力补充“谁在前、距离多远”的信息。
6. **RNN 仍有适用场景**：流式信号、极低延迟、小模型、设备端和需要固定状态的任务，不应该被一句“Transformer 更先进”带过。

一句话版：**Transformer 不是用更少的计算替代 RNN，而是把训练时最难并行的串行依赖，换成可批量执行的全局关系计算；它再用位置编码恢复顺序，用 KV Cache 缓解生成阶段的重复工作。**

## 先给一个能复述的答案

> RNN 每个时间步都要读取上一步的隐藏状态，因此训练存在严格的串行依赖，序列越长，梯度和信息都要经过更多步才能传到远处。Transformer 用 Self-Attention 让每个 token 直接读取其他位置的信息，训练时可以把整段序列的矩阵运算并行化，长距离依赖的路径也更短。代价是 Attention 对序列长度有 `O(T²)` 关系计算，并且 Transformer 本身不带顺序，需要位置编码或 RoPE。生成时仍然是逐 token 解码，只是通过 KV Cache 避免重复计算历史状态。因此它的优势主要体现在大规模训练、长距离建模和硬件利用率，而不是所有任务、所有阶段都更便宜。

这段回答里有一个很重要的词：**阶段**。

| 阶段 | RNN 的主要特征 | Transformer 的主要特征 | 面试时应强调什么 |
| --- | --- | --- | --- |
| 训练 | 时间步串行，难以充分利用 GPU | 序列内可并行计算 Attention | 并行性改变了训练规模 |
| 长距离依赖 | 多步传递，容易衰减或遗忘 | 一层内可直接连到远处 | 信息路径更短 |
| 自回归生成 | 逐步更新隐藏状态 | 逐步生成，读取历史 KV | 推理并没有“完全并行” |
| 长上下文 | 状态大小固定但信息可能丢失 | 关系矩阵和 KV Cache 成本增长 | 优势与代价同时存在 |
| 流式输入 | 天然维护一个状态 | 需要窗口、缓存或增量策略 | RNN 仍可能更合适 |

## §1 RNN 的顺序依赖，究竟卡住了什么

一个最简 RNN 可以写成：

```text
h_t = tanh(W_x x_t + W_h h_{t-1} + b)
y_t = W_y h_t
```

第 `t` 个输出依赖 `h_{t-1}`，而 `h_{t-1}` 又依赖更早的状态。这个递归关系是 RNN 的能力来源，也是它的工程约束。

![RNN 的串行时间步与 Transformer 的全局关系对比](/images/notes/llm-transformer-vs-rnn/sequence-comparison.svg)

### 1.1 训练为什么不能简单地“全并行”

在训练时，我们知道整段输入 `x_1...x_T`，但 `h_3` 必须等 `h_2` 算完。即使 GPU 有很多核心，也不能把依赖链直接拆成 `T` 个完全独立的任务。

可以把它理解成一条单人传送带：

```text
x1 → h1 → h2 → h3 → h4 → ... → hT
```

每个时间步的矩阵乘法并不一定很大，但同步和等待发生了 `T` 次。序列变长以后，硬件利用率、显存访问和训练吞吐都容易受限。

Transformer 则把同一段输入先做成一批 Q、K、V，再交给高度优化的矩阵乘法：

```text
X ──线性投影──► Q, K, V
                 │
                 └──一次性计算所有位置的关系
```

这不是说 Transformer 只需要一次乘法，而是它的主要工作可以以大块矩阵的形式交给 GPU，减少了时间步之间的等待。

### 1.2 长距离依赖的“路径长度”

假设句子开头的实体要影响最后一个 token：

- 在 RNN 中，信息要经过 `T-1` 次隐藏状态更新；
- 在 Self-Attention 中，最后一个位置可以在一层内直接读取开头位置的 Value。

路径更短不代表模型自动理解一切，但它减少了信息必须穿越的中间环节。对于“它指代谁”“这个条件作用于哪一步”这种跨越很长文本的关系，这个差别很关键。

### 1.3 梯度消失不是只有 RNN 才会遇到

RNN 常被拿来和梯度消失、梯度爆炸绑定，但不要把问题说得过头。Transformer 也会遇到优化困难，只是残差连接、归一化和注意力结构让深层训练的路径不同。

更准确的说法是：**RNN 的递归链让长距离信息和梯度必须反复经过同一个状态通道；Transformer 给了信息更短的跳转路径，但付出了更高的全局交互成本。**

## §2 Transformer 把串行依赖换成了什么

一个 Decoder-only Transformer 的简化结构如下：

```text
token ids
   │
embedding + position / RoPE
   │
┌──▼────────────────────────────┐
│ Pre-LN → Causal Self-Attention │
│   └──────── residual ──────────┤
│ Pre-LN → FFN / MLP             │
│   └──────── residual ──────────┘
└──▲────────────────────────────┘
   │ × N layers
   ▼
logits → next token
```

它的关键变化有三个：

1. **把整段 token 同时变成表示**，而不是每一步只更新一个隐藏状态；
2. **用 Attention 建立任意位置之间的读取关系**；
3. **把顺序从递归状态中拿出来，显式交给位置编码或旋转位置机制**。

### 2.1 Encoder、Decoder 和 Decoder-only

面试中“Transformer”可能指三类结构，先把边界说清楚：

| 结构 | Attention 形式 | 常见任务 | 核心特点 |
| --- | --- | --- | --- |
| Encoder-only | 双向 Self-Attention | 分类、向量表示、抽取 | 每个位置可以看整段输入 |
| Encoder-Decoder | Encoder 双向 + Decoder Cross-Attention | 翻译、摘要 | Decoder 生成时读取 Encoder 输出 |
| Decoder-only | Causal Self-Attention | 对话、代码、生成 | 当前位置不能看到未来 token |

GPT 类大模型通常是 Decoder-only。它不是“少了 Encoder 就不完整”，而是把训练目标和推理方式集中在自回归生成上。

### 2.2 为什么并行训练不等于并行生成

这是最容易被追问的地方。

训练一段目标序列时，可以把所有位置的 next-token label 一起算出来，因为正确答案已经在数据里，Causal Mask 负责让每个位置只看允许的前缀。

生成时，模型还不知道第 `t+1` 个 token，只能先得到第 `t` 个，再把它加入上下文，继续预测下一个：

```text
prompt → token_1 → token_2 → token_3 → ...
```

所以准确表述是：**Transformer 在训练阶段高度并行，在自回归生成阶段仍然按 token 串行；KV Cache 和批处理优化的是后者的重复计算与硬件利用率。**

## §3 位置编码：没有循环，顺序放在哪里

纯 Attention 对输入的排列很敏感吗？不，它更接近一个对集合做关系计算的模块。如果只把 token embedding 交给它，`A B C` 和 `C B A` 会缺少足够的顺序信号。

### 3.1 绝对位置编码

原始 Transformer 把一个位置向量加到 token embedding 上：

```text
z_i = token_embedding_i + position_embedding_i
```

经典的正弦位置编码使用不同频率的正弦和余弦，让不同位置拥有可区分的相位。它不需要为每一个位置单独学习参数，但超过训练范围后能否稳定外推，取决于任务和实现。

![位置编码把顺序注入 Q/K 的计算](/images/notes/llm-transformer-vs-rnn/position-encoding.svg)

### 3.2 RoPE：把位置变成 Q、K 的旋转

RoPE 的直觉不是给每个 token 贴一个“第 17 位”的标签，而是让 Q、K 随位置发生不同角度的旋转。两个位置的内积会自然携带相对位置信息：

```text
q_i' = R(θ_i) q_i
k_j' = R(θ_j) k_j
q_i' · k_j'  与  (i - j) 的相对距离有关
```

这使模型更容易利用“相隔多远”而不只是“绝对编号”。现代 LLM 里常见 RoPE，但不同模型会配合频率缩放、位置插值或长上下文训练策略，不能只说“用了 RoPE 就自动支持无限长度”。

### 3.3 ALiBi 与相对偏置

另一类做法是在 Attention score 上直接加与距离有关的偏置：距离越远，偏置可能越不利。它把位置关系放在分数层，而不是改写 embedding。

面试时可以这样比较：

| 方法 | 作用位置 | 直觉 | 需要注意的边界 |
| --- | --- | --- | --- |
| Learned absolute | embedding | 每个位置一张可学习表 | 超出训练长度通常不自然 |
| Sinusoidal | embedding | 多频率波形表示位置 | 长度外推不等于任务外推 |
| RoPE | Q/K | 旋转带出相对距离 | 长上下文要校准频率 |
| ALiBi / bias | score | 距离直接改变偏好 | 偏置形状决定注意力模式 |

## §4 复杂度：Transformer 的优势有价格

把序列长度记为 `T`、隐藏维度记为 `D`：

| 部分 | 近似成本 | 主要瓶颈 |
| --- | --- | --- |
| RNN 时间步 | `O(T · D²)`，但存在串行链 | 等待、并行度低 |
| Attention 关系 | `O(T² · D)` | 长序列的关系矩阵 |
| Q/K/V 投影 | `O(T · D²)` | 隐藏维度和线性层 |
| FFN | `O(T · D · D_ff)` | 大量逐 token 矩阵乘法 |

这个表不能直接推出谁永远更快。它表达的是不同类型的成本：

- RNN 的主要痛点是**无法把时间步充分摊给硬件**；
- Transformer 的主要痛点是**关系数量随长度平方增长**。

因此 FlashAttention、稀疏注意力、滑动窗口、线性注意力和状态空间模型，都是在不同方向上重新安排这笔账，而不是证明原始 Attention 没有代价。

### 4.1 训练吞吐与推理延迟不是一个指标

一个模型可以训练得很快，却生成得很慢；也可以单请求延迟一般，但在大 batch 下吞吐很好。

面试中最好区分：

- **训练吞吐**：每秒处理多少 token，受并行矩阵乘法和通信影响；
- **TTFT**：从请求到第一个 token 的时间，通常受 prefill 影响；
- **TPOT**：生成相邻 token 的平均时间，通常受 decode、KV 读取和调度影响；
- **端到端延迟**：TTFT 加上所有生成 token 的时间。

后面的 KV Cache 与推理优化文章会专门拆这些指标。

## §5 从零写一个小型 Transformer Block

下面的代码省略了 tokenizer 和输出头，只展示一个 Pre-LN Decoder block 的信息流。它比“调用 `nn.Transformer`”更适合面试说明结构，也刻意保留了接口边界。

```python
import torch
from torch import nn


class FeedForward(nn.Module):
    def __init__(self, d_model: int, d_ff: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Linear(d_ff, d_model),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class TinyTransformerBlock(nn.Module):
    def __init__(self, d_model: int, n_heads: int, d_ff: int):
        super().__init__()
        self.norm1 = nn.LayerNorm(d_model)
        self.attn = nn.MultiheadAttention(
            embed_dim=d_model,
            num_heads=n_heads,
            batch_first=True,
        )
        self.norm2 = nn.LayerNorm(d_model)
        self.ffn = FeedForward(d_model, d_ff)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        seq_len = x.size(1)
        causal = torch.triu(
            torch.ones(seq_len, seq_len, dtype=torch.bool, device=x.device),
            diagonal=1,
        )

        # Pre-LN: 先归一化，再进入子层。
        attn_input = self.norm1(x)
        attn_output, _ = self.attn(
            attn_input,
            attn_input,
            attn_input,
            attn_mask=causal,
            need_weights=False,
        )
        x = x + attn_output

        # FFN 对每个位置独立做非线性变换。
        x = x + self.ffn(self.norm2(x))
        return x


torch.manual_seed(7)
block = TinyTransformerBlock(d_model=64, n_heads=4, d_ff=256)
tokens = torch.randn(2, 12, 64)
output = block(tokens)
assert output.shape == tokens.shape
```

这里有三个面试观察点：

1. Attention 子层和 FFN 子层都通过残差回到主干；
2. `attn_mask` 约束了信息流，但不会改变输入的长度；
3. FFN 没有在 token 之间做混合，它接收每个位置的表示并独立变换。

## §6 RNN 什么时候仍然是合理选择

“Transformer 替代 RNN”更像一个大模型时代的结果，不是所有工程场景的判决书。

| 场景 | 为什么 RNN 可能更合适 | 需要承认的代价 |
| --- | --- | --- |
| 传感器流式数据 | 一个固定状态就能持续更新 | 长期依赖可能丢失 |
| 极小模型或 MCU | 参数和内存更容易控制 | 训练吞吐较低 |
| 严格逐样本在线处理 | 不需要保存整段上下文 | 状态设计要谨慎 |
| 低带宽边缘设备 | 状态传输量较小 | 表达上限有限 |
| 音频/时序局部预测 | 时间先后是天然结构 | 全局关系建模较弱 |

如果任务需要一次性读取很长的文档、批量训练海量样本，Transformer 的硬件友好性通常占上风；如果任务是持续输入、状态很小、功耗敏感，RNN 或带状态的其他架构仍值得比较。

## §7 面试官追问：L1、L2、L3 分层练习

### L1：必须答对

#### 1. Transformer 为什么训练时更容易并行？

RNN 的第 `t` 步依赖第 `t-1` 步隐藏状态；Transformer 在训练时可以同时得到整段序列的 Q、K、V，并用批量矩阵运算计算各位置的关系。Causal Mask 负责限制可见范围，不会恢复 RNN 那种时间步等待。

#### 2. Transformer 生成时也是并行的吗？

不是完全并行。自回归生成必须先得到当前 token，再预测下一个。Transformer 的优势是训练并行和表达路径短；推理阶段依赖 KV Cache、连续批处理、量化等手段降低成本。

#### 3. 没有位置编码会发生什么？

模型缺少明确的顺序和距离信息，不能可靠地区分 token 的排列。位置编码、RoPE 或相对位置偏置把顺序注入 Attention。

### L2：区分理解深度

#### 4. 为什么说 Transformer 的长距离路径更短？

在 RNN 中，远处 token 的信息要经过多次隐藏状态更新；在 Self-Attention 中，一个 query 可以直接和远处 key 计算关系并读取 value，一层内就完成跨位置通信。路径更短通常有利于优化，但计算量会随 token 数增长。

#### 5. RNN 的复杂度不是也只有 `O(T)` 吗？为什么还说它慢？

复杂度数量级不等于实际吞吐。RNN 的 `T` 个时间步存在串行依赖，难以把工作交给 GPU 并行执行；Transformer 的注意力有二次项，却能把大量工作组织成高效矩阵乘法。最终速度取决于序列长度、硬件、batch、kernel 和实现。

#### 6. RoPE 解决了什么，没有解决什么？

RoPE 将位置信息作用到 Q、K，使注意力分数携带相对距离关系；它解决的是“顺序如何进入注意力”。它没有自动解决超长上下文训练、远距离信息利用率、KV Cache 显存和注意力的二次复杂度。

### L3：面向系统的追问

#### 7. 为什么 Decoder-only 模型训练可以并行，推理却不能？

训练样本中的目标 token 已经存在，可以对整段序列做 teacher forcing，并用因果 mask 同时计算每个位置的 loss。推理时未来 token 未知，必须逐步把模型刚生成的结果追加回上下文。因此并行的是训练计算，不是未知答案的生成过程。

#### 8. 如果把 RNN 的隐藏状态无限做大，能否替代 Attention？

理论上可以增加状态容量，但状态仍要把大量历史压缩成固定向量，信息可能互相覆盖；Attention 能按查询从多个位置读取不同证据。两者在表示方式、计算模式和内存访问上不同，不是只比 hidden size。

#### 9. 为什么长上下文 Transformer 仍需要滑动窗口或稀疏注意力？

因为标准 Attention 会产生 `T×T` 的关系，长度增加会快速放大计算和显存。窗口或稀疏模式通过减少连接数换取可扩展性，代价是某些远距离关系不能在一层内直接访问。

#### 10. 什么时候应该优先考虑状态空间模型或 RNN 类结构？

当任务具有强流式性、上下文可以被压缩成稳定状态、设备资源受限，或者全局两两关系不是必要条件时，应把状态空间模型、RNN 和 Transformer 一起做基准，而不是只看社区热度。

## 比复杂度更容易被忽略的是 decode 的内存流量

面试里写出 Attention 的 `O(T²)` 还不够。线上生成通常是逐 token decode：每一步只对新 token 做 query，却要读取历史 K/V。于是瓶颈会从“算多少对关系”转向“显存里搬多少 KV、缓存是否命中、batch 是否被最长序列拖住”。这也是为什么同样的参数量，在不同上下文长度和并发下，吞吐与延迟可能完全不同。

可以用一条最小 profile 把 prefill 和 decode 分开：prefill 记录输入长度、吞吐和峰值显存；decode 记录每 token 延迟、KV cache bytes、batch 中有效序列数和 padding 比例。若长上下文下算力利用率下降而显存带宽接近上限，优先考虑 GQA/MQA、分页 KV 或更合理的 batch，而不是只换更大的矩阵乘单元。

~~~yaml
decode_memory_profile: dmp_20260820_69
model: decoder-v4
context_tokens: 8192
prefill:
  throughput_tok_s: 18200
  peak_vram_gb: 21.4
decode:
  batch: 8
  itl_ms: 34
  kv_cache_gb: 13.8
  padding_ratio: 0.22
  memory_bandwidth_util: 0.87
variants:
  - name: mha
    kv_heads: 32
    itl_ms: 34
  - name: gqa
    kv_heads: 8
    itl_ms: 24
decision: gqa_for_long_context_route
~~~

![Transformer 推理 profile：prefill 计算与 decode 的 KV 内存流量分开观察](/images/notes/llm-transformer-vs-rnn/decode-memory-profile-card.svg)

### L5：为什么参数量相同，长上下文下的 decode 速度仍可能差很多？

因为 decode 每步都要读取历史 KV，实际瓶颈受 KV cache 大小、内存带宽、batch padding 和并发调度影响。参数量只是静态规模，不能替代对 prefill、每 token 延迟和显存流量的实测。

## Prefill/Decode 的性能对照还要绑上质量切片

只报告 TTFT、ITL 或吞吐，容易把一个“更快但答错更多”的版本误判成优化。对 Transformer、RNN 或不同 Attention 实现做对照时，至少固定同一批输入和输出长度，并把 prefill、decode、峰值显存、KV 读流量与任务质量放在同一张表里。长上下文、短上下文、流式输出和需要精确引用的任务应分别切片；否则平均延迟会掩盖某一类请求的退化。

```yaml
decode_quality_probe: dqp_20260820_99
matrix:
  short_context: {ttft_ms: 42, itl_ms: 18, grounded_rate: 0.96}
  long_context: {ttft_ms: 311, itl_ms: 34, grounded_rate: 0.94}
  streaming: {ttft_ms: 38, itl_ms: 21, abort_rate: 0.012}
gates:
  quality_drop_max_pp: 1.0
  itl_p95_budget_ms: 40
  kv_memory_growth_explained: true
decision: ship_with_long_context_watch
```

![Prefill/Decode 对照：速度指标与长短上下文质量切片一起决定优化是否成立](/images/notes/llm-transformer-vs-rnn/decode-quality-probe-card.svg)

### L5：为什么 decode 更快，最终质量却可能下降？

更激进的 KV 压缩、量化或截断会减少内存流量，却可能损失远距离证据。要把质量拆成事实、引用、拒答和格式等切片，并回放同一批长上下文样本；只有性能收益和质量门槛同时通过，才算真正优化。

![注意力计算与缓存的衔接：序列关系最终落到推理时的内存流量](/images/notes/llm-attention-context/attention-flow.svg)

![Prefill 与 Decode 的服务形态对照](/images/notes/llm-kv-cache/prefill-decode-cache.svg)

## 60 秒面试回答

> RNN 的每个时间步依赖上一步隐藏状态，训练时存在串行等待，长距离信息也要经过很多次状态传递。Transformer 用 Self-Attention 让每个位置直接读取其他位置，整段输入可以组织成批量矩阵运算，因此训练并行性和长距离建模都更好。它的代价是 Attention 对序列长度有 `O(T²)` 成本，而且没有递归状态，所以需要位置编码或 RoPE。自回归生成仍然逐 token 进行，只是 KV Cache 避免重复计算历史 K/V。换句话说，Transformer 把“时间步串行”换成“全局关系计算”，更适合大规模训练，但并不代表 RNN 在流式和小模型场景里没有价值。

## 本篇总结

- RNN 的瓶颈是时间步依赖，Transformer 的瓶颈是长序列关系数量。
- Transformer 的训练并行不等于生成并行，必须把 prefill 和 decode 分开讨论。
- Self-Attention 缩短了远距离信息路径，但引入了 `O(T²)` 的关系计算。
- 位置编码、RoPE 和相对偏置负责把顺序和距离注入 Attention。
- Encoder-only、Encoder-Decoder、Decoder-only 对应不同的信息可见性和任务目标。
- 选择架构要看任务的上下文、流式性、设备、延迟和吞吐，而不是只问谁更新。

更“工程”的下一个问题是：**MoE 为什么能让模型参数变大，却不让每个 token 都经过所有参数？** 路由、Top-k、容量因子、负载均衡和专家塌缩，在系列里 MoE 一篇里拆开讲。

## 参考资料

1. AgentAlpha《Agent 岗面试宝典 v3》：Transformer 与位置编码专题。
2. [Attention Is All You Need](https://arxiv.org/abs/1706.03762)，Transformer 原论文。
3. [ARIS in AI Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)，参考其按直觉、原理、代码和分层面试题组织内容的方式。
