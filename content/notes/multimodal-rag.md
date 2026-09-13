---
slug: "multimodal-rag"
title: "多模态 RAG 怎样把图片、表格和文字一起查出来？"
excerpt: "多模态 RAG 不是给文本 RAG 加一列 image_url，而是把文字、表格、图片和坐标组织成统一证据对象，再用跨模态召回、元数据过滤和引用回溯回答问题。"
series: "多模态"
seriesNo: "08"
number: "37"
minutes: 20
---

设备维修 Agent 的知识库里有维修手册、接线图和参数表。用户问“这根蓝线接哪个端子”，纯文本只能找到“蓝线”，找不到图里的端子编号；只做图片向量检索，又带不回参数表里的额定电压。

## 能背走的版本

多模态 RAG 的核心，是先把不同模态转成可追溯的证据对象，而不是把图片只当成附件。文本段落、表格、图片区域和图表数据各自保留原始内容、坐标、来源页和语义摘要，再建立文本索引、向量索引和关系/元数据索引。查询时先判断问题需要哪类证据，再跨模态召回候选，按来源、时间、权限和空间关系过滤，最后组装带引用的证据包交给模型。答案必须能回到原文、原图或表格单元格，检索不到时明确拒答。

![多模态 RAG 的摄取、跨模态召回和带引用生成链路](/images/notes/multimodal-rag/retrieval-pipeline.svg)

图 1：多模态索引不是一张表，而是多个索引共同指向同一份来源。

## 一、先设计统一的证据对象

### 不同模态，共同字段

每种对象的内容字段不同，但都应携带稳定身份、来源、权限和版本：

```json
{
  "evidence_id": "manual-17-p42-img03-region-b",
  "kind": "image_region",
  "document_id": "manual-17",
  "page": 42,
  "bbox": [0.16, 0.32, 0.79, 0.84],
  "text_summary": "端子排 X1 至 X4 的接线图",
  "caption": "图 4-2 控制柜接线",
  "parent_id": "manual-17-p42",
  "acl": ["maintenance"],
  "version": "2026-07-01",
  "source_url": "..."
}
```

段落可以用 `text` 替代 `bbox`，表格增加 `row/col`，但 `evidence_id` 和 `parent_id` 让所有模态都能回到原文档。

### 摘要不能替代原始证据

图片 caption、表格线性化文本和 OCR 摘要适合检索，但回答时要同时保留原始图片区域或表格结构。摘要错了，原始证据可以帮助审阅；只留摘要，错误就不可逆了。

## 二、索引要分层，不要强行用一个向量库解决全部问题

| 索引 | 适合解决的问题 | 典型字段 |
| --- | --- | --- |
| 关键词 | 型号、编号、术语、精确数字 | BM25、倒排词 |
| 语义向量 | 同义表达、自然语言问题 | text/image embedding |
| 关系/元数据 | 页码、版本、权限、父子块 | document_id、parent_id、acl |
| 空间索引 | 图中区域、表格单元格关系 | bbox、row、col |

例如“X3 端子额定电压”需要关键词找到 `X3`，关系索引补出它所在的图和表，语义向量找出手册中的说明，最后按版本和权限过滤。单一向量相似度很难同时满足这些约束。

## 三、查询路由先判断需要什么证据

可以先把问题分类：

```python
def route(question):
    if asks_for("where", question) or has_visual_reference(question):
        return ["image_region", "layout", "text"]
    if asks_for("row", "column", "amount", question):
        return ["table", "ocr", "text"]
    if asks_for("trend", "compare", question):
        return ["chart", "table", "text"]
    return ["text", "image_caption", "table"]
```

路由不是为了给模型贴标签，而是为了限制检索空间和上下文预算。一个“这张图里的蓝线接哪”的问题，不应把整本维修手册的段落都塞进上下文。

![查询路由把自然语言问题映射到文本、表格、图像区域和空间关系证据](/images/notes/multimodal-rag/query-routing.svg)

图 2：先决定证据类型，再做检索，能减少无关内容和 token 浪费。

## 四、跨模态召回要保留“为什么找到”

候选结果不要只返回一串分数，还要记录命中原因：

```json
{
  "evidence_id": "manual-17-p42-img03-region-b",
  "retrieval": [
    {"channel": "keyword", "term": "X3", "score": 5.8},
    {"channel": "image_text", "query": "蓝线 端子", "score": 0.84},
    {"channel": "parent_relation", "parent": "table-X1", "score": 1.0}
  ],
  "filter": {"version": "2026-07-01", "acl": "maintenance"}
}
```

