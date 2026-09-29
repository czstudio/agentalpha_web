---
slug: finetune-tk415
no: "1315"
title: "At which stage you will decide to go for the Preference alignment type of method rather than SFT?**"
question: "At which stage you will decide to go for the Preference alignment type of method rather than SFT?**"
excerpt: "面试官想考察的不是你是否背熟了RLHF/DPO的概念，而是你在真实工程流水线中，面对“模型已经SFT过了，但输出仍然不满足业务需求”时，能否做出有依据的决策。刁钻点在于：很多人以为SFT和偏好对齐是二选一，实际上它们是流"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3290
updated: "2026-09-29"
---

## At which stage you will decide to go for the Preference alignment type of method rather than SFT?**

`P2` · `llm_training`

🏷 标签：`preference-alignment`, `rlhf`, `dpo`, `sft`, `llm`

#### 1️⃣ 考察意图

面试官想考察的不是你是否背熟了RLHF/DPO的概念，而是你在真实工程流水线中，面对“模型已经SFT过了，但输出仍然不满足业务需求”时，能否做出**有依据的决策**。刁钻点在于：很多人以为SFT和偏好对齐是二选一，实际上它们是**流水线中的先后阶段**。答好了能展示你对LLM训练全流程的工程判断力——知道何时该停、何时该换工具，以及每种方法的数据成本和收益边界。

#### 2️⃣ 标准答

**决策前提：SFT是偏好对齐的前置条件，不是替代选项。**

- 先做SFT，直到模型在目标任务（如对话、摘要）上达到**基础可用**——即能生成语法正确、内容相关、不胡说的输出。
- 如果SFT后模型输出仍然存在**系统性偏好问题**（如倾向生成有害内容、对敏感话题立场偏激、在选择题中总选B），才考虑偏好对齐。

**具体决策点（按优先级排序）：**

1. **当SFT数据无法覆盖“什么是不好的”时** - SFT只学习“好的回答”的分布，但不会显式惩罚“差的回答”。例如：模型学会了写代码，但不知道“生成恶意代码”是错的。 - 此时需要偏好数据（如Anthropic HH-RLHF中的chosen/rejected对）来告诉模型**哪些行为应被拒绝**。
2. **当需要精细控制输出风格/价值观时** - SFT只能模仿数据分布，无法直接优化“有用性vs无害性”的trade-off。例如：用户问“如何自杀”，SFT模型可能直接给出步骤（因为训练数据里有人这么答），而偏好对齐（如DPO）可以教会模型先拒绝再提供帮助热线。 - 实际落地的坑：偏好数据中chosen/rejected的差异必须足够显著，否则DPO训练后模型会“摆烂”——输出安全但无用的模板话术。解法：在偏好数据中混入10%-20%的“高难度边缘案例”（如政治敏感、医疗建议），并人工校验chosen/rejected的区分度。
3. **当SFT后模型在人类评估中“有用但不可靠”时** - 典型表现：MT-Bench得分高但有害性检测（如Toxicity Classifier）得分也高。这说明模型学会了讨好用户，但没学会拒绝。 - 此时SFT已到瓶颈——再增加SFT数据只会让模型更“油滑”（输出更长但更空洞）。必须切换为偏好对齐，因为偏好对齐的损失函数（如DPO的binary cross-entropy）直接优化“偏好概率”，而非SFT的交叉熵（只优化生成概率）。

**资源考量与工程取舍：**

- **数据成本**：SFT需要10K-100K条高质量问答对；偏好对齐需要5K-20K条chosen/rejected对（但每条标注成本高3-5倍，因为需要人工对比）。
- **训练开销**：DPO比RLHF轻量（不需要单独训练reward model），但DPO对偏好数据质量更敏感——如果数据中有噪声（如chosen/rejected标签反了），DPO会放大错误。RLHF的reward model可以起到“缓冲”作用，但训练reward model需要额外10K-50K条偏好数据。
- **决策流程图**：先SFT → 在验证集上跑有害性检测+人类评估 → 如果有害率>5%或用户投诉率>1%，启动偏好对齐 → 否则继续SFT迭代。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，SFT是前置条件，模型必须先达到基础可用；第二，当SFT后模型存在系统性偏好问题（如有害输出、价值观偏差）时，必须切换到偏好对齐，因为SFT无法直接优化‘拒绝行为’；第三，资源上偏好对齐数据成本更高，但DPO比RLHF更轻量。总结一句：SFT解决‘能不能’，偏好对齐解决‘好不好’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果SFT后模型已经很好，但用户还是投诉，你会怎么排查？

> 先区分是“事实错误”还是“偏好问题”。事实错误：用RAG+检索增强解决，不需要偏好对齐。偏好问题：看投诉内容是否集中在“态度不好/价值观偏激/拒绝不当”上。如果是，收集100条投诉案例，人工标注chosen/rejected对，用DPO微调。注意：不要用SFT去“纠正”偏好问题——SFT会让模型记住投诉案例的句式，但不会学会“为什么这个回答不好”。

**追问 2**：DPO和RLHF在实际效果上到底差多少？

> 在Anthropic的公开实验和我的实践中，DPO在有用性（MT-Bench）上比RLHF低0.1-0.3分，但在安全性（有害性检测）上持平。DPO的优势是训练稳定、不需要reward model，适合小团队快速迭代。RLHF的优势是reward model可以持续优化，适合大团队做长期对齐。工程取舍：如果偏好数据量<10K，选DPO；如果>50K且有算力，选RLHF。

**追问 3**：有没有可能跳过SFT，直接做偏好对齐？

> 理论上可以（如DPO from scratch），但实践中效果很差。因为偏好对齐的损失函数假设模型已经能生成合理输出，只是需要调整偏好。如果模型连基础生成能力都没有（如语法错误、胡言乱语），偏好对齐会放大这些错误。我的经验：至少需要SFT到模型在验证集上perplexity<10，再启动偏好对齐。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“SFT和偏好对齐是二选一，根据任务选一个” → ✅ 正确切入：它们是流水线中的先后阶段，SFT是前置条件，偏好对齐是后置优化。
- ❌ 说“偏好对齐只用于安全性，SFT就够了” → ✅ 正确切入：偏好对齐也用于控制输出风格（如正式/幽默）、减少偏见、提升诚实性，不仅仅是安全。
- ❌ 说“DPO比RLHF好，所以永远选DPO” → ✅ 正确切入：DPO轻量但对数据质量敏感，RLHF稳定但成本高，根据团队资源和数据量做trade-off。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“SFT后模型在检索增强场景下仍然输出有害内容”切入，展示你如何用偏好对齐（如DPO）微调模型，使它在检索到敏感信息时学会拒绝。
- **如果你只做过传统NLP**：用“分类任务中的正负样本”类比——SFT相当于只学正样本，偏好对齐相当于同时学正负样本的对比损失，强调“数据分布”和“损失函数”的区别。
- **如果你是校招无项目**：聚焦Anthropic HH-RLHF数据集的复现实验，说明你如何在LLaMA-2-7B上先SFT再DPO，对比安全性得分，并给出决策流程图。

#### 7️⃣ 延伸阅读

- 《Direct Preference Optimization: Your Language Model is Secretly a Reward Model》（DPO论文）
- 《Training language models to follow instructions with human feedback》（InstructGPT论文，RLHF经典）
- 《Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena》（评估方法）
- Anthropic HH-RLHF数据集（偏好对齐标准数据）
- 《The False Promise of Imitating Proprietary LLMs》（讨论SFT vs 偏好对齐的边界）

---
