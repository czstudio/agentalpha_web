---
slug: enterprise-tk508
no: "1408"
title: "如何规划任务流程？（Orchestration策略）"
question: "如何规划任务流程？（Orchestration策略）"
excerpt: "面试官想考察你对Agent任务编排（Orchestration）的工程化理解深度，而非背诵ReAct论文。核心是区分“什么时候用规则驱动（DAG/状态机）”和“什么时候用LLM驱动（ReAct/Plan-and-Exec"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4564
updated: "2026-09-29"
---

## 如何规划任务流程？（Orchestration策略）

#### 1️⃣ 考察意图

面试官想考察你对Agent任务编排（Orchestration）的工程化理解深度，而非背诵ReAct论文。核心是区分“什么时候用规则驱动（DAG/状态机）”和“什么时候用LLM驱动（ReAct/Plan-and-Execute）”，以及如何做混合决策。刁钻点在于：候选人常只讲一种策略，忽略真实场景中的动态调整、错误恢复和成本权衡。答好了能展示系统设计能力、对LangGraph/CrewAI等框架的实战认知，以及从“写Demo”到“上线高鲁棒性Agent”的工程思维。

#### 2️⃣ 标准答

**第一步：任务类型拆解——决定编排的复杂度起点**

- **单步任务**（如“翻译一句话”）：无需编排，直接调用LLM。
- **多步线性任务**（如“先搜索，再总结”）：用固定DAG（有向无环图），LangGraph的`StateGraph`或Prefect的`Flow`即可。
- **条件分支任务**（如“如果搜索结果不足，则换源重搜”）：需要状态机（State Machine），例如LangGraph的`ConditionalEdge`。
- **动态规划任务**（如“根据用户反馈调整后续步骤”）：必须用LLM驱动的ReAct或Plan-and-Execute，因为步骤序列在运行时才确定。

**第二步：选择编排模式——核心trade-off**

- **规则驱动（DAG/状态机）**：
- 适用：步骤固定、依赖明确、对延迟敏感的场景（如自动化数据管道）。
- 优点：可预测、低延迟（无LLM调用开销）、易调试（每一步结果可追踪）。
- 缺点：无法应对未预定义的分支；维护复杂逻辑时状态爆炸。
- 工具：LangGraph的`StateGraph`、Temporal、Airflow。
- **LLM驱动（ReAct/Plan-and-Execute）**：
- 适用：开放域任务、需要推理和自适应（如多步信息收集Agent）。
- 优点：灵活，能处理未知情况；ReAct的“思考-行动-观察”循环天然支持动态调整。
- 缺点：高延迟（每次循环都调LLM）、成本高、易陷入死循环（需设置最大步数）。
- 工具：LangChain的`AgentExecutor`、AutoGPT的`Plan-and-Execute`模式。
- **混合策略（推荐生产级方案）**：
- 做法：用规则驱动处理确定性步骤（如数据清洗、API调用），用LLM驱动处理决策点（如“下一步该做什么”）。
- 例子：在LangGraph中，用`StateGraph`定义主流程，在关键节点嵌入`ReActAgent`做动态决策。例如，一个客服Agent：固定流程是“验证用户身份→查询订单”，但“查询订单”节点内用ReAct决定是查物流、查退款还是查商品详情。
- 坑：混合时需定义清晰的“决策边界”——哪些步骤必须由规则控制（如安全校验），哪些可以交给LLM（如意图识别）。

**第三步：设计状态机与记忆机制——保证鲁棒性**

- **状态跟踪**：用`State`对象（LangGraph的`TypedDict`）记录已完成步骤、中间结果、错误次数。例如：

`class AgentState(TypedDict):**steps: List[str] # 已完成步骤
results: Dict[str, Any] # 中间结果
retries: int # 当前重试次数
max_retries: int = 3
`
- **错误恢复**：对每个步骤设置重试策略（指数退避+最大次数），并在状态机中增加`ErrorHandler`节点。例如，搜索API超时后，先重试，若失败则切换到备用搜索源（如从Google切到Bing）。
- **记忆机制**：短期记忆用`State`的`messages`字段（保留最近N轮对话），长期记忆用向量数据库（如ChromaDB）存储关键事实。注意：ReAct的`scratchpad`会随步骤增长而膨胀，需限制长度（如截断到最近5步）。
第四步：动态调整——ReAct循环的工程化**

- **ReAct循环**：LLM输出“思考→行动→观察”，直到生成“最终答案”。关键参数：
- `max_iterations`：防止死循环，通常设为10-15步。
- `early_stopping`：当LLM连续输出“思考”但无行动时，强制终止。
- **Plan-and-Execute**：先让LLM生成完整计划（如“步骤1：搜索X；步骤2：提取Y；步骤3：总结”），然后逐步执行。优势是减少LLM调用次数（一次规划，多次执行），但计划可能过时（如搜索结果改变）。解法：在每步执行后，让LLM检查计划是否仍有效，若无效则重新规划。
- **实际落地的坑**：LLM在ReAct中常“幻觉”出不存在的结果（如“搜索到数据”但实际未调用工具）。解法：在`Observation`阶段强制校验工具输出是否非空，若为空则让LLM重新思考。

