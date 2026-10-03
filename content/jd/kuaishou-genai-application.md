---
slug: genai-application
company: kuaishou
title: 快手 · GenAI 应用开发
role: Agent 应用开发
family: agent-app
level: 校招 / 社招 1-3 年
summary: 快手 GenAI 方向应用开发：RAG 链路工程、Agent 编排与适量微调，面经里手写公式是特色。
cats: [rag, agent, finetune]
qaSlugs: [rag-pipeline, rag-chunking, hybrid-retrieval-rerank, rag-effect-eval, rag-retrieval-debug, gae-critic-ppo, rag-vs-finetune, what-is-grpo]
keywords: [快手 GenAI 面试, 快手大模型应用, RAG 十连问, 快手 AI 应用岗]
updated: 2026-09-29
sourceUrl: https://campus.kuaishou.cn/#/campus/job-info/12691
sourceName: 快手官网
---

## 这条 JD 在招什么人

在快手的内容与社区场景里做生成式 AI 应用的工程师。可以公开对标的业务面：搜索/推荐里的生成式摘要、AI 助手类产品、AIGC 创作工具、商家侧的内容生成。岗位画像是应用工程为主：RAG 考得最深，Agent 编排是常规要求，需要时会碰微调，用小数据把领域效果顶上去。快手站内面经里这个方向以 RAG 连环追问著称，并且会出现手写公式（GAE、重要性采样），准备时不能只停在概念层：手写公式不是算法岗专属，应用岗考它是在验基础是否扎实。

## 业务场景推测

大概率是搜索问答或生成式摘要、社区场景的 AI 助手、或创作者 AIGC 工具中的一条线（置信度：中）。快手在生成侧也有公开产品（可灵系列），如果 JD 偏内容生成，考察会更靠近生成质量评估与推理成本。内容平台的特点：数据量大、时效性强（热点内容检索）、内容安全压力持续存在。

## 硬技能：必须会什么

- RAG 整条链路：解析、分块（[分块策略](/interview/qa/rag-chunking)）、混合检索、重排、生成、引用，每一步都能下钻
- 检索调试：不准从哪步开始查、每步的观测指标（[检索排查](/interview/qa/rag-retrieval-debug)）
- 评测：RAG 指标体系、评测集建设、线上效果回收
- Agent 编排：workflow 与 Agent 的取舍、工具调用
- 微调基础：什么时候 RAG 不够要上微调（[RAG vs 微调](/interview/qa/rag-vs-finetune)）、LoRA 原理
- 公式底子：GAE、PPO 重要性采样能推导（快手面经的真题风格）

## 加分项：什么能拉开差距

- 多模态 RAG：视频、图片内容的检索与生成（内容平台刚需）
- 热点/时效内容的检索策略：索引更新速度与召回的平衡
- 手推公式熟练：GAE 的偏差方差权衡讲得清
- AIGC 内容安全：生成内容的审核链路有认知

## JD 没写但面试会问

- RAG 连环追问：从「什么是 RAG」一路问到重排与线上指标（快手面经高频，业内称 RAG 十连问）
- 手写 GAE 或重要性采样公式并解释每项含义
- 分块大小怎么定、结构化内容（评论、弹幕、视频描述）怎么处理
- 线上效果怎么评、离线在线不一致怎么办
- 什么场景你会上微调而不是 RAG，依据是什么

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer、训练常识 | 公式级理解 |
| 工程层 | RAG 链路、检索调试 | 每步有指标有方法 |
| Agent 层 | 编排、工具调用 | 有完整链路经验 |
| 业务层 | 内容场景、时效、安全 | 有场景判断力 |

## 简历怎么改

- RAG 项目写满链路细节：几路召回、块大小依据、重排选型、指标数字
- 公式能力显式举证：写过哪些推导、笔记或博客链接
- 内容或 AIGC 相关经历前置
- 微调经历写清数据规模与效果变化，别只写「做了微调」

## 项目建议

- RAG 逐项消融实验：分块、召回、重排逐项对比，输出指标表与结论
- 时效内容问答：模拟热点更新场景，测索引更新延迟对答案的影响
- 用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：RAG 链路[题库](/interview/qa)全过；GAE 与重要性采样手推两遍
- 21 天：做一个逐项消融的小项目；补多模态检索；[简历体检](/tools/resume)
- 45 天：完整走 [RAG 工程师学习路线](/roadmap/rag-engineer)，公式章节默写过关，模拟面试三轮以上
