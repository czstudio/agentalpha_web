---
slug: agent-tk055
no: "955"
title: "什么是Agent"
question: "什么是Agent"
excerpt: "这道题看似基础，但面试官真正想看的不是“背定义”，而是区分Agent与普通LLM应用的工程本质。考察类型是概念辨析+系统设计。刁钻点在于：很多人把“调了API的LLM”就叫Agent，面试官要你讲清楚循环、工具、记忆这三"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4119
updated: "2026-09-29"
---

## 什么是Agent

#### 1️⃣ 考察意图

这道题看似基础，但面试官真正想看的不是“背定义”，而是**区分Agent与普通LLM应用的工程本质**。考察类型是**概念辨析+系统设计**。刁钻点在于：很多人把“调了API的LLM”就叫Agent，面试官要你讲清楚**循环、工具、记忆**这三个核心组件缺一不可，以及它们如何协同。答好了能展示你对LLM应用架构的底层理解，而不是只会套LangChain模板。

#### 2️⃣ 标准答

Agent不是“能对话的机器人”，而是**能感知环境、自主规划、执行动作并观察反馈的完整流程系统**。基于LLM的Agent，核心是让LLM从“文本生成器”变成“决策引擎”。

**1. 核心组件：三个缺一不可**

- **感知（Perception）**：解析用户输入、系统状态、外部数据。不只是Prompt，还包括结构化输入（JSON Schema）、多模态（图片/音频）。坑：很多Agent只做单轮输入解析，忽略了**上下文窗口的持续更新**，导致长任务中信息丢失。
- **推理与规划（Reasoning & Planning）**：这是Agent与普通LLM的分水岭。普通LLM一次生成就结束；Agent需要**循环推理**。常见模式：
- **ReAct**：Thought（思考下一步）→ Action（调用工具）→ Observation（观察结果）→ 循环。论文《ReAct: Synergizing Reasoning and Acting in Language Models》是基础。
- **Plan-and-Execute**：先拆解成子任务（Plan），再逐个执行（Execute），适合复杂任务如“写一篇行业报告并生成PPT”。
- **Tree-of-Thoughts**：同时探索多条推理路径，用BFS/DFS剪枝，适合数学证明或代码调试。
- **执行（Action）**：调用外部工具。工具定义用**OpenAPI规范**或**Function Calling**（如OpenAI的`tools`参数）。实际落地坑：工具返回结果可能超长（如数据库查询返回1000行），需要**截断+摘要**，否则LLM会“迷失在上下文里”。解法：对工具输出做`max_tokens`限制，或让Agent先问“需要返回多少行”。
- **记忆（Memory）**：分短期（对话历史）和长期（向量数据库+RAG）。短期记忆用**滑动窗口**（保留最近N轮）或**总结压缩**（每5轮生成一次摘要）。长期记忆用**Chunking + Embedding**（如text-embedding-3-small），检索时用**Hybrid Search**（BM25+向量相似度，权重7:3）。坑：记忆污染——旧信息干扰新决策。解法：给记忆打时间戳，检索时按时间衰减权重。

**2. 与普通LLM应用的关键区别**

| 维度 | 普通LLM应用 | Agent |
|---|---|---|
| 交互模式 | 单轮/多轮对话，无外部动作 | 循环：感知→推理→执行→观察 |
| 工具使用 | 无，或硬编码 | 动态选择、调用、处理结果 |
| 记忆 | 仅对话历史 | 结构化短期+长期记忆 |
| 容错 | 重试或报错 | 自我纠正（如ReAct中Observation发现错误后重新规划） |

**3. 工程取舍：为什么不用纯LLM做Agent？**

- **成本**：每次循环都调用LLM，Token消耗是普通对话的3-5倍。优化：用**缓存**（相同Observation跳过推理）、**小模型做规划**（如GPT-4o-mini规划，GPT-4o执行）。
- **延迟**：循环次数多，用户等不了。解法：**并行工具调用**（如同时查天气和日历）、**流式输出**（边推理边展示）。
- **可靠性**：LLM可能“幻觉”出不存在工具。解法：**工具白名单**+**输入校验**（如工具参数必须符合JSON Schema）。

**4. 实际落地坑+解法**

