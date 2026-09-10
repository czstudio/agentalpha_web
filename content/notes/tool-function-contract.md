---
slug: "tool-function-contract"
title: "Function Calling 不是模型会调函数就完事：先把契约验清楚"
excerpt: "Function Calling 要把自然语言决策变成可校验的动作请求。Schema、解析、权限和执行回执缺一环，漂亮的 JSON 也可能直接变成线上事故。"
series: "工具调用"
seriesNo: "10"
number: "44"
minutes: 24
---

“帮我把这笔订单退了。”客服 Agent 返回了一段 JSON，看起来字段齐全，业务却不敢执行：金额是字符串，订单号来自用户上一句里的一段引用，退款原因还是模型自己补的。这时问题不是模型“不会 Function Calling”，而是系统把一段建议误当成了已经验证的命令。

## 先给一个能复述的答案

Function Calling 是一个动作协议，不是模型直接执行函数。模型只负责提出结构化调用；应用层负责选择工具、校验 schema、补充身份和权限、执行副作用，再把真实回执回填给模型。可靠链路至少有五步：定义契约 → 解析调用 → 参数验证 → 权限与幂等检查 → 执行并回写结果。任何一步失败，都应该返回可解释的错误或转人工，不能让模型自行“修一修再试”。

![Function Calling 从模型提议到工具回执的五段契约链路](/images/notes/tool-function-contract/contract-pipeline.svg)

图 1：模型产生的是候选动作，真正的执行权在应用层。

## 一、Schema 是给程序看的合同

工具描述不能只写“调用退款接口”。至少要说明参数类型、枚举范围、必填项、互斥关系和副作用。描述越像广告，执行层越难验证；写得像合同，错误才会在离开模型前暴露。

```json
{
  "name": "create_refund_request",
  "description": "创建退款申请，不会直接把款项退回用户",
  "parameters": {
    "type": "object",
    "additionalProperties": false,
    "required": ["order_id", "amount", "reason", "confirm_token"],
    "properties": {
      "order_id": {"type": "string", "pattern": "^ord_[a-z0-9]+$"},
      "amount": {"type": "number", "exclusiveMinimum": 0},
      "reason": {"type": "string", "enum": ["duplicate", "defect", "user_cancel"]},
      "confirm_token": {"type": "string", "minLength": 20}
    }
  }
}
```

`additionalProperties: false` 很实用。它会挡住模型随手添加的 `approved: true`、`operator: admin` 之类字段。金额还要和订单真实金额比对，Schema 只能证明它是数字，不能证明它属于这位用户。

### 把语义约束写成机器能执行的规则

有些限制放不进 JSON Schema，例如“退款金额不能超过可退余额”“只能操作当前登录用户的订单”。这类规则要进入 policy 层，而不是藏在 Prompt 里：

```python
def validate_refund(call, ctx, orders):
    order = orders.get(call["order_id"])
    if not order or order.user_id != ctx.user_id:
        return "order_not_accessible"
    if call["amount"] > order.refundable_amount:
        return "amount_exceeds_balance"
    if not ctx.has_scope("refund:create"):
        return "scope_denied"
    return None
```

## 二、三种东西不要混在一起：提议、命令、结果

模型消息里的 tool call 是“我建议做这件事”；应用层发出的 command 是“经过校验，现在允许做这件事”；工具返回的 result 是“外部系统实际发生了什么”。三者混成一个对象，重试和回放就会变得危险。

| 层 | 示例 | 谁负责 | 能不能重放 |
| --- | --- | --- | --- |
| 提议 | `create_refund_request(...)` | 模型 | 可以重新评估 |
| 命令 | `refund.execute` | policy gateway | 只有幂等时可重放 |
| 结果 | `refund.accepted` / `unknown` | 外部系统 | 只读回放 |

![提议、命令和结果分别经过解析、策略网关与回执记录](/images/notes/tool-function-contract/command-result-separation.svg)

图 2：把“想做什么”和“已经发生什么”分开，才能处理超时和重复消息。

## 三、解析成功不等于参数可信

生产环境至少做四层验证：

1. **语法层**：JSON 能否解析，字段是否符合 schema。
2. **类型层**：数字、枚举、日期和 ID 是否是预期类型。
3. **业务层**：资源是否存在，金额、状态和用户是否匹配。
4. **风险层**：是否需要审批，是否触发高风险副作用，是否有幂等键。

