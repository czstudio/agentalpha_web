---
slug: nomi-voice
company: nio
title: 蔚来 · 车载 AI Agent（NOMI 方向）
role: 车载语音 Agent 开发
family: agent-app
level: 校招 / 社招 1-3 年
summary: 蔚来车载 Agent 岗：NOMI 语音链路、座舱多模态、端云协同与车载工具调用是高频考点，实时性与兜底追问多。
cats: [agent, tooluse, basics]
qaSlugs: [agent-loop, agent-memory-design, multi-turn-state-recovery, what-is-function-calling, function-calling-accuracy, tool-failure, tool-schema-design, webrtc-for-realtime-voice, agent-streaming-ux]
keywords: [蔚来 AI 面试, 车载 Agent, NOMI, 智能座舱]
updated: 2026-09-30
sourceUrl: https://nio.com/careers
sourceName: 蔚来招聘官网（列表入口）
---

## 这条 JD 在招什么人

蔚来的车载语音 Agent 开发，落点是 NOMI：座舱里的语音助手与多模态交互。这个方向的考察点按公开 JD 与面经的高频归纳，围绕「语音实时链路加车控工具调用」展开。车载场景的约束很硬：驾驶中不能让用户等、指令错了可能影响行车体验，所以时延、打断、失败兜底是面试里追问最密的三块。站内已有一批蔚来车载面经题可以对着练。

## 业务场景推测

大概率是 NOMI 的能力升级：车控指令的自然语言化（空调、车窗、导航、座椅）、多轮对话与主动推荐、座舱内语音加视觉的多模态交互（置信度：中，基于公开业务布局推断）。端云协同链路（端侧做唤醒与简单指令、云端做复杂推理）可能是日常架构（置信度：中，基于公开业务布局推断）。

## 硬技能：必须会什么

- Agent 设计：循环控制与退出条件（[Agent 循环](/interview/qa/agent-loop)）、用户偏好与车辆状态的记忆设计（[Agent 记忆](/interview/qa/agent-memory-design)）
- 多轮对话：驾驶途中上下文断了怎么恢复（[多轮状态恢复](/interview/qa/multi-turn-state-recovery)）
- 车控工具调用：原理与准确率（[Function Calling](/interview/qa/what-is-function-calling)、[调用准确率](/interview/qa/function-calling-accuracy)）、车控接口的参数设计（[工具 Schema 设计](/interview/qa/tool-schema-design)）
- 失败兜底：工具调不通时的降级与告知策略（[工具失败处理](/interview/qa/tool-failure)）
- 实时语音：全双工与低时延传输（[WebRTC 实时语音](/interview/qa/webrtc-for-realtime-voice)）、边生成边播报的交互（[流式体验](/interview/qa/agent-streaming-ux)）
- 座舱多模态：语音、视线、手势多路输入的融合决策意识

## 加分项：什么能拉开差距

- 语音链路经验：ASR、TTS、打断处理、回声消除的工程认知
- 端云分工的实践：哪些指令端侧直接响应、哪些上云、断网怎么办
- 站内面经题先刷：[NOMI 语音助手](/interview/qa/nio-nomi-voice-assistant)、[座舱多模态交互](/interview/qa/nio-cabin-multimodal-interaction)、[车载 Agent 记忆](/interview/qa/nio-vehicle-agent-memory)
- 有车联网或嵌入式开发背景

## JD 没写但面试会问

- 用户话说一半被打断或者自己改口，状态怎么恢复（高频）
- 车控指令识别错了（开成后备箱），防护怎么设计（高频）
- 云端推理要两秒，用户在开车等不了，时延怎么压（蔚来面经方向，见[端云协同](/interview/qa/nio-edge-cloud-driving)与[延迟与安全](/interview/qa/nio-agent-latency-safety)）
- 连续多轮里「到我公司」这种省略指代怎么补全
- 全双工语音链路里，打断和回声怎么处理（见[实时语音链路](/interview/qa/realtime-voice-pipeline)）
- 车上没有屏幕焦点，工具调用结果怎么用语音讲清楚

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | LLM API、提示词、流式 | 熟练使用 |
| 语音层 | 全双工、打断、时延 | 讲得出链路取舍 |
| Agent 层 | 多轮记忆、工具调用 | 做过完整实现 |
| 安全层 | 失败兜底、误触防护 | 有方案级思考 |
| 工程层 | 端云协同、弱网降级 | 有落地或复现经验 |

## 简历怎么改

- 语音或对话经历写清时延数字：端到端多少毫秒、打断响应多少
- 「做过语音助手」换成「实现了 X 轮对话的状态管理与恢复、工具调用准确率多少」
- 车载、嵌入式、实时系统背景显式写，这个岗位对系统层经验敏感
- 项目里补失败场景的处理方式：调不通怎么办、识别错怎么防

## 项目建议

- 做一个车载语音 Agent Demo：语音进、工具调用（导航、天气、日程）、语音出，统计端到端时延与调用准确率
- 加一层打断与恢复：用户改口后任务不重头来，验证多轮状态管理
- 蔚来全部方向的题库见[蔚来公司聚合页](/interview/company/nio)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：多轮对话与工具调用[题库速答](/interview/qa)过两遍；语音链路练到能白板画时延拆解，同步刷[蔚来公司聚合页](/interview/company/nio)的车载面经题
- 21 天：做完车载语音 Agent 项目并建立时延与准确率指标；[简历体检](/tools/resume)
- 45 天：完整走[Agent 开发路线](/roadmap/agent-developer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
