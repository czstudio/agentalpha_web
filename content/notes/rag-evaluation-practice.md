---
slug: "rag-evaluation-practice"
title: "RAG 怎么评测才不自欺？把“答得像”拆开看"
excerpt: "RAG 评测不能只看最终答案。把数据、召回、证据引用和生成分层，才能知道系统究竟在哪一环掉链子。"
series: "RAG"
seriesNo: "03"
number: "13"
minutes: 22
---

Demo 演示时，RAG 像个好学生：问题熟、答案顺、引用也挂上了。上线换个版本号，或问一句带权限的问题，它就开始一本正经地胡说。

## 先给一个能复述的答案

RAG 评测至少拆成数据质量、检索质量、证据使用和最终回答四层。数据层看文档是否完整、去重、可追溯；检索层看正确证据是否进入 top-k；证据层看引用是否支持结论；生成层看答案是否准确、完整、拒答得当。每层都要有可回放样本和失败归因。

## 一、先建一套真实问题集

问题集不要全由工程师临时编。来源可以是客服工单、搜索日志、面试题、线上 bad case 和业务同学的自然问法。每个问题至少记录：标准答案、必要证据、允许的版本范围、是否应该拒答、可接受的表达差异。

## 二、四层指标分别回答什么

| 层级 | 核心问题 | 可观察指标 |
| --- | --- | --- |
| 数据 | 知识是否进得来、找得到 | 覆盖率、重复率、过期率 |
| 检索 | 正确证据是否进入候选 | Recall@k、MRR、nDCG |
| 证据 | 引用是否真的支持结论 | 引用准确率、证据完整率 |
| 生成 | 最终回答是否有用且诚实 | 正确性、完整性、拒答率、延迟 |

只看最终答案，会把四类问题压成一个分数。回答一旦错了，工程师就不知道该重切文档、换召回器、调 prompt，还是修权限过滤。

## 三、离线评测和线上观测要接起来

离线集适合做回归：模型、索引或分块策略一改，就自动重跑。线上观测适合发现新问题：用户追问、点击引用、手动点踩、答案被复制或重新提问，都能作为反馈信号。

但线上反馈不能直接当真值。用户没点击引用，可能是答案已经够用，也可能是引用坏了。反馈要和人工抽样、问题类型和版本信息一起看。

## 四、失败归因比总分更重要

每个 bad case 最少保留 query、改写 query、召回列表、重排列表、最终上下文、答案和引用。复盘时先判断：正确证据是否存在？如果存在，在哪一步掉了？如果不存在，知识库是否应该有它？这套证据链比“换个 prompt 试试”更能让系统变好。

![RAG 四层评测：数据、检索、证据、生成分别回答不同问题](/images/notes/rag-evaluation-practice/evaluation-layers.svg)

## 五、先写“可判定”的问题，不要先写指标

很多评测集一上来就列问题和标准答案，却没有说明什么算“答对”。对开放问题，至少要补三类标注：

| 标注 | 例子 | 作用 |
| --- | --- | --- |
| 必要证据 | 版本号、适用条件、操作步骤 | 判断答案是否完整 |
| 禁止内容 | 已废弃版本、无权限数据 | 判断是否发生冲突或越权 |
| 可接受变体 | 同义表达、顺序差异 | 避免把措辞差异误判成错误 |

例如“2025.3 版本怎样开启审计日志？”的标准不是“出现开启审计日志六个字”，而是必须引用 2025.3 的配置入口，并且不能把 2024.x 的参数混进来。把判定标准写清楚，后面的 Recall、Faithfulness 和人工评分才有意义。

## 六、四层评测要互相对得上

一条回答不对，可能是四层中的任意一层：

1. **数据层**：知识库根本没有当前版本，或文档被解析坏了。
2. **检索层**：正确片段存在，但没进 top-k。
3. **证据层**：片段进来了，回答却没有引用支持结论的那一句。
4. **生成层**：证据充分，模型仍然漏答、乱答或不会拒答。

因此报告不应只放一个总分，而要把每条问题的层级结果连起来。一个简单的记录结构如下：

```json
{
  "question_id": "rag-017",
  "knowledge_version": "docs-2026-08-01",
  "retrieval": {"recall_at_5": true, "mrr": 0.5},
  "evidence": {"complete": false, "conflict": true},
  "generation": {"correct": false, "refusal": false},
  "failure_stage": "evidence",
  "review_note": "引用了旧版本的默认配置"
}
```

它比“faithfulness=0.72”更能指导下一步：先修版本过滤和引用选择，而不是盲目换模型。

