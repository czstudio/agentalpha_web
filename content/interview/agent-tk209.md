---
slug: agent-tk209
no: "1109"
title: "那么Agent到底是什么？**"
question: "那么Agent到底是什么？**"
excerpt: "面试官想看你能否清晰界定“Agent”与“普通LLM应用”的边界，而非背诵定义。这是概念辨析+系统设计类问题，刁钻点在于：很多人把“调了API”就叫Agent，而面试官要听的是自主性、规划、工具调用、记忆完整流程这四个核"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3696
updated: "2026-09-29"
---

## 那么Agent到底是什么？**

`P0` · `agent_architecture`

🏷 标签：`agent`, `architecture`, `llm`, `autonomy`, `planning`

#### 1️⃣ 考察意图

面试官想看你能否清晰界定“Agent”与“普通LLM应用”的边界，而非背诵定义。这是**概念辨析+系统设计**类问题，刁钻点在于：很多人把“调了API”就叫Agent，而面试官要听的是**自主性、规划、工具调用、记忆完整流程**这四个核心要素。答好了能展示你对AI系统架构的底层理解，以及区分“玩具Demo”和“生产级Agent”的工程直觉。

#### 2️⃣ 标准答

Agent不是“LLM + 一个循环”，而是一个**自主感知-决策-执行的完整流程系统**。核心区别在于：普通LLM应用是“问-答”被动响应，Agent是“观察-思考-行动”主动循环。

**1. 定义与边界**

Agent = 能感知环境（Perception）、制定计划（Planning）、调用工具（Tool Use）、记忆上下文（Memory）、并自主执行（Execution）的智能体。关键特性：

- **自主性**：无需人类每步干预，能拆解“预订旅行”为查航班、比价、订酒店等子任务
- **反应性**：环境变化（如航班取消）时动态调整计划，而非死板执行
- **社交性**：多Agent协作（如MetaGPT中产品经理Agent与工程师Agent对话）

**2. 核心组件（缺一不可）**

- **感知模块**：接收环境输入，如用户指令、API返回、网页内容。坑：原始输入噪声大，需做结构化提取（如用JSON schema约束输出）
- **记忆模块**：短期记忆（对话上下文，用滑动窗口或KV cache管理）+ 长期记忆（向量数据库存历史决策，检索时用BM25+embedding混合召回）
- **规划模块**：任务分解（ReAct模式：Thought→Action→Observation循环）或分层规划（HuggingGPT用LLM做调度器，子任务分配给专用模型）
- **执行模块**：工具调用（Function Calling）+ 代码执行（Python REPL）。实际落地坑：工具返回格式不统一，需定义统一接口（如OpenAI的tool_call规范）

**3. 与LLM的关系**

LLM是Agent的“大脑”，但Agent是完整系统。LLM提供推理能力（如用Chain-of-Thought做规划），但Agent负责：

- **状态管理**：维护任务栈（如AutoGPT的JSON任务列表）
- **错误恢复**：工具调用失败时，Agent需自动重试或换方案（如API超时→改用缓存数据）
- **安全护栏**：限制LLM调用危险工具（如禁止执行rm -rf命令）

**4. 工程取舍**

- **规划深度 vs 延迟**：ReAct每步都调LLM，延迟高；可用Plan-and-Solve先一次性生成完整计划，再逐步执行，但灵活性差
- **记忆容量 vs 检索精度**：全量记忆丢给LLM会超上下文窗口，必须用RAG+滑动窗口，但检索噪声会误导决策
- **工具调用 vs 安全**：开放工具调用能力越强，越容易出安全问题（如Agent被prompt注入后调用删除API），需加权限校验层

**5. 实际落地坑**

