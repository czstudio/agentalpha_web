---
slug: enterprise-tk017
no: "917"
title: "有哪几种并行策略？说一下"
question: "有哪几种并行策略？说一下"
excerpt: "面试官想看你是否真正理解分布式训练的核心矛盾——显存墙 vs 通信墙，而不是背概念。这道题考察类型是系统设计 + 工程取舍，刁钻点在于：多数人只会罗列“数据并行、模型并行、流水线并行”三个名词，但说不清什么时候该用哪个，"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4269
updated: "2026-09-29"
---

## 有哪几种并行策略？说一下

#### 1️⃣ 考察意图

面试官想看你是否真正理解分布式训练的核心矛盾——**显存墙 vs 通信墙**，而不是背概念。这道题考察类型是**系统设计 + 工程取舍**，刁钻点在于：多数人只会罗列“数据并行、模型并行、流水线并行”三个名词，但说不清**什么时候该用哪个**，以及**为什么大模型训练必须组合使用**。答好了能展示你对大规模训练瓶颈（显存、带宽、计算效率）的深刻理解，以及实际调优经验（如通信开销如何量化、如何用计算掩盖通信）。

#### 2️⃣ 标准答

并行策略本质是**把模型和数据的计算负载切分到多设备上**，核心目标：1）装下放不下的模型；2）加速训练。主流策略分四类，按切分维度排列：

- **数据并行（Data Parallelism）**每张卡持有完整模型副本，各自处理不同 batch 数据，前向/反向后通过 AllReduce 同步梯度。
- 适用：单卡能装下模型，但数据量大、需要加速。
- 坑：通信开销随卡数线性增长。**实际落地**：用 PyTorch DDP 时，默认用 Ring AllReduce 把通信复杂度从 O(N) 降到 O(1)，但带宽瓶颈仍在——8 卡内效果不错，跨机时需调大 batch size 减少同步频率。
- 工程取舍：梯度压缩（如 1-bit SGD）能降通信量，但可能影响收敛精度，一般只在带宽 < 10Gbps 时启用。
- **张量并行（Tensor Parallelism）**把单个算子（如 Transformer 的 Attention 或 FFN）的矩阵乘法切分到多卡，每卡算一部分，最后 AllReduce 合并。
- 典型实现：Megatron-LM 把 Q/K/V 投影按列切分，输出投影按行切分，每步通信一次。
- 适用：单卡显存放不下一个层（如 175B 模型每层 2.8GB 参数 + 激活）。
- 坑：通信量极大——每层 forward/backward 各一次 AllReduce，带宽敏感。**实际落地**：NVIDIA DGX A100 用 NVLink 600GB/s 带宽，TP 在单机内效果最好；跨机用 TP 会因网络延迟导致效率暴跌。
- **流水线并行（Pipeline Parallelism）**把模型按层切分到不同设备（如 1-8 层在卡 0，9-16 层在卡 1），数据像流水线一样依次流过各设备。
- 经典调度：GPipe（微批次）和 1F1B（一次前向一次反向）。
- 适用：模型层数多（>40 层），且单卡能装下连续几层。
- 坑：存在气泡（bubble）——设备空闲等待。**实际落地**：1F1B 调度把气泡率从 GPipe 的 50% 降到约 20%（4 卡时），但需要微批次数量 ≥ 4×流水线深度才能掩盖。
- 工程取舍：增大微批次数量能降气泡，但会增加显存（需存更多中间激活），通常用激活重计算（activation checkpointing）换显存。
- **混合并行（3D Parallelism）**同时用 DP + TP + PP，典型如 Megatron-LM + DeepSpeed。
- 分工：TP 在单机内（NVLink），PP 跨机（IB/RoCE），DP 跨所有节点。
- 实际案例：训练 GPT-3 175B 用 8 路 TP × 64 路 PP × 64 路 DP = 32768 张卡，吞吐量达 312 TFLOPS/GPU（利用率 52%）。
- 坑：调度复杂度高——需手动调 TP/PP/DP 的切分比例，否则某维度成为瓶颈。**实际落地**：一般先定 TP（单机内 4-8 路），再定 PP（按显存算每卡能装几层），最后 DP 填满剩余卡数。
- **专家并行（Expert Parallelism）**MoE 模型专用：把不同专家（Expert）分配到不同设备，输入 token 经路由选择后只发往对应专家。
- 适用：MoE 模型（如 Mixtral 8×7B），专家数远多于设备数。
- 坑：负载不均——热门专家可能收到 10 倍于冷门专家的 token。**实际落地**：用辅助损失（auxiliary loss）强制负载均衡，或动态调整专家容量（capacity factor = 1.25 时效果较好）。

