---
slug: agent-product
company: minimax
title: MiniMax · Agent 产品开发
role: Agent 应用开发
family: agent-app
level: 校招 / 社招 1-3 年
summary: 海螺助手方向的 Agent 产品工程：多模态交互（语音/视频）、工具调用与 Agent 循环的落地。
cats: [agent, multimodal, tooluse]
qaSlugs: [what-is-vlm, video-understanding, realtime-voice-pipeline, visual-token-cost, agent-loop, tool-routing, vlm-hallucination-mitigation, agent-latency]
keywords: [MiniMax 面试, 海螺 Agent 开发, 多模态 Agent, MiniMax 产品工程]
updated: 2026-09-29
---

## 这条 JD 在招什么人

在海螺助手这类 C 端产品里做 Agent 能力的工程师。MiniMax 的特点是多模态自研：文本模型之外还有语音、视频生成模型，产品形态（海螺 AI）天然是多模态交互——用户发语音、发图、发视频，Agent 要看得懂、答得上、还能调工具完成任务。岗位画像：Agent 循环工程为主干，多模态输入输出的处理为特色，延迟和体验要持续做优化。岗位名里的「产品开发」意味着对体验负责：首字快不快、能不能打断、口语错字能不能容错，都在日常考核里。

## 业务场景推测

大概率是海螺助手的 Agent 功能迭代（任务执行、语音交互、视觉理解），也可能在开放平台侧做 Agent API 与工具生态（置信度：中高，基于公开产品形态推断）。开放平台这条线会关心接入体验、文档与工具生态的完整性。C 端助手产品的压力点：首字延迟、多模态成本、badcase 的舆情敏感。

## 硬技能：必须会什么

- Agent 循环：ReAct 范式、循环终止条件、并行工具调用（[循环设计](/interview/qa/agent-loop)）
- 多模态理解：VLM 原理、视觉 token 成本（[视觉 token](/interview/qa/visual-token-cost)）、视频理解的处理方式
- 语音链路：实时语音的管线设计与延迟拆解（[实时语音](/interview/qa/realtime-voice-pipeline)）
- 工具调用：Schema 设计、工具多了怎么路由（[工具路由](/interview/qa/tool-routing)）
- 幻觉治理：VLM 看图说错的检测与缓解（[缓解方法](/interview/qa/vlm-hallucination-mitigation)）
- 延迟工程：TTFT、每轮延迟的优化手段（[延迟](/interview/qa/agent-latency)）

## 加分项：什么能拉开差距

- 做过语音或视频方向的完整项目：管线每一环的延迟和成本能报数
- 生成侧（TTS、视频生成）与理解侧都碰过，能讲清两边评价指标的差异
- C 端体验敏感：能把「慢在哪」拆到具体环节并给出优化前后对比
- 用海螺或竞品做过深度对比分析

## JD 没写但面试会问

- 一句话语音进、语音出，延迟预算怎么分配（多模态岗高频）
- 图片分辨率和视觉 token 数的关系，怎么省成本
- Agent 循环停不下来怎么治理
- VLM 把图里没有的东西说出来了，怎么办
- 多个工具候选时路由策略怎么设计

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer、VLM 结构 | 能讲模态融合方式 |
| 工程层 | 语音/视觉管线、延迟优化 | 每环有数字 |
| Agent 层 | 循环、工具调用、路由 | 有完整任务经验 |
| 产品层 | C 端体验、成本、badcase | 有对比分析与判断 |

## 简历怎么改

- 多模态经历拆环节写：预处理、模型调用、后处理各自的指标
- 延迟优化经历带前后对比数字与手段（并行、流式、缓存）
- C 端项目补体验指标：完成率、中断率、首字时间
- 工具调用经历写工具数量级与路由方案

## 项目建议

- 多模态 Agent：语音输入 + 图片理解 + 工具调用完成任务，整条链路延迟打点
- 视觉 token 成本实验：不同分辨率与压缩策略下的效果-成本曲线
- 用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：Agent 循环与多模态[题库速答](/interview/qa)；写一份语音管线延迟构成分析
- 21 天：做一个多模态小项目并带打点数据；[简历体检](/tools/resume)
- 45 天：完整走 [Agent 应用开发学习路线](/roadmap/agent-developer)，多模态章节重点过，模拟面试三轮以上
