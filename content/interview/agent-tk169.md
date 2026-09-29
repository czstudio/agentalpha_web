---
slug: agent-tk169
no: "1069"
title: "什么是「观察者模式「在 Agent 系统中的应用"
question: "什么是「观察者模式「在 Agent 系统中的应用"
excerpt: "面试官想看你能否将经典设计模式（观察者模式）迁移到 Agent 系统中。刁钻点在于：很多人能背"观察者模式 = 发布-订阅"，但说不清在 Agent 场景中"谁发布、谁订阅、发布什么、订阅后做什么"。答好了能展示你的设计"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4790
updated: "2026-09-29"
---

## 什么是「观察者模式「在 Agent 系统中的应用

#### 1️⃣ 考察意图

面试官想看你能否将经典设计模式（观察者模式）迁移到 Agent 系统中。刁钻点在于：很多人能背"观察者模式 = 发布-订阅"，但说不清在 Agent 场景中"谁发布、谁订阅、发布什么、订阅后做什么"。答好了能展示你的设计模式功底和 Agent 架构设计能力。

#### 2️⃣ 标准答

**1. 经典观察者模式回顾**

- **核心**：Subject（被观察者）状态变化时，自动通知所有 Observer（观察者）。Subject 不需要知道 Observer 的具体实现，实现松耦合
- **角色**：Subject（维护 Observer 列表、状态变更时调用 Observer.update()）、Observer（定义 update 接口）

**2. Agent 系统中的观察者模式**

在 Agent 系统中，观察者模式用于"事件驱动的状态同步和副作用管理"：

- **Subject = Agent 核心引擎**——负责 LLM 调用、工具执行、状态管理。状态变更时（如"工具调用完成"、"LLM 输出生成"、"错误发生"）发布事件
- **Observer = 功能插件**——订阅特定事件，在事件发生时执行各自逻辑。各 Observer 互相独立，互不影响
- **事件类型**：`on_llm_start`：LLM 调用前（Observer 可以修改 prompt）
- `on_llm_end`：LLM 调用后（Observer 可以审查输出、记录日志、评估质量）
- `on_tool_start`：工具调用前（Observer 可以校验参数、拦截危险操作）
- `on_tool_end`：工具调用后（Observer 可以校验返回值、记录耗时）
- `on_error`：错误发生时（Observer 可以告警、重试、降级）
- `on_agent_finish`：Agent 任务完成（Observer 可以记录总结、更新记忆、触发后续流程）

**3. 工程化实现**

`from typing import Callable, Dict, List**
class AgentEventBus:
    """Agent 事件总线，实现观察者模式"""
    def __init__(self):
        self._listeners: Dict[str, List[Callable]] = {}

    def on(self, event: str, callback: Callable):
        """注册观察者"""
        self._listeners.setdefault(event, []).append(callback)

    def emit(self, event: str, **kwargs):
        """发布事件"""
        for callback in self._listeners.get(event, []):
            try:
                callback(**kwargs)
            except Exception as e:
                # 观察者异常不影响主流程
                logging.error(f"Observer error in {event}: {e}")

# 使用示例
bus = AgentEventBus()

# 日志观察者
bus.on("on_llm_end", lambda prompt, completion, **kw: 
       log_to_langfuse(prompt, completion))

# 安全审查观察者
bus.on("on_tool_start", lambda tool, params, **kw: 
       security_check(tool, params))

# 质量评估观察者
bus.on("on_llm_end", lambda completion, **kw: 
       async_eval_quality(completion))

# 成本追踪观察者
bus.on("on_llm_end", lambda usage, **kw: 
       track_cost(usage))`4. 优势与注意事项**

- **优势**：**松耦合**——核心引擎不关心有多少 Observer、它们做什么。新增功能（如安全审查）只需注册新 Observer，不需要修改核心代码
- **可扩展**——LangChain 的 Callbacks 机制就是观察者模式的实现，支持 LangSmith、Langfuse 等多个 Observer 同时运行
- **异常隔离**——Observer 异常不影响主流程（try-catch 兜底）
注意事项：
- **同步 vs 异步**——同步 Observer 会增加延迟（每个 Observer 串行执行）。生产环境推荐异步 Observer（用 asyncio 或消息队列），只有"必须同步"的 Observer（如安全拦截）才同步执行
- **Observer 数量控制**——每个事件最多 5-10 个 Observer。过多 Observer 会增加内存和延迟开销
- **事件粒度**——事件太粗（如 `on_step`）信息不足，太细（如 `on_token`）开销过大。推荐按"语义节点"划分（LLM 调用、工具调用、错误）

