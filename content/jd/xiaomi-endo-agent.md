---
slug: endo-agent
company: xiaomi
title: 小米 · 端侧 AI Agent 开发
role: 端侧 Agent 应用开发
family: agent-app
level: 校招 / 社招 1-3 年
summary: 小米端侧 Agent 开发岗：面试围绕端侧小模型部署、端云协同路由、工具调用准确率与小爱同学多轮对话展开，工程落地题占比高。
cats: [agent, tooluse, inference]
qaSlugs: [agent-loop, agent-memory-design, context-compression-minimal-loss, what-is-function-calling, function-calling-accuracy, model-routing, llm-on-device, what-is-quantization, mcp-transports]
keywords: [小米 AI 面试, 端侧大模型, 小爱同学, 澎湃 OS Agent]
updated: 2026-09-30
sourceUrl: https://job.mi.com/
sourceName: 小米招聘官网（列表入口）
---

## 这条 JD 在招什么人

小米的端侧 AI Agent 开发，落点是「人车家全生态」：小爱同学与澎湃 OS 里的端侧 Agent，覆盖手机、汽车、IoT 三类设备。这个方向的考察点按公开 JD 与面经的高频归纳，集中在三件事上：端侧小模型怎么部署、端侧与云端大模型怎么协同、Agent 怎么调用系统能力。它不是纯 API 调用岗，内存预算、时延、离线兜底这些系统约束会贯穿整个面试。

## 业务场景推测

大概率是小爱同学的 Agent 化升级：系统设置与设备控制的自然语言入口、跨设备任务接续、澎湃 OS 内的场景自动化（置信度：中，基于公开业务布局推断）。汽车座舱与 IoT 设备上的轻量 Agent 可能占一定比重；端侧处理隐私数据、云端处理复杂推理的分工也可能是日常。

## 硬技能：必须会什么

- 端侧部署：小模型上设备的内存与算力估算、量化方案取舍（[端侧大模型](/interview/qa/llm-on-device)、[量化](/interview/qa/what-is-quantization)）
- 端云协同：什么请求留端侧、什么请求上云，失败怎么回退（[模型路由](/interview/qa/model-routing)）
- Agent 设计：循环控制、退出条件、任务拆解（[Agent 循环](/interview/qa/agent-loop)）
- 上下文管理：端侧内存有限，长对话怎么压缩（[上下文压缩](/interview/qa/context-compression-minimal-loss)）、跨设备记忆怎么设计（[Agent 记忆](/interview/qa/agent-memory-design)）
- 工具调用：原理与准确率优化（[Function Calling](/interview/qa/what-is-function-calling)、[调用准确率](/interview/qa/function-calling-accuracy)）、工具协议的传输选型（[MCP 传输](/interview/qa/mcp-transports)）
- 工程功底：Python 与 Android 侧开发基础、时延与功耗的意识

## 加分项：什么能拉开差距

- 有模型量化或端侧推理的实际经验，能讲清精度与体积的权衡
- 做过「简单请求端侧直接响应、复杂请求上云」的双层路由
- 弱网与离线场景的兜底设计：降级、缓存、任务恢复
- 系统能力工具化的经验：把设置、日程、设备控制封装成模型能调的工具

## JD 没写但面试会问

- 端侧模型答不了的复杂问题，怎么决定上云而不是硬答（高频）
- 端侧内存装不下长对话，压缩策略怎么选、丢什么留什么
- 用户说「把客厅灯调暗一点」，工具调用链路怎么走、调错了怎么兜底
- 端侧推理时延高，从量化到 KV Cache 有哪些手段
- 手机和汽车上的 Agent，记忆与工具集怎么隔离或共享
- 离线时 Agent 还能做什么、恢复联网后任务怎么接续（小米面经方向）

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | LLM API、提示词、流式 | 熟练使用 |
| 端侧层 | 量化、内存与算力估算 | 讲得出取舍 |
| Agent 层 | 循环、工具、多轮记忆 | 做过完整实现 |
| 协同层 | 端云路由与降级 | 有方案级思考 |
| 工程层 | 时延、功耗、离线兜底 | 有落地或复现经验 |

## 简历怎么改

- 端侧相关经历写清设备约束：什么机型、多大内存、量化到几比特、时延多少
- 「做过 Agent」换成「实现了端云双层路由、失败回退策略，准确率提升多少」
- 有 Android 或嵌入式背景要显式写，这个岗位对系统层经验敏感
- 项目里补一组对比数字：端侧直出与上云请求的时延差

## 项目建议

- 做一个端侧小模型加云端大模型的双层路由 Demo：意图简单端侧答，复杂上云，记录路由命中率
- 把手机系统能力（闹钟、日程、设置）封装成工具，做多轮任务编排并统计调用准确率
- 小米全部方向的题库见[小米公司聚合页](/interview/company/xiaomi)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：端侧部署与工具调用[题库速答](/interview/qa)过两遍；量化与路由练到能白板画链路，同步刷[小米公司聚合页](/interview/company/xiaomi)的面经题
- 21 天：做完端云双层路由项目并建立时延与准确率指标；[简历体检](/tools/resume)
- 45 天：完整走[Agent 开发路线](/roadmap/agent-developer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
