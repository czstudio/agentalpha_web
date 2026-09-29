---
slug: enterprise-tk631
no: "1531"
title: "| Q65 | What is continuous batching, and how does it differ from static batching"
question: "| Q65 | What is continuous batching, and how does it differ from static batching"
excerpt: "面试官想考察你对 LLM 推理引擎底层调度机制的理解深度，而非简单背概念。这是典型的“工程取舍+系统设计”题，刁钻点在于：static batching 看似简单高效，但实际生产环境（变长请求、流式输出）下会导致 GPU"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4479
updated: "2026-09-29"
---

## | Q65 | What is continuous batching, and how does it differ from static batching

#### 1️⃣ 考察意图

面试官想考察你对 LLM 推理引擎底层调度机制的理解深度，而非简单背概念。这是典型的“工程取舍+系统设计”题，刁钻点在于：static batching 看似简单高效，但实际生产环境（变长请求、流式输出）下会导致 GPU 利用率急剧下降。答好了能展示你对吞吐（throughput）、延迟（latency）、显存碎片（memory fragmentation）三者 trade-off 的掌控力，以及是否读过 vLLM、TensorRT-LLM 等框架的核心论文。

#### 2️⃣ 标准答

**定义与核心差异**

- **Static batching**：在推理开始前，将一批请求固定打包，所有请求必须同步完成生成（即最长的请求决定整个 batch 的结束时间）。每个 step 执行相同的 forward pass，直到所有序列生成完毕。
- **Continuous batching**：在推理过程中，每个 decoder step 结束后动态调整 batch。已完成的请求立即移除，新到达的请求可以插入，实现“iteration-level scheduling”。

**为什么 static batching 在 LLM 场景下低效？**

- **气泡问题**：假设 batch 中有 4 个请求，生成长度分别为 [10, 50, 100, 200] tokens。static batching 需要 200 个 step，前 10 步后 3 个请求还在跑，但 GPU 计算量不变（因为 batch size 固定），导致大量无效计算。实际吞吐可能只有理论峰值的 30%-50%。
- **显存浪费**：每个请求的 KV cache 必须预分配最大长度（如 2048 tokens），即使实际只用 10 tokens。这导致显存利用率低，batch size 受限。

**Continuous batching 的实现机制**

- **核心调度**：每个 decoder step 结束后，调度器检查所有序列状态：
- 已完成（EOS 触发或达到 max_tokens）→ 释放 KV cache，移除出 batch。
- 新请求（来自 prefill 队列）→ 插入 batch，但需注意 prefill 和 decode 的计算特性不同（prefill 是 compute-bound，decode 是 memory-bound），通常分开处理或使用混合调度。
- **显存管理**：vLLM 的 PagedAttention 是关键——将 KV cache 分页管理，类似操作系统的虚拟内存。每个请求只分配实际需要的 page，而非预分配整个序列。这减少了内部碎片，支持更大的 batch。
- **代价**：调度开销增加（每个 step 需要 O(batch_size) 的检查），且显存管理复杂度上升（需要处理 page 的分配、释放、重映射）。但通常收益远大于开销。

**实际落地的坑 + 解法**

- **坑 1：prefill 与 decode 的混合调度**。如果新请求的 prefill 和已有请求的 decode 混在一个 batch 中，prefill 的 compute-bound 特性会拖慢 decode 的 memory-bound 操作，导致 decode 延迟飙升。
- **解法**：使用“split-fuse”或“chunked prefill”策略，将长 prefill 拆成多个 chunk，穿插在 decode step 中执行，平衡计算负载。TensorRT-LLM 的 in-flight batching 就采用类似思路。
- **坑 2：显存碎片**。PagedAttention 虽然减少内部碎片，但频繁的 page 分配/释放会导致外部碎片。
- **解法**：使用 buddy allocator 或 slab allocator 管理 page 池，并定期做 defragmentation（如 vLLM 的 swap 机制）。

**工程取舍总结**

