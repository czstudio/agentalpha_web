---
slug: llm-kv-cache
title: KV Cache 缓存的到底是什么？为什么长对话越聊越贵
excerpt: KV Cache 不是把整段对话“存起来就不算了”。它缓存每层历史 token 的 Key 和 Value，让解码阶段只算新 token；代价是上下文越长，显存和带宽压力越大。
series: "LLM 基础"
seriesNo: "04"
number: "17"
minutes: 18
---

用户说“模型怎么越聊越慢”时，工程师通常不会先去调 temperature。更常见的原因是历史上下文变长，KV Cache 把显存和带宽推到了瓶颈。

面试官通常会继续往细处问：

- 为什么缓存的是 K、V，不缓存 Q？
- Prefill 和 Decode 到底有什么不同？
- MHA、MQA、GQA 对缓存大小有什么影响？
- Paged Attention 解决的是算力问题还是内存碎片？
- prefix cache 命中后，哪些计算可以跳过？

KV Cache 不是一个打开就生效的开关。从一次生成请求的数据流开始，可以算清它省下了什么，又把成本挪到了哪里。

## §0 TL;DR：先把缓存说准确

1. **在自回归生成中，每一步的新 Query 需要读取历史 token 的 Key 和 Value。历史 K/V 不会变化，所以可以缓存起来复用。**
2. **Q 不缓存，是因为历史 Query 在后续生成中不会再次参与新的查询；每一步只需要当前 token 的 Q。**
3. **Prefill 一次处理用户已有的整段 prompt，Decode 每次只处理新生成的一个 token。** 前者更像大矩阵计算，后者更像小矩阵 + 大量 KV 读取。
4. **KV Cache 的显存随层数、序列长度、batch 和 KV head 数线性增长。** 这也是长对话越来越贵的根本原因。
5. **MQA/GQA 通过减少 K/V head 数降低缓存大小和带宽，通常以一定表达灵活性换取推理效率。**
6. **Paged Attention 把连续的 KV 内存改成按 block 管理，主要解决动态请求下的碎片和共享，不是把 Attention 的数学复杂度变成线性。**
7. **Prefix Cache 可以复用相同前缀的 K/V，但只有前缀完全一致、模型与位置状态兼容时才安全。**

一句话版：**KV Cache 用显存换重复计算，把历史 token 的 K/V 留下来，让每次 Decode 只新增当前 Q、K、V；当上下文、并发或输出长度增加时，缓存的容量和读取带宽就会成为主要账单。**

## 拆完先给结论

> Decoder-only 模型生成第 `t` 个 token 时，会用当前 token 的 Query 去查询从第 0 到第 `t-1` 个 token 的 Key 和 Value。历史 token 的 K/V 在后续步骤不会改变，因此可以缓存；历史 Q 不会再次使用，所以不缓存。Prefill 阶段一次计算 prompt 的全部 K/V，Decode 阶段每轮只计算新 token 的 Q/K/V，再把新 K/V 追加到缓存。KV Cache 的显存近似与层数、序列长度、batch、KV head 数和 head_dim 成正比，MQA/GQA 可以减少 KV head 数。生产系统还要处理分页分配、前缀复用、请求淘汰、长度上限和多租户隔离。

## §1 不用 Cache 时，每一步到底重复了什么

假设 prompt 是：

```text
今天 / 北京 / 下雨 / 所以 / 我 / 带了
```

模型要生成下一个 token。没有 KV Cache 时，生成每一个新 token 都把整段上下文重新过一遍 Transformer：

```text
step 1: [今天 北京 下雨 所以 我 带了] → 重新算所有 K/V → token_1
step 2: [今天 北京 下雨 所以 我 带了 token_1] → 重新算所有 K/V → token_2
step 3: [今天 北京 下雨 所以 我 带了 token_1 token_2] → 重新算所有 K/V → token_3
```

历史 token 的表示并没有改变，却被重复计算。KV Cache 的目标就是把这些稳定的中间结果留下来：

![Prefill 与 Decode 阶段的 KV Cache 数据流](/images/notes/llm-kv-cache/prefill-decode-cache.svg)

