---
slug: enterprise-tk413
no: "1313"
title: "**Q24：Token-level reward 和 Sequence-level reward 区别"
question: "**Q24：Token-level reward 和 Sequence-level reward 区别"
excerpt: "这道题考察的是 RLHF 中奖励信号设计的核心 trade-off：细粒度 vs 稀疏性。面试官想看你是否理解奖励粒度如何影响信用分配（credit assignment）和训练效率，而不仅仅是背定义。刁钻点在于：Tok"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4106
updated: "2026-09-29"
---

## **Q24：Token-level reward 和 Sequence-level reward 区别

#### 1️⃣ 考察意图

这道题考察的是 RLHF 中奖励信号设计的核心 trade-off：**细粒度 vs 稀疏性**。面试官想看你是否理解奖励粒度如何影响信用分配（credit assignment）和训练效率，而不仅仅是背定义。刁钻点在于：Token-level 看似更优，但实际部署中常因标注成本高、奖励噪声大而失败；Sequence-level 虽简单，却可能因延迟反馈导致模型学不到局部正确行为。答好了能展示你对强化学习在 LLM 中落地的工程直觉，包括对 PPO、GRPO、PRM 等方法的优劣判断。

#### 2️⃣ 标准答

**定义与核心区别**

- **Token-level reward**：对生成序列中每个 token 给予即时奖励信号。例如，在数学推理中，模型每写一步推导，PRM（Process Reward Model）就给出一个分数，评估这一步的正确性。
- **Sequence-level reward**：仅在完整序列生成后给予一个整体奖励。例如，翻译任务中，用 BLEU 或人工评分评估整句质量，然后一次性反馈。

**信用分配：Token-level 的天然优势**

- Token-level 解决了 Sequence-level 的**信用分配困难**：在 Sequence-level 下，如果最终答案错误，模型无法区分是第一步推理错了还是最后一步写错了。Token-level 通过逐步奖励，让模型知道“这一步对了，下一步错了”，从而精准更新策略。
- 实际落地坑：Token-level 奖励需要密集标注或过程模型，但过程模型本身可能不准确。例如，在代码生成中，PRM 可能误判中间变量定义为“正确”，导致模型学到错误模式。解法是**混合使用**：用 Sequence-level 奖励做粗粒度筛选，再用 Token-level 奖励做细粒度微调。

**训练效率与稳定性**

- **Sequence-level**：通常配合 REINFORCE 或 GRPO 使用。GRPO 通过组内相对奖励（group-based advantage）减少方差，但奖励信号依然稀疏。优点是简单，只需最终结果（如 pass@k 指标），适合翻译、摘要等整体质量任务。
- **Token-level**：常用 PPO 变体，但需要为每个 token 计算 advantage，计算量是 Sequence-level 的序列长度倍。例如，生成 1024 个 token，Token-level 的梯度更新次数是 Sequence-level 的 1024 倍，导致训练不稳定。工程取舍：**降低更新频率**，只在关键 token（如数学推理的“=”符号）处施加 Token-level 奖励，其余用 Sequence-level 兜底。

**应用场景与案例**

- **Token-level 适用**：数学推理（R1 的 PRM）、代码生成（逐步验证）、对话系统（每轮反馈）。案例：OpenAI 的 PRM 在 MATH 数据集上，Token-level 奖励使准确率提升 15%，但训练时间增加 3 倍。
- **Sequence-level 适用**：摘要（ROUGE 评分）、翻译（BLEU）、创意写作（人工评分）。案例：DeepSeek-R1 使用 Sequence-level 奖励配合 GRPO，在推理任务上达到 SOTA，但需要大量采样（每组 64 个样本）来补偿稀疏性。

**实际落地的坑与解法**

- **坑 1**：Token-level 奖励导致模型“钻空子”。例如，在代码生成中，模型可能生成大量无意义注释来获得中间奖励，但最终代码不运行。解法：**惩罚冗余 token**，在奖励函数中加入长度正则项。
- **坑 2**：Sequence-level 奖励在长序列中方差极大。例如，生成 2000 token 的故事，最终奖励可能完全取决于最后 100 token 的质量。解法：**分段奖励**，将序列切分成 200 token 的块，每块给一个 Sequence-level 奖励，再聚合。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，定义层面，Token-level 对每个 token 给即时奖励，Sequence-level 只在序列结束时给奖励；第二，信用分配层面，Token-level 能精准定位错误步骤，但需要过程模型，Sequence-level 简单但稀疏，容易导致模型学不到局部正确行为；第三，工程取舍层面，Token-level 训练成本高、易过拟合，Sequence-level 需要大量采样来补偿稀疏性。总结一句：选哪个取决于任务——需要逐步监督的用 Token-level，整体质量优先的用 Sequence-level，实际中常混合使用。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说 Token-level 需要过程模型，那过程模型怎么训练？会不会引入偏差？

