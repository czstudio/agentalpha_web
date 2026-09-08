---
slug: "agent-system-design-interview"
title: "系统设计题怎么答：先问用户，再画 Agent"
excerpt: "系统设计面试不是比谁先画出十几个服务。先问清用户、成功标准和不能碰的边界，再把状态、工具、证据、评测和上线风险一项项接起来。"
series: "通用与软实力"
seriesNo: "12"
number: "74"
minutes: 24
---

系统设计题常见开场是：“请设计一个企业知识 Agent”“做一个能执行任务的 Copilot”。如果马上画模型、向量库和消息队列，往往还没回答真正的问题：谁在用、成功是什么、什么动作不能自动做、数据多久更新、失败如何恢复。好的回答是一棵需求树，不是一张组件海报。

## 先给一个能复述的答题框架

我会按六步展开：

1. **目标**：用户、任务、成功定义和不可接受失败；
2. **约束**：数据、权限、时效、成本、延迟和合规；
3. **边界**：哪些由 Workflow 固定，哪些由 Agent 选择；
4. **状态**：任务、证据、工具副作用、审批和恢复状态；
5. **指标**：结果、过程、证据安全、体验和成本；
6. **演进**：先做最小闭环，再用实验和事故复盘扩大能力。

![Agent 系统设计从需求树到上线回退](/images/notes/agent-system-design-interview/design-tree.svg)

## 先问五个澄清问题

| 问题 | 为什么要问 |
| --- | --- |
| 用户要完成什么任务？ | 防止把聊天 Demo 当产品 |
| 成功如何验收？ | 决定评测和是否允许自动执行 |
| 哪些数据和工具可用？ | 决定 RAG、权限和能力边界 |
| 哪些动作有副作用？ | 决定审批、幂等和回退 |
| 延迟、成本和规模上限？ | 决定模型、缓存和异步化 |

如果面试官不给细节，就声明假设并继续：例如“先按每租户 10 万份文档、读多写少、P95 3 秒、写操作需审批设计”。假设本身也是设计输入。

## 用一张状态图串起组件

一个可解释的 Agent 系统至少有这些状态：

```text
created → planned → retrieving → awaiting_approval → executing
    ↘ needs_clarification       ↘ failed / unknown → reconciled
                                      ↘ committed
```

模型负责理解目标、选择候选动作和生成结构化计划；程序负责状态转换、权限、预算、工具执行、证据记录和终态提交。把这些责任混在一个 prompt 里，系统就无法回放。

## 参考架构的最小切面

```text
Client
  └─ API / Auth / Tenant boundary
       ├─ Task orchestrator + state store
       ├─ Planner / bounded Agent
       ├─ Retrieval + evidence store
       ├─ Tool gateway + approval
       ├─ Event / trace / replay
       └─ Evaluator + feedback loop
```

每一层都要能回答“输入、输出、失败、指标”四个问题。不要为了显得复杂引入没有责任边界的服务。

## 用成本函数做取舍

系统设计不只比较吞吐，也要比较一次成功任务的综合成本：

$$
C_{success}=C_{model}+C_{retrieval}+C_{tools}+C_{retry}+C_{human}+C_{failure}
$$

如果一个更大的模型只减少了少量澄清，却让每次请求成本翻倍，就要问是否能用路由、缓存、结构化状态或更好的证据解决。高风险动作的失败成本可能远高于 token 成本，应该在函数里显式体现。

![系统设计里结果、过程、证据和成本四类指标](/images/notes/agent-system-design-interview/metric-tree.svg)

## 从零写一个答案骨架

```yaml
scenario: enterprise_policy_agent
assumptions:
  tenants: 100
  docs_per_tenant: 100000
  p95_seconds: 3
  write_action: approval_required
design:
  workflow: [auth, budget, approval, commit]
  agent: [query_route, evidence_select, draft_answer]
  retrieval: [hybrid, rerank, citation]
metrics:
  outcome: [task_success, citation_correct]
  process: [tool_error, handoff_rate, retry_count]
  experience: [p95, time_to_first_event]
fallback: "no evidence -> ask clarification; tool unknown -> reconcile"
```

