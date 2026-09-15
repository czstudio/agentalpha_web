---
slug: "multimodal-to-transformer"
title: "多模态模型不是给图片加个输入框：图像怎样进入 Transformer？"
excerpt: "图片要被语言模型理解，得先过视觉编码、特征投影、跨模态融合。把像素、patch、视觉 token、文本 token 串起来，才知道模型看见了什么。"
series: "多模态"
seriesNo: "08"
number: "34"
minutes: 19
---

做一个“看发票并生成报销摘要”的 Agent，最容易犯的错，是把图片当成长字符串塞进 prompt。模型认出了公司名，却把金额、日期和表格列对错了。问题不在中文能力，而在图片还没变成 Transformer 能处理的表示。

## 这一轮分析的结论

多模态模型通常先用视觉编码器把图片切成 patch 或区域，再把每个区域编码成视觉向量；随后通过线性层、Query Resampler 或其他投影模块，把视觉向量映射到语言模型能接受的隐藏空间，最后与文本 token 一起进入 Transformer。关键不是“图片接在文本前面”，而是视觉 token 的数量、顺序、位置和训练对齐方式。面试时要继续说明：高分辨率会增加 token 和显存，压缩过度又会丢掉小字与版面，所以视觉编码、投影和上下文预算必须一起设计。

![图片从像素到视觉 token，再与文本 token 融合进入 Transformer](/images/notes/multimodal-to-transformer/pixel-pipeline.svg)

