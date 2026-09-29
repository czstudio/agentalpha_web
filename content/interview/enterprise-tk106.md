---
slug: enterprise-tk106
no: "1006"
title: "What are the different phases in LLM development"
question: "What are the different phases in LLM development"
excerpt: "面试官想看你是否具备 LLM 开发全流程的宏观视野，而非仅停留在“训练模型”的单一概念。这道题是典型的“系统设计+概念梳理”型问题，刁钻点在于：候选人常把“微调”和“对齐”混为一谈，或忽略数据工程和评估迭代的工程价值。答"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4233
updated: "2026-09-29"
---

## What are the different phases in LLM development

#### 1️⃣ 考察意图

面试官想看你是否具备 LLM 开发全流程的宏观视野，而非仅停留在“训练模型”的单一概念。这道题是典型的“系统设计+概念梳理”型问题，刁钻点在于：候选人常把“微调”和“对齐”混为一谈，或忽略数据工程和评估迭代的工程价值。答好了能展示你对 LLM 从数据到部署的端到端理解，以及识别各阶段 trade-off 的实战经验，这是大厂面试中区分“会用 API”和“能造轮子”的关键。

#### 2️⃣ 标准答

LLM 开发通常分为 4 个核心阶段，每个阶段都有明确的输入、输出和工程取舍：

- **阶段 1：数据工程与预训练**
- **输入**：大规模无监督语料（如 Common Crawl、The Pile，规模可达数 TB 到 PB）。
- **输出**：基础模型（Base Model），具备语言生成和世界知识。
- **关键方法**：使用 Tokenizer（如 BPE 或 SentencePiece）将文本转为 token 序列；训练目标为 Next Token Prediction（NTP）或 Masked Language Modeling（MLM，如 T5）。常用架构为 Transformer Decoder-Only（如 GPT 系列），配合 RoPE 位置编码和 FlashAttention 加速长序列训练。
- **工程取舍**：数据质量 vs. 数量。盲目堆数据可能导致噪声放大，实践中需做去重（MinHash）、质量过滤（基于困惑度或分类器）和隐私清洗。例如，Meta 在 LLaMA 训练中用了 1.4T tokens，但强调“数据质量比规模更重要”。
- **实际坑**：训练不稳定（loss 震荡）。解法：使用 Warmup + Cosine LR Scheduler，并监控梯度范数（Gradient Clipping 设为 1.0）。
- **阶段 2：监督微调（SFT）**
- **输入**：指令-回答对（Instruction-Response Pairs），通常 10k-100k 条，覆盖问答、写作、推理等任务。
- **输出**：指令微调模型（Instruct Model），能遵循人类指令。
- **关键方法**：使用预训练权重初始化，在指令数据上做 Causal LM 微调。常用 LoRA（Low-Rank Adaptation）或 QLoRA 减少显存占用，例如在单卡 A100 上微调 7B 模型。
- **工程取舍**：数据多样性 vs. 任务专注。混合多领域数据可提升泛化性，但可能稀释特定任务性能。实践中，先做领域适配（如代码 SFT），再混合通用指令数据。
- **实际坑**：过拟合到指令模板。解法：在训练中随机打乱模板格式（如“请回答：” vs “Q:”），并保留 5% 的预训练数据做正则化。
- **阶段 3：对齐（Alignment）**
- **输入**：人类偏好数据（如比较两个回答哪个更好），或 AI 生成的偏好对。
- **输出**：对齐模型（Aligned Model），符合人类价值观（如 helpful、harmless、honest）。
- **关键方法**：RLHF（PPO 算法）或 DPO（Direct Preference Optimization）。RLHF 需训练 Reward Model（RM）来打分，再通过 PPO 更新策略；DPO 则直接优化偏好损失，省去 RM 训练，更稳定且资源友好。例如，Anthropic 的 Claude 使用 RLHF，而 DeepSeek 在 V2 中探索了 DPO 变体。
- **工程取舍**：RLHF 的稳定性 vs. DPO 的简洁性。PPO 需要维护 4 个模型（Actor、Critic、Reference、Reward），易出现 reward hacking；DPO 只需 2 个模型，但可能对偏好数据噪声敏感。
- **实际坑**：模型“讨好”Reward Model（如生成冗长回答）。解法：在 PPO 中加入 KL 散度惩罚（β=0.01-0.1），限制策略偏移。
- **阶段 4：评估与迭代**
- **输入**：基准测试（如 MMLU、HumanEval、MT-Bench）和实际场景反馈（如用户日志）。
- **输出**：性能报告和迭代方向（如数据增强、超参调整）。
- **关键方法**：自动化评估（如 BLEU、ROUGE、GPT-4 作为 Judge）和人工评估（如 A/B 测试）。使用 W&B 或 MLflow 记录实验。
- **工程取舍**：自动化评估效率 vs. 人工评估准确性。GPT-4 Judge 可快速打分，但可能偏好自身风格；人工评估更可靠，但成本高。实践中，先用自动化筛选，再对 top/bottom 样本做人工审核。
- **实际坑**：评估指标与用户满意度脱节。解法：建立在线 A/B 测试管道，监控用户留存率和任务完成率。

