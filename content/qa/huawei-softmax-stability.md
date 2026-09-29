---
slug: huawei-softmax-stability
question: "Softmax 的原理和数值稳定性怎么处理？"
oneLine: "Softmax 通过指数归一化把 logits 转成概率分布；计算时先减去最大值再取指数，避免溢出，损失计算使用 log-sum-exp 防止下溢。"
category: jingchang
company: huawei
track: algo-general
tags: [华为真题, Softmax, 数值稳定性]
minutes: 5
order: 290
updated: 2026-09-29
deep: 
---

## 先这样答

Softmax 的原理是对每个 logit 做指数运算，再除以所有 logit 指数值的和，把 logits 转成概率分布。对第 \(i\) 个位置，可以写成 \(e^{z_i}/\sum_j e^{z_j}\)。指数会放大不同 logit 之间的差异，归一化后得到各位置对应的概率。

直接计算时，较大的 logit 经过指数运算可能溢出。稳定做法是先找出所有 logits 的最大值 \(m\)，再计算 \(e^{z_i-m}\)，最后用这些结果归一化。因为分子和分母同时除以了 \(e^m\)，所以结果在数学上等价，但计算过程更稳定。

如果把 Softmax 放进损失计算，直接计算指数和对数还可能出现下溢。此时使用 log-sum-exp 技巧，把相关计算改写成更稳定的形式。面试中还可以补充反向传播：设 Softmax 输出为 \(s\)，它的 Jacobian 是 \(\operatorname{diag}(s)-ss^\top\)，也就是由输出构成的对角矩阵减去输出向量与自身的外积。

## 面试官会怎么追问

- **「为什么减去最大值不会改变 Softmax 的结果？」**  
设最大值为 \(m\)。分子变成 \(e^{z_i-m}\)，分母变成 \(\sum_j e^{z_j-m}\)。分子和分母同时除以 \(e^m\)，所以比值保持不变。

- **「log-sum-exp 技巧在这里解决什么问题？」**  
它用于损失计算中的对数与指数运算。这个改写可以防止计算过程出现下溢。它和减最大值的思路一致，都是先改变计算形式，再保持数学结果不变。

- **「Softmax 的 Jacobian 在反向传播中是什么形式？」**  
设输出向量为 \(s\)，Jacobian 写成 \(\operatorname{diag}(s)-ss^\top\)。前一项是由 \(s\) 构成的对角矩阵，后一项是 \(s\) 与自身的外积。

## 回答的坑

- 只说 Softmax 是指数归一化，却不说明大 logits 会导致指数溢出，答案不完整。
- 只说减最大值能稳定计算，却不解释分子分母同时缩放后结果数学等价。