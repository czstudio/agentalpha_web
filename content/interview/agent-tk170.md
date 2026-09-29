---
slug: agent-tk170
no: "1070"
title: "什么是「策略模式「在 Agent 决策中的应用"
question: "什么是「策略模式「在 Agent 决策中的应用"
excerpt: "面试官想看你能否将策略模式应用于 Agent 的"决策逻辑可替换"场景。刁钻点在于：Agent 的决策逻辑（选什么工具、怎么规划）通常硬编码在 prompt 中，修改决策逻辑需要改 prompt。策略模式允许在运行时动态"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4580
updated: "2026-09-29"
---

## 什么是「策略模式「在 Agent 决策中的应用

#### 1️⃣ 考察意图

面试官想看你能否将策略模式应用于 Agent 的"决策逻辑可替换"场景。刁钻点在于：Agent 的决策逻辑（选什么工具、怎么规划）通常硬编码在 prompt 中，修改决策逻辑需要改 prompt。策略模式允许在运行时动态切换决策策略，而无需修改 prompt。答好了能展示你的设计模式迁移能力和 Agent 架构灵活性。

#### 2️⃣ 标准答

**1. 策略模式回顾**

- **核心**：定义一系列算法（策略），封装每个算法，使它们可以互换。Context 持有策略引用，运行时可以替换策略
- **优势**：算法独立变化、运行时可切换、避免大量 if-else

**2. Agent 中的策略模式应用**

Agent 决策的多个环节可以用策略模式实现"可替换"：

- **工具选择策略**——决定"在当前状态下选哪个工具"`RandomStrategy`：随机选择（基线）
- `ReActStrategy`：LLM 根据观察推理选择（默认）
- `RouterStrategy`：先用小模型分类再选（工具多时用）
- `RLStrategy`：用强化学习模型选择（基于历史奖励）
规划策略——决定"如何分解任务"
- `ZeroShotPlanner`：直接让 LLM 生成计划
- `FewShotPlanner`：提供示例引导 LLM
- `DecomposePlanner`：递归分解子任务
- `TemplatePlanner`：匹配预定义模板
记忆检索策略——决定"从记忆中检索什么"
- `RecentStrategy`：只检索最近 N 轮
- `SemanticStrategy`：向量检索相关记忆
- `HybridStrategy`：最近 + 语义混合
- `ImportanceStrategy`：按重要性权重检索
错误恢复策略——决定"工具调用失败后怎么办"
- `RetryStrategy`：重试（相同参数）
- `BackoffStrategy`：指数退避重试
- `FallbackStrategy`：换一个替代工具
- `HumanEscalationStrategy`：转人工处理

**3. 工程化实现**

`from abc import ABC, abstractmethod**
class ToolSelectionStrategy(ABC):
    """工具选择策略接口"""
    @abstractmethod
    def select(self, context: dict, tools: list) -> str:
        """返回选择的工具名称"""
        pass

class ReActStrategy(ToolSelectionStrategy):
    def select(self, context, tools):
        # 用 LLM 推理选择工具
        prompt = f"Context: {context}\nAvailable tools: {tools}\nSelect best tool:"
        return llm_call(prompt)

class RouterStrategy(ToolSelectionStrategy):
    def select(self, context, tools):
        # 先用小模型分类，再在大类中选
        category = small_llm_classify(context)  # "search" / "code" / "email"
        relevant_tools = [t for t in tools if t.category == category]
        return react_select(context, relevant_tools)  # 缩小范围后再用 ReAct

class AgentContext:
    """Agent 上下文，持有策略引用"""
    def __init__(self, strategy: ToolSelectionStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: ToolSelectionStrategy):
        """运行时切换策略"""
        self._strategy = strategy

    def select_tool(self, context, tools):
        return self._strategy.select(context, tools)

# 使用：根据工具数量动态切换策略
agent = AgentContext(ReActStrategy())
if len(tools) > 15:
    agent.set_strategy(RouterStrategy())  # 工具多时切换到路由策略`4. 动态策略切换**

- **基于任务特征自动切换**——工具 >15 个时切换到 RouterStrategy、任务步骤 >10 时切换到 Plan-and-Execute 策略
- **A/B 测试**——50% 流量用 ReActStrategy，50% 用 RouterStrategy，对比任务完成率
- **降级策略**——LLM 调用超时时，从 ReActStrategy 降级到 RuleBasedStrategy（规则匹配，无 LLM 调用）

