---
slug: agent-tk234
no: "1134"
title: "Agentic AI: Can act autonomously. It doesn't just answer 「How do I reset my password?「"
question: "Agentic AI: Can act autonomously. It doesn't just answer 「How do I reset my password?「"
excerpt: "面试官想考察你对 Agentic AI 核心特征——自主行动 的深度理解，而非仅仅背诵定义。这是 概念辨析 + 系统设计 混合题。刁钻点在于：很多人只会说“Agent 能做事”，但讲不清“自主性”在工程上具体意味着什么—"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4105
updated: "2026-09-29"
---

## Agentic AI: Can act autonomously. It doesn't just answer 「How do I reset my password?「

`P1` · `agent_architecture`

🏷 标签：`agentic-ai`, `autonomy`, `rag`, `action-execution`

#### 1️⃣ 考察意图

面试官想考察你对 **Agentic AI 核心特征——自主行动** 的深度理解，而非仅仅背诵定义。这是 **概念辨析 + 系统设计** 混合题。刁钻点在于：很多人只会说“Agent 能做事”，但讲不清“自主性”在工程上具体意味着什么——比如如何规划、如何执行、如何兜底。答好了能展示你对 **Agent 架构（规划-执行-反馈循环）** 的实战认知，以及对 **RAG 与 Agent 本质差异**（信息检索 vs. 行动执行）的清晰边界感。

#### 2️⃣ 标准答

Agentic AI 的核心不是“能回答”，而是 **能自主完成一个目标导向的任务**。对比传统 RAG，它从“读文档告诉你”升级为“直接动手干”。

**1. 自主性的三层工程实现**

- **规划层（Planning）**：Agent 不是硬编码流程，而是用 **ReAct**（Reasoning + Acting）或 **Plan-and-Solve** 模式动态生成步骤。例如用户问“重置密码”，Agent 调用 LLM 推理出子任务：验证身份 → 查用户记录 → 发重置链接 → 记录日志。每一步的决策依赖当前状态，而非预设脚本。
- **执行层（Action）**：通过 **工具调用（Tool Calling）** 与外部系统交互。常用框架如 LangChain 的 `Tool` 抽象，或 OpenAI 的 `function calling`。每个工具是一个 API 封装（如 `send_email(user_email, reset_link)`），Agent 根据规划选择工具并填入参数。
- **反馈层（Feedback Loop）**：执行结果（成功/失败/部分数据）会回传给 Agent，触发下一步决策。例如邮件发送失败，Agent 可重试 3 次或切换备用通道（如短信）。这是 **完整流程** 与 RAG 单次检索的本质区别。

**2. 工程取舍：自主性 vs. 可控性**

- **取舍点**：完全自主（高成功率但不可控） vs. 人工审批（低延迟但安全）。实际落地常用 **分层策略**：低风险操作（如查询天气）全自动；高风险操作（如转账、删数据）必须 **Human-in-the-Loop**，Agent 生成操作提案后等待人工确认。
- **具体坑**：Agent 可能陷入 **无限循环**（比如反复调用失败的工具）。解法：设置 **最大步骤数**（如 10 步）和 **超时时间**（如 30 秒），超时后回退到“抱歉，无法完成”并记录失败轨迹用于调试。

**3. 与 RAG 的对比：不是替代，是互补**

| 维度 | RAG | Agentic AI |
|---|---|---|
| 目标 | 检索信息并回答 | 执行操作并达成目标 |
| 输出 | 文本（步骤/解释） | 动作（API 调用/状态变更） |
| 反馈 | 无（单次检索） | 有（执行结果驱动下一步） |
| 风险 | 低（信息错误） | 高（操作错误导致数据损坏） |

**4. 实际落地坑 + 解法**

- **坑**：Agent 调用外部 API 时，参数格式错误或权限不足。例如重置密码需要 `user_id`，但 Agent 只拿到了 `email`。
- **解法**：在工具描述中明确 **输入格式和约束**（如 `user_id: string, format: UUID`），并在 Agent 的 system prompt 中强调“如果参数缺失，先调用用户查询工具获取 ID”。同时加 **参数校验层**：工具执行前检查必填字段，缺失则返回具体错误信息给 Agent 重试。

