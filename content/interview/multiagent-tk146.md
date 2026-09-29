---
slug: multiagent-tk146
no: "1046"
title: "Agent 之间如何通信和协作"
question: "Agent 之间如何通信和协作"
excerpt: "面试官想看你能否设计 Agent 间的通信机制。刁钻点在于：很多人只答"消息传递"或"共享内存"，但说不清两种模式的适用场景、消息格式设计、以及通信可靠性保证。答好了能展示你的分布式通信 + Agent 架构的综合能力。"
tags: ["真题解析", "多智能体"]
category: "multiagent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4255
updated: "2026-09-29"
---

## Agent 之间如何通信和协作

#### 1️⃣ 考察意图

面试官想看你能否设计 Agent 间的通信机制。刁钻点在于：很多人只答"消息传递"或"共享内存"，但说不清两种模式的适用场景、消息格式设计、以及通信可靠性保证。答好了能展示你的分布式通信 + Agent 架构的综合能力。

#### 2️⃣ 标准答

**Agent 通信的三种模式：消息传递、共享工作空间、混合模式。**

**1. 消息传递（Message Passing）**

每个 Agent 有独立的 inbox（消息队列），Agent 间通过异步消息交换信息：

`Agent A → [消息] → Agent B 的 inbox → Agent B 处理 → [消息] → Agent A 的 inbox`
- **优势**：松耦合（Agent 不需要知道对方的内部实现）、天然异步（发送方不需要等待接收方）、可扩展（新增 Agent 只需订阅相关消息）
- **劣势**：信息延迟（消息需要序列化+传输+反序列化，约 5-20ms）、上下文不完整（接收方只看到消息内容，不知道发送方的完整上下文）
- **适用场景**：Agent 数量多（>5）、任务可异步执行、Agent 地理分布
**消息格式设计**：

`{**  "message_id": "msg_001",
  "from": "agent_coder",
  "to": "agent_reviewer",
  "type": "task_complete",
  "content": "代码已编写完成，请审查",
  "attachment": {"file": "main.py", "lines": 120},
  "reply_to": "msg_000",
  "timestamp": "2025-01-15T10:00:00Z"
}`2. 共享工作空间（Shared Workspace / Blackboard）**

所有 Agent 读写同一个"黑板"（共享状态存储）：

`┌─────────────────────────────────┐**│       Shared Workspace          │
│  {task: "写代码", status: "coding",│
│   code: "def main():...",        │
│   review_comments: []}           │
└──────┬──────┬──────┬───────────┘
       │      │      │
   Agent A  Agent B  Agent C
   (写入)   (读取)   (修改)`
- **优势**：信息完整（所有 Agent 看到完整的共享状态）、零延迟（内存读写 <1ms）、天然支持协作（多个 Agent 可以同时修改同一个 artifact）
- **劣势**：紧耦合（Agent 需要知道共享状态的 schema）、并发冲突（多个 Agent 同时写同一字段）、单点故障（共享状态存储宕机则全部瘫痪）
- **适用场景**：Agent 数量少（<5）、需要高频协作、Agent 在同一进程
3. 混合模式（Hybrid）**

核心状态走共享工作空间，边缘通信走消息传递：

`┌─────────────────────────────────────┐**│     Shared Workspace (Redis)        │
│  - task_state: "coding"             │
│  - code_artifact: "def main()..."   │
│  - review_status: "pending"         │
└──────────┬──────────┬──────────────┘
           │          │
    ┌──────▼──┐  ┌───▼──────┐
    │ Coder    │  │ Reviewer  │
    │ Agent    │  │ Agent     │
    └────┬────┘  └────┬─────┘
         │            │
         └──消息通知──┘
         "代码写完了"  ← 异步通知`
- Coder Agent 写完代码后更新共享状态（code_artifact）+ 发消息通知 Reviewer Agent
- Reviewer Agent 收到通知后从共享状态读取代码，审查后更新 review_status + 发消息通知 Coder
优势**：结合了两者的优点——共享状态保证信息完整，消息传递保证松耦合。**生产环境推荐此模式。**

**4. 通信可靠性保证**

- **消息确认（ACK）**：接收方处理完消息后发 ACK，发送方超时未收到则重试
- **幂等性**：同一条消息可能被处理多次（如 ACK 丢失后重试），接收方用 message_id 去重
- **顺序保证**：同一 Agent 的消息按 FIFO，跨 Agent 用 message_id + reply_to 关联
- **死信队列**：重试 N 次失败的消息进入 DLX，人工干预

