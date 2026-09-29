---
slug: finetune-tk073
no: "973"
title: "大模型是怎么训练出来的"
question: "大模型是怎么训练出来的"
excerpt: "面试官想看你是否真正理解大模型训练的全流程，而非只背过“预训练→SFT→RLHF”三个词。考察类型是系统设计+工程取舍，刁钻点在于：能否说清每个阶段的目标、数据、损失函数、训练方式的本质差异，以及为什么需要三个阶段而非一"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3689
updated: "2026-09-29"
---

## 大模型是怎么训练出来的

`P1` · `llm_training`

📊 考点：pretraining · sft · rlhf

🏷 标签：`llm`

#### 1️⃣ 考察意图

面试官想看你是否真正理解大模型训练的全流程，而非只背过“预训练→SFT→RLHF”三个词。考察类型是**系统设计+工程取舍**，刁钻点在于：能否说清每个阶段的目标、数据、损失函数、训练方式的本质差异，以及为什么需要三个阶段而非一步到位。答好了能展示你对LLM训练从数据到分布式调度的全局认知，以及面对训练不稳定、奖励黑客等实际问题的解决思路。

#### 2️⃣ 标准答

大模型训练分三个核心阶段，每个阶段解决不同问题，数据、算法、资源需求截然不同。

#### 阶段一：预训练（Pretraining）

- **目标**：从海量无标注文本中学习语言统计规律和世界知识，本质是压缩下一个token的分布。
- **数据**：TB级互联网语料（如Common Crawl、Books3、Wikipedia），需经过清洗（去重、过滤低质量、隐私脱敏）、分词（BPE/Unigram）、混合采样（按领域比例，如代码、科学论文权重更高）。
- **算法**：自回归语言建模，损失函数为交叉熵 `L = -Σ log P(token_i | context)`。典型模型如GPT-3使用175B参数，训练在V100集群上耗时数月。
- **工程取舍**：分布式训练必须组合数据并行（Data Parallelism，每卡一份模型副本，梯度同步）、模型并行（Model Parallelism，如张量切片、流水线并行Pipeline Parallelism）和ZeRO优化（减少显存冗余）。**坑**：梯度累积步数过大导致训练不稳定，需用混合精度训练（FP16/BF16）和梯度裁剪（max_grad_norm=1.0）缓解。
- **实际落地的坑**：数据质量比数量更重要。比如用重复数据训练会导致模型过拟合，生成重复文本。解法：使用MinHash去重，并监控训练损失曲线，若验证损失不降则调整数据配比。

#### 阶段二：有监督微调（SFT）

- **目标**：让模型学会遵循指令、对话格式，对齐人类偏好。
- **数据**：人工标注的高质量指令-回答对（如OpenAssistant、ShareGPT），通常数万到百万条。需注意多样性（覆盖问答、写作、代码、推理等）和格式一致性（如用`<|im_start|>`标记角色）。
- **算法**：全量微调或参数高效微调（PEFT）。常用LoRA（Low-Rank Adaptation），在Transformer的QKV矩阵上插入低秩矩阵，训练参数量仅为全量的0.1%-1%，显存需求从80GB降至8GB（以7B模型为例）。
- **工程取舍**：全量微调效果好但成本高，LoRA可能丢失部分知识。**坑**：SFT数据中若包含错误答案，模型会学会“自信地胡说”。解法：人工审核数据，对每个回答标注置信度，并加入拒绝采样（Rejection Sampling）过滤低质量样本。

#### 阶段三：强化学习（RLHF/DPO）