这个骨架能让面试官看到你如何从假设走到接口、指标和风险，而不是只看到名词。

## 把抽象架构落到一条真实请求

继续沿用“企业政策 Agent”这个场景：用户问“我下周去上海参加客户会议，住宿能报多少？”系统不能只返回一个金额，它需要先确认用户身份、出差日期、城市等级和当前生效政策，再决定是否要读取个人差旅档案。一个可回放的主链路可以写成：

1. `auth` 校验租户、用户和数据权限；
2. `classify` 判断这是政策问答还是需要提交申请；
3. `retrieve` 用时间、城市和政策版本过滤文档；
4. `evidence_check` 检查金额、适用对象和例外条款是否齐全；
5. `draft` 只生成带引用的说明；
6. 若用户确认提交，再进入审批 Workflow，而不是让回答 Agent 直接写入报销系统。

![企业政策 Agent 的请求链、证据链与审批边界](/images/notes/agent-project-evidence/evidence-chain.svg)

### API 和状态要分开

```json
{
  "task_id": "policy-20260822-031",
  "intent": "policy_lookup",
  "user": {"tenant": "acme", "id": "u-19", "role": "sales"},
  "question": "下周去上海参加客户会议，住宿能报多少？",
  "constraints": {"effective_at": "2026-08-29", "city": "上海"},
  "side_effect": "none",
  "reply_contract": {"must_cite": true, "ask_if_missing": ["trip_days"]}
}
```

任务 API 负责接收目标，状态存储则负责记录 `retrieving`、`needs_clarification` 和 `committed` 等事实。不要把状态塞进一段可被模型重写的对话文本里，否则重试和跨服务恢复都会变得脆弱。

## 数据模型：至少保留三类证据

| 证据类型 | 例子 | 作用 |
| --- | --- | --- |
| 输入证据 | 原问、用户身份、时间约束 | 解释任务从哪里开始 |
| 过程证据 | 查询、命中文档、工具回执 | 解释中间为什么做这个动作 |
| 结果证据 | 引用片段、审批号、终态 | 证明结果是否真的完成 |

项目汇报时只展示最终答案，会让面试官无法判断“答对”是检索有效还是模型猜中。把三类证据串成一条 `trace_id`，再按任务切片看成功率，系统才具备改进入口。

![从输入、过程到结果的项目证据链](/images/notes/agent-project-evidence/evidence-chain.svg)

## 规模题要把容量和责任说清楚

假设 100 个租户、每租户 10 万份文档、峰值 60 QPS，P95 目标 3 秒。可先做一个粗略容量表：

| 部件 | 主要容量 | 先解决的瓶颈 |
| --- | --- | --- |
| API/鉴权 | 60 QPS + 突发 | 限流、租户隔离 |
| 任务状态 | 任务数 × 状态版本 | 幂等、过期清理 |
| 检索 | 1,000 万级切片 | 过滤、召回、尾延迟 |
| 工具网关 | 外部系统并发上限 | 超时、熔断、未知结果 |
| trace/replay | 每次任务 5～20 事件 | 采样、脱敏、保留期 |

成本可以拆成：

$$
C_{task}=C_{model}+C_{retrieve}+C_{tool}+C_{trace}+C_{human\_fallback}
$$

如果某个高风险动作的人工升级成本很高，就不能只用 token 价格决定是否自动化；反过来，如果只是读政策，先做缓存和小模型路由可能比换更大模型划算。

## 两个常见失败：权限正确但答案错误，答案正确但动作越权

