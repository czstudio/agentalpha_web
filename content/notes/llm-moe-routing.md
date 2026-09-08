---
slug: llm-moe-routing
title: MoE 为什么能少算一点还变大？路由、负载均衡与专家塌缩
excerpt: MoE 不是把多个模型简单拼在一起。真正决定效果和成本的是 Router 如何给 token 选专家、容量如何限制拥堵，以及系统如何把 token 分发到不同设备。
series: "LLM 基础"
seriesNo: "04"
number: "16"
minutes: 20
---

面试官问“你了解 MoE 吗”，通常不是想听到“Mixture of Experts 可以稀疏激活”。他更关心三个现实问题：

- 一个 token 为什么只走少数几个专家？
- 如果所有 token 都挤去同一个专家，模型会不会堵死？
- 参数量变大之后，为什么推理计算不一定按参数量同比增长？

MoE 的难点就在这里：**它同时是一个模型结构、一个路由算法和一套分布式通信方案。** 只讲其中一个，面试官往往会继续追问到另外两个。

## §0 TL;DR：先把“少算一点还变大”讲清楚

1. **Dense 模型让每个 token 经过同一套 FFN；MoE 把 FFN 替换成多个专家，Router 为每个 token 选择 Top-k 个专家。**
2. **总参数量可以变大，但每个 token 激活的专家数保持较小**，所以单 token 的计算量主要由激活参数决定，而不是全部参数之和。
3. **Router 输出的是分配权重，不是语义标签。** “这个 token 属于代码专家”只是一个便于理解的说法，真实分工由训练形成。
4. **负载均衡是 MoE 能否运行的关键。** 路由倾斜会让某些专家拥堵、另一些专家空闲，还会造成跨卡通信和容量浪费。
5. **Capacity factor 决定每个专家这一批最多接多少 token。** 超过容量的 token 可能被丢弃、溢出到备选专家，或者采用更复杂的 dropless dispatch。
6. **专家塌缩不等于模型坏了一个参数。** 它通常指路由长期集中在少数专家，专家多样性没有形成，效果和吞吐都可能受损。
7. **MoE 的真实成本还包含 token dispatch、all-to-all、显存占用和调度。** “只激活两个专家”不等于通信也只发生两份。

一句话版：**MoE 用稀疏路由把“每个 token 都执行完整 FFN”改成“每个 token 只执行少数专家”，用更大的总参数容量换取较低的激活计算；但它把难题转移到了路由均衡、容量控制和分布式通信。**

## 先给一个能复述的答案

> MoE 层通常由一个 Router 和多个同构的 Expert FFN 组成。Router 根据当前 token 的隐藏状态计算每个专家的分数，选择 Top-k 个专家，并用归一化后的权重合并专家输出。这样模型总参数量可以扩展到很多专家，但每个 token 只激活少数专家，计算量主要随激活专家数增长。工程上最难的是负载均衡：如果 token 集中到少数专家，就会出现容量溢出、token 丢弃、GPU 空闲和 all-to-all 通信瓶颈。因此要结合辅助负载均衡损失、capacity factor、dispatch 策略和专家并行一起设计。>

面试官听到这段，通常会顺着四个词继续问：**Top-k、容量、均衡、通信**。下面一一拆开。

## §1 Dense FFN 与 MoE FFN：到底换了哪一层

Transformer Block 里，Attention 负责 token 之间的信息交换，FFN 负责对每个位置做非线性变换。Dense FFN 大概是：

```text
x → Linear(d_model, d_ff) → 激活 → Linear(d_ff, d_model) → y
```

MoE 不改变 Attention，而是把这一个 FFN 换成 `N` 个专家：

```text
                       ┌─ Expert 1 ─┐
token x → Router ──────┼─ Expert 2 ─┼─ 加权合并 → y
                       ├─ Expert 3 ─┤
                       └─ Expert N ─┘
```

![MoE Router 为 token 选择专家并合并输出](/images/notes/llm-moe-routing/router-flow.svg)

