---
slug: "llm-quantization-serving"
title: "模型量化后变小了，效果和服务为什么可能变差？"
excerpt: "量化通过降低权重或激活的数值精度减少显存和带宽，但误差会集中影响敏感层、长上下文和工具调用。面试要能讲清量化粒度、校准数据、部署硬件和回退策略。"
series: "LLM 基础"
seriesNo: "04"
number: "71"
minutes: 22
---

线上模型服务里，显存和带宽常常比 FLOPs 更早成为瓶颈。把 FP16 权重换成 INT8 或更低精度，可能明显降低内存和传输成本，但也可能让少数关键层、长输出或结构化生成变得不稳定。量化是服务系统的一部分，不是一个孤立的压缩脚本。

## 先给一个能复述的答案

先确定目标：显存不够、吞吐不够、延迟不够，还是成本不够；再选择权重、激活、KV cache 的量化范围和粒度。量化前用代表性校准集覆盖长短输入、中文、代码、工具调用和边界值，比较任务质量、格式错误、P95 和单位 token 成本。关键层可以保留更高精度，并保留精度更高的回退版本。

![量化从校准到线上回退的链路](/images/notes/llm-quantization-serving/quantization-pipeline.svg)

## 一个最小的量化直觉

对称均匀量化可以写成：

$$
x_q=round\left(\frac{x}{s}\right),\quad \hat{x}=s\,x_q,\quad s=\frac{\max |x|}{2^{b-1}-1}
$$

其中 $b$ 是 bit 数，$s$ 是尺度。数值范围内的异常值会拉大尺度，让大多数值的有效分辨率变低；所以常见优化是 per-channel、group-wise 或异常值分离，而不是所有权重共用一个尺度。

## 权重、激活、KV Cache 的区别

| 对象 | 收益 | 风险 |
| --- | --- | --- |
| 权重 | 常驻显存下降、带宽减少 | 精度误差累积 |
| 激活 | 计算和中间内存下降 | 对校准分布敏感 |
| KV cache | 长上下文显存下降 | 远距离注意力、工具输出退化 |

不同对象可能需要不同 bit 数。一个“全模型 4bit”标签不等于同样的质量与延迟，必须说明 kernel、硬件和 batch 条件。

## 校准集要像线上，而不是像训练集

校准集应该包含：

- 普通问答和中文长文；
- JSON、代码、SQL、工具参数；
- 低频 token、数字、版本号和特殊符号；
- 长输入、长输出和接近上下文上限的任务；
- 失败敏感任务，如拒答、权限判断和格式约束。

```yaml
calibration: agent-serving-v2
samples: 2400
mix:
  chat: 0.35
  code: 0.20
  structured_output: 0.20
  long_context: 0.15
  tool_call: 0.10
acceptance:
  format_error_delta: "< 0.5pp"
  quality_delta: "> -2pp"
  p95_latency: "improve >= 15%"
```

指标要和服务目标绑定，不能只报告 perplexity 下降多少。

![量化质量—显存—延迟的三角权衡](/images/notes/llm-quantization-serving/tradeoff-triangle.svg)

## 线上灰度与回退

量化版本先按租户或流量比例灰度，记录模型版本、量化配置、硬件、batch、输入 token、输出 token、格式错误、人工接管和成本。只要结构化输出错误、拒答边界或高风险工具调用出现异常，就要能切回高精度版本。

## 先定位瓶颈，再决定量化哪一层

“显存不够”只是现象。预填充阶段可能受计算吞吐限制，解码阶段可能受显存带宽限制，长会话则可能被 KV cache 挤爆。可以先把一次请求拆成四块：权重常驻、激活峰值、KV cache、通信与临时 buffer。不同瓶颈对应的动作并不一样：

| 观察到的瓶颈 | 先尝试的动作 | 量化的风险 |
| --- | --- | --- |
| 权重占满显存 | 权重量化、分片、卸载 | 层间误差累积 |
| 解码带宽不足 | 权重 bit 降低、kernel 优化 | 低 bit 结构化输出退化 |
| 长会话 OOM | KV cache 量化或分页 | 远距离注意力变弱 |
| batch 太小 | 合并请求、连续批处理 | 等待时间增加 |

如果不先做分解，团队很容易为了“4bit”这个标签投入几天，却发现真正的峰值来自上下文缓存或通信 buffer。

## 用敏感度实验决定保留精度的层

量化并不需要所有层一刀切。可以先对每一层或每一组通道做小范围替换，观察代表性任务的变化：

```python
def sensitivity_report(model, layers, calibration, evaluate):
    baseline = evaluate(model, calibration)
    rows = []
    for layer in layers:
        candidate = clone(model)
        quantize_layer(candidate, layer, bits=4)
        score = evaluate(candidate, calibration)
        rows.append({
            "layer": layer,
            "delta": score - baseline,
            "keep_high_precision": score < baseline - 0.01,
        })
    return sorted(rows, key=lambda x: x["delta"])
```

敏感度报告要按任务切片保存。某一层对通用问答影响很小，可能却决定 JSON 括号是否闭合，不能用一个总分把它抹平。最终的混合精度方案应写出“哪些层保留 FP16、哪些组用 INT8、KV cache 使用什么 bit”，而不是只写“采用 W4A16”。

