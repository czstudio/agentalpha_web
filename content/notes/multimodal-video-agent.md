---
slug: "multimodal-video-agent"
title: "视频 Agent 怎样处理百万级帧？先把时间定位做好"
excerpt: "视频 Agent 不会把每一帧都塞给模型。它先建立时间轴，用镜头切分、关键帧、语音和 OCR 做粗到细检索，再把答案落回能回放的时间区间。"
series: "多模态"
seriesNo: "08"
number: "38"
minutes: 21
---

监控视频一天有 86400 秒，会议录像有几十个小时。用户问“设备第一次冒烟前，谁按了红色按钮”，逐帧送给视觉模型太贵太慢；每分钟抽一帧，又可能刚好错过那两秒关键动作。

## 我们推出来的版本

视频 Agent 应先建立可检索的时间轴，不要直接做逐帧问答。第一层用低成本信号粗筛：镜头边界、音频转写、OCR、目标检测和低频关键帧；第二层根据问题定位候选时间窗，再提高帧率或截取短片段精读。每个证据要记录 `video_id`、起止时间、帧号、来源流和抽取方法，最终回答要能跳回原视频。百万级帧的核心是分层采样、时间定位、上下文预算和证据回放，而不是单纯堆更大的视频模型。

![视频从粗粒度时间轴到候选窗口，再到关键帧和短片段精读](/images/notes/multimodal-video-agent/video-indexing.svg)

图 1：先把百万级帧压缩成可查询的时间轴，再对候选窗口精读。

## 先算清楚：逐帧处理为什么不可行

一个 2 小时、25 FPS 的视频有：

\[
2 \times 3600 \times 25 = 180000 \text{ frames}
\]

每帧都做视觉编码不仅耗时，还会产生巨大的 token 和存储成本。视频 Agent 要把“连续画面”转换成多种低成本信号：

| 信号 | 成本 | 擅长回答 |
| --- | --- | --- |
| 低频缩略帧 | 低 | 场景、人物、设备是否出现 |
| 镜头边界 | 很低 | 场景变化、章节切换 |
| ASR 转写 | 中 | 谁说了什么、什么时候提到关键词 |
| OCR | 中 | 屏幕、字幕、编号 |
| 目标/动作检测 | 较高 | 物体出现、按钮动作、异常事件 |

这些信号要共用同一时间基准。否则“字幕时间”和“视频时间”对不上，后面回放证据时就会漂移。

## 分层采样：从均匀到事件驱动

### 第一层：均匀采样建立全局地图

先每 5～10 秒抽一帧，生成缩略图和场景标签。它的目标是知道视频有哪些阶段，不负责判断细小动作。

### 第二层：镜头和事件触发加密

在镜头边界、音量突变、OCR 文本变化、目标出现或用户关键词附近提高采样率。一个简单的策略：

```python
def sample_windows(duration, scene_cuts, asr_hits, stride=10):
    coarse = set(range(0, int(duration), stride))
    hot = set()
    for t in scene_cuts + asr_hits:
        hot.update(range(max(0, t - 8), min(duration, t + 8), 1))
    return sorted(coarse | hot)
```

真正上线时，还要加全局帧预算，避免某段噪声让采样数量爆炸。

![均匀采样、镜头边界和事件命中共同形成自适应时间轴](/images/notes/multimodal-video-agent/adaptive-sampling.svg)

图 2：采样密度随问题相关性变化，而不是全片保持同一帧率。

## 时间定位要把多种证据对齐

### ASR、OCR、帧和动作都用同一时间坐标

一个候选窗口可以长这样：

```json
{
  "video_id": "factory-cam-07-2026-08-19",
  "window": {"start": 413.2, "end": 426.8},
  "signals": [
    {"kind": "asr", "text": "先关掉红色开关", "start": 416.1, "end": 418.4},
    {"kind": "ocr", "text": "PUMP-03", "time": 419.0},
    {"kind": "object", "label": "red_button", "time": 421.6, "box": [0.62,0.28,0.74,0.51]}
  ]
}
```

