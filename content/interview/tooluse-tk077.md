---
slug: tooluse-tk077
no: "977"
title: "如何设计一个 Agent 的发现机制"
question: "如何设计一个 Agent 的发现机制"
excerpt: "面试官想看你能否设计 Agent 的服务发现机制——让 Agent 能动态发现彼此的能力。刁钻点在于：Agent 发现不只是"找到 Agent 的地址"，还需要"理解 Agent 的能力"和"评估 Agent 的质量"。"
tags: ["真题解析", "工具调用"]
category: "tooluse"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3190
updated: "2026-09-29"
---

## 如何设计一个 Agent 的发现机制

#### 1️⃣ 考察意图

面试官想看你能否设计 Agent 的服务发现机制——让 Agent 能动态发现彼此的能力。刁钻点在于：Agent 发现不只是"找到 Agent 的地址"，还需要"理解 Agent 的能力"和"评估 Agent 的质量"。答好了能展示你在服务发现和 Agent 编排方面的经验。

#### 2️⃣ 标准答

Agent 发现机制从"注册、发现、匹配、评估"四个环节设计：

**1. 注册（Registration）**

- **Agent Card 注册**：Agent 启动时向注册中心提交 Agent Card（包含 name、description、skills、capabilities、endpoint、auth_method）
- **注册中心**：用 etcd/Consul/Redis 存储Agent Card。支持按 name、skill、capability 检索
- **心跳检测**：Agent 每 30s 上报心跳。3 次心跳失败（90s）自动注销。防止"幽灵 Agent"（已停止但注册仍在）
- **能力变更通知**：Agent 新增/删除 skill 时，主动更新注册中心。订阅了变更通知的 Orchestrator 收到通知后更新本地缓存

**2. 发现（Discovery）**

- **主动发现**：Orchestrator 向注册中心查询"有哪些 Agent 有 `review_code` skill"。返回 Agent 列表+元数据
- **被动发现**：Agent 启动时广播自己的 Agent Card（如用 mDNS 或 MQTT broadcast），同一网络的 Agent 自动接收
- **缓存策略**：Orchestrator 缓存发现结果（TTL 5分钟），避免每次调用都查注册中心。缓存 miss 时回源查询

**3. 匹配（Matching）**

- **精确匹配**：Task 需要 `review_code` skill → 查找有该 skill 的 Agent。简单快速但可能遗漏
- **语义匹配**：Task 是"审查Python代码" → 用 embedding 计算与各 Agent Card 的 description 相似度 → 选 Top-K。比精确匹配更灵活
- **质量匹配**：多个 Agent 都有相同 skill → 选历史成功率最高/延迟最低/评分最高的。需要维护 Agent 质量指标

**4. 评估（Evaluation）**

- **性能指标**：成功率、P95延迟、吞吐量。从历史调用记录中统计
- **质量指标**：用户评分（1-5星）、LLM 评判（用另一个 LLM 评估输出质量）
- **信任评分**：基于安全事件（如被注入成功次数）、认证级别（官方认证 vs 第三方）、运行时长综合计算
- **动态权重**：综合性能、质量、信任三个维度计算总分，选择总分最高的 Agent

#### 3️⃣ 答题模板（30 秒电梯版）

> "Agent发现四个环节：注册——Agent启动时提交Agent Card到注册中心（etcd/Consul），30s心跳检测，90s无心跳自动注销。发现——主动查询注册中心+被动广播Agent Card+本地缓存TTL5min。匹配——精确匹配（skill名）+语义匹配（embedding相似度选Top-K）+质量匹配（选成功率最高的）。评估——性能（成功率/P95延迟）+质量（用户评分/LLM评判）+信任评分（安全事件/认证级别）。动态权重综合排序选最优Agent。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：语义匹配用 embedding 怎么做？Agent Card 的哪些字段做 embedding？

> 方案：(1) 对 Agent Card 的 `description` + `skills[].description` 拼接后做 embedding。用 sentence-transformers（如 all-MiniLM-L6-v2）编码为 384 维向量；(2) 对 Task 描述做同样编码；(3) 计算余弦相似度，取 Top-K。延迟约 20ms（编码+检索）。注意：description 质量直接影响匹配准确率——如果 description 写得模糊，embedding 也不准确。建议在 Agent Card 注册时做 description 质量检查（如长度 >50 字符、包含关键词）

**追问 2**：Agent 注册中心挂了怎么办？

> 三层容灾：(1) 客户端缓存——Orchestrator 缓存最近发现的 Agent 列表（TTL 5分钟），注册中心挂了用缓存继续工作。新 Agent 无法被发现，但已有 Agent 的通信不受影响；(2) 注册中心集群——etcd/Consul 用 Raft 共识，3 节点集群容忍 1 节点故障。不会整体不可用；(3) 降级模式——注册中心长时间不可用时，Orchestrator 降级为"硬编码 Agent 地址"模式（预配置的 Agent 列表），保证核心功能可用

**追问 3**：如何防止恶意 Agent 注册虚假能力？

> 三重验证：(1) 认证——Agent 注册时需要提供身份凭证（如 API Key、证书），注册中心验证身份后才允许注册；(2) 能力验证——注册后，注册中心自动发送测试 Task 验证 Agent 是否真的有声明的 skill。例如对声明 `review_code` 的 Agent 发送测试代码审查任务，验证返回结果；(3) 信任评分——新注册 Agent 初始信任分低（如 50/100），执行一定数量（如 100 次）的成功任务后信任分提升。低信任分 Agent 只能接低风险任务

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "用 DNS 做服务发现就行" → ✅ "DNS 只能发现地址，不能发现能力。Agent 发现需要基于 skill/description 匹配，而非基于域名。需要专门的 Agent Card 注册中心。"
- ❌ "所有 Agent 都注册到全局注册中心" → ✅ "全局注册中心存在单点故障和性能瓶颈。应该分区注册——按业务域（如"代码Agent"、"数据Agent"）分区，区内注册中心独立运行，跨区通过联邦查询。"
- ❌ "发现后就直接调用，不需要评估" → ✅ "多个 Agent 可能有相同 skill，但质量和性能差异大。需要基于历史数据评估选最优 Agent。不评估可能导致选到质量差的Agent影响整体效果。"

#### 6️⃣ 简历呼应

- **如果你有服务发现项目**：从"Agent 服务发现平台"切入，描述你实现的注册+发现+匹配+评估体系
- **如果你只做过微服务注册中心**：用"服务注册"迁移——etcd/Consul 的注册和心跳机制直接适用，额外需要的是"语义匹配"和"能力验证"
- **如果你是校招无项目**：实现一个 Agent 注册中心，支持 Agent Card 注册+语义搜索+信任评分
- "Service Discovery Patterns" (Richardson, 2023)
- "Agent Card Specification" (Google A2A, 2025)
- "Semantic Service Matching" (Wang et al., 2024)

---
