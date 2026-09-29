---
slug: function-calling-principle
question: 什么是 Function Calling？它的原理是什么？
oneLine: 开发者用 JSON schema 描述工具传给模型，模型判断需要时输出结构化 tool_calls JSON 而非自然语言，宿主代码执行后把结果回填对话，模型再生成答案——模型只决策、代码执行，两轮对话完成一次调用。
category: jingchang
company: tencent, antgroup, openai, microsoft, google, douyin, jd, bilibili, sensetime, zhipu, nio
track: agent-dev
tags: [Function Calling, 工具调用, Agent]
minutes: 5
order: 9
updated: 2026-09-28
deep: 
---

## 先这样答

Function Calling 是让大模型调用外部工具的标准机制，OpenAI 2023 年推出，现在主流模型都支持。先纠正一个常见误解：模型不执行任何东西，它不能联网、不能跑代码。整个流程是「模型决策、代码执行」的分工。

流程分两轮。第一轮：开发者用 JSON schema 把每个工具的名称、功能、参数描述好传给模型；模型读完问题后判断需要调哪个工具、参数填什么，输出一段结构化的 tool_calls JSON。宿主代码解析这段 JSON，真正去执行工具调用。第二轮：把执行结果塞回对话，模型据此生成最终答案。并行调用是模型一次输出多个 tool_calls，宿主并发执行后统一回填。

它解决的核心问题是确定性。之前的做法靠解析自然语言猜模型「想调什么」，if/else 极其脆弱，模型换个说法就失配；结构化 JSON 输出让调用请求可以被程序稳定解析，工具调用从猜谜变成了工程。

## 面试官会怎么追问

- **「工具描述写不好会怎样？」** 模型选错工具或填错参数。工具调用的准确率很大程度抓在 schema 描述质量上：功能边界、参数含义、使用时机都要写清，这不是模型单方面的能力问题。
- **「模型输出的 JSON 格式错了怎么办？」** 工程上做校验和重试：校验失败把错误信息回给模型让它重新输出；更稳的做法是配合约束解码，在生成层面限制只能产出合法 JSON。
- **「和 MCP 什么关系？」** Function Calling 是模型侧怎么表达调用，MCP 是工具侧怎么标准化接入，一个在客户端协议栈的上层一个在下层，实际系统里配合使用。

## 回答的坑

说「模型自己去调 API」，一句就暴露没理解分工。模型全程只输出调用请求，执行永远在宿主代码。

只讲流程不讲为什么要结构化输出，等于没回答「原理是什么」。
