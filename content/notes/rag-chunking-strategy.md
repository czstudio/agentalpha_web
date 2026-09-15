---
slug: "rag-chunking-strategy"
title: "RAG 分块怎么定？先别急着争 256 还是 512"
excerpt: "分块不是切得整齐就行。每一块都得两头兼顾：检索时能被准确定位，单独拎出来也撑得住一个回答。"
series: "RAG"
seriesNo: "03"
number: "11"
minutes: 21
---

做知识库第一天，大家最容易争的就是 chunk size：256、512，还是 1024？数字排得很整齐，问题却没有因此变简单。

## 我们推出来的版本

分块要同时满足结构完整、检索可区分和上下文可用三个条件。优先沿标题、段落、列表、表格和代码边界切分，再用 token 上限兜底；必要时用重叠窗口和父子块补上下文。最终方案要由真实问题集回放决定，不能脱离任务只比较块长度。

## 一、先按文档结构切，再按长度兜底

把标题层级、章节路径、来源和更新时间写进每个 chunk 的 metadata。这样召回“缓存策略”时，系统还知道它来自哪个产品、哪一章、哪个版本。

代码和表格不要当普通段落切。代码需要保留函数或类的边界；表格需要把表头和行绑定，否则召回到一行数字，模型根本不知道列名是什么。

## 二、四种常见策略怎么选

| 策略 | 适合场景 | 风险 |
| --- | --- | --- |
| 固定长度 | 资料格式混乱、快速起步 | 容易截断语义 |
| 递归分割 | 标题和段落层级明显 | 复杂文档仍需清洗 |
| 语义分块 | 长文、主题变化明显 | 成本更高，边界需验证 |
| 父子块 | 需要精确召回又要保留上下文 | 索引与拼接更复杂 |

父子块是很实用的折中：小块负责被找到，大块负责给模型补充上下文。注意父块不是无限扩大，超过上下文预算后，补上下文反而会把真正证据冲掉。

## 三、重叠窗口不是保险丝

重叠能降低边界切断的概率，但会带来重复召回、索引膨胀和上下文浪费。经验上先从较小比例开始，拿“答案跨边界”的问题单独统计，再调整重叠量。不要看到召回漏了一句，就把重叠开到 50%；那只是把问题藏进账单里。

## 四、用问题集反推分块

为每个问题标记最小充分证据：一个段落、两个相邻段落，还是一张完整表格。然后回放检索，看 top-k 是否同时满足“包含必要前提”和“没有引入冲突版本”。这比单纯看向量分数更接近用户实际体验。

![分块边界：先沿标题、段落、表格和代码结构切，再用 token 上限兜底](/images/notes/rag-chunking-strategy/chunk-boundary.svg)

## 五、一个 chunk 要能独立回答什么问题

“能不能独立回答”比“有多少 token”更适合拿来定边界。比如下面这段：

```text
3. 缓存失效
当用户权限发生变化时，需要清理用户级缓存；租户级配置变化时，清理租户缓存。
```

如果切块时把标题留在上一个 chunk，把“用户级”和“租户级”的前提切到下一个 chunk，召回到中间那句时，模型会看到一个看起来完整、实际缺少条件的句子。好的 chunk 至少要保留：

1. 它在回答什么主题（标题路径）。
2. 结论成立的前提（条件、版本、范围）。
3. 能让读者执行的动作（步骤、参数或例子）。
4. 可以追溯的来源（文档、章节、更新时间）。

这也是为什么同样 512 token，按结构切出来的块，通常比从字符中间硬切更可用。

## 六、父子块不是“把全文都塞进上下文”

父子块的常见实现是：小的 child chunk 进向量索引，命中后通过 `parent_id` 找到较大的 parent chunk，再交给上下文组装器。它解决两个互相拉扯的问题：

- child 小，主题更纯，召回更容易定位。
- parent 大，前提和例外不容易被边界切掉。

但 parent 不是越大越好。一次命中五个 child，如果它们都属于同一个 parent，应当去重并限制补回的父块数量；否则模型上下文里会出现同一段话重复三遍，真正的证据反而被挤掉。生产里要记录 `child_id → parent_id` 的展开数量和最终 token 占用。

```python
def expand_children(hits, max_parents=3):
    """命中子块后按分数保留有限父块，避免上下文重复。"""
    parents = {}
    for hit in hits:
        parent_id = hit["parent_id"]
        parents.setdefault(parent_id, []).append(hit)
    ranked = sorted(
        parents.items(),
        key=lambda item: max(h["score"] for h in item[1]),
        reverse=True,
    )
    return [parent_id for parent_id, _ in ranked[:max_parents]]
```