| 失败 | 具体表现 | 责任归属 | 设计修复 |
| --- | --- | --- | --- |
| 证据错配 | 上海政策命中成北京政策 | 检索/过滤 | `city`、`effective_at` 硬过滤，引用校验 |
| 版本过期 | 回答使用已废止上限 | 数据版本 | 生效时间和失效时间进入状态 |
| 动作越权 | 读政策顺手提交报销 | Workflow 边界 | 读写能力分离，写操作必须审批 |
| 回执丢失 | 支付已提交但 Agent 显示失败 | 工具网关 | 幂等查询、unknown、对账 |

这些例子能把“安全”从口号变成接口设计：每个失败都对应一个状态、一个指标和一个回退动作。

![Agent 系统的安全边界与工具授权](/images/notes/agent-security-boundaries/tool-mediation.svg)

## 上线演进：从离线样本到灰度

系统设计题最后要讲怎么交付，而不是停在白板：

```text
离线 200 条黄金问题
  → 影子流量（只检索不执行）
  → 5% 租户灰度（读操作）
  → 受控写操作（审批 + 幂等）
  → 按失败切片扩展能力
```

每一步都设硬门槛：引用覆盖不足、权限误命中、未知结果率或 P95 超标就停在当前阶段。灰度不是发布按钮，而是让风险逐层显露的实验设计。

```yaml
release_gates:
  citation_coverage: ">= 0.92"
  secure_recall_at_5: ">= 0.90"
  unknown_side_effect_rate: "<= 0.002"
  p95_ms: "<= 3000"
  rollback: "restore previous prompt/retriever/policy bundle"
```

## 面试中如何在 8 分钟内讲完

先用 30 秒说目标和两条假设；再用 2 分钟讲主链路和状态；接着用 2 分钟讲检索、工具和权限；用 1 分钟给出指标和容量；最后用 2 分钟讲最大风险、灰度和回退。面试官追问哪个组件，就回到“输入—输出—失败—指标”四格，不要被带进产品名罗列。

## 设计题的接口边界：四个请求，四种责任

可以用四个窄接口把系统设计说得更具体：

```text
POST /tasks                 创建任务，只接收目标和用户上下文
POST /tasks/{id}/plan       生成受限计划，不执行副作用
POST /tasks/{id}/actions    执行一个已批准动作，带幂等键
GET  /tasks/{id}/reconcile  查询未知结果和最终凭证
```

`/plan` 返回结构化动作候选和缺失字段，`/actions` 只接受注册动作，`/reconcile` 专门处理网络超时后的查询。把“规划”和“执行”放在同一个无差别接口里，重试时就很难证明请求有没有产生副作用。

| 接口 | 允许模型做什么 | 必须由程序完成什么 |
| --- | --- | --- |
| 创建任务 | 识别目标和风险 | 鉴权、租户、限流 |
| 生成计划 | 选择候选动作 | schema、预算、白名单 |
| 执行动作 | 提供结构化参数 | 权限、幂等、超时、审计 |
| 查询结果 | 解释当前状态 | 外部状态和凭证核对 |

![系统设计的接口、状态和执行边界](/images/notes/agent-metrics-baseline/metrics-scorecard.svg)

## 复杂度要由任务数量而不是服务数量解释

面试官问“如何扩展到更多租户”，可以从任务维度回答：

1. 按租户隔离状态、索引和 trace，避免一个大租户挤压其他任务；
2. 按风险分配模型和工具预算，读任务可缓存，写任务必须排队；
3. 按任务类型设置最大步数、最大证据数和人工升级阈值；
4. 按发布批次比较失败切片，不把所有流量都切到新策略。

```yaml
tenant_policy:
  default:
    concurrent_tasks: 20
    tool_calls_per_task: 6
    write_actions: approval_required
  high_risk:
    concurrent_tasks: 5
    model_route: reviewed
    unknown_action: human_reconcile
```

这比“加一层队列和缓存”更能说明系统如何在容量和责任之间做取舍。

## 追问时用反例证明边界

如果面试官问“模型自己判断是不是更简单”，可以给出两个反例：

