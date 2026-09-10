---
slug: "agent-context-engineering"
title: "上下文越塞越满，Agent 为什么反而变笨？"
excerpt: "Agent 变笨，常常不是模型不够大，而是上下文里塞进了旧状态、无关工具结果和没人核过的指令。先筛选，再压缩、排序和标注，模型才看得见重点。"
series: "Agent 架构"
seriesNo: "06"
number: "62"
minutes: 23
---

一个客服 Agent 刚开始很聪明，跑到第十轮却反复引用已经废止的政策。工程师第一反应是换更大的模型，展开 trace 后才发现：完整聊天记录、三次失败工具返回和两份旧版文档都被原样塞进了上下文。

## 先给一个能复述的答案

Context Engineering 是围绕当前决策，设计上下文的**选择、组织、压缩和生命周期**。它不等于把 Prompt 写得更长，也不等于把所有历史都放进记忆。一个可用的上下文应该让模型知道：现在要完成什么、哪些信息可信、哪些状态会改变、下一步能做什么，以及何时必须停下来。

![上下文从原始事件到决策窗口的组装过程](/images/notes/agent-context-engineering/context-window.svg)

## 上下文的六个槽位

| 槽位 | 作用 | 常见误区 |
| --- | --- | --- |
| Goal | 说明当前任务和验收 | 把长期愿景当当前目标 |
| State | 记录结构化进度 | 用聊天文本代替状态 |
| Evidence | 提供可核查事实 | 把搜索结果全量塞入 |
| Policy | 约束权限和安全 | 把政策写成可被覆盖的建议 |
| Action space | 告诉模型能做什么 | 暴露过多相似工具 |
| History | 保留必要因果 | 只按时间追加不做摘要 |

上下文窗口不是仓库。每次模型调用都该问一句：**如果删掉这段信息，当前决策会变差吗？**如果答案是否定的，它就不该占据主窗口。

## 从“更多信息”转向“更高信号密度”

可以把上下文质量粗略看成：

$$
\rho=\frac{I_{relevant}+I_{verifiable}}{T_{input}},\qquad
T_{input}=T_{goal}+T_{state}+T_{evidence}+T_{history}
$$

$\rho$ 不是严格的科学指标，但很适合作为工程方向：减少重复、旧版本和无关结果，同时提高证据的可验证程度。上下文压缩的目标不是让字数更少，而是让每个 token 更接近当前决策。

## 结构化状态要先于长文本记忆

把 Agent 的进度保存成 JSON，比把每轮对话原样拼接更容易检查：

```json
{
  "goal": "确认报销制度的当前生效版本",
  "phase": "evidence_check",
  "constraints": {"tenant": "acme", "as_of": "2026-08-22"},
  "claims": [
    {"text": "差旅住宿上限已调整", "status": "needs_source"}
  ],
  "next_actions": ["retrieve_current_policy", "compare_effective_at"],
  "budget_left": 2
}
```

结构化状态能让程序做校验和迁移。长文本仍然有价值，但它应该作为证据或解释被引用，而不是承担所有控制逻辑。

![结构化状态、证据和动作候选进入当前决策窗口](/images/notes/agent-context-engineering/context-routing.svg)

## 记忆的生命周期

短期记忆服务于当前任务，长期记忆服务于未来检索。两者之间必须有写入条件和淘汰策略。

| 类型 | 写入条件 | 读取时机 | 失效方式 |
| --- | --- | --- | --- |
| 工作状态 | 每一步都可更新 | 每次决策 | 任务结束归档 |
| 任务摘要 | 达到轮次或 token 阈值 | 继续长任务 | 新事实覆盖 |
| 用户偏好 | 用户明确确认 | 个性化任务 | 用户修改或撤回 |
| 组织知识 | 来源通过审核 | 检索命中 | 版本、时间、权限过滤 |

“记住用户说过的话”不是写入长期记忆的充分条件。应该记录来源、置信度、更新时间和删除方式，否则记忆越多，错误越难纠正。