## 七、离线指标怎么读才不被数字骗

常见指标回答的问题不同：

| 指标 | 回答什么 | 不能说明什么 |
| --- | --- | --- |
| Recall@k | 正确证据是否进入候选 | 最终是否排在前面、答案是否使用 |
| MRR | 第一个正确结果有多靠前 | 多跳问题的证据是否齐全 |
| nDCG | 多个相关结果的排序质量 | 事实是否真的支持答案 |
| Faithfulness | 结论能否由证据推出 | 证据本身是否最新、有权限 |
| Answer Relevance | 回答是否回应问题 | 内容是否真实、引用是否充分 |
| P95 延迟 | 尾部请求有多慢 | 质量是否值得成本 |

把这些指标放在同一张表里，才能避免一个环节上涨掩盖另一个环节下降。例如 Recall@20 上升，但最终上下文重复率和 P95 延迟同时上涨，用户可能反而更不满意。

![评测回归闭环：真实问题集经过离线回放、分层比较和人工复核后，回流成下一轮回归集](/images/notes/rag-evaluation-practice/trace-loop.svg)

## 八、LLM-as-a-Judge 可以用，但不能当唯一真值

大模型裁判适合做规模化初筛，例如判断回答是否覆盖必要步骤、引用是否与结论相关。但它有几个明显风险：偏好更长的回答、被漂亮措辞影响、对不同模型有位置偏差、遇到边界问题时标准不稳定。

更稳的做法是：

- 先用规则检查硬条件：是否出现版本、错误码、必需字段、引用 ID。
- 对开放质量再用 judge，并固定 rubric、示例和输出格式。
- 抽样做人工盲评，比较 judge 与人工的一致性。
- 每次更换 judge 模型或 rubric，都保留旧版本在回归集上的结果。

```text
score = hard_rule_gate AND human_calibrated_judge
```

这里的 `AND` 是决策逻辑，不是把两个分数直接相乘。硬条件不满足时，回答不能因为“语言很顺”拿到高质量结论。

## 九、线上反馈要回流，但不能直接当标签

用户点了“有帮助”，不一定代表引用正确；用户没有点击引用，也可能只是已经得到答案。线上信号更适合作为样本发现器：

| 信号 | 可能意味着 | 需要补什么 |
| --- | --- | --- |
| 连续追问 | 首次回答不完整或不清楚 | 检查证据完整率与对话上下文 |
| 复制答案 | 内容有用，但不代表正确 | 抽样核验引用 |
| 点踩 | 可能是事实错、格式差或权限问题 | 结合人工标签归因 |
| 重新搜索同一问题 | 召回或表达没有命中 | 看改写与关键词路径 |

把线上 bad case 加入回归集前，先确认问题、知识版本和用户权限，避免把一次临时数据缺失固化成错误标准答案。

## 十、一次实验怎样才算可复现

评测报告至少锁定：

```text
dataset_version = rag-golden-v3
embedding_model = model-v2
reranker = reranker-v1
knowledge_snapshot = docs-2026-08-01
prompt_version = answer-v7
judge_rubric = rubric-v2
runtime = python + retrieval-service image digest
```

如果只保存最终答案截图，不保存这些版本，就无法判断质量变化来自数据、模型、提示词还是运行环境。对 Agent 或 RAG 来说，“能再次跑出相同 trace”比“当时看起来不错”更接近工程证据。

## 十一、先把一条题目写成 golden case

评测集的最小单位不是“问题 + 一段标准答案”，而是一个可以被不同实现重复判定的 golden case。它至少要把可回答范围、必须出现的事实、必须引用的证据、禁止出现的内容和版本条件写清楚：

```json
{
  "id": "rag-017",
  "question": "2025.3 怎样开启审计日志？",
  "answerable": true,
  "reference_answer": "在管理后台的安全设置中开启，并重启审计服务。",
  "required_claims": ["配置入口", "重启条件"],
  "required_evidence": ["doc-2025.3-audit#L18-L31"],
  "forbidden_claims": ["2024.x 的旧参数"],
  "accepted_variants": ["审计日志", "操作审计"],
  "knowledge_version": "docs-2026-08-01",
  "should_refuse": false
}
```

多跳问题还要把证据链拆开标注：第一跳找到订单，第二跳找到退款规则，第三跳确认用户身份。这样“答案大致对但漏了一跳”不会被一个总分掩盖。

## 十二、指标公式要能解释，不只会报名字

面试时不要只说“我们看 Recall、MRR 和 Faithfulness”，要能说明它们分别在系统哪一层起作用：

