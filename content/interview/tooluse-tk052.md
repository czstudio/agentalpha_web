---
slug: tooluse-tk052
no: "952"
title: "Function Calling 和 Toolformer 的本质区别是什么?各自在训练/推理阶段如何工作"
question: "Function Calling 和 Toolformer 的本质区别是什么?各自在训练/推理阶段如何工作"
excerpt: "面试官想看你是否真正理解“模型调用工具”的两种根本范式，而非只背API用法。考察类型是工程取舍+系统设计。刁钻点在于：很多人以为Function Calling是OpenAI专属能力，Toolformer只是论文——实际"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4214
updated: "2026-09-29"
---

## Function Calling 和 Toolformer 的本质区别是什么?各自在训练/推理阶段如何工作

#### 1️⃣ 考察意图

面试官想看你是否真正理解“模型调用工具”的两种根本范式，而非只背API用法。考察类型是**工程取舍+系统设计**。刁钻点在于：很多人以为Function Calling是OpenAI专属能力，Toolformer只是论文——实际上它们代表了**推理时对齐 vs 训练时内化**两条路线。答好了能展示你对模型能力边界、训练成本、推理延迟的权衡判断，以及从论文到落地的工程嗅觉。

#### 2️⃣ 标准答

**本质区别：控制点不同**

- **Function Calling**：模型在推理时，通过prompt或微调学会输出结构化JSON（如`{"name":"get_weather","arguments":{"city":"北京"}}`），然后由外部系统解析执行。控制点在**推理阶段**，模型本身不“理解”工具，只是输出格式。
- **Toolformer**：在训练阶段，模型通过自监督方式生成工具调用数据（如`[Calculator(3+5)] -> 8`），将工具使用能力内化为模型参数的一部分。控制点在**训练阶段**，推理时模型自动决定何时调用，无需外部schema。

**训练阶段工作流程**

- **Function Calling**：
- **微调路线**：用包含函数调用的对话数据（如`用户问天气 → 模型输出函数调用 → 系统返回结果 → 模型生成最终回答`）对基座模型进行SFT。数据量通常10k-100k条，成本可控。
- **零样本路线**：通过精心设计的system prompt（含函数schema）和few-shot示例，让模型在推理时直接输出JSON。依赖模型本身的指令遵循能力，无需额外训练。
- **坑**：微调时如果函数schema变化（如新增参数），模型可能输出旧格式，需要重新微调或做prompt工程。
- **Toolformer**：
- **自监督数据生成**：对每个训练样本，模型尝试调用候选工具（如计算器、搜索API），如果调用结果能降低后续token的困惑度（perplexity），则保留该调用作为训练数据。
- **训练**：用这些带工具调用的文本继续预训练（continue pretraining），模型学会在需要时插入`[ToolName(input)]`标记。
- **坑**：数据生成阶段需要大量API调用（论文中用了约100万次），成本极高；且工具调用决策依赖困惑度阈值，阈值设置不当会导致模型过度调用或从不调用。

**推理阶段工作流程**

- **Function Calling**：
- 用户请求 + 函数schema（JSON格式）拼接成prompt输入模型。
- 模型输出结构化JSON或自然语言（取决于实现），外部系统解析后执行函数，结果返回模型生成最终回答。
- **延迟**：通常1-2次模型调用（一次生成函数调用，一次生成最终回答），延迟可控。
- **Trade-off**：schema必须提前定义，模型无法动态发现新工具；但实现简单，适合生产环境。
- **Toolformer**：
- 模型自回归生成文本，当遇到`[ToolName(input)]`标记时，暂停生成，调用对应工具获取结果，然后继续生成。
- **延迟**：每次工具调用都会打断生成，且模型可能多次调用，延迟不可控（论文中平均每个样本调用2-3次工具）。
- **Trade-off**：模型能自主决定何时调用，无需外部schema；但推理时需修改解码逻辑（如暂停、调用、恢复），工程复杂度高。

**实际落地坑+解法**