#### 3️⃣ 答题模板（30 秒电梯版）

> "观察者模式在 Agent 中用于事件驱动的功能扩展。Subject=Agent 核心引擎，在 LLM 调用/工具执行/错误发生时发布事件。Observer=功能插件（日志/安全/质量评估/成本追踪），订阅事件并执行各自逻辑。实现用事件总线（EventBus），Observer 异常隔离不影响主流程。优势：松耦合（新增功能不改核心代码）、可扩展（LangChain Callbacks 就是此模式）。注意：Observer 用异步避免增加延迟，数量控制在 5-10 个。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：LangChain 的 Callbacks 和你说的 EventBus 有什么区别？

> LangChain Callbacks 是观察者模式的具体实现，但有两个限制：(1) Callbacks 是同步的——`on_llm_end` 回调在 LLM 返回后同步执行，如果回调耗时 500ms，用户延迟增加 500ms。EventBus 可以用 asyncio 做异步回调；(2) Callbacks 是全局的——所有 LLM 调用共享同一组 callbacks，无法按 Agent 或任务定制。EventBus 可以按 Agent 实例注册不同 Observer。生产建议：简单场景用 LangChain Callbacks（开箱即用），需要异步或精细化控制时用自建 EventBus。

**追问 2**：安全审查 Observer 需要同步执行（拦截危险操作），但其他 Observer 异步执行，怎么混合？

> 分级处理：(1) **同步 Observer（拦截型）**——安全审查、参数校验。在 `on_tool_start` 事件中同步执行，如果校验失败返回 `abort=True`，核心引擎取消工具调用。延迟增加约 50-100ms（用小模型做快速校验）；(2) **异步 Observer（记录型）**——日志记录、质量评估、成本追踪。在 `on_llm_end` 事件中异步执行，不阻塞主流程。用 asyncio.create_task() 或消息队列（如 Redis Stream）异步处理；(3) **实现**——EventBus 的 `emit` 方法分两条路径：`emit_sync`（同步执行所有 Observer，返回是否有 abort）和 `emit_async`（异步执行所有 Observer）。核心引擎在关键节点调用 `emit_sync`，其他节点调用 `emit_async`。

**追问 3**：多 Agent 系统中，每个 Agent 有自己的 EventBus 还是共享一个？

> 推荐分层 EventBus：(1) **Agent 级 EventBus**——每个 Agent 有自己的 EventBus，注册该 Agent 专属的 Observer（如特定工具的安全检查）；(2) **系统级 EventBus**——全局共享，注册跨 Agent 的 Observer（如全局成本追踪、安全审计）。Agent 级事件先触发，然后冒泡到系统级。类似 DOM 的事件冒泡机制——子元素事件先触发，然后冒泡到父元素。这样既支持 Agent 级定制，又支持系统级监控。实现：Agent 的 EventBus emit 时，先执行本地 Observer，再调用系统 EventBus 的 emit。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "观察者模式就是加回调函数" → ✅ "观察者模式的核心是'松耦合'——Subject 不知道 Observer 的存在，新增/删除 Observer 不需要修改 Subject 代码。直接在代码里写回调函数是硬耦合，不是观察者模式。"
- ❌ "所有 Observer 都应该同步执行" → ✅ "只有'拦截型'Observer（安全检查、参数校验）需要同步。'记录型'Observer（日志、评估、成本）应该异步，避免增加用户延迟。"
- ❌ "Observer 越多越好，功能越全" → ✅ "每个 Observer 增加内存和延迟开销。推荐每个事件 5-10 个 Observer，按优先级排序，低优先级的可以采样执行。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 框架项目**：从"事件驱动架构"切入，描述你设计的 EventBus 和 Observer 体系，给出数据（如新增功能从改代码 2 天降到注册 Observer 2 小时）
- **如果你只做过传统后端**：用"消息队列"类比——EventBus 类似 Kafka，Observer 类似 Consumer Group。核心差异是 Agent 的 EventBus 通常是进程内的（低延迟），而非跨服务
- **如果你是校招无项目**：用 Python 实现一个 Agent EventBus demo，注册 4 种 Observer（日志/安全/质量/成本），演示事件触发和异常隔离
- "Design Patterns: Elements of Reusable Object-Oriented Software" (Gamma et al., 1994)
- "LangChain Callbacks: Event-Driven Agent Extensibility" (LangChain, 2024)
- "Event-Driven Architecture for AI Systems" (Richardson, 2024)

---
