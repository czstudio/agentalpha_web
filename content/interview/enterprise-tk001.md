---
slug: enterprise-tk001
no: "901"
title: "架构设计能力：​ 你如何设计角色分工？如何设计交互流程？选择何种编排框架（如AutoGen, LangGraph）背后的权衡是什么？这体现了你的技术选型和系统设计能力"
question: "架构设计能力：​ 你如何设计角色分工？如何设计交互流程？选择何种编排框架（如AutoGen, LangGraph）背后的权衡是什么？这体现了你的技术选型和系统设计能力"
excerpt: "面试官想看你从“玩具级单Agent”到“生产级多Agent系统”的架构思维跃迁。这不是背框架API，而是考察你能否根据业务场景（如代码生成、客服系统）做技术选型，并清晰阐述每个决策背后的工程取舍。刁钻点在于：多数候选人只"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4263
updated: "2026-09-29"
---

## 架构设计能力：​ 你如何设计角色分工？如何设计交互流程？选择何种编排框架（如AutoGen, LangGraph）背后的权衡是什么？这体现了你的技术选型和系统设计能力

#### 1️⃣ 考察意图

面试官想看你从“玩具级单Agent”到“生产级多Agent系统”的架构思维跃迁。这不是背框架API，而是考察你能否根据业务场景（如代码生成、客服系统）做技术选型，并清晰阐述每个决策背后的工程取舍。刁钻点在于：多数候选人只背了AutoGen和LangGraph的名字，却说不清何时用图结构、何时用对话环、以及状态持久化带来的复杂度。答好了，能展示你系统设计、技术视野和落地经验三位一体的硬实力。

#### 2️⃣ 标准答

**角色分工：基于任务分解的职责隔离**

- **Planner（规划者）**：负责将复杂任务（如“生成一个电商后端”）拆解为子任务（API设计、数据库建模、代码实现）。使用思维链（Chain-of-Thought）或ReAct模式，输出结构化任务清单。
- **Executor（执行者）**：每个子任务对应一个专用Agent，例如“代码生成Agent”使用CodeLlama或GPT-4，“测试Agent”使用专门调优的模型。关键原则是**能力互补**：避免两个Agent做同一件事（如都写代码），但保留冗余用于交叉验证（如Critic和Executor对同一段代码做不同角度的审查）。
- **Critic（审查者）**：负责质量门禁。例如，检查代码是否符合PEP8、是否有SQL注入风险。这里有个**实际落地的坑**：Critic如果和Executor使用同一模型，容易产生“确认偏误”（模型自己写的代码自己审查不出问题）。解法是：Critic使用不同架构的模型（如Executor用GPT-4，Critic用Claude-3.5），或引入静态分析工具（如SonarQube）作为辅助。

**交互流程：消息类型与触发条件**

- **消息类型**：定义`TaskProposal`（任务提议）、`TaskResult`（执行结果）、`ReviewFeedback`（审查反馈）三种结构化消息，用Pydantic模型约束字段（如`task_id`, `status`, `content`）。
- **触发条件**：采用**事件驱动**模式。Planner发出`TaskProposal`后，Executor订阅该事件并执行；执行完成后发布`TaskResult`；Critic订阅`TaskResult`并审查。同步/异步取舍：对于代码生成这种高延迟任务，用异步消息队列（如Redis Pub/Sub）避免阻塞；对于实时对话（如客服），用同步HTTP回调保证低延迟。
- **状态管理**：使用LangGraph的`StateGraph`维护全局状态（如任务进度、错误计数），避免Agent间重复计算。**工程取舍**：状态持久化到数据库（如PostgreSQL）增加了IO开销，但支持断点续传和审计；纯内存状态快但重启丢失。生产环境选前者，开发环境选后者。

**编排框架对比：AutoGen vs LangGraph vs CrewAI**

- **AutoGen**：适合**灵活对话**场景，如多轮谈判、角色扮演。它的`ConversableAgent`支持动态对话环，但**可控性差**：Agent可能陷入无限循环或偏离主题。取舍：灵活性高，但需要手动设置`max_consecutive_auto_reply`和`termination_msg`来兜底。
- **LangGraph**：适合**确定性流程**，如代码生成、数据处理管道。它的`StateGraph`是DAG结构，流程清晰，支持条件分支和循环。**实际案例**：用LangGraph构建代码生成系统，Planner拆解任务后，Executor按顺序执行，Critic在关键节点（如代码合并前）做审查。优势是状态可追踪、错误可回滚；代价是**开发成本高**，需要定义所有节点和边。
- **CrewAI**：适合**角色固定**场景，如客服团队（主管、客服、质检）。它的`Crew`和`Agent`抽象简单，但**扩展性差**：角色间通信依赖预定义的`Task`，无法动态调整。取舍：上手快，但复杂流程（如条件分支）需要hack。

