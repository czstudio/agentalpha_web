---
slug: "react-over-cot"
no: "02"
title: "面试官问：为什么 ReAct 是现代 Agent 的底层逻辑？单靠 CoT 根本不够？"
question: "为什么 ReAct 是现代 Agent 的底层逻辑？单靠 CoT 根本不够？"
excerpt: "在面试大模型工程岗、Agent 岗时，经常有同学被问懵：  “你能解释一下 ReAct 框架吗？为什么现在主流 Agent 都采用 ReAct？"
tags: ["ReAct"]
author: "吴师兄"
source: "公众号 吴师兄学大模型"
minutes: 5
words: 2287
---

大家好，我是吴师兄。

在面试大模型工程岗、Agent 岗时，经常有同学被问懵：**“你能解释一下 ReAct 框架吗？为什么现在主流 Agent 都采用 ReAct？”**

如果你只回答：

> “ReAct = Reason + Act，先思考再执行。”

这种回答基本没用，会被面试官当场判定为“看过几篇文章，但没做过工程”。

真正要答到点上，你必须能解释：

* 为什么 CoT（思维链）不够？

* 为什么需要 Action、Observation？

* ReAct 完整闭环如何解决 Agent 的“行动稳定性问题”？

* 为什么 ReAct 是目前所有 AGI、Agent 框架的底层范式？

下面我们把这个问题讲透。

## 一、LLM 最大的问题：只能“想”，不会“做”，更不会“纠错”

LLM 本质是“被动生成式”的。

它能写计划、能回答问题，但缺乏：

* **可执行能力（Execute）**

* **状态意识（Environment State）**

* **错误感知能力（Feedback Loop）**

例如：

> “帮我查下上海到北京明天的机票，然后订一张最便宜的。”

纯 LLM 会出现：

* 输出一堆自然语言描述

* 和真正的 API 没有联动

* 甚至会“编造航班号”

你把这种能力接到企业系统里，十之八九会“幻觉狂飙”。

所以，LLM 必须从“语言模型”升级成“Agent 模型”，而这一步的关键就是 **ReAct 框架**。

## 二、CoT 只能“思考”，却无法让系统真正可靠运行

很多同学学了 CoT 后以为自己理解 Agent 了，这是典型误区。

CoT 的核心问题：

* **只能生成“思维链”，无法执行真实动作**

* **没有环境反馈，思考永远不会修正**

* **只是一段文本，无法保证结构化输出**

举个例子：

> “订机票前需要先查询航班。”

CoT 会写出类似：

Step 1：查询航班
Step 2：选择航班
Step 3：预订机票

它会思考，但不执行，你也不知道它思考对不对。 这在企业里是无法落地的。

## 三、ReAct 的核心：让模型“先思考，再行动，再根据反馈继续思考”

Agent 的动作流如下：

> **Thought → Action → Observation → Thought → Action → …**

这就是 ReAct 的完整循环。

我们拆一下：

### **① Thought（思考）**

LLM 分析任务：“需要查询航班”。

### **② Action（行动）**

LLM 用 Function Call：

{
"tool": "search_flights",
"args": {
"origin": "上海",
"destination": "北京",
"date": "明天"
}
}

这是实际可执行的结构化动作。

### **③ Observation（观察结果）**

后端调用 API 返回航班列表：

[
{"flight_id": "MU123", "price": 480},
{"flight_id": "CA234", "price": 520}
]

### **④ Thought（反思）**

模型判断需要预订 MU123。

### **⑤ Action（执行下一步）**

继续调用预订接口。

**这套流程，让 LLM 从“生成式模型”升级成“问题求解模型”。**

## 四、为什么 ReAct 是工业界 Agent 的默认范式？

因为它完美解决了企业所有痛点：

## **（1）可控性：每一步都能审查、校验、回滚**

在 ReAct 中：

* 思考（Thought）可以禁用或隐藏

* Action 每次都可验证

* Observation 可判断是否异常

* 可以让系统自动 Retry / Reflection

这让 Agent 具备“工程级的可靠性”。

## **（2）可复现性：每一个决策链都是明确的**

企业最怕“不确定”，ReAct 在日志中会留下：

用户输入 → Thought → Action → Observation → Action → 结果

完整链路可复盘，可监控，可调优。

## **（3）错误可恢复：有 Feedback 才能自我纠错**

例如支付失败，ReAct 能够这样处理：

Observation: "Payment failed"
Thought: "应该尝试备用支付方式"
Action: 调用 backup_card 支付

这就是智能。

## **（4）可扩展性：轻松支持多步骤、多工具、多策略**

你的 Agent 需要接：

* 天气系统

* 订票系统

* 用户画像系统

* 外部数据 API

ReAct 天然支持多工具组合。

## 五、面试官会进一步问：为什么所有 Multi-Agent 都是基于 ReAct？

> **多 Agent = 多个 ReAct Agent 互相发送 Thought/Action/Observation。**

这意味着：

* 一个 Agent 负责规划

* 一个 Agent 负责执行

* 一个 Agent 负责校验结果

* 一个 Agent 负责 Memory & RAG

整个 AI 系统像“多人团队协作”，而基础全是 ReAct 循环。

如果你能讲到这里，面试官会知道你真的理解 Agent 底层机制。

## 六、面试官最喜欢的总结方式（非常加分）

最后你可以这样总结：

> “LLM 是文本生成器，CoT 是思维增强，而 ReAct 才是把模型推向行动智能的关键一步。

> 企业需要的不是一个回答问题的 LLM，而是能完成任务、能纠错、能连续行动的 Agent。

> 所以 ReAct 是当下最重要的 Agent 底层范式。”

面试官听完这段会非常满意。
