---
slug: agent-tk372
no: "1272"
title: "Q44: 如果让你设计一个能行程规划的旅行Agent，你会如何拆解任务？各子Agent职责怎么划分？**"
question: "Q44: 如果让你设计一个能行程规划的旅行Agent，你会如何拆解任务？各子Agent职责怎么划分？**"
excerpt: "面试官想看你能否从“单Agent对话”跃迁到“多Agent系统设计”，核心考察三点：任务分解的粒度（是否把耦合逻辑拆成独立职责）、Agent间通信与容错（是否考虑现实API不稳定）、工程取舍（如实时查询 vs 缓存策略）"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4080
updated: "2026-09-29"
---

## Q44: 如果让你设计一个能行程规划的旅行Agent，你会如何拆解任务？各子Agent职责怎么划分？**

`P2` · `agent_architecture`

🏷 标签：`multi-agent`, `task-decomposition`, `travel-agent`, `agent-architecture`

#### 1️⃣ 考察意图

面试官想看你能否从“单Agent对话”跃迁到“多Agent系统设计”，核心考察三点：**任务分解的粒度**（是否把耦合逻辑拆成独立职责）、**Agent间通信与容错**（是否考虑现实API不稳定）、**工程取舍**（如实时查询 vs 缓存策略）。刁钻点在于：旅行规划不是简单问答，而是多约束优化（时间、预算、偏好冲突），答好了能展示系统设计硬实力——把模糊需求拆成可执行的Agent拓扑，并给出降级方案。

#### 2️⃣ 标准答

我会设计一个**四层多Agent架构**，基于LangGraph编排，核心是“Planner驱动+专用Agent执行+共享记忆协调”。

**第一层：Planner Agent（调度中枢）**

- **职责**：接收用户输入（目的地、日期、预算、偏好），分解为子任务序列，通过ReAct循环调度其他Agent。
- **实现**：使用LLM（如GPT-4）作为推理引擎，维护一个任务队列（JSON格式），每个任务包含`agent_type`、`params`、`priority`。
- **工程取舍**：Planner不直接调用API，避免LLM输出不稳定导致API调用失败；而是生成结构化指令，由专用Agent执行，隔离风险。

**第二层：专用Agent（执行层）**

- **Info Agent**：负责查询外部API（如Amadeus航班、Booking酒店、Google Maps景点）。**坑**：API限频和超时是常见问题。解法：实现**指数退避重试**（最多3次，间隔1s/2s/4s），并缓存结果到Redis（TTL=1小时），避免重复请求。
- **Recommend Agent**：基于用户偏好（如“亲子游”“美食打卡”）对景点/餐厅排序。使用**BM25+语义embedding混合检索**：先BM25过滤候选（k1=1.5, b=0.75），再用Sentence-BERT计算相似度，最后加权排序（权重0.4:0.6）。**Trade-off**：纯语义可能忽略关键词（如“免费”），混合检索平衡召回率和精确度。
- **Scheduler Agent**：生成时间线，解决约束冲突（如两个景点距离远、餐厅营业时间冲突）。使用**贪心算法+局部回溯**：先按地理位置聚类，再按优先级插入，若冲突则触发回溯（最多回退3步）。**实际落地坑**：用户可能临时改偏好（如“加一个博物馆”），Scheduler需支持增量更新，而非全量重算。

**第三层：共享记忆（协调层）**

- **实现**：用向量数据库（如Chroma）存储所有Agent的中间结果（景点详情、交通耗时、用户反馈），Planner通过查询记忆决定下一步。**为什么这么做**：避免Agent间直接通信的耦合，Planner可异步检查进度，且支持断点续传（如用户中断后恢复）。
- **通信协议**：每个Agent输出统一格式`{status, data, error}`，Planner轮询记忆库，若`status=failed`则触发降级。

**第四层：异常处理与降级**

- **场景**：Info Agent查询酒店API返回500错误。**解法**：Planner检查`error`字段，若为临时故障，重试1次；若持续失败，降级为使用本地缓存数据（如预存的热门酒店列表），并标记“数据可能过时”。**更严重情况**：Scheduler发现无可行解（如所有景点都关门），Planner触发用户确认，推荐替代方案（如“改为室内活动”）。

