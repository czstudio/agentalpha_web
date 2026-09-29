---
slug: agent-tk167
no: "1067"
title: "单 Agent 和 Multi-Agent 架构的决策树是什么"
question: "单 Agent 和 Multi-Agent 架构的决策树是什么"
excerpt: "面试官想看你能否给出一个清晰的"何时用单 Agent、何时用多 Agent"的决策框架。刁钻点在于：很多人认为"多 Agent 一定更强"，但多 Agent 的协调成本、通信开销、调试复杂度都远高于单 Agent。答好了"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4087
updated: "2026-09-29"
---

## 单 Agent 和 Multi-Agent 架构的决策树是什么

#### 1️⃣ 考察意图

面试官想看你能否给出一个清晰的"何时用单 Agent、何时用多 Agent"的决策框架。刁钻点在于：很多人认为"多 Agent 一定更强"，但多 Agent 的协调成本、通信开销、调试复杂度都远高于单 Agent。答好了能展示你的架构判断力和对系统复杂度的敏感度。

#### 2️⃣ 标准答

**决策树（按顺序判断）：**

`Q1: 任务是否需要多种不同专业能力？**├── 否 → 单 Agent
└── 是 → Q2: 这些能力是否需要并行执行？
    ├── 否 → 单 Agent（串行调用不同工具）
    └── 是 → Q3: Agent 间是否需要深度协作（非简单的任务分发）？
        ├── 否 → Multi-Agent（Orchestrator + Workers 模式）
        └── 是 → Q4: 延迟是否敏感（<10s）？
            ├── 是 → 考虑单 Agent + 大 context（牺牲质量换速度）
            └── 否 → Multi-Agent（协作模式）`1. 选单 Agent 的场景**

- **任务边界清晰**：如"搜索+总结"——一个 Agent 用 search 工具 + summarization 工具就能完成
- **步骤可预测**：如"ETL 流程"——抽取→转换→加载，路径固定
- **延迟敏感**：如实时客服——多 Agent 的协调通信增加 2-5s 延迟
- **资源受限**：如移动端 Agent——多 Agent 需要更多 LLM 调用，成本和能耗更高
- **工具数量少（<15）**：一个 Agent 能管理所有工具

**2. 选 Multi-Agent 的场景**

- **任务复杂需分工**：如"软件开发"——需求分析、架构设计、编码、测试需要不同专业能力
- **需要并行处理**：如"同时搜索 5 个数据源"——5 个 Agent 并行搜索，单 Agent 串行需要 5 倍时间
- **容错要求高**：如"医疗诊断"——多个 Agent 独立诊断后投票，降低单 Agent 幻觉风险
- **需要多角色协作**：如"辩论场景"——正方 Agent 和反方 Agent 对抗，产出更全面的分析
- **工具数量多（>15）**：按功能分组，每个 Agent 管理一类工具

**3. 多 Agent 的成本分析**

| 维度 | 单 Agent | Multi-Agent (5个) |
|---|---|---|
| LLM调用次数 | 5-10次/任务 | 15-30次/任务（含协调） |
| Token消耗 | 10-20k | 30-60k（含Agent间通信） |
| 延迟 | 5-15s | 10-30s（含协调延迟） |
| 成本 | \$0.1-0.5 | \$0.5-2.0 |
| 任务完成率 | 75-85% | 85-95%（复杂任务） |
| 调试复杂度 | 低（单链路） | 高（多链路+交互） |

**4. 混合策略：单 Agent 为主，按需升级**

- 80% 的任务用单 Agent 完成（成本低、延迟低）
- 20% 的复杂任务自动升级为 Multi-Agent（质量优先）
- 升级触发条件：任务完成率 <60%、步数 >15、用户满意度 <3.0

#### 3️⃣ 答题模板（30 秒电梯版）

> "决策树四步：Q1是否需要多种专业能力？否→单Agent。是→Q2是否需要并行？否→单Agent串行调工具。是→Q3是否需要深度协作？否→Orchestrator+Workers模式。是→Q4延迟敏感？是→考虑单Agent大context。否→Multi-Agent协作模式。选单Agent：任务清晰/延迟敏感/工具<15。选多Agent：需分工/需并行/容错要求高/工具>15。成本：多Agent的token消耗×3、延迟×2。混合策略：80%单Agent+20%按需升级。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：多 Agent 的"协调通信"具体消耗多少 token？怎么优化？

