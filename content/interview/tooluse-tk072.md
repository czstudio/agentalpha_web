---
slug: tooluse-tk072
no: "972"
title: "MCP / SKILL 的区别，SKILL 为什么能省 Token"
question: "MCP / SKILL 的区别，SKILL 为什么能省 Token"
excerpt: "这道题考察的是对 Agent 工具调用底层机制的理解深度，而非简单背诵概念。面试官想看你是否清楚 MCP 和 SKILL 在协议层 vs 执行层的本质差异，以及能否从Token 经济学角度解释 SKILL 的优化原理。刁"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3503
updated: "2026-09-29"
---

## MCP / SKILL 的区别，SKILL 为什么能省 Token

#### 1️⃣ 考察意图

这道题考察的是对 Agent 工具调用底层机制的理解深度，而非简单背诵概念。面试官想看你是否清楚 MCP 和 SKILL 在**协议层 vs 执行层**的本质差异，以及能否从**Token 经济学**角度解释 SKILL 的优化原理。刁钻点在于：很多人只知道 SKILL 能省 Token，但说不清为什么省、省在哪、代价是什么。答好了能展示你对 LLM 上下文窗口敏感性的工程直觉，以及从系统设计层面做取舍的能力。

#### 2️⃣ 标准答

**MCP（Model Context Protocol）** 是 Anthropic 提出的开放协议，定义了 Agent 与外部工具/数据源之间的标准化通信方式。它本质上是一个**接口规范**，类似 HTTP 之于 Web 服务。MCP 包含工具描述（JSON Schema）、调用请求、响应格式等，每次调用都需要 LLM 生成完整的工具调用参数。

**SKILL** 是字节跳动 Coze 等平台提出的概念，指将一组工具调用逻辑预编译为**可复用的执行单元**。SKILL 不是协议，而是一种**执行优化策略**。它把多步工具调用链（比如“搜索→提取→总结”）打包成一个原子操作，LLM 只需输出一个 SKILL ID 和少量参数，后续执行由运行时引擎完成。

**为什么 SKILL 能省 Token？** 核心在于**将“描述性 Token”转化为“指令性 Token”**：

1. **工具描述压缩**：MCP 每次调用都需要在 System Prompt 中携带完整的工具 Schema（JSON Schema 可能几百到上千 Token）。SKILL 只需在初始化时注册一次，后续调用只传一个 ID（通常 1-2 Token）。假设你有 10 个工具，每个 Schema 平均 300 Token，MCP 每次对话都要重复 3000 Token，而 SKILL 只需 10 Token。
2. **调用参数精简**：MCP 调用需要 LLM 生成完整的参数 JSON（例如 `{"query": "xxx", "top_k": 5}`），可能 50-100 Token。SKILL 调用只需输出 `skill_id=3, params={"q":"xxx"}`，参数被预定义模板压缩，通常 10-20 Token。
3. **中间结果省略**：MCP 的多步调用链中，每一步的中间输出（如搜索结果列表）都会回传给 LLM 作为上下文，导致 Token 膨胀。SKILL 将多步逻辑封装在引擎内部执行，只返回最终结果给 LLM。例如一个“搜索→过滤→排序→生成摘要”的流程，MCP 可能产生 2000 Token 中间数据，SKILL 只返回 200 Token 的摘要。

**工程取舍**：SKILL 省 Token 的代价是**灵活性降低**。MCP 允许 LLM 动态决定每一步的参数（比如搜索时临时调整 top_k），而 SKILL 的参数空间被预定义约束。如果业务场景需要高度动态的工具编排（如复杂数据分析），MCP 更合适；如果场景固定（如客服 FAQ 查询），SKILL 能大幅降低成本。

