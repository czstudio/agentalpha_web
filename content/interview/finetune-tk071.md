---
slug: finetune-tk071
no: "971"
title: "简要介绍一下 SFT 的核心流程，以及数据集的构建策略， SFT 之后常见的 Post - Training 还有哪些？它们之间的目的有何区别"
question: "简要介绍一下 SFT 的核心流程，以及数据集的构建策略， SFT 之后常见的 Post - Training 还有哪些？它们之间的目的有何区别"
excerpt: "面试官想看你是否真正理解LLM训练全流程的“为什么”，而非只背SFT步骤。考察类型是系统设计+工程取舍：SFT是监督学习，Post-Training（RLHF/DPO等）是偏好对齐，两者目标截然不同。刁钻点在于：很多人把"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4148
updated: "2026-09-29"
---

## 简要介绍一下 SFT 的核心流程，以及数据集的构建策略， SFT 之后常见的 Post - Training 还有哪些？它们之间的目的有何区别

`P1` · `llm_training`

📊 考点：sft · rlhf · dpo

🏷 标签：`post-training, dataset`

#### 1️⃣ 考察意图

面试官想看你是否真正理解LLM训练全流程的“为什么”，而非只背SFT步骤。考察类型是**系统设计+工程取舍**：SFT是监督学习，Post-Training（RLHF/DPO等）是偏好对齐，两者目标截然不同。刁钻点在于：很多人把SFT和Post-Training混为一谈，或认为DPO只是RLHF的简化版，答好了能展示你对训练范式的深层理解——SFT解决“指令遵循”，Post-Training解决“价值观对齐”，以及各自在数据、算法、成本上的trade-off。

#### 2️⃣ 标准答

**SFT核心流程**

- **加载预训练基座**：如Llama-2-7B、Qwen-7B，注意基座模型是“续写模型”，未经过指令微调，输出随机。
- **准备指令数据集**：格式统一为`{"instruction": "...", "input": "...", "output": "..."}`，常用Alpaca模板或ShareGPT格式。关键点：**输入输出必须严格配对**，避免模型学到“指令-输出”的随机映射。
- **选择微调方法**：全参数微调（Full Fine-Tuning）效果最好但显存爆炸（7B模型需~56GB）；LoRA（Low-Rank Adaptation）是主流，rank=8~64，只更新~0.1%参数，显存降至~16GB。**Trade-off**：LoRA收敛慢，且低rank（<16）可能丢失领域知识，高rank（>64）又接近全参数成本。
- **设置超参数**：学习率1e-5~5e-5（全参数）或1e-4~5e-4（LoRA），batch size 64~128，epoch 2~3（多了过拟合）。**实际坑**：学习率过高导致loss震荡，过低则SFT后模型仍像基座。
- **训练与评估**：用交叉熵损失（Cross-Entropy Loss）只计算输出部分的loss，忽略指令和输入。评估用BLEU/Rouge（生成任务）或准确率（分类任务），但更推荐人工抽检10~20条，看是否“胡说八道”。

**数据集构建策略**

- **多样性**：覆盖问答、摘要、翻译、代码、角色扮演等，比例按业务场景调整（如客服场景，问答占70%）。**坑**：单一任务占比过高（如90%问答），模型会“遗忘”其他能力。
- **质量**：人工标注+清洗，剔除“答非所问”或“有毒内容”。**具体方法**：用GPT-4做初筛（给1~5分），低于3分直接丢弃；再人工抽检10%。**Trade-off**：GPT-4筛选成本高（每百万token约\$3），但比全人工便宜10倍。
- **平衡**：各任务比例按“难度”而非“数量”分配。例如：简单问答（50%）、中等推理（30%）、复杂代码（20%），避免模型只学会简单模式。
- **格式统一**：用Alpaca模板（`### Instruction:\n...\n### Input:\n...\n### Response:\n...`）或ChatML格式（`<|im_start|>user\n...<|im_end|>`）。**注意**：模板不一致会导致模型“格式错乱”，如输出时漏掉`### Response`。

**常见Post-Training及目的区别**

- **RLHF（Reinforcement Learning from Human Feedback）**：核心是训练一个Reward Model（RM）来打分，再用PPO优化策略。**目的**：对齐人类偏好（有用性、安全性、无害性）。**代价**：需要额外训练RM（需大量人类偏好数据），且PPO训练不稳定（KL散度惩罚系数需调参）。
- **DPO（Direct Preference Optimization）**：直接优化偏好，无需RM。**目的**：与RLHF相同，但更简单、稳定。**Trade-off**：DPO假设偏好数据是“完美”的，实际中噪声数据会导致模型“过度对齐”（如拒绝回答所有问题）。**实际解法**：用DPO+KL正则化（参考DPO论文公式8），或混合SFT数据（10%比例）防止遗忘。
- **PPO（Proximal Policy Optimization）**：是RLHF中的优化算法，不是独立阶段。**目的**：在RM指导下更新策略，同时用KL惩罚防止偏离SFT太远。**区别**：PPO是“在线”的（每次更新需重新采样），DPO是“离线”的（固定数据集），所以PPO更高效但更复杂。
- **其他变体**：RLAIF（AI反馈，用GPT-4代替人类标注偏好）、GRPO（Group Relative Policy Optimization，DeepSeek-R1用的，无需RM，用组内相对奖励）。

