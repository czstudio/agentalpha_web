---
slug: finetune-tk114
no: "1014"
title: "那么在RLHF中到底有几个模型？他们是怎么配合做训练的？而我们最终要的是哪个模型"
question: "那么在RLHF中到底有几个模型？他们是怎么配合做训练的？而我们最终要的是哪个模型"
excerpt: "面试官想考察你对RLHF（基于人类反馈的强化学习）全流程的系统理解，而不仅仅是背诵“PPO”三个字母。这道题的刁钻点在于：多数人只记得Actor和Reward模型，却忽略Critic和Ref模型，更说不清它们如何在PPO"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3768
updated: "2026-09-29"
---

## 那么在RLHF中到底有几个模型？他们是怎么配合做训练的？而我们最终要的是哪个模型

`P1` · `llm_training`

📊 考点：rlhf · ppo · llm-training

🏷 标签：`actor-critic, reward-model`

#### 1️⃣ 考察意图

面试官想考察你对RLHF（基于人类反馈的强化学习）全流程的系统理解，而不仅仅是背诵“PPO”三个字母。这道题的刁钻点在于：多数人只记得Actor和Reward模型，却忽略Critic和Ref模型，更说不清它们如何在PPO训练中动态配合。答好了能展示你对LLM对齐训练（alignment training）的工程落地能力，包括多模型内存管理、KL散度约束的数学意义，以及最终部署时模型剪枝的取舍。

#### 2️⃣ 标准答

RLHF训练涉及**4个模型**，按角色分为：**Actor（策略模型）**、**Critic（价值模型）**、**Reward模型**、**Ref模型（参考模型）**。训练分两阶段：先训练Reward模型，再用PPO算法联合训练Actor和Critic。

**阶段一：训练Reward模型**

- 收集人类偏好数据（如对两个回答排序），训练一个二分类器，输入是prompt+response，输出一个标量分数（reward）。
- 常用架构：在预训练LLM（如GPT-2）的最后一层加一个线性头，输出单值。训练损失是Bradley-Terry模型的对似然：`-log(σ(r_w - r_l))`，其中`r_w`是胜出回答的reward，`r_l`是失败回答的reward。
- **工程取舍**：Reward模型不能太大（如7B），否则训练时显存爆炸；但太小（如125M）又无法捕捉复杂偏好。实践中常用1.3B-7B，与Actor模型同规模或略小。

**阶段二：PPO训练Actor和Critic**

- **Actor**：生成回答的策略模型，参数可更新。输入prompt，输出token序列。
- **Critic**：价值模型，预测状态（当前已生成token序列）的预期总reward。通常与Actor共享底层（如同个LLM），但顶层不同：Actor输出logits，Critic输出一个标量。
- **Ref模型**：冻结的Actor副本，用于计算KL散度，防止Actor偏离原始模型过远。**为什么这么做**：没有KL约束，Actor会快速过拟合到Reward模型的高分区域，生成重复或空洞的文本。
- **训练流程**：Actor生成一批回答（rollout）。
- Reward模型给每个回答打分。
- Critic预测每个token位置的价值（value）。
- 计算advantage：`A_t = (reward - value_t)` 或使用GAE（广义优势估计）。
- 更新Actor：最大化`E[log π(a|s) * A_t] - β * KL(π || π_ref)`，其中β控制KL惩罚强度。
- 更新Critic：最小化`(reward - value_t)^2`。
- **实际落地的坑**：Actor和Critic交替更新时，Critic的value预测会滞后，导致advantage估计不准。解法：使用**mini-batch多次更新**（如PPO-epoch=4），并引入**value clipping**（限制value更新幅度）。

**最终部署模型**

- **只保留Actor模型**。Critic、Reward、Ref模型在推理时全部丢弃。
- **为什么**：Critic只在训练时提供advantage信号；Reward模型只在训练时打分；Ref模型只在训练时计算KL。部署时只需要Actor生成文本。
- **工程取舍**：虽然只保留Actor，但训练时4个模型同时加载，显存需求巨大（如7B模型×4≈28B参数）。解法：使用**LoRA微调**（只更新低秩矩阵），或**混合精度训练**（FP16/FP32混合），或**模型并行**（将不同模型分到不同GPU）。