代码里最重要的不是排序，而是**父块去重和上限**。如果没有这两个边界，父子块会变成“召回越好，上下文越胖”。

## 七、代码、表格和列表要有自己的分块器

普通段落可以用递归分割，结构化内容却需要先解析：

| 内容类型 | 分块时要保留 | 常见错误 |
| --- | --- | --- |
| 代码 | 函数/类边界、依赖导入、文件路径 | 把函数体从签名中间切断 |
| 表格 | 表头、单位、行与来源 | 只召回一行数字，丢失列名 |
| 列表 | 列表主题、编号、前置段落 | 只拿到第 3 条，不知道在说什么 |
| FAQ | 问题和答案成对出现 | 问题在一个块，答案在另一个块 |
| PDF 双栏 | 阅读顺序、页码、区域坐标 | 左右栏交错，语义被打乱 |

一旦解析结果已经破坏结构，后面换再强的 Embedding 也只是把错误更准确地向量化。分块前的清洗质量，往往比 `overlap=20%` 更值得优先投入。

![分块策略离线回放：用真实问题和最小充分证据比较不同 size、overlap 与父子块方案](/images/notes/rag-chunking-strategy/chunk-eval.svg)

## 分块评测之后还要做一次“边界反事实”

命中率上升，不代表 chunk 边界真的合理。有些配置只是把更多相邻文本塞进上下文，碰巧把答案盖住了。验收时把一个问题的关键前提移到相邻段落、表格下一行或代码块外，再比较证据完整率、无关内容比例和引用定位是否仍然稳定。

~~~yaml
boundary_counterfactual: bcf_b2d39c
question: "租户配置变化后，哪些缓存需要清理？"
base:
  required_evidence: [version_rule, cache_scope, invalidation_action]
  evidence_complete: true
perturbations:
  adjacent_paragraph: {evidence_complete: true, citation_locator: stable}
  table_next_row: {evidence_complete: false, missing: cache_scope}
  code_block_boundary: {evidence_complete: true, noise_ratio: 0.27}
decision: revise_table_parser
next: "保留表头与行来源，再重跑 golden set"
~~~

边界反事实能区分“模型上下文够长”和“切分结构正确”。如果只有把 top-k 调大才勉强找回前提，说明分块或解析仍有问题；修复结构后，应在更小的上下文里拿到完整证据，并且能定位到页码、段落或代码行。

![边界反事实卡：移动关键前提，确认 chunk 不是靠堆上下文碰巧答对](/images/notes/rag-chunking-strategy/boundary-counterfactual-card.svg)

### L5：为什么 chunk 评测要故意移动前提？

真实文档会改版、换排版和拆表格。故意移动前提能检验分块是否依赖偶然相邻关系；如果一挪位置就丢证据，应该修复结构解析或父子块关系，而不是继续增大 overlap。

## 八、overlap 该怎么调才不靠拍脑袋

重叠窗口的作用是降低边界截断概率，不是弥补所有结构问题。可以把它当成一个待验证的变量：

1. 从较小 overlap 开始，建立无重叠基线。
2. 收集答案跨边界的 bad case，记录缺失的前后文长度。
3. 只针对这类问题增加 overlap，观察重复召回和索引体积。
4. 如果 overlap 增大后证据完整率不再上涨，就停止增加。

评测至少包含四个数：

| 指标 | 解释 |
| --- | --- |
| 证据完整率 | 必要前提是否在命中片段中 |
| 无关内容比例 | 送给模型的 token 有多少不相关 |
| 重复率 | 同一事实被多个 chunk 重复召回的比例 |
| 索引膨胀 | overlap 让文档数和存储增长多少 |

如果只是为了补一句前提，就让整个知识库重叠 50%，通常是用存储成本替一个具体 bad case 买单。更好的做法是先修结构边界，必要时只对特定文档类型使用 parent chunk。

## 九、用问题反推 chunk，而不是用 chunk 迁就问题

每个评测问题都应该有一个“最小充分证据”标注：

```json
{
  "question": "租户配置变化后，哪些缓存需要清理？",
  "evidence": ["doc-17#3.2", "doc-17#3.3"],
  "must_keep": ["租户级", "用户级", "生效条件"],
  "forbidden": ["旧版配置"],
  "answerable": true
}
```

这样回放时可以回答三个具体问题：

- top-k 是否包含全部必要证据？
- 是否把互相冲突的版本一起召回？
- 加入 parent 上下文后，答案是否更完整，还是只是更长？