时间窗不是最终答案，而是下一阶段视觉精读的输入。它应带有命中原因，让系统知道为什么把这 14 秒送给模型。

### 时间漂移是隐藏的线上故障

不同编码、丢帧和音视频流会造成时间偏移。对关键事件，建议同时保存原始 pts、播放器时间和导出文件时间；回放时以原视频时间戳为准，并用一组已标注事件校准偏移量。

## 短片段精读比堆很多独立帧更有用

“谁按了按钮”通常需要动作前后关系。只给一张按下后的帧，模型不知道手从哪里来；只给一张之前的帧，也不知道是否真的按下。可以把候选窗内的帧组织成短片段或有序帧组：

```text
t-2.0s: 人物走近控制台
t-0.8s: 右手靠近红色按钮
t+0.0s: 按钮状态改变
t+1.2s: 屏幕显示停止
```

同时限制帧数和分辨率，要求模型输出动作、主体、时间和置信度。需要精确核验时，再对 `t-0.5s ~ t+0.5s` 做高密度抽帧。

## 视频证据要能回放，不要只留摘要

摘要可能说“设备冒烟”，但审阅者需要看到原视频。证据对象至少包括：

```json
{
  "evidence_id": "ev-001",
  "video_id": "factory-cam-07-2026-08-19",
  "start": 421.18,
  "end": 423.04,
  "keyframes": [421.18, 421.86, 422.52],
  "thumbnail": "/media/ev-001.jpg",
  "reason": "红色按钮状态变化与停止提示同时出现",
  "method": ["ocr", "object_detection", "vlm_review"]
}
```

播放器可以通过 `video_id + start + end` 直接跳转。对于涉及安全和责任的场景，必须保留原片 hash 和处理版本。

![视频回答由时间窗、关键帧和原片链接组成，支持点击回放与重新核验](/images/notes/multimodal-video-agent/evidence-replay.svg)

图 3：时间戳和处理版本让视频答案从“看起来合理”变成可审计证据。

## 时间轴校准要单独做回归

视频文件的容器时间、音频时间和播放器展示时间可能不一致。上线前准备一小组带人工标注事件的校准片段，估计每一路信号的偏移：

\[
\hat{\delta}=\operatorname*{argmin}_{\delta}\sum_i\left|t_i^{signal}+\delta-t_i^{gold}\right|
\]

如果剪辑、转码或变速后偏移超过阈值，就不要把旧索引直接复用。证据对象还要写 `source_sha256`、`timebase` 和 `index_version`，这样同一秒数不会在不同导出文件里指向不同画面。

```json
{
  "timebase": "source_pts",
  "offset_ms": -84,
  "calibration_set": "factory-events@12",
  "index_version": "video-index@31"
}
```

![音频、字幕和视频帧在统一 timebase 上校准后再生成证据](/images/notes/multimodal-video-agent/timestamp-calibration.svg)

图 4：时间校准是视频 Agent 的基础设施，不是播放器的小细节。

## 上下文预算要按信息增益分配

对于候选窗口，不是帧越多越好。可以给每帧一个信息增益分数，优先保留场景变化、目标状态变化和 OCR/ASR 命中的帧：

\[
score(frame)=w_1\Delta scene+w_2\Delta object+w_3\,keyword+w_4\,blur^{-1}
\]

对连续相似帧做聚类，只保留代表帧；对动作变化点保留前后邻帧。这样既能控制 token，也能避免模型在一堆重复画面里迷失。

## 候选窗口要有预算账本和缓存边界

同一个视频可能被连续问很多次。可以缓存低频时间轴、镜头边界和 ASR/OCR 命中，但不要把带用户权限的最终证据直接跨请求复用。每个候选窗口记录：

