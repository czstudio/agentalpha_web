---
slug: agent-tk035
no: "935"
title: "LLM Agent 如何进行决策？能否使用具体的方法解释"
question: "LLM Agent 如何进行决策？能否使用具体的方法解释"
excerpt: "面试官想检验你对 LLM Agent 决策机制的理解是否停留在“调用 API”层面，还是能深入到推理-行动循环、工具编排和记忆管理的工程实现。考察类型是系统设计 + 工程取舍。刁钻点在于：能否区分 ReAct 和 Pla"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4108
updated: "2026-09-29"
---

## LLM Agent 如何进行决策？能否使用具体的方法解释

#### 1️⃣ 考察意图

面试官想检验你对 LLM Agent 决策机制的理解是否停留在“调用 API”层面，还是能深入到推理-行动循环、工具编排和记忆管理的工程实现。考察类型是**系统设计 + 工程取舍**。刁钻点在于：能否区分 ReAct 和 Plan-and-Solve 的适用场景，以及能否解释为什么纯 CoT 在动态环境中会失败。答好了能展示你对 Agent 架构的实战理解，包括状态管理、错误恢复和延迟优化，这是大厂做复杂任务编排（如自动化客服、代码生成 Agent）的核心能力。

#### 2️⃣ 标准答

LLM Agent 的决策本质是**将语言模型作为推理核心，在动态环境中执行“感知-推理-行动”循环**。核心方法分三类：ReAct、Plan-and-Solve 和 Tree-of-Thoughts，各有取舍。

**1. ReAct（Reasoning + Acting）—— 最主流范式**

- **机制**：交替生成推理轨迹（Thought）和动作（Action），动作结果作为观察（Observation）反馈到上下文。
- **具体流程**：
- 输入任务 → Agent 输出“Thought: 我需要查天气，先调用天气 API”
- 输出“Action: call_weather_api(city=‘北京’)” → 工具返回“Observation: 晴，25°C”
- 基于观察继续推理，直到生成“Final Answer”
- **工程取舍**：
- 优点：实时反馈，适合动态环境（如网页导航、数据库查询）。
- 缺点：上下文窗口膨胀快，长链任务容易丢失早期信息。实际落地时需用**滑动窗口截断**或**摘要压缩**，比如只保留最近 5 轮 Thought-Action-Observation 三元组。
- **落地坑**：工具调用失败（如 API 超时）会导致死循环。解法：设置**最大重试次数（如 3 次）** 和**降级策略**（如返回“工具不可用，改用搜索”）。

**2. Plan-and-Solve（PS）—— 适合静态任务**

- **机制**：先规划完整步骤（Plan），再逐步执行（Solve），执行中不修改计划。
- **具体方法**：
- 输入“写一篇关于 AI 的博客” → Agent 输出 Plan: [1. 确定大纲，2. 搜索资料，3. 写初稿，4. 润色]
- 然后按步骤执行，每一步调用对应工具。
- **工程取舍**：
- 优点：上下文利用率高，适合长链任务（如代码生成、文档撰写）。
- 缺点：环境变化时计划失效（如搜索资料时发现某网站挂了）。实际中常与 ReAct 混合：先 Plan，执行中若遇到异常则切换到 ReAct 模式重新规划。
- **落地坑**：计划步骤过多（>10 步）时，LLM 容易遗漏或重复步骤。解法：用**子任务分解**，将大计划拆成多个子 Agent 执行，每个子 Agent 负责 3-5 步。

**3. Tree-of-Thoughts（ToT）—— 探索多路径**

- **机制**：同时维护多个推理分支，用 BFS/DFS 搜索最优路径。
- **具体方法**：
- 对每个决策点生成 3-5 个候选动作，评估每个候选的“可行性分数”（如用 LLM 自评或奖励模型打分），选择分数最高的继续。
- **工程取舍**：
- 优点：适合开放性问题（如创意写作、数学证明）。
- 缺点：计算成本高（每个分支都要调用 LLM），延迟不可控。实际中只用于**关键决策点**，而不是每一步。

**4. 记忆与工具管理**

- **短期记忆**：用对话历史 + 滑动窗口（如保留最近 2000 tokens）。
- **长期记忆**：用向量数据库（如 Chroma）存储历史决策，检索相似场景的解决方案。例如，用户问“如何订机票”，Agent 检索到之前订酒店的成功案例，复用其工具调用模式。
- **工具注册**：每个工具需定义**名称、描述、参数 schema**（如 JSON Schema），Agent 通过函数调用（Function Calling）选择工具。实际中工具描述要**精确**，避免 LLM 混淆（如“search_web”和“search_database”描述要区分）。

