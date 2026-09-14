---
slug: "rag-grounded-evidence"
title: "RAG 答案看着对，怎样证明它有依据？"
excerpt: "引用一个文档链接不等于有依据。验证 RAG 答案时，要把结论拆成可核查的 claim，再检查证据是否覆盖、矛盾，以及是否来自正确版本。"
series: "评测"
seriesNo: "09"
number: "40"
minutes: 19
---

产品经理问：“这个季度的退款率是多少？”RAG 返回一段流畅总结，还附了三个链接。点开才发现：一个是上季度报告，一个只支持订单量，还有一个来自测试环境。

答案看起来对，和答案确实有依据，是两件事。RAG 的引用评测不能只检查“有没有链接”，还要检查每个可验证的结论，是否由正确、足够、可定位的证据支持。

## 把问题拆开之后

我会把回答拆成 claim，再把 claim 和证据建立可计算的支持关系：先测召回是否找到金标准证据，再测证据是否覆盖结论，接着检查引用的版本、权限、时间和范围，最后评估答案有没有超出证据。一个引用完整的答案也可能把两份互相矛盾的报告拼在一起，所以还要加入冲突检测和无证据拒答。评测结果应同时给出 retrieval、grounding、citation、faithfulness 四层指标，而不是一个“看起来正确”的总分。

![RAG 依据评测把问题、claim、证据和最终答案连成可计算的图](/images/notes/rag-grounded-evidence/grounding-graph.svg)

图 1：引用质量的最小单位不是文档，而是 claim 与证据之间的关系。

## 一、先把答案拆成 claim

“本季度退款率下降了 2 个百分点，主要因为风控策略上线。”至少包含两个 claim：一个是数值变化，一个是因果解释。它们可能需要不同证据，不能指望一条链接包打天下。

可以用规则和模型混合拆分：数字、日期、实体、因果词优先显式标记；长句再由模型给出候选，最后交给结构化校验。

```json
{
  "answer_id": "ans_042",
  "claims": [
    {"id": "c1", "text": "本季度退款率为 3.2%", "type": "metric"},
    {"id": "c2", "text": "较上季度下降 2 个百分点", "type": "comparison"},
    {"id": "c3", "text": "下降主要因为风控策略上线", "type": "causal"}
  ]
}
```

拆 claim 的目的不是把文字弄复杂，而是让“哪句话错了、缺什么证据”有落点。

## 二、四层指标分别回答什么

| 层级 | 问题 | 示例指标 |
| --- | --- | --- |
| Retrieval | 正确证据有没有被召回 | Recall@k、MRR、nDCG |
| Coverage | 证据覆盖了多少 claim | claim coverage、support rate |
| Citation | 引用是否指向正确位置 | citation precision、span overlap |
| Faithfulness | 结论有没有超出证据 | entailment、unsupported rate |

### Retrieval 高，不代表答案有依据

检索集里有正确报告，并不代表模型用的是它。生成时可能引用了相邻段落，或者把旧版本与新版本混在一起。因此要把“召回到”和“被使用”分开测。

### Citation 不能只看链接存在

至少检查四件事：引用是否真实存在、是否指向具体段落/表格单元格、来源版本是否正确、它是否支持当前 claim。链接到一整篇 80 页文档，定位能力仍然很弱。

## 三、把支持关系做成矩阵

```text
              E1 本季报告   E2 上季报告   E3 风控复盘
C1 3.2%           ✓             -             -
C2 -2pp           ✓             ✓             -
C3 因风控下降      -             -             ?
```

`?` 代表证据可能相关，但没有明确支持因果关系。评测器不能把相似度高当成因果成立；因果 claim 需要实验、对照或报告中的明确结论。

```json
{
  "claim_id": "c3",
  "evidence": ["report-2026-q2#p8"],
  "relation": "insufficient",
  "reason": "报告描述相关性，没有对照实验或因果声明"
}
```

![claim 与证据的支持、矛盾和不足关系](/images/notes/rag-grounded-evidence/support-matrix.svg)

图 2：把“支持”从二元标签扩成支持、矛盾、不足和无关，才能处理真实报告。

## 四、证据要带时间、范围和版本

同一个指标在“自然月”“财务季度”“中国区”与“全球”里的值可能完全不同。证据对象至少带：

