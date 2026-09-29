---
slug: rag-tk1326
no: "2226"
title: "📌 Q25: What are the different query transformation techniques that enhance user queries in RAG"
question: "📌 Q25: What are the different query transformation techniques that enhance user queries in RAG"
excerpt: "面试官想考察你对 RAG 系统“输入侧”优化的深度理解，而非简单背诵技术名词。真正的刁钻点在于：你是否能区分不同 query transformation 技术的适用场景、成本与 trade-off，以及能否在工程落地中"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4153
updated: "2026-09-29"
---

## 📌 Q25: What are the different query transformation techniques that enhance user queries in RAG

`P1` · `rag`

🏷 标签：`rag`, `query-transformation`, `hyde`, `query-expansion`, `query-decomposition`

#### 1️⃣ 考察意图

面试官想考察你对 RAG 系统“输入侧”优化的深度理解，而非简单背诵技术名词。真正的刁钻点在于：**你是否能区分不同 query transformation 技术的适用场景、成本与 trade-off**，以及能否在工程落地中根据数据分布做选择。答好了能展示：① 对 RAG 整条链路（检索→生成）的掌控力；② 从“调 API”到“设计策略”的工程思维；③ 对召回率（Recall）与延迟（Latency）之间平衡的实战经验。

#### 2️⃣ 标准答

RAG 中 query transformation 的核心目标是将用户原始查询转化为**检索系统更易匹配**的形式，从而提升召回质量。主流技术可分为 5 类，各有取舍：

- **Query Rewriting（查询重写）**用 LLM 将模糊、口语化或指代不清的问题改写为清晰、独立的查询。方法：给 LLM 一个 prompt，如“Rewrite the following question to be more specific for document retrieval: {query}”。工程取舍：改写会引入额外 LLM 调用（成本+延迟），但能明显提升 BM25 等稀疏检索的命中率。坑：改写可能丢失原始意图，需设置“改写置信度阈值”，低于阈值则保留原查询。
- **Query Decomposition（查询分解）**将多跳、复杂问题拆解为多个原子子查询，分别检索后合并结果。方法：用 LLM 生成子问题列表（如“What is the capital of France?”→“What is France?”+“What is the capital?”），再对每个子查询独立检索。实战解法：使用“递归分解+去重”策略，避免子查询间结果重叠。例如在 MS MARCO 上，分解后 Recall@10 可提升 15-20%，但检索次数线性增长，需用缓存或并行请求控制延迟。
- **Query Expansion（查询扩展）**为原始查询添加同义词、相关术语或上下文词，扩大召回范围。方法：① 基于词表（如 WordNet）添加同义词；② 用 LLM 生成相关术语（如“apple”扩展为“fruit, iPhone, orchard”）；③ 基于 embedding 相似度从知识库中选词。trade-off：扩展词过多会引入噪声，降低精确率。经验值是扩展 3-5 个词，且用 BM25 的 b 参数（默认 0.75）控制长度归一化，避免长查询被惩罚。
- **Hypothetical Document Embeddings (HyDE)**先生成假设答案（hypothetical answer），再用其 embedding 检索。原理：用户查询与文档的语义 gap 大，但假设答案与文档更接近。方法：用 LLM 生成“If the answer to this question were in a document, what would it say?”的回复，然后对回复做 embedding 检索。坑：假设答案质量依赖 LLM 能力，若 LLM 生成幻觉内容，检索会完全跑偏。解法：对假设答案做“置信度过滤”，或使用多个假设答案取平均 embedding。
- **Multi-turn Query（多轮查询）**结合对话历史生成上下文相关的查询，用于多轮对话场景。方法：将历史对话拼接后，用 LLM 生成“基于当前问题+历史”的独立查询。实战：在 ChatRAG 中，常用“query rewriting with context”策略，但需注意历史长度限制（如 4K tokens），超长时用滑动窗口截断。

