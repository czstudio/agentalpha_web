---
slug: enterprise-tk145
no: "1045"
title: "数据分析 Agent 中的 Text-to-SQL 如何保证准确性"
question: "数据分析 Agent 中的 Text-to-SQL 如何保证准确性"
excerpt: "面试官想深入看你的 Text-to-SQL 方案细节。刁钻点在于：Text-to-SQL 是数据分析 Agent 的核心能力，但 LLM 生成的 SQL 经常有语法错误、逻辑错误、性能问题。很多人只答"用 GPT-4 生"
tags: ["真题解析", "编程题"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3846
updated: "2026-09-29"
---

## 数据分析 Agent 中的 Text-to-SQL 如何保证准确性

> 配图（无描述）

#### 1️⃣ 考察意图

面试官想深入看你的 Text-to-SQL 方案细节。刁钻点在于：Text-to-SQL 是数据分析 Agent 的核心能力，但 LLM 生成的 SQL 经常有语法错误、逻辑错误、性能问题。很多人只答"用 GPT-4 生成 SQL"，但说不清 schema 注入策略、SQL 校验方法、错误恢复机制。答好了能展示你对 NL2SQL 技术的深度理解。

#### 2️⃣ 标准答

Text-to-SQL 准确性保障采用"增强输入 → 生成控制 → 多重校验 → 错误恢复"四层方案：

**1. 增强输入（Schema Engineering）**

- **完整 Schema 注入**：不只给表名和字段名，还注入：字段注释（`gender TINYINT -- 1=男 2=女 0=未知`）
- 外键关系（`FOREIGN KEY (user_id) REFERENCES users(id)`）
- 枚举值（`status ENUM('pending','paid','shipped','completed')`）
- 示例数据（`SELECT * FROM orders LIMIT 3` 的结果）
- 业务术语映射（`"活跃用户" = 最近30天有登录行为的用户`）
Schema 检索：用 embedding 检索相关表（见 Q1），只注入 Top-5 表Few-shot 示例：从历史"问题→SQL"对中检索 3 个最相似的示例注入 prompt。用 embedding 相似度检索

**2. 生成控制（Constrained Generation）**

- **SQL 方言指定**：明确告知 LLM 目标数据库类型（"生成 PostgreSQL 兼容的 SQL"），避免方言错误（如 MySQL 的 `LIMIT` vs Oracle 的 `ROWNUM`）
- **CTE 结构化**：要求 LLM 用 CTE（Common Table Expression）结构化复杂查询，而非嵌套子查询。CTE 更可读且便于调试
- **禁止危险操作**：prompt 中明确"只生成 SELECT 语句，禁止 INSERT/UPDATE/DELETE/DROP"

**3. 多重校验**

- **语法校验**：用 sqlglot 解析 SQL AST，检查语法正确性。语法错误时反馈错误信息给 LLM 重新生成
- **执行计划校验**：用 `EXPLAIN` 检查执行计划——如果有全表扫描（Seq Scan on large table）或笛卡尔积（Nested Loop without index），反馈给 LLM 优化
- **结果合理性校验**：执行后检查——结果为空？行数异常多？数值为负？NULL 比例过高？异常时反馈给 LLM 重新生成
- **SQL 等价性检查**：如果用户提供了参考 SQL，用 sqlglot 比较生成 SQL 和参考 SQL 是否语义等价

**4. 错误恢复**

- **重试循环**：校验失败时反馈错误信息给 LLM，重新生成（最多 3 轮）。每轮在 prompt 中追加"上次生成的 SQL 有以下错误：{error}，请修正"
- **降级方案**：3 轮重试仍失败时：(1) 用更简单的 SQL 替代（如去掉 JOIN 改为多次查询）；(2) 转人工编写 SQL；(3) 返回"无法自动生成 SQL，建议您手动查询"并给出 schema 参考
- **学习完整流程**：记录失败的"问题→SQL"对，人工修正后加入 few-shot 示例库，持续提升准确率

**准确率量化：**

- Spider benchmark：执行准确率目标 >85%
- 生产环境：用户接受率（用户未修改直接执行的比例）目标 >80%
- 错误分类：语法错误 30%、逻辑错误 50%、性能问题 20%

#### 3️⃣ 答题模板（30 秒电梯版）

> "四层保障。增强输入：完整schema（字段注释+外键+枚举+示例数据+术语映射）+RAG检索Top-5表+few-shot示例。生成控制：指定SQL方言+CTE结构化+禁止危险操作。多重校验：sqlglot语法检查+EXPLAIN执行计划+结果合理性（空/负/NULL）+SQL等价性。错误恢复：3轮重试循环→降级（简化SQL/转人工）→学习完整流程（失败案例加入few-shot库）。目标：Spider准确率>85%，用户接受率>80%。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：Few-shot 示例怎么选？用多少个？

> 选择策略：(1) 数量——3-5 个最佳。少于 3 个 LLM 缺乏参考，多于 5 个 prompt 过长且干扰；(2) 相似度——用 embedding 检索与用户问题最相似的历史"问题→SQL"对。如用户问"各品类月度销售额"→检索包含"GROUP BY category"和"按月份"的示例；(3) 多样性——用 MMR（Maximal Marginal Relevance）去重，避免 5 个示例都是同一类型。目标：覆盖不同查询模式（聚合/JOIN/窗口函数/子查询）。实测：3 个 diverse few-shot 比无 few-shot 准确率提升 15-20%

**追问 2**：数据库有视图（View）和物化视图，Text-to-SQL 怎么处理？

> 策略：(1) Schema 注入时同时注入视图定义——让 LLM 知道有哪些视图可用及其字段。视图通常比原始表更符合业务语义（如 `v_monthly_sales` 视图已经做了月度聚合），LLM 优先使用视图而非原始表；(2) 物化视图——如果查询命中物化视图（如 `SELECT * FROM mv_daily_summary WHERE date > '2024-07-01'`），数据库自动路由到物化视图，LLM 不需要感知；(3) 视图优先级——在 prompt 中告知"优先使用视图，如果没有合适视图再用原始表"。实测：有视图时 SQL 准确率提升 10%（视图屏蔽了底层表复杂性）

**追问 3**：用户问"为什么本周销售额下降了"，这种因果分析 Agent 怎么做？

> 因果分析比数据查询复杂得多。流程：(1) 确认事实——先查询本周 vs 上周的销售额数据，确认是否真的下降以及下降幅度；(2) 维度拆解——按多个维度拆分（品类/渠道/地区/用户群体），找到下降主要集中在哪个维度。如"服装品类下降 30%，其他品类持平"；(3) 下钻分析——对下降的维度进一步下钻。如"服装品类中，女装下降 40%，男装持平"；(4) 外部因素——结合外部数据（节假日/天气/竞品活动/供应链）分析可能原因；(5) 生成假设——LLM 基于拆解结果生成因果假设："女装下降可能与上周结束的促销活动有关"；(6) 验证假设——查询促销期间的 vs 促销后的销量数据验证。关键：Agent 不是直接回答"为什么"，而是引导用户做"假设-验证"的分析完整流程

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "用 GPT-4 生成 SQL 准确率就够了" → ✅ "GPT-4 在 Spider benchmark 上执行准确率约 70-75%。需要四层保障（schema增强+生成控制+多重校验+错误恢复）才能达到 85%+。模型只是基础，工程化保障才是关键。"
- ❌ "SQL 生成后直接执行就行" → ✅ "LLM 可能生成语法错误或危险 SQL。必须用 sqlglot 做语法检查 + EXPLAIN 验证执行计划 + 安全约束（只SELECT/超时/行数限制）。执行后还要做结果合理性校验。"
- ❌ "few-shot 示例越多越好" → ✅ "过多示例导致 prompt 过长（>4k tokens）且干扰。3-5 个 diverse 的相似示例效果最佳。用 embedding 检索 + MMR 去重选择。"

#### 6️⃣ 简历呼应

- **如果你有 Text-to-SQL 项目**：从"准确率优化"切入，描述你实现的四层保障方案，给出 Spider benchmark 分数和生产环境接受率
- **如果你只做过数据库开发**：用"SQL开发→NL2SQL"迁移，说明 SQL 优化、schema 设计的经验直接适用，额外需要的是 LLM prompt 工程
- **如果你是校招无项目**：在 Spider benchmark 上测试不同 schema 注入策略和 few-shot 数量对准确率的影响，写一篇博客
- "Spider: A Benchmark for Text-to-SQL" (Yu et al., 2018)
- "C3: Zero-shot Text-to-SQL with ChatGPT" (Dong et al., 2023)
- "sqlglot: A SQL Parser and Transpiler" (Tobolka, 2023)

---
