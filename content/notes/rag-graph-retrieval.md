---
slug: "rag-graph-retrieval"
title: "Graph RAG 不只是画关系图：证据要能沿路径找回去"
excerpt: "遇到跨文档、跨实体、要多跳关系的问题，图结构能补上纯向量相似度的短板。节点、边、来源、时间、路径评分都得记下来，不能只织一张好看的关系网。"
series: "RAG"
seriesNo: "03"
number: "67"
minutes: 23
---

“这家公司在 2024 年收购的团队后来用了哪个模型？”不是找一段最相似的文字就能答稳的。系统得沿着公司—事件—团队—时间—模型几层关系走，而且每条边都能回到原文。Graph RAG 难的不是把图画出来，而是让检索路径变成可审计证据。

## 拆完先给结论

Graph RAG 适合实体关系明确、问题需要多跳推理或跨文档对齐的场景。先从文档抽取带来源的节点和边，做实体消歧、时间和权限校验，再用向量召回找到入口节点，沿有限步数扩展候选路径，最后把路径上的原文片段交给生成器。图不是答案，路径和原文引用才是支撑答案的证据。

![Graph RAG 的节点—路径—证据闭环](/images/notes/rag-graph-retrieval/graph-path.svg)

## 节点和边都要有 provenance

```json
{
  "node": {
    "id": "model:alpha-3",
    "type": "model",
    "name": "Alpha-3",
    "valid_from": "2024-01-01",
    "source_refs": ["doc-17#p4"]
  },
  "edge": {
    "from": "team:vision",
    "type": "used_model",
    "to": "model:alpha-3",
    "confidence": 0.87,
    "valid_at": "2024-08",
    "source_refs": ["doc-22#p7"]
  }
}
```

没有时间和来源的边，图会把历史事实与当前事实混在一起；没有租户和权限标签的节点，跨租户检索甚至可能把关系图变成数据泄漏工具。

## 先做实体消歧，再做路径搜索

同一个名字可能指人、项目或模型版本。可以先用类型、别名、时间和上下文做候选消歧：

| 线索 | 作用 |
| --- | --- |
| 类型 | “Alpha”是模型还是项目 |
| 别名 | 简称、旧名和英文名是否同一实体 |
| 时间 | 事件发生时实体是否已存在 |
| 租户 | 当前用户是否有权看到它 |
| 来源 | 是否至少有一条原文支持 |

如果入口节点本身不确定，后续每跳都会放大错误。系统可以保留 top-2 候选，但要在最终答案中声明歧义，而不是替用户静默选一个。

## 路径评分与预算

路径越长，关系错误和噪声越多；但有些问题确实需要多跳。可以用一个带惩罚的路径分数：

$$
S(path)=\sum_{e\in path}w_e-\beta\,|path|-\gamma\,conflict(path)
$$

其中 $w_e$ 可以结合边置信度、来源质量和时间匹配度。`|path|` 是跳数，`conflict` 表示时间、类型或来源冲突。扩展必须有最大跳数、节点数和总 token 预算。

![多跳路径的评分、截断和引用](/images/notes/rag-graph-retrieval/path-budget.svg)

```python
def expand(graph, seeds, *, max_hops=3, max_nodes=40):
    frontier, visited = list(seeds), set(seeds)
    paths = []
    for hop in range(max_hops):
        next_frontier = []
        for node in frontier:
            for edge in graph.neighbors(node):
                if edge.to in visited or len(visited) >= max_nodes:
                    continue
                visited.add(edge.to)
                next_frontier.append(edge.to)
                paths.append((node, edge, edge.to))
        frontier = next_frontier
        if not frontier:
            break
    return rank_paths(paths)
```

代码里的 `max_hops` 和 `max_nodes` 是可靠性参数，不是为了让图看起来完整。宁愿返回“证据不足”，也不要无限扩图。

## 图检索和向量检索怎么配合

常见入口是向量召回文档或实体，再沿图扩展；也可以先用关键词锁定实体，再用向量补语义。选择哪条路径取决于问题类型：关系型问题优先图，开放描述优先向量，复杂问题让路由器组合两者。

## 一个真实的多跳问题：先画“可验证路径”

以“2024 年收购的团队后来用了哪个模型”为例，系统不应该把它当成一个模糊的全文搜索，而要把目标拆成三个可验证的边：

1. 找到公司在 2024 年发生的收购事件，并确认事件来源；
2. 从收购事件找到被收购团队，检查团队名称和生效时间；
3. 从团队找到使用过的模型，再回到模型发布或项目文档核对时间。

