---
slug: bailian-agent
company: alibaba
title: 阿里 · 百炼大模型平台（Agent 方向）
role: Agent 平台研发
family: agent-app
level: 校招 / 社招 1-3 年
summary: 阿里百炼 Agent 方向岗：面试围绕 Agent 编排与状态管理、企业工具链、低代码平台与代码框架选型展开，重工程落地。
cats: [agent, tooluse, basics]
qaSlugs: [what-is-agent, workflow-vs-agent, agent-loop, agent-planning, multi-turn-state-recovery, dify-vs-code-framework, langgraph-checkpoint-and-human-loop, mcp-vs-function-calling, tool-schema-design, agent-evaluation]
keywords: [阿里百炼面试, 百炼 Agent 面试, Agent 平台研发面试, Qwen 生态]
updated: 2026-10-01
sourceUrl: https://talent.alibaba.com/
sourceName: 阿里巴巴集团招聘官网（列表入口）
---

## 这条 JD 在招什么人

百炼是阿里云的大模型服务平台，Agent 方向做的是把模型、工具、知识库编排成企业能用的智能体。考察点按公开 JD 与面经的高频归纳，集中在三块：Agent 的编排与状态管理、工具链工程、企业场景落地。它要求你既懂 Agent 的原理边界，也能把低代码平台和代码框架的取舍讲清楚——企业客户的诉求五花八门，选型判断是日常。

## 业务场景推测

大概率是百炼平台的 Agent 应用与工具链方向：企业智能体的编排服务、模型与工具的组合方案、通义/Qwen 系模型的接入适配（置信度：中，基于公开业务布局推断）。钉钉等集团内场景的 Agent 落地也可能共用这套平台能力（置信度：低，基于公开产品形态推断）。

## 硬技能：必须会什么

- Agent 原理：什么是 Agent、能力和边界在哪（[Agent 是什么](/interview/qa/what-is-agent)）、与固定工作流的区别（[workflow vs Agent](/interview/qa/workflow-vs-agent)）
- 编排与状态：循环控制与退出条件（[Agent 循环](/interview/qa/agent-loop)）、任务规划（[Agent 规划](/interview/qa/agent-planning)）、执行中断后怎么恢复（[多轮状态恢复](/interview/qa/multi-turn-state-recovery)）
- 工具链：工具 schema 怎么设计（[工具 Schema 设计](/interview/qa/tool-schema-design)）、MCP 与 Function Calling 怎么选（[MCP 与 Function Calling](/interview/qa/mcp-vs-function-calling)）
- 平台选型：低代码平台与代码框架的差异（[Dify 与代码框架](/interview/qa/dify-vs-code-framework)）、长流程的检查点与人工介入（[LangGraph 检查点与人工介入](/interview/qa/langgraph-checkpoint-and-human-loop)）
- 评测：Agent 效果怎么评（[Agent 评测](/interview/qa/agent-evaluation)）
- 工程功底：Python 服务开发、异步与并发

## 加分项：什么能拉开差距

- 用 LangGraph/Dify 搭过企业级 Agent，踩过编排与状态恢复的坑
- 做过企业知识库接入：文档解析、分块、权限这一整套
- 有工具调用准确率的优化经历：描述怎么写、schema 怎么收紧
- 熟悉 Qwen 系模型的特点，能讲清不同尺寸模型的适用场景

## JD 没写但面试会问

- Agent 执行到一半挂了，怎么从检查点恢复而不是重跑（高频）
- 什么任务该用固定 workflow、什么该放开给 Agent 自主规划
- 企业要求关键操作人工审核，检查点与审批流怎么设计
- 工具一多模型就选错，怎么优化
- Agent 的评测怎么做，线上和离线分别看什么
- 低代码搭的还是代码写的，两种方案的边界在哪

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | 模型 API、提示词、上下文 | 熟练使用 |
| Agent 层 | 循环、规划、状态管理 | 做过完整实现 |
| 工具层 | schema、MCP、调用准确率 | 有优化经历 |
| 平台层 | 低代码与代码框架选型 | 讲得出取舍 |
| 评测层 | Agent 评测与回归 | 建过指标 |

## 简历怎么改

- Agent 经历写清编排方式与规模：几个节点、几种工具、多少轮
- 「做过 RAG」换成检索命中率与端到端准确率的变化数字
- 平台选型写明理由：为什么用这个框架、放弃了什么
- 状态恢复与失败处理单独写，企业场景这块是必问点

## 项目建议

- 做一个带检查点的多步 Agent：工具失败能从断点恢复，记录恢复成功率
- 同一个任务分别用低代码平台与代码框架实现，写一份选型对比
- 阿里全部方向的题库见[阿里巴巴公司聚合页](/interview/company/alibaba)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：Agent 原理与工具调用[题库速答](/interview/qa)过两遍；workflow 与 Agent 的边界要能一口气讲清，同步刷[阿里巴巴公司聚合页](/interview/company/alibaba)的面经题
- 21 天：完成带检查点的 Agent 项目并统计恢复指标；[简历体检](/tools/resume)
- 45 天：完整走 [Agent 开发路线](/roadmap/agent-developer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
