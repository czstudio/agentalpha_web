---
slug: enterprise-tk792
no: "1692"
title: "CLM和MLM分别是什么，有什么区别"
question: "CLM和MLM分别是什么，有什么区别"
excerpt: "面试官想考察你对预训练范式本质的理解，而非简单背诵定义。这是基础题，但刁钻点在于：能否从“自回归 vs 自编码”的数学本质切入，并延伸到架构设计（Attention Mask）、训练效率（双向 vs 单向）和下游任务适配"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4009
updated: "2026-09-29"
---

## CLM和MLM分别是什么，有什么区别

#### 1️⃣ 考察意图

面试官想考察你对预训练范式本质的理解，而非简单背诵定义。这是基础题，但刁钻点在于：能否从“自回归 vs 自编码”的数学本质切入，并延伸到架构设计（Attention Mask）、训练效率（双向 vs 单向）和下游任务适配（生成 vs 理解）。答好了能展示你对 Transformer 底层机制（如 Causal Mask 和 Full Attention 的计算差异）的扎实掌握，以及根据业务场景选模型架构的工程判断力。

#### 2️⃣ 标准答

**定义与本质**

- **CLM（Causal Language Modeling）**：自回归范式，典型代表 GPT 系列。训练目标：给定前 t-1 个 token，预测第 t 个 token，即最大化 P(x_t | x_<t)。实现上依赖 Causal Attention Mask（上三角矩阵），每个 token 只能看到自己和左侧 token，保证因果性。
- **MLM（Masked Language Modeling）**：自编码范式，典型代表 BERT。训练目标：随机 mask 输入序列中 15% 的 token（其中 80% 替换为 [MASK]，10% 随机替换，10% 保持不变），预测被 mask 的 token。使用 Full Attention（双向上下文），每个 token 能看到序列所有位置。

**核心区别：3 个维度**

1. **Attention 机制**：CLM 是单向（从左到右），MLM 是双向。这直接导致训练效率差异——MLM 一次前向可预测多个 mask 位置，而 CLM 必须逐 token 生成。但 MLM 的 [MASK] token 在微调时不存在，造成预训练-微调不一致（pretrain-finetune discrepancy）。
2. **损失函数**：CLM 计算所有 token 的交叉熵损失（每个位置都预测），MLM 只计算被 mask 的 token 的损失（约 15% 位置）。因此 CLM 每个 token 都参与梯度更新，数据利用率更高；MLM 需要更多训练步数才能覆盖全部 token。
3. **下游任务适配**：CLM 天然适合生成（文本续写、对话），因为自回归生成时推理过程与训练一致。MLM 适合理解任务（分类、NER、QA），因为双向上下文能捕捉完整语义。**工程取舍**：用 CLM 做分类需要在序列末尾加 [CLS] token 并取最后一个 hidden state，效果通常不如 MLM 的 [CLS] 向量。

**实际落地的坑 + 解法**

- **坑**：用 MLM 做生成任务（如文本摘要）时，需要设计特殊的解码策略（如 Mask-Predict），但生成质量远不如自回归模型，且推理速度慢（需要多次迭代 mask）。
- **解法**：对于生成任务，直接选 CLM 架构（如 GPT、LLaMA）；对于理解任务，优先选 MLM（如 BERT、RoBERTa）。如果必须统一架构，考虑 T5（Encoder-Decoder）或 UniLM（统一预训练，通过不同 Attention Mask 切换 CLM/MLM 模式）。

**混合方法**

- **XLNet**：排列语言模型（Permutation Language Modeling），通过排列组合实现双向上下文但保持自回归生成，解决了 MLM 的 [MASK] 不一致问题。但计算复杂度高（需要双流注意力）。
- **ELECTRA**：替换检测（Replaced Token Detection），用生成器-判别器架构，训练效率比 MLM 高（所有 token 都参与损失计算），但需要额外训练生成器。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、核心区别、工程取舍三个层面回答。CLM 是自回归，用 Causal Mask 从左到右预测下一个 token，典型代表 GPT；MLM 是自编码，用 Full Attention 预测被 mask 的 token，典型代表 BERT。核心区别在于 Attention 方向、损失计算范围和下游适配性：CLM 适合生成，MLM 适合理解。实际选型时，生成任务无脑选 CLM，理解任务优先 MLM，如果必须统一架构考虑 T5。总结一句：CLM 和 MLM 本质是‘单向预测未来’和‘双向填空’的范式差异，决定了模型的能力边界。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 BERT 用 15% mask 比例？改成 30% 会怎样？

