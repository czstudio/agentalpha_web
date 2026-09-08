---
slug: "tool-output-shaping"
title: "工具返回一大段 JSON，为什么 Agent 反而更容易做错"
excerpt: "工具返回得越多，Agent 不一定看得越明白。先定观察对象和字段优先级，再处理分页、截断和引用，下一步才不会被无关 JSON 带偏。"
series: "工具调用"
seriesNo: "10"
number: "47"
minutes: 24
---

一次“查客户最近三个月订单”的工具调用返回了 8MB JSON。模型读完后说客户没有退款记录，运营打开后台却发现，退款在第 7 页。

很多团队遇到这种问题，第一反应是换更大的模型。更常见的真相是：工具把数据库响应原封不动地倒进上下文，却没有告诉 Agent 哪些字段重要、结果是否完整、下一页怎么取。

## 先给一个能复述的答案

工具输出要面向下一步决策设计，而不是面向数据库设计。先定义观察契约：摘要、关键字段、完整性标记、分页游标、来源和错误；再按任务投影字段、限制大小、保留证据引用。大结果用分页或二次查询，不要静默截断；任何“没有找到”都必须说明搜索范围和是否完整。输出越短不一定越好，关键是让 Agent 知道它看到了什么、没看到什么，以及下一步能怎么查。

![工具结果从原始响应经过投影、分页和证据引用后进入 Agent](/images/notes/tool-output-shaping/output-pipeline.svg)

图 1：输出设计的目标是帮助下一步判断，不是把数据库搬进 Prompt。

## 一、先写观察契约

一个可用的结果至少回答六个问题：查了什么范围？返回了几条？是否完整？哪些字段与目标相关？下一页怎么取？证据在哪里？

```json
{
  "ok": true,
  "summary": "找到 3 个退款订单，最新一笔发生在 2026-08-12",
  "items": [
    {"order_id": "ord_a1", "status": "refunded", "amount": 199, "updated_at": "2026-08-12"}
  ],
  "completeness": {"matched": 3, "returned": 3, "is_complete": true},
  "next": null,
  "evidence": [{"ref": "orders://u_17?from=2026-05-19&to=2026-08-19", "sha256": "..."}]
}
```

`is_complete: false` 比少返回一条更危险，因为它会让模型把“当前页面没看到”说成“系统里不存在”。如果接口做了字段脱敏、权限过滤或时间截断，也要在 `warnings` 里写出来。

## 二、字段分层：决策字段、展示字段、追溯字段

不要把所有字段都平铺给模型。可以分三层：

| 层 | 用途 | 例子 |
| --- | --- | --- |
| 决策字段 | 决定下一步动作 | `status`、`refundable_amount`、`owner_id` |
| 展示字段 | 给用户看 | `display_name`、`updated_at`、摘要 |
| 追溯字段 | 发生争议时复核 | `source_ref`、版本、原始哈希 |

模型上下文里优先放决策字段和摘要，追溯字段用引用连接；用户需要详细列表时再分页读取展示字段。这样既减少 token，也避免模型在几十个相似字段里抓错。

![工具输出按决策、展示和追溯三层组织，减少无关字段干扰](/images/notes/tool-output-shaping/field-layers.svg)

图 2：给模型的不是“少一点 JSON”，而是有优先级的事实。

## 三、分页要让“没有更多”可证明

分页不是把数组切成几段就结束。结果要返回排序口径、游标、总量是否准确和下一页条件：

```json
{
  "items": [],
  "page": {
    "sort": "updated_at desc, order_id asc",
    "cursor": "eyJ1cGRhdGVkX2F0Ijoi...",
    "has_more": true,
    "total": null,
    "total_is_exact": false
  }
}
```

当 `has_more` 为真时，Agent 不能得出“没有退款”；当 `total` 是估算值时，不能拿它当精确统计。排序要稳定，否则两次翻页之间新增一条记录，可能造成重复或漏项。

## 四、截断要显式，摘要要可追溯

超过大小上限时，工具可以返回摘要和前 N 条，但必须告诉调用方被省略了什么：

```python
def shape(rows, limit=50):
    visible = rows[:limit]
    return {
        "items": project(visible),
        "completeness": {
            "returned": len(visible),
            "matched": len(rows),
            "is_complete": len(rows) <= limit,
        },
        "next": make_cursor(rows[limit]) if len(rows) > limit else None,
        "warnings": [] if len(rows) <= limit else ["result_truncated"],
    }
```

