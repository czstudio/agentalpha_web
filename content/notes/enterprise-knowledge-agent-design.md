---
slug: "enterprise-knowledge-agent-design"
title: "从零设计企业知识库 Agent，第一张图该画什么？"
excerpt: "企业知识库 Agent 第一张图不该只有模型调用，而要先画证据和权限：谁属于哪个租户、能查哪些版本、答案怎样引用、出错后怎么追溯。"
series: "项目深挖"
seriesNo: "11"
number: "50"
minutes: 27
---

面试官说：“给公司做一个能回答制度、合同和客户资料的 Agent，你从哪儿开始？”

很多人马上画出 `用户 → LLM → 向量库 → 答案`。这能证明你知道 RAG，却没回答企业真正关心的三件事：答案凭什么可信、不同员工为什么看到不同内容、资料更新后旧答案什么时候失效。

## 先给一个能复述的答案

企业知识库 Agent 应先画“数据、身份、证据”三条线，再补模型和工具。数据线负责采集、解析、切分、版本和删除；身份线把用户、租户、资源和动作传到检索与生成边界；证据线要求每个结论都能落回文档版本和页码。架构至少分 ingestion、index、retrieval、orchestration、policy、answer 和 evaluation 七层，任何一层都不能用 Prompt 代替。

![企业知识库 Agent 的七层架构与证据回路](/images/notes/enterprise-knowledge-agent-design/knowledge-agent-architecture.svg)

## 第一张图：数据从哪里来，答案回到哪里去

画图时先标清三种对象：原始文档、可检索片段、对用户展示的证据。它们不是同一个东西。

原始文档要保留来源、所有者、租户、版本、有效期和删除状态；片段要保存结构路径、页码、坐标、标题层级和切分策略；答案引用要带 `source_id`、版本和定位信息。只存一段纯文本，后面无法解释“这句话是从哪一版制度来的”。

```json
{
  "chunk_id": "policy-v17-p04-c02",
  "tenant_id": "acme-cn",
  "source_id": "policy-2026-017",
  "version": 17,
  "path": ["费用制度", "差旅", "住宿标准"],
  "valid_from": "2026-06-01",
  "acl": ["finance", "hr"],
  "text": "..."
}
```

检索结果必须先经过权限过滤，再进入排序和上下文拼装。不能先把所有候选拿出来，再让模型“注意不要泄露”。

## 第二张图：租户和权限跟着证据走

企业场景里，权限不是页面上的一个按钮，而是每一次查询的输入。用户问“今年销售额”，系统至少需要知道他属于哪个租户、组织、项目和环境，查询的是哪个数据域，是否允许看到明细。

![租户、身份、文档 ACL 与答案引用的同一条数据流](/images/notes/enterprise-knowledge-agent-design/tenant-data-flow.svg)

```python
def retrieve(query, identity):
    filters = {
        "tenant_id": identity.tenant_id,
        "acl": {"$overlap": identity.groups},
        "env": identity.environment,
    }
    candidates = hybrid_search(query, filters=filters)
    return rerank(candidates, query=query)
```

这里的 `filters` 不是可选优化，而是安全边界。若向量库不支持可靠的租户过滤，应在更靠前的索引或检索代理层隔离数据，而不是把过滤交给模型。

## 第三张图：回答不是一句话，而是一组可核查 claim

用户真正需要的不是“模型说得像”，而是知道哪些结论确定、哪些资料没找到、哪些版本互相冲突。生成前可以把问题拆成 claims，再为每个 claim 绑定证据：

```text
claim_1: 2026 年住宿上限为 500 元
evidence: policy-2026-017 / p04 / v17
claim_2: 一线城市另有例外
evidence: policy-2026-017 / p05 / v17
open_question: 用户所属城市未提供
```

没有覆盖证据的 claim 应降级为“待确认”，而不是让模型用常识补齐。资料冲突时，答案要展示版本和生效时间，并把冲突交给业务负责人确认。

![知识库 Agent 的评测矩阵覆盖召回、权限、引用和版本一致性](/images/notes/enterprise-knowledge-agent-design/knowledge-eval-matrix.svg)

## 第四张图：知识生命周期必须能回滚

企业文档不是一次性导入。一个可靠的 ingestion 流程至少包括发现、解析、切分、权限同步、索引、发布和失效七个状态。任何一步失败，都不能让半成品片段悄悄进入线上索引。

```text
discovered → parsed → chunked → acl_synced → indexed → published
     │          │        │           │          │
     └──────────┴────────┴───────────┴──────────┴→ rejected / retry
published → superseded → deleted
```

