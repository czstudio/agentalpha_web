---
slug: finetune-tk440
no: "1340"
title: "❓ **Q18：DAPO 对 GRPO 做了哪些改进？（字节最高频）**"
question: "❓ **Q18：DAPO 对 GRPO 做了哪些改进？（字节最高频）**"
excerpt: "这道题考察的是对最新强化学习训练算法的深度理解，属于系统设计 + 工程取舍类型。字节跳动内部大量使用 DAPO 训练推理模型，面试官想确认你是否真正理解 GRPO 的缺陷（如梯度真空、KL 惩罚不稳定），以及 DAPO"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4111
updated: "2026-09-29"
---

## ❓ **Q18：DAPO 对 GRPO 做了哪些改进？（字节最高频）**

`P2` · `llm_training` · **🏢 字节**

🏷 标签：`dapo`, `grpo`, `reinforcement-learning`, `llm-training`, `bytedance`

#### 1️⃣ 考察意图

这道题考察的是对**最新强化学习训练算法**的深度理解，属于**系统设计 + 工程取舍**类型。字节跳动内部大量使用 DAPO 训练推理模型，面试官想确认你是否真正理解 GRPO 的缺陷（如梯度真空、KL 惩罚不稳定），以及 DAPO 如何通过**解耦优势计算**和**动态组大小**等工程优化解决这些问题。答好了能展示：① 对 RL 训练前沿的跟踪能力；② 从数学推导到工程落地的整条链路思考；③ 对字节技术栈的熟悉度。刁钻点在于：不能只背改进点，要解释“为什么这么改”以及“改完带来了什么 trade-off”。

#### 2️⃣ 标准答

DAPO（Decoupled Advantage Policy Optimization）是字节跳动在 2025 年提出的 GRPO 改进版，核心思想是**解耦优势计算与策略更新**，同时保留 GRPO 的组内相对奖励稳定性。主要改进点如下：

#### 1. 引入独立 Critic 网络，解决梯度真空

- **GRPO 的问题**：GRPO 完全依赖组内奖励的均值作为基线，没有独立的价值网络。这导致在奖励稀疏或方差大的任务（如数学推理）中，优势估计不稳定，出现“梯度真空”——策略更新方向噪声大，收敛慢。
- **DAPO 的解法**：引入一个轻量级 Critic 网络（通常与 Policy 共享部分 Transformer 层，仅输出标量值），用 TD(λ) 或 GAE 计算优势。同时，Critic 的损失函数加入组内奖励的均方误差，确保其输出与组内相对奖励对齐。
- **工程取舍**：增加 Critic 带来额外计算开销（约 10-15% 训练时间），但优势估计的方差降低 30-50%，收敛步数减少 20-30%。在字节内部 7B 模型训练中，总训练时间反而缩短。

#### 2. 动态组大小（Dynamic Group Size）

- **GRPO 的固定组大小**：GRPO 对每个 prompt 采样固定数量的响应（如 8 个），但不同 prompt 的奖励分布差异大。简单 prompt 的组内方差小，浪费计算；复杂 prompt 的方差大，需要更多样本。
- **DAPO 的解法**：根据当前策略的奖励方差动态调整组大小。具体公式：`group_size = max(min_size, ceil(var_reward / threshold))`。阈值通过滑动窗口自适应调整。
- **实际落地的坑**：方差计算依赖奖励模型，若奖励模型本身不稳定（如训练初期），组大小会剧烈波动。解法：对奖励模型做 EMA 平滑，并在前 500 步固定组大小为 8。

#### 3. 改进 Clip 机制：自适应 Clip 范围

- **GRPO 的固定 clip**：GRPO 使用固定 clip 范围（如 0.2），但不同训练阶段策略更新幅度不同。早期需要更大 clip 探索，后期需要更小 clip 稳定。
- **DAPO 的解法**：根据 KL 散度动态调整 clip 范围：`clip_range = clip_base * (1 + alpha * (KL_target - KL_current) / KL_target)`。当 KL 过大时缩小 clip，防止策略崩溃；KL 过小时放大 clip，加速探索。
- **为什么这么做**：固定 clip 会导致训练不稳定——clip 太小，策略更新不足；clip 太大，策略漂移。自适应 clip 在字节内部 70B 模型训练中，KL 散度方差降低 40%。

#### 4. 奖励归一化改进：组内 Z-score + 全局 EMA

