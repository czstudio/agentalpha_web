---
slug: agent-tk390
no: "1290"
title: "你的模型怎么训练的"
question: "你的模型怎么训练的"
excerpt: "面试官真正想看的是你对 Deep Research Agent 训练全流程 的工程化理解，而非简单背论文。考察类型是 系统设计 + 工程取舍。刁钻点在于：候选人常只答“SFT + RL”两步，但面试官要听的是 数据构造的"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4407
updated: "2026-09-29"
---

## 你的模型怎么训练的

`P2` · `agent_architecture` · **🏢 阿里**

🏷 标签：`deep-research`, `training`, `sft`, `grpo`, `data-construction`

#### 1️⃣ 考察意图

面试官真正想看的是你对 **Deep Research Agent 训练全流程** 的工程化理解，而非简单背论文。考察类型是 **系统设计 + 工程取舍**。刁钻点在于：候选人常只答“SFT + RL”两步，但面试官要听的是 **数据构造的完整流程逻辑**（种子问题→轨迹生成→质量筛选）、**Loss Mask 设计**（防止模型只学格式不学推理）、以及 **GRPO 奖励函数** 的稀疏性与多样性平衡。答好了能展示你从 0 到 1 构建训练流水线的硬实力，包括处理噪声数据、设计 reward shaping 等实战经验。

#### 2️⃣ 标准答

Deep Research Agent 的训练分三步：**数据构造 → SFT 冷启动 → GRPO 强化学习**。每一步都有工程取舍和坑。

**第一步：数据构造（核心是“种子问题 + 轨迹生成”）**

- **种子问题收集**：不只用 HotpotQA 这种静态数据集。线上日志（用户真实 query）占 40%，专家编写（覆盖长尾场景如“对比 2023 年特斯拉和比亚迪的研发投入”）占 30%，LLM 扩写（用 DeepSeek V3 对种子问题做 paraphrase 和难度提升）占 30%。**为什么这么做？** 静态数据集缺乏多样性，线上日志能捕捉真实用户意图，但噪声大（如拼写错误），需用规则过滤（长度 < 5 字符或 > 500 字符的丢弃）。
- **轨迹生成**：用 DeepSeek V3 作为 Teacher 模型，对每个种子问题生成完整搜索轨迹（包括搜索 query、点击页面、提取关键段落、推理步骤）。**坑**：Teacher 模型可能生成幻觉轨迹（如引用不存在页面）。解法：用 **BM25 + 交叉编码器 rerank** 做事实性验证——对轨迹中每个 claim，检索 Wikipedia 并计算语义相似度，低于阈值（如 0.6）的轨迹丢弃。
- **质量筛选**：用规则（轨迹长度 > 10 步或 < 3 步的丢弃）+ 奖励模型（基于 GPT-4 的 pairwise ranking，对轨迹的完整性和正确性打分）。**Trade-off**：筛选太严会丢失多样性（模型只会学简单轨迹），太松则引入噪声。实践中保留 top 30% 的轨迹，并人工抽样 5% 做验证。

**第二步：SFT 冷启动（关键在 Loss Mask）**

- 用筛选后的轨迹做 SFT，但 **不能直接对全部 token 计算 loss**。因为轨迹中有大量“搜索 query”和“页面内容”这种非推理 token，模型学这些会过拟合到格式而非推理。**Loss Mask 设计**：只对“推理步骤”（如“根据搜索结果，A 公司 2023 年研发投入为 X，B 公司为 Y，因此结论是 Z”）和“最终答案”计算 loss，对搜索 query 和页面内容 mask 掉。实践中用 token-level 的 mask 矩阵实现，推理步骤的 token 权重设为 1，其他设为 0。
- **训练细节**：学习率 1e-5，batch size 128，训练 2 个 epoch。**坑**：模型可能学到“只输出推理步骤，不输出搜索 query”，导致 Agent 不会主动搜索。解法：在 SFT 数据中保留 20% 的轨迹不 mask 搜索 query，让模型学会“先搜索再推理”的完整流程。

**第三步：GRPO 强化学习（奖励函数设计）**