每条片段要保存 `ingest_job_id`、解析器版本、内容哈希和父文档版本。更新时先生成新版本并完成权限与索引校验，再切换“当前有效”指针；删除则要传播到缓存、向量索引、关键词索引、倒排快照和评测样本。这样才能回答“删除后多久不再被检索到”，而不是只删掉网盘里的原文件。

## 第五张图：一次检索请求如何穿过边界

把一次查询画成时序图，比只画组件框更能体现工程取舍：

```text
用户 → Host：问题 + identity
Host → Policy：租户、资源、环境、用途
Policy → Retriever：已裁剪的 filters
Retriever → Reranker：候选 chunk + 版本
Reranker → Evidence：排序、去重、完整性
Evidence → LLM：带引用的上下文包
LLM → Answer：claim + source_ref
Answer → Audit：trace、版本、拒答原因
```

![文档导入、版本发布和删除回滚的生命周期](/images/notes/enterprise-knowledge-agent-design/knowledge-lifecycle.svg)

图 4：知识库的“更新”是一次带回滚点的发布，不是简单上传文件。

如果检索结果为空，系统应把 `no_match`、`permission_filtered`、`index_pending` 和 `parser_failed` 区分开。它们对应的下一步分别是换问法、申请权限、等待索引或修复导入，而不是统一回复“没有找到”。

## 第六张图：权限判断要能被回放

企业知识库最难排查的不是“今天答错了”，而是“为什么这个人看到了这条内容”。我会把身份快照、策略版本、候选片段和最终引用放进同一个回放包：

```json
{
  "trace_id": "q-2026-0819-0042",
  "identity": {"tenant": "acme-cn", "user": "u17", "groups": ["sales"]},
  "policy_version": "acl-42",
  "retrieval": {"candidates": 12, "filtered": 7, "visible": 5},
  "answer_refs": ["policy-2026-017/v17/p04"],
  "decision": "answered"
}
```

![企业知识库查询的身份快照、策略过滤和引用回放](/images/notes/enterprise-knowledge-agent-design/evidence-permission-gate.svg)

回放时先固定原始身份和文档版本，再逐层比较“候选数 → 过滤数 → 引用数”。如果答案泄露了被过滤的片段，问题大概率在缓存、重排或日志边界，而不是 Prompt。反事实测试也很有用：只把用户从 `sales` 换成 `finance`，其余输入完全不变，结果应只在授权证据范围内变化。

## 第七张图：把架构选择写成可比较的决策包

面试中不要只说“我们用了向量库”。可以把方案写成三条可比较路线：物理隔离索引、共享索引加强制 ACL、结构化 API + 文档 RAG。每条路线都列出召回、权限、更新、成本和回滚证据，再说明为什么当前阶段选其中一条。

```text
decision: shared-index + policy-gateway
why_now: tenant_count=18, daily_updates=4k, citation_required=true
reject: physical-index (rebuild_cost high), api-only (long-tail docs missing)
rollback: route read-only queries to previous index_version
```

这样回答就从“我画过一个架构”变成“我知道选择的代价，也准备了退路”。

## 评测：别只拿 100 个问题看答案像不像

企业知识库至少要有四组评测：

| 维度 | 要问的问题 | 证据 |
| --- | --- | --- |
| 召回 | 正确片段是否进入候选 | Recall@k、MRR |
| 权限 | 不该看到的片段是否永远不出现 | 越权集、跨租户集 |
| 依据 | 结论是否被引用覆盖 | claim coverage、引用准确率 |
| 新鲜度 | 文档更新后旧结论是否失效 | 版本回归、删除回归 |

评测集还要包含“应该拒答”的问题。只测试有答案的问题，模型很容易学会把所有请求都回答得很肯定。

## 五个设计坑

### 把所有资料放进一个索引

这样做初期省事，后面会同时遇到权限、冷热数据、删除和重建索引问题。至少按租户和敏感级别做逻辑或物理隔离，并保存删除传播状态。

### 只保存 chunk 文本

没有文档版本、结构路径和定位信息，引用就只能贴一个模糊链接。长文档、表格和扫描件更要保留页码与坐标。

### 检索和权限分开做

先召回再过滤可能把敏感片段暴露给日志、重排服务或模型上下文。权限过滤应是检索契约的一部分，且要有独立越权测试。

### 文档更新只追加不失效

旧版本仍然高相似度，模型就会把新旧制度混在一起。索引要有有效期、版本优先级和删除回执。

