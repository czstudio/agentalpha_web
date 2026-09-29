---
slug: enterprise-tk245
no: "1145"
title: "分布式并行及显存优化技术并行技术有哪一些，都有什么特点"
question: "分布式并行及显存优化技术并行技术有哪一些，都有什么特点"
excerpt: "面试官想考察你对分布式训练全景的系统设计能力，而非单纯背诵技术名词。刁钻点在于：能否根据模型规模（7B/13B/175B）、硬件拓扑（NVLink/NVSwitch/InfiniBand）和训练目标（吞吐/显存/易用性）"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4207
updated: "2026-09-29"
---

## 分布式并行及显存优化技术并行技术有哪一些，都有什么特点

#### 1️⃣ 考察意图

面试官想考察你对分布式训练全景的系统设计能力，而非单纯背诵技术名词。刁钻点在于：能否根据模型规模（7B/13B/175B）、硬件拓扑（NVLink/NVSwitch/InfiniBand）和训练目标（吞吐/显存/易用性）做工程取舍。答好了能展示：从“会用框架”到“能设计训练方案”的架构思维，以及对显存瓶颈（激活值/优化器状态/参数）的底层理解。

#### 2️⃣ 标准答

分布式并行技术按切分维度分为四大类，显存优化技术作为补充。选型核心是：**通信带宽决定并行策略，显存容量决定优化手段**。

#### 数据并行（DP）与 ZeRO

- **DP**：每卡一份完整模型，数据分片。通信瓶颈在 allreduce 梯度，带宽利用率低（每步通信量 = 2 × 参数量 × 精度）。
- **ZeRO Stage 1/2/3**：将优化器状态、梯度、参数分片到各卡，通信量从 O(模型) 变为 O(模型/卡数)。**工程取舍**：ZeRO-3 通信量是 DP 的 1.5 倍（需 gather 参数），但显存节省 8 倍（FP16 训练时）。**实际坑**：ZeRO-3 在 1000+ 卡集群上通信延迟会放大，需开启 `overlap_comm` 和 `gradient_accumulation_steps` 掩盖延迟。

#### 模型并行（MP）

- **张量并行（TP）**：按层内维度切分（如列切/行切）。每步通信量 = 2 × hidden_size × seq_len × 精度，依赖 NVLink 高带宽（600GB/s）。**适用**：单节点内（8卡 A100），跨节点 TP 性能断崖下降。
- **流水线并行（PP）**：按层切分，每卡负责连续若干层。气泡率 = (PP-1)/(PP+1)（1F1B 调度下）。**工程取舍**：PP 降低通信量（仅传递激活值），但引入气泡；增大 micro-batch 数可降低气泡率，但增加显存。**实际坑**：PP 的负载不均——embedding 层计算量远小于 transformer 层，需手动调整切分点。

#### 序列并行（SP）与专家并行（EP）

- **SP**：将序列维度切分到多卡，解决长序列（8K+）的注意力显存爆炸。Ring Attention 实现 O(1) 显存，但通信量随序列长度线性增长。**适用**：长上下文训练（如 128K），需配合 TP 使用。
- **EP**：MoE 模型专用，每个 expert 分配到不同卡，通过 all-to-all 通信路由 token。**取舍**：EP 增加通信量（token 重排），但计算量降低（每个 token 只激活 2 个 expert）。**实际坑**：负载均衡——需加 auxiliary loss 防止 token 集中到少数 expert。

#### 显存优化技术

- **激活重计算（Activation Checkpointing）**：前向不存中间激活值，反向时重算。显存从 O(L×S×H) 降到 O(√L×S×H)（分段 checkpoint）。**取舍**：增加 30-40% 计算开销（重算 FLOPs），但显存节省 5-10 倍。
- **混合精度训练（AMP）**：FP16/BF16 前向+反向，FP32 主权重。**坑**：BF16 无需 loss scaling，但 FP16 需动态 loss scaling 防止下溢。
- **CPU Offload**：将优化器状态/参数卸载到 CPU 内存。**取舍**：显存节省 2-3 倍，但 CPU-GPU 带宽（PCIe 32GB/s）成为瓶颈，吞吐下降 50%+。**适用**：单卡训练大模型（如 13B 在 24GB 卡上）。

#### 选型原则（以 13B 模型在 8×A100-80GB 为例）

