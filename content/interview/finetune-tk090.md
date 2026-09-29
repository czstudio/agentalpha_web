---
slug: finetune-tk090
no: "990"
title: "如何查看训练时的 flops？（也就是每秒的计算量）"
question: "如何查看训练时的 flops？（也就是每秒的计算量）"
excerpt: "面试官想考察你对大模型训练效率的底层理解，而非单纯背公式。核心是区分“理论 FLOPs”与“实际测量 FLOPs”，并引出 MFU（Model FLOPs Utilization）这一关键指标。刁钻点在于：候选人常混淆“"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4529
updated: "2026-09-29"
---

## 如何查看训练时的 flops？（也就是每秒的计算量）

`P1` · `llm_training`

🏷 标签：`flops, profiling, mfu, performance-analysis`

#### 1️⃣ 考察意图

面试官想考察你对大模型训练效率的底层理解，而非单纯背公式。核心是区分“理论 FLOPs”与“实际测量 FLOPs”，并引出 MFU（Model FLOPs Utilization）这一关键指标。刁钻点在于：候选人常混淆“计算量”与“显存带宽”，或只知用 nvidia-smi 看显存占用，却不知如何精确测量每秒计算量。答好了能展示你对 profiling 工具链（PyTorch Profiler、Nsight Compute）的实战经验，以及优化训练吞吐的工程思维。

#### 2️⃣ 标准答

**第一步：理论计算——先算“天花板”**

- 前向 FLOPs：对 Transformer，每 token 每层约 4×hidden_size² + 8×hidden_size×ffn_size（含 attention 和 MLP）。以 GPT-3 175B 为例，hidden_size=12288，ffn_size=49152，层数 96，单 token 前向约 1.5T FLOPs。
- 反向 FLOPs：约前向的 2 倍（梯度计算 + 权重更新），总 FLOPs ≈ 3×前向 FLOPs。
- 每秒理论计算量：总 FLOPs / step_time。例如 batch_size=1M tokens，step_time=1s，则理论 FLOPs/s ≈ 1M × 1.5T × 3 / 1s = 4.5E15 FLOPs/s = 4.5 PFLOPS。

**第二步：实际测量——用 Profiler 抓“真实值”**

- **PyTorch Profiler**：`torch.profiler.profile(activities=[ProfilerActivity.CUDA])`，在训练循环中包裹一个 step。输出会列出每个 CUDA kernel 的 FLOPs（依赖硬件计数器，如 NVIDIA 的 nvtx 和 cupti）。注意：Profiler 默认只统计显式 kernel，算子融合（如 FlashAttention）可能导致 FLOPs 被低估。
- **Nsight Compute**：`ncu --set full python train.py`，逐 kernel 分析实际计算量。能区分“计算瓶颈”和“带宽瓶颈”。例如，FlashAttention 的 FLOPs 比标准 attention 少 10-20 倍，但实际吞吐更高，因为减少了显存读写。
- **nvidia-smi 的局限**：只显示显存占用和 GPU 利用率（%），不直接给 FLOPs。利用率 100% 可能只是带宽饱和，而非计算满载。

**第三步：计算 MFU——衡量效率的黄金指标**

- MFU = 实际 FLOPs / (GPU 数 × GPU 理论峰值 FLOPs × 时间)。例如 A100 理论峰值 312 TFLOPS（FP16），8 卡训练 1 小时，实际 FLOPs 为 1E18，则 MFU = 1E18 / (8 × 312E12 × 3600) ≈ 11.1%。
- 实际 FLOPs 来源：Profiler 统计的 kernel FLOPs 总和。若 Profiler 低估（如融合算子），可改用 Nsight Compute 的精确值。
- **工程取舍**：MFU 并非越高越好。追求高 MFU 可能牺牲模型质量（如减少梯度累积步数导致收敛变差）。通常 40-50% 是良好水平，超过 60% 需检查是否过度优化（如牺牲数值精度）。

**实际落地的坑 + 解法**

- **坑**：Profiler 统计的 FLOPs 与理论值偏差大。例如 FlashAttention 在 Profiler 中显示 0 FLOPs（因为被融合为单个 kernel），导致 MFU 虚高。
- **解法**：结合 Nsight Compute 的 `--kernel-name` 过滤，手动计算 FlashAttention 的 FLOPs（约 2×seq_len×head_dim×num_heads）。或使用开源工具如 `flops-counter`（针对 PyTorch 模型）先算理论值，再与 Profiler 对比，差值即为融合算子贡献。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从理论计算、实际测量、效率评估三个层面回答。理论层：用模型参数量和 batch size 估算 FLOPs 天花板，前向+反向约 3 倍前向。实际测量层：用 PyTorch Profiler 抓 kernel FLOPs，但注意算子融合会低估，需用 Nsight Compute 校准。效率评估层：计算 MFU，对比 GPU 理论峰值，通常 40-50% 为良好。总结一句：FLOPs 测量是 profiling 基本功，关键在于区分理论值与实际值，并用 MFU 指导优化方向。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：Profiler 统计的 FLOPs 和理论值差 30%，你怎么排查？

