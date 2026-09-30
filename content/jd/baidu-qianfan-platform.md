---
slug: qianfan-platform
company: baidu
title: 百度 · 千帆大模型平台应用开发
role: Agent 应用开发
family: agent-app
level: 校招 / 社招 1-3 年
summary: 千帆平台应用开发岗：企业级 RAG 服务化、知识库更新与私有化交付，权限边界和多行业合规是生产侧主线。
cats: [enterprise, tooluse]
qaSlugs: [baidu-sft-rlhf-data-diff, llm-private-deployment, enterprise-rag-pitfalls, rag-knowledge-base-update, rag-acl-permissions, model-routing, llm-vendor-switch, tool-schema-design]
keywords: [百度千帆, 千帆大模型平台, 企业 RAG 岗位, 百度 Agent 开发]
updated: 2026-09-29
sourceUrl: https://talent.baidu.com/jobs/position/detail?postId=686957&recruitType=SOCIAL
sourceName: 百度智能云官网
---

## 这条 JD 在招什么人

在千帆大模型平台上做企业应用的工程师。千帆是百度面向企业的大模型平台：模型服务、RAG 知识库、Agent 编排、私有化交付都在平台上。这个岗位做的是平台之上的应用层与平台能力的工程化——把文心系列模型和企业自己的数据、流程接起来。和企业内部 AI 岗不同，平台岗要同时服务很多行业客户：金融、政务、能源，每家的合规口径都不一样，工程上必须做成可配置的。百度口径里搜索增强与知识问答是传统重心，千帆的 RAG 能力正是这条线的延伸。

## 业务场景推测

大概率是千帆的 RAG 服务化与企业知识库产品迭代：文档解析、检索、权限、知识库更新机制；也可能包含私有化交付与行业客户的定制项目（置信度：中高，基于公开业务布局推断）。政务与金融类客户可能占不小比重：内网部署、国产芯片适配、数据不出域，是这类项目的常规约束。

## 硬技能：必须会什么

- RAG 工程：解析、切分、检索、重排的完整流程与生产问题（[企业 RAG 的坑](/interview/qa/enterprise-rag-pitfalls)）
- 知识库运维：更新机制、增量入库、时效处理（[知识库更新](/interview/qa/rag-knowledge-base-update)）
- 权限体系：文档级权限在检索链路里怎么落地（[RAG 权限](/interview/qa/rag-acl-permissions)）
- 模型路由：大小模型分级、按任务选模型（[模型路由](/interview/qa/model-routing)）
- 私有化：私有部署的形态与取舍（[私有化部署](/interview/qa/llm-private-deployment)）
- 平台常识：SFT 与 RLHF 的数据差在哪，客户问起来要答得上（[SFT/RLHF 数据差异](/interview/qa/baidu-sft-rlhf-data-diff)）

## 加分项：什么能拉开差距

- 服务过多行业客户的经验：能把合规要求翻译成技术方案
- 模型供应商切换的抽象设计（[供应商切换](/interview/qa/llm-vendor-switch)）
- 工具调用 Schema 设计干净（[工具 Schema](/interview/qa/tool-schema-design)）
- 文档解析的脏活经验：表格、扫描件、版式复杂的 PDF

## JD 没写但面试会问

- 客户知识库每天增量更新，检索效果怎么不抖动（高频）
- 不同部门文档权限不同，RAG 怎么保证不越权（高频）
- 文心和开源模型怎么混用、路由策略怎么定
- 私有化环境和公有云功能不一致，客户投诉怎么处理
- 平台 badcase 的处理流程是什么、怎么向客户交代

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | LLM API、RAG 流程 | 概念清楚 |
| 工程层 | 检索、权限、更新机制 | 有生产级理解 |
| 平台层 | 路由、多模型、私有化 | 能讲方案取舍 |
| 客户层 | 合规、交付、SLA | 有意识有案例 |

## 简历怎么改

- 平台或 ToB 经历写清行业、规模、约束（内网、国产化、等保），这些是硬区分度
- RAG 经历挂指标：召回率、答准率、badcase 率的变化
- 别堆平台名，写你在平台上具体解决了什么问题
- 数据合规相关经验前置

## 项目建议

- 带权限的企业知识库：文档级权限加增量更新，量化越权测试与检索抖动
- 模型路由小系统：按任务复杂度分流大小模型，算清成本收益
- 百度全部方向的题库见[百度公司聚合页](/interview/company/baidu)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：企业 RAG 与私有化[题库速答](/interview/qa)过两遍
- 21 天：做一个带权限设计的知识库项目；[简历体检](/tools/resume)
- 45 天：完整走[大模型应用学习路线](/roadmap/llm-application)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
