---
slug: enterprise-tk723
no: "1623"
title: "How to use stop sequences in LLMs"
question: "How to use stop sequences in LLMs"
excerpt: "面试官想看的不是你会不会设 `stop` 参数，而是你是否理解 stop sequences 在解码阶段的精确触发机制、与 tokenizer 的交互陷阱，以及多序列优先级带来的工程取舍。这是典型的“背概念 + 工程取舍"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4820
updated: "2026-09-29"
---

## How to use stop sequences in LLMs

#### 1️⃣ 考察意图

面试官想看的不是你会不会设 `stop` 参数，而是你是否理解 stop sequences 在解码阶段的**精确触发机制**、**与 tokenizer 的交互陷阱**，以及**多序列优先级**带来的工程取舍。这是典型的“背概念 + 工程取舍”混合题，刁钻点在于：候选人往往只背了 API 用法，却不知道 stop sequences 在 beam search 或 streaming 场景下会失效，也不知道 `stop` 序列本身不包含在输出中可能导致语义截断。答好了能展示你对 LLM 推理管线的底层理解，以及在生产环境中处理边界问题的能力。

#### 2️⃣ 标准答

**定义与核心机制**Stop sequences 是预定义的 token 序列（可以是字符串或 token ID 列表），在自回归解码过程中，模型每生成一个 token，解码器会实时检查已生成文本的**尾部**是否匹配任一 stop 序列。一旦匹配，立即终止生成，且 stop 序列本身**不包含**在输出中。例如 OpenAI API 的 `stop` 参数支持传入 `["\n\n", "User:"]`，当模型生成到 `"\n\n"` 或 `"User:"` 时停止。

**实现原理与关键细节**

- **匹配粒度**：底层实现通常基于 token ID 级别的滑动窗口匹配（类似 KMP 算法），而非字符串匹配。这意味着如果 stop 序列是 `"User:"`，但 tokenizer 将 `"User"` 和 `":"` 拆成两个 token，匹配逻辑必须对齐 token 边界。一个常见坑是：传入的 stop 序列是字符串，但 tokenizer 分词后可能产生歧义（例如 `"stop."` 被拆成 `"stop"` + `"."`，而 stop 序列 `"stop."` 可能匹配失败）。
- **多序列优先级**：当传入多个 stop 序列时，**任意一个**匹配即停止。但需要注意：如果两个 stop 序列有公共前缀（如 `"User:"` 和 `"User says:"`），模型可能先匹配到较短的 `"User:"`，导致输出被截断。实际落地时，建议按长度降序排列 stop 序列，或使用更精确的 token 级匹配。
- **与采样策略的交互**：在 beam search 中，stop sequences 的匹配逻辑更复杂。每个 beam 独立检查 stop 条件，但最终输出可能来自多个 beam 的混合。如果某个 beam 提前匹配 stop 序列，该 beam 会被标记为“完成”，但其他 beam 继续生成。这可能导致最终输出包含 stop 序列（如果从非匹配 beam 选择）。**工程取舍**：为保确定性，生产环境常将 beam search 的 `num_beams` 设为 1，或使用 greedy decoding 配合 stop sequences。
- **Streaming 场景的坑**：在流式输出（如 SSE）中，stop sequences 的匹配需要**缓冲**。例如模型逐 token 吐出 `"Hel"`、`"lo"`、`"\n"`、`"\n"`，客户端不能立即发送每个 token，而需缓存尾部若干 token 做匹配。如果 stop 序列是 `"\n\n"`，第一个 `"\n"` 吐出时不能停止，必须等第二个 `"\n"` 确认。**实际落地的坑**：缓存大小必须大于最长 stop 序列长度，否则可能漏匹配。例如 stop 序列长度为 3，缓存只保留 2 个 token，则永远无法匹配。

**常见应用场景与参数配置**

- **代码生成**：设置 `stop=["```", "\n\n"]`，确保模型在生成完代码块后停止，避免输出多余内容。但需注意：如果代码中本身包含 `"```"`（如 markdown 嵌套），会导致过早停止。解法：使用更长的 stop 序列，如 `"```\n"`。
- **对话系统**：设置 `stop=["User:", "Assistant:", "\n\n"]`，防止模型生成下一轮对话。但需注意：如果用户输入中包含 `"User:"`（如用户说“User: 你好”），stop 序列会误触发。解法：在 prompt 中显式标记角色边界，或使用正则匹配而非固定字符串。
- **结构化输出**：设置 `stop=["\n"]` 限制单行输出，但可能截断关键内容（如 JSON 的换行）。**工程取舍**：优先使用 `response_format` 参数（如 OpenAI 的 JSON mode），而非 stop sequences 做结构化控制。

**性能与边界**