| 字段 | 作用 |
| --- | --- |
| `source_sha256` | 确认索引对应哪份原片 |
| `index_version` | 判断时间轴和模型是否变化 |
| `evidence_scope` | 限定租户、权限和任务 |
| `frame_budget` | 控制本次送入模型的帧数 |
| `reuse_reason` | 说明缓存为什么仍然有效 |

预算分配可以先按问题类型设上限：静态事实优先代表帧，动作因果保留短片段，跨镜头追踪才允许扩大窗口。窗口扩大必须有信息增益或新证据触发，不能因为模型“还不确定”就无限追加帧。

![视频候选窗口按问题类型分配帧预算，缓存只复用稳定索引，最终证据仍受权限与版本约束](/images/notes/multimodal-video-agent/evidence-budget.svg)

## 回放失败时先查索引，再查模型

当用户点击时间戳却跳到错误画面，排查顺序应固定：源文件 hash 是否一致，timebase 是否校准，转码是否改变 PTS，播放器是否把相对时间当绝对时间，最后才检查模型是否选错窗口。把问题直接归给视觉模型，往往会错过更基础的索引故障。

线上回放抽检可以保存“答案时间窗”和“人工修正时间窗”的差值；如果误差集中在某类转码或某个摄像头，就把它加入校准集，不要只在 Prompt 里提醒模型“注意时间”。

## 证据窗要同时保存“看到了什么”和“怎么找到的”

视频回答最怕只有一句摘要：“在 06:53 发生了异常。”这句话无法判断时间来自 ASR、OCR 还是模型猜测。最小证据窗应该把定位依据和原片跳转放在一起：

```json
{
  "video_id": "factory-cam-07-2026-08-19",
  "answer_span": {"start": 413.2, "end": 426.8},
  "evidence": [
    {"kind": "asr", "start": 416.1, "end": 418.4, "text": "先关掉红色开关"},
    {"kind": "frame", "time": 421.6, "frame_id": "f_10540", "method": "event-refine"},
    {"kind": "ocr", "time": 419.0, "text": "PUMP-03", "confidence": 0.96}
  ],
  "seek": {"source": "hls-v2", "offset": 413.2},
  "confidence": "supported|partial|unknown"
}
```

`confidence=partial` 时，界面应提示用户扩大时间窗或查看原片，而不是把不确定的动作写成确定事实。回放接口还要校验用户对 `video_id` 的权限，不能因为索引缓存命中就跳过原片 ACL。

![视频证据窗把时间区间、帧号、ASR/OCR依据和原片跳转绑定在一起](/images/notes/multimodal-video-agent/evidence-window.svg)

## 如何评测视频 Agent

| 层级 | 指标 | 说明 |
| --- | --- | --- |
| 检索 | temporal recall@k | 正确事件是否进入候选窗 |
| 定位 | start/end error | 时间边界误差 |
| 理解 | action/entity accuracy | 主体、动作、状态是否正确 |
| 归因 | grounding/citation | 答案是否落在正确帧和时间 |
| 系统 | P95、成本、吞吐 | 处理长视频的可用性 |

测试集要有“短暂事件”“相似场景”“字幕与画面冲突”“音视频不同步”和“事件跨镜头”等样本。

## 面试官的高频追问

### L1：百万级帧怎么处理？

建立多层时间索引：低频帧、镜头边界、ASR/OCR、目标事件；问题到来后先定位候选窗，再对局部高密度抽帧或短片段精读。

### L2：怎么回答“发生在什么时候”？

所有信号共享原视频时间轴，候选窗记录起止时间和命中原因，最终输出可回放的时间区间，而不是只给一张截图。

### L2：什么时候应该送短片段而不是关键帧？

问题涉及动作先后、主体交互或状态变化时，单帧无法证明因果，就保留事件前后的短片段或有序帧组；静态场景问答才适合只送代表帧。

### L3：如何控制成本？

分层采样、帧去重、信息增益选帧和问题路由共同控制视觉 token；只有高价值候选窗进入大模型精读。

### L4：时间戳为什么会“看起来差不多但无法回放”？

