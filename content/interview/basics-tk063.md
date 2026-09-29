---
slug: basics-tk063
no: "963"
title: "Bert的结构是什么？一般可以做什么任务"
question: "Bert的结构是什么？一般可以做什么任务"
excerpt: "这道题看似基础，实则考察对 Transformer Encoder 架构的深度理解，而非单纯背诵。面试官想看：① 能否清晰拆解 BERT 的输入表示（Token/Segment/Position Embedding 三合"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4269
updated: "2026-09-29"
---

## Bert的结构是什么？一般可以做什么任务

#### 1️⃣ 考察意图

这道题看似基础，实则考察对 **Transformer Encoder 架构的深度理解**，而非单纯背诵。面试官想看：① 能否清晰拆解 BERT 的输入表示（Token/Segment/Position Embedding 三合一）和双向注意力机制；② 是否理解 MLM + NSP 两个预训练任务的设计动机（为什么 MLM 要 80% mask + 10% 随机 + 10% 不变？为什么 NSP 后来被 RoBERTa 弃用？）；③ 能否从“预训练-微调”范式出发，列举任务并说明如何适配（如分类用 [CLS] 向量，QA 用起止位置预测）。**刁钻点**：面试官可能追问“为什么 BERT 不用因果注意力？”或“MLM 的 15% mask 比例是经验值还是理论最优？”。答好了能展示架构设计 sense + 工程取舍能力。

#### 2️⃣ 标准答

**BERT 架构核心**：基于 Transformer Encoder 堆叠，典型配置为 BERT-base（12 层，768 维，12 头注意力）和 BERT-large（24 层，1024 维，16 头注意力）。与 GPT 的 Decoder-only 不同，BERT 使用**双向自注意力**，每个 token 能同时看到左右上下文，这是理解语义的关键。

**输入表示**：三个 Embedding 逐元素相加：

- **Token Embedding**：WordPiece 分词，30K 词表，[CLS] 放句首，[SEP] 分隔句子。
- **Segment Embedding**：区分句子 A/B（0/1），用于 NSP 任务。
- **Position Embedding**：可学习的位置编码，最大 512 位置，与 Transformer 的 Sinusoidal 不同，BERT 直接学位置向量。

**预训练任务**：

- **MLM（Masked Language Model）**：随机 mask 15% 的 token，其中 80% 替换为 [MASK]，10% 随机替换，10% 不变。**为什么这么设计？** 如果全部用 [MASK]，微调时模型从未见过 [MASK] token，导致预训练-微调不匹配。随机替换迫使模型依赖上下文而非记忆，不变 token 保持分布稳定。15% 是经验值：太低则任务太简单，太高则训练信号稀疏。
- **NSP（Next Sentence Prediction）**：预测两个句子是否连续（50% 正例，50% 负例）。**实际坑**：RoBERTa 实验证明 NSP 对下游任务提升有限，甚至有害，因为负例采样太简单（随机拼接不同文档），模型学的是“主题一致性”而非“句子连续性”。后续 ALBERT 用 SOP（Sentence Order Prediction）替代，难度更高。

**可做任务（微调范式）**：

- **单句分类**（情感分析、意图识别）：取 [CLS] 向量过全连接层 + Softmax。**工程取舍**：为什么不取所有 token 的 mean pooling？[CLS] 在预训练中被迫聚合全局信息，但实际任务中 mean pooling 有时更好（如长文本分类），需实验验证。
- **序列标注**（NER、POS）：每个 token 输出过 CRF 或线性分类器。**坑**：BERT 的 WordPiece 分词可能将一个词拆成多个 subword（如“playing” → “play” + “##ing”），标注时需对齐到原始词级别，常用“BIO”标签 + 首 token 预测策略。
- **问答**（SQuAD 2.0）：预测答案在原文中的起止位置，输出两个向量（start logits, end logits）。**实际落地**：当答案跨多个句子时，BERT 的 512 长度限制是瓶颈，需用滑动窗口或 Longformer 变体。
- **句子对任务**（文本蕴含、语义相似度）：输入“句子 A [SEP] 句子 B”，[CLS] 向量过分类器。**注意**：相似度任务中，直接取 [CLS] 不如用“交叉注意力”后取两个句子的交互特征（如 Sentence-BERT 用孪生网络）。