- stop sequences 的匹配计算量很小（O(n) 滑动窗口），但若传入大量 stop 序列（>100），每次解码都需遍历所有序列，可能增加 5-10% 延迟。**trade-off**：在低延迟场景（如实时聊天），建议将 stop 序列数量控制在 5 个以内。
- 某些 API（如 Anthropic）支持 `stop_sequences` 参数，但实现细节不同：Anthropic 的 stop 序列匹配后，会**保留** stop 序列在输出中（除非显式设置 `stop_reason`）。务必阅读文档确认行为。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，stop sequences 的定义与触发机制——它是基于 token ID 的滑动窗口匹配，匹配后立即停止且不包含在输出中。第二，工程陷阱——多序列优先级可能导致短序列误触发，beam search 下可能失效，streaming 场景需要缓冲。第三，最佳实践——代码生成用 `["```\n"]` 而非 `["```"]`，对话系统用角色标记而非字符串匹配，结构化输出优先用 JSON mode。总结一句：stop sequences 是控制 LLM 输出的利器，但必须理解其 token 级匹配逻辑和与采样策略的交互，否则会引入隐蔽的截断 bug。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 stop 序列是 `"stop"`，但模型生成了 `"stopping"`，会停止吗？

> 不会。Stop sequences 要求**精确匹配**尾部序列，`"stop"` 和 `"stopping"` 的前 4 个字符相同，但 token 级匹配会检查完整序列。如果 tokenizer 将 `"stopping"` 拆成 `"stop"` + `"ping"`，则尾部序列是 `"ping"`，不匹配 `"stop"`。如果 tokenizer 将 `"stopping"` 作为一个 token，则完全不匹配。实际工程中，如果希望匹配前缀，需使用自定义逻辑（如正则匹配），而非 stop sequences。

**追问 2**：在 beam search 中，如果两个 beam 分别匹配了不同的 stop 序列，最终输出怎么选？

> 每个 beam 独立检查 stop 条件。当某个 beam 匹配 stop 序列时，该 beam 被标记为“完成”，其累积分数固定。最终输出从所有“完成”的 beam 中选择分数最高的。但如果所有 beam 都未完成，则继续生成直到最大长度。一个隐蔽问题：如果 beam A 匹配了 `"\n"` 而 beam B 匹配了 `"User:"`，最终可能选择 beam B 的输出，其中包含 `"User:"` 但被截断。解法：在 beam search 中，建议将 stop 序列视为“硬停止”，即一旦匹配立即终止整个搜索，而非仅终止单个 beam。但多数框架（如 Hugging Face Transformers）默认不这么做，需自定义回调。

**追问 3**：如何测试 stop sequences 是否正常工作？

> 写一个单元测试：构造一个已知输出包含 stop 序列的 prompt，调用模型并检查输出是否在 stop 序列前截断。例如 prompt 为“请生成一个包含 `\n\n` 的句子”，设置 stop 为 `["\n\n"]`，期望输出为“这是第一句”而非“这是第一句\n\n这是第二句”。同时测试边界情况：stop 序列出现在开头（应停止于空输出）、stop 序列被 tokenizer 拆分（如中文 stop 序列）、多个 stop 序列的优先级。建议使用 deterministic 的 greedy decoding 以避免采样随机性干扰。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“stop sequences 就是设置一个字符串，模型看到就停” → ✅ 正确切入：强调 token 级匹配，举例说明 tokenizer 拆分导致匹配失败（如 `"stop."` 被拆成 `"stop"` + `"."`，stop 序列 `"stop."` 可能不匹配）。
- ❌ 说“stop sequences 越多越好，可以精确控制输出” → ✅ 正确切入：指出大量 stop 序列增加延迟（每次解码遍历所有序列），且短序列误触发风险高，建议控制在 5 个以内，并优先使用更精确的控制方式（如 JSON mode）。
- ❌ 说“streaming 场景下 stop sequences 直接生效，无需额外处理” → ✅ 正确切入：说明 streaming 需要缓冲尾部 token，缓存大小必须大于最长 stop 序列长度，否则漏匹配。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“对话系统 stop 序列配置”切入，举例说明如何设置 `stop=["User:", "Assistant:", "\n\n"]` 避免模型生成下一轮对话，并提到处理用户输入中包含角色标记的边界情况。
- **如果你只做过传统 NLP**：用“正则匹配 vs stop sequences”类比迁移，说明 stop sequences 是 token 级精确匹配，而正则匹配是字符级模糊匹配，前者更高效但灵活性差，后者可处理前缀/后缀但计算开销大。
- **如果你是校招无项目**：聚焦“OpenAI API 的 stop 参数”demo，描述如何用 `stop=["\n\n"]` 控制单轮对话输出，并测试 tokenizer 拆分对中文 stop 序列的影响（如 `"。"` 可能被拆成多个 token）。
- OpenAI API 文档：Stop sequences 参数详解与示例
- Hugging Face Transformers 源码：`StoppingCriteria` 类的实现（`generation/stopping_criteria.py`）
- 论文：”The Curious Case of Stop Sequences in LLM Decoding” (2024, arXiv)
- 博客：”Stop Sequences: The Hidden Pitfalls of LLM Output Control” (Anthropic Engineering Blog)
- 工具：`vllm` 的 `stop` 参数实现（支持 token 级匹配与多序列优先级）

---
