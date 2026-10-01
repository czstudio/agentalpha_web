---
slug: quark-ai
company: alibaba
title: 阿里 · 夸克 AI 搜索
role: AI 搜索应用工程师
family: agent-app
level: 校招 / 社招 1-3 年
summary: 阿里夸克 AI 搜索岗：超级框背后的检索生成与深度搜索是主线，拍照搜题这类多模态入口与垂直域约束是特色考区。
cats: [rag, agent]
qaSlugs: [rag-pipeline, rag-chunking, rag-evaluation, rag-retrieval-debug, what-is-query-rewrite, embedding-model-selection, deep-research-architecture, agent-planning, agent-loop, context-window-limit]
keywords: [夸克面试, AI 搜索, 阿里 AI 岗, DeepSearch]
updated: 2026-09-30
sourceUrl: https://talent.alibaba.com/
sourceName: 阿里巴巴集团招聘官网（列表入口）
---

## 这条 JD 在招什么人

夸克是阿里做 AI 搜索的主力产品：一个「超级框」承接所有输入，背后是检索、生成、深度搜索的组合。这条 JD 招 AI 搜索应用工程师，考察口径来自公开 JD 与面经的高频归纳：RAG 全流程加查询理解是主线，深度搜索（多步检索规划）是拉差距的考区。搜索产品的特性直接决定考法：query 短、意图杂、答错的代价高（搜题、搜健康都不容胡编），答案要又准又能溯源。

## 业务场景推测

大概率四类：超级框的主线问答，检索增强生成；拍照搜题与学习场景，多模态输入转查询；健康等垂直领域的搜索，权威性与安全性约束严；DeepSearch 类深度搜索，多步规划加多篇来源聚合（置信度：中，基于公开业务布局推断）。用户偏年轻、学生占比高，对答案形态与交互的预期和通用搜索不同，可能影响产品与技术取舍（置信度：低，基于公开业务布局推断）。

## 硬技能：必须会什么

- RAG 全流程：切分、检索、重排、生成的取舍（[RAG 流程](/interview/qa/rag-pipeline)、[切分策略](/interview/qa/rag-chunking)）
- 检索调试：坏结果怎么定位、归因到哪一层（[RAG 检索调试](/interview/qa/rag-retrieval-debug)）
- 查询侧：改写与意图理解（[Query 改写](/interview/qa/what-is-query-rewrite)）
- 向量侧：embedding 模型怎么选（[Embedding 选型](/interview/qa/embedding-model-selection)）
- 深度搜索：多步检索的架构（[Deep Research 架构](/interview/qa/deep-research-architecture)）与任务规划（[Agent 规划](/interview/qa/agent-planning)）
- 循环与上下文：多步循环的控制（[Agent 循环](/interview/qa/agent-loop)）、长结果的上下文预算（[上下文窗口限制](/interview/qa/context-window-limit)）
- 评测：搜索答案的质量量化（[RAG 评测](/interview/qa/rag-evaluation)）

## 加分项：什么能拉开差距

- 拍照搜题类多模态输入的经验：图转查询、OCR 前置与纠错
- 垂直领域（健康、法律）的权威性约束与安全方案
- 延迟与深度的权衡：什么时候浅检索秒回，什么时候进深度搜索
- 教育或工具类产品感：知道年轻用户要什么形态的答案

## JD 没写但面试会问

- 拍照搜题：图片到查询的链路怎么设计，OCR 识别错了怎么办（高频）
- 搜健康这类垂直域，怎么保证来源权威、答案不越界（高频）
- 什么时候该走深度搜索，多步规划的步数与预算怎么定
- 深度搜索答案慢，产品侧延迟怎么给
- 检索结果互相矛盾，聚合时听谁的
- RAG 答案质量怎么评：忠实度、引用准确性怎么测

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | LLM API、提示词、流式 | 熟练使用 |
| 检索层 | 全流程、改写、选型 | 每步讲得出取舍 |
| 深搜层 | 多步规划与来源聚合 | 做过原型实现 |
| 约束层 | 垂直域权威性、延迟预算 | 有方案级思考 |

## 简历怎么改

- 搜索相关经历前置：query 理解、召回、排序任一环节都算
- RAG 经历写清评测数字：忠实度、引用正确率
- 多模态输入经验（OCR、图转文）显式写
- 深度搜索类项目写清步数控制与来源聚合策略，别只写「实现了 DeepSearch」

## 项目建议

- 垂直域问答：选健康或法律子域，重点做来源权威性过滤与引用溯源
- 深度搜索原型：多步检索规划加来源聚合，控制步数与延迟，对比浅检索的效果与耗时
- 阿里全部方向的题库见[阿里公司聚合页](/interview/company/alibaba)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：RAG 与查询改写[题库速答](/interview/qa)过两遍；全流程练到能白板画图
- 21 天：做一个垂直域问答或深度搜索原型并建立评测；[简历体检](/tools/resume)
- 45 天：完整走[RAG 工程师学习路线](/roadmap/rag-engineer)或[Agent 开发路线](/roadmap/agent-developer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
