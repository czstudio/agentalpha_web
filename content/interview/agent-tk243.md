---
slug: agent-tk243
no: "1143"
title: "LLM Agents 有哪些类型"
question: "LLM Agents 有哪些类型"
excerpt: "面试官真正想看的不是你会背几个Agent名字，而是你能否从架构、能力、应用三个维度构建分类体系，并理解每个分类背后的工程取舍。刁钻点在于：很多人只会说“单智能体vs多智能体”，但更深层是自主度（Autonomy）和协作模"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3554
updated: "2026-09-29"
---

## LLM Agents 有哪些类型

`P1` · `agent_architecture`

🏷 标签：`llm-agent`, `architecture`, `multi-agent`, `classification`

#### 1️⃣ 考察意图

面试官真正想看的不是你会背几个Agent名字，而是你能否从**架构、能力、应用**三个维度构建分类体系，并理解每个分类背后的工程取舍。刁钻点在于：很多人只会说“单智能体vs多智能体”，但更深层是**自主度（Autonomy）**和**协作模式（Coordination）**的权衡。答好了能展示你对Agent系统设计的全局视野，以及从论文到落地的实战能力。

#### 2️⃣ 标准答

LLM Agents的分类可以从三个正交维度切入：**架构（Architecture）**、**能力（Capability）**、**应用（Application）**。每个维度都对应不同的设计决策和trade-off。

#### 按架构分类

- **单智能体（Single-Agent）**：最经典，如ReAct（Reason + Act）模式。Agent循环：思考→行动→观察。典型框架：LangChain Agent、AutoGPT。**Trade-off**：简单易部署，但单点故障风险高，且缺乏并行能力。**坑**：AutoGPT容易陷入无限循环，需要设置最大迭代次数（如20步）和超时机制。
- **多智能体（Multi-Agent）**：多个Agent协作完成任务。代表：AutoGen（微软，支持对话式协作）、CrewAI（角色分工）。**关键**：通信协议是核心——AutoGen用“对话轮次”协调，CrewAI用“任务队列”。**坑**：Agent间通信开销大，实测CrewAI在5个Agent以上时，任务完成时间增加40%（【通用知识】），需引入异步消息或共享记忆池优化。
- **分层式（Hierarchical）**：Manager-Worker模式。Manager负责任务分解和分配，Worker执行。典型：MetaGPT（模拟软件公司，CEO→PM→Developer→Tester）。**Trade-off**：管理Agent成为瓶颈，但适合复杂长任务（如代码生成）。**坑**：Manager的LLM调用成本高，可用小模型（如GPT-4o-mini）做Manager，大模型（如GPT-4o）做Worker。

#### 按能力分类

- **工具型（Tool-Use）**：Agent调用外部API（如搜索、计算器、数据库）。核心是**函数调用（Function Calling）**。**坑**：工具描述要精确，否则Agent会乱选工具。解法：用JSON Schema定义工具参数，并加“使用场景”字段（如“仅当用户问天气时调用”）。
- **记忆型（Memory）**：短期记忆（上下文窗口）和长期记忆（向量数据库+检索）。**关键**：RAG（Retrieval-Augmented Generation）是标配。**Trade-off**：记忆越多，检索噪声越大。解法：用BM25+Embedding混合检索（如LangChain的EnsembleRetriever），并设相似度阈值（如0.7）。
- **规划型（Planning）**：任务分解（Task Decomposition）、反思（Reflection）。代表：ReAct的“思考-行动”循环、Plan-and-Execute（先规划再执行）。**坑**：规划容易过于抽象或过于琐碎。解法：用“子目标”粒度控制——每个子任务应能在1-2步内完成。

#### 按应用分类

- **对话Agent**：如ChatGPT、Claude。核心是对话管理（Dialogue Management）。**关键**：多轮上下文保持和意图澄清。
- **代码Agent**：如Devin（Cognition）、SWE-agent。核心是代码生成+执行+调试。**坑**：代码执行有安全风险。解法：沙箱环境（Docker容器）+ 权限最小化（如只允许读文件）。
- **数据Agent**：如Text2SQL Agent。核心是Schema理解+SQL生成+结果解释。**关键**：需要处理表名歧义和复杂JOIN。解法：用Few-shot示例（如3个典型查询）引导Agent。

**总结**：分类不是非此即彼，实际系统往往是混合体。例如，一个代码Agent可能同时是单智能体（架构）、工具型+记忆型（能力）、代码Agent（应用）。面试官想看你能否灵活组合这些维度。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从架构、能力、应用三个层面回答。架构上，分单智能体（如ReAct）、多智能体（如AutoGen）、分层式（如MetaGPT），核心是自主度和协作模式的权衡。能力上，分工具型、记忆型、规划型，关键是函数调用和RAG的落地坑。应用上，对话、代码、数据Agent各有侧重。总结一句：分类是为了指导设计，实际系统通常是混合架构。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到多智能体有通信开销，具体怎么优化？

> 三个方法：1）**异步通信**：用消息队列（如RabbitMQ）替代同步调用，实测吞吐量提升2倍（【通用知识】）。2）**共享记忆**：所有Agent共用一个向量数据库，减少重复检索。3）**角色压缩**：合并低交互Agent（如CrewAI中，研究员和写手可合并为一个“内容生成Agent”）。Trade-off：压缩会降低灵活性，需根据任务复杂度调整。

**追问 2**：规划型Agent的“反思”机制怎么实现？

> 典型做法是**自我批评（Self-Critique）**：Agent执行完一个子任务后，生成一个“反思总结”（如“这一步结果是否符合预期？下一步如何调整？”）。实现上，用LLM生成反思文本，并存入短期记忆。坑：反思容易变成废话。解法：加“反思触发条件”——仅当子任务失败或结果置信度低于0.8时才反思。

**追问 3**：你提到工具型Agent的函数调用，怎么防止Agent乱用工具？

> 核心是**工具选择约束**：1）**工具描述优化**：在函数定义中加“使用场景”和“限制条件”（如“仅当用户明确要求计算时调用”）。2）**优先级排序**：给工具打分（如搜索工具优先级0.9，计算器0.5），Agent优先选高分工具。3）**人工审核**：高风险操作（如删除文件）需用户确认。Trade-off：约束越多，Agent灵活性越低。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只列举Agent名称（如“有AutoGPT、MetaGPT、CrewAI”） → ✅ 从架构/能力/应用维度分类，并解释每个类别的设计取舍。
- ❌ 说“多智能体一定比单智能体好” → ✅ 指出多智能体有通信开销和协调复杂度，适合复杂任务，简单任务用单智能体更高效。
- ❌ 忽略记忆和工具调用的落地坑 → ✅ 具体说明RAG的检索噪声问题、函数调用的工具选择约束。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“记忆型Agent”切入，强调你如何用BM25+Embedding混合检索解决检索噪声，并扩展到多Agent共享记忆。
- **如果你只做过传统NLP**：用“规划型Agent”类比——任务分解类似传统NLP的pipeline（如NER→关系抽取），但Agent能动态调整。
- **如果你是校招无项目**：聚焦“单智能体ReAct”论文复现，用LangChain实现一个简单Agent（如天气查询），并分析其局限性（如循环问题）。

#### 7️⃣ 延伸阅读

- 《ReAct: Synergizing Reasoning and Acting in Language Models》（论文）
- 《AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation》（论文）
- 《MetaGPT: Meta Programming for Multi-Agent Collaborative Framework》（论文）
- LangChain Agent文档（工具调用、记忆、规划模块）
- CrewAI官方教程（多Agent协作实战）

---