有 Cache 时：

```text
Prefill: prompt 一次性算出 K_cache, V_cache
Decode 1: 只算新 token 的 q1, k1, v1，读取历史 cache
Decode 2: 只算 q2, k2, v2，读取 cache + (k1, v1)
```

注意：它没有让“读取全部历史”消失。每个新 query 仍然要和历史 keys 做匹配，只是历史 keys/values 不用重新经过线性投影和前面层的计算。

## §2 形状：K、V 究竟缓存在哪里

以多头注意力为例，常见张量形状是：

```text
Q: [batch, query_len, n_q_heads, head_dim]
K: [batch, key_len,   n_kv_heads, head_dim]
V: [batch, key_len,   n_kv_heads, head_dim]
```

在标准 MHA 中，`n_q_heads = n_kv_heads`；在 GQA/MQA 中，K/V head 更少，多个 Q head 共享它们。

一个请求、一个层的 KV Cache 可以抽象成：

```text
K_cache[layer][request][position][kv_head][head_dim]
V_cache[layer][request][position][kv_head][head_dim]
```

多层模型就有多份 cache。缓存不是一张“聊天记录表”，而是每一层注意力子层需要的中间张量。

### 2.1 为什么不缓存 Q

在第 `t` 步，注意力大致是：

```text
q_t @ [k_0, k_1, ..., k_t]^T → 权重 → [v_0, v_1, ..., v_t]
```

下一步 `t+1` 会产生新 `q_{t+1}`，它要提出一个新的查询。旧的 `q_t` 不会再被拿来查询未来的 `k_{t+1}`，因为因果注意力不允许过去位置被未来信息改写。

所以：

- **缓存 K/V**：未来每个 query 都要读取历史 K/V；
- **不缓存 Q**：每个历史 Q 只服务它自己的那一步。

如果把 Q 也缓存下来，主要只是增加显存，并不能减少后续 decode 的关键计算。

### 2.2 新 token 的 K/V 如何加入缓存

每轮 Decode 得到当前 token 的 `k_t, v_t` 后，沿序列维追加：

```text
K_cache ← concat(K_cache, k_t)
V_cache ← concat(V_cache, v_t)
```

真实内核通常不会真的频繁搬运整块连续张量，而是把新 token 写入预先分配的 block 或 page，这正是 Paged Attention 的内存管理价值。

## §3 显存公式：为什么长对话越聊越贵

用字节数估算单个请求的 KV Cache：

```text
bytes ≈ 2 × L × T × H_kv × D_head × bytes_per_element
```

其中：

- `2`：一份 K、一份 V；
- `L`：Transformer 层数；
- `T`：当前上下文 token 数；
- `H_kv`：K/V head 数；
- `D_head`：每个 head 的维度；
- `bytes_per_element`：FP16/BF16 通常是 2 字节。

例如一个 32 层模型，GQA 有 8 个 KV head，head_dim 为 128，上下文 8192，BF16 存储：

```text
2 × 32 × 8192 × 8 × 128 × 2 bytes
≈ 1.07 GB / request
```

这还没算模型权重、临时激活、batch 中其他请求和 CUDA allocator 的开销。并发 16 个长请求时，KV Cache 就可能超过 17 GB。

![MHA、GQA、MQA 的 KV head 数与缓存开销](/images/notes/llm-kv-cache/head-sharing.svg)

### 3.1 MHA、GQA、MQA

| 结构 | Q head | K/V head | 缓存特点 | 代价 |
| --- | ---: | ---: | --- | --- |
| MHA | `H` | `H` | 信息最独立，缓存最大 | 显存、带宽压力高 |
| GQA | `H` | `G`，`1<G<H` | 多个 Q 共享一组 K/V | 需要训练/适配共享关系 |
| MQA | `H` | `1` | 缓存和读取最省 | 表达灵活性可能下降 |

GQA 是很多现代模型的折中：保留多个 Query head 的表达能力，同时明显减少 K/V 缓存。

### 3.2 Cache 量化和压缩

如果把 K/V 从 BF16 改成 FP8 或更低精度，可以减少容量和带宽，但要关注：

