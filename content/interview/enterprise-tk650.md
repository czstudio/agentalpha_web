---
slug: enterprise-tk650
no: "1550"
title: "| Q112 | In the context of LLM pretraining, what is scaling law"
question: "| Q112 | In the context of LLM pretraining, what is scaling law"
excerpt: "面试官想考察你是否真正理解 LLM 预训练的核心规律，而非仅背诵“参数越多越好”。这是典型的工程取舍 + 概念理解题，刁钻点在于：能否区分 Kaplan scaling law（模型优先）与 Chinchilla sca"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3437
updated: "2026-09-29"
---

## | Q112 | In the context of LLM pretraining, what is scaling law

#### 1️⃣ 考察意图

面试官想考察你是否真正理解 LLM 预训练的核心规律，而非仅背诵“参数越多越好”。这是典型的**工程取舍 + 概念理解**题，刁钻点在于：能否区分 Kaplan scaling law（模型优先）与 Chinchilla scaling law（数据优先）的差异，并解释背后的 trade-off。答好了能展示你对训练效率、计算预算分配和实际落地坑的深度认知，证明你不是只会调参的“炼丹师”。

#### 2️⃣ 标准答

**定义与核心公式**Scaling law 描述 LLM 预训练中，模型性能（通常用交叉熵 loss 衡量）与三个关键变量——模型参数量 N、训练数据量 D、计算预算 C——之间的幂律关系。核心公式可简化为：`L(N, D) ≈ a/N^α + b/D^β + c`，其中 a、b、c 为常数，α、β 为幂指数（通常 0.1-0.5）。这意味着增加 N 或 D 都能降低 loss，但收益递减。

**两大经典发现：Kaplan vs. Chinchilla**

- **Kaplan scaling law（OpenAI, 2020）**：在固定计算预算 C 下，模型性能主要受限于参数量 N，数据量 D 可以相对少。结论是“模型越大越好，数据够用就行”，典型例子是 GPT-3（175B 参数，训练 300B tokens）。
- **工程取舍**：优先扩模型，但会导致欠训练——模型容量大但数据不足，参数利用率低。
- **Chinchilla scaling law（DeepMind, 2022）**：重新实验发现，在固定 C 下，N 和 D 应等比例缩放，即每增加 1 倍参数，数据量也应增加 1 倍。结论是“模型和数据要同步增长”，典型例子是 Chinchilla（70B 参数，训练 1.4T tokens），在相同计算预算下性能优于 GPT-3。
- **实际落地的坑**：很多人直接套 Kaplan 法则，导致模型过参数化（如训练 13B 模型只用了 100B tokens），loss 降不下去。解法是先用小规模实验（如 1B 参数）拟合 scaling curve，确定最优 N/D 比例，再放大。

**实践意义与局限性**

- **指导训练决策**：给定计算预算（如 1e23 FLOPs），用 Chinchilla 公式 `C ≈ 6ND`（前向+反向计算量）反推最优 N 和 D。例如，预算对应 70B 参数 + 1.4T tokens，而非 175B + 300B。
- **局限性**：

1. **饱和效应**：当 loss 接近数据集的熵下限（如自然语言的理论最小 loss），scaling law 会失效。例如，在 C4 数据集上训练到 1e25 FLOPs 后，收益几乎为零。
2. **任务差异**：推理、数学等复杂任务可能不遵循幂律，需要额外 scaling（如 chain-of-thought 数据）。
3. **计算假设**：公式假设训练数据是独立同分布的，但实际数据有重复和噪声，导致 scaling 曲线偏移。

**关键工具与论文**

- 论文：Scaling Laws for Neural Language Models（Kaplan et al., 2020）、Training Compute-Optimal Large Language Models（Hoffmann et al., 2022）。
- 工具：用 `flop_count` 估算计算量，用 `wandb` 记录 loss 曲线，拟合幂律函数（如 `scipy.optimize.curve_fit`）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、两大经典发现、实践意义三个层面回答。定义上，scaling law 是 loss 与参数量、数据量、计算量之间的幂律关系。经典发现包括 Kaplan 法则（模型优先）和 Chinchilla 法则（等比例缩放），后者更优。实践上，用公式 C ≈ 6ND 反推最优参数和数据量，但要注意饱和效应和任务差异。总结一句：scaling law 是训练预算分配的指南针，但需结合实验验证。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果计算预算翻倍，你应该优先增加模型还是数据？

> 根据 Chinchilla 法则，应等比例增加。假设原预算对应 70B 参数 + 1.4T tokens，翻倍后最优是 100B 参数 + 2T tokens（约 1.4 倍缩放）。但若原模型已欠训练（如 loss 仍高），优先加数据；若数据已饱和（如重复率高），优先扩模型。实际中，我会先跑小规模实验（如 1B 参数）拟合 scaling curve，再决策。

**追问 2**：Scaling law 在超大规模下会失效吗？如何应对？

> 会。当 loss 接近数据集的熵下限（如 2.5 nats），继续 scaling 收益微乎其微。应对方法：1）用高质量数据（如过滤噪声、去重）降低熵下限；2）引入新任务（如代码、数学）改变数据分布；3）采用 MoE 架构，在不显著增加计算量下提升容量。例如，Mixtral 8x7B 用 MoE 在相同 FLOPs 下达到 70B 性能。

**追问 3**：你如何验证自己训练的模型遵循 scaling law？

> 我会在 1B-10B 参数范围内训练 5-7 个模型，固定数据量（如 100B tokens），记录 loss 和 FLOPs。然后拟合幂律函数，检查 R² 是否 > 0.95。若偏离，可能原因：1）数据重复率高（用 MinHash 去重）；2）学习率调度不当（用 cosine 衰减）；3）模型架构差异（如 RoPE 位置编码影响收敛）。最后，用 Chinchilla 公式反推最优 N/D，对比实际结果。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Scaling law 就是模型越大越好，数据越多越好” → ✅ 正确切入：强调 trade-off，即固定计算预算下模型和数据需等比例缩放，否则会过参数化或欠训练。
- ❌ 只提 Kaplan 法则，忽略 Chinchilla → ✅ 正确切入：对比两者差异，指出 Chinchilla 更优，并解释为什么（数据利用率更高）。
- ❌ 认为 scaling law 是绝对真理，适用于所有任务 → ✅ 正确切入：指出局限性（饱和、任务差异），并给出应对策略（高质量数据、MoE）。

#### 6️⃣ 简历呼应

- **如果你有 LLM 预训练项目**：从“如何用 scaling law 指导训练预算分配”切入，举例你如何用 Chinchilla 公式反推最优参数和数据量，并对比 Kaplan 法则的差异。
- **如果你只做过 NLP 微调**：用“迁移类比”切入，说“微调中 scaling law 体现为数据量和模型大小的关系，类似预训练但更关注任务特定数据”。
- **如果你是校招无项目**：聚焦“复现 Chinchilla 实验”的 demo，描述你如何在小规模（1B 参数）拟合 scaling curve，并可视化结果，展示对论文的理解。
- Scaling Laws for Neural Language Models（Kaplan et al., 2020）
- Training Compute-Optimal Large Language Models（Hoffmann et al., 2022）
- Scaling Data-Constrained Language Models（Muennighoff et al., 2023）
- Efficient Large-Scale Language Model Training on GPU Clusters（NVIDIA 技术博客）
- The Flop Counting Cookbook（EleutherAI 博客）

---