**总结**：Agentic AI 的自主性 = 动态规划 + 工具执行 + 完整流程反馈。它不是 RAG 的升级版，而是 **从“知道”到“做到”** 的范式跃迁。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，Agentic AI 的自主性体现在 **规划-执行-反馈** 完整流程，比如重置密码时它会动态拆解子任务并调用 API；第二，工程上必须做 **自主性与可控性的取舍**，高风险操作加 Human-in-the-Loop；第三，它与 RAG 本质不同——RAG 是信息检索，Agent 是行动执行。总结一句：Agentic AI 让 AI 从‘回答者’变成‘执行者’。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 Agent 在重置密码时调用了错误的 API（比如删了用户账号），怎么兜底？

> 这是 **安全机制设计** 问题。首先，所有写操作（删除、修改）必须加 **确认步骤**：Agent 生成操作提案，系统自动校验权限和参数合法性，再执行。其次，实现 **操作回滚（Rollback）**：例如删除用户前先备份到临时表，失败时恢复。最后，加 **审计日志**：记录每次工具调用的输入、输出、时间戳，方便事后排查。实际中，我会用 **事务性工具**：比如封装一个 `delete_user_safe(user_id)`，内部先检查用户状态，再执行删除，失败时返回错误码而非直接抛异常。

**追问 2**：你怎么评估一个 Agent 的“自主性”做得好不好？用哪些指标？

> 核心指标分三层：**任务完成率**（成功完成目标的比例）、**步骤效率**（平均步骤数，理想值接近人类专家）、**错误恢复率**（遇到失败后能自动重试或切换方案的比例）。具体到密码重置场景，我会统计：① 一次成功比例（无需人工介入）；② 平均耗时（从提问到重置链接发出）；③ 失败原因分布（参数错误/API 超时/权限不足）。注意：不要只看成功率，还要看 **失败时的优雅程度**——比如是否给出明确错误提示，而不是卡死。

**追问 3**：如果用户问“重置密码”，但 Agent 发现用户身份未验证，它应该怎么做？

> 这是 **动态规划** 的典型场景。Agent 应该先调用 `verify_identity(user_id)` 工具，如果返回“未验证”，则进入 **身份验证子流程**：生成验证码并发送到注册邮箱，等待用户输入验证码。这里的关键是 **状态管理**：Agent 需要记住当前处于“等待验证码”状态，直到用户提供正确验证码后才继续重置流程。工程上，我会用 **会话级记忆**（如 LangChain 的 `ConversationBufferMemory`）存储中间状态，并设置 **超时**（如 5 分钟未收到验证码则终止流程）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Agentic AI 就是 RAG 加个工具调用” → ✅ 正确切入：强调 **完整流程反馈** 和 **动态规划** 是核心差异，工具调用只是执行层的一部分。
- ❌ 说“Agent 应该完全自主，不需要人工干预” → ✅ 正确切入：指出 **高风险操作必须 Human-in-the-Loop**，并给出具体分层策略（低风险自动、高风险审批）。
- ❌ 说“Agent 的规划是硬编码的 if-else 流程” → ✅ 正确切入：说明规划是 **LLM 驱动的动态生成**，基于当前状态和工具描述实时推理，不是预设脚本。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“RAG 只能回答，无法执行”切入，展示你如何用 Agent 架构扩展项目（如让 Agent 调用数据库更新用户信息）。强调你踩过的坑：工具参数校验、状态管理。
- **如果你只做过传统 NLP**：用“对话系统 vs. 任务执行系统”类比迁移，说明传统 NLP 是单轮问答，Agent 是多轮完整流程。展示你理解 ReAct 模式，并做过小 demo（如用 LangChain 实现天气查询 Agent）。
- **如果你是校招无项目**：聚焦论文复现，比如你读过《ReAct: Synergizing Reasoning and Acting in Language Models》，能讲清楚 ReAct 的推理-行动循环。展示你写过简单代码：用 OpenAI function calling 实现一个“发送邮件”的 Agent。

#### 7️⃣ 延伸阅读

- 《ReAct: Synergizing Reasoning and Acting in Language Models》（Yao et al., 2022）
- 《Toolformer: Language Models Can Teach Themselves to Use Tools》（Schick et al., 2023）
- 《Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models》（Wang et al., 2023）
- LangChain 官方文档：Agent 模块（Tool Calling, Memory, Callbacks）
- 《Building Autonomous AI Agents with LLMs》（blog post by Lilian Weng, 2023）

---