> 15% 是经验值，来自 BERT 论文的消融实验。比例太低（如 5%）模型学不到足够上下文依赖；比例太高（如 30%）训练信号过强，模型会过度依赖 mask 位置而非上下文，导致微调时泛化变差。实际工程中，RoBERTa 尝试过动态 mask（每次训练 epoch 重新 mask），但比例仍保持 15%。如果任务需要更强双向理解（如 NER），可适当提高到 20%，但需配合更多训练步数。

**追问 2**：CLM 和 MLM 在训练效率上谁更高？为什么 GPT-3 训练成本远高于 BERT？

> 从单步计算量看，MLM 更高（Full Attention 是 O(n²)，CLM 的 Causal Mask 可优化为 O(n²) 但实际计算量相近）。但 MLM 一次预测多个位置，收敛更快（BERT 在 1M 步内达到 SOTA，GPT-3 需要 3.5M 步）。GPT-3 成本高是因为参数量大（175B vs BERT 340M）和数据量（570GB vs 16GB）。工程上，CLM 的 Causal Mask 可用 FlashAttention 优化，但 MLM 的 Full Attention 无法享受这种加速。

**追问 3**：如果让你设计一个既适合生成又适合理解的预训练模型，你会怎么做？

> 参考 UniLM 思路：用同一个 Transformer，训练时通过不同的 Attention Mask 切换模式（双向 mask 做 MLM，单向 mask 做 CLM，Seq2Seq mask 做生成）。但缺点是训练复杂度高（需要多任务平衡）。更实用的方案是 T5：Encoder 用双向 Attention，Decoder 用 Causal Attention，通过 text-to-text 统一所有任务。如果资源有限，直接选 LLaMA（纯 CLM）配合 prompt engineering，理解任务也能达到不错效果。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“CLM 是 GPT，MLM 是 BERT，区别就是架构不同” → ✅ 必须从数学本质切入：CLM 是 P(x_t | x_<t) 的链式分解，MLM 是 P(x_masked | x_context) 的联合概率建模，Attention Mask 是实现差异的根源。
- ❌ 说“MLM 比 CLM 好，因为双向上下文更强” → ✅ 没有绝对好坏，取决于任务。生成任务中 CLM 的因果性不可替代，MLM 的 [MASK] 不一致问题在生成时是灾难。
- ❌ 说“XLNet 解决了 MLM 的所有问题” → ✅ XLNet 确实解决了 [MASK] 不一致，但引入了排列组合的计算开销（双流注意力），实际落地中很少用，主流仍是 BERT 和 GPT。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成”角度切入，说明 CLM（如 LLaMA）用于生成回答，MLM（如 BERT）用于 query 编码和段落重排序，强调两者在 RAG pipeline 中的分工。
- **如果你只做过传统 NLP**：用“序列预测 vs 完形填空”类比，说明 CLM 类似语言模型（n-gram），MLM 类似 CBOW（Word2Vec），但 Transformer 让两者都能捕捉长距离依赖。
- **如果你是校招无项目**：聚焦论文复现，说自己用 Hugging Face 在 WikiText-2 上分别训练了小型 GPT 和 BERT，对比了困惑度和分类准确率，并分析了 Attention Mask 对梯度传播的影响。
- BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding (Devlin et al., 2019)
- Language Models are Unsupervised Multitask Learners (GPT-2, Radford et al., 2019)
- XLNet: Generalized Autoregressive Pretraining for Language Understanding (Yang et al., 2019)
- Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (T5, Raffel et al., 2020)
- ELECTRA: Pre-training Text Encoders as Discriminators Rather Than Generators (Clark et al., 2020)

---
