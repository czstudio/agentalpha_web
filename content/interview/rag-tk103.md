---
slug: rag-tk103
no: "1003"
title: "一个 RAG 错误，怎么判断到底是“没召回到”还是“召回到了没用好”"
question: "一个 RAG 错误，怎么判断到底是“没召回到”还是“召回到了没用好”"
excerpt: "面试官想看你是否具备系统化的 RAG 错误定位方法论，而不是凭直觉瞎猜。这是典型的“工程取舍 + debug”题，刁钻点在于：很多人只会说“看召回结果”，但不知道如何量化“没召回到”和“没用好”的边界。答好了能展示你懂检"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3829
updated: "2026-09-29"
---

## 1 一个 RAG 错误，怎么判断到底是“没召回到”还是“召回到了没用好”

`P1` · `rag`

🏷 标签：`rag`, `debugging`, `error-analysis`, `retrieval`, `generation`

#### 1️⃣ 考察意图

面试官想看你是否具备系统化的 RAG 错误定位方法论，而不是凭直觉瞎猜。这是典型的“工程取舍 + debug”题，刁钻点在于：很多人只会说“看召回结果”，但不知道如何量化“没召回到”和“没用好”的边界。答好了能展示你懂检索与生成的耦合关系、会做消融实验、能用工具归因，这是大厂做 RAG 落地的硬实力。

#### 2️⃣ 标准答

核心思路：**先隔离变量，再逐层归因**。用“检索命中率”和“生成利用率”两个指标做分水岭。

**第一步：检查检索结果是否包含答案所需信息**

- 对每个错误案例，取出 Top-K 召回文档（K=5 或 10），人工或自动判断：文档中是否有能回答用户问题的关键事实？
- 工具：用 LangSmith 或 Arize AI 追踪 retrieval 输出，或写脚本打印 chunk 内容。
- 判断标准：如果召回文档中明确包含答案（如“2024 年 Q3 营收 120 亿”），但生成回答错误 → 问题在生成侧；如果召回文档中完全没有答案信息 → 问题在检索侧。

**第二步：如果“没召回到”，深入检索环节**

- **索引问题**：chunk 策略是否合理？比如按固定 512 token 切分，可能把关键信息切到两个 chunk 里。解法：用语义 chunking（如 LangChain 的 RecursiveCharacterTextSplitter）或基于段落边界切分。
- **embedding 问题**：用 BGE-M3 或 E5 等模型，但领域数据未微调，导致语义偏移。解法：做 domain-specific fine-tuning，或换用 ColBERT 这种 token-level 交互模型。
- **查询改写问题**：用户 query 太短或歧义（如“苹果”指水果还是公司）。解法：加 query rewriting 模块，用 LLM 生成多个子查询，或用 HyDE 生成假设文档再检索。
- **检索算法问题**：只用 cosine similarity 可能漏掉高频词匹配。解法：混合检索（BM25 + dense retrieval），BM25 默认 k1=1.5, b=0.75，能补足稀疏匹配。

**第三步：如果“召回到了但没用对”，深入生成环节**

- **上下文窗口限制**：召回 10 个 chunk 共 5000 token，但模型只支持 4096，导致尾部 chunk 被截断。解法：用 sliding window 或按 relevance score 排序后只取前 N 个。
- **prompt 设计问题**：指令不够明确，比如只说“根据上下文回答”，但没要求“如果上下文无答案则拒绝回答”。解法：加 strict instruction，如“仅使用提供的文档，不要添加外部知识”。
- **模型能力问题**：小模型（如 7B）可能无法从多个 chunk 中综合推理。解法：换更大模型（如 70B），或加 reranker（如 Cohere rerank-v3）压缩 top-K 到更少但更相关的 chunk。
- **幻觉问题**：模型强行生成不在上下文中的信息。解法：用 groundedness check（如 SelfCheckGPT）或加 citation 约束。

**第四步：做消融实验量化归因**

- 固定检索结果（用 golden retrieval），测试不同生成配置（prompt 变体、模型大小）→ 看生成错误率变化。
- 固定生成配置（用最强 prompt + 大模型），测试不同检索配置（chunk 大小、embedding 模型、K 值）→ 看检索错误率变化。
- 统计 100 个错误案例，通常【通用知识】检索错误占 30-40%，生成错误占 60-70%，但领域数据差异大。