## 工具结果如何进入上下文

工具返回通常包含大量机器字段。先做程序级裁剪，再把少量与当前问题有关的观察交给模型：

```python
def shape_observation(raw: dict, *, tenant: str, now: str) -> dict:
    rows = [
        row for row in raw.get("rows", [])
        if row.get("tenant") == tenant and row.get("effective_at", "") <= now
    ]
    return {
        "source": raw.get("source"),
        "version": raw.get("version"),
        "rows": [
            {"id": r["id"], "title": r["title"], "snippet": r["snippet"]}
            for r in rows[:6]
        ],
        "truncated": len(rows) > 6,
    }
```

不要让模型替你做租户和时间过滤。上下文里出现的事实应该已经过硬约束，模型只负责理解和组合。

## 何时压缩，何时重新检索

压缩适合保留因果链，重新检索适合获取会变化的事实。可以按信息类型处理：

1. 已完成的对话：压成目标、已做动作、结论和未决问题；
2. 版本敏感的政策：不依赖旧摘要，重新检索当前版本；
3. 大段代码：保留文件路径、符号、测试结果和修改 diff，必要时再读原文；
4. 失败工具回执：保留错误类型、请求指纹和未知副作用，不保留重复堆栈。

压缩器本身也要评测。摘要遗漏一个否定词，可能比上下文太长更危险。

## 设计一个上下文预算

```yaml
context_budget:
  total_tokens: 12000
  goal_and_policy: 1800
  structured_state: 1600
  evidence: 5200
  action_space: 1200
  history_summary: 1800
  reserve: 400
rules:
  - "evidence must carry source_id and effective_at"
  - "old policy never outranks current version"
  - "reserve is unavailable for normal history"
```

预算不是越大越好。留出 reserve 可以避免最后一轮因为上下文刚好超限而丢失终态或错误说明。

## 一个长任务案例：客服 Agent 为什么越聊越不稳

用户先问“这笔订单为什么被拦截”，接着补充账号、设备、优惠券和退款要求。第 1 轮只需要订单状态和风控原因；第 8 轮如果仍然把完整聊天、每次工具原始回执和旧政策全部塞进窗口，模型会遇到三种混淆：

| 混淆 | 例子 | 结构化修复 |
| --- | --- | --- |
| 事实与讨论 | “可能是风控”被当成结论 | `claim.status=unverified` |
| 新旧版本 | 旧退款规则仍在历史里 | `effective_at` 过滤 + 当前版本槽 |
| 已做与待做 | 已查过订单却重复调用 | `actions_done` / `next_action` |

因此每一轮进入模型的内容应该由“当前目标、已确认事实、未决问题、证据和可用动作”组成，而不是由消息条数决定。

![上下文从记忆分层到当前决策窗口](/images/notes/agent-memory-system/memory-layers.svg)

## 记忆写入要经过 provenance 闸门

长期记忆最危险的写入不是明显的错误，而是把猜测写成了用户偏好。可以把写入条件写成规则：

```yaml
memory_write:
  user_preference:
    require: [explicit_confirmation, source_message_id]
    ttl_days: 180
  task_fact:
    require: [tool_receipt, source_version]
    ttl_days: 7
  organization_policy:
    require: [review_status=approved, effective_at, owner]
    ttl_days: null
  speculation:
    action: discard
```

读取时也要回传 `source_message_id`、更新时间、置信度和撤回入口。用户说“我更喜欢表格”可以成为偏好；模型根据一次回答风格推断出来的“用户不喜欢代码”不应直接落库。

![记忆写入的来源、版本与撤回闸门](/images/notes/agent-memory-system/memory-provenance-gate-card.svg)

## 上下文装配器：先硬过滤，再软排序

可以把装配过程拆成四步：

