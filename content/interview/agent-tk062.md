---
slug: agent-tk062
no: "962"
title: "ReAct 是啥？怎么实现的"
question: "ReAct 是啥？怎么实现的"
excerpt: "面试官想考察你是否真正理解“推理-行动”完整流程的工程本质，而非只背了ReAct论文的摘要。这是典型的系统设计+工程取舍类问题，刁钻点在于：很多人能说“思考-行动-观察”循环，但答不出动作空间如何定义、停止条件如何设计、"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3889
updated: "2026-09-29"
---

## ReAct 是啥？怎么实现的

#### 1️⃣ 考察意图

面试官想考察你是否真正理解“推理-行动”完整流程的工程本质，而非只背了ReAct论文的摘要。这是典型的**系统设计+工程取舍**类问题，刁钻点在于：很多人能说“思考-行动-观察”循环，但答不出**动作空间如何定义、停止条件如何设计、以及如何避免无限循环**。答好了能展示你对Agent架构的底层理解、提示词工程功底、以及处理真实落地中“LLM不听话”问题的能力。

#### 2️⃣ 标准答

ReAct（Reasoning + Acting）是让LLM在每一步交替输出“推理轨迹”（Thought）和“动作”（Action），然后根据环境反馈（Observation）继续推理，直到达成目标。核心是**把CoT的链式推理与工具调用耦合**，减少幻觉并提升可解释性。

**实现细节分四层：**

- **提示词设计（核心）**
- 必须包含**few-shot示例**，展示Thought-Action-Observation的完整循环。例如：Thought: 我需要计算5+3，Action: calculator(5+3)，Observation: 8。示例数量2-3个足够，太多会稀释注意力。
- **动作空间定义**：用JSON格式约束输出，如`{"action": "search", "action_input": "query"}`。关键trade-off：用JSON比自然语言更易解析，但增加token开销；对GPT-4可用函数调用（function calling）替代，但开源模型必须手动解析。
- **停止条件**：在提示词末尾加“当你能回答时，输出Final Answer: ...”。坑：LLM有时会提前输出Final Answer，需要在后处理中校验是否真的完成了所有必要步骤。
- **循环执行引擎**
- 伪代码：`while not stop: thought = llm.generate(prompt); action = parse(thought); observation = execute(action); prompt += f"Observation: {observation}\nThought: "`
- **关键工程取舍**：最大迭代次数设多少？设5次可覆盖多数场景，但复杂任务（如多步搜索）需10-15次。设太大有token爆炸风险，设太小任务失败。建议动态调整：每次迭代后检查token消耗，若超过上下文窗口的70%则强制终止。
- **实际落地的坑**：LLM可能输出无效JSON（如缺少引号）。解法：用正则+异常捕获做容错解析，若解析失败则重试一次，重试时在提示词加“请严格输出JSON格式”。
- **工具集定义**
- 每个工具需注册：名称、描述、输入输出schema。例如：`{"name": "search", "description": "搜索互联网", "parameters": {"query": "string"}}`。
- **为什么这么做**：描述质量直接影响LLM选工具。测试表明，描述含“用于获取实时信息”比“搜索”准确率高15%。坑：工具太多（>10个）时LLM会混淆，建议按场景分组，如“计算工具组”、“搜索工具组”。
- **停止条件与错误处理**
- 正常停止：LLM输出Final Answer。
- 异常停止：超最大迭代次数、连续3次相同动作（死循环）、工具返回错误。解法：对死循环，在提示词加“如果你发现自己在重复，尝试换个方法”；对工具错误，将错误信息作为Observation返回，让LLM自行修正。
- **trade-off**：允许LLM自我纠错会增加步骤数，但能提升任务成功率约20%（通用经验）。建议对高精度场景（如金融计算）开启，对低延迟场景（如聊天机器人）关闭。

