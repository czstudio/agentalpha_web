---
slug: alibaba-fc-mcp-skill-compare
question: "Function Calling、MCP、Skill 三者怎么对比？"
oneLine: "三者不在同一层。Function Calling 是模型侧的调用表达，MCP 是工具侧的接入协议，Skill 是流程侧的知识打包。三者配合完成模型发请求、工具标准化接入与流程编排。"
category: jingchang
company: alibaba
tags: [阿里真题, Agent架构, 工具调用]
minutes: 5
order: 43
updated: 2026-09-29
deep: 
---

## 先这样答

Function Calling、MCP 与 Skill 三者不在同一层。它们分别对应模型侧、工具侧和流程侧。Function Calling 是模型侧的调用表达。模型依靠该机制输出结构化的请求。开发者向模型提供工具列表和参数定义。模型解析用户意图并生成调用指令。这属于大语言模型的基础输出能力。

MCP 是工具侧的接入协议。它解决外部工具连入系统的问题。MCP 规定了工具的标准化封装方式。系统依靠 MCP 完成工具的注册与发现。开发者遵循 MCP 规范编写工具。Agent 运行环境通过 MCP 统一管理这些工具。

Skill 是流程侧的知识打包。它教导 Agent 拿到工具后按什么步骤做事。单纯拥有工具无法完成复杂任务。Agent 需要 Skill 明确多步调用的先后顺序。Skill 定义了具体的业务逻辑流转。这三者在运行中紧密配合。工具经过 MCP 标准化接入。模型用 Function Calling 发出请求。Agent 根据 Skill 编排执行流程。

## 面试官会怎么追问

- **「不用 MCP 只用 Function Calling 能跑通 Agent 吗？」**
能跑通。Function Calling 负责让模型输出结构化数据。开发者可以自己写代码接入外部工具。MCP 提供标准化的接入协议，用来替代零散的自定义代码。

- **「Skill 和 Function Calling 里的工具描述有什么区别？」**
它们层级不同。Function Calling 的工具描述只包含单个工具的输入输出格式。Skill 包含业务流程知识。它规定多个工具如何组合使用以及条件判断逻辑。

- **「这三者在 Agent 架构里是强绑定的吗？」**
不是强绑定。模型可以只做文本生成不用 Function Calling。工具接入可以使用自定义接口不采用 MCP 协议。流程控制也能写死在代码里不抽象成独立的 Skill 模块。

## 回答的坑

把 Function Calling 当成执行工具的动作，它其实只负责生成调用请求。
混淆 MCP 和 Skill 的作用边界，误以为接入协议包含业务逻辑。