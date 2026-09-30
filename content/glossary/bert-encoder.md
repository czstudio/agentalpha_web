---
slug: bert-encoder
term: BERT 与编码器架构
en: BERT & Encoder-only Models
oneLine: BERT 与编码器架构是仅使用 Transformer 编码器、通过双向注意力和完形填空式目标训练的理解型模型。它擅长分类与检索等任务，是早期自然语言理解的基座与现代 Embedding 模型的直系祖先。
aliases: [BERT, Encoder-only, 编码器模型, 完形填空]
group: basics
tags: [BERT, 架构]
relatedQa: [bytedance-decoder-only-why, what-is-transformer]
relatedTerms: [transformer-attention, embedding]
updated: 2026-09-28
---

## 是什么

BERT 与编码器架构采用双向注意力机制，允许模型在处理每个位置时观察全局上下文。其主要训练目标为掩码语言模型，即随机遮蔽输入词元并要求模型进行预测，部分早期版本还包含下一句预测任务。

在模型分工上，编码器架构在理解与表示任务中占据主导地位，如文本分类、检索召回与重排序。现代 Embedding 与 Rerank 模型大多沿用 BERT 系骨架，而开放式文本生成任务则由 Decoder-only 架构主导。

该架构的演化路径从初代的 BERT 发展到去除下一句预测任务的 RoBERTa，进而演变为当前结合对比学习训练的现代双向编码器模型。

## 解决什么问题

自然语言理解任务不需要文本生成能力，双向注意力机制能够对上下文信息进行更充分的提取与利用。编码器架构为分类、实体识别和向量化等任务提供了计算效率与理解精度的平衡。在工程实践中，明确何时使用编码器而非 Decoder-only 架构是模型选型的基本常识，能够避免在非生成任务中浪费计算资源。

## 面试怎么考

面试常考察 BERT 的训练目标及其与 GPT 系列的注意力差异。答题要点需明确 BERT 的掩码语言模型与双向注意力机制，并对比 GPT 的自回归目标与单向注意力。

另一个常见考点是为什么检索模型依然采用 BERT 系骨架，以及 Decoder-only 架构为何统治生成任务。答题时应指出双向注意力在全局语义表示上的优势，以及单向注意力在防止信息穿越和自回归生成上的结构必然性。
