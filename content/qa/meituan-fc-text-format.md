---
slug: meituan-fc-text-format
question: "Function Call 的训练文本格式怎么组织喂给模型？"
oneLine: "按消息序列组织训练文本：工具定义放系统段，调用请求放 assistant 的结构化字段，工具返回插回 tool 消息，训练只算 assistant 段损失。"
category: jingchang
company: meituan
track: agent-algo
tags: [Function Call, 训练数据, 消息序列]
minutes: 5
order: 226
updated: 2026-09-29
deep: 
---

## 先这样答

Function Call 的训练文本要按消息序列组织。工具定义放在系统段。对话消息按 user、assistant、tool 这些角色依次排列。模型发起工具调用时，把调用请求放进 assistant 消息的结构化字段里。工具执行后的结果，再作为 tool 角色消息插回原来的序列。

训练时，只对 assistant 段计算损失。user 消息、系统段和 tool 消息都作为上下文输入。这样组织后，模型学习的是 assistant 在当前上下文下应该生成的内容，包括普通回复和结构化的工具调用请求。格式需要先标准化，才能作为各家 API 兼容的基础。

## 面试官会怎么追问

- **「工具定义为什么要放在系统段？」** 工具定义属于这轮对话的基础条件，所以放在系统段。模型读取这部分内容后，再按消息序列生成 assistant 消息。

- **「工具调用请求具体放在哪一条消息里？」** 工具调用请求放在 assistant 消息里。它不是单独插入的一条角色消息，而是 assistant 消息中的结构化字段。

- **「为什么训练时只对 assistant 段算损失？」** 训练目标是让模型学习 assistant 应该输出什么。user、系统段和 tool 消息提供上下文，不作为 assistant 输出目标计算损失。

## 回答的坑

不要把工具调用请求写成普通文本，否则没有体现 assistant 消息里的结构化字段。

不要把工具返回混进 assistant 消息，工具返回应作为 tool 角色消息插回消息序列。