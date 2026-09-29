---
slug: enterprise-tk651
no: "1551"
title: "| Q114 | What is model parallelism, and how is it used in LLM pre-training"
question: "| Q114 | What is model parallelism, and how is it used in LLM pre-training"
excerpt: "面试官想考察你对分布式训练核心策略的理解深度，尤其是模型并行（Model Parallelism）在 LLM 预训练中的具体实现与取舍。这属于“工程取舍 + 系统设计”类问题，刁钻点在于：很多人只会背“模型并行就是切分模"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4051
updated: "2026-09-29"
---

## | Q114 | What is model parallelism, and how is it used in LLM pre-training

#### 1️⃣ 考察意图

面试官想考察你对分布式训练核心策略的理解深度，尤其是模型并行（Model Parallelism）在 LLM 预训练中的具体实现与取舍。这属于“工程取舍 + 系统设计”类问题，刁钻点在于：很多人只会背“模型并行就是切分模型”，但说不清张量并行和流水线并行的本质区别、通信模式、以及为什么 GPT-3 和 Megatron-LM 选择了不同方案。答好了能展示你对大规模训练系统（如 3D 并行、ZeRO 系列）的实战认知，而非纸上谈兵。

#### 2️⃣ 标准答

**定义与动机**模型并行将模型参数、梯度或计算图切分到多个 GPU 上，解决单卡显存装不下大模型的问题。LLM 预训练中，一个 175B 参数模型（如 GPT-3）仅参数就需要约 700GB（FP16），远超单卡 A100 80GB 上限。模型并行是必选项，而非可选项。

**两大流派：张量并行 vs 流水线并行**

- **张量并行（Tensor Parallelism, TP）**在层内切分：例如 Megatron-LM 将 Transformer 的 MLP 层按列切分，每个 GPU 只计算一部分，通过 all-reduce 通信合并结果。
- 通信模式：每层前向/反向各一次 all-reduce，通信量约等于该层激活大小。
- 典型配置：TP=8（8 卡做一层切分），适合 NVLink/NVSwitch 高速互联（如 DGX A100 内部带宽 600GB/s）。
- 坑：TP 通信密集，跨节点（如 InfiniBand 200Gb/s）时延迟会显著增加，通常限制在单节点内。
- **流水线并行（Pipeline Parallelism, PP）**在层间切分：将模型按层数分成多个 stage，每个 GPU 负责连续若干层。例如 GPT-3 使用 PP=8，每卡负责约 12 层。
- 通信模式：仅 stage 边界传输激活和梯度，通信量小（每 micro-batch 一次点对点 send/recv）。
- 气泡问题：经典 1F1B 调度下，气泡占比约 (PP-1)/(PP+1)，PP=8 时约 78% 效率。实际通过 micro-batch 数量（如 16 个）和 interleaved 调度将气泡压到 10% 以下。
- 坑：负载不均——不同层计算量不同（如 embedding 层轻，attention 层重），需手动调 stage 划分，否则慢卡拖垮整体。

**在 LLM 预训练中的实战组合：3D 并行**

- **数据并行（DP）**：复制模型，每个 GPU 处理不同数据，梯度 all-reduce。但单卡显存放不下完整模型时失效。
- **混合并行**：Megatron-LM + DeepSpeed 的典型方案：
- 张量并行（TP=8）：单节点内 8 卡切分一层。
- 流水线并行（PP=4）：跨 4 个节点，每节点负责 1/4 层。
- 数据并行（DP=16）：复制 16 份模型副本，每份占用 32 卡（8*4），总卡数 512。
- 效果：GPT-3 175B 在 1024 张 A100 上训练，MFU（模型浮点利用率）达到 52%。

**工程取舍总结**

- TP 通信密集但无气泡，适合单节点；PP 通信稀疏但有气泡，适合跨节点。
- 实际中优先 TP 填满节点内带宽，再用 PP 跨节点扩展，最后加 DP 提高吞吐。
- 一个常见坑：TP 切分维度选择——Megatron-LM 对 MLP 做列切分，对 attention 做行切分，因为列切分后无需额外 all-gather，减少通信量。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、两种实现方式、以及 LLM 预训练中的实战组合三个层面回答。定义上，模型并行将模型参数切分到多卡解决显存瓶颈。两种方式：张量并行在层内切分，通信密集适合单节点；流水线并行在层间切分，有气泡问题但通信稀疏。实战中，GPT-3 和 Megatron-LM 使用 3D 并行——TP+PP+DP，通过 TP 填满节点内带宽、PP 跨节点扩展、DP 提高吞吐。总结一句：模型并行是 LLM 预训练的基石，关键在于根据硬件拓扑选择切分粒度。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：张量并行和 ZeRO-3（FSDP）有什么区别？什么时候该用哪个？

