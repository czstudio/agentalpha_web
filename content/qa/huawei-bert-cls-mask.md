---
slug: huawei-bert-cls-mask
question: "BERT 中 [CLS] token 的作用？Attention 的 mask 有什么用？"
oneLine: "[CLS] 是不偏向任何词的句子信息聚合位，自注意力将全句汇聚到它并接分类头；mask 用于屏蔽 padding，或在解码器中遮住未来位置以保自回归。"
category: jingchang
company: huawei
track: algo-general
tags: [华为真题, BERT, Attention]
minutes: 5
order: 312
updated: 2026-09-29
deep: 
---

## 先这样答

结论是，[CLS] 是一个无语义的句子级聚合位，mask 则负责屏蔽不该参与注意力的位置。

在 BERT 中，[CLS] 放在句子开头。它本身不代表某个具体词，也不带预设语义。经过自注意力计算后，全句信息会汇聚到这个位置。模型再取 [CLS] 的表示，接分类头完成句子级任务。它没有词义，反而不会偏向句子里的某个词，所以适合承担整体表示。

Attention 的 mask 主要有两种用法。padding mask 用来屏蔽变长输入补出来的填充位，避免模型把这些位置当作有效内容。causal mask 用在解码器中，用来遮住当前位置之后的未来位置。这样，当前位置只能使用已经出现的信息，从而保持自回归。

## 面试官会怎么追问

- **「为什么 [CLS] 要设计成无语义，而不是直接选一个词做句子表示？」**  
[CLS] 不对应句子中的具体词，所以不会天然偏向某个词。自注意力可以把全句信息汇聚到它上面。这样它更适合表示整句，再交给分类头处理句子级任务。

- **「padding mask 和 causal mask 分别解决什么问题？」**  
padding mask 屏蔽变长输入中的填充位。causal mask 屏蔽当前位置之后的未来位置。前者处理无效的填充内容，后者保证解码时不能看到未来信息。

- **「mask 是把 token 删除了吗？」**  
不是。mask 的作用是屏蔽特定位置参与注意力。padding mask 针对填充位，causal mask 针对当前位置之后的位置。两者都服务于注意力范围的控制。

## 回答的坑

- 不要把 [CLS] 说成带有固定句子语义的特殊词，它是无语义的聚合位。
- 不要只解释 padding mask，causal mask 还要说明它在解码器中遮住未来位置以保自回归。