用这张回放图检查不同分块策略时，重点看“证据是否完整”，不要把分数最高直接等同于最终答案最好。

## 十、上线前做一轮分块体检

抽样 20 个文档，手工看四件事：标题路径是否保留、表格是否自洽、代码能否复制、chunk 是否能独立解释一个问题。再用问题集回放，比较候选方案。建议把以下结果写入索引构建报告：

```text
documents = 20
chunks = 486
avg_tokens = 382
parent_expansion_p95 = 2
evidence_complete_rate = measured_on_golden_set
duplicate_rate = measured_on_golden_set
```

这里的数字只是报告字段示例，不是实测结论。上线前必须用当前知识库的实测值替换。

## 十一、不同文档类型，分块策略不应该一把尺子

分块不是“所有资料都切 512 token”。文档类型决定了什么必须一起保留：

| 文档类型 | 必须保留的结构 | 推荐起点 | 常见坏例 |
| --- | --- | --- | --- |
| 产品说明 | 标题路径、版本、适用范围 | 段落/小节切分 | 新旧版本混在一起 |
| PDF 双栏 | 阅读顺序、页码、图注 | 版面解析后再切 | 左右栏交错 |
| 表格 | 表头、单位、行列关系 | 表格转结构化文本 | 只召回一行数字 |
| 代码 | 文件路径、类/函数边界 | 函数级 + 文件级父块 | import 和函数被拆散 |
| FAQ | 问题与答案成对 | 一问一答 | 只召回答案没有问题 |

如果解析阶段已经把表格列顺序打乱，后面再调 `chunk_size` 都只是给错误换一个尺寸。工程上宁愿让解析失败进入人工队列，也不要把看似完整的乱码写进向量库。

## 十二、表格和代码为什么需要“结构化 chunk”

表格的最小可用单位通常不是单行，而是“表名 + 表头 + 行 + 条件”。可以把一行序列化成可读文本，同时保留结构字段：

```text
表名：退款到账时效
适用地区：大陆
产品类型：普通商品
申请渠道：App
到账时间：原路退回，1–3 个工作日
```

这样召回到一行时，模型不会把“1–3 个工作日”误当成所有地区和所有产品的统一规则。原始表格仍应保留 `row_id`、`sheet`、`cell_range`，用于引用和审计。

代码则要让函数边界和文件路径一起进入 chunk：

```text
仓库：billing-service
文件：src/refund/settlement.py
符号：RefundService.settle
依赖：PaymentGateway.refund
代码：...
```

代码问答如果只把函数体向量化，模型可能找不到调用方、配置开关和测试。父块可以补文件级上下文，但仍需限制大小，不能把整个仓库塞进上下文。

## 十三、父子块的存储和去重

父子块不是额外的“全文复制”功能，而是一种索引关系。可以把索引记录抽象为：

```json
{
  "child_id": "doc-17#child-08",
  "parent_id": "doc-17#section-3",
  "child_text": "用户级缓存需要在权限变化后清理",
  "parent_text": "3. 缓存失效\n...",
  "child_vector": "...",
  "metadata": {"path": ["缓存", "失效"], "version": "2025.3"}
}
```

命中多个 child 时，先按 `parent_id` 聚合，再按最高分保留有限父块：

```python
def expand_children(hits, max_parents=3):
    grouped = {}
    for hit in hits:
        grouped.setdefault(hit["parent_id"], []).append(hit)
    ranked = sorted(
        grouped.items(),
        key=lambda item: max(x["score"] for x in item[1]),
        reverse=True,
    )
    return [parent_id for parent_id, _ in ranked[:max_parents]]
```

生产实现还要加两道限制：同一父块在上下文里只能出现一次；补回父块后重新计算 token，不超过回答预算。否则命中三个子块，模型可能收到三份相同的章节，真正的证据被重复内容挤出去。

## 十四、把 chunk 质量变成可检查的信号

“这个 chunk 看起来还行”不够稳定，可以给每个 chunk 记录一组体检字段：

| 字段 | 检查问题 |
| --- | --- |
| `title_path` | 读者只看这个块，知道它在讲什么吗？ |
| `token_count` | 是否过长、过短或大量重复？ |
| `boundary_reason` | 是标题、段落、表格还是长度上限切开？ |
| `source_locator` | 能否回到页码、段落、代码行？ |
| `standalone_score` | 是否包含结论成立的前提？ |
| `duplicate_group` | 是否与别的块重复表达同一事实？ |

可以从问题集反推 `standalone_score`：标注一个问题的最小充分证据，检查单个 chunk 或 parent 展开后是否包含全部必要条件。分数低的块优先进入人工抽样，而不是盲目增加 overlap。