**第五步：评估指标——量化编排效果**

- **任务完成率**：成功完成的任务数/总任务数。混合策略通常比纯ReAct高10-20%（因为规则部分更稳定）。
- **步骤数**：平均每任务步骤数。纯ReAct可能比DAG多3-5步（因为LLM会“过度思考”）。
- **延迟**：P50/P95延迟。DAG通常<1秒，ReAct可能>10秒（含LLM调用）。
- **鲁棒性**：在输入噪声（如拼写错误）或API故障下的表现。混合策略通过规则兜底，鲁棒性更好。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从任务类型拆解、编排模式选择、状态机设计三个层面回答。首先，根据任务是否有固定依赖或动态分支，决定用DAG、ReAct还是混合策略。其次，混合策略是生产首选——用规则处理确定性步骤，用LLM处理决策点，并在LangGraph中通过State跟踪状态和错误恢复。最后，评估时关注完成率和延迟的trade-off。总结一句：编排不是选一个框架，而是根据任务复杂度做‘规则+LLM’的工程化组合。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到混合策略，那如何确定“决策边界”？比如什么时候该用规则，什么时候该用LLM？

> 核心原则：**可枚举的用规则，不可枚举的用LLM**。例如，安全校验（如“用户输入是否含敏感词”）用规则，因为敏感词列表可维护；意图识别（如“用户想查订单还是退款”）用LLM，因为意图种类无法穷举。具体做法：在LangGraph中，用`ConditionalEdge`判断状态字段（如`user_intent`）是否已确定，若已确定则走规则分支，否则调用LLM决策。注意：规则分支必须保证低延迟（<100ms），LLM分支可接受1-2秒延迟。

**追问 2**：ReAct容易陷入死循环，你怎么在工程上防止？

> 三层防护：第一层，`max_iterations`设为10-15步，超时强制终止并返回“无法完成”。第二层，在`Observation`阶段检测“重复行动”——如果LLM连续3步调用同一个工具且输入相同，则视为死循环，终止并切换策略（如改用Plan-and-Execute）。第三层，在状态机中增加`LoopDetector`节点，用哈希记录已执行过的`(action, input)`对，若重复则让LLM重新思考。实际测试中，这三层可将死循环率从15%降到<1%。

**追问 3**：如果任务需要并行执行多个子任务（如同时搜索多个关键词），你怎么编排？

> 用DAG的并行节点。在LangGraph中，用`Parallel`节点或`Send` API（LangGraph 0.2+）分发子任务。例如，搜索任务：主节点生成关键词列表，然后并行调用多个搜索API，最后用`Reduce`节点合并结果。注意：并行度需受控（如最大5个并发），避免API限流。如果子任务间有依赖（如“先搜索A，再根据A结果搜索B”），则不能用并行，需用顺序DAG。评估时，并行可降低延迟（从串行的10秒降到2秒），但增加API调用成本。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 只讲ReAct，认为“LLM驱动就是万能方案” → ✅ 强调规则驱动在确定性步骤中的优势（低延迟、可调试），并给出混合策略的工程实现（如LangGraph的StateGraph+AgentExecutor）。
- ❌ 说“编排就是选LangGraph或CrewAI框架” → ✅ 框架只是工具，核心是任务类型分析和trade-off决策。例如，固定DAG用Prefect，动态规划用LangGraph，但都要设计状态机和错误恢复。
- ❌ 忽略错误恢复，只讲“如果失败就重试” → ✅ 给出具体重试策略（指数退避+最大次数+备用源），并说明如何用状态机跟踪重试次数。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“多步信息检索”切入，对比固定DAG（先检索再生成）与ReAct（根据中间结果动态调整检索策略）在完成率和延迟上的差异。强调在LangGraph中实现混合策略：用规则处理检索步骤，用LLM决定是否重写查询。
- **如果你只做过传统NLP**：用“流水线（Pipeline）”类比编排——传统NLP中，分词→词性标注→句法分析是固定DAG；Agent编排类似，但多了LLM驱动的动态分支。强调状态机设计（如用`State`跟踪错误）和评估指标（完成率、步骤数）。
- **如果你是校招无项目**：聚焦ReAct论文复现（《ReAct: Synergizing Reasoning and Acting in Language Models》），用LangChain实现一个简单Agent（如“搜索并总结”），并对比固定DAG的步骤数和延迟。强调对`max_iterations`和`early_stopping`的理解。
- 《ReAct: Synergizing Reasoning and Acting in Language Models》（论文）
- 《Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models》（论文）
- LangGraph官方文档：StateGraph与ConditionalEdge实战
- 《Building Production-Ready LLM Agents: A Case Study》（博客，讨论混合策略和错误恢复）
- 《The State of Agent Orchestration in 2024》（综述，对比LangGraph、CrewAI、AutoGPT）

---