因为 ASR、OCR、播放器和原片可能使用不同 timebase，转码还会引入偏移。要用人工标注事件校准偏移，记录原始 pts、源文件 hash 和索引版本，回放时以源时间轴为准。

### L4：缓存了视频索引，为什么仍要做权限过滤？

索引描述的是源视频和时间位置，不代表当前用户有权看到证据。缓存命中后仍要按租户、任务和权限过滤，生成阶段只接收授权的时间窗与帧。

### L5：模型总是要求更多帧，怎样控制它？

把帧数、分辨率、窗口时长和单问成本设硬上限；达到上限仍无法回答就拒答或请求更具体的时间范围。把不确定性变成明确反馈，不能用无穷追加帧掩盖索引或问题定义缺陷。

### L5：如何证明时间窗不是模型“猜出来”的？

要求证据窗同时包含命中的 ASR/OCR/帧信号、原片时间轴、源文件 hash 和可点击回放位置；再用人工标注的短暂事件集测 `start/end error`。只有摘要没有定位依据时，最多标成 partial，不能当作已被视频证实。

## 时间窗要发一张可以重新打开的证据凭证

视频 Agent 说“事件发生在 02:14”还不够。下一位工程师要能知道：这个时间点来自哪一段视频、用了哪些帧和 ASR、是否经过镜头切分、最后答案引用了哪一帧。如果只保存自然语言摘要，索引一升级，原来的证据就很难复现。

我会让每个结论带一张时间窗凭证：

```json
{
  "answer_id": "ans_fa0a0f",
  "video_id": "demo-17",
  "video_sha256": "sha256:91b...",
  "query": "红色按钮什么时候被按下？",
  "windows": [{
    "start_ms": 132400,
    "end_ms": 136800,
    "frames": ["f3310", "f3318"],
    "asr_span": ["t_132", "t_139"],
    "event_score": 0.91
  }],
  "index_version": "video-index-v6",
  "time_calibration": "offset:+180ms",
  "replay": "artifact://video/ans_fa0a0f"
}
```

`video_sha256` 防止源文件替换后还沿用旧时间，`time_calibration` 解释 ASR、帧和播放器为什么会有几百毫秒偏差，`replay` 让评测脚本可以重新打开同一窗口。答案可以很短，证据凭证不能省掉这些定位信息。

更实际的做法是把“看到了什么”和“怎么找到的”分开存：模型摘要属于前者，采样策略、索引版本、时间校准属于后者。用户只看摘要时页面很轻，发生争议时再展开凭证，既节省成本，也保留回放入口。

![视频时间窗证据凭证](/images/notes/multimodal-video-agent/video-window-receipt.svg)

### L5：时间窗有重叠时，如何避免答案引用一段错误片段？

先把相邻窗口按事件边界合并，再用动作分类、ASR 关键词和关键帧至少两类证据交叉验证；若只有单一弱证据，就把答案标成待确认，并展示多个候选窗口，而不是用一个看似精确的时间戳掩盖不确定性。

## 帧预算也要发一张“消耗回执”

“用了更多帧所以答对了”不是完整结论。视频 Agent 需要记录每个时间窗为什么升级采样、用了多少视觉 token、最终是否带来证据收益；否则成本上涨很难定位到问题路由：

~~~yaml
video_budget_receipt: vbr_3b12be
query_id: q_button_press_44
route: coarse_to_fine
windows:
  coarse: 6
  refined: 18
  clip_seconds: 4.4
signals:
  asr_hit: true
  ocr_hit: false
  motion_score: 0.83
result:
  temporal_recall: 1.0
  start_end_error_ms: 240
  evidence_status: supported
cost:
  vision_tokens: 4820
  p95_ms: 910
decision: within_budget
~~~

同一问题保留低频采样和升级采样两条结果，才能知道额外 12 帧是否真的降低边界误差。达到硬预算仍无法完成定位，就返回 partial 或请求更窄时间范围，不要无限追加帧。

