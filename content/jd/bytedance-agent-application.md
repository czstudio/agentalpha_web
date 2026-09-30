---
slug: agent-application
company: bytedance
title: 字节跳动 · Agent 应用开发工程师（豆包/扣子方向）
role: Agent 应用开发
family: agent-app
level: 校招 / 1-3 年
summary: 围绕豆包大模型与扣子（Coze）平台做 Agent 应用工程化：工具调用、记忆、多 Agent 编排与线上成本控制。
cats: [agent, tooluse, memory, enterprise]
qaSlugs: [what-is-agent, bytedance-agent-message-types, mcp-what-and-core, agent-memory-hierarchy, agent-token-billing, agent-latency, workflow-vs-agent, agent-evaluation]
keywords: [字节跳动 Agent 开发, 豆包 Agent 岗, 扣子 Coze 工程师, 字节 AI 应用面试]
updated: 2026-09-28
sourceUrl: https://jobs.bytedance.com/campus/position
sourceName: 字节跳动校招官网（职位ID A42097）
---

## 这条 JD 在招什么人

把大模型能力做成能跑在线上的 Agent 产品的工程师。围绕豆包大模型家族和扣子（Coze）平台，做智能体搭建、工具生态、插件编排、记忆系统这类工程活。写代码的比重高，不是调调 prompt 就完事：要处理流式输出、工具调用失败、上下文超限、成本失控这些真实问题。

字节这类岗位的典型信号：JD 里出现「Agent 平台」「插件/工具生态」「智能体编排」「大规模落地」，说明要的是能扛线上流量的工程能力，不是 demo 能力。

## 业务场景推测

大概率服务于豆包 App 内的智能体能力、扣子平台的开发者生态、或飞书场景的 AI 助手（置信度：中高，基于公开业务布局推断）。扣子方向偏平台：你做的东西是给开发者用的，API 设计、Schema 清晰度、文档都是考核面。豆包方向偏终端产品：并发、延迟、内容安全压力更直接。

## 硬技能：必须会什么

- LLM API 工程：流式输出（SSE/WebSocket 选型）、结构化输出、长上下文管理
- 工具调用：Function Calling 原理与准确率优化、MCP 协议、工具 Schema 设计
- Agent 编排：ReAct 循环、规划与反思、workflow 与 Agent 的取舍
- 记忆系统：短期/长期记忆分层、上下文压缩、记忆淘汰
- RAG 基础：向量检索、混合检索、重排（字节业务里知识问答场景多）
- 后端功底：Python 或 Go、高并发服务、缓存与降级

## 加分项：什么能拉开差距

- 做过有真实用户的 Agent（哪怕内部工具），能讲清日活量级与 badcase 处理流程
- Token 成本控制经验：账单拆解、模型分级路由、缓存策略
- 评测意识：不止「效果好了」，有评测集、回归机制、线上指标
- 对扣子/Dify/LangGraph 这类平台用过且能指出它们的局限

## JD 没写但面试会问

- Agent 死循环怎么检测和治理（高频）
- 工具调用失败的重试与兜底设计
- 上下文快满了怎么压缩、压缩丢信息怎么权衡
- 一轮 multi-agent 任务 Token 花在哪、账单怎么控制
- 你做过的项目「为什么这么设计」，换个方案行不行

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer、Token、采样参数、流式协议 | 概念清楚，能讲取舍 |
| 工程层 | 后端服务、并发、缓存、监控告警 | 有上线经验或等价项目 |
| Agent 层 | 工具调用、编排、记忆、多 Agent | 做过完整链路，能答追问 |
| 业务层 | 成本、评测、内容安全、转人工 | 有意识且有具体做法 |

## 简历怎么改

- 每条 Agent 经历补三个东西：规模（请求量/badcase 数）、指标（准确率/延迟/成本变化）、取舍（为什么这个方案）
- 「熟悉 LangChain」这种写法换成「用 LangGraph 实现了 X，解决了 Y，指标 Z」
- 别堆名词：写「精通」的每一项都会被往深里问

## 项目建议

- Agent 记忆系统：分层记忆 + 压缩策略 + 淘汰机制，量化压缩率与信息保留
- 工具调用优化：工具描述改写、路由策略，量化调用准确率提升
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：过一遍 Agent 循环、工具调用、记忆三块的题库速答；把自己的项目按「规模-指标-取舍」重写
- 21 天：补 RAG 链路与评测两块短板；做一个带评测集的小项目；简历过一遍[体检](/tools/resume)
- 45 天：完整走一条 [Agent 应用开发学习路线](/roadmap/agent-developer)，模拟面试三轮以上
