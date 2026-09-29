---
slug: enterprise-tk150
no: "1050"
title: "数据分析 Agent 如何支持「实时分析「"
question: "数据分析 Agent 如何支持「实时分析「"
excerpt: "面试官想看你解决"实时数据流分析"的架构能力。实时分析需要处理流数据（Kafka/Flink）而非批量数据（SQL查询）。"
tags: ["真题解析", "编程题"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 4
words: 1016
updated: "2026-09-29"
---

## 数据分析 Agent 如何支持「实时分析「

#### 1️⃣ 考察意图

面试官想看你解决"实时数据流分析"的架构能力。实时分析需要处理流数据（Kafka/Flink）而非批量数据（SQL查询）。

#### 2️⃣ 标准答

实时分析架构："流数据接入 → 实时计算 → 异常检测 → Agent 告警"：

- **流数据接入**：Kafka 消费实时事件流（订单/点击/日志）。Flink 做实时聚合（如每分钟销售额）
- **实时计算**：Flink 窗口计算（滚动窗口1分钟/滑动窗口5分钟）。结果写入 Redis 供 Agent 查询
- **异常检测**：Flink CEP（Complex Event Processing）检测异常模式。如"1分钟内退款率 >10%"→触发告警
- **Agent 告警**：异常事件通过 WebSocket 推送到 Agent → Agent 用 LLM 生成告警描述 → 推送给相关人。如"⚠️ 检测到支付失败率突增至 15%（正常 <2%），请立即排查"

#### 3️⃣ 答题模板

> "Kafka流接入→Flink实时聚合（1分钟窗口）→Redis存储→Flink CEP异常检测→WebSocket推送到Agent→LLM生成告警→推送相关人。延迟：从事件发生到告警 <30秒。"

#### 4️⃣ 高频追问

**追问**：实时分析和离线分析用同一个 Agent 吗？

> 分离架构：(1) 离线 Agent——处理用户主动查询（"查上月销售额"），走 SQL → OLAP 引擎；(2) 实时 Agent——处理自动告警（"支付失败率突增"），走 Kafka → Flink → 告警。两者共享知识库和 LLM，但数据管道不同。用户可以问"实时销售额是多少"→Agent 查 Redis 获取实时数据

#### 5️⃣ 避坑

- ❌ "实时分析就是查最新数据" → ✅ "实时分析需要流计算（Flink）做窗口聚合和异常检测，不是简单查最新记录。流计算处理高频数据（万级/秒），SQL 查询无法承受。"

#### 6️⃣ 简历呼应

- 描述你实现的实时分析 pipeline，给出端到端延迟和异常检测准确率
- "Stream Processing with Apache Flink" (Zaharia et al., 2019)

---