摘要不能凭空写结论。可以让服务端根据结构化字段计算“最近一笔”“金额总和”，并带上计算范围；不要让模型从截断的文本自己总结全量结果。

## 五、错误和空结果也要有结构

空数组可能意味着真的没有数据，也可能意味着权限过滤、查询范围错误或接口暂时不可用。建议区分：

```json
{"ok": true, "items": [], "completeness": {"is_complete": true}, "reason": "no_match"}
{"ok": true, "items": [], "completeness": {"is_complete": false}, "reason": "permission_filtered"}
{"ok": false, "error": {"code": "upstream_timeout", "retryable": true}}
```

这样模型可以针对 `no_match` 回答“没有找到”，针对 `permission_filtered` 请求授权，针对 `upstream_timeout` 按策略重试，而不是把三种情况都说成“没有记录”。

## 六、工具输出与上下文窗口一起设计

输出大小不能只看字符数。长文本、表格和重复字段对模型注意力的影响不同。我的做法是：

1. 默认返回任务相关的投影字段和一行摘要。
2. 复杂对象返回 `artifact_ref`，需要时由专门的 `get_detail` 读取。
3. 长列表用分页，且每页保持稳定排序。
4. 将原始响应落到可审计存储，模型只拿压缩后的证据包。
5. 在上下文预算接近阈值时停止追加，让 Agent 先总结或交给检索工具。

```text
用户问题 → search_orders(summary + page 1)
         → Agent 判断是否需要更多
         → list_next_page(cursor)
         → evidence_bundle（来源、范围、完整性）
         → 回答
```

![分页、二次查询和证据包共同控制上下文预算](/images/notes/tool-output-shaping/context-budget.svg)

图 3：让 Agent 主动请求下一页，比默认灌入全部结果更稳。

## 七、结果契约也要评测

给工具加三类测试：

- **完整性测试**：结果被截断、权限过滤、排序变化时，`is_complete` 是否准确。
- **决策测试**：字段缺失、枚举新增、空结果时，Agent 是否选择正确下一步。
- **证据测试**：摘要中的数字能否回指到原始行、查询范围和版本。

不要只测“JSON 能解析”。最重要的测试是：当返回结果不完整时，Agent 有没有诚实地说不确定。

## 八、输出 schema 要版本化，流式结果要可续接

输出契约也会演进。新增可选字段通常兼容，但把 `items` 从数组改成对象、把金额单位从分改元，都会影响 Agent 的判断。结果 envelope 建议包含 `schema_version`，并在一段时间内兼容旧字段：

```json
{
  "schema_version": "orders.search.v2",
  "summary": {"matched": 37, "returned": 20},
  "items": [],
  "page": {"cursor": "...", "has_more": true},
  "compat": {"deprecated": ["total"], "replacement": "summary.matched"}
}
```

流式工具不要只吐一串无法重放的 token。每个事件带 `event_id`、顺序号和累计游标，断线后从最后确认的事件继续；最终事件必须给出完整性和 artifact 引用。这样模型不会因为只收到前半段就误判任务完成。

![流式结果通过事件序号、游标和最终证据包支持断线续接](/images/notes/tool-output-shaping/streaming-artifact.svg)

图 4：流式不是把 JSON 拆小，而是让每一段都能确认、续接和追溯。

## 九、证据 artifact 要和展示结果分离

给模型的摘要可以很短，但原始数据、查询条件和计算过程要落到可访问的 artifact。artifact 至少保存来源、查询范围、生成时间、版本、哈希和访问策略：

```json
{
  "artifact_ref": "artifact://orders/evt_91",
  "query": {"from": "2026-05-19", "to": "2026-08-19"},
  "source_version": "orders-db-1842",
  "content_hash": "sha256:...",
  "retention_until": "2026-09-19"
}
```

展示结果只引用 artifact，不把隐私字段复制到每一轮上下文。需要复核时按主体重新授权读取，避免一个已经失效的聊天记录变成永久数据副本。

## 十、输出要同时服务模型、用户和监控

同一份结果可以分成三层：模型层只保留下一步所需字段；用户层给出易懂摘要、范围和不确定性；监控层记录耗时、命中数、截断原因、分页次数和错误码。三层不要互相冒充：监控堆栈不应直接展示给用户，用户文案也不能替代机器字段。

