---
slug: agent-dev
company: bilibili
title: B站 · AI Agent 开发
role: Agent 应用开发
family: agent-app
level: 校招 / 社招 1-3 年
summary: B 站 AI Agent 开发岗：笔试面试以 RAG 全流程、LangChain 组件、多轮 Agent 设计为主，工程题密度高，追问落在实现层。
cats: [agent, rag, tooluse]
qaSlugs: [rag-pipeline, rag-chunking, hybrid-retrieval-rerank, rag-evaluation, what-is-react, agent-loop, what-is-function-calling, how-to-write-tool-description]
keywords: [B站 AI Agent, B站 RAG 面试, LangChain 组件, 多轮 Agent 设计]
updated: 2026-09-29
---

## 这条 JD 在招什么人

B 站的 AI Agent 开发工程师，做社区场景里的智能助手与问答类产品。这个岗位的考察口径在站内面经里很集中：RAG 全流程、LangChain 组件、多轮 Agent 设计，工程题密度高——意思是概念题少，「这一步怎么做、为什么这么做」多。B 站场景的特点是内容社区：视频、评论、弹幕、UP 主创作，这些数据形态直接决定 RAG 链路怎么设计。

## 业务场景推测

大概率是站内搜索与问答的 AI 化：视频内容问答、评论与社区治理辅助、创作者工具里的智能助手（置信度：中，基于公开业务布局推断）。视频理解与多模态可能占一定比重；弹幕与评论这类短文本、高噪声数据的处理也可能是日常。

## 硬技能：必须会什么

- RAG 全流程：解析、切分、索引、检索、重排、生成，每一步的取舍（[RAG 流程](/interview/qa/rag-pipeline)、[切分策略](/interview/qa/rag-chunking)）
- 检索质量：混合检索与重排、坏结果怎么定位（[混合检索与重排](/interview/qa/hybrid-retrieval-rerank)）
- 评测：RAG 效果怎么量化、评测集怎么建（[RAG 评测](/interview/qa/rag-evaluation)）
- Agent 设计：ReAct 模式、循环的退出条件与轮数控制（[ReAct](/interview/qa/what-is-react)、[Agent 循环](/interview/qa/agent-loop)）
- 工具调用：原理与准确率优化（[Function Calling](/interview/qa/what-is-function-calling)）、描述怎么写才准（[工具描述](/interview/qa/how-to-write-tool-description)）
- 框架：LangChain、LangGraph 组件级使用，能讲清内部机制和局限，而不是只会拼组件
- 后端功底：Python、接口设计、缓存，问答类服务的延迟优化

## 加分项：什么能拉开差距

- 视频或多模态 RAG 经验：ASR 转写、帧描述怎么进索引
- 高噪声短文本（弹幕、评论）的清洗与检索调优
- 从零写过检索-生成链路，而不是只拼框架组件
- 有线上 RAG 服务的 badcase 归因流程

## JD 没写但面试会问

- 检索回来的片段不相关、生成还是硬答，怎么治（高频）
- 混合检索里关键词和向量各自管什么、权重怎么调
- 切分策略怎么定、块大小对检索效果的影响说不说得清
- 视频没有现成文本，转写和帧描述的质量怎么保证
- LangChain 某个组件内部怎么实现、不用它自己写难在哪（B 站面经方向）
- 多轮对话里用户意图变了，上下文怎么处理
- 工具描述写得模型老是调错，怎么改

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | LLM API、提示词、流式 | 熟练使用 |
| RAG 层 | 全流程与调优 | 每步讲得出取舍 |
| Agent 层 | 循环、工具、多轮 | 做过完整实现 |
| 工程层 | 服务化、评测、归因 | 有线上经验 |

## 简历怎么改

- RAG 经历按流程分段写：检索指标、生成指标分开量化
- 「用过 LangChain」换成「用 LangGraph 实现了 X、为什么不用 Y」
- 社区或内容类数据的处理经验显式写，B 站业务对这类经验最敏感
- 项目里写清数据规模和 badcase 处理方式

## 项目建议

- 视频知识问答：ASR 转写加切分加混合检索，量化不同切分策略的检索质量
- 从零实现一个最小 Agent 循环（不用框架），再对比框架版的差异
- B 站全部方向的题库见[B站公司聚合页](/interview/company/bilibili)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：RAG 与工具调用[题库速答](/interview/qa)过两遍；切分与检索质量练到能白板画图
- 21 天：做一个视频问答 RAG 项目并建立评测；[简历体检](/tools/resume)
- 45 天：完整走[RAG 工程师学习路线](/roadmap/rag-engineer)或[Agent 开发路线](/roadmap/agent-developer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
