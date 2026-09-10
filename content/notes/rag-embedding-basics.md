---
slug: "rag-embedding-basics"
title: "Embedding 到底把什么变成了向量？相似不等于正确"
excerpt: "Embedding 把文本放进可比较的语义空间，但不理解权限、时间和业务优先级。做 RAG 的第一步，是先知道它能做什么，也知道它做不到什么。"
series: "RAG"
seriesNo: "03"
number: "10"
minutes: 21
---

面试官问：“Embedding 是怎么工作的？”

很多回答从“把文本转成向量”开始，一路讲到维度和余弦相似度，然后就停了。听起来没错，工程上最危险的误会也从这里开始：**相似，不等于正确；靠近，不等于有权限。**

## 先给一个能复述的答案

Embedding 模型把文本映射到一个向量空间，使语义相近的内容在这个空间里距离更近。检索时，把问题和文档块编码后用相似度找候选。但向量只表达训练数据学到的语义关系，不能自动判断版本、权限、时间有效性和事实真伪，所以生产 RAG 必须把元数据过滤、关键词检索、重排和评测放在向量召回之外。

## 一、向量表达的不是“知识点”，而是关系

同一句话换一种说法，向量通常仍然会靠近；一个错误的答案，如果用词和问题很像，也可能被排到前面。Embedding 适合回答“哪些片段可能相关”，不适合单独承担“哪一条一定正确”。

常见的相似度包括余弦相似度、点积和欧氏距离。选哪一个要看模型训练方式和索引配置，不能把三个名字当成可互换的装饰品。更重要的是，线上要记录相似度分布，而不是只记录 top-k 的文本。

## 二、文本为什么通常不是一个向量

检索文本时至少要区分三种信息：

| 信息 | 作用 | 典型问题 |
| --- | --- | --- |
| 词元级表示 | 保留局部词义和句法关系 | 长文本中细节容易被平均 |
| 句子/段落级表示 | 做语义匹配和召回 | 专有名词可能被稀释 |
| 文档级表示 | 体现主题和整体语境 | 粒度太粗，难以直接回答 |

工程上经常把文档切块后再编码，就是在用段落级向量换取可定位性。块越长，语境越完整；块越短，定位越精确。这个取舍要回到真实问题集验证。

## 三、为什么“换个更大的 Embedding 模型”不是万能药

如果问题来自版本号、错误码或产品缩写，关键词检索可能比语义向量更可靠；如果问题跨越多个段落，单个 chunk 再强也补不回缺失上下文；如果文档过期，向量只会很认真地召回旧答案。

上线前我会做四组对照：原模型、候选模型、关键词、混合检索。固定同一批问题，比较 Recall@k、MRR、延迟、重复率和最终引用正确率。只看一两个“答对了”的 Demo，等于拿天气预报验证气候模型。

## 四、Embedding 失败怎么定位

1. 查询向量异常：检查语言、截断、空文本和归一化。
2. 分数整体偏低：检查模型与索引距离度量是否匹配。
3. 召回内容相关但不完整：回到分块和父子块策略。
4. 专有名词命中差：加入 BM25、别名词典或查询改写。
5. 结果正确但不可用：检查权限、版本和更新时间过滤。

![Embedding 检索流水线：离线把文档变成可观测的索引，在线再用同一套编码约定找候选](/images/notes/rag-embedding-basics/vector-pipeline.svg)

## 五、先把“编码一致性”钉死

Embedding 最常见的线上事故，不是模型突然失去语义能力，而是离线和在线偷偷用了两套规则：文档入库时做了归一化，查询时没做；文档用 `model-v2` 编码，查询服务还在用 `model-v1`；索引按点积建，服务端却把分数当余弦相似度解释。

这类问题看起来像“召回变差”，实际上是协议不一致。每个向量集合至少要记录下面这些字段：

