---
slug: enterprise-tk613
no: "1513"
title: "What are the different LLM inference engines available"
question: "What are the different LLM inference engines available"
excerpt: "面试官想看的不是引擎列表，而是你在真实部署场景下的选型判断力。这道题属于系统设计+工程取舍类型，刁钻点在于：多数候选人只背过 vLLM 和 TensorRT-LLM 的名字，但说不清为什么 vLLM 的 PagedAtt"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4560
updated: "2026-09-29"
---

## What are the different LLM inference engines available

#### 1️⃣ 考察意图

面试官想看的不是引擎列表，而是你在真实部署场景下的**选型判断力**。这道题属于**系统设计+工程取舍**类型，刁钻点在于：多数候选人只背过 vLLM 和 TensorRT-LLM 的名字，但说不清为什么 vLLM 的 PagedAttention 能省 60% 显存、TensorRT-LLM 的图融合在什么场景下反而拖慢首 token 延迟。答好了能展示你对推理延迟、吞吐、显存三角 trade-off 的实战理解，以及从模型到硬件的全栈视野。

#### 2️⃣ 标准答

主流 LLM 推理引擎按设计哲学分三类：**吞吐优先**（vLLM、TGI）、**延迟极致**（TensorRT-LLM、CTranslate2）、**分布式兼容**（DeepSpeed Inference、llama.cpp）。选型核心看三个维度：在线/离线、GPU 型号、模型参数量。

**vLLM（吞吐之王）**

- 核心创新：PagedAttention 管理 KV Cache，按 page（默认 16 token/page）分配显存，消除传统预分配导致的 60-80% 碎片浪费。
- 实际坑：连续 batching 在高并发时，如果请求长度方差大（如 10 token vs 2000 token），page 回收不及时会触发 OOM。解法：设置 `max_num_seqs` 和 `max_model_len` 的硬上限，并启用 `enable_prefix_caching` 复用公共前缀的 KV Cache。
- 选型场景：高并发在线服务（如聊天机器人），A100 80G 上部署 LLaMA-2-7B 可达 2000+ req/s（batch size=256）。

**TensorRT-LLM（延迟极致）**

- 核心创新：图优化（算子融合、内核自动调优）+ 量化（FP8/INT4/INT8 SmoothQuant）。通过 `trtllm-build` 将模型编译为 TensorRT engine，推理时跳过 Python 解释器。
- 实际坑：编译时间极长（7B 模型 FP16 约 30 分钟），且 engine 绑定 GPU 架构（A100 engine 不能在 H100 跑）。解法：用 `--builder_opt=2` 降低优化等级加速编译，或预编译后存为 `.engine` 文件复用。
- 选型场景：对首 token 延迟敏感的场景（如实时翻译、语音助手），H100 上 LLaMA-2-7B 首 token 可压到 8ms。

**Hugging Face TGI（易用平衡）**

- 核心创新：内置 token streaming（Server-Sent Events）、continuous batching、flash attention。开箱即用，与 Hugging Face 生态无缝集成。
- 实际坑：默认使用 `bitsandbytes` 量化，但 4-bit 时精度损失明显（MMLU 掉 3-5%）。解法：改用 GPTQ 或 AWQ 量化，或直接上 FP16。
- 选型场景：快速原型验证、中小规模部署（<100 QPS），对延迟不敏感但要求快速迭代。

**DeepSpeed Inference（分布式推理）**

- 核心创新：ZeRO-Inference 将模型参数分片到多 GPU，推理时按需加载。支持模型并行（tensor parallelism）和流水线并行。
- 实际坑：跨 GPU 通信开销大，小 batch 下延迟反超单卡。解法：batch size 至少 32 才能体现优势，且需用 NVLink 或 InfiniBand 互联。
- 选型场景：单卡放不下的模型（如 LLaMA-3-70B），多卡部署时吞吐优先。

**CTranslate2 / llama.cpp（边缘部署）**

- 核心创新：C++ 实现，无 Python 依赖；支持 CPU 和 GPU 混合推理；INT8/INT4 量化后模型体积缩小 4x。
- 实际坑：CPU 推理时，AVX2 和 AVX512 指令集差异导致性能差 2-3x。解法：编译时指定 `-DCMAKE_CXX_FLAGS="-mavx512f"`。
- 选型场景：树莓派、手机端、无 GPU 的服务器，或需要低功耗推理。

**选型决策树**：