**总结**：没有银弹——数据并行适合小模型加速，张量并行解决单层显存，流水线并行解决层数过多，专家并行解决 MoE 扩展。大模型训练必须组合使用，且通信拓扑（NVLink vs IB vs Ethernet）决定各策略的切分粒度。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，按切分维度分——数据并行切数据、张量并行切算子、流水线并行切层、专家并行切专家；第二，核心取舍——数据并行通信开销随卡数增长，张量并行带宽敏感，流水线并行有气泡；第三，实际落地——大模型训练必须用 3D 并行（DP+TP+PP），且切分比例取决于硬件拓扑。总结一句：没有最优策略，只有最适配硬件和模型规模的组合。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到张量并行通信量大，具体有多大？怎么优化？

> 以 Megatron-LM 的 Transformer 层为例：每层 forward 需要 2 次 AllReduce（Attention 输出和 FFN 输出），每次通信量等于 hidden_size × batch_size × seq_len × 2（float16）。对于 GPT-3 175B（hidden=12288, batch=1, seq=2048），单次通信约 48MB，8 卡 TP 时每层总通信量 96MB。优化方向：1）用序列并行（Sequence Parallelism）把激活切分到 TP 组内，减少通信量；2）用计算掩盖通信——在 AllReduce 等待期间插入计算（如 LayerNorm），实测可提升 5-10% 吞吐。

**追问 2**：流水线并行的气泡怎么算？1F1B 比 GPipe 好多少？

> 气泡率公式：bubble = (P-1) / (M+P-1)，其中 P 是流水线深度，M 是微批次数量。GPipe 用 M 个微批次顺序执行，气泡率约 (P-1)/M；1F1B 通过交错调度，气泡率降到 (P-1)/(M+P-1)。举例：P=4, M=8 时，GPipe 气泡率 37.5%，1F1B 气泡率 27.3%。实际中，1F1B 配合 DeepSpeed 的梯度累积，能把气泡压到 15% 以下（M≥4P 时）。

**追问 3**：如果我要训练一个 7B 模型，只有 4 张 A100（80GB），怎么选并行策略？

> 7B 模型参数约 14GB（fp16），单卡 80GB 完全装得下，所以不需要 TP 或 PP。直接用数据并行（DDP）即可，4 卡加速比约 3.5x（受通信开销影响）。如果 batch size 不够大（比如每卡只能放 4 条样本），可以用梯度累积（gradient accumulation steps=4）模拟更大 batch。注意：如果模型用激活重计算，显存占用会降到 20GB 以下，可以每卡 batch size 翻倍。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“数据并行就是每个 GPU 算不同数据，最后平均梯度” → ✅ 正确切入：数据并行必须说明 AllReduce 的通信机制（Ring AllReduce 复杂度 O(1)），以及梯度同步的时机（同步 vs 异步），并指出异步梯度可能导致的收敛问题。
- ❌ 说“模型并行就是把模型切到不同 GPU 上” → ✅ 正确切入：必须区分张量并行（算子内切分）和流水线并行（算子间切分），并说明各自通信模式（AllReduce vs P2P send/recv）和适用场景。
- ❌ 说“混合并行就是数据并行加模型并行” → ✅ 正确切入：必须给出具体组合比例（如 TP=8, PP=4, DP=2），并解释为什么 TP 必须放在单机内（NVLink 带宽），PP 可以跨机（IB 延迟可接受）。

#### 6️⃣ 简历呼应

- **如果你有大规模训练项目**：从实际调优经验切入，比如“我在训练 13B 模型时，发现 TP=4 时通信开销占 30%，改用 TP=8 后利用率反而下降，因为 NVLink 带宽饱和了，最终选了 TP=4 + PP=2 的组合”。
- **如果你只做过单卡训练**：用类比迁移，比如“虽然我只在单卡上训过 BERT，但我理解数据并行是单卡训练的扩展，核心是梯度同步的通信优化——我读过 Ring AllReduce 论文，并复现过一个小 demo”。
- **如果你是校招无项目**：聚焦论文复现，比如“我读过 Megatron-LM 和 DeepSpeed 的论文，并复现了 3D 并行的小实验（用 4 卡训 1.3B 模型），理解了 TP/PP/DP 的通信开销差异”。
- Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism（NVIDIA 2019）
- GPipe: Efficient Training of Large Neural Networks using Pipeline Parallelism（Google 2019）
- DeepSpeed: System Optimizations Enable Training Deep Learning Models with Over 100 Billion Parameters（Microsoft 2020）
- Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM（NVIDIA 2021）
- Sequence Parallelism: Long Sequence Training from System Perspective（2023）

---