一个简单的观察指标集合是：`result_completeness_rate`、`page_follow_rate`、`artifact_citation_rate`、`false_no_match_rate` 和 `schema_migration_error_rate`。其中 `false_no_match_rate` 特别重要，它能揭露“工具返回成功但 Agent 过早下结论”的问题。

## 十一、分层题库：从字段设计到证据系统

### L1：工具输出为什么不能直接返回数据库 JSON？

数据库字段多、排序和分页语义不一定适合任务，超长结果还会挤压上下文。应该按决策需要投影、摘要、分页，并标明完整性和证据来源。

### L2：如何防止截断后 Agent 误以为没有更多数据？

返回 `has_more`、游标、搜索范围和 `is_complete`；截断要显式报 warning，禁止用空数组或普通成功状态掩盖不完整结果。

### L3：摘要会不会丢失细节？

原始响应保存为可追溯 artifact，摘要带计算范围和引用；需要细节时用二次查询或按引用展开，而不是把所有内容默认塞进上下文。

### L1：工具结果为什么要有 `is_complete`？

它明确告诉 Agent 当前结果是否覆盖完整搜索范围，避免把“这一页没有”误说成“系统里没有”。

### L1：空数组能代表什么？

可能是无匹配、权限过滤、查询范围错误或上游异常，必须配合 `reason`、`ok` 和完整性字段区分。

### L1：分页游标为什么要绑定排序？

没有稳定排序，翻页期间新增或修改记录会造成重复和漏项；游标要携带排序口径和过滤条件。

### L2：模型上下文快满了，输出层怎么做？

停止追加无关结果，先给摘要和证据引用；把详情放到 artifact 或二次查询工具，让 Agent 按需展开。

### L2：怎样让摘要里的数字可验证？

服务端基于结构化字段计算，返回查询范围、版本和原始行引用；不要让模型从截断文本自行推算全量统计。

### L2：流式结果断线后如何避免重复？

事件带顺序号和 event_id，客户端保存最后确认点，重连时按 cursor 请求；最终状态以 complete 事件或查询接口为准。

### L2：输出 schema 升级会影响哪些评测？

要回放字段缺失、枚举新增、旧字段弃用和金额单位变化，观察 Agent 的路由、结论、澄清和错误处理是否保持一致。

### L3：如何设计一个支持大结果的工具族？

拆成 search、get_detail、list_next_page、get_artifact 四类能力，search 返回摘要与游标，详情和原文按引用读取；每个接口共享版本、权限和审计字段。

### L3：为什么“返回更多字段”可能降低准确率？

无关字段增加注意力竞争和歧义，模型更容易抓错同名值。字段应按决策优先级投影，追溯数据用引用而不是默认展开。

### L3：怎样测出 false no-match？

构造结果被截断、权限过滤、分页未翻完和索引延迟的样本，检查 Agent 是否继续查、说明范围或表达不确定，而不是直接回答没有记录。

## 给大结果发一张输出契约卡

工具返回不是越丰富越好，而是要让下一步知道“现在能下什么结论、还缺什么”。可以把每次输出压成一张契约卡：

```yaml
tool: orders.search
schema: v3
summary: "命中 24 条，展示前 20 条"
scope: tenant=t-17 / 2026-08-01..08-19
is_complete: false
has_more: true
cursor: c-204
evidence_artifact: artifact://orders/req-784
empty_reason: null
next_actions: [list_next_page, get_detail]
```

模型消费 `summary` 和 `next_actions`，用户看到范围与不确定性，监控则记录分页、截断和 schema 版本。原始 JSON 放进 artifact，后续需要细节时再按引用展开，避免每轮上下文都背着一整张数据库表。

![工具输出契约卡把摘要、范围、完整性、游标、证据和下一步动作固定下来](/images/notes/tool-output-shaping/output-contract-card.svg)

## 输出 schema 要给迁移留出兼容窗口

版本化不是每次改字段就把旧客户端甩下车。对工具输出，先定义新增字段如何降级、旧字段何时退役、哪些语义变化必须升大版本。迁移期间同时记录生产调用方的 schema 版本，才能知道“没人用了”是不是事实：

