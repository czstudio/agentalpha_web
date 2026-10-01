---
slug: note-agent
company: xiaohongshu
title: 小红书 · 内容 Agent 与搜索
role: Agent 算法工程师
family: agent-app
level: 校招 / 社招 1-3 年
summary: 小红书 Agent 算法岗：面试围绕笔记内容理解 Agent、搜索问答化、多轮对话记忆与记忆压缩展开，社区内容场景色彩重。
cats: [agent, rag, memory]
qaSlugs: [agent-memory-design, agent-memory-hierarchy, memory-compression, memory-vs-rag, multi-turn-state-recovery, agent-loop, embedding-model-selection, hybrid-retrieval-rerank, rag-chunking, what-is-query-rewrite]
keywords: [小红书 Agent 面试, 内容理解 Agent, 搜索问答化, 多轮对话记忆]
updated: 2026-10-01
sourceUrl: https://job.xiaohongshu.com/
sourceName: 小红书招聘官网（列表入口）
---

## 这条 JD 在招什么人

小红书的内容 Agent 方向，落点在笔记内容理解与搜索问答上：用 Agent 把非结构化的笔记内容整理成可用的答案。考察点按公开 JD 与面经的高频归纳，集中在 Agent 的记忆设计与检索增强上：笔记是碎片的、口语的、带图的，怎么检索、怎么组织成答案、怎么在多轮对话里记住用户偏好，是这条线的核心题。

## 业务场景推测

大概率是搜索的问答化改造与内容理解 Agent：把站内笔记检索后组织成直接答案、多轮追问下维持上下文与用户偏好（置信度：中，基于公开业务布局推断）。笔记结构化与话题理解也可能挂在这个方向下（置信度：低，基于公开产品形态推断）。

## 硬技能：必须会什么

- 记忆设计：Agent 记忆怎么组织（[Agent 记忆设计](/interview/qa/agent-memory-design)）、分层结构（[记忆分层](/interview/qa/agent-memory-hierarchy)）、装不下时怎么压缩（[记忆压缩](/interview/qa/memory-compression)）
- 边界判断：什么时候用记忆、什么时候用 RAG（[记忆与 RAG](/interview/qa/memory-vs-rag)）
- 状态管理：多轮状态恢复（[多轮状态恢复](/interview/qa/multi-turn-state-recovery)）、循环控制（[Agent 循环](/interview/qa/agent-loop)）
- 检索：embedding 模型怎么选（[Embedding 选型](/interview/qa/embedding-model-selection)）、混合检索与重排（[混合检索与重排](/interview/qa/hybrid-retrieval-rerank)）、口语化长文怎么分块（[分块策略](/interview/qa/rag-chunking)）、模糊意图怎么改写（[查询改写](/interview/qa/what-is-query-rewrite)）
- 工程功底：Python、内容处理管线

## 加分项：什么能拉开差距

- 做过多轮对话产品的记忆系统，能讲清写什么、忘什么
- UGC 内容处理经验：口语化文本、emoji、图片文字混排
- 有搜索或问答产品的实际调优经历
- 熟悉小红书内容形态，对社区语境敏感

## JD 没写但面试会问

- 用户第七轮还在追问，上下文放不下了，留什么丢什么（高频）
- 存下来的用户偏好过时了怎么办，记忆怎么衰减与更新
- 笔记内容互相矛盾（同一问题不同答案），答案怎么组织
- 答案引用笔记原文，版权与呈现怎么处理
- 搜索问答化之后，怎么评「答案好」而不只是「检索准」
- 记忆里的用户画像怎么防滥用

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 记忆层 | 记忆组织、压缩、衰减 | 做过完整设计 |
| 检索层 | embedding、重排、分块 | 有调优经验 |
| Agent 层 | 循环、多轮状态 | 做过完整实现 |
| 内容层 | UGC 理解、引用合规 | 有场景级思考 |

## 简历怎么改

- 多轮对话经历写清记忆方案：存什么粒度、怎么压缩、多长衰减
- 「做了搜索优化」换成检索与答案质量的分环节指标
- UGC 内容处理的经验单独写，社区场景这是差异化项
- 记忆与 RAG 的分工要在简历里讲明白，这是高频追问点

## 项目建议

- 做一个多轮问答 Demo：接公开语料当「笔记库」，实现偏好记忆、上下文压缩与引用标注
- 构造一组多轮长对话，对比有无记忆压缩时的答案质量与 token 消耗
- 小红书全部方向的题库见[小红书公司聚合页](/interview/company/xiaohongshu)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：记忆设计与多轮状态[题库速答](/interview/qa)过两遍；记忆与 RAG 的边界要能举例讲清，同步刷[小红书公司聚合页](/interview/company/xiaohongshu)的面经题
- 21 天：完成多轮问答项目并建立质量与成本指标；[简历体检](/tools/resume)
- 45 天：完整走 [Agent 开发路线](/roadmap/agent-developer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
