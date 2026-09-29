---
slug: enterprise-tk163
no: "1063"
title: "What are the architecture patterns for customizing LLM with proprietary data"
question: "What are the architecture patterns for customizing LLM with proprietary data"
excerpt: "面试官想看你是否具备从系统架构层面解决“私有数据+LLM”问题的能力，而非只会调API。考察类型是系统设计+工程取舍。刁钻点在于：候选人容易只背RAG或微调的概念，但无法根据数据规模、更新频率、延迟要求做权衡。答好了能展"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4017
updated: "2026-09-29"
---

## What are the architecture patterns for customizing LLM with proprietary data

#### 1️⃣ 考察意图

面试官想看你是否具备从系统架构层面解决“私有数据+LLM”问题的能力，而非只会调API。考察类型是**系统设计+工程取舍**。刁钻点在于：候选人容易只背RAG或微调的概念，但无法根据数据规模、更新频率、延迟要求做权衡。答好了能展示你理解三种模式（RAG、Fine-tuning、Agent）的适用边界，并能设计混合方案应对真实业务场景（如企业知识库、客服系统）。

#### 2️⃣ 标准答

定制化LLM的架构模式主要分三类：**RAG（检索增强生成）**、**Fine-tuning（微调）**、**Agent+Tool（代理+工具调用）**。实际落地中，**混合方案**才是常态。

#### 1. RAG（检索增强生成）

- **适用场景**：私有数据频繁更新（如财报、新闻）、数据量大但不需要模型“记住”具体事实。
- **核心流程**：数据预处理（Chunking + Embedding）→ 向量库（FAISS/Pinecone）→ 检索（BM25 + DPR 混合）→ 生成（LLM + 上下文窗口）。
- **工程取舍**：Chunk大小是典型trade-off。256 tokens召回精确但易丢失上下文，512 tokens上下文完整但可能引入噪声。实践中用**滑动窗口+重叠**（overlap=10-20%）平衡。
- **落地坑**：检索质量依赖Embedding模型。用`text-embedding-3-small`对长文档效果差，需换`bge-large-en-v1.5`或`ColBERT`的late interaction机制。解法：离线评估Recall@K，K=5时召回率需>85%。

#### 2. Fine-tuning（微调）

- **适用场景**：私有数据格式固定（如客服对话、代码库）、需要模型学习特定风格或领域知识（如医疗诊断）。
- **方法**：全量微调（昂贵）→ LoRA（低秩适配，rank=8-64）→ QLoRA（4-bit量化+NF4，单卡24GB可微调7B模型）。
- **工程取舍**：LoRA的rank值决定参数量与效果。rank=16时参数量仅0.1%，但领域知识注入不足；rank=64时效果接近全量，但显存翻倍。实践中用**增量微调**：先LoRA rank=32，若验证集loss不降则升rank。
- **落地坑**：灾难性遗忘。解法：**EWC（弹性权重巩固）** 或**Replay Buffer**（混合10%原始预训练数据）。例如微调客服模型时，保留20%通用对话数据防止丧失通用能力。

#### 3. Agent+Tool（代理+工具调用）

- **适用场景**：私有数据存储在外部系统（SQL数据库、API、文件系统），需要动态查询。
- **核心模式**：LLM作为“大脑”解析用户意图→调用工具（如`SELECT * FROM orders WHERE user_id=123`）→返回结构化结果→LLM生成自然语言回答。
- **工程取舍**：工具调用成功率依赖Prompt设计。用**ReAct框架**（Thought→Action→Observation循环）比直接生成JSON更鲁棒。但ReAct增加延迟（每次循环约500ms），需用**并行工具调用**（如OpenAI的`parallel_tool_calls`）优化。
- **落地坑**：工具返回数据过长导致上下文溢出。解法：**工具输出截断**（只返回前1000 tokens）或**分页查询**（`LIMIT 10 OFFSET 0`）。

#### 4. 混合方案（RAG + Fine-tuning + Agent）