> 首先确认 Profiler 是否统计了所有 kernel：检查 `events` 列表是否包含 `aten::` 和 `cuda::` 两类。若缺少 `cuda::`，说明未启用 CUDA 活动。其次，检查算子融合：FlashAttention 或 FusedAdam 等会合并多个 kernel，导致 Profiler 只统计一个。解法：用 Nsight Compute 的 `--kernel-name` 过滤这些融合 kernel，手动计算其 FLOPs（如 FlashAttention 的 FLOPs = 2 × batch × seq_len × head_dim × num_heads）。最后，检查混合精度：FP16 的 FLOPs 计数可能因硬件自动转换（如 Tensor Core 的 FP16 乘法累加）而偏差，需用 `torch.cuda.amp` 的 `GradScaler` 日志辅助。

**追问 2**：MFU 只有 20%，怎么优化？

> 优先排查通信瓶颈：用 `torch.distributed.profiler` 看 all-reduce 耗时占比。若超过 30%，考虑梯度压缩（如 TopK 稀疏化）或增大 batch size 减少通信频率。其次，检查计算效率：用 Nsight Compute 看 SM 利用率，若低于 80%，可能是 kernel 启动开销大（如小 batch 导致），可尝试算子融合（如 FlashAttention）或增大 batch size。最后，检查显存带宽：若 memory throughput 接近峰值但 compute throughput 低，说明是带宽瓶颈，需优化数据加载（如使用 `DataLoader` 的 `num_workers` 和 `prefetch_factor`）。

**追问 3**：理论 FLOPs 怎么算？给个具体公式。

> 对 Transformer，单 token 前向 FLOPs ≈ 2 × (4 × hidden_size² + 8 × hidden_size × ffn_size) × num_layers。其中 2 倍来自 attention 的 QKV 投影和输出投影。反向 FLOPs 约前向的 2 倍，总 FLOPs = 3 × 前向 FLOPs × batch_tokens。例如 LLaMA-7B（hidden_size=4096, ffn_size=11008, num_layers=32），单 token 前向 ≈ 2 × (4×4096² + 8×4096×11008) × 32 ≈ 2 × (67M + 3.6B) × 32 ≈ 235G FLOPs。batch_size=4K tokens，step_time=0.5s，则理论 FLOPs/s ≈ 235G × 3 × 4K / 0.5s ≈ 5.64 TFLOPS。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 直接说“用 nvidia-smi 看 GPU 利用率” → ✅ 正确切入：nvidia-smi 只显示显存和利用率百分比，不直接给 FLOPs。需用 PyTorch Profiler 或 Nsight Compute 获取 kernel 级 FLOPs。
- ❌ 只算理论 FLOPs 不测实际值 → ✅ 正确切入：理论值只是天花板，实际测量才能算 MFU。必须结合 profiling 工具，并注意算子融合导致的低估。
- ❌ 认为 MFU 越高越好 → ✅ 正确切入：MFU 超过 60% 可能牺牲模型质量（如减少梯度累积步数），需在效率与收敛之间做 trade-off。

#### 6️⃣ 简历呼应

- **如果你有 LLM 训练项目**：从“我曾在训练 7B 模型时，用 PyTorch Profiler 发现 MFU 仅 25%，通过算子融合和梯度压缩优化到 45%”切入，展示 profiling 实战。
- **如果你只做过传统 NLP**：用“类比传统模型训练中的 FLOPs 计算，但 LLM 需考虑序列长度和 attention 的二次复杂度”迁移，强调 Transformer 特殊性。
- **如果你是校招无项目**：聚焦“我复现过 GPT-2 训练，用 `flops-counter` 算理论值，再用 Profiler 对比，发现 FlashAttention 的 FLOPs 低估问题”的 demo 经验，体现动手能力。

#### 7️⃣ 延伸阅读

- 《Scaling Laws for Neural Language Models》（Kaplan et al. 2020）—— 理论 FLOPs 与模型性能的关系
- PyTorch Profiler 官方文档 —— `torch.profiler.profile` 的 FLOPs 统计方法
- NVIDIA Nsight Compute 用户指南 —— 逐 kernel 分析 FLOPs 和带宽
- 《FlashAttention: Fast and Memory-Efficient Exact Attention》（Dao et al. 2022）—— 融合算子的 FLOPs 计算
- 开源工具 `flops-counter`（GitHub）—— 自动计算 PyTorch 模型理论 FLOPs

---
