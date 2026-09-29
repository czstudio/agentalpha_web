---
slug: huawei-prompt-tuning-deep
question: "Prompt Tuning、Prefix Tuning、Adapter、LoRA 四种参数高效微调怎么选？"
oneLine: "默认先选 LoRA：它用低秩分解表示权重增量，不改模型结构，推理时可合并且不增加推理延迟；资源极限时再比较其余三种。"
category: jingchang
company: huawei
track: agent-algo
tags: [华为真题, 大模型面试, 参数高效微调]
minutes: 5
order: 300
updated: 2026-09-29
deep: 
---

## 先这样答

优先选 LoRA，资源极限时再考虑 Prompt Tuning、Prefix Tuning 和 Adapter。LoRA 用低秩分解表示权重增量，不改模型结构。推理时可以把增量合并进原权重，因此不会增加推理延迟。这个特点让它成为当前默认首选。

Prompt Tuning 只在输入层加入可学习 token，参数量最少，但在小模型上的效果较弱。Prefix Tuning 会在每层注意力中加入前缀向量，效果好于纯 Prompt Tuning，但这些前缀会占用上下文窗口。它适合接受这项开销的场景。

Adapter 在层内插入小型 MLP。它不占用上下文窗口，但会串行增加推理延迟。面试中可以按三个维度比较：参数量、上下文窗口占用和推理延迟。实际选型先看 LoRA，只有资源限制或特定约束下，再在其余方法里取舍。

## 面试官会怎么追问

- **「为什么 LoRA 是默认首选？」** LoRA 只表示权重增量，不改模型结构。它推理时可以合并到原权重中。合并后不会增加推理延迟，所以通常优先考虑它。

- **「Prompt Tuning 和 Prefix Tuning 的核心区别是什么？」** Prompt Tuning 只在输入层加可学习 token。Prefix Tuning 在每层注意力中加入前缀向量。后者效果好于纯 Prompt Tuning，但会占用上下文窗口。

- **「Adapter 什么时候值得考虑？」** Adapter 不占用上下文窗口，这是它相对 Prefix Tuning 的特点。但它在层内加入小型 MLP，会串行增加推理延迟。是否选择它，要看是否更在意上下文窗口，而不是优先追求 LoRA 的推理特性。

## 回答的坑

- 不要只说参数量最少就选 Prompt Tuning，因为它在小模型上的效果较弱。
- 不要把 Adapter 说成没有推理代价，它会串行增加延迟。