#### 3️⃣ 答题模板（30 秒电梯版）

> "Agent 通信三种模式：消息传递——独立 inbox 异步通信，松耦合但信息延迟 5-20ms。共享工作空间——所有 Agent 读写同一黑板，信息完整零延迟但紧耦合+并发冲突。混合模式——核心状态走共享（Redis），边缘通信走消息，生产推荐。消息格式：message_id+from+to+type+content+attachment+reply_to。可靠性：ACK+幂等+FIFO+死信队列。选型：>5 Agent 用消息传递，<5 Agent 用共享空间，生产用混合。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：共享工作空间的并发冲突怎么处理？

> 三种方案：(1) 乐观锁——状态带 version 字段，Agent 修改时 CAS（Compare-And-Swap）。冲突时 Agent 重新读取最新状态再修改。适合冲突率 <10% 的场景；(2) 悲观锁——Agent 修改前先获取锁（如 Redis SETNX），修改完释放。适合冲突率高的场景但降低并行性；(3) 字段隔离——设计时让不同 Agent 修改不同字段（如 Coder 修改 code_artifact，Reviewer 修改 review_comments），从根本上避免冲突。生产建议：优先字段隔离，其次乐观锁，最后悲观锁。

**追问 2**：消息传递模式下，Agent 怎么知道消息是发给自己的？

> 三种路由方式：(1) 精确寻址——消息的 `to` 字段指定目标 Agent ID（如 `to: "agent_reviewer_01"`）。Router 根据 ID 投递。适合已知目标 Agent 的场景；(2) 主题订阅——消息的 `to` 字段指定主题（如 `to: "topic:code_review"`），所有订阅了该主题的 Agent 都能收到。适合广播通知；(3) 能力路由——消息不带 `to`，Router 根据消息内容匹配 Agent 能力自动路由。适合动态 Agent 发现场景。生产实践：精确寻址用于点对点通信，主题订阅用于事件通知，能力路由用于动态发现。

**追问 3**：Agent 通信和微服务通信有什么区别？

> 三个核心区别：(1) 通信内容——微服务通信是结构化的（JSON/gRPC），Agent 通信可以是非结构化的（自然语言对话，如 AutoGen）。非结构化通信更灵活但不可靠（LLM 可能误解消息）；(2) 通信频率——微服务通信是偶发的（一次请求-响应），Agent 通信可能是高频对话（多轮协商）。需要更高效的消息压缩和缓存；(3) 错误处理——微服务的错误是确定性的（HTTP 500），Agent 的错误是概率性的（LLM 给出了错误答案但格式正确）。需要语义层面的错误检测，而非仅协议层面的。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "Agent 通信用 HTTP REST 就行了" → ✅ "HTTP 是同步的，Agent 处理慢时阻塞发送方。Agent 通信应该用异步消息队列（Redis Streams/RabbitMQ），发送方发完就走。"
- ❌ "共享工作空间就是共享一个 Python dict" → ✅ "Python dict 在多进程下不共享。生产环境用 Redis（跨进程、持久化、原子操作）或 PostgreSQL（事务保证、审计日志）。"
- ❌ "Agent 间通信不需要安全措施" → ✅ "Agent 间通信可能被注入（恶意 Agent 发送含指令的消息）。需要消息内容审计 + 操作来源验证，防止协作欺骗。"

#### 6️⃣ 简历呼应

- **如果你有分布式系统经验**：从"微服务通信迁移到 Agent 通信"切入，说明两者的异同和你的设计选型
- **如果你只做过单 Agent**：用"函数调用 vs 消息传递"切入，说明单 Agent 内部是函数调用（同步、类型安全），多 Agent 需要消息传递（异步、松耦合）
- **如果你是校招无项目**：用 Redis 实现 3-Agent 的混合模式通信（共享状态+消息通知），测试不同并发冲突策略的效果，写一篇博客
- "Designing Data-Intensive Applications" (Kleppmann, 2017) — 第11章
- "Multi-Agent Communication Protocols" (Ji et al., 2024)
- "Blackboard Architecture for Multi-Agent Systems" (Corkill, 1991)

---
