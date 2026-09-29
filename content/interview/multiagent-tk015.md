---
slug: multiagent-tk015
no: "915"
title: "介绍一下single-agent、multi-agent的设计方案有哪些"
question: "介绍一下single-agent、multi-agent的设计方案有哪些"
excerpt: "面试官想考察你对 Agent 架构设计的广度与深度，而非单纯背诵概念。这是一道“系统设计 + 工程取舍”题，刁钻点在于：你是否能区分 single-agent 和 multi-agent 的本质差异（不是简单的人数问题）"
tags: ["真题解析", "多智能体"]
category: "multiagent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4241
updated: "2026-09-29"
---

## 介绍一下single-agent、multi-agent的设计方案有哪些

#### 1️⃣ 考察意图

面试官想考察你对 Agent 架构设计的广度与深度，而非单纯背诵概念。这是一道“系统设计 + 工程取舍”题，刁钻点在于：你是否能区分 single-agent 和 multi-agent 的本质差异（不是简单的人数问题），以及能否在真实场景中做出合理选型。答好了能展示你对 ReAct、Plan-and-Execute、AutoGen、CrewAI 等方案的实战理解，以及处理协调开销、调试复杂度等工程问题的能力。

#### 2️⃣ 标准答

Single-agent 和 multi-agent 的设计方案，核心区别在于“控制流”和“角色分工”的粒度。下面从三个层面展开：基础架构、协作模式、工程取舍。

**1. Single-agent 方案：以“思考-行动”循环为核心**

- **ReAct 模式**：最经典，Agent 循环执行“思考（Thought）→ 行动（Action）→ 观察（Observation）”。典型实现如 LangChain 的 AgentExecutor。优点是简单、可解释性强；缺点是单线程，无法并行处理子任务。
- **Plan-and-Execute**：先由 Planner 生成步骤计划（如“1. 搜索资料 → 2. 分析数据 → 3. 生成报告”），再由 Executor 顺序执行。适合长任务，但计划一旦出错，后续全崩。实际落地中，我会加一个“Re-plan”步骤，每执行 3 步后让 LLM 重新评估计划是否合理。
- **记忆模块**：Single-agent 必须管理短期（对话历史）和长期（向量数据库）记忆。常用方案是使用 BufferWindow 或 SummaryMemory，但坑在于：记忆过长会导致 LLM 注意力稀释。解法是采用“滑动窗口 + 关键信息摘要”，比如保留最近 10 轮对话，再定期压缩历史。
- **工具调用**：通过 Function Calling 或 Tool 接口调用外部 API。工程取舍：工具越多，LLM 选择越慢，且容易幻觉。我会限制工具数量在 5-8 个，并给每个工具写清晰的描述（包括输入输出格式和典型用例）。

**2. Multi-agent 方案：以“角色分工”和“通信协议”为骨架**

- **协作模式**：
- **对话式（AutoGen）**：Agent 之间通过自然语言对话协作，比如一个 Agent 问“我需要一个 Python 脚本”，另一个回答“我来写”。优点是灵活，缺点是对话可能发散。解法：设置“对话轮次上限”（如 10 轮），超时自动终止。
- **层级式（CrewAI）**：定义 Manager Agent 分配任务给 Worker Agent，Worker 完成后汇报。适合结构化任务，如“Manager 让 Researcher 搜索，再让 Writer 写报告”。坑：Manager 可能成为瓶颈。解法：让 Manager 只做任务分配，不做具体执行。
- **共享记忆（如 MemGPT）**：所有 Agent 共享一个记忆池，通过读写操作同步信息。适合需要长期协作的场景，但需要解决“写冲突”问题，比如加锁或版本号。
- **通信协议**：
- **消息队列**：用 RabbitMQ 或 Redis Pub/Sub 异步通信，解耦 Agent 生命周期。代价是延迟增加，适合非实时任务。
- **共享状态**：用数据库或内存表记录状态，Agent 轮询或订阅变更。优点是简单，缺点是状态膨胀后性能下降。我会用 TTL（Time-To-Live）自动清理过期状态。
- **角色分工**：常见角色有 Planner（制定计划）、Executor（执行动作）、Critic（评估结果）。实际落地中，Critic 角色最容易被忽略，但它是提升质量的关键。例如，在代码生成任务中，Critic 检查语法错误和逻辑漏洞，能减少 30% 以上的 bug。

**3. 工程取舍与选型建议**

