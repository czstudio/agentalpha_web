---
slug: "rag-vector-database-selection"
title: "RAG 选向量库，先别看排行榜：把检索目标算清楚"
excerpt: "向量库不是 RAG 的魔法核心。先定语料规模、过滤条件、更新频率、召回目标和尾延迟，再比较 HNSW、倒排、混合检索和托管服务。"
series: "RAG"
seriesNo: "03"
number: "65"
minutes: 22
---

面试官问“你们为什么选这个向量数据库”，很多回答会变成产品名清单：支持向量、支持分片、支持云部署。更有用的回答要从任务反推：要语义召回还是精确过滤？数据每天更新还是每秒写入？能接受近似结果吗？最坏延迟和运维成本是多少？

## 答案先行

向量库的选择顺序应该是：先定召回与过滤目标，再定索引结构和存储形态，最后比较吞吐、P95、更新延迟、故障恢复和成本。小规模、强过滤、频繁更新的知识库可以先用关系库或搜索引擎的向量能力；规模变大、查询稳定后，再考虑 HNSW、IVF 或专用向量服务。别为了“更像 AI”提前引入复杂索引。

![向量库选择的目标—索引—运维三层决策](/images/notes/rag-vector-database-selection/selection-matrix.svg)

## 先把查询拆成五个约束

| 约束 | 要问的问题 | 影响的设计 |
| --- | --- | --- |
| 规模 | 向量数量、维度、租户数量是多少？ | 内存、分片、索引构建时间 |
| 过滤 | 是否必须按租户、权限、时间过滤？ | pre-filter、倒排字段、分区 |
| 更新 | 增量写入、删除、重建的频率？ | 索引可更新性、版本切换 |
| 质量 | 目标是 Recall@k、MRR 还是最终答案正确？ | embedding、混合、rerank |
| 体验 | P95、并发、成本和故障恢复上限？ | 副本、缓存、降级方案 |

如果每个查询都必须先过滤租户，再做相似度检索，单纯提高 `ef_search` 并不能解决权限问题。过滤语义和索引能力要一起验证。

## HNSW 和 IVF 的直觉

HNSW 通过多层图把近邻搜索变成“从稀疏层跳到稠密层”；查询时通常用 `ef_search` 控制候选宽度。`ef_search` 越大，召回往往更好，但延迟和 CPU 也会增加。

IVF 先把向量分到若干粗粒度簇，查询只搜索 `nprobe` 个簇。它更省资源，但如果真实近邻落在未探查的簇中，就会直接丢失。

可以用一个简化的成本直觉表达：

$$
C_{query}\approx C_{index}\times w + C_{filter}+C_{rerank},\quad w\in\{ef\_search,nprobe\}
$$

这里的 $w$ 不是越大越好，而是质量和延迟的旋钮。面试时说出“我会在验证集上画 Recall@k—P95 曲线”，比背某个默认值更有说服力。

![HNSW 与 IVF 的近似检索路径](/images/notes/rag-vector-database-selection/index-intuition.svg)

## 什么时候需要混合检索

语义相似对“报销上限是多少”很有帮助，但对订单号、错误码、版本号和产品名，关键词或倒排匹配可能更可靠。混合检索常见做法是先各自取候选，再用归一化分数或 RRF 合并：

$$
score(d)=\lambda\,score_{dense}(d)+(1-\lambda)\,score_{sparse}(d)
$$

$\lambda$ 不应该拍脑袋固定。可以按问题类型做路由，或者在小验证集上比较不同权重。最终仍要看引用证据是否覆盖答案，而不是只看单一召回指标。

## 从零实现一个可替换的检索接口

把业务和具体数据库解耦，先定义接口，方便离线比较：

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Hit:
    doc_id: str
    score: float
    text: str
    source_version: str

class Retriever:
    def search(self, query: str, *, tenant: str, top_k: int) -> list[Hit]:
        raise NotImplementedError

def search_with_fallback(primary: Retriever, backup: Retriever, query: str, tenant: str):
    try:
        hits = primary.search(query, tenant=tenant, top_k=8)
        if hits:
            return hits, "primary"
    except TimeoutError:
        pass
    return backup.search(query, tenant=tenant, top_k=8), "fallback"