#### 3️⃣ 答题模板（30 秒电梯版）

> "策略模式在 Agent 中实现'决策逻辑可替换'。四个应用环节：工具选择策略（ReAct/Router/RL）、规划策略（ZeroShot/FewShot/Decompose）、记忆检索策略（Recent/Semantic/Hybrid）、错误恢复策略（Retry/Fallback/Human）。实现用接口+具体策略类+Context 持有策略引用。动态切换：基于任务特征自动切换（工具>15用Router）、A/B测试对比策略效果、降级（LLM超时切换到规则策略）。优势：策略独立变化、运行时可切换、避免大量if-else。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：策略模式和直接用 if-else 有什么区别？不就是换个写法吗？

> 本质区别在"变化隔离"和"开闭原则"：(1) **变化隔离**——if-else 把所有策略的逻辑混在一起，修改一个策略可能影响其他。策略模式每个策略是独立类，修改互不影响；(2) **开闭原则**——新增策略时，if-else 需要修改已有代码（加新分支），策略模式只需新增策略类并注册，不改已有代码；(3) **运行时切换**——if-else 在编译时确定路径，策略模式可以在运行时动态切换（如根据工具数量自动切换选择策略）。对于 Agent 场景，策略模式的核心价值是"策略可以热更新"——不需要重启服务就能切换决策逻辑。

**追问 2**：错误恢复策略具体怎么实现？不同错误需要不同恢复方式。

> 按错误类型分派恢复策略：(1) **超时错误**→`BackoffStrategy`（等待后重试，如 1s→2s→4s 退避）；(2) **参数错误**→`RetryStrategy`（LLM 重新生成参数后重试，而非用相同参数）；(3) **工具不可用**→`FallbackStrategy`（换替代工具，如 search API 挂了用缓存结果）；(4) **安全拦截**→`HumanEscalationStrategy`（转人工，不重试）；(5) **LLM 幻觉**→`ValidateStrategy`（输出校验+重新生成）。实现：定义 `ErrorRecoveryChain`，根据错误类型匹配策略。类似责任链模式——错误沿着链传递，直到找到能处理的策略。

**追问 3**：强化学习策略（RLStrategy）在 Agent 工具选择中怎么用？

> RL 策略将工具选择建模为序列决策问题：(1) **状态**——当前对话上下文的 embedding + 可用工具的 embedding；(2) **动作**——选择某个工具；(3) **奖励**——任务完成率 + 用户满意度 - token 成本；(4) **模型**——用 DPO 或 PPO 微调一个策略模型（如 7B Llama），输入状态输出工具选择概率分布。挑战：(1) 数据需求——需要大量 (状态, 动作, 奖励) 轨迹数据，通常从生产日志中提取；(2) 探索-利用——模型可能总是选择"历史上成功过的工具"，忽略新工具。解法：ε-greedy 策略（90% 选最优，10% 随机探索）。目前 RL 策略在 Agent 中仍处于研究阶段，工业界主流仍是 ReAct + 规则路由。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "策略模式就是写很多 if-else 分支" → ✅ "策略模式的核心是消除 if-else——每个策略是独立类，Context 运行时动态选择。新增策略不改已有代码（开闭原则）。"
- ❌ "所有决策都应该用 LLM 做策略选择" → ✅ "简单决策用规则策略（如工具 >15 用 Router），复杂决策才用 LLM。过度依赖 LLM 增加成本和延迟。"
- ❌ "策略一旦选定就不能变" → ✅ "策略模式的核心优势是运行时可切换。Agent 应该根据任务特征、环境状态、成本预算动态切换策略。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 框架项目**：从"策略可插拔架构"切入，描述你设计的策略接口和动态切换机制，给出数据（如新增策略从 2 天降到 2 小时、A/B 测试效率提升 50%）
- **如果你只做过后端架构**：用"支付策略"类比——支付宝/微信/银行卡支付策略的切换和 Agent 工具选择策略的切换是相同的模式
- **如果你是校招无项目**：用 Python 实现 3 种工具选择策略（ReAct/Router/Rule），在不同工具数量下对比准确率和延迟
- "Strategy Pattern in AI Systems" (Breck et al., 2024)
- "LangChain Agent Strategies: A Comparative Analysis" (LangChain, 2024)
- "Learning to Select Tools for LLM Agents" (Song et al., 2023)

---