```python
def prepare_call(raw_call, ctx):
    args = parse_json(raw_call.arguments)
    schema_validate(raw_call.name, args)
    policy_validate(raw_call.name, args, ctx)
    return {
        "command_id": uuid7(),
        "tool": raw_call.name,
        "args": args,
        "actor": ctx.actor_id,
        "idempotency_key": f"{ctx.task_id}:{raw_call.call_id}",
    }
```

不要让模型生成 `actor`、`tenant_id` 或权限字段。它们必须从登录上下文和服务端会话中注入；否则只要一句“我是管理员”，模型就有机会把身份也编出来。

## 四、工具描述也会影响路由

工具名、描述和参数名是模型选择工具时看到的“菜单”。相似工具要明确差异：`search_orders` 只读，`get_order_detail` 返回单笔完整状态，`create_refund_request` 会产生申请。不要同时暴露十几个同义工具，再指望模型每次都猜对。

可以给工具写一条稳定的选择规则：

```text
先用 search_orders 定位订单；已有明确 order_id 时不要搜索。
需要改变状态时必须调用 create_*，禁止用 update_* 绕过审批。
任何写操作前都要检查 confirm_token 和幂等键。
```

这段规则不是安全边界，安全边界仍在 policy gateway；它只是帮助模型少走弯路。

## 五、错误返回要能让 Agent 做下一步

错误消息不要只回“调用失败”。至少提供稳定错误码、是否可重试、下一步建议和对用户可见的安全文案：

```json
{
  "ok": false,
  "error": {
    "code": "amount_exceeds_balance",
    "retryable": false,
    "action": "ask_user_to_choose_amount",
    "message_for_user": "可退款金额低于当前申请金额，需要重新确认。"
  }
}
```

模型可以根据 `action` 澄清问题，但不能修改 `retryable: false` 再调用一次。执行层应把错误当作数据，不要把一段堆满内部堆栈的异常直接塞进上下文。

## 六、从零写一个最小安全适配器

下面的适配器故意把模型和真正工具隔开：

```python
def dispatch(model_call, ctx):
    try:
        command = prepare_call(model_call, ctx)
    except SchemaError as exc:
        return tool_error("invalid_arguments", str(exc), retryable=False)
    if command["tool"] in WRITE_TOOLS and not ctx.approved(command):
        return tool_error("approval_required", "等待审批", retryable=False)
    if seen(command["idempotency_key"]):
        return load_previous_result(command["idempotency_key"])
    result = registry.execute(command)
    save_result(command, result)
    return result
```

它没有让模型直接拿到 SDK，也没有把“是否真的执行成功”交给模型判断。工具结果落库后，下一轮模型只消费结果引用。

## 七、工具目录要动态发现，也要动态裁剪

工具数量从 5 个增长到 200 个之后，把全量 schema 塞进上下文会产生两个问题：模型会在同名工具之间选错，敏感工具还会被无意暴露。更稳的做法是把工具注册表当成一个可查询的目录，先按任务语义召回候选，再经过租户、环境、风险和版本过滤。

```json
{
  "name": "crm.create_refund_request",
  "summary": "创建退款申请，不直接打款",
  "capabilities": ["refund", "order"],
  "risk": "write_review",
  "schema_version": "2.1",
  "requires": ["order.read", "refund.create"]
}
```

动态发现不等于每轮都让模型自由搜索。目录服务应该返回稳定的 shortlist，并记录为什么这个工具可见、哪些工具被裁掉。这样线上出现误路由时，能够区分“召回错了”“策略过滤错了”还是“模型选错了”。

![工具注册表经过语义召回、权限裁剪和版本协商后形成会话目录](/images/notes/tool-function-contract/tool-registry-routing.svg)

图 3：模型看到的是当前任务的最小工具目录，而不是整个平台的后门清单。

## 八、契约版本要支持协商和回放

工具 schema 变更时，不能只改一段描述然后期待模型自适应。建议把版本分成三类：增加可选字段属于兼容变更；删除字段、改变枚举语义或修改金额单位属于破坏性变更；新增能力则通过 capability negotiation 明确声明。

```python
def choose_contract(client_versions, server_versions):
    common = sorted(set(client_versions) & set(server_versions), reverse=True)
    if not common:
        raise ContractError("no_compatible_schema")
    return common[0]

def migrate_args(args, from_version, to_version):
    if from_version == "1.0" and to_version == "2.0":
        args["reason_code"] = args.pop("reason", "user_cancel")
    return args
```

每次 command 都要保存 `schema_version`、参数规范化后的快照和迁移路径。回放历史调用时使用原版本契约，不能拿今天的 schema 重新解释半年前的参数；否则审计看到的“原请求”和系统重放的“新请求”可能不是同一个动作。

