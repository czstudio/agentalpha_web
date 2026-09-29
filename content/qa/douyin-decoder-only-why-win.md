---
slug: douyin-decoder-only-why-win
question: "为什么主流大模型都选 Decoder-only？"
oneLine: "Decoder-only 把任务统一成预测下一个 token，能在海量无标注文本上自监督训练。相比不同架构各自适配任务，它的目标和数据更统一。"
category: jingchang
company: douyin
track: algo-general
tags: [抖音真题, 模型架构, 自监督学习]
minutes: 5
order: 191
updated: 2026-09-29
deep: 
---

## 先这样答

主流大模型选择 Decoder-only，核心原因是它把训练目标统一成了预测下一个 token。这个目标足以表达任何 NLP 任务。模型因此可以直接从海量无标注文本中学习，不必先为不同任务准备不同的训练目标。对大模型来说，目标统一，也让可用的数据更加统一。

当训练文本规模扩大时，模型能从更多上下文中学习预测下一个 token。数据和目标都能沿着同一套方式扩展，模型也就能在统一训练中获得更强的能力。这是 Decoder-only 适合大规模预训练的关键。回答这题时，我会先讲清训练目标，再说明它和数据规模的关系。

不同架构有各自适合的任务。Encoder 可以双向读取文本，适合理解。Decoder 单向读取文本，适合生成。Encoder-Decoder 能分别处理输入和输出，适合翻译这类对齐任务。但它们的目标和数据不如 Decoder-only 统一。Decoder-only 用一个目标覆盖不同 NLP 任务，也能利用海量无标注文本，所以成为主流大模型常见的选择。

## 面试官会怎么追问

- **「预测下一个 token 怎么表达不同的 NLP 任务？」**  
  Decoder-only 把任务都写成文本序列，再预测序列中的下一个 token。生成过程围绕同一个目标展开。它不需要为每类任务切换一套训练目标。

- **「Encoder 双向理解更合适，为什么不直接用 Encoder？」**  
  Encoder 的双向结构适合理解任务。Decoder 的单向结构适合生成。主流大模型要覆盖不同任务，统一的预测目标和数据更重要。

- **「Encoder-Decoder 不是也能做生成吗？」**  
  能。它适合翻译这类输入和输出对齐的任务。与 Decoder-only 相比，它的训练目标和数据不如预测下一个 token 统一。

## 回答的坑

- 只说 Decoder 单向适合生成，却不解释预测下一个 token 如何统一任务和数据，就没有答出选择它的关键原因。
- 把 Encoder 或 Encoder-Decoder 说成不能生成或不能理解，会把架构适用特点误说成能力边界。