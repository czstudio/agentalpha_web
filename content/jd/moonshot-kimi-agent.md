---
slug: kimi-agent
company: moonshot
title: 月之暗面 · Kimi Agent 应用开发
role: Agent 应用开发
family: agent-app
level: 校招 / 社招 1-3 年
summary: 围绕 Kimi 助手做 Agent 应用：长上下文利用、记忆系统、工具调用与使用场景的工程落地。
cats: [agent, memory, tooluse]
qaSlugs: [what-is-context-window, context-window-limit, lost-in-the-middle, context-compression-minimal-loss, agent-memory-hierarchy, memory-compression, memory-vs-rag, agent-memory-write-verify]
keywords: [月之暗面面试, Kimi Agent 开发, 长上下文 面试, Agent 记忆系统]
updated: 2026-09-29
sourceUrl: https://careers.kimi.com/
sourceName: Kimi 官方招聘站
---

## 这条 JD 在招什么人

在 Kimi 助手上做 Agent 能力的工程师：让模型在超长上下文里稳定使用工具、记住用户、完成多步任务。月之暗面的标签是长上下文（Kimi 早期以长文本出名），这个岗位和别家 Agent 岗的区别就在「上下文」三个字：同样的工具调用和记忆问题，放到 128K 甚至更长的窗口里，工程难度会放大：成本、延迟、中间内容遗忘、记忆和长窗口怎么分工，都要重新设计。

## 业务场景推测

大概率是 Kimi 助手内的 Agent 功能迭代：长文档处理、网页浏览/搜索工具、文件问答，也可能包含开放平台上的开发者场景（置信度：中高，基于公开产品形态推断）。偏助手产品的话，延迟与内容质量压力直接；偏平台的话，API 与 Schema 设计权重大。

## 硬技能：必须会什么

- 长上下文工程：窗口内有效信息利用、lost in the middle 现象与对策（[真题](/interview/qa/lost-in-the-middle)）
- 上下文压缩：快满时压什么、压完丢信息怎么权衡（[压缩的最小损失](/interview/qa/context-compression-minimal-loss)）
- 记忆系统：短期/长期分层、写入与验证机制、淘汰策略
- 记忆与检索的边界：哪些信息进记忆、哪些走 RAG（[记忆 vs RAG](/interview/qa/memory-vs-rag)）
- 工具调用：Function Calling 原理、Schema 设计、失败重试
- 基础功底：Transformer、token 计算、流式输出

## 加分项：什么能拉开差距

- 处理过超长输入的工程问题：分块策略、并行处理、成本控制有具体数字
- 做过记忆系统的完整链路：写入判定、读取时机、冲突合并、遗忘机制
- 长期深度使用 Kimi，能从产品视角指出哪些功能做得好或差、为什么
- 长文档问答的评测经验：怎么构造长文评测集、怎么定位「中间丢失」

## JD 没写但面试会问

- 上下文快满了，压缩策略怎么设计、丢什么保什么（高频）
- 记忆写错信息了怎么办：写入前验证还是用后修正（月之暗面方向高频）
- 长上下文和 RAG 是替代关系吗，什么场景用哪个
- 多轮对话里用户改口了，记忆怎么更新
- 你日常怎么用 Kimi 或其他助手，发现过什么问题

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | 上下文窗口、token、注意力 | 能讲长输入下的行为变化 |
| 工程层 | 流式、延迟、成本、压缩 | 有数字与取舍 |
| Agent 层 | 记忆分层、工具调用 | 做过完整链路，答得出失败处理 |
| 产品层 | 长文本场景理解、badcase 敏感 | 有真实使用与拆解 |

## 简历怎么改

- 长上下文相关经历量化：输入长度量级、成本变化、准确率变化
- 记忆系统经历按「写入-存储-读取-淘汰」四段写，每段有设计点
- 「重度使用 AI 产品」别空写，挑两三个具体 badcase 写进项目讨论
- 工具调用经历补调用准确率和失败兜底方案

## 项目建议

- 长文档问答对比实验：同一任务在长窗口直塞与 RAG 检索下的效果与成本对比
- 分层记忆系统：会话摘要 + 长期事实卡 + 淘汰机制，量化记忆命中率
- 用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：上下文与记忆两块[题库速答](/interview/qa)；把自己的项目按「长度-成本-质量」三个维度重写
- 21 天：做一个小型长文档评测项目；补工具调用短板；[简历体检](/tools/resume)
- 45 天：完整走 [Agent 应用开发学习路线](/roadmap/agent-developer)，长上下文章节推一遍，模拟面试三轮以上
