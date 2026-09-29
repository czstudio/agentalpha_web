---
slug: mcp-what-and-core
question: 什么是 MCP？它的核心内容是什么？
oneLine: MCP 是 Anthropic 2024 年底推出的开放协议，解决工具接入碎片化：工具按协议实现一次、任何支持 MCP 的客户端都能复用，三层核心是 Host/Client/Server 角色、Tools/Resources/Prompts 能力、JSON-RPC 2.0 通信。
category: jingchang
company: bytedance
track: agent-dev
tags: [MCP, 工具调用, 协议]
minutes: 5
order: 3
updated: 2026-09-28
deep: 
---

## 先这样答

MCP 是 Anthropic 在 2024 年底推出的开放协议，解决的是「模型接工具太碎片化」的问题。在它出现之前，每接一个新工具都要单独写集成代码、处理认证、适配格式，而且这套代码和具体客户端强绑定，换个应用就得重写。MCP 的思路是把接入这件事标准化：工具提供方按协议实现一个 Server，任何支持 MCP 的客户端直接接进来，一次实现到处复用。

核心内容按三层讲。角色层：Host 是宿主应用，Client 是 Host 里负责和一个 Server 通信的模块，一个 Host 可以同时连多个 Server。能力层：Server 暴露三类东西，Tools 是有副作用的操作，Resources 是只读数据，Prompts 是提示词模板。协议层：消息格式统一用 JSON-RPC 2.0，本地传输用 stdio，远程用 Streamable HTTP。

一句话收尾：它给「AI 接工具」定了一套行业标准，注意它是协议不是框架，和 Function Calling 不在一个层面——后者解决模型怎么输出调用请求，MCP 解决工具怎么标准化接入。

## 面试官会怎么追问

- **「MCP 和 Function Calling 什么关系？」** 两者互补不竞争。Function Calling 是模型侧的能力：模型输出结构化的调用请求；MCP 是工具侧的标准：工具怎么被发现、描述、连接。实际系统里模型用 Function Calling 的形式发请求，工具通过 MCP 接入。
- **「Tools、Resources、Prompts 为什么要分三类？」** 副作用等级不同。Tools 会改变外部状态要谨慎授权，Resources 只读可以放宽，Prompts 只是模板。混在一起会导致权限模型做不干净。
- **「为什么选 JSON-RPC 2.0 做消息格式？」** 它是现成的轻量 RPC 规范，请求响应模式正好匹配 Client 调 Server 方法的场景，JSON 可读可调试，任何语言都能实现。

## 回答的坑

把 MCP 说成「框架」或「只给 Claude 用的 API」。它是开放协议，任何客户端都能接，说错定位这题直接不及格。

只答 Client 和 Server 两部分，漏掉 Host 角色，或者把只读数据和有副作用的操作混在「工具」一个词里说。
