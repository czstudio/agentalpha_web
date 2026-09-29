---
slug: eval-tk087
no: "987"
title: "**如何评估 Agent 的规划能力"
question: "**如何评估 Agent 的规划能力"
excerpt: "面试官想考察你对 Agent 规划能力评估的系统性理解，而非仅背诵指标。这属于系统设计+工程取舍类型，刁钻点在于：规划能力是隐性的（不像分类准确率直观），如何设计可量化、可复现、能区分模型优劣的评估方案。答好了能展示：①"
tags: ["真题解析", "评测"]
category: "eval"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4314
updated: "2026-09-29"
---

## **如何评估 Agent 的规划能力

#### 1️⃣ 考察意图

面试官想考察你对 Agent 规划能力评估的**系统性理解**，而非仅背诵指标。这属于**系统设计+工程取舍**类型，刁钻点在于：规划能力是隐性的（不像分类准确率直观），如何设计**可量化、可复现、能区分模型优劣**的评估方案。答好了能展示：① 对 Agent 评估整条链路（任务定义→指标→数据集→鲁棒性→人工）的掌控力；② 对规划任务本质（多步决策、回溯、工具依赖）的深刻理解；③ 能结合具体 benchmark（ALFWorld、WebShop）和对抗测试的实战经验。

#### 2️⃣ 标准答

评估 Agent 规划能力，核心是**量化多步决策的质量**，而非单步正确率。我从四个层面展开：任务定义、指标设计、数据集构建、鲁棒性测试。

**1. 任务定义：先明确规划类型**

- **任务分解（Hierarchical Planning）**：如“整理房间”拆为“扫地→拖地→归位”，评估子任务划分的合理性和粒度。
- **路径/动作序列规划**：如 ALFWorld 中“拿起苹果→走到冰箱→打开门→放入→关门”，评估动作顺序和工具调用。
- **工具调用序列**：如 Agent 调用 search→calculator→write_file，评估依赖关系和错误恢复。
- **关键取舍**：不要混用类型。例如，评估 ReAct 时，若任务需多步推理（如数学题），应单独测推理链，而非与动作序列混在一起。

**2. 指标设计：分层量化**

- **任务完成率（Success Rate）**：最硬指标，但需定义“完成”边界。例如，WebShop 中“购买指定商品”需检查购物车内容，而非仅点击“购买”按钮。
- **步骤效率（Optimal Step Ratio）**：实际步数 / 最优步数。最优步数由专家或 BFS 求出。例如，ALFWorld 中“拿苹果”最优 3 步，Agent 走了 5 步，ratio=0.6。**坑**：最优步数需排除随机性（如环境初始位置不同），建议对每个任务采样 10 次取中位数。
- **回溯次数（Backtrack Count）**：Agent 撤销动作的次数。例如，在 ALFWorld 中，若 Agent 先“打开冰箱”发现没有苹果，再“关闭冰箱”去“打开柜子”，算 1 次回溯。低回溯表示规划更准确。
- **中间目标达成率（Subgoal Completion Rate）**：将任务拆为 N 个子目标，统计完成比例。例如，整理房间任务有 5 个子目标，Agent 完成 4 个，rate=80%。这能区分“完全失败”和“部分成功”。
- **工程取舍**：Success Rate 和 Subgoal Rate 需平衡。若只追求 Success Rate，Agent 可能只做简单任务；加入 Subgoal Rate 可鼓励探索复杂任务。

**3. 数据集构建：覆盖多样性和难度**

- **现有 benchmark**：ALFWorld（家居任务，含 6 类场景，每类 30+ 任务）、WebShop（电商购物，含 1.18M 产品，需多步搜索和比较）、ToolBench（工具调用，含 16 类 API，需序列规划）。
- **自定义数据集**：若评估特定场景（如金融风控），需人工构造多步任务。例如，“查询用户交易记录→识别异常→生成报告→发送邮件”，每个步骤需依赖上一步输出。
- **坑**：数据集中需包含**干扰项**。例如，ALFWorld 中在“拿苹果”任务里，在冰箱旁放一个“香蕉”，测试 Agent 是否被误导。否则评估结果会高估规划能力。

**4. 鲁棒性测试：对抗评估**

- **错误反馈注入**：在 Agent 执行动作后，环境返回错误信息（如“冰箱已满”），测试 Agent 能否重新规划。例如，ReAct 在收到错误后，应回溯并尝试“打开柜子”。
- **状态扰动**：随机改变环境状态（如物品位置），测试规划是否依赖固定路径。例如，ALFWorld 中每次重置时，苹果可能出现在不同位置。
- **时间压力**：限制步数或时间（如最多 10 步），测试 Agent 在资源约束下的规划效率。
- **人工评估**：对规划逻辑合理性打分（1-5 分），尤其当自动化指标失效时。例如，Agent 虽然完成任务，但步骤冗余（如绕路），人工可给出低分。

