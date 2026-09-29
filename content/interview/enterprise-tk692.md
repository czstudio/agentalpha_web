---
slug: enterprise-tk692
no: "1592"
title: "reject sampling是什么"
question: "reject sampling是什么"
excerpt: "面试官考察的是你对 LLM 对齐技术栈中“采样-过滤”范式的理解深度。表面是背概念，实则考察：① 能否清晰区分 Reject Sampling 与 PPO、DPO 等在线/离线方法的本质差异；② 是否理解它在 RLHF"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4138
updated: "2026-09-29"
---

## reject sampling是什么

#### 1️⃣ 考察意图

面试官考察的是你对 LLM 对齐技术栈中“采样-过滤”范式的理解深度。表面是背概念，实则考察：① 能否清晰区分 Reject Sampling 与 PPO、DPO 等在线/离线方法的本质差异；② 是否理解它在 RLHF 流程中的具体位置（是数据生成阶段而非训练阶段）；③ 是否意识到其依赖奖励模型准确性的致命弱点。答好了能展示你对 LLM 训练管线中“数据质量 vs 计算成本”的工程权衡能力，这是大厂做对齐优化的核心硬实力。

#### 2️⃣ 标准答

**定义与核心思想**

Reject Sampling（拒绝采样）是一种从复杂分布中采样并丢弃不符合条件的样本的统计方法。在 LLM 对齐中，它被用作一种**离线数据筛选策略**：给定 prompt，让策略模型（如 SFT 后的 base model）生成 N 个候选 response，然后用奖励模型（Reward Model, RM）对每个候选打分，只保留分数最高的那个作为最终训练数据或输出。

**标准流程（以 RLHF 为例）**

1. **生成阶段**：对每个 prompt，从策略模型 π_θ 中采样 N 个 response（通常 N=4~16，DeepSeek 在 R1 中用到 64 个）。采样时使用 temperature=0.7~1.0 以增加多样性。
2. **打分阶段**：用训练好的 RM（如基于 GPT-2 或 LLaMA 的 reward model）对每个 response 计算标量奖励 r(x,y)。
3. **选择阶段**：选择 argmax r(x,y) 的 response 作为“正样本”，其余 N-1 个丢弃。
4. **训练阶段**：将选出的正样本作为监督信号，用 SFT 或 DPO 更新策略模型（注意：Reject Sampling 本身不更新模型，它只生成高质量训练数据）。

**与 PPO 的关键对比**

| 维度 | Reject Sampling | PPO |
|---|---|---|
| 更新方式 | 离线：先采样一批，再训练 | 在线：边采样边更新策略 |
| 计算成本 | 低（只需一次前向生成+RM打分） | 高（需维护旧策略、计算 KL 散度、多次迭代） |
| 样本效率 | 低（丢弃 N-1 个候选） | 高（每个样本都用于更新） |
| 奖励模型依赖 | 强依赖 RM 准确性，RM 偏差会被放大 | 弱依赖，PPO 的 KL 正则化可缓解 RM 过拟合 |
| 典型应用 | DeepSeek-R1 的冷启动阶段、Anthropic 的 HH-RLHF 数据筛选 | OpenAI 的 InstructGPT、ChatGPT 训练 |

**工程取舍与坑**

- **N 的选择是核心 trade-off**：N 越大，选出的 response 质量越高，但计算成本线性增长。实际中 N=8 是常见折中——N=4 时质量提升明显，N>16 后边际收益递减（经验法则：N 每翻倍，质量提升约 15%，但成本翻倍）。
- **奖励模型过拟合陷阱**：如果 RM 在训练集上过拟合，Reject Sampling 会倾向于选择 RM 偏好的“假高分”样本，导致策略模型学到虚假模式。解法：在 RM 训练时加入正则化（如 Dropout=0.1），或使用 Ensemble RM（多个 RM 投票）。
- **多样性坍塌**：Reject Sampling 天然偏好“安全”的 response，导致生成多样性下降。DeepSeek-R1 的解法是：在采样时加入 temperature 退火（从 1.0 逐渐降到 0.6），并在选择时引入“奖励 + KL 散度”的混合指标，而非纯奖励。

**实际落地的坑 + 解法**