**技术选型总结**：如果业务是“写一个代码生成器”，选LangGraph；如果是“模拟一个辩论赛”，选AutoGen；如果是“快速搭建一个客服机器人原型”，选CrewAI。**关键原则**：没有银弹，根据流程确定性、状态复杂度、团队技术栈做决策。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从角色分工、交互流程、框架选型三个层面回答。角色分工上，基于任务分解设计Planner、Executor、Critic，确保能力互补并引入异构模型避免确认偏误。交互流程上，采用事件驱动和结构化消息，用LangGraph的StateGraph管理状态，异步队列处理高延迟任务。框架选型上，LangGraph适合确定性流程，AutoGen适合灵活对话，CrewAI适合固定角色，我根据流程可控性和状态复杂度做取舍。总结一句：多Agent架构的核心不是堆Agent，而是用正确的编排模式解决业务问题。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说Critic要用不同模型，那成本怎么控制？

> 成本控制是生产环境的核心问题。我的策略是分层审查：先用轻量级规则引擎（如自定义Pydantic校验）过滤明显错误（如格式问题），再让Critic模型（如Claude-3.5 Haiku）做语义审查。只有高风险任务（如涉及数据库操作的代码）才调用GPT-4级别的模型。另外，可以引入缓存：如果Executor输出的代码与历史任务相似度>0.9（用embedding+FAISS），直接复用历史审查结果，跳过Critic调用。这样能将Critic成本降低约40%。

**追问 2**：如果Planner拆解任务出错，怎么容错？

> 容错设计分三层。第一层：Planner输出时附带置信度分数，低于阈值（如0.7）时触发“重新规划”循环，最多重试3次。第二层：Executor执行时如果遇到无法处理的子任务（如缺少依赖），会发布`TaskError`消息，Planner订阅后动态调整任务分解（例如将“写数据库代码”拆为“先写模型定义，再写CRUD操作”）。第三层：引入“人类介入”节点，当错误计数超过5次时，将任务转给人工处理。LangGraph的`StateGraph`支持在任意节点插入`HumanInTheLoop`，这是它的核心优势。

**追问 3**：你提到用LangGraph，那它的状态管理怎么处理并发？

> LangGraph的`StateGraph`默认是串行执行，但可以通过`AsyncNode`支持并发。例如，多个Executor可以并行执行独立子任务（如同时写前端和后端代码）。关键取舍：并发度越高，状态冲突风险越大。我的解法是：每个子任务有独立的`task_id`，状态更新时用乐观锁（版本号）避免覆盖。如果冲突发生，回滚到上一个检查点（LangGraph支持`checkpoint`功能）。生产环境中，我会将状态存储从内存切换到Redis，利用它的原子操作（如`WATCH`）保证一致性。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “我用AutoGen，因为它最流行，而且微软出品。” → ✅ “我选LangGraph，因为我们的业务是代码生成，流程确定性高，需要状态追踪和错误回滚，AutoGen的对话环反而容易失控。”
- ❌ “角色分工就是让一个Agent写代码，一个Agent测试。” → ✅ “角色分工基于任务分解：Planner负责拆解，Executor负责执行，Critic负责审查。每个角色有明确的职责边界和消息协议，避免职责重叠导致资源浪费。”
- ❌ “交互流程就是Agent之间互相发消息，用HTTP就行。” → ✅ “交互流程需要定义消息类型（TaskProposal/TaskResult/ReviewFeedback）、触发条件（事件驱动）、同步/异步模式（高延迟任务用异步队列）。HTTP只适合同步场景，生产环境需要消息队列（如RabbitMQ）保证可靠投递。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“多Agent与RAG结合”角度切入。例如，Planner负责查询分解，Executor调用检索和生成模块，Critic审查答案相关性。强调LangGraph的StateGraph能管理检索上下文，避免重复计算。
- **如果你只做过传统NLP**：用“微服务架构”做类比。Planner相当于API网关，Executor是业务服务，Critic是监控系统。框架选型类比为服务编排（LangGraph） vs 服务编排（AutoGen），强调状态管理和容错设计。
- **如果你是校招无项目**：聚焦论文复现。例如，复现“AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation”，对比其对话环与LangGraph的DAG结构，分析在“任务完成度”和“对话轮次”上的差异。展示你对技术选型的理论理解。
- 论文：AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation
- 论文：LangGraph: Language Agents as Graphs
- 博客：CrewAI vs AutoGen vs LangGraph: A Comprehensive Comparison for Multi-Agent Systems
- 工具：LangGraph官方文档中的StateGraph和HumanInTheLoop教程
- 论文：ReAct: Synergizing Reasoning and Acting in Language Models

---
