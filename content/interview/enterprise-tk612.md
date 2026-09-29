---
slug: enterprise-tk612
no: "1512"
title: "How do you measure LLM inference performance"
question: "How do you measure LLM inference performance"
excerpt: "面试官想考察你对 LLM 推理性能的系统性理解，而非零散背指标。核心是区分在线服务（延迟敏感）与离线批处理（吞吐优先）场景，并展示对效率-质量 trade-off 的工程直觉。刁钻点在于：多数人只提 TTFT 和 TPS"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3917
updated: "2026-09-29"
---

## How do you measure LLM inference performance

#### 1️⃣ 考察意图

面试官想考察你对 LLM 推理性能的**系统性理解**，而非零散背指标。核心是区分**在线服务**（延迟敏感）与**离线批处理**（吞吐优先）场景，并展示对**效率-质量 trade-off** 的工程直觉。刁钻点在于：多数人只提 TTFT 和 TPS，却忽略**显存瓶颈**（KV Cache）和**质量退化**（如加速后输出变差）。答好了能展示你从模型部署到性能调优的端到端工程能力，包括对 vLLM、TensorRT-LLM 等推理引擎的实战认知。

#### 2️⃣ 标准答

LLM 推理性能度量需从**延迟、吞吐、显存、质量、效率**五个维度切入，并区分在线/离线场景。

#### 延迟指标

- **TTFT（Time to First Token）**：用户发出请求到收到第一个 token 的时间。在线场景（如聊天）要求 < 200ms，受预填充阶段计算和 KV Cache 初始化影响。优化手段：使用 FlashAttention 减少注意力计算，或采用**连续批处理**（vLLM 的 PagedAttention）降低排队延迟。
- **TPOT（Time Per Output Token）**：生成每个后续 token 的平均时间。决定用户体验的流畅度，目标 < 30ms/token。瓶颈在自回归解码的矩阵乘法，可通过**推测解码**（Speculative Decoding）用小模型草稿+大模型验证来加速。
- **端到端延迟**：从请求到完整回复的时间。对长输出任务（如文档摘要）更重要，需结合 TTFT 和 TPOT 计算。

#### 吞吐量指标

- **RPS（Requests Per Second）**：在线场景的关键，受并发数和批处理大小影响。vLLM 通过**动态批处理**（在解码阶段动态合并请求）可提升 2-4 倍 RPS，但需注意批大小过大导致 TTFT 飙升。
- **TPS（Tokens Per Second）**：系统每秒生成的 token 总数，离线批处理（如数据标注）的核心指标。优化方向：增大批大小、使用 TensorRT-LLM 的**图优化**（算子融合）和**量化**（FP16→INT4）。**实际坑**：TPS 提升可能伴随显存爆炸，需监控**KV Cache 命中率**——若批处理导致 cache 频繁换入换出，TPS 会骤降。

#### 显存指标

- **峰值显存占用**：模型权重 + KV Cache + 激活值。KV Cache 是主要瓶颈，对 7B 模型，输出 2048 tokens 时约占用 2GB（FP16）。优化：**Multi-Query Attention**（MQA）或**Grouped-Query Attention**（GQA）减少 KV head 数，或使用**KV Cache 量化**（INT8）压缩 50%。
- **KV Cache 利用率**：实际使用 vs 分配容量。vLLM 的 PagedAttention 通过分页管理减少碎片，利用率可达 95%+，而传统实现常低于 60%。

#### 质量指标

- **输出困惑度（Perplexity）**：量化加速后模型输出质量是否退化。例如，INT4 量化后 PPL 上升 < 0.5 可接受，超过则需回退到 FP16。
- **任务指标**：ROUGE（摘要）、BLEU（翻译）、准确率（分类）。**关键取舍**：推测解码可能因草稿模型质量差导致输出偏差，需用**拒绝采样**（Rejection Sampling）保证最终质量。

#### 效率指标

