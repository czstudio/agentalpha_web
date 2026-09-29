---
slug: enterprise-tk107
no: "1007"
title: "What are the different types of LLM fine-tuning"
question: "What are the different types of LLM fine-tuning"
excerpt: "面试官想考察你对 LLM 微调技术栈的系统性分类能力，以及工程取舍的敏感度。这题看似基础，但刁钻点在于：能否区分“全参数微调”与“参数高效微调（PEFT）”的适用场景，并解释为什么 LoRA 成为主流。答好了能展示：你不"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3935
updated: "2026-09-29"
---

## What are the different types of LLM fine-tuning

#### 1️⃣ 考察意图

面试官想考察你对 LLM 微调技术栈的**系统性分类能力**，以及**工程取舍的敏感度**。这题看似基础，但刁钻点在于：能否区分“全参数微调”与“参数高效微调（PEFT）”的适用场景，并解释为什么 LoRA 成为主流。答好了能展示：你不仅背过概念，还知道在资源受限时如何选型，以及微调后模型可能“灾难性遗忘”的坑。考察类型：**系统分类 + 工程取舍**。

#### 2️⃣ 标准答

LLM 微调按**更新参数范围**和**训练目标**可分为三大类：全参数微调、参数高效微调（PEFT）、以及对齐微调。下面逐一拆解，附带实际落地的坑。

#### 1. 全参数微调（Full Fine-Tuning）

- **做法**：加载预训练权重，在特定任务数据上反向传播更新所有参数。例如，用 10 万条客服对话微调 LLaMA-7B。
- **资源消耗**：显存占用 = 模型参数 × 2（优化器状态）+ 梯度 + 激活值。7B 模型全微调需约 56GB 显存（FP16），实际需 4×A100 80GB。
- **坑**：容易**灾难性遗忘**——模型在通用能力上退化。例如，微调后数学推理准确率从 70% 掉到 50%。解法：混合通用数据（如 10% 原始预训练数据）或使用 EWC（弹性权重巩固）正则化。
- **适用**：数据量 > 10 万条、任务与预训练分布差异大（如法律合同理解）。

#### 2. 参数高效微调（PEFT）

核心思想：冻结大部分参数，只更新少量新增或低秩参数。主流方法：

- **LoRA（Low-Rank Adaptation）**：在 Transformer 的 Q/K/V/O 投影层旁插入低秩矩阵（rank r=8），只训练这两个矩阵。参数量仅为原模型的 0.1%-1%。例如，LLaMA-7B 用 LoRA 训练只需 16GB 显存（单卡 RTX 4090）。
- **Adapter**：在每层 Transformer 后插入 bottleneck 结构（降维再升维），参数量约 3%-5%。但推理时需串行计算，增加延迟 10%-20%。
- **Prefix Tuning**：在输入序列前添加可学习的虚拟 token（如 100 个），只更新这些 token 的 embedding。适合生成任务，但效果对 prefix 长度敏感。
- **工程取舍**：LoRA 推理时可将低秩矩阵合并回原权重，**零额外推理延迟**；而 Adapter 无法合并，推理变慢。因此 LoRA 是工业界首选。
- **坑**：LoRA 的 rank 选择是关键。r=8 在代码生成任务上可能欠拟合，r=64 则显存翻倍。经验法则：从 r=8 开始，用验证集 loss 监控，若 loss 不降则翻倍。

#### 3. 对齐微调（Alignment Fine-Tuning）

目标：让模型输出符合人类偏好（有用、诚实、无害）。

- **RLHF（Reinforcement Learning from Human Feedback）**：三步走——SFT 微调基础模型 → 训练奖励模型（RM）→ 用 PPO 算法优化策略。计算成本高，需 3 个模型（策略、参考、RM）同时加载。
- **DPO（Direct Preference Optimization）**：直接优化偏好损失，无需 RM。公式：`L = -E[log σ(β * (log π(y_w|x) - log π(y_l|x)))]`，其中 y_w 是偏好回答。训练速度比 RLHF 快 2-3 倍，但需高质量偏好对数据。
- **坑**：DPO 对数据噪声敏感。若偏好对中“好回答”其实有事实错误，模型会放大错误。解法：用 GPT-4 做自动质量过滤，剔除置信度低于 0.8 的样本。

#### 4. 指令微调（Instruction Tuning / SFT）

