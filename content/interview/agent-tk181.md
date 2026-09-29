---
slug: agent-tk181
no: "1081"
title: "Prompt 缓存和结果缓存如何设计"
question: "Prompt 缓存和结果缓存如何设计"
excerpt: "面试官想看你能否设计 Agent 的多级缓存体系。刁钻点在于：Agent 的缓存不只是"输入→输出"的简单缓存——需要在 Prompt 级（减少 LLM 计算）、结果级（减少重复调用）、语义级（相似输入复用）三个层级设计"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4442
updated: "2026-09-29"
---

## Prompt 缓存和结果缓存如何设计

#### 1️⃣ 考察意图

面试官想看你能否设计 Agent 的多级缓存体系。刁钻点在于：Agent 的缓存不只是"输入→输出"的简单缓存——需要在 Prompt 级（减少 LLM 计算）、结果级（减少重复调用）、语义级（相似输入复用）三个层级设计缓存策略。答好了能展示你的缓存架构设计能力和对 LLM 系统成本优化的理解。

#### 2️⃣ 标准答

**1. 三级缓存体系**

| 缓存层级 | 缓存对象 | 命中率 | 延迟节省 | 适用场景 |
|---|---|---|---|---|
| Prompt Cache | Prompt 前缀的 KV Cache | 80%+ | TTFT -50% | system prompt + 工具 schema |
| 结果 Cache | 完整输入→输出对 | 20-40% | 整条链路 -100% | FAQ、重复查询 |
| 语义 Cache | 相似输入的输出 | 30-50% | 整条链路 -90% | 换个说法问相同问题 |

**2. Prompt Cache（LLM 推理层）**

- **原理**：缓存 prompt 的 KV Cache，相同前缀的请求复用。OpenAI 的 Prompt Caching 和 vLLM 的 Prefix Caching 都是这个原理
- **Agent 场景优化**：System prompt 在所有请求中相同 → 100% 命中
- 工具 Schema 在同一 Agent 中相同 → 100% 命中
- 对话历史的前 N-1 轮在第 N 轮中相同 → 部分命中
设计要点：
- 将不变的内容放在 prompt 前部（system prompt → 工具 schema → 对话历史 → 当前请求）
- 避免在前缀中放置动态内容（如时间戳、随机 ID），否则前缀不一致，缓存失效
- OpenAI 要求前缀 ≥1024 tokens 才缓存，确保 system prompt 足够长

**3. 结果 Cache（应用层）**

- **原理**：缓存完整的"用户输入→Agent 输出"对。相同输入直接返回缓存，不调 LLM
- **缓存 Key 设计**：简单：`hash(user_input)`——精确匹配，命中率低（换个标点就不命中）
- 进阶：`hash(user_input + user_id + context_hash)`——考虑用户上下文
- 问题：Agent 的输出是概率性的，相同输入可能产生不同输出。缓存哪个版本？
策略：
- 只缓存"高置信度"输出——LLM-as-Judge 评分 >0.9 的输出才缓存
- TTL 短——缓存 1 小时过期，避免返回过时信息
- 用户可刷新——提供"重新生成"按钮，用户可以跳过缓存

**4. 语义 Cache（智能层）**

- **原理**：用 embedding 检索相似输入的缓存输出。如"RAG 怎么分块"和"RAG 的 chunk 策略"语义相同，可以复用
- **实现**：`# 写入语义缓存 embedding = embed(user_input) redis.set(f"sem_cache:{hash(embedding)}", {     "input": user_input,     "output": agent_output,     "embedding": embedding })  # 查询语义缓存 query_embedding = embed(new_input) results = vector_db.search(query_embedding, top_k=1) if results[0].similarity > 0.95:  # 高阈值避免误命中     return results[0]["output"] else:     return agent_execute(new_input)  # 缓存未命中，正常执行`
- **挑战**：阈值设定——太低（0.85）会误命中（语义相似但意图不同），太高（0.98）命中率低。推荐 0.92-0.95
- 上下文差异——"搜索北京天气"和"搜索上海天气"语义相似但实体不同，不能复用。需要在 embedding 中加入实体信息或用结构化 key
- 缓存失效——知识库更新后旧缓存可能过时。需要版本号标记，知识库变更时清空语义缓存

**5. 缓存层级协同**

`用户输入 → [语义Cache检查] → 命中 → 返回缓存结果**                              ↓ 未命中
           [结果Cache检查] → 命中 → 返回缓存结果
                              ↓ 未命中
           [Prompt Cache优化] → LLM推理（system prompt KV复用）
                              ↓
           [结果+语义Cache写入] → 返回结果`

#### 3️⃣ 答题模板（30 秒电梯版）

