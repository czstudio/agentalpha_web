---
slug: enterprise-tk721
no: "1621"
title: "What is LLM, and how are LLMs trained"
question: "What is LLM, and how are LLMs trained"
excerpt: "这道题看似基础，但面试官真正想看的不是“背定义”，而是你能否从系统视角讲清 LLM 的完整训练链路，并展示对工程落地的理解。考察类型是宏观概念+流程拆解，刁钻点在于：很多人只会说“预训练+微调”，但讲不出每个阶段的具体目"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4039
updated: "2026-09-29"
---

## What is LLM, and how are LLMs trained

#### 1️⃣ 考察意图

这道题看似基础，但面试官真正想看的不是“背定义”，而是你能否**从系统视角**讲清 LLM 的完整训练链路，并展示对工程落地的理解。考察类型是**宏观概念+流程拆解**，刁钻点在于：很多人只会说“预训练+微调”，但讲不出每个阶段的具体目标、数据要求、以及为什么需要对齐。答好了能展示：你对 Transformer 架构有底层认知，对训练中的 trade-off（如计算成本 vs 数据质量）有实战判断，并能用具体方法（如 ZeRO、FlashAttention）证明自己不是纸上谈兵。

#### 2️⃣ 标准答

**LLM 定义**LLM（Large Language Model）是基于 Transformer 架构的神经网络，参数规模通常在 7B 以上（如 LLaMA-3 70B、GPT-4），通过自监督学习从海量文本中捕获语言规律。核心能力来自**规模效应**：更大的参数量 + 更多的训练数据 → 涌现出上下文学习、推理等能力。

**训练全流程：四个阶段**

- **预训练（Pre-training）**
- 目标：Next Token Prediction（NTP），即预测下一个 token。使用因果注意力（Causal Attention），只允许看左侧上下文。
- 数据：多源语料（CommonCrawl、Wikipedia、GitHub 代码）经清洗（去重、过滤低质量页）、分词（BPE/Unigram，如 SentencePiece）。
- 关键组件：RoPE 位置编码（处理长序列）、SwiGLU 激活函数（提升训练稳定性）、Pre-Norm（LayerNorm 放在子层前，加速收敛）。
- 工程优化：混合精度训练（FP16/BF16 + FP32 master weights）、ZeRO Stage 2/3（分片优化器状态、梯度、参数）、梯度检查点（用计算换显存）。
- 坑：数据配比很重要——代码数据过多会导致语言模型“代码化”，回答变生硬；一般按 70% 自然语言 + 20% 代码 + 10% 数学配比。
- **指令微调（SFT）**
- 目标：让模型学会遵循指令。使用人工标注的（指令，回答）对，用交叉熵损失微调。
- 数据：多样性是关键——涵盖问答、摘要、翻译、角色扮演等。
- 工程取舍：全参数微调 vs LoRA（低秩适配）。LoRA 只更新 0.1% 参数，适合资源有限场景，但全参数微调效果更稳定（尤其对推理任务）。
- 坑：SFT 数据质量 > 数量。1000 条高质量指令对可能比 10 万条低质量数据更好；需人工审核避免“幻觉”或有害内容。
- **对齐（Alignment）**
- 目标：让模型符合人类偏好（有用、诚实、无害）。主流方法：RLHF（PPO 算法）或 DPO（直接偏好优化）。
- RLHF 流程：训练奖励模型（RM）→ 用 PPO 优化策略。DPO 更简单：直接从偏好数据中学习，无需 RM。
- 工程取舍：RLHF 效果好但训练不稳定（PPO 超参数敏感），DPO 稳定但可能牺牲多样性。
- 坑：奖励模型容易过拟合，需定期用验证集检查；DPO 对数据噪声敏感，偏好对必须严格排序。
- **后训练优化（Post-training）**
- 目标：提升推理效率。常用技术：量化（GPTQ/AWQ 将权重从 FP16 降到 INT4，显存减少 4 倍）、蒸馏（用大模型教小模型）、KV-cache 优化（如 FlashAttention 减少显存占用）。
- 工程取舍：量化会损失 1-2% 精度，但推理速度提升 2-3 倍；需根据业务场景权衡（如客服系统可接受精度损失，但医疗场景不行）。

