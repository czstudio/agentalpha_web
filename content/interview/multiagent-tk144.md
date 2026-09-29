---
slug: multiagent-tk144
no: "1044"
title: "说说 Single-Agent 和 Multi-Agent 的设计方案？什么场景该用哪个"
question: "说说 Single-Agent 和 Multi-Agent 的设计方案？什么场景该用哪个"
excerpt: "面试官想看你的架构设计能力——能否根据任务特征选择合适的 Agent 架构。刁钻点在于：很多人只答"简单任务用单 Agent，复杂任务用多 Agent"，但说不清"复杂度的判断标准"和"两种架构的工程实现差异"。答好了能"
tags: ["真题解析", "多智能体"]
category: "multiagent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4137
updated: "2026-09-29"
---

## 说说 Single-Agent 和 Multi-Agent 的设计方案？什么场景该用哪个

#### 1️⃣ 考察意图

面试官想看你的架构设计能力——能否根据任务特征选择合适的 Agent 架构。刁钻点在于：很多人只答"简单任务用单 Agent，复杂任务用多 Agent"，但说不清"复杂度的判断标准"和"两种架构的工程实现差异"。答好了能展示你的系统设计判断力。

#### 2️⃣ 标准答

**Single-Agent 和 Multi-Agent 的设计方案的选型核心是"任务分解可能性"和"上下文隔离需求"。**

**1. Single-Agent 设计方案**

**方案 A：ReAct（Reasoning + Acting）**

- 流程：Thought → Action → Observation → Repeat
- 适用：需要工具调用但步骤不多的任务（3-10 步）
- 实现：LangChain AgentExecutor 或 LangGraph StateGraph
- 局限：上下文随步骤线性增长，10 步后可能 10k+ tokens

**方案 B：Plan-and-Execute**

- 流程：先一次性生成完整计划 → 逐步执行计划
- 适用：步骤明确且可预先规划的任务（如"部署一个 Web 应用"）
- 优势：比 ReAct 减少 LLM 调用次数（规划 1 次 + 执行 N 次 vs ReAct 的 2N 次）
- 局限：计划可能不准确，执行中遇到意外需要重新规划

**方案 C：Reflection + ReAct**

- 流程：ReAct 循环 + 每步后反思
- 适用：质量要求高的任务（如代码生成）
- 优势：反思能发现并纠正错误，准确率提升 15-25%
- 局限：每步多一次 LLM 调用（反思），token 消耗翻倍

**2. Multi-Agent 设计方案**

**方案 A：Hub-and-Spoke（中心化）**

- 架构：Router Agent 做调度，Worker Agent 做执行
- 适用：任务可以明确拆分且子任务独立
- 实现：Router 用规则或 LLM 做任务分配，Worker 各自执行后合并结果
- 优势：结构清晰，容易调试
- 劣势：Router 是单点故障，且分配决策延迟影响全局

**方案 B：Pipeline（流水线）**

- 架构：Agent A → Agent B → Agent C，串行流水线
- 适用：任务有明确阶段（如"研究→编码→测试"）
- 实现：每个 Agent 的输出是下一个 Agent 的输入
- 优势：简单高效，无需复杂调度
- 劣势：不支持并行和回溯

**方案 C：Debate（辩论）**

- 架构：多个 Agent 对同一问题给出不同方案，Judge Agent 选择最优
- 适用：答案不唯一、需要多角度思考的任务（如"设计系统架构"）
- 实现：N 个 Agent 独立推理 → 交叉辩论（看到对方的答案后修正自己的） → Judge 投票
- 优势：类似 Self-Consistency 但每个 Agent 可以看到其他方案后改进
- 劣势：token 消耗是 Single-Agent 的 3-5 倍

**方案 D：Hierarchical（层级）**

- 架构：Manager Agent → Team Lead Agent → Worker Agent
- 适用：大规模 Agent 系统（10+ Agent），需要分层管理
- 实现：Manager 分配大任务给 Team Lead，Team Lead 再分配子任务给 Worker
- 优势：可扩展性好（每层只管理 3-5 个下级）
- 劣势：层级延迟（Manager→Lead→Worker 三跳）

**3. 选型决策框架**

`Step 1: 任务能否分解为独立子任务？**  ├─ 否 → Single-Agent (ReAct / Plan-Execute)
  └─ 是 → Step 2: 子任务是否需要不同技能/角色？
          ├─ 否 → Single-Agent (Plan-Execute 足够)
          └─ 是 → Step 3: 子任务能否并行？
                  ├─ 是 → Multi-Agent (Hub-and-Spoke)
                  └─ 否 → Step 4: 需要多角度思考？
                          ├─ 是 → Multi-Agent (Debate)
                          └─ 否 → Multi-Agent (Pipeline)`

