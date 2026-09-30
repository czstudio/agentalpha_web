---
slug: hunyuan-infra
company: tencent
title: 腾讯 · 混元推理工程
role: AI Infra
family: ai-infra
level: 校招 / 社招 1-3 年
summary: 混元大模型推理工程岗：serving 部署、KV Cache 与量化优化，TTFT、吞吐、单 token 成本这类硬指标直接对内交付。
cats: [inference]
qaSlugs: [what-is-kv-cache, kv-cache-quantization, what-is-quantization, vllm-why-fast, continuous-batching, prefix-caching, what-is-pd-disaggregation, ttft-decode-speed]
keywords: [腾讯混元推理, 混元 Infra 面试, KV Cache 量化, 大模型推理工程师]
updated: 2026-09-29
sourceUrl: https://www.nowcoder.com/feed/main/detail/1f52f2424d4b4e9683984f57ddc21a96
sourceName: 牛客（腾讯 TEG 混元 LLMOps）
---

## 这条 JD 在招什么人

让混元大模型在腾讯内部海量业务里跑得快、跑得省的工程师。方向包括推理引擎部署、批调度、KV Cache 优化、量化与显存管理。腾讯的特点是接入方极多：元宝、微信场景的 AI 助手、游戏与广告业务都在调混元，同一套服务要面对差异很大的流量形态——有的重首字延迟，有的重吞吐，有的重长上下文。这个岗位的产出直接体现在机器成本上，面试也按这个口径出题：每个优化点都要能算清收益。

## 业务场景推测

大概率是混元推理服务的建设与迭代：元宝与微信 AI 助手的在线 serving、内部业务的私有化部署包，也可能包含端侧小模型的落地（置信度：中，基于公开业务布局推断）。社交场景对话短、并发高，首字延迟敏感；游戏与内容场景可能带图文多模态请求。混合流量下的调度与容量规划，大概率是这个岗位的日常。

## 硬技能：必须会什么

- KV Cache：原理、命中与失效、为什么缓存 KV 不缓存 Q（[KV Cache](/interview/qa/what-is-kv-cache)）
- 量化：权重量化与 KV 量化（INT8/FP8），精度损失怎么测（[量化](/interview/qa/what-is-quantization)、[KV 量化](/interview/qa/kv-cache-quantization)）
- 推理引擎：vLLM 为什么快、PagedAttention、continuous batching（[vLLM 为什么快](/interview/qa/vllm-why-fast)、[批调度](/interview/qa/continuous-batching)）
- 前缀缓存：多轮对话场景的命中率优化（[前缀缓存](/interview/qa/prefix-caching)）
- 架构取舍：PD 分离适用什么流量形态（[PD 分离](/interview/qa/what-is-pd-disaggregation)）
- 性能分析：TTFT 与解码速度分别被什么限制（[TTFT 与解码速度](/interview/qa/ttft-decode-speed)）、显存怎么估

## 加分项：什么能拉开差距

- 给 vLLM 或 SGLang 提过 PR，或自己写过 attention kernel
- 大流量在线服务的调优经验：压测、容量规划、热点排查
- 读过混元开源模型的技术材料，能讲清优化点落在模型结构的哪里
- 成本账算得清：换一档量化后单 token 成本怎么变、质量掉多少

## JD 没写但面试会问

- TTFT 高、解码慢，分别怎么排查、优化手段各是什么（高频）
- KV Cache 量化后效果掉了，怎么归因到量化而不是别的原因
- continuous batching 和静态批处理的具体区别、抢占怎么处理
- 多轮对话场景前缀缓存命中率上不去，可能哪里出了问题
- 给一张卡和一个模型，显存怎么估、放不放得下

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer 推理、自回归 | 能画数据流 |
| 引擎层 | 批调度、显存管理、缓存 | 讲得出实现 |
| 优化层 | 量化、PD 分离、投机解码 | 有数字佐证 |
| 业务层 | 延迟、吞吐、成本权衡 | 按流量形态选方案 |

## 简历怎么改

- 优化经历必须带数字：TTFT 降多少、吞吐升多少、显存省多少、精度掉几点
- 「熟悉 vLLM」换成「基于 vLLM 做了 X 改动，解决了 Y 瓶颈，指标 Z」
- 在线服务经验单列：QPS 量级、SLO 达成情况、故障案例
- 开源贡献附 PR 链接，写清改了什么

## 项目建议

- 推理引擎横评：同模型同卡下 vLLM/SGLang 的吞吐-延迟曲线与量化三档对比
- 前缀缓存专项：多轮对话流量回放的命中率与延迟收益
- 腾讯全部方向的题库见[腾讯公司聚合页](/interview/company/tencent)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：KV Cache、批调度、量化三块[题库速答](/interview/qa)过一遍；显存估算练到口算
- 21 天：跑一个推理基准项目并产出吞吐-延迟数据；[简历体检](/tools/resume)
- 45 天：完整走 [AI Infra 学习路线](/roadmap/ai-infra)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
