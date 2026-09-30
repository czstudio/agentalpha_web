---
slug: llamaindex
term: LlamaIndex
en: LlamaIndex
oneLine: LlamaIndex 是以数据为中心的 RAG 框架，核心强项是文档加载器、多种索引结构与检索器的组合。其 Agent 能力相对较弱，是 RAG 重度场景的首选检索层。
aliases: [LlamaIndex, GPT Index]
group: rag
tags: [LlamaIndex, 框架]
relatedQa: []
relatedTerms: [rag, chunking, embedding]
updated: 2026-09-28
---

## 是什么

LlamaIndex 定位为大模型应用的数据框架，核心组件包含多源文档接入的数据连接器、支持向量、树、关键词和知识图谱等多种形式的索引库，以及负责检索与合成的查询引擎。

它的特点在于拥有完整的数据摄取管线，开发者能够对解析、切分、元数据提取和嵌入过程进行细粒度配置。

在实际工程中，常见的用法是由 LlamaIndex 承担底层的检索层工作，配合 LangGraph 负责顶层的流程编排。

## 解决什么问题

RAG 的工程重心在于数据接入与索引结构的构建，而通用大模型框架在这层通常做得较浅，难以应对复杂的文档结构。

LlamaIndex 将数据接入与索引层做到了产品级标准，弥补了通用框架在处理深度上的不足，提供现成的底层数据组件。

## 面试怎么考

面试常考 LlamaIndex 与 LangChain 的分工差异。答题需明确前者专注数据检索层，后者偏向通用流程编排。

另一类考法涉及具体机制，要求说明不同索引类型在特定场景下的选择逻辑，或者解释递归检索、自动合并检索以及路由检索等高级策略的实现原理。
