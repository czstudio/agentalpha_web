---
slug: tencent100-planner-vs-react
question: "Planner-Executor 架构什么情况下优于单 Agent ReAct？"
oneLine: "任务长且步骤多、子任务可并行，或需要预算与进度管控时，Planner-Executor 通常更合适；超过十步或需要并行拆分，就是先规划的明确信号。"
category: jingchang
company: tencent
tags: [腾讯真题, Agent 架构, ReAct]
minutes: 5
order: 134
updated: 2026-09-29
deep: 
---

## 先这样答

结论是，当任务很长、步骤很多、子任务可以并行，或者需要控制预算和进度时，Planner-Executor 通常优于单 Agent ReAct。一个直接的判断信号是任务超过十步，或者任务需要并行拆分。这时应该先做全量计划，再按计划执行。

ReAct 的特点是走一步看一步。它能根据当前结果灵活决定下一步，但也容易只关注眼前动作。任务变长后，Agent 可能出现短视，也可能逐步偏离原始目标。Planner-Executor 会先把完整任务拆成计划。执行阶段可以围绕这份计划推进，也更适合安排可并行的子任务，并管理预算和进度。

但 Planner-Executor 不是固定执行一份永远正确的计划。计划可能在执行过程中失效，所以需要配合 Replan。发现原计划不再适用时，就重新规划后续步骤。实际设计中，两者应该组合使用，而不是二选一。Planner 负责给出整体方向，Executor 执行具体步骤，并在需要时触发重新规划。

## 面试官会怎么追问

- **「你怎么判断一个任务需不需要先做计划？」** 我会先看任务长度和拆分方式。任务超过十步，或者存在可以并行执行的子任务，就值得先规划。如果还要控制预算和进度，Planner-Executor 会更合适。

- **「Planner 给出的计划执行不下去了怎么办？」** 不能继续机械执行原计划。计划可能失效，所以架构里要加入 Replan。执行阶段发现计划不再适用时，就重新生成后续计划，再继续执行。

- **「Planner-Executor 和 ReAct 是不是只能选一个？」** 不是。两者适合组合使用。Planner 先生成全量计划，Executor 可以按计划推进，也可以保留 ReAct 的逐步判断能力。计划失效时，再通过 Replan 调整。

## 回答的坑

- 只说 Planner-Executor 更强，却不说明任务超过十步、需要并行拆分、预算或进度管控这些判断信号。

- 把计划当成不可修改的固定流程，忽略计划可能失效，也漏掉 Replan。