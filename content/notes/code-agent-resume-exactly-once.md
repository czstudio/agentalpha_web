---
slug: "code-agent-resume-exactly-once"
title: "Code Agent 跑到一半挂了，怎样恢复又不重复执行？"
excerpt: "恢复不是把聊天记录从头再播一遍，得靠持久化状态、操作幂等键，再加上对未知结果的对账，把重复副作用挡在外面。"
series: "Code Agent"
seriesNo: "02"
number: "08"
minutes: 11
---

Code Agent 接到一个看似普通的任务：升级依赖、跑迁移、创建 Pull Request，再通知团队。看起来是四步，真正恢复时每一步都可能已经发生。

它已经把数据库迁移提交成功，调用 GitHub API 创建 PR 时网络超时。Agent 进程重启，看到最后一条日志是“正在创建 PR”，于是又发了一次请求。结果仓库里多了两个 PR，迁移脚本却不能再跑第二遍。

👔 面试官

你的 Agent 跑到一半崩了。重启后如何从上次位置继续，而且每个外部动作只发生一次？

🙋‍♂️ 常见回答

把消息和工具调用写到数据库，恢复时从最后一条开始重放；给每一步加重试，失败就再试。

👔 面试官

如果请求已经被服务端接受，只是响应丢了呢？如果数据库写成功、checkpoint 还没写呢？如果两个 worker 同时恢复？你说的“最后一条”究竟是模型想做，还是外部世界已经做完？

这道题的坑在“exactly once”四个字。工作流引擎可以把自己的状态持久化，也可以保证某些内部状态转换只处理一次；但跨出进程之后，网络、支付接口、Git 服务和数据库各自有失败边界。你不能用一个本地布尔值，替整个分布式系统承诺绝对一次。

先把结论说清楚：Code Agent 要做到可靠恢复，目标应拆成三层——决策状态可恢复、工具调用可重试、外部副作用具有幂等或可对账的语义。只有三层合起来，用户才会感受到“恢复后没有重复执行”。

## 直觉：每一步都要有“收据”，而不是一段聊天记录

聊天记录只能告诉你模型说过“我要创建 PR”，不能证明 PR 已经创建。可靠恢复更像出差报销：计划单是意图，刷卡回执是事实，银行对账是最终确认。重启时不能只看计划单，要先找收据；没有收据，也不能直接当作没发生过。

因此每个工具动作至少要有一个稳定的 operation id。它来自业务意图，而不是每次重试随机生成。例如 `repo:obsidian_hub:upgrade:2026-08-14` 可以标识一次升级任务，`step:create-pr` 标识其中一个步骤。只要是同一个意图，重试就复用同一个 idempotency key；如果用户真的发起了第二次升级，再生成新的 workflow id。

这也解释了为什么“从最后一个 token 接着生成”不可靠。模型在恢复时可能采样出不同的工具参数，或者上下文里已经混入了工具返回值。我们要恢复的是结构化工作流状态和工具结果，不是让模型重新猜一次过去发生了什么。

## 原理一：把 Agent loop 写成持久化状态机

不要把整个循环藏在一个长函数里。把它拆成可命名的状态，例如：

```
PLANNED
  -> RUNNING(step_id, attempt, operation_id)
  -> SUCCEEDED(result_ref)
  -> FAILED(retryable | permanent)
  -> UNKNOWN(reconcile_required)
```

状态记录至少包含 workflow_id、step_id、输入摘要、策略版本、attempt、operation_id、开始时间、完成时间和结果引用。大文本、日志和补丁放对象存储，状态表只保存哈希和位置，避免恢复时把整段日志重新塞回模型。

状态转换要带版本号或 compare-and-set 条件。两个 worker 同时拿到 `RUNNING` 时，只有持有当前 lease/fencing token 的那个可以提交结果；旧 worker 即使恢复，也不能覆盖新状态。锁不是万能的，关键是让“谁有资格写入下一状态”可以被服务端验证。

![恢复状态机：从未知结果进入查询、确认、重试或人工介入](/images/notes/code-agent-resume-exactly-once/state-machine.svg)

## 原理二：checkpoint 必须和事实的边界对应

常见错误是把 checkpoint 放在工具调用前或调用后，却没考虑进程可能死在两者之间。

