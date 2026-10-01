---
slug: weixin-ai
company: tencent
title: 腾讯 · 微信 AI 应用
role: AI 应用工程师（微信场景）
family: agent-app
level: 校招 / 社招 1-3 年
summary: 腾讯微信 AI 应用岗：搜一搜 AI 化与元宝场景的检索生成是主线，RAG 全流程加亿级社交内容的规模问题问得细。
cats: [agent, rag]
qaSlugs: [rag-pipeline, rag-chunking, hybrid-retrieval-rerank, rag-evaluation, rag-scale-ten-million, what-is-query-rewrite, what-is-agent, agent-loop, multi-turn-state-recovery, context-compression-minimal-loss]
keywords: [腾讯 AI 面试, 微信 AI, 元宝, 腾讯大模型应用]
updated: 2026-09-30
sourceUrl: https://join.qq.com/
sourceName: 腾讯招聘官网（列表入口）
---

## 这条 JD 在招什么人

微信事业群的 AI 应用工程师，做微信场景里的检索与生成：搜一搜的 AI 化、元宝 App 的相关能力、小程序场景的 Agent。考察口径来自公开 JD 与面经的高频归纳：RAG 全流程是绝对主线，微信的内容形态（公众号长文、视频号、聊天语境）决定切分与检索的问法很细。社交场景的特殊点：内容海量且更新快，时效性与权威性要求高，用户 query 短且口语化，答错的代价不只是体验问题。

## 业务场景推测

大概率四类：搜一搜结果页的 AI 问答与摘要；元宝里对接微信内容生态的检索问答；小程序场景的智能助手，客服与服务查询类 Agent；社交内容的理解与生成辅助（置信度：中，基于公开业务布局推断）。隐私约束可能是方案设计里的硬前提：聊天数据能不能用、怎么用，回答里要主动想到这层（置信度：低，基于公开业务布局推断）。

## 硬技能：必须会什么

- RAG 全流程：解析、切分、索引、检索、重排、生成，每一步的取舍（[RAG 流程](/interview/qa/rag-pipeline)、[切分策略](/interview/qa/rag-chunking)）
- 检索质量：混合检索与重排、权重怎么调（[混合检索与重排](/interview/qa/hybrid-retrieval-rerank)）
- 规模问题：千万级以上文档的检索架构与更新（[RAG 千万级扩展](/interview/qa/rag-scale-ten-million)）
- 查询侧：短口语化 query 的改写（[Query 改写](/interview/qa/what-is-query-rewrite)）
- Agent：概念边界与循环控制（[Agent 是什么](/interview/qa/what-is-agent)、[Agent 循环](/interview/qa/agent-loop)）
- 多轮：意图漂移下的状态恢复（[多轮状态恢复](/interview/qa/multi-turn-state-recovery)）、上下文怎么压不丢关键信息（[上下文压缩](/interview/qa/context-compression-minimal-loss)）
- 评测：RAG 效果怎么量化（[RAG 评测](/interview/qa/rag-evaluation)）

## 加分项：什么能拉开差距

- 超大规模检索的实战：索引分片、更新延迟、降级方案
- 短文本口语化 query 的处理经验：改写、纠错、意图澄清
- 内容时效性与权威性排序的方案积累
- 搜索或推荐背景出身，转 RAG 顺手

## JD 没写但面试会问

- 公众号长文怎么切、视频内容没有现成文本怎么办（高频）
- 亿级文档的索引怎么组织，更新怎么不拖垮在线服务
- 用户 query 就三五个字，检索前做什么
- AI 摘要引用了过期或低质内容，怎么治
- 多轮里用户换了话题，上下文怎么裁
- 混合检索的权重怎么调，怎么证明调对了

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | LLM API、提示词、流式 | 熟练使用 |
| 检索层 | 全流程与调优 | 每步讲得出取舍 |
| 规模层 | 大规模索引与更新 | 有方案级思考 |
| Agent 层 | 循环、多轮、压缩 | 做过完整实现 |

## 简历怎么改

- RAG 经历按流程分段量化：检索指标与生成指标分开写
- 规模信息显式写：文档量、QPS、索引更新频率
- 搜索或推荐背景写在显眼位置
- 微信生态相关经历（小程序、公众号工具）值得单独一行

## 项目建议

- 公众号问答系统：长文切分加混合检索，重点做 query 改写与评测集
- 规模实验：十万级文档上对比索引方案与更新策略，写出向亿级扩展的推演
- 腾讯全部方向的题库见[腾讯公司聚合页](/interview/company/tencent)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：RAG 全流程[题库速答](/interview/qa)过两遍；切分与检索质量练到能白板画图
- 21 天：做一个长文问答 RAG 项目并建立评测；[简历体检](/tools/resume)
- 45 天：完整走[RAG 工程师学习路线](/roadmap/rag-engineer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