每个 Expert 通常是结构相同、参数独立的 FFN。它们不是手工写的“代码专家、数学专家、中文专家”，而是在训练过程中因为输入分布和路由反馈逐渐形成不同偏好。

### 1.1 总参数和激活参数

假设有 16 个专家，每个 token 选择 Top-2：

| 指标 | Dense FFN | MoE（16 experts, Top-2） |
| --- | --- | --- |
| 总 FFN 参数 | 1 份 | 16 份 |
| 单 token 激活专家 | 1 份 | 2 份 |
| 参数容量 | 较小 | 较大 |
| 单 token 计算 | 稳定 | 约按 Top-k 增长 |
| 显存 | 一份参数 | 需要容纳多份专家参数 |
| 通信 | 通常较简单 | 可能需要跨卡 dispatch |

这里的“计算更省”只描述激活 FLOPs，不代表总成本一定更低。把 16 份专家放进集群、把 token 发给正确的卡，再把结果收回来，都要付工程成本。

### 1.2 为什么 MoE 放在 FFN 比放在 Attention 更常见

FFN 的参数量通常占 Transformer Block 的大头，而且它对每个 token 独立处理，天然适合做专家分流。Attention 需要在 token 之间建立关系，直接把它拆成多个专家会引入更复杂的通信和一致性问题。

因此很多稀疏 MoE 架构保留共享 Attention，只把 FFN 稀疏化；也有模型使用共享专家或共享路径，避免所有能力都被 Router 切碎。

## §2 Router：一个 token 如何挑专家

给定 token 表示 `x ∈ R^d`，最简单的 Router 是一个线性层：

```text
logits = x W_r + b_r           # [num_experts]
probs  = softmax(logits)       # 每个专家的路由概率
```

然后选概率最大的 `k` 个专家：

```text
I(x) = TopK(probs, k)
y = Σ_{e ∈ I(x)} probs_e · Expert_e(x)
```

注意有两个不同的“权重”：

- Router logits/probs：决定 token 去哪里；
- Expert 输出合并权重：决定选中的专家对最终结果贡献多少。

### 2.1 Top-1、Top-2 和更大的 k

| 路由 | 优点 | 代价 |
| --- | --- | --- |
| Top-1 | 计算、通信、实现都更省 | 每个 token 只有一次专家机会，路由错误更难补救 |
| Top-2 | 能让两个专家协作，通常更稳 | 计算和通信约翻倍，容量管理更复杂 |
| Top-k > 2 | 表达更丰富 | 稀疏性下降，调度和负载压力上升 |

Top-1 不是“低配版 Top-2”。它通常会配合更细致的辅助损失、抖动噪声或容量策略；Top-2 也不是天然更好，如果通信已经是瓶颈，增加 k 反而可能让系统吞吐掉下来。

### 2.2 Router 不是一个分类器

Router 的分数不应该直接解释成“这个 token 的正确类别”。它解决的是**计算路径选择**，目标是让后续专家组合能更好地表示 token。

例如一个 token 可能同时需要语法、事实和代码能力，Top-2 的两个专家共同贡献，比分到一个固定语义类别更贴近真实过程。专家在不同层的分工也可能不同，同一个 token 在第 3 层和第 20 层未必选择同样的专家。

## §3 负载均衡：为什么“聪明的路由”可能把系统堵死

如果 Router 总是偏爱少数几个专家，会发生三件事：

1. 热门专家达到容量上限，部分 token 被丢弃或溢出；
2. 冷门专家没有足够训练信号，能力逐渐变弱；
3. 分布式系统出现热点卡，其他 GPU 在等待。

### 3.1 重要性均衡与负载均衡

常见的辅助损失会同时关注两件事：

- **重要性**：所有 token 给每个专家的概率总量是否均匀；
- **负载**：真正被分配过去的 token 数量是否均匀。

![容量因子如何缓冲路由波动](/images/notes/llm-moe-routing/load-balance.svg)

