---
slug: enterprise-tk105
no: "1005"
title: "How would you structure a prompt to ensure the LLM output is in a specific format, like JSON"
question: "How would you structure a prompt to ensure the LLM output is in a specific format, like JSON"
excerpt: "面试官真正想看的不是你会不会写“output JSON”这句话，而是你对 LLM 输出控制的工程化理解。这道题属于工程取舍 + debug 类型，刁钻点在于：LLM 本质是概率生成器，你无法强制它输出合法 JSON，只能"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4487
updated: "2026-09-29"
---

## How would you structure a prompt to ensure the LLM output is in a specific format, like JSON

#### 1️⃣ 考察意图

面试官真正想看的不是你会不会写“output JSON”这句话，而是你对 LLM 输出控制的**工程化理解**。这道题属于**工程取舍 + debug** 类型，刁钻点在于：LLM 本质是概率生成器，你无法强制它输出合法 JSON，只能通过 prompt 设计、约束解码和后处理三板斧来逼近 100% 成功率。答好了能展示你对 prompt 工程、结构化生成（如 JSON mode、function calling）和容错机制的实战经验，而不是只会背 prompt 模板。

#### 2️⃣ 标准答

控制 LLM 输出 JSON 格式，核心是三层策略：**prompt 约束 + 解码干预 + 后处理兜底**。下面按优先级展开。

#### 第一层：Prompt 设计（最基础，但不够）

- **明确 schema**：在 prompt 里直接给出 JSON 结构，例如 `Output a JSON object with keys: "name" (string), "age" (integer), "city" (string).` 不要只说“输出 JSON”，要定义字段类型和约束。
- **使用约束性语言**：加一句 `Only output valid JSON, no other text, no markdown formatting.` 这能减少 LLM 在 JSON 前后加解释的倾向。
- **提供 few-shot 示例**：给一个完整示例，比如 `{"name": "Alice", "age": 30, "city": "Beijing"}`。示例能显著降低格式错误率，尤其是对复杂嵌套结构。
- **系统消息 vs 用户消息**：把格式要求放在 system prompt 里，因为 system prompt 的优先级更高，且不易被用户输入覆盖。例如 `system: "You are a JSON-only assistant. Your output must be a valid JSON object."`

**工程取舍**：prompt 约束是零成本方案，但**无法保证 100% 合规**。LLM 可能输出 `{"name": "Alice", "age": "30"}`（age 变成字符串），或者漏掉逗号。所以必须配合后两层。

#### 第二层：解码干预（生产级方案）

- **JSON mode**：很多 API 提供结构化输出模式。例如 OpenAI 的 `response_format={"type": "json_object"}`，或 Anthropic 的 `{"type": "json"}`。这会在解码阶段强制模型只生成合法 JSON token，**格式正确率接近 100%**。
- **Function calling**：把 JSON schema 定义成函数参数，让模型通过 function call 输出结构化数据。例如 OpenAI 的 `tools` 参数，可以指定 `{"type": "function", "function": {"parameters": {"type": "object", "properties": {...}}}}`。这比 JSON mode 更灵活，支持嵌套和枚举。
- **约束解码库**：使用 `outlines`、`lm-format-enforcer` 或 `guidance` 等库，在本地推理时通过正则或 CFG 约束生成过程。例如用 `outlines` 定义 Pydantic 模型，然后 `model.generate(prompt, schema=MyModel)`。

**实际落地的坑 + 解法**：JSON mode 在复杂 schema 下可能失败，比如要求 `"age": integer` 但模型输出 `"age": 30.0`（float）。解法：在 schema 里加 `"strict": true`（OpenAI 支持），或在后处理做类型转换。

#### 第三层：后处理兜底（必须做）

- **解析校验**：用 `json.loads()` 尝试解析，如果失败则触发重试逻辑。重试时把错误信息反馈给 LLM，例如 `Your output was not valid JSON: {error}. Please fix and output only JSON.` 这通常能修复 90% 的格式错误。
- **正则提取**：如果 LLM 在 JSON 前后加了文本，用正则 `\{.*\}` 或 `\[.*\]` 提取 JSON 部分。注意贪婪匹配问题，可以用 `re.DOTALL` 处理多行。
- **类型修正**：对解析后的 JSON 做 schema 校验，比如检查 `age` 是否是 int，`city` 是否在允许列表内。如果类型不对，做强制转换或丢弃。

