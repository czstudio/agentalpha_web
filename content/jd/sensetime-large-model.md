---
slug: large-model-algo
company: sensetime
title: 商汤 · 日日新大模型（算法与工程）
role: 大模型算法工程师
family: llm-algo
level: 校招 / 社招 1-3 年
summary: 商汤日日新大模型岗：考察横跨多模态训练、大装置推理服务与模型评测三块，SFT 数据构造与推理吞吐优化是追问重点。
cats: [finetune, inference, eval]
qaSlugs: [what-is-sft, sft-data-preparation, what-is-lora, vllm-why-fast, continuous-batching, what-is-pd-disaggregation, what-is-quantization, llm-benchmarks, llm-as-judge, golden-set]
keywords: [商汤面试, 日日新大模型, 多模态算法, 大模型推理]
updated: 2026-09-30
sourceUrl: https://www.sensetime.com/cn/careers
sourceName: 商汤科技官网招聘入口（列表入口）
---

## 这条 JD 在招什么人

商汤的日日新（SenseNova）体系招大模型算法与工程：模型侧做多模态大模型的训练与迭代，服务侧依托大装置（SenseCore）做推理服务，另有模型评测方向。考察口径来自公开 JD 与面经的高频归纳：算法与工程两条线都问，SFT 数据构造、推理吞吐、模型评测是三块高频区。和纯应用厂的区别在于这里要管模型本身：数据怎么配、训练怎么跑、部署怎么省卡、效果怎么量化，都是自己团队的事。

## 业务场景推测

大概率三类：日日新系列多模态模型的继续训练与对齐；大装置上对外输出的推理服务，做吞吐、延迟与成本优化；面向模型迭代的评测体系，含 benchmark、人工评测与 badcase 归因（置信度：中，基于公开业务布局推断）。多模态与视觉语言方向的比重可能明显高于纯文本团队（置信度：中，基于公开业务布局推断）。

## 硬技能：必须会什么

- SFT：全流程与数据构造（[SFT 是什么](/interview/qa/what-is-sft)、[SFT 数据准备](/interview/qa/sft-data-preparation)），指令数据的来源、配比、清洗说得出依据
- 参数高效微调：LoRA 原理与秩的选择（[LoRA](/interview/qa/what-is-lora)）
- 推理引擎：vLLM 快在哪（[vLLM 为什么快](/interview/qa/vllm-why-fast)）、连续批处理（[Continuous Batching](/interview/qa/continuous-batching)）、PD 分离（[PD 分离](/interview/qa/what-is-pd-disaggregation)）
- 量化：精度与代价的取舍（[量化](/interview/qa/what-is-quantization)）
- 评测：主流 benchmark 的用法与局限（[LLM Benchmarks](/interview/qa/llm-benchmarks)）、LLM 当裁判的坑（[LLM as Judge](/interview/qa/llm-as-judge)）、标准答案集怎么建（[Golden Set](/interview/qa/golden-set)）
- 工程底子：PyTorch 扎实，分布式训练或推理服务化至少一段实战

## 加分项：什么能拉开差距

- 多模态训练经验：图文混合数据、视觉语言对齐
- 推理服务优化有数字：吞吐提升多少、成本降多少，说得出来源
- 从数据构造到评测复盘，独立跑通过一轮完整模型迭代
- 看得出训练与推理的健康度：loss 曲线、延迟分布的异常判读

## JD 没写但面试会问

- SFT 数据多少条见效、配比怎么定、脏数据怎么洗（高频）
- LoRA 的秩怎么选，什么场景全参微调反而更划算
- vLLM 为什么快：PagedAttention 与连续批处理各解决什么
- 集群上做推理服务，PD 分离什么时候值得上
- benchmark 分数涨了但用户体感没变，问题出在哪
- 用 LLM 当裁判评自家模型，怎么防偏

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer、训练流程 | 公式级，跑通过训练 |
| 微调层 | SFT 数据与 LoRA | 数据构造有依据 |
| 推理层 | 引擎机制、量化、PD 分离 | 讲得出原理与取舍 |
| 评测层 | benchmark、judge、标准集 | 建过评测集 |

## 简历怎么改

- 训练经历按「数据—配置—指标」写：数据规模与来源、超参、效果对比
- 推理优化经历量化写：吞吐、延迟、卡数的变化
- 评测经历写全流程：发现问题、归因、改进、复测
- 多模态经验显式标注，别埋在项目描述里

## 项目建议

- 小模型 SFT 复现：开源基座加自建指令数据，对比不同数据配比的效果
- 推理服务压测：用 vLLM 部署一个模型，测吞吐与延迟曲线，再做一版量化并记录精度损失
- 商汤全部方向的题库见[商汤公司聚合页](/interview/company/sensetime)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：SFT 与推理引擎[题库速答](/interview/qa)过两遍；vLLM 机制练到能白板画图
- 21 天：跑一个 SFT 加推理压测的小型完整迭代并保留数据；[简历体检](/tools/resume)
- 45 天：评测体系专题补齐，应用侧加走[RAG 工程师学习路线](/roadmap/rag-engineer)或[Agent 开发路线](/roadmap/agent-developer)的评测章节，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
