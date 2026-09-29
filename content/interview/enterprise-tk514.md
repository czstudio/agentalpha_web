---
slug: enterprise-tk514
no: "1414"
title: "为什么有了reward model还需要critic model?critic model作用是什么"
question: "为什么有了reward model还需要critic model?critic model作用是什么"
excerpt: "这道题考察的是对 RLHF 训练管线中两个核心组件——Reward Model（奖励模型）和 Critic Model（价值网络）——角色差异的深度理解。面试官真正想看的是：你是否能区分“定义目标”和“辅助优化”这两个完"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4178
updated: "2026-09-29"
---

## 为什么有了reward model还需要critic model?critic model作用是什么

#### 1️⃣ 考察意图

这道题考察的是对 RLHF 训练管线中两个核心组件——Reward Model（奖励模型）和 Critic Model（价值网络）——角色差异的深度理解。面试官真正想看的是：你是否能区分“定义目标”和“辅助优化”这两个完全不同的职责，以及是否理解 Actor-Critic 架构中 Critic 降低方差、稳定训练的核心工程价值。刁钻点在于，很多人误以为 Reward Model 已经给出了分数，Critic 就是多余的。答好了，能展示你对 PPO 算法、优势函数计算、以及 RLHF 训练稳定性 trade-off 的硬核理解。

#### 2️⃣ 标准答

这个问题需要从 **角色定位**、**训练动态** 和 **工程取舍** 三个层面拆解。

#### 角色定位：Reward Model 是“裁判”，Critic Model 是“教练”

- **Reward Model (RM)**：一个静态的、预训练好的打分器。它的职责是给“完整轨迹”或“最终输出”一个标量奖励（比如 0.8 分）。它不关心策略（Policy）当前在做什么，也不关心中间步骤的好坏。在 RLHF 中，RM 定义了“什么是对的”，是优化目标。
- **Critic Model (价值网络)**：一个动态更新的价值估计器。它的职责是估计“当前状态”或“状态-动作对”的价值 V(s) 或 Q(s,a)。它告诉策略：“你现在这个状态，未来能拿到的期望总奖励是多少”。Critic 是优化工具，帮助策略更高效地学习。

#### 为什么不能只用 Reward Model？

- **方差爆炸问题**：如果只用 Reward Model 的标量奖励来更新策略（即 REINFORCE 算法），梯度估计的方差会极大。因为 Reward 是整条轨迹的最终结果，你无法区分“是这一步动作好，还是后面几步好”。Critic 通过计算优势函数 A = R - V(s)，用 V(s) 作为基线，减去状态的平均期望奖励，从而大幅降低方差。**这是 Critic 最核心的工程价值**。
- **稀疏奖励问题**：很多任务（如长文本生成）中，Reward Model 只在最终输出时给出一个分数。中间步骤的奖励是 0。Critic 可以学习到中间状态的潜在价值，让策略在“看不到奖励”的步骤也能获得有效梯度信号。

#### 训练动态：静态 vs 动态

- **Reward Model 是静态的**：它在 RL 训练开始前就训练好了，参数冻结。它不随策略变化而调整。这保证了优化目标的稳定性，但也意味着它无法适应策略分布偏移（distribution shift）。
- **Critic Model 是动态更新的**：它随着策略的更新而不断重新训练，去拟合当前策略下的真实价值函数。Critic 必须快速适应策略的变化，否则它的价值估计会严重偏差，导致优势函数计算错误，训练崩溃。**实际落地的一个坑是**：Critic 的学习率通常需要比 Policy 低 1-2 个数量级（比如 Policy lr=1e-5, Critic lr=1e-6），否则 Critic 会过拟合当前策略的局部噪声，导致价值震荡。

#### 工程取舍：一个 Critic 还是多个？

- 在 PPO 中，通常 Policy 和 Critic 共享一个主干网络（如 LLaMA 的 transformer），但输出头不同：一个输出动作分布（logits），一个输出标量价值 V(s)。这节省了显存，但引入了**特征竞争**：Policy 需要多样化探索，Critic 需要稳定估计。实践中，如果显存允许，**分开两个独立的模型**（Policy 和 Critic 各一套参数）通常更稳定，尤其当模型规模超过 7B 时。
- **一个具体解法**：在 DeepSpeed-Chat 或 TRL 框架中，Critic 的 loss 是 MSE loss（预测价值 vs 实际折扣奖励），而 Policy 的 loss 是 clipped surrogate objective。两者优化目标不同，共享主干时需要小心梯度累积，通常会给 Critic loss 一个权重系数（如 0.5），防止价值网络主导梯度。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从角色定位、训练动态和工程取舍三个层面回答。角色上，Reward Model 是静态裁判，定义优化目标；Critic 是动态教练，估计状态价值以降低方差。训练上，RM 冻结，Critic 随策略更新，学习率需更低。工程上，共享主干节省显存但引入特征竞争，大模型建议分开。总结一句：Critic 是让 PPO 能稳定训练的方差缩减器，没有它，RLHF 的梯度会爆炸。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果我把 Reward Model 的分数直接当作优势函数，不用 Critic，会怎样？

