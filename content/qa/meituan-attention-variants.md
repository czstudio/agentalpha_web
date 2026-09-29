---
slug: meituan-attention-variants
question: "知道哪些注意力机制？"
oneLine: "我会按族谱回答：MHA 是基线，MQA、GQA 和 MLA 主要围绕 KV Cache 做压缩，稀疏注意力降低长文本复杂度，Flash Attention 做算子级优化。"
category: jingchang
company: meituan, tencent, pdd, xiaohongshu, didi, deepseek, moonshot, xiaomi, microsoft, google, douyin, jd, bilibili, openai
track: algo-general
tags: [注意力机制, KV Cache, 大模型面试]
minutes: 5
order: 220
updated: 2026-09-29
deep: 
---

## 先这样答

我知道几类注意力机制和优化方法。标准多头自注意力，也就是 MHA，可以作为基线。它从标准结构出发，其他方法分别从缓存、长文本计算或算子实现上做优化。

MQA 和 GQA 都围绕 KV Cache 做优化。MQA 让多个查询头共享较少的键值头，从而节省 KV Cache。GQA 介于 MHA 和 MQA 之间，把查询头分成组，让每组共享键值头。DeepSeek 的 MLA 也围绕 KV Cache 展开，它通过潜在压缩减少缓存内容。

稀疏注意力针对长文本场景，减少需要计算的注意力范围，从而降低复杂度。Flash Attention 不是新的注意力数学形式，而是算子级优化。它保持注意力计算的数学定义不变，重点优化算子执行方式。面试中我会先讲这条族谱，再按面试官追问说明每一类的定位。

## 面试官会怎么追问

- **「MQA 和 GQA 解决的是什么问题？」**  
MQA 和 GQA 都主要解决 KV Cache 的开销问题。MQA 让更多查询头共享键值头，GQA 则按组共享键值头。两者都可以放在 MHA 基线下理解。

- **「MLA 和 MQA、GQA 是一类方法吗？」**  
它们都关注 KV Cache，但具体方式不同。MQA 和 GQA 通过共享键值头减少缓存内容。MLA 通过潜在压缩减少缓存内容，所以我会把它单独列为另一种路线。

- **「Flash Attention 算不算一种新的注意力机制？」**  
我不会把它和 MHA、MQA、GQA 放在同一层面。Flash Attention 做的是算子级优化，不改变注意力计算的数学形式。它的定位是优化实现方式，而不是重新定义注意力机制。

## 回答的坑

- 不要把 Flash Attention 说成一种改变注意力数学定义的新机制。
- 不要把 MQA、GQA 和 MLA 混成同一种 KV Cache 压缩方式。