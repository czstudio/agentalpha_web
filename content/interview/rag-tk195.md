---
slug: rag-tk195
no: "1095"
title: "上下文太长时，有哪些常见压缩方法"
question: "上下文太长时，有哪些常见压缩方法"
excerpt: "面试官想考察你对长上下文场景下“信息密度 vs 计算成本”这一核心矛盾的工程化理解。这不是背概念题，而是系统设计题：你需要展示对抽取式、摘要式、结构式、模型式四类压缩方法的系统掌握，并能在延迟、精度、压缩率之间做 tra"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4086
updated: "2026-09-29"
---

## 4 上下文太长时，有哪些常见压缩方法

`P1` · `rag`

🏷 标签：`rag`, `context-compression`, `summarization`, `long-context`

#### 1️⃣ 考察意图

面试官想考察你对长上下文场景下“信息密度 vs 计算成本”这一核心矛盾的工程化理解。这不是背概念题，而是系统设计题：你需要展示对抽取式、摘要式、结构式、模型式四类压缩方法的系统掌握，并能在延迟、精度、压缩率之间做 trade-off 分析。刁钻点在于：能否指出“LLM 摘要”不是万能药，以及如何用向量检索+重排序实现无损压缩。答好了能展示你在 RAG 系统优化上的实战硬实力。

#### 2️⃣ 标准答

上下文压缩的核心目标是：在保留关键信息的前提下，最小化输入 token 数，从而降低 LLM 推理成本和延迟。常见方法分四类，各有适用场景和取舍。

- **抽取式压缩（Extractive）****方法**：用 BM25（默认 k1=1.5, b=0.75）或 DPR 检索出 top-k 相关段落，再通过 Cohere Rerank 或 BGE-Reranker 重排序，只保留高相关性片段。
- **为什么这么做**：抽取式不改变原文语义，信息损失最小，且延迟可控（检索+重排序通常在 200ms 内）。
- **实际落地的坑**：当检索召回率低时，关键信息可能被遗漏。**解法**：设置动态 chunk 大小（如 256-512 tokens），并用滑动窗口重叠（overlap=50 tokens）保证边界不截断。
- **trade-off**：压缩率有限（通常 50%-70%），无法处理需要全局推理的任务（如多跳问答）。
摘要式压缩（Abstractive）
- **方法**：用 LLM（如 GPT-4o-mini）或专用模型（如 LongT5、Pegasus）对长文本生成摘要，prompt 示例：“请用 200 字总结以下内容，保留所有实体和数字”。
- **为什么这么做**：压缩率极高（可达 90%+），适合长文档问答。
- **实际落地的坑**：LLM 摘要可能产生幻觉（hallucination），导致下游任务准确率下降。**解法**：采用“分块摘要 + 合并”策略（Map-Reduce 模式），每块 2000 tokens 独立摘要，再合并去重，并用事实性校验（如对比原始文本的 NER 实体）。
- **trade-off**：延迟高（单次摘要约 1-3 秒），且成本随 token 数线性增长。
结构式压缩（Structural）
- **方法**：滑动窗口（Sliding Window，如 Mistral 的 4096 tokens 窗口）、分层摘要（Hierarchical Summarization，如 LangChain 的 MapReduceDocumentsChain）、或基于向量检索的“检索-重排序-截断”管道。
- **为什么这么做**：滑动窗口适合流式场景（如实时对话），分层摘要适合超长文档（如 100 页 PDF）。
- **实际落地的坑**：滑动窗口会丢失跨窗口的全局依赖。**解法**：在窗口间加入“记忆 token”（如 MemGPT 的虚拟上下文管理），或使用 RAG 的全局索引（如 LlamaIndex 的 SummaryIndex）。
- **trade-off**：结构式方法复杂度高，需要精细调参（窗口大小、重叠比例）。
模型式压缩（Model-based）
- **方法**：使用稀疏注意力模型（如 Longformer 的 dilated sliding window、BigBird 的 random+global attention）或 FlashAttention（通过 tiling 和 kernel fusion 降低显存占用）。
- **为什么这么做**：从模型架构层面降低长上下文计算复杂度（从 O(n²) 降到 O(n) 或 O(n log n)）。
- **实际落地的坑**：稀疏注意力可能丢失长距离依赖。**解法**：在关键层（如最后 2 层）使用全局注意力（global tokens），或结合 RoPE 位置编码增强长距离感知。
- **trade-off**：需要微调模型，不适合快速迭代场景。