## 十五、一个可运行的结构优先分块器

下面是一个只依赖标准库的最小版本，重点展示顺序：先识别标题，再保护代码和表格，最后才按长度兜底。它不是生产解析器，但足够用来写单元测试和验证边界行为。

```python
import re

def split_markdown(text, max_chars=900):
    blocks, current, path = [], [], []
    in_code = False

    def flush():
        if current:
            body = "\n".join(current).strip()
            if body:
                blocks.append({"text": body, "path": path[:]})
            current.clear()

    for line in text.splitlines():
        if line.startswith("```"):
            in_code = not in_code
        if not in_code and re.match(r"^#{1,3} ", line):
            flush()
            level = len(line) - len(line.lstrip("#"))
            path[:] = path[: level - 1] + [line[level:].strip()]
            current.append(line)
            continue
        if not in_code and not line.strip() and sum(map(len, current)) > max_chars // 2:
            flush()
            continue
        current.append(line)
        if sum(map(len, current)) > max_chars:
            flush()
    flush()
    return blocks
```

生产版要替换字符长度为 token 长度，并为表格、代码、HTML、PDF 和图片分别写解析器；但它已经揭示了最容易漏掉的原则：标题路径和结构边界是 chunk 的一部分，不是切完以后再补的一行备注。

## 十六、分层面试题：分块真正考的是证据边界

### L1 基础题

1. chunk size 和 overlap 分别解决什么问题？
2. 为什么不能把文档按固定字符数直接切？
3. 一个可用 chunk 至少要保留哪些信息？
4. 父子块中 child 和 parent 分别负责什么？
5. 表格为什么必须保留表头？

### L2 工程题

6. PDF 双栏顺序错乱时，解析和分块的先后怎么安排？
7. 代码库应该按文件、类还是函数切块？依据是什么？
8. overlap 增大后召回上涨、答案却变长，如何判断是否值得？
9. 多个 child 命中同一 parent 时，怎样去重和限量？
10. 如何标注问题的最小充分证据？

### L3 追问题

11. 为什么“按语义分块”也可能切错边界？
12. 文档中有多个版本的同一规则，chunk metadata 怎样防止混召？
13. chunk 过小导致多跳问题缺证据，除了增大 chunk 还有什么办法？
14. 如何用离线问题集自动发现结构破坏，而不是人工看全文？
15. 如果表格中一个单元格包含长段落，结构化 chunk 怎样兼顾检索和引用？

## 索引更新要保留旧 chunk 的 tombstone

知识库更新时，直接覆盖向量记录会留下一个隐蔽问题：旧 chunk 可能已经被缓存、倒排索引或父子块引用，短时间内仍会被召回。如果没有删除标记，回答会把旧规则和新规则混在一起。我的做法是先写新版本，再给旧 chunk 写 tombstone，检索和回放都按 `effective_at`、版本和 tombstone 过滤；等所有下游确认后再做物理清理。

```yaml
chunk_rollout: chr_f9a2db
document: refund-policy
old_version: v7
new_version: v8
publish:
  write_new_chunks: complete
  tombstone_old_chunks: pending
filters:
  effective_at: "2026-08-20T09:00:00Z"
  prefer_version: v8
  reject_tombstoned: true
checks:
  cache_invalidated: true
  parent_child_refs_updated: true
  old_chunk_recall: 0
decision: safe_cutover_after_replay
```

![Chunk 版本切换卡：先写新块，再 tombstone 旧块，待缓存与父子引用确认后清理](/images/notes/rag-chunking-strategy/chunk-tombstone-card.svg)

### L5：为什么不能发布新 chunk 后立刻删除旧 chunk？

向量库、缓存和父子引用不一定同时更新，直接删除会让回放无法解释某次召回，也可能让正在处理的请求拿不到它已经看到的证据。tombstone 能把“已废弃但可追溯”保留到切换完成。

## 分块器要把“边界理由”写进 metadata

只记录 chunk 的起止位置，后续很难解释它为什么在这里断开。分块时可以把边界类型写成 `heading_boundary`、`table_row_boundary`、`code_block_boundary` 或 `token_limit_fallback`，并记录父节点、前后邻接和是否跨段保留上下文。这样 bad case 不再是“这块不对”，而是能回答“是不是把表头和数值拆开了”“是不是 token 上限强行截断了代码”。

边界理由还可以驱动检索策略：命中 `table_row_boundary` 的 child 时补表头，命中 `code_block_boundary` 时补函数签名和依赖 import，命中 `token_limit_fallback` 时提高父块权重或触发二次查询。把结构信息留在 chunk lineage 里，比盲目增大 overlap 更节省上下文。

```yaml
chunk_lineage: cl_2fb10a
chunk_id: refund-policy-v8-c17
parent: refund-policy-v8-s04
boundary:
  start: heading_boundary
  end: token_limit_fallback