- **目标**：进一步对齐人类价值观，提升有用性、诚实性、无害性。
- **数据**：人类对模型输出的偏好排序（如A>B>C），用于训练奖励模型（Reward Model, RM）。RM通常是一个与基座模型同架构但去掉LM head的分类器，输出标量分数。
- **算法**：PPO（Proximal Policy Optimization）或DPO（Direct Preference Optimization）。PPO流程：SFT模型作为策略，RM提供奖励，KL散度约束防止策略偏离太远。DPO则直接优化偏好损失，省去RM训练，更稳定。
- **实际落地的坑**：奖励黑客（Reward Hacking）——模型学会生成冗长但无用的回答来获取高分。解法：在奖励函数中加入长度惩罚项（如`reward -= λ * len(response)`），或使用PPO的KL惩罚系数（β=0.01-0.1）控制。
- **工程取舍**：PPO需要同时加载策略、参考模型、RM、价值网络，显存需求翻倍。常用方案：使用DeepSpeed ZeRO-3或vLLM做推理加速，或改用DPO（只需单模型，显存减半但收敛慢）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从预训练、SFT、RLHF三个层面回答。预训练用海量无监督数据做自回归预测，核心是分布式训练和数据质量；SFT用人工标注指令数据做监督微调，常用LoRA降低显存；RLHF通过奖励模型和PPO/DPO对齐人类偏好，关键防奖励黑客。总结一句：大模型训练是‘先学知识、再学指令、最后学价值观’的三阶段流水线。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：预训练时如果loss不降怎么办？

> 检查数据质量：用MinHash去重，看是否混入噪声（如HTML标签）。调整学习率调度：使用余弦退火（cosine annealing）或warmup（前1000步线性升温）。检查梯度：若梯度爆炸（norm>10），增大梯度裁剪阈值或降低学习率。若梯度消失（norm<1e-5），检查是否用了错误的激活函数（如Sigmoid在深层网络）。最后，考虑模型架构：增加层数或注意力头数可能缓解欠拟合。

**追问 2**：SFT和RLHF的数据量级一般是多少？为什么？

> SFT通常需要1万-10万条高质量指令对，太少模型学不会指令格式，太多（>100万）边际收益递减且可能引入噪声。RLHF的偏好数据约10万-100万对，因为奖励模型需要足够多样本区分细微偏好。关键取舍：SFT数据重质量（人工标注），RLHF数据重多样性（覆盖长尾场景）。实际中，Anthropic的HH-RLHF数据集约16万对，OpenAI的InstructGPT用了约1.3万对SFT+3.3万对偏好数据。

**追问 3**：DPO相比PPO有什么优缺点？

> 优点：DPO无需训练奖励模型，显存减半（只需一个模型），训练更稳定（无PPO的KL散度调参）。缺点：DPO假设偏好数据是Bradley-Terry模型，当偏好非传递性（如A>B>C但C>A）时效果差；且DPO对数据噪声敏感，错误标注会直接污染策略。工程上，PPO适合有强RM的场景（如安全对齐），DPO适合快速迭代（如小团队微调）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“预训练用无监督学习，SFT用监督学习，RLHF用强化学习” → ✅ 应强调本质：预训练是自监督（预测下一个token），SFT是监督微调（输入输出对），RLHF是强化学习（策略优化+奖励模型）。
- ❌ 说“RLHF就是PPO” → ✅ 应区分：RLHF是框架（包括RM训练和策略优化），PPO是其中一种优化算法，还有DPO、ReMax等替代方案。
- ❌ 说“SFT数据越多越好” → ✅ 应指出：SFT数据重质量而非数量，过多低质量数据会导致模型“学坏”，且边际收益递减。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“预训练数据清洗”切入，对比RAG中检索文档的去重与预训练语料去重（如MinHash vs SimHash），展示对数据质量的工程理解。
- **如果你只做过传统NLP**：用“文本分类微调”类比SFT，说明全量微调与LoRA的取舍（如BERT微调与GPT微调的区别），并延伸至RLHF的奖励模型设计（类似二分类但输出连续分数）。
- **如果你是校招无项目**：聚焦“迷你GPT训练”demo，描述用OpenWebText子集训练125M参数GPT-2的过程，记录loss曲线和生成样本，并讨论分布式训练（如单卡vs多卡）的显存瓶颈。

#### 7️⃣ 延伸阅读

- 《Language Models are Few-Shot Learners》（GPT-3论文，预训练细节）
- 《Training language models to follow instructions with human feedback》（InstructGPT，RLHF框架）
- 《Direct Preference Optimization: Your Language Model is Secretly a Reward Model》（DPO论文）
- 《ZeRO: Memory Optimizations Toward Training Trillion Parameter Models》（分布式训练优化）
- 《LoRA: Low-Rank Adaptation of Large Language Models》（参数高效微调）

---
