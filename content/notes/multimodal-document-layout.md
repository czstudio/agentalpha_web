---
slug: "multimodal-document-layout"
title: "文档理解为什么不能只做 OCR？版面关系才是线索"
excerpt: "PDF 压成一串 OCR 文本，栏、行、表头、脚注之间的关系就没了。文档 Agent 想可靠，得把文字、坐标、块类型、跨页结构一起存下来，才答得出“哪一列、哪一行、依据在哪”。"
series: "多模态"
seriesNo: "08"
number: "36"
minutes: 26
---

财务同学问：“2025 年第二季度的毛利率是多少？”文档里有利润表、脚注和折线图。纯 OCR 把三栏文字从上到下拼在一起，模型找到了“毛利率”，引用的却是上一季度。它不是不会算，而是版面关系在输入阶段就没了。

## 我们推出来的版本

文档理解不能停在 OCR 文本。完整链路要保留文字内容、页面坐标、块类型、阅读顺序和表格/图表结构，再把这些对象组织成可检索的文档图。段落可以按语义切块，表格要保留行列和合并单元格，图表要保存标题、坐标轴、图例和数据点，跨页内容要用稳定的 `document_id` 与 `block_id` 连接。这样 RAG 或 Agent 才能回答“这个数字来自哪一页哪一列”，并在证据不足时拒答。

![文档从 OCR 和版面检测开始，经过结构恢复后变成可检索的文档图](/images/notes/multimodal-document-layout/layout-pipeline.svg)

图 1：结构恢复是检索和生成之间的关键中间层。

## 一、纯 OCR 为什么会把正确文字变成错误答案

### 文字对了，顺序可能错

双栏 PDF 的阅读顺序不是简单的 `y` 坐标排序；表格的单元格也不能按扫描顺序拼接。纯文本抽取常见的损失包括：

- 左右栏交错，句子被截断。
- 表头和数据行分离，模型不知道数字属于哪一列。
- 脚注被拼到正文中，单位和范围丢失。
- 跨页表格没有延续关系，第二页像一张新表。

所以，文档解析的输出不该只有：

```text
2025 Q1  12.4  2025 Q2  13.8  注：不含一次性项目
```

还应该知道 `13.8` 来自哪张表、哪一行、哪一列，以及单位是什么。

## 二、文档对象要用坐标和类型描述

### 一个可用的 block schema

每个块至少保存归一化坐标，这样不同分辨率、旋转和裁剪都能回到原页面：

```json
{
  "document_id": "annual-report-2025",
  "page": 18,
  "block_id": "p18-table-02-cell-r3-c4",
  "type": "table_cell",
  "bbox": [0.58, 0.34, 0.71, 0.39],
  "text": "13.8%",
  "row": 3,
  "col": 4,
  "row_span": 1,
  "col_span": 1,
  "reading_order": 27,
  "parent_id": "p18-table-02",
  "confidence": 0.96
}
```

`parent_id` 让系统知道这个单元格属于哪张表，`row/col` 让回答可以回到结构化关系，`reading_order` 则供段落和跨栏文本排序。

![页面中的段落、表格、图表和脚注通过 parent_id 组成文档结构图](/images/notes/multimodal-document-layout/document-graph.svg)

图 2：块不是孤立文本，而是带父子关系的文档图节点。

### 坐标是证据，不是装饰

当答案出现争议时，可以直接在原页高亮 `bbox`。这比把一整页截图塞进 prompt 更容易审阅，也能让自动评测检查引用是否落在正确区域。坐标最好同时保存原始像素框和归一化框，避免后续渲染时发生比例错误。

## 三、表格解析的难点在关系，不在识字

### 先检测网格，再恢复单元格

表格解析可以分成三步：检测表格区域，识别行列线或单元格框，最后把 OCR 文字放回网格。没有线框的表格则需要根据文字对齐、间距和字体推断列关系。

合并单元格要显式记录 `row_span` 和 `col_span`。否则“华东区”这样的多列表头会被复制到每个单元格，生成模型会误以为它是多条独立数据。

### 数字需要单位和上下文

`13.8` 可能是百分比、亿元或万人。表头、脚注和单位块都要进入同一个证据对象：

```json
{
  "table_id": "p18-table-02",
  "headers": ["指标", "2025 Q1", "2025 Q2"],
  "unit": "%",
  "rows": [{"label": "毛利率", "values": [12.4, 13.8]}],
  "notes": ["不含一次性项目"],
  "source": {"page": 18, "bbox": [0.08, 0.21, 0.94, 0.66]}
}
```

