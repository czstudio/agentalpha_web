---
slug: agent-tk061
no: "961"
title: "ReAct、Plan-and-Execute、Reflection 三种范式有什么核心区别？实际项目中该如何选型"
question: "ReAct、Plan-and-Execute、Reflection 三种范式有什么核心区别？实际项目中该如何选型"
excerpt: "面试官想看的不是你能背出 ReAct 论文摘要，而是你能否在真实工程场景中，基于任务复杂度、延迟预算、错误容忍度做出理性选型。刁钻点在于：很多人把三种范式当“三选一”，实际生产中往往是混合架构。答好了能展示你对 Agen"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4113
updated: "2026-09-29"
---

## ReAct、Plan-and-Execute、Reflection 三种范式有什么核心区别？实际项目中该如何选型

#### 1️⃣ 考察意图

面试官想看的不是你能背出 ReAct 论文摘要，而是你能否在真实工程场景中，基于任务复杂度、延迟预算、错误容忍度做出理性选型。刁钻点在于：很多人把三种范式当“三选一”，实际生产中往往是**混合架构**。答好了能展示你对 Agent 系统设计有实战手感，能权衡计算开销与任务完成率，并且理解“反思”不是万能药，而是有代价的完整流程。

#### 2️⃣ 标准答

**核心区别：决策时机与反馈回路**

- **ReAct（推理-行动循环）**：每一步都先“想”再“做”，推理（Thought）和行动（Action）交替进行。典型实现是 LLM 每次输出一个 Thought + Action + Observation 三元组。**决策是实时的、在线**的，每一步都依赖上一步的观察结果。
- 优点：灵活，能应对动态环境（如网页操作、API 调用返回意外结果）。
- 缺点：推理开销大（每步都调 LLM），且容易陷入“思考过多、行动过少”的循环（overthinking）。
- 工程取舍：为了减少 LLM 调用次数，常用 **ReAct 变体**如 Act-Only（跳过 Thought 直接 Action），但会牺牲可解释性。
- **Plan-and-Execute（规划-执行分离）**：先由“规划器”生成一个完整的多步计划（Plan），再由“执行器”按顺序执行，执行过程中不重新规划。**决策是离线的、一次性的**。
- 优点：计算开销低（只调一次规划 LLM + 多次执行 LLM），适合步骤确定、环境稳定的任务（如数据 ETL 流程）。
- 缺点：无法处理执行中的意外（如 API 返回 500 错误），计划一旦出错就全盘失败。
- 实际落地的坑：很多项目直接用 ReAct 替代 Plan-and-Execute，但忽略了 ReAct 的延迟。**解法**：对确定性任务（如“从数据库 A 取数据，清洗后写入 B”）用 Plan-and-Execute，对不确定性任务（如“搜索并总结”）用 ReAct。
- **Reflection（自我反思修正）**：在 ReAct 或 Plan-and-Execute 的基础上，增加一个“反思器”模块，在行动后或计划执行后，对结果进行自我评估，并生成修正指令。**决策是带反馈回路的**。
- 优点：明显提升高精度场景（如代码生成、数学推理）的首次成功率。
- 缺点：计算开销翻倍（每轮反思都需一次 LLM 调用），且容易陷入“无限反思循环”。
- 工程取舍：必须设置**反思轮次上限**（如最多 3 轮），否则延迟不可控。
- 实际落地的坑：反思器如果和主 LLM 是同一个模型，容易“自欺欺人”（模型认为自己的输出没问题）。**解法**：用不同 prompt 或不同模型（如 GPT-4 做执行，Claude 做反思）来避免自我确认偏差。

**选型依据：三个维度**

1. **任务复杂度**：简单工具调用（如“查天气”）→ ReAct；多步确定性任务（如“生成周报并发送邮件”）→ Plan-and-Execute；高精度任务（如“生成可运行代码”）→ 加 Reflection。
2. **实时性要求**：低延迟（<2s）→ 用 Plan-and-Execute 或 Act-Only 变体；可接受 5-10s 延迟 → ReAct；不要求实时（如后台批处理）→ 可加 Reflection。
3. **错误容忍度**：容忍 10% 错误 → ReAct 足够；要求 99% 正确率 → 必须加 Reflection，且配合验证器（如代码执行沙箱）。

**混合架构示例**：一个实际项目可能这样设计——