**微调技巧**：在 BERT 基础上加简单分类层（通常 1-2 层），学习率设为 2e-5 到 5e-5，使用 AdamW（带权重衰减）。**为什么小学习率？** 预训练参数已包含丰富语义，微调只需微调，大学习率会破坏预训练特征。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从架构、预训练、任务适配三个层面回答。架构上，BERT 是 Transformer Encoder 堆叠，核心是双向自注意力，输入是 Token + Segment + Position 三 Embedding 之和。预训练用 MLM（15% mask，80/10/10 策略）和 NSP（后被 RoBERTa 弃用）。任务上，分类用 [CLS] 向量，序列标注用每个 token 输出，QA 预测起止位置，句子对用交叉注意力。总结一句：BERT 通过双向上下文建模和预训练-微调范式，成为 NLP 任务的通用骨架。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么 BERT 不用因果注意力（Causal Attention）而用双向注意力？

> 因果注意力（如 GPT）只允许看左侧 token，适合生成任务（自回归）。BERT 的双向注意力让每个 token 看到完整上下文，更适合理解任务（分类、标注、QA）。**工程取舍**：双向注意力计算量更大（O(n²) 对 O(n²) 但无 mask 优化），且不能用于生成。如果面试官追问“能否用 BERT 做生成？”，可以回答：可以但需改造，如用 Masked LM 做填空式生成，或用 Encoder-Decoder 架构（如 T5）。

**追问 2**：MLM 的 15% mask 比例是经验值吗？有没有理论依据？

> 15% 是 Devlin 等人在 BERT 论文中通过实验确定的经验值。**理论直觉**：如果比例太低（如 5%），模型只需学局部 n-gram 就能预测，无法利用长距离依赖；如果比例太高（如 30%），训练信号过于稀疏，收敛慢。后续 ELECTRA 用“替换 token 检测”替代 MLM，效率更高。**实际坑**：在领域数据（如法律、医疗）上，15% 可能不是最优，需调参。

**追问 3**：BERT 的 512 长度限制怎么解决？长文本任务如何处理？

> 三种常见解法：① **滑动窗口**：将长文本切分成 512 长度的片段，取重叠部分（如 128 token 重叠），最后合并预测结果。② **Longformer/BigBird**：用稀疏注意力（如滑动窗口 + 全局 token）降低复杂度，支持 4096+ 长度。③ **分段编码**：如 CogLTX，用“先检索后推理”策略，只保留关键 token。**工程取舍**：滑动窗口实现简单但丢失跨片段信息；Longformer 效果好但需重新预训练。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“BERT 是 Transformer 的 Decoder 部分” → ✅ 正确说法：“BERT 是 Transformer 的 Encoder 部分，使用双向自注意力；Decoder 是因果注意力，用于生成。”
- ❌ 说“NSP 任务对 BERT 至关重要，所有变体都保留” → ✅ 正确说法：“RoBERTa 实验证明 NSP 可移除，ALBERT 用 SOP 替代，实际应用中需根据任务决定是否保留。”
- ❌ 说“微调时所有层都冻结，只训练分类头” → ✅ 正确说法：“通常全量微调（所有层参与训练），学习率设 2e-5 到 5e-5；冻结底层只训练顶层是轻量方案（如 Adapter）。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“BERT 作为检索器编码器”切入，对比 DPR（双塔 BERT）与 ColBERT（交互式 BERT）的 trade-off（精度 vs 延迟），强调 BERT 的双向注意力对 query-document 匹配的优势。
- **如果你只做过传统 NLP**：用“Word2Vec 是静态词向量，BERT 是动态上下文向量”类比，说明 BERT 如何解决一词多义问题（如“bank”在河流/银行场景下向量不同），并迁移到你的分类/序列标注项目。
- **如果你是校招无项目**：聚焦 HuggingFace 的 BERT 微调 demo，展示对 GLUE 基准（如 MRPC 句子对分类）的理解，并分析 [CLS] 向量与 mean pooling 的差异（可引用 Sentence-BERT 论文）。
- BERT 原始论文：BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding (Devlin et al., 2019)
- RoBERTa 改进分析：RoBERTa: A Robustly Optimized BERT Pretraining Approach (Liu et al., 2019)
- ELECTRA 高效预训练：ELECTRA: Pre-training Text Encoders as Discriminators Rather Than Generators (Clark et al., 2020)
- Sentence-BERT 句子嵌入：Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks (Reimers & Gurevych, 2019)
- HuggingFace Transformers 库微调教程：Fine-tuning a pretrained model (官方文档)

---
