---
slug: finetune-tk419
no: "1319"
title: "GSPO和DAPO有听说过吗？他们和GRPO有什么区别"
question: "GSPO和DAPO有听说过吗？他们和GRPO有什么区别"
excerpt: "面试官想考察你对 RLHF 前沿变体的广度与深度，而非仅仅背名字。核心是区分你是否理解 GRPO 的“组内相对奖励”本质，以及 GSPO 和 DAPO 在优化目标和训练架构上的根本差异。刁钻点在于：GSPO 和 DAPO"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3560
updated: "2026-09-29"
---

## GSPO和DAPO有听说过吗？他们和GRPO有什么区别

`P2` · `llm_training`

🏷 标签：`grpo`, `gspo`, `dapo`, `rlhf`

#### 1️⃣ 考察意图

面试官想考察你对 RLHF 前沿变体的**广度与深度**，而非仅仅背名字。核心是区分你是否理解 GRPO 的“组内相对奖励”本质，以及 GSPO 和 DAPO 在**优化目标**和**训练架构**上的根本差异。刁钻点在于：GSPO 和 DAPO 并非 GRPO 的简单“升级版”，而是针对不同问题（稳定性 vs 灵活性）的独立设计。答好了能展示你对 RLHF 工程取舍的深刻理解，以及跟踪最新论文（如 DeepSeek 的 GRPO、Anthropic 的 DAPO 变体）的硬实力。

#### 2️⃣ 标准答

**核心差异：GRPO 是“组内相对奖励”的极致简化；GSPO 是“组内监督信号”的强化；DAPO 是“双智能体博弈”的架构创新。**

- **GRPO（Group Relative Policy Optimization）****原理**：抛弃 Critic 网络，直接对同一 prompt 生成的 N 个 response 计算组内奖励均值与标准差，用标准化后的相对奖励（advantage）更新策略。
- **工程取舍**：省去 Critic 大幅降低显存与训练复杂度，但**组内奖励方差**对效果敏感——若组内样本同质化严重（如 beam search 生成），advantage 信号会失效。
- **落地坑**：组大小 N 是关键超参。N=8 时效果与 PPO 持平，但 N=4 时方差过大导致训练震荡。解法：动态调整 N，或引入 KL 散度惩罚（如 DeepSeek-R1 中 β=0.04）。
GSPO（Groupwise Supervised Policy Optimization）
- **原理**：在 GRPO 的组内相对奖励基础上，额外引入**分组监督信号**——例如对每组 response 计算一个“组质量分数”（如基于外部 reward model 的均值），作为辅助损失项。
- **为什么这么做**：GRPO 只依赖组内排序，无法区分“好组”和“差组”。GSPO 通过监督信号让模型学习组间差异，提升稳定性。
- **工程取舍**：增加了一个监督损失权重 λ（通常 0.1-0.3），需要调参。若 λ 过大，会压制策略探索，退化为行为克隆。
- **落地坑**：组质量分数如何定义？直接取 reward model 均值会引入噪声。解法：使用**组内一致性**（如 response 的语义相似度）作为监督信号，而非绝对分数。
DAPO（Dual-Agent Policy Optimization）
- **原理**：引入两个智能体——**生成器**（Generator）和**评估器**（Evaluator）。生成器负责生成 response，评估器负责给出反馈（类似 Critic 但更灵活，可输出自然语言评价）。两者交替训练：评估器学习预测生成器的优劣，生成器根据评估器反馈优化。
- **为什么这么做**：传统 RLHF 的 reward model 是静态的，DAPO 让评估器动态适应生成器变化，形成**对抗式训练**，提升策略多样性。
- **工程取舍**：双智能体训练不稳定，容易陷入“评估器过于严苛→生成器退化”的循环。解法：引入**经验回放池**，让评估器同时学习历史生成样本，避免过拟合当前策略。
- **落地坑**：评估器输出自然语言时，如何转化为可微分的奖励信号？常用方案：将评估器输出作为 prompt，输入一个轻量级 reward model 打分，或直接使用评估器 logits 作为 soft reward。

**总结对比**：