## 契约迁移之后还要做一次“dry-run 差异回放”

迁移函数通过单元测试，不代表真实历史调用仍然得到同样的路由和拒绝结论。拿一批脱敏 trace 在旧、新契约上做 dry-run，只执行解析、schema、policy 和工具选择，不触发副作用；对比参数 hash、版本协商、拒绝原因和下游工具，任何不解释的变化都先暂停切换。

~~~json
{
  "contract_diff_receipt": "cdr_20260820_56",
  "replay_set": "tool-traces-v12",
  "from_version": "1.0",
  "to_version": "2.0",
  "side_effects": "disabled",
  "same_route": 0.96,
  "changed_cases": [
    {"call_id": "call-07", "change": "reason -> reason_code", "expected": true},
    {"call_id": "call-19", "change": "amount_unit", "expected": false}
  ],
  "decision": "hold_for_amount_unit_review"
}
~~~

dry-run 的价值是把“兼容”拆成可解释的差异：字段迁移可以预期，金额单位变化不能悄悄放行；工具路由变化也要说明是目录、权限还是模型选择导致。只有所有差异都有 owner 和处置动作，才切换默认契约。

![契约迁移差异回放：旧、新 schema 只做解析与策略比较，不触发真实副作用](/images/notes/tool-function-contract/contract-diff-replay-card.svg)

### L5：为什么 schema 迁移要做 dry-run，而不是直接线上灰度？

线上灰度仍可能触发真实写操作，出了差异再回滚已经太晚。dry-run 能在不产生副作用的前提下比较路由、参数和拒绝语义，先把真正的破坏性变化筛出来。

## 九、把拒绝样本纳入训练和评测

一个可靠的调用器不只要会生成正确 JSON，还要知道什么时候不应该调用。训练和评测数据至少分四类：

| 样本 | 期待行为 | 例子 |
| --- | --- | --- |
| valid | 生成可执行提议 | 订单号明确、金额在可退余额内 |
| incomplete | 先澄清 | 用户说“把那笔退了”，没有唯一订单 |
| denied | 解释拒绝原因 | 资源不属于当前用户、scope 不足 |
| repairable | 修正后再提议 | 日期格式错误、缺少必填字段 |

评测时要把“没有调用”作为一种正确答案。比如用户要求导出全部客户隐私，而当前会话只有聚合统计权限，Agent 应明确拒绝并提供安全替代方案，而不是调用一个返回脱敏数据的工具后假装完成。

## 十、一次调用要有可回放 trace

聊天记录适合看对话，不适合还原一次线上动作。建议为每个 call 写结构化 trace：

```json
{
  "trace_id": "tr_20260819_001",
  "call_id": "call_07",
  "proposal": {"tool": "crm.create_refund_request", "args_hash": "sha256:..."},
  "validation": ["schema_ok", "resource_ok", "approval_ok"],
  "command_id": "cmd_91",
  "dispatch": {"attempt": 1, "request_id": "req_42"},
  "outcome": "committed",
  "next": "write_receipt_to_thread"
}
```

Trace 让你能回答三个问题：模型当时提出了什么、应用层放行了什么、外部系统实际发生了什么。对同一 trace 做 dry-run 时，只执行 schema、policy 和路由，不触发真实副作用；这也是上线新模型前比较行为差异的安全方式。

## 十一、分层题库：从概念到系统设计

### L1：Function Calling 和普通 JSON 输出有什么区别？

Function Calling 把动作名称和参数放进一个可路由的协议里，应用层可以按工具注册表执行、校验和审计；普通 JSON 只是文本格式，不能天然表达工具权限、回执和副作用。

### L2：Schema 已经校验通过，为什么还不能直接执行？

Schema 只能证明格式和部分类型正确，不能证明资源属于当前用户、状态允许操作、金额合理或操作已经审批。还要经过业务、权限、风险和幂等检查。

### L3：如何防止模型伪造执行结果？

模型永远不写最终状态。执行结果由工具适配器从外部系统读取并签名记录，模型只能引用这份回执生成解释；没有回执就不能说“已完成”。

### L1：为什么工具 schema 要禁止未知字段？

未知字段可能是模型自行补出的身份、审批或金额标记。拒绝它们能让参数边界清楚，避免“看起来有用”的字段绕过服务端规则。

### L1：哪些字段绝不能让模型自己生成？

主体、租户、权限 scope、环境、审批状态和最终执行结果都应由服务端上下文注入或回执产生。模型最多提出业务参数。

### L1：工具错误为什么要返回稳定错误码？