**总结**：ReAct 是默认选择，适合大部分动态任务；Plan-and-Solve 用于长链静态任务；ToT 用于高价值探索。实际系统常组合使用，比如用 ReAct 执行，用 Plan-and-Solve 做初始规划。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，核心范式是 ReAct，通过 Thought-Action-Observation 循环实现动态决策，适合工具调用场景；第二，Plan-and-Solve 适合静态长链任务，但需处理计划失效问题；第三，Tree-of-Thoughts 用于多路径探索，但成本高。实际中我会根据任务动态性选择，并加入记忆管理和错误恢复机制。总结一句：Agent 决策不是单一方法，而是推理循环、工具编排和状态管理的组合。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：ReAct 中如果 LLM 生成无效 Action（如工具名拼错），你怎么处理？

> 这是常见坑。我会在 Action 解析层加**正则校验**和**模糊匹配**：先检查 Action 名是否在已注册工具列表中，若不在，用 Levenshtein 距离匹配最接近的工具（如“cal_culator”匹配“calculator”）。若匹配失败，返回“Action 无效，请重试”作为 Observation，并限制重试次数（如 3 次）。更鲁棒的做法是用**结构化输出**（如 JSON mode），强制 LLM 输出固定格式，减少解析错误。

**追问 2**：你的 Agent 在长链任务中上下文溢出怎么办？

> 核心策略是**摘要压缩**和**滑动窗口**。我会在每轮循环后，将历史 Thought-Action-Observation 三元组用 LLM 压缩成一句话摘要（如“已查询天气，结果为晴”），只保留最近 5 轮完整记录和全局摘要。另一种方案是**分阶段执行**：将任务拆成子任务，每个子任务独立执行，只传递最终结果到下一阶段。例如，写博客任务拆成“搜索资料”和“撰写”，两个子 Agent 独立运行，避免上下文污染。

**追问 3**：如何评估 Agent 的决策质量？具体指标是什么？

> 我会用**成功率**（任务是否完成）、**步数效率**（完成任务的 Action 数量，理想值越低越好）和**工具调用准确率**（正确工具调用次数/总调用次数）。更细粒度的指标包括**决策一致性**（相同输入下输出是否稳定）和**错误恢复率**（遇到错误后能否自动纠正）。实际中，我会在测试集上跑 100 个任务，统计这些指标，并对比不同方法（如 ReAct vs Plan-and-Solve）的差异。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提“Agent 用 LLM 做决策”，不具体说 ReAct 或 Plan-and-Solve。→ ✅ 必须给出具体方法名和流程，如“ReAct 通过 Thought-Action-Observation 循环实现决策”。
- ❌ 说“ReAct 永远比 Plan-and-Solve 好”。→ ✅ 要指出取舍：ReAct 适合动态环境，Plan-and-Solve 适合静态长链任务，实际中常混合使用。
- ❌ 忽略工具调用失败和上下文溢出等工程问题。→ ✅ 必须提到错误恢复（如重试、降级）和上下文管理（如摘要压缩、滑动窗口）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“Agent 决策中的记忆管理”切入，对比 RAG 的检索-生成流程与 ReAct 的推理-行动循环，强调两者在上下文管理上的异同（如 RAG 用向量检索，Agent 用短期记忆 + 工具调用）。
- **如果你只做过传统 NLP**：用“任务分解”类比，比如将传统 NLP 的 pipeline（分词→NER→分类）与 Agent 的 Plan-and-Solve 对比，说明 Agent 的决策是动态的、可交互的，而传统 pipeline 是静态的。
- **如果你是校招无项目**：聚焦 ReAct 论文复现，用 ALFWorld 环境（如“将苹果放入冰箱”）演示每一步的 Thought-Action-Observation，并统计成功率。强调你理解决策循环的工程实现，而不仅是理论。
- ReAct: Synergizing Reasoning and Acting in Language Models (Yao et al., 2022)
- Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models (Wang et al., 2023)
- Tree-of-Thoughts: Deliberate Problem Solving with Large Language Models (Yao et al., 2023)
- Toolformer: Language Models Can Teach Themselves to Use Tools (Schick et al., 2023)
- LangChain Agent 文档：ReAct 与 Plan-and-Execute 的实现对比

---
