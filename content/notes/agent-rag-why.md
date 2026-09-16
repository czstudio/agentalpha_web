---
slug: "agent-rag-why"
title: "你的 Agent 项目为什么要用 RAG？不用会怎样"
excerpt: "知识会更新、数据不能公开、答案必须带出处、上下文装不下时，检索才值得加。"
series: "项目深挖"
seriesNo: "11"
number: "51"
minutes: 26
---

面试官经常问：“你们项目为什么用了 RAG？不用不行吗？”

如果只回答“因为模型有幻觉”，追问很快就来了：提示词不能解决吗？微调不行吗？知识量不大为什么还要向量库？检索错了怎么办？

## 这一轮分析的结论

RAG 适合解决“知识在模型参数之外、会变化、需要按权限取用并且要给出处”的问题。它不是所有 Agent 的必选项：稳定的通用知识可以直接交给模型，严格结构化查询应优先走数据库或 API，实时状态应调用工具。判断标准是知识变化速度、私有性、引用要求、查询结构和可接受延迟，而不是“行业都在用”。

![是否使用 RAG 的判断树：知识变化、私有性、结构化和引用要求](/images/notes/agent-rag-why/rag-decision-tree.svg)

![RAG 原论文的检索器—文档索引—生成器结构图](/images/notes/evidence/rag/figure-1-architecture.svg)
*论文图：Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks，Figure 1；[原文](https://arxiv.org/abs/2005.11401)。*

![RAG 从问题到引用答案的证据链](/images/notes/agent-rag-why/rag-evidence-loop.png)

## 先聊四个躲不开的问题

### 知识是不是经常变化

每天更新的库存、制度、产品价格，不适合只靠微调。微调改变的是模型行为分布，不是每次更新一条事实；把变化快的内容写进参数，更新和回滚都昂贵。

### 知识是不是私有或租户隔离

企业合同、客户档案和内部手册不能假设模型预训练时见过，更不能把所有租户数据混在一个上下文里。RAG 可以在查询时按身份取证，但权限仍要由系统强制执行。

### 答案需不需要引用和审计

客服、合规和研究场景常常要回答“依据在哪”。RAG 能把来源片段一起带入生成，但必须保存版本和定位；仅仅加一个链接不代表答案被证据覆盖。

### 问题能不能直接查结构化系统

“订单总额是多少”通常应该调用订单 API；“这份合同的自动续费条款怎么写”才适合文档检索。把结构化查询硬塞给向量库，既慢又难验证。

## RAG 与微调、工具调用怎样分工

可以把三者理解成不同的职责：

| 机制 | 解决什么 | 典型输入 | 主要风险 |
| --- | --- | --- | --- |
| RAG | 取回外部知识 | 文档、网页、知识库 | 召回错、版本旧、泄露 |
| 微调 | 改变模型行为 | 标注样本、风格、格式 | 过拟合、更新慢 |
| 工具调用 | 获取或改变实时状态 | API、数据库、业务动作 | 权限、副作用、超时 |

一个 Agent 可以先检索制度，再调用审批 API，最后用模型组织回答。不要因为项目用了 RAG，就把所有外部动作都包装成“查文档”。

![RAG、工具调用与模型生成在一次 Agent 任务中的分工](/images/notes/agent-rag-why/rag-evidence-loop.svg)

## 用证据覆盖率判断 RAG 是否真的有用

“答案更像了”不是指标。可以把答案拆成 claims，计算证据覆盖率：

```text
evidence_coverage = 被有效证据支持的 claim 数 / 可核查 claim 总数
```

同时记录召回 Recall@k、引用定位准确率、拒答准确率和延迟。如果不使用 RAG 的基线已经能稳定回答，RAG 反而增加了延迟和错误来源，就应该考虑移除或缩小检索范围。

```python
def answer(question, ctx):
    route = classify(question)
    if route == "structured":
        return call_business_api(question, ctx.identity)
    if route == "stable_general":
        return llm(question)
    evidence = retrieve_with_acl(question, ctx.identity)
    if not evidence.complete:
        return ask_or_refuse(evidence.reason)
    return generate_with_citations(question, evidence)
```

路由本身也要评测。路线选错，模型再强也救不了。

## 不用 RAG 会怎样？

不用 RAG 不一定错，但你要承认替代方案的边界：

- 用工具替代：事实实时、结构化、可执行，查询成本可控；代价是要维护 API 和权限适配器。
- 用微调替代：内容稳定、样式和行为要求高；代价是更新、撤回和逐条引用困难。
- 用长上下文替代：文档少、一次性任务；代价是 token 成本高，且长文档中的定位和冲突更难处理。
- 直接提示词替代：规则短、变化少；代价是无法承载大量私有事实。

真正成熟的回答不是“RAG 万能”，而是说清楚为什么本项目选它，以及什么情况下会切换路线。

![RAG 的边界：变化知识、实时状态、稳定行为和结构化查询分别走不同路径](/images/notes/agent-rag-why/rag-boundaries.svg)

## 先做路由，不要把所有问题都送进检索

一个实用的 Agent 通常先判断问题类型，再选择知识、工具或模型路径：

| 问题类型 | 首选路径 | 需要的证据 |
| --- | --- | --- |
| 稳定通用概念 | 直接生成 | 模型能力边界 |
| 私有、可引用文档 | RAG | chunk、版本、ACL |
| 实时结构化状态 | API / SQL 工具 | request_id、回执 |
| 需要改变状态 | 写工具 + 审批 | capability、幂等 |
| 证据冲突或不完整 | 澄清 / 拒答 | 缺口原因、下一步 |

路由器也要有拒答能力。比如用户问“现在库存还有多少”，却只提供了三个月前的文档，正确行为不是把旧文档当实时库存，而是调用库存工具或说明无法确认。

![问题路由把稳定知识、私有文档、实时状态和写操作分到不同路径](/images/notes/agent-rag-why/rag-routing-matrix.svg)

图 4：RAG 是路径选择的一部分，不是所有请求的默认中间件。

## RAG 上线要有渐进式开关

不要第一次上线就让检索结果决定所有回答。可以分四步：

1. **观测模式**：检索但不影响回答，记录召回、权限和延迟。
2. **影子模式**：和旧链路并行，比较证据覆盖、拒答和成本。
3. **受控灰度**：只对一类问题或少数租户启用，保留无 RAG fallback。
4. **扩大范围**：达到硬门槛后逐步放量，异常时按路由开关回退。

每一步都要记录“检索是否被采用”。如果召回正确但模型一直不用，问题可能在上下文格式；如果模型频繁引用旧版本，问题在版本过滤，不要笼统归因于“模型不行”。

## 召回失败要区分“没搜到”和“不能回答”

检索器返回 top-k 不是答案。至少保留候选分数、过滤原因、版本、权限和是否完整：

```json
{
  "found": true,
  "usable": false,
  "reason": "permission_filtered",
  "candidates": 8,
  "visible": 0,
  "next_action": "ask_for_access"
}
```

`found=true`、`usable=false` 和 `no_match` 是不同情况。前者说明系统知道可能存在资料但用户无权看到，后者才是没有匹配。把两者都变成空上下文，会让模型编出一个看似合理的答案。

## RAG 的维护成本也要放进决策

除了第一次接入，还要估算解析器升级、索引重建、权限同步、删除传播、评测集维护、监控和人工复核。一个知识库如果每天只有几十次查询，却要维护复杂的多路召回和专用 GPU，成本可能超过直接工具查询。

可以用单位成功任务成本比较路线：

```text
rag_total = ingestion + index + retrieval + rerank + llm + review
tool_total = api_gateway + query + permission + llm + review
```

选 RAG 的理由应该包含质量增益和运维代价；当知识变少、更新变慢或引用要求降低时，也要允许把路线切回工具或长上下文。

## 把 RAG 选择写成一笔可回滚的账

面试官追问“增益值不值得”时，可以把一次成功任务的成本拆开，而不是只报向量库价格。下表数字是演示口径，帮你对齐「该看哪几个指标」，不是实测：

| 项目 | 无 RAG | RAG | 需要观察的证据 |
| --- | ---: | ---: | --- |
| 单次延迟 | 420ms | 760ms | P95、超时率 |
| 单次模型成本 | 1.0x | 1.35x | token、重排调用 |
| 证据覆盖率 | 58% | 91% | claim coverage |
| 拒答准确率 | 64% | 88% | 无答案、过期、越权集 |

![RAG 选型把质量增益、延迟成本和回滚开关放在同一张决策账上](/images/notes/agent-rag-why/route-cost-ledger.svg)

只有当“单位成功任务成本”下降，或新增的引用、权限和新鲜度价值足以覆盖成本时，RAG 才值得长期维护。实验还要保留无 RAG 回退开关，避免把一次灰度结果变成不可逆架构决定。

## 用一组反事实问题验证路由理由

给同一批问题分别关闭 RAG、关闭工具、只保留长上下文，再比较失败类型。若关闭 RAG 后只有引用覆盖下降，说明它承担的是证据职责；若关闭 RAG 后连实时库存也答错，说明路由器把工具问题误送进了文档链路。把这种差异写进项目复盘，比一句“RAG 能减少幻觉”更有说服力。

## 四个常见坑

### 为了展示技术栈强行接 RAG

一个只有十条固定 FAQ 的机器人，接向量库只会增加部署和调试成本。先做无检索基线，再用指标证明检索带来的增益。

### 把召回到的内容都塞进去

召回越多不等于证据越强。噪声会让模型把相似但不相关的条款拼在一起。需要重排、去重、版本过滤和上下文预算。

### 检索没有权限边界

“先搜出来再在 Prompt 里要求不要泄露”不是权限控制。过滤必须在检索层或策略网关强制执行，并有跨租户回归集。

### 只测有答案的问题

资料不存在、已过期或用户没有权限时，正确行为可能是拒答或追问。没有拒答集，RAG 很容易用相似片段编一个确定答案。

## L1 / L2 / L3 追问：从选型到上线

**L1：** 为什么项目要用 RAG？

因为关键知识是外部、私有、持续变化且需要引用的；查询时取回证据比把所有事实固化在参数里更容易更新和审计。

**L2：** RAG 和微调怎么选？

知识变化和引用要求优先选 RAG；稳定的行为、格式和领域表达优先考虑微调。二者可以组合，但要分别评估事实准确率和行为稳定性。

**L3：** RAG 召回错了怎么办？

先把召回、重排、版本和权限拆开评测，保留候选与过滤日志；生成前判断证据是否覆盖，覆盖不足就追问、换检索或拒答，不能让模型默默补全。

**L1：** 什么问题不适合 RAG？

稳定通用知识、实时结构化状态和需要写入业务系统的动作，通常分别走模型、API 或工具；RAG 不是默认中间件。

**L1：** RAG 和长上下文有什么区别？

RAG 先筛选外部证据，适合知识多、变化快和需要权限；长上下文适合文档少的一次性任务，但 token、定位和冲突成本更高。

**L1：** 为什么要保留无 RAG 基线？

没有基线就无法证明检索带来增益，甚至可能把额外延迟和召回噪声误当成技术进步。

**L2：** 如何设计一个问题路由器？

根据知识私有性、实时性、结构化程度、写入风险和引用要求分类，输出路径与理由；路由错误要进入单独评测集。

**L2：** 检索到的资料为什么不能直接放进 Prompt？

还要做权限过滤、版本过滤、去重、重排、完整性判断和上下文投影；否则敏感、过期和相似噪声都会污染回答。

**L2：** RAG 灰度时如何保留安全回退？

先观测和影子运行，再按问题或租户灰度；保留无检索链路和路由开关，异常时可以立即回到旧版本。

**L2：** `found=true` 但 `usable=false` 代表什么？

说明可能存在匹配资料，但被权限、版本或敏感策略过滤。应解释缺口并申请权限或转人工，不能说系统没有这条信息。

**L3：** RAG 和工具调用如何组合？

先检索制度或说明文档得到约束，再调用实时 API 或写工具完成动作，最后用带版本引用的证据解释结果；两条链共享 identity 和 trace。

**L3：** 如何证明 RAG 的收益值得维护成本？

对比无 RAG、工具和 RAG 路线的任务成功、证据覆盖、拒答、延迟、索引与人工维护成本，按单位成功任务成本做决策。

**L3：** 资料冲突时 Agent 应该怎么回答？

展示来源版本、生效时间和冲突字段，优先当前有效版本；无法判断时明确列出冲突并请求业务确认，不要自行合并成新规则。

**L4：** 如果 RAG 只提升引用覆盖率，却让延迟翻倍，是否应该保留？

先按场景拆分：合规、合同等必须引用的路径可以接受更高预算，普通 FAQ 则应收窄检索或走缓存。最终按风险分层比较单位成功任务成本，而不是全站平均延迟。

**L5：** 如何用实验区分“RAG 没价值”和“检索实现有问题”？

分别比较无 RAG、理想证据注入和真实检索三组：理想证据也无提升，说明任务不需要 RAG；理想证据有提升而真实检索没有，问题在召回、版本、权限或上下文投影，应继续拆层定位。

## RAG 路由记录要把“为什么不用它”也留下

路由器常见的日志只有 `route: rag`。这对调试不够，因为真正重要的往往是：为什么一个问题没有查库，为什么选择了结构化 API，为什么某次明明命中了文档却仍然拒答。每次路由都应该留下候选、理由、证据和可回滚的结果：

```json
{
  "route_id": "route_e308ab",
  "question_type": "current_order_status",
  "candidates": ["rag", "orders_api", "clarify"],
  "selected": "orders_api",
  "reason": ["freshness_required", "structured_source_available"],
  "policy": {"tenant": "team-alpha", "freshness_max_min": 5},
  "evidence": ["intent=order_status", "api_health=green"],
  "fallback": "rag_with_citation",
  "outcome": {"status": "verified", "latency_ms": 210},
  "replay": "artifact://router/route_e308ab"
}
```

记录 `candidates` 能看出路由器是否只会偏爱 RAG，`reason` 让“没查库”成为可讨论的选择，`outcome` 把选型与真实结果连起来。线上出现失败时，可以用同一问题重放候选打分，再判断是意图识别错、数据新鲜度不够，还是路由规则把风险切片漏掉了。

“不用 RAG”不是反技术，而是把检索放在适合它的地方：需要私有、变化频繁且可引用的知识时用 RAG，需要强一致状态时优先业务 API，关键信息缺失时先向用户澄清。日志把这些判断写出来，系统才会越跑越聪明，而不是越堆组件越复杂。

![RAG 路由选择记录](/images/notes/agent-rag-why/rag-route-decision-record.svg)

## 路由放行前还要核对“数据新鲜度契约”

选择 API 还是 RAG，不只看数据类型，还要看这次请求允许多旧的数据。订单状态可能只容忍 5 分钟，产品手册可以接受一周，合同条款则要绑定生效版本。如果路由器只记录“选了 API”，却没有记录 freshness budget，线上就无法解释一次看似正确、实际已经过期的回答。

~~~yaml
freshness_gate_receipt: fgr_915dc5
route_id: route_3f2e1a
intent: current_order_status
freshness_budget_min: 5
candidates:
  api: {source_age_min: 1, health: green}
  rag: {source_age_min: 480, citation_ready: true}
selected: api
fallback: clarify_or_wait
decision: pass_with_api
~~~

放行时把来源时间戳、租户范围和最大允许年龄一起写入回执。若 API 健康但数据已经超过预算，就不能因为“工具可调用”而强行回答；可以切到带时间范围的 RAG，或者明确告诉用户正在等待刷新。这样新鲜度成为路由契约，而不是事后解释的借口。

![RAG 路由新鲜度门：来源年龄、预算和降级动作共同决定是否放行](/images/notes/agent-rag-why/freshness-gate-card.svg)

### L5：为什么 API 健康也可能不能回答？

健康只说明接口能返回数据，不说明数据足够新。实时问题必须同时通过可用性和 freshness budget 两道门，否则“200 OK”仍可能是过期答案。

### L5：路由器总选择 RAG，怎样证明它不是随机偏好？

准备一组反事实问题：把同一意图分别接入 API、RAG 和澄清分支，固定模型与预算，只改变路由候选；比较新鲜度、引用完整性、成功率和成本。如果 RAG 没有在适合的切片上占优，就要调整特征和门槛，而不是继续加更多检索器。

## 用 shadow replay 验证“该不该走 RAG”

路由器最容易被一句“知识私有，所以走 RAG”带偏。真实请求里，问题可能同时需要实时 API、私有文档和澄清；如果只看最终答案，无法知道是路由选对了，还是模型靠猜补齐了。更可靠的做法是对同一批脱敏请求做 shadow replay，把候选路径并行跑一遍，但只允许主路径产生副作用：

1. **Direct**：不检索，测模型已有知识和拒答边界；
2. **RAG**：按租户、版本和新鲜度检索，测证据覆盖与引用；
3. **API**：调用结构化实时源，测时效与字段完整性；
4. **Clarify**：缺权限、缺参数或来源冲突时，测澄清是否比猜测更安全。

回放结果不能只保留最终分数，还要保留“如果换路径会发生什么”的反事实证据：

```yaml
route_shadow_replay: rsr_bff308
replay_set: route-cases-v6
cases: 480
candidate_paths: [direct, rag, api, clarify]
comparison:
  direct:
    task_success: 0.61
    evidence_coverage: 0.22
  rag:
    task_success: 0.78
    evidence_coverage: 0.91
    p95_ms: 840
  api:
    task_success: 0.83
    freshness_pass: 0.97
    p95_ms: 510
  clarify:
    unsafe_guess_rate: 0.02
gates:
  permission_leak: 0
  stale_answer_rate: 0.03
decision: route_by_slice
```

从这张表可以看出：知识引用问题偏向 RAG，当前状态偏向 API，缺权限问题宁可澄清。`route_by_slice` 比“全量切到 RAG”更诚实，也方便后续按问题类型做灰度和回滚。

![RAG 路由影子回放：同一请求并行比较直答、检索、API 和澄清路径](/images/notes/agent-rag-why/route-shadow-replay-card.svg)

### L5：shadow replay 会不会把真实工具调用执行两次？

影子路径必须只读或使用模拟器，写操作统一拦截；回放记录调用意图、参数校验和预计副作用，不让候选路径直接触碰生产状态。这样既能比较路由，又不会为了评测制造重复订单或重复写入。

## 路由还要记录“证据缺口的责任归属”

同一个失败答案可能有三种完全不同的原因：路由根本没选对源，源选对但检索没召回，或者证据已到上下文却被生成模型忽略。如果只记最终 `route=rag`，修复很容易落错层。我会在路由回执里预留责任字段，把缺口拆成 `selection`、`retrieval`、`projection` 和 `generation`，并为每类缺口绑定下一步诊断动作。

```yaml
evidence_gap_attribution: ega_6a27db
request_id: req_781
selected: rag
checks:
  source_selection: pass
  candidate_recall: pass
  context_projection: fail
  citation_generation: blocked
gap_owner: projection
next_action: inspect_context_budget_and_dedupe
replay_artifact: artifact://router/req_781
decision: fix_projection_before_retraining
```

![RAG 路由证据缺口归因卡：把失败归到选源、召回、投影或生成具体环节](/images/notes/agent-rag-why/evidence-gap-attribution-card.svg)

### L5：为什么最终答案错了，不能直接怪模型？

因为模型可能根本没拿到正确证据，或证据在权限、去重、上下文预算阶段被截断。先用 trace 判断缺口责任，再决定改路由、索引、投影还是生成，才能避免用训练去掩盖数据链路问题。

## 回到面试：怎么聊这个话题

我不会把 RAG 当成项目标配。先看知识是否私有、变化快、需要引用和按权限取用；实时结构化数据走工具，稳定通用知识直接由模型处理，只有外部文档事实才走检索。项目里会建立无 RAG 基线，比较召回、证据覆盖率、拒答准确率、延迟和成本。RAG 的价值是可更新、可追溯的证据，不是把向量库接上之后模型就自动变聪明。

## 交付前检查清单

- [ ] 有无 RAG 的基线和路由理由
- [ ] 文档检索、结构化查询和实时工具边界清楚
- [ ] 召回前完成租户和权限过滤
- [ ] 版本、删除、冲突和引用定位可追溯
- [ ] 评测包含无答案、越权和过期问题
- [ ] 记录 RAG 带来的准确率增益与延迟成本

## 相关阅读

- [RAG 不只是“向量库 + 提示词”：证据怎样一路到答案？](/notes/rag-retrieval-pipeline)
- [Embedding 到底把什么变成了向量？相似不等于正确](/notes/rag-embedding-basics)
- [工具调用怎么做权限控制和审计？](/notes/tool-permission-audit)
- [从零设计企业知识库 Agent，第一张图该画什么？](/notes/enterprise-knowledge-agent-design)

## 资料来源

- Lewis et al.，《Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks》，arXiv:2005.11401，2020。RAG 原论文。
