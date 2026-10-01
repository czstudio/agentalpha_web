---
slug: retail-llm
company: meituan
title: 美团 · 到店电商大模型应用
role: 大模型应用工程师（到店）
family: agent-app
level: 校招 / 社招 1-3 年
summary: 美团到店大模型应用岗：面试围绕商户与商品知识库 RAG、工具调用与交易安全、搜索推荐 AI 化展开，业务落地题多。
cats: [rag, tooluse, basics]
qaSlugs: [rag-pipeline, rag-evaluation, rag-knowledge-base-update, rag-scale-ten-million, vector-db-selection, what-is-embedding, what-is-function-calling, function-calling-accuracy, tool-failure, tool-permission]
keywords: [美团大模型面试, 到店大模型应用, 商品知识库 RAG, 工具调用面试]
updated: 2026-10-01
sourceUrl: https://zhaopin.meituan.com/
sourceName: 美团招聘官网（列表入口）
---

## 这条 JD 在招什么人

美团到店业务的大模型应用方向，落点是把 LLM 接进到店的搜索、推荐与商户工具里。考察点按公开 JD 与面经的高频归纳，集中在三块：商品与商户知识库的 RAG、工具调用的工程化、交易链路上模型行为的安全边界。它是业务岗——模型能力是手段，交易转化与用户体验是目的，面试会反复回到业务约束上。

## 业务场景推测

大概率是到店搜索与推荐里的生成式改造：查询理解、商品与商户摘要、对话式推荐（置信度：中，基于公开业务布局推断）。商户侧的智能经营工具也可能是方向之一（置信度：低，基于公开产品形态推断）。交易链路对错误容忍度低，安全与合规是贯穿的高频约束。

## 硬技能：必须会什么

- RAG：标准管线（[RAG 管线](/interview/qa/rag-pipeline)）、效果怎么评（[RAG 评测](/interview/qa/rag-evaluation)）、知识库怎么更新（[知识库更新](/interview/qa/rag-knowledge-base-update)）、千万级数据怎么撑住（[千万级向量检索](/interview/qa/rag-scale-ten-million)）、库怎么选（[向量库选型](/interview/qa/vector-db-selection)）
- 语义基础：embedding 的原理与局限（[什么是 Embedding](/interview/qa/what-is-embedding)）
- 工具调用：原理（[Function Calling](/interview/qa/what-is-function-calling)）、准确率怎么提（[调用准确率](/interview/qa/function-calling-accuracy)）、失败怎么处理（[工具失败](/interview/qa/tool-failure)）、权限怎么控（[工具权限](/interview/qa/tool-permission)）
- 工程功底：高并发服务开发、转化与体验这类业务指标的敏感度

## 加分项：什么能拉开差距

- 电商或本地生活业务背景，懂 SKU、POI 这类数据结构
- 做过生成内容与业务指标的关联实验：摘要对点击率的影响
- 有交易或支付场景的模型安全经验：敏感词、越权、合规
- 千万级向量库的运维与调优经验

## JD 没写但面试会问

- 商品信息每天变，知识库怎么增量更新又不串味（高频）
- 模型推荐错了店，责任边界在哪、怎么兜底
- 工具调用的权限怎么控，哪些操作必须人工确认
- 商户侧工具被恶意刷怎么防
- 检索结果里竞价与非竞价内容怎么处理
- 生成式推荐与传统推荐的评测口径差在哪

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | LLM API、embedding、提示词 | 熟练使用 |
| 检索层 | RAG 管线、向量库、更新 | 有生产级经验 |
| 工具层 | 调用、权限、失败兜底 | 有优化数字 |
| 业务层 | 搜索推荐指标、交易约束 | 能对齐业务口径 |
| 安全层 | 内容与行为安全 | 有方案级思考 |

## 简历怎么改

- 业务效果写在技术动作后面：做了什么改动、转化或体验指标变化多少
- RAG 规模写清楚：多大库、更新频率、命中率
- 工具调用经历写权限与失败处理，交易场景这是必问点
- 有电商/本地生活项目要放在最前面

## 项目建议

- 做一个商品问答 RAG：模拟知识库每日更新，测新旧信息冲突的处理
- 设计一组带权限的工具（查询放开、下单需确认），统计调用准确率与误调用率
- 美团全部方向的题库见[美团公司聚合页](/interview/company/meituan)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：RAG 与工具调用[题库速答](/interview/qa)过两遍；知识库更新与权限控制练到能讲细节，同步刷[美团公司聚合页](/interview/company/meituan)的面经题
- 21 天：完成商品问答或带权限工具的项目并记录指标；[简历体检](/tools/resume)
- 45 天：完整走 [RAG 工程师路线](/roadmap/rag-engineer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
