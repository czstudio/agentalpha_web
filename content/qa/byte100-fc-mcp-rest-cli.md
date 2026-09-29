---
slug: byte100-fc-mcp-rest-cli
question: "Function Calling、MCP、REST API 和本地 CLI 的职责边界是什么？"
oneLine: "这四者分属不同层级。REST API 是通用网络接口，CLI 是本地进程入口，Function Calling 是模型表达调用的数据格式，MCP 是 AI 客户端接入工具的协议标准。一次调用可贯穿四层。"
category: jingchang
company: bytedance
track: agent-dev
tags: [字节真题, 工具调用, MCP协议]
minutes: 5
order: 85
updated: 2026-09-29
deep: 
---

## 先这样答

这四者分属完全不同的技术层级。REST API 是通用的网络通信接口。CLI 是操作系统层面的本地进程入口。Function Calling 是大语言模型表达工具调用的数据格式。模型只负责输出这种格式。模型完全不关心后端使用什么技术实现。MCP 则是专门给 AI 客户端接入外部工具的协议标准。

它们在实际应用中经常组合工作。一次完整的工具调用可以贯穿这四个层级。用户向 AI 客户端发起自然语言请求。模型理解用户意图。模型通过 Function Calling 生成结构化的请求数据。AI 客户端接收到这些数据。客户端按照 MCP 协议的标准格式去匹配注册好的工具。

MCP 协议负责连接 AI 客户端与工具服务端。协议找到具体的工具后触发底层的执行逻辑。工具背后的实际实现方式通常是 REST API 或者本地 CLI。工具需要获取网络数据时，程序发起 REST API 请求。工具需要控制本机系统时，程序拉起本地 CLI 进程。四者各司其职。它们共同把模型的文本输出转化为真实的计算动作。

## 面试官会怎么追问

- **「如果不用 MCP 协议，只用 Function Calling 能不能调用 REST API？」** 
可以直接调用。开发者需要在业务代码里手动解析 Function Calling 返回的数据。解析完成后开发者自己编写 HTTP 请求去调用 REST API。MCP 提供统一标准替代了这种手写对接逻辑。

- **「Function Calling 返回的结果和 CLI 的标准输出有什么区别？」** 
Function Calling 返回符合约定格式的结构化数据。CLI 的标准输出通常是纯文本流。系统需要把 CLI 的文本输出重新包装成 JSON 格式。模型接收 JSON 格式才能正确理解执行结果。

- **「为什么有了 REST API 还需要 MCP 协议？」** 
REST API 只定义网络传输的接口规范。REST API 没有规定 AI 客户端如何发现工具。REST API 也没有规定如何向模型描述工具参数。MCP 补充了这部分缺失的标准。MCP 让不同的 AI 客户端能以统一的方式接入各种工具。

## 回答的坑

把 Function Calling 当成一种具体的网络通信协议。

混淆 MCP 和 REST API 的作用范围。