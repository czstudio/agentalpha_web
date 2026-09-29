---
slug: finetune-chapter-guide
no: "3"
title: "第 3 章 · LLM 训练面试导学"
question: "训练与微调章节考什么？SFT 到 RL 按什么顺序学？"
excerpt: "LoRA 三层递进与 GRPO 全家桶是当前训练章两大必考块。这篇导学给出从 SFT 数据、对齐算法到 Agent RL 工程的五段学习路线，含 DPO 概率同降、SFT→RL 切换判断等高频追问的答法要点。"
tags: ["章节导学"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区"
minutes: 10
words: 2922
updated: "2026-09-29"
---

## 考点地图

本章的核心考点围绕大模型从监督微调到强化学习对齐的完整训练流程展开。面试官通常会沿着一条清晰的考点链进行提问，起点是 SFT 的数据准备与超参设置，随后深入探讨 LoRA 的低秩假设与 rank 及 alpha 参数的作用，再延伸至 QLoRA 和灾难性遗忘的应对策略。进入对齐阶段后，考点会转向 RLHF 的三段式流程，重点考察奖励模型的训练与奖励作弊现象。接着，面试会聚焦于当前主流的对齐算法，包括 DPO 及其病态问题、PPO 与 GRPO 的对比、DAPO 类改进，以及信用分配与 PRM 模型。在工程落地方面，训练监控指标、SFT 切换到 RL 的时机判断、Rollout 工程实现与显存四件套是必考内容。

从考频分布来看，LoRA 的三层递进（是什么、为什么、怎么办）与 GRPO 全家桶是当前面试中的两大必考板块。岗位差异方面，算法岗的面试重点在于要求候选人手推或手写损失函数，例如 GRPO 和 GAE 的公式推导；而工程岗则更侧重于考察显存占用分析、Rollout 资源分配，以及训练监控和阶段切换的判断逻辑，这些工程细节是区分候选人实战经验的关键题型。

当你能不看参考资料，顺畅画出从 SFT 到 RL 的训练状态流转图，并清楚解释每个阶段的显存瓶颈与损失函数设计动机时，这一章就算过关了。

## 站内学习路线

第一阶段是概念地基。在深入算法前，先通过术语页建立基础认知，阅读 [LoRA 简介](/interview/glossary/lora)、[RLHF 概念](/interview/glossary/rlhf)、[DPO 原理](/interview/glossary/dpo)与 [GRPO 机制](/interview/glossary/grpo)。这一阶段学完，你能用两三句话向面试官准确解释这些核心训练范式。

第二阶段进入 SFT 线。从 [SFT 是什么](/interview/qa/what-is-sft)起步，了解 [SFT 数据准备](/interview/qa/sft-data-preparation)细节。接着攻克微调技术，学习 [LoRA 的基本原理](/interview/qa/what-is-lora)与 [LoRA 中 rank 参数的作用](/interview/qa/lora-rank)，随后扩展到 [QLoRA 是什么](/interview/qa/what-is-qlora)，并掌握如何缓解 [灾难性遗忘](/interview/qa/catastrophic-forgetting)。这一阶段学完，你能应对关于指令微调原理与参数设置的常规提问。

第三阶段聚焦对齐线。首先掌握 [RLHF 是什么](/interview/qa/what-is-rlhf)及其三段式流程，深入理解 [奖励模型是什么](/interview/qa/what-is-reward-model)。然后对比无奖励模型路径，分析 [DPO 与 PPO 的区别](/interview/qa/dpo-vs-ppo)，并探讨 [DPO 两个概率同降](/interview/qa/dpo-probability-drop)的病态问题。随后转向强化学习对齐算法，学习 [GRPO 是什么](/interview/qa/what-is-grpo)及其 [GRPO 的相关改进](/interview/qa/grpo-improvements)。这一阶段学完，你能清晰对比不同对齐算法的优劣势。

第四阶段探讨 Agent RL 与工程实现。从 [Agent RL 与 SFT 的对比](/interview/qa/agentic-rl-vs-sft)切入，理解 [Agent RL 的奖励设计](/interview/qa/agentic-rl-reward-design)与基于 [PRM 的信用分配](/interview/qa/credit-assignment-prm)。工程方面，依次学习 [GRPO 的训练监控指标](/interview/qa/grpo-training-metrics)、[SFT 切换到 RL 的时机](/interview/qa/sft-to-rl-switch)、[PPO 中的 GAE 与 Critic](/interview/qa/gae-critic-ppo) 以及 [RL 中的 Rollout 工程](/interview/qa/rl-rollout-engineering)。最后攻克资源排错，掌握 [训练显存分解](/interview/qa/training-vram-breakdown)、[梯度累加与大 Batch 的对比](/interview/qa/grad-accum-vs-big-batch)以及 [训练 Loss 异常诊断](/interview/qa/training-loss-diagnosis)。这一阶段学完，你能证明自己具备处理真实训练任务的工程经验。

第五阶段是对比选型。通过深度文章串联知识点，阅读 [PPO、GRPO 与 DPO 的综合对比](/interview/ppo-vs-grpo-vs-dpo)、[在线与离线 RL 差异分析](/interview/online-vs-offline-rl)以及 [预训练、SFT 与 RLHF 的全流程对比](/interview/pretrain-vs-sft-vs-rlhf)。这一阶段学完，你能根据业务需求选择最合适的训练路线。

## 高频追问与避坑

- **「LoRA 为什么可行」** 答法要点在于点出模型权重更新量具有低秩特性。可以用两个小矩阵的乘积来近似全参数微调时的参数增量矩阵。这样能在保持模型原有能力的同时，减少需要训练的参数量。
- **「GRPO 为什么省」** 答法要点是说明它利用组内相对排名作为优势估计，从而去掉了传统 PPO 中占用大量显存的 Critic 模型。这种设计的代价是当组内采样结果全对或全错时，会导致梯度缺失。
- **「DPO 两个概率同降」** 答法要点是首先排查数据质量，检查是否存在偏好对颠倒或数据高度同质化的问题。在算法层面的解决思路是在损失函数中加入 SFT 惩罚项作为托底，防止模型在优化偏好时偏离原始分布。
- **「什么时候切 RL」** 答法要点是给出三个具体的判断条件。第一是模型输出的格式已经稳定，第二是模型在当前任务上的正确率不再是非零状态，第三是继续进行 SFT 带来的增益已经见顶。

常见误区：
把 RLHF 简单等同于继续训练，而不向面试官说明从 SFT 到 RL 阶段模型优化目标的本质变化。正确的认知是强调 RL 阶段将原本的词元预测目标转换为了最大化人类偏好奖励目标。

背诵 GRPO 公式却讲不出组内归一化的动机。正确的认知是理解组内归一化是为了在没有全局价值基线的情况下，通过同一提示词下的多次采样结果互相比较，动态构建出用于计算梯度的基准线。
