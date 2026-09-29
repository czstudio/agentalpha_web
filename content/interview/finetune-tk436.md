---
slug: finetune-tk436
no: "1336"
title: "What are some alternatives or recent advancements beyond the standard RLHF process described?**"
question: "What are some alternatives or recent advancements beyond the standard RLHF process described?**"
excerpt: "面试官想看你是否停留在“RLHF = PPO + 奖励模型”的教科书认知，还是能跟上2023-2024年偏好优化领域的快速迭代。考察类型是前沿追踪 + 工程取舍。刁钻点在于：不仅要列出替代方案（DPO/GRPO等），还要"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3903
updated: "2026-09-29"
---

## What are some alternatives or recent advancements beyond the standard RLHF process described?**

`P2` · `llm_training`

🏷 标签：`rlhf`, `dpo`, `alternatives`, `preference-optimization`

#### 1️⃣ 考察意图

面试官想看你是否停留在“RLHF = PPO + 奖励模型”的教科书认知，还是能跟上2023-2024年偏好优化领域的快速迭代。考察类型是**前沿追踪 + 工程取舍**。刁钻点在于：不仅要列出替代方案（DPO/GRPO等），还要能对比它们的**理论假设差异**和**实际落地成本**。答好了能展示你对LLM训练整条链路的深度理解，以及从论文到生产的判断力。

#### 2️⃣ 标准答

标准RLHF（PPO + 奖励模型）的问题在于：训练不稳定、需要同时维护4个模型（Actor/Ref/Reward/Critic）、奖励模型容易过拟合。以下是主流替代方案及进展：

**1. 直接偏好优化（DPO）**

- **核心**：将偏好概率直接建模为策略比率的函数，无需显式奖励模型。损失函数基于Bradley-Terry模型，最大化偏好对的似然。
- **工程取舍**：省去了奖励模型和PPO的KL散度约束，训练速度提升2-3倍，但**牺牲了对奖励信号的细粒度控制**。当偏好数据存在噪声时，DPO容易过拟合到错误偏好。
- **落地坑**：在UltraFeedback数据集上，DPO对学习率极其敏感（推荐1e-6~5e-6），且需要**对正负样本做长度归一化**，否则模型会倾向于生成更长的回答来“刷分”。

**2. 迭代式RLHF（Rejection Sampling + PPO）**

- **核心**：InstructGPT/GPT-4采用的方法——从当前策略采样N个输出，用奖励模型筛选Top-1作为监督数据，再混合SFT和PPO训练。
- **为什么这么做**：Rejection Sampling提供了**高质量的正样本**，缓解了PPO中奖励模型分布外推的问题。代价是采样成本高（N=64~128），且奖励模型必须足够强。
- **实际解法**：DeepSeek-R1的GRPO（Group Relative Policy Optimization）进一步优化——**去掉Critic模型**，用组内输出的平均奖励作为baseline，减少一个模型的维护成本。

**3. 基于排序的优化（RRHF / SLiC-HF）**

- **核心**：用排序损失（如Pairwise Ranking Loss）替代PPO的强化学习目标。RRHF直接优化“偏好输出得分 > 非偏好输出得分”的排序一致性。
- **工程取舍**：训练更稳定（无需PPO的clip和GAE），但**无法处理连续奖励信号**，只适用于离散偏好对。在Helpful/无害性平衡任务上表现不如DPO。

**4. 多奖励模型融合（MoRA / Reward Ensembling）**

- **核心**：训练多个奖励模型（如安全性、有用性、事实性），用加权组合或门控网络融合。Anthropic的Constitutional AI也属于此类——用规则约束替代部分人类反馈。
- **落地坑**：权重需要动态调整。例如在代码生成任务中，有用性权重应高于安全性；在对话中则相反。固定权重会导致**奖励黑客**（Reward Hacking），模型学会讨好某个子奖励模型。

**5. 在线学习与持续反馈（ChatGPT迭代 / 在线DPO）**

- **核心**：不再依赖静态偏好数据集，而是让模型在部署中持续收集用户反馈（点赞/踩/举报），形成完整流程。OpenAI的InstructGPT迭代版就是典型。
- **为什么这么做**：静态数据集的偏好分布会过时（如用户对“详细回答”的偏好随时间变化）。在线学习能**对齐动态分布**，但需要强大的数据管道和隐私保护。