- **GRPO 的组内归一化**：GRPO 对每组奖励做 Z-score 归一化，但组间奖励尺度差异大（如简单任务奖励 0.9，复杂任务 0.3），导致模型偏向简单任务。
- **DAPO 的解法**：先对全局奖励做 EMA 归一化（消除组间尺度差异），再对组内做 Z-score（保留组内相对排序）。公式：`reward_normalized = (reward - EMA_mean) / EMA_std`，然后组内 Z-score。
- **实际落地的坑**：EMA 的衰减系数需要调参。若衰减太快，归一化不稳定；太慢，无法适应奖励分布变化。经验值：`decay=0.99` 对 7B 模型效果最好。

#### 5. 效果对比

- 在 MATH 数据集上，DAPO 训练的 7B 模型准确率比 GRPO 高 5.2%（从 42.1% 到 47.3%），训练步数减少 25%。
- 在 HumanEval 上，pass@1 提升 3.8%，且训练曲线更平滑（无剧烈震荡）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从五个核心改进层面回答：第一，引入独立 Critic 网络解决 GRPO 的梯度真空问题；第二，动态组大小根据奖励方差自适应调整；第三，自适应 Clip 范围防止策略崩溃；第四，奖励归一化改为全局 EMA + 组内 Z-score 双归一化；第五，这些改进在 MATH 和 HumanEval 上分别带来 5.2% 和 3.8% 的准确率提升。总结一句：DAPO 通过解耦优势计算和动态调整机制，在保持 GRPO 组内相对奖励稳定性的同时，大幅提升了训练效率和最终性能。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：DAPO 引入 Critic 后，训练时间反而缩短，具体是怎么做到的？

> 核心在于收敛步数减少 20-30%，抵消了 Critic 的额外开销。具体：Critic 与 Policy 共享前 80% 的 Transformer 层，仅最后几层独立，参数量增加不到 5%。同时，Critic 的梯度计算可以复用 Policy 的前向结果（通过 checkpointing 技术），额外计算量约 10%。但优势估计更准后，每个 step 的策略更新更有效，总步数从 5000 步降到 3750 步，总训练时间反而减少 15%。

**追问 2**：动态组大小在奖励模型不稳定时怎么处理？

> 两个解法：① 对奖励模型做 EMA 平滑，衰减系数 0.95，减少单次波动；② 前 500 步固定组大小为 8，等奖励模型稳定后再启用动态调整。另外，设置组大小上下限（如 4-16），防止极端情况。在字节内部实践中，这种策略让训练稳定性提升 30%。

**追问 3**：DAPO 和 PPO 相比，优势在哪？

> DAPO 保留了 GRPO 的核心优势：不需要全局奖励模型，仅依赖组内相对奖励，适合在线 RL 训练。而 PPO 需要全局价值网络，且对奖励尺度敏感。DAPO 通过引入轻量级 Critic 解决了 GRPO 的梯度真空，但计算量仍比 PPO 低 20-30%（因为 Critic 更小，且不需要全局优势归一化）。在字节内部，DAPO 是 PPO 和 GRPO 的折中方案——比 PPO 快，比 GRPO 稳。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“DAPO 只是 GRPO 加了个 Critic，其他没变” → ✅ 正确切入：DAPO 的改进是系统性的，包括动态组大小、自适应 Clip、奖励归一化等五个方面，Critic 只是其中之一。
- ❌ 说“DAPO 比 GRPO 快是因为减少了采样数” → ✅ 正确切入：DAPO 的采样数可能更多（动态组大小），但收敛更快，总步数减少。快的原因是优势估计更准，不是采样数减少。
- ❌ 说“DAPO 的 Critic 和 PPO 的 Critic 完全一样” → ✅ 正确切入：DAPO 的 Critic 更轻量（共享大部分参数），且损失函数包含组内奖励对齐项，与 PPO 的独立 Critic 不同。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“奖励模型不稳定”切入，类比 RAG 中检索质量波动对生成的影响，说明 DAPO 的动态组大小如何自适应调整采样策略。
- **如果你只做过传统 NLP**：用“梯度消失”类比 GRPO 的梯度真空问题，说明 DAPO 如何通过 Critic 引入更稳定的梯度信号，类似 Transformer 中的残差连接解决梯度消失。
- **如果你是校招无项目**：聚焦 DAPO 论文中的实验复现，强调在 MATH 和 HumanEval 上的性能对比，展示对 RL 训练流程的完整理解。

#### 7️⃣ 延伸阅读

- DAPO: Decoupled Advantage Policy Optimization for Reinforcement Learning (ByteDance, 2025)
- GRPO: Group Relative Policy Optimization (DeepSeek, 2024)
- PPO: Proximal Policy Optimization Algorithms (Schulman et al., 2017)
- GAE: Generalized Advantage Estimation (Schulman et al., 2015)
- 博客：How ByteDance Optimized RL Training for Reasoning Models (ByteDance Tech Blog, 2025)

---
