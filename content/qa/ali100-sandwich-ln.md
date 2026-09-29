---
slug: ali100-sandwich-ln
question: "Pre-LN、Post-LN 和 Sandwich-LN 对深层训练稳定性有什么影响？"
oneLine: "稳定性上 Pre-LN 最好，深层模型默认采用；原始 Transformer 采用 Post-LN，需要 warmup 精调；Sandwich-LN 作为折中方案前后都加。"
category: jingchang
company: alibaba, pdd, xiaohongshu
track: algo-general
tags: [阿里真题, LayerNorm, 训练稳定性]
minutes: 5
order: 100
updated: 2026-09-29
deep: 
---

## 先这样答

在深层训练稳定性上，Pre-LN 表现最好，深层模型默认采用这种结构。原始 Transformer 采用的是 Post-LN。Post-LN 把归一化操作放在残差连接之后。网络在反向传播时，深层梯度会变得不稳定。模型很难直接收敛。工程师必须配合 warmup 策略进行精调。模型需要先用极小的学习率预热。预热过程可以避免网络在训练初期发生崩溃。

Pre-LN 把归一化操作放在残差分支内部。残差主干保留了通畅的路径。梯度可以直接从深层传导到浅层。模型训练过程十分平稳。开发者不需要设计复杂的 warmup 阶段。这种设计也会带来一个代价。网络深层的特征表达能力会发生略微下降。

Sandwich-LN 是一种折中方案。它在残差分支的前面加上归一化层。它同时在残差分支的后面也加上归一化层。这种前后都加的设计试图平衡两种结构的优缺点。它兼顾了训练稳定性和模型表达能力。

## 面试官会怎么追问

- **「原始 Transformer 为什么容易在训练初期崩溃？」**
原始 Transformer 采用 Post-LN 结构。归一化层位于残差连接之后。深层网络的梯度在反向传播时极不稳定。这种梯度震荡直接导致模型初期训练崩溃。

- **「现在的深层大模型默认用哪种结构？」**
深层模型默认采用 Pre-LN 结构。它的归一化操作在残差分支内完成。主干网络的梯度流动十分通畅。开发者愿意用略微下降的深层表达力来换取训练的平稳。

- **「Sandwich-LN 具体是怎么做折中的？」**
它结合了前两者的特征。网络在残差分支的前后都增加归一化层。这种设计保留了梯度的通畅性。它同时试图弥补单用 Pre-LN 带来的表达力损失。

## 回答的坑

误以为原始 Transformer 使用的是训练更稳定的 Pre-LN 结构。
遗漏 Post-LN 必须配合 warmup 策略精调这一关键事实。