一个简化的表达是：

```text
L_balance ∝ num_experts × Σ_e importance_e × load_e
```

不同论文会使用不同归一化和统计方式，重点不是背某个常数，而是理解它在惩罚什么：**路由概率和实际 token 数不应该长期集中在少数专家。**

### 3.2 Capacity factor：专家不是无限大的队列

设一批输入有 `T` 个 token、`N` 个专家、capacity factor 为 `c`，每个专家的容量可以粗略写成：

```text
capacity = ceil(c × T / N)
```

当 `c=1` 时，理想均匀情况下每个专家接收 `T/N` 个 token；当 `c>1` 时留出冗余空间，应对路由波动。

但容量越大并不总是越好：

- 更少的 token 被丢弃；
- 需要更多显存和通信 buffer；
- 热门专家仍可能成为系统热点；
- 为了少量异常 batch 预留空间，平均利用率下降。

所以 capacity factor 是效果、浪费和稳定性的取舍，不是越大越安全。

### 3.3 Token dropping 与 dropless dispatch

经典实现中，超过容量的 token 可能被跳过，直接沿残差路径继续走。它保证了固定的 kernel 形状，但如果丢弃比例过高，会影响训练信号。

另一种方向是 dropless dispatch：不丢 token，而是使用动态 buffer、排序或更灵活的内核，把所有 token 送到选中的专家。它减少了信息损失，却会增加实现和调度复杂度。

面试时可以说：**token dropping 是以可控的计算形状换取可能的质量损失；dropless 是以更复杂的系统实现换取完整的专家计算。**

## §4 专家塌缩：不仅是一个统计图不好看

专家塌缩通常表现为：路由概率长期集中在少数专家，很多专家几乎不接收 token，或者不同专家的输出越来越相似。

它可能来自：

- 负载均衡损失权重太弱；
- Router 初始化和学习率不合适；
- 数据分布本身极度偏斜；
- 容量约束让热门专家频繁溢出；
- 训练早期的路由偏好形成正反馈；
- 专家并行通信代价让系统倾向于少迁移 token。

不要只看一张 expert count 图就下结论。还要结合：

| 信号 | 想回答的问题 |
| --- | --- |
| token-to-expert count | 分配数量是否倾斜 |
| router probability entropy | Router 是否过早变得过于确定 |
| dropped token ratio | 容量是否长期不够 |
| expert output similarity | 不同专家是否学成了同一个函数 |
| per-expert latency | 是否出现通信或热点卡 |
| loss 与下游质量 | 路由变化是否真的影响效果 |

这也是面试里“怎么判断 MoE 训练是否健康”的可复述答案：**看分布、看溢出、看专家差异、看系统指标，再和质量一起解释。**

## §5 从零写一个可读的 Top-k Router

下面的代码不处理跨卡通信和高性能 dispatch，专门展示路由的核心逻辑。为了让每一步能被检查，它没有把所有操作压成一个黑盒 kernel。

```python
import torch
from torch import nn


class Expert(nn.Module):
    def __init__(self, d_model: int, d_ff: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Linear(d_ff, d_model),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class TopKMoE(nn.Module):
    def __init__(self, d_model: int, d_ff: int, num_experts: int, top_k: int = 2):
        super().__init__()
        if not 1 <= top_k <= num_experts:
            raise ValueError("top_k 必须在 1 和 num_experts 之间")
        self.num_experts = num_experts
        self.top_k = top_k
        self.router = nn.Linear(d_model, num_experts, bias=False)
        self.experts = nn.ModuleList(
            [Expert(d_model, d_ff) for _ in range(num_experts)]
        )

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        # x: [batch, seq, d_model]
        batch, seq, d_model = x.shape
        flat = x.reshape(-1, d_model)

        router_probs = torch.softmax(self.router(flat), dim=-1)
        top_probs, top_indices = torch.topk(router_probs, self.top_k, dim=-1)
        top_probs = top_probs / top_probs.sum(dim=-1, keepdim=True)

        output = torch.zeros_like(flat)
        for expert_id, expert in enumerate(self.experts):
            # 找到被当前专家选中的 token，以及它在 Top-k 中的列位置。
            token_rows, slot = torch.where(top_indices == expert_id)
            if token_rows.numel() == 0:
                continue
            expert_out = expert(flat[token_rows])
            output.index_add_(
                0,
                token_rows,
                expert_out * top_probs[token_rows, slot].unsqueeze(-1),
            )

        return output.reshape(batch, seq, d_model), top_indices


torch.manual_seed(7)
moe = TopKMoE(d_model=32, d_ff=128, num_experts=4, top_k=2)
tokens = torch.randn(2, 8, 32)
output, routes = moe(tokens)
assert output.shape == tokens.shape
assert routes.shape == (2 * 8, 2)
```

