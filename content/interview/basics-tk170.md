---
slug: basics-tk170
no: "1070"
title: "八股:Attention 计算中有哪些显存优化策略?(如 KV Cache 复用、batch 拼接)"
question: "八股:Attention 计算中有哪些显存优化策略?(如 KV Cache 复用、batch 拼接)"
excerpt: "面试官想考察你对 LLM 推理/训练中显存瓶颈的系统性理解，而非单纯背概念。刁钻点在于：你是否能区分“训练 vs 推理”场景下的优化策略，并给出具体的工程取舍（如 FlashAttention 的 IO 复杂度 vs 计"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4190
updated: "2026-09-29"
---

## 八股:Attention 计算中有哪些显存优化策略?(如 KV Cache 复用、batch 拼接)

#### 1️⃣ 考察意图

面试官想考察你对 LLM 推理/训练中显存瓶颈的**系统性理解**，而非单纯背概念。刁钻点在于：你是否能区分“训练 vs 推理”场景下的优化策略，并给出具体的工程取舍（如 FlashAttention 的 IO 复杂度 vs 计算精度）。答好了能展示你对 LLM 底层算子优化（CUDA kernel）、显存管理（KV Cache 碎片化）和系统级设计（PagedAttention）的硬实力，这是大厂做推理加速、模型部署的核心能力。

#### 2️⃣ 标准答

从**推理**和**训练**两个场景切入，分别覆盖主流策略：

**推理场景：KV Cache 复用与变体**

- **KV Cache 复用**：自回归生成时，每步只需计算当前 token 的 Q，复用之前所有 token 的 K、V。显存占用为 `2 × batch_size × seq_len × d_model × precision_bytes`（如 FP16 下 7B 模型，seq_len=2048，batch=1 约 16MB）。**坑**：长序列下显存线性增长，需配合 **PagedAttention**（vLLM 核心）解决碎片化，类似 OS 虚拟内存，将 KV Cache 分页管理，减少内部碎片。
- **Batch 拼接**：将多个请求的 KV Cache 拼接成连续 batch，提高 GPU 并行度。**取舍**：batch 越大吞吐越高，但显存占用线性增长，需动态调整 batch size（如 **Continuous Batching**，Orca 论文提出，不等所有序列结束就调度新请求）。
- **Multi-Query Attention (MQA) / Grouped-Query Attention (GQA)**：减少 KV head 数量（如 GQA 用 8 个 KV head 对应 32 个 Q head），KV Cache 显存降为 1/4。**实际落地**：LLaMA 2 70B 用 GQA，推理速度提升 30%+，精度损失 <0.5%。

**训练场景：FlashAttention 与梯度检查点**

- **FlashAttention**：通过 tiling（分块）和 recomputation（重计算），将 O(N²) 显存降为 O(N)。核心是**不存储完整注意力矩阵**，只存 softmax 的中间统计量（如 m、l），反向时重算。**取舍**：计算量增加约 20%（重计算），但显存节省 5-10 倍，且 IO 复杂度从 O(N²) 降到 O(N)，实际训练速度更快（如 GPT-3 训练提速 2x）。
- **梯度检查点 (Gradient Checkpointing)**：只存部分中间激活（如每 4 层存一次），反向时从 checkpoint 重算。**坑**：计算时间增加 30-40%，但显存从 O(L) 降到 O(√L)（L 为层数），适合长序列训练（如 128K 上下文）。
- **序列并行 (Sequence Parallelism)**：将序列维度切分到多个 GPU，每个 GPU 只计算部分 token 的注意力。**典型实现**：Megatron-LM 的序列并行 + 张量并行，支持 1M token 训练。

**通用策略：混合精度与算子融合**

- **混合精度 (FP16/BF16)**：显存减半，但需注意 loss scaling 防止下溢。**取舍**：BF16 动态范围更大，适合训练；FP16 推理更快。
- **算子融合 (Fused Kernel)**：将多个小 kernel（如 softmax + dropout + matmul）合并为一个，减少显存读写。**例子**：FlashAttention 本身就是 fused kernel，xFormers 的 `memory_efficient_attention` 也类似。

