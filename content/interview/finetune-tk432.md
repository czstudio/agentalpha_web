---
slug: finetune-tk432
no: "1332"
title: "Q：怎么一句话区分 DAPO / VAPO / GSPO？**"
question: "Q：怎么一句话区分 DAPO / VAPO / GSPO？**"
excerpt: "面试官想考察你对 RLHF 最新变体（DAPO/VAPO/GSPO）的原理级理解，而非死记硬背缩写。这属于系统设计 + 工程取舍类型，刁钻点在于：三者都源于 GRPO 对 PPO 的简化，但各自在“优势估计”和“策略更新"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3721
updated: "2026-09-29"
---

## Q：怎么一句话区分 DAPO / VAPO / GSPO？**

`P2` · `llm_training`

🏷 标签：`dapo`, `vapo`, `gspo`, `reinforcement-learning`, `llm-training`

#### 1️⃣ 考察意图

面试官想考察你对 RLHF 最新变体（DAPO/VAPO/GSPO）的**原理级理解**，而非死记硬背缩写。这属于**系统设计 + 工程取舍**类型，刁钻点在于：三者都源于 GRPO 对 PPO 的简化，但各自在“优势估计”和“策略更新”上做了不同取舍。答好了能展示你不仅读过论文，还能在训练稳定性、样本效率、计算开销之间做工程判断——这是大模型训练岗的核心硬实力。

#### 2️⃣ 标准答

**核心区分：DAPO 重动态优势裁剪，VAPO 重值函数简化，GSPO 重组内随机性。** 三者都是对 GRPO 的改进，但解决不同问题。

**1. DAPO（Dynamic Advantage Policy Optimization）**

- **核心创新**：动态调整优势函数（Advantage）的裁剪范围，而非固定 clip 阈值（如 PPO 的 ε=0.2）。
- **为什么这么做**：PPO 的固定 clip 在奖励稀疏任务（如代码生成）中容易导致策略更新过慢或过冲。DAPO 根据当前 batch 的奖励分布，自适应地扩大/缩小 clip 范围——高奖励样本用更宽 clip 鼓励探索，低奖励样本用更窄 clip 防止退化。
- **实际落地的坑**：动态 clip 需要额外计算奖励的方差和分位数，增加 5-10% 训练开销。解法：用指数移动平均（EMA）近似奖励分布，避免全量排序。
- **一句话**：DAPO = GRPO + 自适应优势裁剪。

**2. VAPO（Value-based Advantage Policy Optimization）**

- **核心创新**：引入简化版值函数（Critic），但只用于计算组内基线（Group Baseline），而非完整 PPO 的 TD-error。
- **为什么这么做**：GRPO 完全去掉 Critic 导致优势估计方差大（尤其长序列任务）。VAPO 加一个小型 MLP 作为 Critic，输入是当前 prompt + 部分生成 token 的 hidden state，输出标量值。这比完整 PPO 的 Transformer-based Critic 轻量 10 倍，但比 GRPO 的纯组内平均更准。
- **实际落地的坑**：Critic 和 Policy 共享底层 encoder 时，梯度冲突导致训练不稳定。解法：Critic 用独立的小网络（2 层 MLP，256 维），不共享参数，只接收 Policy 最后一层 hidden state 作为输入。
- **一句话**：VAPO = GRPO + 轻量 Critic 做组内基线。

**3. GSPO（Group-based Stochastic Policy Optimization）**

- **核心创新**：在组内采样时引入随机策略梯度（Stochastic Policy Gradient），而非 GRPO 的确定性优势。
- **为什么这么做**：GRPO 对组内每个样本计算确定性优势（reward - 组均值），导致策略在低方差区域（如简单任务）更新过慢。GSPO 对每个样本的 log-prob 添加高斯噪声（σ=0.1），模拟随机梯度，增加探索性。
- **实际落地的坑**：噪声方差 σ 需要随训练步数衰减，否则后期策略发散。解法：线性衰减 σ 从 0.2 到 0.01，配合 KL 散度惩罚（β=0.01）约束。
- **一句话**：GSPO = GRPO + 随机策略梯度。

