---
slug: rag-tk1221
no: "2121"
title: "什么是Agentic Rag？和普通的Rag有什么不同"
question: "什么是Agentic Rag？和普通的Rag有什么不同"
excerpt: "面试官想看你是否理解RAG从“工具”到“智能体”的演进本质，而非单纯背概念。这是一道系统设计+工程取舍题，刁钻点在于：很多人只背了“Agentic RAG会多步检索”，但说不清何时必须引入Agent、引入后带来的延迟和成"
tags: ["真题解析", "RAG（检索增强生成）"]
category: "rag"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3823
updated: "2026-09-29"
---

## 什么是Agentic Rag？和普通的Rag有什么不同

`P1` · `rag`

🏷 标签：`rag`, `agent`, `agentic-rag`, `react`, `multi-step`

#### 1️⃣ 考察意图

面试官想看你是否理解RAG从“工具”到“智能体”的演进本质，而非单纯背概念。这是一道**系统设计+工程取舍**题，刁钻点在于：很多人只背了“Agentic RAG会多步检索”，但说不清**何时必须引入Agent**、**引入后带来的延迟和成本代价**，以及**如何用ReAct/LangGraph等框架落地**。答好了能展示你对RAG系统瓶颈的洞察、对多步推理的工程化能力，以及对“检索-决策-生成”完整流程的掌控力。

#### 2️⃣ 标准答

**定义与核心差异**Agentic RAG不是简单地在RAG前面加个Agent，而是把检索从“一次性的信息查找”升级为“可自主规划的推理过程”。普通RAG是**单次检索+生成**：用户问“2024年诺贝尔物理学奖得主是谁？”，系统检索一次，生成答案。Agentic RAG则是**多步推理+动态决策**：用户问“对比2024年诺贝尔物理学奖和化学奖得主的研究方向”，系统需要先拆解问题，分别检索两个奖项，再综合生成。

**关键差异点（3个维度）**

1. **决策能力**：普通RAG无决策模块，检索策略固定（如Top-K=5）；Agentic RAG内置ReAct或Plan-and-Solve等决策框架，能根据当前信息决定下一步——是继续检索、调用外部API（如天气查询）、还是直接回答。
2. **记忆机制**：普通RAG无状态，每次对话独立；Agentic RAG维护短期记忆（当前推理步骤）和长期记忆（历史检索结果），避免重复检索。例如用LangGraph的StateGraph管理状态，每一步更新“已检索文档列表”和“待回答子问题队列”。
3. **动态源选择**：普通RAG固定检索一个知识库；Agentic RAG可根据问题类型动态切换源——比如先查维基百科，发现信息不足时再查ArXiv论文或调用SQL数据库。这依赖工具调用（Tool Calling）能力，通常用LLM的function calling实现。

**工程取舍与落地坑**

- **取舍：延迟 vs. 准确性**。Agentic RAG每多一步推理，延迟增加2-5秒（取决于LLM推理速度和检索耗时）。在实时对话场景（如客服），必须设置最大步数限制（如5步）和超时回退策略（超时后返回当前最佳答案）。
- **坑：决策幻觉**。Agent可能错误地认为“已找到完整答案”而提前终止，或陷入“检索-总结-再检索”的死循环。解法：在ReAct的“观察”步骤加入**验证节点**——用一个小模型（如BERT）检查当前答案是否覆盖了所有子问题，若覆盖率<80%则强制继续检索。
- **实现示例**：用LangGraph构建一个Agentic RAG节点图：节点1：问题分解（LLM将问题拆成子问题）
- 节点2：检索（每个子问题独立检索，用BM25+Embedding混合）
- 节点3：决策（LLM判断是否需补充检索或调用工具）
- 节点4：生成（综合所有检索结果生成最终答案）每一步都记录决策轨迹，便于调试和审计。

**适用场景**