| 指标 | 一个可复述的定义 | 适合定位的故障 |
| --- | --- | --- |
| Recall@k | 正确证据进入前 k 个候选的比例 | 召回器、查询改写、过滤条件 |
| MRR | 第一个正确结果排名的倒数平均值 | 首条证据是否足够靠前 |
| nDCG@k | 按相关度和位置加权的排序质量 | 多个证据的排序是否合理 |
| Claim coverage | 必要结论被证据支持的比例 | 多跳漏证据、引用不完整 |
| Citation precision | 引用中真正支持结论的比例 | 引用错段、引用装饰化 |
| Unsupported rate | 没有证据支持的结论占比 | 幻觉、过度推断 |
| Reject precision / recall | 拒答请求里拒对、该拒是否都覆盖 | 过度自信或过度拒答 |

例如 Recall@5 上升而 Claim coverage 下降，通常不是“检索变好了”，而是候选变多后上下文混杂；P95 变差而 MRR 不变，则应先查候选数量、重排和上下文 token 预算。

## 十三、LLM-as-a-Judge 要有 rubric 和硬门槛

大模型裁判适合规模化初筛，不适合独自决定质量。先用规则检查硬条件，再让 judge 判断开放质量，最后用人工盲评做校准：

```json
{
  "grounded": {"score": 0, "reason": "结论没有对应证据"},
  "complete": {"score": 1, "reason": "覆盖配置入口，漏掉重启条件"},
  "citation": {"score": 0, "reason": "引用了旧版本文档"},
  "final": "reject"
}
```

建议固定同一套 rubric、正反例和输出格式，并记录 judge 模型版本。若硬规则发现版本号错误、引用不存在或答案包含禁止内容，直接判定失败，不能因为表达流畅而被高分掩盖。每次更换 judge 模型，都要在旧回归集上同时跑新旧结果，再抽样比较人工一致性。

## 十四、把评测接进索引发布和 CI

评测不是上线前的一次报告，而是索引、Embedding、重排器和 Prompt 的发布门。一个最小回归脚本可以这样组织：

```python
from dataclasses import dataclass

@dataclass
class Gate:
    recall_at_5: float = 0.85
    claim_coverage: float = 0.90
    unsupported_rate: float = 0.05
    p95_latency_ms: int = 1800

def pass_gate(metrics: dict, gate: Gate) -> bool:
    return (
        metrics["recall_at_5"] >= gate.recall_at_5
        and metrics["claim_coverage"] >= gate.claim_coverage
        and metrics["unsupported_rate"] <= gate.unsupported_rate
        and metrics["p95_latency_ms"] <= gate.p95_latency_ms
    )
```

CI 里要同时保存新旧版本的逐题结果，而不是只保存均值。均值不变也可能意味着一半题目变好、另一半题目全坏；发布检查应至少标出新增失败题、权限题和高价值业务题的变化。

## 十五、失败归因剧本：先判断证据在哪里消失

把 bad case 按第一处异常归类，比把所有问题都归到“模型不聪明”更有用：

| 归因 | 典型现象 | 下一步动作 |
| --- | --- | --- |
| 数据缺失 | 正确文档根本不在快照里 | 补采集、版本和覆盖率检查 |
| 解析/分块失败 | 文档在库里，关键句被拆散 | 修解析器、父子块和结构保留 |
| 召回失败 | 正确片段不在 top-k | 改查询、混合召回或过滤顺序 |
| 重排失败 | 正确片段进候选却排到后面 | 查特征、candidate-k 和模型版本 |
| 证据使用失败 | 证据充分，答案漏引用或拼错 | 调上下文编排、引用选择和 Claim 检查 |
| 权限/版本失败 | 答案引用了用户不可见或旧版本内容 | 前置 ACL、有效期和快照过滤 |
| 系统失败 | 超时、截断、工具错误导致空上下文 | 查 trace、重试、熔断和预算 |

复盘单至少保留 `question_id`、`knowledge_version`、`retrieval_trace`、`evidence_trace`、`answer`、`failure_stage` 和 `review_note`。这样修复后能精准重跑原题，而不是凭印象再问一遍。

## Golden case 还要写“允许不回答”

很多评测集只有一个标准答案，默认模型必须回答。但企业知识库里有些问题本来就应该拒答、澄清或等待权限；如果不把这些分支写进 golden case，系统会因为“答得像”而得到高分：

~~~yaml
golden_case_contract: gc_fc898d
question_id: q_policy_ambiguous_07
question: "新旧报销制度冲突时，差旅补贴按哪一版？"
expected:
  mode: clarify
  answer: null
