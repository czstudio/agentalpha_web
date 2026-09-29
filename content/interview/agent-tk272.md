---
slug: agent-tk272
no: "1172"
title: "Q: 在一个稀疏奖励的 Agent 任务中（例如，只有任务最终成功才有奖励），如何设计 Reward Shaping 或辅助任务来帮助模型学习"
question: "Q: 在一个稀疏奖励的 Agent 任务中（例如，只有任务最终成功才有奖励），如何设计 Reward Shaping 或辅助任务来帮助模型学习"
excerpt: "面试官想考察你能否在强化学习（RL）的稀疏奖励困境中，设计出工程上可行的优化方案。这不是背概念题，而是系统设计 + 工程取舍题。刁钻点在于：你不能只提“加中间奖励”，而要具体到如何避免 Reward Hacking（奖励"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 11
words: 5025
updated: "2026-09-29"
---

## Q: 在一个稀疏奖励的 Agent 任务中（例如，只有任务最终成功才有奖励），如何设计 Reward Shaping 或辅助任务来帮助模型学习

`P1` · `agent_architecture`

🏷 标签：`reinforcement-learning`, `reward-shaping`, `sparse-reward`, `agent`, `curriculum-learning`

#### 1️⃣ 考察意图

面试官想考察你能否在强化学习（RL）的稀疏奖励困境中，设计出工程上可行的优化方案。这不是背概念题，而是**系统设计 + 工程取舍**题。刁钻点在于：你不能只提“加中间奖励”，而要具体到如何避免 Reward Hacking（奖励欺骗）、如何平衡辅助任务与主任务、以及如何在实际 Agent 任务（如机器人操控、网页导航）中落地。答好了能展示你对 RL 训练稳定性的深刻理解，以及从论文到代码的实战能力。

#### 2️⃣ 标准答

稀疏奖励的核心问题是：Agent 在探索初期几乎得不到任何反馈，导致策略梯度消失或方差爆炸。解决方案分三个层面：**Reward Shaping**、**辅助任务**、**课程学习**。

#### 1. Reward Shaping：基于领域知识设计密集信号

- **子目标奖励**：将任务分解为可验证的子步骤。例如，在机器人抓取任务中，每完成“接近物体”、“接触物体”、“抓取成功”各给 +0.1 奖励。关键 trade-off：子目标粒度太细会限制探索，太粗则信号仍稀疏。实践中，用 **Hindsight Experience Replay (HER)** 自动生成子目标：将失败轨迹的最终状态视为虚拟目标，计算与真实目标的距离奖励。坑：HER 在离散动作空间（如网页点击）效果差，因为虚拟目标可能不可达；解法是结合 **Goal-Conditioned RL**，用状态编码器将目标嵌入到连续空间。
- **势能函数（Potential-Based Shaping）**：用 `F(s, s') = γ * Φ(s') - Φ(s)` 形式设计奖励，其中 Φ 是势能函数（如到目标的负距离）。这保证最优策略不变（Ng et al., 1999），避免 Reward Hacking。实际落地：在 MiniGrid 导航任务中，Φ(s) = -L2 距离，Agent 每步获得距离减少的奖励。坑：势能函数需要准确的状态度量，若传感器有噪声（如视觉 SLAM 误差），奖励会震荡；解法是用 **Kalman Filter** 平滑状态估计。
- **探索奖励**：基于状态访问频率的 **Count-Based Exploration**（如 RND，Random Network Distillation）。RND 训练一个预测网络拟合随机网络输出，预测误差大的状态视为新奇，给予奖励。trade-off：RND 在确定性环境中易过拟合，需要配合 **Intrinsic Curiosity Module (ICM)**，用前向动力学模型预测下一状态，误差作为奖励。坑：ICM 在视觉任务中会关注背景噪声而非关键物体；解法是加 **Attention Mask** 或使用 **Contrastive Learning** 的特征空间。

#### 2. 辅助任务：提供密集自监督信号

- **预测下一观测（Next State Prediction）**：在 PPO 的 Actor-Critic 架构中，额外加一个解码器头，预测下一帧图像或状态向量。损失函数用 MSE 或交叉熵。这迫使 Agent 学习环境动力学，加速策略学习。trade-off：预测任务可能占用模型容量，导致主任务性能下降；解法是 **Shared Encoder + Separate Heads**，并动态调整辅助任务权重（如 **GradNorm** 或 **Uncertainty Weighting**）。
- **对比学习（Contrastive Learning）**：用 **SimCLR** 或 **MoCo** 框架，让 Agent 区分“同一轨迹的不同时间步”和“不同轨迹”。例如，在 BabyAI 任务中，正样本对是同一 episode 的连续观测，负样本是随机采样。这能学习到鲁棒的状态表示，尤其适合部分可观测环境（POMDP）。坑：负样本数量不足时，对比损失会 collapse；解法是 **Large Batch Size** 或 **Memory Bank**（存储历史表示）。
- **逆动力学模型（Inverse Dynamics）**：给定 `s_t` 和 `s_{t+1}`，预测动作 `a_t`。这迫使 Agent 理解动作-状态因果关系，常用于 **ICM** 的探索奖励。trade-off：逆模型在动作空间连续时训练不稳定；解法是 **Normalized Action Space** 和 **Tanh 输出层**。

#### 3. 课程学习：从易到难

