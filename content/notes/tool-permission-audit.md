---
slug: "tool-permission-audit"
title: "工具调用怎么做权限控制和审计？"
excerpt: "Agent 的主体、租户、资源、动作、审批、幂等、审计证据都要进同一条调用链，这样才说得清谁在什么条件下让系统干了什么。"
series: "工具调用"
seriesNo: "10"
number: "48"
minutes: 25
---

“让 Agent 自动处理退款”听起来像效率项目，上线后很快变成权限项目：它能看哪些订单？谁允许它退款？用户改口后原授权还算吗？执行超时重试会不会退两次？

如果这些问题只能靠 Prompt 里的“请谨慎操作”，那就不是权限控制，只是在赌模型今天心情不错。

## 把问题拆开之后

工具权限要围绕一次具体调用判断，而不是给 Agent 一个长期万能身份。调用上下文至少包含主体、租户、环境、资源、动作、参数摘要、风险级别和审批状态；policy gateway 按最小权限做 allow/deny，写操作绑定参数哈希和幂等键，高风险动作需要人工确认。所有决策、工具输入、外部回执和状态变化写入不可抵赖的审计记录，敏感字段脱敏但不能丢失追责所需的引用。

![工具调用的身份、策略、审批、执行和审计闭环](/images/notes/tool-permission-audit/permission-gateway.svg)

图 1：权限判断发生在工具真正执行之前，审计贯穿整个生命周期。

## 一、权限判断至少要有七个维度

| 维度 | 例子 | 常见错误 |
| --- | --- | --- |
| 主体 | 当前用户、服务账号、Agent 角色 | 只看 API key，不看最终用户 |
| 租户 | company_a / company_b | 多租户查询忘记加过滤 |
| 环境 | sandbox / staging / production | 测试 Agent 误连生产 |
| 资源 | order_42、repo/main | 只控制动作，不控制资源范围 |
| 动作 | read、create、approve、delete | 把所有写操作合成一个 scope |
| 参数 | 金额、分支、收件人 | 通过权限但参数已被改写 |
| 风险 | 只读、可逆写入、不可逆写入 | 高风险没有审批和冷静期 |

少一个维度，都可能出现“权限看起来正确，实际目标却错了”。尤其是参数：用户批准退款 100 元，不代表 Agent 后来把金额改成 1000 元也获了授权。

## 二、用短期能力票据替代万能 token

可以为一次任务签发短期、窄范围的 capability：

```json
{
  "capability_id": "cap_8f2",
  "subject": "user_17",
  "tenant": "acme",
  "environment": "production",
  "tool": "create_refund_request",
  "resources": ["order_42"],
  "actions": ["create"],
  "args_hash": "sha256:...",
  "expires_at": "2026-08-19T21:10:00Z",
  "approval": {"by": "manager_3", "at": "..."}
}
```

票据过期、资源不匹配、参数哈希变化或审批撤销时，policy gateway 拒绝调用。模型看不到可伪造的签名细节，执行层负责验证票据。

## 三、审批要绑定到“做什么”，不是绑定到“这个 Agent”

“允许退款 Agent 工作”过于宽泛。审批请求应展示具体资源、动作、影响和有效期：

```text
审批人：运营主管
动作：为 order_42 创建退款申请
金额：199 元
影响：不会直接打款，需要财务二次确认
有效期：10 分钟，仅允许一次
```

如果用户在审批后修改订单号或金额，审批应失效并重新确认。审批结果写入参数哈希，避免 UI 上看的是 A，服务端执行的是 B。

![审批绑定资源、动作和参数哈希，参数变化会回到待审批状态](/images/notes/tool-permission-audit/approval-binding.svg)

图 2：审批是对一次具体动作的确认，不是给 Agent 发永久通行证。

## 四、把幂等和权限放在同一个边界

权限通过并不代表可以无限重试。写操作要同时做：

1. 检查 capability 是否有效。
2. 检查幂等键是否已经有结果。
3. 锁定资源版本或状态条件。
4. 执行外部操作并记录 request_id。
5. 记录提交结果或未知状态。

```python
def guarded_execute(command, ctx):
    policy.require(ctx, command)
    if result := idem.load(command.idempotency_key):
        return result
    resource = read_resource(command.resource)
    assert resource.version == command.expected_version
    result = tool_registry.execute(command)
    audit.append(command, result=result, actor=ctx.subject)
    idem.save(command.idempotency_key, result)
    return result
```