如果先写“已完成”，再调用外部 API，进程在写完 checkpoint 后崩溃，恢复时会跳过真正没做的动作。如果先调用 API，再写“已完成”，外部动作成功后进程崩溃，恢复时又会重复调用。这个窗口无法靠调整两行代码消失，因为外部 API 和本地数据库通常不是一个事务。

所以步骤要记录三种结果：已知成功、已知失败、结果未知。超时、连接断开、worker 被杀，通常只能判成 UNKNOWN，而不是 FAILED。恢复逻辑先调用查询或对账接口，按 operation_id 找到外部事实；找到已成功的资源，就补写本地 checkpoint；确认没有执行，再安全重试；查询也不可用，则进入人工或延迟重试队列。

这听起来比“失败就重试”麻烦，但它把最危险的模糊状态摆到了台面上。支付、发邮件、创建云资源、合并代码，都需要这个分支。

## 原理三：幂等键是重试契约，不是日志字段

幂等的意思不是“请求只到达一次”，而是同一意图重复到达，最终可观察结果与执行一次等价。服务端需要保存 key 与请求参数、状态和结果的关系，并在重复请求时返回原结果或当前状态。参数和 key 不一致时应报错，防止调用者误把同一个 key 当成另一个意图。

Stripe 的官方 API 文档给了一个清晰例子：客户端用 `Idempotency-Key`，服务端保存第一次请求的状态码和响应体，网络错误后可以安全重试；如果同一个 key 搭配不同参数，服务端拒绝这种复用。AWS Builders’ Library 则把同样的思路称为 client request identifier，并强调记录幂等 token 与实际资源创建需要具备原子、一致、隔离、持久（ACID）的关系。

如果下游没有幂等接口，Agent 不能凭空制造 exactly-once。可以加一层命令表或 outbox：先在自己的数据库里以 operation_id 唯一落单，再由一个发送器投递；发送器重试时仍带同一个 id。下游若支持查询，就用 id 对账；若只支持“创建且不返回可查询标识”，要么改造接口，要么把这类动作列为人工确认，不能用一句“最多重试三次”糊过去。

## 原理四：把模型决策和副作用执行分开

模型可以提出计划，不能直接拥有不可逆副作用。一个稳妥的循环是：模型生成结构化 action；策略层校验参数和权限；执行器把 action 绑定 operation_id；工具服务执行并记录结果；状态机提交下一步。恢复时复用已落盘的 action 和 operation_id，不让模型重新生成已执行步骤。

对于代码修改，尽量先生成补丁并保存哈希，再由工作区执行器应用补丁。对于发布、扣款、删资源，要求明确的确认状态和可查询的资源标识。对“发送通知”这类不可回滚操作，可以先写 outbox，再由发送器按 key 去重；必要时把消息内容哈希也纳入去重键，避免同一个 id 被错误复用。

![副作用边界：action、outbox、执行器和对账回执](/images/notes/code-agent-resume-exactly-once/receipt-boundary.svg)

### 先问“能不能查到事实”，再决定是否重试

恢复策略可以压缩成一张决策表：

| 当前记录 | 能查到的外部事实 | 下一步 | 是否允许模型重新规划 |
| --- | --- | --- | --- |
| `UNKNOWN` | 已创建/已发送 | 补写 checkpoint，返回原结果 | 否 |
| `UNKNOWN` | 明确未执行 | 复用同一 `operation_id` 安全重试 | 否 |
| `UNKNOWN` | 查询接口超时 | 延迟重试查询，必要时人工确认 | 否 |
| `UNKNOWN` | 下游返回参数错误 | 标记永久失败，修正 action 后新开 step | 是，但必须记录原因 |

关键是“重试工具”和“重新生成决策”分开。只要原 action 还有效，就冻结它；只有证据证明原计划不再成立时，才让模型重新规划，并生成新的版本和审计事件。

## 工程故障：恢复系统最容易在哪些地方翻车

### 故障一：响应丢了，资源却已经创建

Agent 调用云 API，服务端返回 200 的路上连接断开。客户端看到 timeout，自动重试。没有 client token 时，云端可能创建第二个实例；有 token 但 token 保存周期太短，过期后仍可能重复。排查要先问下游的幂等窗口、参数校验和查询接口，而不是先调大 timeout。

### 故障二：本地状态提交成功，外部副作用没发生