这样排查时能知道是关键词召回了编号，还是图片语义召回了错误的相似图。重排阶段可以用问题与证据摘要、区域关系和版本新旧共同打分，而不是只看向量距离。

## 五、表格和图片要一起检索

常见的“图 + 表”关系包括：图片中的编号对应表格中的规格，图表中的系列对应正文里的结论，截图中的按钮对应操作步骤。摄取时可以建立显式边：

```text
image_region(X3) --described_by--> table_row(X3)
image_region(X3) --explained_by--> paragraph(接线说明)
table_row(X3)    --version_of-->    manual-17@2026-07-01
```

组装上下文时优先带同一 `parent_id` 下的相关对象，防止把来自不同版本或不同设备的证据混在一起。

## 六、证据包应该对生成模型友好

生成阶段不应收到一堆没有标签的图片链接。可以采用固定模板：

```text
[Evidence E1 | image_region | manual-17 p42 bbox=(...)]
图示：X3 端子位于端子排第二列，蓝线从左下进入。

[Evidence E2 | table_row | manual-17 p43 row=6]
X3 额定电压：24V DC。

回答要求：只使用 E1/E2；如果图示无法确认接线方向，明确说明不确定。
```

引用 ID 让模型有机会正确归因，前端也能点击回原图和表格。对高风险维修场景，可要求模型输出“结论 + 证据 ID + 不确定性”。

## 七、权限和版本是多模态 RAG 的隐形坑

图片经常存放在对象存储，文本在向量库，权限却在业务系统。检索返回结果时必须在服务端做 ACL 过滤，不能把私有图片 URL 直接交给模型或前端。版本也不能只靠更新时间排序：同一张接线图可能有旧版和新版，回答要带 `version` 并按设备型号过滤。

## 八、跨模态重排和去重

多路召回之后不要直接把结果拼进上下文。文本摘要、图片区域和表格行可能指向同一段证据，也可能来自同一父文档的不同版本。可以先按统一特征重排：

```text
score = 0.35 * semantic + 0.25 * lexical
      + 0.20 * modality_fit + 0.10 * version_match
      + 0.10 * parent_coherence
```

其中 `modality_fit` 表示它是否真的回答了问题要求的模态，`parent_coherence` 表示它和已经选中的证据是否属于同一文档、设备和页码范围。重排后还要做两次去重：

1. **区域去重**：同一张图的整页摘要、局部框和 OCR 文本只保留一个主证据，其余作为可展开的补充。
2. **父块去重**：同一 `parent_id + version` 下的多个对象合并为一个证据组，避免五个相似向量占满上下文。

这样做的目的不是少放证据，而是让每个上下文槽位都能解释“为什么需要它”。

![跨模态召回先统一打分，再按区域与父文档去重，最后形成可解释的证据组](/images/notes/multimodal-rag/cross-modal-rerank.svg)

## 九、证据冲突和不可回答样本

多模态系统必须允许自己说“不确定”。例如图片标注写着“端子 X3”，但同一版本的表格行却把额定电压写成两个值。此时不能用相似度最高的对象覆盖另一个，而应输出冲突记录：

```text
[Conflict C1]
E1: drawing-17 p42 bbox=(0.61,0.34,0.08,0.06), label=24V DC
E2: table-17 p43 row=6, value=48V DC
reason: same parent/version, conflicting value
action: abstain_and_request_model_number
```

冲突处理可以按三步走：先判断是否同一父文档和版本；再检查单位、坐标和 OCR 置信度；仍无法消解时拒答并请求最小补充信息。评测集要专门放入“图中没有答案”“表格缺一列”“旧版图 + 新版文字”这类不可回答样本，拒答质量本身就是能力。

## 十、怎么评测多模态 RAG

| 维度 | 指标 | 需要的证据 |
| --- | --- | --- |
| 召回 | text/image/table recall@k | 是否找到正确模态和父块 |
| 对齐 | cross-modal grounding | 图中区域与表格行是否对应 |
| 回答 | answer accuracy、citation accuracy | 结论、单位、来源框 |
| 可靠性 | 版本/权限错误率 | 是否引用过期或无权内容 |
| 成本 | token、图片处理时间 | 单问的端到端预算 |

测试集要包含“同名不同版本”“图片相似但型号不同”“答案同时依赖图和表”“图中没有答案”等样本。

## 十一、把跨模态答案做成可回放证据包

当用户说“图里这根线对应表格哪一行”时，最终答案至少要留下三段关系：问题如何路由、哪些证据被选中、生成内容引用了哪些证据。可以把它们固定成一个可回放对象：

