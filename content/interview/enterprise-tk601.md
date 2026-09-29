---
slug: enterprise-tk601
no: "1501"
title: "What is model parallelism, and how is it used in LLM pre-training"
question: "What is model parallelism, and how is it used in LLM pre-training"
excerpt: "面试官想考察的不仅是“背出模型并行的定义”，而是你对分布式训练中显存瓶颈与通信开销的工程取舍是否有真实手感。这道题属于系统设计 + 工程取舍类型，刁钻点在于：候选人往往只提流水线并行（Pipeline Paralleli"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4083
updated: "2026-09-29"
---

## What is model parallelism, and how is it used in LLM pre-training

#### 1️⃣ 考察意图

面试官想考察的不仅是“背出模型并行的定义”，而是你对分布式训练中**显存瓶颈与通信开销的工程取舍**是否有真实手感。这道题属于**系统设计 + 工程取舍**类型，刁钻点在于：候选人往往只提流水线并行（Pipeline Parallelism）而忽略张量并行（Tensor Parallelism）的细节，或者说不清为什么大模型预训练必须用“3D 并行”而非单一策略。答好了能展示你对 Megatron-LM、DeepSpeed 等框架的底层理解，以及处理千亿参数模型时显存、计算、通信三角权衡的实战能力。

#### 2️⃣ 标准答

模型并行（Model Parallelism）的核心动机是：**单卡显存放不下整个模型**。以 175B 参数的 GPT-3 为例，仅参数就需 700GB（FP16），而 A100 80GB 显存完全不够。模型并行将模型切分到多设备，分为两种主流范式：**张量并行（Tensor Parallelism, TP）** 和 **流水线并行（Pipeline Parallelism, PP）**。

**张量并行（TP）**：将单个算子（如矩阵乘法）的权重切分到多设备并行计算。例如 Megatron-LM 对 Transformer 的 MLP 层做列切分（Column-wise），对 Attention 的 QKV 投影做行切分（Row-wise）。每步前向/反向都需要 all-reduce 通信，通信量约等于激活值大小。**工程取舍**：TP 通信频繁（每层一次 all-reduce），因此必须部署在高速互联设备上（如 NVLink 带宽 600GB/s），否则通信会成为瓶颈。实际中 TP 通常限制在单机内（8 卡），跨机 TP 延迟太高。

**流水线并行（PP）**：将模型的不同层分配到不同设备，数据以 micro-batch 形式流式通过各设备。GPipe 和 1F1B（One-Forward-One-Backward）是两种调度策略。1F1B 通过交错调度减少空闲时间（bubble），但仍存在约 `(p-1)/m` 的 bubble 比率（p 为流水线深度，m 为 micro-batch 数）。**实际落地的坑**：如果 micro-batch 数太少（如 m=4），bubble 会吃掉 30% 以上吞吐；通常需要 m >= 4p 才能将 bubble 控制在 5% 以下。PP 的通信量远小于 TP（仅传输激活值，不传输权重），因此可以跨机部署。

**3D 并行（3D Parallelism）**：在 LLM 预训练中，三者组合使用——数据并行（DP）复制模型副本，TP 在单机内切分算子，PP 跨机切分层。Megatron-LM 的典型配置：对 175B 模型，使用 TP=8（单机 8 卡）、PP=64（跨 64 台机器）、DP=64（共 64864=32768 张卡）。**为什么这么做**：TP 利用机内高速互联，PP 降低跨机通信量，DP 提供数据吞吐。三者比例需要根据显存和带宽调优——TP 太大导致通信瓶颈，PP 太深导致 bubble 过大。

**与数据并行对比**：数据并行（DP）复制完整模型，适合单卡能放下的小模型（<10B）；模型并行切分模型，适合超大模型。FSDP（Fully Sharded Data Parallel）是 DP 和 TP 的混合体——它分片参数但保留 DP 的通信模式，适合中等规模（10B-30B），但通信量比 TP 大，不适合超大规模。

