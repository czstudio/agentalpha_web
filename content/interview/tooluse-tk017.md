---
slug: tooluse-tk017
no: "917"
title: "什么是 Function Calling？原理是什么"
question: "什么是 Function Calling？原理是什么"
excerpt: "面试官想考察你是否真正理解 Function Calling 的本质，而非仅仅背概念。这属于工程取舍 + 系统设计类问题。刁钻点在于：很多人以为 Function Calling 是模型“学会”了调用函数，实际上它只是输"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3359
updated: "2026-09-29"
---

## 什么是 Function Calling？原理是什么

#### 1️⃣ 考察意图

面试官想考察你是否真正理解 Function Calling 的本质，而非仅仅背概念。这属于**工程取舍 + 系统设计**类问题。刁钻点在于：很多人以为 Function Calling 是模型“学会”了调用函数，实际上它只是**输出结构化 JSON**，真正的调度逻辑在应用层。答好了能展示你对 LLM 与外部系统交互的底层理解、对 prompt 工程和 schema 设计的敏感度，以及区分“模型能力”与“工程实现”的硬实力。

#### 2️⃣ 标准答

Function Calling 是 LLM 根据用户意图，输出**结构化函数调用参数**的能力，而非模型主动执行代码。核心原理是：通过微调或 prompt 注入，让模型学会输出特定 JSON 格式，包含函数名和参数，应用层再解析并执行。

**实现步骤拆解：**

- **定义函数 Schema**：用 JSON Schema 描述每个函数，包括 `name`、`description`、`parameters`（类型、枚举、必填等）。例如 `get_weather(location: string, unit: string)`。**关键**：`description` 要写清楚函数何时被调用，比如“当用户询问天气时调用”，这直接影响模型的选择准确率。
- **注入系统提示**：将 schema 列表作为 `tools` 参数传给模型 API（如 OpenAI 的 `tool_choice`）。模型在生成时，会参考这些 schema 决定是否输出 `tool_calls`。**工程取舍**：schema 过多（>20 个）会显著增加 token 消耗和推理延迟，且模型可能混淆相似函数。解法是**动态筛选**：先用 embedding 或关键词匹配，只注入 top-K 个相关函数。
- **解析模型输出**：模型返回的 `tool_calls` 字段包含 `id`、`function.name`、`arguments`（JSON 字符串）。应用层解析后，调用对应函数。**坑**：模型可能输出非法 JSON（如缺少引号、多余逗号）。解法：用 `json.loads` 加 `try-except`，失败时用正则修复或重试一次。
- **执行并返回结果**：将函数执行结果（如天气数据）作为新消息（`role: "tool"`）追加到对话，模型据此生成最终回复。**为什么这么做**：这保持了对话的上下文完整性，模型能基于真实结果推理，而非猜测。

**与普通 API 调用的区别**：普通 API 是硬编码的规则匹配（如“天气”关键词触发），而 Function Calling 是**语义理解驱动**的。模型能理解“今天出门需要带伞吗？”并自动选择 `get_weather`，甚至组合多个函数（如先查位置再查天气）。

**实际落地的坑 + 解法**：

- **函数幻觉**：模型可能调用不存在的函数或参数。解法：在 schema 中严格定义 `required` 字段，并在解析层做白名单校验。
- **多轮上下文污染**：历史对话中的函数调用结果可能干扰当前决策。解法：定期清理 `tool` 消息，或使用 `max_tokens` 限制上下文长度。
- **延迟敏感场景**：每次函数调用都需一次 API 往返。解法：**并行调用**多个独立函数（如同时查天气和新闻），减少总延迟。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、原理、工程实现三个层面回答。定义上，Function Calling 是 LLM 输出结构化 JSON 参数的能力，而非执行代码。原理上，通过注入函数 schema 到 prompt，模型学会在需要时输出 `tool_calls`。工程实现上，关键步骤是 schema 设计、动态筛选、JSON 解析和结果回传。总结一句：Function Calling 是 LLM 与外部系统交互的桥梁，核心在 prompt 工程和 schema 设计，而非模型本身。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果模型连续调用同一个函数 5 次，你怎么处理？

> 这是典型的**循环调用**问题。解法：1）在应用层设置**最大调用次数**（比如 3 次），超限后强制终止并返回“无法完成”。2）检查每次调用的参数是否重复，若相同则判定为死循环，直接报错。3）在系统提示中加约束：“如果已获取足够信息，请直接回复用户，不要重复调用”。4）用 `tool_choice: "none"` 强制模型停止调用。

**追问 2**：Function Calling 和 Tool Use 有什么区别？

> Tool Use 是更宽泛的概念，指模型使用外部工具（API、数据库、代码执行器等）。Function Calling 是 Tool Use 的一种**具体实现方式**，由 OpenAI 提出，特点是基于 JSON Schema 的结构化输出。其他实现包括：1）**ReAct**：模型输出“Thought/Action/Observation”文本，应用层正则解析。2）**Code Interpreter**：模型直接输出 Python 代码，沙箱执行。3）**MCP**：通过协议标准化工具调用。Function Calling 的优势是格式严格、易解析，劣势是依赖模型微调，对 schema 质量敏感。

**追问 3**：如何让模型在不确定时拒绝调用函数，而不是瞎猜？

> 核心是**不确定性处理**。1）在 schema 的 `description` 中写：“仅当用户明确提及地点和需求时调用，否则返回空”。2）在系统提示中加：“如果你不确定，请回复‘我需要更多信息’”。3）在应用层设置**置信度阈值**：如果模型输出的参数包含默认值（如 `location: "unknown"`），判定为低置信，触发追问。4）使用 `temperature=0` 减少随机性，但会牺牲多样性。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Function Calling 是模型主动调用函数” → ✅ 正确说法是“模型输出结构化参数，应用层负责调度执行”
- ❌ 说“函数 schema 越多越好” → ✅ 正确做法是“动态筛选 top-K 个相关函数，避免 token 浪费和混淆”
- ❌ 说“模型输出 JSON 一定合法” → ✅ 正确做法是“加 try-except 和正则修复，处理非法 JSON”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“Function Calling 与 RAG 的互补”切入，比如用 FC 调用搜索 API，RAG 做文档检索，展示你对 Agent 架构的理解。
- **如果你只做过传统 NLP**：用“意图识别 + 槽位填充”类比，Function Calling 就是 LLM 版的 NLU，但更灵活、无需训练数据。
- **如果你是校招无项目**：聚焦“天气查询 Agent”的 demo 实现，强调你手写过 schema 和 JSON 解析，踩过非法输出的坑。
- OpenAI Function Calling 官方文档（2023 年 6 月发布）
- 《Toolformer: Language Models Can Teach Themselves to Use Tools》
- 《ReAct: Synergizing Reasoning and Acting in Language Models》
- 《Gorilla: Large Language Model Connected with Massive APIs》
- LangChain Tool Calling 实现源码（`BaseTool` 和 `tool_calls` 解析逻辑）

---
