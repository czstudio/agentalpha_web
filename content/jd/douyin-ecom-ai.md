---
slug: ecom-ai
company: douyin
title: 抖音 · 电商大模型应用
role: 大模型应用工程师（电商方向）
family: agent-app
level: 校招 / 社招 1-3 年
summary: 抖音电商大模型应用岗：商品理解与搜索推荐的 RAG 链路、导购 Agent 设计是考察重点，检索与排序题密度高。
cats: [agent, rag, basics]
qaSlugs: [rag-pipeline, rag-chunking, what-is-query-rewrite, embedding-model-selection, hybrid-retrieval-rerank, rag-scale-ten-million, rag-evaluation, what-is-agent, agent-planning, what-is-embedding]
keywords: [抖音 AI 面试, 电商大模型, 导购 Agent, 商品理解]
updated: 2026-09-30
sourceUrl: https://jobs.bytedance.com/
sourceName: 抖音集团招聘官网（列表入口）
---

## 这条 JD 在招什么人

抖音电商的大模型应用工程师，做搜索推荐 AI 化与导购类智能体。这个方向的考察点按公开 JD 与面经的高频归纳，主线是两条：一条是商品侧的知识工程——亿级商品的理解、索引与检索；另一条是交互侧的导购 Agent——多轮理解用户需求、给推荐给理由。电商场景的特点直接决定考法：数据规模大、口语化查询多、结果错了直接影响交易。

## 业务场景推测

大概率是搜索与推荐链路的大模型化：商品问答、相似商品推荐、查询意图理解（置信度：中，基于公开业务布局推断）。导购 Agent 可能以对话式购物助手形态出现；直播场景的多模态理解（讲品内容与商品对齐）可能占一定比重（置信度：低，基于公开业务布局推断）。

## 硬技能：必须会什么

- RAG 全流程：解析、切分、索引、检索、重排、生成（[RAG 流程](/interview/qa/rag-pipeline)、[切分策略](/interview/qa/rag-chunking)）
- 大规模检索：亿级商品库的索引与检索方案（[千万级 RAG](/interview/qa/rag-scale-ten-million)）、向量模型怎么选（[Embedding 选型](/interview/qa/embedding-model-selection)）
- 查询侧：口语化搜索词的改写与扩展（[查询改写](/interview/qa/what-is-query-rewrite)）、混合检索与重排（[混合检索与重排](/interview/qa/hybrid-retrieval-rerank)）
- Agent 设计：什么场景该做 Agent 而不是纯检索（[Agent 是什么](/interview/qa/what-is-agent)）、多轮导购的任务规划（[Agent 规划](/interview/qa/agent-planning)）
- 评测：RAG 效果量化、评测集怎么建（[RAG 评测](/interview/qa/rag-evaluation)）
- 基础：向量与相似度的数学直觉（[Embedding](/interview/qa/what-is-embedding)）、Python 与推荐系统常识

## 加分项：什么能拉开差距

- 商品理解经验：标题、详情、评论、图片多源信息的抽取与对齐
- 检索与排序联动的调优经历：召回率与相关性怎么一起看
- 从零搭过检索-生成链路，而不是只拼框架组件
- 直播或短视频内容的多模态理解经验

## JD 没写但面试会问

- 用户搜「显瘦的夏天裙子」，改写和检索链路怎么设计（高频）
- 亿级商品库，向量索引怎么建、更新怎么办
- 检索回来的商品不相关、模型还是硬推，怎么定位怎么治
- 导购 Agent 与纯推荐流怎么分工：哪些请求值得走多轮对话
- 切分粒度怎么定：商品标题和长详情页用同一套吗
- 多轮对话里用户预算变了，上下文与检索条件怎么跟着变（抖音面经方向）

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Embedding、提示词、API | 概念与数学直觉清晰 |
| RAG 层 | 全流程与大库检索 | 每步讲得出取舍 |
| Agent 层 | 多轮导购与规划 | 做过完整实现 |
| 评测层 | 指标与 badcase 归因 | 有量化经验 |

## 简历怎么改

- 检索经历按召回、排序、生成分段量化，别只写「提升了效果」
- 「用过向量库」换成「在多大规模数据上、选了什么索引、更新策略是什么」
- 电商或内容类数据的处理经验显式写，这个岗位对领域数据敏感
- 项目里写清评测口径：什么指标、多少样本、提升多少

## 项目建议

- 做一个商品问答 RAG：商品标题加详情切分、混合检索加改写，对比不同切分粒度的检索质量
- 做一个最小导购 Agent：多轮收集预算与偏好、调用检索工具、给推荐理由，统计任务完成率
- 抖音全部方向的题库见[抖音公司聚合页](/interview/company/douyin)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：RAG 全流程与查询改写[题库速答](/interview/qa)过两遍；大库检索练到能白板画链路，同步刷[抖音公司聚合页](/interview/company/douyin)的面经题
- 21 天：做完商品问答或导购 Agent 项目并建立评测；[简历体检](/tools/resume)
- 45 天：完整走[RAG 工程师学习路线](/roadmap/rag-engineer)或[Agent 开发路线](/roadmap/agent-developer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