evidence_required:
  - policy_version
  - effective_date
refusal_trigger:
  - version_missing
  - user_scope_unknown
regression_owner: finance-knowledge
decision:
  status: accepted
  note: "不允许用旧制度猜测当前规则"
~~~

golden case 至少要区分 answer、refuse 和 clarify 三类结果，并把触发条件写成可判定的规则。这样评测的不只是“是否说出了某句话”，还包括系统在证据不足时有没有停下来。线上新增的高价值拒答样本可以进入回归集，但要保留当时的知识版本和权限上下文，避免以后换库后判定漂移。

![Golden case 契约把回答、澄清、拒答和证据条件一起固定下来](/images/notes/rag-evaluation-practice/golden-case-contract.svg)

## L5：为什么评测集必须给拒答样本单独打标签？

因为“没有答案”本身就是一种正确行为。没有拒答标签，评测器会奖励模型编造一个听起来完整的答案；单独标出 clarify 和 refuse，才能把证据不足、权限不足和版本冲突纳入回归，而不是只测模型的表达能力。

## 十六、分层面试题：从“看起来对”到“证据可验”

### L1：基础判断

1. 为什么 RAG 评测不能只看最终答案？
2. Recall@k、MRR 和 nDCG 分别在回答什么问题？
3. 什么是 golden case？一条题目必须标哪些字段？
4. 为什么线上点击不能直接当真值？
5. 什么情况下应该把问题标记为“应该拒答”？

### L2：工程设计

6. 如何为一个版本频繁更新的知识库设计回归集？
7. 如果 Recall@20 上升但答案质量下降，你先查哪几步？
8. 如何判断问题出在解析、分块、召回、重排还是生成？
9. LLM-as-a-Judge 的 rubric 如何做人工校准？
10. 如何把权限题、过期题和多跳题放进同一套评测？

### L3：系统取舍

11. 如何设计索引发布的质量门禁，避免均值掩盖关键题回退？
12. 没有标准答案的开放问答，如何构造可判定的证据标准？
13. 如何评测拒答的 precision 和 recall，并避免过度拒答？
14. 评测发现引用正确但答案仍然错，如何定位 Claim coverage 与生成问题？
15. 离线回归、线上反馈和人工复核怎样接成一条持续运转的改进流程？

## 评测报告要把“覆盖”和“校准”分开

RAG 评测常见的误区是只报一个总分。一个系统可能 Recall 很高，却把旧版本证据排在前面；也可能答案正确率不错，但遇到证据不足时从不拒答。报告至少要把覆盖、排序、证据支持和行为校准拆开，并把每个指标绑定到可回放样本。

```yaml
golden_report: rag_eval_20260820_03
dataset: support-golden-v4
metrics:
  retrieval_recall_at_20: 0.91
  citation_support: 0.86
  unsupported_rate: 0.04
  refuse_when_missing: 0.78
  p95_ms: 640
slices:
  stale_version: {n: 60, citation_support: 0.71}
  missing_evidence: {n: 40, refuse_when_missing: 0.92}
  multi_hop: {n: 80, claim_coverage: 0.83}
decision:
  status: canary
  blocker: "stale_version citation_support < 0.80"
```

这里的 `refuse_when_missing` 不是“越高越好”的单一指标：在应该回答的问题上拒答会损失覆盖，在证据不足的问题上不拒答又会增加幻觉。要按 golden case 的 action 标签分别看 answer、clarify 和 refuse，才能知道系统是不会答，还是不该答却硬答。新索引或 reranker 发布前，先在同一份 golden set 上做版本对照，再把失败样本回放到具体检索阶段。

![RAG 评测报告把覆盖、支持、拒答和切片阻断条件放在同一张可回放卡上](/images/notes/rag-evaluation-practice/evaluation-release-card.svg)

### L5：为什么不能用一个总准确率代表 RAG 质量？

总准确率会把“检索不到”“证据没用上”“应该拒答却编造”等不同故障揉成一个数字。拆成召回、证据支持、行为校准和成本后，才能决定修索引、重排、提示词还是验收器。

## Golden case 也要像代码一样做版本和变更审查

评测集不是一张永远不变的题库。文档版本更新、业务规则变化或标注者发现新 bad case 后，golden case 的答案、必要证据和“应该拒答”的标签都会变化。如果直接覆盖旧标签，模型分数的变化就无法解释：到底是系统退化，还是题目换了。我的做法是每条 case 保存 `case_version`、来源证据哈希、标注理由和变更类型，评测报告同时对比当前集和冻结基线集。

