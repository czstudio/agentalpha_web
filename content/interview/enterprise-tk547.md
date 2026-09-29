---
slug: enterprise-tk547
no: "1447"
title: "八股:DeepSpeed Zero 各阶段分别做了哪些优化"
question: "八股:DeepSpeed Zero 各阶段分别做了哪些优化"
excerpt: "面试官想考察你对分布式训练内存优化的底层理解，而非简单背诵 ZeRO 三个阶段。核心是看你能不能讲清“分片”的本质——如何通过通信换显存，以及每个阶段 trade-off 的量化（显存节省 vs 通信开销）。刁钻点在于："
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4453
updated: "2026-09-29"
---

## 八股:DeepSpeed Zero 各阶段分别做了哪些优化

#### 1️⃣ 考察意图

面试官想考察你对分布式训练内存优化的底层理解，而非简单背诵 ZeRO 三个阶段。核心是看你能不能讲清“分片”的本质——如何通过通信换显存，以及每个阶段 trade-off 的量化（显存节省 vs 通信开销）。刁钻点在于：很多人只背“Stage 1 优化器状态分片，Stage 2 梯度分片，Stage 3 参数分片”，但说不清为什么 Stage 3 通信量翻倍、何时该用 Stage 2 而非 Stage 3。答好了能展示你对大规模训练（如 70B+ 模型）的工程直觉，以及根据 GPU 数量和模型大小选择策略的决策能力。

#### 2️⃣ 标准答

**ZeRO 的核心思想**：将模型状态（优化器状态、梯度、参数）分片到多个 GPU 上，每个 GPU 只存一份，训练时通过通信按需获取。相比传统数据并行（DDP），显存从“每卡存全量”变为“每卡存 1/N”，但通信量增加。

**Stage 0（基线）**：无优化，等价于标准数据并行（DDP）。每卡存完整模型参数、梯度、优化器状态（如 Adam 的 momentum 和 variance）。显存占用：模型参数量 × (参数 + 梯度 + 优化器状态) × 数据类型。例如 7B 模型用 FP16，参数 14GB，梯度 14GB，Adam 状态 28GB，总计 56GB，单卡 A100 80GB 勉强能跑，但 13B 模型直接爆显存。

**Stage 1（优化器状态分片）**：将优化器状态（如 Adam 的 momentum 和 variance）分片到各 GPU。每卡只存 1/N 的优化器状态，但参数和梯度仍全量存储。显存节省：优化器状态从 2×参数量（FP32）降为 (2×参数量)/N。通信开销：几乎为零，因为优化器状态只在更新时本地使用，无需跨卡通信。适用场景：中等模型（如 7B-13B），GPU 数量较多（≥8 卡），显存瓶颈在优化器状态而非参数。

**Stage 2（梯度分片）**：在 Stage 1 基础上，将梯度也分片。每卡只存 1/N 的梯度，但参数仍全量。显存节省：梯度从 1×参数量（FP16）降为 (1×参数量)/N。通信开销：反向传播后，各卡通过 allreduce 聚合梯度，但只保留自己分片的部分，通信量约等于 DDP 的 1/N（因为只聚合分片）。实际实现中，ZeRO 使用 reduce-scatter 替代 allreduce，通信量减半。适用场景：中等偏大模型（如 13B-30B），GPU 数量 8-32 卡，显存紧张但通信带宽充足。

**Stage 3（参数分片）**：将模型参数也分片。每卡只存 1/N 的参数，训练时按需从其他卡获取参数。显存节省：参数从 1×参数量（FP16）降为 (1×参数量)/N。通信开销：大幅增加——前向传播时需 all-gather 获取完整参数，反向传播时需 all-gather 获取参数计算梯度，再 reduce-scatter 聚合梯度。通信量约是 DDP 的 2 倍（参数 all-gather 两次 + 梯度 reduce-scatter 一次）。适用场景：超大模型（如 70B+），GPU 数量 ≥64 卡，显存是绝对瓶颈，且网络带宽足够（如 InfiniBand 400Gbps+）。

**实际落地的坑 + 解法**：

- **坑 1**：Stage 3 通信量过大，导致训练吞吐下降 30-50%。解法：开启 ZeRO 的 offload（将参数或优化器状态卸载到 CPU/NVMe），减少通信压力；或使用 ZeRO++（混合分片 + 量化通信）。
- **坑 2**：Stage 2 在梯度累积时，每步都做 reduce-scatter，通信开销累积。解法：调整梯度累积步数（如 8-16 步），减少通信频率；或使用梯度压缩（如 1-bit Adam）。
- **坑 3**：Stage 3 在模型并行（如 Tensor Parallelism）叠加时，通信模式冲突。解法：优先使用 Pipeline Parallelism + ZeRO Stage 3，避免 TP 的 all-reduce 与 ZeRO 的 all-gather 竞争带宽。

**选择建议**：

