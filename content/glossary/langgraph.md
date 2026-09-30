---
slug: langgraph
term: LangGraph
en: LangGraph
oneLine: LangGraph 是把 Agent 流程建模成有向图的编排框架，通过将节点设为步骤、边设为条件路由、状态设为统一 schema，提供内置 checkpoint 持久化、中断恢复与人工介入能力，核心在于状态管理与可靠性。
aliases: [LangGraph]
group: agent
tags: [LangGraph, 框架]
relatedQa: [meituan-langgraph-vs-prompt]
relatedTerms: [ai-agent, langchain, multi-agent]
updated: 2026-09-28
---

## 是什么

LangGraph 采用有向图编排结构，将节点定义为函数或模型调用，边支持条件路由，状态对象在节点间传递并实现整体持久化。它与 LangChain 属于同一生态，专门负责编排与状态管理，可复用 LangChain 的各类组件，是构建复杂多轮 Agent 的生产级工具。

该框架具备可靠性三件套：第一是 checkpoint 机制，支持每步执行记录落盘，并允许状态恢复与回放；第二是 interrupt 机制，能够将流程挂起，等待人工审批后再继续执行；第三是原生支持并发分支与子图嵌套，以适应复杂的业务流转逻辑。

## 解决什么问题

在手写 while 循环构建 Agent 时，开发者需要自行实现中断恢复、人工审核拦截以及分支并发等底层逻辑，这些代码编写繁琐且极易出错。LangGraph 将执行流程显式图化，把上述复杂的工程需求转化为框架的原生能力，让开发者可以专注于业务节点的逻辑实现，而将状态流转和容错恢复交由框架统一处理。

## 面试怎么考

面试通常要求对比 LangGraph 与手写 prompt 循环的区别，答题需强调前者在状态持久化、流程可控性和人工介入上的工程优势。

常考 checkpoint 原理，需说明其如何通过保存快照实现断点续传和执行回放。

还会考察何时选 LangGraph 或自研。答题要点是评估业务复杂度：简单单线任务适合自研，涉及多轮交互、审批流和状态回溯的场景则建议引入该框架。