每一跳都要有 `from`、`relation`、`to`、`valid_at` 和 `source_refs`。如果第二跳只找到一个新闻摘要、没有原始公告，路径应该停在 `needs_more_evidence`，而不是继续向下扩展成一条“看起来完整”的链。

### 路径证据卡

```json
{
  "question": "2024 年收购的团队后来用了哪个模型？",
  "path": [
    {"from": "company:acme", "rel": "acquired", "to": "team:vision", "at": "2024-06", "source": "doc-17#p4"},
    {"from": "team:vision", "rel": "used_model", "to": "model:alpha-3", "at": "2024-08", "source": "doc-22#p7"}
  ],
  "missing": [],
  "answerable": true
}
```

这张卡比一段“根据图谱推断”的总结更有用：面试时能展示链路，线上可以检查每条边，用户也能点击回原文。

## 图构建也要分层：抽取、消歧、审核、发布

不要把文档一导入就直接写成线上事实。一个小而稳的构建流水线可以分成四层：

| 层级 | 处理内容 | 失败时的状态 |
| --- | --- | --- |
| 抽取 | 识别实体、关系、时间和否定词 | `extraction_failed` |
| 消歧 | 合并别名，区分版本、项目和人名 | `ambiguous_entity` |
| 审核 | 对关键边检查原文、权限和生效时间 | `needs_review` |
| 发布 | 写入可查询图版本，保留 diff | `published` / `rejected` |

高风险关系（例如“有权访问”“已批准”“属于某租户”）不应只靠模型抽取。可以先让模型提出候选，再由规则或人工审核确认。

## 关系冲突比节点冲突更难处理

同一个实体有两个名称，通常可以补别名；但同一条关系出现冲突时，必须保留两侧证据：

| 冲突 | 不能做的事 | 可解释处理 |
| --- | --- | --- |
| 时间冲突 | 只保留最新抓到的一条边 | 按 `valid_at` 分层，查询时锁时间 |
| 来源冲突 | 按边置信度直接删除另一侧 | 显示来源质量、发布日期和冲突状态 |
| 权限冲突 | 把公开文档关系带入私有租户 | 在边上做租户过滤，拒绝跨界扩展 |
| 否定冲突 | 把“未使用”当成“使用” | 记录 polarity，生成时检查否定证据 |

一个很实用的规则是：**无法在同一时间、同一权限范围内选出唯一有效边，就不要输出确定句式**。可以说“资料存在两种说法，分别来自……”，这比一个错误的单一答案更接近真实系统。

## 受限扩展：给每一跳一个 token 和风险预算

```python
def expand_with_budget(graph, seeds, *, max_hops=3, max_nodes=32, max_tokens=2400):
    frontier = [(node, 0) for node in seeds]
    visited = set(seeds)
    selected = []
    spent = 0
    while frontier and len(visited) <= max_nodes:
        node, hop = frontier.pop(0)
        if hop >= max_hops:
            continue
        for edge in graph.neighbors(node):
            if edge.to in visited or edge.tenant != graph.tenant:
                continue
            cost = edge.summary_tokens + edge.source_tokens
            if spent + cost > max_tokens:
                return rank_paths(selected), "budget_exhausted"
            if edge.confidence < 0.55 or edge.conflict:
                continue
            visited.add(edge.to)
            spent += cost
            selected.append((node, edge, edge.to))
            frontier.append((edge.to, hop + 1))
    return rank_paths(selected), "complete"
```

这里的 `edge.conflict` 不是把冲突边永远删掉，而是避免它在普通回答路径里被静默采纳。需要解释冲突时，可以单独进入审查模式，扩大证据预算并把两侧材料都交给生成器。

## 评测别只看最终答案：四个可定位指标

Graph RAG 的离线集要记录“金路径”，然后分层看：

$$
P_{answer}=P_{entity}\times P_{edge}\times P_{path}\times P_{citation}
$$

如果最终答案正确率下降，先看实体召回是否变差，再看每一跳边是否正确，最后才去调生成 Prompt。一个被模型猜中的答案不能替代完整路径的分数。

```yaml
graph_eval:
  entity_recall_at_5: 0.94
  edge_precision: 0.89
  path_exact_match: 0.78
  citation_coverage: 0.91
  conflict_abstention: 0.86
  slices: [time_sensitive, cross_tenant, negative_relation, long_path]
```

线上还要关注图版本漂移：同一个问题在图版本 `g12` 和 `g13` 得到不同路径时，要记录变更的节点、边和来源，而不是只看答案文本。

## 图结构什么时候会把问题变复杂

