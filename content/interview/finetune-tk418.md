---
slug: finetune-tk418
no: "1318"
title: "GRPO的kl散度和PPO的kl散度区别?K1 K2 K3估计区别"
question: "GRPO的kl散度和PPO的kl散度区别?K1 K2 K3估计区别"
excerpt: "这道题考察的是对强化学习（RL）在LLM对齐中核心机制的理解深度，属于工程取舍 + 算法原理的综合型问题。面试官真正想看的是：你是否能清晰区分PPO和GRPO在KL散度约束上的设计哲学差异，以及是否理解KL散度估计（K1"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4760
updated: "2026-09-29"
---

## GRPO的kl散度和PPO的kl散度区别?K1 K2 K3估计区别

`P2` · `llm_training`

🏷 标签：`grpo`, `ppo`, `kl-divergence`, `estimation`, `reinforcement-learning`

#### 1️⃣ 考察意图

这道题考察的是对强化学习（RL）在LLM对齐中核心机制的理解深度，属于**工程取舍 + 算法原理**的综合型问题。面试官真正想看的是：你是否能清晰区分PPO和GRPO在KL散度约束上的设计哲学差异，以及是否理解KL散度估计（K1/K2/K3）背后的方差-偏差权衡。刁钻点在于，很多人只背了“GRPO去掉了critic网络”，但说不清KL散度在组内奖励归一化后如何计算，以及不同估计方法对训练稳定性的影响。答好了能展示你对RLHF整条链路（从策略优化到数值稳定性）的硬核工程理解。

#### 2️⃣ 标准答

**PPO vs GRPO 的 KL 散度区别**

- **PPO**：使用一个独立的**价值网络（critic）** 估计状态值函数 V(s)，然后计算优势函数 A_t = Q(s_t,a_t) - V(s_t)。KL散度作为**自适应惩罚项**加入目标函数：\min(\text{ratio} \cdot A, \text{clip}(\text{ratio}, 1-\epsilon, 1+\epsilon) \cdot A) - \beta \cdot \text{KL}(\pi_{\text{old}} \| \pi_{\text{new}})。这里的KL散度是**逐token**计算的，用于约束新策略不要偏离旧策略太远，防止reward hacking。
- **GRPO**：**去掉了critic网络**，对每个prompt采样一组（通常4-8个）response，计算组内相对奖励：A_i = (r_i - \text{mean}(r_{\text{group}})) / \text{std}(r_{\text{group}})。KL散度直接作为**正则项**加到每个response的奖励上：r_i' = r_i - \beta \cdot \text{KL}(\pi_{\text{ref}} \| \pi_{\theta})。这里的KL散度是**逐response**计算的，约束当前策略不要偏离参考策略（通常是SFT checkpoint）。
- **核心差异**：PPO的KL是“新旧策略之间”的约束，GRPO的KL是“当前策略与参考策略之间”的约束。GRPO的组内归一化天然引入了竞争性，KL惩罚防止模型为了赢而过度优化。

**K1/K2/K3 估计方法区别**

这三种方法都是对KL散度 D_{\text{KL}}(\pi_{\theta} \| \pi_{\text{ref}}) 的蒙特卡洛估计，区别在于采样方式和方差控制：

- **K1（简单蒙特卡洛）**：直接从当前策略 \pi_{\theta} 采样一个token序列，计算 \log(\pi_{\theta}(x)/\pi_{\text{ref}}(x)) 的均值。公式：\hat{D}_{\text{KL}}^{\text{K1}} = \frac{1}{N} \sum_{i=1}^N \log(\pi_{\theta}(x_i)/\pi_{\text{ref}}(x_i))，其中 x_i \sim \pi_{\theta}。**特点**：**无偏估计**，但方差大。因为采样自当前策略，如果策略更新过快，样本分布偏移会导致估计不稳定。
- **工程取舍**：适合小批量、低学习率场景，但需要大量样本（如batch size 256+）才能降低方差。
K2（重要性采样）：从参考策略 \pi_{\text{ref}} 采样token序列，用重要性权重修正。公式：\hat{D}_{\text{KL}}^{\text{K2}} = \frac{1}{N} \sum_{i=1}^N w_i \cdot \log(\pi_{\theta}(x_i)/\pi_{\text{ref}}(x_i))，其中 w_i = \pi_{\theta}(x_i)/\pi_{\text{ref}}(x_i)，且 x_i \sim \pi_{\text{ref}}。
- **特点**：**有偏估计**（因为重要性权重本身有方差），但方差小。因为采样分布固定（参考策略），不会随策略更新而漂移。
- **实际落地的坑**：如果 \pi_{\theta} 和 \pi_{\text{ref}} 差异过大，重要性权重会爆炸（如 w_i > 100），导致梯度不稳定。解法：对权重做**clip**（如限制在[0.1, 10]）或使用**self-normalized importance sampling**。
K3（自适应混合估计）：动态融合K1和K2，根据当前策略与参考策略的KL距离自适应调整混合比例。公式：\hat{D}_{\text{KL}}^{\text{K3}} = \alpha \cdot \hat{D}_{\text{KL}}^{\text{K1}} + (1-\alpha) \cdot \hat{D}_{\text{KL}}^{\text{K2}}，其中 \alpha = \text{sigmoid}(\gamma \cdot (\text{KL}{\text{current}} - \text{threshold}))。
- **特点**：**偏差-方差平衡**。当策略接近参考策略时（KL小），偏向K1（无偏）；当策略偏离时（KL大），偏向K2（方差小）。
- **工程取舍**：需要额外维护一个KL滑动窗口来更新 \alpha，增加计算开销。但能明显提升训练稳定性，尤其在RLHF的早期阶段（策略快速变化）。