- **多跳推理**：如“《三体》作者的其他作品有哪些？”需要先查作者，再查作品列表。
- **信息不全需追问**：如“推荐一部科幻电影，但用户没说年份”，Agent可反问“您偏好近10年的还是经典老片？”
- **跨文档综合**：如“对比Transformer和Mamba的优缺点”，需要分别检索两篇论文并对比。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，**定义层面**，Agentic RAG是在传统RAG基础上引入Agent的决策、记忆和工具调用能力，把单次检索升级为多步推理；第二，**差异层面**，核心区别在于普通RAG无状态、无决策，而Agentic RAG能动态规划检索路径、维护记忆、切换数据源；第三，**工程层面**，引入Agent会带来延迟增加和决策幻觉风险，需要通过最大步数限制和验证节点来平衡。总结一句：Agentic RAG是RAG从‘信息检索工具’向‘推理智能体’的演进，适用于需要多步推理和动态决策的复杂场景。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到用ReAct框架，那ReAct和Plan-and-Solve在Agentic RAG中有什么区别？你选哪个？

> 区别：ReAct是“思考-行动-观察”循环，每一步都依赖前一步的观察结果，适合需要实时调整策略的场景（如用户中途改问题）；Plan-and-Solve是先规划完整步骤再执行，适合步骤明确、无需中途调整的任务（如“按时间顺序检索三篇论文”）。我选ReAct，因为Agentic RAG的检索结果不可预测（可能返回无关文档），需要动态调整下一步。代价是ReAct的token消耗更大（每步都要输出思考过程），但准确性更高。

**追问 2**：如果用户问的问题很简单，比如“今天天气怎么样”，Agentic RAG也会走多步推理吗？怎么避免过度检索？

> 不会。我会在Agent的入口加一个**快速路由**：先用一个轻量级分类器（如基于关键词或小模型）判断问题复杂度。如果问题属于“单步事实型”（如天气、时间、人名），直接走普通RAG或调用API，不走Agent流程。这个路由的准确率需>95%，否则会漏掉复杂问题。实践中用规则+小模型（如DistilBERT）做二分类，延迟<10ms。

**追问 3**：你提到用LangGraph，那和LangChain的AgentExecutor比，LangGraph的优势在哪？

> LangGraph的核心优势是**显式状态管理和循环控制**。AgentExecutor本质是线性链，无法处理循环（如“检索-发现信息不足-再检索”），而LangGraph用有向图支持循环节点，能实现“如果检索结果置信度<0.7，则跳回检索节点”。此外，LangGraph的StateGraph允许在每个节点修改全局状态（如更新“已检索次数”），便于实现最大步数限制和记忆机制。代价是学习曲线更陡，但可控性远超AgentExecutor。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Agentic RAG就是RAG加个Agent，能多步检索” → ✅ 正确切入：必须强调**决策机制**（ReAct/Plan-and-Solve）、**记忆管理**（短期+长期）、**动态源选择**（工具调用），以及引入Agent后的**延迟和成本权衡**。
- ❌ 说“Agentic RAG比普通RAG好，应该全面替换” → ✅ 正确切入：指出适用边界——简单事实型问题用普通RAG更快更便宜，复杂推理问题才用Agentic RAG。给出具体切换阈值（如问题长度>20词或含“对比/分析”等关键词）。
- ❌ 说“用LangChain的AgentExecutor就能实现” → ✅ 正确切入：指出AgentExecutor的局限性（无循环控制、状态管理弱），并推荐LangGraph或自定义ReAct循环，展示对框架底层原理的理解。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“我在XX项目中用普通RAG遇到多跳推理瓶颈，后来引入ReAct框架，在HotpotQA上F1提升12%”切入，强调你亲手踩过“决策幻觉”的坑，并用验证节点解决。
- **如果你只做过传统NLP**：用“传统信息检索（如TF-IDF）是单次匹配，而Agentic RAG像人类搜索——先查关键词，发现不够再换词查，类似多轮搜索策略”类比，展示迁移能力。
- **如果你是校招无项目**：聚焦“我复现了LangGraph官方Agentic RAG demo，并对比了ReAct和Plan-and-Solve在2WikiMultihopQA上的延迟和准确率”，展示论文阅读和动手能力。
- 论文：ReAct: Synergizing Reasoning and Acting in Language Models（Yao et al., 2023）
- 论文：Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models（Wang et al., 2023）
- 工具：LangGraph官方文档 - Agentic RAG Tutorial
- 博客：LangChain Blog - “From RAG to Agentic RAG: A Practical Guide”
- 论文：Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection（Asai et al., 2023）

---