资源版本检查可以挡住“审批后订单已被别人处理”的竞态。遇到版本冲突，回到澄清或重新审批，而不是强行覆盖。

## 五、审计日志要能还原一次调用

最小审计事件至少包含：

```json
{
  "event_id": "evt_901",
  "trace_id": "tr_77",
  "task_id": "task_42",
  "actor": {"user_id": "u_17", "agent_role": "support"},
  "tool": "create_refund_request",
  "resource": "order_42",
  "args_hash": "sha256:...",
  "policy": {"decision": "allow", "rule": "refund.create.v3"},
  "approval_id": "ap_8f2",
  "external_request_id": "req_71",
  "result": "committed",
  "timestamp": "2026-08-19T20:55:00Z"
}
```

日志不应直接保存信用卡号、完整 prompt 或用户隐私。可以保存脱敏摘要、哈希和 artifact 引用；真正需要复核时，在受控环境按引用读取原文。审计日志本身也要设置写权限和保留期限，不能让执行 Agent 自己删除“难看的记录”。

![审计记录把意图、策略、审批、外部 request 和结果串成一条证据链](/images/notes/tool-permission-audit/audit-trail.svg)

图 3：审计不是打印几行日志，而是能回答“谁在什么条件下让系统做了什么”。

## 六、面向 Agent 的安全防线

### 工具白名单

默认不暴露工具，按任务选择最小目录。开发环境和生产环境使用不同注册表，避免模型看到不该知道的能力。

### 参数归一化

统一金额单位、时间区、路径和 URL，再做策略判断。否则同一个资源可以用不同格式绕过规则。

### 输出脱敏

工具结果返回前按主体和字段做脱敏，模型不需要知道的密钥和隐私不要进入上下文。脱敏后仍保留“字段被隐藏”的标记，避免模型把空值当成没有数据。

### 人工接管

风险达到阈值、状态未知、策略冲突或重复失败时，生成带证据包的人工任务。转人工不是报错终点，而是下一条可追踪的状态。

## 七、把策略写成可解释的决策表

策略引擎不要只返回一个布尔值。至少返回命中的规则、缺失的条件、需要的审批和下一步动作，方便用户理解，也方便审计：

```json
{
  "decision": "deny",
  "rule": "refund.amount.limit.v3",
  "missing": ["finance.approval"],
  "obligations": ["mask_customer_phone", "create_human_task"],
  "expires_at": "2026-08-19T21:10:00Z"
}
```

策略结果要与参数规范化后的 hash 绑定。金额从 `199.00` 变成 `199` 可能是等价格式，但从人民币变成美元就必须产生新的 hash 和新的审批。策略引擎应在统一单位和时区之后再做判断。

![策略决定、审批义务与审计事件共同形成可解释的权限回执](/images/notes/tool-permission-audit/policy-decision-audit.svg)

图 4：allow/deny 只是结果，规则、义务和证据才让权限可复盘。

## 八、跨租户隔离要覆盖缓存和回执

多租户越权不只发生在 SQL。还要检查缓存 key、artifact 引用、异步队列、搜索索引、日志和错误消息。建议所有内部对象都携带不可变的 `tenant_id`，在边界层做二次断言：

```python
def assert_same_tenant(ctx, obj):
    if obj.tenant_id != ctx.tenant_id:
        raise PolicyDenied("cross_tenant_access")

cache_key = f"{ctx.tenant_id}:{tool}:{resource_id}:{version}"
```

异步任务恢复时不能只拿 `job_id`，还要重新加载租户、主体和 capability；否则一个可猜的任务 ID 可能成为跨租户读取入口。

## 九、审计日志要防篡改，也要能按权限查询

审计不是把所有 prompt 永久保存。更实用的做法是保存事件链、脱敏摘要、参数 hash、artifact 引用和保留期限，并限制谁能查询原文。高风险系统可以给相邻事件保存前一事件 hash，定期把批次摘要写入独立存储，发现链断裂就报警。

```text
policy_decision → approval → dispatch → external_receipt
       hash_i  ───────────────→ hash_(i+1)
```

审计查询本身也要留下记录：谁查看了哪条证据、出于什么工单、是否导出了原文。这样才能避免“为了追责而扩大泄露面”。

## 十、把权限事故变成可复盘的演练