- **MFU（Model FLOPS Utilization）**：实际计算吞吐 vs 理论峰值。A100 上 FP16 推理 MFU 通常 30-50%，优化后（FlashAttention + 算子融合）可达 60%+。**坑**：MFU 高不一定好——若因批处理过大导致 TTFT 超时，需降低批大小换取延迟。
- **GPU 利用率**：通过 nvidia-smi 监控，理想值 > 80%。若低于 50%，说明计算瓶颈在数据加载或通信（多卡场景），需检查**张量并行**（Tensor Parallelism）的通信开销。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从延迟、吞吐、显存、质量、效率五个层面回答。延迟层面，在线场景关注 TTFT 和 TPOT，用 FlashAttention 和推测解码优化；吞吐层面，离线场景看 TPS，用 vLLM 的动态批处理提升；显存层面，KV Cache 是瓶颈，用 PagedAttention 和量化解决；质量层面，用 PPL 和任务指标确保加速不退化；效率层面，用 MFU 衡量计算利用率。总结一句：度量需根据场景选择指标组合，并始终监控质量退化。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说用推测解码加速，那怎么保证输出质量不下降？

> 推测解码的核心是草稿模型（如小 10 倍的模型）生成候选序列，大模型并行验证。质量保证靠**拒绝采样**：大模型对每个候选 token 计算概率，若草稿模型概率低于阈值（如 0.1），则回退到大模型生成。实际中，草稿模型需与大模型在相同领域微调，否则拒绝率过高（> 50%）导致加速失效。例如，在代码生成任务中，用 CodeLlama-7B 作草稿，CodeLlama-34B 验证，加速比约 2x，且 BLEU 下降 < 0.5。

**追问 2**：在线场景中，TTFT 和 TPS 冲突时怎么取舍？

> 这是典型的 trade-off。若用户要求低延迟（如实时对话），优先保证 TTFT < 200ms，限制批大小（如 ≤ 4），牺牲 TPS。若场景允许稍高延迟（如客服机器人），可增大批大小到 16-32，提升 TPS 但 TTFT 可能到 500ms。工程解法：用**自适应批处理**——监控请求队列长度，短时低负载用小批，高峰时自动增大批大小，并设置 TTFT 硬上限（如 300ms），超限则拒绝请求。

**追问 3**：你提到 MFU，但实际中怎么测量和优化？

> MFU = 实际 FLOPs / (GPU 理论峰值 × 时间)。测量需用 profiler（如 PyTorch Profiler）统计模型前向传播的 FLOPs，除以 GPU 运行时间。优化方向：① 算子融合（如 FlashAttention 合并注意力计算）减少内存访问；② 张量并行（TP）时调整通信策略，用**环形 all-reduce** 替代广播，减少带宽浪费；③ 量化（INT4）降低计算量，但需注意 INT4 矩阵乘在 A100 上无原生支持，实际 MFU 可能低于 FP16。**坑**：MFU 高但延迟差，说明批处理过大，需结合延迟指标综合评估。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提延迟和吞吐，忽略显存和质量指标 → ✅ 必须补充 KV Cache 占用和 PPL 监控，展示对推理瓶颈的全面认知。
- ❌ 说“用更大的批处理提升 TPS”而不提 trade-off → ✅ 需说明批大小增大导致 TTFT 上升和显存溢出，并给出自适应批处理等解法。
- ❌ 把 MFU 和 GPU 利用率混为一谈 → ✅ 明确 MFU 是计算效率，GPU 利用率是硬件占用，前者受算子优化影响，后者受数据加载和通信限制。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“在线检索+生成”场景切入，强调 TTFT 对用户体验的影响，并展示如何用 vLLM 的 PagedAttention 优化 KV Cache 以支持长上下文检索结果。
- **如果你只做过传统 NLP**：用机器翻译的 BLEU 指标类比质量度量，并迁移到 LLM 的 PPL 和任务指标，同时解释推理延迟与批处理的 trade-off 类似传统模型的 batch size 调优。
- **如果你是校招无项目**：聚焦论文复现，如复现 FlashAttention 论文中的 TTFT 对比实验，或用 HuggingFace 的 benchmark 工具测量不同量化策略下的 TPS 和 PPL，展示对指标体系的动手能力。
- 《Efficient Memory Management for Large Language Model Serving with PagedAttention》（vLLM 论文）
- 《Fast Inference from Transformers via Speculative Decoding》（推测解码论文）
- 《FlashAttention: Fast and Memory-Efficient Exact Attention》（FlashAttention 论文）
- 《TensorRT-LLM: A TensorRT-based LLM Inference Framework》（NVIDIA 官方文档）
- 《LLM Inference Performance: A Practical Guide》（HuggingFace 博客）

---
