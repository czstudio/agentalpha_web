---
slug: eval-tk050
no: "950"
title: "后续额外调研论文（除了self evolve和alpha evolve系列），我应当补充哪些方向（比如 Code LLM 、Code Agent 包括 Agent 这一块我都不是很了解，是否应该补充这一块）？如何去搜索这些方向及Baseline（拿关键词搜，还是说从cite benchmark的论文中搜）？如何去筛选我搜到的论文"
question: "后续额外调研论文（除了self evolve和alpha evolve系列），我应当补充哪些方向（比如 Code LLM 、Code Agent 包括 Agent 这一块我都不是很了解，是否应该补充这一块）？如何去搜索这些方向及Baseline（拿关键词搜，还是说从cite benchmark的论文中搜）？如何去筛选我搜到的论文"
excerpt: "面试官想看你是否具备系统化文献调研能力，而非零散搜论文。考察类型是研究规划 + 知识广度。刁钻点在于：你能否从“self-evolve/alpha-evolve”这类具体工作出发，识别出Code Agent领域的关键盲区"
tags: ["真题解析", "评测"]
category: "eval"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4315
updated: "2026-09-29"
---

## 后续额外调研论文（除了self evolve和alpha evolve系列），我应当补充哪些方向（比如 Code LLM 、Code Agent 包括 Agent 这一块我都不是很了解，是否应该补充这一块）？如何去搜索这些方向及Baseline（拿关键词搜，还是说从cite benchmark的论文中搜）？如何去筛选我搜到的论文

#### 1️⃣ 考察意图

面试官想看你是否具备**系统化文献调研能力**，而非零散搜论文。考察类型是**研究规划 + 知识广度**。刁钻点在于：你能否从“self-evolve/alpha-evolve”这类具体工作出发，识别出**Code Agent领域的关键盲区**（如代码执行反馈、工具调用、多步规划），并给出可落地的搜索和筛选策略。答好了能展示：① 对Code LLM/Agent生态的全局认知；② 从benchmark反推论文的逆向思维；③ 对论文质量（开源、复现性、互补性）的工程判断力。

#### 2️⃣ 标准答

**核心原则**：不要漫无目的搜，而是基于self-evolve的缺陷反向推导。self-evolve侧重自我改进，但缺了**代码执行环境、工具调用、多Agent协作**三个关键维度。

**补充方向（按优先级排序）**：

- **Code LLM基础**：CodeLlama、StarCoder2、DeepSeek-Coder。重点看它们的**预训练数据构造**（如The Stack v2）和**指令微调策略**（如CodeAlpaca）。为什么？self-evolve的初始模型质量决定了进化天花板。
- **代码执行与反馈**：CodeExecutor、InterCode、ToolBench。这类工作教你**如何从执行结果中提取结构化反馈**（如编译错误、测试用例通过率），这是self-evolve中“自我评估”环节的命门。
- **Agent框架与规划**：ReAct、Plan-and-Solve、Tree-of-Thought。注意ReAct的**推理-行动循环**如何与代码生成结合，Plan-and-Solve的**分解策略**如何避免长代码的中间错误累积。
- **多Agent协作**：ChatDev、MetaGPT、AutoGen。关注**角色分工**（如PM、Developer、Tester）如何提升代码质量，以及**通信协议**（如结构化消息 vs 自然语言）的trade-off。
- **Benchmark驱动**：SWE-bench、HumanEval+、CodeContests。从这些benchmark的**引用论文**反向搜，往往能挖到最相关的SOTA方法（如SWE-agent、Devin）。

**搜索策略（三步走）**：

1. **关键词组合**：在arXiv用 `"code generation" AND ("agent" OR "tool use")` 搜，再按时间排序。同时用 `"self-improvement" AND "code"` 补全self-evolve的竞争工作。
2. **Benchmark反向挖掘**：打开SWE-bench的GitHub页面，看其**Leaderboard**上每篇论文的引用链。例如，SWE-agent引用了LiteLLM和Agentless，这些就是必须读的基线。
3. **综述论文**：先读 `"A Survey of Code Generation with Large Language Models"` 和 `"A Survey on LLM-based Agents"`，快速建立方向地图。

**筛选标准（用三个问题过滤）**：

- **开源吗？** 优先选代码和模型权重都公开的（如StarCoder2、CodeLlama），避免只能读abstract的“空气论文”。
- **复现性如何？** 看论文是否提供**详细超参数**（如温度、top-p、beam size）和**评估脚本**。例如，SWE-agent的复现成本极高（需要Docker环境），而ReAct的复现只需几行Python。
- **与self-evolve的互补性？** 如果一篇论文只改prompt（如Chain-of-Code），对self-evolve的“自我进化”机制帮助有限；而能提供**可学习的反馈信号**（如CodeExecutor的测试结果）或**可复用的工具接口**（如ToolBench的API）的论文，优先级更高。

