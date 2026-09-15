---
slug: llm-attention-context
title: Attention 到底在算什么？从一行公式讲清上下文理解
excerpt: 面试别只背 Q、K、V。把 Attention 拆成找谁相关、取哪些信息、按多大权重合并，再连上 mask、多头和复杂度，Transformer 为什么读得懂上下文就清楚了。
series: "LLM 基础"
seriesNo: "04"
number: "14"
minutes: 18
---

面试官很可能把白板递过来，问你一句：

> “请你解释一下 Self-Attention，最好不要只背公式。”

很多回答从 `Q、K、V` 讲起，讲到 softmax 就停在“这样就可以关注重要信息”。听起来没错，但面试官还会继续追问：

- Q、K、V 为什么要分成三个投影？
- 为什么一定要除以 `√d_k`？
- Decoder 为什么不能看未来 token？
- 多头到底多了什么能力？
- Attention 为什么长文本会变慢？
- 它明明能看全局，为什么还需要位置编码？

## §0 TL;DR：先把九句话背成自己的话

1. **Self-Attention 的输入通常只有一个序列 `X`，Q、K、V 是同一个 `X` 经过三组线性投影得到的三份表示。**
2. **Q 表示“我正在找什么”，K 表示“我能用什么关键词被找到”，V 表示“找到我之后真正取走的内容”。**
3. `QKᵀ` 计算查询和每个位置的匹配分数，除以 `√d_k` 是为了让 softmax 不要过早饱和。
4. softmax 把分数变成权重，权重再对 V 做加权求和；所以 Attention 不是“选一个 token”，而是“按比例混合多个 token 的信息”。
5. Causal Mask 必须在 softmax 之前把未来位置的 logit 设成负无穷，否则模型训练时会偷看答案。
6. Multi-Head Attention 把表示拆成多个较小的子空间，让不同 head 并行学习语法、指代、位置或其他关系。
7. Attention 本身不认识顺序；如果交换输入 token 的顺序，纯 Attention 仍然只会看到一组元素，所以 Transformer 需要位置编码或 RoPE。
8. 对长度为 `T` 的序列，标准全连接 Attention 的分数矩阵是 `T×T`，时间和显存开销都受到 `O(T²)` 影响。
9. Transformer Block 不等于 Attention：一个完整 Block 还包含残差连接、LayerNorm 和前馈网络 FFN；KV Cache、量化、FlashAttention 属于后续的推理优化问题。

如果只剩一分钟，把 Q/K/V 的分工、√d_k 的作用、mask 的位置、O(T²) 的代价这四件事说到条件反射，后面的追问才接得住。

## 先把结论摆出来

> Self-Attention 的核心是：让序列中的每个位置都根据自己的 Query，去和所有位置的 Key 计算相关性，再用这些相关性对 Value 做加权汇总。公式是 `softmax(QKᵀ/√d_k)V`。在 Decoder 中要加 Causal Mask，避免当前位置看到未来；在工程上还要考虑多头、位置编码和 `O(T²)` 的长文本成本。Attention 只是 Transformer Block 的一部分，通常还要和残差、LayerNorm、FFN 一起工作。

这段回答有四个层次：

| 层次 | 你回答了什么 | 面试官听到的信号 |
| --- | --- | --- |
| 直觉 | “根据 Query 找相关 Key，再汇总 Value” | 不是死记公式 |
| 公式 | `softmax(QKᵀ/√d_k)V` | 知道计算顺序 |
| 结构 | mask、多头、位置编码、FFN | 能把局部知识放回 Transformer |
| 工程 | `O(T²)`、KV Cache、推理优化 | 能继续聊真实系统 |

## §1 直觉：Attention 到底在解决什么

先看一句有歧义的话：

> 小明把书放到桌子上，因为**它**太重了。

模型遇到“它”时，得从前面的 token 里找出更可能对应的对象。最朴素的做法是把所有 token 平均相加，但平均会把无关信息也混进去；只看最近一个 token，又可能错过很远的指代。

Attention 做的事很直接：