> "Agent 三级缓存。Prompt Cache：缓存system prompt+工具schema的KV Cache，TTFT降50%，命中率80%+，将不变内容放prompt前部。结果Cache：缓存完整输入→输出对，TTL 1小时，只缓存高置信度输出（Judge>0.9），命中率20-40%。语义Cache：embedding检索相似输入，阈值0.92-0.95避免误命中，命中率30-50%。协同：语义→结果→Prompt Cache逐层检查，未命中才调LLM。注意：知识库更新时清空语义缓存，用户可手动刷新跳过缓存。"

#### 4️⃣ 高频追问 & 应对
追问 1**：语义缓存的误命中（相似但意图不同）怎么避免？

> 三层防御：(1) **高阈值**——embedding 相似度 >0.95 才命中。降低误命中但命中率从 50% 降到 30%。实测 0.95 阈值下误命中率 <2%；(2) **实体校验**——提取输入中的实体（如"北京""天气"），缓存中也存储实体。命中时对比实体是否一致。如"北京天气"和"上海天气"embedding 相似但实体不同，不命中；(3) **LLM 二次确认**——embedding 相似度在 0.90-0.95 之间时，用 GPT-4o-mini 做快速判断"这两个问题是否等价"。延迟增加 200ms 但准确率提升到 98%。三层组合：高阈值（快速过滤）→ 实体校验（精确排除）→ LLM 确认（边界案例兜底）。

**追问 2**：Agent 的工具调用结果怎么缓存？工具返回的数据可能变化（如股价）。

> 按时效性分级：(1) **静态数据**（文档、政策）——缓存 TTL 24 小时或永久。如"公司报销政策"基本不变，可以长期缓存；(2) **半静态数据**（产品信息、用户画像）——TTL 1 小时。如"产品价格"可能变化但不会每分钟变；(3) **动态数据**（股价、天气、新闻）——TTL 1-5 分钟或不缓存。如"实时股价"不能缓存。实现：工具 schema 中声明 `cache_ttl` 字段，Agent 框架根据 TTL 自动管理缓存。挑战：TTL 到期后缓存失效，但数据可能没变（如天气 1 小时内不变）。优化：用 ETag/Last-Modified 做条件请求——先检查数据是否变化，变化了才重新获取。

**追问 3**：缓存命中率怎么监控和优化？

> 监控指标：(1) **命中率**——cache_hit / total_requests。目标：语义 Cache 30-50%、结果 Cache 20-40%、Prompt Cache 80%+；(2) **误命中率**——semantic_cache_false_positive / semantic_cache_hit。目标 <2%。用用户反馈（"重新生成"按钮点击率）间接测量；(3) **缓存空间**——缓存占用的内存/存储。监控增长趋势，避免 OOM。优化方向：(1) 如果语义 Cache 命中率低（<20%），可能阈值太高或输入多样性大。尝试降低阈值或增加实体校验提升准确率；(2) 如果 Prompt Cache 命中率低（<60%），可能 prompt 前缀不稳定（动态内容在前部）。重新排列 prompt 结构；(3) 定期清理低频缓存（LRU 策略），保持缓存空间在可控范围。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "缓存就是存一个字典，key 是输入 value 是输出" → ✅ "Agent 缓存是三级体系——Prompt Cache（KV Cache 级）、结果 Cache（输入-输出对级）、语义 Cache（embedding 检索级）。每层有不同的命中率、延迟节省和适用场景。"
- ❌ "所有结果都应该缓存" → ✅ "动态数据（股价、天气）不能长期缓存。需要按数据时效性分级设置 TTL。缓存过时数据比不缓存更糟糕——用户得到错误信息。"
- ❌ "语义缓存用余弦相似度就够了" → ✅ "余弦相似度无法区分'北京天气'和'上海天气'。需要加实体校验或 LLM 二次确认。纯 embedding 检索的误命中率可能高达 10-15%。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 缓存项目**：从"多级缓存设计"切入，描述你的三级缓存体系和命中率数据（如语义 Cache 命中率 35%、整体 LLM 调用减少 50%、成本降低 45%）
- **如果你有缓存设计经验**：用"多级缓存"迁移——CPU L1/L2/L3 缓存的设计理念适用于 Agent 缓存。核心差异是 Agent 的缓存需要"语义匹配"而非"地址匹配"
- **如果你是校招无项目**：用 Redis + Pinecone 实现三级缓存 demo，测试不同阈值下的命中率和误命中率，写一篇博客分析 trade-off
- "Semantic Caching for LLM Applications" (GPTCache, 2024)
- "Prompt Caching: Reducing LLM Latency and Cost" (OpenAI, 2024)
- "Multi-Level Caching for AI Systems" (Redis, 2024)

---