![视频帧预算回执把升级原因、采样量、证据收益和成本绑定到一次查询](/images/notes/multimodal-video-agent/video-budget-receipt.svg)

### L5：如何证明增加帧数真的值得？

在固定问题集上对照 coarse 和 refined 两条路由，比较时间召回、边界误差、证据支持率、P95 和视觉 token；如果只增加成本却没有稳定收益，就应该改事件索引或问题路由，而不是继续加帧。

## 时间窗边界要用反事实回放校准

视频 Agent 给出一个时间点，并不意味着它真的定位到了事件。镜头切换、变速转码和字幕延迟都可能让 `start/end` 看起来差不多却无法复现。对边界敏感的事件，应该固定一组人工标注窗，分别替换 ASR、OCR、关键帧和镜头边界，观察哪类信号让时间误差变化。

```yaml
window_replay: vw_fee3ca
source_sha256: "sha256:video-demo-v3"
gold: {start_ms: 412000, end_ms: 428000}
variants:
  - name: frame_only
    start_error_ms: 1800
    end_error_ms: 2100
  - name: asr_plus_frame
    start_error_ms: 620
    end_error_ms: 740
  - name: asr_ocr_frame
    start_error_ms: 410
    end_error_ms: 480
decision:
  status: grounded
  required_signals: [asr, frame]
  confidence: 0.88
```

这里的目标不是让模型报出更多小数位，而是知道时间窗为什么落在这里。若不同信号给出冲突边界，答案应展示候选窗或标成 `partial`；只有当时间轴、源文件 hash、索引版本和证据信号都能回放时，才把它当成确定事实。边界误差还应按摄像头、转码链路和事件类型分桶，方便修索引而不是盲目加帧。

![视频时间窗用人工标注和多信号反事实回放校准边界误差](/images/notes/multimodal-video-agent/window-counterfactual-card.svg)

### L5：为什么只展示一张关键帧不能证明时间窗正确？

关键帧只能说明某一刻看到了什么，无法证明事件从何时开始、何时结束，也不能解释时间来自 ASR、OCR 还是转码后的播放器。时间窗需要原片时间轴、命中信号和可点击回放位置三者同时存在。

## 视频证据缓存要绑定源文件版本与时间轴校准

视频被重新转码、剪辑或替换后，旧的帧索引和 ASR 时间戳可能仍然命中，但已经指向另一段画面。缓存键不能只用 `video_id`，还要带源文件 hash、时长、帧率和时间轴校准版本；发现 hash 变化时，旧窗口标为 stale，禁止继续给答案引用。

```yaml
video_evidence_cache: vec_3d97c0
video_id: demo-17
source_sha256: sha256:video-v3
duration_ms: 184200
fps: 25
timeline_calibration: tc-v2
cached_windows: 42
invalidation:
  new_source_sha256: sha256:video-v4
  old_window_status: stale
  reindex_required: true
generation_gate:
  stale_evidence: reject
  missing_calibration: partial
decision: cache_versioned
```

![视频证据缓存版本卡：源文件 hash、帧率和时间轴校准变化时旧窗口自动失效](/images/notes/multimodal-video-agent/video-cache-version-card.svg)

### L5：为什么视频换了编码也要重新做时间窗回放？

编码变化可能改变关键帧位置、帧率和音视频偏移；即使画面内容看起来一样，毫秒级边界也可能漂移。只有源文件版本和校准一致，旧窗口才有可复用意义。

## 事件评测要把“找到了”与“边界准”拆开

视频问答最容易出现一种假进步：模型找到了正确事件，但时间窗覆盖了前后很长的无关画面；或者边界很准，却漏掉了短暂动作。只报一个命中率无法区分这两类问题，我会把事件评测拆成时间召回、边界误差、证据支持率和无关覆盖率四项，并按事件类型分别统计。

