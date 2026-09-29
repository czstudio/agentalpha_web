---
slug: enterprise-tk415
no: "1315"
title: "**Q27：ZeRO-1/2/3 区别"
question: "**Q27：ZeRO-1/2/3 区别"
excerpt: "面试官想验证你对分布式训练中显存优化核心技术的理解深度，而非简单背概念。考察类型为“工程取舍+系统设计”，刁钻点在于：你是否能说清 ZeRO 各阶段“省了什么、代价是什么”，以及在实际集群（如 8×A100 40GB）上"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3979
updated: "2026-09-29"
---

## **Q27：ZeRO-1/2/3 区别

#### 1️⃣ 考察意图

面试官想验证你对分布式训练中显存优化核心技术的理解深度，而非简单背概念。考察类型为“工程取舍+系统设计”，刁钻点在于：你是否能说清 ZeRO 各阶段“省了什么、代价是什么”，以及在实际集群（如 8×A100 40GB）上如何根据模型大小和带宽做选择。答好了能展示你对训练框架（DeepSpeed）底层原理的掌握，以及从理论到落地的工程判断力。

#### 2️⃣ 标准答

ZeRO（Zero Redundancy Optimizer）是微软 DeepSpeed 的核心优化，通过分片消除数据并行中的显存冗余。核心思路：将优化器状态、梯度、模型参数分布在多个 GPU 上，每个 GPU 只存一部分，需要时通过 all-gather 或 reduce-scatter 通信获取。

**ZeRO-1（优化器状态分片）**

- **省了什么**：只分片 Adam 的动量（momentum）和方差（variance），每个 GPU 只维护 1/N 的优化器状态。
- **保留什么**：模型参数和梯度全量复制，每个 GPU 有完整副本。
- **显存节省**：对于 Adam 优化器（每个参数存 2 个状态，各 4 字节），节省约 8×参数量的字节。例如 13B 模型，优化器状态约 104GB（13B×8），分片到 8 卡后每卡仅 13GB。
- **通信开销**：仅训练开始时一次 all-gather 同步优化器状态，通信量极小（约 2×参数量字节）。
- **适用场景**：模型参数+梯度能塞进单卡显存，但优化器状态超限时。例如 7B 模型在 24GB 卡上。

**ZeRO-2（优化器状态+梯度分片）**

- **省了什么**：在 ZeRO-1 基础上，梯度也分片。每个 GPU 只计算并存储自己负责的那部分梯度，通过 reduce-scatter 聚合。
- **保留什么**：模型参数仍全量复制。
- **显存节省**：额外省去梯度冗余（每个参数 4 字节），总计节省约 12×参数量字节（优化器 8B + 梯度 4B）。
- **通信开销**：比 ZeRO-1 多一次 reduce-scatter（反向传播时），通信量约 2×参数量字节。
- **工程取舍**：梯度分片要求反向传播后立即做 reduce-scatter，不能等所有层计算完，否则显存会爆。DeepSpeed 通过 bucket 机制（按层分组）实现流水线式通信，但增加了实现复杂度。
- **实际坑**：如果模型有大量小参数层（如 embedding），bucket 太小会导致通信次数过多，吞吐下降。解法：调大 `reduce_bucket_size`（默认 500M 元素）合并小梯度。

**ZeRO-3（优化器状态+梯度+参数分片）**

- **省了什么**：所有三部分全部分片，每个 GPU 只存 1/N 的模型参数。
- **显存节省**：理论节省约 16×参数量字节（参数 4B + 梯度 4B + 优化器 8B），13B 模型从全量 208GB 降到每卡 26GB（8 卡）。
- **通信开销**：最大。前向传播时需 all-gather 参数，反向传播时需 all-gather 参数（计算梯度）+ reduce-scatter 梯度。总通信量约 3×参数量字节（前向 1× + 反向 2×）。
- **工程取舍**：参数分片导致计算与通信重叠困难。DeepSpeed 使用 prefetch 机制（预取下一层参数）来隐藏延迟，但若网络带宽不足（如 InfiniBand < 200Gbps），通信会成为瓶颈。
- **实际坑**：ZeRO-3 下，如果模型有大量静态参数（如 embedding 表），频繁 all-gather 会浪费带宽。解法：用 `stage3_param_persistence_threshold` 将大参数保留在本地，避免分片。

**选择策略**

