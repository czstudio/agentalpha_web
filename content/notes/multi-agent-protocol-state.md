---
slug: "multi-agent-protocol-state"
title: "多 Agent 不是群聊：消息和状态到底怎么管？"
excerpt: "多 Agent 协作的关键不是让它们互相发消息，而是约定谁能说什么、谁能改什么、状态何时提交，以及消息怎样被确认。"
series: "多智能体"
seriesNo: "07"
number: "30"
minutes: 20
---

“你问一下研究 Agent。”“好，我觉得可以交给分析 Agent。”如果多 Agent 的通信长这样，本质上还是群聊：消息很多，责任很少；状态各存一份，最后谁也说不清哪份最新。

可靠的多 Agent 系统要把自然语言交流放在辅助位置，把协议和状态放到主干上。Agent 之间传递的不是“我认为”，而是带 schema、版本、来源、租约和确认状态的事件。

## 这一轮分析的结论

多 Agent 协作先定义角色边界，再定义消息协议和共享状态。消息必须说明发送者、接收者、意图、任务 ID、输入版本、产物引用、过期时间和幂等键；共享状态要有单一 owner，其他 Agent 通过事件或受控命令修改，避免多个写者互相覆盖。通信失败要区分丢失、重复、乱序、超时和内容无效，分别处理确认、去重、版本检查和补偿。自然语言只放在 `payload` 里，不能承担协议本身。

![多 Agent 通信的三层结构：角色契约、消息协议、版本化状态](/images/notes/multi-agent-protocol-state/protocol-layers.svg)

图 1：把“谁负责什么”“消息如何流转”“状态谁能改”拆成三层，问题才有地方落。

## 一、角色分工不是职位表，而是写权限表

可以先用一个小矩阵描述角色：

| 角色 | 读取 | 写入 | 调用工具 | 交付物 |
| --- | --- | --- | --- | --- |
| Planner | 任务状态、约束 | 计划草稿 | 无副作用工具 | Plan vN |
| Researcher | 公开来源 | 证据包 | 搜索、抓取 | Evidence vN |
| Implementer | 代码、测试结果 | 分支补丁 | 沙箱命令 | Patch vN |
| Reviewer | 计划、证据、补丁 | 审核意见 | 只读检查 | Review vN |
| Coordinator | 全局元数据 | 状态迁移 | 调度接口 | Final decision |

“读取很多”不代表“可以修改很多”。尤其别给每个 Agent 一把 `update_state` 全能钥匙；它们应该只能调用自己负责的命令，例如 `submit_evidence`、`request_review`、`mark_blocked`。

## 二、消息协议至少要回答八个问题

一条跨 Agent 消息不应该只有 `from`、`to` 和一段文本。最小协议可以长这样：

```json
{
  "message_id": "msg_0182",
  "idempotency_key": "task_77:research:3",
  "task_id": "task_77",
  "sender": "researcher_a",
  "recipient": "synthesizer",
  "type": "evidence.ready",
  "schema_version": 2,
  "causation_id": "msg_0173",
  "state_version": 8,
  "payload_ref": "artifact://evidence/ev_12",
  "ttl_seconds": 900,
  "requires_ack": true
}
```

八个问题分别是：谁发、发给谁、属于哪件任务、这是何种意图、使用哪个 schema、基于哪一版状态、产物在哪里、多久有效。`causation_id` 还能把“这次重试为什么发生”串回上游。

![消息协议字段分区：身份、因果、版本、产物和生命周期](/images/notes/multi-agent-protocol-state/message-envelope.svg)

图 2：消息信封是可观测性和去重的基础，不是额外的格式负担。

## 三、状态同步要有 owner、版本和提交点

多 Agent 最容易发生的错误是“大家都看到了一份状态，但谁都以为自己可以更新它”。解决方案不是让大家更频繁地同步，而是给每个状态块指定 owner，并让更新带版本条件。

```python
def commit_state(store, task_id, expected_version, patch, actor):
    current = store.read(task_id)
    if current.version != expected_version:
        return {"status": "conflict", "actual": current.version}
    if not policy.allows(actor, patch):
        return {"status": "denied"}
    next_state = apply_patch(current, patch)
    next_state.version += 1
    store.append(task_id, next_state, actor=actor)
    return {"status": "committed", "version": next_state.version}
```

这和数据库的乐观锁很像：Agent 读到的是 v8，只能提交“基于 v8 的修改”。如果另一位 Agent 已经提交成 v9，就返回冲突，让协调器重新合并，而不是静默覆盖。