1. 当前 token 提出一个问题：**我需要什么信息？**
2. 序列里的每个 token 提供一个索引：**我和这个问题匹不匹配？**
3. 匹配分数变成权重后，把真正的内容按比例取回来。

可以把它想成一个会做检索的读者：

- **Query（Q）**：手里的检索条件；
- **Key（K）**：每份资料的目录卡；
- **Value（V）**：目录卡后面真正的正文。

检索条件和目录卡匹配得越好，正文在最终答案里的占比就越高。这个比喻不是说模型真的维护了一个数据库，而是帮助我们理解公式的三个阶段：**匹配、归一化、汇总**。

### Self-Attention 和 Cross-Attention 的区别

Self-Attention 中，Q、K、V 都来自同一个序列。例如一段输入文本里的每个 token，既可以提出问题，也可以被别人查询。

Cross-Attention 中，Q 通常来自一个序列，K 和 V 来自另一个序列。例如机器翻译的 Decoder 用当前已生成的目标词作为 Q，去读取 Encoder 输出的 K、V。

因此，判断一个 Attention 属于哪类，最简单的问题是：**Q 和 K/V 是否来自同一个来源？**

## §2 一行公式：把每个符号拆开

标准缩放点积注意力写成：

```text
Attention(Q, K, V) = softmax(QKᵀ / √d_k) V
```

![Attention 从匹配到汇总的四步流程](/images/notes/llm-attention-context/attention-flow.svg)

![Attention 四步：输入、QK 匹配、权重与 V 汇总](/images/notes/llm-attention-context/attention-steps.png)