## 四、图表理解不能只 OCR 图上的字

图表至少要解析四类对象：标题、坐标轴与单位、图例、数据点或趋势线。问“哪一年增长最快”时，模型需要看到时间轴和数值变化，单独拿到图例文字并没有用。

可以先用视觉模型生成图表摘要，再让结构化解析器验证关键数字：

```text
chart_summary:
  title: "活跃用户趋势"
  x_axis: {label: "月份", values: [1, 2, 3, 4]}
  y_axis: {label: "万人", range: [0, 100]}
  series:
    - name: "企业版"
      points: [[1, 42], [2, 51], [3, 73], [4, 70]]
  uncertainty: ["点 4 标签被遮挡"]
```

如果数据点无法从图中可靠读取，要输出不确定性，而不是用视觉模型的常识补齐。

## 五、跨页结构要有稳定的连接键

跨页表格、章节标题和脚注经常被拆成多个页面。推荐用三层 ID：

| ID | 作用 |
| --- | --- |
| document_id | 同一份文档的稳定身份 |
| page_id | 页面版本和页码 |
| block_id | 页面内的段落、表格、单元格或图表 |

跨页表格再增加 `continuation_of` 和 `table_group_id`，这样检索到第二页时，系统可以把上一页的表头和单位补进上下文。

## 六、文档 RAG 应该检索“结构化证据包”

文档切块时，不要把每个表格单元格切成孤立片段。可将父级标题、表头、行标签和目标单元格组合成一个证据包：

```text
文档：年度报告 2025
章节：经营数据 / 毛利率
表格：利润率（单位：%）
行：毛利率
列：2025 Q2
值：13.8
来源：第 18 页，bbox=(...)
```

这样向量检索、关键词检索和过滤都能作用于同一份证据，而不是让生成模型自己猜列关系。

## 七、让解析结果可被回放

文档解析不是一次性离线脚本。解析器、OCR 模型和版面模型升级后，同一页可能会得到不同的块边界。每个解析结果都应该带 `parser_version`、`layout_model`、`ocr_version` 和 `source_sha256`，这样答案出现变化时才能判断是文档变了，还是解析器变了。

```json
{
  "source_sha256": "...",
  "parser_version": "layout-2025-08",
  "blocks": [{"block_id": "p18-table-02", "bbox": [0.08,0.21,0.94,0.66]}],
  "warnings": ["page_19_chart_label_low_confidence"]
}
```

回放包至少保存原页引用、块列表、结构化证据包、模型输入摘要和最终引用。重新解析时先在固定样本上做结构差异报告：哪些表格行列改变、哪些 bbox 偏移、哪些低置信区域新增。差异超过阈值就进入人工抽样，而不是直接重建线上索引。

![文档解析升级后的版本指纹、结构差异和回滚抽样闭环](/images/notes/multimodal-document-layout/replay-versioning.svg)

## 八、表格关系要用“候选—校验”两阶段恢复

表格解析不必一次就决定每个单元格属于哪一列。第一阶段根据线条、间距和文字框生成候选网格；第二阶段用表头、行标签、单位和跨页连接键校验关系。候选不确定时保留多个解释，交给后续证据评测，而不是过早拍死。

```text
候选网格 → 行列对齐 → 表头/单位校验 → 跨页合并 → 证据包
      └──────────── 低置信度 → 人工抽样 / 重新解析
```

例如“13.8”可能属于毛利率，也可能属于下一列的增长率。只有把它和表头、单位、bbox 以及上一页的 continuation 关系一起保存，RAG 才能在回答时引用正确的列。对高风险数字，解析器应输出候选关系和置信度，业务规则再决定是否允许自动回答。

![表格关系恢复先生成候选网格，再用表头、单位和跨页键校验，低置信度进入抽样](/images/notes/multimodal-document-layout/table-relation-check.svg)

图 4：表格的难点是关系和范围，保留候选比错误地给出一个确定值更安全。

## 九、解析质量要按文档类型分层

“整体字符准确率 98%”很容易掩盖业务关键数字错误。建议按文档类型和风险切片：

