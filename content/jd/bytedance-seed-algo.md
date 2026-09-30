---
slug: seed-algo
company: bytedance
title: 字节跳动 · Seed 大模型算法
role: 大模型算法
family: llm-algo
level: 校招 / 社招 1-3 年
summary: Seed 方向的后训练算法岗：SFT/RLHF 与数据构造层层下钻，Decoder-only 为什么主流、Agent 遗忘是字节面经高频题。
cats: [finetune, basics]
qaSlugs: [bytedance-decoder-only-why, bytedance-agent-forgetting, what-is-rlhf, sft-data-preparation, agentic-rl-vs-sft, grpo-training-metrics, llm-distillation, why-post-training]
keywords: [字节 Seed 算法, Seed 后训练, 字节大模型算法面试, RLHF 数据构造]
updated: 2026-09-29
sourceUrl: https://jobs.bytedance.com/campus/position/7622891560695793973/detail
sourceName: 字节跳动官网
---

## 这条 JD 在招什么人

Seed 是字节的大模型研发团队，这条 JD 招的是后训练方向的算法工程师：SFT、RLHF、蒸馏，以及喂给这些环节的数据构造。和纯应用算法岗不同，这里要下到训练本身：损失函数怎么写、数据怎么配、训练曲线怎么看。字节这个方向的面试风格是往下钻：从一个概念问到公式，从公式问到异常情况，中途换题的余地小。站内面经里有两道题能代表这个风格：Decoder-only 架构为什么是主流（[Decoder-only 为什么主流](/interview/qa/bytedance-decoder-only-why)）、微调后的 Agent 为什么会忘掉旧能力（[Agent 遗忘](/interview/qa/bytedance-agent-forgetting)）。这两题答不干净，基本过不了。

## 业务场景推测

大概率是豆包与 Seed 系列模型的后训练迭代：指令数据构造、偏好对齐、面向 Agent 能力的 RL 训练；也可能包含为扣子平台和内部业务做定制模型的蒸馏与小模型化（置信度：中高，基于公开业务布局推断）。字节的模型要同时服务 C 端产品和大量内部业务线，后训练数据来源杂、口径多，数据清洗与配比的工作量会比一般公司大，这部分能力大概率是隐性考察点。

## 硬技能：必须会什么

- 后训练流程：SFT、RLHF、DPO/GRPO 各自的适用场景（[RLHF 是什么](/interview/qa/what-is-rlhf)、[为什么要后训练](/interview/qa/why-post-training)）
- 数据构造：指令数据怎么造、怎么洗、怎么配比，坏数据怎么识别（[SFT 数据准备](/interview/qa/sft-data-preparation)）
- 训练监控：奖励、熵、KL 这些曲线怎么看、异常怎么诊断（[训练指标](/interview/qa/grpo-training-metrics)）
- 蒸馏：教师与学生模型的选型、蒸馏损失的设计（[蒸馏](/interview/qa/llm-distillation)）
- 边界判断：什么任务 SFT 就够、什么任务必须上 RL（[RL 与 SFT 的边界](/interview/qa/agentic-rl-vs-sft)）
- 基础底子：Transformer、交叉熵、采样参数，公式级掌握

## 加分项：什么能拉开差距

- 造过高质量指令或偏好数据：有数据规格、有配比实验、有效果对比
- 处理过灾难性遗忘：混入通用数据、调学习率、分阶段训练，有具体数字
- Agent 能力的 RL 训练经验：工具调用、多轮任务上的 reward 设计
- 读过主流模型的技术报告，能讲清别家后训练是怎么做的

## JD 没写但面试会问

- Decoder-only 为什么主流、训练效率高在哪（字节面经高频）
- 微调后模型忘掉旧能力怎么办（字节面经高频）
- SFT 数据多少条够用、质量和数量怎么权衡
- 奖励模型被钻空子了吗、怎么发现的
- 给你一批脏指令数据，处理流程是什么（白板题）

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer、损失函数、采样 | 公式级，能手推 |
| 数据层 | 指令/偏好数据构造与清洗 | 有完整方法论 |
| 训练层 | SFT/RLHF/蒸馏 | 独立跑通过 |
| 诊断层 | 曲线判读、遗忘处理 | 有案例有数字 |

## 简历怎么改

- 训练经历写「数据-配置-指标」三件套：数据规模、超参、效果变化
- 数据工作前置：造数据、洗数据的价值不比调参小，别藏在「其他工作」里
- 写清用什么框架跑了什么任务、遇到什么病态、怎么解决
- 别写「精通 RLHF」：写的每一层都会被往深里问

## 项目建议

- 指令数据配比消融：同一基座不同数据配比，比效果与遗忘程度
- 小模型 RL 复现：记录奖励、熵、KL 三条曲线并写分析
- 字节全部方向的题库见[字节跳动公司聚合页](/interview/company/bytedance)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：后训练[题库速答](/interview/qa)过两遍；Decoder-only、遗忘两道字节高频题准备到公式级
- 21 天：跑一个数据配比或 RL 小项目并保留训练曲线；[简历体检](/tools/resume)
- 45 天：蒸馏与 Agent RL 专题补齐，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