| 状态块 | owner | 其他角色的操作 |
| --- | --- | --- |
| 当前计划 | Planner | 提建议，不直接改主版本 |
| 证据目录 | Researcher | 追加、标记过期 |
| 代码补丁 | Implementer | 提交新 revision |
| 审核结论 | Reviewer | 只能写 review event |
| 发布状态 | Coordinator / 人工 | 迁移，不允许 Agent 自由跳转 |

## 四、事件和命令要分开

命令表达“请你做什么”，事件表达“已经发生什么”。`request_review` 是命令，`review.completed` 是事件。前者需要权限与确认，后者应该尽量不可变，方便回放。

```text
Coordinator --command--> Researcher: collect_evidence
Researcher  --event----> Bus: evidence.ready
Synthesizer --command--> Reviewer: request_review
Reviewer     --event---> Bus: review.completed
```

如果把命令和事件混成一类，重放时很容易把历史命令再次执行。回放应该只消费事件构建状态，真正有副作用的命令必须走幂等检查和人工闸门。

## 五、通信故障要分类处理

### 丢失和超时：重试，但要带幂等键

没有收到 ACK，不代表对方没有执行。重试必须携带相同的 `idempotency_key`，接收方先查处理记录，再决定返回旧结果还是继续执行。

### 重复：去重表比“让模型记住”可靠

每个消费者维护有限期去重表，记录消息 ID、幂等键、处理状态和结果引用。业务结果已提交但 ACK 丢失时，第二次请求直接返回已提交结果。

### 乱序：按版本或因果关系拒绝旧消息

收到 v8 事件而本地已经是 v10 时，不能把 v8 的字段直接写回去。可以保存为历史事件，或者触发一次重新同步。

### 内容无效：协议正确不代表产物正确

JSON 能解析，只说明格式没坏。还要校验字段范围、来源引用、权限和业务不变量；失败时发出 `artifact.invalid`，不要让下一位 Agent 接着加工。

![通信失败处理矩阵：重复、乱序、超时与无效产物对应不同补偿动作](/images/notes/multi-agent-protocol-state/failure-matrix.svg)

图 3：重试只适用于可重试故障；内容无效需要返工或升级，不是再调用一次模型。

## 六、共享状态与黑板模式怎么选

黑板模式适合多个专家围绕一个任务逐步追加观察结果：大家读同一个任务黑板，各自写自己的命名空间，协调器根据事件决定下一步。它的优点是解耦，缺点是状态容易膨胀，必须设定过期和归档。

直接点对点通信适合链路短、责任明确的任务。它延迟低，但拓扑会随着角色增多变成网状，排错和版本升级都更困难。

| 模式 | 优点 | 风险 | 适用场景 |
| --- | --- | --- | --- |
| 点对点 | 快、路径清晰 | 拓扑复杂、耦合高 | 2-3 个稳定角色 |
| 共享黑板 | 解耦、便于观察 | 状态膨胀、写冲突 | 研究和协作分析 |
| 事件总线 | 可回放、可扩展 | 最终一致、调试要求高 | 长任务、异步协作 |

## 七、把协议接到 Agent 框架之前

框架可以帮你创建角色和消息，但不能替你决定状态 owner、权限、幂等和审计。接入框架时我会先做三件事：

1. 把框架的自由文本消息包在自己的 envelope 里。
2. 把工具调用和状态提交放到框架外的 policy gateway。
3. 给每个产物写入 artifact registry，消息只传引用和版本。

这样更换框架时，任务状态、事件和评测集仍然可复用，不会把系统绑死在某个对话编排 API 上。

## 八、提交点要像状态机，而不是“最后写一下”

一个 Agent 可能已经调用工具，但还没把结果提交到共享状态；也可能提交成功后 ACK 丢失。建议把状态拆成 `planned → running → prepared → committed → verified`，每次状态迁移都带期望版本和事件 ID。只有 `verified` 才能让下游读取为可用产物。

```text
prepared --commit(v7)--> committed(v8)
    │                          │
    └─校验失败→ rejected       └─回读校验→ verified
```

如果提交时发现版本冲突，不要让模型猜“谁是最新”。保留冲突双方的 artifact，交给 owner 或仲裁器合并；如果是写操作，先查询副作用是否已经发生，再决定补偿、重试或人工接管。事件记录事实，命令请求动作，二者都要能单独回放。

