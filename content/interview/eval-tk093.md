---
slug: eval-tk093
no: "993"
title: "你用过哪些Agent框架?选型是如何选的?你最终场景的评价指标是什么"
question: "你用过哪些Agent框架?选型是如何选的?你最终场景的评价指标是什么"
excerpt: "面试官想看你是否真动手搭过Agent，而非只刷过LangChain教程。考察类型是工程取舍+系统设计，刁钻点在于：多数人只背框架名，但选型逻辑和评价指标才是分水岭。答好了能展示：① 对主流框架优缺点的一手经验（而非二手知"
tags: ["真题解析", "评测"]
category: "eval"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4240
updated: "2026-09-29"
---

## 你用过哪些Agent框架?选型是如何选的?你最终场景的评价指标是什么

#### 1️⃣ 考察意图

面试官想看你是否真动手搭过Agent，而非只刷过LangChain教程。考察类型是**工程取舍+系统设计**，刁钻点在于：多数人只背框架名，但选型逻辑和评价指标才是分水岭。答好了能展示：① 对主流框架优缺点的**一手经验**（而非二手知识）；② 从业务指标倒推技术选型的**工程思维**；③ 对Agent系统**可观测性**和**成本控制**的敏感度。一句话：别当框架百科，当能落地的架构师。

#### 2️⃣ 标准答

**一、我用过的框架及核心差异**

- **LangChain**：生态最全，LCEL语法灵活，但抽象层太厚，调试时得扒三层源码。适合快速原型，生产环境需大量定制（比如替换默认的ChatOpenAI为vLLM）。
- **AutoGPT**：纯实验性质，长任务循环容易死锁，token消耗爆炸。我只在POC里用过，生产绝对不碰。
- **CrewAI**：多智能体协作场景的利器，角色定义清晰，但任务编排依赖YAML配置，动态路由能力弱。适合固定流程（如客服转接），不适合复杂决策树。
- **Semantic Kernel**：微软系，与Azure生态绑定深，C#/Python双栈。如果你技术栈是.NET，选它；否则LangChain更通用。
- **Dify**：低代码平台，适合非技术团队快速验证，但自定义插件开发门槛高（得写Dify Plugin SDK）。我用来做内部工具原型。

**二、选型决策树（按优先级）**

1. **团队技术栈**：Python团队无脑LangChain；.NET团队选Semantic Kernel；前端团队考虑Vercel AI SDK。
2. **任务复杂度**：单步工具调用（如天气查询）→ 裸调OpenAI Function Calling + 10行代码；多步推理（如代码生成+测试）→ LangGraph（状态机）；多智能体协作（如客服+质检+报表）→ CrewAI。
3. **可观测性需求**：LangChain有LangSmith，但收费；CrewAI自带日志弱，得接OpenTelemetry。如果团队已有监控体系（如Datadog），选框架时优先看是否支持OpenTelemetry导出。
4. **成本敏感度**：AutoGPT和CrewAI的循环调用会放大token消耗。我踩过坑：CrewAI默认每个agent都调用一次LLM，即使任务不需要。解法：用`task.callback`手动控制LLM调用时机，或改用LangGraph的`conditional_edge`跳过冗余节点。

**三、实际落地的坑+解法**

- **坑**：LangChain的`AgentExecutor`默认用`zero-shot-react-description` prompt，在复杂任务中容易陷入死循环（反复调用同一个工具）。**解法**：改用`structured-chat-zero-shot`，并给工具加`max_iterations`和`early_stopping`参数。
- **坑**：CrewAI的agent间通信用JSON序列化，如果工具返回大对象（如DataFrame），序列化会炸。**解法**：在工具输出层做截断，只传关键字段（如`summary`和`error_code`），完整数据存Redis供后续agent按需拉取。

**四、评价指标（按场景分）**

