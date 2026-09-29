---
slug: enterprise-tk129
no: "1029"
title: "| Q110 | What is the difference between casual language modeling and masked language modeling"
question: "| Q110 | What is the difference between casual language modeling and masked language modeling"
excerpt: "面试官想确认你是否真正理解两种预训练范式的核心差异，而非仅背出“GPT是自回归，BERT是双向”。考察类型是概念辨析+工程取舍。刁钻点在于：能否从注意力机制、训练目标、下游适配三个维度展开，并点出各自在计算效率、生成质量"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3257
updated: "2026-09-29"
---

## | Q110 | What is the difference between casual language modeling and masked language modeling

#### 1️⃣ 考察意图

面试官想确认你是否真正理解两种预训练范式的核心差异，而非仅背出“GPT是自回归，BERT是双向”。考察类型是**概念辨析+工程取舍**。刁钻点在于：能否从**注意力机制、训练目标、下游适配**三个维度展开，并点出各自在计算效率、生成质量上的trade-off。答好了能展示你对Transformer底层原理的掌握，以及为特定任务选择预训练模型的判断力。

#### 2️⃣ 标准答

**核心差异：注意力掩码与训练目标**

- **因果语言建模（Causal LM, CLM）**：使用**单向注意力掩码**，每个token只能看到自身及之前的token。训练目标是**自回归**：给定前t-1个token，预测第t个token，最大化整个序列的似然 \prod P(x_t | x_{<t})。典型模型：GPT系列、LLaMA、Bloom。
- **掩码语言建模（Masked LM, MLM）**：使用**双向注意力**，每个token能看到序列中所有其他token（包括未来）。训练时随机掩码15%的token，目标是预测这些被掩码位置的原始token，最小化交叉熵损失。典型模型：BERT、RoBERTa、ALBERT。

**为什么这么做？工程取舍**

- **CLM的取舍**：单向注意力保证了**自回归生成**的因果一致性，推理时可用KV Cache加速，但无法利用下文信息，导致在理解任务（如情感分类）上需要额外微调或添加分类头。训练效率高，因为每个token都是监督信号，但长序列依赖建模能力弱于双向模型。
- **MLM的取舍**：双向注意力让模型能同时捕获上下文，在GLUE、SQuAD等理解任务上表现优异。但训练效率低：只有15%的token参与损失计算，且需要特殊的掩码策略（如Whole Word Masking）。无法直接用于生成，需改造为Encoder-Decoder架构（如T5）。

**实际落地的坑+解法**

- **坑1：CLM在长文本生成中的重复问题**。由于自回归特性，模型容易陷入局部循环，生成重复片段。**解法**：引入Top-k/Top-p采样、重复惩罚（repetition penalty），或使用Contrastive Search（如SimCTG论文）。
- **坑2：MLM在微调时与预训练不一致**。预训练时使用[MASK]标记，但微调时没有，导致分布偏移。**解法**：使用动态掩码（每次训练迭代重新掩码），或采用RoBERTa的静态掩码但复制数据10次。
- **坑3：CLM的上下文窗口限制**。单向注意力导致长距离依赖建模弱，且推理时KV Cache占用显存随序列长度线性增长。**解法**：使用FlashAttention减少显存占用，或采用ALiBi/RoPE位置编码支持外推。

**典型模型与下游适配**

- **CLM**：GPT-3（175B）、LLaMA（65B）——适合文本生成、对话、代码补全。微调时需添加因果掩码，常用LoRA/P-tuning。
- **MLM**：BERT（340M）、RoBERTa（355M）——适合文本分类、命名实体识别、问答（抽取式）。微调时需在[CLS] token上加分类头。

**总结**：CLM是“预测下一个词”，MLM是“填空”。选择取决于任务：生成用CLM，理解用MLM。但现代LLM（如GPT-4）通过指令微调已模糊了边界，但底层原理依然如此。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从注意力机制、训练目标、下游适配三个层面回答。CLM使用单向注意力，自回归预测下一个token，适合生成任务；MLM使用双向注意力，预测被掩码的token，适合理解任务。关键取舍是：CLM生成质量高但理解弱，MLM理解强但无法直接生成。总结一句：CLM是自回归，MLM是去噪，选择取决于任务类型。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么BERT不用因果掩码？如果用了会怎样？

> 如果用因果掩码，BERT就变成了单向模型，无法利用下文信息，在NER、QA等需要双向上下文的任务上性能会显著下降（GLUE分数预计下降5-10个点）。但可以改造为类似XLNet的排列语言建模，通过自回归方式实现双向上下文，代价是训练复杂度增加。

**追问 2**：CLM和MLM哪个训练效率更高？为什么？

> CLM训练效率更高，因为每个token都是监督信号，损失计算覆盖整个序列；而MLM只有15%的token参与损失计算，且需要额外的掩码操作。但CLM的注意力计算是单向的，无法并行化处理未来token，实际训练速度取决于实现（如FlashAttention可缓解）。从收敛速度看，MLM通常需要更多步数（如BERT预训练100万步 vs GPT-2的40万步）。

**追问 3**：现代LLM（如GPT-4）是否完全抛弃了MLM？为什么？

> 没有完全抛弃，但主流是CLM。GPT-4等模型在预训练阶段仍使用CLM，但通过指令微调（RLHF）和上下文学习（In-Context Learning）实现了理解能力。MLM的变体（如T5的Span Corruption）在Encoder-Decoder架构中仍有应用，因为其生成质量更高。但纯MLM模型（如BERT）在生成任务上已基本被淘汰，因为无法直接自回归生成。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“CLM是预测下一个词，MLM是预测被掩码的词，所以CLM用于生成，MLM用于理解” → ✅ 正确切入：必须点出注意力掩码的差异（单向 vs 双向），以及训练目标的具体数学形式（最大化似然 vs 最小化交叉熵），否则显得只背了结论。
- ❌ 说“MLM比CLM好，因为双向注意力更强” → ✅ 正确切入：指出trade-off——双向注意力理解强但无法直接生成，单向注意力生成流畅但理解弱，没有绝对优劣，取决于任务。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“检索增强生成中，CLM用于生成答案，MLM用于理解查询”角度切入，举例说明如何用BERT做查询编码、GPT做答案生成。
- **如果你只做过传统NLP**：用“语言模型 vs 序列标注”类比——CLM像语言模型（预测下一个词），MLM像序列标注（预测每个位置标签），强调注意力机制差异。
- **如果你是校招无项目**：聚焦“在相同语料上分别预训练小型GPT和BERT（如6层），对比文本生成和分类任务性能”的demo经验，展示对训练曲线和下游指标的理解。
- 《Attention Is All You Need》——Transformer原始论文，理解注意力机制基础
- 《BERT: Pre-training of Deep Bidirectional Transformers》——MLM范式奠基论文
- 《Language Models are Unsupervised Multitask Learners》——GPT-2论文，CLM范式代表
- 《Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer》——T5论文，Span Corruption变体
- 《FlashAttention: Fast and Memory-Efficient Exact Attention》——解决CLM长序列推理显存问题的工程方案

---