- 小模型（<7B）且 GPU 少（≤4 卡）：Stage 0 或 Stage 1 即可，通信开销低。
- 中等模型（7B-30B）且 GPU 8-32 卡：Stage 2 性价比最高，显存节省明显，通信增加可控。
- 大模型（70B+）且 GPU ≥64 卡：Stage 3 是必选项，但需配合 offload 或 ZeRO++ 优化通信。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个阶段的内存优化和通信开销两个层面回答。Stage 1 只分片优化器状态，通信几乎为零，适合中等模型；Stage 2 分片梯度，通信量约 DDP 的一半，性价比最高；Stage 3 分片参数，通信量翻倍，但能训练超大模型。总结一句：选择策略时，核心是平衡显存节省和通信开销，小模型用 Stage 1，中等用 Stage 2，大模型用 Stage 3 并配合 offload。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：ZeRO Stage 3 和模型并行（Tensor Parallelism）有什么区别？什么时候该用哪个？

> 核心区别：ZeRO Stage 3 是数据并行变体，每个 GPU 计算完整 batch 但只存部分参数，通信模式是 all-gather 和 reduce-scatter；Tensor Parallelism 是模型并行，每个 GPU 只计算部分层或部分矩阵乘法，通信模式是 all-reduce。选择依据：TP 适合单机多卡（NVLink 高带宽），通信延迟低；ZeRO Stage 3 适合跨机多卡（InfiniBand），通信带宽有限但可扩展。实际中，70B+ 模型常用 TP + PP + ZeRO Stage 3 混合策略：TP 处理单机内通信，PP 处理跨机流水线，ZeRO 处理显存分片。

**追问 2**：ZeRO Stage 2 和 Stage 3 的通信量具体差多少？能给出数字吗？

> 假设模型参数量为 Ψ，GPU 数量为 N，数据类型 FP16。Stage 2：前向/反向无参数通信，梯度 reduce-scatter 通信量 Ψ/N（每个 GPU 只聚合自己分片的部分）。Stage 3：前向 all-gather 参数 Ψ，反向 all-gather 参数 Ψ（用于计算梯度），梯度 reduce-scatter Ψ/N，总计 2Ψ + Ψ/N ≈ 2Ψ。所以 Stage 3 通信量约是 Stage 2 的 2N 倍（当 N 较大时）。例如 N=64，Stage 2 通信量 Ψ/64，Stage 3 通信量 2Ψ，差 128 倍。这就是为什么 Stage 3 必须配合高带宽网络。

**追问 3**：ZeRO 的 offload 是怎么工作的？有什么缺点？

> ZeRO offload 将优化器状态或参数卸载到 CPU 内存或 NVMe SSD。工作原理：训练时，GPU 只保留当前计算需要的参数，其余参数异步传输到 CPU；更新时，CPU 执行优化器步骤（如 Adam），再将更新后的参数传回 GPU。缺点：CPU-GPU 传输带宽（PCIe 3.0 x16 约 16GB/s）远低于 GPU 显存带宽（A100 约 2TB/s），导致训练吞吐下降 50-70%。优化方法：使用 NVMe SSD 作为二级 offload（带宽约 7GB/s），但延迟更高；或使用 ZeRO++ 的量化通信（如 4-bit 压缩）减少传输量。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Stage 3 通信量只比 Stage 2 多一点点” → ✅ 正确说法：Stage 3 通信量约是 Stage 2 的 2N 倍（N 为 GPU 数），当 N=64 时差 128 倍，必须强调数量级差异。
- ❌ 说“ZeRO 各阶段可以随意切换，没有性能影响” → ✅ 正确说法：切换阶段需要重新分配显存和通信模式，通常训练前决定，动态切换成本高（需重启训练或 checkpoint 重载）。
- ❌ 说“Stage 1 没有通信开销，所以最好” → ✅ 正确说法：Stage 1 通信开销确实低，但显存节省有限（只省优化器状态），对于大模型（如 70B）仍会爆显存，需要根据模型大小选择。

#### 6️⃣ 简历呼应

- **如果你有分布式训练项目**：从实际调优经验切入，例如“我在训练 13B 模型时，对比了 Stage 2 和 Stage 3，发现 Stage 2 在 8 卡 A100 上吞吐比 Stage 3 高 40%，但显存多占 30%，最终选择 Stage 2 + 梯度累积”。强调你做过量化对比。
- **如果你只做过单卡训练**：用类比迁移，例如“单卡训练时，显存瓶颈在模型大小和 batch size；ZeRO 相当于把显存压力分散到多卡，类似 MapReduce 的思路”。然后快速补上各阶段的具体数字。
- **如果你是校招无项目**：聚焦论文复现 demo，例如“我复现了 ZeRO 论文中的显存计算公式，在 4 卡上模拟了 7B 模型各阶段的显存占用，发现 Stage 2 比 Stage 1 节省 30% 显存，但通信时间增加 10%”。展示你对论文的理解和动手能力。
- ZeRO: Memory Optimizations Toward Training Trillion Parameter Models (Rajbhandari et al., 2020)
- ZeRO-Offload: Democratizing Billion-Scale Model Training (Ren et al., 2021)
- ZeRO++: Extremely Efficient Collective Communication for Giant Model Training (Wang et al., 2023)
- DeepSpeed 官方文档：ZeRO 配置参数详解（stage, offload, allgather_bucket_size 等）
- 博客：Understanding ZeRO Memory Optimizations in DeepSpeed (Microsoft Research)

---
