---
slug: "agent-handoff-contract"
title: "多智能体交接不是把聊天记录转发过去：先把合同写清楚"
excerpt: "多智能体最容易出错的不是角色少，而是交接没说清。把任务、状态、证据、权限、幂等键和确认方式写下来，出了问题才知道谁接手、做到哪一步。"
series: "多智能体"
seriesNo: "07"
number: "64"
minutes: 23
---

“让一个 Agent 把任务交给另一个 Agent”听起来像一次消息转发，上线后却更像一次跨服务事务：接收方可能不认识发送方，任务可能已经执行过，附件可能过期，回复可能丢在网络里。没有合同的 handoff，只是把不确定性从一个循环搬到另一个循环。

## 先给一个能复述的答案

多智能体交接要把“为什么交、交什么、谁能做、做到哪一步、如何确认、失败怎么回退”写成版本化合同。发送方提交一个带有 `task_id`、`handoff_id`、目标、约束、证据引用、权限范围和幂等键的 envelope；接收方先校验能力、版本和预算，再返回 `accepted / rejected / unknown` 等明确状态。只有收到可验证的 `committed` 回执，发送方才可以把自己的状态推进到下一步。

![一次可追踪的多智能体交接路径](/images/notes/agent-handoff-contract/handoff-contract.svg)

## 先区分四种“交接”

| 类型 | 真实含义 | 需要确认什么 |
| --- | --- | --- |
| 委派 | 接收方负责完成一个子任务 | 输入、输出和完成定义 |
| 咨询 | 接收方只提供建议，不产生副作用 | 建议是否被采纳 |
| 接管 | 原 Agent 暂停，另一个 Agent 接过主状态 | 谁拥有后续写权限 |
| 升级 | 风险或能力超出当前 Agent，转人工或更高权限服务 | 升级原因和回退路径 |

如果这四类都叫 `handoff`，日志里就分不清“建议没采纳”和“任务已经换了负责人”。建议在协议层明确 `mode`，在指标层分别计算接受率、提交率和升级率。

## Handoff envelope 应该包含什么

一份可审计的 envelope 至少要回答六个问题：

| 字段 | 作用 | 缺失时的风险 |
| --- | --- | --- |
| `task_id` | 贯穿整条任务的业务标识 | 无法串联上下文 |
| `handoff_id` | 本次交接的唯一尝试 | 重试造成重复执行 |
| `parent_state` | 交接前已经确认的状态 | 接收方从猜测开始 |
| `objective` | 子任务完成标准 | “给建议”没有验收 |
| `evidence_refs` | 证据或数据的位置、版本 | 读到过期材料 |
| `capabilities` | 接收方允许使用的能力 | 越权调用工具 |
| `deadline` | 预算、超时、最大调用次数 | 交接形成无限链 |
| `reply_contract` | 返回结构、状态和错误类型 | 每个 Agent 自说自话 |

### 一个最小协议

```json
{
  "protocol": "aa-handoff/v1",
  "mode": "delegate",
  "task_id": "support-20260822-018",
  "handoff_id": "h-0007",
  "from": "router",
  "to": "policy-researcher",
  "objective": "确认报销政策中差旅住宿上限",
  "constraints": ["只使用租户 policy-v3", "必须返回原文引用"],
  "parent_state": {"question_type": "policy", "risk": "medium"},
  "evidence_refs": ["doc://policy-v3#travel-住宿"],
  "capabilities": ["search_policy"],
  "idempotency_key": "support-20260822-018:住宿上限:v1",
  "deadline": {"ms": 3500, "max_tool_calls": 2},
  "reply_contract": {"status": "accepted|rejected|committed|unknown"}
}
```

合同里写了“必须返回原文引用”，接收方即使找不到答案，也应该返回 `rejected` 或 `committed` 但带有“未找到证据”的结构，而不是写一段看似完整的猜测。

## 用状态机避免“收到了但没做完”

交接状态不应该靠自然语言判断。可以用如下状态转换：

$$
H_{t+1}=\delta(H_t,E_t),\quad H\in\{created,accepted,rejected,running,committed,failed,unknown,expired\}
$$

其中 `unknown` 是一个重要状态：请求发出后网络断开，发送方不知道接收方是否已经产生副作用。此时不能直接重发，而要先用 `handoff_id` 或幂等键查询状态，再决定恢复、取消或人工对账。

![交接状态与回执边界](/images/notes/agent-handoff-contract/handoff-state.svg)

