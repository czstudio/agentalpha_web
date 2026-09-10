---
slug: "llm-long-context"
title: "上下文窗口变长了，为什么 Agent 还是会漏信息？"
excerpt: "长上下文系统的瓶颈往往不是能塞多少 token，而是关键事实能否被定位、保留和引用。把上下文预算拆成任务、证据、工具和输出，并用中间信息测试验证，才能谈长文能力。"
series: "LLM 基础"
seriesNo: "04"
number: "73"
minutes: 22
---

把上下文窗口从 32k 配成 128k，产品页上的数字变大了，用户却可能还是找不到藏在中间的那句规定。长上下文有三层问题：信息是否被送进窗口，模型是否在长距离中保留它，最终答案是否引用了正确证据。只讨论最大 token 数，会把三层问题混成一个宣传指标。

## 先给一个能复述的答案

长上下文设计要先做预算和分层：任务指令、用户事实、检索证据、工具结果、历史摘要和输出预留分别计算；低价值内容压缩或外置，高价值证据保留来源和时间。评测不能只测“能否读完”，还要把关键事实放在开头、中间、结尾和多个文档中，检查召回、引用和冲突处理。必要时用检索、摘要和分阶段推理替代一次性塞满。

![长上下文的预算与证据分层](/images/notes/llm-long-context/context-budget.svg)

## 一个实用的上下文预算

$$
C_{total}=C_{task}+C_{user}+C_{evidence}+C_{tool}+C_{history}+C_{output}\le C_{window}
$$

预算不能只留给输入。若输出要生成结构化报告、引用和下一步动作，就得提前留出空间；工具结果也要限制每个调用的最大 token。

```python
def pack_context(parts, limit, reserve_output=1200):
    budget = limit - reserve_output
    selected = []
    for part in sorted(parts, key=lambda p: (-p["priority"], p["tokens"])):
        if part["tokens"] <= budget:
            selected.append(part)
            budget -= part["tokens"]
    return selected, budget
```

排序不是简单按“最新”或“最相似”，还要考虑权限、证据质量、任务相关性和是否能被引用。

## 为什么中间信息容易丢

长序列中，注意力需要同时处理大量相似或无关 token；关键事实被重复标题、表格和工具日志包围时，模型可能关注开头和结尾，忽略中间。解决方案通常是：

- 先检索高相关段，再做长文综合；
- 将关键事实结构化为字段和证据表；
- 给每段保留来源、时间和实体标签；
- 在生成前让模型列出将要使用的证据；
- 对冲突信息显式标记，不让摘要静默覆盖。

![长文测试把关键事实移动到不同位置](/images/notes/llm-long-context/needle-test.svg)

## 评测要测“针”而不是只测摘要

构造 needle-in-a-haystack 任务：把一条唯一事实放在文档开头、中间、末尾和嵌套表格，询问它并要求引用位置。再增加干扰事实、同名实体、版本冲突和无答案样本。

| 维度 | 示例指标 |
| --- | --- |
| 进入 | 关键片段是否被打包 |
| 定位 | 关键事实召回率 |
| 证据 | 引用是否指向正确片段 |
| 冲突 | 版本冲突是否被识别 |
| 体验 | P95、成本、截断率 |

## 长上下文与 RAG 的关系

RAG 不是长上下文的对立面。检索负责减少无关内容，长上下文负责在已筛选的证据上综合。把所有文档直接拼进去，既浪费窗口，也让引用和权限更难控制。

## 一个具体场景：把 80 页制度压成可验证的回答

用户问：“今年出差去新加坡，住宿和打车分别怎么报？”原始资料有 80 页，包含总部政策、地区补充和去年版本。最笨的做法是把所有文字塞进 128k 窗口；更稳的做法是分成四步：

1. 识别实体、时间和费用类型，形成查询约束；
2. 用混合检索召回当前版本和地区补充，保留文档版本；
3. 把上限、例外和适用人群抽成结构化证据表；
4. 让模型只在证据表和少量原文上生成，并逐条挂引用。

最后的答案可以很短，但每个数字都能回到“哪一份政策、哪一页、什么生效时间”。长上下文应该服务于证据之间的比较，而不是替代检索和版本管理。

![长文证据从召回到引用的桥接](/images/notes/rag-grounded-evidence/grounding-coverage.svg)

## 两阶段打包比一次性拼接更容易解释

第一阶段只做“选择哪些信息进入上下文”，第二阶段再做“如何组织这些信息”。选择阶段关注任务相关性、权限、时效、来源等级和 token 预算；组织阶段按实体、时间或问题小节排序，给每段带上稳定的 `evidence_id`。这样模型即使没有回答，也能指出是证据不足还是预算不足。

```python
def build_context(question, evidence, max_tokens, reserve):
    candidates = [e for e in evidence if e["acl_ok"] and not e["expired"]]
    candidates.sort(key=lambda e: (
        -e["relevance"], -e["source_rank"], -e["freshness"]
    ))
    selected, used = [], 0
    for item in candidates:
        cost = item["tokens"] + 32  # evidence_id 与分隔符
        if used + cost + reserve > max_tokens:
            continue
        selected.append(item)
        used += cost
    return {
        "question": question,
        "evidence": selected,
        "budget_used": used,
        "truncated": len(selected) < len(candidates),
    }
```

