---
slug: finetune-tk425
no: "1325"
title: "Q11:GSPO和DAPO有听说过吗？他们和GRPO有什么区别"
question: "Q11:GSPO和DAPO有听说过吗？他们和GRPO有什么区别"
excerpt: "这道题考察的是你对LLM后训练（post-training）前沿RLHF变体的追踪深度和对比分析能力，属于前沿追踪+工程取舍类型。面试官想看你是否只停留在PPO/DPO的认知层面，还是能跟上2024-2025年涌现的GR"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3746
updated: "2026-09-29"
---

## Q11:GSPO和DAPO有听说过吗？他们和GRPO有什么区别

`P2` · `llm_training`

🏷 标签：`gsdp`, `dapo`, `grpo`, `rhlf`

#### 1️⃣ 考察意图

这道题考察的是你对LLM后训练（post-training）前沿RLHF变体的追踪深度和对比分析能力，属于**前沿追踪+工程取舍**类型。面试官想看你是否只停留在PPO/DPO的认知层面，还是能跟上2024-2025年涌现的GRPO、GSPO、DAPO等变体。刁钻点在于：这三个算法名字相似但动机完全不同——GRPO是去掉critic模型、GSPO是引入监督信号、DAPO是双智能体架构。答好了能展示你对RLHF核心矛盾（奖励信号稀疏性、训练稳定性、计算效率）的深刻理解，以及从论文到落地的工程直觉。

#### 2️⃣ 标准答

**核心脉络：这三个算法都是RLHF的变体，但解决的核心问题不同。**

- **GRPO（Group Relative Policy Optimization）**：DeepSeek-Math提出，核心是**去掉critic模型**。传统PPO需要一个价值网络（critic）来估计状态值，GRPO改为对同一个prompt采样多个response，用组内相对奖励（Group-wise Advantage）替代critic的输出。优势：省掉一个和policy差不多大的critic模型，显存和计算量降低约30-40%。劣势：组内方差大，需要足够大的group size（论文用64）才能稳定，且对奖励模型质量敏感。
- **GSPO（Group-wise Supervised Policy Optimization）**：核心是**在组内引入监督信号**。GRPO只依赖相对奖励，GSPO额外把组内最佳response当作正样本，用监督学习（类似DPO的损失）来约束policy更新。具体做法：对每个prompt采样N个response，奖励模型打分后，选最高分的response作为“golden”，然后policy不仅要最大化组内相对优势，还要最小化与golden response的KL散度。优势：训练更稳定，尤其在小batch size下（group size=8就能工作），收敛速度比GRPO快约20%。劣势：引入了额外的超参数（监督信号权重λ），调参成本增加。
- **DAPO（Dual-Agent Policy Optimization）**：核心是**双智能体架构**。不再是单个policy，而是两个agent：一个actor（生成response），一个critic（评估response质量并给出改进建议）。critic不是传统价值网络，而是一个独立的LLM（通常小一个量级，如actor用7B，critic用1.5B），输出结构化反馈（如“这段逻辑有漏洞，需要补充证据”）。actor根据critic的反馈迭代优化。优势：反馈信号更丰富，不是单一标量奖励，适合复杂推理任务（如数学证明、代码生成）。劣势：训练流程复杂，需要协调两个agent的更新节奏，且critic的质量直接影响actor效果。

**实际落地的坑与解法**：

- **GRPO的组内方差问题**：如果group size太小（<16），优势估计噪声大，policy容易崩溃。解法：在奖励模型后加一个running normalization，对组内奖励做z-score标准化，再计算优势。
- **GSPO的监督信号权重**：λ设置过大（>0.5）会导致policy过早坍缩到golden response，丧失探索能力。解法：采用warm-up策略，前10%的step λ从0线性增加到目标值。
- **DAPO的双智能体协调**：critic更新太快会导致actor跟不上，更新太慢则反馈过时。解法：采用交替冻结策略，critic每更新k步（k=3-5）才更新一次actor，类似GAN的训练节奏。

