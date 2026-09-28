---
slug: a2a
term: A2A（Agent 间通信协议）
en: Agent2Agent Protocol
oneLine: A2A（Agent 间通信协议）是开放社区治理的互操作协议，用于不同框架的 Agent 互相发现能力、交换任务与消息。它与连接工具的 MCP 互补，专注连接 Agent。
aliases: [A2A, Agent2Agent, Agent 间协议]
group: agent
tags: [A2A, 协议]
relatedQa: [what-is-a2a]
relatedTerms: [mcp, multi-agent, ai-agent]
updated: 2026-09-28
---

## 是什么

A2A（Agent 间通信协议）是解决 Agent 间互操作的标准规范。它实现三个功能：通过 Agent Card 让 Agent 自我描述具备的能力；将任务封装为具有生命周期的 Task 对象进行委派与跟踪；支持多模态消息与产物的交换。

在关键机制上，Agent Card 充当能力说明书，Task 保障任务在不同主体间流转时的状态一致性。

在分工上，A2A 与 MCP 互补。MCP 负责连接 Agent 宿主与底层工具服务，解决工具调用；A2A 专注解决 Agent 间的协作机制，两者不可替代。

## 解决什么问题

没有 A2A 协议时，不同框架构建的 Agent 维持独立的通信接口，处于各说各话的状态，导致跨框架协作面临壁垒。

A2A 补上了跨组织、跨框架多 Agent 协作所需的统一语义。它提供标准化的发现、委派与状态流转机制，使不同厂商的 Agent 能理解彼此的能力与状态，完成跨主体协作。

## 面试怎么考

面试常考 A2A 与普通 Agent 框架的区别。答题要点是普通框架侧重 Agent 的内部推理，而 A2A 是定义 Agent 间通信的协议。

另一考法是对比 A2A 与 MCP 的关系。答题需明确两者互补，MCP 连接 Agent 与工具，A2A 连接 Agent 之间。被问及何时引入 A2A 时，答题应指向跨框架的多 Agent 协作场景，强调统一委派语义的必要性。
