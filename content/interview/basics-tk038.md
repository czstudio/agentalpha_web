---
slug: basics-tk038
no: "938"
title: "What is the purpose of the encoder in a transformer model"
question: "What is the purpose of the encoder in a transformer model"
excerpt: "面试官想确认你是否真正理解 Transformer 编码器的核心设计哲学，而非仅背诵“多头注意力+FFN”的结构。这是典型的背概念+工程取舍混合题，刁钻点在于：很多人能说出编码器“提取特征”，但说不清它为什么用双向注意力"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4015
updated: "2026-09-29"
---

## What is the purpose of the encoder in a transformer model

#### 1️⃣ 考察意图

面试官想确认你是否真正理解 Transformer 编码器的**核心设计哲学**，而非仅背诵“多头注意力+FFN”的结构。这是典型的**背概念+工程取舍**混合题，刁钻点在于：很多人能说出编码器“提取特征”，但说不清它**为什么用双向注意力**、**为什么需要位置编码**、以及**输出到底怎么用**。答好了能展示你对 Transformer 架构的底层理解，以及区分编码器与解码器角色的能力，这是后续讨论 BERT、T5、甚至多模态模型的基础。

#### 2️⃣ 标准答

编码器的核心目的是**将输入序列映射为富含上下文信息的连续表示**，供下游任务（分类、序列标注、或解码器）使用。它由 N 个相同层堆叠，每层包含两个子层：多头自注意力（Multi-Head Self-Attention）和位置前馈网络（Position-wise FFN），每个子层后接残差连接和层归一化（LayerNorm）。

**1. 双向上下文建模**编码器使用**无掩码的自注意力**，每个 token 可以 attend 到序列中所有其他 token（包括前后）。这与解码器的因果注意力（causal attention）形成鲜明对比。例如在 BERT 中，编码器通过 [MASK] 预测任务学习双向表示，而 GPT 系列只用解码器，只能看到左侧上下文。**工程取舍**：双向注意力带来更强的语义理解能力，但无法用于自回归生成（因为会看到未来 token），所以编码器天然适合理解任务（分类、NER、QA），不适合文本生成。

**2. 位置编码的必要性**自注意力本身是**置换不变**的（permutation-invariant），即交换输入顺序，输出也会对应交换，但语义不变。这显然不合理，因为“我打你”和“你打我”完全不同。因此编码器必须注入位置信息。原始 Transformer 使用**正弦/余弦位置编码**（Sinusoidal PE），而 BERT 改用**可学习位置编码**（Learned PE）。实际落地坑：在长文本任务中，Sinusoidal PE 能外推到更长序列（因为公式是连续的），而 Learned PE 在训练长度外会失效，必须配合 RoPE（旋转位置编码）或 ALiBi 等改进方案。

**3. 输出形式与使用方式**编码器输出一个**向量序列**，长度与输入相同，每个位置对应一个 d_model 维向量。这些向量可以直接接分类头（如 BERT 用 [CLS] 向量做分类），也可以作为交叉注意力的 Key/Value 输入给解码器（如 T5 的 encoder-decoder 架构）。**实际落地的坑**：很多人以为 BERT 的 [CLS] 向量天然代表句子语义，但实验表明它受 [MASK] token 影响大，更稳健的做法是**平均池化**（mean pooling）或**加权池化**（如 Sentence-BERT 的 pooling 策略）。

**4. 与解码器的关键区别**

- **注意力模式**：编码器双向，解码器单向（掩码自注意力）。
- **交叉注意力**：解码器有额外的交叉注意力层，以编码器输出为 K/V；编码器没有。
- **层数**：编码器通常比解码器层数少（如 T5-base 编码器 6 层，解码器 6 层），但 BERT 只有编码器（12 层）。
- **应用场景**：编码器用于理解（BERT、RoBERTa、ALBERT），解码器用于生成（GPT、LLaMA），编码器-解码器用于 seq2seq（T5、BART）。

**5. 典型模型变体**