**工程取舍**：后处理是最后防线，但会增加延迟和 token 消耗。生产环境建议优先用 JSON mode，后处理只做 5% 的兜底。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从 prompt 设计、解码干预和后处理兜底三个层面回答。第一层，在 prompt 里明确 schema、加约束语言、给 few-shot 示例，并把格式要求放在 system prompt 里。第二层，生产环境优先用 JSON mode 或 function calling，比如 OpenAI 的 `response_format={"type": "json_object"}`，这能保证格式正确率接近 100%。第三层，后处理做解析校验和正则提取，失败时重试。总结一句：不要只依赖 prompt，要用解码约束兜底，后处理做最后防线。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 JSON mode 不支持你用的模型（比如开源模型），你怎么保证格式？

> 用约束解码库，比如 `outlines` 或 `lm-format-enforcer`。这些库在推理时通过 logit 屏蔽，只允许生成符合 JSON schema 的 token。例如用 `outlines` 定义 Pydantic 模型，然后 `model.generate(prompt, schema=MyModel)`。代价是推理速度下降 10-20%，但格式正确率接近 100%。如果模型不支持 logit 屏蔽，就用后处理重试，设置最大重试次数为 3，超过则返回默认 JSON。

**追问 2**：你的 prompt 里给了 few-shot 示例，但模型还是输出 markdown 代码块（比如 `json ... `），怎么解决？

> 这是常见坑。解法：在 prompt 里加否定示例，比如 `Do NOT wrap the JSON in markdown code blocks. Output raw JSON only.` 同时在后处理用正则 `(?s)```(?:json)?\s*(\{.*?\})\s*``` ` 提取代码块内的内容。如果模型是 GPT-4 级别，可以在 system prompt 里加 `You are a raw JSON generator. Never use markdown.` 如果还不行，考虑用 JSON mode 强制跳过 markdown 阶段。

**追问 3**：你的 JSON schema 里有一个字段是枚举值，比如 `"status": "active" | "inactive"`，怎么确保模型不输出其他值？

> 在 prompt 里明确枚举列表：`"status" must be one of "active" or "inactive".` 同时在后处理做校验，如果输出不在列表内，重试时把错误反馈给 LLM。更可靠的做法是用 function calling 的 `enum` 参数，比如 `{"type": "string", "enum": ["active", "inactive"]}`，这样模型在解码时会被约束。如果模型不支持 enum，就用约束解码库定义正则 `(active|inactive)`。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只说“在 prompt 里写 output JSON 就行” → ✅ 必须强调 prompt 约束不够，需要解码干预和后处理兜底，因为 LLM 是概率生成器，无法强制。
- ❌ 认为 JSON mode 能解决所有问题 → ✅ JSON mode 只保证格式合法，不保证内容符合 schema（比如类型、枚举值），后处理校验必须做。
- ❌ 在 prompt 里用“Please”等礼貌用语 → ✅ 用命令式语言，比如 “Output ONLY valid JSON.”，减少模型“解释”的倾向。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从结构化输出角度切入，比如你如何用 JSON mode 控制检索结果的结构化输出，确保下游解析无错误。可以提你对比过 prompt 约束 vs JSON mode 的格式正确率（比如 85% vs 99%）。
- **如果你只做过传统 NLP**：用正则和解析器类比，比如你之前用正则提取实体，现在用 LLM + JSON mode 做更灵活的提取，但后处理逻辑类似。强调你对 schema 校验和容错的理解。
- **如果你是校招无项目**：聚焦论文复现，比如你复现过 OpenAI 的 JSON mode 论文（或官方文档），并写了一个 demo 对比不同 prompt 策略的效果。可以提你用过 `outlines` 库做约束解码。
- OpenAI 官方文档：Structured Outputs (JSON mode & Function calling)
- Anthropic 官方文档：JSON mode in Claude
- 论文：`Outlines: A Library for Structured Text Generation`
- 博客：`How to Get LLMs to Output JSON Every Time` (by LangChain)
- 工具：`lm-format-enforcer` GitHub repo

---
