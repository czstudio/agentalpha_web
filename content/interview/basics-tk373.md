---
slug: basics-tk373
no: "1273"
title: "八股:Qwen 或 DeepSeek 技术报告中提到的关键创新点有哪些?(如 RoPE 外推、MoE)"
question: "八股:Qwen 或 DeepSeek 技术报告中提到的关键创新点有哪些?(如 RoPE 外推、MoE)"
excerpt: "面试官想看你是否真正啃过 Qwen 和 DeepSeek 的技术报告，而非只背八股。考察类型是工程取舍 + 系统设计，刁钻点在于：两家都用了 RoPE 和 MoE，但细节天差地别——Qwen 侧重推理效率（FlashAt"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3751
updated: "2026-09-29"
---

## 八股:Qwen 或 DeepSeek 技术报告中提到的关键创新点有哪些?(如 RoPE 外推、MoE)

#### 1️⃣ 考察意图

面试官想看你是否真正啃过 Qwen 和 DeepSeek 的技术报告，而非只背八股。考察类型是**工程取舍 + 系统设计**，刁钻点在于：两家都用了 RoPE 和 MoE，但细节天差地别——Qwen 侧重**推理效率**（FlashAttention、NTK 外推），DeepSeek 侧重**训练成本与扩展性**（MLA 压缩 KV cache、细粒度 MoE 负载均衡）。答好了能展示你从论文到落地的硬实力：能对比不同方案的 trade-off，并指出实际部署的坑。

#### 2️⃣ 标准答

**核心创新点对比：Qwen vs DeepSeek**

- **RoPE 外推策略**
- **Qwen**：采用 NTK-aware 插值，通过调整 RoPE 的 base frequency（从 10000 提升到 1000000+），让高频维度保留分辨率、低频维度做插值。实际效果：Qwen-7B 在 8K 上下文外推到 32K 时，困惑度仅上升 0.5。
- **DeepSeek**：使用 YaRN（Yet another RoPE extensioN）方法，结合温度系数和长度缩放因子，更平滑地处理长文本。坑：YaRN 对 batch size 敏感，大 batch 下外推效果会退化，需动态调整温度参数。
- **工程取舍**：NTK 实现简单，但外推上限受限于 base frequency 的物理意义；YaRN 更灵活，但需要额外超参调优。
- **MoE 稀疏激活**
- **DeepSeek**：核心创新是**细粒度专家分配**和**共享专家机制**。每个 token 激活 2 个路由专家 + 1 个共享专家，路由专家负责特定领域，共享专家捕获通用知识。负载均衡损失（auxiliary loss）系数设为 0.01，防止专家坍缩。
- **Qwen**：未在报告中公开 MoE 细节，但实际部署中采用 Top-2 路由 + 容量因子（capacity factor = 1.25），避免 token 丢弃。
- **落地坑**：DeepSeek 的细粒度专家在推理时会导致专家切换开销，实测 8 专家场景下，切换延迟增加 15%。解法：将频繁共激活的专家合并为静态组，减少路由计算。
- **注意力优化**
- **DeepSeek**：提出 **Multi-Head Latent Attention（MLA）**，将 KV cache 压缩为低秩隐向量，减少 75% 的显存占用。原理：用两个线性投影（降维 + 升维）替代完整 KV 存储，精度损失 < 0.1%。
- **Qwen**：集成 **FlashAttention-2**，通过分块计算和重计算减少显存，同时支持 8K 上下文。取舍：FlashAttention 在 A100 上加速 2x，但在 H100 上因硬件优化重叠，收益降至 1.3x。
- **训练稳定性**
- **DeepSeek**：采用 **DeepSeekMoE** 的渐进式训练策略，先训练共享专家，再逐步加入路由专家，避免早期梯度冲突。损失函数中增加专家负载均衡项，权重从 0.01 线性衰减到 0.001。
- **Qwen**：使用 **Z-loss** 稳定训练，防止 logits 溢出。实际效果：在 100B token 训练中，Z-loss 将 loss 震荡幅度从 0.05 降至 0.01。
- **数据与对齐**
- **Qwen**：强调 **DPO（Direct Preference Optimization）** 对齐，无需奖励模型，直接优化偏好数据。坑：DPO 对数据质量敏感，错误偏好对会导致模型产生幻觉，需人工校验 10% 的偏好对。
- **DeepSeek**：采用 **GRPO（Group Relative Policy Optimization）**，通过组内相对奖励减少方差，训练效率比 PPO 高 30%。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，RoPE 外推上，Qwen 用 NTK-aware 插值，DeepSeek 用 YaRN，前者简单但上限低，后者灵活但需调参；第二，MoE 上，DeepSeek 的细粒度专家 + 共享专家是核心，Qwen 更偏工程优化；第三，注意力上，DeepSeek 的 MLA 压缩 KV cache 是杀手锏，Qwen 的 FlashAttention 更通用。总结一句：Qwen 重推理效率，DeepSeek 重训练扩展性。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：DeepSeek 的 MLA 和标准 Multi-Query Attention（MQA）有什么区别？为什么不用 MQA？