- **循环陷阱**：Agent在“观察-思考”中陷入死循环（如一直查天气但从不订票）。解法：设置最大迭代次数（如10步），超时强制终止或回退到人类确认
- **幻觉传播**：LLM规划时产生幻觉（如虚构一个不存在的API），执行时必然失败。解法：工具调用前做schema校验，不匹配则重新规划

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从定义、核心组件、与LLM的关系三个层面回答。定义上，Agent是自主感知-决策-执行的完整流程系统，区别于被动响应的LLM应用。核心组件包括感知、记忆、规划、执行四大模块，缺一不可。与LLM的关系是：LLM作为推理引擎，Agent封装了状态管理、错误恢复和安全护栏。总结一句：Agent不是‘调API’，而是让LLM拥有自主行动能力的系统架构。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到Agent需要记忆，那短期记忆和长期记忆怎么划分？具体用什么技术？

> 短期记忆用滑动窗口（保留最近N轮对话，N根据模型上下文长度定，如GPT-4 Turbo设128K窗口），或用KV cache复用（如FlashAttention减少重复计算）。长期记忆用向量数据库（如ChromaDB或Pinecone），存储历史决策和工具调用结果，检索时用BM25（k1=1.5, b=0.75）做关键词召回 + embedding（text-embedding-3-small）做语义召回，最后用RRF融合排序。取舍：短期记忆保证实时性，长期记忆提供历史参考，但检索噪声会引入幻觉，所以需要rerank（如Cohere rerank）过滤低相关结果。

**追问 2**：Agent规划时，ReAct和Plan-and-Solve有什么区别？你选哪个？

> ReAct是“边想边做”，每步都调LLM，适合动态环境（如客服对话），但延迟高、成本高。Plan-and-Solve是“先想后做”，一次性生成完整计划再执行，适合确定性任务（如数据处理流水线），但环境变化时无法调整。我选ReAct，因为生产环境不确定性高，但会加优化：用缓存复用常见子任务计划（如“查天气”模板），减少LLM调用次数。取舍：ReAct灵活但贵，Plan-and-Solve便宜但死板，具体看任务类型。

**追问 3**：Agent工具调用失败怎么办？给具体策略。

> 三步策略：1）自动重试（最多3次，指数退避，如第一次等1秒，第二次2秒，第三次4秒）；2）降级方案（如API超时，改用本地缓存数据或模拟数据）；3）人类介入（重试失败后，暂停Agent，输出错误日志，等待用户确认下一步）。实际坑：重试次数太多会卡死Agent，所以必须设超时阈值（如总重试时间不超过30秒），超时后直接回退到人类确认。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “Agent就是LLM加一个循环，比如while True: 调用API” → ✅ “Agent必须有感知、记忆、规划、执行四大组件，循环只是执行层，核心是规划模块的任务分解和工具调用能力”
- ❌ “Agent可以完全自主，不需要人类干预” → ✅ “生产级Agent必须设安全护栏和人类确认点，比如执行危险操作（删除文件、支付）前暂停并请求用户确认”
- ❌ “记忆就是存对话历史” → ✅ “记忆分短期（滑动窗口）和长期（向量数据库），长期记忆需要检索+rerank，否则噪声会误导决策”

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“记忆模块”切入，对比RAG的检索与Agent长期记忆的异同，强调Agent需要动态更新记忆（如写入新工具调用结果），而RAG是静态索引。
- **如果你只做过传统NLP**：用“任务分解”类比，比如把“文本分类”拆成“实体识别→情感分析→结果聚合”，说明Agent规划本质是复杂任务的分层分解，类似传统pipeline。
- **如果你是校招无项目**：聚焦AutoGPT或MetaGPT的论文复现，展示你对ReAct循环和工具调用的理解，强调你读过《ReAct: Synergizing Reasoning and Acting in Language Models》这篇论文。

#### 7️⃣ 延伸阅读

- 《ReAct: Synergizing Reasoning and Acting in Language Models》（Shunyu Yao et al., 2023）
- 《HuggingGPT: Solving AI Tasks with ChatGPT and its Friends in Hugging Face》（Yongliang Shen et al., 2023）
- 《Toolformer: Language Models Can Teach Themselves to Use Tools》（Timo Schick et al., 2023）
- 《MetaGPT: Meta Programming for Multi-Agent Collaborative Framework》（Sirui Hong et al., 2023）
- 《AgentBench: Evaluating LLMs as Agents》（Xiao Liu et al., 2023）

---