![LLaVA 原论文的视觉编码器—投影层—语言模型结构](/images/notes/evidence/llava/figure-1-architecture.svg)
*论文图：LLaVA: Visual Instruction Tuning，Figure 1；[原文](https://arxiv.org/abs/2304.08485)。*

![图片经过 patch、视觉 token 和投影层进入语言模型](/images/notes/multimodal-to-transformer/vision-token-route.png)

图 1：同一张图片要经过多个表示空间，语言模型接收到的不是原始像素。

## 一、图片为什么不能直接喂给语言模型

### 语言模型处理的是离散 token，图片是连续网格

文本经过 tokenizer 后，会得到一个整数序列。图片却是 `H × W × 3` 的连续像素矩阵，既没有自然的词边界，也没有直接对应的词表。视觉编码器的任务，就是把局部像素和更大的空间关系压缩成一串向量。

可以先把一张图片切成固定大小的 patch：

```python
patches = image.reshape(height // p, p, width // p, p, 3)
patches = patches.transpose(0, 2, 1, 3, 4)
patches = patches.reshape(num_patches, p * p * 3)
vision_tokens = vision_encoder(patches)
```

如果图片是 `224 × 224`，patch 大小是 `14 × 14`，那么仅空间切片就有 `16 × 16 = 256` 个 patch。分辨率提升到 `448 × 448` 后，patch 数量会变成 1024；模型看到的序列变长，计算和显存都会上升。

### 视觉 token 不是“一个 patch 一个物体”

一个 patch 可能只包含半个数字、表格边框或人物轮廓。视觉编码器通过多层注意力，让局部 token 逐渐获得更大的感受野。所以，不能把每个视觉 token 直接当成一个完整物体，也不能用 token 数量替代图片的信息量。

| 表示 | 优点 | 代价 | 适合场景 |
| --- | --- | --- | --- |
| 固定 patch | 结构简单、易于批处理 | 小字和细线容易被稀释 | 通用图片理解 |
| 区域/目标 token | 目标边界更清楚 | 依赖检测或区域提议 | 商品、票据、图表 |
| 多尺度 token | 同时保留全局和细节 | 上下文长度更高 | 文档、复杂 UI |

## 二、视觉编码器到底学什么

### 从局部纹理到空间关系

早期层更关注边缘、颜色和纹理，中间层建立局部形状，后期层才逐渐形成“这是一列金额”“这两个框属于同一行”的空间关系。但只有高层语义还不够做文档问答，坐标和阅读顺序同样重要。

一个常见的视觉编码过程可以抽象为：

\[
z_i = f_{vision}(p_i, pos_i), \quad i \in [1, N]
\]

其中 `p_i` 是第 `i` 个 patch，`pos_i` 是它的二维位置，`z_i` 是视觉隐藏向量。位置编码让模型知道两个 token 是上下相邻，还是分布在左右两栏。

![视觉 token 同时携带内容和二维位置，不能只保留一个无序向量集合](/images/notes/multimodal-to-transformer/spatial-tokens.svg)

图 2：文档理解需要保留空间关系，否则“左边标题、右边金额”会被压成一串无序文本。

### 为什么常见系统要用预训练视觉编码器

从像素直接训练语言模型非常昂贵。工程上常先训练或复用一个视觉编码器，再用图文对齐数据训练投影层，让图片表示落到语言模型可以使用的空间。这样可以把“看清图片”和“用语言回答”拆成两个阶段，减少从零学习的成本。

## 三、视觉向量怎么接入语言模型

### 线性投影：最简单的桥

如果视觉编码器输出维度是 `d_v`，语言模型隐藏维度是 `d_l`，可以用一个矩阵完成对齐：

\[
h_i^{vision} = W_{proj} z_i + b, \quad W_{proj} \in \mathbb{R}^{d_l \times d_v}
\]

然后把视觉 token 插入文本 token 序列：

```text
<image_start> v1 v2 ... vN <image_end> 你能读出发票总额吗？
```

这种方式直观，但 `N` 很大时会占满上下文。某些系统会用可学习的查询向量压缩视觉 token，或者只保留与问题相关的区域。

### 融合不是拼接结束

拼接后，Transformer 的 self-attention 让文本 token 去读取视觉 token。问题是“能读”不等于“必然使用”：如果视觉 token 太多，文本信号太弱，模型可能只凭语言先验猜答案。因此训练数据要覆盖图像描述、定位、比较、计算和拒答等任务，而不是只提供一句 caption。

![投影层把视觉隐藏空间映射到语言模型空间，融合后再由注意力完成跨模态读取](/images/notes/multimodal-to-transformer/fusion-bridge.svg)

图 3：投影层负责“对得上维度和分布”，注意力负责“在回答时读到它”。

## 四、上下文预算为什么是多模态系统的第一道限制

一张高清截图可能产生上千个视觉 token，再加上系统提示、历史对话和工具结果，模型很快就会碰到上下文上限。可以把预算拆成：

| 预算项 | 需要回答的问题 |
| --- | --- |
| 视觉 token | 是否要保留全图、缩略图和局部 crop？ |
| 文本 token | 问题、历史和工具结果是否需要全部保留？ |
| 输出 token | 是否限制解释长度，给证据留空间？ |
| 计算预算 | 一次要处理几张图、几种分辨率？ |

一个实用策略是先用低分辨率全图定位，再对问题相关区域做高分辨率 crop；如果模型无法确认，再触发第二次视觉调用，而不是每次都把原图拉到最高分辨率。

## 五、一个最小的多模态推理契约

不要只把 `image_url` 传给模型，还要记录图片版本、尺寸、裁剪区域和提示问题，方便回放：

```json
{
  "image_id": "invoice-2026-08-19-001",
  "source_sha256": "...",
  "views": [
    {"kind": "full", "width": 1024, "height": 768},
    {"kind": "crop", "box": [640, 240, 980, 520], "purpose": "total_amount"}
  ],
  "question": "发票总额是多少？请给出金额所在区域",
  "output_schema": {"amount": "number", "evidence_box": "[x1,y1,x2,y2]"}
}
```

这个契约把“回答错了”拆成三个可排查问题：视觉编码没看清、问题没有指向正确区域，还是生成阶段没有按照 schema 输出。

## 六、训练对齐要用消融实验验证

视觉编码器和语言模型“维度对上”只代表接口能跑通，不代表模型真的学会了跨模态对应关系。可以把训练拆成几个可比较的阶段：冻结视觉编码器只训练投影层、解冻高层视觉块、加入区域定位和拒答数据、最后再做指令微调。每一步都要用同一组图文任务和遮挡测试，观察 OCR、空间关系、计数和幻觉率的变化。

```text
baseline: caption only
ablation A: +projection alignment
ablation B: +region grounding
ablation C: +high-resolution crop routing
```

如果加入更多视觉 token 后 caption 分数上升，但表格定位变差，说明模型可能依赖语言先验或上下文拥挤。把“看得更清楚”拆成可测的能力切片，比只看一个总分更接近真实工程判断。

![通过训练阶段和能力切片的消融矩阵验证视觉语言对齐是否真的有效](/images/notes/multimodal-to-transformer/training-ablation.svg)

图 4：投影层、区域监督和高分辨率路由的收益要用同一评测集逐步对照。

## 七、推理时先做视图路由，再决定看多清楚

不同问题需要的视觉视图不同。“这张海报讲了什么”更依赖全图语义；“表格第三行金额是多少”需要高分辨率局部；“两张截图哪里不一样”则需要先对齐尺寸和坐标。把所有图片都用最高分辨率输入，既浪费预算，也可能让无关视觉 token 挤掉问题和证据。

可以先用低成本路由器判断问题类型，再选择视图：

| 问题类型 | 首选视图 | 失败时的升级 |
| --- | --- | --- |
| 全局描述 | 缩略全图 | 保留关键区域 crop |
| 小字/OCR | 原图或局部高分辨率 | 多 crop + 字符校验 |
| 表格/版面 | 全图 + 版面框 | 按行列裁切 |
| 比较差异 | 统一尺度双图 | 差异区域二次放大 |

```python
def choose_view(question, image_meta):
    kind = classify_visual_need(question)
    if kind == "global":
        return [image_meta.thumbnail]
    if kind in {"ocr", "table"}:
        return [image_meta.full, *image_meta.candidate_crops]
    return [image_meta.aligned_pair]
```

路由器也要有回退条件：候选 crop 找不到目标、OCR 置信度过低、坐标超出图片范围时，回到全图并明确输出“不确定”。不要让裁切策略静默丢掉目标，否则模型回答得越流畅，排查越困难。

![多模态推理先按问题选择全图、局部或对齐双图，再按置信度决定是否升级分辨率](/images/notes/multimodal-to-transformer/resolution-router.svg)

图 5：视图路由把视觉质量和 token 预算放到同一个决策里，而不是默认最高分辨率。

## 给视觉 token 建一张预算账本

分辨率越高不等于答案越好。实际推理时，应把图像视图、token 数、问题类型和证据增益放在同一张账本里：

```json
{
  "question_type": "read_small_text",
  "views": [
    {"name": "full", "tokens": 256, "gain": 0.31},
    {"name": "crop_text_region", "tokens": 768, "gain": 0.78}
  ],
  "budget": {"max_visual_tokens": 1024, "reserve_for_text": 2048},
  "decision": "use_crop_then_stop",
  "fallback": "ask_user_for_clearer_image"
}
```

如果局部裁剪的增益已经足够，就不再把整张高分辨率图片追加进上下文；如果视觉证据不足，宁可标注缺口或请求重拍，也不要用语言模型常识补齐图中没有的信息。账本还能帮助解释“为什么这次贵了”，避免只报总 token。

![视觉 token 预算账本把视图、token、信息增益和停止条件放到一次推理决策里](/images/notes/multimodal-to-transformer/token-budget-ledger.svg)

## 八、面试官的三层追问

### L1：图片是怎么进入 LLM 的？

图片先经视觉编码器变成视觉 token，再经投影层映射到语言模型隐藏空间，随后和文本 token 一起参与 Transformer 的注意力计算。

### L2：为什么高分辨率会更贵？

固定 patch 大小时，分辨率翻倍会让 patch 数量大约变成四倍，序列变长后注意力、KV cache 和显存压力都会上升。

### L3：怎么避免模型只凭常识猜图？

保留位置和证据区域，训练定位、比较和拒答任务；推理时要求输出引用框或结构化证据，并用遮挡测试验证答案是否真的依赖图片。

### L4：为什么要做遮挡和消融，而不只看图文问答准确率？

准确率可能来自语言先验或题目模板。遮挡关键区域后答案应按预期退化，冻结/解冻视觉模块的消融能说明收益来自哪里；如果分数不变，说明模型可能没有真正读取视觉证据。

### L5：视觉 token 压缩的风险怎么判断？

同时看 token 数、延迟和细粒度能力：小字识别、表格行列、空间关系和证据框。压缩带来的平均分收益不能掩盖某个高风险切片的定位失败，应按任务类型设独立门槛。

### L5：为什么不能让模型自己不断要更大图片？

因为追加视图会放大 token、延迟和隐私暴露面。应预先设置视觉预算和升级条件，由路由器根据问题类型和证据增益决定是否裁剪或升分辨率，达到上限仍不确定就明确反馈。

## 视觉 token 预算要绑定图片、问句和证据

“把图片切成 patch 再送进 Transformer”只是原理答案。工程上更容易出事故的是：同一张图换一个问题，路由策略没有变化，token 和延迟突然翻倍；或者模型只保留了一块 crop，却忘了这块 crop 来自哪一版图片，最后答案无法复核。

我会给每次视觉推理发一张预算账本，把画布、视图和证据放在一起：

```yaml
vision_run: vr_fccbde
image_id: invoice-77
image_sha256: sha256:ab3...
question_type: locate_total
views:
  - kind: full
    resolution: 1600x2200
    tokens: 768
    purpose: layout_route
  - kind: crop
    box: [960, 1680, 1480, 2060]
    resolution: 1040x760
    tokens: 384
    purpose: read_small_text
budget:
  token_limit: 1400
  used: 1152
  latency_ms: 820
evidence:
  page: 1
  box: [960, 1680, 1480, 2060]
  confidence: 0.93
fallback: ask_for_clearer_image
```

这张账本有两个作用。第一，它让“为什么要 crop”变成可以解释的路由决策，而不是模型临时发挥。第二，它把最终答案和图片版本、区域坐标、token 消耗绑定，后续做遮挡实验或替换视觉编码器时，可以知道变化来自模型还是来自输入视图。

预算不应该只设一个总 token 上限。全图定位、局部识字和表格结构化是不同任务，应该各自有预算与降级策略：先减少无关区域，再降低视觉细节，最后才拒答或请求用户补图。若直接截断到上限，模型可能刚好丢掉问题所在的页脚，结果看起来很自信，证据却已经不在上下文里。

![视觉 token 预算账本](/images/notes/multimodal-to-transformer/vision-token-budget.svg)

### L5：为什么不能让模型无限次请求更大分辨率？

因为这会形成不可控的成本和延迟回路，也可能让模型通过不断放大来绕开不确定性。我的做法是为每种视图设预算、次数和触发条件；只有当当前 crop 的定位置信度不足且仍在剩余预算内，才允许一次升级，并把升级原因写入账本。超出预算就返回“需要更清晰图片”或交给人工。

## 视觉 token 预算还要记录“信息损失”

把图片压成更少 token 之后，平均问答分数可能没有明显下降，但小字、脚注、表格边界和版面关系可能已经悄悄丢掉。视觉预算因此不能只记录 token 和延迟，还要记录不同信息切片上的损失，才能判断压缩是否真的值得。

我会在同一张图片上做全图、裁剪、压缩和遮挡对照，并保存可复现的回执：

~~~yaml
visual_ablation_receipt: var_789911
image_id: contract-layout-07
routes:
  full:
    tokens: 1536
    latency_ms: 1040
    small_text_accuracy: 0.96
    layout_accuracy: 0.98
    evidence_grounding: 0.97
  crop:
    tokens: 768
    latency_ms: 710
    small_text_accuracy: 0.94
    layout_accuracy: 0.83
    evidence_grounding: 0.91
  compressed:
    tokens: 512
    latency_ms: 540
    small_text_accuracy: 0.71
    layout_accuracy: 0.79
    evidence_grounding: 0.68
decision: keep_crop_for_text_and_full_for_layout
~~~

如果任务是读金额或脚注，应该优先保护小区域的文字证据；如果任务是判断页面结构、表格合并关系或流程箭头，就不能只保留局部 crop。把 ablation 结果和路由条件绑定后，后续替换视觉编码器或调整 patch 大小时，才知道是 token 节省带来的收益，还是信息损失改变了答案。

![视觉 ablation 回执：token、延迟与小字/版面/证据损失一起对账](/images/notes/multimodal-to-transformer/visual-ablation-card.svg)

### L5：为什么 token 更少、延迟更低，不一定是更好的视觉方案？

因为被压掉的可能正是问题所需的细节。视觉方案要按任务切片比较小字准确率、版面准确率和证据定位，而不是只看总体分数；当信息损失超过门槛时，应恢复全图或请求更清晰输入。

## 九、视觉 token 也要有“证据等级”

视觉 token 进入语言模型以后，模型并不知道哪些区域是可靠文字、哪些只是背景纹理。工程上可以给 token 附带轻量 metadata：来源区域、缩放级别、OCR 置信度和是否来自重叠 crop。生成答案时要求模型引用高等级区域；如果只能依赖低等级 token，就降低答案置信度或请求二次观察。

```json
{
  "token_group": "crop_02",
  "bbox": [0.42, 0.31, 0.88, 0.57],
  "scale": 2.0,
  "source": "invoice_page_3",
  "ocr_confidence": 0.93,
  "overlap_consistent": true,
  "evidence_level": "A"
}
```

![视觉 token 证据等级](/images/notes/multimodal-to-transformer/token-evidence-level-card.svg)

这不是把所有元数据都塞进 prompt，而是把它作为推理链上的约束：检索、重排和答案生成都能知道自己使用了哪一组视觉证据。对小字、表格和图表，区域坐标往往比一句“模型看到了图片”更有用，也更容易做回归。

### L5：视觉 token 压缩后如何知道丢了什么？

保留一组未压缩的 teacher view，在固定样本上比较区域召回、文字读取、空间关系和最终答案四项指标。若压缩只让平均 token 降低，却让关键区域召回下降，就不能把它称作优化。上线时还要记录每次压缩策略、图片版本和 evidence level，方便定位某一类图片突然退化。

## 视觉观察还要处理“多 crop 证据冲突”

同一张图片的不同 crop 可能因为缩放、压缩或 OCR 误差读出两个金额。若把它们直接拼进上下文，语言模型通常会挑一个看起来更顺的答案，而不会主动指出冲突。我会把重叠区域的 token 做一致性检查，保留坐标、缩放和 OCR 版本；冲突未解决时，把任务降级为请求更清晰图片或要求人工确认。

```yaml
crop_consistency_probe: ccp_0c352b
image_hash: sha256:img-44...
regions:
  - {id: crop_01, bbox: [0.40,0.30,0.80,0.55], value: "1280.50", ocr: 0.94}
  - {id: crop_02, bbox: [0.42,0.31,0.82,0.56], value: "1280.00", ocr: 0.88}
overlap: 0.73
conflict: amount_mismatch
action: request_clearer_input
generation: blocked_until_resolved
```

![视觉 crop 一致性探针：重叠区域读数冲突时暂停生成，保留坐标和 OCR 证据](/images/notes/multimodal-to-transformer/crop-consistency-card.svg)

### L5：为什么 OCR 置信度高也不能自动选一个值？

两个 crop 都可能有高置信度，但来自不同缩放或裁切边界，单个分数不能解决冲突。要比较重叠区域、图片版本和定位证据；关键金额、编号等冲突时宁可请求原图，也不要让模型投票猜一个。

## 视觉 token 预算应按任务路由，而不是一把尺子

“每张图固定 512 个 token”很容易实现，却会让读发票小字和看网页布局共用一套预算。更合理的是先根据 query 判断任务类型：需要精确文字就保留高分辨率局部 crop，需要空间关系就保留全图和重叠区域，需要快速分类才走低分辨率缩略图。路由决定预算，预算再决定视觉编码器和投影层的输入，不要反过来为了省 token 牺牲证据。

实践中可以把预算写成可回放的 policy，并给每个区域一个最小保真门槛。若 OCR 置信度低于门槛，系统应请求二次 crop 或直接返回“无法确认”，而不是让语言模型在模糊 token 上补全。跨模态缓存也要绑定图片 hash、crop 坐标和策略版本，避免同一文件换了切片规则却复用旧 token。

```yaml
vision_token_policy: vtp_17df07
routes:
  text_exact:
    when: query_has_amount_or_id
    budget: 1024
    strategy: full_locator_plus_2x_crop
    min_ocr_confidence: 0.90
  layout_reasoning:
    when: query_has_table_or_flow
    budget: 768
    strategy: full_image_with_overlap
    min_layout_confidence: 0.85
  coarse_classify:
    when: risk=low
    budget: 256
    strategy: thumbnail
fallback: request_clearer_input
cache_key: image_hash|bbox|policy_version
```

![视觉 token 路由卡：文字、布局和粗分类使用不同预算与保真门槛](/images/notes/multimodal-to-transformer/token-budget-routing-card.svg)

### L5：为什么让模型“自己决定看哪里”仍需要服务端预算？

模型可以提出观察计划，但不能无限扩大图片、绕过敏感区域策略或把延迟成本隐藏起来。服务端预算和区域 ACL 先限定可用 token，模型只在这个范围内选择；超出预算就走降级或人工，而不是无限追加观察。

## 把这段分析讲给面试官

多模态模型不会直接把像素交给语言模型。它先用视觉编码器把图片切成 patch 或区域，再编码成带空间信息的视觉 token；之后通过投影层把视觉隐藏维度映射到语言模型的隐藏空间，和文本 token 一起进入 Transformer。工程上最关键的是 token 预算和信息保真度：分辨率太低会丢小字和布局，分辨率太高又会拖慢推理，所以我会先用全图定位，再对相关区域做高分辨率 crop，并要求输出结构化证据。最后用遮挡、区域定位和图文问答回归集确认模型真的看到了图片。

## 带走一张检查清单

- [ ] 是否明确视觉编码器、投影层和融合位置？
- [ ] 视觉 token 是否保留二维位置或区域信息？
- [ ] 是否测过分辨率、patch 大小对 token 和延迟的影响？
- [ ] 是否有全图定位到局部 crop 的渐进策略？
- [ ] 输出是否带证据区域、图片版本和可回放信息？

## 相关笔记

- [图片问答答非所问，可能是模型根本没看清](/notes/multimodal-vision-slicing)
- [文档理解为什么不能只做 OCR？版面关系才是线索](/notes/multimodal-document-layout)
- [Embedding 到底把什么变成了向量？相似不等于正确](/notes/rag-embedding-basics)

## 参考

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