```json
{
  "evidence_id": "report-2026-q2#table-4-row-7",
  "document_version": "2026-07-08",
  "valid_time": ["2026-04-01", "2026-06-30"],
  "scope": {"region": "CN", "product": "all"},
  "locator": {"page": 8, "table": 4, "row": 7},
  "text": "退款率 3.2%"
}
```

答案中的时间、范围和单位也要标准化后比对。不要让评测器因为“3.2%”这个字符串出现过，就认为它支持所有季度和所有地区。

## 五、无依据时，拒答比编一个数字好

评测集一定要包含不可回答样本：证据里没有答案、证据互相冲突、用户权限不足、问题超出时间范围。验收的不是“模型能不能说点什么”，而是它能否明确说明缺口：

```text
我在当前可访问的报告中只找到 2026 年第二季度的退款率，
没有找到“风控策略上线导致下降”的对照证据。
如果你需要，我可以继续检索实验复盘或只报告已确认的 3.2%。
```

这类回答应计入 grounded success，而不是被当成模型“没答出来”。

## 六、自动评测和人工评测怎么配合

规则最适合做硬检查：数字、单位、版本、引用 ID、敏感字段、JSON schema。程序比对适合做可执行事实：数据库值、表格计算、日期范围。语义蕴含模型可筛选“证据是否支持 claim”，但必须抽样人工校准，尤其是因果、建议和模糊表达。

```python
def grounded_score(answer, evidence):
    claims = split_claims(answer)
    rows = [check_claim(c, evidence) for c in claims]
    return {
        "coverage": mean(r.covered for r in rows),
        "citation_precision": mean(r.citation_ok for r in rows),
        "unsupported_rate": mean(r.relation == "unsupported" for r in rows),
        "conflicts": [r for r in rows if r.relation == "contradictory"],
    }
```

不要只让同一个生成模型既写答案又给答案打分。评测器的提示词、模型版本和阈值都应纳入实验记录。

## 七、证据冲突时，先判断“哪个世界有效”

冲突不一定意味着某一份文档错了。可能是一份是财务口径，另一份是运营口径；也可能是不同生效日期、地区或权限范围。评测器应先比较证据的 `valid_time`、`scope`、`document_version` 和来源优先级，再决定是合并、要求澄清，还是拒答。

```text
E1：2026-07-08，财务口径，CN，退款率 3.2%
E2：2026-07-10，运营口径，Global，退款率 4.1%
结论：不能直接判矛盾；先确认用户问的是哪个口径和范围
```

![证据冲突经过时间、范围和来源优先级判定后再进入回答](/images/notes/rag-grounded-evidence/conflict-resolution.svg)

图 3：先确定证据适用的世界，再判断它们是否真的互相矛盾。

## 八、claim 拆分和评测器也需要校准

Claim splitter 过度拆分，会把一句正常解释拆成几十个无法独立判断的碎片；拆分过粗，又会掩盖某个数字或因果关系的错误。可以抽样建立人工标注集，比较拆分的一致性，并按事实、比较、因果、建议四类分别统计。

评测器同样要做校准：固定一批“充分支持、相关但不足、明确矛盾、证据缺失”的样本，观察不同模型和阈值的混淆矩阵。高风险场景宁可把“不确定”交给人工，也不要为了提高自动通过率把不足证据判成支持。

## 九、把 grounding 做成可回放的证据件

线上发现一句话不可信时，最有用的不是保存最终答案，而是保存一份最小证据件：问题、claim、引用片段、检索时的过滤条件、文档版本、评测器判定和最终动作。它既能让人工复核，也能在模型、索引或规则变化后重跑。

```json
{
  "trace_id": "rag-721",
  "claim": "退款到账时间为 3 个工作日",
  "evidence": [{"doc": "policy-v4", "page": 6, "quote": "..."}],
  "retrieval": {"query": "退款 到账 工作日", "top_k": 8, "filters": {"region": "CN"}},
  "judge": {"relation": "supported", "confidence": 0.91},
  "action": "answer_with_citation"
}
```

回放时要固定当时的索引快照和评测器版本；否则今天重新检索得到另一段证据，却把差异误认为模型变好了。对高风险 claim，可以额外保存“遮掉关键证据后的答案”和“换成旧版本后的答案”，看系统是否按预期拒答或提示版本变化。

