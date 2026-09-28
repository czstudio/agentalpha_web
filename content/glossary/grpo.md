---
slug: grpo
term: GRPO
en: Group Relative Policy Optimization
oneLine: GRPO 是 PPO 的无价值网络变体。它对同一提示采样一组输出，用组内奖励减去均值除以标准差的结果作为优势估计。该方法省去 Critic 网络，降低显存开销，常用于推理训练。
aliases: [GRPO, Group Relative Policy Optimization, 组相对策略优化]
group: finetune
tags: [GRPO, 强化学习]
relatedQa: [what-is-grpo, agentic-rl-vs-sft, dpo-vs-ppo]
relatedTerms: [rlhf, dpo]
updated: 2026-09-28
---

## 是什么

GRPO 的机制是对同一提示采样 G 个回答，用该组奖励减去组均值后除以组标准差来计算每个回答的优势信号。策略优化沿用 PPO 的截断比率目标，并将参考模型与策略间的 KL 散度直接加入损失作为惩罚。该方法常用于数学、代码、智能体工具调用等结果可校验的任务。

此设计利用组内相对比较提供基线，省去了价值网络。当前的改进方向集中在引入 token 级损失修正长回答的长度偏差（如 DAPO 的工作），以及动态采样和放宽截断等。

## 解决什么问题

在语言模型的强化学习中，传统 PPO 需要训练与策略同等规模的价值网络，导致显存翻倍且难以调优，成本高昂。在结果可自动判分的任务上，GRPO 利用组内相对奖励作为天然的优势信号，直接移除了对价值网络的依赖，降低了训练的资源消耗与难度。

## 面试怎么考

面试常考 GRPO 的公式及节省显存的原理，答题要点是明确它用组内标准化替代价值网络。另一考法是对比其与 PPO、DPO 的区别，需指出它省去价值网络，且更适合客观判分任务。此外，常问主流推理模型为何用它及衍生改进，可举例 DAPO 如何引入 token 级损失修正长度偏差。
