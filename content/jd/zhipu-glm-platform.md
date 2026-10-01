---
slug: glm-platform
company: zhipu
title: 智谱 · GLM 大模型平台工程
role: 大模型平台工程师
family: ai-infra
level: 校招 / 社招 1-3 年
summary: 智谱 GLM 平台工程岗：面试围绕 GLM 系列 API 服务、LoRA 微调与 SFT 数据准备、推理加速与模型评测展开，推理与训练并重。
cats: [inference, finetune, eval]
qaSlugs: [what-is-lora, lora-rank, sft-data-preparation, finetune-vs-prompt, catastrophic-forgetting, vllm-why-fast, continuous-batching, what-is-quantization, llm-as-judge, llm-benchmarks]
keywords: [智谱面试, GLM 平台工程师, 大模型微调面试, 推理加速]
updated: 2026-10-01
sourceUrl: https://zhipu-ai.jobs.feishu.cn/
sourceName: 智谱官方飞书招聘（列表入口）
---

## 这条 JD 在招什么人

智谱的大模型平台工程方向，围绕 GLM 系列模型的开放平台做三件事：把模型服务成稳定的 API、给企业客户提供微调与定制能力、把推理跑得更快更便宜。考察点按公开 JD 与面经的高频归纳，横跨推理与训练两条线：既要懂 serving 侧的调度与量化，也要懂微调侧的数据与训练流程。评测是第三块——平台上的模型变更是不是变好了，要有数字说话。

## 业务场景推测

大概率是开放平台的推理服务与微调服务两条线：API 的高并发服务、企业客户微调任务的托管与调优（置信度：中，基于公开业务布局推断）。GLM 开源版本的社区反馈处理可能与平台工作交叉（置信度：低，基于公开社区动态推断）。

## 硬技能：必须会什么

- 微调：LoRA 原理（[LoRA](/interview/qa/what-is-lora)）、秩怎么选（[LoRA 秩](/interview/qa/lora-rank)）、SFT 数据怎么准备（[SFT 数据准备](/interview/qa/sft-data-preparation)）
- 训练诊断：灾难性遗忘怎么防（[灾难性遗忘](/interview/qa/catastrophic-forgetting)）、什么时候微调而不是调提示词（[微调还是提示词](/interview/qa/finetune-vs-prompt)）
- 推理：vLLM 为什么快（[vLLM 为什么快](/interview/qa/vllm-why-fast)）、批调度（[continuous batching](/interview/qa/continuous-batching)）、量化方案（[量化](/interview/qa/what-is-quantization)）
- 评测：常用基准与局限（[LLM 基准](/interview/qa/llm-benchmarks)）、模型当裁判怎么做（[LLM as Judge](/interview/qa/llm-as-judge)）
- 工程功底：GPU 资源管理、多租户服务开发

## 加分项：什么能拉开差距

- 跑过完整的客户微调项目：数据清洗、训练、评测、上线
- 有推理成本核算经历：一张卡能服务多少并发、单 token 成本多少
- 给开源推理或训练框架提过 PR
- 熟悉 GLM 系列开源版本的差异与适用场景

## JD 没写但面试会问

- 客户数据只有几千条，SFT、LoRA 还是直接提示词（高频）
- 微调后通用能力掉了，怎么定位与缓解
- LoRA 秩选大还是选小，分别什么时候出问题
- 量化后的模型和原模型，评测分数怎么对齐比较
- 多个客户的微调模型怎么混部，显存怎么隔离
- 离线评测分数和线上体验对不上怎么办

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 推理层 | 批调度、量化、显存管理 | 每个机制讲得出实现 |
| 微调层 | LoRA、SFT 数据、遗忘缓解 | 跑过完整流程 |
| 评测层 | 基准、裁判模型 | 建过评测方案 |
| 服务层 | 多租户、配额、监控 | 有工程化意识 |
| 基础层 | Transformer、训练流程 | 能推导关键环节 |

## 简历怎么改

- 微调项目写完整流程的数字：数据量、训练成本、评测提升、线上效果
- 推理经历带指标：吞吐、时延、显存占用
- 「了解 LoRA」换成具体实验：秩与学习率的对比结果
- 评测体系搭建经历单独写，平台岗对「怎么证明变好了」敏感

## 项目建议

- 用 LoRA 微调一个开源小模型，从数据准备到评测走完整流程，记录每步数字
- 对同一模型做量化前后的基准对比，整理质量-成本曲线
- 智谱全部方向的题库见[智谱公司聚合页](/interview/company/zhipu)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：LoRA 与批调度[题库速答](/interview/qa)过两遍；微调与推理的高频题各吃透一串，同步刷[智谱公司聚合页](/interview/company/zhipu)的面经题
- 21 天：跑完微调完整流程项目并建立评测表；[简历体检](/tools/resume)
- 45 天：完整走 [AI Infra 学习路线](/roadmap/ai-infra)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
