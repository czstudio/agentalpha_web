---
slug: meituan-layernorm-batchnorm
question: "LayerNorm 和 BatchNorm 的区别？为什么 Transformer 用前者？"
oneLine: "BatchNorm 沿 batch 维度归一化，依赖批统计量，处理变长序列不稳。LayerNorm 沿特征维度逐样本归一化，与 batch 无关，适合 Transformer 处理变长文本。"
category: jingchang
company: meituan
tags: [美团真题, 归一化, Transformer]
minutes: 5
order: 59
updated: 2026-09-29
deep: 
---

## 先这样答

BatchNorm 沿 batch 维度归一化，LayerNorm 沿特征维度逐样本归一化。Transformer 选择 LayerNorm。这源于变长序列和推理稳定性的要求。BatchNorm 强依赖批统计量。模型计算时需要跨样本聚合数据。变长序列会导致不同 batch 的统计量发生波动。推理阶段 BatchNorm 必须使用训练时累积的 running stats。测试数据序列长度改变会让推理计算不稳。

LayerNorm 避开了批统计量限制。它独立处理每个样本。模型沿着特征维度完成归一化。这种计算与 batch 大小无关。Transformer 处理变长文本时表现更好。LayerNorm 确保样本归一化只受自身特征影响。模型推理时不需要调用 running stats。训练和推理的计算逻辑完全一致。

两者的梯度行为存在差异。LayerNorm 的归一化参数参与梯度回传的方式与 BatchNorm 不同。这种梯度回传路径让模型训练更稳。这是美团北斗一轮面试考察此题的原因。

## 面试官会怎么追问

- **「BatchNorm 处理变长序列时为什么会波动？」**
BatchNorm 沿 batch 维度聚合数据。变长序列改变了每次输入的有效长度。模型计算均值和方差会受长度变化影响。批统计量因此变得不稳。

- **「推理时 running stats 会带来什么影响？」**
BatchNorm 在推理时不计算当前统计量。它必须调用训练时累积的 running stats。变长序列导致累积统计量无法适配所有推理场景。这直接造成推理结果不稳。

- **「你提到梯度行为差异，具体指什么？」**
两者在反向传播时表现不同。LayerNorm 的归一化参数参与梯度回传的方式不同于 BatchNorm。这种回传方式让网络训练更稳。

## 回答的坑

答题时把 BatchNorm 的不稳归结于 batch 太小偏离了变长序列这个核心事实。
回答时遗漏 LayerNorm 归一化参数参与梯度回传方式不同这一差异。