| 字段 | 作用 | 发生变化时怎么办 |
| --- | --- | --- |
| `embedding_model` | 知道向量由谁产生 | 新建索引或完成兼容性验证 |
| `dimension` | 检查查询和文档维度 | 直接拒绝不匹配请求 |
| `metric` | 余弦、点积或欧氏距离 | 与建索引配置保持一致 |
| `normalization` | 记录是否 L2 归一化 | 线上线下使用同一约定 |
| `content_hash` | 追踪原文和重复入库 | 变更时增量更新 |
| `source_version` | 过滤旧版本知识 | 进入上下文前再次校验 |

可以把这些字段看成“向量的身份证”。没有身份证，分数再高的向量也不该直接进生产上下文。

## 六、相似度公式很短，误读它的代价很长

对两个向量 \(q\) 和 \(d\)，余弦相似度是：

\[
\operatorname{cos}(q,d)=\frac{q\cdot d}{\|q\|_2\|d\|_2}
\]

它只看方向，不看长度。把向量归一化后，余弦相似度与点积排序一致；没有归一化时，点积可能把“向量更长”误当成“语义更相关”。面试里不要只背公式，最好顺着公式说出工程后果：距离度量改变，分数分布会改变，阈值不能照搬。

下面这段最小代码足够用于离线 sanity check。它不是生产索引，却能快速发现模型输出、归一化和度量解释是否对齐：

```python
from math import sqrt

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = sqrt(sum(x * x for x in a))
    nb = sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)

query = [0.8, 0.4, 0.1]
candidates = {
    "same_intent": [0.7, 0.45, 0.12],
    "same_words_old_version": [0.78, 0.2, 0.05],
}
print(sorted(
    ((name, cosine(query, vector)) for name, vector in candidates.items()),
    key=lambda item: item[1], reverse=True,
))
```

这段实验的价值不是得到一个“正确分数”，而是让你能回答：分数是否可比较、零向量怎么处理、阈值是否需要按查询类型分桶。

## 七、领域适配不只是换模型

遇到医学缩写、内部项目名或错误码命中差，第一反应常常是换一个更大的 Embedding。更稳的顺序是先看数据和查询：

1. **别名是否齐全**：把 `权限 403`、`ERR_AUTH_403`、`auth forbidden` 是否视为同一概念记录下来。
2. **问题是否完整**：用户只输入“403”时，先做查询改写或补充会话上下文。
3. **负例是否有区分度**：训练或评估样本要包含“词很像但答案不同”的 hard negative。
4. **片段粒度是否合适**：同一长文里多个产品都出现“登录失败”，需要靠 metadata 和标题路径区分。
5. **是否应该混合检索**：版本号、类名、接口路径这类 token，交给关键词路径更直接。

领域适配的验收不应只问“新模型平均分有没有上涨”，而要按查询类型拆开：自然语言问题、专有名词、错误码、多跳问题、过期版本问题分别回放。平均分上涨但错误码召回下降，线上仍然会被认为是回归。

![Embedding 空间只负责候选相关性，关键词与元数据在进入上下文前补上事实和权限边界](/images/notes/rag-embedding-basics/embedding-space.svg)

## 换 Embedding 之后还要做一次“编码一致性探针”

索引和查询只要有一侧换了模型、维度、归一化或距离度量，向量分数就失去可比性。迁移时不要只看新索引能否返回结果，而要用同一批查询同时跑旧、新编码，记录维度、范数、top-k 重合、权限过滤和引用定位；发现混用就阻断切流。

~~~yaml
embedding_consistency_probe: ecp_20260820_55
index_version: emb-v4
query_encoder: emb-v4
dimension: 1536
normalization: l2
distance: cosine
checks:
  dimension_match: true
  norm_distribution_drift: 0.03
  top10_overlap: 0.82
  tenant_filter_preserved: true
  citation_locator_preserved: true
decision: canary_ready
~~~

探针的目标不是要求新旧 top-k 完全一样，而是确认变化来自预期的编码升级，而不是查询端偷偷还在用旧模型。对错误码、版本号和接口路径，再额外跑关键词 hard case；Embedding 只负责语义候选，不应把稀有 token 的精确性一并牺牲掉。