- **做法**：用 (instruction, input, output) 三元组数据微调，让模型学会遵循指令。典型数据集：Alpaca（52k 条）、ShareGPT。
- **关键**：数据多样性比数量更重要。1000 条覆盖 50 种任务类型的数据，效果优于 10 万条单一任务数据。实践中用 **数据配比**：通用指令 60%、代码 20%、数学 10%、安全 10%。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，按参数更新范围分，全参数微调更新所有参数，适合大数据量但易遗忘；第二，参数高效微调如 LoRA，只更新 0.1% 参数，显存省 70% 且推理无延迟；第三，按训练目标分，指令微调让模型学会遵循指令，对齐微调如 DPO 优化偏好。总结一句：资源有限选 LoRA，数据量大选全微调，对齐需求选 DPO。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：LoRA 和 Adapter 在推理延迟上有什么区别？为什么 LoRA 更常用？

> LoRA 推理时可将低秩矩阵 `BA` 合并到原权重 `W` 中，即 `W' = W + α * BA`，合并后计算图不变，延迟为 0。Adapter 在每层 Transformer 后插入额外线性层，推理时需串行计算，增加 10%-20% 延迟。工业界选 LoRA 的核心原因就是零额外开销。另外，LoRA 的 rank 可调，Adapter 的 bottleneck 维度固定，灵活性差。

**追问 2**：你提到全微调容易灾难性遗忘，具体怎么缓解？

> 三种方法：第一，**数据混合**——微调数据中混入 10%-20% 原始预训练数据（如 C4 子集），保持通用能力。第二，**弹性权重巩固（EWC）**——在损失函数中加入正则项 `λ * Σ F_i * (θ_i - θ_old_i)^2`，其中 F_i 是 Fisher 信息矩阵，惩罚对重要参数的改动。第三，**渐进式微调**——先冻结底层 80% 层，只训练顶层，再逐步解冻。实践中数据混合最有效，EWC 计算 Fisher 矩阵开销大。

**追问 3**：DPO 和 RLHF 在训练稳定性上有什么差异？

> RLHF 的 PPO 阶段需要同时维护策略模型、参考模型和奖励模型，超参数敏感（如 KL 散度系数 β、学习率），训练不稳定，常出现 reward hacking（奖励模型被欺骗）。DPO 直接优化偏好损失，只需一个模型，训练更稳定。但 DPO 对数据质量要求高——若偏好对中“好回答”有事实错误，模型会放大错误。经验上，数据量 < 1 万条时 DPO 优于 RLHF；数据量 > 10 万条时 RLHF 上限更高。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“微调就是全参数更新，LoRA 是低配版” → ✅ 正确切入：LoRA 不是低配版，而是针对资源受限场景的工程优化，在 rank 足够时效果可逼近全微调（如 GLUE 上 LoRA r=64 与全微调差距 <1%）。
- ❌ 说“指令微调和对齐微调是一回事” → ✅ 正确切入：指令微调（SFT）是让模型学会遵循指令格式，对齐微调（RLHF/DPO）是优化偏好，两者目标不同。实践中先做 SFT，再做对齐。
- ❌ 说“PEFT 方法都差不多，选一个就行” → ✅ 正确切入：LoRA 推理无延迟，Adapter 有延迟，Prefix Tuning 对输入长度敏感。选型需考虑推理场景：在线服务选 LoRA，离线批量选 Adapter。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“微调检索增强中的生成模型”切入，对比全微调与 LoRA 在 10 万条 QA 数据上的显存和效果差异，强调 LoRA 可保留检索能力。
- **如果你只做过传统 NLP**：用“BERT 微调”类比——全微调类似 BERT 的 Fine-Tuning，PEFT 类似 Adapter-BERT。迁移到 LLM 时，重点解释参数规模带来的显存瓶颈。
- **如果你是校招无项目**：聚焦“LoRA 论文复现”——在 Hugging Face 上用 LLaMA-7B 跑 LoRA 微调，记录训练时间（约 2 小时）、显存（16GB）和推理延迟（与原始模型一致），展示动手能力。
- LoRA 论文：LoRA: Low-Rank Adaptation of Large Language Models（Hu et al., 2021）
- DPO 论文：Direct Preference Optimization: Your Language Model is Secretly a Reward Model（Rafailov et al., 2023）
- Adapter 论文：Parameter-Efficient Transfer Learning for NLP（Houlsby et al., 2019）
- 博客：Hugging Face PEFT 库文档（含 LoRA/IA3/Prefix Tuning 代码示例）
- 工具：Hugging Face Transformers + PEFT + TRL（支持 LoRA 和 DPO 训练）

---