每季度至少演练四类情况：审批后参数被改、用户权限被撤销、跨租户资源被请求、外部回执未知。演练不只看接口返回 403，还要看模型是否给出正确解释、人工任务是否带齐证据、审计能否还原前后状态。

复盘时按时间线回答：最初主体是谁？哪条规则放行？审批看到了什么？最终发送了哪些参数？外部系统回执是什么？如果任一问题只能靠人工猜，就说明审计链还不完整。

## 十一、分层题库：从最小权限到事故复盘

### L1：如何给 Agent 做最小权限？

按主体、租户、环境、资源、动作、参数和风险拆分权限，默认拒绝，只为当前任务签发短期、窄范围的 capability，不给 Agent 长期万能 token。

### L2：审批通过后参数被改了怎么办？

审批绑定资源、动作和参数哈希。参数、资源版本或环境变化时票据失效，重新进入待审批；执行层再次校验，不能信任 UI 状态。

### L3：审计日志应该记录什么？

记录 trace、主体、工具、资源、参数哈希、策略规则、审批、外部 request_id、结果和时间，敏感正文用脱敏值与 artifact 引用，保证可追溯而不过度暴露隐私。

### L1：默认拒绝和最小权限有什么区别？

默认拒绝是没有明确允许就不执行；最小权限是在允许后也只授予当前任务、资源和时间窗口所需的最小范围。

### L1：为什么审批不能只绑定工具名？

同一个工具可能操作不同资源、金额和环境。审批必须绑定规范化参数、资源版本、主体和有效期。

### L1：审计日志为什么不能只记 user_id？

还需要工具、资源、动作、参数 hash、策略、审批、外部 request_id 和结果，否则无法证明具体做了什么。

### L2：如何防止 capability 被重放？

设置短期过期、一次性 nonce、任务和资源绑定，执行后标记已使用；服务端仍要检查幂等键和资源版本。

### L2：参数归一化应该在授权前还是授权后？

先做规范化，再计算 hash 和策略判断。否则同一金额、时间或路径的不同写法可能得到不同权限结论。

### L2：权限撤销后，已经排队的任务怎么办？

worker 执行前重新加载主体和 capability，发现撤销就拒绝并生成审计事件；不能因为入队时允许就一路执行到底。

### L2：脱敏会不会影响审计追责？

审计保存脱敏值、hash 和受控 artifact 引用，授权的复核人员可按工单读取原文；既不把隐私扩散到日志，又保留证据链。

### L3：如何设计跨租户资源的防御纵深？

网关校验租户，服务端查询强制 tenant predicate，缓存和 artifact key 带租户，异步恢复重新校验 capability，日志与错误消息也不能泄露其他租户信息。

### L3：如何证明一次高风险操作确实经过人工审批？

保存审批人、时间、参数 hash、资源版本、审批策略和一次性 capability，并在执行回执中引用 approval_id；回放时重新核对 hash。

### L3：权限事故复盘的最小时间线是什么？

主体与会话、模型提议、规范化参数、policy 决定、审批、dispatch、外部 request、最终状态和人工处置，缺一项都可能无法定位责任边界。

## 高风险调用要有一张授权对账卡

审计不是把日志堆在一起，而是把“申请的能力”和“实际执行的能力”逐字段对账。一次写操作至少可以留下这张卡：

```yaml
operation_id: op-784
subject: agent/session-88
requested:
  action: invoice.refund
  resource: tenant=t-17/invoice=204
  params_hash: sha256:req...
approved:
  approval_id: ap-41
  policy: refund-under-500
  expires_at: 23:40Z
dispatched:
  request_id: provider-991
  resource_version: v12
result: committed
reconciled: true
```

如果 `requested`、`approved` 或 `dispatched` 任一字段发生变化，执行器就应当让票据失效并重新审批。对账卡还把未知结果和撤销事件放在同一条链上，复盘时不必从多套日志猜测“到底执行了什么”。

![高风险授权对账卡把申请、审批、派发、外部回执和最终状态串成一条链](/images/notes/tool-permission-audit/authorization-reconciliation-card.svg)

## 授权对账卡还要做一次撤销演练

权限系统最容易被忽略的是“已经发出去的能力怎么办”。每次高风险权限变更，都要用演练确认：撤销后排队任务是否停止、已发出的 capability 是否失效、外部系统的未知结果如何对账。演练结果和正式授权一样要落审计：