这份实现有意保留三个生产环境要优化的地方：

1. Python `for` 循环会限制吞吐，需要 grouped GEMM 或 fused dispatch；
2. 没有 capacity factor，某个专家可以接收任意多 token；
3. 没有跨 GPU 的 all-to-all，真实专家并行要先打包、通信、计算，再按原顺序还原。

代码能跑，只说明数学路径正确，不代表它已经是可部署的 MoE 内核。

## §6 分布式视角：为什么专家并行会遇到 all-to-all

当专家放在不同 GPU 上，token 的去向可能和当前 GPU 不一致。一次 MoE 层大致经历：

```text
本地 token
   │ 计算 Router
   ▼
按专家编号分桶、打包
   │
   ├─ all-to-all：把 token 发到专家所在 GPU
   ▼
本地 Expert FFN
   │
   ├─ all-to-all：把输出发回原 GPU
   ▼
按 token 原顺序还原并加权
```

这解释了两个常见现象：

- 理论 FLOPs 很低，但实际吞吐不高：通信和等待占了时间；
- 负载看起来均衡，但某个 rank 的网络路径更慢：专家并行还要观察通信拓扑。

生产系统通常会把数据并行、张量并行、流水线并行和专家并行组合起来。选择哪种并行方式，要看专家数量、GPU 拓扑、batch 大小、序列长度和通信带宽。

## §7 面试官追问：L1、L2、L3 分层练习

### L1：必须答对

#### 1. MoE 为什么能增加总参数却减少单 token 计算？

因为模型有多个专家，但 Router 每个 token 只选择 Top-k 个专家执行。总参数量增加了，单 token 的激活专家数仍然较小，所以激活 FLOPs 主要随 `k` 和单个专家大小增长。

#### 2. Router 做了什么？

Router 根据 token 的隐藏状态计算各专家分数，选择若干专家，并为它们生成归一化权重。它决定计算路径，不是一个人工定义的语义分类器。

#### 3. Top-1 和 Top-2 的差别是什么？

Top-1 每个 token 只走一个专家，计算和通信更省，但路由错误更难补救；Top-2 允许两个专家协作，通常更灵活，代价是更高的计算、容量和通信压力。

### L2：区分理解深度

#### 4. 为什么要做负载均衡？

路由集中会让热门专家容量溢出、token 被丢弃或等待，冷门专家得不到训练信号，分布式系统还会出现热点 GPU。负载均衡损失和容量策略用来控制这种倾斜。

#### 5. capacity factor 是什么？

它决定每个专家相对理想平均 token 数可以预留多少容量，粗略是 `ceil(c × T / N)`。更大的 capacity 减少溢出，但占用更多 buffer、通信和显存，不能无限调大。

#### 6. 专家会自动变成“领域专家”吗？

可能形成一定分工，但不能把 Router 分数直接当成标签。专家分工受层数、数据、初始化和训练目标影响，同一个 token 在不同层的路由也可能不同。

### L3：面向系统的追问

#### 7. 负载均衡但效果下降，可能是什么原因？

