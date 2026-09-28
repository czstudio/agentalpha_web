---
slug: multi-agent
term: 多智能体系统
en: Multi-Agent System
oneLine: 多智能体系统是将任务拆分给多个各有分工的 Agent 协作完成的架构，常见编排为主从模式与流水线。其收益是上下文隔离与并行执行，成本在于通信开销与不确定性叠加。
aliases: [Multi-Agent, 多智能体, 多 Agent, MAS]
group: agent
tags: [Multi-Agent, Agent]
relatedQa: [multi-agent-orchestration, multi-agent-failures, single-vs-multi]
relatedTerms: [ai-agent, a2a, agent-memory]
updated: 2026-09-28
---

## 是什么

架构上，主 Agent 负责任务拆解与分发，子 Agent 分别管理检索、代码、审校等领域。节点间依靠结构化消息传递通信，全局状态需集中管理以避免状态漂移。单 Agent 能胜任时不建议采用此架构，仅在任务可并行切分且子任务上下文差异大时适用。

此机制实现了上下文隔离，各 Agent 仅处理自身输入，职责单一化提高了单步执行质量，并支持任务并行。但该架构会导致 token 消耗成倍增长，错误易发生级联传播，结果合并与冲突处理复杂，且需为子 Agent 崩溃或超时设计兜底机制。

## 解决什么问题

主要解决单 Agent 处理复杂任务时的容量与效率瓶颈。当任务涉及众多领域时，单个 Agent 的上下文塞不下所有工具与指令，多领域指令混合容易产生互相干扰。此外，单循环串行执行速度太慢，多智能体架构通过并行处理与领域拆分解决了这一问题。

## 面试怎么考

面试常考察适用场景及成本收益计算，例如何时应引入多 Agent 架构。系统设计层面，会追问多个 Agent 之间如何通信以及如何合并最终结果。

并发控制与异常处理也是常见考点。常考问题包括多个子 Agent 同时修改一个文件时如何避免冲突，以及子 Agent 失败或超时时，如何设计兜底机制来保障任务执行。