```yaml
revocation_drill: rd_ace896
capability: contract.write
grant_id: grant-8842
issued_to: agent-run-17
revoke_at: 2026-08-20T10:00:00Z
checks:
  queued_jobs: blocked
  in_flight_request: status_readback
  replayed_token: rejected
  external_unknown: manual_review
evidence:
  audit_events: [grant, dispatch, revoke, readback]
  owner: security-platform
decision: pass
```

演练不能只测试“接口返回 403”。还要检查缓存、队列、重试器和下游服务是否继续接受旧凭证；否则前门撤销了，后门仍可能把同一个副作用送出去。

![权限撤销演练卡把发放、撤销、排队、重放和未知结果的处理连成一条证据链](/images/notes/tool-permission-audit/revocation-drill-card.svg)

## 撤销演练之后还要做一次“票据重绑定探针”

撤销演练通过，只能说明旧票据失效；它还没有证明新发的票据不会被拿去操作另一份资源。用同一 capability 先提交原始参数，再替换 tenant、resource_version 或金额，确认参数哈希、资源版本和审批义务一起变化，任何一项不一致都重新走策略，而不是沿用旧的 allow。

~~~yaml
capability_rebind_probe: crp_55edc3
capability: contract.write
grant_id: grant-8842
baseline:
  tenant_id: team-alpha
  resource_version: v12
  args_hash: sha256:aa11...
  decision: allow
mutations:
  tenant_changed: deny
  version_changed: reapprove
  amount_changed: reapprove
decision: binding_intact
~~~

这类探针专门打 TOCTOU 缺口：授权时检查的是一组参数，执行时却可能换成另一组。票据必须绑定规范化后的参数摘要、资源版本和租户，执行器在派发前再做一次 compare-and-set；否则“权限已撤销”和“权限仍然有效”之间会多出一个危险窗口。

![票据重绑定探针：改租户、版本或参数后，旧授权不能直接复用](/images/notes/tool-permission-audit/capability-rebind-card.svg)

### L5：为什么 capability 不能只绑定工具名？

同一个工具名可以写不同租户、环境和资源版本。只绑定工具名，审批覆盖的具体动作就无法复核；绑定参数摘要和资源版本，才能在执行前发现 TOCTOU 或重放。

## 高频追问

### L5：为什么撤销成功也不能只看一个 403？

因为 403 只证明某次请求被拒绝，不证明队列、缓存和已在途请求都停止。撤销验收要覆盖能力发放后的每个副作用入口，并保留事件时间线；只有这样，权限变化才真的能阻断下一次危险动作。

### L5：为什么审计字段要包含“参数哈希”而不是只记工具名？

同一个工具名可以操作不同租户、金额和环境；只记工具名无法证明审批覆盖了哪一次具体动作。参数先规范化再做 hash，结合资源版本和 approval_id，才能判断执行是否仍在授权范围内。

## 授权审计还要做“同参数重放”和“改参数拒绝”

审计日志能查到一条成功记录，不代表授权真的绑定了这次调用。验证高风险工具时，至少做两次回放：完全相同的参数应该命中同一张 capability 票据；只改路径、金额、租户或目标资源，必须重新授权或被拒绝。这样才能发现“只绑定工具名、参数未参与签名”的漏洞。

```yaml
replay_probe:
  grant: grant_77
  tool: transfer_funds
  original: {amount: 100, currency: CNY, account: acct_a}
  same_payload: {expect: allow, ticket: grant_77}
  changed_payload: {amount: 1000, expect: deny, reason: parameter_hash_mismatch}
  changed_scope: {account: acct_b, expect: deny, reason: tenant_scope_mismatch}
  evidence: [canonical_args_hash, grant_id, policy_version, decision]
```

![授权票据的参数重放探针](/images/notes/tool-permission-audit/parameter-replay-card.svg)

参数归一化要发生在签名和授权之前，否则 `../`、大小写、编码或默认值差异都可能让同一资源出现两个表示。审计记录保留规范化后的参数哈希和原始请求摘要，既方便追责，也避免把完整敏感参数直接写入日志。

### L5：为什么只测一个 403 不够？

403 只能说明某一次请求被拒绝，不能证明票据无法重放，也不能证明队列里的旧任务、缓存里的旧授权和子进程里的旧环境都已经失效。要把同参数、改参数、改 scope、过期和撤销后的回放都纳入演练，并检查每一步的 decision reason。

## 撤销演练要覆盖“在途请求”和“已签发子能力”