![RAG 证据件把 claim、检索快照、评测器判定和最终动作串成一条可回放链路](/images/notes/rag-grounded-evidence/grounding-replay.svg)

图 4：grounding 不只是一个分数，而是一份能复核、能重跑、能解释动作的证据件。

## 给 grounding 报告加一张“证据覆盖表”

最终只报一个 faithfulness 分数，仍然看不出哪类 claim 在漏。更实用的报告会按 claim 类型、证据状态和动作分层：

| 切片 | claim 数 | 有效支持 | 证据不足 | 冲突 | 正确拒答 | 主要动作 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 数字与单位 | 320 | 287 | 18 | 15 | 16 | 规则复算 + 人工抽样 |
| 时间与版本 | 240 | 198 | 21 | 21 | 19 | 版本过滤 |
| 因果与建议 | 180 | 121 | 42 | 17 | 38 | 独立 Judge |

这里的分母是 claim 数，不是回答数。一个回答里有四个 claim，只支持了两个，不能因为回答整体“读起来流畅”就算完全正确。报告还要同时给出严重漏判率：把“证据不足”判成支持，通常比把一条普通说明转人工更危险。

![Grounding 报告按 claim 类型拆分支持、不足、冲突和正确拒答](/images/notes/rag-grounded-evidence/grounding-coverage.svg)

发布门槛也按切片写：例如数字类有效支持率不低于 95%，高风险冲突漏判为 0；因果类可以允许更多人工复核，但不能用数字类的平均分把它掩盖。

## 十、常见错误

- 只统计“有无引用”，不检查引用是否支持具体 claim；
- 用向量相似度替代事实蕴含和版本校验；
- 把因果、建议和事实放在同一个准确率里；
- 不测试证据缺失和证据冲突，逼模型每次都给结论；
- 只保留最终答案，不保存 claim、证据定位和评测器理由。

## 面试官的三层追问

### L1：怎么证明 RAG 答案有依据？

先把答案拆成 claim，再检查每个 claim 是否有正确证据、引用是否定位到具体片段、版本和范围是否匹配，最后测有没有超出证据或忽略冲突。

### L2：引用率高为什么还会幻觉？

因为“引用存在”不等于“引用支持”。模型可能用相关但不充分的段落、旧版本或另一地区的数据来包装结论，所以要做 claim-level grounding。

### L3：证据不足时怎么评分？

如果任务要求可靠回答，明确拒答并说明缺口应判为成功；强行给出无依据结论才是失败。评测集要有不可回答样本，避免激励模型编造。

### L4：两份报告数字不同，评测器应该怎么做？

先对比生效时间、地区、统计口径和来源优先级。若适用范围不同，要求模型澄清；若同一范围同一时间仍冲突，回答应显式呈现冲突并拒绝擅自选一个数字。

### L5：为什么不能让生成模型自己给 grounding 打分？

同一个模型容易把自己的措辞当成证据，形成自洽但不可靠的闭环。硬字段用规则和程序校验，语义蕴含用独立评测器并抽样人工复核，模型、版本和阈值都要记录。

### L5：如果 claim 拆分器本身拆错了，grounding 分数还有意义吗？

不能直接相信。先在人工标注集上评估拆分的漏拆和过拆，再把拆分错误与证据判断错误分开报告。对高风险数字、时间和权限 claim，可以用规则模板补充模型拆分；只有当 claim 边界稳定，后面的覆盖率和拒答率才有可比性。

### L5：为什么正确拒答也需要证据？

因为拒答本身可能错：系统也许已经拿到足够证据，只是过滤或 claim 拆分出了问题。拒答要带检索范围、版本、权限和缺口原因，才能复核“确实没有依据”，而不是把所有困难问题都用一句“无法回答”掩盖。

## 证据缺口也要发一张处置单

当证据不足时，系统不应该只返回一句“我不确定”。把缺口、已检索范围、拒答动作和补证路径结构化，既方便用户补充，也方便评测器判断拒答是否正确：