```python
from dataclasses import dataclass

TERMINAL = {"committed", "rejected", "failed", "expired"}

@dataclass(frozen=True)
class HandoffResult:
    status: str
    evidence_refs: tuple[str, ...] = ()
    error_code: str | None = None

def advance(current: str, event: str) -> str:
    transitions = {
        ("created", "accept"): "accepted",
        ("accepted", "start"): "running",
        ("running", "commit"): "committed",
        ("running", "fail"): "failed",
        ("created", "reject"): "rejected",
        ("created", "timeout"): "unknown",
        ("running", "timeout"): "unknown",
    }
    if current in TERMINAL:
        return current
    return transitions.get((current, event), "failed")
```

程序只允许声明过的转换，模型不能通过一句“任务已完成”跳过 `running → committed`。提交状态还要附带结果摘要、证据引用和执行 trace，才能被父 Agent 采纳。

## 交接损失从哪里来

团队经常只看子 Agent 的局部成功率，却忽略交接本身的损耗。可以把端到端成功近似写成：

$$
P_{e2e}=P_{accept}\times P_{execute}\times P_{evidence}\times P_{commit}
$$

四项中任何一项接近零，整体就会明显下降。交接协议的价值不是让每个 Agent 更会说话，而是让这些概率都能被观测、切片和修复。

## 权限和版本不能靠“相信对方”

接收方应当重新校验：

1. 发送方身份是否属于允许的 caller 集合；
2. `capabilities` 是否超出服务注册表；
3. 证据版本是否仍然有效；
4. 子任务是否落在租户和数据权限范围内；
5. 协议版本是否兼容，未知字段如何处理。

这一步看似重复，实际上是边界。多智能体系统里，每个 Agent 都是一个潜在的跨权限入口，不能因为消息来自“自己的上游 Agent”就跳过鉴权和数据过滤。

## 一个真实的交接案例：研究 Agent 把证据交给写作 Agent

假设研究 Agent 已经找到三份政策原文，接下来交给写作 Agent 生成带引用的回答。它不能只传“结论是 2,000 元”，而应该把**结论、证据、未决冲突和可用动作**一起交接：

```json
{
  "protocol": "aa-handoff/v1",
  "mode": "delegate",
  "task_id": "policy-20260822-041",
  "handoff_id": "h-0012",
  "objective": "根据已核验材料生成带引用的答复",
  "parent_state": "evidence_checked",
  "evidence_refs": [
    {"id": "policy-v4#p2", "claim": "上海住宿上限 800 元", "valid_at": "2026-08-01"},
    {"id": "policy-v3#p9", "claim": "旧上限 600 元", "valid_at": "2025-01-01"}
  ],
  "constraints": ["只使用 2026-08-01 后生效材料", "保留例外条款"],
  "capabilities": ["draft_with_citations"],
  "reply_contract": {"must_return": ["answer", "citation_ids", "open_questions"]}
}
```

写作 Agent 只拥有 `draft_with_citations`，没有更新政策或提交报销的能力。这样即使它误读了旧版本，也会在引用版本校验中被拦住，而不是直接把错误带到用户面前。

![跨 Agent handoff 的任务、证据与能力边界](/images/notes/agent-project-evidence/handoff-pack.svg)

## 接收状态和提交状态要分开

`accepted` 只说明 envelope 通过校验，不代表任务完成。可以把一条交接看成两个相邻状态机：

| 阶段 | 状态 | 最小凭证 |
| --- | --- | --- |
| 接收 | `accepted` | 协议版本、能力和预算通过 |
| 执行 | `running` | 子任务 trace、调用次数、当前负责人 |
| 结果 | `committed` | 结果、证据、版本、时间 |
| 异常 | `unknown` | 查询键、最后已知事件、对账负责人 |

父 Agent 只有拿到 `committed` 才能推进业务状态；`accepted` 或 `running` 只能展示进度。把二者混成一个“成功”字段，会让重试和运营看板都产生误判。

![交接状态机中的提交、重复和回退](/images/notes/multi-agent-protocol-state/commit-state-machine.svg)

## 交接至少要解决三种重复

1. **消息重复**：同一个 envelope 被网络或队列投递两次；
2. **执行重复**：接收方已经开始外部动作，发送方却再次提交；
3. **结果重复**：同一结果被多次回传，父 Agent 重复采纳。

可以用 `handoff_id` 去重接收，用 `idempotency_key` 去重副作用，用 `result_version` 或提交 CAS 去重采纳：

```python
def accept_once(store, envelope):
    existing = store.get_handoff(envelope["handoff_id"])
    if existing:
        return existing.status, existing.receipt
    store.create_handoff(
        envelope["handoff_id"],
        task_id=envelope["task_id"],
        idempotency_key=envelope["idempotency_key"],
        status="accepted",
    )
    return "accepted", None
```

如果没有去重记录，至少要明确“未知结果只能查状态不能重发”的规则；不能把一次网络重连误当成新的业务请求。

![重复投递、幂等提交与结果采纳的分界](/images/notes/multi-agent-protocol-state/duplicate-delivery-card.svg)