| 类型 | 高风险关系 | 必测样本 |
| --- | --- | --- |
| 财务报表 | 单位、负号、合并表头 | 小数、括号负数、跨页表 |
| 合同 | 条款编号、条件范围 | 页眉页脚、扫描件、手写批注 |
| 运营看板 | 图例、时间轴、趋势 | 多系列折线、重叠标签 |
| 技术文档 | 代码、版本、层级 | 双栏、脚注、表格嵌套 |

每一类都保留“可拒答”的样本：即使 OCR 读出了字符，只要关系或单位不确定，也必须让 Agent 说清楚缺口。可靠的文档 Agent 不是每次都给数字，而是知道何时不能给。

## 十、评测要覆盖结构和引用

| 维度 | 指标 | 典型样本 |
| --- | --- | --- |
| OCR | 字符/数字准确率 | 小字、旋转、低对比度 |
| 结构 | 表格单元格 F1、阅读顺序 | 双栏、合并单元格 |
| 关系 | 行列关联准确率 | 跨页表格、脚注 |
| 回答 | grounded accuracy | 数字、单位、页码和框 |

至少保留一套“纯 OCR”“OCR+版面”“多模态解析”的对照基线，才能证明结构恢复确实降低了答错率。

## 十一、低置信区域要进入人工抽样队列

解析链路不应该只给出一个总分。一个页面可能文字读得很准，但表格的列关系不可靠；也可能版面置信度很高，某个金额却因为低清扫描无法确认。建议把置信度拆到页面、块和关系三个层级，并记录为什么需要人工复核：

```json
{
  "page_id": "contract-17-p08",
  "text_confidence": 0.98,
  "layout_confidence": 0.71,
  "relation_confidence": 0.54,
  "citation_ready": false,
  "review_reason": ["merged_cell_ambiguous", "negative_sign_uncertain"]
}
```

只要 `citation_ready=false`，回答链路就不应把这一页当成可引用事实。人工队列也要按风险排序：金额、期限、权限和安全参数优先于普通说明文字；复核结果回写到原始块和解析版本，才能成为下一轮回归样本。

![低置信页面按文字、版面和关系分层进入人工复核队列](/images/notes/multimodal-document-layout/layout-confidence-queue.svg)

这比简单地把“总置信度低于 0.8”全部送人工更省成本，也更容易解释为什么某个答案被暂停。

## 解析产物要像一个可交接的文档 API

下游 RAG 和人工复核不应该依赖解析脚本的内部对象。把页面、块、关系和引用资格固定成交接契约，解析器升级时仍能保持兼容：

```json
{
  "document_id": "annual-report-2025",
  "page": 18,
  "blocks": [{"id": "table-02", "type": "table", "bbox": [0.08, 0.21, 0.94, 0.66]}],
  "relations": [{"row": "gross_margin", "column": "2025-Q2", "value": "13.8", "unit": "%"}],
  "citation": {"ready": true, "source": "p18:bbox-02"},
  "confidence": {"text": 0.98, "layout": 0.91, "relation": 0.86},
  "next_action": "index"
}
```

`next_action` 可以是 `index`、`sample`、`reparse` 或 `block`。这样低置信关系不会悄悄流入知识库，人工修正也能回写到同一个 document version，而不是散落在运营群的截图里。

![文档解析 API 将页面、版面块、关系、引用资格和下一步动作固定成可交接产物](/images/notes/multimodal-document-layout/layout-evidence-contract.svg)

### L5：为什么解析器升级必须保持交接契约兼容？

因为 RAG、审计和人工队列依赖的是字段语义，不是某个 OCR 模型的内部结构。若字段改名或状态含义漂移，旧回放会被误判为新结果。升级时应先做 schema 兼容检查，再比较结构差异和引用资格，必要时保留双写窗口。

## 面试官的分层追问

### L1：为什么要保留版面？

文字内容相同，但栏、行列、脚注和坐标决定了语义关系。没有版面，模型无法可靠判断数字属于哪一列。

### L2：表格应该怎么切块？

保留表名、表头、行标签、列标签、单位和目标单元格，形成结构化证据包；不要把单元格拆成没有上下文的短文本。

### L3：如何证明答案引用正确？

输出页码和归一化 bbox，并在原页高亮；评测同时检查文本、单位、结构和坐标是否匹配。

### L1：解析结果为什么要保存版本？

模型和规则升级会改变块边界；没有版本就无法解释答案变化，也无法安全回滚索引。

### L2：图表数字读不准时怎么办？