![多 Agent 状态提交经过 prepared、committed、verified 三个检查点，冲突不会静默覆盖](/images/notes/multi-agent-protocol-state/commit-state-machine.svg)

图 4：状态机把“消息到了”与“产物可用”分开，避免 ACK 或乱序把错误状态传播给下游。

## 协议验收不只看 ACK，而要看提交后的事实

消息收到 ACK 只代表传输层接收，不代表下游已经接受语义或把状态写入正确版本。可以把一次提交拆成三段回执：

```json
{
  "message_id": "msg-019",
  "ack": {"received": true, "at": "2026-08-19T09:21:04Z"},
  "commit": {"state_version": 42, "owner": "planner", "status": "committed"},
  "verify": {"read_back": true, "hash": "sha256:...", "conflicts": []}
}
```

如果 `ack=true` 但 `verify.read_back=false`，调用方应把状态标成 `unknown`，暂停依赖它的下一步，而不是继续发布“已完成”事件。验收样本要覆盖重复消息、乱序版本、提交后进程崩溃和回读发现冲突四种路径。

![多 Agent 协议把 ACK、提交和回读校验拆成三个可观测检查点](/images/notes/multi-agent-protocol-state/ack-commit-verify.svg)

## 面试官的三层追问

### L1：多 Agent 如何通信？

用结构化消息协议传递任务、意图、版本、产物引用和过期时间，自然语言只作为 payload。消息有 ACK、幂等键和 schema 校验。

### L2：多个 Agent 同时修改状态怎么办？

为状态块指定 owner，更新携带 expected version，通过乐观锁或单写者队列提交；冲突不静默覆盖，交给协调器合并或人工处理。

### L3：事件总线会不会导致消息最终一致、状态不准？

会，所以高风险动作不能只依赖最终一致事件，必须在提交点做版本和权限校验。事件用于记录事实和回放，命令用于请求动作，二者要分开。

### L5：冲突状态应该让哪个 Agent 决定？

由状态 owner 或独立仲裁器依据版本、权限和业务规则决定；普通生成 Agent 只能提出合并建议，不能静默覆盖另一方的事实。

### L5：为什么 ACK 成功还要回读校验？

因为消息队列确认的是“收到”，而不是“按预期版本提交”。回读能发现写入丢失、版本冲突和序列化错误；在校验完成前，后续 Agent 只能看到 `pending/unknown`，不能把 ACK 当最终事实。

## 提交回执要成为可消费的状态契约

为了让下游 Agent 不靠猜测推进，提交回执应同时暴露传输、业务和验证三层状态：

```json
{
  "operation_id": "commit-204",
  "transport": {"ack": true, "message_id": "msg-019"},
  "business": {"status": "committed", "state_version": 42},
  "verify": {"read_back": true, "hash": "sha256:...", "conflicts": []},
  "next": "publish_artifact"
}
```

只有 `ack=true`、`business.status=committed` 且 `verify.read_back=true` 才能把产物交给下一步；任何一层是 `unknown`，都要暂停依赖它的命令。这样消息队列可以继续最终一致，但高风险动作仍然有一个明确的业务放行点。

![提交回执把传输 ACK、业务状态、回读校验和下一步动作做成可消费契约](/images/notes/multi-agent-protocol-state/commit-receipt-contract.svg)

## 提交回执还要有过期与重放窗口

多 Agent 之间传递的提交回执不是永久通行证。它应当带版本、过期时间、调用方和幂等键；消费方先检查是否仍在有效窗口，再决定接受、查询当前状态还是转入人工。这样旧消息即使重新到达，也不会把已经提交的结果覆盖掉：

```yaml
commit_receipt: cr_b4388e
operation: update_contract_status
producer: contract-agent-r7
consumer: audit-agent-r3
state: committed
commit_version: 18
idempotency_key: contract-8842-status-approved
issued_at: 2026-08-20T09:30:00Z
expires_at: 2026-08-20T09:35:00Z
replay_policy:
  same_key: "return current state"
  old_version: "reject_and_read_back"
  unknown: "pause and escalate"
```

不要把“消息送达”当成“状态仍然有效”。尤其是审批、扣款和写回任务，过期回执只能触发读回与对账，不能靠重发消息赌一次成功。

![提交回执过期卡把版本、幂等键、有效窗口和重放处理固定成状态边界](/images/notes/multi-agent-protocol-state/commit-receipt-expiry-card.svg)