这里的 `truncated` 要进入评测和用户体验。系统不能悄悄截断后仍用肯定语气回答；如果关键证据未被选中，应转为澄清、缩小问题或分阶段处理。

![上下文容量与准入控制](/images/notes/llm-kv-cache/capacity-admission-card.svg)

## 冲突、重复和无答案要单独设计

长文系统最危险的不是“没找到”，而是找到两份互相矛盾的内容后随便选一份。可以给证据增加 `effective_at`、`source_rank` 和 `supersedes` 字段，生成前先做冲突分组：

| 情况 | 处理 | 对用户的表达 |
| --- | --- | --- |
| 同一事实重复且版本一致 | 合并引用 | 给出一个结论和多个来源 |
| 新旧版本冲突 | 按生效时间选择并提示 | 说明使用的是哪一版 |
| 权限不同导致证据缺口 | 不推测 | 提示需要的访问范围 |
| 没有满足条件的证据 | 拒答或澄清 | 明确缺少什么，而不是编答案 |

冲突处理不是模型的“常识判断”，应该有可测试的规则和回放记录。

## 评测矩阵：位置只是第一维

针测（needle test）可以验证关键事实在不同位置是否被找到，但还要叠加四个变量：干扰事实数量、同名实体、版本冲突、输出格式。一个可执行的矩阵如下：

```yaml
needle_matrix:
  positions: [head, middle, tail, table_cell]
  distractors: [0, 5, 20]
  versions: [single, conflicting]
  answer_mode: [short, cited, structured]
assertions:
  - evidence_id_present
  - quote_matches_source
  - abstain_on_missing
```

![长上下文评测与 RAG 评测的分层关系](/images/notes/rag-retrieval-pipeline/evaluation-layers.svg)

## 什么时候反而应该缩短上下文

如果任务只需要一个字段、证据版本非常明确，或用户希望快速得到一个可执行动作，短上下文加精确检索通常更好。长上下文适合跨段落综合、比较多份材料和解释冲突；它不是所有问题的默认升级档。可以把上下文长度当作一个受预算约束的路由变量，而不是产品宣传数字。

## 长上下文路由：先估算，再选择窗口

可以为每个请求估算三个量：证据数量、跨段关系和冲突风险。估算结果决定使用短上下文、分批摘要还是整段输入：

| 请求特征 | 推荐策略 | 原因 |
| --- | --- | --- |
| 1～3 个证据片段、无冲突 | 精确检索 + 短窗口 | 延迟和成本最低 |
| 多份材料、需要比较 | 两阶段打包 | 先筛选再综合，易回放 |
| 版本冲突、否定条件多 | 小窗口 + 结构化证据 | 防止旧事实覆盖新事实 |
| 跨章节需要引用原文 | 长窗口，但保留 source map | 防止摘要抹掉上下文 |

```python
def route_context(query, *, evidence_count, conflict_count, relation_depth):
    if conflict_count and evidence_count <= 8:
        return "structured_short"
    if relation_depth >= 3 or evidence_count > 24:
        return "two_stage_pack"
    if evidence_count <= 3:
        return "precise_short"
    return "bounded_long"
```

路由本身也应进入 trace。出现答案回归时，先确认是不是上下文策略变了，而不是直接归因于模型。

## 位置偏差要和引用完整性一起看

“找到了针”并不表示答案可靠。如果模型找到了正确片段，却引用了同一主题的另一份旧材料，用户仍会得到错误结论。评测时可记录：

$$
quality=needle\_found\times citation\_match\times condition\_preserved
$$

三个因子中任意一个为零，最终质量就不应判为通过。尤其要抽查表格单元格、脚注、否定句和跨页标题，这些位置最容易在拼接或摘要时丢失。

![长文档中的关键事实、位置和引用对齐](/images/notes/rag-grounded-evidence/grounding-coverage.svg)

## 压缩结果要有“原文回查”入口

长上下文不可避免会压缩，但压缩器不应该成为唯一事实源。每个摘要结论至少保留 `source_ids` 和原文字符区间：

```json
{
  "summary_claim": "住宿上限为 800 元，上海适用",
  "source_ids": ["policy-v4#p2"],
  "spans": [{"start": 118, "end": 174}],
  "conditions": ["普通员工", "2026-08-01 后生效"],
  "confidence": 0.96
}
```

当用户追问“这个数字从哪来”，系统可以回查原文；当版本更新时，也能批量标记受影响摘要，而不是等待模型在历史上下文里偶然发现。

## 长窗口上线前的四道门

```yaml
long_context_gates:
  - name: evidence_preserved
    pass: "citation_coverage >= 0.92"
  - name: version_safe
    pass: "stale_claim_rate <= 0.01"
  - name: tail_latency
    pass: "p95_ms <= 3000"
  - name: budget_safe
    pass: "overflow_rate == 0"
on_fail:
  - shrink_context
  - retrieve_again
  - ask_clarification
```