1. **硬过滤**：租户、权限、时间、生效版本和敏感字段；
2. **去重**：同一事实的不同摘要只保留可回查的一份；
3. **软排序**：按与当前目标的相关性、来源质量和新鲜度排序；
4. **分槽位**：目标、政策、状态、证据、动作和历史摘要各自占预算。

```python
def assemble_context(items, *, tenant, acl, now, budget):
    allowed = [x for x in items
               if x.tenant == tenant and x.acl <= acl
               and x.effective_at <= now <= x.expires_at]
    unique = dedupe_by_claim(allowed)
    ranked = sorted(unique, key=lambda x: (x.relevance, x.source_quality, x.freshness), reverse=True)
    slots = {"goal": [], "state": [], "evidence": [], "history": []}
    for item in ranked:
        slot = item.slot if item.slot in slots else "evidence"
        if tokens(slots[slot]) + item.tokens <= budget[slot]:
            slots[slot].append(item)
    return slots
```

排序不能代替权限过滤。先按相关性排序再过滤，有时会让一条高相关但不允许查看的材料影响截断结果，最后把真正可用的证据挤出去。

![工具结果从原始回执到可用上下文的整形流水线](/images/notes/tool-output-shaping/output-pipeline.svg)

## 摘要要保留否定词、条件和因果链

普通摘要容易留下“退款已批准”，却丢掉“仅当订单未发货”。建议用结构化摘要替代一段自由文本：

```json
{
  "goal": "判断订单是否可退款",
  "confirmed": [{"claim": "订单已发货", "source": "order-api#18"}],
  "constraints": [{"claim": "发货后仅异常件可申请", "source": "policy-v4#p2"}],
  "rejected": [{"claim": "普通无理由退款", "reason": "不满足时间条件"}],
  "open_questions": ["是否属于异常件"],
  "next_action": "ask_clarification"
}
```

摘要的评测可以做“关键信息保留率”：对每条样本标注否定、条件、例外和数字，比较压缩前后是否仍可推导同一个下一动作。

## 上下文失控的四个信号

| 信号 | 监控方式 | 优先修复 |
| --- | --- | --- |
| 重复工具调用 | 相同请求指纹 / 任务 | 写入结构化状态和缓存 |
| 旧版本误用 | 引用版本与当前版本比对 | 当前事实独立槽位 |
| 证据被截断 | `truncated=true` 占比 | 预留 evidence budget |
| 终态丢失 | 完成/失败没有结果凭证 | 保留 terminal slot |

如果这些信号在长任务上明显恶化，不要先把上下文窗口调大。先定位是哪一种信息没有被压缩、过滤或分槽，通常更便宜也更可解释。

## 用“上下文 diff”做回归，而不是只看答案

同一任务换了模型或 Prompt 后，答案改变可能是好事，也可能是上下文装配发生了漂移。可以对每次运行保存脱敏后的上下文摘要：槽位、token 数、证据 ID、版本和截断标记，然后做 diff：

```json
{
  "run": "ctx-20260822-018",
  "slots": {
    "goal": {"tokens": 230, "ids": ["user-msg-18"]},
    "evidence": {"tokens": 4120, "ids": ["policy-v4#p2", "policy-v4#p3"]},
    "history": {"tokens": 1640, "summary_version": "sum-v6"}
  },
  "truncated": ["history"],
  "removed_claims": [],
  "added_claims": ["city=上海"]
}
```

如果质量下降同时出现证据 ID 消失、旧版本重新进入窗口或 `removed_claims` 增加，优先修复装配器；如果上下文没有变化，再比较模型和解码参数。

![上下文版本差异与回放核对](/images/notes/agent-observability-replay/drift-split-replay-card.svg)

## 什么时候应该重新检索，而不是摘要

可以用事实的“变化速度”和“因果价值”做一个简单判断：

