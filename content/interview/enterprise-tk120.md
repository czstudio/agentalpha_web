---
slug: enterprise-tk120
no: "1020"
title: "| Q70 | How do you measure LLM inference performance"
question: "| Q70 | How do you measure LLM inference performance"
excerpt: "面试官想看你是否真正理解 LLM 推理性能的“多维性”，而非只背指标。考察类型是工程取舍 + 系统设计。刁钻点在于：候选人常只提延迟或吞吐，忽略质量-效率的 trade-off（如量化后 perplexity 上升多少可"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4494
updated: "2026-09-29"
---

## | Q70 | How do you measure LLM inference performance

#### 1️⃣ 考察意图

面试官想看你是否真正理解 LLM 推理性能的“多维性”，而非只背指标。考察类型是**工程取舍 + 系统设计**。刁钻点在于：候选人常只提延迟或吞吐，忽略**质量-效率的 trade-off**（如量化后 perplexity 上升多少可接受？），以及**负载模式对指标的影响**（流式 vs 非流式、batch size 动态变化）。答好了能展示你从“模型评估”到“系统调优”的硬实力，包括对 vLLM、TensorRT-LLM 等引擎的实战认知。

#### 2️⃣ 标准答

LLM 推理性能不能只看一个数字，必须从**延迟、吞吐、资源效率、质量**四个维度拆解，且每个维度都要结合**负载模式**（在线 vs 离线、流式 vs 非流式）来解读。

#### 延迟指标

- **TTFT（Time to First Token）**：用户感知的首个 token 延迟。在线场景（如聊天）要求 < 200ms，离线批处理可放宽到秒级。**关键 trade-off**：TTFT 受 prefill 阶段计算量主导，增大 batch size 会线性增加 TTFT，但能提升吞吐。实际落地坑：使用 FlashAttention-2 可降低 prefill 延迟 2-3 倍，但需注意显存碎片（vLLM 的 PagedAttention 可缓解）。
- **TPOT（Time Per Output Token）**：生成阶段每个 token 的延迟。流式场景下，TPOT 决定“打字速度”，理想值 < 30ms/token。**工程取舍**：TPOT 受 KV cache 大小和 decode 阶段带宽限制，使用 INT8/FP8 量化可降低 TPOT 30-50%，但需验证质量损失（如 MMLU 分数下降 < 1%）。
- **端到端延迟**：用户从发请求到收完所有 token 的时间。对长文档生成（如 4K tokens）特别重要，需结合 TTFT + TPOT × 输出长度计算。

#### 吞吐指标

- **QPS（Queries Per Second）**：每秒处理的请求数，受 batch size 和模型大小影响。**实际坑**：QPS 不能只看峰值，要关注**尾部延迟**（P99），因为动态 batch 调度（如 vLLM 的 continuous batching）可能导致某些请求被饿死。
- **Tokens/s（每秒生成 token 数）**：系统级吞吐，常用公式 `batch_size × output_length / latency`。**关键取舍**：增大 batch size 可线性提升 tokens/s，但受显存限制（每个请求的 KV cache 约 2MB/token for 7B 模型）。使用 TensorRT-LLM 的 inflight batching 可提升 2-4 倍吞吐，但需额外工程投入。

#### 资源效率指标

- **GPU 利用率**：用 `nvidia-smi` 的 GPU-Util 和 Memory-Util 监控。**常见误区**：GPU-Util 高不一定好，可能因 kernel 启动开销导致实际计算效率低。用 `nsys profile` 分析 kernel 时间占比，目标 > 70%。
- **显存占用**：包括模型权重、KV cache、中间激活。**落地解法**：使用 KV cache 共享（如 Multi-Query Attention）可减少 80% 显存，但需注意长序列的 cache 管理（vLLM 的 PagedAttention 可减少碎片）。
- **功耗**：对数据中心部署重要，通常用 `nvidia-smi -q -d POWER` 监控。**trade-off**：量化可降低功耗 30%，但可能增加延迟（反量化开销）。

#### 质量指标

- **Perplexity**：衡量生成质量，量化后 perplexity 上升 < 0.5 通常可接受。
- **任务指标**：如 MMLU、HumanEval，用于验证性能优化是否影响能力。**实际坑**：仅用 perplexity 不够，因为量化可能破坏特定能力（如代码生成），需跑下游 benchmark。

#### 标准化 Benchmark

