---
slug: mcp-components
question: MCP 由哪几部分组成？
oneLine: 三层看：角色层 Host/Client/Server（Host 是宿主应用，Client 是其通信模块，一 Host 连多 Server）；能力层 Tools/Resources/Prompts 三类；协议层 JSON-RPC 2.0 加 stdio 或 Streamable HTTP 传输。
category: jingchang
company: baidu
tags: [MCP, 协议, 工具调用]
minutes: 5
order: 11
updated: 2026-09-28
deep: 
---

## 先这样答

MCP 的组成按三层讲最清楚，每一层回答一个问题。

角色层回答「谁在和谁通信」。Host 是宿主应用，比如 Claude Desktop、Cursor 这类 AI 客户端，负责管理和调度所有连接；Client 是 Host 内部的连接模块，一个 Client 对应一个 Server 连接，负责初始化、能力发现、请求转发；Server 是工具提供方实现的独立进程。注意 Host 和 Client 不是一回事，一个 Host 可以同时连多个 Server。

能力层回答「Server 能暴露什么」。三类东西职责不同：Tools 是有副作用的操作（创建文件、调外部 API），Resources 是只读数据（读文档内容），Prompts 是预定义的提示词模板。把只读数据和有副作用的操作混在一起说，权限模型就做不干净。

协议层回答「消息怎么传」。消息格式统一 JSON-RPC 2.0；传输方式本地用 stdio（Server 作为子进程，标准输入输出通信，不开端口），远程用 Streamable HTTP（Server 独立部署，多客户端共享）。传输方式和消息格式是解耦的，这是 MCP 能同时覆盖本地和远程场景的关键。

## 面试官会怎么追问

- **「早期版本的 HTTP+SSE 怎么回事？」** 2024 年 11 月的首版规范远程传输是 HTTP 加 SSE 双端点，2025 年 3 月规范更新标记为 deprecated，新项目用 Streamable HTTP 单端点方案。
- **「Client 怎么知道 Server 有哪些能力？」** 连接初始化阶段的能力发现：Client 向 Server 查询它暴露的 Tools、Resources、Prompts 列表，再决定把什么呈现给模型。
- **「本地为什么不用 HTTP？」** 本地子进程走 stdio 免掉网络栈开销、端口管理和鉴权复杂度；远程才需要 HTTP 的可部署、可共享、可鉴权。

## 回答的坑

只答「Client 和 Server 两部分」。漏掉 Host 角色、说不出三类能力的区别，是这题的两个标准扣分点。

传输方式只提一种（只说 HTTP 或只说 stdio），或者漏掉 JSON-RPC 2.0 这个消息格式层。
