---
slug: agent-tk222
no: "1122"
title: "Agent skills 的原理是什么？为什么能省 Token"
question: "Agent skills 的原理是什么？为什么能省 Token"
excerpt: "面试官想考察你对 Agent 系统架构的深度理解，而非简单背诵概念。这题属于工程取舍 + 系统设计类型。刁钻点在于：很多人知道“把工具描述塞进系统提示”，但没想过为什么这会导致 Token 爆炸，以及 Agent Ski"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4502
updated: "2026-09-29"
---

## Agent skills 的原理是什么？为什么能省 Token

`P1` · `agent_architecture` · **🏢 字节**

🏷 标签：`agent`, `skills`, `token`, `context`

#### 1️⃣ 考察意图

面试官想考察你对 Agent 系统架构的深度理解，而非简单背诵概念。这题属于**工程取舍 + 系统设计**类型。刁钻点在于：很多人知道“把工具描述塞进系统提示”，但没想过为什么这会导致 Token 爆炸，以及 Agent Skills 如何从架构层面解决。答好了能展示你对**上下文窗口管理、稀疏激活、模块化设计**的硬实力，以及从“能用”到“高效”的工程思维。

#### 2️⃣ 标准答

**Agent Skills 的核心原理：从“全量注入”到“按需加载”**

传统 Agent 架构（如 ReAct）把每个工具的 name、description、parameters 全部硬编码进系统提示（System Prompt）。假设你有 50 个工具，每个平均 200 Token，光工具描述就吃掉 10K Token。Agent Skills 的解法是**将工具定义从系统提示中剥离，做成一个独立的“技能库”**，只在需要时动态注入。

具体分三步：

- **技能注册**：每个工具（Skill）被抽象为一个独立模块，包含元数据（名称、描述、输入输出 schema）和调用逻辑。这些模块存储在外部索引中（如向量数据库或倒排索引）。
- **意图路由**：用户输入后，先由一个轻量级 Router（可以是小模型或规则引擎）判断需要哪些技能。Router 基于用户 query 和技能描述的语义相似度（如用 Sentence-BERT 或 BM25）召回 Top-K 个技能。
- **动态注入**：只将召回的 K 个技能的完整定义（包括参数 schema）拼接到当前对话的上下文（Context）中。K 通常为 3-5，远小于总技能数。

**为什么能省 Token？—— 稀疏激活 + 上下文压缩**

省 Token 的本质是**避免冗余信息的重复计算**。具体机制：

- **稀疏激活**：假设总技能数 N=50，每次只激活 K=3。传统方式每次请求都处理 50 个技能描述（10K Token），而 Skills 方式只处理 3 个（600 Token）。Token 消耗降低约 94%。这是典型的**稀疏计算**思想，类似 MoE（Mixture of Experts）中只激活部分专家。
- **上下文压缩**：技能描述本身可以进一步压缩。例如，用**结构化 Schema**（JSON Schema 而非自然语言）替代冗长的自然语言描述。一个“发送邮件”工具，自然语言描述可能 150 Token，JSON Schema 只需 80 Token。同时，参数示例（Example）只在首次调用时注入，后续复用缓存。
- **缓存机制**：技能定义是静态的，可以在服务端缓存。每次请求只需传输技能 ID 和参数，而非完整定义。这节省的是**输入 Token**（Prompt Token），而 LLM 计费通常按输入+输出总 Token 算，输入省了，总费用就降了。

**实际落地的坑 + 解法**

- **坑 1：Router 误召回**。如果 Router 召回了不相关的技能，LLM 可能被误导。解法：Router 采用**多级召回**——先用 BM25 做粗召回（高召回低精度），再用 Cross-Encoder（如 Cohere Rerank）做精排序，确保 Top-K 的准确率。同时，在技能描述中加入“否定示例”（Negative Examples），比如“这个技能不用于查询天气”。
- **坑 2：技能冲突**。两个技能描述相似（如“发送邮件”和“发送短信”），Router 可能混淆。解法：在技能注册时，用**互斥标签**（Mutual Exclusion Tags）标记冲突技能，Router 在召回时自动排除已选技能的互斥项。
- **坑 3：动态注入导致上下文碎片化**。每次注入不同技能，LLM 可能丢失对之前技能的记忆。解法：在注入时保留一个**技能调用历史摘要**（Skill History Summary），用 50 Token 概括之前调用过的技能和结果，而非完整保留每次的 schema。

**工程取舍（Trade-off）**

