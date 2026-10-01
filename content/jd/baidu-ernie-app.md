---
slug: ernie-app
company: baidu
title: 百度 · 文心大模型应用
role: 大模型应用工程师
family: agent-app
level: 校招 / 社招 1-3 年
summary: 百度文心大模型应用岗：面试围绕 RAG 检索增强、搜索问答化改造、Agent 工具链与幻觉控制展开，搜索场景色彩重。
cats: [rag, agent, basics]
qaSlugs: [rag-pipeline, hybrid-retrieval-rerank, what-is-query-rewrite, rag-retrieval-debug, rag-vs-finetune, what-is-agent, what-is-react, workflow-vs-agent, task-hallucination-detection]
keywords: [百度文心面试, 文心大模型应用面试, 搜索 AI 化, RAG 面试]
updated: 2026-10-01
sourceUrl: https://talent.baidu.com/jobs/social-list
sourceName: 百度招聘官网（列表入口）
---

## 这条 JD 在招什么人

百度的文心大模型应用方向，落点在应用层：搜索的 AI 化改造、文心一言的产品功能、智能体平台上的应用。考察点按公开 JD 与面经的高频归纳，集中在检索增强与问答质量上：搜索场景对时效、准确性、幻觉的要求比一般应用苛刻，答错一条事实用户立刻能察觉。Agent 与工具是让模型接上实时信息的手段，RAG 是这条线的主干。

## 业务场景推测

大概率是搜索 AI 问答与文心一言应用层：查询理解与改写、检索与生成结合的问答、答案可信度控制（置信度：中，基于公开业务布局推断）。文心智能体平台的开发者生态支持也可能是日常的一部分（置信度：低，基于公开产品形态推断）。

## 硬技能：必须会什么

- RAG 主干：标准管线各环节（[RAG 管线](/interview/qa/rag-pipeline)）、混合检索与重排（[混合检索与重排](/interview/qa/hybrid-retrieval-rerank)）
- 查询侧：短输入怎么扩写不失真（[查询改写](/interview/qa/what-is-query-rewrite)）、检索 badcase 怎么排查（[检索排查](/interview/qa/rag-retrieval-debug)）
- 取舍：RAG 与微调各解决什么问题（[RAG 还是微调](/interview/qa/rag-vs-finetune)）
- Agent：基本范式（[Agent 是什么](/interview/qa/what-is-agent)）、边想边做的执行模式（[ReAct](/interview/qa/what-is-react)）、什么任务交给固定流程（[workflow vs Agent](/interview/qa/workflow-vs-agent)）
- 幻觉控制：任务执行里的幻觉怎么检测（[幻觉检测](/interview/qa/task-hallucination-detection)）
- 工程功底：Python、与搜索/推荐系统的接口对接意识

## 加分项：什么能拉开差距

- 搜索或推荐系统背景，懂查询理解与排序的接口约定
- 做过检索质量优化：召回、重排、答案抽取分别怎么调
- 有幻觉治理的实践：引用溯源、拒答策略、评测集建设
- 用过文心系模型 API，了解其在中文场景的强弱项

## JD 没写但面试会问

- 搜索输入很短，query 改写怎么做才不失真（高频）
- 检索回来的内容互相矛盾，答案怎么组织
- 什么问题该拒答，拒答的边界怎么定
- 时效性问题（新闻、价格）怎么保证答案新鲜
- 给一个具体场景，RAG 还是微调，选一个说理由
- 问答质量怎么评，人工和自动各占多少

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 检索层 | 管线、混合检索、重排 | 能定位 badcase |
| 生成层 | 提示词、引用、拒答 | 有质量数字 |
| Agent 层 | ReAct、工具接入 | 做过完整实现 |
| 评测层 | 问答评测与幻觉检测 | 建过评测集 |

## 简历怎么改

- RAG 经历分环节写数字：召回命中多少、重排后变化、端到端准确率
- 「优化了检索」换成具体动作与结果：加了重排、top3 命中率从 X 到 Y
- 幻觉治理经历单独写：策略、评测方法、前后对比
- 搜索相关背景显式写，这个岗位对查询理解经验敏感

## 项目建议

- 做一个基于公开语料的问答系统：查询改写、混合检索、重排、引用标注，每个环节留评测数字
- 收集 50 条 badcase，按检索失败与生成失败分类，各给修复方案
- 百度全部方向的题库见[百度公司聚合页](/interview/company/baidu)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：RAG 管线与查询改写[题库速答](/interview/qa)过两遍；检索 badcase 排查要能说出套路，同步刷[百度公司聚合页](/interview/company/baidu)的面经题
- 21 天：做完问答系统项目并建立分环节指标；[简历体检](/tools/resume)
- 45 天：完整走 [RAG 工程师路线](/roadmap/rag-engineer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