**总结**：LLM 训练不是“跑一次就完事”，而是**数据-模型-工程**的迭代循环。每个阶段都有 trade-off：预训练看计算效率，SFT 看数据质量，对齐看偏好建模，后训练看部署成本。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、训练流程、工程优化三个层面回答。定义上，LLM 是基于 Transformer 的大规模语言模型，参数 7B 以上，通过自监督学习从海量文本中学习。训练流程分四步：预训练（NTP 目标，使用 RoPE、ZeRO 等）、指令微调（SFT，数据质量优先）、对齐（RLHF/DPO，让模型符合人类偏好）、后训练优化（量化、蒸馏）。工程上，每个阶段都有 trade-off，比如预训练中数据配比影响模型行为，SFT 中 LoRA 节省资源但全参数微调效果更好。总结一句：LLM 训练是数据、模型、工程的系统工程，不是简单跑个脚本。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：预训练数据配比怎么确定？有没有具体案例？

> 应对策略：数据配比通常基于实验和领域知识。例如，LLaMA-3 使用 70% 自然语言（CommonCrawl、Wikipedia）+ 20% 代码（GitHub）+ 10% 数学（arXiv、Math StackExchange）。如果代码过多，模型在自然语言任务上会变差（如回答更“结构化”但缺乏流畅性）。工程上，先按比例采样，然后在小模型（如 1B 参数）上做消融实验，观察下游任务（如 MMLU、HumanEval）的指标变化。注意：配比不是固定的，需要随训练阶段调整——早期多放代码和数学（提升推理能力），后期多放自然语言（提升流畅性）。

**追问 2**：RLHF 和 DPO 哪个更好？你会在什么场景选哪个？

> 应对策略：没有绝对好坏，取决于场景。RLHF 效果好但训练复杂：需要训练奖励模型（RM），PPO 超参数（KL 散度系数、学习率）敏感，容易崩溃。DPO 更简单：直接从偏好数据学习，无需 RM，训练稳定，但可能牺牲多样性（模型倾向于输出“安全”但平庸的回答）。选型建议：如果团队有 RL 经验且追求极致效果（如 ChatGPT），用 RLHF；如果资源有限或快速迭代（如垂直领域助手），用 DPO。注意：DPO 对数据噪声敏感，偏好对必须严格排序（如 A > B > C），否则效果下降。

**追问 3**：训练 LLM 时显存不够怎么办？具体说一种优化方法。

> 应对策略：显存瓶颈主要在模型参数、优化器状态、梯度。常用方法：ZeRO Stage 3（将参数、梯度、优化器状态分片到多个 GPU，每个 GPU 只存一部分）。例如，训练 70B 模型，单卡 80GB 显存不够，但用 ZeRO-3 + 64 张 A100，每卡只存约 1.1B 参数，显存占用降到 40GB 左右。注意：ZeRO-3 会增加通信开销（All-Gather 操作），需用 NVLink 或 InfiniBand 减少延迟。另一种方法：梯度检查点（Checkpointing），在前向传播时丢弃中间激活，反向传播时重新计算，用计算换显存（约节省 50% 显存，但训练时间增加 20%）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只背定义：“LLM 是大语言模型，基于 Transformer，参数很多。” → ✅ 要讲训练流程和工程细节：从预训练到对齐，每个阶段的目标、数据、优化方法，以及 trade-off。
- ❌ 混淆预训练和微调：“预训练就是 SFT，都是让模型学指令。” → ✅ 明确区分：预训练是自监督学习（NTP），目标学语言规律；SFT 是有监督微调，目标学指令遵循；对齐是偏好优化，目标符合人类价值观。
- ❌ 忽略工程优化：“训练就是跑个脚本，用 AdamW 就行。” → ✅ 要提具体方法：混合精度训练、ZeRO、FlashAttention、梯度检查点，并说明为什么（显存、速度、精度 trade-off）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“训练数据配比”切入，讲如何根据检索任务调整预训练数据（如增加代码和数学数据提升推理能力），并对比 SFT 阶段用 LoRA 微调的效果。
- **如果你只做过传统 NLP**：用“序列到序列”类比 Transformer，讲 LLM 训练如何从 BERT 的 MLM 进化到 GPT 的 NTP，并强调对齐（RLHF）是传统 NLP 没有的新阶段。
- **如果你是校招无项目**：聚焦论文复现，讲如何用 TinyLlama 在 WikiText-103 上复现预训练，记录 loss 曲线，并对比不同学习率调度器（cosine vs linear）对收敛速度的影响。
- “Training Language Models to Follow Instructions with Human Feedback”（InstructGPT 论文，RLHF 基础）
- “Direct Preference Optimization: Your Language Model is Secretly a Reward Model”（DPO 论文）
- “ZeRO: Memory Optimizations Toward Training Trillion Parameter Models”（ZeRO 优化器论文）
- “FlashAttention: Fast and Memory-Efficient Exact Attention”（FlashAttention 论文）
- “LLaMA: Open and Efficient Foundation Language Models”（LLaMA 系列论文，含数据配比和训练细节）

---