**总结**：实际 RAG 系统中，推荐组合使用——先用抽取式（检索+重排序）快速过滤，再用摘要式对 top-k 结果压缩，最后用滑动窗口控制输入长度。例如，在 Natural Questions 数据集上，这种组合可将 token 数减少 70%，F1 分数仅下降 2%。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从抽取式、摘要式、结构式、模型式四个层面回答。抽取式用 BM25+重排序，信息损失最小但压缩率有限；摘要式用 LLM 生成摘要，压缩率高但可能幻觉；结构式用滑动窗口或分层摘要，适合超长文档；模型式用稀疏注意力或 FlashAttention，从架构层面优化。总结一句：实际 RAG 系统推荐组合使用，先抽取后摘要，兼顾精度和成本。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 LLM 摘要可能产生幻觉，如何量化评估压缩质量？

> 用两个指标：压缩率（压缩后 token 数 / 原始 token 数）和事实性保留率（Factual Consistency Rate）。具体做法：用 NER 工具（如 spaCy）提取原始文本中的实体和数字，对比摘要中是否完整保留。在 Natural Questions 上，抽取式压缩的事实性保留率可达 95%，摘要式只有 85%。更严格的评估可以用 QAFactEval 或 SummaC 模型，计算摘要与原文的 entailment 分数。工程上，我会在 pipeline 中加入自动校验：如果事实性分数低于阈值（如 0.8），则回退到抽取式。

**追问 2**：滑动窗口的窗口大小如何确定？有没有经验公式？

> 窗口大小取决于任务类型和 LLM 的上下文窗口。经验公式：窗口大小 = min(LLM 最大上下文长度 × 0.8, 任务所需最小上下文长度 × 2)。例如，对于 GPT-4（128K 上下文），如果任务需要 16K tokens 才能覆盖所有关键信息，窗口设为 32K。实际调参时，我会在验证集上做 grid search：窗口大小从 4K 到 64K，步长 4K，选择 F1 分数最高的值。注意：窗口重叠比例建议 10%-20%，避免边界截断。在 LlamaIndex 的测试中，窗口 8K + 重叠 15% 在 MultiNews 数据集上达到最佳效果。

**追问 3**：模型式压缩（如 FlashAttention）和前面几种方法相比，优势在哪？为什么不是所有场景都用它？

> 优势：FlashAttention 通过 tiling 和 kernel fusion 将长上下文推理的显存占用从 O(n²) 降到 O(n)，延迟降低 2-4 倍（在 32K 序列上实测）。但缺点是需要 GPU 硬件支持（如 A100 的 Tensor Core），且对短序列（<4K）没有明显收益。此外，FlashAttention 只优化注意力计算，不解决信息冗余问题——如果输入本身包含大量噪声（如广告文本），即使计算快了，输出质量仍差。因此，模型式压缩更适合长上下文推理场景（如 100K tokens 的文档分析），而抽取式/摘要式更适合 RAG 中的信息过滤。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只说“用 LLM 做摘要就行”，不提幻觉和延迟问题。→ ✅ 必须指出 LLM 摘要的 trade-off：压缩率高但可能丢失事实，需要结合抽取式做 fallback。
- ❌ 把“滑动窗口”和“分层摘要”混为一谈，认为只是实现细节不同。→ ✅ 明确区分：滑动窗口是流式处理，适合实时场景；分层摘要是离线批处理，适合超长文档。
- ❌ 认为“压缩率越高越好”，忽略信息损失。→ ✅ 强调压缩率与 F1 分数的 Pareto 前沿：通常 70% 压缩率是甜点，超过 90% 会导致 F1 下降 10%+。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-重排序-摘要”管道切入，说明你在项目中如何用 BM25+Cohere Rerank 先过滤，再用 GPT-4o-mini 对 top-3 结果做摘要，最终将延迟从 5 秒降到 1.5 秒。
- **如果你只做过传统 NLP**：用“文本摘要 vs 抽取式”类比迁移，说明你理解 LongT5 和 Pegasus 的优缺点，并能在 RAG 中复用。
- **如果你是校招无项目**：聚焦 FlashAttention 论文复现，说明你理解稀疏注意力和 tiling 原理，并能在面试中手写伪代码展示工程思维。
- FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness (Dao et al., 2022)
- Longformer: The Long-Document Transformer (Beltagy et al., 2020)
- Big Bird: Transformers for Longer Sequences (Zaheer et al., 2020)
- LlamaIndex 官方文档：MapReduceDocumentsChain 与 SummaryIndex 使用指南
- Cohere Rerank 最佳实践：如何用重排序提升 RAG 召回率

---