稳定错误码可以驱动澄清、重试、换工具或转人工，避免模型从一段内部异常堆栈里猜下一步。

### L2：工具从 10 个变成 200 个，怎么避免选错？

先按任务语义召回候选，再按命名空间、权限、风险和版本裁剪，最后只把 shortlist 交给模型；同时保留路由理由，便于复盘。

### L2：schema 版本升级如何保证旧调用还能回放？

保存调用时的版本、规范化参数和迁移路径，历史回放使用原契约；破坏性变更要并行运行旧版本或明确拒绝迁移。

### L2：怎样评测 Agent 是否“知道不能调用”？

在题集中加入权限不足、资源不明、审批缺失和高风险越权样本，指标不只看合法调用成功率，还要看拒绝准确率和澄清质量。

### L2：为什么要把 proposal、command、result 分开存？

它们分别代表模型意图、策略放行和外部事实。分开后才能安全重试、审计差异，也不会把模型的一句建议误当成已完成。

### L3：如何设计一个支持多租户的工具注册表？

注册表保存全局能力和租户策略两层数据，请求时按主体、租户、环境、数据分类和 schema 版本生成短期会话目录，不能用前端隐藏代替服务端过滤。

### L3：工具回执丢失但外部操作可能成功，怎么设计？

用幂等键和 request_id 查询接口对账；在结果确认前保持 UNKNOWN，不生成已完成文案，也不允许无条件重放写操作。

### L3：怎样让新模型上线前不触发真实副作用？

对历史 trace 做 dry-run，只执行解析、schema、policy 和路由，比较新旧模型的工具选择、参数差异和拒绝率，最后再用沙箱契约测试。

## 契约变更要做“旧调用可回放、新调用可拒绝”的双回归

工具 schema 一旦升级，最容易漏掉的不是字段名，而是旧版本调用在新服务端上会不会被悄悄解释成另一种语义。我的做法是把每次契约变更做成一张 diff 卡：旧请求用旧 schema 回放，新请求走新 schema；对删除字段、枚举收窄、默认值变化和副作用字段逐项给出结果。兼容只代表能解析，不代表可以执行，写操作仍要重新通过当前权限和业务校验。

```yaml
contract_diff: cdf_20260820_12
tool: crm.create_refund_request
from: v3
to: v4
cases:
  old_valid_request: {parse: pass, policy: recheck, execute: sandbox_only}
  removed_field: {parse: reject, error_code: schema_removed}
  enum_narrowed: {parse: reject, error_code: enum_out_of_range}
  new_required_field: {parse: migrate_if_safe, otherwise: clarify}
  duplicate_idempotency_key: {parse: pass, execute: return_current_state}
gates:
  old_trace_replay: pass
  side_effect_in_live: blocked
  receipt_version: v4
decision: release_with_compat_window
```

![工具契约变更双回放卡：旧调用回放、新调用校验、写操作只进沙箱](/images/notes/tool-function-contract/contract-diff-replay-v2-card.svg)

### L5：为什么“schema diff 没有红线”仍不能直接发布？

diff 只说明结构变化，没有覆盖默认值、权限语义、幂等键和外部系统状态。发布前必须把历史 trace、边界参数和失败回执放进沙箱回放，并确认旧版本的拒绝原因没有被新版本改成误执行。

## 生产契约测试要覆盖“拒绝、部分成功和未知”

很多团队的工具测试只有一条 happy path：参数合法，接口返回 200，Agent 继续往下走。真正上线后更棘手的是三类灰区：服务端拒绝但已经产生部分副作用、网络超时导致结果未知、以及同一个参数在不同租户下含义不同。契约测试要把这三类状态写成可回放的 case，断言的不只是 HTTP code，还包括业务状态、幂等键和后续动作。

我会让适配器先把供应商错误归一成内部状态，再交给策略层决定 `retry`、`clarify`、`reconcile` 或 `stop`。例如创建退款单超时，不能直接重试；先拿 `request_id` 查当前状态，若已创建就返回原单号，若仍未知就挂起并通知人工。这样模型看到的是稳定的动作边界，而不是每家 API 各说各话。

```yaml
contract_probe: ctp_20260820_31
tool: billing.create_refund
cases:
  permission_denied: {provider: 403, internal: rejected, next: clarify}
  timeout_after_accept: {provider: unknown, internal: unknown, next: reconcile}
  partial_side_effect: {provider: 207, internal: partial, next: read_back}
  same_request_id: {provider: 200, internal: committed, next: return_existing}
assertions:
  model_never_sees_provider_stack: true
  unknown_never_auto_retried: true
  idempotency_key_preserved: true
  tenant_context_server_injected: true
release: sandbox_only_until_all_cases_pass
```

