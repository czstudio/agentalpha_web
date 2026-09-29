---
slug: finetune-tk168
no: "1068"
title: "八股:分布式训练中 Zero-2 和 Zero-3 的核心区别是什么"
question: "八股:分布式训练中 Zero-2 和 Zero-3 的核心区别是什么"
excerpt: "面试官想考察你对分布式训练中显存-通信权衡的深度理解，而非单纯背诵 ZeRO 阶段定义。刁钻点在于：能否清晰区分 ZeRO-2 和 ZeRO-3 在参数分片上的本质差异，并量化通信开销与显存节省的 trade-off。答"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4024
updated: "2026-09-29"
---

## 八股:分布式训练中 Zero-2 和 Zero-3 的核心区别是什么

`P1` · `llm_training`

📊 考点：distributed-training

🏷 标签：`zero-optimization, deep-learning, memory-efficiency`

#### 1️⃣ 考察意图

面试官想考察你对分布式训练中显存-通信权衡的深度理解，而非单纯背诵 ZeRO 阶段定义。刁钻点在于：能否清晰区分 ZeRO-2 和 ZeRO-3 在参数分片上的本质差异，并量化通信开销与显存节省的 trade-off。答好了能展示你不仅懂 DeepSpeed 配置，还能在训练 70B+ 模型时做系统级决策，这是大模型训练工程师的核心硬实力。

#### 2️⃣ 标准答

ZeRO（Zero Redundancy Optimizer）是分布式训练中消除显存冗余的优化器，核心思想是将模型状态（优化器状态、梯度、参数）分片到各 GPU，而非全量复制。ZeRO-2 和 ZeRO-3 的区别在于分片粒度：

- **ZeRO-2（优化器状态 + 梯度分片）**：每个 GPU 只存储一部分优化器状态（如 Adam 的 momentum 和 variance）和梯度，但**模型参数全量保留**。
- 反向传播时，梯度通过 allreduce 聚合后，每个 GPU 只更新自己分片对应的参数部分，无需通信参数。
- 显存节省：约 4 倍（假设 Adam 优化器，参数占 2 倍显存，优化器状态占 4 倍，梯度占 2 倍；ZeRO-2 消除优化器状态和梯度冗余，节省 6/8=75%）。
- 通信量：每个 step 一次 allreduce 梯度（与 DDP 相同），通信量 = 2 × 参数大小（因为 allreduce 需要 reduce 和 broadcast）。
ZeRO-3（参数 + 优化器状态 + 梯度分片）：
- 在 ZeRO-2 基础上，**模型参数也分片存储**，每个 GPU 只持有部分参数。
- 前向传播时，需要从其他 GPU 收集当前层参数（all-gather）；反向传播时，再次收集参数计算梯度，然后丢弃非本分片参数。
- 显存节省：约 8 倍（消除所有模型状态冗余，仅保留参数分片 + 优化器状态分片 + 梯度分片）。
- 通信量：每个 step 两次 all-gather（前向 + 反向）+ 一次 reduce-scatter 梯度，总通信量 = 3 × 参数大小（比 ZeRO-2 多 50%）。
核心区别：ZeRO-2 不通信参数，ZeRO-3 在 forward/backward 时需通信参数。这导致 ZeRO-3 显存更省，但通信开销更大，尤其在小 batch size 或低带宽网络下，通信延迟可能成为瓶颈。工程取舍：
- **为什么 ZeRO-3 不默认用**？因为参数分片引入了额外的 all-gather 操作，在 GPU 数量多（如 64 卡）或网络带宽低（如 100Gbps 以下）时，通信开销可能超过显存节省带来的收益。实际落地中，训练 13B 模型用 ZeRO-2 可能比 ZeRO-3 快 20%，因为参数分片的通信延迟抵消了显存优势。
- **实际落地的坑 + 解法**：在 ZeRO-3 中，如果模型有大量小参数层（如 embedding 层），频繁的 all-gather 会放大通信开销。解法是使用 `zero_optimization.stage3_gather_16bit_weights_on_model_save: true` 延迟参数收集，或对 embedding 层不做分片（`stage3_param_persistence_threshold` 参数控制）。
适用场景：
- ZeRO-2：模型大小 ≤ 13B，GPU 显存 ≥ 80GB，网络带宽 ≥ 200Gbps。
- ZeRO-3：模型大小 ≥ 30B，GPU 显存 ≤ 40GB，或需要训练 70B+ 模型。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从分片粒度、通信开销、显存节省三个层面回答。ZeRO-2 只分片优化器状态和梯度，参数全量保留，通信量是 2 倍参数大小；ZeRO-3 额外分片参数，通信量增加到 3 倍参数大小，但显存节省从 4 倍提升到 8 倍。核心区别在于 ZeRO-3 需要通信参数，这带来了显存-通信的 trade-off。总结一句：ZeRO-2 适合中等模型和高速网络，ZeRO-3 适合超大模型和显存受限场景。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：ZeRO-3 的通信开销具体怎么算？在 64 卡训练 70B 模型时，通信时间占比多少？