```

生产实现还要补上租户过滤、版本一致性、超时、指标和数据删除验证，但接口先固定，才能让 HNSW、倒排和托管服务共享同一套评测。

## 一个真实选型题：2,000 万向量并不自动等于“上专用向量库”

假设一个企业知识库有 2,000 万条切片、1,536 维 embedding、120 个租户，每天约 30 万条增量写入，查询必须先过滤租户和权限，P95 目标 800 ms。这个约束组合比“向量数量很大”更重要：

| 约束 | 先验证的问题 | 不能只看什么 |
| --- | --- | --- |
| 2,000 万向量 | 索引内存、分片和重建窗口 | 单机 benchmark 的 QPS |
| 120 租户 | pre-filter 是否真的在相似度前生效 | 过滤后的平均召回 |
| 30 万/日更新 | 增量写与删除是否会造成索引抖动 | 一次性导入速度 |
| P95 800 ms | 尾延迟在 rerank、网络和冷缓存时如何变化 | 平均延迟 |
| 权限隔离 | 快照恢复是否保留租户边界 | 公开数据集 Recall |

因此可以先做两条候选路径：一条是现有搜索引擎的倒排 + 向量能力，另一条是专用 HNSW 服务；用同一批真实查询和过滤条件比较，再决定是否承担额外运维。这个过程比先拍板产品名更容易在面试中讲清楚。

## 把过滤顺序写进评测，不要只写在文档里

很多系统名义上支持 pre-filter，实际却是先召回 1,000 个向量再在应用层过滤，导致小租户或细权限场景的召回骤降。可以把过滤正确性单独作为硬指标：

$$
Recall_{secure}=\frac{|Relevant\cap Allowed\cap Retrieved|}{|Relevant\cap Allowed|}
$$

当 `Allowed` 为空时，系统应该返回空结果，而不是扩大 top_k 去“找点相关内容”。过滤、索引和 rerank 的顺序必须在集成测试中被断言。

```python
def secure_search(index, query, *, tenant, acl, top_k=8):
    allowed = index.allowed_partitions(tenant=tenant, acl=acl)
    if not allowed:
        return [], {"status": "no_accessible_partition"}
    candidates = index.search(query, partitions=allowed, top_k=top_k * 4)
    hits = [item for item in candidates if item.acl <= acl]
    return hits[:top_k], {"status": "ok", "candidate_count": len(candidates)}
```

如果库本身不提供可靠的 pre-filter，就要把风险写进选型结论，而不是用应用层的一次 `if` 假装解决。

## 选型实验应该固定什么，改变什么

一个可复现的 benchmark 至少需要固定数据版本、embedding 版本、查询集、过滤条件、硬件和网络位置，只改变索引参数或服务实现：

```yaml
vector_benchmark:
  corpus: kb-2026-08-18
  embedding: bge-m3@1.2
  queries: support-500-v4
  filters: [tenant, acl, effective_at]
  budgets:
    p95_ms: 800
    build_hours: 6
    recovery_hours: 2
  report: [recall_at_5, secure_recall, p95, p99, write_lag, restore_time, cost]
  matrix:
    - {index: hnsw, ef_search: [64, 128, 256]}
    - {index: ivf, nprobe: [8, 16, 32]}
    - {index: hybrid, lambda: [0.3, 0.5, 0.7]}
```

不要把平均结果和尾延迟放在同一张“排行榜”里就结束。真正的上线候选还要通过快照恢复、租户删除、版本回滚和冷缓存压测。

## 四类失败，四种回退

| 故障 | 现象 | 回退方式 | 不能做的事 |
| --- | --- | --- | --- |
| 索引不可用 | 超时或连接失败 | 只读快照/关键词索引 | 让模型裸答 |
| 过滤失效 | 命中但无权限 | 直接拒答并报警 | 在生成阶段再删文字 |
| 版本漂移 | 新旧 embedding 混查 | 双读校验后切换 | 静默混用 |
| 更新积压 | 新文档搜不到 | 标记 freshness、提示时间 | 宣称已覆盖最新知识 |

可以把“没有证据”作为一种正常业务状态，交给上层 Agent 处理澄清或人工升级。向量库不应该为了让接口返回 200 而制造一个看似合理的上下文。

## 一张选型结论卡

```json
{
  "decision": "hybrid-search-first",
  "reason": ["strong_acl_filter", "daily_incremental_write", "exact_tokens"],
  "primary": "search-engine-vector",
  "candidate_next": "hnsw-service",
  "hard_gates": {"secure_recall_at_5": 0.92, "p95_ms": 800, "restore_hours": 2},
  "fallback": ["read_snapshot", "keyword_index", "human_escalation"],
  "owner": "retrieval-platform",
  "review_at": "2026-09-15"
}
```

结论卡把“为什么没有选排行榜第一”变成可追踪的工程判断；数据规模、过滤语义或更新频率变化时，可以重新跑同一套门禁，而不是重新争论产品偏好。

## 读多写少和高频更新是两套完全不同的题

如果知识库每天凌晨批量更新，允许 2 小时索引构建窗口，可以用离线构建、校验、切换别名的方式保证版本一致；如果订单状态每秒都在变，就不能把“重建索引”当成正常更新路径。两种场景的决策表如下：

| 更新形态 | 典型策略 | 主要风险 |
| --- | --- | --- |
| 每日批量 | 新版本离线构建，原子切换 | 切换时的版本错配 |
| 每小时增量 | delta index + 定期合并 | 增量层膨胀、查询变慢 |
| 每秒写入 | 热数据精确存储 + 冷数据向量 | 两套来源的时间一致性 |
| 大量删除 | tombstone + 后台回收 | 已删除内容仍被召回 |

删除验证尤其不能省：用户要求撤回文档时，既要从主索引删掉，也要验证缓存、快照和 rerank 输入不再返回它。

## 召回、过滤和重排的预算要串起来

候选集越大，rerank 质量可能变好，但 P95 和显存也会变差。可以把一次查询的预算写成：

$$
T_{p95}=T_{filter}+T_{ann}(k_0)+T_{rerank}(k_1)+T_{network},\quad k_1\le k_0
$$

如果过滤后只剩 3 个候选，就没有必要把 `k_0` 固定成 100；如果过滤非常宽松，也不能用很小的 `k_0` 假装达成低延迟。在线路由里根据租户、查询类型和候选数量动态分配 `k_0`、`k_1`，比盲调一个全局 top_k 更合理。

```python
def budget_for(query_type, candidate_count):
    if candidate_count < 12:
        return {"ann_k": candidate_count, "rerank_k": candidate_count}
    if query_type in {"exact_token", "policy_quote"}:
        return {"ann_k": 80, "rerank_k": 20}
    return {"ann_k": 40, "rerank_k": 12}