- 模型把“查上海上限”误判为“提交报销”，因为动作集合没有随状态收窄；
- 工具已经写入但回执超时，模型把 `unknown` 改写成“失败”，重试产生重复副作用。

然后回到设计：模型负责理解和提出候选，状态机负责终态，工具网关负责授权和幂等。反例不是为了吓人，而是帮助面试官看到每条边界对应一个真实故障。

## 多租户设计：隔离的不只是数据库行

“加一个 `tenant_id`”远远不够。Agent 系统至少要同时隔离四类东西：任务状态、检索证据、模型配额和工具授权。一个租户即使查不到别人的数据，也不应该因为共享并发池而让自己的高峰拖慢其他租户。

| 资源 | 隔离策略 | 观测指标 |
| --- | --- | --- |
| 状态与 trace | tenant 分区 + 访问校验 | 跨租户读取数应为 0 |
| 检索索引 | namespace / filter 强制注入 | secure recall、误召回 |
| 模型配额 | token 与并发双桶 | p95、排队时长 |
| 工具权限 | scope + 资源白名单 | 越权拒绝率 |

面试中可以补一句：缓存 key 也必须带租户和策略版本，否则最隐蔽的泄露来自“答案本身没有查库，但命中了别人的缓存”。

## 事故演练比漂亮架构图更有说服力

设计答案收尾时，挑一个副作用窗口做演练：工具返回超时，但外部系统已经扣款；模型版本升级后 JSON 字段变了；检索索引还没完成删除。分别说明状态如何标记、谁拥有重试权、用户看到什么、何时转人工。能把这四步讲清楚，通常比继续堆组件名称更能证明设计成熟度。

## 高频追问

**L1：Agent 系统和普通问答有什么区别？**

Agent 系统有持续状态、工具动作、计划或路由、过程评测和可能的副作用；普通问答可以只返回一次文本。

**L2：为什么要把 Workflow 和 Agent 混合？**

权限、预算、审批、提交和回退需要确定性；理解和局部路径选择有不确定性，混合能控制自由度。

**L2：系统最重要的指标是什么？**

先定义任务成功和风险边界，再同时看证据正确、工具错误、人工接管、P95、成本和未知结果，单一成功率不够。

**L3：如何处理工具超时？**

区分未执行、执行失败和未知副作用；按幂等键查询、重试或对账，不能让模型自行编一段成功结果。

**L5：面试时间不够，先讲哪些？**

先讲假设、目标、主链路和两个最大风险，再补数据模型、扩展性和演进。每个组件都用输入—输出—失败—指标说明。

## 60 秒面试回答

系统设计我会先澄清用户任务、成功标准、数据权限、副作用和延迟成本约束，并声明规模假设。架构上用 Workflow 固定鉴权、预算、审批、工具提交和回退，让受限 Agent 做问题路由、证据选择和计划草拟。任务状态、证据、工具回执和 trace 持久化，检索采用混合加引用，流式事件只展示过程，终态由服务端提交。指标同时覆盖任务成功、引用正确、工具错误、人工接管、P95、成本和未知结果，先小闭环灰度，再按证据扩大能力。

## 自检清单

- [ ] 开场先问目标和约束，或明确假设
- [ ] 画出 Workflow、Agent、状态、工具和证据边界
- [ ] 能说清副作用、超时和回退
- [ ] 指标覆盖结果、过程、体验、成本和安全
- [ ] 有从 MVP 到灰度、评测和演进的路径

## 相关阅读

- [Agent 核心架构：目标、状态、行动与观察](/notes/agent-core-architecture)
- [Workflow 还是 Agent](/notes/agent-workflow-vs-agent)
- [Agent 线上可靠性](/notes/agent-deployment-reliability)
- [项目讲不深，通常是证据链断了](/notes/agent-project-evidence)

## 资料来源

- 《Agent 岗面试宝典 v3 · 精华版》（本地飞书资料整理）
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)：借鉴公式、实现、分层追问和可复习检查清单的组织方式