总结：LLM 开发不是线性流程，而是迭代循环——预训练提供基础，SFT 教会指令，对齐注入价值观，评估驱动优化。每个阶段都有数据、算法和工程的 trade-off，理解这些才能从“调参侠”升级为“系统架构师”。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从四个核心阶段回答：第一，数据工程与预训练，关注 tokenizer 和训练稳定性；第二，监督微调，用 LoRA 高效适配指令数据；第三，对齐阶段，对比 RLHF 和 DPO 的取舍；第四，评估与迭代，强调自动化与人工评估的平衡。总结一句：LLM 开发是迭代循环，每个阶段都有工程坑和 trade-off，理解这些才能落地。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：RLHF 和 DPO 哪个更好？你在项目中怎么选？

> 没有绝对好坏，取决于资源。RLHF 适合有充足计算和标注团队的场景，比如 Anthropic 用 RLHF 训练 Claude，因为 Reward Model 能捕捉复杂偏好（如安全性），但 PPO 训练不稳定，需调参（如 KL 惩罚系数）。DPO 适合资源受限或快速迭代，比如 DeepSeek 在 V2 中用 DPO，省去 RM 训练，但依赖高质量偏好数据。我的选择：如果数据量 < 10k 且偏好明确（如代码生成），用 DPO；如果数据量大且偏好多维（如对话安全），用 RLHF + 人工审核。

**追问 2**：预训练阶段如何保证数据质量？具体用什么方法？

> 三步走：第一，去重，用 MinHash 或 SimHash 检测近似重复文档，避免模型记忆冗余；第二，质量过滤，用困惑度（基于小模型如 GPT-2）或分类器（如 fastText 训练“高质量 vs 低质量”二分类器）筛选；第三，隐私清洗，用正则匹配移除 PII（如邮箱、身份证号）。例如，LLaMA 团队用这些方法从 Common Crawl 中提取 1.4T tokens，并发现去除低质量数据后下游任务提升 2-3%。

**追问 3**：SFT 阶段数据量多大合适？数据不足怎么办？

> 经验法则：10k-100k 条指令-回答对足够，过多可能导致灾难性遗忘。数据不足时，用数据增强：第一，从预训练语料中自动生成指令（如 Self-Instruct 方法，用 GPT-4 生成种子数据）；第二，混合领域数据，比如用代码 SFT 数据增强推理能力。例如，Alpaca 只用 52k 条指令数据就微调出可用模型。注意：数据质量比数量重要，10k 条高质量数据优于 100k 条噪声数据。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 把“微调”和“对齐”混为一谈，说“SFT 就是对齐” → ✅ 明确区分：SFT 是监督学习，教会模型遵循指令；对齐（RLHF/DPO）是强化学习，教会模型符合人类偏好，两者目标不同，数据形式也不同（SFT 用单轮回答，对齐用偏好对）。
- ❌ 只提“预训练-微调”两阶段，忽略对齐和评估 → ✅ 必须包含 4 个阶段，并强调评估迭代是完整流程，不是终点。例如，Google 的 PaLM 在发布前经历了多轮 SFT + RLHF + 评估迭代。
- ❌ 说“预训练数据越多越好” → ✅ 强调数据质量优先，并举例：Meta 发现 1.4T 高质量 tokens 优于 2T 低质量 tokens，MMLU 提升 3%。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“数据工程”切入，强调在 RAG 中如何清洗和 chunking 文档，类比预训练数据质量；再对比 SFT 和 RAG 的指令遵循差异。
- **如果你只做过传统 NLP**：用“文本分类”类比 SFT（监督学习），用“序列标注”类比预训练（无监督学习），再引出对齐阶段的新颖性（强化学习）。
- **如果你是校招无项目**：聚焦论文复现，如复现 LLaMA 的预训练流程（用 TinyStories 数据集），并记录 SFT 和 DPO 的 loss 变化，展示对全流程的理解。
- 《Training Language Models to Follow Instructions with Human Feedback》（InstructGPT 论文）
- 《Direct Preference Optimization: Your Language Model is Secretly a Reward Model》（DPO 论文）
- 《LLaMA: Open and Efficient Foundation Language Models》（预训练数据工程）
- 《Scaling Data-Constrained Language Models》（数据质量 vs 数量 trade-off）
- 《FlashAttention: Fast and Memory-Efficient Exact Attention》（训练加速方法）

---
