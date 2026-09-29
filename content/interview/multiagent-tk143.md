---
slug: multiagent-tk143
no: "1043"
title: "什么是 Multi-Agent？与 Single-Agent 有什么本质区别"
question: "什么是 Multi-Agent？与 Single-Agent 有什么本质区别"
excerpt: "面试官想确认你是否真正理解 Multi-Agent 的核心概念，而非停留在"多个 Agent 一起工作"的表层认知。刁钻点在于：很多人混淆了"多次调用 LLM"和"Multi-Agent"——Single-Agent 也"
tags: ["真题解析", "多智能体"]
category: "multiagent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4339
updated: "2026-09-29"
---

## 什么是 Multi-Agent？与 Single-Agent 有什么本质区别

#### 1️⃣ 考察意图

面试官想确认你是否真正理解 Multi-Agent 的核心概念，而非停留在"多个 Agent 一起工作"的表层认知。刁钻点在于：很多人混淆了"多次调用 LLM"和"Multi-Agent"——Single-Agent 也可以多次调用 LLM（如 ReAct 循环），关键区别在于"角色独立性"和"状态隔离"。答好了能展示你对 Agent 架构的系统性理解。

#### 2️⃣ 标准答

**Multi-Agent 的本质是"角色独立 + 状态隔离 + 协作通信"，而非简单的"多次 LLM 调用"。**

**1. Single-Agent 架构**

一个 LLM 独立完成感知（Perception）→ 规划（Planning）→ 记忆（Memory）→ 行动（Action）的全部环节：

`用户请求 → [感知] → [规划] → [记忆检索] → [工具调用] → [观察结果] → [重新规划] → ... → 输出
                    ↑__________________________|
                         ReAct 循环`特点：(1) 单一 prompt 上下文——所有信息在一个 context window 中流动；(2) 单一角色——LLM 既是规划者也是执行者；(3) 单一状态——所有中间结果在一个 state 对象中管理

**2. Multi-Agent 架构**

多个 Agent 各司其职，通过消息传递协作：

`用户请求 → [Router Agent] → 分配任务
                ↓                    ↓
        [Planner Agent]      [Researcher Agent]
          制定计划             搜索资料
                ↓                    ↓
        [Executor Agent]     [Reviewer Agent]
          执行任务             审查结果
                ↓                    ↓
              [合并结果] ← 消息传递`特点：(1) 独立 prompt 上下文——每个 Agent 有自己的 system prompt 和上下文窗口；(2) 独立角色——每个 Agent 有明确的职责边界；(3) 独立状态——每个 Agent 维护自己的内部状态，通过消息传递共享信息

**3. 本质区别（3 个维度）**

| 维度 | Single-Agent | Multi-Agent |
|---|---|---|
| 上下文管理 | 单一 context window，所有信息混合 | 每个 Agent 独立 context，信息按需传递 |
| 角色边界 | 无明确边界，LLM 同时扮演所有角色 | 明确角色分工，每个 Agent 专注一个职责 |
| 故障影响 | 一个步骤失败可能污染整个上下文 | 一个 Agent 失败可以隔离，其他 Agent 继续 |

**关键洞察**：Multi-Agent 的核心价值不是"更多 LLM 调用"，而是"上下文隔离"——在 Single-Agent 中，规划阶段的推理链和执行阶段的工具调用结果混在一个 context window 中，互相干扰（如规划思路被冗长的工具返回值"淹没"）。Multi-Agent 将规划 Agent 和执行 Agent 分开，各自维护干净的上下文。

**4. 什么时候该用 Multi-Agent？**

- **任务复杂度高**：需要多种不同技能（如"研究+编码+测试"），单一 prompt 难以同时覆盖
- **上下文窗口不够**：任务所需信息超过单个 context window（如分析 10 个文件，每个 5000 字）
- **并行化需求**：多个子任务可以同时执行（如同时审查 3 个代码文件）
- **容错需求**：一个 Agent 失败不应导致整个任务失败

**5. 什么时候不该用 Multi-Agent？**

- **简单任务**：单步就能完成的任务（如"翻译这句话"），Multi-Agent 的通信开销 > 收益
- **强一致性需求**：需要所有步骤共享完整上下文的任务（如"写一篇连贯的文章"），Multi-Agent 的信息传递可能丢失细节
- **延迟敏感**：Multi-Agent 的消息传递和协调增加 200-500ms 延迟

#### 3️⃣ 答题模板（30 秒电梯版）