**总结**：RLHF通过多模型协作实现对齐，核心是Actor模型。面试官真正想听的是你能否清晰区分各模型角色，并解释PPO中Actor-Critic的配合机制。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从模型角色、训练流程、最终产出三个层面回答。第一，RLHF涉及4个模型：Actor（策略）、Critic（价值）、Reward模型、Ref模型（参考）。第二，训练分两步：先训练Reward模型，再用PPO联合训练Actor和Critic，其中Actor生成回答，Critic预测价值，Reward提供奖励，Ref计算KL散度防止偏离。第三，最终只保留Actor用于推理，其他模型全部丢弃。总结一句：RLHF的核心是Actor模型，其他模型只是训练时的辅助工具。”

#### 4️⃣ 高频追问 & 应对

**追问1**：为什么PPO中需要Critic模型？直接用Reward模型的分数不行吗？

> 不行。Reward模型只给整个回答一个分数（稀疏奖励），而Critic模型预测每个token位置的价值（密集奖励）。PPO的advantage计算需要每个时间步的value，才能判断“当前token是好是坏”。如果只用Reward分数，只能做整句更新，效率极低。工程上，Critic通常与Actor共享底层，这样训练时只多一个线性头，显存开销可控。

**追问2**：KL散度系数β怎么设置？太大或太小会怎样？

> β控制对齐强度。太大（如0.1）：Actor几乎不偏离Ref，对齐效果差，reward提升小。太小（如0.001）：Actor过拟合到Reward模型，生成重复或空洞文本。实践中常用**自适应KL惩罚**：设定目标KL值（如0.02），训练时动态调整β——如果当前KL > 目标，增大β；反之减小β。这来自PPO论文的KL-adaptive方法。

**追问3**：如果显存不够，怎么训练RLHF？

> 三种解法：1）**LoRA微调**：只更新Actor的低秩矩阵，其他模型冻结，显存从4×7B降到1×7B+3×小模型。2）**模型卸载**：将Reward和Ref模型卸载到CPU，只在GPU上保留Actor和Critic。3）**梯度检查点**：训练时丢弃中间激活，反向传播时重新计算，节省显存但增加计算时间。实际项目中常用LoRA+混合精度训练，7B模型可在单卡A100上跑通。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“RLHF只有3个模型：Actor、Reward、Critic，没有Ref模型。” → ✅ 必须包含Ref模型，它是冻结的Actor副本，用于KL散度约束，防止过拟合。没有Ref，PPO训练会发散。
- ❌ 说“最终部署时保留Reward模型，用于在线打分。” → ✅ 部署时只保留Actor，Reward模型只在训练阶段使用。在线打分需要额外推理成本，且Reward模型可能被攻击。
- ❌ 说“Actor和Critic是独立训练的，互不干扰。” → ✅ 它们交替更新，Critic的value预测直接影响Actor的advantage计算，两者耦合紧密。实践中常用共享底层来减少参数。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“多模型协作”角度切入，类比RAG中检索器、生成器、重排序器的配合，强调RLHF中Actor-Critic的耦合关系，以及显存优化经验（如LoRA）。
- **如果你只做过传统NLP**：用“监督学习 vs 强化学习”对比切入，说明RLHF中Reward模型替代了人工标注，Critic替代了损失函数，Ref模型防止过拟合。强调你对PPO算法的数学理解（如KL散度、advantage）。
- **如果你是校招无项目**：聚焦论文复现demo，如用GPT-2+情感分类器实现简化版RLHF，在IMDb数据集上训练，展示reward曲线和KL散度变化。强调你理解每个模型的作用和训练流程。

#### 7️⃣ 延伸阅读

- 《Training language models to follow instructions with human feedback》（InstructGPT论文）
- 《Proximal Policy Optimization Algorithms》（PPO原始论文）
- 《Fine-Tuning Language Models from Human Preferences》（RLHF早期论文）
- 《LoRA: Low-Rank Adaptation of Large Language Models》（参数高效微调）
- 《The KL-adaptive PPO implementation in TRL library》（Hugging Face TRL库文档）

---