均匀不等于有用。辅助损失过强可能迫使语义差异很大的 token 平均分布；容量限制可能截断高价值 token；专家之间也可能因为共享结构或训练不足而学得过于相似。要同时看质量、路由和溢出，而不是只追求均匀直方图。

#### 8. token dropping 会怎样影响训练？

超出容量的 token 可能跳过专家计算，只沿残差路径继续，减少了计算形状的不确定性，但会损失一部分专家训练信号。要监控 dropped ratio，并评估它与 loss、下游质量和长尾样本的关系。

#### 9. 为什么 MoE 的激活 FLOPs 低，显存和通信仍可能很高？

所有专家参数通常都要驻留或可被快速访问；token 还要在 GPU 间 dispatch 和回收。FLOPs 只描述算术量，不能代替显存容量、带宽、all-to-all 和调度成本。

#### 10. 如何排查专家塌缩？

先看每层每批的 token count、路由熵、容量溢出和专家输出相似度，再和训练 loss、验证集质量、每卡延迟对齐。如果只有路由集中但质量没有变化，可能是分工真实存在；如果同时出现溢出、质量下降和热点卡，才更像系统性塌缩。

## MoE 路由要同时回放“token 选择”和“设备拥塞”

只保存每个专家的平均负载，会把真正的热点抹平：同一批里可能有少数 token 被集中路由到一个专家，导致某个 rank 的 all-to-all 排队。路由回放至少保留 token 级 Top-k、capacity 截断、dispatch 顺序和设备队列时间；这样才能区分是 Router 学坏了，还是通信拓扑拖慢了本来合理的路由。

```yaml
router_replay: mrx_20260820_47
layer: 18
batch: 256
token_routes:
  top_k: 2
  expert_histogram: [31, 28, 44, 153]
  dropped_tokens: 7
device_trace:
  rank_0_all_to_all_ms: 4.2
  rank_3_queue_ms: 18.7
  dispatch_order_hash: sha256:...
checks:
  route_logits_match: true
  capacity_overflow: true
  topology_hotspot: true
decision: tune_capacity_and_placement
```

![MoE 路由回放卡：token 级 Top-k、容量溢出和 rank 队列一起定位热点](/images/notes/llm-moe-routing/router-replay-card.svg)

### L5：为什么专家平均负载均衡仍可能有热点？

平均值会掩盖单批、单序列和单 rank 的突发集中；通信耗时由最慢的参与者决定。要把 token histogram、dropped ratio 和 all-to-all 长尾对齐看，才能判断是路由问题还是拓扑问题。

## Capacity factor 要按风险和长度动态调，不是一个全局常数

固定 `capacity_factor` 在短序列和长序列混合时很容易两头不讨好：短 batch 留下大量空槽，长 batch 又频繁 drop token。更稳的做法是按 batch 的 token 量、任务风险和专家历史热点给出上限，同时保留一个最小容量下限。高风险代码或工具任务可以降低 dropping 容忍度，普通闲聊则可以接受少量残差路径，以换取更稳定的尾延迟。

动态容量必须和路由回放绑定，不能只看平均 dropped ratio。每次调整记录 Top-k、每专家实际 token、空槽、drop 的 token 类型和最终质量；如果某一类 token 总被丢弃，优先查 Router 偏置或专家容量，而不是继续增加全局容量。

```yaml
capacity_policy: cap_20260820_51
tiers:
  high_risk_tool:
    capacity_factor: 1.35
    max_dropped_ratio: 0.00
  code_generation:
    capacity_factor: 1.20
    max_dropped_ratio: 0.01
  low_risk_chat:
    capacity_factor: 1.05
    max_dropped_ratio: 0.03
signals: [batch_tokens, expert_hotspot_ema, sequence_length, task_risk]
fallback:
  overflow: residual_path_and_trace
  repeated_hotspot: route_to_dense_backup
gates:
  quality_by_token_type: pass
  all_to_all_p99_budget: pass
decision: dynamic_capacity_enabled
```

