---
slug: paged-attention
term: PagedAttention 与 vLLM
en: PagedAttention & vLLM
oneLine: vLLM通过PagedAttention机制将KV Cache切分为固定大小的物理块，利用页表映射按需分配显存。它消除了预留整段显存带来的碎片浪费，配合连续批处理技术提高了吞吐量。
aliases: [PagedAttention, vLLM, 分页注意力]
group: inference
tags: [vLLM, 推理]
relatedQa: [vllm-why-fast, continuous-batching, what-is-kv-cache]
relatedTerms: [kv-cache, quantization]
updated: 2026-09-28
---

## 是什么

传统推理实现中，系统会按最大序列长度为每个请求预留连续的KV Cache显存。这种方式会产生内部与外部碎片，造成大量显存闲置。

PagedAttention将KV Cache划分为固定大小的物理块，通过页表将逻辑序列映射到物理块。物理块按需分配，且支持不同请求间共享。当多个请求具有相同前缀时，它们可以共享对应物理块，这构成了前缀缓存的基础。

vLLM引擎结合了PagedAttention与连续批处理技术。连续批处理以单个token为粒度，动态将请求插入或移出当前批次，两者配合增加了吞吐量。

## 解决什么问题

推理成本的主要决定因素是显存利用率和批调度效率。如果没有分页管理，系统会被显存碎片限制并发数量。

PagedAttention消除了连续内存分配的限制，让同样的显存容量装下更多并发序列。通过提高显存实际利用率，该机制增加了系统的整体吞吐量。

## 面试怎么考

面试常问vLLM为什么快，答题需涵盖PagedAttention对显存碎片的消除，以及连续批处理对调度效率的改进。

另一考点是PagedAttention解决了什么问题，需回答按需分配物理块机制。考官也常追问它与前缀缓存的关系，应说明相同前缀请求能通过页表映射共享物理块。