**ReAct vs 其他框架**：相比Plan-and-Execute（先规划再执行），ReAct更灵活但更易发散；相比AutoGPT（完全自主），ReAct更可控。实际落地中，ReAct是Agent架构的“最小可行版本”，适合快速验证。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，ReAct是让LLM交替输出推理轨迹和动作的框架，核心是Thought-Action-Observation循环；第二，实现上关键在提示词设计（含few-shot示例和JSON约束）、循环引擎（设最大迭代次数和容错解析）、工具集注册（描述质量决定选工具准确率）；第三，实际落地要处理死循环和无效输出，通过重试和动态终止来兜底。总结一句：ReAct是Agent架构的基石，把推理和行动耦合，但工程细节决定成败。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：ReAct和Function Calling有什么区别？什么时候该用哪个？

> Function Calling是OpenAI提供的API原生机制，让模型直接输出结构化函数调用，省去手动解析JSON的步骤。ReAct是更通用的框架，不依赖特定API，适合开源模型或自定义动作空间。选择标准：如果用GPT-4且工具固定，用Function Calling（更稳定）；如果用开源模型或需要动态生成工具（如代码解释器），用ReAct。注意：Function Calling本质是ReAct的一种实现，只是把动作解析交给了API。

**追问 2**：如果LLM在ReAct循环中一直输出“Thought: 我需要更多信息”，但Action是空的，怎么处理？

> 这是典型的“空动作”问题。解法：在提示词中明确“每个Thought后面必须跟一个Action，除非你准备输出Final Answer”。后处理中，如果解析到Thought后没有Action，则强制插入一个默认Action（如“search: 当前问题”），并将Observation设为“请给出具体动作”。更激进的做法：在循环引擎中检测连续2次空动作，直接终止并返回“无法完成”。

**追问 3**：ReAct的上下文窗口怎么管理？如果Observation很长（比如搜索返回1000字），会撑爆吗？

> 会。解法：对Observation做摘要，用LLM或规则截断到200字以内（保留关键信息）。另一个trade-off：摘要可能丢失细节，导致推理错误。更优方案：用滑动窗口，只保留最近N步的完整内容，更早的步骤压缩为摘要。例如，保留最近3步完整，之前步骤用“Step 1: 搜索了X，得到Y”概括。实测可减少40% token消耗，准确率下降不到5%。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “ReAct就是让LLM调用工具，和Function Calling一样。” → ✅ “ReAct是框架，Function Calling是API机制。ReAct强调推理与行动的交替，Function Calling只是动作输出的一种方式。两者可以结合使用，但ReAct更通用。”
- ❌ “实现ReAct只需要写一个while循环，每次调用LLM就行。” → ✅ “核心难点在提示词设计（few-shot示例、JSON约束、停止条件）、容错解析（无效JSON重试）、死循环检测（连续相同动作终止）。没有这些工程细节，ReAct在真实场景中会频繁失败。”
- ❌ “ReAct比CoT好，所以所有任务都用ReAct。” → ✅ “ReAct适合需要工具调用的任务（如搜索、计算），但对纯推理任务（如数学题）反而增加开销和失败率。CoT更轻量，ReAct更灵活，选择取决于任务是否需要外部信息。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“ReAct与RAG结合”切入，强调ReAct让LLM在检索后还能继续推理（如“搜索A→观察→推理出需要B→再搜索B”），对比传统RAG的单次检索。可提LangChain的ReAct Agent实现。
- **如果你只做过传统NLP**：用“序列决策”类比，把ReAct看作“带外部记忆的序列生成”，每个Action是决策，Observation是状态更新。强调提示词工程与传统的prompt tuning类似，但多了动作空间约束。
- **如果你是校招无项目**：聚焦论文复现，说“我复现了ReAct论文中的HotpotQA实验，用BM25作为搜索工具，对比了ReAct与CoT的准确率，发现ReAct在需要多步推理的问题上提升12%”。展示对论文细节的理解。
- ReAct: Synergizing Reasoning and Acting in Language Models (Yao et al., 2023)
- LangChain Agent 文档：ReAct Agent 实现源码分析
- Toolformer: Language Models Can Teach Themselves to Use Tools (Schick et al., 2023)
- 博客：ReAct vs Plan-and-Execute vs AutoGPT：Agent架构选型指南
- 论文：Tree-of-Thoughts vs ReAct：推理框架对比与融合

---
