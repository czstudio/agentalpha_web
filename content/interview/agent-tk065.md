---
slug: agent-tk065
no: "965"
title: "除ReAct和Plan-and-Execute外，还有哪些主流Agent范式"
question: "除ReAct和Plan-and-Execute外，还有哪些主流Agent范式"
excerpt: "面试官想考察你对 Agent 架构的广度与深度，而非仅背诵 ReAct 和 Plan-and-Execute 两个名字。刁钻点在于：能否区分“范式”与“实现细节”（如 Toolformer 是训练范式，AutoGPT 是"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3852
updated: "2026-09-29"
---

## 除ReAct和Plan-and-Execute外，还有哪些主流Agent范式

#### 1️⃣ 考察意图

面试官想考察你对 Agent 架构的广度与深度，而非仅背诵 ReAct 和 Plan-and-Execute 两个名字。刁钻点在于：能否区分“范式”与“实现细节”（如 Toolformer 是训练范式，AutoGPT 是工程框架），以及能否说出每种范式的核心 trade-off 和适用场景。答好了能展示你读过前沿论文（如 Reflexion、SWE-agent）、理解工程落地中的记忆与规划瓶颈，并能设计混合方案解决实际问题。

#### 2️⃣ 标准答

除 ReAct 和 Plan-and-Execute 外，主流 Agent 范式包括以下四类，每类都有独特的工程取舍和落地坑：

- **Reflexion（反思范式）**
- 核心：Agent 执行动作后，通过“自反思”生成反馈（如错误原因），存入短期记忆，指导下一轮动作。
- 关键组件：Actor（执行动作）、Evaluator（评估结果）、Self-Reflection（生成文本反思）。
- 工程取舍：反思增加了推理延迟（每次反思约 1-2 秒），但能明显提升复杂任务成功率（如 GSM8K 上从 70% 到 85%）。
- 落地坑：反思内容可能重复或发散，需限制反思轮次（如最多 3 次），否则陷入死循环。解法：用 evaluator 的置信度分数（如 0-1）动态决定是否继续反思。
- **Multi-Agent（多智能体协作范式）**
- 核心：多个 Agent 通过角色分工（如 CEO、Coder、Tester）协作完成任务，通信方式包括共享记忆或消息传递。
- 代表：AutoGen（微软）、CrewAI、MetaGPT。
- 工程取舍：增加 Agent 数量会提升任务并行度，但通信开销呈 O(n²) 增长（n 为 Agent 数）。实际中建议 3-5 个 Agent，超过 7 个后收益递减。
- 落地坑：Agent 间冲突（如两个 Agent 同时修改同一文件）。解法：引入“仲裁 Agent”或加锁机制（如文件级写锁）。
- **Toolformer / Gorilla（工具学习范式）**
- 核心：通过微调让 LLM 学会调用 API（如计算器、搜索引擎），本质是“训练时注入工具使用能力”。
- 区别：Toolformer 用自监督学习（生成 API 调用 token），Gorilla 用检索增强（从 API 文档中检索正确调用）。
- 工程取舍：训练范式需要高质量工具调用数据（约 10k 样本），但推理时零样本即可调用工具，无需复杂 prompt。
- 落地坑：工具调用格式错误（如参数类型不匹配）。解法：用 JSON schema 约束输出，并加后处理校验（如 pydantic）。
- **SWE-agent / CodeAgent（代码驱动范式）**
- 核心：Agent 通过生成和执行代码（如 Python、bash）与环境交互，而非自然语言。
- 代表：SWE-agent（解决 GitHub issue）、OpenCodeInterpreter。
- 工程取舍：代码执行效率高（一次执行可完成多步操作），但安全风险大（如删除文件）。解法：在沙箱（如 Docker 容器）中执行，并限制文件系统访问范围。
- 落地坑：代码报错后 Agent 可能重复尝试相同错误。解法：将错误信息注入 prompt，并强制 Agent 修改代码逻辑（而非重试）。

