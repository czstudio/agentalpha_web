---
slug: "rag-query-rewrite"
title: "RAG 查询改写不是把问题说长：别替用户补条件"
excerpt: "Query rewrite、问题拆解和假设文档，都是把用户的话翻成知识库听得懂的说法，不是让模型另起一个问题。每次改写都要能回到原问，必要时还能撤回。"
series: "RAG"
seriesNo: "03"
number: "66"
minutes: 21
---

用户问“这个政策今年还能报吗”，知识库里却写着“2026 年差旅费用报销条件”。原句直接检索，可能找不全；让模型随意改写，又可能凭空加上员工级别、城市和金额。好的 query rewrite 是受约束的翻译，不是替用户补脑。

## 先给一个能复述的答案

先判断问题是否需要改写，再生成一个或多个候选查询；每个候选都要保留原问题、改写理由、添加或删除的词，以及适用的过滤条件。检索后比较原问和改写的证据覆盖，如果改写没有带来增益，回退到原问。多跳问题才做拆解，并为每个子问题设定合并条件，避免“拆得越多越像搜索噪声”。

![查询改写的受约束闭环](/images/notes/rag-query-rewrite/rewrite-loop.svg)

## 先判断四种查询状态

| 状态 | 例子 | 策略 |
| --- | --- | --- |
| 原问足够具体 | “研发中心 2026Q2 住宿上限” | 原问 + 精确过滤 |
| 口语化但单跳 | “今年还能报吗” | 补充时间词，不补业务事实 |
| 多实体比较 | “A 和 B 的接口差异” | 拆成实体—属性子查询 |
| 目标不清 | “帮我看看这个” | 先澄清，不做高风险猜测 |

改写前先做分类，能减少一个常见错误：把所有问题都改成一段很长的自然语言，结果关键信息被淹没，过滤字段也变得不可控。

## 改写的最小约束

每个候选 query 都应该带有 lineage：

```json
{
  "original": "这个政策今年还能报吗",
  "rewritten": "2026 年差旅费用报销条件和适用范围",
  "added_terms": ["2026", "差旅费用", "适用范围"],
  "assumptions": ["用户指的是当前租户的差旅政策"],
  "filters": {"tenant": "current", "effective_at": "2026-08-22"},
  "reversible": true
}
```

`assumptions` 不是装饰。它让回答阶段知道哪些词来自模型推断，哪些词来自用户原话；一旦假设不成立，系统可以要求澄清，而不是继续扩大检索。

## 用证据覆盖率判断改写是否值得

可以用一个粗粒度的增益函数比较候选：

