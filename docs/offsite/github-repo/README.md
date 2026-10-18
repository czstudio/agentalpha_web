# AgentAlpha 面试题库（开源精选）

> AI Agent / LLM 岗位求职的中文面试题库。本仓库是 [agentalpha.top](https://agentalpha.top/interview) 的精选镜像，完整题库（572 道速答 + 2400+ 篇真题解析 + 51 个术语页）在网站上，全部免费、不用注册。

## 为什么做这个

AI Agent 岗位 2025 年起成为大厂招聘主流方向，但面试准备资料分散在各个面经帖里。我们把社区成员的真实面经整理成结构化题库：每道题给一句话结论、标准答案和面试官追问链。

## 精选 20 题（Agent 工程方向速答）

| # | 问题 | 一句话答案 |
|---|---|---|
| 1 | [Agent 的记忆系统怎么设计？](https://agentalpha.top/interview/qa/agent-memory-design) | 按寿命分层：上下文窗口是工作记忆，向量库放长期记忆，数据库放结构化事实；定清楚什么值得记、怎么检索回来、什么时候过期 |
| 2 | [Agent 为什么会陷入死循环？怎么治理？](https://agentalpha.top/interview/qa/agent-loop) | 根子是模型看不到失败；治理靠检测（轨迹指纹、轮数预算、进度指标）加干预（升级提示、换路线、交还人） |
| 3 | [ReAct、Plan-and-Execute、Reflection 三种范式怎么选？](https://agentalpha.top/interview/qa/agent-paradigm) | ReAct 适合路径不明的短任务，Plan-and-Execute 适合步骤多的长任务，Reflection 执行后自查返工，三者常组合用 |
| 4 | [Agent 的任务规划怎么做？](https://agentalpha.top/interview/qa/agent-planning) | 把目标拆成有依赖关系的子步骤，按依赖顺序执行、按反馈调整；先拆解是因为模型上下文和可靠性有限 |
| 5 | [Agent 的效果怎么评估？评测集怎么建？](https://agentalpha.top/interview/qa/agent-evaluation) | 任务级、轨迹级、成本级三层评；评测集从真实任务来，按难度分级——没有回归评测的迭代等于盲飞 |
| 6 | [改了提示词怎么确认没改坏别处？](https://agentalpha.top/interview/qa/agent-regression) | 回归评测集：改前改后跑同一批用例，对比成功率、轨迹质量、成本，绿了才上线，再配灰度兜底 |
| 7 | [Agent Harness 是什么？为什么换框架效果差很多？](https://agentalpha.top/interview/qa/agent-harness) | Harness 是模型外的工程框架：循环、上下文、工具执行、权限、日志；模型只决定下一步，效果上限由 harness 决定 |
| 8 | [多 Agent 跑一轮，Token 都花在哪？](https://agentalpha.top/interview/qa/agent-token-billing) | 系统提示和工具定义每轮重发、历史逐轮全量重发、多 Agent 各带上下文；控制靠前缀瘦身、历史压缩、模型分级路由 |
| 9 | [Agent 怎么并行调用工具？](https://agentalpha.top/interview/qa/agent-parallel-tools) | 无依赖只读查询并行，有依赖必须串行；有副作用的动作默认串行加确认 |
| 10 | [让 Agent 跑代码，沙箱怎么设计？](https://agentalpha.top/interview/qa/agent-code-sandbox) | 把生成代码当不可信输入：无默认网络、最小文件权限、严格资源限额、用完即弃 |
| 11 | [Agent 搞不定怎么转人工？](https://agentalpha.top/interview/qa/agent-human-handoff) | 转人工是设计出来的功能：确定触发条件、转接带上下文摘要、接管后 Agent 停止行动、结果回流评测集 |
| 12 | [Agent 响应太慢怎么优化？](https://agentalpha.top/interview/qa/agent-latency) | 先打点分段定位；大头通常是串行 LLM 调用次数，顺序是减轮次、并行化、流式、缓存，最后才是换模型 |
| 13 | [护栏（Guardrails）怎么分层？](https://agentalpha.top/interview/qa/agent-guardrails) | 纵深防御：输入、对话与检索、工具执行、输出四层，核心是隔离指令与数据、工具最小权限 |
| 14 | [Agent 的流式输出怎么设计？](https://agentalpha.top/interview/qa/agent-streaming-ux) | 同时处理字级 Token 流和结构化工具事件流；默认选 SSE，需要双向持续通信才用 WebSocket |
| 15 | [记忆写入前怎么校验？](https://agentalpha.top/interview/qa/agent-memory-write-verify) | 去重、原文一致性校验、新旧冲突检测；评估看写入抽取准确率与使用侧任务成功率增量 |
| 16 | [记忆为什么要分级？](https://agentalpha.top/interview/qa/agent-memory-multi-level-why) | 在生命周期与访问成本之间做平衡；单级架构无法同时解决窗口限制、检索损耗与成本控制 |
| 17 | [Agent RL 的奖励怎么设计？](https://agentalpha.top/interview/qa/agentic-rl-reward-design) | 组合策略：结果奖励主导，规则罚分兜底，过程奖励辅助冷启动 |
| 18 | [Agentic RL 和 SFT 有什么区别？](https://agentalpha.top/interview/qa/agentic-rl-vs-sft) | SFT 模仿标注轨迹，RL 在环境里试错按成败拿奖励，能长出标注数据没有的策略；代价是训练门槛高 |
| 19 | [项目记忆文件（CLAUDE.md/AGENTS.md）怎么设计？](https://agentalpha.top/interview/qa/agents-md-project-memory) | 只写它容易犯错的具体约束，简短分层放置，踩坑沉淀为新条目并版本管理 |
| 20 | [从零构建 Agent Benchmark 要做哪些事？](https://agentalpha.top/interview/qa/agent-benchmark-from-scratch) | 定义任务域与自动校验、搭可重置沙箱、设计成功率与过程指标、人类基线校准、防数据污染 |

## 完整题库导航

| 板块 | 链接 | 说明 |
|---|---|---|
| Agent 面试题 60 问 | https://agentalpha.top/interview/best/agent | 一页全览，每题带答案 |
| RAG 面试题 50 问 | https://agentalpha.top/interview/best/rag | 一页全览，每题带答案 |
| 大模型八股 60 问 | https://agentalpha.top/interview/best/llm | 一页全览，每题带答案 |
| MCP 面试题 20 问 | https://agentalpha.top/interview/best/mcp | 一页全览，每题带答案 |
| 速答题库（572 题） | https://agentalpha.top/interview/qa | 一题一页，含追问要点 |
| 真题解析库 | https://agentalpha.top/interview/tk | 大厂真题逐题拆解，含考察意图与追问链 |
| 术语表 | https://agentalpha.top/interview/glossary | 51 个术语：定义 + 机制 + 面试考法 |
| 学习路线 | https://agentalpha.top/interview | 12 章从零到 offer |
| 免费工具 | https://agentalpha.top/tools | JD 拆解 / 简历体检 / 模拟面试等，浏览器本地运行 |

## 相关仓库

- 内容持续更新中，题目来自社区成员真实面经。发现错误欢迎提 Issue。

## License

内容采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh) 授权，转载请注明来源 agentalpha.top。
