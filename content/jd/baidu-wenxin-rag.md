---
slug: wenxin-rag
company: baidu
title: 百度 · 文心大模型 RAG / 搜索增强方向
role: RAG 工程
family: agent-app
level: 校招 / 社招 1-3 年
summary: 文心系列与搜索主业结合的搜索增强与知识问答岗位，RAG 链路与检索原理考得深。
cats: [rag, eval, basics]
qaSlugs: [rag-pipeline, hybrid-retrieval-rerank, bi-encoder-cross-encoder, advanced-rag-paradigms, rag-effect-eval, rag-retrieval-debug, baidu-sft-rlhf-data-diff, what-is-query-rewrite]
keywords: [百度文心 RAG, 百度搜索增强, 百度大模型应用, RAG 工程师面试]
updated: 2026-09-28
---

## 这条 JD 在招什么人

在搜索主业和大模型结合处做搜索增强、知识问答的人。百度这个方向有积累：搜索的老底子（字面检索、排序、索引）加上文心系列模型，岗位画像偏「懂检索的 LLM 工程师」——不是会调向量库就行，BM25 的公式、TF-IDF 的缺陷、Bi-Encoder 和 Cross-Encoder 的取舍，这些检索原理题会被掰开问。

## 业务场景推测

大概率是搜索结果页的 AI 摘要/智能问答、文心一言的知识问答链路、或企业客户的搜索类解决方案（置信度：中高）。搜索场景的特点：延迟敏感、相关性标准严格、大规模索引。

## 硬技能：必须会什么

- RAG 全链路：解析、分块、多路召回、重排、生成、引用
- 检索原理：BM25/TF-IDF（百度真题）、混合检索（字面+向量）为什么及怎么做
- Embedding：对比训练原理、模型选型指标
- 进阶范式：Self-RAG、CRAG、GraphRAG、Agentic RAG（百度真题直接问）
- 评测：RAG 指标（召回率/忠实度）、评测集建设
- 训练常识：SFT 与 RLHF 数据的区别（百度真题）

## 加分项：什么能拉开差距

- 图检索增强（GraphRAG、图数据库+向量）的场景判断
- 长文档 RAG、时间衰减、父子索引这类「链路精修」经验
- Query 改写实战：为什么原句直接检索效果差、怎么改
- 大规模检索的工程经验：千万级文档的召回架构

## JD 没写但面试会问

- 你了解哪些更复杂的 RAG 范式（百度真题，按演进讲）
- 线上 RAG 怎么衡量效果好坏
- 检索不准从哪一步开始排查
- 长上下文中间的内容模型会看不到吗（lost in the middle）
- SFT 数据和 RLHF 数据的核心区别（百度真题）

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Embedding 原理、检索数学 | 公式级理解 |
| 工程层 | 索引、延迟优化、大规模召回 | 有规模数字 |
| Agent 层 | RAG 链路 + 进阶范式 | 每个范式能配失败场景 |
| 业务层 | 相关性标准、评测 | 有指标体系 |

## 简历怎么改

- RAG 项目按链路写全：几路召回、块大小怎么定的、重排用什么、指标多少、badcase 怎么闭环
- 检索相关经历（搜索、推荐、广告）前置，这是百度这个方向的相关性信号
- 有评测集建设经验的一定写：多少条、怎么标注、怎么回归

## 项目建议

- RAG 检索方法对比评测：BM25/向量/混合三路对比 + 重排消融（站内项目卡有完整框架）
- 复杂文档解析：表格、公式、扫描件的 RAG 前处理
- 用[项目匹配器](/tools/project-matcher)拿方案

## 准备计划

- 7 天：RAG 分类 19 题 + 检索原理题全过；把项目链路图重画一遍
- 21 天：进阶范式 + 评测两块补齐；做一个带评测集的检索对比实验；[简历体检](/tools/resume)
- 45 天：[RAG 工程师路线](/roadmap/rag-engineer)完整走完，重点章节手写推导
