---
slug: enterprise-tk327
no: "1227"
title: "为什么要用 reference model ？为了解决什么问题"
question: "为什么要用 reference model ？为了解决什么问题"
excerpt: "面试官想考察你对 RLHF 中 KL 散度惩罚机制 的底层理解，而非简单背诵 PPO 流程。刁钻点在于：为什么不能直接用策略模型自己约束自己？reference model 的“冻结”特性解决了 奖励黑客（reward"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4065
updated: "2026-09-29"
---

## 为什么要用 reference model ？为了解决什么问题

#### 1️⃣ 考察意图

面试官想考察你对 RLHF 中 **KL 散度惩罚机制** 的底层理解，而非简单背诵 PPO 流程。刁钻点在于：为什么不能直接用策略模型自己约束自己？reference model 的“冻结”特性解决了 **奖励黑客（reward hacking）** 和 **模式崩塌（mode collapse）** 两个核心问题。答好了能展示你对 RL 稳定性、分布偏移控制的工程直觉，以及区分 PPO 与 DPO 等不同对齐方法的本质差异。

#### 2️⃣ 标准答

**核心答案**：reference model 在 RLHF 中充当 **KL 散度惩罚的锚点**，防止策略模型（policy model）在追求高奖励时偏离初始 SFT 分布过远，从而避免生成不自然、重复或奖励黑客的文本。

**1. 解决的核心问题：奖励黑客与分布崩塌**

- **奖励黑客**：奖励模型（reward model）是近似函数，有盲区。策略模型可能发现“高分捷径”，例如生成冗长、谄媚或包含特定关键词的文本，而非真正有用内容。无约束时，模型会快速钻入奖励模型的漏洞。
- **分布崩塌**：策略模型为最大化奖励，可能坍缩到少数高奖励模式，丧失多样性。例如，对话模型只会说“好的，我明白了”，拒绝深入回答。
- **reference model 的约束**：通过 KL 散度惩罚，强制策略模型在每一步生成时，其 token 概率分布与 reference model（通常是冻结的 SFT 模型）保持接近。这相当于一个 **软约束**，允许探索但禁止偏离太远。

**2. 为什么不能策略模型自己约束自己？**

- 如果策略模型同时作为参考，KL 散度会变为 0（因为分布完全相同），惩罚失效。更关键的是，策略模型在训练中不断更新，其分布也在漂移。若用自身历史版本做参考，需要维护多个 checkpoint，且无法解决“奖励黑客”问题——模型仍会联合优化自身分布去钻奖励模型漏洞。
- **reference model 必须冻结**，提供一个 **静态、稳定、高质量** 的分布锚点。这个锚点通常是 SFT 阶段训练好的模型，其生成质量已被验证（如 InstructGPT 论文中，reference model 就是 SFT 后的 175B 模型）。

**3. 工程实现中的具体坑与解法**

- **坑 1：KL 惩罚系数（β）的调参**。β 太小，约束弱，模型容易奖励黑客；β 太大，模型几乎不学习，生成与 SFT 无异。实际中，β 通常设为 0.01~0.1 量级，且需要动态调整。例如，DeepSeek-R1 论文中使用了 **自适应 KL 惩罚**：当 KL 散度超过阈值时，自动增大 β；低于阈值时减小 β，保持训练稳定。
- **坑 2：reference model 的存储与推理开销**。在 PPO 训练中，每步需要同时跑策略模型和 reference model 的 forward pass，显存和计算量翻倍。解法：使用 **LoRA** 微调策略模型，reference model 保持全量参数冻结，仅需一次 forward；或者采用 **off-policy** 采样，减少 reference model 调用频率。
- **坑 3：KL 散度计算的数值稳定性**。直接计算 log-prob 差值可能溢出。实际用 `torch.nn.functional.kl_div` 时，需设置 `log_target=True` 并确保输入为 log-prob。更稳定的做法是使用 **对称 KL** 或 **JS 散度** 的变体，但会增加计算量。

**4. 与 DPO 的对比：reference model 的隐式存在**