**总结**：DPO适合资源受限团队快速验证，GRPO适合追求训练稳定性的场景，多奖励融合适合安全敏感产品。没有银弹，必须根据数据质量、算力预算和任务特性选择。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，**流程简化派**，如DPO和RRHF，去掉奖励模型直接优化偏好，适合小团队快速迭代；第二，**迭代增强派**，如Rejection Sampling + PPO和GRPO，通过采样提升数据质量但成本高；第三，**多信号融合派**，如MoRA和在线学习，解决单一奖励的偏差和分布漂移。总结一句：没有最优方案，只有根据数据噪声、算力预算和任务特性做工程取舍。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：DPO和PPO在数学上有什么本质区别？为什么DPO更稳定？

> DPO将偏好优化转化为**分类问题**，损失函数是交叉熵形式，梯度平滑；PPO是**策略梯度**，需要估计优势函数（GAE），梯度方差大。DPO的稳定性来自它隐式地约束了策略与参考模型的KL散度（通过比率项），而PPO需要显式加KL惩罚项，且对奖励模型的缩放（Reward Scaling）敏感。实际中，DPO在batch size=32时就能收敛，PPO通常需要256+。

**追问 2**：如果偏好数据有大量噪声（如用户随意点击），你会选哪个方案？

> 选**迭代式RLHF + 奖励模型过滤**。DPO对噪声敏感，因为每个错误偏好对都会直接更新策略。我会先用一个小奖励模型对数据做清洗：对每个偏好对，如果奖励模型打分与人类标注不一致（阈值设为0.3），则丢弃或降权。然后使用Rejection Sampling从当前策略生成N=64个候选，用奖励模型选Top-1作为正样本，再混合SFT训练。这样即使原始数据有30%噪声，最终模型质量下降不超过5%。

**追问 3**：GRPO去掉了Critic模型，那它怎么估计优势函数？

> GRPO用**组内相对奖励**替代Critic。具体做法：对每个prompt采样G个输出（G=8~16），计算每个输出的奖励值，然后用组内奖励的均值作为baseline，每个输出的优势 = 自身奖励 - 组均值。这本质是**蒙特卡洛估计**，方差比PPO的GAE大，但通过增大G可以降低方差。工程上，G=8时效果已接近PPO，且省去了Critic模型的训练和推理成本，整体训练速度提升40%。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提DPO，说“DPO完全替代了RLHF” → ✅ 正确切入：DPO是RLHF的一种变体，但**无法处理连续奖励信号**（如安全性+有用性的加权组合），且对数据质量要求更高。RLHF的PPO路线在复杂多目标场景仍有优势。
- ❌ 说“Rejection Sampling太慢，不实用” → ✅ 正确切入：Rejection Sampling虽然采样成本高，但**能明显提升数据质量**，在GPT-4和Claude的训练中被证明有效。可以通过减少采样数（N=16）或结合知识蒸馏来降低成本。
- ❌ 混淆DPO和RRHF，说“它们都是排序损失” → ✅ 正确切入：DPO基于Bradley-Terry模型，优化的是**策略比率**；RRHF直接优化**排序一致性**，没有显式的策略约束。DPO在数学上更优雅，RRHF在实现上更简单。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“偏好数据质量”角度切入——RAG中用户对检索结果的点击/跳过行为本身就是天然偏好数据，可以用在线DPO持续优化检索排序模型，对比静态BM25的收益。
- **如果你只做过传统NLP**：用“分类 vs 强化学习”类比——DPO相当于用交叉熵做偏好分类，PPO相当于用策略梯度做序列决策。可以展示你在序列标注任务中对比过两种损失函数的经验。
- **如果你是校招无项目**：聚焦DPO论文复现——在GitHub上实现DPO训练一个1.5B模型（如Qwen2.5-1.5B），在Anthropic/hh-rlhf数据集上对比PPO的收敛速度和生成质量，附上loss曲线和BLEU分数。

#### 7️⃣ 延伸阅读

- Direct Preference Optimization: Your Language Model is Secretly a Reward Model (DPO论文)
- DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning (GRPO)
- Training Language Models to Follow Instructions with Human Feedback (InstructGPT)
- RRHF: Rank Responses to Align Language Models with Human Feedback
- Constitutional AI: Harmlessness from AI Feedback (Anthropic)

---