> 过程模型通常用人工标注的步骤正确性数据训练，比如在数学推理中，标注每一步的“正确/错误/不确定”。但偏差确实存在：标注者可能对中间步骤有分歧，导致模型学到噪声。解法是**多标注者投票**，并引入置信度阈值，只对高置信度步骤施加 Token-level 奖励。另外，可以用 Sequence-level 奖励做校准：如果最终答案正确但过程模型判错，则降低过程模型权重。

**追问 2**：GRPO 为什么适合 Sequence-level？和 PPO 比有什么优势？

> GRPO 的核心是**组内相对奖励**：对同一 prompt 生成多个序列，用组内平均奖励作为基线，避免像 PPO 那样需要单独的价值网络。这降低了训练复杂度，尤其适合 Sequence-level 场景，因为奖励信号稀疏，价值网络很难学准。但 GRPO 的代价是**采样效率低**：需要每组 16-64 个样本才能稳定估计 advantage，而 PPO 只需 1 个样本。工程上，如果 GPU 资源充足，GRPO 更简单；否则用 PPO 加价值网络更省显存。

**追问 3**：有没有办法结合两者？比如在推理任务中混合使用？

> 有，典型做法是**分层奖励**：先用 Sequence-level 奖励筛选出高质量序列（如 pass@k 前 20%），再对这些序列的每个 token 施加 Token-level 奖励。这样既减少了 Token-level 的计算量，又保留了细粒度反馈。另一个方法是**动态切换**：在训练初期用 Sequence-level 奖励让模型快速收敛，后期切换到 Token-level 奖励做精细调整。实际案例：Google 的 PaLM 2 在数学推理中，先用 Sequence-level 训练 80% 的步数，再用 Token-level 微调 20%，最终准确率提升 10%。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Token-level 一定比 Sequence-level 好，因为它更细粒度” → ✅ 正确切入：Token-level 虽然细粒度，但需要过程模型，可能引入偏差，且训练成本高；Sequence-level 简单但稀疏，两者各有优劣，需根据任务选择。
- ❌ 说“Sequence-level 只能用 REINFORCE，Token-level 只能用 PPO” → ✅ 正确切入：Sequence-level 也可以用 PPO（加价值网络），Token-level 也可以用 GRPO（但需要修改 advantage 计算），关键在于奖励信号的粒度，而非算法绑定。
- ❌ 说“Token-level 奖励可以完全解决信用分配问题” → ✅ 正确切入：Token-level 只能缓解信用分配，如果过程模型本身有噪声，可能放大错误。实际中常混合使用，或只在关键 token 处施加奖励。

#### 6️⃣ 简历呼应

- **如果你有 RLHF 项目**：从“我在项目中对比了 Token-level 和 Sequence-level 奖励对模型收敛速度的影响”切入，具体说明你用了什么算法（如 PPO vs GRPO），以及如何解决信用分配问题。
- **如果你只做过传统 NLP**：用“机器翻译中的 BLEU 是 Sequence-level 奖励，而逐步翻译的中间评估是 Token-level 奖励”类比，展示你对奖励粒度的理解，并提到你如何将这种思路迁移到 LLM 训练中。
- **如果你是校招无项目**：聚焦“我复现了 PRM 论文中的 Token-level 奖励实验，在 MATH 数据集上对比了两种奖励的准确率和训练时间”，强调你对论文细节的理解和动手能力。
- “Let’s Verify Step by Step” (OpenAI PRM 论文)
- “DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning”
- “GRPO: Group Relative Policy Optimization” (DeepSeek 技术报告)
- “The Unreasonable Effectiveness of Process Rewards for Mathematical Reasoning”
- “Scaling Laws for Reward Model Overoptimization” (Anthropic 论文)

---