- **任务完成率**：核心指标。定义要细：客服场景下，完成率=用户问题被解决的比例（需人工标注），而非agent自己说“完成”。我见过团队用agent的`success`字段当指标，结果虚高30%。
- **工具调用准确率**：关键中间指标。统计每次工具调用是否匹配用户意图（如用户问天气，agent却调了日历API）。用`precision`和`recall`算，阈值设0.8以上。
- **端到端延迟**：P95延迟必须<3秒（客服场景），否则用户流失。瓶颈常在LLM推理和工具响应。解法：用`asyncio`并发调用工具，或用vLLM做流式推理。
- **成本（token消耗）**：按每任务统计。如果单任务token>10K，说明prompt设计有问题（比如把整个历史对话塞进system prompt）。解法：用`sliding window`截断历史，或改用`summarize` agent压缩上下文。
- **用户满意度**：最终北极星指标。通过A/B测试对比agent和人工客服的CSAT（客户满意度）分数。如果agent CSAT低于人工10%，说明需要回退机制（如转人工）。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从框架选型、落地坑点、评价指标三个层面回答。框架层面，我主要用LangChain和CrewAI，选型看团队技术栈和任务复杂度，比如单步任务裸调Function Calling，多步推理用LangGraph。落地坑点包括LangChain的死循环和CrewAI的token浪费，解法是加迭代限制和手动控制LLM调用。评价指标分四层：任务完成率（需人工标注）、工具调用准确率（precision>0.8）、端到端延迟（P95<3秒）、成本（单任务token<10K）。总结一句：选框架不是选最好的，是选最适合你业务指标和团队能力的。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到LangChain抽象层太厚，具体怎么“扒三层源码”？

> 举例：当`AgentExecutor`报错“Could not parse LLM output”，我会先查`agent.py`的`plan()`方法，看它如何解析LLM返回的JSON。如果JSON格式不对（比如LLM返回了markdown代码块），我会在`output_parser`里加正则预处理。更深的坑：LangChain默认用`ChatOpenAI`的`temperature=0`，但某些模型（如Llama）在`temperature=0`时仍会随机输出，导致解析失败。解法：在`LLMChain`的`call()`里显式设置`model_kwargs={"stop": ["\n"]}`，强制模型输出结构化内容。

**追问 2**：你说CrewAI的token消耗大，具体怎么量化？有没有对比数据？

> 我做过对比实验：同一个客服场景（5轮对话），LangChain单agent消耗约2K token，CrewAI三agent协作消耗8K token。原因：CrewAI每个agent独立维护上下文，且默认在每次任务切换时重新加载历史。解法：用`task.context`参数共享上下文，或改用LangGraph的`StateGraph`统一管理状态。量化指标：优化后CrewAI token消耗降到4K，但开发成本增加30%（因为要手动管理状态图）。

**追问 3**：任务完成率需要人工标注，怎么保证标注一致性？

> 用**双盲标注+Kappa系数**。我团队的做法：① 随机抽取10%的对话，由两个标注员独立标注“是否解决用户问题”；② 计算Cohen's Kappa，阈值设0.7以上；③ 如果低于0.7，重新培训标注员并更新标注指南（比如“用户说‘谢谢’算解决，但说‘还是不行’算未解决”）。自动化方案：用GPT-4做初筛，但最终以人工为准，因为GPT-4在模糊场景（如用户抱怨但问题已解决）的准确率只有85%。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “我用过LangChain、AutoGPT、CrewAI，它们各有优缺点，选型要看场景。” → ✅ 必须给出具体选型决策树（如“单步任务用Function Calling，多步用LangGraph，多智能体用CrewAI”），并附上踩坑案例（如“CrewAI默认token浪费，需手动控制LLM调用”）。
- ❌ “评价指标就是任务完成率和延迟。” → ✅ 必须区分中间指标和北极星指标，并说明如何量化（如“工具调用准确率用precision/recall，阈值0.8；用户满意度通过A/B测试对比CSAT”）。
- ❌ “框架选型主要看社区活跃度。” → ✅ 必须结合团队技术栈和业务场景（如“Python团队无脑LangChain，.NET团队选Semantic Kernel”），并指出社区活跃度的陷阱（如“LangChain更新快但API不兼容，需锁定版本”）。

#### 6️⃣ 简历呼应

- **如果你有RAG项目**：从“RAG与Agent的融合”切入，强调LangChain的`RetrievalQA`和`AgentExecutor`如何组合，以及评价指标中“检索召回率”对任务完成率的影响。
- **如果你只做过传统NLP**：用“规则引擎 vs Agent框架”类比，说明传统NLP的流水线（意图识别→实体抽取→回复生成）如何被Agent的循环推理替代，并强调“工具调用准确率”是传统NLP没有的新指标。
- **如果你是校招无项目**：聚焦“论文复现+开源demo”，比如复现ReAct论文（arXiv:2210.03629），用LangChain实现一个简单的计算器Agent，并记录“工具调用准确率”和“token消耗”的对比数据。
- ReAct: Synergizing Reasoning and Acting in Language Models (arXiv 2210.03629)
- LangGraph官方文档：StateGraph vs AgentExecutor 的对比
- CrewAI最佳实践：如何通过`task.callback`控制token消耗
- OpenAI Function Calling 官方指南：单步工具调用的最佳实践
- 论文：Toolformer: Language Models Can Teach Themselves to Use Tools (arXiv 2302.04761)

---
