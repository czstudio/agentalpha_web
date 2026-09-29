---
slug: eval-tk002
no: "902"
title: "什么是 AgentBench？它包含哪些环境？各环境的评估特点是什么"
question: "什么是 AgentBench？它包含哪些环境？各环境的评估特点是什么"
excerpt: "考察对 AgentBench 的深度理解——不仅知道名字，还要知道8个环境的具体设计和评估特点。"
tags: ["真题解析", "评测"]
category: "eval"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 5
words: 2469
updated: "2026-09-29"
---

## 什么是 AgentBench？它包含哪些环境？各环境的评估特点是什么

#### 1️⃣ 考察意图

考察对 AgentBench 的深度理解——不仅知道名字，还要知道8个环境的具体设计和评估特点。

#### 2️⃣ 标准答

**AgentBench 是清华推出的综合 Agent 评估平台，包含 8 类环境，覆盖 Agent 在不同场景下的能力评估。**

**8 个环境详解：**

| 环境 | 任务描述 | 交互方式 | 评估指标 | GPT-4 表现 |
|---|---|---|---|---|
| Shopping | 在仿真购物网站买指定商品 | Web浏览+搜索+下单 | Success Rate | 82.1% |
| OS | Linux终端操作(文件/进程管理) | 命令行交互 | Success Rate | 78.4% |
| DB | 数据库查询(SQL) | SQL命令 | Success Rate | 67.3% |
| Card Game | 纸牌游戏(策略决策) | 游戏API | Win Rate | 45.2% |
| Knowledge Graph | 知识图谱推理 | SPARQL查询 | Success Rate | 81.7% |
| House(Hold) | 智能家居控制(ALFWorld) | 文本指令 | Success Rate | 55.6% |
| Word Game | 文字冒险游戏 | 文本交互 | Success Rate | 28.3% |
| Mind Game | 心理理论游戏(猜数字/推理) | 文本交互 | Success Rate | 35.7% |

> 配图（无描述）

**设计特点：**

1. **多样性**：8 个环境覆盖了 Web 交互、系统操作、数据库、游戏策略、知识推理、物理控制、语言游戏、社交推理——尽可能覆盖 Agent 的能力维度
2. **可控性**：所有环境都是仿真的，可以精确控制任务难度和环境状态，确保评估可复现
3. **多轮交互**：每个任务需要多步交互（平均 5-15 步），评估 Agent 的长程规划能力

**GPT-4 的表现分析：**

- **强项**：Shopping(82%)、Knowledge Graph(82%)——结构化查询+明确规则的任务
- **弱项**：Word Game(28%)、Mind Game(36%)——需要创造性思维和心理理论的任务
- **启示**：LLM-based Agent 在"规则明确、步骤可分解"的任务上表现好，在"需要创造性、模糊推理"的任务上表现差

#### 3️⃣ 答题模板

> "AgentBench 是清华的综合评估平台，8个环境：Shopping（仿真购物，GPT-4 82%）、OS（Linux终端，78%）、DB（SQL查询，67%）、Card Game（纸牌策略，45%）、Knowledge Graph（知识推理，82%）、House（智能家居，56%）、Word Game（文字冒险，28%）、Mind Game（心理推理，36%）。设计特点：多样性（8类环境）、可控性（仿真环境）、多轮交互（5-15步）。GPT-4 在规则明确的任务上强，在创造性任务上弱。"

#### 4️⃣ 高频追问

**追问 1**：AgentBench 的 Shopping 环境和 WebArena 有什么区别？

> Shopping 是仿真购物网站（自建环境），WebArena 是多个真实网站（Reddit/GitLab/购物网站）的镜像。区别：(1) 真实性——WebArena 的 DOM 结构和交互逻辑更接近真实网页；(2) 任务多样性——Shopping 只测购物，WebArena 测多种 Web 任务（发帖、搜索、管理）；(3) 可控性——Shopping 完全可控，WebArena 的网页可能随时间变化。选择：评估购物场景用 Shopping，评估通用 Web Agent 用 WebArena。

**追问 2**：Word Game 为什么 GPT-4 只有 28%？

> Word Game（如文字冒险游戏 Zork）需要：(1) 创造性思维——"如何用非标准方式使用物品"；(2) 世界模型——理解虚拟世界的物理规则（"火可以烧绳子"）；(3) 试错——需要尝试多种可能性。GPT-4 的短板：(1) 缺乏世界模型——不知道"火可以烧绳子"这种非语言推理；(2) 不擅长试错——倾向于重复相同策略而非探索新策略；(3) 上下文遗忘——长游戏（50+步交互）后忘记早期信息。

**追问 3**：AgentBench 有什么局限？

> 三个局限：(1) 仿真环境不够真实——Shopping 和真实电商网站的交互逻辑有差异，高分不等于实际表现好；(2) 任务覆盖不全——没有覆盖多模态理解（图像/视频）、代码生成、工具调用等重要 Agent 能力；(3) 评估指标单一——只用 Success Rate，不评估效率（步数、token 消耗）和安全（是否执行了危险操作）。改进：AgentBench v2 正在加入多模态任务和效率指标。

#### 5️⃣ 避坑

- ❌ "AgentBench 覆盖了所有 Agent 能力" → ✅ "AgentBench 只覆盖 8 类文本交互环境，不含多模态、代码生成、工具调用等能力。需要和其他 benchmark 配合使用。"

#### 6️⃣ 简历呼应

- **有评估经验**：从"AgentBench 环境适配"切入
- **校招无项目**：在 AgentBench 上测试不同 LLM，分析各环境的差异
- "AgentBench: Evaluating LLMs as Agents" (Liu et al., 2023)

---