- **负载数据**：用 ShareGPT（真实对话）、Alpaca（指令）、LongBench（长文本）模拟不同场景。
- **工具**：vLLM 的 `benchmarks/benchmark_latency.py` 和 `benchmark_throughput.py`，或 TensorRT-LLM 的 `benchmarks/python` 脚本。
- **报告格式**：输出 TTFT、TPOT、tokens/s、P99 延迟、GPU 利用率，并附上模型和引擎配置（如 batch size、量化精度）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从延迟、吞吐、资源效率、质量四个层面回答。延迟层面关注 TTFT 和 TPOT，在线场景 TTFT 需 < 200ms；吞吐层面用 tokens/s 和 QPS，结合 continuous batching 优化；资源效率看 GPU 利用率和显存，用 PagedAttention 减少碎片；质量层面用 perplexity 和下游 benchmark 验证。总结一句：LLM 推理性能是系统级工程，必须根据负载模式（在线/离线、流式/非流式）选择指标权重，并做质量-效率的 trade-off。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说 TTFT 要 < 200ms，但如果模型是 70B 且 batch size 很大，怎么优化？

> 应对策略：分三步。1）**prefill 阶段**：使用 FlashAttention-2 降低计算复杂度，或采用 speculative decoding（如 Medusa）让小模型先输出。2）**KV cache 优化**：用 Multi-Query Attention 减少 cache 大小，或使用 vLLM 的 PagedAttention 减少碎片。3）**系统级**：用 TensorRT-LLM 的 inflight batching 动态调度，避免大 batch 阻塞。实际案例：在 8×A100 上部署 70B 模型，通过 INT8 量化 + FlashAttention-2，TTFT 从 500ms 降到 180ms，但 MMLU 分数下降 0.3%，可接受。

**追问 2**：如何区分性能瓶颈是计算还是带宽？

> 应对策略：用 `nsys profile` 分析 kernel 时间占比。如果 kernel 时间 > 70%，是计算瓶颈；如果 < 30%，是带宽瓶颈。具体方法：1）**计算瓶颈**：增大 batch size 或使用量化（INT8/FP8）。2）**带宽瓶颈**：优化 KV cache 访问（如使用 Grouped-Query Attention），或减少模型层数（如蒸馏）。实际坑：在 decode 阶段，带宽瓶颈常见，因为每个 token 只需少量计算但需加载整个模型权重。

**追问 3**：你说质量指标用 perplexity，但实际部署中用户反馈不好怎么办？

> 应对策略：perplexity 是代理指标，不能完全反映生成质量。1）**增加下游 benchmark**：如 HumanEval（代码）、GSM8K（数学），验证量化/蒸馏是否破坏特定能力。2）**人工评估**：用 A/B 测试对比优化前后的用户满意度。3）**回退机制**：如果质量下降明显，回退到更高精度（FP16），或使用混合精度（如关键层用 FP16，非关键层用 INT8）。实际案例：某公司量化后 MMLU 下降 2%，但用户反馈差，最终采用混合精度方案，只量化 attention 层，保留 FFN 层为 FP16。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提延迟和吞吐，忽略质量指标 → ✅ 必须强调“质量-效率 trade-off”，如量化后 perplexity 上升多少可接受，并用下游 benchmark 验证。
- ❌ 说“用 nvidia-smi 看 GPU 利用率”就完了 → ✅ 要区分 GPU-Util 和实际计算效率，用 `nsys profile` 分析 kernel 时间占比，并给出目标值（> 70%）。
- ❌ 认为 batch size 越大越好 → ✅ 指出 batch size 增大导致 TTFT 线性上升，且受显存限制（KV cache 占用），需用 continuous batching 动态调度。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成”端到端延迟切入，强调 TTFT 对用户体验的影响，并对比不同推理引擎（vLLM vs Ollama）的吞吐差异。
- **如果你只做过传统 NLP**：用“机器翻译的 BLEU 评估”类比 LLM 质量指标，强调 perplexity 和下游 benchmark 的互补性，并展示对量化/蒸馏的理解。
- **如果你是校招无项目**：聚焦论文复现，如“在单卡 A100 上复现 LLaMA-7B 推理，用 vLLM benchmark 测量 TTFT 和 tokens/s，并对比 FlashAttention-2 的加速效果”。
- “LLM Inference Performance: A Survey of Metrics and Optimization Techniques” (arXiv 2024)
- “vLLM: Efficient Memory Management for Large Language Model Serving” (SOSP 2023)
- “TensorRT-LLM: Optimizing LLM Inference on NVIDIA GPUs” (NVIDIA Technical Blog)
- “FlashAttention-2: Faster Attention with Better Parallelism” (arXiv 2023)
- “Speculative Decoding: Fast Generation from Large Language Models” (ICML 2023)

---