- **坑**：Function Calling中，模型可能输出无效JSON（如缺少逗号、字段名错误）。**解法**：用正则+JSON解析库做容错，或训练时加入格式错误的负样本（如`{"name":"get_weather","arguments":"北京"}`作为错误示例）。
- **坑**：Toolformer在推理时，如果工具返回错误（如API超时），模型可能陷入死循环。**解法**：设置最大调用次数（如3次），超限后强制生成自然语言回答。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从训练范式、推理流程、工程取舍三个层面回答。训练层面，Function Calling通过微调或prompt让模型学会输出JSON，控制点在推理时；Toolformer通过自监督数据生成将工具使用内化为模型参数，控制点在训练时。推理层面，Function Calling需要外部schema，延迟低但灵活性差；Toolformer自动决策，延迟高但适应性强。总结一句：Function Calling是‘教模型说工具语言’，Toolformer是‘让模型长工具器官’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果我想让模型调用100个工具，用Function Calling还是Toolformer？为什么？

> 选Function Calling。原因：Toolformer需要为每个工具生成自监督数据（约100万次API调用），100个工具就是1亿次调用，成本不可接受。Function Calling只需在prompt中列出所有工具的schema（注意token限制，GPT-4 Turbo支持128K上下文，100个工具schema约5K tokens），模型通过注意力机制选择合适工具。但要注意：工具过多时模型可能混淆（如把“get_weather”和“get_air_quality”搞混），建议用分层schema（先分类再选具体工具）。

**追问 2**：Toolformer的自监督数据生成中，如何判断一个工具调用是否“有用”？

> 核心是困惑度（perplexity）对比。对每个候选调用位置，生成两种文本：A（不调用工具，直接生成后续token）和B（调用工具，用工具结果替换标记后生成后续token）。如果B的困惑度低于A（论文中阈值设为0.5），则保留该调用。但要注意：这个阈值很敏感，设低了模型会过度调用（如每个数字都调用计算器），设高了模型从不调用。实践中建议用验证集调参，或改用强化学习（如GRPO）直接优化工具调用成功率。

**追问 3**：Function Calling中，模型输出JSON格式错误怎么办？有没有比正则更好的方法？

> 有。第一，用约束解码（constrained decoding），如Outlines库或Guidance框架，在解码时强制模型输出合法JSON，从源头避免格式错误。第二，用结构化输出API（如OpenAI的`response_format={"type":"json_object"}`），模型内部做格式保证。第三，如果必须用正则，建议用`json5`库（支持注释、尾逗号）而非标准`json`库，容错性更好。Trade-off：约束解码增加推理延迟（约10-20%），结构化API依赖厂商支持。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “Function Calling是OpenAI独有的，Toolformer是Meta的论文，两者没关系。” → ✅ “两者是两种范式：Function Calling是推理时对齐（任何模型都能通过微调或prompt实现），Toolformer是训练时内化（需要自监督数据生成和继续预训练）。OpenAI的Function Calling只是其中一种实现，不是定义。”
- ❌ “Toolformer比Function Calling更先进，应该全面取代。” → ✅ “各有适用场景：Function Calling适合工具数量少、schema固定的生产环境（如客服系统）；Toolformer适合工具数量多、需要模型自主探索的场景（如科研助手）。Toolformer的训练成本高、推理延迟大，不是银弹。”
- ❌ “Function Calling不需要训练，直接写prompt就行。” → ✅ “零样本Function Calling依赖模型本身的指令遵循能力，对弱模型（如7B以下）效果差。实际生产中通常需要微调（至少1k条数据），否则模型可能输出自然语言而非JSON，或忽略工具调用。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“工具调用与检索的协同”切入——Function Calling类似RAG中的查询改写（模型输出结构化查询），Toolformer类似RAG中的自检索（模型自主决定何时检索）。对比两者在延迟、成本、召回率上的取舍。
- **如果你只做过传统NLP**：用“序列标注 vs 端到端生成”类比——Function Calling像序列标注（模型输出标签，外部系统解析），Toolformer像端到端生成（模型自己决定何时插入特殊标记）。强调你对两种范式的本质理解。
- **如果你是校招无项目**：聚焦Toolformer论文复现——用LLaMA-7B+计算器工具复现自监督数据生成流程，对比困惑度阈值对工具调用频率的影响，展示你对论文细节的掌握。
- Toolformer: Language Models Can Teach Themselves to Use Tools (2023, Meta AI)
- Gorilla: Large Language Model Connected with Massive APIs (2023, UC Berkeley)
- OpenAI Function Calling Guide (2023, OpenAI)
- Outlines: Structured Generation for LLMs (2024, GitHub)
- GRPO: Group Relative Policy Optimization for Tool Use (2024, DeepSeek)

---
