---
slug: enterprise-tk484
no: "1384"
title: "如何优化 LLM 的推理吞吐量"
question: "如何优化 LLM 的推理吞吐量"
excerpt: "面试官想考察你对 LLM 推理优化全栈的理解，而非单纯背诵技术名词。核心是区分“知道优化方法”和“能落地权衡”。刁钻点在于：你是否理解优化背后的工程取舍（如量化精度与模型质量的平衡），以及是否熟悉主流框架（如 vLLM、"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3843
updated: "2026-09-29"
---

## 如何优化 LLM 的推理吞吐量

#### 1️⃣ 考察意图

面试官想考察你对 LLM 推理优化全栈的理解，而非单纯背诵技术名词。核心是区分“知道优化方法”和“能落地权衡”。刁钻点在于：你是否理解优化背后的工程取舍（如量化精度与模型质量的平衡），以及是否熟悉主流框架（如 vLLM、TensorRT-LLM）的底层原理（如 PagedAttention、连续批处理）。答好了能展示系统设计思维、实战经验和对性能瓶颈的洞察，这是大厂 P7+ 级别的硬实力。

#### 2️⃣ 标准答

优化 LLM 推理吞吐量，核心是解决 **显存瓶颈**（KV cache 占用）和 **计算瓶颈**（注意力机制）。我从三个层面展开：模型优化、推理引擎、系统调度。

**一、模型优化：降低单次推理开销**

- **量化**：将模型权重从 FP16 压缩到 INT8/INT4。常用方法：GPTQ（权重后量化，适合离线）、AWQ（感知激活值量化，保留关键通道精度）、GGUF（CPU 友好，支持混合精度）。**坑**：INT4 量化后模型质量可能下降 1-2% 的准确率（如 MMLU），需用校准集做 per-group 量化（group size=128）来缓解。**取舍**：量化提升吞吐 2-3 倍，但牺牲精度；生产环境建议先用 FP16 基线，再评估量化后质量。
- **KV cache 压缩**：使用 Multi-Query Attention（MQA）或 Grouped-Query Attention（GQA），减少 KV cache 头数。例如 LLaMA-2 70B 用 GQA（8 个 KV 头），相比 MHA 节省 75% 显存。**实战**：在 vLLM 中启用 `--kv-cache-dtype fp8`，可再压缩 50% 缓存。
- **剪枝与蒸馏**：结构化剪枝（移除冗余注意力头）和知识蒸馏（用大模型教小模型）。但落地少，因为训练成本高，且对吞吐提升有限（不如量化直接）。

**二、推理引擎：利用框架特性**

- **vLLM**：核心是 **PagedAttention**，将 KV cache 分页管理，消除显存碎片，支持动态批处理。**实战**：部署 LLaMA-7B，默认 batch size=32 时，吞吐可达 1500 tokens/s（A100-80G）。**坑**：PagedAttention 在长序列（>8K tokens）时，页表开销增加，需调大 `--max-model-len` 和 `--gpu-memory-utilization`（设为 0.95）。
- **TensorRT-LLM**：NVIDIA 官方引擎，支持 **in-flight batching**（连续批处理）和 **FlashAttention-2**。**取舍**：vLLM 易用性高（Python 原生），TensorRT-LLM 性能更优（C++ 后端），但部署复杂（需编译优化图）。建议：快速原型用 vLLM，生产高负载用 TensorRT-LLM。
- **SGLang**：新框架，支持 **RadixAttention**（自动前缀缓存），适合共享前缀场景（如多轮对话）。**实战**：在客服场景，前缀命中率 60%，吞吐提升 2 倍。

**三、系统调度：最大化硬件利用率**

- **动态批处理**：vLLM 的 continuous batching 自动合并请求，避免等待。**坑**：batch size 过大（>64）会导致显存 OOM，需监控 GPU 利用率（目标 >80%）。
- **KV cache 复用**：共享前缀（如系统提示词）可缓存。**实战**：用 vLLM 的 `--enable-prefix-caching`，在 RAG 场景中，前缀命中率 40%，延迟降低 30%。
- **请求优先级**：对延迟敏感任务（如实时对话）设高优先级，后台任务（如批量生成）用低优先级。**取舍**：优先级调度增加调度器复杂度，需用队列（如 Redis）实现。

