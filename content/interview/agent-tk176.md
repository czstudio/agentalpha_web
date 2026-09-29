---
slug: agent-tk176
no: "1076"
title: "Agent 系统的「熔断-降级-限流「模式如何设计"
question: "Agent 系统的「熔断-降级-限流「模式如何设计"
excerpt: "面试官想看你能否将微服务的弹性设计模式（熔断/降级/限流）迁移到 Agent 系统。刁钻点在于：Agent 的"服务"是 LLM API + 工具 API，与传统微服务有不同的故障模式——LLM API 可能限流（429"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 11
words: 5036
updated: "2026-09-29"
---

## Agent 系统的「熔断-降级-限流「模式如何设计

#### 1️⃣ 考察意图

面试官想看你能否将微服务的弹性设计模式（熔断/降级/限流）迁移到 Agent 系统。刁钻点在于：Agent 的"服务"是 LLM API + 工具 API，与传统微服务有不同的故障模式——LLM API 可能限流（429）、超时（504）、输出质量下降（不报错但回答变差）。需要针对 LLM 特有的故障模式设计弹性策略。答好了能展示你的 SRE 能力和对 LLM 系统运维的深度理解。

#### 2️⃣ 标准答

**1. 限流（Rate Limiting）——防止资源耗尽**

- **LLM API 限流**：OpenAI 有 RPM（Requests Per Minute）和 TPM（Tokens Per Minute）限制。GPT-4o 默认 500 RPM / 150k TPM
- 实现：令牌桶算法——每个用户/Agent 分配独立的令牌桶。请求前获取令牌，无令牌则排队等待
- 多模型分流：主模型（GPT-4o）限流时自动切换到备用模型（Claude-3.5 / Gemini）
工具 API 限流：
- 第三方 API（如搜索、翻译）有 QPS 限制。用滑动窗口算法控制调用频率
- 批量合并：多个工具调用合并为批量请求（如批量搜索 5 个关键词而非 5 次单独搜索）
用户级限流：
- 单用户每分钟最多 10 次请求（防止滥用）
- 单用户每天最多 1000 次 LLM 调用（成本控制）

**2. 熔断（Circuit Breaker）——防止级联故障**

- **原理**：当某个服务（LLM API / 工具 API）连续失败超过阈值时，熔断器打开，后续请求直接失败（不再调用服务）。经过冷却期后进入"半开"状态，尝试少量请求，成功则关闭熔断器，失败则继续保持打开
- **Agent 特有的熔断场景**：**LLM API 熔断**——连续 5 次 429/504 错误，打开熔断器 60 秒。期间切换到备用 LLM
- **工具 API 熔断**——连续 3 次超时，打开熔断器 30 秒。期间该工具不可用，Agent 用替代工具或降级
- **质量熔断**——LLM 不报错但输出质量持续下降（LLM-as-Judge 评分连续 5 次 <0.5）。打开"质量熔断器"，切换到备用模型或降低 temperature
实现：

`class CircuitBreaker:**    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failure_count = 0
        self.state = "closed"  # closed / open / half_open
        self.last_failure_time = None

    def call(self, func, *args, **kwargs):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "half_open"
            else:
                raise CircuitBreakerOpenError()

        try:
            result = func(*args, **kwargs)
            self.failure_count = 0
            self.state = "closed"
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = "open"
            raise`3. 降级（Graceful Degradation）——保证核心功能可用**

- **LLM 降级策略**：GPT-4o 不可用 → 切换到 Claude-3.5 Sonnet（质量略降但功能完整）
- Claude 也不可用 → 切换到 GPT-4o-mini（质量明显下降但能完成基本任务）
- 所有外部 LLM 不可用 → 切换到本地小模型（如 Llama-3-8B，质量大幅下降但服务不中断）
工具降级策略：
- 搜索 API 不可用 → 使用缓存结果（标注"基于历史数据"）
- 代码执行不可用 → 返回代码建议但不执行（"以下是建议的代码，请手动执行"）
- 邮件发送不可用 → 保存为草稿（"邮件已保存为草稿，稍后发送"）
功能降级策略：
- 多 Agent 系统中部分 Agent 不可用 → 降级为单 Agent 模式（减少功能但保持核心服务）
- 长期记忆不可用 → 降级为无记忆模式（每次对话从头开始，标注"记忆系统暂时不可用"）
- RAG 检索不可用 → 降级为纯 LLM 回答（标注"未检索知识库，答案可能不够准确"）

**4. 三者协同**

`请求 → [限流检查] → 通过 → [熔断检查] → 闭合 → 正常执行**                   ↓                    ↓
                限流拒绝             熔断打开 → [降级执行]
                                          ↓
                                    返回降级结果`
- 限流是"入口控制"——防止过多请求进入系统
- 熔断是"故障隔离"——防止故障扩散
- 降级是"兜底保障"——即使故障也要返回结果

#### 3️⃣ 答题模板（30 秒电梯版）