```json
{
  "query": "蓝线接哪个端子，额定电压是多少？",
  "route": ["image_region", "table_row", "text"],
  "evidence": [
    {"id": "E1", "kind": "image_region", "page": 42, "bbox": [0.16, 0.32, 0.79, 0.84]},
    {"id": "E2", "kind": "table_row", "page": 43, "row": 6}
  ],
  "rerank": {"version_match": 1, "parent_coherence": 1},
  "answer": {"text": "接 X3；额定电压 24V DC", "citations": ["E1", "E2"]}
}
```

回放时可以逐层替换：只重跑路由，检查是否选错模态；只重跑重排，检查是否把旧版证据推上来；只重跑生成，检查模型是否越过证据包自行补全。这样“检索正确但答案错误”不再是一个笼统故障，而是能定位到具体阶段。

![跨模态答案用路由、证据、重排和引用组成可回放的证据包](/images/notes/multimodal-rag/grounding-replay.svg)

证据包还应记录权限过滤前后的候选数量、去重原因和拒答原因。发生版本争议时，审阅者可以看到哪些候选被服务端排除，而不是只看到模型最终拿到的两张图片。

## 面试官的三层追问

### L1：多模态 RAG 和文本 RAG 的区别？

区别不只是多存图片，而是证据对象要保留模态、坐标、结构、来源和关系；检索和生成都要支持跨模态引用。

### L2：图片怎么检索？

为图片或区域生成可检索摘要和视觉 embedding，同时保留关键词、元数据和空间索引；查询时按问题路由选择多个通道，再统一重排。

### L3：如何避免引用错版本？

把版本、设备型号和 ACL 作为服务端过滤条件，返回证据时带来源版本，禁止让模型在多个版本之间自行猜。

### L4：跨模态重排为什么不能只看向量相似度？

相似度只能说明“像”，不能说明模态匹配、版本一致或是否重复。要把问题需要的模态、父文档一致性、版本和区域关系一起纳入重排，并保留每个分数来源。

### L4：图和表格冲突时，应该选置信度更高的那个吗？

先确认是否同一版本、同一设备和同一单位；如果仍冲突，就把两个证据并列记录并拒答或请求型号。不能用一个黑盒置信度替用户做不可逆判断。

### L5：多模态 RAG 的上下文太长怎么办？

先做父块和区域去重，再按问题所需模态设预算；保留原始证据 ID 和可回链位置，压缩的是描述，不是事实。压缩后引用无法回到原图或单元格，就不能算优化成功。

### L5：如何定位“检索正确但答案仍错”？

先回放同一份证据包，确认最终答案引用的 evidence_id 是否真的存在；再检查生成前是否把表格行、图片区域和版本标签完整传入。如果引用正确但结论仍错，加入“只允许基于证据回答”的对照，检查模型是否把常识补全当成事实；若对照仍错，就回到证据对象的结构和单位关系，而不是继续调向量召回。线上要把路由、候选、过滤、重排和引用分别记录，避免用一个最终准确率掩盖阶段性错误。

## 跨模态答案要发一张定位凭证

图片、表格和文字一起进入上下文后，最容易丢的是“这句话究竟对应哪一个区域”。给最终答案附一张定位凭证，记录模态、坐标、版本、单位和冲突状态：

```json
{
  "answer_id": "ans-204",
  "claim": "蓝线接 X3，额定电压 24V DC",
  "citations": [
    {"evidence_id": "E1", "kind": "image_region", "page": 42, "bbox": [0.16, 0.32, 0.79, 0.84]},
    {"evidence_id": "E2", "kind": "table_row", "page": 43, "row": 6}
  ],
  "version_match": true,
  "unit_check": true,
  "conflict": null,
  "status": "grounded"
}
```

凭证让审阅者能从答案跳回图片区域或表格行；如果 `version_match=false` 或 `unit_check=false`，系统只能转人工或拒答。它也能帮助定位“证据都对，但跨模态关系连错”的错误，而不是继续盲目扩大召回。

![跨模态定位凭证把答案、图片区域、表格行、版本和单位校验固定在一起](/images/notes/multimodal-rag/grounding-receipt.svg)

## 跨模态证据包还要记录“空间范围”

一条引用链接仍然太粗。对于接线图、发票和仪表盘，真正支持结论的往往只是页面的一小块区域；如果只保存 page=42，审阅者还得在整页里猜模型看到了什么。可以把空间范围直接写进证据契约：

