---
slug: temperature-sampling
term: Temperature 与采样参数
en: Temperature & Sampling
oneLine: Temperature 与采样参数控制模型生成的随机性。模型每步输出词表概率分布，Temperature 缩放 logits 调整分布，Top-p 在累积概率覆盖 p 的候选里采样；参数越低越确定，越高越发散。
aliases: [Temperature, 温度, Top-p, 采样参数]
group: basics
tags: [采样, 基础概念]
relatedQa: [llm-temperature-top-p, what-is-autoregressive]
relatedTerms: [llm, token]
updated: 2026-09-28
---

## 是什么

Temperature 在应用 softmax 前将原始输出 logits 除以温度值 T。T 越低分布越尖锐，趋近贪心策略；T 越高分布越平缓，输出更随机。Top-k 保留概率最高的 k 个候选词，Top-p 核采样保留累积概率达到 p 的最小候选集。

在工程口径上，信息抽取、分类或 JSON 输出等确定性任务需使用低温或设为 0，创意生成任务适用较高温度。即便温度设为 0，在多数工程实现中，由于底层浮点运算或批处理的差异，输出仍可能产生微小波动。

## 解决什么问题

自回归模型每步都在进行概率采样。如果没有控制机制，模型将无法兼顾输出的准确性与多样性。

Temperature 与采样参数解决了模型输出在稳定与灵活之间的权衡问题。通过调整参数，同一个模型能够改变采样倾向，既能适配严谨的抽取任务，也能胜任发散的创作任务。

## 面试怎么考

常见考法包括辨析 Temperature 和 Top-p 的区别。答题需指明 Temperature 作用于 softmax 前的 logits 缩放；Top-p 作用于 softmax 后，对候选词集进行概率截断。

考官也常问同一问题为何每次回答不同，及温度设 0 是否绝对稳定。答题需指出模型基于概率采样，且理论上温度设 0 趋近贪心搜索，但在工程实现中，底层浮点运算差异或批处理机制仍可能引发微小波动。
