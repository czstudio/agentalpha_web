---
slug: huawei-peft-variants
question: "Prompt Tuning、Prefix Tuning、Adapter Tuning 的原理和区别？"
oneLine: "三者都冻结主干、只训练小参数，核心区别在注入位置：输入端、每层注意力前，或层内串行插入模块。"
category: jingchang
company: huawei
track: agent-algo
tags: [华为真题, 大模型面试]
minutes: 5
order: 282
updated: 2026-09-29
deep: 
---

## 先这样答

结论是，三者都冻结主干模型，只训练一小部分参数。它们的核心区别在注入位置和推理开销。Prompt Tuning 在输入端加入可学习的连续 token。它只作用于输入侧，属于浅层方法。

Prefix Tuning 在每层注意力之前加入可学习的前缀向量。它能在网络的深层发挥作用。Prefix Tuning 需要通过重参数化保持训练稳定。Adapter Tuning 则在层内插入一个小型 MLP 瓶颈模块。这个模块采用串行方式接入，因此推理时会增加延迟。面试时可以按输入端、注意力层前、层内模块这条线比较三者。三者都不更新主干参数，只训练新增的小参数。最终选择主要看注入位置和推理阶段能接受的额外开销。

## 面试官会怎么追问

- **「为什么说 Prompt Tuning 是浅层方法？」** Prompt Tuning 把可学习的连续 token 加在输入端。它从输入侧影响模型，所以相较于作用在每层注意力前的方法，属于浅层注入。

- **「Prefix Tuning 和 Prompt Tuning 的关键区别是什么？」** Prompt Tuning 在输入端加入可学习连续 token。Prefix Tuning 在每层注意力前加入可学习前缀向量，因此作用位置更深，并且需要重参数化来保持训练稳定。

- **「Adapter Tuning 的代价是什么？」** Adapter Tuning 会在层内插入小型 MLP 瓶颈模块。它采用串行结构接入，所以推理时会增加延迟。它和前两者一样，只训练新增的小参数。

## 回答的坑

- 不要只说三者都冻结主干，还要明确比较输入端、每层注意力前和层内插入三个位置。

- 不要忽略 Adapter 的串行结构和 Prefix Tuning 的重参数化要求。