- **Static batching**：实现简单，适合请求长度均匀、无流式输出的离线场景（如批量文本分类）。但生产环境（变长、流式）下吞吐低。
- **Continuous batching**：吞吐提升 2-5 倍（【通用知识】vLLM 论文在 ShareGPT 数据集上测得 2-4 倍提升），但增加了调度和显存管理的复杂度。适合在线推理服务（如聊天机器人、代码补全）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，定义层面，static batching 固定 batch 同步结束，continuous batching 每个 step 动态调整。第二，效率层面，static batching 在变长请求下产生大量气泡和显存浪费，continuous batching 通过 iteration-level scheduling 和 PagedAttention 提升 GPU 利用率。第三，工程取舍，continuous batching 吞吐更高但调度开销大，适合在线服务；static batching 实现简单，适合离线批量处理。总结一句：continuous batching 是 LLM 推理引擎的标配，核心在于用调度复杂度换取吞吐。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：Continuous batching 如何与 speculative decoding 结合？

> 两者目标不同：continuous batching 提升吞吐，speculative decoding 降低延迟。结合时，speculative decoding 的 draft model 和 target model 都需要支持 continuous batching。关键坑是：draft model 生成的 draft tokens 可能被拒绝，导致 batch 中部分序列需要回滚。解法：在调度器中增加“rollback”状态，回滚时释放对应 KV cache 并重新插入 prefill 队列。vLLM 的 spec_decode 模块就实现了这种机制。

**追问 2**：如果请求长度分布极不均匀（如 90% 短请求，10% 长请求），continuous batching 的优势会减弱吗？

> 不会减弱，反而更强。因为短请求快速完成，释放的 slot 立即被新请求填充，batch 始终保持高密度。但需要注意：长请求会持续占用显存，可能导致短请求的 prefill 被阻塞。解法：设置 max_batch_size 和 max_tokens 的联合限制，或使用“优先级调度”让短请求优先完成（类似 SJF 调度算法）。

**追问 3**：Continuous batching 在 multi-GPU 场景下如何扩展？

> 主要挑战是跨 GPU 的 KV cache 同步。如果使用 tensor parallelism，每个 GPU 持有部分 KV cache，continuous batching 的调度需要全局一致。解法：使用“global scheduler”统一管理所有 GPU 的 batch，每个 step 广播调度决策。但通信开销会随 GPU 数量增长。实际工程中，更常用“micro-batch”策略：每个 GPU 独立运行 continuous batching，通过负载均衡器分发请求。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“continuous batching 就是动态调整 batch size，比 static 好” → ✅ 必须点出“iteration-level scheduling”和“PagedAttention”两个具体机制，并说明 trade-off（调度开销 vs 吞吐提升）。
- ❌ 说“static batching 完全没用” → ✅ 承认 static batching 在请求长度均匀、无流式输出的离线场景下更简单高效（如批量文本分类），体现工程判断力。
- ❌ 混淆“continuous batching”和“dynamic batching”（后者指在推理前合并多个请求，但推理过程中 batch 固定） → ✅ 明确区分：dynamic batching 是 server-level 的请求合并，continuous batching 是 iteration-level 的调度。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“RAG 中检索结果长度差异大，导致生成阶段变长”切入，说明 continuous batching 如何提升 RAG 服务的吞吐。可提你实测的吞吐提升数据（如 2.3x）。
- **如果你只做过传统 NLP**：用“传统 NLP 的 batch 处理（如 BERT 分类）是 static，因为输出长度固定”类比，对比 LLM 生成场景的变长特性，展示迁移能力。
- **如果你是校招无项目**：聚焦 vLLM 论文复现 demo，说明你理解 PagedAttention 和 iteration-level scheduling 的实现细节，并提你跑过 ShareGPT 数据集对比实验。
- vLLM: Efficient Memory Management for Large Language Model Serving with PagedAttention (OSDI 2023)
- TensorRT-LLM: In-flight Batching and PagedAttention Implementation (NVIDIA 技术博客)
- Orca: A Distributed Serving System for Transformer-Based Generative Models (OSDI 2022)
- Splitwise: Efficient LLM Inference with Chunked Prefill (2024)
- FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness (NeurIPS 2022)

---