新增 case 先进入 shadow 集，经过双人复核或事实回读后再晋升为 blocking 集；删除 case 不做物理删除，而是标记失效原因。这样既能保留历史报告，又能避免过期事实继续阻断发布。

```yaml
golden_case_change: gcc_3011d2
case_id: rag-0172
from: v3
to: v4
change: source_version_bump
evidence:
  old_hash: sha256:old...
  new_hash: sha256:new...
labels:
  expected_action: answer_with_citation
  required_version: api-v4
review:
  annotators: [a12, a19]
  disagreement: 0
  source_readback: pass
promotion: blocking_after_shadow_7d
baseline: keep_v3_for_regression
```

![Golden case 版本卡：证据哈希、标签理由和 shadow 晋升路径一起留痕](/images/notes/rag-evaluation-practice/golden-case-version-card.svg)

### L5：为什么评测集里的“旧题”不能直接删掉？

旧题能说明模型在历史版本上的行为是否回归，也能帮助定位一次变更到底影响了什么。可以把它从当前 blocking 集移出，但要保留版本、失效原因和历史分数，不能让报告失去时间轴。

## 评测集还要防止“证据泄漏”

如果 golden case 的答案、引用片段或标准拒答理由已经被写进 prompt 模板、缓存或训练样本，离线分数会提前告诉模型该怎么答。这个问题很像数据泄漏：不是模型真的检索到了证据，而是评测资产已经变成了暗示。我的做法是给 case 做 provenance 扫描，检查 prompt、缓存、训练集和索引快照的交集；发现泄漏就把该题降为诊断集，不能继续作为 blocking 指标。

```yaml
eval_leakage_scan: els_8c8240
case_id: rag-0172
sources:
  prompt_templates: pass
  few_shot_cache: pass
  train_snapshot: overlap_detected
  retrieval_index: pass
overlap:
  token_jaccard: 0.18
  evidence_hash_match: true
action:
  blocking: false
  quarantine: diagnostic_only
  owner: eval-data
retest: fresh_case_required
```

![RAG 评测泄漏扫描卡：检查 prompt、缓存、训练集和索引快照的证据交集](/images/notes/rag-evaluation-practice/eval-leakage-scan-card.svg)

### L5：为什么分数很高还要怀疑评测泄漏？

高分如果伴随引用片段高度重复、不同模型差距异常缩小或只在旧题上成立，就可能是评测资产被模型间接看到。把泄漏扫描和新鲜 case 回放设成发布前检查，才能区分能力提升和答案被提前透露。

## 60 秒面试回答

“我们把 RAG 评测拆成四层：数据质量、检索质量、证据使用和最终生成。用真实问题集回放，分别看覆盖率、Recall@k、MRR、引用准确率、答案正确性和拒答率；线上再采集追问、点击和人工抽样。每个 bad case 保留完整 trace，先定位掉链环节，再决定改数据、检索、重排还是生成。”

## 2 分钟展开版

“我会把 RAG 评测拆成数据、检索、证据和生成四层。先从客服工单、搜索日志、面试题和线上 bad case 建问题集，为每条问题标注标准答案、必要证据、禁止内容、版本范围和是否应该拒答。离线看覆盖率、Recall@k、MRR；证据层看引用准确率和完整率；生成层看正确性、完整性、拒答率、延迟和成本。LLM-as-a-Judge 只做规模化辅助，硬条件和人工盲评负责校准。每条失败样本保留 query、改写、召回、重排、上下文、答案和引用，先定位掉链环节，再决定改数据、检索、重排还是生成。”

## 容易被扣分的说法

- “最终答案准确率高，所以 RAG 做得好。”——没有分层就无法定位回归。
- “Recall 高就代表答案一定对。”——证据可能被误用或版本冲突。
- “LLM 裁判可以替代人工。”——裁判需要规则、校准和盲评。
- “线上点击率就是金标准。”——反馈信号要经过人工和版本核验。

## 带走一张检查清单

- [ ] 问题集是否标注必要证据、禁止内容和可接受变体？
- [ ] 数据、检索、证据、生成四层是否各有指标？
- [ ] 每条 bad case 是否保留完整 trace 和版本信息？
- [ ] judge 是否有固定 rubric、人工抽样和一致性校准？
- [ ] 新 bad case 是否经过核验后才进入回归集？

## 继续追问

- 没有标准答案时，如何做人工评测？
- LLM-as-a-judge 如何避免评委偏差？
- 如何把评测集接入 CI，防止索引更新后质量回退？