- 量化尺度是否按层、按 head 或按 block 管理；
- 解量化开销是否抵消了带宽收益；
- 长上下文下误差是否累积；
- attention score 的稳定性是否受到影响。

不要把“KV Cache 量化”与“模型权重量化”混为一谈：前者是运行时状态，后者是参数存储，两者的误差形态和更新方式不同。

## §4 Prefill、Decode 与两种完全不同的瓶颈

### 4.1 Prefill：一次处理已有上下文

Prefill 接收 prompt 的全部 token。它可以并行计算整段 Q/K/V 和 Attention，通常更偏计算密集，GPU 算力利用率比较高。

关注指标：

- TTFT（Time To First Token）；
- prompt token 数；
- prefill FLOPs；
- batch 合并效率；
- 长 prompt 的峰值显存。

### 4.2 Decode：一次新增一个 token

Decode 每轮通常只有一个新 query，但要读取越来越长的 K/V。它更容易受显存带宽、kernel launch 和调度影响，算力反而可能吃不满。

关注指标：

- TPOT（Time Per Output Token）；
- token/s；
- KV Cache 读取带宽；
- 活跃请求数和序列长度分布；
- P95/P99 尾延迟。

这就是为什么“换一张更强的 GPU”有时提升不明显：如果 decode 受限于内存带宽和请求调度，峰值 FLOPs 并不是第一瓶颈。

## §5 Paged Attention：把缓存从一条长数组变成页面

动态服务里，请求的长度不断变化：有的请求刚开始，有的已经生成几千 token，有的提前结束。如果为每个请求分配一块连续最大长度的 KV 内存，会出现两种浪费：

1. 预留太大，未使用的空间占着显存；
2. 预留太小，扩容时搬迁和碎片增加。

Paged Attention 的思路类似操作系统分页：把 KV Cache 切成固定大小的 block，逻辑序列通过 block table 映射到物理内存。

```text
逻辑序列 token 0...15  → block 3
逻辑序列 token 16...31 → block 9
逻辑序列 token 32...47 → block 2
```

它带来几个工程能力：

- block 可以按需分配和回收；
- 不同请求可以共享相同的前缀 block；
- 调度器可以根据空闲 block 管理并发；
- 避免每次增长都搬运完整连续数组。

但分页不会改变注意力的数学定义。当前 query 仍然要读取逻辑上可见的历史 K/V，只是这些 K/V 的物理位置不再要求连续。

## §6 Prefix Cache：相同前缀到底能复用多少

很多 Agent 请求共享系统提示词、工具描述或长文档前缀。只要以下条件都满足，就可以复用前缀对应的 K/V：

1. token 序列完全一致，而不是“文本看起来差不多”；
2. 模型、权重、tokenizer 和位置配置一致；
3. 注意力 mask、租户权限和 adapter 状态兼容；
4. 缓存的生命周期和隔离策略允许复用。

安全的实现通常以 token 前缀块的 hash 做索引：

```text
prefix_key = hash(model_id, tokenizer_id, adapter_id, token_ids[:n], position_config)
```

命中后可以跳过这段前缀的 prefill，但后续新 token 仍要追加。不要只用原始字符串 hash：空格、Unicode 归一化、特殊 token 和 tokenizer 版本都可能让“同一句话”变成不同 token 序列。

多租户系统还要考虑权限和数据泄露：缓存命中条件不能只判断内容相同，还要判断这段前缀是否允许被另一个请求复用。

## §7 从零写一个带 Cache 的单头解码注意力

下面的实现展示核心状态，不追求 fused kernel 性能。它把历史 K/V 作为模块状态传入，并返回新的 cache。