## 能力声明不是权限本身

`capabilities: [search_policy]` 只是协议层意图，真正执行前仍要绑定调用方身份、租户、资源和有效期：

```yaml
capability_grant:
  caller: policy-researcher
  subject: writing-agent
  capability: draft_with_citations
  tenant: acme
  resources: [policy-v4]
  expires_at: 2026-08-22T10:30:00Z
  approval: task-owner-19
```

接收方还要拒绝过期 grant、未知能力和超出资源范围的请求。尤其不能因为上游 Agent 在内部网络就跳过 `tenant` 和 `expires_at` 校验。

![交接能力与执行授权的绑定关系](/images/notes/agent-security-boundaries/exec-auth-binding-card.svg)

## 超时、拒绝和未知的用户体验

交接失败最终会暴露在用户界面上，文案要与状态相符：

| 内部状态 | 用户可见信息 | 后续动作 |
| --- | --- | --- |
| `rejected` | 当前 Agent 没有完成该子任务所需能力 | 改走其他路径或转人工 |
| `expired` | 交接预算已过期，未执行新动作 | 重新确认目标和时间 |
| `unknown` | 系统正在核对是否已产生结果 | 查询凭证，禁止重复提交 |
| `committed` | 子任务完成，附引用与时间 | 继续主流程 |

一条清晰的失败说明，往往比一段看似完整但无法验证的总结更能建立信任。

## 协议演进：字段能读不代表语义没变

handoff schema 增加可选字段很容易，真正危险的是同一个字段的含义被悄悄改变。例如 `confidence=0.8` 可能原来表示“检索覆盖率”，后来被理解成“答案正确率”。演进时应给 envelope 加 `contract_version`，并为每个关键字段写单位、来源和缺省行为；旧接收方读不懂新字段时，必须保留安全的旧路径。

| 变更 | 兼容动作 |
| --- | --- |
| 新增可选字段 | 旧方忽略，新方验证默认值 |
| 字段改名 | 双写一段时间，记录读取方版本 |
| 语义改变 | 新版本号，禁止静默升级 |
| 删除字段 | 先观测读取量，再移除 |

交接完成后还要保留最小证据包：输入摘要、source ids、执行版本、状态转移和终态凭证。只保留最终长文，会让后续无法判断是上游没找到证据，还是下游合并时丢了条件。

## 高频追问：为什么不能只传一段总结

**L1：handoff 和普通消息有什么区别？**

普通消息传递信息，handoff 还要转移一部分责任。它必须有接收、执行、提交或回退的可验证状态。

**L2：为什么要同时有 `task_id` 和 `handoff_id`？**

一个任务可以多次交接或重试。`task_id` 串起业务，`handoff_id` 标识某一次尝试，二者分开才能做对账和去重。

**L2：接收方返回 `accepted` 就算完成了吗？**

不算。`accepted` 只表示合同通过校验，任务可能还没有开始。只有 `committed` 加上结果和证据，父 Agent 才能推进状态。

**L3：网络超时后能不能直接重试？**

先标记 `unknown`，用幂等键查询接收方状态；如果接口不支持查询，就把副作用隔离在可撤销或人工对账边界内，不能盲目重放。

**L5：多智能体协议怎样兼容未来的 Agent？**

把 envelope、状态、能力和错误码版本化，规定未知字段可忽略、必填字段不可省略，并保留向后兼容的适配层。不要把内部提示词当成协议。

## 60 秒面试回答

我把多智能体 handoff 当成一次跨服务交接，而不是转发聊天记录。发送方提交版本化 envelope，里面有任务目标、父状态、证据引用、权限能力、幂等键、预算和回复合同。接收方先校验身份与能力，再按状态机返回 accepted、running、committed 或 unknown。网络超时不能直接重试，要先查询幂等状态。上线时我会分别监控接受率、提交率、证据完整率、未知结果率和升级率，并让每次交接都能通过 task_id、handoff_id 和 trace 回放。

## 自检清单

- [ ] 能区分委派、咨询、接管和升级
- [ ] envelope 有目标、状态、证据、能力、幂等键和预算
- [ ] `accepted`、`committed`、`unknown` 的含义不混淆
- [ ] 超时与重复副作用有查询和对账路径
- [ ] 协议、能力和错误码可版本化

## 相关阅读

- [多智能体任务拆解：先分边界，再谈协作](/notes/multi-agent-task-decomposition)
- [多智能体协议与状态：消息不是状态机](/notes/multi-agent-protocol-state)
- [Agent 线上可靠性：成功、失败与未知结果](/notes/agent-deployment-reliability)

## 资料来源

- 《Agent 岗面试宝典 v3 · 精华版》（本地飞书资料整理）
- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)：吸收“基础知识—高频追问—从零实现”的三层组织方式