**总结**：推理侧核心是 KV Cache 复用 + 分页管理（PagedAttention），训练侧核心是 FlashAttention + 梯度检查点，两者都需结合 batch 调度和精度优化。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从推理和训练两个场景回答。推理侧，核心是 KV Cache 复用，配合 PagedAttention 解决碎片化，以及 GQA 减少 KV head 数量；训练侧，FlashAttention 通过分块和重计算把显存从 O(N²) 降到 O(N)，梯度检查点进一步降低激活显存。通用策略包括混合精度和算子融合。总结一句：显存优化本质是‘用计算换显存’或‘用管理换显存’，具体选哪个取决于场景的 latency 和 throughput 要求。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：FlashAttention 的分块大小怎么选？为什么不能太大或太小？

> 分块大小（block size）通常设为 64 或 128。太小（如 32）会导致 GPU 的 warp 利用率低，计算单元空闲；太大（如 256）会超出 shared memory 容量（通常 48KB-96KB），导致 spill 到 global memory，反而变慢。实际调优时需结合 GPU 架构（如 A100 的 shared memory 更大，可用 128；V100 用 64）。**取舍**：block size 越大，重计算开销越小，但 shared memory 压力越大，需在两者间平衡。

**追问 2**：PagedAttention 的 page size 怎么设？和 OS 的 page 有什么区别？

> 通常设为 16 或 32 个 token 的 KV Cache。太小（如 4）会导致页表过大，管理开销高；太大（如 64）会增加内部碎片。和 OS page 的区别：OS 页是固定大小（4KB），而 PagedAttention 的 page 大小可调，且物理页不连续，通过逻辑到物理的映射表管理。**实际坑**：vLLM 中 page size 需对齐 GPU 的 memory transaction 大小（如 128 字节），否则带宽利用率低。

**追问 3**：Continuous Batching 和 Static Batching 比，显存优化在哪？

> Static Batching 需等所有序列结束才释放显存，导致 padding 浪费（短序列被 padding 到最长序列）。Continuous Batching 动态调度，序列完成后立即释放 KV Cache，并插入新请求。**显存节省**：在真实负载下（如 50% 短序列），显存占用降低 30-50%。**代价**：调度逻辑复杂，需维护请求队列和 GPU 空闲槽位，增加 CPU 开销。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提 KV Cache 复用，不提 PagedAttention 或 GQA → ✅ 必须补充 PagedAttention 解决碎片化，GQA 减少 KV head，展示对生产环境问题的理解。
- ❌ 说 FlashAttention 减少计算量 → ✅ 纠正：FlashAttention 不减少计算量（甚至增加 20%），但减少 IO 和显存，实际训练更快。
- ❌ 把梯度检查点和 FlashAttention 混为一谈 → ✅ 区分：梯度检查点用于训练，减少激活显存；FlashAttention 用于训练和推理，减少注意力矩阵显存。

#### 6️⃣ 简历呼应

- **如果你有 LLM 推理部署项目**：从实际调优切入，比如“我在部署 LLaMA 时发现 KV Cache 占显存 60%，通过 PagedAttention 和 GQA 将 batch size 从 8 提升到 32，吞吐提升 3 倍”。
- **如果你只做过传统 NLP（如 BERT）**：用 BERT 的 attention 显存问题类比，比如“BERT 的 attention 矩阵显存 O(N²)，FlashAttention 的思路同样适用，我在长文本分类任务中试过，显存从 16GB 降到 4GB”。
- **如果你是校招无项目**：聚焦 FlashAttention 论文复现，比如“我复现了 FlashAttention 的 tiling 逻辑，用 PyTorch 自定义 CUDA kernel，对比标准 attention 显存节省 5 倍”。
- FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness (Dao et al., 2022)
- PagedAttention: Efficient Memory Management for Large Language Model Serving (Kwon et al., 2023)
- Orca: A Distributed Serving System for Transformer-Based Generative Models (Yu et al., 2022)
- GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints (Ainslie et al., 2023)
- Megatron-LM: Training Multi-Billion Parameter Language Models Using Model Parallelism (Shoeybi et al., 2019)

---
