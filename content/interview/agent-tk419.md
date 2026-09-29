---
slug: agent-tk419
no: "1319"
title: "认知规划（Cognitive Planning）在Working Memory中如何实现"
question: "认知规划（Cognitive Planning）在Working Memory中如何实现"
excerpt: "面试官想看你是否真正理解“规划”在Agent架构中不是独立模块，而是与Working Memory（工作记忆）深度耦合的认知过程。考察类型是系统设计+工程取舍。刁钻点在于：多数人只会背ReAct或Tree-of-Thou"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3867
updated: "2026-09-29"
---

## 认知规划（Cognitive Planning）在Working Memory中如何实现

`P2` · `agent_architecture`

🏷 标签：`agent`, `working-memory`, `cognitive-planning`, `planning`

#### 1️⃣ 考察意图

面试官想看你是否真正理解“规划”在Agent架构中不是独立模块，而是与Working Memory（工作记忆）深度耦合的认知过程。考察类型是**系统设计+工程取舍**。刁钻点在于：多数人只会背ReAct或Tree-of-Thoughts，但说不清规划结果如何写入、维护、更新到工作记忆，以及如何处理环境动态变化导致的规划失效。答好了能展示你对Agent认知架构的底层理解，以及从符号规划到LLM推理的横向对比能力。

#### 2️⃣ 标准答

认知规划在Working Memory中的实现，本质是**将当前状态、目标、约束压缩到有限容量的工作记忆槽位中，并迭代生成可执行的动作序列**。核心分三步：状态表征、规划生成、记忆维护。

**1. 状态表征：从感知到符号化**

- 从环境感知（视觉/文本）提取关键特征，写入Working Memory的**状态槽**。例如，在MiniGrid中，将Agent坐标、门状态、钥匙位置编码为固定长度的向量或符号谓词（如`at(agent, (2,3))`）。
- **工程取舍**：用原始embedding（如CLIP）保留丰富语义但占用记忆带宽；用符号化（如PDDL谓词）节省空间但丢失细节。实践中，动态环境用embedding+压缩（如PCA降维），静态环境用符号化。

**2. 规划生成：三种主流方法**

- **符号规划（PDDL）**：从Working Memory读取当前状态和长期记忆中的领域知识（如动作前提/效果），调用Fast Downward等规划器生成动作序列。结果写入**规划槽**，每个动作带时间戳和预期状态。**坑**：PDDL假设环境完全可观测且动作确定性，实际中状态更新延迟会导致规划失效。解法：在规划槽中维护一个**置信度分数**，当观测与预期偏差超过阈值（如0.3）时触发重规划。
基于LLM的推理（ReAct/ToT）：将Working Memory中的状态、历史动作、目标拼接成prompt，让LLM生成下一步动作或子目标。ToT更进一步，在记忆槽中维护多个候选路径（树结构），每个节点存状态+累积奖励。
- **工程取舍**：ReAct轻量但短视（只考虑一步），ToT全局但计算成本高（每层分支数×深度）。实际中，用**动态分支剪枝**：当某个分支的置信度低于0.2时，从Working Memory中移除。
基于模型的强化学习（MCTS）：在Working Memory中维护一个搜索树，节点存状态访问次数和Q值。每次模拟从当前状态出发，用长期记忆中的环境模型（如神经网络）预测下一状态，反向传播更新Q值。
- **坑**：MCTS需要大量模拟（如1000次/步），在实时场景中不可行。解法：用**经验回放缓冲区**缓存历史模拟结果，当状态相似时直接复用，减少模拟次数到50次/步。

**3. 记忆维护：规划与执行的完整流程**

- 执行动作后，将新观测写入Working Memory的**观测槽**，与规划槽中的预期状态对比。若一致，标记该动作为“已完成”；若不一致，触发**规划修复**：从当前状态重新规划剩余子目标。
- **实际落地的坑**：Working Memory容量有限（如GPT-4的8K token），规划序列过长会被截断。解法：用**分层规划**——高层规划存子目标（如“去厨房”），低层规划存原子动作（如“左转”），只将当前子目标的原子动作保留在记忆槽中。

