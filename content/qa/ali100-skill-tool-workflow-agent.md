---
slug: ali100-skill-tool-workflow-agent
question: "Skill、Tool、Workflow 和 Agent 的边界是什么？企业能力怎么封装？"
oneLine: "Tool 是单个操作，Workflow 是固定编排，Skill 是任务知识与流程包，Agent 是自主决策循环；企业把能力沉到 Tool 与 Workflow，把经验沉到 Skill，只在必要处引入 Agent。"
category: jingchang
company: alibaba
track: agent-dev
tags: [阿里真题, Agent架构, 能力封装]
minutes: 5
order: 110
updated: 2026-09-29
deep: 
---

## 先这样答

结论是，Tool、Workflow、Skill 和 Agent 代表逐步增加的能力粒度。Tool 是单个可调用操作，例如查库存。它解决一个明确动作，不负责组织多个步骤。Workflow 是固定步骤编排。它把多个操作按确定顺序组合起来，执行过程比较稳定。

Skill 是完成一类任务的知识与流程包。它告诉 Agent 要完成什么任务，以及怎样使用相关工具做事。Skill 关注任务经验，不等于某个单独工具。Agent 则是自主决策循环。它会根据当前任务和执行结果，动态决定下一步做什么。Agent 的核心不是把步骤提前写死，而是在过程中进行选择。

企业封装能力时，可以把稳定、通用的能力沉到 Tool 与 Workflow。把业务经验和任务方法沉到 Skill。只有在确实需要动态判断的决策点，才引入 Agent。这样可以让固定部分保持确定，让需要判断的部分保留自主性。判断边界时，我会先看这项能力是单个动作、固定流程、任务经验，还是动态决策。

## 面试官会怎么追问

- **「如果 Skill 也能调用工具，它和 Workflow 怎么区分？」** Skill 面向一类任务，包含完成任务所需的知识与流程。Workflow 面向固定步骤编排，重点是按确定顺序执行。Skill 可以教 Agent 如何使用 Workflow 和 Tool，但两者承担的层次不同。

- **「是不是所有流程都应该交给 Agent？」** 不是。固定步骤应当使用 Workflow，因为它的执行顺序已经确定。只有在下一步需要根据任务或执行结果动态判断时，才引入 Agent。

- **「企业为什么不直接做一个大 Agent？」** 大 Agent 会把单个操作、固定流程、任务经验和自主决策混在一起。企业应先把能力沉到 Tool 与 Workflow，再把经验沉到 Skill。这样只在必要的决策点使用 Agent，边界更清楚。

## 回答的坑

- 不要把 Skill 说成一个工具集合，它是完成一类任务的知识与流程包。

- 不要把 Agent 等同于自动执行流程，它的关键是动态决定下一步。