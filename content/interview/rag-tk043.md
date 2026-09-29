---
slug: rag-tk043
no: "943"
title: "What is RAG (Retrieval-Augmented Generation)?**"
question: "What is RAG (Retrieval-Augmented Generation)?**"
excerpt: "面试官想确认你是否真正理解RAG不是“调个API”的玩具，而是解决LLM知识固化、幻觉和数据隐私三大问题的系统工程。这是典型的概念+工程取舍题，刁钻点在于：很多人只会背“检索+生成”定义，但说不清为什么需要检索、检索失败"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3778
updated: "2026-09-29"
---

## What is RAG (Retrieval-Augmented Generation)?**

`P0` · `rag`

🏷 标签：`rag`, `retrieval`, `generation`, `llm`

#### 1️⃣ 考察意图

面试官想确认你是否真正理解RAG不是“调个API”的玩具，而是解决LLM知识固化、幻觉和数据隐私三大问题的系统工程。这是典型的**概念+工程取舍**题，刁钻点在于：很多人只会背“检索+生成”定义，但说不清为什么需要检索、检索失败时怎么兜底、以及RAG和微调的本质区别。答好了能展示你对LLM落地瓶颈的认知深度和系统设计思维。

#### 2️⃣ 标准答

RAG（Retrieval-Augmented Generation）是一个将**外部知识检索**与**大语言模型生成**结合的框架，核心目标是让LLM在回答时能引用实时、可信的私有数据，而不是仅依赖训练时学到的参数化记忆。

**1. 为什么需要RAG？三个核心问题**

- **知识截止**：GPT-4训练数据截止到2023年，问2024年事件会胡编。
- **幻觉**：LLM对低频事实（如“某公司2023年Q3营收”）的准确率可能低于60%，检索能提供证据约束生成。
- **数据隐私**：企业不能把客户数据上传给OpenAI训练，RAG让数据留在本地，只传检索片段。

**2. 标准流程：索引→检索→生成**

- **索引阶段**：将文档切块（chunking，常用256-512 tokens，重叠20%），用embedding模型（如text-embedding-3-small）转为向量，存入向量数据库（如Chroma、Pinecone）。
- **检索阶段**：用户查询经相同embedding模型编码，在向量库中做近似最近邻搜索（ANN，常用HNSW算法，ef_construction=200, M=16），召回top-k（通常k=5-10）相关块。
- **生成阶段**：将检索块拼接成上下文（prompt模板：“基于以下文档回答：\n{docs}\n问题：{query}”），输入LLM生成答案。

**3. 关键工程取舍**

- **检索精度 vs 延迟**：用BM25（词频匹配）召回快但语义差，用DPR（双塔编码器）语义好但慢。**实际落地**：混合检索（Hybrid Search）——先BM25粗筛1000条，再用dense retriever精排top-10，延迟增加30%但召回率提升15%。
- **chunk大小**：256 tokens块检索快但上下文碎片化，512 tokens块信息完整但可能混入噪声。**坑**：固定chunk遇到长文档会截断关键信息，解法是用语义分割（如LangChain的RecursiveCharacterTextSplitter，按段落/句子边界切）。
- **生成时是否强制引用**：不强制引用会幻觉，强制引用（如“如果文档中没有，就说不知道”）会降低回答率。**解法**：设置置信度阈值——检索块与查询的余弦相似度<0.7时，触发“抱歉，我无法回答”兜底。

**4. 变体与演进**

- **Naive RAG**：一次检索+一次生成，简单但检索失败就崩。
- **Advanced RAG**：加入查询重写（如HyDE：用LLM生成假设答案再检索）、重排序（用Cross-encoder如Cohere rerank-v3对top-100精排）、多轮检索（先检索粗粒度，再根据中间结果细粒度检索）。
- **Modular RAG**：将检索、生成、记忆、路由拆成独立模块，可插拔替换（如用GraphRAG做多跳推理）。

**5. 实际落地的坑+解法**

