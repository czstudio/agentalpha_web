---
slug: rag-tk1176
no: "2076"
title: "| 31 | What are the different chunk enhancement techniques in RAG"
question: "| 31 | What are the different chunk enhancement techniques in RAG"
excerpt: "面试官想考察你对 RAG 系统检索后处理环节的深度理解，而非简单罗列技术名词。这是典型的“工程取舍 + 系统设计”题，刁钻点在于：候选人常只提重排序（Rerank），忽略压缩（Compression）、融合（Fusion"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 6
words: 3091
updated: "2026-09-29"
---

## | 31 | What are the different chunk enhancement techniques in RAG

`P1` · `rag`

🏷 标签：`rag`, `chunk-enhancement`, `reranking`, `compression`

#### 1️⃣ 考察意图

面试官想考察你对 RAG 系统检索后处理环节的深度理解，而非简单罗列技术名词。这是典型的“工程取舍 + 系统设计”题，刁钻点在于：候选人常只提重排序（Rerank），忽略压缩（Compression）、融合（Fusion）、过滤（Filtering）等更细粒度技术，且说不清各自在延迟、精度、成本上的 trade-off。答好了能展示你从“检索到生成”整条链路的优化意识，以及针对不同业务场景（如问答、摘要、代码生成）做技术选型的能力。

#### 2️⃣ 标准答

块增强（Chunk Enhancement）是 RAG 中检索后、生成前的关键步骤，目的是提升输入给 LLM 的上下文质量，减少噪声和冗余。主要技术分为四类：

- **重排序（Reranking）**方法：用交叉编码器（如 Cohere Rerank 3、BGE-Reranker-v2）对检索到的 top-k 块重新打分，按相关性降序排列。
- 为什么这么做：双编码器（如 DPR、BGE）的向量检索速度快但精度有限，交叉编码器通过全交互计算能捕捉更细粒度的语义匹配，尤其适合处理“关键词匹配但语义无关”的假阳性。
- 实际落地的坑 + 解法：交叉编码器推理慢，若 top-k=50 则需 50 次前向传播。解法：先向量检索取 top-100，再用交叉编码器重排取 top-5，平衡延迟与精度。
- Trade-off：精度提升 5-15% (通用知识)，但延迟增加 2-5 倍，适合对质量要求高、延迟容忍度低的任务（如法律文档问答）。
压缩（Compression）
- 方法：用 LLM 或专用模型（如 LongLLMLingua、LLMLingua-2）对检索块进行摘要、提取关键句或删除冗余。
- 为什么这么做：减少输入 token 数，降低 LLM 推理成本，同时过滤噪声。例如，一个 500 词的网页块可能只有 2 句相关，压缩后保留核心信息。
- 实际落地的坑 + 解法：压缩可能丢失上下文连贯性，导致 LLM 误解。解法：保留块内顺序，或使用“提取式压缩”（直接复制关键句）而非“生成式压缩”（重写摘要），后者更可控。
- Trade-off：压缩率 50-80% 时，F1 下降 < 3% (通用知识)，但若压缩率 > 90% 则信息损失显著，适合 token 预算紧张的场景（如 API 调用按 token 计费）。
融合（Fusion）
- 方法：将多个相关块拼接成连贯上下文，常见策略有：按原始文档顺序拼接、按相关性加权拼接、或使用滑动窗口重叠（如 LlamaIndex 的 `SentenceWindowNodeParser`）。
- 为什么这么做：单个块可能信息不完整，融合后提供更丰富的上下文，尤其适合多跳问答（Multi-hop QA）。
- 实际落地的坑 + 解法：拼接后可能引入重复或矛盾信息。解法：在拼接前用语义相似度去重（如 cosine < 0.9 才合并），或让 LLM 在 prompt 中显式处理冲突（如“若信息矛盾，以最新来源为准”）。
- Trade-off：融合增加 token 数，但能提升复杂任务准确率 10-20% (通用知识)，适合需要跨块推理的场景（如论文综述）。
过滤（Filtering）
- 方法：基于相关性阈值（如 BM25 得分 < 0.3）、或元数据（如时间戳、来源域）剔除低质量块。
- 为什么这么做：简单高效，避免噪声进入生成阶段。例如，检索到过时新闻块，通过时间戳过滤掉。
- 实际落地的坑 + 解法：阈值设置不当会误杀相关块。解法：用验证集调参，或使用动态阈值（如取 top-k 得分的 80% 分位数）。
- Trade-off：过滤是 O(n) 操作，几乎无延迟开销，但精度提升有限（< 5%），适合作为第一道防线。

**总结**：实际系统中常组合使用，如“向量检索 → 过滤（去低分）→ 重排序 → 压缩 → 融合 → LLM”。选择依据：延迟预算（重排序最贵）、精度要求（压缩可能丢信息）、任务类型（多跳问答需融合）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从四个层面回答：重排序、压缩、融合、过滤。重排序用交叉编码器提升精度但增加延迟；压缩用 LLM 减少 token 但可能丢信息；融合拼接多块增强上下文但增加成本；过滤用阈值快速去噪。实际落地时，我会根据延迟预算和任务类型组合使用，比如高精度场景用重排序 + 压缩，低延迟场景只用过滤。总结一句：块增强的核心是在精度、延迟、成本之间做工程取舍。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到重排序用交叉编码器，那如果我的 top-k 很大（比如 100），怎么优化延迟？

> 应对策略：

**追问 2**：压缩技术中，提取式 vs 生成式哪个更好？为什么？

> 应对策略：

**追问 3**：融合时如何避免信息冲突？比如两个块对同一事实说法不同。

> 应对策略：

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提重排序，说“块增强就是加个 reranker” → ✅ 必须覆盖压缩、融合、过滤，并说明各自适用场景和 trade-off。
- ❌ 说“压缩用 LLM 摘要，效果最好” → ✅ 要区分提取式 vs 生成式，并指出生成式可能引入幻觉，不适合事实性任务。
- ❌ 说“融合就是把块拼起来，越全越好” → ✅ 要指出融合会增加 token 成本，且可能引入噪声，需要去重和冲突处理。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从实际系统切入，比如“我在电商客服 RAG 中，用 Cohere Rerank 重排序 + LLMLingua 压缩，将用户满意度从 85% 提升到 92%，同时 token 成本降低 40%”。
- **如果你只做过传统 NLP**：用信息检索类比，比如“这类似于 IR 中的查询扩展和结果重排序，只是 RAG 多了生成阶段，所以压缩和融合更关键”。
- **如果你是校招无项目**：聚焦论文复现，比如“我复现了 LongLLMLingua 的压缩方法，在 TriviaQA 上对比了提取式 vs 生成式的 F1 差异，并分析了 token 节省比例”。
- 《LongLLMLingua: Accelerating and Enhancing LLMs in Long Context Scenarios via Prompt Compression》
- 《Reranking for RAG: A Survey of Methods and Trade-offs》
- 《LlamaIndex: Sentence Window Retrieval and Node Fusion》
- 《Cohere Rerank 3: Technical Report》
- 《BGE-Reranker-v2: A Family of Efficient Cross-Encoder Rerankers》

---
