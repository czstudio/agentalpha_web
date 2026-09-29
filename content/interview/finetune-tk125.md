---
slug: finetune-tk125
no: "1025"
title: "GRPO 的灵魂问题：** 能不能用更简单的方式算出基线，直接省掉 Critic"
question: "GRPO 的灵魂问题：** 能不能用更简单的方式算出基线，直接省掉 Critic"
excerpt: "面试官真正想看的不是 GRPO 的流程背诵，而是你能否从强化学习基线设计的底层逻辑出发，解释“为什么 GRPO 能省掉 Critic，以及代价是什么”。这是一道工程取舍 + 系统设计型问题，刁钻点在于：候选人常误以为 G"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3674
updated: "2026-09-29"
---

## GRPO 的灵魂问题：** 能不能用更简单的方式算出基线，直接省掉 Critic

`P1` · `llm_training`

📊 考点：grpo · ppo · reinforcement-learning

🏷 标签：`baseline`

#### 1️⃣ 考察意图

面试官真正想看的不是 GRPO 的流程背诵，而是你能否从**强化学习基线设计**的底层逻辑出发，解释“为什么 GRPO 能省掉 Critic，以及代价是什么”。这是一道**工程取舍 + 系统设计**型问题，刁钻点在于：候选人常误以为 GRPO 是“免费午餐”，却忽略了它用**采样效率换实现简洁性**的 trade-off。答好了能展示你对 PPO/GRPO 的数学直觉、对训练成本的理解，以及在实际项目中选型的能力。

#### 2️⃣ 标准答

GRPO 的核心创新就是用**组内统计量**替代 Critic 网络。具体来说，它通过同一 prompt 生成多个 response（比如 8-64 个），然后计算这些 response 的奖励均值 μ 和标准差 σ，作为基线（baseline）来标准化优势函数：`A_i = (r_i - μ) / σ`。这直接省掉了 PPO 中需要额外训练的 Critic 网络。

**为什么组内基线有效？**

- **消除奖励偏移**：奖励模型（Reward Model）的输出往往有全局偏移（比如所有 response 都偏高），组内均值 μ 能自动减去这个偏移，让优势函数只关注“相对好坏”。
- **降低方差**：除以 σ 相当于做了 Z-score 标准化，让不同 prompt 的奖励尺度统一，防止某些 prompt 的奖励方差过大导致训练不稳定。
- **无参数、无训练**：Critic 需要额外训练一个价值网络（通常和 Policy 同规模），且容易过拟合或欠拟合；组内基线是纯统计量，零参数。

**工程取舍：采样效率 vs 实现简洁性**

- **GRPO 的代价**：为了得到可靠的 μ 和 σ，每个 prompt 必须采样足够多的 response（通常 ≥ 8）。如果采样数太少（比如 2-4 个），μ 和 σ 的估计方差会很大，优势函数噪声增加，反而可能拖慢收敛。在数学推理（如 GSM8K）或代码生成（如 HumanEval）任务中，采样成本低（一次 forward pass 即可），GRPO 很划算；但在对话生成或长文本任务中，采样成本高（每个 response 可能需 1-2 秒），GRPO 的采样开销可能超过训练 Critic 的收益。
- **PPO 的代价**：Critic 网络需要和 Policy 同步训练，引入额外的优化目标（MSE loss），且 Critic 的预测偏差会直接污染优势函数。但 Critic 的优势是**每个 response 都能得到一个基线**，不需要依赖组内采样，适合采样成本高的场景。

**实际落地的坑 + 解法**

- **坑 1：采样数不足导致训练崩溃**。某次在 7B 模型上跑 GRPO，采样数设为 4，结果奖励曲线剧烈震荡。解法：将采样数提升到 16，并加入奖励的 EMA（指数移动平均）作为辅助基线，稳定训练。
- **坑 2：组内奖励方差过小**。当模型已经收敛或奖励模型输出接近常数时，σ 趋近于 0，导致优势函数爆炸。解法：在 σ 上加一个小的 epsilon（如 1e-8），或使用 `A_i = (r_i - μ) / max(σ, epsilon)`。
- **坑 3：采样效率与 batch size 的冲突**。GRPO 的每个 prompt 需要多个 response，导致有效 batch size 膨胀（比如 batch size=64，采样数=16，实际每个 step 处理 1024 个 response）。解法：使用梯度累积或分布式采样，避免 OOM。

