---
slug: agent-harness
term: Agent Harness
en: Agent Harness
oneLine: Agent Harness 是包裹模型的工程外壳，负责上下文组装、工具注册与调度、循环控制及权限安全的整体实现。同一模型在不同 Harness 下表现差异大，是 Agent 工程的核心。
aliases: [Harness, Agent 框架层, 脚手架]
group: agent
tags: [Harness, Agent 工程]
relatedQa: [agent-harness, bytedance-agent-message-types]
relatedTerms: [ai-agent, react-pattern]
updated: 2026-09-28
---

## 是什么

Agent Harness 包含系统提示词工程、上下文窗口管理、工具集设计与选择、循环与终止控制、结果校验以及沙箱与权限机制。上下文窗口的压缩与裁剪也属于其管理范畴。

模型的原始能力仅决定上限，Harness 决定模型实际发挥的程度。工具描述质量、上下文组织方式及错误反馈回路构建，均属于 Harness 的范畴。

同一个模型在终端、集成开发环境或网页等不同的 Coding Agent 场景下表现差异巨大，这种差异完全由 Harness 层的实现决定。

## 解决什么问题

在模型能力趋于同质化时，竞争层上移到了工程外壳的质量。Agent Harness 填补了模型原始输入输出与复杂任务之间的空白，使工程实践与面试的重点从单纯的调整模型转向构建高质量的 Harness。

## 面试怎么考

面试常见考法有三种：什么是 Harness、为什么同模型在不同框架下效果差异大、设计一个 Coding Agent 的 Harness 需要做哪些事。

答题时应指出，设计需涵盖工具定义、上下文截断、循环控制及沙箱权限控制，强调工程外壳对模型能力发挥的决定作用。