有的实现为了“避免重复”先把步骤标为 done，再异步发请求。worker 在两者之间崩溃，恢复会永久跳过动作。状态只能在收到可验证结果后进入 SUCCEEDED；异步发送应使用 outbox 或明确的 SENT/ACK 状态，不要把“已计划”写成“已完成”。

### 故障三：重试把模型推理也重跑了

工具失败后，系统把整段 prompt 重新交给模型。模型这次生成了不同的命令，甚至改变了目标分支。推理是非确定的，重试工具和重试决策不是一回事。已批准的 action 应冻结；只有在状态明确允许重新规划时，才启动新的模型回合，并记录原因和版本。

### 故障四：两个恢复 worker 同时执行

队列重复投递、租约过期或网络分区都可能让两个 worker 认为自己拥有任务。没有 fencing token 时，旧 worker 可能在新 worker 完成后又写回旧结果。要让状态存储拒绝过期 token，并让外部调用带上可识别的 operation_id；只在应用层“加锁”而不验证写入者，锁一丢就回到重复执行。

### 故障五：代码版本变了，旧工作流无法重放

昨天的 Agent 计划调用 `create_pr`，今天工具 schema 改成 `open_pull_request`。如果恢复依赖当前代码重新解释旧事件，可能生成不同副作用。持久化 action schema 和策略版本，支持向后兼容；不能兼容时，把工作流迁移到人工复核，而不是静默重跑。

### 故障六：把“任务完成”误当成“世界一致”

本地状态写成 SUCCEEDED，并不代表 GitHub、数据库、支付平台和通知系统都一致。外部系统可能最终一致，也可能在之后回滚。关键步骤要有 reconciliation job，定期用 operation_id 查询外部事实，把本地状态修正为 CONFIRMED、DRIFTED 或 NEEDS_REVIEW。

## 排查与方案：一张表先把承诺说人话

面试现场可以先列这张表，再讨论框架：

| 场景 | 能确认的事实 | 恢复动作 | 对外承诺 |
| --- | --- | --- | --- |
| 收到成功响应且已落盘 | 副作用成功 | 直接进入下一步 | 不重复调用 |
| 收到明确业务失败 | 副作用未生效或已拒绝 | 按错误类型重试/终止 | 不把永久失败当瞬时失败 |
| 网络超时、进程被杀 | 结果未知 | 用 operation_id 查询或对账 | 不盲目重试 |
| 没有幂等键、也不能查询 | 无法证明是否执行 | 暂停并人工确认 | 不宣称 exactly-once |
| 两个 worker 竞争 | 只有一个 fencing token 有效 | 拒绝过期写入 | 单写者状态提交 |

实现上可以按下面的顺序落地：

1. 给每个 workflow 和 step 分配稳定 id；把 action、参数摘要、版本和状态写入持久化存储。
2. 在执行前创建唯一 operation 记录，数据库唯一约束保证同一意图不能同时插入两次。
3. 调用下游时传入同一个幂等键；保存响应、资源标识和可查询链接。
4. 只把明确成功或明确失败提交为终态；timeout、取消、worker 崩溃统一进入 UNKNOWN。
5. 为 UNKNOWN 写 reconciliation 任务，先查事实，再决定补 checkpoint、重试还是人工介入。
6. 对每次恢复记录 workflow_id、step_id、attempt、operation_id、worker 版本和策略版本，能从日志重建时间线。

伪代码可以很短，但边界要完整：

```
op = store.claim_or_get(workflow_id, step_id, action_hash)
if op.status == "SUCCEEDED":
    return op.result
if op.status == "UNKNOWN":
    fact = downstream.lookup(op.operation_id)
    if fact.found:
        return store.confirm(op, fact)

result = downstream.execute(
    action=op.action,
    idempotency_key=op.operation_id,
)
return store.commit_result(op, result)
```

这里最重要的不是 `try/except`，而是 `lookup` 和 `commit_result` 都围绕同一个 operation_id 工作。`commit_result` 还要检查 fencing token，避免旧 worker 覆盖新状态。

## 恢复前还要做一次“worker 所有权租约”检查

即使 operation_id 已经幂等，两个 worker 仍可能同时拿到 UNKNOWN 任务：一个在网络分区前拿到旧租约，另一个在租约过期后接管。恢复流程要给每次接管发短租约和递增 fencing token；状态存储只接受最新 token，旧 worker 即使晚到，也只能读到“已被接管”，不能继续提交 checkpoint 或补偿动作。