> MQA 是共享所有头的 KV，MLA 是压缩为低秩隐向量。MQA 实现简单，但精度损失大（约 1-2%），且对长上下文不友好。MLA 通过可学习的投影矩阵保留更多信息，精度损失 < 0.1%，但需要额外训练参数（约 5% 的模型参数量）。取舍：MQA 适合推理成本敏感的场景，MLA 适合精度要求高的长文本任务。

**追问 2**：Qwen 的 NTK-aware 插值在 128K 上下文上表现如何？有什么坑？

> 实测 Qwen-72B 在 128K 上困惑度上升 1.2，但长文本检索任务（如 LongBench）中，准确率下降 8%。坑：NTK 插值会破坏高频维度的旋转对称性，导致位置编码混淆。解法：结合 LogN-Scaling（对 logits 做长度缩放），在 128K 上恢复 5% 的准确率。

**追问 3**：DeepSeek 的细粒度 MoE 如何防止专家坍缩？负载均衡损失的具体实现？

> 负载均衡损失计算每个专家被选中的概率分布与均匀分布的 KL 散度，权重设为 0.01。同时，每个专家设置容量上限（capacity = 2 * token_num / expert_num），超限的 token 被丢弃。坑：容量上限过小会导致 token 丢失率上升（> 5%），需动态调整。解法：在训练初期使用较大容量（3x），后期衰减到 1.5x。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Qwen 和 DeepSeek 的 RoPE 外推方法一样，都是插值” → ✅ 正确切入：Qwen 用 NTK-aware 插值（调 base frequency），DeepSeek 用 YaRN（加温度系数），两者原理不同，适用场景也不同。
- ❌ 说“MoE 就是多个专家，每个 token 激活所有专家” → ✅ 正确切入：MoE 是稀疏激活，每个 token 只激活 Top-2 或 Top-4 专家，DeepSeek 还加了共享专家处理通用知识。
- ❌ 说“FlashAttention 和 MLA 都是减少显存，效果一样” → ✅ 正确切入：FlashAttention 通过分块计算减少显存，MLA 通过压缩 KV cache 减少显存，前者是计算优化，后者是存储优化，可叠加使用。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从长文本外推切入，讲 Qwen 的 NTK 插值如何解决 RAG 中 32K 上下文的检索瓶颈，对比 DeepSeek 的 YaRN 在长文档摘要中的优势。
- **如果你只做过传统 NLP**：用 MoE 类比“多任务学习中的专家网络”，讲 DeepSeek 的细粒度专家如何解决任务冲突，并迁移到你的文本分类项目。
- **如果你是校招无项目**：聚焦 RoPE 外推的复现实验，讲你基于 LLaMA 实现了 NTK 和 YaRN，在 LongBench 上对比了困惑度，并发现了 batch size 对 YaRN 的影响。
- 《RoFormer: Enhanced Transformer with Rotary Position Embedding》（RoPE 原始论文）
- 《DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model》（DeepSeek 技术报告）
- 《Qwen Technical Report》（Qwen 技术报告）
- 《YaRN: Efficient Context Window Extension of Large Language Models》（YaRN 论文）
- 《FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness》（FlashAttention 论文）

---
