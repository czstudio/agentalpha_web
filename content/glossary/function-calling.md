---
slug: function-calling
term: Function Calling（函数调用）
en: Function Calling
oneLine: Function Calling（函数调用）是开发者向模型声明工具名称、参数 Schema 与描述，模型按用户意图输出结构化调用请求的机制。模型仅负责决策，由应用层执行真实函数并回传结果。
aliases: [Function Calling, 函数调用, Tool Use, 工具调用]
group: agent
tags: [工具调用, 核心概念]
relatedQa: [what-is-function-calling, function-calling-accuracy, tool-schema-design]
relatedTerms: [ai-agent, mcp, react-pattern]
updated: 2026-09-28
---

## 是什么

应用在请求中附带包含名称、描述与 JSON Schema 参数格式的工具定义。模型判断需要使用工具时，输出包含函数名与参数的调用意图。应用端拦截到意图后执行真实函数，将结果以工具消息回传，模型据此继续生成回复。模型具备此能力是因为在后训练阶段使用了工具调用轨迹数据进行微调，学会了选工具与填参数。

模型输出的仅是调用意图，不负责实际执行。工具描述的好坏直接决定模型选择工具的准确率。此外，模型按 Schema 生成的参数可能出错，应用层必须引入校验与重试机制来应对异常。

## 解决什么问题

Function Calling 解决了模型仅能依赖静态训练数据生成回复的局限。它使模型能够触达实时数据与执行外部动作，例如数据库查询、订单生成或数学计算。

同时，它将模型原本的自由文本输出，约束成应用端可以直接解析的结构化请求格式，确保模型意图能被外部程序准确识别与处理。

## 面试怎么考

面试常考 Function Calling 的完整交互流程，要求清晰描述声明、意图输出、执行与回传的数据流向。

针对工程异常，常问模型总调错参数怎么办，答题要点是说明应用层的参数校验与重试提示机制。当工具数量过多时，常考如何让模型选对，答题要点在于优化工具描述或引入分发路由。若返回的 JSON 不标准怎么兜底，答题要点是使用容错解析库尝试修复，或将错误信息反馈给模型要求重新生成。