\`\`\`yaml
schema_compatibility: sc_orders_v3
current: v3
accept:
  - v2
  - v3
additive:
  - field: is_complete
    v2_fallback: "has_more == false"
breaking:
  - field: total
    change: "从估算值改为精确值"
    action: "升 v4，禁止静默复用"
telemetry:
  callers: [planner-r17, ui-r8, audit-job-r4]
  v2_calls_last_24h: 31
sunset:
  announce: 2026-08-20
  block_after: 2026-09-03
\`\`\`

兼容层只能处理语法兼容，不能掩盖语义变化。比如“total”从“当前页数量”变成“全量数量”，即使类型仍是整数，也必须升版本并补契约测试；否则模型和前端会同时得到一个看似合法、实际含义不同的答案。

![输出 schema 兼容卡把版本、降级规则、破坏性变化、调用方和退役时间放在一起](/images/notes/tool-output-shaping/schema-compat-card.svg)

## 流式输出兼容后还要做一次“游标单调性探针”

流式工具最容易在断线重连时出现“看起来有序，实际上丢了一段”。我会用同一条 stream_id 断开连接，再从上一个游标恢复：服务端允许少量重放，客户端按 event_id 去重，最终产物只提交一次。验收的重点是游标单调、重放可去重、最终提交 exactly-one，而不是只看最后一条消息。

~~~json
{
  "cursor_probe_receipt": "cpr_20260820_45",
  "stream_id": "s-2048",
  "events_before_disconnect": [41, 42, 43],
  "resume_cursor": 42,
  "replayed_events": [42, 43],
  "deduplicated": true,
  "final_artifact_commits": 1,
  "decision": "cursor_monotonic"
}
~~~

这张回执还要记录断线点和最终提交点，方便定位“重复展示”和“重复副作用”的区别。连续的事件编号并不自动等于可靠传输：如果客户端先推进游标、后落盘，进程在两步之间崩溃，下一次恢复就会跳过尚未持久化的事件。

![流式游标单调性探针：断线重连允许重放，但最终产物只提交一次](/images/notes/tool-output-shaping/cursor-monotonic-card.svg)

### L5：为什么连续 event_id 仍可能丢数据？

因为编号只说明顺序，不说明确认语义。要把“已看到”“已写入本地”和“已提交副作用”分成三个游标，恢复时从最后一个持久化游标重放，再用 event_id 去重，才能避免先确认后落盘造成的空洞。

## L5：什么时候应该升大版本，而不是继续兼容？

当字段含义、完整性语义、排序稳定性或错误状态发生变化时，应升大版本。新增可选字段可以在兼容窗口内灰度，但不能把“类型没变”误当成“语义没变”。迁移完成后还要用调用遥测证明旧版本确实退出。

## L5：为什么输出契约里的 `is_complete` 比“返回 200”更重要？

HTTP 200 只说明请求成功，不说明结果覆盖了完整范围。没有 `is_complete` 和 `has_more`，Agent 很容易把“这一页没有”说成“系统里没有”；把完整性作为一等字段，才能让模型继续翻页或诚实表达边界。

## 给关键字段加 provenance，而不是只返回一个值

工具输出里的数字经常会被模型继续计算、比较或写回业务系统。只返回 `total=24` 不够，调用方还需要知道这个数字来自哪一页、哪个时间点、经过了什么过滤，以及是否允许作为完整结论。对会影响决策的字段，我会同时返回 provenance：来源、定位、变换、时效和敏感级别。

```json
{
  "field": "total_amount",
  "value": 1280.50,
  "unit": "CNY",
  "provenance": {
    "source": "orders_api",
    "source_version": "v4",
    "locator": "order-881.total_amount",
    "transform": "sum(items.after_discount)",
    "as_of": "2026-08-20T16:20:00Z",
    "complete": true,
    "sensitivity": "tenant_private"
  },
  "evidence_ref": "artifact://orders/881"
}
```

这样模型可以把“值”和“值的边界”一起带入下一步：发现 `complete=false` 时继续翻页，发现 `as_of` 超过 freshness budget 时改走 API，发现 `sensitivity` 不匹配时拒绝展示。`transform` 还能帮助排查单位、币种和舍入错误；原始 artifact 则保留审计需要的完整响应，不让每次推理都把大 JSON 塞进上下文。

![字段 provenance 卡：值、来源、变换、时效、完整性和证据引用一起返回](/images/notes/tool-output-shaping/provenance-card.svg)

### L5：所有字段都要带 provenance，会不会把输出变得太大？

只对影响决策、写操作和审计的字段返回完整 provenance；展示性字段可以共享一个结果级来源摘要。目标不是复制数据库，而是让关键结论能被回指、被判断是否过期。

## 分页游标要绑定快照，否则“下一页”可能不是同一份结果

只返回一个 `next_cursor` 看似够用，但数据在两次请求之间新增、删除或改排序时，下一页可能重复或漏项。对会影响决策的列表，游标至少要绑定 `snapshot_id`、排序字段、过滤条件哈希和租户上下文；服务端发现这些条件变化，就返回明确的 `cursor_stale`，而不是默默拼出一份混合结果。

恢复时也要区分“客户端重复请求”和“游标真的过期”。同一 `cursor + request_id` 可以安全返回已缓存的页面；换了过滤条件或数据快照，就必须从第一页重新建立游标。这样 Agent 才能知道“我已经看完这个快照”，不会因为某一页突然变空就宣布没有更多数据。

```json
{
  "items": [{"id": "doc-17", "score": 0.91}],
  "is_complete": false,
  "next_cursor": {
    "snapshot_id": "snap-20260820-09",
    "sort": "updated_at.desc,id.asc",
    "filter_hash": "sha256:7b2f...",
    "tenant": "t_07",
    "offset_token": "p3"
  },
  "cursor_replay": "same_request_id_returns_same_page"
}
```

![分页游标绑定快照：同一请求可重放，过滤或快照变化就明确过期](/images/notes/tool-output-shaping/cursor-snapshot-card.svg)

### L5：为什么不能用 offset 代替稳定游标？

offset 只描述位置，不描述当时的排序和数据集合。前面的记录发生插入或删除后，offset 会把某些条目跳过或重复；稳定游标把快照和排序一起带上，才能让恢复和审计可复现。

## 输出压缩要守住“证据闭包”

把大结果压成摘要时，最容易压掉的恰好是回答所需的边界。比如订单列表只保留总金额，却丢了退款状态和时间范围，模型虽然拿到一个漂亮的数字，却无法证明它覆盖了哪批订单。我会给压缩器设一条证据闭包规则：凡是进入结论的字段，必须能回指原始 artifact、过滤条件和完整性标记；压缩失败就返回 `needs_expand`，不静默截断。

```yaml
evidence_closure: ec_20260820_76
artifact: orders.snapshot.881
summary_fields: [total_amount, order_count, as_of]
required_refs:
  - field: total_amount
    locator: orders[*].amount
    filter_hash: sha256:f13...
  - field: order_count
    locator: orders[*].id
    complete: true
