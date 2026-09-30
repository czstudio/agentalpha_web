---
slug: llm-observability
term: LLM 可观测性
en: LLM Observability
oneLine: LLM 可观测性是对大模型应用的调用链进行记录与度量的机制，将请求的提示词、模型输出、工具调用、检索命中、成本与延迟转化为追踪记录，用于排障、评测回流与成本归因。
aliases: [Observability, 可观测, Tracing, 追踪]
group: eval
tags: [可观测, LLMOps]
relatedQa: [llm-app-monitoring, online-evaluation, alibaba-skill-eval-trace]
relatedTerms: [agent-evaluation, ragas]
updated: 2026-09-28
---

## 是什么

LLM 可观测性是传统监控三支柱在生成式场景的落地。追踪记录请求经过改写、检索、重排到生成的完整链路，每段跨度带有输入输出；指标度量延迟、首字到达时间、Token 成本与错误率；日志留存原始输入供回放。

与传统应用监控不同，它记录 LLM 特有维度，包括每步 Token 数量与费用、模型版本、温度参数、检索命中块及工具调用参数。常用工具包括 LangSmith、Langfuse 与 OpenTelemetry 语义约定方案。记录用于错误归因、挖掘失败样本回流评测集及逐段优化成本与延迟。

## 解决什么问题

大模型应用属于非确定性系统。在没有追踪记录的情况下，系统出现问题只能猜测故障原因，无法准确定位错误环节。

LLM 可观测性提供执行过程的透明度，使得评测与优化都能以追踪记录为证据，为排障提供事实依据。

## 面试怎么考

面试常考追踪记录需包含哪些字段，答题应列举 Token 消耗、检索命中块与工具调用参数等特有维度，并说明其与传统监控的区别。

考官也会询问如何从追踪记录中挖掘评测集，答题要点是利用追踪记录筛选真实的失败样本。LangSmith 与 Langfuse 的差异也是常见考点，需对比两者的产品差异。