```yaml
claim_id: c-27
statement: "2025Q4 的退款率为 2.8%"
evidence_status: insufficient
searched:
  scope: [finance-dashboard, monthly-report]
  versions: [r16]
missing: "2025Q4 归档尚未授权"
action: refuse_with_reason
next_request: "请提供有权限的 Q4 报表或确认统计口径"
hard_rule: "不得用 2024Q4 数字替代"
```

这张处置单把“没有找到”与“找到冲突”区分开：前者可以请求补充权限或资料，后者必须展示冲突来源和适用范围。评测集要同时覆盖两种情况，否则模型会被奖励成一个永远给数字的回答器。

![证据缺口处置单把 claim、检索范围、缺口原因、拒答动作和补证路径固定下来](/images/notes/rag-grounded-evidence/grounding-gap-ticket.svg)

## Claim 关闭前要有一张“证据闭环卡”

证据缺口处置单解决“现在为什么不能答”，但一个 claim 什么时候可以关闭，还需要更细的闭环条件。把检索、定位、校验、冲突处理和最终动作写成状态机，能避免只因为找到一段相似文本就过早放行：

```yaml
claim_closure: cc-20260820-12
claim: "退款到账时间为 3 个工作日"
states: [retrieved, located, validated, conflict_checked, closed]
evidence:
  - doc: policy-v4
    locator: p6:table-02:row-3
    scope: CN
    valid_from: 2026-07-01
checks:
  quote_supports_claim: true
  unit_and_scope_match: true
  newer_conflict: false
  citation_rendered: true
decision: answer_with_citation
owner: support-rag
```

`located` 只表示找到了候选片段，`validated` 才表示范围、时间和单位匹配，`conflict_checked` 还要确认没有更新版本或另一口径。只有所有检查通过，状态才进入 `closed`；否则回到补检索、澄清或拒答。这个状态链也让回归集能准确指出是召回漏了、定位错了，还是规则没有挡住版本冲突。

![Claim 证据闭环卡：从检索、定位到校验和关闭都留下可回放状态](/images/notes/rag-grounded-evidence/claim-closure-card.svg)

## claim 关闭前还要做一次“反向证据检索”

正向检索能找到支持句，却不一定能发现更新版本、限定条件或相反结论。比如一条政策说明写着“可以退款”，另一份同日生效的地区公告可能把范围缩到某些省份。为了避免把局部证据说成普遍事实，我会在关闭 claim 前发起一次反向探针：主动搜索否定词、版本号、适用范围和冲突来源。

~~~yaml
inverse_grounding_receipt: igr_a38002
claim_id: refund-window-cn
answer_version: answer-184
source_snapshot: policy-2026-07-01
negative_probe:
  queries: ["不适用", "例外", "暂停", "地区限制"]
contradiction_probe:
  newer_sources: 0
  narrower_scope_found: true
observed: scope_limited_to_CN_standard_orders
decision: answer_with_scope_and_citation
~~~

反向检索不是把答案故意推翻，而是确认答案的边界。若发现更窄的范围，就把 claim 拆成“普遍规则”和“例外条件”，分别绑定证据；若发现同级冲突，则保持 `open`，请求人工裁决或补充时间点。这样引用不再只是装饰，而是和结论的适用范围一起验收。

![反向证据检索卡：支持证据、冲突探针和范围收窄一起决定 claim 是否关闭](/images/notes/rag-grounded-evidence/inverse-grounding-card.svg)

### L5：为什么有引用也不代表 claim 被完整支持？

引用只证明某段文字存在，不能自动证明时间、地域、对象和因果关系都匹配。关闭 claim 前必须主动寻找例外和更新版本，否则“有出处”仍可能是过时或过度外推。

### L5：为什么“找到相关段落”仍不能关闭 claim？

相关只说明主题接近，不等于支持具体数字、时间或因果。关闭前至少要核对定位、范围、版本、单位和冲突；缺一项就应该保持开放状态。

## 证据链还要保存“反证”和新鲜度

很多 grounding 报告只记录支持答案的段落，却不记录检索到的反例。这样模型即使忽略一条更新后的政策，评分也可能看起来很高。更稳的做法是同时保存支持证据、冲突证据、文档版本和检索截止时间，让评测器判断答案是否主动处理了冲突。

