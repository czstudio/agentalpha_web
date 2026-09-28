---
slug: token
term: Token（词元）
en: Token
oneLine: Token（词元）是模型处理文本的最小单位，分词器将连续文本切成子词片段并映射为词表编号，计费与上下文长度均按 token 数计算。
aliases: [Token, 词元, 分词]
group: basics
tags: [Token, 基础概念]
relatedQa: [what-is-autoregressive, visual-token-cost, llm-temperature-top-p]
relatedTerms: [transformer-attention, context-window, llm]
updated: 2026-09-28
---

## 是什么

Token（词元）是文本经过分词器切分后得到的子词单元，主流分词方法是 BPE 字节对编码。分词器先把连续文本拆成子词片段，再将每个片段映射为词表中的编号。模型实际接收的是 token 编号序列，生成文本时也是逐 token 输出。

英文一个单词常对应约一个 token，中文一个字往往对应一到两个 token。图片也可由视觉编码器切分并表示为视觉 token。API 计费、上下文窗口占用、KV Cache 显存和首 token 延迟都与 token 数直接相关。

## 解决什么问题

自然语言词汇不断变化，固定词表无法直接收录所有单词。子词切分用有限词表覆盖开放词汇，未登录词也能拆成已有子词表示，避免因词表中没有完整词而无法处理。

Token 还为模型输入输出、API 计费和长度限制提供统一度量，使不同文本都能按同一单位计算资源占用。

## 面试怎么考

为什么按 token 计费：回答模型的计算、上下文占用和缓存开销都随 token 数变化，因此 token 是比字符数或单词数更直接的度量。

一段中文大概多少 token：说明中文一个字往往对应一到两个 token，但实际数量取决于分词器和具体文本。

多模态里一张图占多少 token：说明图片会被视觉编码器转换为视觉 token，占用数量取决于视觉编码与切分方式。