**实际落地的坑 + 解法**：

- **坑**：搜到大量“代码生成”论文，但90%只做单轮生成，不涉及Agent的多步交互。
- **解法**：在关键词中加入 `"multi-turn"` 或 `"interactive"`，并限定会议（ICLR/NeurIPS/ACL 2024+）。同时，用 `"code agent"` 搜GitHub仓库，看star数和issue活跃度，快速过滤掉玩具项目。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，补充方向应聚焦**代码执行反馈、工具调用、多Agent协作**，因为self-evolve缺的是外部信号和交互能力；第二，搜索策略用**关键词+Benchmark反向挖掘**，比如从SWE-bench的Leaderboard反查引用论文；第三，筛选标准看**开源、复现性、互补性**，优先选能提供可学习反馈信号的论文。总结一句：调研不是堆数量，而是补全self-evolve的缺失环节。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到从SWE-bench反查，具体怎么操作？给个例子。

> 打开SWE-bench的GitHub页面，找到Leaderboard表格。例如，排名第一的SWE-agent，点进它的论文，看Related Work部分引用了哪些工具（如LiteLLM、Agentless）。然后去arXiv搜这些工具的最新版本，同时看它们是否被其他SWE-bench参赛者引用。如果一篇论文被多个SOTA方法引用（如ReAct被SWE-agent和Devin都引用），那它就是必读基线。另外，用`"SWE-bench" AND "agent"`在Google Scholar搜，按被引数排序，能快速找到核心工作。

**追问 2**：如果时间有限，只能读3篇，你选哪3篇？为什么？

> 选ReAct、SWE-agent、CodeExecutor。ReAct是Agent框架的基石，理解它才能理解后续所有变体；SWE-agent是目前Code Agent的SOTA，且代码开源，能直接对比self-evolve的差距；CodeExecutor提供了代码执行反馈的标准化接口，这是self-evolve中“自我评估”环节最缺的。这三篇覆盖了框架、SOTA、反馈信号三个关键维度。

**追问 3**：你如何判断一篇论文的“互补性”？给个具体例子。

> 看论文的**输入输出**是否与self-evolve的流程对齐。例如，一篇论文如果只做“单轮代码生成”（输入自然语言，输出代码），那它和self-evolve的“多轮自我改进”流程不互补。而一篇论文如果提供“代码执行结果作为反馈信号”（如CodeExecutor），那它可以直接插入self-evolve的评估环节。另一个判断标准：看论文是否**开源了可复用的组件**（如ToolBench的API集合），而不是只给一个黑盒模型。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “我打算搜‘code agent’关键词，然后按引用数排序读前10篇。” → ✅ “我会先用关键词搜，但更关键的是从SWE-bench/HumanEval+的Leaderboard反向挖掘，因为benchmark的引用链直接指向SOTA方法，比关键词搜索更精准。”
- ❌ “我只看顶会论文，非顶会的不读。” → ✅ “顶会论文质量高，但很多Code Agent工作（如SWE-agent、Devin）首发在arXiv，且代码开源。我会优先看arXiv上的高星仓库，再反查它们是否被顶会接收。”
- ❌ “我主要读综述，综述能覆盖所有方向。” → ✅ “综述用来建立方向地图，但具体方法必须读原始论文。例如，综述可能只提ReAct一句话，但你需要读原文理解它的推理-行动循环如何与代码生成结合。”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“检索增强生成”类比到“代码检索增强”。例如，self-evolve的自我改进可以借鉴RAG中的“检索-生成-反馈”循环，重点调研CodeExecutor和ToolBench如何提供结构化反馈。
- **如果你只做过传统NLP**：用“序列标注”类比“代码生成”。例如，传统NLP的“错误分析”可以迁移到代码的“编译错误分类”，重点调研CodeLlama的预训练数据构造（The Stack v2）和StarCoder2的指令微调策略。
- **如果你是校招无项目**：聚焦“ReAct论文复现demo”。用LangChain或AutoGen实现一个简单的代码生成Agent，展示你对推理-行动循环的理解。同时，写一篇博客对比ReAct和Plan-and-Solve在HumanEval上的表现，作为调研能力的证明。
- ReAct: Synergizing Reasoning and Acting in Language Models (ICLR 2023)
- SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering (NeurIPS 2024)
- CodeExecutor: Learning to Execute Programs with Instruction Tuning (ACL 2024)
- A Survey on LLM-based Agents: A Comprehensive Review (arXiv 2024)
- StarCoder2: A Code Language Model with 15B Parameters (ICML 2024)

---