![Embedding 编码一致性探针：模型、维度、归一化和距离要在查询与索引两侧对齐](/images/notes/rag-embedding-basics/encoding-consistency-card.svg)

### L5：为什么换 Embedding 时不能只比较平均相似度？

平均相似度看不出维度混用、权限过滤丢失和稀有 token 回归。要同时检查编码契约、top-k 重合、查询类型切片和最终引用定位，才知道新模型是真的更好，还是只把分数尺度换了。

## 八、给相似度加上业务边界

一个实用的候选打分可以写成：

\[
score(d)=\alpha\,s_{dense}(q,d)+\beta\,s_{sparse}(q,d)+\gamma\,s_{fresh}(d)
\]

这里的关键不是把三个分数硬凑成一个漂亮数字，而是先定义哪些条件是**硬过滤**，哪些条件才允许进入软排序：

- 租户、用户权限、数据隔离：硬过滤，不能靠加权分数补回来。
- 版本、地区、生效时间：通常先过滤，或明确降权并保留理由。
- 语义和关键词相关性：用于候选排序。
- 新鲜度、点击或人工置顶：只能作为业务信号，不能覆盖安全边界。

如果一个旧文档因为语义更接近而压过了当前版本，说明过滤层缺失，不是 `alpha` 没调好。面试回答中把硬约束和软排序分开，往往比报出某个模型名称更能体现工程判断。

## 九、把一次召回做成可复盘的实验

建议从 30～50 个真实问题开始，先不要追求大数据集。每个问题写清楚“最小充分证据”和不应该出现的冲突证据，然后固定以下变量：

```text
query_set = v1
embedding_model = model-v2
index_version = docs-2026-08-01
metric = cosine
top_k = [5, 10, 20]
filters = tenant + effective_at
```

每轮只改一个因素，记录：

| 观察项 | 你要回答的问题 |
| --- | --- |
| Recall@k | 正确证据有没有进入候选集？ |
| MRR / nDCG | 正确证据排得够不够前？ |
| 必要证据完整率 | 一个答案需要的片段是否齐全？ |
| 冲突版本率 | 是否把旧文档和新文档一起送入上下文？ |
| P95 检索延迟 | 质量提升是否值得成本？ |
| 引用准确率 | 最终答案有没有真的使用证据？ |

当结果不理想时，先根据 trace 定位层级，再决定改分块、改检索、改过滤还是改生成。Embedding 只承担其中一段责任。

## 十、从训练目标看 Embedding：为什么 hard negative 很重要

Embedding 不是把每个词查一个字典，而是通过训练目标让“应该靠近的文本对”靠近，让“容易混淆但答案不同的文本对”拉开。常见的对比学习目标可以写成 InfoNCE：

\[
\mathcal{L}=-\log\frac{\exp(sim(q,d^+)/\tau)}{\exp(sim(q,d^+)/\tau)+\sum_{j=1}^{m}\exp(sim(q,d_j^-)/\tau)}
\]

`q` 是查询，`d+` 是正例，`d-` 是负例，`τ` 是温度。面试时不必硬推完整梯度，但要讲清一个工程后果：负例越“像”，训练越能学到真正的区分边界；随机拿一篇完全无关的文本当负例，模型很容易得到虚假的高分。

举个客服知识库的例子：

| 查询 | 正例 | 难负例 |
| --- | --- | --- |
| “ERR_AUTH_403 怎么处理？” | 权限不足的排查与修复 | 登录失败但属于密码错误的文档 |
| “2025.3 如何开启审计日志？” | 2025.3 管理员配置 | 2024.12 的同名配置 |
| “退款多久到账？” | 退款到账时效 | 退款入口和申请流程 |

难负例不是越多越好。错误的标注会把真正的同义答案当成负例，模型学到的就会是“互相排斥的知识”。生产中应把人工复核过的 hard negative 和线上 bad case 分开追踪。

## 十一、向量空间之外的三类信息要显式建模

一个向量通常无法可靠表达以下信息：

