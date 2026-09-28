---
slug: kv-cache
term: KV Cache
en: Key-Value Cache
oneLine: KV Cache 是大模型自回归解码时，缓存已生成序列每层 Key 和 Value 矩阵的机制。它避免每步重算全部历史注意力，代价是显存随序列长度线性增长，是推理优化的核心变量。
aliases: [KV Cache, KV 缓存, 键值缓存]
group: inference
tags: [KV Cache, 推理]
relatedQa: [what-is-kv-cache, kv-cache-quantization, what-are-gqa-mqa-mla]
relatedTerms: [transformer-attention, paged-attention, context-window]
updated: 2026-09-28
---

## 是什么

在因果注意力下，已生成 token 的 Key 和 Value 向量不变。KV Cache 缓存这些张量，使模型每步解码只算新 token 的 QKV 投影，避免对前文进行平方级重算。

其开销是显存占用随上下文长度线性增长，具体由层数、KV 头数、头维度、序列长度及精度字节决定。长上下文中，该占用常超过模型权重。

优化方案包括：用 GQA 和 MQA 减少 KV 头数；用 MLA 将 KV 投影到低维潜在空间；用 PagedAttention 分页管理碎片；复用前缀缓存；采用 INT8 或 FP8 进行量化。

## 解决什么问题

KV Cache 解决了自回归生成的计算冗余问题。若无此机制，生成新词需将所有前文重新输入注意力层，时间开销随序列长度呈平方级增加。

引入后，每步解码的注意力计算从重算全历史变为仅算增量。这避免了重复运算，是自回归推理实用化的前提。

## 面试怎么考

面试常问没有 KV Cache 为什么快不起来，需点明平方级复杂度与重复计算。显存估算是必考项，需列出包含层数、KV 头数、头维度、序列长度与精度字节等变量的乘积公式。考官常追问优化方案，如 MLA 为何省显存，需说明其投影到低维潜在空间的设计；或问如何量化，需提及 INT8 等格式转换。