![Transformer 原论文的编码器—解码器结构图](/images/notes/evidence/attention-is-all-you-need/figure-1.png)
*论文图：Attention Is All You Need，Figure 1；[原文](https://arxiv.org/abs/1706.03762)。*

![Attention 原论文展示的指代消解注意力头](/images/notes/evidence/attention-is-all-you-need/figure-4-anaphora.svg)
*论文图：Attention Is All You Need，Figure 4（Attention Visualizations）；[原文](https://arxiv.org/abs/1706.03762)。*

假设一个 batch 中有 `B` 条样本、`T` 个 token、每个 head 的维度是 `D`：

```text
Q, K, V: [B, H, T, D]
QKᵀ:     [B, H, T, T]
softmax: [B, H, T, T]
输出:    [B, H, T, D]
```

这里最容易错的是 `QKᵀ` 的形状。对于第 `i` 个 token，`Q_i` 会和全部 `T` 个 `K_j` 做点积，所以每个位置都得到一行长度为 `T` 的分数。整句话就得到一个 `T×T` 的关系矩阵。

### 2.1 第一步：Q 和 K 做匹配

```text
scores = QKᵀ
```

如果 `Q_i` 和 `K_j` 的方向相近，点积就大，说明第 `i` 个位置更可能需要第 `j` 个位置的信息。点积不是概率，它只是一个未归一化的相关性分数。

### 2.2 第二步：为什么要除以 `√d_k`

当 `d_k` 变大时，独立分量的点积方差也会随维度增大。分数变得很大，softmax 可能只留下一个接近 1 的位置，其余位置接近 0，梯度也会变得很小。

除以 `√d_k` 相当于把分数缩回一个更稳定的尺度，让 softmax 保留可学习的梯度。它不是为了“让概率加起来等于 1”——概率归一化是 softmax 做的事；缩放解决的是数值尺度问题。

### 2.3 第三步：softmax 变成权重

```text
weights = softmax(scores, dim=-1)
```

softmax 沿着最后一个维度，也就是“被查询的所有位置”归一化。对同一个 query 来说，所有 key 的权重加起来等于 1。

注意这里的权重是连续的。模型不是简单地选择“最相关的一个 token”，而是可以让多个位置共同贡献：一个位置提供主语信息，另一个位置提供时间信息，第三个位置提供实体属性。

### 2.4 第四步：用权重汇总 V

```text
context = weights @ V
```

`QKᵀ` 决定“看谁”，`V` 决定“拿什么”。这也是为什么 Q、K、V 要分开：匹配空间和内容空间可以承担不同职责。

在 Self-Attention 中，Q、K、V 往往都由同一个输入 `X` 线性投影得到：

```text
Q = XW_Q
K = XW_K
V = XW_V
```

它们不是三份独立的原始文本，也不是三个不同模型，而是同一批 token 在三个学习到的子空间中的表示。

## §3 Mask、多头和位置：公式还不够完整

### 3.1 Causal Mask：不让模型偷看未来

训练 Decoder 时，位置 `i` 只能使用 `0...i` 的信息。比如预测第 4 个 token 时，第 5 个 token 还不存在，模型不能从答案反推问题。

把分数矩阵写出来，允许的位置在下三角：

```text
        k0  k1  k2  k3
q0       ✓   ×   ×   ×
q1       ✓   ✓   ×   ×
q2       ✓   ✓   ✓   ×
q3       ✓   ✓   ✓   ✓
```

实现时通常在 softmax 前做：

```python
scores = scores.masked_fill(future_mask, float("-inf"))
weights = torch.softmax(scores, dim=-1)
```

因为 `softmax(-∞)` 会趋近于 0。如果把 mask 放在 softmax 后再手动清零，剩余权重还需要重新归一化，否则每一行的和不再是 1。

### 3.2 Multi-Head：不是复制八遍，而是拆分表示空间

单个 head 只有一种关系视角。Multi-Head Attention 会把隐藏维度切成 `H` 个 head，每个 head 在较小的 `D` 维空间里独立计算：

```text
head_i = Attention(XW_Q^i, XW_K^i, XW_V^i)
MHA = Concat(head_1, ..., head_H) W_O
```

例如某个 head 更擅长捕捉主谓关系，另一个 head 关注远距离指代，另一个 head 关注标点或局部邻接。这不是硬编码的分工，而是训练过程中形成的不同子空间。

为什么不直接用一个更大的 head？因为多个 head 能让模型在不同投影空间中并行比较关系；在总维度固定时，计算量仍大致可控。

### 3.3 Attention 不认识顺序

如果把输入从“猫追老鼠”换成“老鼠追猫”，不加入任何位置信息，纯 Self-Attention 看到的只是同一组 token 的关系集合。它不会凭空知道谁在前、谁在后。

所以 Transformer 必须额外注入位置：

- 原始 Transformer 使用正弦/余弦位置编码；
- 现代大模型常用 RoPE，把位置信息作用到 Q、K 的旋转中；
- 长上下文模型还会配合位置插值、缩放或其他位置外推策略。

位置编码解决的是“顺序从哪里来”，不是“Attention 如何计算权重”。面试时把这两个问题分开，回答会清楚很多。

## §4 从 Attention 到 Transformer Block

Attention 只负责一次信息混合。一个常见的 Transformer Block 还包含：

```text
x
│
├─ LayerNorm
├─ Multi-Head Self-Attention
├─ 残差连接  ───────────────┐
│                           ▼
├─ LayerNorm                 x + Attention(x)
├─ FFN / MLP
├─ 残差连接  ───────────────┐
│                           ▼
└────────────────────────── block 输出
```

不同架构的 LayerNorm 放置方式可能不同：原论文更接近 Post-LN，现代模型常见 Pre-LN 或 RMSNorm。面试时不要把某一个实现说成唯一标准，更稳妥的说法是：**核心思想是注意力和 FFN 都通过残差堆叠，归一化位置由具体架构决定。**

### Attention 和 FFN 各自负责什么

一个有用但不绝对的理解是：

- Attention 负责 token 之间的信息交换，回答“我应该从上下文哪里取信息”；
- FFN 负责每个位置上的非线性变换，回答“拿到这些信息后，我如何重新组合和表达”。

Attention 让不同位置互相通信，FFN 则在每个位置独立处理。两者交替堆叠，模型才能同时具备关系建模和特征变换能力。

## §5 复杂度：为什么长文本会贵

设序列长度为 `T`，每个 head 的维度为 `D`。`QKᵀ` 会产生一个 `T×T` 矩阵，因此标准全连接 Attention 的主要成本近似为：

| 对象 | 规模 | 影响 |
| --- | --- | --- |
| Attention 分数矩阵 | `T×T` | 长度翻倍，关系数量约变 4 倍 |
| 计算复杂度 | `O(T²D)` | Prefill 阶段最明显 |
| 注意力权重显存 | `O(T²)` | 长上下文容易成为瓶颈 |
| Q/K/V 投影与输出 | `O(TD²)` | 隐藏维度很大时也不可忽略 |

这解释了两个工程现象：

1. **训练长序列很贵。** 一个 batch 中每条样本都要计算大量 token 两两关系。
2. **生成阶段和训练阶段的瓶颈不同。** 生成一个新 token 时，当前 query 只需要和历史 key 做匹配，KV Cache 可以避免重复计算历史 K/V；但缓存会随上下文长度线性增长。

因此，“长上下文支持”不只是把最大 token 数改大。还要一起考虑位置编码外推、显存、吞吐、延迟、缓存策略和注意力实现。

## §6 从零写一个可运行的 Causal Self-Attention

下面的实现只依赖 PyTorch，保留了最关键的计算路径：线性投影、拆 head、缩放点积、因果 mask、softmax、合并 head。它不是生产级内核，但适合在面试中说明每个张量的形状。

```python
import torch
from torch import nn


class CausalSelfAttention(nn.Module):
    def __init__(self, d_model: int, n_heads: int, max_seq_len: int):
        super().__init__()
        if d_model % n_heads != 0:
            raise ValueError("d_model 必须能被 n_heads 整除")

        self.d_model = d_model
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads

        self.qkv = nn.Linear(d_model, 3 * d_model)
        self.out = nn.Linear(d_model, d_model)

        # 上三角为 True，表示当前位置不能看到未来位置。
        mask = torch.triu(
            torch.ones(max_seq_len, max_seq_len, dtype=torch.bool),
            diagonal=1,
        )
        self.register_buffer("causal_mask", mask, persistent=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [batch, seq_len, d_model]
        batch, seq_len, _ = x.shape
        if seq_len > self.causal_mask.size(0):
            raise ValueError("序列长度超过 max_seq_len")

        qkv = self.qkv(x)  # [B, T, 3D]
        q, k, v = qkv.chunk(3, dim=-1)

        # [B, T, D] -> [B, H, T, Dh]
        def split_heads(t: torch.Tensor) -> torch.Tensor:
            return t.view(batch, seq_len, self.n_heads, self.head_dim).transpose(1, 2)

        q, k, v = map(split_heads, (q, k, v))

        # [B, H, T, Dh] @ [B, H, Dh, T] -> [B, H, T, T]
        scores = (q @ k.transpose(-2, -1)) / (self.head_dim ** 0.5)
        future = self.causal_mask[:seq_len, :seq_len]
        scores = scores.masked_fill(future, float("-inf"))

        weights = torch.softmax(scores, dim=-1)
        context = weights @ v  # [B, H, T, Dh]

        # [B, H, T, Dh] -> [B, T, D]
        context = context.transpose(1, 2).contiguous().view(batch, seq_len, self.d_model)
        return self.out(context)


if __name__ == "__main__":
    torch.manual_seed(7)
    attention = CausalSelfAttention(d_model=32, n_heads=4, max_seq_len=128)
    tokens = torch.randn(2, 16, 32)
    output = attention(tokens)

    assert output.shape == tokens.shape
    print(output.shape)  # torch.Size([2, 16, 32])
```

### 用两个断言检查 Causal Mask 是否生效

如果把第 0 个 token 的输入改掉，因果注意力下，第 0 个 token 的输出可以变化，但未来位置不应该影响第 0 个位置。可以用下面的方式做一个简单的方向性检查：

```python
attention.eval()
base = torch.randn(1, 4, 32)
changed_future = base.clone()
changed_future[:, 1:, :] += 100.0

with torch.no_grad():
    first_a = attention(base)[:, 0]
    first_b = attention(changed_future)[:, 0]

# 第 0 个位置只能看自己，所以未来 token 变化不应改变它。
torch.testing.assert_close(first_a, first_b, atol=1e-5, rtol=1e-5)
```

这个测试并不能证明实现已经覆盖所有边界情况，但能验证一个最核心的性质：**mask 不是装饰，它直接决定信息流向。**

## §7 面试官最爱追问的坑

| 追问 | 容易踩的坑 | 更稳的回答 |
| --- | --- | --- |
| Q、K、V 是什么 | 把它们说成三段不同文本 | Self-Attention 中通常由同一个 `X` 的三组线性投影得到 |
| 为什么除以 `√d_k` | 说成让权重和为 1 | softmax 负责归一化，缩放是为了稳定分数方差和梯度 |
| 为什么要 mask | 只说“防止泄露” | Decoder 的位置 `i` 只能依赖 `≤i` 的 token，mask 要在 softmax 前生效 |
| Attention 能不能识别顺序 | 说“它天然知道前后” | 纯 Attention 对排列不敏感，需要位置编码或 RoPE |
| 多头有什么用 | 说成简单复制多个模型 | 在不同低维投影子空间并行学习关系，再拼接回去 |
| Attention 是 Transformer 吗 | 把两者画等号 | Attention 是 Block 的核心子层，还需要残差、归一化和 FFN |
| 复杂度是多少 | 只背 `O(T²)` | 分数矩阵是 `T×T`，主要计算约 `O(T²D)`，显存也受二次项影响 |
| 为什么不用一个大 head | 只回答“参数更多” | 多头提供多个关系视角，固定总维度下能并行建模不同子空间 |
| KV Cache 解决什么 | 说能消除所有长文本成本 | 它避免生成阶段重复算历史 K/V，但缓存显存仍随上下文线性增长 |

## §8 分层面试题：按 L1、L2、L3 练习

### L1：必须能答

#### 1. 用一句话解释 Self-Attention

让每个位置根据自己的 Query，对所有位置的 Key 计算权重，再对 Value 做加权汇总，从而把上下文信息混合到当前位置。

#### 2. `QKᵀ` 得到的是什么

得到每个 query 与所有 key 的匹配分数。序列长度为 `T` 时，它的形状通常是 `[B, H, T, T]`。

#### 3. 为什么要 softmax

把任意实数分数转成非负、和为 1 的权重，便于对 Value 做加权平均，同时保留可微分的相对偏好。

#### 4. Self-Attention 的 Q、K、V 从哪里来

通常都来自同一个输入 `X`，分别经过 `W_Q`、`W_K`、`W_V` 三个线性层得到。Cross-Attention 则可能来自不同序列。

#### 5. Causal Mask 放在哪一步

放在 softmax 之前，对未来位置的 score 填充负无穷，使这些位置经过 softmax 后权重为 0。

#### 6. Attention 为什么需要位置编码

因为不带位置信息的 Self-Attention 主要处理元素之间的关系，对输入排列不敏感；位置编码或 RoPE 为模型提供顺序和相对距离信息。

### L2：区分理解深度

#### 7. `√d_k` 为什么不是 `d_k`

在独立同分布的近似下，点积的方差与维度大致成正比，标准差与 `√d_k` 成正比。除以 `√d_k` 可以把 logits 的尺度控制在更稳定的范围；除以 `d_k` 可能缩得过小，削弱区分度。

#### 8. 为什么 Q、K、V 不共用一个投影

如果共用，匹配标准和被取出的内容会被绑在一起，表达空间不够灵活。三组投影允许模型分别学习“如何提问、如何被匹配、提供什么内容”。

#### 9. 为什么 Attention 的显存压力不只是 `Q/K/V`

因为中间的注意力权重或 score 矩阵有 `T×T` 个元素，序列长度增长时二次项会迅速占用显存。训练时还要为反向传播保存部分中间结果。

#### 10. Multi-Head 的总计算量为什么没有简单变成 H 倍

通常总隐藏维度固定为 `D`，拆成 `H` 个 head 后每个 head 的维度变成 `D/H`。虽然多了多个矩阵，但每个矩阵更小，整体复杂度仍大致由 `D` 控制；实际成本还会受 kernel、布局和投影层影响。

#### 11. Pre-LN 和 Post-LN 有什么区别

区别是 LayerNorm 放在子层前还是残差相加后。Pre-LN 往往更容易训练深层网络，Post-LN 是原始 Transformer 常见的组织方式；具体效果还取决于初始化、深度和其他训练细节。

#### 12. Attention 和 FFN 的信息流有什么不同

Attention 在 token 之间交换信息，FFN 通常对每个 token 独立做非线性变换。前者扩大上下文感受范围，后者提升每个位置的表示能力。

### L3：面向系统和研究追问

#### 13. 为什么长上下文不仅是把 `max_position_embeddings` 调大

因为需要同时解决位置编码外推、`O(T²)` 的 prefill 成本、显存、KV Cache、吞吐和训练数据覆盖等问题。只改长度配置，模型不一定能可靠利用远距离信息。

#### 14. FlashAttention 改变了 Attention 的数学结果吗

目标不是改变 Attention 定义，而是通过分块、片上内存和更少的中间矩阵读写，降低内存访问和峰值显存。它通常保持与标准计算接近的结果，但具体数值会受精度和实现影响。

#### 15. Sparse Attention 牺牲了什么换来什么

它不再让每个 token 看所有 token，而是保留局部窗口、全局 token 或特定模式的连接，从而降低计算量；代价是可能丢失某些远距离依赖，需要用结构设计或多层堆叠补回来。

#### 16. Prefill 和 Decode 阶段的 Attention 有什么区别

Prefill 一次处理整段输入，主要受 `T²` 计算和并行矩阵乘法影响；Decode 每次新增一个 token，query 通常只有一个位置，重点转向读取历史 KV、显存带宽和批处理调度。

#### 17. 为什么 KV Cache 只缓存 K、V，不缓存 Q

生成新 token 时，每一步只需要当前 token 的 Q 去查询历史 K/V。历史 Q 不会在后续步骤再次参与新的匹配，因此缓存它们不能减少主要的重复计算。

#### 18. 为什么有些 head 看起来会“塌缩”

不同 head 学到的注意力模式可能高度相似，导致多头的多样性没有被充分利用。原因可能来自数据、初始化、正则化或架构设计，不能只看 attention heatmap 就断言模型学会了某种语义。

## 把这段分析讲给面试官

如果面试官只给你一分钟，可以这样说：

> Self-Attention 的输入是一个 token 序列 `X`，它通过三组线性投影得到 Q、K、V。对每个位置，用 Q 和所有 K 做点积得到相关性分数，除以 `√d_k` 后经过 softmax 得到权重，再对 V 加权求和，所以本质是“按当前需求从上下文取信息”。Decoder 里要在 softmax 前加 Causal Mask，避免看到未来 token；Multi-Head 则是在不同子空间并行学习关系。Attention 本身不包含顺序信息，需要位置编码或 RoPE。标准实现的分数矩阵是 `T×T`，因此长文本会遇到 `O(T²)` 的计算和显存压力。完整 Transformer Block 还包括残差、归一化和 FFN，KV Cache 与 FlashAttention 是后续的推理优化手段。

说完这段，面试官如果继续问，你就按“公式 → 张量形状 → mask → 复杂度 → 工程优化”的顺序展开，不容易在细节里迷路。

## 本篇总结

- Attention 的核心不是“模型有了注意力”，而是把**匹配分数**转换成对**内容向量**的加权汇总。
- Q、K、V 是三个职责不同的表示；`QKᵀ` 决定看谁，`V` 决定拿什么。
- `√d_k` 稳定 logits，softmax 负责归一化，Causal Mask 负责约束信息流。
- Multi-Head 提供多个关系子空间；位置编码让模型知道 token 的顺序。
- `O(T²)` 是标准全连接 Attention 面对长文本的根本成本，后续的 KV Cache、FlashAttention、稀疏注意力和量化分别从不同方向缓解它。
- Transformer 不是一个 Attention 函数，而是由 Attention、FFN、归一化和残差共同组成的可堆叠模块。

## 参考资料

1. Vaswani et al.，《Attention Is All You Need》，arXiv:1706.03762，2017。Transformer 原论文，本文所有公式出处。