![MoE 动态容量卡：按任务风险和 token 量调 capacity，溢出保留可回放的降级路径](/images/notes/llm-moe-routing/dynamic-capacity-card.svg)

### L5：为什么把 capacity factor 调到很大也不是万能解？

容量变大能减少 dropping，却会增加显存、通信和空槽浪费，还可能掩盖 Router 把 token 送错专家的问题。应先按切片确认 drop 的来源，再在质量、通信 P99 和显存预算之间做取舍。

## Router loss 变好，不等于专家真的健康

负载均衡损失下降，只能说明 Router 的概率分布更平均，不能证明实际 token 已经均匀落到设备上。训练和部署之间还隔着 Top-k 截断、capacity、padding、dispatch 顺序和 all-to-all 队列。一个更稳的健康探针会同时记录概率熵、实际 token count、dropped ratio、专家输出相似度和每个 rank 的通信 P99，并按 token 类型切片；否则一批简单 token 的平均值可能掩盖代码或工具调用 token 的热点。

```yaml
router_health_probe: rhp_20260820_97
layer: 24
signals:
  router_entropy: 1.42
  realized_load_cv: 0.31
  dropped_ratio: 0.008
  expert_output_cosine_p95: 0.88
  all_to_all_p99_ms: 21.4
segments:
  code: {dropped_ratio: 0.021, rank3_queue_ms: 36.8}
  chat: {dropped_ratio: 0.004, rank3_queue_ms: 15.2}
decision: code_slice_hotspot
```

![Router 健康探针：概率分布、实际负载、专家相似度和通信长尾一起看](/images/notes/llm-moe-routing/router-health-probe-card.svg)

### L5：为什么均衡损失下降，端到端延迟却升高？

Router 可能为了平均概率而增加跨卡 dispatch，或者把 token 分散到更多专家，导致 all-to-all 和同步等待变长。应同时比较质量、dropped ratio、每卡队列和通信 P99；只优化辅助损失，可能把数学上的均衡换成系统上的拥塞。

![路由失败切片：专家负载、容量溢出和任务质量要一起回放](/images/notes/agent-eval-success-rate/failure-slices.svg)

## 60 秒面试回答

> MoE 是在 Transformer 的 FFN 部分放入多个专家，再用 Router 为每个 token 选择 Top-k 个专家。这样总参数容量可以很大，但每个 token 只激活少数专家，所以激活计算不会随总参数量同比增长。Router 的分数不是人工语义标签，专家分工由训练形成。真正的工程难点是负载均衡和通信：热门专家可能容量溢出，token 被丢弃或造成热点 GPU，因此要结合辅助均衡损失、capacity factor、dispatch 策略和专家并行。判断 MoE 是否健康，不能只看 FLOPs，还要看路由分布、溢出比例、专家差异、all-to-all 延迟和最终质量。

## 本篇总结

- MoE 通常稀疏化 FFN，不是把整套 Transformer 随机拆碎。
- Router 决定 token 的计算路径，Top-k 决定每个 token 激活多少专家。
- 总参数和激活参数是两回事，FLOPs 也不是部署成本的全部。
- capacity factor、token dropping、dropless dispatch 都是在控制容量与质量的取舍。
- 负载均衡要同时看概率、实际 token 数、溢出、专家差异和系统热点。
- 专家并行让 MoE 从模型结构问题变成了通信与调度问题。

下一篇会把视线从“参数走哪条路”转到“历史状态放在哪里”：**KV Cache 到底缓存了什么？为什么长对话越聊越贵？**

## 参考资料

1. AgentAlpha《Agent 岗面试宝典 v3》：LLM 基础章节与 MoE、专家路由、负载均衡专题（内部学习资料）。
2. [Switch Transformers](https://arxiv.org/abs/2101.03961)，稀疏专家路由的代表性工作。
3. [ARIS in AI Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)，参考其将原理、工程取舍和分层面试题放在同一篇文章中的方式。
