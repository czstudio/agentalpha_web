---
slug: react-pattern
term: ReAct 模式
en: ReAct (Reasoning + Acting)
oneLine: ReAct 模式是让模型交替输出思考与行动的 Agent 范式。模型每步先输出推理再发起工具调用，工具结果作为观察喂回，循环直至给出最终答案。它适用于简单任务，长任务易发散。
aliases: [ReAct, 推理+行动, Reasoning and Acting]
group: agent
tags: [ReAct, Agent 范式]
relatedQa: [what-is-react, agent-paradigm]
relatedTerms: [ai-agent, function-calling]
updated: 2026-09-28
---

## 是什么

ReAct 的核心是 Thought、Action、Observation 循环。模型先生成 Thought 明确思考，接着输出 Action 决定调用的工具及参数，随后获取工具返回的 Observation。模型基于新观察进入下一轮思考，循环直至输出最终答案。

与 Plan-and-Execute 相比，ReAct 走一步看一步，执行灵活，上下文消耗随步数累积。前者先生成完整计划再执行，方向稳定，便于并行与检查点，改计划需显式触发。

与 Reflection 的区别在于，Reflection 在执行后增加自我批评与修正环节，通常作为增强层叠加。

## 解决什么问题

直接生成答案时，模型无法获取外部信息，也无法在推理中纠错。ReAct 模式通过交织推理与行动解决此问题。它要求模型在行动前先思考，让每步决策建立在新的观察上。这种机制使模型能根据工具返回情况调整后续路线，完成单靠内部权重无法处理的任务。

## 面试怎么考

面试常考 ReAct 和 Plan 模式的区别与适用场景。答题要点需明确，ReAct 走一步看一步，适合简单任务；Plan 先计划再执行，适合复杂任务。

另一考法是 ReAct 什么时候会失效。答题要点需指出长任务发散与上下文膨胀：长任务中模型易偏离目标，且随步数增加上下文累积会导致信息遗忘。此外，还会考察 ReAct、Plan 和 Reflection 三种范式怎么选。