不是所有知识库都值得先建图。可以用三个问题做快速筛选：

1. 用户是否频繁询问“谁在什么时候与谁有什么关系”；
2. 答案是否需要沿两跳以上关系组合，而不是一段原文就能回答；
3. 团队是否有能力维护实体消歧、版本和边的审核流程。

如果三个问题大多回答“否”，先把切片、混合检索和引用做好，通常比建一张稀疏但错误很多的图更划算。图结构本身也会引入新的失败：关系抽取错、别名合并错、路径评分偏置和权限边遗漏。

## 节点、边和文档要允许不同生命周期

一个产品名称可能长期存在，但“使用某模型”的边只在某个时间段有效；一份文档被撤回后，节点可以保留，边和引用必须失效。建议分别管理：

```yaml
lifecycle:
  node:
    identity: stable_id
    aliases: versioned
    delete: tombstone
  edge:
    valid_from: required
    valid_to: optional
    source_refs: required
    review_status: draft|approved|rejected
  document:
    version: immutable
    acl: required
    supersedes: previous_version
```

查询时先锁定文档版本和权限，再读取有效边。否则“图上还存在”很容易被误解为“事实仍然成立”。

## 路径解释要能让人逐跳核对

用户看到“团队使用 Alpha-3”还不够，解释面板至少应显示：入口实体、每一跳关系、关系生效时间、来源片段和是否存在冲突。可以把路径转成一张证据表：

| 跳数 | 关系 | 生效时间 | 来源 | 置信状态 |
| ---: | --- | --- | --- | --- |
| 1 | Acme → 收购 → Vision Team | 2024-06 | 公告#p4 | confirmed |
| 2 | Vision Team → 使用 → Alpha-3 | 2024-08 | 技术报告#p7 | confirmed |
| 3 | Alpha-3 → 发布 → v1.2 | 2024-09 | changelog#p2 | needs_review |

第三跳仍需审核时，答案可以回答前两跳，并明确“模型版本尚未得到第二份来源确认”。分段披露比把整条路径说成确定事实更诚实。

## 复杂路径应当允许主动停止

一个可靠的图检索器不追求“把图走完”，而是在收益不足时停止：

```python
def should_stop(path, *, min_gain=0.08, max_hops=3):
    if len(path) >= max_hops:
        return True
    if path and path[-1].evidence_gain < min_gain:
        return True
    if any(edge.permission == "unknown" for edge in path):
        return True
    return False
```

停止后可以返回“当前证据只能确认到第二跳”，并提供补充问题或原文入口。主动停止是图系统的能力，不是失败的遮羞布。

## 高频追问

**L1：Graph RAG 比普通 RAG 好在哪里？**

它显式保留实体和关系，适合多跳、跨文档和需要一致性约束的问题；普通 RAG 对单段语义匹配更直接。

**L2：图里的边都是模型抽取的吗？**

可以自动抽取，但要保存原文引用、置信度和版本，并对关键关系做人工或规则校验。

**L2：图越大越好吗？**

不一定。关系噪声、消歧错误和权限复杂度都会增加。图应该围绕任务和可验证问题增量构建。

**L3：如何评测多跳检索？**

分别评估入口实体、每跳边、最终路径和证据引用；不能只看最终答案，因为一条正确答案可能是模型猜出来的。

**L5：图和文档冲突怎么办？**

保留冲突两侧的来源与时间，进入冲突状态或澄清流程；不能用图的结构便利覆盖最新原文。

## 回到面试：怎么聊这个话题

我会在实体关系明确、问题需要多跳或跨文档对齐时采用 Graph RAG。抽取节点和边时保留类型、时间、权限、置信度和原文 provenance；查询先找入口，再在最大跳数和节点预算内扩展路径，按边质量、时间匹配和冲突惩罚排序。生成器只接收路径上的原文片段，最终答案引用边和文档。评测会拆开看实体消歧、边召回、路径正确率和证据完整性。

## 自检清单

- [ ] 能说明何时图结构真正有收益
- [ ] 节点、边都有来源、时间和权限
- [ ] 路径搜索有跳数、节点和 token 预算
- [ ] 多跳评测可定位到具体一跳

## 相关阅读

- [RAG 不只是“向量库 + 提示词”：证据怎样一路到答案？](/notes/rag-retrieval-pipeline)
- [RAG 答案看着对，怎样证明它有依据？](/notes/rag-grounded-evidence)
- [多模态 RAG 怎样把图片、表格和文字一起查出来？](/notes/multimodal-rag)

## 资料来源

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
