---
slug: mcp-vs-function-calling
question: MCP 协议是什么？和 Function Calling 有什么区别？
oneLine: Function Calling 是模型「选工具、填参数」的能力，MCP 是把工具标准化接入的开放协议——一个管能力，一个管接入层，MCP 服务器暴露的工具最终还是要靠 Function Calling 来调。
category: tooluse
tags: [MCP, Function Calling, 协议]
minutes: 5
order: 2
updated: 2026-09-16
---

## 先这样答

这两个东西不在一个层面上，把层次讲清楚是这道题的得分点。

Function Calling 是模型侧的能力：模型根据工具定义输出「调哪个工具、参数是什么」的结构化意图。能力本身是模型厂商训练出来的。

MCP（Model Context Protocol）是 Anthropic 在 2024 年底开源的接入协议，解决的是另一个问题：以前每个应用接每个工具都要写一遍胶水代码——你的 Agent 接飞书要写一套，接数据库再写一套，换一个框架又重写一遍。MCP 把这一层标准化了：工具提供方实现一个 MCP 服务器，按协议暴露工具（tools）、资源（resources）、提示模板（prompts）；任何支持 MCP 的客户端（Claude Desktop、各家 IDE、你自己的 Agent）都能即插即用地发现和调用这些工具。类比来说，MCP 之前是每对设备之间拉一根专属线，MCP 之后是统一的 USB-C。

所以关系是：MCP 服务器把工具「挂」到模型旁边，模型面对这些工具时，选工具、填参数用的仍然是 Function Calling。两者是上下游，不是竞争关系。

面试再加一句工程判断：要不要上 MCP，看你的工具要不要复用——工具只服务一个应用，直接写 Function Calling 的工具注册更简单；工具要跨应用、跨团队共享，或者希望接入生态里现成的 MCP 服务器（GitHub、Slack、各类数据库），MCP 就值得。

## 面试官会怎么追问

- **MCP 的架构里有哪些角色？** Host（Agent 应用）、Client（Host 内维持与单个服务器的连接）、Server（暴露工具/资源），传输支持本地 stdio 和远程 Streamable HTTP。
- **MCP 相比自己写插件，真正的价值是什么？** 生态复用和解耦：工具方升级不用动调用方，调用方换框架不用重写工具；缺点是多了一层协议设施，纯自用的简单工具没必要套。
- **安全上要注意什么？** 工具描述本身可能注入恶意指令，第三方 MCP 服务器要经过审计和授权；工具执行要有权限边界，不能因为「接上了」就全权放行。

## 回答的坑

- 说成「MCP 取代 Function Calling」。层次关系讲反是硬伤，MCP 定义的接入格式最终仍由模型的调用能力消费。
- 只背协议名词。给出「自用工具直连、共享工具上 MCP」的选型判断，比背架构图更能体现工程感。