```python
import torch

def decode_attention(
    q_new: torch.Tensor,          # [B, H, 1, D]
    k_new: torch.Tensor,          # [B, H, 1, D]
    v_new: torch.Tensor,          # [B, H, 1, D]
    k_cache: torch.Tensor | None, # [B, H, T, D]
    v_cache: torch.Tensor | None, # [B, H, T, D]
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    if k_cache is None:
        keys = k_new
        values = v_new
    else:
        keys = torch.cat([k_cache, k_new], dim=2)
        values = torch.cat([v_cache, v_new], dim=2)

    scale = q_new.size(-1) ** -0.5
    scores = torch.matmul(q_new, keys.transpose(-2, -1)) * scale
    weights = torch.softmax(scores, dim=-1)
    output = torch.matmul(weights, values)
    return output, keys, values

torch.manual_seed(7)
B, H, D = 2, 4, 16
q = torch.randn(B, H, 1, D)
k = torch.randn(B, H, 1, D)
v = torch.randn(B, H, 1, D)
out, k_cache, v_cache = decode_attention(q, k, v, None, None)
assert out.shape == (B, H, 1, D)
```

真实系统还要加上：

- batch 中每条请求不同的有效长度；
- block table 或 paged layout；
- GQA/MQA 的 head 映射；
- 序列结束后的回收；
- prefix cache 的 hash 和失效；
- 多卡 KV 的分片或复制策略。

## §8 面试官追问：L1、L2、L3 分层练习

### L1：必须答对

#### 1. KV Cache 缓存了什么？

缓存每一层注意力中历史 token 的 Key 和 Value，供后续生成的 Query 重复读取。它不是简单保存原始文本。

#### 2. 为什么不缓存 Q？

每一步的新 token 会产生新的 Query，历史 Query 在未来不会再次参与对未来 token 的查询。缓存 Q 不能减少主要的重复计算，反而增加显存。

#### 3. Prefill 和 Decode 的区别是什么？

Prefill 一次处理完整 prompt，能并行算出前缀的 K/V；Decode 每次处理一个新 token，读取历史 cache 并追加新的 K/V。

#### 4. KV Cache 为什么让长对话变贵？

缓存大小与序列长度、层数、KV head 数和并发线性增长；Decode 还要反复读取越来越长的历史 K/V，带宽和调度压力随之增加。

### L2：区分理解深度

#### 5. MQA/GQA 为什么能省显存？

它们让多个 Q head 共享更少的 K/V head，使 `H_kv` 变小。根据 `2 × L × T × H_kv × D_head × bytes`，缓存容量和读取量都会下降。

#### 6. Paged Attention 解决了什么？

它把动态 KV Cache 切成可管理的 block，通过逻辑到物理的映射减少连续内存预留和碎片，并方便前缀共享。它不改变 Attention 的数学复杂度。

#### 7. Prefix Cache 命中后是不是整次请求都免费？

不是。它主要跳过相同前缀的 prefill；新 token 的 decode、后缀 prompt 和输出生成仍然要算，还要验证模型、tokenizer、位置和权限兼容。

### L3：面向系统的追问

#### 8. 为什么 batch 越大，KV Cache 越容易成为瓶颈？

每条请求都带有独立或部分共享的序列状态，batch 增大让缓存容量和读取总量上升；请求长度不齐还会造成 padding 或调度碎片。需要用连续批处理、分页、长度分桶和上限控制共同管理。

#### 9. KV Cache 量化要看哪些指标？

除了显存节省，还要看 TTFT、TPOT、带宽利用率、attention 数值误差、长上下文质量和不同长度分布下的尾延迟。单看模型权重大小不能说明 KV 量化是否有效。

#### 10. 如何设计缓存淘汰？

先区分正在生成的活跃请求、可复用的前缀 block 和已完成请求；再结合最近使用、前缀共享收益、租户隔离、最大上下文和请求优先级淘汰。不能简单按“最老的先删”，否则热门前缀会频繁抖动。

## KV Cache 还要配一张容量预算和准入策略

知道公式不等于能上线。服务同时接收长短不一的请求时，真正的问题是：在显存只剩一部分的情况下，哪些请求可以进入、哪些请求需要截断或排队、哪些前缀值得共享。容量预算应把权重、激活、KV、运行时余量和安全水位分开，不要把所有显存都承诺给 cache。