- **任务难度递增**：先训练 Agent 在简单环境（如 2x2 网格）中完成子目标，再逐步增加复杂度（如 10x10 网格、动态障碍物）。具体实现：用 **Success Rate** 作为阈值，当成功率 > 80% 时自动切换下一难度。坑：难度跳跃太大导致 catastrophic forgetting；解法是 **Progressive Neural Networks** 或 **Elastic Weight Consolidation (EWC)**。
- **奖励缩放**：在课程初期，放大探索奖励（如 RND 权重 0.5），后期逐渐降低至 0.1。这避免 Agent 过早陷入局部最优。trade-off：缩放系数需要手动调参；解法是 **Adaptive Reward Scaling**，基于策略熵或探索率自动调整。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从 Reward Shaping、辅助任务、课程学习三个层面回答。Reward Shaping 层面，我倾向用势能函数加 RND 探索奖励，避免 Reward Hacking；辅助任务层面，用预测下一观测和对比学习提供密集信号，但要注意任务权重平衡；课程学习层面，基于成功率自动调整难度。总结一句：稀疏奖励的核心是把最终成功信号分解为可学习的中间信号，同时用自监督任务稳定训练。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到势能函数保证最优策略不变，但实际中 Reward Shaping 会不会导致 Agent 学会“绕路”拿奖励？

> 会，这是势能函数的常见陷阱。例如，在导航任务中，如果势能函数只基于距离，Agent 可能先远离目标再靠近，以获取更多“距离减少”奖励。解法是：1）用 **Potential-Based Shaping** 的严格形式 `F = γΦ(s') - Φ(s)`，确保奖励总和与路径无关；2）结合 **Subgoal Verification**，只对完成原子子目标（如“到达门”而非“靠近门”）给奖励；3）在训练中监控 **Reward Hacking 指标**（如奖励与步数的相关性），若发现异常，降低 shaping 权重。

**追问 2**：辅助任务和主任务如何平衡？比如预测下一观测的损失权重设多少？

> 没有固定值，但推荐动态调整。实践中，用 **Uncertainty Weighting**（Kendall et al., 2018）：假设每个任务的损失服从高斯分布，通过可学习的噪声参数 σ 自动调整权重。公式：`L_total = L_main / σ_main^2 + L_aux / σ_aux^2 + log(σ_main * σ_aux)`。初始时 σ_main 大，主任务权重低；随着训练，σ_main 减小，主任务主导。另一种方法是 **GradNorm**：计算各任务梯度范数，反向传播时缩放梯度，使所有任务梯度范数接近。坑：动态调整增加计算开销；解法是每 N 步更新一次权重。

**追问 3**：如果任务没有可分解的子目标（如开放式对话），怎么设计 Reward Shaping？

> 这种情况下，依赖 **Exploration-Based Shaping**。例如，用 **RND** 或 **ICM** 的探索奖励作为唯一中间信号。具体做法：1）训练一个 **Dynamics Model**，预测状态转移；2）Agent 每步获得预测误差奖励；3）主任务成功时给大奖励（如 +10）。trade-off：探索奖励可能鼓励 Agent 做无意义动作（如原地旋转）；解法是加 **Entropy Regularization** 或 **Action Penalty**（如每步 -0.01）。另外，可以用 **LLM 作为 Reward Model**：让 GPT-4 评估 Agent 的中间行为是否合理，输出分数作为奖励。坑：LLM 推理延迟高；解法是异步调用或离线预计算。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“直接给每一步一个小的正奖励，比如每走一步 +0.01” → ✅ 正确切入：这会导致 Agent 学会原地踏步拿奖励，必须用势能函数或子目标验证来避免 Reward Hacking。
- ❌ 说“用 HER 自动生成目标，不需要手动设计” → ✅ 正确切入：HER 在连续空间有效，但在离散动作空间（如网页导航）中，虚拟目标可能不可达，需要结合 Goal-Conditioned RL 或状态编码器。
- ❌ 说“辅助任务越多越好，比如同时预测下一观测、动作、奖励” → ✅ 正确切入：多任务会竞争模型容量，导致主任务性能下降。必须用动态权重（如 Uncertainty Weighting）或 GradNorm 平衡。

#### 6️⃣ 简历呼应

- **如果你有 RL 项目经验**：从“在 XX 环境中用 PPO + RND 解决稀疏奖励”切入，具体描述子目标分解和势能函数设计，强调你如何通过监控学习曲线避免 Reward Hacking。
- **如果你只做过 NLP/LLM Agent**：用“LLM 作为 Reward Model”类比，说明你如何将对话任务分解为子目标（如信息收集、确认），并用 GPT-4 评分作为中间奖励，同时用对比学习增强状态表示。
- **如果你是校招无项目**：聚焦 MiniGrid 或 BabyAI 的论文复现，展示你理解 HER 和 ICM 的原理，并能在 PyTorch 中实现一个简单的 PPO + 辅助任务 demo，强调你对比了不同 shaping 方案的成功率。

#### 7️⃣ 延伸阅读

- Ng, A. Y., Harada, D., & Russell, S. (1999). Policy invariance under reward transformations: Theory and application to reward shaping.
- Andrychowicz, M., et al. (2017). Hindsight Experience Replay.
- Burda, Y., et al. (2018). Exploration by Random Network Distillation.
- Pathak, D., et al. (2017). Curiosity-driven Exploration by Self-Supervised Prediction.
- Kendall, A., et al. (2018). Multi-Task Learning Using Uncertainty to Weigh Losses for Scene Geometry and Semantics.

---