- **坑**：检索结果全是噪声（如用户问“苹果股价”，检索到“苹果公司历史”而非“苹果股票价格”）。**解法**：在索引时加元数据过滤（metadata filtering），如按时间、类别打标，检索时先过滤再向量搜索。
- **坑**：LLM忽略检索结果，仍凭记忆回答。**解法**：在prompt中显式要求“逐句引用文档原文”，并在输出后做事实性校验（用NLI模型如TrueTeacher判断生成内容是否被检索块支持）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，RAG是解决LLM知识截止和幻觉的框架，核心流程是索引→检索→生成；第二，关键取舍在于检索精度与延迟的平衡，实际落地常用混合检索+置信度兜底；第三，RAG不是银弹，需要根据场景选择Naive/Advanced/Modular变体。总结一句：RAG让LLM从‘死记硬背’变成‘开卷考试’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：RAG和微调（Fine-tuning）有什么区别？什么时候该用哪个？

> 核心区别：RAG改变输入（外部知识），微调改变模型参数。RAG适合知识频繁更新（如新闻、财报）、数据量大（百万级文档）的场景；微调适合固定格式（如客服话术、代码风格）、数据量小（千条以内）的场景。**取舍**：RAG延迟高（检索+生成约2-5秒），微调推理快（0.5秒），但微调后模型可能遗忘旧知识（灾难性遗忘）。实际方案：**RAG+微调混合**——微调让模型学会格式，RAG提供事实。

**追问 2**：检索结果质量差怎么办？比如召回率低或排名靠后。

> 三步排查：① **召回率低**：检查embedding模型是否匹配领域（如医疗用BioBERT，代码用CodeBERT），或增加检索深度（top-k从5提到20）。② **排名靠后**：加重排序（Cross-encoder），它比dense retriever慢但精度高，通常对top-100重排后top-5准确率提升20%。③ **检索结果不相关**：用查询重写（如LLM将“苹果股价”改写为“苹果公司2024年股票价格走势”），或加元数据过滤（只检索“金融”分类的文档）。

**追问 3**：RAG系统怎么评估？用什么指标？

> 分两部分：① **检索质量**：用Recall@k（前k个结果包含正确答案的比例）和MRR（平均倒数排名），目标Recall@5>0.8。② **生成质量**：用Faithfulness（生成内容是否被检索块支持，用NLI模型打分）和Answer Relevance（回答是否针对问题，用余弦相似度）。**坑**：不要只看BLEU/ROUGE，它们不衡量事实正确性。工业界常用**人工评估**：让标注员判断“回答是否基于检索结果”和“是否无幻觉”。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “RAG就是把文档喂给LLM，然后它就能回答所有问题。” → ✅ “RAG需要精心设计索引、检索和生成三个环节，检索失败时必须有兜底机制，比如置信度阈值或‘不知道’回答。”
- ❌ “RAG和微调可以互相替代，选一个就行。” → ✅ “RAG和微调解决不同问题：RAG管知识，微调管行为。实际落地常组合使用，比如微调让LLM学会引用格式，RAG提供事实。”
- ❌ “向量检索用余弦相似度就够了，不用管别的。” → ✅ “余弦相似度对embedding质量敏感，实际中常用内积（IP）或L2距离，且需要配合HNSW索引参数调优（如ef_search=100）来平衡召回和延迟。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“混合检索+重排序”的工程取舍切入，强调你如何用BM25+DPR提升召回率15%，以及如何用置信度阈值减少幻觉。
- **如果你只做过传统NLP**：用“信息检索+文本生成”类比迁移——RAG的检索器类似搜索引擎（BM25），生成器类似seq2seq模型，重点讲你如何理解检索结果对生成质量的约束。
- **如果你是校招无项目**：聚焦论文复现——提到Lewis 2020的《Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks》，说明你理解RAG的数学形式（p(y|x) = Σ p(y|z,x) * p(z|x)），并动手用LangChain搭过Wikipedia问答demo。
- Lewis et al., “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks”, NeurIPS 2020
- Gao et al., “Retrieval-Augmented Generation for Large Language Models: A Survey”, 2023
- LangChain官方文档：RAG快速入门与高级模式
- Pinecone学习中心：Hybrid Search与HNSW参数调优指南
- Karpathy博客：“How to Build a RAG System from Scratch” (2024)

---