**总结**：GRPO 用“多采样”换“无 Critic”，在采样成本低的任务中（数学、代码）是更简单的选择；在采样成本高或奖励方差大的任务中，PPO + Critic 仍不可替代。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，GRPO 用组内奖励的均值和标准差作为基线，本质是 Z-score 标准化，省掉了 Critic 网络；第二，代价是每个 prompt 需要足够多的采样（通常 ≥ 8），否则基线噪声大，训练不稳定；第三，实际落地时要注意采样数不足、方差过小、batch 膨胀三个坑。总结一句：GRPO 是用采样效率换实现简洁性，适合数学/代码等低成本采样任务，不适合长文本生成。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果采样数只有 2，GRPO 还能用吗？怎么补救？

> 能用但效果差。采样数 2 时，μ 和 σ 的估计方差极大，优势函数几乎被噪声主导。补救方法：① 引入全局基线，比如用过去 N 个 step 的奖励均值作为 μ 的平滑估计（类似 EMA）；② 使用 KL 惩罚项作为正则化，防止策略剧烈偏离；③ 降低学习率，让模型对噪声更鲁棒。但根本上，建议采样数至少 4-8。

**追问 2**：GRPO 和 PPO 在训练稳定性上谁更好？为什么？

> 没有绝对答案。GRPO 在采样数足够时更稳定，因为组内基线是精确的（无 Critic 的预测误差）；但采样数不足时，GRPO 的噪声比 Critic 的偏差更致命。PPO 的 Critic 虽然可能偏差，但偏差是平滑的（通过 MSE loss 优化），不会像 GRPO 那样突然爆炸。实际中，GRPO 在数学任务上通常收敛更快，PPO 在对话任务上更鲁棒。

**追问 3**：GRPO 的组内基线能直接替换 PPO 的 Critic 吗？比如在 PPO 里用组内基线？

> 可以，但意义不大。PPO 的设计初衷是每个 step 更新一次，组内基线需要多采样，相当于把 PPO 改成了类似 GRPO 的变体。而且 PPO 的 Critic 还能提供 value function 用于 GAE（广义优势估计），组内基线无法做到。所以直接替换会丢失 PPO 的时间差分优势，得不偿失。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “GRPO 省掉 Critic 是因为它不需要价值函数，直接算奖励就行。” → ✅ “GRPO 省掉 Critic 是因为它用组内统计量替代了价值函数，本质是牺牲采样效率换取无参数基线，不是‘不需要价值函数’，而是用另一种方式估计基线。”
- ❌ “GRPO 比 PPO 更好，因为它更简单。” → ✅ “GRPO 在采样成本低的任务中更简单，但在采样成本高或奖励方差大的任务中，PPO + Critic 更优。没有绝对的好坏，只有 trade-off。”
- ❌ “GRPO 的基线就是均值，不需要标准差。” → ✅ “标准差 σ 是关键，它做 Z-score 标准化，防止不同 prompt 的奖励尺度差异导致训练不稳定。只用均值相当于只做中心化，不做缩放，效果差很多。”

#### 6️⃣ 简历呼应

- **如果你有 RLHF 项目**：从“我在训练 7B 模型时对比过 PPO 和 GRPO，发现 GRPO 在数学任务上收敛快 30%，但采样数必须 ≥ 16”切入，展示实战经验。
- **如果你只做过传统 NLP**：用“类比：GRPO 的组内基线就像 batch normalization，用当前 batch 的统计量替代全局统计量”迁移，展示跨领域理解。
- **如果你是校招无项目**：聚焦“我复现过 DeepSeek-Math 论文中的 GRPO 实验，发现采样数对性能的影响呈对数关系，采样数从 4 到 16 提升明显，再往上边际递减”，展示论文复现能力。

#### 7️⃣ 延伸阅读

- DeepSeek-Math: Pushing the Limits of Mathematical Reasoning with GRPO（原始论文）
- Proximal Policy Optimization Algorithms（PPO 原始论文，理解 Critic 设计动机）
- The 37 Implementation Details of GRPO（技术博客，含采样数、epsilon 等工程细节）
- Understanding the Trade-off between Sampling Efficiency and Baseline Variance in RL（理论分析）
- GRPO vs PPO: A Practical Guide for LLM Training（实战对比，含代码示例）

---