对“出现某个按钮”“有人举手”“一句话开始”这类事件，标注集要保存 `gold_start`、`gold_end` 和允许误差。系统返回候选窗时，先判断是否与金标准有足够交集，再计算 start/end 的偏差；如果只命中相邻镜头或凭字幕猜到主题，证据支持率仍然不能算通过。这样优化采样策略时，才能知道需要增加帧、修正 ASR 对齐，还是改镜头切分。

~~~yaml
event_metric_contract: emc_5959bd
dataset: video-events-v2
events:
  - type: short_action
    n: 160
    time_recall: 0.91
    start_mae_ms: 480
    end_mae_ms: 620
    evidence_support: 0.88
    irrelevant_coverage: 0.17
  - type: speech_boundary
    n: 140
    time_recall: 0.95
    start_mae_ms: 290
    end_mae_ms: 360
    evidence_support: 0.94
gates:
  short_action_time_recall_min: 0.90
  boundary_mae_max_ms: 1000
  evidence_support_min: 0.85
decision: pass_with_short_action_watch
~~~

![视频事件评测卡：时间召回、边界误差、证据支持率和无关覆盖率分开验收](/images/notes/multimodal-video-agent/event-boundary-score-card.svg)

### L5：时间召回很高但边界误差很大，算不算通过？

不应直接算通过。它说明系统大致找到了事件，却还不能给用户可靠的可回放范围；对于剪辑、审计和动作定位任务，边界误差本身就是硬指标，应按事件类型设置门槛并保留原始候选窗。

## 视频时间窗要报告边界误差，而不是只报命中率

一个时间窗找到了正确事件，不代表边界就准确。可以用时间区间 IoU 先做基础对账：

$$
IoU_t=\frac{\max(0,\min(e_p,e_g)-\max(s_p,s_g))}{\max(e_p,e_g)-\min(s_p,s_g)}
$$

其中 (p) 是预测窗，(g) 是标注窗。实际发布时还要同时报告前后边界误差、无关覆盖率和帧预算；否则模型只要把窗口拉得很长，就能靠高召回掩盖定位很差。

```yaml
temporal_boundary_score:
  contract: tbs_5bded5
  event: forklift_enter_zone
  predicted: [122.4, 139.8]
  gold: [126.0, 134.0]
  iou_t: 0.46
  start_error_s: -3.6
  end_error_s: 5.8
  irrelevant_coverage: 0.34
```

![视频边界评分：时间 IoU、前后边界误差和无关覆盖率共同约束窗口质量](/images/notes/multimodal-video-agent/temporal-boundary-score-card.svg)

### L5：为什么不能只看时间召回？

时间召回只回答“有没有碰到事件”，没有回答“引用是否足够短、边界是否可信”。长窗口会增加抽帧、上下文和人工复核成本，甚至把邻近事件误当成证据。

## 把这段分析讲给面试官

视频 Agent 不会逐帧调用大模型，而是先建立统一时间轴。第一层用低频缩略帧和镜头切分建立全局地图，ASR、OCR 和目标检测提供低成本事件信号；第二层根据问题命中时间窗，提高局部采样率或送入短片段视觉模型。每个证据记录 video_id、起止时间、帧号、原片 hash 和处理方法，答案可以直接跳回原视频。评测拆成时间召回、边界误差、动作理解、证据归因和系统成本，重点测试短暂事件、相似场景和音视频漂移。

## 带走一张检查清单

- [ ] 是否建立了统一且可校准的视频时间轴？
- [ ] 是否用粗到细的分层采样，而不是全片逐帧？
- [ ] ASR、OCR、目标检测和帧是否共享同一时间坐标？
- [ ] 动作问题是否保留事件前后的短片段？
- [ ] 答案是否能回放原片并显示处理版本？

## 相关笔记

- [多模态模型不是给图片加个输入框：图像怎样进入 Transformer？](/notes/multimodal-to-transformer)
- [多 Agent 为什么越加人越慢？先管并发和预算](/notes/multi-agent-concurrency-budget)
- [Agent 上线后怎么定位问题？从 trace 到可观测性和回放](/notes/agent-observability-replay)

## 参考

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