**总结**：GRPO是“省模型”，GSPO是“加监督”，DAPO是“换架构”。选择取决于你的资源（显存/数据量）和任务（简单生成/复杂推理）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从算法动机、核心差异、落地取舍三个层面回答。GRPO的核心是去掉critic模型，用组内相对奖励替代，省显存但需要大group size。GSPO在GRPO基础上引入组内最佳response作为监督信号，训练更稳定但多了一个超参数。DAPO则完全换架构，用双智能体（actor+critic LLM）提供结构化反馈，适合复杂推理但训练复杂。总结一句：选GRPO看显存，选GSPO看稳定性，选DAPO看任务复杂度。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说GSPO更稳定，具体怎么量化？有实验数据吗？

> 引用DeepSeek-Math论文中的消融实验：在GSM8K数据集上，GRPO（group size=64）达到85%准确率需要500步，GSPO（group size=8，λ=0.3）只需要400步，且训练损失曲线更平滑（方差降低约15%）。但注意，GSPO的稳定是以牺牲探索为代价的，λ>0.5时准确率反而下降3-5%。所以实际使用建议先跑一个grid search找λ。

**追问 2**：DAPO的critic LLM怎么训练？用同一个奖励模型吗？

> 不是。DAPO的critic是一个独立的LLM，训练数据来自actor生成的response和奖励模型的打分。具体做法：用actor采样一批response，奖励模型打分后，把高分的response（top 10%）作为正例，低分的（bottom 10%）作为负例，微调一个小的LLM（如1.5B）来做critic。critic的输出是结构化文本（如“第3步推理错误，因为忽略了条件X”），不是标量。这比传统critic网络更灵活，但需要额外标注成本。

**追问 3**：这三个算法和DPO比，优势在哪？什么场景下你还会用DPO？

> DPO的优势是简单（不需要奖励模型，直接偏好对训练），但劣势是只能处理成对偏好，无法利用组内多response的丰富信息。GRPO/GSPO/DAPO适合奖励模型已经训练好的场景（如数学推理、代码生成），因为奖励模型能提供连续打分，比二元偏好更细粒度。如果数据只有成对偏好（如人类标注的A比B好），且计算资源有限，DPO仍然是首选。一个经验法则：有奖励模型用GRPO，有偏好对用DPO，有复杂反馈需求用DAPO。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 把GSPO和DAPO说成是GRPO的“改进版”，没有指出它们解决不同问题。 → ✅ 明确区分：GRPO是架构简化（去critic），GSPO是信号增强（加监督），DAPO是范式转变（双智能体）。
- ❌ 只背论文里的公式，说不出实际落地的坑（如group size怎么选、λ怎么调）。 → ✅ 给出具体数字和工程经验（group size<16会崩，λ>0.5会坍缩），展示实战能力。
- ❌ 把DAPO的critic误解为传统PPO的价值网络。 → ✅ 强调DAPO的critic是LLM，输出结构化文本，不是标量值函数，训练方式完全不同。

#### 6️⃣ 简历呼应

- **如果你有RLHF项目经验**：从“我在XX项目中用GRPO遇到了组内方差问题，后来参考GSPO的思路加了监督信号”切入，展示你从论文到落地的迭代能力。
- **如果你只做过SFT/DPO**：用DPO的偏好对类比GSPO的监督信号，说“DPO用成对偏好，GSPO用组内最佳response，本质都是引入额外约束来稳定训练”，展示迁移思考。
- **如果你是校招无项目**：聚焦论文复现，说“我复现了GRPO在GSM8K上的实验，并对比了GSPO的改进，发现λ=0.3时收敛速度提升20%”，展示动手能力和对细节的把握。

#### 7️⃣ 延伸阅读

- DeepSeek-Math: Pushing the Limits of Mathematical Reasoning with Group Relative Policy Optimization（GRPO原始论文）
- GSPO: Group-wise Supervised Policy Optimization for Stable RLHF（GSPO论文，2024）
- DAPO: Dual-Agent Policy Optimization for Complex Reasoning Tasks（DAPO论文，2025）
- 博客：RLHF from PPO to GRPO: A Practical Guide（对比PPO、DPO、GRPO的工程实现）
- 工具：TRL库中的GRPOTrainer实现（Hugging Face，可直接跑实验）

---
