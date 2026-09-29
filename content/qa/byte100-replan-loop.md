---
slug: byte100-replan-loop
question: "Planner 生成的计划不可执行时，Executor 怎么反馈和触发 Replan？"
oneLine: "Executor 通过结构化反馈失败步骤、失败类型和已完成结果，让 Planner 增量修改计划。缺参数就地补齐，步骤依赖断裂才触发 Replan，超限直接降级转人工。"
category: jingchang
company: bytedance, xiaohongshu, didi, xiaomi, sensetime, zhipu, nio
track: agent-dev
tags: [字节真题, Agent, Replan]
minutes: 5
order: 80
updated: 2026-09-29
deep: 
---

## 先这样答

Executor 需要通过结构化反馈让 Planner 增量修改计划，并根据错误类型决定是否触发 Replan。Executor 遇到不可执行的计划时，首先收集执行上下文。反馈内容必须包含三个结构化字段。第一是具体的失败步骤。第二是明确的失败类型。失败类型分为参数缺失、前置条件不满足、工具不存在三种情况。第三是已完成步骤的执行结果。这种结构化反馈能避免 Planner 丢弃已有进度。Planner 接收反馈后会进行局部增量修改。这替代了全量重新生成计划。

触发 Replan 需要严格的条件判断。Executor 遇到可恢复错误时会在当前步骤就地解决。例如遇到参数缺失，Executor 直接追问补齐参数。Executor 只有遇到结构性错误才会触发 Replan。例如步骤依赖断裂，后续步骤无法获取前置步骤的输出。

触发 Replan 时必须设置最大重试次数。这个限制能防止 Planner 和 Executor 陷入无限循环。Replan 次数一旦超过预设阈值，系统直接中断自动执行。此时任务降级，转交人工介入处理。

## 面试官会怎么追问

- **「你提到让 Planner 增量修改，具体怎么通过反馈实现？」**
Executor 必须把已完成步骤的结果作为固定上下文传给 Planner。反馈中明确指出失败步骤和具体的失败类型。Planner 接收到这些结构化信息后保留成功步骤。Planner 仅替换报错步骤及受影响的后续节点。

- **「怎么判断一个错误是可恢复错误还是结构性错误？」**
判断标准是错误是否破坏了计划的依赖链条。工具缺少必填参数属于可恢复错误。Executor 直接补齐参数即可继续执行。前置步骤输出不满足后置步骤输入要求会导致依赖断裂。这种情况属于结构性错误，必须交回 Planner 重排。

- **「限制 Replan 次数防循环，超限后降级转人工具体怎么做？」**
Executor 内部维护一个重试计数器。每次触发 Replan 时计数器加一。计数器达到上限后，Executor 停止向 Planner 发送请求。Executor 直接输出包含失败步骤和已完成结果的报告，提示用户手动接管。

## 回答的坑

笼统回答把报错直接扔给大模型重试，未区分可恢复错误与结构性错误。
忽略限制重试次数的兜底机制，暴露缺乏生产环境防死循环经验的问题。