> 协调通信的 token 消耗分三类：(1) **任务分发**——Orchestrator 向 Worker 传递任务描述，约 500-1000 tokens/次。5 个 Worker = 2500-5000 tokens；(2) **结果汇报**——Worker 向 Orchestrator 返回结果，约 200-500 tokens/次。5 个 Worker = 1000-2500 tokens；(3) **Agent 间协作**——如果 Worker 之间需要交换信息（如 Coder Agent 把代码传给 Tester Agent），额外 500-1000 tokens/次。总协调开销约 4-8k tokens/任务。优化方案：(1) **结构化通信**——Agent 间用 JSON 而非自然语言通信，减少 token（如 `{"status": "done", "result": "..."}` 比 "我已经完成了任务，结果是..."短 40%）；(2) **摘要传递**——Worker 返回结果前先做摘要，只传关键信息；(3) **按需通信**——Agent 间不主动通信，只在 Orchestrator 要求时才汇报。

**追问 2**：你提到"容错要求高用多 Agent"，但多 Agent 也可能集体犯错（共识攻击），怎么平衡？

> 矛盾但可管理：(1) **异构 Agent**——用不同模型（如 GPT-4 + Claude + Gemini）或不同 prompt 的同模型。异构性降低集体错误概率——不同模型犯不同错误，概率性错误不容易同时发生。实测：3 个异构 Agent 的集体错误率约 2%，而 3 个同构 Agent 约 5%；(2) **独立推理**——Agent 间在最终决策前不通信，各自独立完成推理后提交结果。避免"锚定效应"——第一个 Agent 的输出影响后续 Agent 的判断；(3) **置信度加权**——不是简单多数决，而是按每个 Agent 的置信度加权。低置信度的 Agent 权重低。核心认知：多 Agent 的容错价值来自"多样性"而非"数量"——5 个相同的 GPT-4 Agent 不比 1 个更安全。

**追问 3**：从单 Agent 升级到多 Agent，架构改动大吗？

> 改动不大，如果用了 LangGraph：(1) **单 Agent 模式**——一个 `AgentExecutor` 节点，包含所有工具；(2) **多 Agent 模式**——拆分为多个 `AgentExecutor` 节点，用 `StateGraph` 的边定义协调流程。工具按功能分组分配给不同 Agent。代码改动约 30%——主要是工具注册和流程定义，业务逻辑不变；(3) **动态切换**——在 StateGraph 中加一个 "router" 节点，根据任务复杂度决定走单 Agent 路径还是多 Agent 路径。实测：从单 Agent 升级到多 Agent 约 2-3 人天（含测试），关键成本在调试多 Agent 的交互逻辑而非代码编写。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "多 Agent 一定比单 Agent 强" → ✅ "多 Agent 的协调成本（token ×3、延迟 ×2、调试复杂度 ×5）远高于单 Agent。80% 的任务单 Agent 就能完成。只有复杂、并行、高容错任务才需要多 Agent。"
- ❌ "Agent 越多越好，分工越细越好" → ✅ "Agent 数量增加导致协调开销指数增长。5 个 Agent 是最佳平衡点——超过 10 个 Agent 时，协调开销超过并行收益。"
- ❌ "多 Agent 天然比单 Agent 安全（多一层防护）" → ✅ "多 Agent 的安全性来自'异构性'而非'数量'。5 个相同的 GPT-4 Agent 不比 1 个更安全——它们会犯相同的错误。需要异构 Agent（不同模型/prompt）才能提升安全性。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 架构项目**：从"架构选型决策"切入，描述你的决策树和混合策略，给出数据（如"80% 单 Agent + 20% 多 Agent，平均成本 \$0.4/任务，复杂任务完成率从 73% 提升到 91%"）
- **如果你有分布式系统经验**：用"单体 vs 微服务"类比——单 Agent = 单体应用，多 Agent = 微服务。选型逻辑一致：根据复杂度、团队规模、延迟要求决定
- **如果你是校招无项目**：用 LangGraph 实现单 Agent 和多 Agent 两种架构，在 5 种任务上对比完成率/成本/延迟，写一篇博客分析决策树
- "Multi-Agent Systems: A Survey of Architectures and Applications" (Ji et al., 2024)
- "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation" (Wu et al., 2023)
- "MetaGPT: Meta Programming for Multi-Agent Collaborative Framework" (Hong et al., 2023)

---
