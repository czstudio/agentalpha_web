---
slug: tooluse-tk047
no: "947"
title: "**Q：Agent 训练为什么不是 function calling"
question: "**Q：Agent 训练为什么不是 function calling"
excerpt: "面试官真正想考察的是你对 Agent 训练本质的理解深度，而非停留在 API 调用层面。这属于系统设计 + 工程取舍混合型问题。刁钻点在于：很多人误以为 Agent 就是“能调函数的 LLM”，但面试官想听你区分单步工具"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4102
updated: "2026-09-29"
---

## **Q：Agent 训练为什么不是 function calling

#### 1️⃣ 考察意图

面试官真正想考察的是你对 Agent 训练本质的理解深度，而非停留在 API 调用层面。这属于**系统设计 + 工程取舍**混合型问题。刁钻点在于：很多人误以为 Agent 就是“能调函数的 LLM”，但面试官想听你区分**单步工具调用（function calling）与多步决策序列学习（Agent training）**。答好了能展示你对强化学习、模仿学习、奖励设计、探索-利用平衡等核心概念的实战理解，以及从“模型输出格式”到“环境交互完整流程”的认知跃迁。

#### 2️⃣ 标准答

**核心差异：单点 vs. 序列**

- **Function calling** 本质是**格式对齐**：通过指令微调（SFT）让模型学会输出 `{"function": "get_weather", "args": {"city": "北京"}}` 这样的 JSON。它不关心后续动作，不维护状态，不处理环境反馈。典型例子是 OpenAI 的 `tools` 参数——模型只负责一次输出，后续由外部代码调度。
- **Agent 训练** 要求模型学习**决策序列**：在 ReAct 框架下，模型需要交替输出“思考（Thought）→ 动作（Action）→ 观察（Observation）”，每一步依赖前一步的环境反馈。这不再是单次格式问题，而是**马尔可夫决策过程（MDP）**。

**为什么 SFT 不够？**

- 指令微调只能拟合“给定输入→正确输出”的映射。但 Agent 场景中，**正确动作依赖于历史轨迹**。例如在 ToolBench 的 MultiStepQA 任务中，模型先调用 `search_company` 获取公司名，再调用 `get_stock_price` 查询股价——第二步的正确性完全取决于第一步的结果。SFT 无法建模这种**状态依赖**，因为训练数据是静态的（输入-输出对），而 Agent 需要**动态交互**。
- 实际落地的坑：用纯 SFT 训练 Agent 时，模型在第一步出错后，后续步骤会“幻觉”出合理但错误的观察（例如编造股价数字），因为 SFT 没学会“从环境读取真实反馈”。解法是引入**模仿学习（Behavior Cloning）**，但 BC 仍有分布偏移问题（exposure bias），需要配合 DAgger 算法或强化学习。

**Agent 训练的核心技术栈**

- **强化学习（RL）**：典型方案是使用 PPO 或 GRPO（Group Relative Policy Optimization）优化策略。奖励设计是关键：不能只给最终结果奖励（稀疏奖励），需要**过程奖励模型（PRM）**，例如每正确调用一个工具给 0.1 分，每步推理合理给 0.05 分。DeepSeek-R1 的 Agent 训练就采用了 GRPO + 过程奖励。
- **探索-利用平衡**：Agent 训练中，模型需要探索不同工具调用顺序。例如在 WebShop 环境中，模型可能先尝试 `search("red dress")` 再 `click("filter: size M")`，也可能直接 `click("item 3")`。RL 训练时用 ε-greedy 或 Boltzmann 探索，而 function calling 完全不需要探索——它只是输出预定义格式。
- **记忆与上下文管理**：Agent 需要维护**长期记忆**（如用 HNSW 索引存储历史观察），而 function calling 只处理当前轮次输入。训练时需引入**记忆增强机制**，例如在 Transformer 中插入 Memory Bank 或使用 RAG 检索历史轨迹。

**工程取舍：RL vs. 模仿学习**

- **RL 优势**：能探索出训练数据中未覆盖的决策路径，例如模型自己发现“先调用 `get_weather` 再调用 `get_traffic`”比固定顺序更高效。但 RL 训练不稳定，需要大量环境交互（通常 10k+ episodes），且奖励设计容易过拟合。
- **模仿学习优势**：直接从专家轨迹学习，训练稳定。但受限于数据质量，且无法处理分布外情况。实际工业界（如字节的 Agent 训练）常用**两阶段法**：先用 BC 初始化策略，再用 RL 微调（类似 RLHF 的 SFT + PPO 流程）。