**总结**：SFT是“教模型说人话”，Post-Training是“教模型说好话”。SFT后模型可能“有毒”或“拒绝回答”，Post-Training通过偏好对齐解决。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从SFT流程、数据集构建、Post-Training对比三个层面回答。SFT核心是加载基座+指令数据+LoRA微调，数据集要多样性、高质量、平衡。Post-Training常见有RLHF（需RM+PPO）、DPO（直接优化偏好）、PPO（优化算法）。目的区别：SFT让模型遵循指令，Post-Training对齐人类偏好（有用性、安全性）。总结一句：SFT解决‘能不能’，Post-Training解决‘好不好’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：SFT数据量多大合适？太少会怎样？

> 通用经验：7B模型至少需要1万条高质量指令数据，13B需要3~5万条。太少（<1000条）会导致模型“过拟合”到特定模式，如只输出固定格式。**实际解法**：用数据增强（如回译、同义词替换）扩充，或混合通用SFT数据（如OpenAssistant的1万条）。**Trade-off**：数据量过大（>10万条）收益递减，且训练成本线性增长。

**追问 2**：DPO和RLHF哪个在实际业务中更推荐？为什么？

> 业务中更推荐DPO，原因：① 无需训练RM，节省50%算力（7B模型RLHF需~4张A100，DPO只需2张）；② 训练稳定，无PPO的KL调参烦恼。但DPO对数据质量敏感，如果偏好数据噪声大（如标注员不一致），RLHF的RM能“平滑”噪声。**实际解法**：先用DPO快速迭代，若效果差（如模型过度拒绝），再切回RLHF+PPO。

**追问 3**：SFT后模型“遗忘”了预训练知识怎么办？

> 这是“灾难性遗忘”问题。**解法**：① 混合预训练数据（10~20%比例）一起训练，如SFT时加入5%的C4语料；② 用EWC（Elastic Weight Consolidation）正则化，对重要参数加惩罚；③ 多阶段SFT：先通用指令（如Alpaca），再领域指令（如医疗），每阶段保留10%旧数据。**Trade-off**：混合预训练数据会降低SFT效率（收敛慢），但能保住通用能力。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“SFT和RLHF/DPO是并列关系，都是微调方法” → ✅ 正确说法：SFT是监督学习阶段，RLHF/DPO是偏好对齐阶段，两者是“先教后对齐”的流水线关系，不是并列。
- ❌ 说“DPO比RLHF好，因为不需要RM” → ✅ 正确说法：DPO更简单稳定，但RLHF在噪声数据下更鲁棒，且PPO的在线采样能探索新策略。没有绝对优劣，取决于数据质量和算力。
- ❌ 说“SFT数据集越多越好” → ✅ 正确说法：SFT数据量有边际效应，1万条高质量数据可能优于10万条低质量数据。关键是多样性+质量，而非数量。

#### 6️⃣ 简历呼应

- **如果你有LLM训练项目**：从“实际训练中SFT和DPO的loss曲线对比”切入，展示你调过学习率和KL惩罚系数，并给出具体数值（如DPO的beta=0.1时效果最好）。
- **如果你只做过传统NLP**：用“分类任务微调”类比SFT（都是监督学习），用“对比学习”类比DPO（都是偏好优化），强调“传统NLP没有对齐阶段，LLM多了价值观约束”。
- **如果你是校招无项目**：聚焦“论文复现”，如复现Llama-2的SFT+DPO流程，在OpenAssistant数据集上跑通，并对比SFT前后生成质量（如Helpfulness评分从3.2提升到4.1），展示你对开源工具（HuggingFace TRL）的熟悉度。

#### 7️⃣ 延伸阅读

- 《Llama 2: Open Foundation and Fine-Tuned Chat Models》——SFT+RLHF全流程详解
- 《Direct Preference Optimization: Your Language Model is Secretly a Reward Model》——DPO论文
- 《Proximal Policy Optimization Algorithms》——PPO原始论文
- HuggingFace TRL库文档——SFTTrainer和DPOTrainer实战
- 《Training Language Models to Follow Instructions with Human Feedback》——InstructGPT论文，RLHF奠基作

---
