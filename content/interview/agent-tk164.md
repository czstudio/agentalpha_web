---
slug: agent-tk164
no: "1064"
title: "RAG-based Agent 和 Tool-based Agent 的区别是什么？何时混用"
question: "RAG-based Agent 和 Tool-based Agent 的区别是什么？何时混用"
excerpt: "面试官想看你能否区分"知识增强"和"能力扩展"两种 Agent 架构范式。刁钻点在于：很多人把 RAG 和 Tool Use 看成独立的东西，但现代 Agent 几乎都是两者的混合。答好了能展示你对 Agent 能力边界"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 4037
updated: "2026-09-29"
---

## RAG-based Agent 和 Tool-based Agent 的区别是什么？何时混用

#### 1️⃣ 考察意图

面试官想看你能否区分"知识增强"和"能力扩展"两种 Agent 架构范式。刁钻点在于：很多人把 RAG 和 Tool Use 看成独立的东西，但现代 Agent 几乎都是两者的混合。答好了能展示你对 Agent 能力边界（知道什么 vs 能做什么）的清晰认知，以及在实际场景中的架构设计能力。

#### 2️⃣ 标准答

**1. 核心区别：知识 vs 能力**

| 维度 | RAG-based Agent | Tool-based Agent |
|---|---|---|
| 核心问题 | "知道什么"（Knowledge） | "能做什么"（Capability） |
| 增强方式 | 检索外部知识填充上下文 | 调用外部工具执行操作 |
| 输出性质 | 信息性（回答问题、生成文本） | 操作性（执行代码、发邮件、查询数据库） |
| 副作用 | 无（只读取信息） | 有（可能修改外部状态） |
| 典型场景 | 问答、文档分析、知识推理 | 代码执行、API 调用、自动化操作 |
| 技术栈 | Embedding + 向量库 + Reranker | Function Calling + Tool Schema + 沙箱 |

**2. RAG-based Agent 深入**

- **架构**：用户查询 → Embedding → 向量检索 → Reranker → 上下文组装 → LLM 生成
- **核心价值**：让 Agent 访问"不在模型参数中的知识"——企业文档、最新资讯、私有数据
- **局限**：只能"读取"信息，不能"执行"操作。用户问"帮我预订明天北京的酒店"，RAG Agent 只能"告诉你怎么订"，不能"帮你订"
- **工程关键**：检索质量（Recall@5 > 85%）、上下文窗口管理（检索结果不能超出 context window）、Reranker 选型

**3. Tool-based Agent 深入**

- **架构**：用户请求 → LLM 决策（选工具+参数）→ 工具执行 → 结果返回 → LLM 生成回复
- **核心价值**：让 Agent"执行"操作——代码执行、API 调用、数据库操作、文件管理
- **局限**：只能"执行"预定义的工具，不能"学习"新知识。如果用户问一个需要领域知识的问题，Tool-based Agent 无法回答（除非调用搜索工具，这时就变成了 RAG + Tool 混合）
- **工程关键**：工具描述质量（Function Schema 清晰度）、参数校验、沙箱安全、错误处理

**4. 混合架构：RAG + Tool（现代 Agent 的标配）**

- **架构**：`用户请求 → LLM 决策层              ├── 需要知识？→ RAG 检索 → 上下文增强              ├── 需要操作？→ Tool 调用 → 执行操作              └── 两者都需要？→ 先 RAG 获取知识 → 再 Tool 执行操作`
- **典型场景**：用户说"分析公司最新财报并生成可视化报告"RAG：检索公司财报文档（知识获取）
- Tool：调用 Python 执行数据分析（能力执行）
- RAG：检索报告模板（知识获取）
- Tool：调用 matplotlib 生成图表（能力执行）
- **设计原则**：**工具选择也是知识**——Agent 需要知道"什么时候该用 RAG，什么时候该用 Tool"。这本身就是一种"元知识"，可以通过 system prompt 或 few-shot 示例注入
- **RAG 结果可以触发 Tool**——RAG 检索到"公司财报说营收下降 20%"，可以触发 Tool 调用"生成分析报告"
- **Tool 结果可以填充 RAG**——Tool 调用数据库查询返回的结果，可以作为"知识"存入向量库供后续检索

#### 3️⃣ 答题模板（30 秒电梯版）