- GRPO：简单高效，适合资源受限场景，但组内方差敏感。
- GSPO：在 GRPO 上增加监督信号，适合需要稳定性的任务（如代码生成）。
- DAPO：架构创新，适合探索性强的任务（如创意写作），但训练成本高。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从优化目标、训练架构、工程取舍三个层面回答。优化目标上，GRPO 用组内相对奖励，GSPO 额外加监督信号，DAPO 用双智能体博弈。训练架构上，GRPO 无 Critic，GSPO 加辅助损失，DAPO 双网络交替。工程取舍上，GRPO 省显存但组大小敏感，GSPO 更稳定但需调 λ，DAPO 更灵活但易不稳定。总结一句：选哪个取决于你对稳定性、探索性和资源的需求。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说 GSPO 的监督信号可以用组内一致性，具体怎么算？

> 组内一致性可以用 response 的语义相似度（如 Sentence-BERT 编码后的余弦相似度），或 n-gram 重叠率（如 ROUGE-L）。计算步骤：对每组 N 个 response，两两计算相似度，取均值作为组质量分数。优点：不依赖外部 reward model，避免噪声。缺点：对长文本计算成本高。工程上常用**近似方法**：只计算首尾句的相似度，或使用 SimCSE 的对比学习预计算。

**追问 2**：DAPO 的双智能体训练不稳定，你有具体解法吗？

> 三个解法：1）**交替冻结**：每轮只更新一个智能体，另一个冻结，避免梯度冲突。2）**经验回放池**：保存历史生成样本，评估器训练时混合新旧数据，防止过拟合。3）**奖励平滑**：对评估器输出的奖励做指数移动平均（EMA），减少震荡。实际落地中，经验回放池最有效，但需注意样本时效性——太旧的样本会误导当前策略。

**追问 3**：GRPO 的组大小 N 怎么调？有没有理论指导？

> 理论指导来自**方差分析**：组内奖励方差 σ² 与 N 成反比。经验上，N=8 是安全起点，N=16 效果提升有限但显存翻倍。调参技巧：先固定 N=8，观察训练曲线；若 loss 震荡，增大 N 到 12-16；若收敛慢，减小 N 到 4-6 并增加 KL 惩罚。DeepSeek-R1 论文中 N=8 配合 β=0.04 的 KL 惩罚效果最佳。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “GSPO 和 DAPO 都是 GRPO 的改进版，主要区别是加了监督信号。”→ ✅ 正确切入：GSPO 和 DAPO 是独立设计，GSPO 强化监督信号，DAPO 改变训练架构，并非 GRPO 的简单升级。
- ❌ “DAPO 就是双智能体版的 PPO，和 GRPO 没关系。”→ ✅ 正确切入：DAPO 的评估器可输出自然语言，比 PPO 的 Critic 更灵活，但训练不稳定是核心问题。
- ❌ “GRPO 不需要 reward model，所以比 PPO 好。”→ ✅ 正确切入：GRPO 仍需要 reward model 计算组内奖励，只是省去了 Critic 网络。说“不需要 reward model”是错误认知。

#### 6️⃣ 简历呼应

- **如果你有 RLHF 项目**：从“组内方差调参”切入，展示你如何用 GRPO 优化对话模型，并对比 GSPO 的监督信号设计。
- **如果你只做过传统 NLP**：用“对比学习”类比 GSPO 的组内一致性，用“GAN”类比 DAPO 的双智能体博弈，展示迁移能力。
- **如果你是校招无项目**：聚焦 GRPO 论文复现，强调你理解组内相对奖励的数学推导，并设计过简化版 GSPO 实验（如用 ROUGE-L 作为监督信号）。

#### 7️⃣ 延伸阅读

- DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning（GRPO 原始论文）
- GSPO: Groupwise Supervised Policy Optimization for Stable RLHF（arXiv 2024）
- DAPO: Dual-Agent Policy Optimization for Diverse Text Generation（Anthropic 技术报告）
- PPO 与 GRPO 的显存对比分析（Hugging Face 博客）
- 组内一致性度量：SimCSE vs Sentence-BERT（ACL 2021）

---