- 在线高吞吐（>1000 QPS）→ vLLM
- 在线低延迟（<20ms 首 token）→ TensorRT-LLM
- 快速原型/小规模 → TGI
- 超大模型多卡 → DeepSpeed Inference
- 边缘/CPU → CTranslate2 / llama.cpp

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从吞吐、延迟、部署场景三个层面回答。吞吐层面，vLLM 的 PagedAttention 通过 page 管理 KV Cache 减少显存碎片，适合高并发在线服务；延迟层面，TensorRT-LLM 的图优化和 FP8 量化能把首 token 压到 8ms，适合实时场景；部署层面，TGI 开箱即用适合快速原型，DeepSpeed Inference 解决超大模型多卡推理，CTranslate2 专攻边缘 CPU。总结一句：选型不是比谁快，而是看你的瓶颈在显存、延迟还是硬件兼容性。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：vLLM 的 PagedAttention 和 FlashAttention 有什么区别？能一起用吗？

> 两者解决不同问题。PagedAttention 是**显存管理**层，把 KV Cache 按 page 分配，减少碎片和预分配浪费；FlashAttention 是**计算优化**层，通过 tiling 和 online softmax 减少 HBM 读写，加速 attention 计算。可以一起用：vLLM 内部已经集成了 FlashAttention（通过 `--enable-flash-attn` 开启），实际效果是显存节省 60% + 计算加速 2-3x。但注意 FlashAttention 需要 Ampere 以上架构（A100/H100），V100 不支持。

**追问 2**：TensorRT-LLM 的编译时间太长，怎么在 CI/CD 中处理？

> 两种策略。一是**预编译**：在 CI 中为每个 GPU 架构（如 sm_80 for A100, sm_90 for H100）预编译 engine，存为 `.engine` 文件，部署时直接加载。二是**增量编译**：用 `--builder_opt=2` 降低优化等级，编译时间从 30 分钟降到 5 分钟，但推理性能下降 10-15%。生产环境建议用预编译 + 模型版本号做缓存 key，只在模型更新时重新编译。

**追问 3**：如果模型是 MoE（如 Mixtral 8x7B），推理引擎选型有什么不同？

> MoE 的推理瓶颈在**专家路由**和**显存带宽**。vLLM 的 PagedAttention 对 MoE 不友好，因为每个 token 可能激活不同专家，导致 KV Cache 访问模式不规则。推荐 TensorRT-LLM 或 DeepSpeed Inference：前者通过算子融合将专家计算合并，减少 kernel launch 开销；后者利用 ZeRO-Inference 将专家参数分片到多 GPU，配合 expert parallelism 减少通信。实测 Mixtral 8x7B 在 TensorRT-LLM 上比 vLLM 快 1.5x（batch size=64）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只罗列引擎名字和一句话介绍（“vLLM 快，TensorRT-LLM 更快”） → ✅ 给出具体数字和 trade-off（“vLLM 在 A100 上 7B 模型吞吐 2000 req/s，但首 token 延迟 50ms；TensorRT-LLM 首 token 8ms，但编译 30 分钟”）
- ❌ 说“vLLM 最好，其他不用看” → ✅ 说明场景依赖（“高并发选 vLLM，低延迟选 TensorRT-LLM，边缘选 CTranslate2”）
- ❌ 忽略量化对精度的影响（“用 INT4 量化就行”） → ✅ 给出量化 trade-off（“INT4 显存省 4x，但 MMLU 掉 3-5%；FP8 几乎无损但只支持 H100”）

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从在线服务吞吐切入，对比 vLLM 和 TGI 在 1000 QPS 下的显存占用，并提到 PagedAttention 如何减少长文档检索时的 KV Cache 压力。
- **如果你只做过传统 NLP**：用 BERT 推理类比，说“LLM 推理引擎类似 ONNX Runtime 但更复杂，因为自回归生成需要管理 KV Cache，vLLM 的 PagedAttention 就像操作系统的虚拟内存分页”。
- **如果你是校招无项目**：聚焦论文复现，说“我复现了 vLLM 的 PagedAttention 论文，在单卡上实现了一个 mini 版本，对比了 page size 对显存碎片的影响”，并提 FlashAttention 论文。
- vLLM 论文: "Efficient Memory Management for Large Language Model Serving with PagedAttention" (OSDI 2023)
- TensorRT-LLM 官方文档: "TensorRT-LLM: A TensorRT-based LLM Inference Engine" (NVIDIA Developer)
- FlashAttention 论文: "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness" (NeurIPS 2022)
- DeepSpeed Inference 论文: "DeepSpeed Inference: Enabling Efficient Inference of Transformer Models at Unprecedented Scale" (SC 2022)
- CTranslate2 博客: "CTranslate2: Fast Inference with Transformer Models" (OpenNMT)

---
