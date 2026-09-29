---
slug: eval-tk001
no: "901"
title: "列举你知道的 Agent Benchmark，以及它们评估的侧重点。"
question: "列举你知道的 Agent Benchmark，以及它们评估的侧重点。"
excerpt: "面试官想看你对 Agent 评估生态的广度认知。刁钻点在于：很多人只答"AgentBench"或"HumanEval"，但说不清各 benchmark 的评估维度差异和适用场景。答好了能展示你对 Agent 评估体系的系"
tags: ["真题解析", "评测"]
category: "eval"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3412
updated: "2026-09-29"
---

## 列举你知道的 Agent Benchmark，以及它们评估的侧重点。

#### 1️⃣ 考察意图

面试官想看你对 Agent 评估生态的广度认知。刁钻点在于：很多人只答"AgentBench"或"HumanEval"，但说不清各 benchmark 的评估维度差异和适用场景。答好了能展示你对 Agent 评估体系的系统性理解。

#### 2️⃣ 标准答

**Agent Benchmark 分类矩阵：**

| Benchmark | 评估维度 | 任务类型 | 交互环境 | 数据量 | 代表指标 |
|---|---|---|---|---|---|
| AgentBench | 综合能力 | 8类(购物/OS/DB/卡片/知识/灯控/文字游戏/房子) | 模拟环境 | 878题 | Success Rate |
| WebArena | Web交互 | 网页操作(导航/搜索/表单) | 真实网页仿真 | 812题 | Success Rate + Step Eff. |
| Mind2Web | Web交互 | 真实网页多步任务 | 真实网页 | 2350题 | Step Accuracy + Ele. Acc. |
| SWE-bench | 代码能力 | GitHub PR修复 | Docker环境 | 2294题 | Resolved Rate |
| HumanEval | 代码生成 | 函数级编程 | 无环境 | 164题 | Pass@1 |
| GAIA | 通用推理 | 多步推理+工具使用 | 模拟环境 | 466题 | Success Rate |
| ToolBench | 工具调用 | API调用+参数构造 | 模拟API | 16464题 | Pass Rate + Hallucination |
| ALFWorld | 具身交互 | 文本世界操作 | TextWorld | 3273题 | Success Rate |
| OSWorld | OS交互 | 桌面操作(文件/终端) | 虚拟OS | 369题 | Success Rate |

**各 Benchmark 侧重点详解：**

**1. AgentBench（清华，2023）**

- 8 类环境覆盖最广：购物（Amazon仿真）、操作系统（Linux终端）、数据库（SQL查询）、卡片游戏、知识图谱、智能家居、文字游戏、房屋布局
- 侧重点：**综合能力**——不同环境下的任务完成率
- 发现：GPT-4 在购物和知识图谱上表现好（>80%），但在文字游戏和房屋布局上差（<30%）

**2. WebArena vs Mind2Web**

- WebArena：仿真网页环境（可控但不够真实），侧重点：**端到端任务完成率**
- Mind2Web：真实网页（DOM树），侧重点：**元素定位精度**——给定指令"点击搜索框"，是否正确定位到正确的 DOM 元素
- 区别：WebArena 评估"能否完成任务"，Mind2Web 评估"每一步是否准确"

**3. SWE-bench（Princeton，2023）**

- 评估 Agent 修复真实 GitHub PR 的能力：给定 Issue 描述+代码库 → Agent 生成 patch → 运行单元测试验证
- 侧重点：**代码理解+修改+验证**的整条链路能力
- 难度：GPT-4 直接做只有 1.7% 解决率，需要工程框架（如 SWE-agent）辅助

**4. GAIA（Meta，2023）**

- 通用 AI 助手评估：多步推理、工具使用、多模态理解
- 侧重点：**真实世界推理**——需要搜索、计算、文件处理等工具
- 特点：人类平均 92% 准确率，GPT-4 + 插件只有 15%

**5. ToolBench（清华，2024）**

- 评估 Agent 调用真实 API 的能力：给定 16464 个 RapidAPI
- 侧重点：**工具选择+参数构造+结果解析**
- 指标：Pass Rate（任务完成）+ Hallucination Rate（调用不存在的API）

#### 3️⃣ 答题模板（30 秒电梯版）

> "Agent Benchmark 按环境分四类。Web交互：WebArena（仿真网页，端到端完成率）和 Mind2Web（真实网页，元素定位精度）。代码能力：SWE-bench（GitHub PR修复，1.7% GPT-4直做）和 HumanEval（函数级，Pass@1）。综合能力：AgentBench（8类环境）和 GAIA（真实推理，人类92% vs GPT-4 15%）。工具调用：ToolBench（16464 API）。选型：Web Agent 用 WebArena，代码 Agent 用 SWE-bench，通用 Agent 用 GAIA。"

#### 4️⃣ 高频追问

**追问 1**：SWE-bench 这么难（GPT-4 只有 1.7%），怎么提升？

> 三个方向：(1) Agent 框架——SWE-agent 给 LLM 提供代码浏览+编辑+运行测试的交互接口，GPT-4+SWE-agent 达到 12.5%；(2) 代码理解增强——用 RAG 检索相关代码文件，减少 Agent 的搜索空间；(3) 迭代修复——Agent 先生成 patch，运行测试，如果失败根据测试报错修改。SWE-agent+GPT-4+迭代达到 18%。瓶颈：长代码库的上下文管理（>100K token 的代码库无法全部放入上下文）。

**追问 2**：GAIA 为什么人类 92% 而 GPT-4 只有 15%？

> GAIA 需要"多步推理+工具使用+多模态理解"三者结合。例题："找到2023年全球碳排放最高的国家，计算其人均碳排放，与世界平均值比较"。需要：(1) 搜索碳排放数据；(2) 搜索人口数据；(3) 计算；(4) 对比。GPT-4 的短板：(1) 搜索结果可能不准确；(2) 多步推理容易"跑偏"——第一步找错数据，后续全错；(3) 无法处理附件中的图片/PDF。人类优势：能快速判断信息可靠性、灵活调整策略、处理多模态附件。

**追问 3**：怎么选择适合自己业务的 Benchmark？

> 三步：(1) 确定任务类型——Web 操作选 WebArena/Mind2Web，代码选 SWE-bench，工具调用选 ToolBench；(2) 确定环境——如果 Agent 在真实网页运行选 Mind2Web，在仿真环境选 WebArena；(3) 自建评估集——从业务场景中抽 100-200 个真实任务，人工标注 expected behavior。关键：通用 benchmark 测"通用能力"，自建评估集测"业务适配"。两者都需要。

#### 5️⃣ 避坑

- ❌ "HumanEval 高就说明代码能力强" → ✅ "HumanEval 只测函数级代码生成（164 题），不测代码理解、调试、重构。SWE-bench 更接近真实工程能力。"
- ❌ "AgentBench 分数高就能上线" → ✅ "AgentBench 是通用评估，不覆盖特定业务场景。上线前需要在业务专属评估集上测试。"

#### 6️⃣ 简历呼应

- **有 Agent 评估经验**：从"Benchmark 选型+自建评估集"切入
- **校招无项目**：在 AgentBench 或 GAIA 上测试 GPT-4/Claude/Gemini，写对比博客
- "AgentBench: Evaluating LLMs as Agents" (Liu et al., 2023) / "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?" (Jimenez et al., 2023) / "GAIA: A Benchmark for General AI Assistants" (Mialon et al., 2023)

---
