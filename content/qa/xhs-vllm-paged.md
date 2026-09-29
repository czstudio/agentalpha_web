---
slug: xhs-vllm-paged
question: "vLLM 加速推理的原理？"
oneLine: "vLLM 通过 PagedAttention 把 KV Cache 分成固定大小的页块按需管理，再配合 Continuous Batching 动态调度请求，减少显存浪费并提高吞吐。"
category: jingchang
company: xiaohongshu
track: infra
tags: [小红书真题, vLLM, 推理加速]
minutes: 5
order: 306
updated: 2026-09-29
deep: 
---

## 先这样答

vLLM 加速推理的核心是 PagedAttention。它把 KV Cache 分成固定大小的页块，再按照类似操作系统虚拟内存的思路管理这些页块。这样，系统不需要为每个请求预留一段连续的显存，也能减少连续内存带来的碎片和浪费。

传统做法通常要提前预留较大的连续空间。请求实际需要的空间和预留空间可能不一致，预留部分就会被浪费。PagedAttention 按页块管理 KV Cache，按实际使用情况分配和组织内存，利用率接近按需。面试时可以直接把内存账说清楚：传统预留浪费大，分页后空间利用更充分。

在此基础上，vLLM 还配合 Continuous Batching 动态调度请求。它可以根据正在运行的请求安排计算和资源，让请求持续进入批处理过程。PagedAttention 负责减少 KV Cache 的内存浪费，Continuous Batching 负责动态组织请求，两者结合后，推理吞吐大幅提升。

## 面试官会怎么追问

- **「PagedAttention 具体解决了什么内存问题？」** 它解决的是 KV Cache 需要连续预留空间时产生的碎片和浪费。传统方式会预留一段空间，但请求实际使用量可能不同。PagedAttention 把 KV Cache 切成固定大小的页块，再按需管理，利用率接近实际需求。

- **「为什么还需要 Continuous Batching？」** PagedAttention 主要解决 KV Cache 的内存管理问题。Continuous Batching 负责动态调度请求，把正在处理的请求组织起来。两者分别处理内存和请求调度，结合后可以提高推理吞吐。

- **「你怎么用一句话说明 vLLM 的加速效果来自哪里？」** 一部分来自 KV Cache 的分页管理。它减少了连续内存预留造成的浪费。另一部分来自 Continuous Batching 对请求的动态调度，最终让吞吐大幅提升。

## 回答的坑

- 只说 Continuous Batching，不解释 PagedAttention 如何减少 KV Cache 的内存浪费，答案不完整。
- 只说“分页能加速”，却不说明传统连续预留的浪费来源，面试官很难听到你的内存账。