## 校准不是跑几条样例就结束

校准数据至少要有三层：

1. **分布层**：中文、英文、代码、数字、URL、表格和特殊符号；
2. **产品层**：真实 prompt、系统指令、工具 schema、输出格式和拒答边界；
3. **失败层**：超长输入、重复内容、极端数字、混合语言和对抗性参数。

校准集不需要泄露生产数据，可以用脱敏后的结构和合成变体，但必须保留真实 token 长度、字段分布和工具参数形状。每次量化配置变化都生成一份 manifest，包含校准集 hash、量化脚本版本、kernel、硬件和评测结果。

```yaml
quantization_manifest: q4_kv8_v3
weight: int4_group128
activation: fp16
kv_cache: int8_per_head
keep_fp16_layers: [0, 1, 30, 31]
hardware: "A10G"
calibration_hash: "sha256:..."
rollback: "model-fp16-20260818"
```

## 量化后的服务验收看四类信号

质量信号包括任务成功、引用覆盖、拒答准确和 schema 通过；资源信号包括显存峰值、吞吐、首 token 延迟和解码速度；稳定性信号包括超时、OOM、重试和 batch 波动；业务信号则包括人工接管、投诉、错误写入和单位成功成本。只报“显存降了 42%”是不够的。

![量化版本的发布门槛与回退](/images/notes/agent-eval-success-rate/release-gate.svg)

如果结构化输出错误率从 0.3% 升到 1.1%，即使显存节省很多，也应该暂停放量。回退策略必须提前演练：新版本停止接收、旧版本接管新请求、进行中的无副作用任务可以继续，有副作用任务先查状态再决定是否重试。

## 一个可复现的量化对照表

下表为示意数据，非实测结论。

| 版本 | 权重/激活/KV | 显存峰值 | P95 | JSON 通过率 | 单位成功成本 | 结论 |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| FP16 | 16/16/16 | 22 GB | 1.00x | 99.7% | 1.00x | 基线 |
| W8A16 | 8/16/16 | 15 GB | 0.86x | 99.6% | 0.82x | 稳妥 |
| W4A16 | 4/16/16 | 11 GB | 0.72x | 99.1% | 0.69x | 灰度 |
| W4A16KV8 | 4/16/8 | 8 GB | 0.68x | 98.4% | 0.60x | 长会话谨慎 |

这类表能把“更小”与“是否值得上线”放在同一页。真正的结论还要结合风险切片和硬门槛，而不是看最后一列的成本排序。

## 量化误差从哪里来：先画误差预算

量化后的误差并不是均匀分布在所有请求上。长输入、数字密集、代码、工具 JSON 和多轮对话通常更敏感，可以把质量损失分成几类：

| 误差来源 | 典型表现 | 验收样本 |
| --- | --- | --- |
| 权重舍入 | 事实或推理质量略降 | 高频问答、长文总结 |
| 激活截断 | 极端输入出现异常输出 | 长尾长度、代码、数字 |
| KV 低精度 | 长会话后半段引用错 | 8k/16k 多轮对话 |
| 校准偏差 | 线上分布与校准集不一致 | 真实工具回执、失败样本 |
| Kernel/硬件差异 | 速度和格式行为变化 | 同模型不同 GPU |

建议为每个风险切片设单独预算，而不是只看一个平均 loss：

$$
L_{total}=L_{quality}+\lambda_1L_{format}+\lambda_2L_{citation}+\lambda_3L_{side\_effect}
$$

高风险输出的格式和副作用项权重应远高于普通聊天。

## 校准集怎么从线上来

一个实用的校准集不只是随机抽样训练数据，而是从线上 trace 中按任务和失败切片采样：

1. 取过去一周的正常请求，覆盖长度、语言和工具比例；
2. 加入结构化输出失败、引用不完整、OOM 和超时样本；
3. 对敏感字段脱敏，但保留数值、格式和上下文结构；
4. 固定一小组“不能回归”的黄金问题，作为每次量化的硬门；
5. 记录校准集 hash，任何样本变化都触发重新比较。

```yaml
calibration_set:
  source: prod-trace-2026-08-15
  slices: [short_chat, long_context, tool_json, code, citation, failure_replay]
  target_count: 2400
  golden_count: 120
  redactions: [user_id, order_id, secret]
  sha256: "..."
```

校准集越接近真实分布，量化结果越有参考价值；但黄金集仍要保留少量极端边界，防止平均分掩盖事故。

## 层敏感度之外，还要看服务形态

同一个 W4 模型在离线生成和线上 continuous batching 下可能表现不同。上线前至少做三种服务形态：单请求、固定 batch、真实并发。重点观察：

| 形态 | 特别容易暴露的问题 |
| --- | --- |
| 单请求 | 量化后的基本质量和格式 |
| 固定 batch | 显存峰值、padding 浪费 |
| continuous batching | KV 复用、长尾 P99、请求互相影响 |

如果只有单请求 benchmark，无法证明高并发下的显存和尾延迟仍然可控。服务参数、GPU、kernel 和 batch 策略都应写入量化 manifest。