- DPO（Direct Preference Optimization）声称无需显式 reference model，但其损失函数中隐含了 **SFT 模型作为参考分布**。DPO 的优化目标等价于：在保持与 SFT 模型 KL 散度最小的前提下，最大化偏好概率。因此，DPO 的 reference model 是隐式的（即初始化时的 SFT 模型），且在整个训练中不更新。
- **工程取舍**：PPO 显式使用 reference model，允许更灵活的 KL 惩罚控制（如自适应 β），但训练不稳定、计算成本高；DPO 简化了流程，但失去了对 KL 散度的精细调节能力，在复杂任务（如长文本生成）中容易产生分布偏移。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，reference model 解决奖励黑客和分布崩塌，通过 KL 散度惩罚约束策略模型不偏离 SFT 分布；第二，它必须冻结，因为动态参考会导致约束失效，无法提供稳定锚点；第三，工程上需注意 β 系数调参、计算开销和数值稳定性。总结一句：reference model 是 RLHF 中防止模型‘学歪’的保险丝，没有它，PPO 训练极易崩溃。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果不用 reference model，只用策略模型自己加 KL 正则化会怎样？

> 策略模型自己加 KL 正则化（如对自身 logits 做 L2 惩罚）无法解决奖励黑客问题。因为模型可以同时优化生成策略和正则化项，最终找到“高奖励 + 低惩罚”的联合漏洞。例如，模型可能学会生成“高分但无意义”的文本，同时让自身分布变得非常尖锐（低熵），从而 KL 散度很小。reference model 的冻结性打破了这种联合优化，迫使模型必须向一个固定、高质量分布靠拢。

**追问 2**：KL 惩罚系数 β 怎么调？有没有自适应方法？

> 常见做法是网格搜索 β 在 [0.001, 0.1] 范围，观察 KL 散度和奖励分数的 trade-off。自适应方法参考 DeepSeek-R1：设定 KL 散度目标值（如 0.1 nats），当实际 KL 超过目标时，β *= 1.2；低于时 β /= 1.2。另一种是 **KL 预算** 方法：在 PPO 中设置 KL 散度的上限，超过时截断梯度或回滚参数。注意：自适应 β 会增加训练不稳定风险，建议先固定 β 跑小规模实验确定量级。

**追问 3**：reference model 可以用更小的模型吗？比如用 7B 的 reference 监督 70B 的策略模型？

> 可以，但有风险。小模型作为 reference 会限制策略模型的上限，因为 KL 惩罚会强制策略模型接近小模型的分布，而小模型本身能力不足。实际中，reference model 通常与策略模型同规模（如 InstructGPT 都是 175B）。如果为了节省显存，可以用 **蒸馏版 reference**：先训练一个与策略模型同架构但参数更少的模型，或使用 **LoRA 微调** 的策略模型，reference 保持全量。但必须保证 reference 的分布质量不低于策略模型的初始分布。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “reference model 就是用来计算 KL 散度的，防止模型过拟合。” → ✅ “KL 散度惩罚解决的是奖励黑客和分布崩塌，不是过拟合。过拟合是训练集上的 loss 下降但验证集上升，而 RLHF 中模型可能生成训练集里没有的‘高分垃圾文本’，这是分布外泛化问题，不是过拟合。”
- ❌ “reference model 和策略模型可以共享参数，只是不更新梯度。” → ✅ “共享参数会导致 KL 散度恒为 0，惩罚失效。reference model 必须是一个完全独立、冻结的副本，其参数与策略模型在训练开始时相同，但之后永不更新。”

#### 6️⃣ 简历呼应

- **如果你有 RLHF 项目**：从“我在训练中遇到过 KL 惩罚系数调参的坑”切入，具体描述如何用自适应 β 解决奖励分数波动，并展示 KL 散度与奖励的 trade-off 曲线图。
- **如果你只做过传统 NLP（如文本分类）**：类比“reference model 就像知识蒸馏中的教师模型，提供稳定分布锚点，防止学生模型在微调时遗忘预训练知识”。强调你对“分布偏移”的理解，并提及 SFT 模型作为 reference 的合理性。
- **如果你是校招无项目**：聚焦 InstructGPT 论文复现，说明你理解 reference model 在 PPO 中的数学形式（KL 散度项），并对比 DPO 的隐式 reference，展示你对不同对齐方法的底层差异有思考。
- InstructGPT 论文：Training language models to follow instructions with human feedback
- DeepSeek-R1 论文：DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning
- DPO 论文：Direct Preference Optimization: Your Language Model is Secretly a Reward Model
- 博客：The KL Divergence in RLHF: Why It Matters and How to Tune It
- 工具：TRL 库中 PPO 实现（含 reference model 的 forward 逻辑）

---
