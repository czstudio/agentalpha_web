---
slug: ark-platform
company: bytedance
title: 字节 · 火山方舟与豆包大模型平台
role: 大模型平台工程师
family: ai-infra
level: 校招 / 社招 1-3 年
summary: 字节火山方舟平台岗：面试围绕豆包大模型 API 服务、推理加速与批调度、模型路由与线上评测展开，平台工程色彩重。
cats: [inference, eval, tooluse]
qaSlugs: [vllm-why-fast, continuous-batching, what-is-pd-disaggregation, what-is-quantization, prefix-caching, ttft-decode-speed, model-routing, model-fallback-chain, llm-as-judge, llmops-monitoring-metrics]
keywords: [火山方舟面试, 豆包大模型平台面试, 字节大模型平台工程师, 推理优化面试]
updated: 2026-10-01
sourceUrl: https://jobs.bytedance.com/
sourceName: 字节跳动招聘官网（列表入口）
---

## 这条 JD 在招什么人

火山方舟是火山引擎的大模型服务平台，对外提供豆包大模型的 API 与企业推理服务。这个岗位做的是平台侧工程：把模型服务成稳定的 API、把推理跑得更快更便宜、把企业客户的接入与落地问题接住。考察点按公开 JD 与面经的高频归纳，集中在推理优化、服务化工程与评测体系三块。它不是算法岗，重点在系统与工程，但对模型推理本身的原理要求不低。

## 业务场景推测

大概率是火山方舟的推理服务与 API 产品线：豆包模型的对外服务、企业专属实例的部署调优、高并发场景的吞吐与成本优化（置信度：中，基于公开业务布局推断）。企业客户的落地支持可能占日常的一部分：接入方案、路由策略、延迟与质量的权衡，都需要平台侧给方案（置信度：低，基于公开产品形态推断）。

## 硬技能：必须会什么

- 推理引擎：vLLM 为什么快、批调度怎么工作（[vLLM 为什么快](/interview/qa/vllm-why-fast)、[continuous batching](/interview/qa/continuous-batching)）
- 服务化：PD 分离的架构与收益（[PD 分离](/interview/qa/what-is-pd-disaggregation)）、前缀缓存（[prefix caching](/interview/qa/prefix-caching)）、首 token 与解码速度分别被什么限制（[TTFT 与解码速度](/interview/qa/ttft-decode-speed)）
- 量化：INT8/FP8 权重与 KV Cache 量化，精度和成本怎么权衡（[量化](/interview/qa/what-is-quantization)）
- 路由与兜底：多模型路由的分流依据（[模型路由](/interview/qa/model-routing)）、失败降级链怎么设计（[降级链](/interview/qa/model-fallback-chain)）
- 评测：模型输出质量怎么自动评（[LLM as Judge](/interview/qa/llm-as-judge)）、服务侧监控看哪些指标（[LLMOps 监控](/interview/qa/llmops-monitoring-metrics)）
- 工程功底：高并发服务开发、GPU 资源调度意识

## 加分项：什么能拉开差距

- 有万级 QPS 推理服务的实际调优经历，能讲清压测方法与瓶颈定位
- 做过企业专属实例或多租户部署，熟悉资源隔离与配额
- 能算清单 token 成本：量化、缓存命中、批大小分别怎么影响账
- 给 vLLM/SGLang 这类开源引擎提过 PR

## JD 没写但面试会问

- 首 token 延迟和逐 token 速度分别被什么限制，先优化哪个看什么场景（高频）
- prefix caching 的命中率怎么估，客服这类重复前缀场景能省多少
- 客户反馈「模型变慢了」，从哪几层排查
- 多模型路由的分流依据怎么定，路由错了怎么兜底
- 量化到 INT8 后质量掉没掉，用什么评测证明
- 平台的限流与配额怎么设计，大客户和小客户怎么隔离

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer 推理、KV Cache | 能画推理时的数据流 |
| 引擎层 | vLLM、批调度、PD 分离 | 每个机制讲得出实现 |
| 优化层 | 量化、缓存、投机解码 | 有延迟/吞吐/精度数字 |
| 平台层 | 路由、降级、多租户 | 有方案级思考 |
| 评测层 | 线上评测与监控 | 建过指标体系 |

## 简历怎么改

- 推理与平台经历都带数字：QPS、TTFT、吞吐、单 token 成本
- 「熟悉 vLLM」写成「基于 vLLM 做了 X 调整，解决 Y 瓶颈，指标 Z」
- 企业服务经历写清规模：多少租户、多大流量、什么 SLA
- 评测与监控的搭建经历单独写，平台岗对这块敏感

## 项目建议

- 用 vLLM 起一个开源模型服务，做批大小、量化、前缀缓存三组对比，产出吞吐-延迟曲线
- 设计一个简单网关：按请求长度与延迟要求分流两个模型，记录路由命中与降级次数
- 字节全部方向的题库见[字节跳动公司聚合页](/interview/company/bytedance)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：推理引擎与批调度[题库速答](/interview/qa)过两遍；vLLM 为什么快一题吃到调度器层面，同步刷[字节跳动公司聚合页](/interview/company/bytedance)的面经题
- 21 天：跑完推理对比项目并建立延迟与成本指标；[简历体检](/tools/resume)
- 45 天：完整走 [AI Infra 学习路线](/roadmap/ai-infra)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
