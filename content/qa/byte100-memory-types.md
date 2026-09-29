---
slug: byte100-memory-types
question: "Working、Episodic、Semantic、Procedural 四类记忆怎么划分？"
oneLine: "这四类记忆沿用认知科学分类并映射到 Agent 工程。Working 对应当前上下文窗口，Episodic 记录经历的会话与事件，Semantic 沉淀事实与知识，Procedural 固化做法与流程。"
category: jingchang
company: bytedance, moonshot
track: agent-dev
tags: [字节真题, Agent记忆, 认知架构]
minutes: 5
order: 71
updated: 2026-09-29
deep: 
---

## 先这样答

这四类记忆沿用认知科学分类。Agent 工程将它们映射到不同的生命周期、存储结构和检索方式中。Working Memory 对应当前上下文窗口内的信息。它直接存放 Agent 正在处理的即时输入。这类记忆的生命周期极短。系统在单次会话或任务结束后就会清空它。

Episodic Memory 是 Agent 经历过的会话与事件记录。它按时间顺序保存历史交互流水。系统通常采用时间戳作为主要检索维度。Semantic Memory 是系统沉淀下来的事实与知识。它包含明确的用户偏好与静态的业务规则。这两类记忆的存储结构截然不同。Episodic Memory 偏向追加写入的流水日志。Semantic Memory 偏向结构化的事实库。

Procedural Memory 代表具体的做法与流程。它在工程中体现为 Agent 调用的技能和预设的 SOP。它类似于系统内置的 Skill。这四类记忆构成了完整的 Agent 认知架构。工程实现必须针对它们的特性差异设计独立的存储与检索方案。

## 面试官会怎么追问

- **「这四类记忆的检索方式具体有什么差异？」** Working Memory 驻留在当前上下文窗口内，系统无需执行外部检索。Episodic Memory 记录历史会话与事件，系统按时间线进行检索。Semantic Memory 沉淀事实与知识，系统按内容匹配度提取业务规则。

- **「工程上怎么处理这四类记忆的生命周期？」** Working Memory 生命周期最短，它随当前上下文窗口刷新而失效。Episodic Memory 和 Semantic Memory 作为长期记忆持久化存储。Procedural Memory 作为固化的做法与流程，它与 Agent 配置的生命周期绑定。

- **「Procedural Memory 在 Agent 中具体指代什么？」** 它指代 Agent 执行任务的具体做法与流程。工程实现上对应预先定义好的 SOP。它等同于 Agent 挂载的各类 Skill。

## 回答的坑

混淆 Episodic 与 Semantic 记忆，忽视了前者按时间检索而后者按事实沉淀的差异。

脱离工程落点谈认知科学概念，未点明四者在存储结构和生命周期上的本质不同。