> "RAG Agent 解决'知道什么'——检索外部知识填充上下文，无副作用，适合问答场景。Tool Agent 解决'能做什么'——调用外部工具执行操作，有副作用，适合自动化场景。现代 Agent 是混合架构——LLM 决策层根据请求类型选择 RAG（获取知识）或 Tool（执行操作）或两者串联。设计原则：工具选择是元知识（prompt注入）、RAG可触发Tool、Tool结果可填充RAG。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：Agent 怎么判断该用 RAG 还是 Tool？

> 三种判断机制：(1) **System prompt 指令**——在 system prompt 中明确规则，如"如果用户问的是知识性问题，先调用 search 工具检索；如果用户要求执行操作，调用相应工具"；(2) **工具描述引导**——在工具的 description 中写清楚适用场景，如 `search_tool: "搜索企业知识库，当用户询问公司政策、产品信息、历史记录时使用"`。LLM 根据 description 自动判断；(3) **Router LLM**——用一个小模型做路由判断，输入用户请求，输出"RAG"或"Tool"或"Both"。实测 GPT-4o-mini 做路由判断的准确率约 92%，延迟约 200ms。生产中推荐 (1)+(2) 组合，简单且无需额外 LLM 调用。

**追问 2**：RAG Agent 的检索结果和 Tool Agent 的工具返回值，在 LLM 上下文中怎么组织？

> 结构化组织：(1) **标签隔离**——RAG 结果用 `<retrieved_context>` 标签包裹，Tool 返回值用 `<tool_result tool_name="xxx">` 标签包裹。让 LLM 清楚区分"知识"和"操作结果"；(2) **优先级排序**——Tool 返回值优先于 RAG 结果（操作结果通常更精确、更时效）。如果两者冲突（如 RAG 说"营收增长"但数据库查询显示"营收下降"），以 Tool 返回值为准；(3) **上下文压缩**——RAG 结果可能很长（top-5 文档 × 2000 tokens = 10k tokens），用 LLM 生成摘要后注入。Tool 返回值通常较短（JSON 格式），直接注入。

**追问 3**：有没有"纯 RAG"或"纯 Tool"的场景，不需要混用？

> 有，但越来越少：(1) **纯 RAG 场景**——FAQ 问答、文档搜索、知识库查询。用户只问"什么是X"，不需要执行操作。但随着用户期望提升（"不只是告诉我，还要帮我做"），纯 RAG 场景在减少；(2) **纯 Tool 场景**——自动化运维（重启服务、清理日志）、IoT 控制（开关灯、调节温度）。任务完全确定，不需要额外知识。但如果运维 Agent 需要查阅文档（"这个错误码是什么意思"），就变成了混合；(3) **趋势**——随着 Agent 能力增强，用户越来越期望"一站式"服务——既知道又能做。纯 RAG 或纯 Tool 的 Agent 逐渐被混合架构取代。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "RAG 和 Tool 是对立的，选一个就行" → ✅ "RAG 解决知识问题，Tool 解决能力问题，两者互补。现代 Agent 几乎都是混合架构——先用 RAG 获取知识，再用 Tool 执行操作。"
- ❌ "RAG 就是搜索，Tool 就是 API 调用" → ✅ "RAG 不只是搜索——还包括上下文组装、Reranker、幻觉抑制。Tool 不只是 API 调用——还包括参数校验、沙箱执行、错误恢复。两者都是完整的工程体系。"
- ❌ "Tool Agent 比 RAG Agent 更高级" → ✅ "两者解决不同维度的问题——RAG 增强'知识'，Tool 增强'能力'。没有高低之分，只有适用场景的不同。一个优秀的 Agent 需要两者兼备。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 项目**：从"混合架构设计"切入，描述你的 Agent 如何在 RAG 和 Tool 之间智能路由，给出数据（如路由准确率 92%、平均步数 3.2 步、任务完成率 89%）
- **如果你只做过 RAG**：用"RAG 是 Agent 的知识层"切入，说明你理解 RAG 的工程细节（Embedding/检索/Reranker），然后强调 Agent 额外需要"工具层"来执行操作
- **如果你是校招无项目**：用 LangChain 实现一个混合 Agent——既能搜索知识库（RAG）又能执行 Python 代码（Tool），在 5 个典型任务上测试路由准确率
- "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (Lewis et al., 2020)
- "Toolformer: Language Models Can Teach Themselves to Use Tools" (Schick et al., 2023)
- "ReAct: Synergizing Reasoning and Acting in Language Models" (Yao et al., 2022)

---