1. **硬约束**：租户、用户权限、数据地域、保密级别。
2. **时间约束**：生效时间、废止时间、版本范围。
3. **结构约束**：错误码、SKU、接口路径、表格列名。

因此向量记录不应只有 `embedding` 和 `text`，最小 metadata 可以长这样：

```json
{
  "chunk_id": "doc-17#3.2#p4",
  "document_id": "doc-17",
  "path": ["售后政策", "退款", "到账时效"],
  "tenant_id": "acme",
  "acl": ["finance-admin", "support"],
  "source_version": "2025.3",
  "effective_from": "2025-03-01",
  "effective_to": null,
  "embedding_model": "embed-v2",
  "dimension": 1024,
  "metric": "cosine",
  "content_hash": "sha256:..."
}
```

硬约束要在进入模型上下文前过滤，不能寄希望于大模型“看懂 acl 字段”。向量负责候选相关性，metadata 负责事实边界，两者不是同一种信号。

## 十二、长文本、短文本和多语言要分开看

同一套 Embedding 参数不一定适合所有文档类型。短错误码查询需要词项精确，长政策文档需要标题路径和段落上下文，多语言资料还要验证跨语言空间是否真的对齐。

| 查询/文档 | 常见问题 | 更合适的补充 |
| --- | --- | --- |
| 错误码、SKU、类名 | 语义模型稀释精确 token | BM25、别名词典、字符 n-gram |
| 长章节 | 一个向量平均掉多个主题 | 结构分块、父子块、标题增强 |
| 中英混合 | 专有名词翻译不一致 | 双语别名、语言分桶评测 |
| 表格和代码 | 词面相似不等于结构相同 | 结构化解析、字段检索 |

评测要按这些桶拆开。一个模型在自然语言问题上平均分上涨，并不能证明它对错误码和版本号也变好了。

## 十三、索引变了，分数阈值也可能要重做

很多系统把“相似度 > 0.75 就召回”写死在配置里，但更换模型、归一化策略或索引后，分数分布可能整体移动。正确做法是保存一组正例、难负例和不可回答问题，观察分数分布，再按查询类型校准阈值。

```python
from math import sqrt

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = sqrt(sum(x * x for x in a))
    nb = sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)

def rank_candidates(query, docs):
    scored = [(doc["id"], cosine(query, doc["vector"])) for doc in docs]
    return sorted(scored, key=lambda item: item[1], reverse=True)

def recall_at_k(ranked_ids, gold_ids, k):
    return int(bool(set(ranked_ids[:k]) & set(gold_ids)))
```

这段代码适合做小规模 sanity check：验证零向量、排序和指标计算。线上索引还要考虑 ANN 召回、过滤下推、批量查询和超时，但这些优化不能改变“先把距离定义和评测口径说清楚”的顺序。

## 十四、从模型选择到上线，做一张小型对照表

面试中被问“为什么选这个 Embedding 模型”，可以用一张实验表回答，而不是只报参数量：

| 版本 | 自然语言 Recall@10 | 错误码 Recall@10 | 证据完整率 | P95 | 每千次查询成本 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `embed-v1` | baseline | baseline | baseline | baseline | baseline |
| `embed-v2` | measured | measured | measured | measured | measured |
| `bm25` | measured | measured | measured | measured | measured |
| `hybrid-v2` | measured | measured | measured | measured | measured |

表中的 `measured` 是占位符，上线前必须替换成真实回放数据。更重要的是，选择依据应同时包含质量、延迟、显存/存储和迁移成本；平均分略高但索引体积翻倍，未必是更好的生产方案。

## 十五、ANN 索引和量化也会改变召回，不要只比较模型向量

Embedding 模型相同，不代表线上候选集相同。HNSW 的 `efSearch`、IVF 的 probe 数、PQ 量化误差和向量归一化都会改变近邻边界；在短文本、错误码、跨语言和长文档切片上，误差还可能完全不同。调参时要把“精确暴力检索”当作上限，对照 ANN 的 Recall@k、延迟和显存，而不是只看平均相似度。