保留图表区域和不确定性，尝试更高分辨率或结构化数据源；无法确认就拒答，不用视觉模型猜一个漂亮数字。

### L2：跨页表格如何避免重复表头？

用 `table_group_id` 和 `continuation_of` 合并页间关系，保留原页证据，不把每页表头当成独立事实。

### L3：如何验证 bbox 没有偏移？

同时保存原始像素框和归一化框，在多种渲染尺寸上回投影检查，并用人工高亮样本验证坐标落在目标块内。

### L3：结构恢复变复杂后，如何控制成本？

先用便宜模型做版面候选和置信度筛选，只对表格、图表和低置信页做高精解析；缓存按源文件哈希和解析版本复用。

## 解析器升级要带一份交接契约兼容说明

解析器升级最容易被忽略的不是准确率，而是下游能不能继续消费旧字段。RAG、人工复核和引用高亮都应该依赖稳定的交接契约，而不是依赖某个 OCR 模型的内部对象。一次升级至少要把输入类型、schema、稳定字段、变化字段、迁移入口、回放集和门槛写在同一张卡上：

```json
{
  "parser_version": "layout-v8",
  "input_types": ["pdf", "scan", "xlsx-export"],
  "schema": "document-block-v4",
  "backward_compatible": true,
  "stable_fields": ["doc_id", "page", "bbox", "block_id", "text"],
  "changed_fields": ["table.cell.row_span", "chart.series"],
  "migration": "artifact://layout-v8/migration",
  "replay_set": "layout-regression-2026-08",
  "gates": { "bbox_drift_px_max": 4, "citation_locator_pass": 0.99, "table_relation_pass": 0.96 }
}
```

`stable_fields` 是下游可以继续依赖的锚点；`changed_fields` 必须说明语义变化，而不是只写“格式升级”。`replay_set` 用来在旧、新解析器上双跑同一批 PDF、扫描件和表格导出，`gates` 则把坐标漂移、引用定位和表格关系恢复变成可验收的数字。兼容窗口内可以并行产出 `layout-v7` 和 `layout-v8`，等回放集通过后再切换默认版本；旧引用仍能用迁移表回到新字段。

![文档解析交接契约：稳定字段、迁移、回放集与验收门槛](/images/notes/multimodal-document-layout/parser-compatibility-card.svg)

## 兼容检查之后还要做一次“bbox 回投影探针”

解析器字段兼容，不代表页面坐标仍然落在正确的字上。升级后把归一化 bbox 回投影到原始像素尺寸、缩放预览和裁剪视图，分别检查文本、表格和图表的命中区域；任一尺寸偏移，都先阻断引用高亮，不让错误坐标流进答案。

~~~yaml
bbox_roundtrip_probe: brp_705dce
document_version: layout-v8
samples: [invoice-07, table-12, chart-03]
projections:
  original_pixels: {max_iou_error: 0.02, citation_ready: true}
  preview_50_percent: {max_iou_error: 0.03, citation_ready: true}
  crop_region: {max_iou_error: 0.19, citation_ready: false}
decision: block_crop_citation
next: "修复裁剪坐标原点后重跑回放集"
~~~

回投影探针把“字段没变”和“视觉证据仍在原处”分开。对金额、期限、权限和安全参数，宁可先把 `citation_ready` 置为 false，也不要让模型引用一块看似相关、实际落在相邻行的数字。

![bbox 回投影探针：不同渲染尺寸都要落回同一个原始证据块](/images/notes/multimodal-document-layout/bbox-roundtrip-card.svg)

### L5：为什么解析器升级后还要检查坐标，而不是只看文字？

文字相同不代表关系相同。bbox 决定表格列、脚注和图例归属；坐标一旦偏移，引用就可能指向相邻数字。回投影是对版面证据的反向验收。

### L5：新解析器更丰富，但旧引用无法读取，怎么办？

先保留 schema 版本和稳定字段，再提供 adapter 与迁移脚本；新旧版本在同一回放集上比较 bbox、关系和引用定位，通过门槛后才切默认。不能为了“字段更漂亮”直接删掉旧引用的语义。

## 解析器升级要有“旧 schema 可读、新 schema 可写”的窗口

文档解析器一旦被下游引用，schema 就成了契约。直接把字段改名或把 bbox 从像素换成归一化坐标，会让旧的引用、评测和人工工具同时失效。更稳的升级方式是先引入 schema version，短期双写，读取端兼容旧版，等迁移完成再停止旧字段。