权限撤销不是把一行数据库记录改成 `disabled` 就结束了。一个 Agent 可能已经把 capability 票据交给工具适配器，适配器又为子任务签发了更窄的子能力；如果撤销只通知主进程，队列中的在途请求和子进程仍可能继续写入。演练时要建立一条时间线：发放、派发、撤销、到达执行器、回执，并对每个副作用入口断言最终 decision。

我会给高风险能力设置 revocation epoch。执行器每次提交都带上签发时的 epoch，若当前 epoch 已前进，哪怕票据未到期也必须拒绝；对已经发生的外部动作则进入对账或补偿流程，不能用撤销事件伪造“动作没有发生”。

```yaml
revocation_drill: rd_360ee5
capability: crm.update_customer
issued_epoch: 41
timeline:
  - {t: 0, event: grant, epoch: 41}
  - {t: 2, event: child_capability, scope: note.write}
  - {t: 3, event: revoke, current_epoch: 42}
  - {t: 4, event: inflight_submit, ticket_epoch: 41, expect: deny_stale_epoch}
  - {t: 5, event: queued_retry, ticket_epoch: 41, expect: deny_and_drop}
assertions:
  child_capability_revoked: true
  cache_epoch_rechecked: true
  external_side_effects_after_revoke: 0
  prior_side_effects_reconciled: true
```

![权限撤销演练：主票据、子能力、队列重试和缓存都用 revocation epoch 复核](/images/notes/tool-permission-audit/revocation-epoch-drill-card.svg)

### L5：为什么票据没过期，撤销后也必须拒绝？

过期时间解决的是自然失效，撤销解决的是风险状态已经改变。只看 TTL 会留下一个可利用窗口；revocation epoch 让执行器能在不等待 TTL 的情况下立即阻断旧能力。

## 撤销之后还要核对“已完成动作”和“未完成意图”

阻断旧票据只能保证后续提交不再执行，不能把撤销前已经成功的动作抹掉。一次完整的撤销回放要把请求分成三类：已提交且有外部回执、已到执行器但状态未知、只在队列里尚未提交。前两类进入对账或补偿，最后一类才可以安全丢弃；所有类别都要关联原始 `request_id`，避免人工复核时把未执行误报成已完成。

```yaml
revocation_reconciliation: rrc_29d003
capability: crm.update_customer
request_id: req-8842
states:
  committed: {external_receipt: r-991, action: reconcile_only}
  unknown_at_executor: {action: read_back_before_retry}
  queued_unsubmitted: {action: drop_and_audit}
assertions:
  no_new_side_effect_after_revoke: true
  committed_action_not_erased: true
  unknown_never_auto_retried: true
decision: close_after_reconciliation
```

![权限撤销对账卡：区分已提交、执行器未知和未提交队列，分别处理后续动作](/images/notes/tool-permission-audit/revocation-reconciliation-card.svg)

### L5：为什么撤销成功后还不能直接清空队列？

队列里可能混着已经发到执行器但尚未回执的请求，直接清空会丢失对账线索。先按提交状态分类，已发生的外部动作做回读，真正未提交的意图才允许丢弃并留下审计记录。

## 聊透之后怎么收尾

Agent 权限要落在每一次具体工具调用上，而不是给它一个万能身份。我会把主体、租户、环境、资源、动作、参数摘要和风险放进调用上下文，由 policy gateway 默认拒绝并签发短期 capability。写操作绑定参数哈希、资源版本和幂等键，高风险动作需要一次性人工审批。执行前后记录策略决定、审批、外部 request_id、回执和状态变化，敏感内容脱敏但保留引用。未知结果、参数变化或版本冲突都转人工或重新审批，不能靠 Prompt 自我约束。

## 带走一张检查清单

- [ ] 权限是否同时控制主体、租户、环境、资源、动作和参数？
- [ ] 是否按任务签发短期、窄范围 capability？
- [ ] 审批是否绑定参数哈希和资源版本？
- [ ] 写操作是否有幂等、对账和人工接管？
- [ ] 审计是否能还原一次调用，又避免泄露敏感正文？

## 相关笔记

- [Agent 安全不是加一句提示词：权限、工具和数据边界怎么设计](/notes/agent-security-boundaries)
- [工具调用失败后，Agent 该重试、换工具还是停下？](/notes/tool-retry-policy)
- [同一个 Agent 实验，怎样才能复现？](/notes/agent-eval-reproducibility)

## 参考

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