**实际落地的坑 + 解法**：

- 坑：人工判断“是否包含答案”主观性强，不同人标准不一。解法：用 LLM-as-judge 自动化评估，给 prompt：“判断文档是否包含回答用户问题所需的事实，输出 yes/no”，并抽样人工校验。
- 坑：消融实验成本高，每次改参数要重跑全流程。解法：用缓存机制（如 Redis 缓存 embedding 结果），只改单变量。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，检查检索结果是否包含答案信息，用 Top-K 文档做人工或自动判断；第二，如果没召回到，排查索引、embedding、查询改写和检索算法，比如 chunk 切分不合理或 BM25 参数没调；第三，如果召回到了但回答错误，排查 prompt 设计、上下文窗口和模型能力，比如指令不够严格或小模型推理不足。最后，做消融实验量化归因，固定一端测另一端。总结一句：先隔离变量，再逐层归因，用指标说话。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果召回文档中有答案，但模型还是答错了，你怎么进一步定位是 prompt 问题还是模型能力问题？

> 做对比实验：用同一个 prompt，换不同大小模型（如 7B vs 70B）。如果 70B 答对而 7B 答错，说明是模型能力瓶颈；如果两者都错，说明 prompt 设计有问题。还可以做 ablation：去掉 prompt 中的指令，只给上下文让模型自由生成，看是否更差。如果更差，说明 prompt 有正向作用，但不够强。

**追问 2**：你提到用 LLM-as-judge 判断召回文档是否包含答案，但 LLM 本身可能误判，怎么解决？

> 用多模型投票（如 GPT-4 + Claude 3.5），取多数结果。或者用规则辅助：如果文档中有与答案完全匹配的实体或数字，直接判为包含。另外，对边界案例（如 LLM 输出 confidence 低）做人工抽样校验，统计误判率。如果误判率 > 10%，说明评估 prompt 需要优化。

**追问 3**：在消融实验中，你怎么保证“固定检索结果”是公平的？比如不同 chunk 策略会导致召回内容不同。

> 用 golden retrieval 数据集：人工标注每个 query 对应的 ground truth chunk。这样固定检索结果时，直接用这些 chunk 作为输入，避免不同策略的干扰。如果没时间标注，可以用最强检索配置（如 BM25 + DPR + reranker）的输出作为近似 golden，但需注明偏差。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 错误答法：直接说“看召回结果有没有答案，有就是生成问题，没有就是检索问题”。→ ✅ 正确切入：需要量化判断标准，比如用 LLM-as-judge 或人工标注，并考虑边界情况（如部分包含、模糊匹配）。还要做消融实验验证，避免主观臆断。
- ❌ 错误答法：只提检索问题（如 embedding 没调好），忽略生成问题。→ ✅ 正确切入：两者都要覆盖，且给出具体排查步骤（prompt 设计、上下文窗口、模型大小）。实际中生成错误占比更高，不能只聚焦检索。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从实际错误案例切入，比如“我在项目中遇到 30% 的错误是检索没召回到，通过加 BM25 混合检索解决了；70% 是生成幻觉，通过加 groundedness check 和更严格的 prompt 指令降低了 50% 错误率。” 展示量化结果。
- **如果你只做过传统 NLP**：用类比迁移，比如“传统 QA 系统中错误分 retrieval 和 reading comprehension 两阶段，RAG 类似。我可以用 BERT-based reader 的消融实验思路，固定检索结果测试不同 reader 配置。”
- **如果你是校招无项目**：聚焦论文复现 demo，比如“我复现了《RAGAS》论文中的错误归因方法，用 50 个 query 做实验，发现检索错误占 40%，生成错误占 60%，并写了一个自动化归因脚本。”
- 《RAGAS: Automated Evaluation of Retrieval Augmented Generation》
- 《CRUD-RAG: A Comprehensive Chinese Benchmark for Retrieval-Augmented Generation》
- 《SelfCheckGPT: Zero-Resource Black-Box Hallucination Detection》
- LangSmith 官方文档：Trace 和 Evaluation 模块
- 《Lost in the Middle: How Language Models Use Long Contexts》

---
