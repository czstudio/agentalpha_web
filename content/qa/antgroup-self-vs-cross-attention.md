---
slug: antgroup-self-vs-cross-attention
question: "Self-attention 和 cross-attention 有什么区别？"
oneLine: "Self-attention 让同一序列内部交换信息，Q、K、V 来自同一序列；cross-attention 让解码端通过 Q 读取编码端的 K、V，实现跨源信息注入。"
category: jingchang
company: antgroup
track: algo-general
tags: [注意力机制, Transformer, 多模态]
minutes: 5
order: 268
updated: 2026-09-29
deep: 
---

## 先这样答

Self-attention 和 cross-attention 的核心区别，在于注意力计算使用的输入是否来自同一个序列。Self-attention 中，Q、K、V 来自同一序列。序列中的每个位置可以查看同一序列里的其他位置，从而完成序列内的信息交换。Transformer 编码器与 GPT 类模型主要使用这一类注意力。

Cross-attention 中，Q 来自解码端，K 和 V 来自编码端输出。解码端会根据自己的表示，查看另一个序列提供的信息。它处理的是两个序列之间的关系，不是单个序列内部的互相查看。

因此，self-attention 可以概括为“序列内信息交换”。Cross-attention 可以概括为“跨源信息注入”。翻译任务会用 cross-attention 连接编码端和解码端。语音任务也会用它处理不同序列之间的信息关系。多模态任务则可以用它完成不同模态之间的对齐。面试时先说清楚 Q、K、V 的来源，再补充两者的使用场景，答案就比较完整。

## 面试官会怎么追问

- **「如果 Q、K、V 都来自同一个序列，为什么还需要注意力？」** Self-attention 让序列中的每个位置查看同一序列的其他位置。模型可以在序列内部交换信息。它主要解决序列内不同位置之间的信息关系。

- **「cross-attention 为什么要把 Q 和 K、V 放在不同序列？」** Q 来自解码端，代表解码端当前要读取的信息来源。K、V 来自编码端输出，提供另一个序列的信息。这样模型就能建立两个序列之间的关系。

- **「翻译任务里，self-attention 和 cross-attention 分别做什么？」** Self-attention 负责序列内部的信息交换。Cross-attention 连接解码端与编码端输出，让解码端查看编码端的信息。两者的区别仍然看 Q、K、V 是否来自同一个序列。

## 回答的坑

- 只说“self 看自己、cross 看别人”不够，要明确说明 Q、K、V 的来源。
- 不要把 cross-attention 说成另一种序列内注意力，它的落点是跨源信息注入。