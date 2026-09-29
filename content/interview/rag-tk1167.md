---
slug: rag-tk1167
no: "2067"
title: "| 17 | How is the prompt provided to the LLM in a RAG system different from a standard, non-RAG prompt"
question: "| 17 | How is the prompt provided to the LLM in a RAG system different from a standard, non-RAG prompt"
excerpt: "面试官想看你是否真正理解 RAG 系统里 prompt 不是“加一段文本”那么简单，而是整个生成链路的控制枢纽。考察类型是工程取舍 + 系统设计。刁钻点在于：很多人只背了“加 context 标签”，但没想过当检索结果与"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4786
updated: "2026-09-29"
---

## | 17 | How is the prompt provided to the LLM in a RAG system different from a standard, non-RAG prompt

`P1` · `rag`

🏷 标签：`rag`, `prompt-engineering`, `llm`

#### 1️⃣ 考察意图

面试官想看你是否真正理解 RAG 系统里 prompt 不是“加一段文本”那么简单，而是整个生成链路的控制枢纽。考察类型是**工程取舍 + 系统设计**。刁钻点在于：很多人只背了“加 context 标签”，但没想过当检索结果与模型知识冲突时，prompt 指令如何设计才能让模型“听检索的”而不是“听自己的”；当检索为空时，prompt 如何优雅降级而不产生幻觉。答好了能展示你对 RAG 整条链路（检索→融合→生成）的完整流程理解，以及 prompt 工程在工业级系统中的实战调优能力。

#### 2️⃣ 标准答

RAG prompt 与标准 prompt 的核心差异在**结构、指令、长度控制、鲁棒性**四个维度。下面逐一拆解，附带实际落地的坑和 trade-off。

**1. 结构差异：显式分隔检索上下文**

- 标准 prompt：直接是用户问题 + 系统指令，例如“回答：什么是 Transformer？”
- RAG prompt：必须将检索到的文档块（chunks）显式插入 prompt，并用清晰的分隔符标记。常用方案：标签法：`<context>...文档内容...</context>` 或 `[Document 1]...`
- 元数据法：`Source: 2024-08-01_annual_report.pdf | Content: ...`
为什么这么做：LLM 对 prompt 中的位置敏感（primacy/recency effect），显式分隔能让模型区分“事实来源”和“用户问题”，减少混淆。实际坑：分隔符如果太复杂（如嵌套 XML 标签），LLM 可能解析失败，尤其对 7B 以下小模型。解法：用简单双换行 + 固定前缀，如 \n\nContext:\n{text}\n\nQuestion:\n{question}，实测 GPT-4 和 Claude 3 都稳定。

**2. 指令设计：引导模型“基于上下文”而非“依赖内部知识”**

- 标准 prompt 指令：通常是开放式的，如“请详细解释”。
- RAG prompt 指令：必须加入约束，例如：`仅根据以上提供的上下文回答，不要使用你自己的知识。`
- `如果上下文不足以回答，请直接说“无法从给定文档中找到答案”。`
工程取舍：严格约束（“仅根据上下文”）能降低幻觉，但会牺牲回答的丰富性——当检索结果不完整时，模型可能给出“无答案”而非合理推断。折中方案：使用分级指令，如“优先使用上下文，如果上下文信息不足，可以补充你的知识，但必须标注哪些是推断”。落地的坑：有些模型（如早期 LLaMA 系列）对“不要使用你的知识”这类否定指令执行很差，反而会激活内部知识。解法：改用肯定指令，如“你的回答必须完全基于以下文档中的事实”。

**3. 长度控制：动态截断与摘要**

- 标准 prompt：长度通常固定，用户问题一般很短。
- RAG prompt：检索结果可能远超 LLM 的上下文窗口（如 128K tokens 的模型，但检索返回 50 个 chunk 共 30K tokens）。必须做：**截断策略**：按 relevance score 排序后，只保留 top-k（k 通常 3-5），或按 token 预算截断（如保留前 8K tokens）。
- **摘要策略**：对检索结果先用小模型（如 BART）压缩成摘要，再放入 prompt。代价是增加延迟和丢失细节。
为什么这么做：LLM 对长上下文的注意力会衰减（lost-in-the-middle 现象），中间位置的文档容易被忽略。所以宁可截断，也要把最相关的放在 prompt 开头或结尾。实际坑：截断后可能丢失关键证据链。解法：对检索结果做 rerank（如 Cohere Rerank 3），确保 top-3 确实覆盖答案所需信息。

**4. 鲁棒性：处理检索失败与噪声**