```yaml
kv_capacity_plan: kvp_62e534
gpu_memory_gb: 80
reserved:
  weights: 42
  activations: 8
  runtime_and_fragmentation: 6
kv_budget_gb: 20
admission:
  max_context_tokens: 32768
  max_active_sequences: 24
  reserve_per_sequence_gb: 0.75
  low_watermark_gb: 3
degrade:
  - "先拒绝超长新请求"
  - "再降低 prefix sharing 的保留时间"
  - "最后切换到排队，不回收活跃序列"
metrics: [kv_hit_rate, block_fragmentation, tpot_p95, rejected_context_rate]
```

`low_watermark` 是给突发 decode 留的安全余量；如果只看平均 cache 使用率，尾部请求会在最需要生成时触发 OOM。准入策略还要区分活跃序列和可重用前缀：不能为了命中率回收正在生成的请求，也不能让一个租户的热门前缀挤占所有租户的预算。上线后同时观察命中率、碎片、TPOT 和拒绝率，才能知道省下的显存有没有转成用户可感知的吞吐。

![KV Cache 容量预算：权重、运行时余量、缓存水位和降级动作共同控制准入](/images/notes/llm-kv-cache/capacity-admission-card.svg)

### L5：显存不够时为什么不能直接把所有 cache 清掉？

清掉活跃序列会破坏正在生成的请求，清掉共享前缀又会造成瞬时 prefill 峰值。应按“拒绝新长请求—缩短可复用前缀生命周期—排队”逐级降级，并保留活跃请求的最低状态。

## Prefix Cache 命中后还要过“版本、租户、位置”三道闸门

前缀相同不等于可以共享。只要模型权重、tokenizer、位置编码、system prompt 或租户权限不同，复用旧 KV 都可能把上一条会话的上下文带进来。缓存条目要记录可验证的兼容指纹，命中时由服务端重算并比对；权限不兼容时宁可重新 prefill，也不能为了 TTFT 把隔离边界打穿。

```yaml
prefix_cache_receipt: pcr_72a959
key: sha256:...
compatibility:
  model_revision: same
  tokenizer_revision: same
  position_encoding: rope_v3
  system_prompt_hash: sha256:...
  tenant_scope: tenant_a
  acl_epoch: 418
hit:
  reusable_tokens: 4096
  prefill_skipped: true
  suffix_tokens: 384
gates:
  cross_tenant: reject
  acl_epoch_mismatch: miss_and_recompute
  active_sequence: never_evict
decision: safe_reuse
```

![Prefix Cache 命中凭证：模型、tokenizer、位置、租户和 ACL 版本全部匹配才复用](/images/notes/llm-kv-cache/prefix-cache-receipt-card.svg)

### L5：为什么“命中率提高、TTFT 下降”仍可能是坏消息？

如果命中键没有包含租户、system prompt 或模型版本，命中率越高，串上下文的风险越大。缓存优化必须和隔离、事实版本、拒答边界一起验收，不能只看速度指标。

## KV Cache 回收要区分“活跃、可复用和待对账”三种状态

显存紧张时最危险的做法是按 LRU 一把梭：正在 decode 的序列被清掉会直接破坏请求，可复用前缀被清掉会造成下一波 prefill 峰值，而已经返回未知结果的请求还可能需要保留最小状态用于对账。缓存条目应显式标记 `active`、`reusable`、`reconcile_hold`，回收器先从可重建的 reusable block 开始，再降低新请求准入，最后排队；任何活跃序列都不能为了提高命中率被强制驱逐。

分层缓存也要绑定同一兼容指纹。GPU、CPU 和磁盘上的 KV 不能只靠 key 相同就互相搬运，迁移时要检查模型 revision、位置编码、adapter、tenant scope 和压缩格式。搬运失败或指纹不一致时，宁可重新 prefill；这点比一张漂亮的 hit-rate 曲线更重要。

```yaml
kv_eviction_policy: kep_5ad686
states:
  active: {evict: false, min_blocks: 8}
  reusable: {evict: lru_with_tenant_quota}
  reconcile_hold: {evict: false, ttl: 900}
tiers:
  gpu: {format: fp16, compat: strict}
  cpu: {format: int8, compat: revalidate_before_restore}
  disk: {format: compressed, compat: restore_only}
degrade:
  - reject_new_long_context
  - shorten_prefix_ttl
  - queue_until_recovery
assertions:
  active_sequence_evicted: 0
  cross_tenant_restore: 0
decision: preserve_live_state_first
```

