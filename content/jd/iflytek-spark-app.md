---
slug: spark-app
company: iflytek
title: 科大讯飞 · 星火大模型应用
role: 大模型应用工程师
family: agent-app
level: 校招 / 社招 1-3 年
summary: 讯飞星火应用岗：RAG 知识问答、语音加大模型链路与办公教育医疗落地场景是主线，工程与行业理解并重。
cats: [rag, agent, basics]
qaSlugs: [rag-pipeline, rag-chunking, rag-knowledge-base-update, rag-retrieval-debug, rag-evaluation, rag-vs-finetune, agent-loop, agent-evaluation, what-is-embedding]
keywords: [讯飞面试, 星火大模型, 语音大模型, 讯飞 AI 岗]
updated: 2026-09-30
sourceUrl: https://job.iflytek.com/
sourceName: 讯飞招聘官网（列表入口）
---

## 这条 JD 在招什么人

科大讯飞的大模型应用工程师，把星火大模型落到办公、教育、医疗三类场景里：办公侧的会议转写与纪要（讯飞听见方向）、教育侧的学习机个性化辅导、医疗侧的知识问答辅助。这个方向的考察点按公开 JD 与面经的高频归纳，主线是「语音链路加大模型、RAG 扛行业知识」。讯飞的特点是语音是看家能力，ASR 加 LLM 加 TTS 的整条链路大概率绕不开。

## 业务场景推测

大概率是行业知识问答与语音交互的落地：办公场景的会议内容问答、教育场景的学科知识辅导、医疗场景的指南与知识库检索（置信度：中，基于公开业务布局推断）。学习机上的端侧化与个性化可能是重点方向；语音 Agent 的全双工交互也可能占一定比重（置信度：低，基于公开业务布局推断）。

## 硬技能：必须会什么

- RAG 全流程：解析、切分、索引、检索、重排、生成（[RAG 流程](/interview/qa/rag-pipeline)、[切分策略](/interview/qa/rag-chunking)）
- 知识库运维：教材、指南这类持续更新的语料怎么进库（[知识库更新](/interview/qa/rag-knowledge-base-update)）、坏结果怎么定位（[检索调试](/interview/qa/rag-retrieval-debug)）
- 评测：RAG 效果量化、评测集怎么建（[RAG 评测](/interview/qa/rag-evaluation)）
- 技术选型：行业能力用 RAG 还是微调，边界在哪（[RAG 与微调](/interview/qa/rag-vs-finetune)）
- Agent 设计：循环控制与退出条件（[Agent 循环](/interview/qa/agent-loop)）、效果怎么评（[Agent 评测](/interview/qa/agent-evaluation)）
- 基础：向量与相似度直觉（[Embedding](/interview/qa/what-is-embedding)）、Python 与后端服务化

## 加分项：什么能拉开差距

- 语音加大模型链路的实践：转写纠错、口语化文本的切分与检索
- 行业语料的处理经验：教育或医疗文本的清洗、术语对齐
- 站内面经题先刷：[全双工语音 Agent](/interview/qa/iflytek-voice-agent-full-duplex)、[ASR 生产问题](/interview/qa/iflytek-asr-production)、[学习机场景](/interview/qa/iflytek-spark-education-device)
- 有面向 C 端产品的落地经验，对延迟与准确率有取舍意识

## JD 没写但面试会问

- 转写文本带错字与口语噪声，检索和生成怎么稳（高频）
- 知识库每月都在更新，增量进库的流程怎么设计、不做全量重建（高频）
- 行业问答答错比不答更严重，拒答与兜底怎么设计（讯飞面经方向）
- 语音链路端到端时延怎么拆：ASR、LLM、TTS 各占多少（见[TTS 自然度](/interview/qa/iflytek-tts-naturalness)与[方言口音覆盖](/interview/qa/iflytek-dialect-accent-coverage)）
- 学科知识问答用 RAG 还是微调，怎么跟面试官讲清边界
- 评测集怎么建：没有标准答案的开放题怎么评

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | LLM API、提示词、Embedding | 概念清晰会算相似度 |
| RAG 层 | 全流程与知识库运维 | 每步讲得出取舍 |
| 语音层 | ASR、TTS 链路认知 | 讲得出时延拆解 |
| Agent 层 | 循环、评测、拒答兜底 | 做过完整实现 |
| 工程层 | 服务化、行业语料处理 | 有落地或复现经验 |

## 简历怎么改

- RAG 经历按流程分段写，检索与生成指标分开量化
- 语音相关经历写清链路位置：你做的是 ASR 后处理、检索还是生成
- 教育、医疗或会议场景的数据经验显式写，这个岗位对行业语料敏感
- 「熟悉星火」这类表述换成具体做过什么链路、什么指标

## 项目建议

- 做一个会议知识库问答：转写文本切分入库、增量更新流程、带拒答兜底，评测检索与生成两侧指标
- 或者做学科知识问答：对比 RAG 与微调在同一批错题上的效果差
- 讯飞全部方向的题库见[讯飞公司聚合页](/interview/company/iflytek)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：RAG 流程与知识库更新[题库速答](/interview/qa)过两遍；语音链路练到能白板画时延拆解，同步刷[讯飞公司聚合页](/interview/company/iflytek)的面经题
- 21 天：做完行业知识问答项目并建立评测；[简历体检](/tools/resume)
- 45 天：完整走[RAG 工程师学习路线](/roadmap/rag-engineer)或[Agent 开发路线](/roadmap/agent-developer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
