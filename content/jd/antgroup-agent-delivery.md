---
slug: agent-delivery
company: antgroup
title: 蚂蚁集团 · Agent 应用工程
role: Agent 应用开发
family: agent-app
level: 校招 / 社招 1-3 年
summary: 蚂蚁 Agent 应用工程岗：金融场景的交付风险与回滚机制是核心考题方向，护栏、权限、转人工要分层设计。
cats: [enterprise, agent, safety]
qaSlugs: [agent-delivery-risk, agent-regression, agent-guardrails, agent-human-handoff, multi-agent-child-fault, llm-security, tool-permission, agent-harness]
keywords: [蚂蚁 Agent 岗, 蚂蚁 Agent 面试, Agent 回滚机制, 金融 Agent 开发]
updated: 2026-09-29
sourceUrl: https://www.nowcoder.com/feed/main/detail/39cc0f08b211441cb8b4576f186be206
sourceName: 牛客
---

## 这条 JD 在招什么人

在金融场景把 Agent 做到可交付、可回滚的工程师。支付宝与蚂蚁的 Agent 要碰资金、客服、风控这些场景，错一步就是真金白银的损失，所以这里的工程重心不是「能不能跑」，而是「出错了怎么办」：发布前怎么拦住坏版本、出事后怎么止损、怎么保证不再犯。蚂蚁口径里 Agent 交付风险与回滚机制、Harness 上下文管理是高频考题方向，这个岗位的工作内容正对应这些题。

## 业务场景推测

大概率是支付宝内的智能助手与客服 Agent、理财与保险场景的助理 Agent；也可能包含对内的风控与运营 Agent（置信度：中高，基于公开业务布局推断）。金融场景的特殊性：回答错了要赔、操作错了要担责，转人工、操作确认、权限分级几乎是必答题；合规审计还要求每一步可回溯。

## 硬技能：必须会什么

- 交付质量：上线前怎么证明 Agent 没退化（[交付风险](/interview/qa/agent-delivery-risk)、[回归机制](/interview/qa/agent-regression)）
- 防线设计：护栏、敏感操作拦截、输入输出过滤（[护栏](/interview/qa/agent-guardrails)）
- 兜底：转人工的触发条件与衔接（[转人工](/interview/qa/agent-human-handoff)）
- 权限：工具分级授权、高危操作二次确认（[工具权限](/interview/qa/tool-permission)）
- 多 Agent 故障：子 Agent 挂了怎么办、故障怎么隔离（[子 Agent 故障](/interview/qa/multi-agent-child-fault)）
- 安全：注入攻击、越权、数据泄漏的防护（[LLM 安全](/interview/qa/llm-security)）

## 加分项：什么能拉开差距

- Harness 层实践：上下文管理、工具装载的框架级理解（[Agent Harness](/interview/qa/agent-harness)）
- 高风险系统经验：支付、交易、风控任一领域的可用性设计
- 回滚机制的具体设计：版本管理、灰度发布、影子流量
- 每个案例都能给出量化：拦截率、误伤率、回滚耗时

## JD 没写但面试会问

- Agent 版本更新怎么保证不把线上能力改坏（蚂蚁面经高频）
- 出了 badcase 之后：止损、定位、防再犯的完整流程，谁先动、多长时间内动
- 涉及资金的工具调用怎么设计确认与撤销（高频）
- 注入攻击骗过 Agent 去转账，怎么防
- 多 Agent 里一个环节超时，整单怎么处理
- 用户让 Agent 办一笔可疑业务，风险提示和放行的边界怎么定

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Agent 循环、工具调用 | 概念清楚 |
| 防线层 | 护栏、权限、转人工 | 有分层设计 |
| 交付层 | 回归、灰度、回滚 | 讲得出机制 |
| 合规层 | 审计、可回溯、数据安全 | 有意识有案例 |

## 简历怎么改

- 风险控制经历量化：拦截率、误伤率、事故率变化
- 稳定性设计写成独立条目：降级、兜底、回滚各自的做法
- 金融、支付、风控背景前置，这是这个岗位最对口的经历
- 别写「保障了系统稳定」这种空话，写具体机制和数字

## 项目建议

- Agent 回归门禁：用评测集做发布前卡点，坏版本自动拦截
- 转人工机制：置信度判断加会话交接，量化误转率与漏转率
- 蚂蚁全部方向的题库见[蚂蚁集团公司聚合页](/interview/company/antgroup)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：交付风险与安全[题库速答](/interview/qa)过两遍；转人工与回滚两道题准备到机制级
- 21 天：做一个带回归门禁的 Agent 项目；[简历体检](/tools/resume)
- 45 天：完整走 [Agent 应用开发学习路线](/roadmap/agent-developer)，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
