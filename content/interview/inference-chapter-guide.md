---
slug: inference-chapter-guide
no: "5"
title: "第 2 章（下） · 推理与部署面试导学"
question: "大模型推理与部署章节考什么？按什么顺序刷题？"
excerpt: "KV Cache 的显存账、vLLM 的两条提速主线、量化与投机解码的适用边界、PD 分离与 Roofline 判断，这篇导学把推理章的考点链、五段学习路线（含站内题单直链）与 Infra 岗高频追问一次讲清。"
tags: ["章节导学"]
category: "inference"
author: "AgentAlpha"
source: "AgentAlpha 社区"
minutes: 10
words: 2536
updated: "2026-09-29"
---

## 考点地图

大模型推理与部署是面试中区分工程能力的核心章节。本章考点链条以显存与计算资源分配为基础，向吞吐量优化与延迟降低延伸。核心考点起始于 KV Cache 机制与显存账本计算，随后切入 PagedAttention 机制与 vLLM 框架原理，再延伸至连续批处理技术。进阶优化涵盖权重与 KV 量化、投机解码、PD 分离架构，以及 GQA、MQA、MLA 等注意力变体。此外，首 Token 延迟与吐字速度评估，以及基于 Roofline 的瓶颈判断，也是常考方向。

从考频来看，KV Cache 与 vLLM 几乎是每场推理岗面试的必问项。量化与投机解码作为高频进阶考点，常用于考察对加速方案的理解。PD 分离与 Roofline 则是具备区分度的题目，多出现于基础设施岗位的深度考察中。

不同岗位对知识深度的要求存在差异。应用岗侧重考察概念原理与部署成本评估。基础设施岗则会问到源码级别，如调度器抢占逻辑、显存块管理机制，甚至要求手写注意力代码或计算算子访存流量。当候选人能推演从输入到输出全过程的显存占用与带宽消耗，并针对不同场景给出优化方案时，这一章就算过关。

## 站内学习路线

第一阶段构建概念地基。建议读者先过一遍核心术语，包括 [KV Cache](/interview/glossary/kv-cache)、[PagedAttention](/interview/glossary/paged-attention)、[量化](/interview/glossary/quantization) 以及 [投机解码](/interview/glossary/speculative-decoding)。每个术语阅读几分钟即可，旨在建立初步认知。这一阶段学完后，读者能够准确说出这些名词的定义与场景，为后续机制解析打下基础。

第二阶段进入机制题单，按顺序刷速答题。先刷缓存机制的两题： [KV Cache 是什么](/interview/qa/what-is-kv-cache) 以及 [为什么只缓存 KV 而不缓存 Q](/interview/qa/why-cache-kv-not-q)。再看推理框架： [vLLM 为什么快](/interview/qa/vllm-why-fast) 以及 [连续批处理](/interview/qa/continuous-batching) 的运作方式。然后看 [什么是 PD 分离](/interview/qa/what-is-pd-disaggregation) 与 [前缀缓存](/interview/qa/prefix-caching)。接着读压缩与注意力变体： [什么是量化](/interview/qa/what-is-quantization)、[KV Cache 量化](/interview/qa/kv-cache-quantization) 以及 [GQA、MQA 与 MLA 的区别](/interview/qa/what-are-gqa-mqa-mla)。最后刷解码优化与延迟指标： [投机解码](/interview/qa/speculative-decoding)、[投机解码的工程实现](/interview/qa/speculative-decoding-engineering) 以及 [首 Token 延迟与吐字速度](/interview/qa/ttft-decode-speed)。这一段学完后，读者能够流利回答面试中关于推理机制的操作原理与流程细节。

第三阶段侧重深挖与选型对比。读者需要阅读深度对比文章，包括框架差异分析 [vLLM、SGLang 与 TensorRT-LLM 对比](/interview/vllm-vs-sglang-vs-trtllm)，注意力机制演进的 [GQA、MQA 与 MLA 对比](/interview/gqa-vs-mqa-vs-mla)，模型压缩路径的 [量化与知识蒸馏对比](/interview/quantization-vs-distillation)，以及架构选型的 [MoE 与 Dense 模型对比](/interview/moe-vs-dense-model)。偏向基础设施方向的候选人需额外攻克 [Roofline 瓶颈分析](/interview/roofline-bottleneck)。这一阶段学完后，读者能够应对技术路线选择的开放性提问，给出合理的对比分析。

第四阶段解决工程账本问题。重点阅读 [部署显存估算](/interview/gpu-vram-estimate) 与服务形态选型的 [私有化部署与 API 调用对比](/interview/selfhost-vs-api)。这一段学完后，读者能够面对硬件资源限制，推演出准确的部署需求并完成显存估算。

## 高频追问与避坑

- **「KV Cache 显存怎么估算，批处理大小变化时怎么算」** 答法要点在于拆解公式。需按层数、KV 头数、头维度、序列长度与精度逐项相乘。必须明确指出 KV Cache 占用随批处理大小呈线性增长。
- **「vLLM 为什么快」** 答法要点在于区分两项技术。要分开阐述 PagedAttention 如何消除显存碎片，以及连续批处理如何提升吞吐量。两者分别解决显存利用率和计算资源闲置问题。
- **「投机解码为什么是无损的」** 答法要点在于强调验证阶段的数学等价。需说明验证时使用目标模型分布对词元逐个接受。一旦出现分布分歧即触发重采样，保证输出与单独使用大模型一致。
- **「解码阶段为什么是内存带宽瓶颈」** 答法要点在于分析算术强度。每步只算一个词元却要读取全部权重。这种非常低的计算访存比导致算力无法跑满，在 Roofline 模型中落在受限于带宽的左半段。

常见误区：
候选人容易把量化说成用精度换速度，忽略了减少权重读取访存流量这一核心带宽机制。
候选人容易把 PD 分离单纯描述为拆分成独立服务，而不去解释消除同显卡资源干扰的真实动机。