- **ZeRO-1**：模型参数+梯度能装下，仅优化器超限（如 7B 在 24GB 卡）。
- **ZeRO-2**：最常用，平衡显存和通信。适合 13B 以下模型在 40GB 卡上，吞吐比 ZeRO-3 高 10-20%。
- **ZeRO-3**：模型参数都装不下时（如 30B+ 在 40GB 卡），或显存极度受限。需配合高带宽（≥400Gbps InfiniBand）和 `offload` 选项（将优化器状态卸载到 CPU）使用。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从显存节省、通信开销、工程取舍三个层面回答。ZeRO-1 只分片优化器状态，通信最少但显存节省有限；ZeRO-2 加上了梯度分片，是多数场景的平衡点；ZeRO-3 全部分片，显存最省但通信量最大。总结一句：选哪个取决于模型大小和集群带宽，通常 ZeRO-2 是默认选项，ZeRO-3 留给超大模型。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：ZeRO-3 和模型并行（Tensor Parallelism）有什么区别？什么时候用哪个？

> 核心区别：ZeRO-3 是数据并行变体，每个 GPU 计算完整 batch 的不同样本，参数分片但计算不拆分；模型并行将单个层拆到多个 GPU 上，每个 GPU 只算一部分。ZeRO-3 通信模式是 all-gather/reduce-scatter，模型并行是 point-to-point 传输。选择：模型大到单卡放不下一层（如 175B 的 attention 层）时用模型并行；否则优先 ZeRO-3，因为通信模式更高效（all-gather 可被 NVLink 加速）。实际中常组合使用：模型并行 + ZeRO-1 或 ZeRO-2。

**追问 2**：ZeRO-3 下如何优化通信瓶颈？具体给参数。

> 三个方向：1）开启 `overlap_comm` 让计算和通信重叠，但需注意反向传播时梯度计算顺序；2）调大 `stage3_prefetch_bucket_size`（默认 20M 元素）减少通信次数，但会增加显存占用；3）使用 `offload` 将优化器状态卸载到 CPU，减少 GPU 显存压力，但会引入 CPU-GPU 传输延迟。实测：在 8×A100 40GB 上训练 30B 模型，开启 overlap 后吞吐提升 15%，offload 后显存从 38GB 降到 28GB，但吞吐下降 20%。

**追问 3**：ZeRO-2 的梯度分片如何实现？为什么不用 all-reduce 而用 reduce-scatter？

> 实现：反向传播时，每个 GPU 计算完整梯度后，通过 reduce-scatter 将梯度按分片规则聚合到对应 GPU 上。为什么不用 all-reduce：all-reduce 会生成完整梯度副本，违背分片目的；reduce-scatter 只保留每个 GPU 负责的部分，节省显存。后续优化器更新时，每个 GPU 只更新自己分片的参数，再通过 all-gather 同步完整参数（ZeRO-2 不需要，因为参数全量复制）。关键点：reduce-scatter 的通信量是 all-reduce 的一半，且与分片数无关。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“ZeRO-3 比 ZeRO-2 快，因为显存更省” → ✅ 正确：ZeRO-3 通信开销大，通常比 ZeRO-2 慢 10-30%，显存省但吞吐下降，需权衡。
- ❌ 说“ZeRO-1 只分片优化器状态，所以通信为零” → ✅ 正确：ZeRO-1 仍需一次 all-gather 同步优化器状态，通信量约 2×参数量字节，不是零。
- ❌ 说“ZeRO-3 可以替代模型并行” → ✅ 正确：ZeRO-3 不能处理单层超显存的情况（如 175B 的 attention 层），模型并行是正交方案。

#### 6️⃣ 简历呼应

- **如果你有分布式训练项目**：从实际调参切入，例如“我在 8×A100 上训练 13B 模型时，对比 ZeRO-2 和 ZeRO-3，发现 ZeRO-2 吞吐高 18%，但显存不够时用 ZeRO-3 + offload 解决”。
- **如果你只做过单卡训练**：用类比迁移，例如“单卡训练时显存瓶颈在 batch size，ZeRO 相当于把显存池化到多卡，类似操作系统的虚拟内存”。
- **如果你是校招无项目**：聚焦论文复现，例如“我复现了 ZeRO 论文中的显存公式，在 4 卡上验证了 ZeRO-2 的梯度分片效果，并分析了通信开销”。
- ZeRO: Memory Optimizations Toward Training Trillion Parameter Models (Rajbhandari et al., 2020)
- DeepSpeed 官方文档：ZeRO Stages 配置与调优
- PyTorch FSDP 实现对比：与 DeepSpeed ZeRO-3 的差异
- 论文：ZeRO-Offload: Democratizing Billion-Scale Model Training (Ren et al., 2021)
- 博客：Understanding ZeRO-2 and ZeRO-3 Communication Overhead (Microsoft Research)

---