线上迁移可以让同一批 query 同时走 exact、旧索引和新索引，记录候选集合差异、关键证据是否丢失、ACL 过滤是否一致。若量化后平均 Recall 只掉一点，但某个安全或版本切片掉得很多，就应为该切片提高 probe、保留精确回查，或者暂不切换；一个全局阈值解决不了索引误差。

~~~yaml
ann_recall_budget: arb_20260820_74
dataset: rag-golden-v3
index_variants:
  - name: exact
    recall_at_10: 1.00
    p95_ms: 182
  - name: hnsw-fp16
    ef_search: 96
    recall_at_10: 0.985
    p95_ms: 24
  - name: ivf-pq
    nprobe: 12
    recall_at_10: 0.964
    p95_ms: 11
slices:
  error_code: {recall_delta: -0.012, action: exact_rerank}
  permission_policy: {recall_delta: -0.041, action: hold_migration}
decision: hnsw_canary_only
~~~

![ANN 召回预算卡：用 exact 作为上限，按切片比较索引误差、延迟和回查策略](/images/notes/rag-embedding-basics/ann-recall-budget-card.svg)

### L5：为什么平均 Recall@10 很高，ACL 或错误码切片仍可能不能上线？

平均值会把高频自然语言问题和低频高风险问题混在一起。ANN 误差往往集中在边界相近的切片，必须保留切片分数、关键证据丢失率和过滤一致性；高风险切片超门槛时，应精确回查或阻断迁移。


## 十六、混合检索分数要能解释“为什么进候选集”

Embedding 的相似度适合找同义表达，却不一定擅长错误码、版本号和精确数字。工程上可以把向量、词法、元数据和权限结果组合成一个候选分数，但要把每一项保留下来，避免一个总分掩盖了 ACL 过滤或版本冲突：

$$
score(d \mid q) = \alpha s_{dense}(q,d) + \beta s_{lexical}(q,d) + \gamma s_{metadata}(q,d) - \lambda p_{conflict}(q,d)
$$

这里的 `p_conflict` 不是“模型觉得可疑”，而是由版本、时间、租户和互相矛盾的证据规则计算出来的惩罚。校准时应按查询类型分别调权：自然语言问题提高 dense 权重，错误码和 API 名称提高 lexical 权重，高风险场景优先让权限与版本门禁生效。

```yaml
hybrid_score_calibration: hsc_20260820_101
query_slice: error_code
weights: {dense: 0.25, lexical: 0.50, metadata: 0.20, conflict_penalty: 0.05}
checks:
  acl_filter_before_rerank: true
  version_conflict_visible: true
  top10_key_evidence_recall: 0.98
decision: lexical_heavy_for_exact_terms
```

![混合检索校准：向量、词法、元数据与冲突惩罚共同解释候选排序](/images/notes/rag-embedding-basics/hybrid-score-calibration-card.svg)

### L5：为什么相似度最高的片段仍可能不能引用？

相似度只说明表达接近，不代表版本、权限和事实范围一致。一个旧版本的段落可能比当前规范更像问题，却不能支持答案；所以候选召回、冲突过滤和引用资格必须分开记录。


## 十七、换 Embedding 要双写索引，别一刀切

Embedding 模型升级通常伴随维度、归一化、分数分布甚至语义偏好的变化。直接覆盖旧索引会让线上 query 处在“查询向量是 v2、文档向量还是 v1”的混用状态，问题又不像接口报错那样明显。稳妥的路径是给索引加版本，先让文档双写，再让同一批 query 双跑，确认关键切片和引用链路没有回归，最后才按租户或流量灰度切换。

双写期间要保留原文和 `content_hash`，防止两个索引的文档快照不同。切换判定也不要只看平均 Recall：错误码、版本号、多跳问题和权限过滤应单独成桶；如果 v2 的相似度更高但引用定位变差，宁可回滚路由，也不要继续调一个全局阈值。