~~~yaml
resume_lease_receipt: rlr_8d9795
operation_id: op-refund-8848
lease_id: lease-71
owner: worker-2
fencing_token: 19
previous_token: 18
expiry: 2026-08-20T19:03:00Z
decision: resume_with_token_19
~~~

租约不是把分布式锁重新包装一层，而是把“谁有资格写”变成可验证的事实。每次状态提交都带 token，存储端用 compare-and-set 拒绝过期写入；如果下游也支持 token，就把同一份所有权继续传到副作用边界。回执只保留 operation_id、租约和 token，不记录支付账号、密钥等敏感参数。

![恢复租约与 fencing token：接管前先确认唯一写入者](/images/notes/code-agent-resume-exactly-once/resume-lease-card.svg)

### L5：为什么有幂等键，还要 fencing token？

幂等键解决“同一意图重复到达”的结果合并，fencing token 解决“旧 worker 仍在写”的所有权问题。两者缺一不可：前者不阻止旧持有者覆盖状态，后者也不能替代下游对同一 operation 的去重。

## “Exactly once”到底该怎么回答

严格说，端到端 exactly-once 不是一个可以随便贴在 Agent 上的标签。AWS Step Functions 的官方文档区分了 Standard workflow 的 exactly-once 状态执行、Express workflow 的 at-least-once，以及同步执行的 at-most-once；即便编排器内部有更强保证，外部 API 仍要靠幂等契约和对账。Azure Durable Functions 的官方说明也把持久化状态、checkpoint、重试和恢复交给运行时，同时提醒活动函数要尽量设计成幂等，关键副作用不能假设自动回滚。

所以我的工程承诺通常写成：

“决策和状态转换可持久恢复；工具调用允许重试；每个可变外部动作必须提供幂等键或可查询的对账路径；无法证明结果时进入 UNKNOWN，不自动重复执行。”

这比一句“我们保证 exactly-once”更诚实，也更容易测。测试重点不只是把 worker 杀掉一次，而是把故障注入在外部调用前、服务端提交后、响应返回前、checkpoint 提交前后，并验证最终资源数量、状态和审计记录。

## 近年的官方工程资料，面试前值得读什么