> 通信量：每个 step 两次 all-gather（前向 + 反向）+ 一次 reduce-scatter，总通信量 = 3 × 参数大小 = 3 × 70B × 2 bytes（fp16）= 420 GB。假设网络带宽 200 Gbps（25 GB/s），通信时间 ≈ 420 / 25 = 16.8 秒。如果计算时间（forward + backward）是 10 秒，通信占比约 63%。实际中可以用 `torch.distributed.all_gather` 和 `reduce_scatter` 的异步实现，或使用 NVLink 提升带宽到 600 GB/s，通信时间降到 0.7 秒，占比 7%。关键 trade-off：带宽越高，ZeRO-3 越划算。

**追问 2**：ZeRO-2 和 ZeRO-3 在混合精度训练（fp16/bf16）下，显存占用具体差多少？

> 以 7B 模型、Adam 优化器、fp16 为例：参数 14 GB（7B × 2 bytes），梯度 14 GB，优化器状态 28 GB（momentum + variance 各 14 GB）。ZeRO-2：每个 GPU 存储全量参数 14 GB + 梯度分片 14/N GB + 优化器状态分片 28/N GB，N=8 时总显存 ≈ 14 + 1.75 + 3.5 = 19.25 GB。ZeRO-3：参数分片 14/N GB + 梯度分片 14/N GB + 优化器状态分片 28/N GB，N=8 时总显存 ≈ 1.75 + 1.75 + 3.5 = 7 GB。ZeRO-3 比 ZeRO-2 节省约 12 GB，但通信量多 50%。实际中还要加上 activation memory，ZeRO-3 的显存优势更明显。

**追问 3**：如果网络带宽只有 100 Gbps，你会怎么选 ZeRO 阶段？为什么？

> 选 ZeRO-2。因为 100 Gbps（12.5 GB/s）下，ZeRO-3 的通信时间会翻倍（3 × 参数大小 vs 2 × 参数大小），对于 7B 模型，通信时间从 2.24 秒（ZeRO-2）增加到 3.36 秒（ZeRO-3），而显存节省可能不必要（ZeRO-2 已足够装下模型）。如果必须用 ZeRO-3，可以开启 `stage3_prefetch_bucket_size` 预取参数，或使用梯度累积减少通信频率。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“ZeRO-3 比 ZeRO-2 快，因为显存更省” → ✅ 正确说法：ZeRO-3 显存更省，但通信开销更大，通常更慢。显存节省不直接等于速度提升，通信延迟才是瓶颈。
- ❌ 说“ZeRO-2 和 ZeRO-3 的区别只是分片粒度不同” → ✅ 正确说法：核心区别是参数是否分片，这导致通信模式从 allreduce 变为 all-gather + reduce-scatter，通信量增加 50%。
- ❌ 说“ZeRO-3 适合所有大模型训练” → ✅ 正确说法：ZeRO-3 只在显存受限或模型超大时适用，中等模型用 ZeRO-2 更高效，因为通信开销小。

#### 6️⃣ 简历呼应

- **如果你有分布式训练项目**：从“我在训练 13B 模型时，对比 ZeRO-2 和 ZeRO-3 的吞吐量，发现 ZeRO-2 在 8 卡 A100 上快 15%，因为网络带宽 200 Gbps 下通信开销占主导”切入，展示量化分析能力。
- **如果你只做过单卡训练**：用“我理解 ZeRO 是消除显存冗余的优化器，类比单卡训练中梯度累积减少显存，ZeRO-3 用通信换显存”迁移，强调 trade-off 思维。
- **如果你是校招无项目**：聚焦“我复现了 DeepSpeed 官方 ZeRO 论文（ZeRO: Memory Optimizations Toward Training Trillion Parameter Models），在 4 卡上模拟了 ZeRO-2 和 ZeRO-3 的显存占用对比，验证了 4 倍 vs 8 倍节省”的 demo 经验。

#### 7️⃣ 延伸阅读

- ZeRO: Memory Optimizations Toward Training Trillion Parameter Models (Rajbhandari et al., 2020)
- DeepSpeed 官方文档：ZeRO Stages Configuration
- PyTorch FSDP 与 DeepSpeed ZeRO-3 对比分析（技术博客）
- 分布式训练通信模式：AllReduce vs AllGather vs ReduceScatter
- 大模型训练显存计算：参数、梯度、优化器状态、激活值

---
