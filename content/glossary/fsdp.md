---
slug: fsdp
term: FSDP
en: Fully Sharded Data Parallel
oneLine: FSDP 是 PyTorch 原生的全分片数据并行技术，在训练时将参数、梯度和优化器状态全部按卡分片，前反向计算时按需临时聚合目标层参数并算完即释放，效果对标 ZeRO-3 且无需引入第三方框架。
aliases: [FSDP, 完全分片数据并行]
group: finetune
tags: [分布式训练, FSDP]
relatedQa: [parallelism-strategies, training-vram-breakdown]
relatedTerms: [deepspeed-zero, lora]
updated: 2026-09-28
---

## 是什么

FSDP 将参数、梯度和优化器状态切分到各计算设备上存储。在前向和反向传播中，当计算到具体层时，FSDP 通过 all-gather 临时聚合该层的完整参数。计算完成后参数被立即释放，梯度和优化器状态维持分片更新。

它与 PyTorch 生态原生集成，通过 torchrun 即用，支持混合精度及激活重算，通信开销与 ZeRO-3 同量级。若在 PyTorch 栈内且不愿引入外部依赖，通常选 FSDP；若需极致优化器特性和生态成熟度，则选 DeepSpeed。

## 解决什么问题

此前实现全分片数据并行需依赖第三方框架，增加了代码维护复杂度。FSDP 将大模型训练的分片方案从外挂转变为 PyTorch 内置能力。

开发者无需引入外部依赖，即可调用原生接口实现全分片，降低了分布式训练的门槛。

## 面试怎么考

常考 FSDP 与 DDP 的区别，需指出 DDP 每卡保留完整参数，而 FSDP 将参数、梯度和状态全部分片。针对聚合时机，说明仅在计算到具体层时临时聚合，算完即释放。

另一考法是与 ZeRO 的对应关系，需回答其对标 ZeRO-3。此外常问何时还要用模型并行，答题要点是当单层参数过大导致单卡无法容纳时。