**总结**：认知规划在Working Memory中的实现，不是简单的“生成计划”，而是**状态感知→规划生成→记忆维护→动态修复**的完整流程。关键在于平衡规划精度与记忆容量，以及处理环境不确定性。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，状态表征——如何将环境感知压缩到Working Memory的槽位中，比如用符号谓词或embedding；第二，规划生成——三种主流方法：PDDL适合静态环境，ReAct/ToT适合动态但需剪枝，MCTS适合复杂决策但计算重；第三，记忆维护——规划结果写入后如何与执行结果对比，触发重规划或修复。总结一句：核心是让Working Memory成为规划与执行的‘缓存区’，既要存得下，又要修得快。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：Working Memory容量有限，规划序列太长怎么办？

> 用分层规划（Hierarchical Planning）：高层规划存子目标（如“去厨房”），低层规划存原子动作（如“左转”）。只将当前子目标的原子动作保留在Working Memory中，其他子目标存索引（如“子目标2：去卧室”）。当子目标完成时，从长期记忆加载下一个子目标的原子动作。这类似人类认知中的“组块化”（Chunking），能有效压缩记忆占用。

**追问 2**：环境动态变化导致规划失效，如何检测和修复？

> 在Working Memory中维护一个“预期状态”槽，每次执行动作后，将新观测与预期对比。用**置信度分数**量化偏差：如果偏差超过阈值（如0.3），触发重规划。修复策略有两种：① 局部修复——只重新规划当前子目标到下一个子目标的路径（如A*重搜索）；② 全局重规划——从当前状态重新生成整个计划。取舍点：局部修复快但可能陷入局部最优，全局重规划慢但更优。实践中，用**偏差幅度**决定：偏差<0.5用局部修复，否则全局重规划。

**追问 3**：LLM规划（如ReAct）和符号规划（如PDDL）如何选择？

> 看环境特性：如果环境是**完全可观测、确定性、静态**（如机器人装配线），用PDDL，因为它保证最优解且可解释。如果环境是**部分可观测、随机、动态**（如客服对话），用LLM规划，因为它能处理模糊性和自然语言。但LLM规划有幻觉风险，所以实践中常用**混合架构**：用PDDL生成骨架计划，用LLM填充细节（如动作参数）。例如，在机器人导航中，PDDL规划“去厨房→拿杯子→回客厅”，LLM负责生成“去厨房”的具体路径（如“左转3步，右转2步”）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只背ReAct或ToT的流程，不提Working Memory如何存储和更新规划结果。 → ✅ 必须说清楚规划结果写入哪个槽位（如“规划槽”），以及如何与执行结果对比触发重规划。
- ❌ 认为规划是一次性生成，执行时不再修改。 → ✅ 强调规划是迭代的：每次动作后，Working Memory中的规划需要根据新观测动态调整，类似“规划-执行-感知”循环。
- ❌ 混淆Working Memory和长期记忆，说“规划结果存到长期记忆”。 → ✅ 规划结果只暂存在Working Memory中，执行完成后才压缩成经验存入长期记忆。Working Memory是“工作台”，长期记忆是“仓库”。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“检索增强规划”角度切入——Working Memory中的状态作为query，从长期记忆（如知识库）检索相关动作模板，再生成规划。强调检索与规划的协同，比如用BM25检索PDDL动作模板，再用LLM填充参数。
- **如果你只做过传统NLP**：用“文本生成”类比——Working Memory是prompt的上下文窗口，规划生成是逐步解码。可以对比Beam Search（类似ToT的多路径搜索）和Greedy Decoding（类似ReAct的单步决策），说明如何用束宽控制规划多样性。
- **如果你是校招无项目**：聚焦论文复现——提“Tree-of-Thoughts”论文中的BFS/DFS搜索如何映射到Working Memory的树结构，以及如何用剪枝控制记忆占用。可以补充一个MiniGrid demo：用PDDL规划器生成动作序列，写入Working Memory的槽位，执行时对比观测。

#### 7️⃣ 延伸阅读

- 《Tree of Thoughts: Deliberate Problem Solving with Large Language Models》（ToT论文）
- 《ReAct: Synergizing Reasoning and Acting in Language Models》（ReAct论文）
- 《Fast Downward: An Efficient Domain-Independent Planning System》（PDDL规划器）
- 《Working Memory in Cognitive Architecture: A Review》（认知架构综述）
- 《MiniGrid: A Minimal Gridworld Environment for Reinforcement Learning》（实验环境）

---
