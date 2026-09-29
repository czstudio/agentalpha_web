---
slug: llm-infra
company: deepseek
title: DeepSeek · 推理/Infra 工程师
role: AI Infra
family: ai-infra
level: 校招 / 社招 1-3 年
summary: 围绕 DeepSeek 开源模型做推理部署与性能优化：MLA、MoE、KV Cache、量化与 serving 优化。
cats: [inference, basics]
qaSlugs: [what-are-gqa-mqa-mla, what-is-kv-cache, kv-cache-quantization, vllm-why-fast, continuous-batching, speculative-decoding-engineering, moe-load-balance, what-is-pd-disaggregation]
keywords: [DeepSeek Infra 面试, DeepSeek 推理优化, MLA KV Cache, 大模型推理工程师]
updated: 2026-09-29
---

## 这条 JD 在招什么人

把大模型跑得更快、更便宜的工程师。方向包括推理引擎（解码、采样、批调度）、显存与带宽优化（KV Cache、量化）、并行策略（TP/PP/EP）。DeepSeek 的特点：模型本身开源（MoE + MLA 架构），推理侧的优化会直接反映到公开技术报告和开源社区里。JD 里出现「推理框架」「serving」「算子优化」「CUDA」这类词，说明要的是能读懂模型结构再动手改系统的人，不是只会部署 vLLM 的人。另一个信号是开源：模型权重和技术报告都公开，社区里大量开发者在用、在复现、在报 issue，这些反馈是这个岗位日常要处理的输入。面试常拿公开的技术点直接出题，读没读过报告，几个回合就问得出来。

## 业务场景推测

大概率是自研推理服务的迭代：MLA 的显存优化、MoE 的负载均衡、投机解码、PD 分离这些方向；也可能包含开源社区维护与 API 服务的成本优化（置信度：中，基于公开技术报告与 JD 共性推断）。推理成本直接关系到 API 的定价空间，这个岗位的产出能直接算成钱，考核因此偏硬指标：吞吐、延迟、单 token 成本。

## 硬技能：必须会什么

- Transformer 推理细节：自回归解码、KV Cache 命中与失效、为什么缓存 KV 不缓存 Q（[真题](/interview/qa/why-cache-kv-not-q)）
- 注意力变体：MHA/MQA/GQA/MLA 的取舍（[MLA 对 KV Cache 的影响](/interview/qa/what-are-gqa-mqa-mla)）
- 推理引擎：vLLM 为什么快（PagedAttention、continuous batching）、调度与抢占
- 量化：KV Cache 量化、权重量化（INT8/FP8），精度损失怎么测
- GPU 底层：显存构成估算、算力/带宽瓶颈判断（roofline）、CUDA 编程基础
- 训练侧常识：并行策略（TP/PP/DP/EP）、MoE 负载均衡

## 加分项：什么能拉开差距

- 读过 DeepSeek-V2/V3 技术报告，能把 MLA、PD 分离这些点讲成实现细节
- 有开源贡献：给 vLLM/SGLang 提过 PR，或自己写过 attention kernel
- 成本意识：能算清某场景换 MLA、量化、PD 分离后单 token 成本怎么变
- 投机解码、prefix caching 的实战调参经验

## JD 没写但面试会问

- MLA 为什么能压 KV Cache、压缩比多少、对质量有没有影响（高频）
- continuous batching 和静态批处理的具体区别
- MoE 的负载均衡怎么做、expert 并行下通信开销在哪
- TTFT 和解码速度分别被什么限制、怎么分别优化
- 给一张卡和一个模型，显存怎么估、放不放得下

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer、自回归、KV Cache | 能画推理时的数据流 |
| 系统层 | 批调度、显存管理、并行策略 | 每个机制能讲实现 |
| 优化层 | 量化、投机解码、PD 分离 | 有数字（延迟/吞吐/精度） |
| 社区层 | 技术报告、开源代码、issue | 读过原文，能复述细节 |

## 简历怎么改

- 推理优化经历必须带数字：吞吐提升多少、TTFT 降了多少、显存省了多少、精度掉了几个点
- 「熟悉 vLLM」换成「基于 vLLM 做了 X 改动，解决了 Y 瓶颈，指标 Z」
- 开源贡献单列：PR 链接、被合并的 commit
- 模型结构理解和系统优化分开写，两边的深度都要能经得住追问

## 项目建议

- 推理引擎对比评测：vLLM/SGLang/原生 HF 在同模型同卡下的吞吐-延迟曲线，量化前后精度对比
- KV Cache 专项：开/关 prefix caching、KV 量化三档实验，测命中率与质量影响
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：KV Cache、MLA、批调度三块[题库速答](/interview/qa)；把 vLLM 为什么快一题吃透到调度器层面
- 21 天：补量化与并行策略；跑一个小型推理基准项目；简历过一遍[体检](/tools/resume)
- 45 天：完整走 [AI Infra 学习路线](/roadmap/ai-infra)，读两篇 DeepSeek 技术报告并写笔记，模拟面试三轮以上