- **Single-agent 适合**：任务明确、步骤少（<5 步）、调试成本敏感的场景。比如“帮我查天气并设置提醒”。
- **Multi-agent 适合**：任务复杂、需要多角色协作、可接受一定延迟的场景。比如“生成一个包含测试的 Python 项目”。
- **坑与解法**：
- **协调开销**：Multi-agent 的通信和同步会引入 2-3 倍延迟。解法：用异步消息队列，并设置超时重试。
- **调试难度**：Single-agent 的日志是线性的，Multi-agent 的日志是网状的。解法：给每个 Agent 加唯一 ID，并记录所有消息的“父消息 ID”，形成调用链。
- **幻觉放大**：Multi-agent 中，一个 Agent 的幻觉可能被其他 Agent 放大。解法：引入 Critic 角色，或让每个 Agent 输出置信度（如“我 80% 确定这个结果是正确的”）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，single-agent 方案以 ReAct 和 Plan-and-Execute 为核心，适合简单任务，但能力有限；第二，multi-agent 方案通过角色分工和通信协议实现协作，典型工具有 AutoGen 和 CrewAI，但协调开销大；第三，选型时根据任务复杂度、调试成本和延迟要求决定，比如代码生成用 multi-agent，单步查询用 single-agent。总结一句：没有银弹，关键是在简单性和灵活性之间找到平衡。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 AutoGen 的对话式协作，如果两个 Agent 陷入死循环怎么办？

> 设置“对话轮次上限”和“超时机制”。具体做法：在 AutoGen 的 GroupChat 中，设置 max_round=10，超时后自动终止并返回当前结果。另外，可以引入一个“仲裁 Agent”，在检测到重复对话时强制切换话题。实际项目中，我还会记录每次对话的哈希值，如果相同内容出现两次，直接中断。

**追问 2**：Multi-agent 的调试成本很高，你怎么降低？

> 核心是“可观测性”。我会给每个 Agent 加唯一 ID，并记录所有消息的“父消息 ID”，形成调用链。然后，用日志聚合工具（如 ELK）可视化整个协作流程。另外，我会在开发阶段使用“模拟模式”，让一个 Agent 模拟其他 Agent 的响应，快速验证逻辑。最后，引入单元测试，比如测试 Critic 是否能正确识别错误。

**追问 3**：如果任务需要实时响应，你会选 single-agent 还是 multi-agent？为什么？

> 选 single-agent。因为 multi-agent 的通信和同步会引入至少 2-3 倍延迟，不适合实时场景。但如果任务必须用 multi-agent，我会用“预分配”策略：提前将任务分解为子任务，让 Agent 并行执行，然后合并结果。比如，在搜索场景中，让多个 Agent 同时搜索不同关键词，再汇总。这样延迟只取决于最慢的 Agent。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Single-agent 就是一个人，multi-agent 就是多个人” → ✅ 正确切入：核心区别是控制流和角色分工的粒度，single-agent 是单线程思考-行动循环，multi-agent 是多角色协作，有通信和协调开销。
- ❌ 说“Multi-agent 一定比 single-agent 好” → ✅ 正确切入：选型取决于任务复杂度、调试成本和延迟要求。简单任务用 single-agent 更高效，复杂任务才需要 multi-agent。
- ❌ 说“AutoGen 和 CrewAI 只是工具，没有本质区别” → ✅ 正确切入：AutoGen 是对话式协作，Agent 之间自由对话；CrewAI 是层级式，有 Manager 分配任务。两者在控制流和调试复杂度上差异很大。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“记忆模块”切入，对比 single-agent 的 BufferWindow 和 multi-agent 的共享记忆，说明在长文档问答中，multi-agent 如何通过角色分工（检索 Agent + 生成 Agent）提升准确性。
- **如果你只做过传统 NLP**：用“流水线”类比，single-agent 类似单线程流水线，multi-agent 类似多角色并行流水线。强调控制流和状态管理的差异，比如传统 NLP 的 pipeline 是固定的，而 Agent 的流程是动态的。
- **如果你是校招无项目**：聚焦 AutoGen 的论文复现 demo，比如实现一个简单的 Planner-Executor-Critic 系统，并对比 single-agent 在代码生成任务上的表现。强调你理解了角色分工和通信协议的设计。
- “AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation” (Microsoft, 2023)
- “CrewAI: Framework for Orchestrating Role-Playing AI Agents” (CrewAI Docs)
- “ReAct: Synergizing Reasoning and Acting in Language Models” (Google, 2022)
- “MemGPT: Towards LLMs as Operating Systems” (UC Berkeley, 2023)
- “Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning” (2023)

---