门禁失败时，系统可以缩短上下文或重新检索，但不能静默截断最后的证据和终态。

## 压缩策略要按信息类型选择

“把前文总结一下”不是完整的长文策略。事实、条件、例外和过程日志的保留方式不同，建议先做抽取式压缩，再对可读性做轻量改写：

| 信息 | 首选处理 | 必须保留 |
| --- | --- | --- |
| 数字、日期、阈值 | 原文抽取 | 原始单位、适用条件、版本 |
| 规则与例外 | 结构化卡片 | `if/else` 关系和优先级 |
| 会议过程 | 时间线摘要 | 决策人、决策理由、未决项 |
| 工具回执 | 状态折叠 | request id、错误码、终态 |
| 大段背景 | 分层摘要 | 可回查的 source span |

可以把一段压缩结果看成带损编码，先定义允许损失，再决定摘要长度。对高风险答案，宁可保留原文片段，也不要为了节省 token 把“但”“除非”“仅限”这类条件删掉。

### 用增量摘要避免反复改写

长任务每轮都把完整历史重新摘要，会引入漂移。更稳的方式是维护一个不可变事实账本和一个可更新的工作摘要：

```python
def merge_summary(summary, new_events, facts):
    for event in new_events:
        if event["kind"] == "fact" and event["source_id"] not in facts:
            facts[event["source_id"]] = event["text"]
        elif event["kind"] == "decision":
            summary["decisions"].append({"text": event["text"], "at": event["at"]})
        elif event["kind"] == "open_question":
            summary["open_questions"].add(event["text"])
    summary["fact_count"] = len(facts)
    return summary, facts
```

每次回答都从 `facts` 重新选择证据，摘要只负责告诉模型“现在进行到哪一步”。这样当制度版本更新时，可以替换事实账本，而不必相信旧摘要里的数字。

压缩后的事实还应设置过期时间。政策、价格、权限这类内容不能无限复用；如果 `expires_at` 已过，系统应回到检索层重新取证，而不是继续把旧摘要塞进更大的窗口。

## 长上下文的上线演练：故意把信息放在最难的位置

发布前可准备一组“中间段、脚注、否定句、跨文档冲突”的样本，分别记录模型是否找到、是否引用、是否保留条件。建议把每条样本的预期答案写成结构化断言，而不是只保存一段参考文本；这样能区分“答案意思相近”和“漏掉一个限制条件”两类结果。

对用户可见的长文回答，还应显示“依据了哪些版本、是否存在未解决冲突”。这不是把内部 trace 全部暴露出来，而是给结论一个轻量的证据入口：用户能点开原文，系统也能在版本变化时主动提醒。

如果没有足够证据，界面应明确显示“当前材料不足”，而不是用更长的窗口继续猜测；长上下文的价值是扩大可验证信息的容量，不是扩大幻觉的篇幅。

这条边界也适用于面试回答：先说明窗口、预算和证据门禁，再谈模型能处理多少 token，答案会比单报一个最大上下文数字更可靠。

## 高频追问

**L1：长上下文的核心问题是什么？**

不是最大窗口，而是关键事实的进入、留存、定位和正确引用。

**L2：为什么不能把所有历史都塞进 prompt？**

会增加 token 成本、噪声和中间信息丢失；应该把历史摘要、结构化状态和可检索原文分层保存。

**L2：上下文压缩会不会丢信息？**

会，所以关键事实要保留原文引用和结构化字段；压缩结果不能替代可回溯证据。

**L3：如何评测长上下文？**

测不同位置的关键事实召回、干扰项、冲突版本、引用准确率和成本延迟，而不只是给一篇长文让模型写摘要。

**L5：什么时候分阶段推理更好？**

当证据量、权限或输出结构复杂时，先检索和提取，再综合和验证，通常比一次长 prompt 更可控。

## 60 秒面试回答

长上下文设计我会先拆预算：任务、用户事实、证据、工具、历史和输出分别限制，低价值内容摘要或外置，高价值内容保留来源和版本。评测用针在开头、中间、结尾和冲突文档中测试，观察进入率、关键事实召回、引用准确率、截断、P95 和成本。RAG 与长上下文是互补关系，先筛选相关证据，再让模型做综合，必要时采用分阶段推理。

## 自检清单

- [ ] 能写出上下文预算公式
- [ ] 能解释中间信息丢失的风险
- [ ] 有 needle、冲突和无答案测试
- [ ] 长上下文与 RAG、摘要、结构化状态分工清楚

## 相关阅读

- [Tokenizer 与位置编码](/notes/llm-tokenizer-position-encoding)
- [Attention 与上下文窗口](/notes/llm-attention-context)
- [RAG 检索流水线](/notes/rag-retrieval-pipeline)

## 资料来源

- 《Agent 岗面试宝典 v3 · 精华版》（本地飞书资料整理）
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