```

## 选型结论要包含“不满足的条件”

一个诚实的结论应该同时写清：当前方案满足什么、牺牲什么、何时需要重新评估。例如“先用搜索引擎向量能力”可能满足强过滤和快速迭代，但牺牲了超大规模近似检索的内存效率；当向量数超过某阈值或 P95 连续两周超标，才升级专用服务。

```yaml
revisit_triggers:
  - "vectors > 50_000_000"
  - "secure_recall_at_5 < 0.90 for 7d"
  - "p95_ms > 800 for 3 consecutive days"
  - "restore_time_hours > 2"
```

触发条件比“以后再优化”更可执行，也能避免团队因为一次 benchmark 就过早承担复杂运维。

## 删除、更新和多租户是选型的隐藏成本

很多向量库 demo 只演示写入和相似度查询，真正上线后最先出问题的往往是删除。制度撤回、用户注销或租户迁移都要求旧向量不再被召回；如果索引是异步更新，系统需要用版本过滤或 tombstone 在查询层先挡住旧数据。

```python
def visible(doc, tenant, min_version):
    return (
        doc["tenant_id"] == tenant
        and doc["version"] >= min_version
        and not doc["deleted"]
    )
```

评测时要加入“写入后多久可搜到”“删除后多久搜不到”“重建索引期间是否跨租户串数据”三个时间维度。它们直接决定业务是否敢把向量库作为唯一召回源。

## 备份恢复也要算进向量库答案

面试或评审中补上恢复路径：原始文档和 embedding 模型版本必须可重放，索引文件只作为加速产物；恢复后先跑 secure recall 和删除一致性，再放开线上流量。这样即使索引损坏，也能从文档账本重建，而不是把“有备份”停留在存储截图上。

## 高频追问

**L1：向量库和普通数据库有什么区别？**

向量库优化的是高维相似度检索及相关索引；普通数据库更擅长事务、精确过滤和关联查询。很多 RAG 系统会混合使用，而不是二选一。

**L2：HNSW 为什么召回高但内存也高？**

它为向量维护多层邻接图，搜索时能快速跳转，但图边和节点信息需要额外内存；参数越激进，构建与查询成本越高。

**L2：只提高 top_k 能解决召回问题吗？**

不一定。候选多了可能把噪声带给 rerank 和生成器。要先判断是 embedding、切片、过滤还是索引覆盖出了问题。

**L3：如何做选型实验？**

固定 embedding、数据版本和查询集，分别测 Recall@k、过滤正确率、P95、更新延迟、重启恢复时间和成本，再看最终引用答案的准确率。

**L5：如果向量库挂了，Agent 怎么办？**

按任务风险降级：读缓存、关键词索引、旧版本快照或人工升级。高风险答案不能因为检索服务不可用就改成无依据生成。

## 60 秒面试回答

我不会先按产品名选向量库，而是先固定规模、过滤、更新、召回和尾延迟约束。小规模强过滤场景可以先用已有搜索或关系库能力，规模和并发上来后再评估 HNSW、IVF 或托管服务。实验里固定 embedding 和查询集，画 Recall@k、P95、更新延迟、恢复时间和成本的曲线；对订单号和权限字段加入混合检索或 pre-filter。线上还要有快照、备用检索和无证据降级策略。

## 自检清单

- [ ] 能解释 HNSW、IVF 的搜索旋钮和代价
- [ ] 能说清向量、关键词和过滤如何组合
- [ ] 评测不只看召回，还看 P95、更新和恢复
- [ ] 有检索服务不可用时的降级边界

## 相关阅读

- [RAG 不只是“向量库 + 提示词”：证据怎样一路到答案？](/notes/rag-retrieval-pipeline)
- [混合检索和重排，分别在补 RAG 的什么漏洞？](/notes/rag-rerank-and-hybrid)
- [你的 Agent 项目为什么要用 RAG？不用会怎样](/notes/agent-rag-why)

## 资料来源

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