## 回退要与副作用状态联动

量化版本发现格式回归后，不能简单把流量切回旧模型。正在执行的写操作要先查询工具状态；只读任务可以直接切换；已生成但未提交的计划应标记为旧版本，重新校验后才能执行。

```text
new_quantized
  ├─ read-only running → finish or switch
  ├─ awaiting approval → invalidate draft, regenerate
  └─ side-effect unknown → reconcile first, no blind retry
```

这也是为什么量化发布属于 Agent 系统变更，而不只是推理性能优化。

## 校准集要覆盖“会让量化出错”的输入

校准集不是随机抽几百条文本。它应当覆盖真实服务里最容易触发激活峰值和格式约束的样本：长中文表格、工具 JSON、代码缩进、数字密集的财务单据、拒答样本，以及需要引用原文的 RAG 问题。每个样本记录任务标签、输入 token 数、期望格式和风险等级，后续才能解释某一类回归。

```yaml
calibration_cases:
  - id: policy_json_07
    task: tool_call
    risk: high
    input_tokens: 1850
    assertions: [valid_json, no_extra_keys, amount_preserved]
  - id: cn_table_12
    task: citation_qa
    risk: medium
    input_tokens: 4200
    assertions: [citation_match, numeric_exact]
coverage:
  min_per_slice: 40
  keep_tail_cases: true
```

量化前后应保存同一批样本的 logits 摘要、结构化输出和工具参数，而不是只保留最终文本。出现问题时，可以判断是概率分布漂移、格式约束失效，还是工具执行阶段出了错。

## 混合精度是工程取舍，不是“全部 W4”

对 Agent 服务，通常值得把输出头、对格式敏感的层或 KV cache 保留更高精度，再把收益最大的权重层降精度。一个简单的决策表：

| 部分 | 候选精度 | 观察指标 |
| --- | --- | --- |
| 权重主体 | W4 / W8 | 显存、困惑度、任务成功率 |
| 激活 | FP16 / INT8 | 峰值显存、长输入稳定性 |
| KV cache | FP8 / FP16 | 长对话引用和尾延迟 |
| 输出头 | FP16 | JSON、代码和数字保真 |

最终方案要把 kernel、batch、并发和 GPU 型号写进 manifest。换一张卡或换 continuous batching，原来的“量化收益”可能就不再成立。

上线时建议先把量化模型放在影子流量，比较它与当前模型的结构化输出和工具参数，不直接让它提交副作用。只有高风险切片、引用覆盖和终态一致性都通过，才逐步增加真实流量。

影子流量也要记录真实的输入长度和并发分布，否则只在短请求上验证，会高估量化收益。遇到质量回归时先按任务切片回放，再决定是调整校准集、保留敏感层，还是撤回整个版本。

把“量化成功”定义成一组可回退的条件：显存下降、P95 不升、结构化输出通过率不降，高风险任务没有新增未知状态。少一项，就先保留旧模型。

因此，量化发布单里必须同时有模型版本、量化配置、校准集 hash、服务镜像和回退版本；缺少任一项，都无法在事故后复现同一个行为。

## 高频追问

**L1：量化解决什么问题？**

用更低精度表示权重、激活或 KV cache，降低显存和带宽，可能提升吞吐和降低成本。

**L2：为什么量化会损伤质量？**

舍入和截断误差会在层间传播，异常值和敏感层影响尤其明显；校准分布不覆盖线上输入时风险更大。

**L2：INT8 和 INT4 应该怎么选？**

看硬件 kernel、显存压力、质量容忍度和任务类型。不是 bit 越低越好，需用目标数据和服务指标比较。

**L3：量化后工具调用不稳定怎么办？**

把结构化输出、参数边界和工具调用纳入校准与回归；必要时保留输出头或敏感层的更高精度，先缩小灰度范围。

**L5：如何证明量化值得上线？**

用同一任务集比较质量、格式错误、P95、吞吐、显存峰值和单位成功任务成本，并有可逆的版本灰度和回退证据。

## 60 秒面试回答

我先判断瓶颈是显存、带宽、吞吐还是成本，再决定量化权重、激活还是 KV cache，以及 per-channel 或 group-wise 粒度。量化前准备覆盖中文、代码、JSON、长上下文和工具调用的校准集，比较质量、格式错误、P95、显存和单位成本。关键层可以保留高精度，线上按租户灰度，所有异常都能切回高精度版本。量化的目标不是最小 bit，而是可接受质量下的服务收益。

## 自检清单

- [ ] 能区分权重、激活和 KV cache 量化
- [ ] 能解释尺度和异常值的影响
- [ ] 校准集覆盖线上长尾与结构化任务
- [ ] 有灰度、指标和回退版本

## 相关阅读

- [大模型推理优化不只是换量化：吞吐、延迟和显存要一起看](/notes/llm-inference-optimization)
- [KV Cache 缓存的到底是什么？为什么长对话越聊越贵](/notes/llm-kv-cache)
- [LLM 选型不是比一个总榜：把任务、成本和失败代价放进同一张表](/notes/llm-model-selection)

## 资料来源

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