![KV Cache 回收策略：活跃序列不驱逐，可复用块按租户配额回收，未知分支保留对账状态](/images/notes/llm-kv-cache/kv-eviction-state-card.svg)

把 KV 迁到 CPU 或磁盘同样不能只看显存下降：offload 会引入 PCIe 带宽和恢复延迟，还可能把不兼容的旧状态带回推理。显存省下来但 P99 和隔离边界变差，不算优化。

## KV 显存公式要拆到 token、层和 KV head

面试中只说“KV Cache 随上下文线性增长”还不够。以半精度为例，单卡上 KV Cache 的粗略显存可以写成：

\[
M_{KV} \approx 2 \times L \times B \times T \times H_{KV} \times d_h \times b
\]

`2` 代表 K 和 V，`L` 是层数，`B` 是活跃序列数，`T` 是每条序列的 token 数，`H_KV` 是 KV head 数，`d_h` 是 head_dim，`b` 是每个元素的字节数。MHA、GQA、MQA 的容量差异主要就落在 `H_KV`；但公式仍只是容量上限，分页碎片、padding、临时 workspace 和跨层对齐会继续抬高真实水位。容量回归应固定一组 `(B,T)` 网格，而不是只测一条长对话。

```yaml
kv_memory_formula_audit: kfa_d4cd25
model: decoder-v4
config: {layers: 32, batch: 8, context: 8192, kv_heads: 8, head_dim: 128, bytes: 2}
estimate_gb: 1.00
observed_gb: 1.07
overhead_pct: 7.0
checks:
  padding_accounted: true
  workspace_reserved: true
  fragmentation_under_pct: 8
decision: capacity_model_calibrated
```

![KV 显存公式审计：层数、并发、上下文和 KV head 共同决定容量](/images/notes/llm-kv-cache/kv-memory-formula-card.svg)

### L5：为什么公式估算 1GB，线上却占到 1.07GB？

公式只算有效 K/V 元素，线上还会有 block 对齐、padding、临时 workspace 和碎片。只要误差在固定阈值内并能由这些项解释，就应把它们纳入容量模型；如果误差随序列长度突然放大，通常要查分页或 batch 调度，而不是简单提高预算。

## 最后，把它讲清楚

> KV Cache 缓存的是每一层历史 token 的 Key 和 Value。生成新 token 时，当前 Query 需要和所有历史 Key 做匹配，并读取对应 Value；历史 K/V 不会改变，所以可以复用。历史 Q 不会在后续步骤再次查询未来，因此不缓存。Prefill 一次计算 prompt 的缓存，Decode 每轮只追加新 token 的 K/V，但仍需读取不断变长的 cache。缓存显存大致与层数、上下文长度、batch、KV head 数和 head_dim 成正比，所以长对话和高并发会很贵。GQA/MQA 减少 KV head，Paged Attention 管理动态 block，Prefix Cache 复用相同前缀；这些优化解决的是不同层面的容量、带宽和内存管理问题。

## 本篇总结

- KV Cache 复用的是历史 K/V，不是原始聊天记录，也不是所有中间状态。
- Prefill 偏计算，Decode 偏缓存读取和调度；两个阶段要分开优化。
- Q 不需要缓存，K/V head 数直接决定缓存容量。
- MHA、GQA、MQA 是表达能力与推理成本的结构性取舍。
- Paged Attention 管理物理内存，Prefix Cache 复用逻辑前缀，二者不是同一件事。
- 长上下文服务要同时设计显存公式、block 回收、缓存失效、权限隔离和尾延迟指标。

“推理慢”还能继续拆成一张工程账单：量化、连续批处理、前缀缓存、投机解码和并行策略，分别改善哪一个指标，可以到系列里推理优化一篇接着看。

## 参考资料

1. [Efficiently Scaling Transformer Inference](https://arxiv.org/abs/2211.05102)，关于推理阶段计算与内存的分析。
2. [vLLM](https://github.com/vllm-project/vllm)，Paged Attention 与高吞吐推理服务的开源实现。