**实际落地的坑 + 解法**：训练 70B 模型时，如果只使用 PP 而不加 TP，每张卡需加载约 70B/8=8.75B 参数（约 17.5GB），但激活值可能占满剩余显存。解法是引入 TP=8 将每层参数再切分 8 份，使单卡参数降到 2.2GB，为激活值留出空间。另一个坑是**负载不均**：PP 中不同层的计算量不同（如 embedding 层轻、attention 层重），需手动调整层分配或使用自动负载均衡工具（如 PipeDream）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，模型并行的定义和动机——单卡显存放不下模型参数，所以需要切分。第二，两种核心实现——张量并行切分算子，适合机内高速互联；流水线并行切分层，适合跨机部署，但存在 bubble 问题。第三，在 LLM 预训练中的实际应用——3D 并行（DP+TP+PP）是标配，比如 Megatron-LM 对 175B 模型用 TP=8、PP=64、DP=64。总结一句：模型并行是解决显存瓶颈的必备手段，但需要根据硬件拓扑和模型规模权衡通信开销与计算效率。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么张量并行通常只限制在单机内，而流水线并行可以跨机？

> **应对策略**：核心原因是通信频率和带宽需求不同。TP 每层前向/反向都需要一次 all-reduce，通信量约等于激活值大小（例如 4KB per token），延迟敏感——跨机网络延迟（如 InfiniBand 1-2μs）远高于 NVLink（<0.5μs），且带宽低（200GB/s vs 600GB/s），会导致 TP 效率骤降。PP 只传输激活值，通信频率低（每 micro-batch 一次），对延迟容忍度高，因此可以跨机。实际中，TP 通常限制在 8 卡以内（单机），PP 可以扩展到 64-128 个 stage。

**追问 2**：如果显存足够，模型并行和数据并行哪个更好？为什么？

> **应对策略**：数据并行更好，因为通信开销更低。DP 只需在反向传播后做一次 all-reduce 梯度，通信量等于参数大小（例如 350MB for 175B 模型），而 TP 每层都做 all-reduce，通信量是激活值的数倍。但 DP 要求单卡能放下完整模型，所以对于小模型（<10B）DP 是首选；对于大模型，必须用模型并行。FSDP 是折中方案——它分片参数但保留 DP 的通信模式，适合 10B-30B 规模。

**追问 3**：如何选择 TP 和 PP 的切分比例？

> **应对策略**：取决于硬件拓扑和模型大小。经验法则：TP 大小不超过单机 GPU 数（通常 8），PP 深度根据机器数量调整。具体调优时，先固定 TP=8，然后增加 PP 深度直到显存刚好够用；再微调 micro-batch 数使 bubble 最小化。工具方面，Megatron-LM 提供自动 profiling 脚本，可以扫描不同配置的吞吐量。一个典型结果：对 70B 模型，TP=8、PP=8、DP=8 比 TP=4、PP=16、DP=8 吞吐高 15%，因为 TP 的通信开销被更小的 bubble 抵消。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“模型并行就是把模型参数复制到多卡上训练” → ✅ 正确说法：模型并行是切分模型参数到多卡，每卡只存一部分；复制模型是数据并行。
- ❌ 说“流水线并行没有通信开销” → ✅ 正确说法：PP 有通信开销（传输激活值），但比 TP 小得多；主要问题是 bubble 导致的空闲时间。
- ❌ 说“3D 并行就是 DP+TP+PP 随便组合” → ✅ 正确说法：3D 并行有固定层次——TP 在机内、PP 跨机、DP 跨副本；顺序不能乱，否则通信模式会错乱。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“显存瓶颈”切入，对比 RAG 中 embedding 模型（通常 <1B）用 DP 即可，而 LLM 预训练必须用模型并行，强调你对不同规模模型的分布式策略选择有实战经验。
- **如果你只做过传统 NLP**：用“单机多卡训练 BERT-large 时显存不足”类比，说明你理解模型并行是解决显存问题的通用手段，并提及 Megatron-LM 的论文（Shoeybi et al., 2019）作为理论支撑。
- **如果你是校招无项目**：聚焦“3D 并行”的论文复现，说明你通过阅读 Megatron-LM 和 DeepSpeed 文档，在模拟环境中对比了 TP 和 PP 的吞吐量，并理解 bubble 计算公式。
- Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism (Shoeybi et al., 2019)
- GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism (Huang et al., 2019)
- DeepSpeed: System Optimizations Enable Training Deep Learning Models with Over 100 Billion Parameters (Rasley et al., 2020)
- 1F1B Pipeline Scheduling: Memory-Efficient Pipeline-Parallel DNN Training (Narayanan et al., 2019)
- PyTorch FSDP: Fully Sharded Data Parallel: Faster AI Training with Fewer GPUs (Zhao et al., 2023)

---