```yaml
claim_review:
  claim: "退款申请需要在 30 天内提交"
  support: [{doc: policy_v4, span: p2#7, valid_to: 2026-12-31}]
  counter_evidence: [{doc: policy_v5, span: p1#3, valid_from: 2026-07-01}]
  retrieval_cutoff: 2026-08-20T09:30:00Z
  decision: blocked
  reason: "同一主题存在更新版本，回答未说明适用时间"
  next_action: "按 effective_at 重排并要求引用版本"
```

![支持与反证的证据链](/images/notes/rag-grounded-evidence/support-counterevidence-card.svg)

反证不一定推翻答案，但它会改变答案的边界：需要补充时间、地区、产品版本或“以最新公告为准”。对于政策、价格、接口文档这类会变的知识，grounding 的核心不是引用越多越好，而是能否证明引用的世界和问题发生的世界一致。

### L5：为什么反证也要进 golden set？

因为它能测出系统是否只会找支持自己答案的段落。构造 golden case 时可以刻意放入新旧版本、例外条款和相似但不适用的文档，分别评估召回、版本判断、冲突解释和拒答。这样“引用率高但答错”的问题才会暴露出来。

## Claim ledger 要把“支持、反证、缺口和动作”放在同一行

很多系统把引用拼在答案末尾，评测时却无法知道哪条引用支持哪句话。更实用的是维护 claim ledger：每个 claim 有自己的 evidence_ids、反证、适用范围、freshness budget 和动作标签。claim 之间不能互相借证据；一条引用只覆盖它真正支撑的范围，缺口则明确触发 `clarify`、`refuse` 或 `human_review`。

这张账本也能让生成阶段变得更保守。模型可以把多个已关闭 claim 组合成答案，但只要其中一个仍是 `open`，最终结论就不能写成确定语气。线上回放时记录 claim 的关闭时间和证据版本，文档更新后重新打开相关 claim，而不是继续使用旧答案缓存。

```yaml
claim_ledger: clg_6dd977
answer_id: ans_8842
claims:
  - id: c1
    text: "退款需在 30 天内提交"
    evidence_ids: [policy_v5_p1_3]
    counter_ids: [policy_v4_p2_7]
    scope: "中国大陆标准订单"
    freshness_until: 2026-12-31
    status: closed_with_scope
  - id: c2
    text: "特殊渠道同样适用"
    evidence_ids: []
    status: open
actions:
  open_claim: clarify_or_refuse
  expired_evidence: reopen_and_retrieve
  mixed_scope: split_claim
decision: answer_c1_only
```

![Claim ledger：每条结论独立绑定支持、反证、范围和动作，未关闭的 claim 不进入确定答案](/images/notes/rag-grounded-evidence/claim-ledger-card.svg)

### L5：为什么一条长引用不能覆盖整段答案？

长引用往往同时包含规则、例外和不同版本，不能证明每个 claim 都被支持。把答案拆成 claim，逐条绑定定位和范围，才能发现某一句其实是模型自行外推；覆盖不了就保持开放或改成有条件的表达。

## 聊透之后怎么收尾

RAG 答案看着对，不代表有依据。我会把答案拆成 claim，分别评测检索召回、证据覆盖、引用定位和事实忠实度。每个证据带版本、时间、范围、权限和页码或表格单元格，先确认它支持的是哪一个 claim，再检查是否存在冲突或因果过度推断。数字和单位用规则、数据库或程序复算，语义蕴含用模型筛选并人工抽样校准。评测集必须包含证据缺失、旧版本、跨地域和互相矛盾的样本；在这些情况下，带理由的拒答比编一个看似完整的答案更可靠。

## 带走一张检查清单

- [ ] 是否把答案拆成可验证的 claim？
- [ ] 是否区分召回、覆盖、引用和忠实度？
- [ ] 证据是否带版本、时间、范围和精确定位？
- [ ] 是否测试因果过度推断与证据冲突？
- [ ] 是否把可解释拒答计入成功样本？

## 相关笔记

- [RAG 怎么评测才不自欺？把“答得像”拆开看](/notes/rag-evaluation-practice)
- [多模态 RAG 怎样把图片、表格和文字一起查出来？](/notes/multimodal-rag)
- [让 LLM 给答案打分，为什么也会偏？](/notes/llm-judge-calibration)

## 参考

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