1. Temporal Docs (https://docs.temporal.io/)  与 Building Reliable Applications with Durable Execution (https://assets.temporal.io/durable-execution.pdf) ：理解持久执行、事件历史、活动重试和“崩溃后从状态继续”的边界。
2. AWS Builders’ Library：Making retries safe with idempotent APIs (https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) ：重点看 client request identifier、参数不一致处理和幂等记录与资源创建的原子性。
3. Stripe Idempotent requests (https://docs.stripe.com/api/idempotent_requests) ：看一个真实 API 如何保存第一次结果、复用 key、拒绝同 key 的不同参数。
4. AWS Step Functions workflow types (https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html) ：区分 Standard、Express 的执行语义，不要把“工作流 exactly-once”泛化成“世界 exactly-once”。
5. Azure Durable Functions overview (https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview)  与 错误处理和重试 (https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-error-handling) ：了解 checkpoint、重试和活动幂等之间如何配合。

读资料时建议做一个小实验：让工具在“服务端成功、客户端断线”的窗口故意返回 timeout，然后重启 worker。没有 operation_id 时记录会出现什么？有 operation_id 但查询接口缺失时，系统会不会错误重试？这两个答案比背术语更能说明你真的理解恢复。

## 恢复时要区分“事实已发生”和“本地没收到回执”

Exactly-once 最容易被误解成“代码只执行一次”。现实里更常见的是请求已经到达外部系统，但 Agent 在等待响应时崩了。恢复 worker 不能凭空重发，也不能因为本地没有结果就宣称失败；它要先用幂等键或查询接口确认外部事实，再决定补记、重试还是人工介入。

```yaml
recovery_probe:
  task_id: task_42
  operation: create_invoice
  idempotency_key: task_42:create_invoice:v3
  local_state: awaiting_receipt
  probe: query_by_idempotency_key
  outcomes:
    found: {action: attach_receipt, next: checkpoint}
    not_found: {action: retry_once, guard: same_key}
    ambiguous: {action: pause, next: human_review}
  invariant: "不得用新 key 绕过未知状态"
```

![恢复探针与幂等边界](/images/notes/code-agent-resume-exactly-once/recovery-probe-card.svg)

这也是为什么恢复系统要把“查询事实”作为一等工具，而不是只提供一个 retry 按钮。对于不可查询的外部副作用，要把状态标成 ambiguous，并保留人工核对入口；宁可慢一点，也不要用重复创建换取表面上的自动化。

### L5：为什么“查不到”不等于“没发生”？

可能是索引延迟、权限变化、读写分区或第三方接口暂时不可用。面试时可以说，恢复策略要给 probe 设超时和重试预算，并把 unknown 独立计数；只有在外部系统明确返回不存在，且幂等窗口仍有效时，才允许再次提交。

## checkpoint schema 变化时，恢复也要先做兼容性检查

恢复不是把旧 JSON 反序列化出来就继续跑。Agent loop 的状态结构会随版本变化：旧 checkpoint 可能没有新字段，工具参数可能改名，状态枚举也可能从 `SENT` 拆成 `DISPATCHED` 和 `AWAITING_RECEIPT`。如果直接让新版本接管，最危险的不是启动失败，而是把旧状态误读成可重试状态。

我会给每个 checkpoint 保存 schema 版本、迁移脚本版本和当时的工具契约摘要。恢复前先做只读 migration preview，列出新增默认值、枚举映射和无法迁移的字段；只有旧状态被明确映射，且回放不变量通过，才允许 worker 获取新的 fencing token。无法证明语义等价时，进入人工复核，而不是让模型“猜这个字段大概是什么意思”。

~~~yaml
checkpoint_compatibility: cpc_9278d5
checkpoint: wf-8848-step-17
stored_schema: agent-state-v3
runtime_schema: agent-state-v4
tool_contract: refund.create@v5
migration:
  script: state-migrate-v2
  preview: pass
  enum_map: {SENT: AWAITING_RECEIPT}
  default_fields: [owner_epoch]
  unresolved: []
replay:
  same_idempotency_key: true
  side_effect_probe: no_new_effect
  invariants: [state_monotonic, owner_fenced]
decision: resumable
~~~

![Checkpoint 兼容卡：schema、工具契约和迁移预览通过后，恢复 worker 才能接管](/images/notes/code-agent-resume-exactly-once/checkpoint-compatibility-card.svg)

### L5：为什么恢复时不能让模型自己补齐缺失字段？

因为缺失字段可能影响幂等、权限和副作用阶段，模型补的默认值不具备可证明的业务语义。恢复需要版本化迁移和只读预览；无法确定的字段应阻断自动执行并交给人工对账。

## 回到面试：怎么聊这个话题

我不会承诺把 Code Agent 的所有外部动作做成绝对 exactly-once。首先把 Agent loop 拆成持久化状态机，保存 workflow、step、action、版本和 operation_id；恢复时重放结构化状态，不让模型重新猜已经执行过的命令。

每个有副作用的工具调用都使用稳定幂等键。明确成功或失败才进入终态；网络超时、进程崩溃这类结果不确定的情况进入 UNKNOWN，先用 operation_id 查询或对账，再决定补 checkpoint、重试还是人工处理。状态提交需要 compare-and-set 或 fencing token，防止两个 worker 同时恢复。

对没有幂等接口、也没有查询能力的动作，我会暂停并暴露不确定性，而不是盲目重试。最终承诺是“状态可恢复、调用可安全重试、未知结果可对账”，而不是用一句 exactly-once 掩盖分布式系统的失败窗口。

这段回答听起来没有“一个框架解决一切”那么爽，但它能继续回答追问：key 存在哪、窗口怎么查、两个 worker 谁能写、工具版本变更怎么办。面试官通常就等这些细节。

## AgentAlpha 大模型 Agent 训练营

AgentAlpha 的路线从 RAG、记忆系统、单 Agent、多 Agent、DeepSearch、高效推理，推进到第 7 阶段的 Code Agent，再继续做自进化编码、Agentic RL 和综合项目。

Code Agent 阶段已经确认的内容包括 SWE-agent、RepoMaster 和仓库级代码理解；阶段交付是在真实仓库里完成 issue 修复或仓库复用实验。课程按周任务、作业检查、代码 Review 和项目验收推进，完成项目后再继续打磨 README、运行说明、简历项目段落和面试讲法。

[查看 AgentAlpha 大模型 Agent 训练营](https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb)
