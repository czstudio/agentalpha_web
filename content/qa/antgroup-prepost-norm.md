---
slug: antgroup-prepost-norm
question: "Pre-norm 和 Post-norm 的区别？为什么主流用 Pre-norm？"
oneLine: "Post-norm 把归一化放在残差相加之后，深层网络梯度不稳；Pre-norm 把归一化放进子层内部，让残差通路保持顺畅，训练更稳定，所以主流选择它，但要用 final norm 控制输出量级。"
category: jingchang
company: antgroup
track: algo-general
tags: [蚂蚁集团真题, 大模型面试, Transformer]
minutes: 5
order: 279
updated: 2026-09-29
deep: 
---

## 先这样答

Pre-norm 更适合深层网络训练，所以现在更常用。Post-norm 把归一化放在残差相加之后。网络变深后，梯度容易不稳定。训练通常需要 warmup 和更细的参数调节。Pre-norm 把归一化放在子层内部。残差通路保持顺畅，梯度传播更稳定，因此更容易训练深层网络。

两者的主要区别是归一化的位置不同。Post-norm 先完成子层计算，再和残差相加，最后做归一化。Pre-norm 先对输入做归一化，再进入子层，之后与残差相加。主流选择 Pre-norm，是用少量表达力换更好的训练稳定性。Pre-norm 也不是没有问题。随着网络深度增加，残差不断相加，输出量级可能逐渐累积。因此，模型通常会在最后增加 final norm，对最终输出再做一次归一化。

## 面试官会怎么追问

- **「Post-norm 为什么在深网络里更难训练？」** Post-norm 把归一化放在残差相加之后。梯度需要经过更多层的变换，网络变深后更容易出现不稳定。实际训练通常需要 warmup 和更细的参数调节。

- **「Pre-norm 是不是一定比 Post-norm 好？」** 不是。Pre-norm 的主要优势是训练稳定，更容易支持深层网络。它会牺牲少量表达力，所以两者是稳定性和表达力之间的取舍。

- **「Pre-norm 已经更稳定了，为什么还要 final norm？」** Pre-norm 保证了残差通路的梯度传播更顺畅。可是残差会随着深度不断相加，输出量级可能累积。final norm 用来处理最终输出的量级。

## 回答的坑

- 不要把 Pre-norm 说成全面优于 Post-norm，核心是它用少量表达力换训练稳定性。
- 不要漏掉 final norm，否则没有回答 Pre-norm 输出量级随深度累积的问题。