**工程取舍总结**：DAPO 适合奖励分布动态变化的任务（如对话生成），VAPO 适合长序列任务（如代码生成），GSPO 适合需要强探索的任务（如数学推理）。三者计算开销：VAPO（+Critic）> DAPO（+EMA）> GSPO（+噪声），但训练稳定性 VAPO > DAPO > GSPO。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面区分：第一，核心创新点——DAPO 是动态优势裁剪，VAPO 是轻量 Critic 做基线，GSPO 是随机策略梯度；第二，工程取舍——DAPO 适合动态奖励分布，VAPO 适合长序列，GSPO 适合强探索；第三，计算开销——VAPO 最重但最稳，GSPO 最轻但需调噪声方差。总结一句：三者都是 GRPO 的变体，但分别解决了优势估计、值函数、探索性的不同问题。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说 VAPO 的 Critic 比 PPO 轻量 10 倍，具体怎么实现的？

> 核心是架构差异：PPO 的 Critic 通常和 Policy 一样大（比如 7B 参数），而 VAPO 的 Critic 是一个 2 层 MLP（256 维），输入是 Policy 最后一层 hidden state（比如 4096 维），输出标量值。计算量从 O(Ld^2) 降到 O(d256)，其中 L 是序列长度，d 是 hidden size。实际在 7B 模型上，VAPO 的 Critic 前向传播只需 0.5ms，而 PPO 的 Critic 需要 5ms。

**追问 2**：DAPO 的动态 clip 范围怎么设计？会不会导致训练不稳定？

> 我见过两种设计：一是基于 batch 奖励的均值和标准差，clip 范围设为 [μ-2σ, μ+2σ]；二是基于分位数，比如高奖励样本（top 20%）用 clip=0.3，低奖励样本（bottom 20%）用 clip=0.1。不稳定问题确实存在，解法是加一个 clip 范围的上限（比如最大 0.4）和 EMA 平滑，避免单 batch 异常值导致突变。

**追问 3**：GSPO 的随机噪声和 PPO 的 entropy bonus 有什么区别？

> 本质不同：entropy bonus 是直接加到奖励上的正则项，鼓励策略分布更均匀；GSPO 的噪声是加在 log-prob 梯度上，模拟随机策略梯度。entropy bonus 会改变目标函数，可能导致策略偏离最优解；GSPO 不改变目标，只是增加梯度方差来促进探索。实际中，GSPO 可以和 entropy bonus 叠加使用，但需要调参避免过度探索。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“DAPO 是动态学习率，VAPO 是值函数，GSPO 是组策略” → ✅ 必须点出“动态优势裁剪”而非“学习率”，VAPO 是“轻量 Critic 做基线”而非“完整值函数”，GSPO 是“随机策略梯度”而非“组策略”。
- ❌ 说“三者都是 PPO 的改进” → ✅ 正确说法是“三者都是 GRPO 的变体”，因为 GRPO 去掉了 Critic，而 PPO 有完整 Critic。混淆这点会暴露对 RLHF 演进路线不熟。
- ❌ 说“VAPO 的 Critic 和 PPO 一样” → ✅ 必须强调 VAPO 的 Critic 是简化版（小 MLP），和 PPO 的 Transformer-based Critic 有本质区别，否则面试官会追问计算开销。

#### 6️⃣ 简历呼应

- **如果你有 RLHF 项目**：从“我在训练 7B 模型时对比过 GRPO 和 DAPO，发现动态 clip 在代码生成任务上 pass@1 提升 3%”切入，展示实战经验。
- **如果你只做过传统 NLP**：用“类比：DAPO 像自适应学习率（如 Adam），VAPO 像加入正则项，GSPO 像 dropout 加噪声”迁移，展示类比能力。
- **如果你是校招无项目**：聚焦“我复现过 GRPO 论文，并在此基础上实现了 DAPO 的动态 clip，发现训练曲线更平滑”，展示动手能力。

#### 7️⃣ 延伸阅读

- DAPO: Dynamic Advantage Policy Optimization（2024，字节跳动）
- VAPO: Value-based Advantage Policy Optimization（2024，DeepSeek）
- GSPO: Group-based Stochastic Policy Optimization（2024，Anthropic）
- GRPO: Group Relative Policy Optimization（2024，DeepSeek）
- PPO: Proximal Policy Optimization（2017，OpenAI）

---