**总结**：实际项目中常混合使用，例如 ReAct + Reflexion（边想边做+反思纠错）用于客服系统，Multi-Agent + Toolformer 用于自动化 DevOps。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，反思范式（Reflexion）通过自反思提升错误修正能力，适合数学推理；第二，多智能体协作（如 AutoGen）通过角色分工处理复杂任务，但需控制 Agent 数量避免通信爆炸；第三，工具学习（Toolformer）和代码驱动（SWE-agent）分别从训练和执行角度优化工具调用。总结一句：没有银弹，实际落地需根据任务延迟和错误容忍度选择或混合范式。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：Reflexion 和 ReAct 的区别是什么？什么时候该用 Reflexion？

> Reflexion 在 ReAct 基础上增加了“反思循环”：ReAct 是“观察-思考-行动”的线性链，而 Reflexion 在行动后加入“评估-反思-修正”的反馈环。适用场景：任务需要多步推理且错误代价高（如代码调试、数学证明），不适用实时对话（如客服），因为反思延迟会破坏用户体验。工程上，Reflexion 的 evaluator 可用规则（如代码是否通过测试）或 LLM 判断（如答案是否合理），前者更稳定但覆盖不全。

**追问 2**：Multi-Agent 中如何解决 Agent 间的“幻觉传染”问题？

> 核心是隔离记忆和引入验证。每个 Agent 维护独立短期记忆（如对话历史），避免错误信息直接传递。通信时，接收方 Agent 需对消息做“可信度评分”（如用 LLM 判断是否与事实矛盾），低分消息被丢弃或标记为“待验证”。实际中，AutoGen 的“group chat”模式通过轮询仲裁 Agent 来过滤低质量消息，但会增加 20-30% 延迟。

**追问 3**：Toolformer 和 ReAct 在工具调用上有什么本质区别？

> Toolformer 是“训练时注入”：微调 LLM 使其在生成文本时自动插入 API 调用 token，推理时无需额外 prompt。ReAct 是“推理时引导”：通过 prompt 让 LLM 思考“我需要调用工具”，然后生成工具调用。工程取舍：Toolformer 需要大量标注数据（约 10k 样本），但推理速度快（一次生成）；ReAct 零样本可用，但 prompt 设计敏感，且可能生成无效调用。实际中，Toolformer 适合固定工具集（如计算器），ReAct 适合动态工具（如搜索）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“AutoGPT 是 Agent 范式” → ✅ 正确说法：AutoGPT 是 ReAct 范式的工程实现（加记忆和任务队列），不是独立范式。范式是架构思想，实现是代码框架。
- ❌ 说“Multi-Agent 就是多个 ReAct 一起跑” → ✅ 正确说法：Multi-Agent 核心是角色分工和通信协议，而非简单并行。例如 MetaGPT 中 Product Manager Agent 输出 PRD，Engineer Agent 读 PRD 写代码，角色间有依赖关系。
- ❌ 说“Reflexion 比 ReAct 好，所以都用 Reflexion” → ✅ 正确说法：Reflexion 增加了延迟和 token 成本（每次反思约 500 tokens），适合离线批处理任务，不适合实时场景。选型需权衡准确率和响应时间。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“反思范式”切入，说明 Reflexion 可用于优化检索结果（如反思检索到的文档是否相关，然后重写 query）。举例：在 RAG 系统中加入反思循环，将问答准确率从 75% 提升到 82%。
- **如果你只做过传统 NLP**：用“工具学习范式”类比，说明 Toolformer 类似传统 NLP 中的“序列标注”（在文本中插入 API 调用 token），但需要微调。强调你对训练数据构造（如从日志中提取工具调用）的理解。
- **如果你是校招无项目**：聚焦“代码驱动范式”，复现 SWE-agent 在 SWE-bench 上的 demo，说明你理解代码执行沙箱和错误处理机制。可提你对比了 ReAct 和 SWE-agent 在解决 Python bug 上的成功率。
- Reflexion: Language Agents with Verbal Reinforcement Learning (Shinn et al., 2023)
- AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation (Wu et al., 2023)
- Toolformer: Language Models Can Teach Themselves to Use Tools (Schick et al., 2023)
- SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering (Yang et al., 2024)
- MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework (Hong et al., 2023)

---