## 过期回执之后还要做一次“重复投递探针”

回执过期的危险不只是一条旧消息被拒绝，也可能是同一个 envelope 在网络恢复后重复到达。验收时用相同幂等键投递两次，再用旧版本、错消费者和乱序状态各投一次，确认系统分别去重、读回、拒绝或转人工；不能把所有异常都归结为“重试就好”。

~~~yaml
duplicate_delivery_probe: ddp_b21c9d
envelope_id: env-8848
idempotency_key: contract-8842-status-approved
cases:
  same_key_same_payload: return_current_state
  same_key_changed_payload: reject_conflict
  old_commit_version: reject_and_read_back
  wrong_consumer: reject_permission
  out_of_order_event: hold_pending
decision: protocol_boundary_intact
~~~

探针要把“消息层结果”和“业务层结果”分开记录：队列可以确认收到，业务状态却仍是 `pending`；权限拒绝也不是网络失败，不能自动重发。只有 envelope、版本、消费者和业务回读都对上，后续 Agent 才能消费提交回执。

![重复投递探针：相同 key、改 payload、旧版本和错消费者走不同边界](/images/notes/multi-agent-protocol-state/duplicate-delivery-card.svg)

### L5：为什么重复投递探针要覆盖“同 key 改 payload”？

同 key 不代表同意图。若调用方误把旧幂等键复用到另一份 payload，服务端应返回冲突而不是悄悄覆盖；这个分支能提前发现客户端重试封装和状态存储之间的契约漏洞。

## L5：为什么回执过期后要读回，而不是直接重试？

因为过期只说明这条消息不能再代表最新事实，不说明原操作没有发生。先读回可以区分已提交、未提交和未知三种状态；直接重试可能制造重复写入，尤其在外部系统已经成功但回执丢失时。

## L5：为什么状态机要把 `unknown` 保留下来？

因为删除未知状态会逼系统在“成功”和“失败”之间盲猜。保留 `unknown` 可以暂停后续副作用、启动对账或人工接管；等事实补齐后再迁移到 `committed` 或 `rejected`，而不是用一条错误的成功事件污染整条协作链。

## 事件回放不能直接重放命令

协议回放的目标是复现状态转移，不是把历史消息重新投递到真实工具。事件可以重放，命令必须先转成 dry-run 或经过新的幂等闸门；否则一次“排查”就可能再次发货、扣款或修改权限。实践中把 envelope 的 `kind` 明确分成 `event`、`command` 和 `receipt`，回放器只消费事件和回执，遇到命令就生成预期差异报告。

```yaml
replay_gate: rpg_1641cb
stream: contract-8842
events:
  - {seq: 41, kind: event, type: approval_granted}
  - {seq: 42, kind: command, type: update_contract_status}
  - {seq: 43, kind: receipt, type: status_committed}
rules:
  event: apply_to_shadow_state
  command: dry_run_and_require_idempotency
  receipt: verify_version_and_hash
  out_of_order: hold_pending
assertions:
  real_side_effects: 0
  final_shadow_version: 18
  unknown_states_preserved: true
decision: replay_safe
```

![多 Agent 回放闸门：事件进入影子状态，命令只做 dry-run，回执校验版本与哈希](/images/notes/multi-agent-protocol-state/event-replay-gate-card.svg)

### L5：为什么回放时不能把命令也当作事件处理？

命令表达“请做一件事”，事件表达“这件事已经发生”。把命令伪装成事件会绕过权限、幂等和当前状态检查；在旧协议或新策略下回放时尤其危险，必须保留两者语义并把副作用隔离。

## 租约和 fencing 让“旧消费者”不能提交新状态

多 Agent 协议里，重复消费者不一定是 bug：网络抖动、进程重启和队列再均衡都会让两个 worker 短暂认为自己拥有同一任务。只做 `lease_expire_at` 还不够，因为旧 worker 可能在租约过期前拿到一个很慢的工具结果，回来时新 worker 已经接管。提交状态时必须携带单调递增的 `fence_token`，状态 owner 只接受当前租约对应的 token。

这条规则把“谁最后写入”改成“谁持有最新租约谁能写入”。旧 worker 的结果仍可留在 trace 里用于诊断，但不能改变共享状态；新 worker 也不能只凭队列消息判断自己是 owner，而要先读回任务版本和租约。