![工具契约探针：拒绝、超时、部分成功和幂等回读分别进入不同动作边界](/images/notes/tool-function-contract/contract-probe-state-card.svg)

### L5：为什么“接口返回 200”仍不能算工具调用成功？

200 只代表传输层接受了请求，业务对象可能仍在处理中，甚至只完成了一半。要把“已接受、已提交、已生效”拆开记录，并用业务回读和版本号确认最终事实；否则 Agent 会把排队中的动作说成已经完成。

## 契约回放还要检查“默认值漂移”

字段没删、类型没变，也不代表契约真的兼容。最隐蔽的回归往往来自默认值：旧客户端省略 `dry_run` 时，v3 默认是 `true`，v4 却改成了 `false`；schema diff 看起来很干净，真实调用却从预览变成了写入。于是我会把“字段缺失时的默认路径”单独列为回放维度，并把是否产生副作用作为硬断言。

```yaml
default_drift_probe: ddp_20260820_75
tool: crm.create_refund
cases:
  omitted_dry_run:
    v3: {resolved: true, side_effect: false}
    v4: {resolved: false, side_effect: true}
    decision: block_until_explicit
  omitted_currency:
    v3: {resolved: CNY, source: tenant_default}
    v4: {resolved: null, next: clarify}
assertions:
  defaults_logged: true
  side_effect_requires_explicit_opt_in: true
  old_trace_replay: required
```

![工具契约默认值漂移卡：缺省字段先解析差异，再决定是否允许副作用](/images/notes/tool-function-contract/default-drift-card.svg)

### L5：为什么只测显式传参仍然不够？

真实 Agent 会大量省略可选字段，默认值就是它实际调用的一部分。只测“字段都填满”的 happy path，会把默认路径的语义变化藏起来；应把缺省、null、空数组和旧客户端序列化方式都纳入回放。

## 工具契约要同时校验 schema、语义和副作用等级

JSON Schema 能检查类型，却不能说明 `delete` 是否幂等、`dry_run` 是否真的不写入、错误码是否可重试。工具注册时应该把结构契约与语义契约放在一起，并在 CI 里跑一组最小行为探针。

```yaml
tool_contract:
  contract: tfc_20260820_124
  name: archive_project
  input_schema_version: 4
  semantics:
    idempotent: true
    dry_run_is_read_only: true
    retryable_errors: [timeout, rate_limited]
    forbidden_errors: [permission_denied]
  probes:
    - malformed_input_rejected
    - dry_run_has_no_write
    - same_idempotency_key_one_effect
```

![工具契约三层校验：结构 schema、运行语义和副作用探针一起决定能否接入 Agent](/images/notes/tool-function-contract/tool-contract-probe-card.svg)

### L5：为什么“Schema 校验通过”仍不能把工具交给 Agent？

因为类型正确不代表行为安全。一个字段可以是合法字符串，却指向了错误租户；一个 `dry_run` 可以返回漂亮 JSON，却偷偷写入审计表。只有语义探针也通过，契约才算成立。

## 60 秒面试回答

我把 Function Calling 看成动作协议，而不是模型直接执行函数。模型提出候选调用，应用层先做 JSON Schema、业务规则、权限、审批和幂等检查，再由工具适配器执行副作用，并把真实回执回填。提议、命令、结果分开保存，错误带稳定错误码和是否可重试，身份、租户和权限从服务端上下文注入，不能由模型生成。这样即使模型参数格式正确，也不会绕过资源归属、状态和风险边界。

## 带走一张检查清单

- [ ] 工具是否有明确的 schema、必填项、枚举和副作用说明？
- [ ] 是否把提议、命令和真实结果分开？
- [ ] 是否有语法、类型、业务、权限和风险五层验证？
- [ ] 身份、租户、审批和幂等键是否由服务端注入？
- [ ] 错误码是否能指导下一步，而不是只返回一段异常文本？

## 相关笔记

- [工具调用失败后，Agent 应该重试、换工具还是停下来？](/notes/tool-retry-policy)
- [MCP 解决了什么问题？工具协议标准化之后仍有哪些坑](/notes/mcp-protocol-boundaries)
- [如何给工具调用做权限控制和审计？](/notes/tool-permission-audit)

## 参考

- [Agent 岗面试宝典 v3：工具调用章节（本地导入）](/content/imports/agent-interview-v3.feishu.md)
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)