**实际落地坑**：自动化指标（如 Success Rate）在简单任务上容易饱和（>95%），此时需引入**难度分级**。例如，将 ALFWorld 任务按步数分为 Easy（3-5 步）、Medium（6-10 步）、Hard（>10 步），分别计算指标，避免模型只擅长简单任务。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从任务定义、指标设计、数据集构建、鲁棒性测试四个层面回答。任务定义需区分分解、路径、工具调用三种类型；指标用 Success Rate、Optimal Step Ratio、Backtrack Count 分层量化；数据集用 ALFWorld、WebShop 等 benchmark 并加入干扰项；鲁棒性测试通过错误反馈注入和状态扰动来评估。总结一句：评估规划能力的关键是量化多步决策质量，而非单步正确率。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 Optimal Step Ratio，但最优步数怎么定义？如果环境是随机的怎么办？

> 最优步数通过 BFS 或专家演示获取。对于随机环境（如物品位置变化），对每个任务采样 10 次初始状态，分别计算最优步数，取中位数作为基准。若环境状态空间太大（如 WebShop 有 1.18M 产品），改用启发式算法（如 A*）或人工标注 100 个典型任务。**取舍**：BFS 精确但耗时，A* 快但需设计启发函数（如曼哈顿距离），实际中常用 A* 加剪枝。

**追问 2**：Backtrack Count 怎么自动化计算？Agent 可能隐式回溯（如重新思考）而不显式撤销动作。

> 在 ALFWorld 等结构化环境中，回溯可通过动作日志检测：若 Agent 连续执行“打开冰箱”和“关闭冰箱”，且中间无其他有效动作，算 1 次回溯。对于隐式回溯（如 ReAct 的思考链），需解析文本日志，用正则匹配“I need to try something else”等模式。**坑**：隐式回溯可能被误判为正常推理，建议结合人工标注 100 条样本校准阈值。

**追问 3**：人工评估规划逻辑合理性，具体怎么操作？如何保证一致性？

> 设计 5 分制评分表：1 分（完全不合理，如循环动作）、3 分（部分合理，如步骤顺序错但最终完成）、5 分（最优路径）。招募 3 名标注员，每人独立评分，取中位数。计算 Cohen’s Kappa 系数，要求 >0.6 才接受。**工程取舍**：人工成本高，只对自动化指标难以区分的任务（如 Success Rate 均为 100% 但步骤不同）进行抽样评估，样本量 50-100 条。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只提 Success Rate，说“规划能力就是看任务完成率”。→ ✅ 必须分层：Success Rate 是宏观指标，但需结合 Optimal Step Ratio 和 Backtrack Count 区分“高效完成”和“低效完成”。例如，两个 Agent 都 100% 成功，但一个平均 5 步，另一个 10 步，后者规划能力差。
- ❌ 用随机数据集评估，说“随便找 100 个任务就行”。→ ✅ 必须用结构化 benchmark（如 ALFWorld）或自定义任务，且包含干扰项和难度分级。否则评估结果无法复现，且模型可能过拟合简单任务。
- ❌ 忽略鲁棒性测试，说“只要指标好就行”。→ ✅ 必须加入对抗评估（错误反馈、状态扰动），因为规划能力在理想环境下可能高估。例如，Agent 在 ALFWorld 中 95% 成功，但加入错误反馈后降至 60%，说明规划鲁棒性差。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“多步检索规划”角度切入，例如评估 Agent 在 RAG 中如何规划检索步骤（先查数据库→再查 API→最后生成），用 Success Rate 和 Backtrack Count 衡量检索效率。
- **如果你只做过传统 NLP**：用“对话系统规划”类比，例如评估 Chatbot 在多轮对话中如何规划回复策略（先确认意图→再提供信息→最后结束对话），用 Subgoal Completion Rate 衡量。
- **如果你是校招无项目**：聚焦 ALFWorld 论文复现，描述如何用 ReAct 实现规划 Agent，并设计评估框架（Success Rate、Optimal Step Ratio），强调对 benchmark 的理解和对抗测试的思考。
- “ALFWorld: Aligning Text and Embodied Environments for Interactive Learning” (Shridhar et al., 2021)
- “WebShop: Towards Scalable and Real-World Web Interaction with Grounded Language Agents” (Yao et al., 2022)
- “ReAct: Synergizing Reasoning and Acting in Language Models” (Yao et al., 2023)
- “ToolBench: An Open Platform for Training, Serving, and Evaluating Large Language Models for Tool Learning” (Qin et al., 2023)
- “Evaluating the Planning Abilities of Large Language Models: A Survey” (Valmeekam et al., 2023)

---