neighbors: [c16, c18]
context:
  title_path: [退款政策, 超时处理]
  table_header: "审批人"
  code_signature: null
retrieval_hint:
  add_parent: true
  preserve_header: true
  overlap_tokens: 48
decision: lineage_complete
```

![Chunk lineage 卡：边界理由、父子关系、邻接和检索补上下文策略一起保存](/images/notes/rag-chunking-strategy/chunk-lineage-card.svg)

### L5：为什么把 overlap 加大不能替代边界 metadata？

overlap 只能复制相邻文本，不能告诉系统哪些内容是表头、函数签名或版本约束；它还会放大重复和 token 成本。结构化边界 metadata 能让检索有针对性地补上下文，通常比无脑加 overlap 更可控。

## 分块回放还要区分“边界错误”和“排序错误”

一个问题没有命中，不一定是 chunk 切错了：可能是证据已经在某个 chunk 里，却被错误排序压到了 top-k 之外。反过来，top-k 里看到了很多相邻片段，也不代表边界完整，表头、前置条件或版本号仍可能被切在别处。我会给问题集同时标注 `gold_span`、`gold_chunk_ids` 和允许的邻接范围，再把失败分成三类：证据不存在、证据存在但排序靠后、证据命中但结构不完整。

这样调参才有方向：前一类回到解析和分块，第二类看 embedding、混合检索与 rerank，第三类检查父块补上下文和边界 metadata。不要用一次增大 chunk 或 top-k 同时掩盖三种问题。

```yaml
boundary_error_replay: ber_26ee10
query_id: refund-q-184
gold_span: [policy-v8-s04-p3, policy-v8-s04-p4]
retrieved: [policy-v8-s04-c17, faq-v6-c02, policy-v7-c09]
classification: evidence_present_rank_lost
checks:
  title_path_preserved: true
  table_header_present: false
  version_conflict: true
next_action: fix_lineage_then_rerank
```

![分块回放卡：把证据缺失、排序靠后和结构不完整拆成不同修复路径](/images/notes/rag-chunking-strategy/boundary-error-replay-card.svg)

### L5：为什么不能只看 Recall@k？

Recall@k 只能说明某个 gold chunk 是否出现，不能说明表头、前提和版本是否一起出现，也不能判断冲突证据是否被排在前面。回放要同时检查证据完整率、冲突率、排序位置和最终引用支持率。

## 把这段分析讲给面试官

“我们的分块不是固定切 512 token，而是先按标题、段落、代码和表格结构切，再用长度上限兜底。对需要精确召回的大章节采用父子块，小块命中后补父块上下文。我们用真实问题集检查证据完整率、无关内容比例、重复率和最终回答引用准确率，按结果调整 chunk size 和 overlap。”

## 2 分钟展开版

“我不会先争 256 还是 512 token，而是先确定一个命中片段是否能独立支撑具体问题。文档先按标题、段落、列表、表格和代码边界切分，token 上限只做兜底，并把路径、版本、来源写入 metadata。需要精确召回的长章节采用父子块：child 用来命中，parent 用来补上下文，同时做父块去重和 token 上限。overlap 只针对边界缺证据的 bad case 调整。最后用真实问题集标注最小充分证据，回放不同分块方案，比较证据完整率、无关内容比例、重复率和最终引用准确率。”

## 容易被扣分的说法

- “chunk 越小召回越准。”——小块可能丢掉前提和表头。
- “overlap 越大越保险。”——它会带来重复和上下文浪费。
- “把 PDF 按字符切就行。”——双栏、表格和代码需要结构化解析。
- “父子块就是把父文档全塞给模型。”——要去重、限量并控制 token 预算。

## 带走一张检查清单

- [ ] 标题路径、来源、版本和生效时间是否进入 metadata？
- [ ] 表格是否保留表头，代码是否保留函数/类边界？
- [ ] child 命中后是否会父块去重、限量和计 token？
- [ ] overlap 是否由跨边界 bad case 驱动，而不是拍脑袋？
- [ ] 问题集是否标注最小充分证据和禁止冲突证据？

## 继续追问

- PDF 双栏顺序错乱时，分块前怎么处理？
- 父子块在向量库里如何存储和去重？
- 表格问答为什么常需要结构化解析而不是纯文本切分？