```yaml
embedding_migration: em_20260820_34
from: embed-v1-1536
to: embed-v2-2048
phases:
  dual_write: {documents: true, query_shadow: true}
  compare: {slices: [natural_language, error_code, version, multi_hop, acl]}
  canary: {tenant_percent: 5, rollback_on: [citation_drop, acl_mismatch]}
  promote: {require: [hash_match, dimension_match, evidence_replay_pass]}
invariants:
  content_hash_same: true
  query_doc_model_same: true
  old_index_readable: true
decision: keep_v1_until_v2_evidence_closed
```

![Embedding 迁移双写卡：锁定编码契约，双跑切片，对照引用后再灰度切流](/images/notes/rag-embedding-basics/embedding-dual-write-card.svg)

### L5：为什么“v2 的 Recall 更高”仍不能直接切换？

Recall 只说明候选覆盖，不能证明权限、版本和引用定位正确。切换前至少要回放 hard negative、ACL 过滤和最终引用；如果候选更多却让生成更容易混淆，生产效果反而可能下降。

## 十八、分层面试题：把“向量”讲成工程决策

### L1 基础题

1. Embedding 和普通关键词匹配的差别是什么？
2. 余弦相似度、点积和欧氏距离怎么选？
3. 为什么文本通常要先分块再向量化？
4. 相似度高为什么不代表答案正确？
5. 向量记录里为什么要保存模型版本和维度？

### L2 工程题

6. 错误码检索为什么常要加 BM25 或别名词典？
7. 如何构造 hard negative，避免把同义答案误标成负例？
8. 文档更新后，是覆盖旧向量还是新建索引版本？
9. 如何按查询类型校准相似度阈值？
10. 多语言知识库如何验证跨语言向量空间真的可用？

### L3 追问题

11. 模型换了但 Recall 上升、引用准确率下降，怎样定位？
12. metadata 过滤和向量召回哪个先做？权限场景为什么不能只靠 prompt？
13. 一个 chunk 同时包含多个产品，Embedding 为什么可能把它们平均掉？
14. 如何解释对比学习温度参数 `τ` 对分数分布的影响？
15. ANN 索引的召回损失是否值得换取延迟和存储收益？

## 60 秒面试回答

“Embedding 是把文本映射到语义向量空间，便于按相似度找候选证据。它解决的是语义匹配，不负责事实判断、权限校验和版本选择。生产里会用分块后的段落做向量召回，再结合关键词、元数据过滤和重排，并用 Recall、MRR、引用准确率和最终回答质量共同评估，而不是只看相似度分数。”

## 2 分钟展开版

“我会把 Embedding 当成候选生成器，而不是答案裁判。离线阶段先清洗、分块并保留标题路径、版本、租户等 metadata，再用固定版本的模型编码并记录维度、归一化方式和距离度量。在线阶段对查询做同样的编码，向量召回覆盖自然语言表达，BM25 或别名词典覆盖错误码和专有名词，之后做融合、去重、权限与版本过滤，必要时再 rerank。评测时按查询类型看 Recall@k、MRR、证据完整率和引用准确率；一旦 bad case 出现，先看正确片段是否进入候选集，再判断是分块、过滤、重排还是生成层的问题。”

## 容易被扣分的说法

- “相似度高就说明答案正确。”——相似度只说明候选相关。
- “把向量维度调大，效果就会更好。”——维度、训练目标和任务数据必须一起验证。
- “向量库已经做了权限过滤。”——要说清过滤执行的时机和租户隔离边界。
- “RAG 只需要 top-k。”——还要考虑版本、去重、上下文预算和证据完整性。

## 带走一张检查清单

- [ ] 查询和文档是否使用同一模型、维度、归一化和距离度量？
- [ ] 每个向量能否追溯到原文、版本、租户和更新时间？
- [ ] 错误码、版本号、别名是否有关键词或改写路径兜底？
- [ ] 评测集是否覆盖“词很像但答案不同”的 hard negative？
- [ ] bad case 能否区分召回缺失、过滤错误、重排错误和生成错误？

## 继续追问

- 多语言 Embedding 的向量空间一定对齐吗？
- 为什么同一模型换索引后分数分布会变化？
- 什么时候该用 reranker，而不是继续换 Embedding？