```yaml
lease_fence: lf_edd9eb
task: deploy_agent_8842
owner: worker-b
lease_version: 19
fence_token: 19
submissions:
  - {worker: worker-a, fence_token: 18, result: success, commit: reject_stale_owner}
  - {worker: worker-b, fence_token: 19, result: success, commit: accept_if_version_18}
  - {worker: worker-c, fence_token: 20, result: success, commit: hold_until_lease_read}
assertions:
  stale_worker_cannot_mutate_state: true
  trace_keeps_rejected_result: true
  owner_read_before_commit: true
decision: single_current_owner
```

![多 Agent 租约 fencing：旧 worker 的结果可追踪但不能越过新租约提交状态](/images/notes/multi-agent-protocol-state/lease-fencing-card.svg)

### L5：为什么只比较消息时间戳不能解决旧消费者写入？

时间戳可能受机器时钟偏差、重放和乱序影响，无法稳定表达“谁拥有当前写权限”。fence token 由状态存储单调生成，提交时做原子比较；旧 token 即使消息更晚到达，也只能被拒绝并留下审计记录。

## 协议升级要有兼容窗口，不能让新旧 Agent 互相猜字段

多 Agent 系统经常先升级一个角色，再升级其他消费者。如果消息只靠自然语言或随意新增字段，新消费者可能把旧消息当新语义处理，旧消费者则可能静默丢掉关键状态。协议应显式带 schema 版本、能力声明和兼容窗口；未知字段可以保留但不能改变旧字段含义，破坏性变化要通过新事件类型或新 endpoint 发布。

发布前我会让同一条 fixture 同时经过旧消费者、新消费者和降级路径，检查 ACK、状态提交和审计事件是否一致。若新字段是高风险权限、金额或资源版本，旧消费者宁可拒绝并转人工，也不能忽略它继续写状态。这样升级失败会表现为明确的 incompatible，而不是几小时后的错乱回放。

~~~yaml
protocol_compatibility: pcompat_20260820_73
message: task.commit
producer: verifier@v4
consumers: [planner@v3, ledger@v4]
schema:
  current: 4
  supported: {planner@v3: [3], ledger@v4: [3, 4]}
  required_fields: [task_id, state_version, fence_token]
  new_fields: [evidence_digest]
compat_window: 14d
tests:
  old_consumer_unknown_field: ignore_and_audit
  old_consumer_missing_required: reject_incompatible
  new_consumer_old_message: default_only_non_risky
decision: rollout_with_v3_guard
~~~

![多 Agent 协议兼容卡：schema、能力声明和兼容窗口让升级失败显式可见](/images/notes/multi-agent-protocol-state/protocol-compatibility-card.svg)

### L5：为什么未知字段可以忽略，权限字段却不能？

普通展示字段不影响状态语义，旧消费者可以保留并审计；权限、金额、租户和资源版本会改变副作用边界，忽略它就可能产生越权或错误写入。高风险字段缺失或版本不兼容时，应拒绝提交并转人工。

## 聊透之后怎么收尾

我不会把多 Agent 设计成群聊，而会先定义角色的读写边界，再定义消息 envelope 和共享状态 owner。消息至少带任务 ID、发送者、接收者、意图、schema 版本、因果 ID、状态版本、产物引用、TTL 和幂等键。状态更新采用单写者或乐观锁，基于旧版本提交就返回冲突。命令和事件分开，回放只消费事件，带副作用的命令经过幂等与权限检查。通信故障要区分超时、重复、乱序和内容无效，分别重试、去重、拒绝旧版本或返工。

## 带走一张协议检查清单

- [ ] 每个角色是否有明确的读、写、工具和发布边界？
- [ ] 消息是否包含任务 ID、schema 版本、因果 ID 和幂等键？
- [ ] 产物是否通过引用和版本传递，而不是复制长文本？
- [ ] 共享状态是否有 owner、版本和提交点？
- [ ] 命令与事件是否分开，回放是否不会重复副作用？
- [ ] 超时、重复、乱序和内容无效是否分别处理？

## 相关笔记

- [一个 Agent 做不完，什么时候该拆成多个？](/notes/multi-agent-task-decomposition)
- [多 Agent 结论打架怎么办？监督者和仲裁器各管什么](/notes/multi-agent-supervisor-arbitrator)
- [Agent 上线后怎么定位问题？从 trace 到可观测性和回放](/notes/agent-observability-replay)
- [Code Agent 跑到一半挂了，怎样恢复又不重复执行？](/notes/code-agent-resume-exactly-once)

## 参考

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