- **典型架构**：用户Query→Agent判断意图→若需事实查询走RAG（向量库+BM25）→若需领域风格走Fine-tuned模型→若需实时数据走Tool调用→结果合并后经Reranker（Cohere rerank-v3）排序→LLM生成最终回答。
- **工程取舍**：混合方案增加系统复杂度，需用**路由层**（如`LangChain`的`RouterChain`）根据Query类型选择路径。例如：`"2024年Q3营收"`走RAG+Tool，`"写一封投诉邮件"`走Fine-tuned模型。
- **落地坑**：多路径结果冲突。解法：**置信度加权**，RAG结果置信度=检索分数×0.7，Fine-tuned结果置信度=模型logits×0.3，取高者。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，RAG适合高频更新的非结构化数据，核心是Chunking和Embedding的trade-off；第二，Fine-tuning适合固定格式的领域知识，用LoRA/QLoRA控制成本，注意灾难性遗忘；第三，Agent+Tool适合动态外部数据，用ReAct框架保证鲁棒性。总结一句：实际落地必须混合，用路由层根据Query类型选择路径，并用Reranker保证最终质量。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果私有数据是PDF中的表格，RAG怎么处理？

> 表格是RAG的难点，因为传统Chunking会破坏行列关系。解法：用**Table Transformer**（如`TAPAS`）提取表格为结构化JSON，再存入向量库。检索时用**混合检索**：表格标题用BM25，表格内容用DPR。若表格过大（>100行），用**摘要+分页**：先检索表格摘要，再根据用户问题查询具体行。实践中，用`LlamaIndex`的`TableRetriever`模块可开箱即用。

**追问 2**：Fine-tuning后模型在私有数据上表现好，但通用能力下降，怎么解决？

> 这是灾难性遗忘的典型问题。解法：**EWC（弹性权重巩固）** 在损失函数中加入正则项，惩罚对重要权重的修改。更简单的方法是**混合训练**：微调时保留10-20%原始预训练数据（如`The Pile`的子集）。若数据量小，用**LoRA+Adapter**，只微调少量参数，冻结主干网络。实践中，微调后评估MMLU分数，若下降>5%则回滚或增加正则。

**追问 3**：Agent调用外部API时，如何保证安全性（如SQL注入）？

> 核心是**权限最小化**和**输入验证**。解法：1）工具定义时用`strict=True`参数（如OpenAI的`function_call`），限制参数类型为枚举或正则表达式。2）SQL查询用**参数化查询**（`cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))`），禁止拼接字符串。3）用**沙箱环境**（如`gVisor`）隔离工具执行，防止LLM生成恶意代码。4）日志审计：记录每次工具调用的输入输出，用`LangSmith`追踪异常模式。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“RAG和微调是互斥的，只能选一种” → ✅ 正确切入：混合方案才是主流，RAG负责事实检索，微调负责风格学习，Agent负责动态数据，三者互补。
- ❌ 说“微调用全量参数效果最好” → ✅ 正确切入：全量微调成本高且易过拟合，LoRA/QLoRA在rank=32时效果接近全量，但显存减少90%，是工程首选。
- ❌ 说“Agent就是调用API，没什么技术含量” → ✅ 正确切入：Agent的难点在工具调用鲁棒性（ReAct框架）、错误恢复（重试机制）、安全防护（输入验证），是系统设计的关键。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“Chunking策略对比”切入，展示你用滑动窗口+重叠优化Recall@K的实战经验，并提到用Reranker解决多路径冲突。
- **如果你只做过传统NLP**：用“分类任务类比路由层”，说明你理解如何用规则或轻量模型（如BERT）做Query分类，再选择RAG/微调路径。
- **如果你是校招无项目**：聚焦“LoRA论文复现”，展示你理解低秩适配的数学原理（`W = W0 + ΔW`，rank=8），并用HuggingFace PEFT库跑通demo，对比全量微调的loss曲线。
- 《Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks》（Lewis et al., 2020）
- 《LoRA: Low-Rank Adaptation of Large Language Models》（Hu et al., 2021）
- 《ReAct: Synergizing Reasoning and Acting in Language Models》（Yao et al., 2022）
- 《ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction》（Khattab & Zaharia, 2020）
- 《QLoRA: Efficient Finetuning of Quantized Language Models》（Dettmers et al., 2023）

---
