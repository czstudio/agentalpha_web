---
slug: llm-application
company: alibaba
title: 阿里巴巴 · 大模型应用开发工程师（通义/百炼方向）
role: 大模型应用开发
family: agent-app
level: 校招 / 1-3 年
summary: 通义千问与百炼平台方向，企业级 RAG、Agent 平台与工具生态的工程落地。
cats: [rag, enterprise, agent]
qaSlugs: [rag-pipeline, enterprise-rag-pitfalls, alibaba-mcp-standard-view, alibaba-skill-eval-trace, hybrid-retrieval-rerank, vector-db-selection, rag-knowledge-base-update, llm-vendor-switch]
keywords: [阿里大模型应用, 通义应用开发, 百炼平台工程师, 阿里 RAG 岗]
updated: 2026-09-28
sourceUrl: https://www.nowcoder.com/feed/main/detail/3344852563ea4bdab57aca179b42f723
sourceName: 牛客
---

## 这条 JD 在招什么人

把通义千问系列模型做成企业能用的应用的人。阿里这个方向的岗位量在国内属于最大的一档：百炼平台（模型服务与 Agent 开发平台）、钉钉 AI 助手、夸克搜索、各 BU 的知识库问答。共同点是「企业级」三个字：权限、合规、可迁移性、稳定性，这些在互联网 C 端产品里权重没那么高的东西，在这里是主菜。

## 业务场景推测

大概率是企业知识库问答、内部效率工具、或百炼平台的 Agent 编排能力（置信度：中高）。企业场景的标志：JD 里出现「知识库」「权限」「私有化」「行业落地」。如果偏百炼平台本身，考察会更靠近 API 设计与多租户。

## 硬技能：必须会什么

- RAG 完整流程：文档解析、分块、Embedding、混合检索、重排、引用溯源
- 企业 RAG 的坑：权限进检索链路、知识库增量更新、多知识源融合
- Agent 基础：工具调用（阿里系对 MCP 生态投入重，MCP 是必考）、编排
- 评测：RAG 效果指标、评测集建设、Trace 数据记录
- 后端：Java 或 Python、分布式服务、消息队列（企业集成常见）

## 加分项：什么能拉开差距

- 完整做过一个企业知识库项目：能讲清文档权限怎么带进检索、更新延迟怎么控制
- 对 MCP 有工程级理解：能答「MCP 能不能成为行业标准」并给出理由
- 评测系统设计经验：不止跑分，有 Trace、有归因、有回归
- 模型迁移经验：深度用了某家 API 之后怎么避免被绑死

## JD 没写但面试会问

- 企业知识库 RAG 落地最常见的坑（这是阿里系高频题）
- RAG 检索不准从哪一步开始排查
- 文档权限怎么带进检索链路
- 知识库更新了，答案还是旧的怎么办
- Agent 评测系统怎么设计、Trace 要记哪些字段

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | LLM 基本概念、Embedding 原理 | 能讲清向量检索为什么有用 |
| 工程层 | 后端服务、数据库、队列 | 有集成类项目经验 |
| Agent 层 | RAG 完整流程 + 工具调用 | 链路每一步都能答出坑 |
| 业务层 | 权限/合规/评测/迁移 | 至少有一块有实操 |

## 简历怎么改

- RAG 项目别只写「搭建了知识库问答」：写文档规模、检索方案（几路召回、有没有重排）、效果指标（召回率/忠实度）、badcase 处理
- 企业向经历（权限、审计、私有化）单独点出来，这是阿里这个方向的区分度
- 有 Trace/评测相关的一定要写，应用岗最缺这个

## 项目建议

- 企业知识库 RAG 助手：带权限过滤、增量更新、引用溯源（站内有完整[项目面试包](/roadmap/agent-developer)）
- RAG 检索方法对比评测：多路召回 + 重排消融，出 Pareto 图
- 用[项目匹配器](/tools/project-matcher)按基础和时间拿方案

## 准备计划

- 7 天：RAG 链路 + 企业坑两块题库速答过一遍；项目经历按链路复述法重写
- 21 天：补评测与 MCP；做一个带权限和评测集的 RAG 小项目；[简历体检](/tools/resume)跑一遍按缺口改
- 45 天：走 [RAG 工程师学习路线](/roadmap/rag-engineer)，重点章节过两遍
