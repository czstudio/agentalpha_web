---
slug: layer-norm
term: LayerNorm 与 RMSNorm
en: Layer Normalization / RMSNorm
oneLine: LayerNorm 与 RMSNorm 是对单样本特征维度做归一化的方法，与 batch 无关，适合变长序列；RMSNorm 是去掉均值中心化步骤的简化版，计算更省，是现代基座标配；归一化放在残差前（Pre-LN）能让训练更稳，为深层网络主流。
aliases: [LayerNorm, RMSNorm, 层归一化, Pre-LN, Post-LN]
group: basics
tags: [归一化, 基础概念]
relatedQa: [layernorm-pre-post, what-is-transformer]
relatedTerms: [transformer-attention]
updated: "2026-09-30"
---

## 是什么

LayerNorm 是一种逐样本全维度归一化的机制。与依赖 batch 统计量的 BatchNorm 不同，LayerNorm 的计算与 batch 大小无关，避免了在小 batch 或变长序列下统计量不稳的问题，在自然语言处理中取代了 BatchNorm。

RMSNorm 是 LayerNorm 的简化版。它去除了计算均值并中心化的步骤，仅保留缩放不变性。这种简化减少了计算开销且不掉效果，已成为现代基座模型的标配。

归一化的位置分为 Pre-LN 和 Post-LN。Pre-LN 将归一化放在残差分支前，梯度能通过恒等通路顺畅流动，深网络训练更稳，减少了对 warmup 的依赖。Post-LN 表达上限略高但深层难训。

## 解决什么问题

归一化机制是维持深层网络训练稳定的基础环节。如果没有它，深层网络在反向传播时易出现梯度消失或爆炸，导致无法收敛。

归一化位置的选择直接决定模型能训多深。Post-LN 在层数多时主干网络方差会迅速累积，导致无法训练。Pre-LN 补上了该缺陷，通过改变归一化位置控制了主干通路的方差规模，使深网络得以顺利训练。

## 面试怎么考

常考自然语言处理弃用 BatchNorm 的原因。答题需指出 BatchNorm 依赖 batch 统计量，处理变长序列或小 batch 时波动大，而 LayerNorm 逐样本计算不受此影响。

另外常考 RMSNorm 省略了什么，及 Pre-LN 与 Post-LN 的稳定性差异。答题要点：RMSNorm 去除均值中心化项，仅保留缩放不变性以降低计算量；Pre-LN 将归一化放在残差前，梯度经恒等通路流动，深网络更稳。
