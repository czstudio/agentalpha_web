---
slug: llm-inference-optimization
title: 大模型推理优化：吞吐、延迟和显存要一起看
excerpt: 推理优化没有万能开关。先把 TTFT、TPOT、吞吐、显存分开看，再挑量化、连续批处理、Prefix Cache、投机解码或并行策略，才知道自己到底改善了哪一项。
series: "LLM 基础"
seriesNo: "04"
number: "18"
minutes: 20
---

“把模型从 FP16 换成 INT4，速度就会快四倍吗？”这个问题看似简单，往下追马上会碰到首 token、批大小和尾延迟。

如果你在面试里直接回答“会”，大概率会被继续问：为什么首 token 延迟没降？为什么 batch 一大反而变慢？为什么显存省了，P99 却变差？

推理优化最容易犯的错误，是把所有问题都归到“模型太大”。实际服务里，慢可能是 prompt 太长、KV Cache 读取慢、GPU 利用率低、请求长度不齐、跨卡通信、CPU 调度或尾延迟控制出了问题。先画出指标地图，才不会换完量化，只把瓶颈挪到别处。

## §0 TL;DR：先把优化目标分开

1. **TTFT** 衡量从请求到第一个 token 的时间，通常受排队和 Prefill 影响；**TPOT** 衡量后续 token 间隔，通常受 Decode、KV 读取和调度影响。
2. **吞吐** 可能按 requests/s、tokens/s 或 output tokens/s 计算；增加 batch 往往提升吞吐，却可能恶化单请求尾延迟。
3. **量化** 主要减少权重或缓存的显存与带宽，但收益取决于硬件是否有对应低精度 kernel，不能按位宽简单推算速度。
4. **Continuous Batching** 让新请求在已有 batch 的空隙加入，改善 GPU 利用率；它解决的是调度，不是模型数学。
5. **Prefix Cache** 减少相同前缀的 Prefill，**Speculative Decoding** 尝试用小模型一次提出多个 token，再由大模型验证；两者改善的阶段不同。
6. **Tensor Parallel / Pipeline Parallel** 能把模型拆到多卡，但通信和同步会变成新的成本，必须看拓扑和 batch。
7. 优化闭环是：**先测量 → 找瓶颈 → 只改一个变量 → 对比质量与尾延迟 → 记录回滚条件**。

一句话版：**推理优化的目标不是让一个数字变小，而是在质量、TTFT、TPOT、吞吐、显存和 P99 之间找到可解释的平衡。**

## 我们推出来的版本

> 我会先把服务拆成排队、Prefill 和 Decode 三段，分别记录 TTFT、TPOT、端到端延迟、吞吐、显存水位和 P95/P99。权重量化主要减少模型占用与内存带宽，但要看硬件 kernel 和精度损失；KV Cache 优化关注上下文长度、GQA/MQA、分页和前缀复用；连续批处理提升动态并发下的 GPU 利用率；投机解码在小模型预测质量足够高时减少大模型的解码轮数；张量并行可以扩展模型规模，但要支付跨卡通信。每次优化都要用固定数据集和真实长度分布同时看质量、延迟和吞吐，不能只看单请求平均耗时。

## §1 先建立指标地图：你说的“快”到底是什么

![推理服务从排队到输出的延迟与吞吐关系](/images/notes/llm-inference-optimization/latency-throughput.svg)

