---
slug: enterprise-tk292
no: "1192"
title: "Ref模型的主要作用是防止Actor“训歪”，那么它具体是怎么做到这一点的呢"
question: "Ref模型的主要作用是防止Actor“训歪”，那么它具体是怎么做到这一点的呢"
excerpt: "面试官想考察你对 RLHF（尤其是 PPO）中 KL 散度约束机制的工程级理解，而非背概念。刁钻点在于：很多人知道 Ref 模型是“冻结的旧模型”，但说不清它如何在梯度层面防止 Actor 训歪——比如 KL 惩罚项的具"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3264
updated: "2026-09-29"
---

## Ref模型的主要作用是防止Actor“训歪”，那么它具体是怎么做到这一点的呢

#### 1️⃣ 考察意图

面试官想考察你对 RLHF（尤其是 PPO）中 KL 散度约束机制的**工程级理解**，而非背概念。刁钻点在于：很多人知道 Ref 模型是“冻结的旧模型”，但说不清它如何在梯度层面防止 Actor 训歪——比如 KL 惩罚项的具体计算位置、与 Reward 的融合方式、以及为何能避免“Reward Hacking”。答好了能展示你对 PPO 训练稳定性的实战认知，包括对 KL 散度系数（β）的调参经验、以及 Ref 模型在重要性采样中的辅助作用。

#### 2️⃣ 标准答

**核心机制：KL 散度惩罚项**Ref 模型（π_ref）是训练开始时 Actor（π_θ）的冻结副本，在整个 RLHF 过程中不更新。它的核心作用是在 PPO 目标函数中加入 KL 散度惩罚，限制 Actor 的更新幅度。具体公式为：`目标 = E[ r(x,y) - β * KL(π_θ(y|x) || π_ref(y|x)) ]`其中 β 是 KL 系数（通常 0.01-0.1），控制约束强度。

**计算细节：逐 Token 分布对比**

- 对每个生成序列，Actor 和 Ref 模型分别输出每个 token 的 logits 分布（softmax 后）。
- 计算两个分布间的 KL 散度：`KL = Σ π_θ(t) * log(π_θ(t) / π_ref(t))`，对所有 token 求和或取平均。
- 这个 KL 值作为**负奖励**，直接加到 Reward 模型给出的总奖励上（即 `r_total = r_reward - β * KL`）。
- 在 PPO 的 advantage 计算中，这个修正后的奖励被用于更新 Actor。

**为什么能防止“训歪”？**

- **防止 Reward Hacking**：Reward 模型可能被 Actor 钻空子（如生成语法正确但无意义的重复）。KL 惩罚迫使 Actor 保持与 Ref 模型相似的分布，避免偏离原始语言能力太远。
- **保持多样性**：无约束时，Actor 会坍缩到高奖励的狭窄区域（如只输出“好的”）。KL 惩罚鼓励探索，维持生成多样性。
- **梯度稳定**：Ref 模型提供固定参考点，防止 Actor 因单步更新过大而崩溃。实际训练中，β 值需要动态调整——太小（<0.01）约束不足，太大（>0.1）则 Actor 学不动。

**工程落地坑与解法**

- **坑 1：KL 计算位置**：有人错误地在序列级别计算 KL（如用平均 logits），这丢失了 token 级分布信息。**解法**：必须在每个 token 的 logits 上计算，且使用 softmax 后的概率分布。
- **坑 2：β 的衰减策略**：固定 β 会导致训练后期 Actor 被过度约束。**解法**：采用自适应 KL 控制（如 OpenAI 的 PPO 实现），设定目标 KL 范围（如 0.01-0.05），当实际 KL 超出时动态调整 β。
- **坑 3：Ref 模型的内存开销**：同时加载 Actor 和 Ref 两个模型，显存翻倍。**解法**：使用 LoRA 微调 Actor，Ref 模型用 4-bit 量化加载，或共享主干网络仅保留不同 head。

**补充：重要性采样中的角色**在 PPO 中，Ref 模型还用于计算重要性采样权重（`π_θ / π_ref`），修正 Actor 更新时的分布偏移。但这是次要作用，主要约束仍是 KL 惩罚。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，Ref 模型是冻结的初始 Actor，通过 KL 散度惩罚限制更新幅度，具体在每 token 的 logits 分布上计算 KL 值并作为负奖励加入总奖励。第二，它防止 Reward Hacking 和模式坍缩，保持生成多样性，实际中 β 系数需动态调整。第三，工程上要注意 KL 计算位置和内存优化。总结一句：Ref 模型是 RLHF 的‘安全绳’，确保 Actor 在优化奖励时不偏离语言基础。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果去掉 Ref 模型，只用 KL 散度约束（如 KL(π_θ || π_θ_old)）会怎样？

> 这相当于 PPO 的 clip 机制，但缺少固定参考点。π_θ_old 是旧策略，会随 Actor 更新而漂移，导致约束逐渐失效。Ref 模型是固定锚点，能持续对抗 Reward Hacking。实际实验表明，无 Ref 模型时，Actor 在 10k 步后 perplexity 飙升 30%，生成重复率增加 50%。所以 Ref 模型不可替代。

**追问 2**：KL 散度系数 β 如何调参？有具体策略吗？

> 常用自适应 KL 控制：设定目标 KL 区间（如 0.01-0.05），每 N 步计算实际 KL。若 KL > 上限，β *= 1.2；若 KL < 下限，β /= 1.2。初始 β 通常设为 0.02。另一种策略是线性衰减 β 从 0.1 到 0.001，但需配合 reward 尺度归一化。注意：β 过大（>0.5）会导致 Actor 几乎不更新，过小（<0.001）则约束失效。

**追问 3**：Ref 模型在推理阶段还需要吗？

> 不需要。推理时只用 Actor 生成，Ref 模型只在训练阶段用于计算 KL 惩罚。但注意：如果 Actor 在训练后与 Ref 模型分布差异过大（KL > 0.5），说明训练不稳定，需要回滚 checkpoint 或调整 β。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Ref 模型是 Actor 的副本，用于计算 loss 对比” → ✅ 正确说法：Ref 模型是冻结的初始 Actor，通过 KL 散度惩罚约束更新，而非直接计算 loss 对比。
- ❌ 说“KL 散度在序列级别计算，用平均 logits” → ✅ 正确做法：在每 token 的 logits 分布上计算 KL，使用 softmax 后的概率分布。
- ❌ 说“Ref 模型只用于 KL 惩罚，没有其他作用” → ✅ 补充：Ref 模型还用于 PPO 的重要性采样权重计算，但主要作用仍是约束。

#### 6️⃣ 简历呼应

- **如果你有 RLHF 项目**：从“我在项目中用 Ref 模型控制 KL 散度，β 从 0.05 衰减到 0.01，防止了 Reward Hacking”切入，展示调参细节。
- **如果你只做过传统 NLP**：类比“类似蒸馏中的教师模型，Ref 模型提供稳定分布，防止学生模型过拟合”，强调迁移理解。
- **如果你是校招无项目**：聚焦“我复现了 InstructGPT 论文中的 KL 惩罚机制，用 HuggingFace TRL 库实现，并分析了 β 对生成多样性的影响”，展示论文理解。
- InstructGPT 论文（Training language models to follow instructions with human feedback）
- PPO 原论文（Proximal Policy Optimization Algorithms）
- HuggingFace TRL 库的 PPO 实现文档
- 博客：The KL Divergence in RLHF: Why It Matters and How to Tune It
- 论文：Fine-Tuning Language Models from Human Preferences（KL 惩罚的早期应用）

---
