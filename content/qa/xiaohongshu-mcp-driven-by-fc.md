---
slug: xiaohongshu-mcp-driven-by-fc
question: "MCP 底层靠什么驱动？和 Function Calling 是什么关系？"
oneLine: "MCP 的工具调用最终落到 Function Calling 的输出格式上，FC 负责表达调用意图，MCP 负责工具的标准化封装、注册与发现。"
category: jingchang
company: xiaohongshu
track: agent-dev
tags: [小红书真题, MCP, Function Calling]
minutes: 5
order: 192
updated: 2026-09-29
deep: 
---

## 先这样答

MCP 的工具调用最终落到 Function Calling 的输出格式上。模型通过 Function Calling 表达要调用哪个工具，以及这个工具需要什么参数。MCP 不替代 Function Calling。

两者处在不同层次。Function Calling 是模型和工具之间的调用语言。它规定模型如何表达工具选择和参数。MCP 是工具生态协议。它负责把工具做标准化封装，也负责工具的注册与发现。

所以，模型先用 Function Calling 产出工具调用信息。MCP 再围绕工具本身提供统一的封装、注册和发现方式。面试里可以直接概括为：FC 解决“怎么表达调用”，MCP 解决“工具怎么被统一接入和找到”。两者是配合关系，不是替代关系。

## 面试官会怎么追问

- **「你为什么说 MCP 不是 Function Calling 的替代品？」** Function Calling 负责表达调用哪个工具和传入什么参数。MCP 负责工具的标准化封装、注册与发现。两者解决的问题不同，所以不是替代关系。

- **「模型在这套调用里具体做了什么？」** 模型使用 Function Calling 输出工具调用信息。这个信息包含工具名称和对应参数。MCP 负责工具侧的标准化接入，以及工具的注册和发现。

- **「如果只用一句话区分 MCP 和 Function Calling，你怎么说？」** Function Calling 是调用语言。MCP 是工具生态协议。前者表达调用，后者统一管理工具的封装、注册与发现。

## 回答的坑

- 把 MCP 说成比 Function Calling 更底层或能替代 Function Calling，混淆了两者的职责边界。

- 只讲 MCP 能发现和注册工具，却漏掉工具调用最终依赖 Function Calling 的输出格式。