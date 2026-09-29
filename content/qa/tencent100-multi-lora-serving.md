---
slug: tencent100-multi-lora-serving
question: "多 LoRA Adapter 在线服务，怎么隔离、切换和控制显存？"
oneLine: "基座常驻显存，Adapter 按需热加载；请求携带标识，调度按 Adapter 分组或支持批内混 LoRA；用常驻上限和 LRU 控显存，网关按业务隔离权限、配额与版本。"
category: jingchang
company: tencent
tags: [腾讯真题, LoRA, 显存管理]
minutes: 5
order: 155
updated: 2026-09-29
deep: 
---

## 先这样答

结论是让基座模型常驻显存，让多个 Adapter 按需热加载。请求携带 Adapter 标识，服务根据标识完成切换。这样可以让同一个基座承载多个业务 Adapter。

批调度可以按 Adapter 分组。相同 Adapter 的请求进入同一批，减少切换。也可以使用支持批内混 LoRA 的框架，让不同 Adapter 的请求在同一批中处理。具体选择取决于服务框架的能力。

显存控制看 Adapter 的常驻数量。Adapter 本身是百 MB 级，不能让所有 Adapter 一直留在显存里。服务设置常驻数量上限，超出后用 LRU 淘汰最近最少使用的 Adapter。后续请求再按需热加载。

隔离放在网关层做。业务方只能调用自己的 Adapter。网关同时管理配额和版本，避免业务方越权调用其他 Adapter，也避免服务直接暴露没有约束的切换能力。

## 面试官会怎么追问

- **「不同 Adapter 的请求同时到达时，怎么安排批处理？」**  
  可以按 Adapter 标识分组，再分别组成批次。这样同一批使用同一个 Adapter。也可以选择支持批内混 LoRA 的框架，让不同 Adapter 的请求进入同一批。

- **「Adapter 很多时，怎么避免显存被占满？」**  
  先设置显存中的 Adapter 常驻数量上限。Adapter 是百 MB 级，达到上限后按 LRU 淘汰最近最少使用的 Adapter。新的请求到来时，再按需热加载对应 Adapter。

- **「怎么保证不同业务之间不能互相调用 Adapter？」**  
  请求先经过网关，网关校验业务方和 Adapter 的归属关系。业务方只能调用自己的 Adapter。网关还要控制配额和版本，服务侧只处理已经通过约束的请求。

## 回答的坑

- 只说 Adapter 动态加载，却不说常驻数量上限和 LRU 淘汰，显存控制就没有落到具体机制上。

- 只说请求携带 Adapter 标识，却不说网关做权限、配额和版本隔离，业务隔离就不完整。