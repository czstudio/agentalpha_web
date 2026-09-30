---
slug: llm-algo
company: didi
title: 滴滴 · 大模型算法工程师
role: 大模型算法
family: llm-algo
level: 校招 / 社招 1-3 年
summary: 以后训练（SFT/RL）为主的大模型算法岗：GRPO 考得深，损失函数、KL 估计、熵坍塌层层下钻。
cats: [finetune, basics]
qaSlugs: [what-is-grpo, grpo-improvements, grpo-training-metrics, dpo-vs-ppo, gae-critic-ppo, sft-to-rl-switch, agentic-rl-vs-sft, catastrophic-forgetting]
keywords: [滴滴大模型算法, GRPO 面试, RLHF 后训练, 滴滴算法岗]
updated: 2026-09-29
sourceUrl: https://talent.didiglobal.com/
sourceName: 滴滴招聘官网（列表入口）
---

## 这条 JD 在招什么人

做模型后训练的算法工程师：SFT、RLHF/GRPO、蒸馏这条链。滴滴站内面经里这个方向以 GRPO 全家桶著称——损失函数手写、KL 估计、熵坍塌、训练监控指标，一层层往下问，答漏一层就露底。追问是一条长链：从 GRPO 损失形式，到 KL 估计器的选择，再到熵坍塌的判读与处理，一路问到底，中途换题的余地很小。岗位要求不只是会用训练框架：每个公式的每一项含义、每个训练指标异常背后的原因，都要能解释。应用场景大概率与出行域相关（客服、地图、司乘对话），但考察重心在算法本身。

## 业务场景推测

大概率是出行场景的模型后训练：客服对话、意图理解、或司乘相关文本任务的 SFT 与 RL 对齐（置信度：中）。地图与路线相关文本（地址、导航指令、司乘沟通记录）也可能是训练任务来源。大规模分布式训练的工程细节不是这个岗的重心，但看得懂训练日志、判断得出训练是否健康，是底线要求。出行域数据的特点：口语化严重、地点与时间实体密集、安全类话术零容忍。

## 硬技能：必须会什么

- RL 后训练：GRPO 原理（[GRPO 是什么](/interview/qa/what-is-grpo)）、与 PPO 的差异（去掉 critic、组内相对优势）
- 损失函数细节：GRPO 损失手写、KL 的估计方式（估计器怎么选会被追问）
- 训练监控：奖励、熵、KL 这些曲线怎么看、异常怎么诊断（[训练指标](/interview/qa/grpo-training-metrics)）
- SFT 基本功：数据构造、灾难性遗忘的应对（[遗忘](/interview/qa/catastrophic-forgetting)）
- 对齐方法版图：PPO/DPO/GRPO 的取舍（[DPO vs PPO](/interview/qa/dpo-vs-ppo)）
- 基础底子：Transformer、交叉熵、采样参数，公式级掌握

## 加分项：什么能拉开差距

- 独立跑通过开源 RL 训练（TRL、verl 任一），能展示训练曲线与调参过程
- 熵坍塌、奖励 hacking 这类训练病态有亲手处理经验
- 能讲清 GRPO 对 PPO 的改进点及各自的失效场景（[改进](/interview/qa/grpo-improvements)）
- 数学表达干净：白板推导不卡壳

## JD 没写但面试会问

- 手写 GRPO 损失函数并解释每一项（滴滴面经高频）
- GRPO 里 KL 怎么估计、为什么这么估
- 训练中熵快速掉到零说明什么、怎么救（滴滴面经反复考）
- 奖励曲线正常但评测掉分，可能哪里出了问题
- 什么任务 SFT 就够、什么任务必须上 RL（[切换时机](/interview/qa/sft-to-rl-switch)）

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer、损失函数、采样 | 公式级，能手推 |
| 训练层 | SFT 数据与流程 | 独立跑通过完整训练 |
| RL 层 | GRPO/PPO/DPO、KL、熵 | 每个细节答得出为什么 |
| 诊断层 | 训练指标解读、病态处理 | 有曲线有案例 |

## 简历怎么改

- 训练经历写「配置-指标-结论」三件套：数据规模、超参、曲线变化、最终效果
- RL 经历别只写「用了 GRPO」：写清 reward 设计、遇到的病态、怎么调的
- 数学功底显式举证（竞赛、推导笔记、博客）
- 出行、对话、地图相关数据经验前置

## 项目建议

- 小模型 RL 复现：用 Qwen 小模型 + GRPO 跑一个数学任务，记录熵、KL、奖励三条曲线并分析
- SFT 数据消融：不同数据配比下的效果与遗忘对比
- 用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：GRPO 全家桶[题库速答](/interview/qa)过两遍；损失函数与 KL 估计手写过关
- 21 天：跑一个小模型 RL 复现项目并保留训练曲线；[简历体检](/tools/resume)
- 45 天：RL 训练监控与病态诊断专题补齐，模拟面试三轮以上，每轮包含手推环节