- **坑**：Agent陷入死循环（反复调用同一个工具）。**解法**：设置**最大循环次数**（如10次）、**重复动作检测**（如果连续3次调用相同工具且参数不变，强制终止）。
- **坑**：工具调用失败（API超时）。**解法**：**重试机制**（指数退避，最多3次）+**降级策略**（失败后换备用工具或直接问用户）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、核心组件、与普通LLM的区别三个层面回答。定义上，Agent是能感知环境、自主规划、执行动作并观察反馈的完整流程系统。核心组件包括感知、推理（如ReAct模式）、执行（工具调用）和记忆（短期+长期）。与普通LLM的关键区别在于：Agent具备循环推理和工具使用能力，而普通LLM只是文本生成。总结一句：Agent让LLM从‘聊天机器’变成‘行动主体’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：ReAct和Plan-and-Execute有什么区别？什么时候用哪个？

> ReAct是“边想边做”，适合任务步骤不确定的场景（如客服对话，用户需求会变）。Plan-and-Execute是“先想好再做”，适合任务步骤明确的场景（如“生成周报并发送邮件”）。取舍：ReAct灵活但可能跑偏，Plan-and-Execute稳定但不够灵活。实际中常用**混合模式**：先Plan生成子任务列表，每个子任务内部用ReAct执行。

**追问 2**：Agent的长期记忆怎么实现？为什么不用数据库直接存？

> 长期记忆用**向量数据库**（如Chroma、Pinecone）存储Embedding，检索时用**语义相似度**。不用数据库直接存是因为：用户问题可能是“上次那个关于预算的会议”，不是精确SQL查询。具体实现：文本分块（Chunk size 512 tokens，overlap 128 tokens）→ Embedding（text-embedding-3-small）→ 存入向量库。检索时用**Hybrid Search**（BM25+向量，权重7:3），因为纯向量可能漏掉关键词匹配。坑：记忆碎片化——多个相关片段分散在不同chunk。解法：**上下文窗口合并**（检索到Top-K个chunk后，按时间顺序拼接，再让LLM总结）。

**追问 3**：Agent怎么处理工具调用失败？比如API返回500错误。

> 三步策略：1）**重试**：指数退避（1s、2s、4s），最多3次。2）**降级**：如果重试失败，换备用工具（如天气API挂了，用爬虫抓天气网站）。3）**反馈给LLM**：把错误信息作为Observation传给LLM，让它重新规划（比如“天气API不可用，改为查询历史天气数据”）。坑：LLM可能反复尝试同一个失败工具。解法：**失败工具标记**（在工具描述里加“此工具当前不可用”），或**黑名单机制**（连续失败2次后，禁止该工具在本轮使用）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “Agent就是能调用工具的LLM。” → ✅ “Agent的核心是循环推理+工具使用+记忆，缺一不可。只调用工具但没有循环推理（比如一次调用就结束），那只是增强型LLM，不是Agent。”
- ❌ “Agent的记忆就是对话历史。” → ✅ “对话历史只是短期记忆。Agent还需要长期记忆（向量数据库）来存储跨会话的知识，以及结构化记忆（如用户偏好表）来支持个性化。”
- ❌ “Agent的规划就是让LLM写个步骤列表。” → ✅ “规划不只是写列表，还要处理步骤间的依赖（如先查天气再决定穿什么）、异常分支（如查不到天气怎么办），以及动态调整（如用户中途改需求）。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“RAG是Agent的一种特殊形式”切入——RAG只有检索+生成，而Agent多了工具调用和循环推理。强调你在RAG中如何用ReAct模式处理多轮检索（比如先查用户意图，再查具体文档）。
- **如果你只做过传统NLP**：用“规则系统 vs Agent”类比——传统NLP是硬编码规则（if-else），Agent是LLM驱动的动态决策。举例：传统客服系统用意图分类+槽位填充，Agent可以动态调用多个API并自我纠错。
- **如果你是校招无项目**：聚焦论文复现——读过ReAct论文，用LangChain实现过一个天气查询Agent，并对比了ReAct和Plan-and-Execute的延迟差异（ReAct平均3.2s，Plan-and-Execute 4.1s）。强调你理解循环次数对Token消耗的影响。
- ReAct: Synergizing Reasoning and Acting in Language Models (Yao et al., 2022)
- Tree-of-Thoughts: Deliberate Problem Solving with Large Language Models (Yao et al., 2023)
- LangChain Agent Documentation: Agent Types (ReAct, Plan-and-Execute, Structured Chat)
- OpenAI Function Calling Guide: How to define tools and handle tool calls
- MemGPT: Towards LLMs as Operating Systems (Packer et al., 2023) — 关于Agent长期记忆的系统设计

---