**总结**：选择哪种技术取决于场景——**高召回优先**用 HyDE 或 Query Expansion；**低延迟优先**用 Query Rewriting；**复杂推理**用 Decomposition。实际落地时，常组合使用（如 Rewriting + Expansion），但需用 A/B 测试验证效果。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，**改写类技术**（Query Rewriting、Multi-turn Query）解决模糊和上下文问题；第二，**扩展类技术**（Query Expansion、HyDE）扩大召回范围；第三，**分解类技术**（Query Decomposition）处理复杂多跳问题。总结一句：没有银弹，需要根据业务场景的召回率、延迟和成本做 trade-off 选择。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：HyDE 和 Query Expansion 哪个更适合你的项目？为什么？

> 我会先说明场景：如果项目是**开放域问答**（如客服系统），用户查询短且歧义多，我会选 Query Expansion，因为它成本低（只需 LLM 生成扩展词，无需完整答案），且对 BM25 提升明显。如果是**长文档检索**（如法律合同），我会选 HyDE，因为假设答案能捕捉文档的语义结构，但需注意 LLM 幻觉风险。具体取舍：HyDE 的延迟是 Expansion 的 2-3 倍（因为多一次 LLM 调用），但 Recall@10 可高 10-15%。

**追问 2**：Query Decomposition 中，如何避免子查询结果重复？

> 核心是**去重策略**：① 在检索前，对子查询做 embedding 相似度去重（余弦相似度 > 0.9 视为重复，合并）；② 在检索后，对结果文档用 MinHash 或 SimHash 去重；③ 设置“最大子查询数”（如 5 个），避免无限分解。实战中，我曾在 MS MARCO 上测试，去重后 Recall@10 提升 5%，但检索次数减少 30%。

**追问 3**：如果用户查询是“苹果”，如何避免 Query Expansion 扩展到无关领域（如水果 vs 公司）？

> 这是典型的**歧义消解**问题。解法：① 使用**上下文感知扩展**：如果对话历史提到“手机”，则扩展为“iPhone, Apple Inc.”；否则扩展为“fruit, orchard”。② 用**多向量检索**：对每个扩展词独立检索，然后用 Reranker 排序，保留与原始查询语义最相关的文档。③ 设置**扩展词权重**：原始查询权重 0.7，扩展词权重 0.3，避免噪声主导。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只背技术名词，不区分场景（如“HyDE 就是好，所有场景都用它”）→ ✅ 明确说“HyDE 适合长文档检索，但短查询用 Query Expansion 更高效，因为 HyDE 的假设答案可能引入幻觉”。
- ❌ 忽略工程成本（如“Query Decomposition 可以无限分解”）→ ✅ 强调“分解次数需限制，否则延迟线性增长，实战中通常设最大 5 个子查询，并用缓存复用结果”。
- ❌ 把 Query Rewriting 和 Multi-turn Query 混为一谈→ ✅ 区分：Rewriting 是单轮改写，Multi-turn 是结合历史，后者需要管理上下文窗口（如滑动窗口截断）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“我在项目中用 HyDE 替代了传统 query expansion，Recall@10 从 0.65 提升到 0.78，但延迟增加了 200ms，最终用缓存+异步请求优化”切入，展示工程取舍。
- **如果你只做过传统 NLP**：用“Query Expansion 类似于传统信息检索中的 query reformulation，但 RAG 中引入了 LLM 生成，我曾在文本分类中用同义词扩展，迁移到 RAG 后理解了语义 gap 问题”类比。
- **如果你是校招无项目**：聚焦“我复现了 MS MARCO 上的 query decomposition 实验，对比了 BM25 和 DPR 的召回率，发现分解后 DPR 提升更明显，因为 dense retrieval 对语义更敏感”展示论文复现能力。
- 《Query Expansion Techniques for Information Retrieval: A Survey》（综述，涵盖传统和 LLM 方法）
- 《Precise Zero-Shot Dense Retrieval without Relevance Labels》（HyDE 原论文，2022）
- 《Self-Ask: Measuring and Narrowing the Compositional Gap in Language Models》（Query Decomposition 经典论文）
- 《RAGAS: Automated Evaluation of Retrieval Augmented Generation》（评估 query transformation 效果的框架）
- 《FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness》（优化 LLM 调用延迟，间接影响 query transformation 成本）

---