![Transformer 推理论文对 Decode 成本的拆分](/images/notes/evidence/efficient-transformer-inference/figure-1-decode-cost.svg)
*论文图：Efficiently Scaling Transformer Inference，Figure 1（Decode panel）；[原文](https://arxiv.org/abs/2211.05102)。*

![Transformer 推理论文对 Prefill 成本的拆分](/images/notes/evidence/efficient-transformer-inference/figure-1-prefill-cost.svg)
*论文图：Efficiently Scaling Transformer Inference，Figure 1（Prefill panel）；[原文](https://arxiv.org/abs/2211.05102)。*

![推理服务的请求、排队、Prefill、Decode 三段路径](/images/notes/llm-inference-optimization/inference-three-stage.png)

### 1.1 TTFT：用户什么时候看到第一句话

```text
请求到达 ──排队── Prefill ──首 token ──┐
                                      └─ TTFT
```

TTFT 包含排队时间、请求预处理、prompt tokenization、Prefill 计算和首 token 的采样。长系统提示词、RAG 文档、工具描述会直接拉长 Prefill。

### 1.2 TPOT：后续 token 的连续性

```text
token_1 ── Δt ── token_2 ── Δt ── token_3
             ↑
            TPOT
```

TPOT 受到 KV Cache 读取、Decode kernel、采样和调度影响。一个服务 TTFT 很低、TPOT 很高，用户仍然会觉得“打字很慢”。

### 1.3 吞吐：一次服务多少 token

常见口径至少有四种：

| 指标 | 适合回答什么 |
| --- | --- |
| requests/s | 服务每秒完成多少请求 |
| input tokens/s | Prefill 处理速度 |
| output tokens/s | Decode 生成速度 |
| total tokens/s | 输入输出混合后的总体容量 |

比较两个版本时，必须写清口径和数据分布。一个版本可能 output tokens/s 提高了，但输出更短，requests/s 反而没有改善。

### 1.4 P95/P99：平均延迟会掩盖长尾请求

平均延迟只告诉你“整体大概怎样”，不告诉你高峰期最慢的请求。Agent 系统常包含长工具描述、长上下文和不规则输出，尾延迟尤其容易被少数请求拉高。

发布前至少记录：

```text
TTFT: p50 / p95 / p99
TPOT: p50 / p95 / p99
output tokens/s
GPU memory high-water mark
queue time
dropped / timeout / OOM rate
```

## §2 量化：省的是哪一部分成本

量化把参数或运行时状态从高精度表示映射到更低位宽。常见选择：

| 格式 | 常见用途 | 优势 | 风险 |
| --- | --- | --- | --- |
| FP16 / BF16 | 训练与推理基线 | 精度和 kernel 生态成熟 | 显存占用较高 |
| INT8 | 权重或激活量化 | 兼顾精度和内存 | 需要校准与硬件支持 |
| INT4 | 权重量化 | 显存收益明显 | 误差、kernel 和长上下文更敏感 |
| FP8 | 新硬件推理/训练 | 动态范围通常好于低位整数 | 依赖硬件与量化方案 |
| AWQ / GPTQ | 常见权重后训练量化 | 不必完整再训练 | 不同模型、kernel 兼容性不同 |

### 2.1 权重量化、激活量化、KV 量化

不要只说“模型被量化了”。至少分三类：

1. **权重量化**：模型参数以更低位宽存储，减少显存和权重读取；
2. **激活量化**：中间激活也降低精度，可能进一步减少带宽，但误差和动态范围更难控制；
3. **KV Cache 量化**：运行时历史 K/V 以低精度存储，主要缓解长上下文和高并发的状态内存。

三者可以组合，也可以分别做。一个模型权重是 INT4，不代表 KV Cache 也自动是 INT4。

![按瓶颈选择推理优化手段](/images/notes/llm-inference-optimization/optimization-map.svg)

### 2.2 为什么位宽降低不等于速度同比提升

如果 FP16 是 2 字节、INT4 是 0.5 字节，理论读取量可以降到四分之一，但真实速度还取决于：

- GPU 是否有高效的 INT4/FP8 Tensor Core 路径；
- 量化权重是否需要频繁解量化；
- kernel 是否融合了反量化、矩阵乘和累加；
- 当前请求是计算受限还是带宽受限；
- batch、序列长度和内存布局是否匹配。

因此量化评测至少要同时测：显存、TTFT、TPOT、吞吐、质量和 P99。只看权重文件大小不能证明服务更快。

### 2.3 质量评测要覆盖长尾

量化后的模型不一定在平均基准上立刻掉分，但可能在这些场景变差：

- 长上下文检索；
- 数学和代码中的精确计算；
- 结构化 JSON 输出；
- 多轮对话中的指代；
- 低频语言或专有名词；
- 工具调用参数。

用固定回归集 + 真实线上样本做对比，并保留可回滚的精度版本。优化不是把分数换成一张漂亮的显存截图。

## §3 Continuous Batching：让请求不要排队到天荒地老

静态 batch 通常等 batch 中最慢的请求结束，才能整体进入下一轮；一个长输出请求就可能拖住一批短请求。

Continuous Batching 的做法是：每个 decode step 结束后，完成的请求退出，新请求在可用 slot 进入。

```text
step 1: A B C
step 2: A B C
step 3: A   C  ← B 完成
step 4: A D C  ← D 加入
step 5: A D   ← C 完成
```

它的收益来自两点：

- GPU 不必等所有请求同时结束；
- 活跃请求数量动态变化，更贴近真实流量。

但调度器需要做更多决定：

- 新请求是否会挤压正在生成的请求；
- 长 prompt 的 Prefill 是否会阻塞 Decode；
- 每一步允许多少新 token 进入；
- 如何公平处理高优先级和低优先级请求；
- KV block 不足时先拒绝、排队还是截断。

### 3.1 Chunked Prefill：别让一个长 prompt 把 decode 撞停

如果一次把很长的 prompt 全部 Prefill，GPU 可能长时间不产出任何 decode token。Chunked Prefill 把 prompt 切成若干块，在 decode 之间插入，平衡 TTFT 和正在生成请求的 TPOT。

这是一个典型取舍：

| 策略 | TTFT | TPOT | 适合 |
| --- | --- | --- | --- |
| 先完整 Prefill | 新请求首 token 更快 | 旧请求可能被阻塞 | 请求少、prompt 短 |
| 全部优先 Decode | 旧请求更平滑 | 新请求 TTFT 变长 | 生成流量大 |
| Chunked Prefill | 两者折中 | 调度复杂 | 混合长短请求 |

## §4 Prefix Cache：重复的系统提示词不要每次重算

Agent 请求常常共享：

- system prompt；
- 工具 schema；
- 组织规则；
- 一份固定的产品文档；
- 会话历史中的稳定前缀。

如果 token 前缀完全一致，可以缓存这段 Prefill 生成的 K/V，后续请求从命中位置继续。它最直接改善 TTFT 和 input tokens/s，不能直接让所有 decode token 变快。

### 4.1 命中键要包含哪些信息

```text
cache_key = hash(
  model_id,
  tokenizer_id,
  adapter_id,
  position_config,
  attention_mask_mode,
  prefix_token_ids,
)
```

只按原始字符串做 key 不够，tokenizer 版本、特殊 token、LoRA adapter 和位置配置变化都可能让 K/V 不兼容。

### 4.2 Prefix Cache 的实际限制

- 前缀只要中间插入一个 token，后面的 block 可能全部失效；
- 动态工具列表和用户身份信息会降低命中率；
- 多租户共享时必须有权限和生命周期隔离；
- 缓存占用的是宝贵的 KV block，要有淘汰与观测；
- 命中率高但前缀很短，收益也可能不明显。

监控 Prefix Cache 时，至少看命中率、命中 token 数、节省的 prefill 时间和占用的 block 数。

## §5 Speculative Decoding：让小模型帮大模型多走几步

投机解码使用一个较小的 draft model 先提出一段候选 token，再由目标大模型并行验证：

```text
draft model: 先猜 [t1, t2, t3, t4]
target model: 一次验证这四个 token
接受前缀:    [t1, t2, t3]
遇到分歧:    在第 4 个位置重新采样
```

如果 draft model 经常猜对，就能减少目标模型逐 token 解码的轮数；如果猜得不准，验证开销和额外调度可能抵消收益。

它适合：

- 目标模型 decode 受串行轮数限制；
- draft model 很小、延迟低；
- 文本分布稳定，draft 接受率高；
- 服务可以容纳额外模型和显存。

它不适合简单粗暴地追求“每次猜得越长越好”。候选长度越长，验证计算、拒绝重算和 KV 管理都可能增加。

评测时要记录：

```text
draft latency
acceptance rate
accepted tokens / target call
target verification cost
net output tokens/s
quality difference
```

## §6 并行策略：模型拆开以后，通信谁来承担

### 6.1 Tensor Parallel

把一个 Linear 或 Attention 的矩阵切到多张 GPU，每张卡只做一部分计算，再 all-reduce 或 all-gather。

优点：单个请求就能运行更大的模型；缺点：每层都可能有通信，GPU 拓扑和网络带宽决定实际收益。

### 6.2 Pipeline Parallel

把不同 Transformer 层放到不同设备，输入像流水线一样经过各段。它适合模型层数很多的情况，但 micro-batch、气泡和跨阶段等待会影响延迟。

### 6.3 Data Parallel 与 Replica

复制完整模型，让不同副本接不同请求，最容易扩展吞吐，但需要更多显存。配合路由和负载均衡时，要考虑长请求是否集中在同一副本。

### 6.4 专家并行

MoE 的专家放在不同 GPU，token 需要 all-to-all。它有机会降低激活计算，却可能把网络通信变成新的瓶颈。

选并行策略不要只看“能不能放下模型”，还要看：

| 问题 | 对应指标 |
| --- | --- |
| 单请求能否容纳 | 权重显存、KV 显存、临时激活 |
| 首 token 是否够快 | TTFT、Prefill 吞吐、通信同步 |
| 并发能否扩展 | requests/s、output tokens/s、排队时间 |
| 高峰是否稳定 | P95/P99、OOM、重试率 |
| 成本是否可控 | GPU 利用率、每百万 token 成本 |

## §7 一个可执行的推理优化排查顺序

下面是一条比“先上 INT4”更稳的路径：

### Step 1：固定质量基线

准备一组覆盖短/长 prompt、代码、结构化输出、工具调用和多轮对话的回归集，记录答案质量和格式错误率。

### Step 2：分离三段耗时

把排队、Prefill、Decode 分开打点，至少取得 TTFT、TPOT、端到端延迟和 P95/P99。

### Step 3：确认是否被显存卡住

记录权重、KV Cache、激活、通信 buffer 和 allocator 高水位。若频繁 OOM，先解决容量和请求上限，再谈微优化。

### Step 4：根据瓶颈选手段

| 现象 | 优先实验 |
| --- | --- |
| 权重放不下 | 权重量化、张量并行、模型裁剪 |
| TTFT 高、prompt 长 | Prefix Cache、Chunked Prefill、Prefill kernel |
| TPOT 高、上下文长 | GQA/MQA、KV 量化、Paged Attention、带宽优化 |
| GPU 空闲、请求不齐 | Continuous Batching、长度分桶、调度器 |
| Decode 串行轮数高 | Speculative Decoding、采样融合 |
| 多卡同步慢 | 拓扑调整、TP/PP 切分、通信融合 |

### Step 5：一次只改一个主变量

同时改量化、batch、max tokens 和调度策略，最后即使变快也无法知道原因。为每个实验保存配置、模型版本、数据分布、质量结果和回滚条件。

## §8 面试官追问：L1、L2、L3 分层练习

### L1：必须答对

#### 1. TTFT 和 TPOT 分别是什么？

TTFT 是请求到第一个 token 的时间，通常受排队和 Prefill 影响；TPOT 是生成相邻 token 的时间，通常受 Decode、KV Cache 读取和调度影响。

#### 2. 量化为什么能降低显存？

它用更低位宽存储权重、激活或 KV Cache，减少每个元素的字节数，从而降低容量和内存带宽需求。

#### 3. Continuous Batching 解决什么？

它允许请求在每个生成 step 动态加入或退出，避免静态 batch 被最长请求拖住，提高动态流量下的 GPU 利用率和吞吐。

#### 4. Prefix Cache 主要改善哪个阶段？

主要减少重复前缀的 Prefill，因此通常改善 TTFT 和输入处理吞吐；它不会自动消除后续 Decode。

### L2：区分理解深度

#### 5. 为什么 INT4 不一定让速度变成四倍？

实际收益受硬件低精度 kernel、反量化、内存布局、batch、序列长度和当前瓶颈影响。如果服务受调度或 KV 带宽限制，权重变小也不一定显著提升 TPOT。

#### 6. Paged Attention 和 Prefix Cache 的区别？

Paged Attention 管理 KV Cache 的物理 block 和动态分配；Prefix Cache 复用相同 token 前缀产生的逻辑 K/V。前者解决内存管理，后者减少重复 Prefill，可以组合使用。

#### 7. Speculative Decoding 一定保持完全相同的结果吗？

在严格实现并保持同样采样规则的条件下，可以设计为与目标模型分布一致或近似一致；工程实现中的温度、随机数、接受规则和数值精度都要验证，不能只凭“验证过了”下结论。

### L3：面向系统的追问

#### 8. 为什么吞吐提升了，P99 可能变差？

更大的 batch 和更激进的合并让 GPU 更满，却可能增加排队、KV 竞争和长请求对短请求的影响。吞吐与尾延迟是调度目标的取舍，需要按业务 SLA 设上限。

#### 9. 长 prompt 和长 output 的优化重点为什么不同？

长 prompt 主要压 Prefill 和 TTFT；长 output 主要压 Decode、KV Cache、TPOT 和并发容量。混在一个平均值里会掩盖瓶颈，应该按输入/输出长度分桶观察。

#### 10. 如何判断一次优化是否值得上线？

在固定质量回归集和真实长度分布下，比较 TTFT、TPOT、吞吐、P95/P99、显存高水位、OOM/超时率和单位 token 成本；明确适用流量、回滚阈值和异常监控，不能只凭单机 benchmark。

## §9 每次优化都要带一张“质量—延迟—成本”对账卡

推理优化最容易踩的坑，是只报一个更漂亮的延迟数字。真正可上线的改动要把质量、尾延迟、吞吐、显存和单次成功成本放在同一张卡里，并注明流量切片。比如量化让 P99 降了 20%，但长上下文的引用准确率下降 4 个百分点，就不能直接宣布成功。

```yaml
optimization_ticket:
  change: "int8_weight_only"
  slice: "long_context_rag"
  before: {ttft_ms: 820, p99_ms: 4100, success_rate: 0.86, cost_cents: 2.9}
  after: {ttft_ms: 690, p99_ms: 3320, success_rate: 0.84, cost_cents: 2.1}
  decision: hold
  reason: "成本和尾延迟改善，但引用准确率跌破门槛"
  next: "只对短上下文流量灰度，补长文校准集"
```

![推理优化对账卡](/images/notes/llm-inference-optimization/optimization-tradeoff-card.svg)

这张卡还能防止局部优化互相打架：prefix cache 可能降低 TTFT，却增加内存占用；speculative decoding 可能提高吞吐，却在低接受率任务上浪费小模型计算。把指标放在同一张卡上，讨论才会从“哪个技术更酷”回到“哪个切片真的值得上线”。

### L5：为什么一定要按切片看指标？

因为平均值会把长上下文、复杂工具链和低端设备的退化冲掉。至少要按 prompt 长度、任务类型、模型路由和缓存命中率切片，并同时保留一组固定质量基线。若某个切片只有延迟收益、没有业务收益，就应限制流量，而不是全量推广。

## 推理 benchmark 要固定“流量形状”，不只是固定 prompt

单条 prompt 的热身测试很适合看 kernel，却无法代表线上队列：真实请求有长短混合、突发到达、取消、流式输出和不同缓存命中率。优化前后要用同一份 traffic replay，固定到达分布、输入/输出长度桶、并发上限、warmup、随机种子和硬件/驱动版本；否则一次更好的结果可能只是队列更空。

回放报告把 Prefill 和 Decode 分开，并列出排队时间、TTFT、TPOT、P95/P99、显存水位、OOM/超时、拒答和单位成功成本。若优化只在单请求有效、在突发流量下 P99 变差，就应限制到适合的路由，而不是用平均吞吐覆盖长尾。

```yaml
inference_benchmark: ib_19c95d
traffic:
  concurrency: [1, 8, 32, 64]
  arrival: poisson_with_burst
  length_buckets: [[0,512],[513,2048],[2049,8192]]
  cache_hit_rate: [0.0, 0.5, 0.9]
controls:
  warmup_requests: 200
  random_seed: 8842
  hardware: a10g-24gb
  driver: cuda-12.4
report: [queue_ms, ttft_ms, tpot_ms, p95_ms, p99_ms, oom_rate, cost_per_success]
gates:
  quality_regression: 0
  p99_budget_breach: false
decision: compare_under_same_shape
```

![推理 benchmark 回放卡：固定流量形状、长度桶、缓存命中和硬件，避免把空队列当优化](/images/notes/llm-inference-optimization/traffic-shape-benchmark-card.svg)

### L5：为什么单机吞吐提升不能直接推导出线上 P99 改善？

单机吞吐通常忽略排队、长短请求混合、缓存冷启动和取消。线上 P99 受最慢请求和调度策略影响，必须在相同流量形状下回放，并把排队、TTFT、TPOT 和质量一起看。

## 多卡并行还要记一笔“通信占比”

模型拆到多张卡后，算力不再是唯一账单。张量并行会在每层或每个阶段产生 all-reduce、all-gather 等同步；卡间链路、micro-batch 和序列长度变化，都会改变通信等待。一个看起来更大的 batch 可能把 GPU 算得更满，却把通信占比和尾延迟一起推高。

我会把一次请求的时间粗略拆成：

\[
T_{total}=T_{queue}+T_{compute}+T_{communication}+T_{sampling}
\]

并在 benchmark 中记录每个并行阶段的通信时间、同步次数、链路利用率和等待的空洞。若 `communication / total` 已经超过预算，优先考虑减少同步、调整并行维度或改变 batch，而不是继续堆卡。

```yaml
parallel_comm_budget: pcb_b24d11
topology: 4xa100_nvlink
phase: decode
before:
  compute_ms: 18.4
  communication_ms: 6.1
  communication_share: 0.249
after:
  compute_ms: 15.2
  communication_ms: 8.7
  communication_share: 0.364
gate:
  max_communication_share: 0.30
decision: reject_more_parallelism
next: compare_tp2_vs_tp4_under_same_traffic
```

![多卡推理通信预算卡：把计算、通信、排队和采样放在同一条延迟账本里](/images/notes/llm-inference-optimization/parallel-communication-budget-card.svg)

### L5：为什么“加卡”可能让单请求更慢？

如果模型已经能放进单卡或通信链路较慢，跨卡同步会超过节省的计算时间；短输出和小 batch 尤其明显。要在相同长度分布下比较通信占比、P99 和单位成功成本，而不是只看多卡吞吐。

## 和面试官把话题聊开

> 我会先把推理拆成排队、Prefill 和 Decode，分别看 TTFT、TPOT、吞吐、显存和 P95/P99。权重量化减少参数显存和带宽，但速度收益取决于硬件 kernel、反量化和真实瓶颈；KV Cache、GQA/MQA、Paged Attention 主要解决长上下文状态成本；Prefix Cache 减少重复前缀的 Prefill；Continuous Batching 提升动态请求下的 GPU 利用率；Speculative Decoding 用小模型猜、大模型验证，目标是减少大模型解码轮数；多卡并行则用通信换模型容量。每次优化都要同时验证质量、延迟、吞吐、OOM 和成本，确保知道改善的是哪个阶段，并保留回滚条件。

## 本篇总结

- “快”至少要拆成 TTFT、TPOT、吞吐和尾延迟。
- 量化、KV 优化、批处理、前缀复用、投机解码和并行策略解决的是不同瓶颈。
- 显存高水位和 P99 是生产环境里不能省略的指标。
- Continuous Batching 与 Chunked Prefill 要在新请求和旧请求之间做调度取舍。
- Prefix Cache 的命中条件必须包含 token、模型、位置、adapter 和权限语义。
- 优化不是一次换配置，而是可回归、可解释、可回滚的实验流程。

LLM 基础这一组笔记里：Attention 解释“如何取上下文”，Transformer 解释“为什么能并行建模”，MoE 解释“如何扩大参数容量”，KV Cache 和推理优化解释“如何把它们跑起来”。

## 参考资料

1. [Efficiently Scaling Transformer Inference](https://arxiv.org/abs/2211.05102)，推理阶段性能分析。
2. [vLLM](https://github.com/vllm-project/vllm)，高吞吐推理服务与 Paged Attention 实现。