- **纯编码器**：BERT、RoBERTa、ALBERT、DeBERTa，用于分类、NER、QA。
- **编码器-解码器**：T5、BART、M2M-100，用于翻译、摘要、文本生成。
- **多模态编码器**：CLIP 的文本编码器（基于 Transformer），ViT 的图像编码器（将图像 patch 视为 token）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，编码器的**结构**——由多层双向自注意力+FFN 组成，每层有残差连接和 LayerNorm；第二，它的**核心功能**——将输入序列映射为上下文感知的连续表示，通过双向注意力捕获全局依赖；第三，它与**解码器的区别**——编码器无掩码、无交叉注意力，输出用于理解任务或作为解码器的 K/V。总结一句：编码器是 Transformer 中负责**理解**的组件，输出是富含上下文信息的向量序列。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：为什么编码器不用掩码自注意力？如果用了会怎样？

> 编码器用掩码自注意力会破坏双向上下文建模，导致每个 token 只能看到左侧信息，变成类似解码器的单向模型。这样在理解任务（如情感分类）中，模型无法利用“后面”的上下文，性能会显著下降。例如在 BERT 上做掩码语言模型（MLM）时，如果掩码自注意力，预测 [MASK] 时只能看到左侧 token，无法利用右侧信息，准确率会从 80%+ 降到 60% 以下。**工程取舍**：双向注意力带来更强的表示能力，但计算复杂度是 O(n²)，且无法用于自回归生成。

**追问 2**：编码器的输出维度是多少？怎么用？

> 输出维度是 (batch_size, seq_len, d_model)，其中 d_model 通常为 768（BERT-base）或 1024（BERT-large）。使用方式有三种：① 取 [CLS] 向量（第一个 token）接分类头，但效果不稳定；② 对所有 token 做平均池化（mean pooling），更鲁棒；③ 对每个 token 输出做序列标注（如 NER）。实际落地中，Sentence-BERT 发现 [CLS] 向量在语义相似度任务上不如 mean pooling，所以推荐后者。

**追问 3**：编码器的层数怎么选？为什么 BERT 用 12 层，而 T5 的编码器只有 6 层？

> 层数选择是**计算资源与表示能力的 trade-off**。BERT 是纯编码器，需要深层来捕获复杂语义，12 层是当时 GPU 显存（16GB）的极限。T5 是编码器-解码器架构，总层数 12 层（6+6），因为解码器也需要计算资源，且 T5 的预训练任务（span corruption）对编码器深度要求不如 MLM 高。实际工程中，如果任务简单（如短文本分类），4-6 层编码器就够；如果任务复杂（如长文档理解），12-24 层更合适。**注意**：层数翻倍，计算量翻倍，但性能提升会递减。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“编码器就是 BERT，解码器就是 GPT” → ✅ 正确说法：BERT 是纯编码器架构，GPT 是纯解码器架构，但编码器/解码器是组件概念，T5 同时包含两者。
- ❌ 说“编码器输出是一个向量” → ✅ 正确说法：编码器输出是一个向量序列（每个位置一个向量），不是单个向量。单个向量是 [CLS] 或池化后的结果。
- ❌ 说“编码器不需要位置编码，因为自注意力能捕获顺序” → ✅ 正确说法：自注意力是置换不变的，必须注入位置编码才能区分顺序。没有位置编码，模型会把“我打你”和“你打我”视为相同输入。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从编码器在检索增强中的角色切入——如何用 BERT 编码器生成 query 和 document 的 embedding，对比 DPR 和 ColBERT 的编码策略，以及为什么双向注意力比解码器更适合语义匹配。
- **如果你只做过传统 NLP**：用词向量类比——传统 Word2Vec 是静态表示，编码器输出是动态上下文表示。强调编码器如何通过自注意力解决一词多义问题（如“苹果”在“吃苹果”和“苹果公司”中的不同表示）。
- **如果你是校招无项目**：聚焦 BERT 论文的 MLM 任务，说明编码器如何通过双向注意力学习上下文表示，并提一下自己用 HuggingFace 跑过 BERT 情感分类 demo，对比了 [CLS] 和 mean pooling 的效果差异。
- 《Attention Is All You Need》（Vaswani et al., 2017）——原始 Transformer 论文
- 《BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding》（Devlin et al., 2019）
- 《Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer》（T5, Raffel et al., 2020）
- 《RoFormer: Enhanced Transformer with Rotary Position Embedding》（RoPE, Su et al., 2021）
- 《Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks》（Reimers & Gurevych, 2019）

---