> ZeRO-3 是数据并行的变体，它切分参数、梯度、优化器状态，但每个 GPU 仍持有完整计算图，通信模式是 all-gather 参数 + reduce-scatter 梯度。而张量并行切分计算图本身，每个 GPU 只算一部分。取舍：ZeRO-3 通信量约 2 倍模型大小（参数 all-gather + 梯度 reduce-scatter），适合带宽较低（如 InfiniBand 200Gb/s）的场景；TP 通信量是激活大小的倍数，适合高带宽（NVLink 600GB/s）。实战建议：单节点内用 TP，跨节点用 ZeRO-3。例如 LLaMA 65B 训练使用 FSDP（ZeRO-3）而非 TP，因为跨节点 NVLink 不可用。

**追问 2**：流水线并行的气泡问题怎么量化？有没有办法消除？

> 经典 1F1B 调度下，气泡占比 = (PP-1)/(PP+1)。PP=8 时约 78%，但通过增加 micro-batch 数量（如 16）和 interleaved 调度（将每个 stage 再切分，交错执行），气泡可压到 5% 以下。另一种思路：使用异步流水线（如 PipeDream 的 1F1B 变体），允许不同 stage 计算不同 micro-batch，但需要处理梯度不一致问题。极限方案：用张量并行替代流水线并行，但受限于节点内卡数。

**追问 3**：你提到 TP 通信密集，具体通信量是多少？怎么优化？

> 以 Megatron-LM 的 MLP 列切分为例：输入 X 维度 [B, S, H]，切分到 TP=8 后每卡计算 [B, S, H/8] 的矩阵乘，输出后需要一次 all-reduce 合并。通信量 = 2 * B * S * H（all-reduce 的输入+输出）。优化：使用 fused all-reduce（如 NCCL 的 ring all-reduce），将通信与计算重叠。例如在 attention 计算时同时发起 all-reduce，隐藏通信延迟。另一个技巧：对 attention 做行切分，输出无需 all-reduce，只需 all-gather，通信量减半。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 把模型并行等同于数据并行，说“模型并行就是每个 GPU 放一份模型，处理不同数据”。→ ✅ 明确区分：数据并行是复制模型，模型并行是切分模型。模型并行解决显存不足，数据并行解决吞吐不足。
- ❌ 只说“流水线并行有气泡”，但说不出具体数字和优化方法。→ ✅ 给出量化：PP=8 时气泡约 78%，通过 micro-batch 和 interleaved 调度可压到 5% 以下，并提到 PipeDream 的异步方案。
- ❌ 混淆张量并行和模型并行，认为“模型并行就是张量并行”。→ ✅ 指出模型并行是总称，包含张量并行（层内）和流水线并行（层间），两者通信模式和适用场景完全不同。

#### 6️⃣ 简历呼应

- **如果你有大规模分布式训练项目**：从“我在训练 XXB 模型时遇到了显存瓶颈，对比了 TP 和 PP 的通信开销，最终选择了 3D 并行”切入，具体说明你如何根据硬件拓扑（如 8 卡 DGX 节点）分配 TP/PP 维度，以及如何用 NCCL 的通信 profile 工具优化 all-reduce 重叠。
- **如果你只做过单卡或小模型训练**：用“虽然我主要做单卡实验，但我通过阅读 Megatron-LM 和 DeepSpeed 源码理解了 TP 和 PP 的实现差异”切入，强调你对通信模式（all-reduce vs send/recv）和气泡公式的理解，展示理论深度。
- **如果你是校招无项目**：聚焦“我复现了 GPT-3 的 3D 并行配置，在论文中看到 TP=8, PP=4, DP=16 的组合，并推导了气泡占比和通信量公式”切入，展示你对论文细节的掌握和数学推导能力。
- Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism（Shoeybi et al., 2020）
- Efficient Large-Scale Language Model Training on GPU Clusters Using Megatron-LM（Narayanan et al., 2021）
- PipeDream: Generalized Pipeline Parallelism for DNN Training（Narayanan et al., 2019）
- DeepSpeed: System Optimizations Enable Training of Very Large Models（Rasley et al., 2020）
- PyTorch FSDP 官方文档：Fully Sharded Data Parallel（Meta, 2022）

---