**输出**：最终生成一个JSON行程单，包含每日时间线、地图坐标、预算明细，并支持导出为iCal格式。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从任务拆解、Agent职责、通信容错三个层面回答。任务拆解上，我分为Planner调度、Info查询、Recommend排序、Scheduler编排四个子任务。Agent职责上，Planner用ReAct循环驱动，Info负责API调用并带重试机制，Recommend用BM25+语义混合排序，Scheduler用贪心+回溯解决约束冲突。通信上，通过共享记忆（向量数据库）解耦，Planner异步检查状态，失败时触发降级（如缓存替代）。总结一句：核心是隔离风险、异步协调、增量更新。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果用户说“我想去东京，预算1万，但具体日期没定”，你的Planner怎么处理？

> 这是**模糊输入**场景。Planner会先触发一个**Clarification Agent**（可复用Info Agent），通过反问生成候选日期（如“最近周末”或“下个月”），并用LLM提取隐含约束（如“预算1万”暗示经济型）。如果用户仍不确定，Planner采用**渐进式规划**：先按默认日期（如最近周末）生成草案，允许用户后续修改，而非阻塞等待。工程上，用**默认值+置信度标记**，如`date: "2025-04-12", confidence: 0.6`，Scheduler按低置信度生成多个备选。

**追问 2**：多个用户同时使用，你的Agent怎么保证性能？

> 这是**并发与资源竞争**问题。关键点：API调用是瓶颈。解法：1）**请求合并**：相同API（如同一城市酒店查询）在1秒窗口内合并为一次请求，结果广播给所有用户。2）**Agent实例池化**：每个用户一个Planner实例，但Info Agent用线程池（最多10个并发），避免每个用户独占API连接。3）**缓存分层**：Redis缓存热点数据（如东京景点），TTL=1小时；本地内存缓存高频查询（如“东京迪士尼”），TTL=5分钟。Trade-off：缓存可能过时，但旅行数据（景点营业时间）变化慢，可接受。

**追问 3**：如果Scheduler生成的行程用户不满意（如太赶），怎么迭代？

> 这是**用户反馈完整流程**。Planner会维护一个**反馈记忆**，记录用户对每次输出的评分（如“太赶”）。下次调度时，Scheduler读取反馈，调整约束权重（如增加“宽松度”参数，默认0.3，用户反馈后调至0.6）。具体实现：用**强化学习中的GRPO**（Group Relative Policy Optimization）微调Scheduler的排序策略，但实际落地更简单——直接调参：`max_attractions_per_day`从5降到3，`travel_time_buffer`从15分钟加到30分钟。如果用户多次不满意，Planner触发**人工介入**，输出可编辑的Markdown行程，让用户手动调整。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“所有Agent都用同一个LLM，通过prompt区分职责” → ✅ 正确做法是**职责隔离**：Planner用LLM推理，Info Agent用API调用（无LLM），避免LLM幻觉污染数据。不同Agent应有不同实现（如Scheduler用算法而非LLM）。
- ❌ 说“Agent间直接通信，如Info告诉Scheduler结果” → ✅ 正确做法是**通过共享记忆解耦**：Info写结果到向量库，Scheduler轮询读取，避免Agent间强依赖和死锁。
- ❌ 说“异常时直接报错让用户重试” → ✅ 正确做法是**自动降级**：如API失败用缓存，缓存失效用默认值（如“推荐热门景点”），最后才通知用户，减少摩擦。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“检索-排序-生成”类比切入，Info Agent对应检索（API查询），Recommend对应排序（混合检索），Scheduler对应生成（约束求解）。强调你用过LangChain的AgentExecutor，可迁移到LangGraph。
- **如果你只做过传统NLP**：用“管道架构”类比，Planner是控制器，Info是数据源，Recommend是特征工程，Scheduler是决策树。突出你对任务分解和异常处理的理解（如try-catch降级）。
- **如果你是校招无项目**：聚焦论文复现，如引用《ReAct: Synergizing Reasoning and Acting》解释Planner设计，或《Chain-of-Thought》说明任务分解。可提你实现过简单demo（如用Python模拟Agent通信），展示系统思维。

#### 7️⃣ 延伸阅读

- 《ReAct: Synergizing Reasoning and Acting in Language Models》
- 《LangGraph: Multi-Agent Orchestration Framework》
- 《BM25+Semantic Search: Hybrid Retrieval for Recommendation》
- 《GRPO: Group Relative Policy Optimization for LLM Fine-Tuning》
- 《Travel Agent Design: A Case Study in Multi-Constraint Scheduling》

---