compression:
  max_tokens: 900
  omitted_fields: [customer_phone, internal_note]
  on_missing_ref: needs_expand
decision: safe_to_answer
```

![工具输出证据闭包卡：摘要字段必须能回指 artifact、过滤条件和完整性](/images/notes/tool-output-shaping/evidence-closure-card.svg)

### L5：为什么“摘要看起来正确”仍可能不能用？

摘要只是一种表示，不是证据。若没有范围、时间点和来源定位，任何下游计算都无法判断它是否完整、是否过期；发现闭包不成立时，应展开原始结果或明确说无法确认。

## 60 秒面试回答

工具输出要服务于下一步决策，而不是原样复制数据库。我的结果契约会返回摘要、任务相关字段、搜索范围、完整性标记、分页游标、错误码和证据引用。长结果通过稳定排序分页或二次查询，任何截断都显式标记，空结果区分无匹配、权限过滤和上游异常。原始响应落到可审计 artifact，模型消费压缩后的证据包，需要时再展开。评测重点是结果不完整时，Agent 能不能正确请求下一页或诚实表达不确定。

## 带走一张检查清单

- [ ] 输出是否包含范围、数量、完整性和下一页信息？
- [ ] 是否区分决策字段、展示字段和追溯字段？
- [ ] 截断、权限过滤和空结果是否显式标记？
- [ ] 摘要中的关键数字能否回指到原始证据？
- [ ] 是否有大结果、字段缺失和排序变化的契约测试？

## 相关笔记

- [MCP 解决了什么问题？工具协议标准化之后仍有哪些坑](/notes/mcp-protocol-boundaries)
- [RAG 答案看着对，怎么证明它真的有依据？](/notes/rag-grounded-evidence)
- [Agent 评测不能只看成功率：从结果到轨迹的五层指标](/notes/agent-eval-success-rate)

## 参考

- [Agent 岗面试宝典 v3：工具调用章节（本地导入）](/content/imports/agent-interview-v3.feishu.md)
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