**总结**：优先用 vLLM + INT8 量化 + 连续批处理，可提升吞吐 3-5 倍；若质量敏感，用 FP16 + FlashAttention-2。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从模型优化、推理引擎、系统调度三个层面回答。模型层面，用 INT8 量化（如 AWQ）和 GQA 压缩 KV cache，降低单次推理开销；引擎层面，用 vLLM 的 PagedAttention 和连续批处理，消除显存碎片；系统层面，启用前缀缓存和动态批处理，最大化 GPU 利用率。总结一句：优先用 vLLM + INT8 量化 + 连续批处理，可提升吞吐 3-5 倍，同时用校准集监控质量。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 INT8 量化，具体怎么保证模型质量不下降？

> 用 AWQ 或 GPTQ 做 per-group 量化（group size=128），保留关键通道的精度。校准集选 128 条代表性数据（如训练集子集），对比量化前后在 MMLU 上的准确率。如果下降 >1%，回退到 FP16 或改用 INT8 动态量化（仅量化权重，激活保持 FP16）。**实战**：在 LLaMA-7B 上，AWQ INT8 比 FP16 吞吐提升 2.5 倍，MMLU 下降仅 0.3%。

**追问 2**：vLLM 和 TensorRT-LLM 怎么选？给具体场景。

> 看团队和场景。**快速原型**：选 vLLM，Python 原生，部署快，支持 HuggingFace 模型直接加载。**高吞吐生产**：选 TensorRT-LLM，C++ 后端，支持 FlashAttention-2 和 in-flight batching，吞吐比 vLLM 高 10-20%。**取舍**：TensorRT-LLM 需编译优化图（耗时 1-2 小时），且模型兼容性差（如不支持 MoE）。建议：先用 vLLM 验证，再迁移到 TensorRT-LLM 做压测。

**追问 3**：连续批处理（continuous batching）和传统批处理有什么区别？

> 传统批处理：等 batch 满或超时后一起推理，导致空闲等待。连续批处理：每完成一个请求的 decoding 步骤，立即插入新请求，最大化 GPU 利用率。**实战**：在 vLLM 中，连续批处理比传统批处理吞吐提升 2-3 倍，但需注意请求长度差异（长序列会拖慢短序列），可用 `--max-num-batched-tokens` 限制单次推理的 token 数。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “用更小的模型（如 TinyLLaMA）来提升吞吐。” → ✅ “模型压缩是手段，但核心是优化推理引擎和显存管理。小模型质量差，生产场景优先用量化+框架优化，而非换模型。”
- ❌ “量化后模型质量一定下降，所以不用。” → ✅ “量化有 trade-off，但用 AWQ 或 GPTQ 的 per-group 量化，质量下降可控制在 0.5% 以内，吞吐提升 2-3 倍，值得用。”
- ❌ “只用 vLLM 就够了，不用管其他。” → ✅ “vLLM 是起点，但高负载场景需结合 TensorRT-LLM 或 SGLang，并调优 batch size 和前缀缓存。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“前缀缓存”切入，讲如何用 vLLM 的 `--enable-prefix-caching` 缓存系统提示词，吞吐提升 30%。强调你对比了不同 chunk size 对缓存命中率的影响。
- **如果你只做过传统 NLP**：用“批处理”类比迁移，讲传统 NLP 的 batch 优化和 LLM 的连续批处理区别。强调你理解 GPU 利用率瓶颈，并做过 PyTorch 的 `DataLoader` 调优。
- **如果你是校招无项目**：聚焦“量化论文复现”，讲你复现了 AWQ 论文（2023），在 LLaMA-7B 上对比 FP16/INT8 的吞吐和准确率，给出优化报告。强调你熟悉 vLLM 的部署流程。
- vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention
- AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration
- TensorRT-LLM: NVIDIA's Open-Source Library for LLM Inference
- FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning
- SGLang: Efficient Execution of Structured Language Model Programs

---