**总结**：Function calling 是“学会说工具的语言”，Agent 训练是“学会用工具解决问题”。前者是格式问题，后者是决策问题。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，**本质差异**——function calling 是单步格式对齐，Agent 训练是多步决策序列学习；第二，**技术栈差异**——function calling 只需 SFT，Agent 训练需要 RL/模仿学习、奖励设计、探索-利用平衡；第三，**工程坑**——纯 SFT 会导致分布偏移，需要两阶段法（BC + RL）。总结一句：function calling 是‘学会说话’，Agent 训练是‘学会做事’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：那为什么很多开源 Agent 框架（如 LangChain）只用 function calling 也能跑通？

> 因为 LangChain 等框架把**决策逻辑写死在代码里**（例如 `if tool_A returns error, then call tool_B`），模型只负责输出格式。这不是 Agent 训练，而是**硬编码路由 + 格式生成**。真正的 Agent 训练要求模型自己学会决策，而不是靠外部 if-else。一个验证方法：在 MultiStepQA 任务中，去掉硬编码逻辑，让模型自由选择工具顺序——纯 function calling 的成功率会从 80% 暴跌到 20% 以下（参考 ToolBench 论文数据）。

**追问 2**：Agent 训练中如何解决奖励稀疏问题？

> 核心是**过程奖励模型（PRM）**。例如在 HotpotQA 的 Agent 场景中，最终答案正确给 1 分，但中间每正确调用一个工具给 0.2 分，每步推理合理给 0.1 分。具体实现：用 GPT-4 或人工标注中间步骤的正确性，训练一个奖励模型（RM）来打分。另一个技巧是**奖励塑形（Reward Shaping）**：如果模型在第三步调用了正确的工具但顺序不对，给部分奖励（如 0.5 分）而不是 0 分，避免梯度消失。

**追问 3**：Agent 训练的数据从哪里来？如何保证质量？

> 常见三种来源：1）**人工标注**：让标注员在模拟环境中操作，记录轨迹（成本高，但质量最好）；2）**LLM 蒸馏**：用 GPT-4 或 Claude 在环境中执行任务，生成轨迹（如 ToolBench 的 12k 条轨迹），但需过滤幻觉步骤；3）**自举（Self-Play）**：用当前模型在环境中探索，只保留成功轨迹（类似 AlphaGo 的自我对弈）。质量保证：对每条轨迹做**一致性检查**——例如工具调用的输入输出是否匹配，推理步骤是否逻辑连贯。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “Agent 训练就是 function calling 的升级版，多加了几个工具。” → ✅ “本质是决策序列学习 vs. 单步格式对齐，训练范式完全不同（SFT vs. RL/模仿学习）。”
- ❌ “用 RL 训练 Agent 太慢，不如直接 SFT 加 prompt 工程。” → ✅ “SFT 无法处理分布偏移和状态依赖，RL 虽然慢但能探索新策略，工业界常用两阶段法平衡。”
- ❌ “Agent 训练不需要奖励设计，用最终结果正确率就行。” → ✅ “稀疏奖励导致训练不稳定，必须用过程奖励模型（PRM）或奖励塑形。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成”序列类比到“工具调用-观察”序列，强调状态依赖和奖励设计（例如 RAG 中检索结果影响生成质量，类似 Agent 中工具输出影响下一步决策）。
- **如果你只做过传统 NLP**：用“序列标注 vs. 序列决策”类比——function calling 像 NER（单点预测），Agent 训练像序列标注中的 CRF（考虑全局依赖）。再迁移到 RL 的 MDP 框架。
- **如果你是校招无项目**：聚焦 ToolBench 论文的复现 demo，说明你理解 SFT 与 RL 的差异，并能在 MiniWoB++ 或 WebShop 环境中跑通一个简单 Agent 训练流程（用 PPO 或 BC）。
- ToolBench: Making LLMs as Tool Agents (ICLR 2024)
- ReAct: Synergizing Reasoning and Acting in Language Models (ICLR 2023)
- GRPO: Group Relative Policy Optimization (DeepSeek-R1 技术报告)
- WebShop: Towards Scalable and Realistic Web Interaction Benchmark (NeurIPS 2022)
- 博客：”Why Agent Training is Harder Than Function Calling” (Anthropic 内部技术分享)

---