- **GRPO 原理**：Group Relative Policy Optimization，对每个 prompt 采样多个 response，用组内相对奖励更新策略。相比 PPO，不需要 critic 模型，计算开销小。
- **奖励函数**：由三个子奖励加权组成：**答案正确性奖励**（权重 0.6）：用 ground truth 做精确匹配（对数字/实体）或语义相似度（对开放问题）。**为什么用语义相似度？** 精确匹配对 paraphrase 不鲁棒，比如“研发投入 30 亿”和“30 亿元”匹配失败。用 Sentence-BERT 计算余弦相似度，阈值 0.8 以上算正确。
- **轨迹效率奖励**（权重 0.2）：鼓励模型用更少的搜索步骤。公式：`1 - (实际步数 / 最大步数)`，最大步数设为 15。**Trade-off**：太强调效率会导致模型过早停止搜索，遗漏关键信息。所以只给正奖励（步数 < 5 时奖励 0.1，步数 > 10 时惩罚 -0.1）。
- **事实性奖励**（权重 0.2）：用 **FlashAttention 加速的交叉编码器** 对轨迹中每个 claim 做事实性验证，与 Wikipedia 匹配。匹配率 > 80% 给正奖励，< 50% 给负奖励。
训练细节：学习率 3e-6，采样数 8（每个 prompt 生成 8 个 response），KL 散度系数 0.04。坑：GRPO 初期奖励稀疏，模型可能不收敛。解法：先用 SFT 模型做 warmup（1000 步），再用 GRPO 微调。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从数据构造、SFT 冷启动、GRPO 强化学习三个层面回答。数据构造上，用线上日志 + 专家编写 + LLM 扩写收集种子问题，用 DeepSeek V3 生成轨迹，并用 BM25 + 交叉编码器做事实性筛选。SFT 冷启动时，关键在 Loss Mask 设计，只对推理步骤计算 loss，防止模型只学格式不学推理。GRPO 强化学习时，奖励函数由答案正确性、轨迹效率、事实性三个子奖励加权组成。总结一句：训练 Deep Research Agent 的核心是构建高质量、多样化的轨迹数据，并用稀疏奖励引导模型学会高效推理。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你的奖励函数里，三个子奖励的权重怎么调的？有没有试过其他组合？

> 权重基于 ablation study 确定。初始设为 0.5/0.3/0.2，在验证集上跑 5 个 seed，发现答案正确性权重低于 0.5 时，模型会牺牲准确性去优化效率。最终调为 0.6/0.2/0.2。试过加入“格式奖励”（鼓励模型输出结构化 JSON），但发现模型反而过度关注格式，推理质量下降。**取舍**：奖励函数越复杂，调参成本越高，且可能引入 reward hacking。实践中保持 3-4 个子奖励，每个权重变化不超过 0.1。

**追问 2**：你的 Loss Mask 具体怎么实现？如果推理步骤和搜索 query 的 token 边界不清晰怎么办？

> 用 token-level 的 mask 矩阵，在训练时对每个 batch 的 input_ids 生成一个 0/1 矩阵。边界不清晰时，用规则启发式：如果 token 序列中出现“搜索”、“查询”等关键词，且后面跟着 URL 或 query 文本，则标记为搜索 token。**坑**：启发式规则可能误判，比如“根据搜索结果”中的“搜索”会被误标。解法：用预训练的 NER 模型（如 SpaCy）做 token 分类，准确率提升到 95%。如果还出错，人工标注 1000 条轨迹做 fine-tune。

**追问 3**：你的 GRPO 采样数为什么是 8？有没有试过更大的采样数？

> 采样数 8 是 trade-off 结果。采样数越大（如 16），奖励估计更准，但计算开销线性增长（8 个 response 需要 8 倍推理时间）。在 8 卡 A100 上，采样数 8 时训练速度约 2 小时/epoch，采样数 16 时降到 4 小时。**经验**：采样数 4 时模型不收敛（奖励方差太大），采样数 12 时收益递减。8 是性价比最优。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “用了 HotpotQA 做 SFT，训了 3 个 epoch，模型能做多跳推理了。” → ✅ “HotpotQA 只是验证集，训练数据需要从线上日志和 LLM 扩写中构造，否则模型泛化性差。SFT 时 Loss Mask 设计比数据量更重要。”
- ❌ “GRPO 奖励函数只用答案正确性，简单有效。” → ✅ “只用答案正确性会导致模型忽略搜索效率，生成冗长轨迹。需要多目标奖励，包括轨迹效率和事实性。”
- ❌ “数据筛选用规则就行，不需要奖励模型。” → ✅ “规则只能过滤明显错误（如长度异常），但无法判断推理逻辑是否合理。奖励模型（基于 GPT-4 的 pairwise ranking）能捕捉更细粒度的质量差异。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“数据构造”切入，强调你如何用 BM25 + 交叉编码器做事实性验证，并对比传统 RAG 的检索-生成 pipeline 与 Agent 训练的区别。
- **如果你只做过传统 NLP**：用“Loss Mask 设计”类比迁移，比如你在文本分类任务中如何对关键 token 加权，现在扩展到 Agent 推理步骤的 mask。
- **如果你是校招无项目**：聚焦“GRPO 奖励函数”的论文复现 demo，用 Hugging Face TRL 库实现一个简化版，并展示对奖励稀疏性的分析。

#### 7️⃣ 延伸阅读

- DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning
- GRPO: Group Relative Policy Optimization (DeepSeekMath 论文)
- STILL-ALIVE: Loss Masking for Agent Training (OpenAI 博客)
- Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks
- FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness

---