### 把“找不到”写成空答案

空数组不等于没有资料，也可能是权限、过滤、解析或索引延迟。返回 `is_complete`、`reason` 和 `next_action`，让 Agent 知道能否继续查。

## L1 / L2 / L3 追问：从画图到上线

**L1：** 企业知识库 Agent 最重要的设计点是什么？

让每个结论都有可核查证据，并让身份和租户过滤在检索前生效。

**L2：** 文档更新后怎样避免回答旧内容？

给来源版本和生效时间建模，更新时产生新版本、撤销旧版本并做删除与版本回归；检索排序优先当前有效版本。

**L3：** 权限过滤放在向量库还是应用层？

优先使用能在检索边界强制执行的索引或策略网关；应用层可以做二次防线，但不能让模型承担第一道过滤。选择取决于租户规模、索引能力和审计要求。

**L1：** 为什么要把原文、chunk 和 evidence 分开？

原文负责可追溯和重新解析，chunk 负责检索，evidence 负责回答时的证据引用。混成一段文本会丢掉版本、页码和删除状态。

**L1：** 空结果为什么不能直接回答“没有”？

空结果可能是无匹配、权限过滤、索引延迟或解析失败。必须返回原因和完整性，才能决定追问、申请权限还是重试。

**L1：** 文档删除要删哪些地方？

原文、对象存储、向量索引、关键词索引、缓存、引用 artifact 和相关评测样本都要有删除或失效记录。

**L2：** 大量文档更新时如何避免新旧版本混用？

给文档和 chunk 建版本与有效期，先构建并校验新索引，再原子切换 current pointer；查询按有效版本过滤，并保留旧版本回滚点。

**L2：** ACL 变化后，已经生成的答案怎么办？

答案引用要带资源版本和权限快照。权限撤销后，后续查询必须重新过滤，历史答案按产品策略隐藏敏感内容或标记为不可再访问。

**L2：** 如何评估企业知识库的拒答质量？

加入无答案、过期、冲突、越权和解析失败样本，分别测拒答准确率、原因解释和下一步建议，不能只测有标准答案的问题。

**L3：** 如何设计跨租户的索引隔离？

按租户与敏感级别做物理或逻辑隔离，检索请求强制带 tenant filter，重排、缓存和日志不允许看到过滤前的候选，并用跨租户回归集验证。

**L3：** 如何定位“召回正确但回答错误”？

沿 trace 检查权限过滤、重排、版本、上下文投影、claim 拆分和生成引用，判断是证据被截断、模型误读还是答案格式化丢失。

**L3：** 文档解析器升级如何安全发布？

保留解析器版本，使用固定文档集做结构、表格、页码和引用回归；新索引灰度后比较召回、引用覆盖和拒答率，异常可回滚到旧版本。

**L4：** 如果权限策略本身配置错了，怎样避免一次发布泄露所有租户？

把策略变更当成独立发布，先在跨租户和敏感样本上做 deny-by-default 回归，再小范围灰度；缓存键、重排服务和日志都要带策略版本，异常时关闭新策略而不是继续放量。

**L5：** 如何证明“引用正确”而不只是“引用存在”？

把答案拆成 claim，检查引用片段是否覆盖结论、版本是否在生效期、定位是否能回到原文；对冲突、过期和缺页样本分别评分，并保留可复跑的 evidence artifact。

## 删除请求也要穿过全链路，不能只删原文件

知识库最容易被忽略的一条路径是删除。管理员把一份合同标记为删除，原始文件确实不见了，但旧 chunk 还在向量库里，缓存里还有上一版答案，甚至离线评测集仍然引用它。用户下一次问到同一个问题，系统给出“已删除资料”的内容，信任就这样漏掉一块。

我会把删除建模成一个有状态的生命周期任务，而不是一个数据库按钮：

```yaml
deletion_job: del_20260819_77
tenant: team-alpha
document_id: contract-2024-11
target_version: v12
tombstone:
  reason: legal_request
  requested_by: owner_42
  requested_at: 2026-08-19T10:12:00Z
invalidate:
  raw_object: done
  chunks: 184
  vector_generations: [g31, g32]
  answer_cache_keys: 27
verify:
  retrieval_probe: pending
  citation_probe: pending
  audit_event: aud_8821
```

这里的 `tombstone` 很重要：它让删除意图先于物理清理写入所有下游，增量索引或缓存延迟时也不会把旧内容重新带回来。`vector_generations` 记录需要失效的索引代次，`answer_cache_keys` 把“删了文档但答案还在缓存”变成可以验收的数字。最终要跑两类探针：一类直接检索文档 ID，另一类用原问题询问并检查引用，确保系统要么拒答，要么只返回仍然有效的来源。