```yaml
schema_migration:
  from: layout.v2
  to: layout.v3
  compatibility:
    read: [v2, v3]
    write: v3
  dual_write:
    bbox_px: retained_for: 14d
    bbox_norm: required: true
  validation: "roundtrip(v2 -> v3 -> render) pixel drift <= 2"
  rollback: "pin parser_version=2.8 and stop v3 reads"
```

![文档 schema 迁移窗口](/images/notes/multimodal-document-layout/schema-migration-card.svg)

迁移期间要在真实文档上跑渲染回归，不只比较 JSON 是否能解析。表格边界、跨页连接和引用坐标只要偏几个像素，就可能把正确数字指向错误单元格。把旧版读取、双写期限和回滚开关写进交接契约，解析器升级才不会变成一次性大爆炸。

### L5：为什么不能直接全量切到新 schema？

因为下游组件的升级速度不同，且历史文档往往还要被重新打开。双写窗口能让解析器和消费者分开发布；如果新版本在某类扫描件上退化，可以只回滚读取路由，不必重新解析所有历史文件。

## 版面解析要输出“证据图”，不只是 bbox 列表

单独保存一堆矩形框，仍然很难回答“这个数字属于哪一行、哪个表头和哪个脚注”。更实用的中间表示是证据图：节点是文字块、表格单元格、图例和图片区域，边表示阅读顺序、表头归属、跨页 continuation、引用关系和空间邻接。下游切块、检索和引用都消费同一张图，避免每个组件各自猜关系。

证据图还要把不确定性留出来。解析器无法确认一个跨栏标题属于哪一列时，输出两个候选关系和置信度，检索阶段可以选择保守切块或请求人工复核；直接强行归类会让错误关系一路传到答案。图的节点和原始像素、文档版本、schema 版本都要有稳定引用，才能做回放。

```yaml
layout_evidence_graph: leg_756c12
document: invoice-07
nodes:
  - {id: cell_r3c2, type: table_cell, bbox: [0.42,0.31,0.58,0.36], text: "1280.50"}
  - {id: header_amount, type: table_header, bbox: [0.42,0.22,0.58,0.27], text: "含税金额"}
  - {id: footnote_1, type: footnote, bbox: [0.12,0.88,0.80,0.93], text: "币种：CNY"}
edges:
  - {from: cell_r3c2, to: header_amount, type: column_of, confidence: 0.98}
  - {from: cell_r3c2, to: footnote_1, type: unit_from, confidence: 0.74}
uncertainty:
  low_confidence_edges: require_review
  citation_ready: false
decision: keep_graph_and_abstain_if_ambiguous
```

![版面证据图：节点、表头归属、跨页关系和不确定性共同支撑引用](/images/notes/multimodal-document-layout/layout-evidence-graph-card.svg)

### L5：为什么不确定关系要保留，而不是直接选一个？

错误的确定关系会让后续系统把错数字当成强证据；保留候选和置信度可以触发复核或保守回答。对高风险字段，宁可 `citation_ready=false`，也不要把猜测伪装成确定版面结构。

## 最后，把它讲清楚

文档理解不能只做 OCR，因为双栏、表格、图表和脚注的关系会在纯文本里丢失。我会让解析链路同时输出文字、归一化坐标、块类型、阅读顺序和父子关系。表格保留行列、合并单元格、单位和跨页连接；图表保留标题、坐标轴、图例和数据点。切块时把标题、表头、行标签和目标值组成证据包，回答时输出页码和 bbox。评测分 OCR、结构恢复、关系关联和引用准确四层，并与纯 OCR 基线对比。

## 带走一张检查清单

- [ ] 是否保留页面坐标、块类型和阅读顺序？
- [ ] 表格是否显式记录行列、合并单元格和单位？
- [ ] 图表是否保存坐标轴、图例和数据点的不确定性？
- [ ] 跨页表格是否有稳定的 continuation 关系？
- [ ] 最终回答能否回到页码和 bbox？

## 相关笔记

- [图片问答答非所问，可能是模型根本没看清](/notes/multimodal-vision-slicing)
- [多模态 RAG 怎样把图片、表格和文字一起查出来？](/notes/multimodal-rag)
- [RAG 怎么评测才不自欺？把“答得像”拆开看](/notes/rag-evaluation-practice)

## 参考

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
