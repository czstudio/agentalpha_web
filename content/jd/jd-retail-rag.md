---
slug: retail-rag
company: jd
title: 京东 · 零售大模型与 RAG
role: 大模型应用工程师（零售）
family: agent-app
level: 校招 / 社招 1-3 年
summary: 京东零售大模型应用岗：面试围绕商品知识库 RAG、京言助手类购物问答、客服 Agent 的工具与兜底设计展开，电商场景题多。
cats: [rag, tooluse, basics]
qaSlugs: [rag-pipeline, rag-chunking, rag-knowledge-base-update, rag-retrieval-debug, rag-evaluation, parent-child-index, rag-vs-finetune, what-is-function-calling, tool-failure, tool-result-rendering]
keywords: [京东大模型面试, 京言助手, 商品 RAG 面试, 客服 Agent]
updated: 2026-10-01
sourceUrl: https://campus.jd.com/
sourceName: 京东招聘官网（列表入口）
---

## 这条 JD 在招什么人

京东零售的大模型应用方向，落点在购物链路上：商品问答（京言助手这类产品形态）、客服 Agent、商品知识库的检索增强。考察点按公开 JD 与面经的高频归纳，集中在 RAG 的工程化上：商品数据结构复杂、更新频繁、对准确性要求高，是 RAG 落地里最难的一类场景。工具调用与结果呈现是另一块：客服 Agent 要能调订单、售后这类真实系统，还得把结果组织成用户能读的话。

## 业务场景推测

大概率是京言助手与智能客服两条线：购物决策问答、订单与售后类任务的工具化处理、商品知识库的建设与维护（置信度：中，基于公开业务布局推断）。营销文案生成类需求也可能挂在同一团队（置信度：低，基于公开产品形态推断）。

## 硬技能：必须会什么

- RAG：标准管线（[RAG 管线](/interview/qa/rag-pipeline)）、分块策略（[分块](/interview/qa/rag-chunking)）、父子索引对结构化文档的处理（[父子索引](/interview/qa/parent-child-index)）、知识库更新（[知识库更新](/interview/qa/rag-knowledge-base-update)）、badcase 排查（[检索排查](/interview/qa/rag-retrieval-debug)）、效果评测（[RAG 评测](/interview/qa/rag-evaluation)）
- 取舍：什么场景该 RAG、什么场景该微调（[RAG 还是微调](/interview/qa/rag-vs-finetune)）
- 工具：调用原理（[Function Calling](/interview/qa/what-is-function-calling)）、失败处理（[工具失败](/interview/qa/tool-failure)）、结果怎么渲染给用户（[结果渲染](/interview/qa/tool-result-rendering)）
- 工程功底：高并发问答服务、结构化数据处理

## 加分项：什么能拉开差距

- 电商业务背景：懂商品结构化字段、SKU、订单状态机
- 做过客服或对话系统的上线经历，有会话级指标意识
- 商品标题、详情页这类脏数据的清洗与结构化经验
- 有检索评测集建设经验

## JD 没写但面试会问

- 商品价格库存实时变，RAG 答案里的数字怎么保证不过期（高频）
- 用户问「这两款哪个好」，对比型问题怎么组织检索与生成
- 客服工具调错了订单，怎么发现、怎么补救
- 商品详情页格式乱，分块策略怎么定
- 答案承诺了平台做不到的售后，怎么拦
- RAG 检索不到的冷门商品问题怎么兜底

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 检索层 | 分块、索引、更新 | 有生产级经验 |
| 生成层 | 对比问答、引用、拒答 | 有质量数字 |
| 工具层 | 调用、失败、渲染 | 做过完整实现 |
| 业务层 | 商品数据、售后边界 | 能对齐业务口径 |
| 评测层 | RAG 评测与 badcase | 建过评测集 |

## 简历怎么改

- RAG 经历按环节写数字：分块策略、召回命中、端到端准确率
- 客服/问答经历写会话级指标：解决率、转人工率
- 工具调用写失败率与兜底方案，别只写「接入了 X 个工具」
- 电商数据处理的清洗经验要写，这个岗位吃这个

## 项目建议

- 做一个商品问答 RAG：用公开商品数据建库，重点做对比型问答与引用标注
- 写一个模拟订单工具集，把调用失败、超时、结果渲染都做上，统计异常路径
- 京东全部方向的题库见[京东公司聚合页](/interview/company/jd)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：RAG 管线与工具调用[题库速答](/interview/qa)过两遍；分块与知识库更新练到能讲细节，同步刷[京东公司聚合页](/interview/company/jd)的面经题
- 21 天：完成商品问答项目并建立分环节指标；[简历体检](/tools/resume)
- 45 天：完整走 [RAG 工程师路线](/roadmap/rag-engineer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