**选择建议**：在GRPO中，由于组内奖励归一化已经引入了竞争性，推荐使用**K2**（重要性采样）来估计KL散度，因为其低方差特性与组内归一化互补。如果计算资源允许，**K3**是更优选择，能自适应处理策略漂移。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，PPO和GRPO的KL散度设计哲学不同——PPO约束新旧策略，GRPO约束当前策略与参考策略，且GRPO的KL直接作为奖励惩罚项。第二，K1/K2/K3是三种KL估计方法：K1无偏但方差大，K2有偏但方差小，K3自适应平衡两者。第三，工程上推荐GRPO用K2，因为组内归一化已引入竞争性，低方差估计更稳定。总结一句：理解KL散度的估计方法，本质是理解RLHF中偏差-方差权衡的工程落地。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么GRPO要去掉critic网络？直接用组内奖励归一化不会丢失信息吗？

> 去掉critic是为了降低计算成本和实现复杂度。Critic网络需要额外训练，且容易过拟合到状态值函数，导致优势函数估计偏差。组内奖励归一化虽然丢失了绝对奖励尺度，但引入了相对排序，这在LLM对齐中更合理——我们关心的是哪个response更好，而不是具体奖励值。工程上，组内归一化配合KL惩罚，能有效防止模型坍缩到单一模式。如果奖励尺度差异大（如有些任务奖励范围[0,1]，有些[0,100]），组内归一化天然解决了尺度不一致问题。

**追问 2**：K2估计中，重要性权重clip到[0.1, 10]会不会引入偏差？如何选择clip范围？

> 会引入偏差，但这是可控的。偏差大小取决于clip边界：边界越窄，偏差越大但方差越小；边界越宽，偏差越小但方差越大。实践中，[0.1, 10]是通用经验值，对应策略变化不超过10倍概率比。如果训练初期策略变化剧烈，可以放宽到[0.01, 100]；如果训练稳定，可以收紧到[0.5, 2]。更精细的做法是**动态clip**：根据当前batch的重要性权重分布，设置clip边界为均值的±3倍标准差。

**追问 3**：在GRPO中，如果组内所有response的奖励都很低，KL惩罚会不会过度抑制探索？

> 会。这是GRPO的一个已知问题：当组内奖励整体偏低时，KL惩罚（负项）会主导奖励，导致模型倾向于生成保守的response。解法有两个：一是**动态调整β**，根据组内奖励的方差自适应缩放KL惩罚系数（奖励方差大时减小β，鼓励探索）；二是**引入熵奖励**，在目标函数中加入策略熵项（如+0.01 * H(π)），防止策略过早坍缩。DeepSeek-R1的论文中提到了类似策略。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“K1/K2/K3是三种不同的KL散度定义” → ✅ 正确说法：K1/K2/K3是KL散度的三种蒙特卡洛估计方法，底层KL散度定义相同（D_{\text{KL}}(P\|Q) = \sum P(x) \log(P(x)/Q(x))），区别在于采样分布和权重计算。
- ❌ 说“GRPO的KL散度比PPO的KL散度更严格” → ✅ 正确说法：GRPO的KL散度约束的是当前策略与参考策略，PPO约束的是新旧策略。GRPO的KL直接作为奖励惩罚项，而PPO的KL是自适应惩罚项（通过KL系数β动态调整）。两者严格程度取决于超参数设置，没有绝对优劣。
- ❌ 说“K3估计是K1和K2的简单平均” → ✅ 正确说法：K3是自适应混合，混合系数α根据当前KL距离动态调整，不是固定平均。α的计算通常使用sigmoid函数，需要设置阈值和温度参数。

#### 6️⃣ 简历呼应

- **如果你有RLHF项目经验**：从“我在项目中对比了K1/K2/K3对训练稳定性的影响”切入，具体说明你如何选择估计方法（如“在7B模型上，K2的方差比K1低30%，但偏差导致最终奖励低5%，最终改用K3”）。
- **如果你只做过传统NLP（如文本分类）**：用“类比迁移”策略——将KL估计类比为分类任务中的损失函数选择（如交叉熵 vs 均方误差），强调“偏差-方差权衡”是机器学习通用问题，你理解其本质。
- **如果你是校招无项目**：聚焦论文复现，说“我复现了DeepSeek-R1的GRPO实现，在GSM8K上对比了K1/K2/K3，发现K3在收敛速度上比K2快15%”，展示动手能力和对细节的关注。

#### 7️⃣ 延伸阅读

- 《DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning》（GRPO原始论文）
- 《Proximal Policy Optimization Algorithms》（PPO原始论文，理解KL自适应惩罚）
- 《Self-Normalized Importance Sampling for Variational Inference》（重要性采样理论基础）
- 《Monte Carlo Estimation of KL Divergence: A Comparative Study》（K1/K2/K3估计方法的系统对比）
- 《Scaling Laws for Reward Model Overoptimization》（KL散度与reward hacking的关系分析）

---
