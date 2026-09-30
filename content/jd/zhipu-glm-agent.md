---
slug: glm-agent
company: zhipu
title: 智谱 · GLM Agent 开发（AutoGLM/开放平台）
role: Agent 应用开发
family: agent-app
level: 校招 / 社招 1-3 年
summary: 围绕 GLM 系列做 Agent 基座与开放平台：工具调用、AutoGLM 场景落地与企业交付工程。
cats: [tooluse, agent, enterprise]
qaSlugs: [what-is-function-calling, function-calling-principle, tool-schema-design, mcp-what-and-core, fc-vs-mcp-when, agent-evaluation, enterprise-rag-pitfalls, agent-delivery-risk]
keywords: [智谱 Agent 开发, AutoGLM 面试, 智谱开放平台, GLM 工具调用]
updated: 2026-09-29
sourceUrl: https://zhipu-ai.jobs.feishu.cn/s/yd6wXPXy0fQ
sourceName: 智谱官方飞书招聘
---

## 这条 JD 在招什么人

把 GLM 系列模型的 Agent 能力做厚并交付出去的工程师。智谱这条线有两层：基座侧（AutoGLM 这类面向任务执行的 Agent 能力，工具调用是核心）和平台侧（智谱开放平台，API、工具生态、企业接入）。JD 里出现「Agent 基座」「工具调用」「开放平台」「企业客户」，说明既要懂模型怎么学会用工具，也要懂把能力包装成别人能接入的产品。

## 业务场景推测

大概率分两块：AutoGLM 方向的任务执行场景（对话助手、手机/电脑操作），或开放平台方向的企业 Agent 接入与私有化交付（置信度：中，两条线在公开 JD 里都出现过）。GLM 系列模型权重开放，外部团队基于它做二次开发的不少，这部分使用者的接入问题也可能落在这条线的服务范围里。企业交付的特点：环境封闭、验收标准明确、出问题要能回滚。

## 硬技能：必须会什么

- 工具调用原理：模型怎么学会调工具、训练数据长什么样（[原理题](/interview/qa/how-llm-learns-tool-calling)）
- Schema 设计：参数描述怎么写调用准确率才高、工具多了怎么路由
- 协议层：Function Calling 与 MCP 的取舍、MCP 的组件与传输（[FC vs MCP](/interview/qa/fc-vs-mcp-when)）
- Agent 编排：ReAct、规划、多步任务的状态管理
- 企业交付：私有化部署、权限、数据合规、回滚机制（[交付风险](/interview/qa/agent-delivery-risk)）
- 评测：Agent 任务成功率怎么定义、评测集怎么建

## 加分项：什么能拉开差距

- 读过 AutoGLM/GLM 相关论文或技术报告，能讲清它的任务分解与执行策略
- 做过开放平台的工具或插件：Schema 设计、版本管理、兼容性处理有实操
- 企业项目交付经验：验收指标、灰度、回滚、坏例响应流程
- 手机/电脑操作类 Agent 的技术判断：屏幕理解、动作空间、安全边界

## JD 没写但面试会问

- FC 和 MCP 怎么选型（企业接入场景必聊）
- 工具描述写得好和差对准确率影响多大，怎么改
- Agent 任务失败怎么定位：模型没学会、工具不好用还是任务超纲
- 企业客户要私有化，架构上要动哪些东西
- 你的项目换个模型或换个工具集还能跑吗，迁移成本在哪

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer、工具调用原理 | 训练与推理两侧都能讲 |
| 工程层 | API 设计、Schema、后端服务 | 有平台或插件实操 |
| Agent 层 | 编排、任务执行、评测 | 能答失败定位链路 |
| 业务层 | 企业交付、合规、回滚 | 至少一块有实操 |

## 简历怎么改

- 工具调用类经历补准确率数字和优化手段（改 Schema、改路由、加 few-shot）
- 平台类经历写清服务对象：多少开发者或企业、接口形态、兼容性怎么处理
- 论文阅读别只列标题：写清读了什么、哪部分进了你的设计
- 企业交付经历单列一段：验收标准、上线过程、出过什么问题怎么处理

## 项目建议

- 工具调用优化实验：同一批任务，改工具描述、加路由、换模型三组对比，量化准确率
- 屏幕操作 Agent demo：截图理解 + 动作执行，重点做失败兜底与权限边界
- 用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：工具调用与 MCP [题库速答](/interview/qa)；把 AutoGLM 的公开材料读一遍记要点
- 21 天：做一个带评测集的 Agent 小项目；补企业交付知识；[简历体检](/tools/resume)
- 45 天：完整走 [Agent 应用开发学习路线](/roadmap/agent-developer)，工具调用章节过两遍，模拟面试三轮以上