- **坑**：在 RLHF 中，Reject Sampling 生成的“正样本”可能包含错误事实（因为 RM 只评估偏好，不评估事实性）。**解法**：在 RM 打分后，额外加一层事实性校验（如用检索增强检查关键实体），或使用“奖励 + 事实性”的加权评分。
- **坑**：当策略模型与 RM 训练时的 base model 不一致时（如用 LLaMA-2 做 RM，但策略是 Mistral），RM 的打分会偏移。**解法**：在 RM 训练时加入 domain adaptation，或使用“策略模型自身作为 RM 的 base model”进行微调。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、流程、与 PPO 的对比三个层面回答。定义上，Reject Sampling 是一种离线采样-筛选方法，在 LLM 对齐中用于从策略模型生成 N 个候选，用奖励模型选最优。流程分三步：生成、打分、选择。与 PPO 的关键区别是：Reject Sampling 是离线、低成本但样本效率低，强依赖奖励模型准确性；PPO 是在线、高成本但样本效率高。总结一句：Reject Sampling 是 RLHF 中一种高效的数据筛选手段，但需要警惕奖励模型过拟合和多样性坍塌问题。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：Reject Sampling 和 Best-of-N 采样有什么区别？

> 本质上是同一个概念的不同叫法。Best-of-N 是 Reject Sampling 在 LLM 生成中的特例——生成 N 个候选，选奖励最高的那个。但 Reject Sampling 更广义，可以用于任意概率分布采样（如从高斯分布中拒绝采样）。在 LLM 语境下，两者可互换。但要注意：Best-of-N 通常指推理时的采样策略（不涉及训练），而 Reject Sampling 在 RLHF 中常指训练数据的生成阶段。

**追问 2**：如果奖励模型打分不准，Reject Sampling 会出什么问题？怎么解决？

> 核心问题是“奖励黑客”（reward hacking）：策略模型会学到 RM 偏好的虚假模式（如生成更长、更礼貌的 response 来获取高分，而非真正有用）。解法有三：① 使用 Ensemble RM（3-5 个独立 RM 投票，取平均分）；② 在 RM 训练时加入对抗样本（让 RM 学会识别 hack 模式）；③ 引入 KL 正则化，在奖励中减去策略模型与参考模型的 KL 散度（类似 PPO 的做法），抑制策略偏离太远。

**追问 3**：为什么 DeepSeek-R1 在冷启动阶段用 Reject Sampling 而不是 PPO？

> 因为冷启动阶段策略模型质量低，PPO 的在线更新会导致不稳定（策略剧烈震荡，KL 散度爆炸）。Reject Sampling 是离线方法，可以先从低质量策略中生成大量候选，用 RM 筛选出高质量子集，再用 SFT 微调策略，这样训练更稳定。DeepSeek-R1 的具体做法是：对每个 prompt 生成 64 个候选，用 RM 选 top-1，然后用这些数据做 3 轮 SFT，之后再切到 PPO 做在线对齐。这是典型的“先离线筛选，再在线微调”的两阶段策略。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Reject Sampling 就是随机采样，然后扔掉不好的” → ✅ 正确切入：Reject Sampling 是有偏采样，通过奖励模型做非均匀筛选，目的是提升生成质量而非随机性。
- ❌ 说“Reject Sampling 和 PPO 是互斥的，用了 RS 就不用 PPO” → ✅ 正确切入：两者是互补的，RS 用于数据生成阶段，PPO 用于在线训练阶段，实际管线中常组合使用（如 DeepSeek-R1 先 RS 后 PPO）。
- ❌ 说“Reject Sampling 的 N 越大越好” → ✅ 正确切入：N 存在边际收益递减，且会放大 RM 过拟合风险，实际中 N=8~16 是常见折中。

#### 6️⃣ 简历呼应

- **如果你有 RLHF 项目**：从“我在项目中用 Reject Sampling 生成训练数据，发现 N=8 时质量提升最明显，但 RM 过拟合导致多样性下降，后来用 Ensemble RM 解决”切入，展示工程经验。
- **如果你只做过传统 NLP**：用“Reject Sampling 类似于传统 NLP 中的 beam search + rerank 范式——先生成多个候选，再用外部打分器选最优”做类比迁移，强调“采样-筛选”的通用性。
- **如果你是校招无项目**：聚焦“Reject Sampling 在 DeepSeek-R1 冷启动中的应用”作为论文复现 demo，展示你对前沿工作的理解深度，并主动提出“可以手写一个简化版 RS 流程”。
- 《Training language models to follow instructions with human feedback》（InstructGPT 论文，RLHF 管线详解）
- 《DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning》（RS 在冷启动中的具体用法）
- 《Constitutional AI: Harmlessness from AI Feedback》（Anthropic 的 RS + RLHF 变体）
- 《Reward Model Ensembles for Robust Alignment》（Ensemble RM 解决 RS 过拟合的论文）
- 《The Unreasonable Effectiveness of Best-of-N Sampling》（分析 N 的边际收益递减规律）

---