- **延迟 vs Token 节省**：Router 召回需要额外一次推理（约 50-100ms），但节省了 90%+ 的 Token。对于实时对话（如客服），延迟敏感，可以牺牲部分 Token 节省，将 Router 改为规则匹配（如关键词触发），延迟降至 5ms。
- **召回精度 vs 系统复杂度**：多级召回精度高，但维护两个模型（BM25 + Cross-Encoder）增加运维成本。小团队可只用 Sentence-BERT 做单次召回，精度稍低但够用。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从原理、Token 节省机制、落地坑三个层面回答。原理上，Agent Skills 将工具定义从系统提示剥离，通过意图路由实现按需加载，类似 MoE 的稀疏激活。Token 节省来自两点：一是只激活 Top-K 技能而非全量注入，二是用结构化 Schema 和缓存压缩描述。落地时要注意 Router 误召回和技能冲突，解法是多级召回和互斥标签。总结一句：Agent Skills 本质是用一次轻量级路由推理，换取 90%+ 的 Token 节省。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果用户输入是多轮对话，技能需求会变化，你怎么处理动态切换？

> 应对策略：多轮场景下，Router 需要维护一个**会话状态**。解法是：每轮对话结束后，将当前使用的技能 ID 和关键参数写入一个轻量级的**会话缓存**（如 Redis）。下一轮输入时，Router 先检查缓存中是否有活跃技能，如果有，优先复用；如果没有，再重新召回。同时，设置一个**技能过期时间**（TTL），比如 5 轮对话后自动过期，避免旧技能长期占用上下文。这本质是**状态管理**的 trade-off：缓存减少召回次数，但增加了系统复杂度。

**追问 2**：如果技能数量达到 1000 个，Router 的召回延迟会爆炸吗？

> 应对策略：1000 个技能时，单次 BM25 召回延迟约 10ms，但 Cross-Encoder 精排序会到 200ms。解法是**分层索引**：第一层用粗粒度分类（如“通信类”、“数据处理类”），每个类别下再细粒度召回。用户输入先过分类器（一个 6B 模型或规则），确定属于哪个大类，然后只在该大类下召回。这类似**倒排索引 + 分片**的思想。另外，技能描述可以预计算为向量（如 text-embedding-3-small），用 HNSW 索引做近似最近邻搜索，延迟可控制在 20ms 内。

**追问 3**：Agent Skills 和 Function Calling 有什么区别？哪个更省 Token？

> 应对策略：Function Calling 是 OpenAI 等 API 提供的原生能力，本质也是将工具定义从系统提示剥离，但由模型厂商在服务端做路由。Agent Skills 是用户自定义的架构方案。Token 节省上，Function Calling 同样只注入被调用的函数，但它的路由逻辑对用户不透明，且无法自定义召回策略。Agent Skills 更灵活，可以结合业务规则（如优先调用付费工具），但需要自己维护 Router。如果追求快速上线，用 Function Calling；如果追求极致 Token 优化和定制化，用 Agent Skills。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“Agent Skills 就是把工具描述写短一点，比如用缩写” → ✅ 正确切入：核心是**架构层面的按需加载**，而非文本压缩。写短只是锦上添花，稀疏激活才是 Token 节省的主因。
- ❌ 说“省 Token 是因为 LLM 不需要看所有工具，只生成一次调用” → ✅ 正确切入：省 Token 发生在**输入阶段**（Prompt），而非输出阶段。LLM 生成调用时，输出 Token 量基本不变，省的是每次请求都重复注入的冗余描述。
- ❌ 说“Router 用 LLM 本身来做，比如让 GPT-4 判断需要哪些工具” → ✅ 正确切入：用 LLM 做 Router 会引入额外 Token 消耗和延迟，违背了省 Token 的初衷。应该用轻量级模型（如 Sentence-BERT）或规则引擎，延迟在毫秒级。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索-生成”类比切入。Agent Skills 的 Router 类似 RAG 中的 Retriever，技能库类似文档库。你可以说：“我在 RAG 项目中用 BM25 + Cross-Encoder 做文档召回，这套经验直接迁移到 Agent Skills 的 Router 设计，实现了 95% 的召回准确率。”
- **如果你只做过传统 NLP**：用“意图识别”类比。Agent Skills 的 Router 本质是一个意图分类器。你可以说：“我做过意图识别系统，用 BERT 分类 50 个意图，这和 Agent Skills 的 Router 思路一致，只是把意图换成了技能 ID。”
- **如果你是校招无项目**：聚焦论文复现。你可以说：“我复现了 ReAct 论文，发现全量注入的 Token 浪费问题，然后自学了 MoE 和稀疏计算，设计了一个 Demo：用 Sentence-BERT 做 Router，在 20 个工具上实现了 80% 的 Token 节省。”

#### 7️⃣ 延伸阅读

- 《ReAct: Synergizing Reasoning and Acting in Language Models》
- 《Mixture of Experts (MoE) 原理与稀疏激活》
- 《Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks》
- 《HNSW: Hierarchical Navigable Small World Graphs for Approximate Nearest Neighbor Search》
- 《OpenAI Function Calling 官方文档与最佳实践》

---
