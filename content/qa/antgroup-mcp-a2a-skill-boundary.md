---
slug: antgroup-mcp-a2a-skill-boundary
question: "MCP、A2A、Skill 在企业应用里分别负责什么边界？"
oneLine: "MCP管 Agent 向下接工具和数据，A2A管 Agent 横向委托协作，Skill管任务知识与流程封装；企业里工具接 MCP、流程沉淀 Skill、跨团队协作走 A2A。"
category: jingchang
company: antgroup
track: agent-dev
tags: [蚂蚁集团真题, 大模型面试, Agent架构]
minutes: 5
order: 276
updated: 2026-09-29
deep: 
---

## 先这样答

MCP、A2A、Skill 分别负责向下接入、横向协作和任务执行方法。MCP负责让 Agent 连接工具和数据。A2A负责让 Agent 之间进行委托协作。Skill负责封装任务需要的知识与流程，回答怎么把工具用好。

MCP管 Agent 和外部工具、数据之间的连接边界。企业里的工具和数据接入 MCP后，Agent 才能按统一边界使用它们。这里解决的是 Agent 怎么连工具和数据，不负责多个 Agent 之间怎么分工。

A2A管 Agent 之间的协作边界。一个 Agent 可以把任务委托给另一个 Agent。这个关系发生在 Agent 横向协作时，不是 Agent 向下调用工具时。Skill管具体任务的执行方式。它把相关知识和流程封装起来，让 Agent 知道在任务中如何使用已有工具。企业落地时，工具接 MCP，流程沉淀为 Skill，跨团队协作走 A2A。三层各管一段，边界要分清。

## 面试官会怎么追问

- **「MCP 和 Skill 都会涉及工具使用，它们到底有什么区别？」**  
MCP解决 Agent 如何连接工具和数据，属于接入协议。Skill解决任务中如何使用这些工具，属于知识与流程的封装。一个管连接边界，一个管任务方法。

- **「为什么跨团队的 Agent 协作要用 A2A，而不是继续接更多工具？」**  
接更多工具解决的是单个 Agent 向下使用能力的问题。跨团队协作需要 Agent 之间进行任务委托，这属于横向关系。此时应当用 A2A表达协作边界。

- **「如果让你在企业里落地这三层，你会怎么划分？」**  
先把企业工具和数据接入 MCP。再把可复用的任务知识和流程沉淀为 Skill。涉及不同 Agent 或团队之间的任务委托时，使用 A2A。

## 回答的坑

- 把 MCP 说成 Agent 之间的协作协议，混淆了向下接入和横向协作。
- 只讲 Skill 是工具说明，没有讲清它还负责封装任务知识与流程。