> "Agent 弹性设计三件套。限流：令牌桶控制 LLM API（RPM/TPM）+ 工具 API（QPS）+ 用户级（10次/分钟）。多模型分流——主模型限流时切换备用。熔断：连续5次429/504打开熔断器60秒，期间切换备用LLM。Agent特有'质量熔断'——LLM-as-Judge连续5次<0.5也熔断。降级：LLM降级链 GPT-4o→Claude→GPT-4o-mini→本地Llama。工具降级——搜索不可用用缓存、执行不可用返回建议、邮件不可用存草稿。协同：限流（入口控制）→熔断（故障隔离）→降级（兜底保障）。"

#### 4️⃣ 高频追问 & 应对
追问 1**：质量熔断怎么实现？LLM 输出质量下降不报错，怎么检测？

> 质量熔断的核心是"实时质量监控"：(1) **LLM-as-Judge 采样评估**——对 LLM 输出做 10% 采样，用 GPT-4o-mini 评估质量（0-1 分）。如果连续 5 个采样评分 <0.5，触发质量熔断。延迟约 200ms/评估（异步进行，不阻塞主流程）；(2) **规则检测**——检查输出是否包含异常模式（如输出过短 <50 字、输出重复同一句子、输出包含错误码或乱码）。规则检测 0 延迟，覆盖明显异常；(3) **用户反馈**——用户点了"不满意"或重新提问，视为质量信号。连续 3 个用户"不满意"触发熔断。三种方式组合：规则检测覆盖明显异常（快），LLM-as-Judge 覆盖语义异常（准），用户反馈覆盖主观质量（真）。

**追问 2**：多模型分流时，不同模型的 prompt 格式和工具 schema 可能不同，怎么处理？

> 适配层设计：(1) **Prompt 适配器**——定义统一的内部 prompt 格式，适配器负责转换为目标模型格式。如 OpenAI 用 `system` role，Claude 用 `<system>` 标签，适配器自动转换；(2) **工具 Schema 适配器**——OpenAI 用 JSON Schema，Claude 用 XML 格式的 tool description。适配器统一管理工具定义，运行时转换为目标格式；(3) **输出解析适配器**——不同模型的输出格式不同（OpenAI 的 function_call vs Claude 的 tool_use），适配器统一解析为内部格式。实现：定义 `ModelAdapter` 接口，每个模型一个实现（OpenAIAdapter、ClaudeAdapter、GeminiAdapter）。切换模型时只需换适配器，业务代码不变。LangChain 的 `BaseLLM` 已经实现了这个模式。

**追问 3**：降级时用户体验怎么保证？用户怎么知道服务降级了？

> 透明降级：(1) **标注降级状态**——降级回复中明确标注"当前服务降级中，答案可能不够准确"。用 callout 或前缀标注（如 `[降级模式]`）；(2) **区分降级程度**——轻度降级（GPT-4o→Claude）不标注（用户无感知），重度降级（→本地模型）标注（质量差异明显）；(3) **提供重试选项**——降级回复中附带"服务恢复后重新生成"按钮，用户可以选择等待正常服务后重新获取高质量回复；(4) **降级告警**——降级触发时通知运维团队，监控降级持续时间和影响范围。核心原则：不要"假装正常"——用户发现质量下降但没标注会失去信任，不如透明告知。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "LLM API 不会挂，不需要熔断" → ✅ "OpenAI/Anthropic API 有 429 限流、504 超时、区域性故障。Agent 系统必须设计熔断和备用模型切换，否则单点故障导致服务不可用。"
- ❌ "降级就是返回错误信息" → ✅ "降级是'功能缩减但服务不中断'——返回降级结果（如缓存数据、简化回复），而非返回 500 错误。用户体验是'不太好'而非'不能用'。"
- ❌ "限流只针对外部用户" → ✅ "Agent 内部的工具调用也需要限流——如搜索 API 被频繁调用可能触发第三方限流。Agent 自身的 LLM 调用也需要 TPM 控制，防止成本失控。"

#### 6️⃣ 简历呼应

- **如果你有 Agent SRE 项目**：从"弹性设计"切入，描述你实现的限流+熔断+降级体系，给出数据（如服务可用性从 99.5% 提升到 99.95%、降级触发后用户满意度保持 3.5+/5）
- **如果你有微服务 SRE 经验**：用"微服务弹性模式"迁移——Hystrix/Resilience4j 的熔断/降级/限流模式直接适用于 Agent 系统。核心差异是 Agent 需要"质量熔断"（LLM 输出质量下降也触发熔断）
- **如果你是校招无项目**：用 Python 实现一个 Agent 弹性框架——令牌桶限流 + 熔断器 + 多模型降级链，用模拟故障测试恢复能力
- "Resilience Patterns for AI Systems" (Microsoft, 2024)
- "Circuit Breaker Pattern for LLM Applications" (LangChain, 2024)
- "SRE for Machine Learning Systems" (Google, 2024)

---

**本章学习完毕**
← 返回 Agent 岗面试宝典 v3 · 精华版　|　📝 建议整理错题笔记　|　🎯 标记掌握程度