删除完成后不要只报“任务成功”，还要留下版本、租户、清理范围和验证结果。这样遇到合规抽查时，可以回答“哪一版在什么时候从哪些层被移除”，而不是凭印象说“应该删干净了”。

![知识文档删除生命周期回执](/images/notes/enterprise-knowledge-agent-design/knowledge-lifecycle-receipt.svg)

### L5：如果索引删除有延迟，期间是否应该让系统继续回答？

对已明确要求删除的文档，我会在策略层先写入 tombstone，并让检索过滤器拒绝命中该文档；索引物理删除可以异步完成。代价是短时间内召回变少，但这比继续引用已撤回内容更可控。验证探针全部通过后，再关闭 tombstone 的临时告警。

## 删除之后还要做一次“反向检索探针”

删除任务最容易把“原文件不见了”误当成完成。真正的验收应该从用户可能走的路径反过来问系统：直接给文档 ID，使用原来的问题，命中旧缓存，分别会发生什么？如果这三条路径没有被验证，删除只是一个后台状态，不是对用户可见的事实。

我会为删除回执增加一组固定探针，并把预期结果写在执行前：

~~~yaml
deletion_probe_receipt: dpr_20260820_18
document_id: contract-2024-11
version: v12
tenant: team-alpha
probes:
  - name: direct_id
    input: doc_id=contract-2024-11
    expected: zero_hit
  - name: original_question
    input: "合同的自动续期条款是什么？"
    expected: no_citation
  - name: answer_cache
    input: cache_key=qa:contract-2024-11
    expected: tombstone
observed:
  direct_id: zero_hit
  original_question: refused_with_deleted_notice
  answer_cache: tombstone
decision: accepted
~~~

探针不只检查“有没有命中”，还要检查答案里有没有残留引用、摘要或旧版本页码。物理删除可能是异步的，所以先由 tombstone 在检索、重排和缓存层统一拦截，再等待对象存储、向量索引和离线数据集完成清理。若任一探针仍返回旧证据，就保持删除告警，不允许把任务标成完成。

![删除后的反向检索探针：直接 ID、原问题与缓存三路验收](/images/notes/enterprise-knowledge-agent-design/deletion-probe-card.svg)

### L5：为什么原始文件已经删除，仍然不能把删除任务判定为成功？

因为用户看到的是答案和引用，不是对象存储里的文件。只有直接检索、原问题和缓存三路都符合预期，并且回执绑定租户、版本和时间，才能证明旧内容不会从另一条路径回来。

## 知识更新要做“新旧版本并排验收”

知识库更新时，最危险的不是新文档完全不可用，而是新旧版本同时被召回，答案把两个时间点拼在一起。只看新版本入库数量，无法说明旧版本是否已经降权、引用是否切换、缓存是否刷新。更新回执应该把版本、有效时间和回答证据放在同一张对照单里：

~~~yaml
knowledge_rollout_receipt: krr_20260820_34
document_id: policy-2026-08
tenant: team-alpha
versions:
  previous: v11
  candidate: v12
  effective_at: 2026-08-20T12:00:00Z
retrieval_checks:
  old_version_hit: 0
  new_version_hit: 18
  mixed_answer: 0
answer_checks:
  citation_version: v12
  stale_claims: 0
  cache_generation: g33
decision: accepted
rollback: restore-v11-if-mixed_answer_gt_0
~~~

验收要覆盖直接检索、原问题和缓存三条用户路径，并按时间边界构造一组“更新前”和“更新后”的问题。若业务允许灰度，可以让一小部分租户先使用候选版本，但所有回答都必须带版本和 trace，不能让灰度差异藏在自然语言里。这样一旦出现旧条款残留，可以定位是解析、索引、过滤还是缓存没有完成切换。

![知识更新版本对照：旧版本命中、候选版本命中、混合回答和缓存代次一起验收](/images/notes/enterprise-knowledge-agent-design/version-rollout-card.svg)

### L5：新版本命中率高但仍有旧版本引用，应该怎么处理？

先按文档 ID 和版本过滤旧引用，保留候选版本的回放样本，再检查缓存和离线索引代次。旧版本引用未清零前，我不会把全量流量切过去；可以继续灰度，但必须显式告警和保留回滚。

## 多租户知识库要同时测试“看不见”和“答不出来”