> "Multi-Agent 的本质是'角色独立+状态隔离+协作通信'，而非'多次调用 LLM'。Single-Agent 在一个 context window 中完成所有环节（感知→规划→行动），Multi-Agent 将不同职责分配给不同 Agent，各自维护独立上下文。核心价值是上下文隔离——规划思路不被工具返回值淹没。三个区别维度：上下文管理（单一 vs 独立）、角色边界（无 vs 明确）、故障影响（全污染 vs 可隔离）。用 Multi-Agent 的信号：任务复杂、上下文不够、需要并行、需要容错。不用 Multi-Agent 的信号：简单任务、强一致性、延迟敏感。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：Single-Agent 用 ReAct 循环也可以做复杂任务，为什么还需要 Multi-Agent？

> 三个核心限制：(1) 上下文窗口——ReAct 循环中，每一步的推理+工具结果都追加到 context，10 步后可能 20k+ tokens。Multi-Agent 将不同阶段的上下文隔离，每个 Agent 只看自己需要的信息；(2) 角色混淆——同一个 LLM 同时做规划和执行，prompt 中需要同时包含规划指令和工具描述，容易导致 LLM 混淆"现在是该规划还是该执行"；(3) 错误传播——ReAct 中如果第 3 步的推理出错，错误会传播到后续所有步骤。Multi-Agent 中 Reviewer Agent 可以在关键节点检查和纠错。实测：在"代码审查"任务上，Multi-Agent（Coder+Reviewer）的 bug 检出率比 Single-Agent（ReAct）高 25%。

**追问 2**：Multi-Agent 的通信开销会不会抵消并行化的收益？

> 取决于任务结构：(1) 独立子任务——如"分析 3 个独立文件"，几乎不需要通信，并行化收益远大于通信开销（3x 加速 vs ~0 通信）；(2) 依赖子任务——如"写代码→测试代码→修复 bug"，每步依赖上一步，通信开销 ≈ 并行化收益（因为无法并行）；(3) 部分依赖——如"3 个 Agent 各写一个模块→合并"，并行写模块 + 串行合并，收益 > 开销。经验法则：如果子任务间的通信量 < 子任务执行量的 20%，Multi-Agent 有正收益。

**追问 3**：Multi-Agent 中的"Agent"和微服务架构中的"Service"有什么区别？

> 三个核心区别：(1) 智能性——Service 是确定性的（相同输入→相同输出），Agent 是概率性的（相同输入可能不同输出，因为 LLM 的温度采样）；(2) 通信协议——Service 用结构化 API（gRPC/REST），Agent 可以用自然语言对话（AutoGen）；(3) 自主性——Service 被动等待调用，Agent 可以主动发起请求（如 Reviewer Agent 主动检查 Coder 的工作）。联系：两者都关注"解耦"、"容错"、"可扩展"，Service 的设计模式（服务发现、负载均衡、熔断）可以直接迁移到 Agent 系统。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "Multi-Agent 就是多个 LLM 一起调用" → ✅ "Multi-Agent 的核心是角色独立和上下文隔离，而非简单的多次调用。如果多个 LLM 调用共享同一个上下文且没有角色区分，那只是 Single-Agent 的多次推理。"
- ❌ "Agent 数量越多效果越好" → ✅ "Agent 数量增加会导致通信开销 O(N²) 增长和协调复杂度爆炸。实践中的最优 Agent 数量通常在 3-7 个，超过 10 个需要引入层级管理（如 Manager Agent）。"
- ❌ "Multi-Agent 一定比 Single-Agent 好" → ✅ "Multi-Agent 有通信开销（200-500ms/次）和协调成本。简单任务（如翻译、摘要）用 Single-Agent 更高效。选择取决于任务复杂度、并行度和容错需求。"

#### 6️⃣ 简历呼应

- **如果你有 Multi-Agent 项目**：从"架构选型决策"切入，描述你为什么从 Single-Agent 迁移到 Multi-Agent，给出迁移前后的效果对比（如 bug 检出率 +25%、延迟 +15%）
- **如果你只做过 Single Agent**：用"ReAct 循环的局限性"切入，说明你在实践中遇到的上下文窗口不够、角色混淆等问题，以及 Multi-Agent 如何解决
- **如果你是校招无项目**：用同一个任务（如"写+审+改代码"）分别用 Single-Agent（ReAct）和 Multi-Agent（Coder+Reviewer+Fixer）实现，对比质量和效率，写一篇博客
- "A Survey on Large Language Model based Multi-Agents" (Ji et al., 2024)
- "ReAct: Synergizing Reasoning and Acting in Language Models" (Yao et al., 2022)
- "AutoGen: Multi-Agent Conversation Framework" (Wu et al., 2023)

---