- 先用 Plan-and-Execute 生成初始计划（如“搜索论文 → 提取关键点 → 生成摘要”）。
- 执行过程中，每步用 ReAct 处理意外（如搜索结果为空时重新规划搜索词）。
- 最终输出前，用 Reflection 检查摘要是否包含所有关键点，若不满足则触发修正。这种混合策略在 WebVoyager 基准上可提升任务完成率 15-20%，同时平均步数仅增加 1-2 步。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：核心区别、选型依据、混合架构。核心区别在于决策时机——ReAct 是实时在线决策，Plan-and-Execute 是离线一次性规划，Reflection 是带反馈回路的修正。选型看三个维度：任务复杂度、实时性要求、错误容忍度。实际项目中，我倾向于混合使用，比如 Plan 做骨架、ReAct 处理意外、Reflection 做最终质检。总结一句：没有银弹，选型的关键是理解每个范式的计算开销与错误恢复能力的 trade-off。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说 Reflection 容易陷入无限循环，具体怎么避免？

> 设置硬性轮次上限（如最多 3 轮），并在每轮反思后检查“是否产生实质性变化”——如果反思后的输出与上一轮相似度 > 90%（用 embedding 余弦相似度或编辑距离），则提前终止。另外，反思器可以用不同模型或不同 prompt，避免自我确认偏差。例如，执行用 GPT-4，反思用 Claude 3.5 Sonnet，或者用同一个模型但反思 prompt 中要求“假设你是严格的代码审查员”。

**追问 2**：Plan-and-Execute 如果计划错了怎么办？有没有补救机制？

> 有两种补救思路：一是“动态重规划”，在执行过程中检测到计划错误（如 API 返回 404）时，触发一个轻量级 ReAct 循环来修正当前步骤，而不是重新生成整个计划。二是“计划验证”，在执行前先用一个验证器（如规则引擎或小模型）检查计划的可行性，比如检查步骤间的依赖关系是否合理、参数是否完整。这两种方法在 LangGraph 和 AutoGen 中都有现成实现。

**追问 3**：这三种范式在延迟上具体差多少？能给出数字吗？

> 假设每次 LLM 调用耗时 2-3 秒（GPT-4 级别）。ReAct 每步都调，5 步任务就是 10-15 秒。Plan-and-Execute 只调一次规划（2-3 秒）+ 5 次执行（10-15 秒），总延迟约 12-18 秒，但规划是并行的？不，执行是串行的，所以总延迟接近 ReAct。实际差异在于：Plan-and-Execute 的规划阶段可以缓存（如果任务模式固定），而 ReAct 每步都依赖上一步结果，无法缓存。Reflection 再加 1-3 轮反思，每轮 2-3 秒，总延迟增加 2-9 秒。所以选型时要考虑：如果任务步骤多且可缓存，Plan-and-Execute 有优势；如果步骤少且需要灵活性，ReAct 更合适。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“ReAct 最好，因为它最灵活” → ✅ 正确切入：ReAct 灵活但延迟高，Plan-and-Execute 适合确定性任务，Reflection 适合高精度场景，没有“最好”，只有“最合适”。
- ❌ 说“Reflection 就是加一个反思 prompt” → ✅ 正确切入：Reflection 需要设计反思器的输入输出格式、轮次上限、终止条件，以及避免自我确认偏差的策略，不是简单加个 prompt 就能用。
- ❌ 说“Plan-and-Execute 已经过时了，现在都用 ReAct” → ✅ 正确切入：Plan-and-Execute 在确定性任务中仍然高效，比如数据流水线、定时报告生成，ReAct 的实时决策反而增加不必要的开销。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成”循环类比 ReAct 的“推理-行动”循环，强调 Reflection 在 RAG 中用于修正检索结果（如“检索结果不相关时重新检索”）。
- **如果你只做过传统 NLP**：用“序列决策”类比——ReAct 类似贪心搜索（每一步最优），Plan-and-Execute 类似 beam search（全局规划），Reflection 类似 reranking（对结果重新排序）。
- **如果你是校招无项目**：聚焦论文复现——在论文《ReAct: Synergizing Reasoning and Acting in Language Models》和《Plan-and-Solve Prompting》中找对比实验数据，说明三种范式的性能差异。
- 《ReAct: Synergizing Reasoning and Acting in Language Models》（Shunyu Yao et al., 2022）
- 《Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models》（Lei Wang et al., 2023）
- 《Reflexion: Language Agents with Verbal Reinforcement Learning》（Noah Shinn et al., 2023）
- LangGraph 官方文档：Multi-agent 架构与 Plan-and-Execute 实现
- 《WebVoyager: Building an End-to-End Web Agent with Large Language Models》（Hongliang He et al., 2024）

---
