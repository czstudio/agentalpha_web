---
slug: kuaishou-skill-vs-agent
question: "只写 Prompt 为什么不等于完成了 Agent？Skill 和 Agent 工程的边界是什么？"
oneLine: "Prompt 只解决怎么说，不能代替 Agent 的运行时工程。Skill 是可复用的任务封装，Agent 是负责决策和环境交互的运行时。"
category: jingchang
company: kuaishou
track: agent-dev
tags: [Agent工程, Skill, Prompt]
minutes: 5
order: 304
updated: 2026-09-29
deep: 
---

## 先这样答

Prompt 不等于完成 Agent，因为 Prompt 只解决“怎么说”。它规定模型如何理解任务、组织输出和表达结果。Agent 工程还要完成工具接入、权限与沙箱、状态管理、失败恢复、评测与监控。没有这些部分，模型即使会回答，也不具备完成任务的运行条件。

Skill 和 Agent 的边界在抽象层次。Skill 是任务级封装，由指令、脚本和模板组成。它把一个任务在边界内的做法整理成可复用能力。Skill 本身不负责持续决策，也不负责和外部环境反复交互。一个 Skill 换了模型还能用，前提是它依赖的任务边界和执行条件仍然成立。

Agent 是运行时，核心是决策循环和环境交互。它要根据当前状态选择下一步，调用工具，处理结果，并在失败时恢复。权限、沙箱、状态、评测和监控属于这个工程底座。一个没有工程底座的 Prompt，换个场景就废。所以，Prompt 解决表达，Skill 封装任务，Agent 负责运行。

## 面试官会怎么追问

- **「如果 Prompt 已经能让模型调用工具，为什么还不算 Agent？」** Prompt 只描述模型怎么说，工具调用还需要接入和权限控制。运行时还要管理状态，处理失败，并持续评测和监控。只有这些部分和决策循环、环境交互一起存在，才是 Agent 工程。

- **「Skill 和工具调用有什么区别？」** Skill 是任务级封装，内容包括指令、脚本和模板。它在明确边界内复用任务做法。工具接入属于 Agent 工程的一部分，不能因为 Skill 里写了脚本，就把 Skill 等同于运行时。

- **「Skill 和 Agent 能不能互相替代？」** 不能。Skill 提供任务级的可复用内容，Agent 提供决策循环和环境交互。一个 Skill 换了模型还能用，但没有工程底座的 Prompt 换个场景就废。

## 回答的坑

- 把“能生成一段正确回答”当成“完成了 Agent”，会漏掉权限、沙箱、状态和失败恢复。
- 把 Skill 说成 Agent 本身，会混淆任务级封装与运行时。