> 这就是 REINFORCE with baseline 的变种，但 baseline 是 0。梯度方差会非常大，因为 Reward 是整条轨迹的最终结果，你无法归因到具体 token。实践中，对于 7B 模型，用纯 REINFORCE 训练，loss 曲线会剧烈震荡，甚至发散。Critic 提供的 V(s) 作为 baseline，能减少 50%-80% 的方差（【通用知识】）。如果非要用，可以尝试使用 Reward Model 的中间层特征作为价值估计，但效果远不如专门训练的 Critic。

**追问 2**：Critic 和 Reward Model 可以共享参数吗？

> 理论上可以，但实践中不推荐。Reward Model 需要理解“最终结果的好坏”，而 Critic 需要理解“当前状态的价值”。两者语义不同。共享参数会导致特征冲突：RM 希望忽略中间步骤，Critic 希望关注中间步骤。在 Anthropic 的 RLHF 论文中，他们明确分开训练。如果显存受限，可以尝试在共享主干后加两个独立的 MLP 头，但需要给两个 loss 不同的权重，且训练不稳定风险高。

**追问 3**：在 GRPO（Group Relative Policy Optimization）中，为什么不需要 Critic？

> GRPO 通过采样多个输出（如 8 个），用它们的平均 Reward 作为 baseline，替代了 Critic 的 V(s)。这是一种 trade-off：用计算量（多采样）换模型复杂度（省掉 Critic）。好处是省掉了 Critic 的显存和训练开销，适合小模型快速迭代；坏处是 baseline 的方差仍然比 Critic 高，且采样数越多，计算成本越大。DeepSeek-Math 论文中用了 GRPO，但他们的任务（数学推理）奖励信号相对稠密，方差可控。对于长文本生成等稀疏奖励任务，Critic 仍然必要。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “Critic 就是 Reward Model 的轻量版，用来加速推理。” → ✅ “Critic 和 Reward Model 的角色完全不同：RM 是静态打分器，定义目标；Critic 是动态价值估计器，辅助优化。两者架构可以相似，但训练方式和目标函数完全不同。”
- ❌ “有了 Reward Model，Critic 就是多余的，直接用 Reward 做优势就行。” → ✅ “直接用 Reward 做优势会导致方差爆炸，训练不稳定。Critic 的核心作用是作为 baseline 计算优势函数 A = R - V(s)，大幅降低梯度方差，这是 PPO 能成功的关键。”

#### 6️⃣ 简历呼应

- **如果你有 RLHF 项目经验**：从你实际训练中遇到的“Critic loss 不收敛”或“Policy 和 Critic 共享主干导致梯度冲突”切入，详细描述你如何调整学习率或分开模型。这能展示你的工程调试能力。
- **如果你只做过传统 NLP（如分类、生成）**：用“监督学习中的损失函数 vs 优化器”做类比：Reward Model 是损失函数（定义目标），Critic 是 Adam 优化器（辅助收敛）。强调 Critic 在 RL 中扮演的“方差缩减”角色，类比 NLP 中 gradient clipping 的作用。
- **如果你是校招无项目**：聚焦论文复现，比如提到你读过《Training language models to follow instructions with human feedback》和《Proximal Policy Optimization Algorithms》，并手动实现过一个小型 PPO 训练循环，对比了有无 Critic 的 loss 曲线差异。
- 《Proximal Policy Optimization Algorithms》（Schulman et al., 2017）
- 《Training language models to follow instructions with human feedback》（Ouyang et al., 2022）
- 《DeepSeekMath: Pushing the Limits of Mathematical Reasoning with Open-Source Language Models》（GRPO 论文）
- 《The 37 Implementation Details of Proximal Policy Optimization》（PPO 实现细节博客）
- TRL 库（Hugging Face）中的 `PPOTrainer` 源码，查看 Critic loss 的具体实现

---