权限隔离的验收不能只做正向样本。每个租户至少要有同名文档、共享文档、已撤销文档和跨租户相似文档四类探针：允许的内容应能引用，禁止的内容不仅不能命中，也不能通过摘要、缓存、父块或相邻文档间接泄露。对“没有权限”和“系统里不存在”要返回不同内部 reason，但对用户可以用统一的安全表达，避免暴露资源是否存在。

检索、重排、生成和缓存都要带租户上下文；只在入口过滤一次是不够的。回放时比较 evidence_ids、引用坐标和答案 claim，确保模型没有从一份允许文档推断出另一租户的敏感字段。权限撤销后要重复跑原问题和缓存命中路径，直到旧 evidence 清零。

```yaml
tenant_isolation_probe: tip_20260820_58
tenant: team-alpha
cases:
  same_title_allowed: {expect: cite_allowed_doc}
  same_title_other_tenant: {expect: no_evidence_leak}
  revoked_doc_cached: {expect: deny_and_invalidate}
  shared_doc: {expect: cite_with_shared_scope}
checks:
  retrieval_acl: pass
  rerank_acl: pass
  generation_acl_recheck: pass
  cache_namespace: tenant-scoped
  answer_claim_cross_tenant: 0
decision: tenant_boundary_verified
```

![多租户知识隔离探针：同名、共享、撤销和跨租户相似文档分别验证可见性与泄露边界](/images/notes/enterprise-knowledge-agent-design/tenant-isolation-probe-card.svg)

### L5：为什么“没有权限”和“没有这份文档”在内部要区分？

两者触发的审计、告警和修复路径不同；混成一个 reason 会让权限误配被误判成召回失败。对外可以统一安全话术，但内部必须保留真实策略决定和租户上下文。

## 知识库上线后要维护“删除延迟预算”

企业知识助手最危险的误解，是把“原文件删除成功”当成“系统已经忘记”。解析队列、向量索引、缓存和回答日志都有自己的传播延迟。上线前就应该定义删除延迟预算，并让每一层都能回报状态；超过预算时，系统要主动降级为拒答或人工确认。

```yaml
deletion_sla:
  contract: dsl_20260820_111
  source_id: policy-2026-08-17
  deadline_minutes: 15
  stages:
    source: acknowledged
    parser: tombstoned
    vector_index: filtered
    cache: purged
    answer_guard: blocked
  probes:
    - direct_id_lookup
    - original_question
    - synonym_question
  fail_action: block_answer_and_open_ticket
```

![知识库删除延迟预算：源文件、解析、索引、缓存和回答闸门逐层回报](/images/notes/enterprise-knowledge-agent-design/deletion-latency-budget-card.svg)

### L5：为什么删除预算超时要先拒答，而不是继续使用旧索引？

因为用户看见的是最终回答，不是后台任务状态。只要有一条旧片段仍能被召回，系统就可能把已撤销内容重新说出来。拒答会牺牲短期可用性，却把“删除已经生效”这件事变成可证明的安全边界。

## 60 秒面试回答

我会先画数据、身份和证据三条线，而不是先画 LLM。数据线负责来源、解析、版本和删除；身份线把租户、组织、资源和动作带到检索边界，先做权限过滤；证据线把每个 claim 绑定到文档版本、页码和结构路径。系统分 ingestion、index、retrieval、policy、orchestration、answer 和 evaluation 七层，评测同时覆盖召回、越权、引用、新鲜度和应拒答问题。这样项目才从“能回答”变成“答得对、看得到依据、出了问题能追溯”。

## 交付前检查清单

- [ ] 原始文档、chunk 和引用对象分别建模
- [ ] 租户、ACL、环境和有效期参与检索过滤
- [ ] 每个 claim 都有 source_id、版本和定位
- [ ] 更新、删除、冲突和索引延迟有处理状态
- [ ] 评测包含越权、旧版本和应拒答样本
- [ ] 召回、引用和权限日志能按 trace 回放

## 相关阅读

- [RAG 为什么不是“向量库 + 提示词”？](/notes/rag-retrieval-pipeline)
- [RAG 答案看着对，怎么证明它真的有依据？](/notes/rag-grounded-evidence)
- [Agent 安全不是加一句提示词](/notes/agent-security-boundaries)
- [离线评测高分，线上为什么还是翻车？](/notes/offline-eval-online-drift)

## 资料来源

- Agent 岗面试宝典 v3（AgentAlpha 飞书文档）
- ARIS in AI Offer：系统设计、公式、代码和分层追问结构