- **显存计算**：FP16 参数 26GB，梯度 26GB，优化器状态（Adam）52GB，激活值（seq=4096）约 40GB，总计 144GB > 80GB。
- **方案**：TP=2（单节点 NVLink） + PP=4（跨节点 InfiniBand） + ZeRO-1（优化器状态分片） + 激活重计算。吞吐约 1200 tokens/s/GPU。
- **对比**：若用 ZeRO-3 + DP，通信量增加 1.5 倍，但易用性高（无需手动切分模型），吞吐约 900 tokens/s/GPU。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从并行策略、显存优化、选型原则三个层面回答。并行策略包括数据并行（ZeRO）、模型并行（TP/PP）、序列并行和专家并行，核心是通信带宽决定切分维度。显存优化用激活重计算和混合精度。选型原则是：小模型用 ZeRO-3+DP，大模型用 TP+PP+ZeRO-1，长序列加 SP。总结一句：没有银弹，根据模型大小、集群拓扑和吞吐目标做 trade-off。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 TP 依赖 NVLink，如果集群只有 InfiniBand（200Gbps），怎么调整方案？

> 将 TP 改为 1（即不用 TP），改用 PP+ZeRO-3。InfiniBand 带宽 25GB/s，远低于 NVLink 600GB/s，TP 的通信延迟会占满计算时间。PP 的通信量仅激活值（约 2×hidden_size×seq_len），远小于 TP 的 2×hidden_size×seq_len×层数。同时 ZeRO-3 的 all-gather 通信量虽大，但可通过 `gradient_accumulation_steps` 掩盖。实际测试：在 4 节点 32 卡上，PP=8 + ZeRO-3 比 TP=8 + ZeRO-1 吞吐高 20%。

**追问 2**：激活重计算的开销具体多大？怎么选择 checkpoint 粒度？

> 开销公式：重算 FLOPs = 前向 FLOPs × checkpoint 分段数。分段粒度细（每层 checkpoint）显存节省多但重算开销大（约 40%）；粗粒度（每 4 层 checkpoint）显存节省少但开销小（约 15%）。工程上推荐：显存紧张时用细粒度（如 13B 模型），显存充裕时用粗粒度。实际调优：用 `torch.utils.checkpoint` 的 `preserve_rng_state=False` 可减少 5% 重算开销。

**追问 3**：MoE 模型训练中，EP 的 all-to-all 通信怎么优化？

> 关键优化：1）使用 `torch.distributed.all_to_all_single` 替代逐 token 通信；2）将 token 按 expert 分组后批量发送，减少通信次数；3）开启 `overlap_comm` 让通信与计算重叠（如发送当前 batch 时计算上一 batch）。实际坑：all-to-all 在节点间通信时，带宽利用率低（约 60%），可改用 `all_gather` + 本地路由，但增加显存。推荐方案：单节点内用 EP，跨节点用 DP。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“TP 和 PP 可以任意组合，没有限制” → ✅ 正确：TP 必须依赖 NVLink 高带宽，跨节点 TP 性能极差；PP 受气泡率限制，PP 数不宜超过 8（气泡率 > 50%）。
- ❌ 说“ZeRO-3 比 ZeRO-2 好，所以都用 ZeRO-3” → ✅ 正确：ZeRO-3 通信量是 ZeRO-2 的 2 倍（需 gather 参数），在 1000+ 卡集群上通信延迟会抵消显存收益。小规模（<64 卡）用 ZeRO-3，大规模用 ZeRO-2 + 激活重计算。
- ❌ 说“激活重计算是免费的” → ✅ 正确：重算增加 30-40% 计算时间，需权衡显存与吞吐。实际训练中，通常只对 attention 层重算（占显存 60%），MLP 层不重算。

#### 6️⃣ 简历呼应

- **如果你有大规模训练项目**：从“在 256 卡集群上训练 175B 模型”切入，对比 3D 并行（TP=8, PP=4, DP=8）与 ZeRO-3 的吞吐和显存，强调通信拓扑（NVSwitch vs InfiniBand）对 TP 选型的影响。
- **如果你只做过单卡微调**：用“单卡显存瓶颈”类比，说明 ZeRO-3 如何将 13B 模型塞进 24GB 卡，并给出激活重计算的显存节省公式（O(L×S×H) → O(√L×S×H)）。
- **如果你是校招无项目**：聚焦 Megatron-LM 论文复现，说明 TP 的列切/行切实现细节，以及 1F1B 调度如何降低气泡率，可附上 GitHub 链接。
- Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism（TP/PP 论文）
- ZeRO: Memory Optimizations Toward Training Trillion Parameter Models（ZeRO 系列论文）
- Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM（3D 并行实践）
- Ring Attention with Blockwise Transformers for Near-Infinite Context（序列并行论文）
- GShard: Scaling Giant Models with Conditional Computation and Automatic Sharding（MoE 与 EP 论文）

---