~~~yaml
multimodal_grounding_contract: mgc_85ea6b
question_id: q_voltage_204
evidence:
  - evidence_id: E1
    type: image_region
    page: 42
    region: "terminal_block"
    bbox: [0.16, 0.32, 0.79, 0.84]
    unit: "V"
  - evidence_id: E2
    type: table_row
    page: 43
    row: 6
    column: "rated_voltage"
    unit: "V DC"
consistency:
  version_match: true
  unit_match: true
  spatial_overlap: 0.81
missing: []
decision: grounded
~~~

这里的 bbox 可以是归一化坐标，表格则至少保留行列定位。模型生成前先检查空间重叠、版本和单位；任一项不满足，就把状态改成 clarify 或 refuse，而不是用一条“相关图片”继续生成。这样做还有一个好处：当答案错了，可以区分“召回到了错误区域”和“看对区域却把关系读反了”。

![跨模态证据包把图片区域、表格行、版本和单位收束成一张空间定位凭证](/images/notes/multimodal-rag/spatial-grounding-card.svg)

## L5：为什么跨模态引用必须带 bbox？

因为页码只能回答“在哪一页”，不能回答“哪一块支持这个结论”。bbox、表格行列和版本号让审阅者能复核证据边界，也能阻止模型把同页的注释、旧型号或旁边的数字误拼进答案。

## L5：为什么一条引用链接还不够？

引用链接只能说明来源存在，不能说明答案对应图片的哪一块、表格的哪一行以及是否同一版本。跨模态系统必须保留稳定 evidence_id、坐标或单元格、父文档和校验结果，才能把“看起来相关”升级成可复核的支持关系。

## 图和表冲突时，先做关系校验

跨模态问答最危险的错误，不是完全找不到证据，而是图片和表格各自“看起来都对”，模型却把它们拼成了错误关系。例如接线图标的是旧型号，表格行是新型号；或者图片写 `24 V DC`，表格列却是 `24 kV`。这类样本不能靠一个总相似度解决，要把版本、单位、设备和空间关系拆出来校验。

```yaml
conflict_case: cm_580f3f
question: "X3 端子额定电压是多少？"
evidence:
  - id: E1
    kind: image_region
    device: panel-a
    version: v2
    bbox: [0.16, 0.32, 0.79, 0.84]
    value: "24 V DC"
  - id: E2
    kind: table_row
    device: panel-a
    version: v1
    row: 6
    value: "24 kV"
checks:
  version_match: false
  unit_match: false
  spatial_relation: true
decision: refuse_and_request_model
```

先做版本和单位校验，再判断两个证据是否真的属于同一设备、同一端子和同一空间范围。只要有一项失败，答案就应该转人工或追问型号；不能让模型用“更常见的值”替用户做不可逆判断。把冲突记录成结构化样本，还能反向评估路由、重排和解析器到底是哪一层放进了错误证据。

![跨模态冲突先校验版本、单位、设备和空间关系，再决定回答、追问或拒答](/images/notes/multimodal-rag/cross-modal-conflict-card.svg)

### L5：为什么不能只选置信度更高的证据？

置信度通常只反映某个模型对局部内容的把握，不代表它与另一份证据属于同一版本、单位或设备。跨模态答案要先满足关系约束，再在同一约束内比较置信度；约束不满足时，拒答比猜测更可靠。

## 跨模态证据包要有“权限与过期时间”

图片区域、表格单元格和文本段落即使语义相关，也不应该无限期共享。证据包需要记录 ACL 快照、来源版本和过期时间，生成前再由服务端过滤一次；不能只在向量库写入时检查权限。尤其是工单截图、合同扫描件和内部仪表盘，权限变化后旧 embedding 仍可能被命中。

```yaml
evidence_bundle: eb_8ea5ae
items:
  - id: img_77_bbox_03
    parent: contract-8842
    acl_epoch: 418
    expires_at: 2026-08-21T00:00:00Z
  - id: table_77_row_6
    parent: contract-8842
    acl_epoch: 418
    expires_at: 2026-08-21T00:00:00Z
checks:
  requester_acl_epoch: 418
  version_match: true
  expired_items: []
  cross_tenant_items: 0
decision: eligible_for_generation
```

![跨模态证据包闸门：图片区域和表格单元格同时通过 ACL、版本与过期检查](/images/notes/multimodal-rag/evidence-expiry-acl-card.svg)

### L5：为什么生成前还要再做一次 ACL 检查？

索引和缓存都有延迟，权限可能在召回后才被撤销。生成前的服务端复核是最后一道边界，能避免模型把已经失效的图片、表格或文档内容带进答案。