| 信息 | 变化速度 | 摘要是否安全 | 默认动作 |
| --- | --- | --- | --- |
| 当前订单状态 | 秒级 | 不安全 | 重新查询 |
| 已完成的用户澄清 | 低 | 通常安全 | 结构化摘要 |
| 政策版本 | 天/周级 | 需带版本 | 当前版本重检 |
| 工具错误堆栈 | 不变但很长 | 保留错误码和指纹 | 摘要 + 按需回查 |

摘要不是“把所有内容压短”，而是只压缩不会改变下一动作的部分。会变化、会授权或决定金额的事实，应始终保留可回查的当前来源。

## 上下文预算的调参顺序

当窗口超限时，按以下顺序处理通常更安全：

1. 删除重复的历史措辞，保留结构化状态；
2. 合并同一来源的重复证据，保留 source map；
3. 缩短工具原始字段，但保留错误码、版本和回查 ID；
4. 重新检索最相关片段；
5. 最后才缩短目标或系统策略（通常不应删除）。

如果第五步仍然超限，返回澄清或升级，而不是把控制规则截掉。

## 高频追问

**L1：Context Engineering 和 Prompt Engineering 有什么区别？**

Prompt Engineering 更关注指令表达，Context Engineering 关注运行时哪些信息进入窗口、以什么结构和顺序进入、什么时候被压缩或重新检索。前者是文案问题，后者是系统问题。

**L1：为什么不把完整历史都放进去？**

完整历史包含重复、过期和与当前目标无关的信息，会挤压证据、增加延迟，并让模型难以分辨事实和讨论过程。

**L2：摘要能替代长期记忆吗？**

不能。摘要适合短期任务的因果压缩，长期记忆还需要来源、版本、权限、更新和删除策略。

**L2：工具输出裁剪会不会丢信息？**

会，所以要保留来源、版本、截断标记和可回查的 ID。裁剪不是删除证据，而是把详细证据移到按需读取的地址。

**L3：怎么评测上下文是否变好？**

固定任务和模型，比较 token、延迟、引用覆盖、旧版本误用、重复工具调用和长尾成功率；同时抽查摘要遗漏的关键条件。

**L3：为什么模型变大仍可能解决不了上下文问题？**

模型更大不等于能可靠区分所有信息。过期证据、冲突指令和错误状态如果进入窗口，模型能力越强，可能越自信地做错。

**L5：上下文预算该怎么在成本和质量间取舍？**

先锁住不可压缩的目标、政策和当前证据，再对历史做摘要或按需检索。用质量、P95、token 和失败切片一起找拐点，不按总 token 越多越好判断。

## 60 秒面试回答

我把 Context Engineering 理解为围绕当前决策管理上下文的生命周期：选择哪些信息、如何结构化、如何排序、什么时候压缩以及如何重新检索。实现时我会把目标、政策、结构化状态、证据、动作候选和历史摘要分槽位，租户、版本和时间过滤由程序完成，模型只处理已经过硬约束的观察。每个槽位设置 token 预算，并保留来源、版本和截断标记。评测不只看答案，还看旧版本误用、引用覆盖、重复调用、延迟和成本。这样上下文不再是聊天记录的堆积，而是可审计的决策窗口。

## 自检清单

- [ ] 能说清当前窗口里每类信息的责任
- [ ] 有结构化状态，不把控制逻辑全放在长文本里
- [ ] 工具结果经过租户、时间、版本和字段裁剪
- [ ] 摘要、长期记忆和重新检索有不同触发条件
- [ ] 评测覆盖旧事实、冲突信息、长任务和 token 成本

## 相关阅读

- [记忆系统不是聊天记录：短期、长期和压缩到底怎么分工](/notes/agent-memory-system)
- [RAG 答案看着对，怎样证明它有依据？](/notes/rag-grounded-evidence)
- [工具返回一大段 JSON，为什么 Agent 反而更容易做错](/notes/tool-output-shaping)

## 资料来源

- AgentAlpha《Agent 岗面试宝典 v3 · 精华版》：上下文与记忆章节（内部讲义，未公开）
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)：用基础、问答、实现三栏减少“只背名词”的学习断点
