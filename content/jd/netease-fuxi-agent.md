---
slug: fuxi-agent
company: netease
title: 网易伏羲 · 游戏 AI Agent
role: 游戏 AI Agent 开发
family: agent-app
level: 校招 / 社招 1-3 年
summary: 网易伏羲游戏 AI Agent 岗：NPC 智能与机器人 Agent 并重，循环控制、多轮状态、工具设计是主线，AIGC 生成作加试。
cats: [agent, basics, tooluse]
qaSlugs: [what-is-agent, agent-loop, agent-paradigm, gui-agent-design, multi-turn-state-recovery, agent-evaluation, workflow-vs-agent, what-is-function-calling, tool-schema-design, what-is-transformer]
keywords: [网易伏羲面试, 游戏 AI, NPC Agent, 网易大模型]
updated: 2026-09-30
sourceUrl: https://hr.163.com/
sourceName: 网易招聘官网（列表入口）
---

## 这条 JD 在招什么人

网易伏羲是网易的游戏 AI 团队，这条 JD 招的是游戏场景里的 Agent 开发：游戏 NPC 的对话与行为智能、机器人 Agent、以及 AIGC 玩法内容生成。考察口径来自公开 JD 与面经的高频归纳：Agent 基本概念与循环控制是主线，游戏特有的多轮对话状态、NPC 行为决策混在里面问。和通用 Agent 岗的差异在于「玩家」这个变量：输入随口、噪声大、还要求不破坏游戏体验，延迟与成本约束也比办公场景紧。

## 业务场景推测

大概率三类：一是 RPG 类游戏 NPC 的智能对话，接大模型做多轮角色扮演与任务引导；二是瑶台这类虚拟活动场景里的机器人 Agent，做接待、引导与协同；三是玩法侧的 AIGC 内容生成，剧情、对话、关卡的辅助生产（置信度：中，基于公开业务布局推断）。NPC 对话的特点是长会话加人设一致性：一个 NPC 聊几十轮不能跳出角色，这和通用助手的状态管理是两类问题（置信度：低，基于公开业务布局推断）。

## 硬技能：必须会什么

- Agent 基础：Agent 与 workflow 的边界、范式怎么选（[Agent 是什么](/interview/qa/what-is-agent)、[Agent 范式](/interview/qa/agent-paradigm)、[Workflow 与 Agent](/interview/qa/workflow-vs-agent)）
- 循环控制：Agent 循环的退出条件、轮数与成本控制（[Agent 循环](/interview/qa/agent-loop)）
- 多轮状态：NPC 长对话的状态恢复与人设一致性（[多轮状态恢复](/interview/qa/multi-turn-state-recovery)）
- 工具调用：原理与 schema 设计，游戏内动作怎么暴露给模型（[Function Calling](/interview/qa/what-is-function-calling)、[工具 Schema 设计](/interview/qa/tool-schema-design)）
- 机器人 Agent：GUI Agent 的感知与操作全流程（[GUI Agent 设计](/interview/qa/gui-agent-design)）
- 评测：Agent 效果怎么量化、NPC 行为怎么回归（[Agent 评测](/interview/qa/agent-evaluation)）
- 模型与工程底子：Transformer 结构讲得清（[Transformer](/interview/qa/what-is-transformer)），Python 与游戏服务端或引擎侧至少一门扎实

## 加分项：什么能拉开差距

- 游戏开发背景：了解引擎（Unity/UE）或服务端玩法逻辑，能把 Agent 接进真实玩法
- 长角色扮演对话的一致性方案：人设约束、记忆压缩、出戏检测有实践
- AIGC 内容生成的落地经验：生成内容的可控性与审核流程
- 玩过并且能拆解市面上的 AI 玩法（智能 NPC、AI 队友），说得出哪里好哪里烂

## JD 没写但面试会问

- NPC 聊了三十轮后人设崩了、开始复读，怎么定位怎么治（高频）
- 游戏里 NPC 行为原本是个大状态机，Agent 决策和状态机怎么分工
- 玩家故意诱导 NPC 说不该说的话，防线在哪
- Agent 循环一多延迟就爆，游戏内实时对话的延迟预算怎么给
- 工具 schema 怎么设计，模型老是调错动作怎么办
- 怎么证明这版 NPC 比上一版好：评测集怎么建、自动评测怎么搭

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer、提示词、采样参数 | 讲得清结构与参数含义 |
| Agent 层 | 循环、工具、多轮状态 | 做过完整 NPC 或助手实现 |
| 游戏层 | 玩法接入、延迟与人设约束 | 有游戏侧工程经验 |
| 评测层 | 行为评测与回归 | 建过评测集 |

## 简历怎么改

- NPC 或对话 Agent 经历写清：对话轮数规模、人设一致性怎么保、延迟多少
- 「用过 LangChain」这类表述换成具体机制与取舍
- 游戏项目经验前置：引擎、服务端、玩法逻辑任一都值钱
- AIGC 生成经历重点写可控性：怎么约束输出、怎么审核

## 项目建议

- 角色扮演 NPC：固定人设加任务引导，重点做三十轮以上的人设一致性与出戏检测，配一个小评测集
- 玩法辅助 Agent：把游戏动作封装成工具，做循环控制与失败兜底
- 网易全部方向的题库见[网易公司聚合页](/interview/company/netease)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：Agent 循环与工具调用[题库速答](/interview/qa)过两遍；循环退出条件练到能白板画图
- 21 天：做一个角色扮演 NPC 项目并建评测集；[简历体检](/tools/resume)
- 45 天：完整走[Agent 开发学习路线](/roadmap/agent-developer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