## 跨模态证据冲突要先对齐“同一对象”，再比较内容

图片、OCR 文本和表格抽取可能都指向同一个订单，但它们的坐标、版本和时间戳不同。冲突处理不能简单按模态置信度排序：先用 `parent_id`、页码/bbox、设备型号、时间和单位把证据对齐到同一对象，再判断是同一事实的不同表达、版本更新，还是确实互相矛盾。对无法对齐的证据，系统应输出缺口并请求补充，而不是选择一份看起来更像答案的内容。

引用也要保留跨模态链路：回答中的金额可以来自表格单元格，但单位来自图片脚注，规则解释来自正文段落。证据包记录这些关系，前端才能让用户从一句话跳到具体区域；如果只展示一条“来源文档”，审阅者无法发现模型把单位或版本拼错了。

```yaml
cross_modal_alignment: cma_040409
claim: "订单含税金额为 1280.50 CNY"
evidence:
  - {id: table_cell_r3c2, role: value, parent: invoice-07, version: v4}
  - {id: image_bbox_footnote1, role: unit, parent: invoice-07, version: v4}
  - {id: text_policy_12, role: rule, parent: billing-policy, version: v9}
checks:
  parent_match: true
  version_compatible: true
  unit_compatible: true
  spatial_relation: true
conflict: none
citation_path: [table_cell_r3c2, image_bbox_footnote1, text_policy_12]
decision: answer_with_linked_evidence
```

![跨模态证据对齐：数值、单位和规则分别来自表格、图片脚注与正文，但通过对象和版本关系串起](/images/notes/multimodal-rag/cross-modal-alignment-card.svg)

### L5：为什么跨模态回答要允许“证据不成链”？

因为有时只能找到数值，找不到单位或版本；强行拼接会产出看似完整但不可审计的答案。把证据链缺口显式化，才能决定追问、拒答或请求更清晰的文档。

## 跨模态引用要把坐标变换写进证据链

图片裁剪、缩放和旋转之后，模型看到的 bbox 已经不是原图坐标。若只保存“第 3 页右上角”，后续无法稳定复核。可以把归一化坐标映射写成明确公式：

$$
\begin{bmatrix}x'\\y'\\1\end{bmatrix}=T_{crop}T_{scale}T_{rotate}\begin{bmatrix}x\\y\\1\end{bmatrix}
$$

回答里引用的坐标，必须能通过这组变换还原到原始文件，并同时携带页码、版本和单位。这样跨模态 RAG 的“看到了”才会变成可以重新打开的定位证据。

```yaml
spatial_transform:
  contract: str_a1e576
  source_version: manual-v7
  page: 12
  original_bbox: [842, 316, 1260, 558]
  crop_offset: [800, 280]
  scale: [1.5, 1.5]
  rotation_deg: 0
  replay_asset: crops/manual-v7-p12-7f2c.png
```

![跨模态坐标回执：裁剪、缩放、旋转的变换链把模型视野还原到原始页](/images/notes/multimodal-rag/spatial-transform-receipt-card.svg)

### L5：为什么一条图片链接还不够？

链接只能证明“引用了哪张图”，不能证明“引用的是哪一块”。同一页可能有多个表格、脚注和图例；没有 bbox、变换和版本，复核者仍然要靠猜。

## 60 秒怎么说

多模态 RAG 的第一步是统一证据对象，而不是给文本 RAG 加一个图片字段。文本、表格、图片区域和图表都保存稳定 ID、父文档、页码或坐标、版本和权限。索引分成关键词、语义向量、关系和空间几层；查询先路由需要的证据类型，再做跨模态召回和服务端过滤。生成时组装带 Evidence ID 的证据包，答案必须能回到原文、原图或表格单元格。评测同时看各模态召回、跨模态对齐、引用准确、版本权限错误和端到端成本。

## 带走一张检查清单

- [ ] 不同模态是否有统一的 evidence_id 和 parent_id？
- [ ] 是否同时保留原始证据与可检索摘要？
- [ ] 查询是否先路由证据类型，再进行召回？
- [ ] 版本、设备型号和 ACL 是否在服务端过滤？
- [ ] 答案是否能点击回图片区域、表格单元格或原文？

## 相关笔记

- [文档理解为什么不能只做 OCR？版面关系才是线索](/notes/multimodal-document-layout)
- [RAG 不只是“向量库 + 提示词”：证据怎样一路到答案？](/notes/rag-retrieval-pipeline)
- [混合检索和重排，分别在补 RAG 的什么漏洞？](/notes/rag-rerank-and-hybrid)

## 参考

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
