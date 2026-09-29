---
slug: xhs-llama-versions
question: "LLaMA 1、2、3 的异同？"
oneLine: "三代共同采用RoPE、SwiGLU和Pre-Norm；LLaMA 1打基础，LLaMA 2扩到2T tokens并加入GQA、4K上下文和RLHF，LLaMA 3用15T+ tokens、128K词表、全系GQA并增强多语言。"
category: jingchang
company: xiaohongshu
track: algo-general
tags: [小红书真题, LLaMA, 大模型架构]
minutes: 5
order: 304
updated: 2026-09-29
deep: 
---

## 先这样答

LLaMA 1、2、3 的共同底座是 RoPE、SwiGLU 和 Pre-Norm。三代的主要差异，集中在训练数据、注意力设计、上下文长度、对齐方式和语言覆盖上。面试时可以按“1 打基础、2 扩数据并做对齐、3 扩数据和词表”来记。

LLaMA 1 是基础开源版本，重点是建立这套模型底座。LLaMA 2 使用了 2T tokens 的训练数据。部分模型加入了 GQA。上下文长度扩展到 4K。它还加入了 RLHF 对齐。

LLaMA 3 使用了 15T+ tokens 的训练数据。它采用 128K 词表。GQA 覆盖全系模型。它还增强了多语言能力。回答时不要只背参数表。每代抓住一个记忆点更有效：LLaMA 1 记基础开源，LLaMA 2 记 2T tokens、4K 上下文和 RLHF，LLaMA 3 记 15T+ tokens、128K 词表和全系 GQA。

## 面试官会怎么追问

- **「三代模型有哪些共同点？」**  
三代都采用 RoPE、SwiGLU 和 Pre-Norm。它们构成了共同的模型底座。

- **「LLaMA 2 相比 LLaMA 1，主要变化是什么？」**  
LLaMA 2 把训练数据扩展到 2T tokens。部分模型加入 GQA，上下文扩展到 4K，并加入 RLHF 对齐。

- **「如果只能用一句话分别记住三代，你怎么说？」**  
LLaMA 1 记基础开源。LLaMA 2 记 2T tokens、4K 上下文和 RLHF。LLaMA 3 记 15T+ tokens、128K 词表、全系 GQA和多语言增强。

## 回答的坑

不要把 GQA 说成 LLaMA 2 全系都有，底稿只说明 LLaMA 2 的部分模型使用 GQA。

不要漏掉 LLaMA 3 的 128K 词表和多语言增强，也不要把 15T+ tokens 说成 LLaMA 2 的数据规模。