$$
gain(q')=coverage(q')-coverage(q)-\alpha\,assumption\_risk(q')
$$

如果改写后的证据覆盖只提升一点，却引入了大量未经确认的假设，`gain` 可能为负。实际评测可以用标注的相关文档、引用完整性和最终答案正确率近似这些项。

![原问、候选改写与证据覆盖的比较](/images/notes/rag-query-rewrite/coverage-compare.svg)

## 多跳拆解要有合并条件

“哪个方案更适合我们”可能需要先查方案 A 的限制，再查方案 B 的限制，最后按同一指标比较。拆解时要写出 join key：

```python
def decompose(question: str) -> list[dict]:
    return [
        {"id": "a", "query": "方案 A 的数据保留、延迟和成本", "join": "metrics"},
        {"id": "b", "query": "方案 B 的数据保留、延迟和成本", "join": "metrics"},
    ]

def merge(sub_answers: list[dict]) -> dict:
    if any(not x.get("evidence") for x in sub_answers):
        return {"status": "needs_clarification", "reason": "子问题证据不完整"}
    return {"status": "ready", "rows": align_by_key(sub_answers, key="join")}
```

没有合并条件的拆解，最后通常只得到几段互不相干的摘要，模型再用语言把缺口抹平。

## 一个真实的改写案例：先找出缺失字段

假设客服问：“华东仓的冷链赔付怎么算？”原问里至少缺少四个字段：赔付对象、时间版本、损坏类型和仓库范围。系统如果直接生成“2026 年华东仓冷链订单延误赔付标准”，就已经替用户补上了“2026 年”和“延误”两个未经确认的事实。更稳的流程是先把问题拆成**已知、待确认、可检索**三栏：

| 字段 | 当前值 | 是否允许自动补全 |
| --- | --- | --- |
| 地域 | 华东仓 | 可以，来自原问 |
| 业务 | 冷链赔付 | 可以，来自原问 |
| 时间 | 缺失 | 只能使用当前有效版本，不能写死年份 |
| 事件 | 缺失 | 必须澄清延误、破损或温控异常 |

因此第一轮只生成两个低风险候选：`华东仓 冷链 赔付 现行规则`、`华东仓 冷链 赔付 需要补充事件类型`。如果第一候选能命中制度目录，回答中仍要提示“请确认事件类型”；如果命中多个版本，则进入澄清，而不是让模型从标题猜结论。

![查询改写中的字段缺口与澄清分支](/images/notes/rag-retrieval-pipeline/rag-pipeline.svg)

## 候选不是越多越好：给每个候选一张评分卡

线上可以把候选控制在 1～3 个，并把评分拆成可解释的项：

$$
score(q')=0.35\,intent\_fit+0.30\,term\_coverage+0.20\,evidence\_gain-0.15\,assumption\_risk
$$

其中 `intent_fit` 判断目标是否仍然一致，`term_coverage` 判断知识库术语是否覆盖，`evidence_gain` 来自离线标注集，`assumption_risk` 则对新增的时间、金额、主体和权限字段加惩罚。分数不是让模型自报置信度，而是由检索结果和规则计算出来。

```python
def choose_candidate(original: str, candidates: list[dict], evidence: dict) -> dict:
    ranked = []
    for item in candidates[:3]:
        key = item["query"]
        gain = evidence.get(key, {}).get("coverage", 0.0)
        risk = len(item.get("assumptions", [])) / 4
        score = (0.35 * item.get("intent_fit", 0)
                 + 0.30 * item.get("term_coverage", 0)
                 + 0.20 * gain - 0.15 * risk)
        ranked.append({**item, "score": round(score, 3)})
    best = max(ranked, key=lambda x: x["score"], default=None)
    if not best or best["score"] < 0.45:
        return {"status": "fallback_original", "query": original, "candidates": ranked}
    return {"status": "selected", "query": best["query"], "candidates": ranked}
```

这段逻辑的关键不在权重是否刚好是 0.35，而在于候选、证据和回退结果都落到 trace 里。调参时可以替换权重，不能把“为什么选它”重新藏回不可观测的 Prompt。

![改写候选的覆盖率、风险和回退阈值](/images/notes/rag-grounded-evidence/claim-ledger-card.svg)

## 失败分类：改写错了，还是检索错了

上线后不要把所有低质量回答都归因于 embedding。可以按错误发生的位置切片：

| 失败类型 | 典型表现 | 修复方向 |
| --- | --- | --- |
| 意图漂移 | 原问问退款，候选变成退货流程 | 增加目标一致性判定和拒绝样本 |
| 事实臆补 | 自动加入年份、金额、用户等级 | 字段白名单；高风险字段只允许澄清 |
| 术语替换失败 | “回滚”被改成“撤销订单” | 维护同义词和领域术语表 |
| 过度拆解 | 一个单跳问题变成五次检索 | 设定拆解收益阈值和最大子问题数 |
| 证据增益为零 | 查询变长但命中仍相同 | 回退原问，检查切片和 embedding |
| 版本污染 | 新旧政策同时进入上下文 | 先做时间/版本过滤，再做改写 |

每周抽样一批“改写后反而变差”的请求，保留原问、候选、命中文档和最终引用，才能知道究竟是分类器、改写器还是检索器在丢分。

## 评测矩阵：离线看增益，线上看代价

一套可复用的评测集至少包含口语化单跳、多实体比较、带精确 token 的查询、时间冲突和无答案问题。每条样本同时记录原问基线和改写版本：

```yaml
query_rewrite_eval:
  - id: policy-014
    type: colloquial_single_hop
    question: "今年还能报吗"
    must_keep: [policy_subject, tenant]
    forbidden_additions: [employee_level, amount]
    target: [recall_at_5, citation_coverage]
  - id: error-009
    type: exact_token
    question: "ERR-429 在 v2.3 怎么处理"
    rewrite: "disabled"
    target: [exact_match, p95]
  - id: noanswer-003
    type: no_answer
    question: "下季度一定会涨价吗"
    target: [abstention_rate, hallucination_rate]
```

线上则增加三项成本：改写额外 token、额外一次检索的尾延迟、以及澄清率。只有“答案正确率上升”同时伴随“无依据回答下降或持平”，这次改写才值得保留。

![改写评测从离线样本到线上回退](/images/notes/rag-rerank-and-hybrid/hybrid-retrieval.svg)

## 交接记录应该长什么样

每次改写最后输出一张小型记录卡，便于面试讲项目，也便于线上追责：

```json
{
  "rewrite_id": "rw_20260822_018",
  "original": "华东仓的冷链赔付怎么算",
  "selected": "华东仓 冷链 赔付 现行规则",
  "added_terms": ["现行规则"],
  "blocked_assumptions": ["事件类型"],
  "evidence_gain": 0.18,
  "decision": "ask_clarification",
  "fallback": "original_query",
  "trace_id": "tr_8c2"
}
```

当用户补充“温控异常”后，可以沿用同一个 `trace_id` 生成新版本，而不是覆盖上一轮。这样既能解释为什么系统没有直接给结论，也能比较澄清前后的检索增益。

## 改写器和检索器要分开验收

如果改写之后答案变差，不能只看最终文本。建议把一次请求拆成三组对照：原问直接检索、改写后检索、原问与改写并行检索。每组都记录同一个查询集、过滤条件和 top_k：

| 对照 | 能回答什么 | 常见误判 |
| --- | --- | --- |
| 原问 | 当前系统基线 | 把低召回归因于模型 |
| 改写 | 术语扩展是否带来增益 | 把臆补造成的命中当进步 |
| 并行 | 是否应该保留原问兜底 | 候选过多导致尾延迟 |

并行结果可以用“证据并集但答案不重复”的方式合并：先按来源去重，再让生成器看到候选 query 的 lineage。不要把两组检索结果直接拼接，否则改写噪声会放大上下文长度。

![原问、改写和混合检索的证据流](/images/notes/rag-retrieval-pipeline/rag-pipeline.svg)

## 领域术语表要有主人和版本

术语表不是一份静态同义词文件。它应记录来源、适用租户、优先级和撤回时间：

```yaml
terms:
  - canonical: "温控异常"
    aliases: ["冷链温度超标", "温度不达标"]
    tenant: acme
    owner: logistics
    effective_at: 2026-06-01
    review: approved
  - canonical: "回滚"
    aliases: ["撤回版本"]
    tenant: platform
    owner: release
    review: pending
```

改写器只应使用与当前租户和版本匹配的条目；术语表冲突时进入澄清或保留原词。把同义词全局共享，可能会让不同团队的“订单”“工单”发生误替换。

## 高风险问题的改写策略

法律、财务、权限和安全问题可以采用更保守的三步：

1. 原问保留精确 token，不做自由扩写；
2. 只补充可从系统状态确定的时间、租户和版本；
3. 命中多个有效版本时先展示冲突并问一个最小澄清问题。

```json
{
  "original": "管理员能不能导出员工工资",
  "safe_rewrite": "管理员 工资导出 权限策略 当前租户",
  "forbidden_assumptions": ["管理员角色已获批", "员工已同意"],
  "next": "retrieve_policy_then_ask_if_scope_missing"
}
```

改写并不等于授权。即使候选 query 召回了正确政策，执行导出仍要走独立的权限和审批边界。

## 复盘一条错误改写

每次改写回归可以用五个问题快速定位：原问中哪个词被丢了？新增词来自哪里？候选命中了哪份文档？答案引用是否覆盖新增假设？如果换回原问，是否能得到更安全的结果？把这五问写入标注表，能积累比“这个答案不太好”更可训练的失败样本。

```yaml
rewrite_review:
  missing_terms: ["当前租户"]
  unsupported_additions: ["2026 年"]
  hit_docs: ["policy-v3#p2", "policy-v4#p2"]
  citation_gap: true
  action: "fallback_original_and_clarify_version"
```

## 什么时候不该改写

- 用户给出订单号、错误码、版本号等精确 token；
- 问题包含法律、财务、权限等高风险限定词；
- 原问已经有唯一实体和时间范围；
- 改写模型的置信度低，或无法解释添加了什么；
- 检索服务正在超时，额外一轮改写只会扩大尾延迟。

这时宁愿返回“需要补充哪个字段”，也不要把不确定性藏在漂亮的查询句子里。

## 改写输出要可解释、可撤销

改写器应同时返回原问、候选 query、增加和删除的词、触发的术语表版本以及回退理由。检索器只接收通过 schema 校验的候选，不直接执行一段自由文本提示词生成的 query。这样当召回变差时，标注员可以一眼看到是“补了错误年份”，还是“把产品名当成了公司名”。

```json
{
  "original": "上海报销上限是多少",
  "rewritten": "上海 普通员工 差旅住宿 报销上限",
  "added": ["普通员工", "差旅住宿"],
  "removed": [],
  "glossary_version": "finance-2026-08",
  "fallback": "original_if_coverage_below_0.72"
}
```

在高风险领域，改写只负责提出候选；最终的实体、时间和权限仍由检索与业务层再次确认。

## 高频追问

**L1：query rewrite 解决什么问题？**

它把口语或不完整表达映射到知识库的术语，提高召回，但不能改变用户目标。

**L2：为什么要保留原问？**

原问是语义锚点和审计依据。只有保留它，才能检测改写是否添加了未经确认的事实。

**L2：一个候选还是多个候选？**

问题歧义较大时可以生成少量候选，用相同证据和预算比较；候选越多，延迟和噪声也会增加。

**L3：多跳 RAG 和 query decomposition 有什么关系？**

拆解是把复杂目标变成子问题，多跳检索还需要沿实体、关系或时间把子结果组合起来；不是把问题简单切成几句。

**L5：如何防止改写幻觉？**

记录新增词和假设，对高风险字段使用白名单，改写后做证据覆盖检查；无增益就回退原问。

## 60 秒面试回答

我把 query rewrite 当作受约束的查询翻译。先分类原问是否需要改写，再生成少量候选，并记录原问、改写理由、新增词、假设和过滤条件。检索后用证据覆盖和假设风险评估增益，没有增益就回退。多跳问题会给子查询设置 join key 和合并条件，精确 token、高风险限定和目标不清的场景则优先保留原问或澄清，而不是让模型猜。

## 自检清单

- [ ] 能说出何时原问已经足够，不需要改写
- [ ] 改写结果保留原问、假设和新增词
- [ ] 多跳拆解有 join key 与失败路径
- [ ] 有改写增益和回退条件

## 相关阅读

- [RAG 检索流水线：从问题到证据](/notes/rag-retrieval-pipeline)
- [RAG 的切片策略](/notes/rag-chunking-strategy)
- [RAG 如何保住引用证据](/notes/rag-grounded-evidence)

## 资料来源

- 《Agent 岗面试宝典 v3 · 精华版》（本地飞书资料整理）
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