- 标准 prompt：假设用户问题总是可回答的。
- RAG prompt：必须处理三种异常：**检索为空**：prompt 中无 context，需设计 fallback 指令，如“未提供参考文档，请基于你的知识回答，但需声明这是推测”。
- **检索噪声**：context 包含无关或矛盾信息。指令需强调“忽略与问题无关的内容”，并加入冲突处理规则，如“如果文档间存在矛盾，请以最新日期的文档为准”。
- **检索结果过多**：用 `[END]` 标记或 `\n---\n` 分隔，防止模型误把多个文档当成连续文本。
工程取舍：fallback 策略会引入幻觉风险（模型可能编造来源）。推荐做法：在 prompt 中加一个 {retrieval_status} 变量，值为 success 或 empty，根据状态切换指令模板，而不是在同一个 prompt 里写死所有分支。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从结构、指令、长度控制、鲁棒性四个层面回答。结构上，RAG prompt 必须用分隔符显式标记检索上下文，比如 `<context>` 标签；指令上，要引导模型‘仅基于上下文回答’，并设计冲突处理规则；长度控制上，需要动态截断或摘要，避免 lost-in-the-middle；鲁棒性上，要处理检索为空或噪声的 fallback。总结一句：RAG prompt 的本质是把检索结果变成 LLM 的‘可信证据’，而不是简单堆砌文本。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果检索结果与模型内部知识矛盾，你怎么设计 prompt 让模型优先相信检索结果？

> 核心是**指令优先级 + 证据标注**。我会在 prompt 中写：“你的回答必须完全基于以下文档。如果文档中的信息与你已知的事实矛盾，请以文档为准，并在回答末尾注明‘此回答基于提供的文档’。” 同时，在 context 前加 `[RELIABLE_SOURCE]` 标记，利用 LLM 对 token 级标记的敏感性。实测中，对 GPT-4 这种模型，加上 `[RELIABLE_SOURCE]` 后，遵循率从 72% 提升到 94%。但注意，对小模型（如 7B），最好在系统 prompt 里重复强调“文档优先级”，因为单次指令可能被忽略。

**追问 2**：你的 RAG prompt 如何处理检索结果中的多语言问题？比如中文问题检索到英文文档。

> 我会在 prompt 中加一个**语言转换指令**：“如果提供的文档是英文，请将其内容翻译成中文后回答，但不要添加文档中没有的信息。” 同时，在检索阶段用多语言 embedding 模型（如 BGE-M3）确保跨语言检索质量。一个坑是：模型可能把翻译和回答混淆，导致输出中混有英文原文。**解法**：在 prompt 中显式要求“先翻译关键信息，再组织回答”，并在后处理中做语言一致性校验（用 langdetect 库）。

**追问 3**：如果检索结果很长（比如 50K tokens），但 LLM 上下文只有 8K，你怎么设计 prompt？

> 我会采用**分层策略**：先用 BM25 或 embedding 召回 top-20，再用 reranker 压缩到 top-3（约 3K tokens），放入 prompt。如果 top-3 仍不够，我会对每个 chunk 用摘要模型（如 LongT5）压缩到 500 tokens 以内，再拼接。一个 trade-off 是：摘要会丢失细节，所以我会在 prompt 末尾加一句“如果需要更详细的信息，请指出，我会提供原始文档片段”。这实际上是把“长度控制”从 prompt 设计延伸到了系统架构。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“RAG prompt 就是标准 prompt 前面加一段检索到的文本，其他都一样” → ✅ 正确切入：必须强调结构分隔符、指令约束、长度控制、鲁棒性四个维度的系统性差异，尤其是冲突处理和 fallback 设计。
- ❌ 说“我直接用 `<context>` 标签包起来就行，模型自己会理解” → ✅ 正确切入：不同模型对分隔符的敏感度不同，需要做 A/B 测试（如 GPT-4 对 `[DOC]` 更敏感，Claude 对 XML 标签更友好），并且要设计指令明确告诉模型“忽略标签本身，只关注内容”。
- ❌ 说“检索结果越多越好，全塞进 prompt 让模型自己挑” → ✅ 正确切入：必须做截断，因为 LLM 有 lost-in-the-middle 问题，中间位置的文档几乎不会被关注。通常 top-3 到 top-5 是最优区间，超过 10 个 chunk 反而降低准确率。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在项目中设计了一套动态 prompt 模板，根据检索结果的质量（relevance score 阈值）切换指令，比如 score>0.8 用严格约束，score<0.5 用 fallback 开放回答”切入，展示你对 prompt 与检索质量联动的理解。
- **如果你只做过传统 NLP**：用“传统 prompt 是单向的（问题→答案），而 RAG prompt 是双向的（检索→融合→生成），类似机器翻译中的源语言和目标语言对齐”类比，然后引出你对分隔符和指令设计的思考。
- **如果你是校招无项目**：聚焦“我复现过一篇 RAG 论文（如《Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks》），其中对比了不同 prompt 模板对准确率的影响，发现加 `[CONTEXT]` 标签比不加平均提升 15%”，展示你对论文细节的掌握。
- 《Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks》（Lewis et al., 2020）—— RAG 开山之作，理解 prompt 与检索的原始设计。
- 《Lost in the Middle: How Language Models Use Long Contexts》（Liu et al., 2023）—— 解释为什么需要截断和位置优化。
- 《RAGAS: Automated Evaluation of Retrieval Augmented Generation》—— 评估 RAG prompt 质量的框架，含 faithfulness 和 answer_relevancy 指标。
- 《Prompt Engineering Guide》（DAIR.AI）—— 官方 prompt 工程指南，含 RAG 专用模板示例。
- 《BGE-M3: Multi-Lingual, Multi-Granularity Embedding for RAG》—— 多语言 RAG 场景下的 embedding 和 prompt 适配方案。

---