#### 3️⃣ 答题模板（30 秒电梯版）

> "Single-Agent 三种方案：ReAct（Thought-Action-Observation 循环，适合 3-10 步任务）、Plan-and-Execute（先规划再执行，适合步骤明确）、Reflection+ReAct（每步反思，质量高但 token 翻倍）。Multi-Agent 四种方案：Hub-and-Spoke（Router 调度 Worker，适合可拆分任务）、Pipeline（A→B→C 串行，适合阶段明确）、Debate（多 Agent 辩论+Judge 投票，适合多角度思考）、Hierarchical（Manager→Lead→Worker，适合 10+ Agent 大规模）。选型核心：能否分解？需要不同技能？能否并行？需要多角度？"

#### 4️⃣ 高频追问 & 应对
追问 1**：Plan-and-Execute 的计划不准确怎么办？执行中遇到意外怎么处理？

> 两种策略：(1) 计划检查点——执行每步后对比实际结果与计划预期，如果偏差超过阈值（如"预期返回 3 个文件但实际返回 0 个"），触发重新规划。重新规划时保留已完成步骤，只修改剩余计划；(2) 异常处理分支——在计划中预定义异常处理（如"如果工具调用失败→重试 3 次→如果仍然失败→跳过并标记→继续下一步"）。关键设计：计划是"指导"而非"约束"——允许 Agent 在执行中偏离计划，但需要记录偏离原因。

**追问 2**：Debate 模式中 Agent 看到对方的答案后修正自己的，会不会导致"群体思维"（所有 Agent 趋同）？

> 确实有这个风险。防御方案：(1) 异构 Agent——不同 Agent 用不同模型（GPT-4 + Claude + Gemini）或不同 prompt（如"保守派 Agent"vs"激进派 Agent"），确保初始答案有多样性；(2) 匿名辩论——Agent 看到的是"匿名方案"而非"Agent A 的方案"，减少权威效应（如果 Agent A 是 GPT-4，其他 Agent 可能盲目跟从）；(3) 限定修改——Agent 最多修改 1 次自己的答案，避免反复趋同。实测：异构+匿名+限定修改的 Debate，方案多样性保持率 85%+。

**追问 3**：Hierarchical 模式中 Manager 怎么分配任务给 Team Lead？

> 两种方式：(1) 能力匹配——Manager 维护 Team Lead 的能力描述（如"代码团队擅长 Python/Go""文档团队擅长技术写作"），按任务类型分配。延迟低（<10ms）但可能匹配不准；(2) LLM 决策——Manager 用 LLM 分析任务并选择最合适的 Team Lead。准确率高但延迟大（200-500ms）。生产建议：Manager 用能力匹配做粗筛（选 top-2 Team Lead），然后用 LLM 做最终选择。关键设计：Manager 不做具体任务，只做分配——避免 Manager 成为瓶颈。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "所有任务都用 Multi-Agent，更强大" → ✅ "Multi-Agent 有通信开销和协调成本。简单任务用 Single-Agent 更高效。选型应该从任务特征出发，而非'越复杂越好'。"
- ❌ "ReAct 就是最优的 Single-Agent 方案" → ✅ "ReAct 适合步骤不确定的任务，但步骤明确时 Plan-and-Execute 更高效（LLM 调用次数少 50%）。没有'最优方案'，只有'最匹配场景的方案'。"
- ❌ "Debate 模式一定能提升质量" → ✅ "Debate 的效果依赖 Agent 多样性。如果所有 Agent 用同一个模型和 prompt，Debate 退化为 Self-Consistency（多次采样投票），收益有限。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 架构设计经验**：从"选型决策过程"切入，描述你对比的 2-3 种方案、选型理由和上线效果
- **如果你只做过 Single Agent**：用"从 Single 到 Multi 的迁移"切入，说明你在实践中遇到的 Single-Agent 局限性
- **如果你是校招无项目**：用同一个任务分别实现 ReAct、Plan-Execute、Pipeline 三种方案，对比质量/效率/token 消耗，写一篇博客
- "ReAct: Synergizing Reasoning and Acting" (Yao et al., 2022)
- "Plan-and-Execute Pattern for LLM Agents" (LangChain, 2024)
- "Multi-Agent Debate: Improving LLM Reasoning" (Du et al., 2023)

---
