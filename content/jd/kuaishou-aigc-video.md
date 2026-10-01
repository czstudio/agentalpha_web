---
slug: aigc-video
company: kuaishou
title: 快手 · 可灵与 AIGC 应用
role: AIGC 应用工程师
family: agent-app
level: 校招 / 社招 1-3 年
summary: 快手 AIGC 应用岗：面试围绕视频生成应用层、创作工具的 Agent 化编排、内容安全审核展开，长任务工程与产品落地题多。
cats: [agent, basics, tooluse]
qaSlugs: [agent-loop, workflow-vs-agent, agent-planning, agent-parallel-tools, diffusion-training-inference, flow-matching-vs-diffusion, vae-latent-diffusion, agent-streaming-ux, tool-failure]
keywords: [快手可灵面试, AIGC 应用工程师, 视频生成面试, 创作工具 Agent]
updated: 2026-10-01
sourceUrl: https://campus.kuaishou.cn/
sourceName: 快手官网（列表入口）
---

## 这条 JD 在招什么人

快手的 AIGC 应用方向，围绕可灵这类视频生成产品做应用层：生成能力的工程封装、创作工具的 Agent 化编排、生成内容的安全审核链路。考察点按公开 JD 与面经的高频归纳，集中在两块：一是对扩散类生成模型的基本原理要懂（不用会训，但要能讲清管线），二是把生成能力编排成产品功能的工程能力——任务队列、并行调用、失败重试、流式反馈这些。

## 业务场景推测

大概率是可灵的应用层与站内创作工具：视频生成的任务调度与产品化、图文到视频的创作辅助、生成内容的合规审核（置信度：中，基于公开业务布局推断）。短视频生产管线的 AI 化改造也可能是这个方向的一部分（置信度：低，基于公开产品形态推断）。

## 硬技能：必须会什么

- 生成模型原理：扩散模型的训练与推理（[扩散训练与推理](/interview/qa/diffusion-training-inference)）、流匹配与扩散的关系（[流匹配与扩散](/interview/qa/flow-matching-vs-diffusion)）、潜空间与 VAE（[VAE 潜空间](/interview/qa/vae-latent-diffusion)）
- Agent 编排：循环控制（[Agent 循环](/interview/qa/agent-loop)）、任务规划（[Agent 规划](/interview/qa/agent-planning)）、并行调用（[并行工具](/interview/qa/agent-parallel-tools)）、什么任务交给固定流程（[workflow vs Agent](/interview/qa/workflow-vs-agent)）
- 交互与工程：流式与异步的体验设计（[流式体验](/interview/qa/agent-streaming-ux)）、失败处理（[工具失败](/interview/qa/tool-failure)）
- 工程功底：异步任务队列、长耗时任务的进度反馈

## 加分项：什么能拉开差距

- 用过 ComfyUI 或类似管线工具，懂视频生成的参数空间
- 做过 AIGC 内容的审核或水印方案
- 有视频/图像处理基础：分辨率、帧率、编码格式这些约束
- 做过长耗时生成任务的排队与进度产品

## JD 没写但面试会问

- 一次生成要几十秒，等待体验怎么设计（高频）
- 批量生成任务怎么调度，失败的任务怎么重试不重复扣费
- 生成内容违反社区规范，在管线哪一层拦最合适
- 用户上传素材的合规检查与生成管线怎么衔接
- 固定模板流程和 Agent 自主编排，创作工具里各适合什么场景
- 生成质量不稳定，应用层能做什么补救

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 生成层 | 扩散/流匹配原理、管线参数 | 讲得出机制 |
| Agent 层 | 编排、并行、失败重试 | 做过完整实现 |
| 体验层 | 流式反馈、长任务交互 | 有产品级思考 |
| 安全层 | 内容审核、合规链路 | 有方案级意识 |

## 简历怎么改

- AIGC 项目写清生成链路与参数：什么模型、什么管线、什么约束
- 「做过 Agent」换成具体编排设计：任务拆分、并行策略、失败恢复
- 有内容安全或审核经历要单独写，短视频平台这是硬需求
- 交互与体验的改进写量化结果：完成率、等待流失

## 项目建议

- 做一个文生视频任务编排 Demo：队列、并行、重试、进度推送，统计成功率与时延
- 给生成结果搭一个轻量审核链路：规则前置加模型后置，记录拦截分布
- 快手全部方向的题库见[快手公司聚合页](/interview/company/kuaishou)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：Agent 编排与生成模型原理[题库速答](/interview/qa)过两遍；扩散与流匹配的关系要能画图讲清，同步刷[快手公司聚合页](/interview/company/kuaishou)的面经题
- 21 天：完成任务编排项目并建立成功率与时延指标；[简历体检](/tools/resume)
- 45 天：完整走 [Agent 开发路线](/roadmap/agent-developer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