**实际落地的坑**：SKILL 的预编译逻辑需要**版本管理**。如果底层 API 变更（比如搜索接口字段改名），所有引用该 SKILL 的 Agent 都会静默失败。解法：给 SKILL 加版本号（如 `skill_v3`），并在运行时做兼容性检查，类似 gRPC 的版本协商。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从协议层、执行层、Token 优化三个层面回答。协议层：MCP 是开放接口规范，SKILL 是执行优化策略。执行层：MCP 每次调用都需完整 Schema，SKILL 预编译为原子操作。Token 优化：SKILL 通过工具描述压缩、参数精简、中间结果省略三个机制省 Token，代价是灵活性降低。总结一句：MCP 适合动态编排，SKILL 适合固定流程降本。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：SKILL 省 Token 的具体数字是多少？有基准测试吗？

> 以 Coze 公开数据为例，一个包含 5 个工具的客服 Agent，MCP 模式每次对话平均消耗 4500 Token（含工具描述 3000 + 调用参数 1000 + 中间结果 500），SKILL 模式降至 1200 Token（含 ID 10 + 参数 200 + 最终结果 990），节省约 73%。但这是理想场景，实际取决于工具 Schema 复杂度和调用链长度。注意：没有公开论文，这是基于 Coze 技术博客和社区报告的估算。

**追问 2**：如果 SKILL 这么省，为什么还要用 MCP？

> 因为 SKILL 的预编译逻辑无法处理**动态工具发现**。比如一个 Agent 需要根据用户输入实时选择调用哪个第三方 API（如不同电商平台的商品查询），MCP 的标准化协议允许 LLM 在运行时解析新工具的 Schema 并生成调用。SKILL 要求所有工具在部署前注册，无法应对未知 API。此外，MCP 是开放标准（Anthropic 推动），生态兼容性更好；SKILL 是平台私有方案，迁移成本高。

**追问 3**：SKILL 的预编译逻辑如何与 LLM 的推理能力协同？会不会导致 LLM 变成“哑巴”？

> 这是个好问题。SKILL 本质上把“推理”和“执行”解耦：LLM 负责决策（选哪个 SKILL），运行时负责执行（具体参数填充和步骤编排）。这不会让 LLM 变哑，反而让 LLM 聚焦于高层次的策略选择。例如在金融风控场景，LLM 只需判断“当前用户行为属于欺诈模式，调用 SKILL_7（风控核查流程）”，而 SKILL_7 内部的多步验证（查黑名单、算风险分、触发人工审核）由引擎完成。代价是 LLM 失去了对中间步骤的细粒度控制，但换来更低的 Token 消耗和更稳定的执行。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “MCP 是协议，SKILL 是工具，SKILL 比 MCP 好。” → ✅ “MCP 和 SKILL 不是替代关系，而是不同抽象层次：MCP 定义通信规范，SKILL 定义执行单元。SKILL 省 Token 是因为它把描述性开销转嫁给了预编译阶段，但牺牲了灵活性。”
- ❌ “SKILL 省 Token 是因为它用了更短的参数名。” → ✅ “参数名压缩只是表象，核心是工具描述和中间结果的省略。参数名从 `query` 缩成 `q` 省不了几个 Token，真正的优化在于去掉了每次调用都重复的 Schema 和多步中间数据。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索链预编译”角度切入，说明如何将“检索→重排序→生成”封装为 SKILL，对比 MCP 模式每轮对话节省 60%+ Token，并提到你如何用版本管理解决 API 变更问题。
- **如果你只做过传统 NLP**：用“函数式编程 vs 过程式编程”类比：MCP 像每次调用都传完整函数签名，SKILL 像预编译的闭包。强调你对 Token 经济学的理解，以及如何将这种优化思路迁移到其他场景（如 Prompt 压缩）。
- **如果你是校招无项目**：聚焦 MCP 论文（Anthropic 2024）和 Coze SKILL 技术博客的对比分析，展示你对 Agent 系统设计原则的理解，并提到你复现过一个简单的 SKILL 原型（用 Python 装饰器实现工具链预编译）。
- Anthropic MCP 规范文档（2024）
- Coze SKILL 技术博客（字节跳动，2024）
- 《Token Economics in LLM Agents》—— 一篇关于 Agent Token 消耗分析的博客
- 《Function Calling vs Tool Calling: A Practical Guide》—— 对比不同工具调用方案的工程实践
- 《Versioning in Pre-compiled Agent Skills》—— 关于 SKILL 版本管理的设计模式
