---
slug: "agent-core-architecture"
title: "Agent 到底是什么：别把会调用模型的流程都叫 Agent"
excerpt: "面试官问 Agent 有哪些核心组件，不是要你背清单，而是看你能不能把目标、状态、行动、观察和停止条件讲成一条能跑的流程。"
series: "Agent 架构"
seriesNo: "06"
number: "24"
minutes: 24
---

“我们这个系统用了 Agent。”这句话在项目介绍里很常见。面试官接着问：“如果把模型换成规则引擎，它还是 Agent 吗？”很多人就开始解释框架名词，却没有先说明系统到底在什么地方做了决策。

## 先一起把问题过一遍

Agent 不是“接了大模型的工作流”，而是一个围绕目标运行的闭环：它读取当前状态，选择下一步行动，通过工具或环境获得观察，再根据结果更新状态，直到满足完成条件或触发停止策略。模型可以负责选择，也可以只负责局部判断；真正决定系统是不是 Agent 的，是**行动会不会改变后续状态，以及系统有没有明确的反馈和退出边界**。

![目标、状态、行动、观察和停止条件组成 Agent 闭环](/images/notes/agent-core-architecture/agent-loop.svg)

这个定义不依赖某个 SDK。换成 Python、Java 或一组队列服务，仍然可以用同一套问题检查系统。

## 五个组件，分别回答五个问题

把 Agent 拆开，不是为了堆模块，而是为了让每个模块都有可验收的责任。

| 组件 | 它要回答的问题 | 最小证据 |
| --- | --- | --- |
| 目标 Goal | 任务完成的判定是什么？ | 成功条件、失败条件、预算 |
| 状态 State | 下一步需要记住什么？ | 状态 schema、版本、租户边界 |
| 策略 Policy | 为什么现在选这个动作？ | 决策输入、候选动作、选择理由 |
| 行动 Action | 系统实际做了什么？ | 工具请求、权限、幂等键 |
| 观察 Observation | 动作结果如何反馈回来？ | 工具回执、错误分类、证据引用 |

如果一个系统只有“输入 → Prompt → 输出”，但输出不会改变下一轮的输入，也没有失败处理和停止条件，那么它更像一次模型调用或固定工作流。这个判断并不贬低工作流；很多稳定业务恰恰应该优先使用工作流。

## 用状态转移而不是聊天记录理解 Agent

聊天记录只是状态的一种载体。更稳的抽象是把一次运行写成状态转移：

$$
S_{t+1}=T(S_t, A_t, O_t),\qquad A_t=\pi(S_t, G, B_t)
$$

其中 $S_t$ 是当前状态，$G$ 是目标，$B_t$ 是剩余预算，$\pi$ 是策略，$A_t$ 是行动，$O_t$ 是环境观察，$T$ 是状态更新函数。面试时不必把符号念得很复杂，但要能说明：**预算和安全约束也属于决策输入，不能等失败后才补救**。

这个式子还能帮助定位问题：

1. 选错工具，通常是策略输入缺字段或候选集合不完整；
2. 工具成功却继续循环，通常是状态更新没有写入可验证的完成信号；
3. 同样输入结果忽好忽坏，通常是观察、时间、检索版本或随机性没有锁定；
4. 任务越做越长，通常是预算没有进入策略，或停止条件只写在 Prompt 里。

## Agent 和 Workflow 怎么选

不要把“能动态选择”当成高级的唯一标准。选择方式应该由不确定性和责任边界决定。

| 场景 | 更适合 Workflow | 更适合 Agent |
| --- | --- | --- |
| 步骤固定、输入输出稳定 | 是 | 否 |
| 动作候选多，需根据观察选择 | 否 | 是 |
| 每一步副作用大、必须审计 | 固定节点更容易 | 需要受限 Agent + 审批 |
| 长任务会遇到未知失败 | 可在节点处显式分支 | 需要状态、预算和恢复策略 |
| 结果可由单一规则判定 | 是 | 不必引入额外决策层 |

常见的成熟形态是“工作流包住 Agent”：外层固定权限、预算、重试和人工审批，内层只在一个明确的节点里决定检索查询或修复方案。这样既保留弹性，也不把整个业务交给不可预测的循环。

![Workflow、受限 Agent 和自由循环的责任边界对比](/images/notes/agent-core-architecture/decision-boundary.svg)

## 从零写一个最小闭环

下面的代码故意不依赖框架，重点是把状态、动作、观察和停止条件写在同一个函数里。真正接模型时，只需要替换 `choose_action`，而不是把边界藏进 SDK。

```python
from dataclasses import dataclass, field
from typing import Literal

Action = Literal["search", "answer", "stop"]

@dataclass
class RunState:
    goal: str
    evidence: list[str] = field(default_factory=list)
    steps: int = 0
    budget: int = 4
    status: str = "running"

def choose_action(state: RunState) -> Action:
    if state.evidence and len(state.evidence) >= 2:
        return "answer"
    if state.steps >= state.budget:
        return "stop"
    return "search"

def run_agent(goal: str, search, compose) -> RunState:
    state = RunState(goal=goal)
    while state.status == "running":
        action = choose_action(state)
        if action == "search":
            observation = search(goal, state.steps)
            state.evidence.append(observation)
            state.steps += 1
        elif action == "answer":
            compose(state.evidence)
            state.status = "completed"
        else:
            state.status = "stopped_budget"
    return state
```

这段实现还不生产级，但它迫使我们回答三个问题：`search` 失败时状态怎么写？`compose` 已经执行但回执丢了怎么办？预算耗尽时应该给用户什么可解释的结果？如果这些问题只能靠“让模型自己判断”，系统就没有真正的边界。

## 面试官最容易追问的四个边界

### 目标是谁定义的

用户问题、系统策略和安全政策可能同时存在。把它们拼成一段长 Prompt 不够，应该在运行状态中保留来源和优先级。安全规则不能被模型生成的计划覆盖。

### 观察是否可信

工具返回的文本不一定等于事实。生产系统要记录来源、版本、时间和权限；对高风险动作，观察还要经过程序校验或人工确认。

### 什么时候停止

至少有完成、失败、预算耗尽、风险升级和外部未知结果五种终态。只设置 `max_steps` 只能防死循环，不能说明用户是否得到可用结果。

### 谁对副作用负责

决策由模型提出，执行由工具完成，责任必须落到调用主体、权限快照和审计记录上。把“模型说的”直接当作“系统做的”，是 Agent 事故里最难复盘的情况。

## 一张可复查的运行证据卡

```yaml
run_id: agt_c30782
goal: "核对一份制度是否已更新并给出引用"
state_schema: agent-state.v2
policy: read_only_knowledge
steps: 3
actions:
  - type: retrieve
    query: "报销制度 2026 生效日期"
    result: ok
  - type: filter
    constraint: "effective_at <= now"
    result: ok
  - type: compose
    citations: 2
terminal: completed
budget_left: 1
review: "引用覆盖所有结论，未触发写入权限"
```

证据卡的重点不是 YAML 格式，而是让一次“看起来答对了”的运行具备可回放的输入、状态、动作和终态。没有这些字段，成功率再高也很难解释长尾失败。

## 一个完整例子：从“查政策”到“提交报销”

把同一个 Agent 放进两个相邻任务里，边界会更清楚。用户先问“上海出差住宿标准是多少”，这是只读任务；随后说“那帮我提交报销”，这已经进入写操作。两者共享目标和部分证据，但不能共享同一套动作权限：

| 阶段 | 可用动作 | 完成条件 | 终态 |
| --- | --- | --- | --- |
| 查政策 | `retrieve_policy`、`compare_version` | 有当前版本引用 | `answer_ready` |
| 收集材料 | `read_receipt`、`ask_missing` | 金额、日期、发票齐全 | `ready_for_submit` |
| 提交报销 | `create_claim`（需审批） | 外部系统返回凭证 | `committed` / `unknown` |

如果模型在第一阶段就能看到 `create_claim`，它可能把“帮我看看”理解成“直接提交”。所以动作集合应该随状态和权限变化，而不是固定塞进一个大 Prompt。

![Agent 运行中读取证据、规划和执行的闭环](/images/notes/agent-planning-reflection/reflection-loop.svg)

## 状态 schema 要能表达“未完成”和“未知”

```json
{
  "run_id": "agt_c30782",
  "goal": {"text": "查政策并准备报销", "source": "user"},
  "phase": "ready_for_submit",
  "facts": [{"key": "hotel_limit", "value": 800, "source": "policy-v4#p2"}],
  "pending": ["receipt_image", "trip_end_at"],
  "actions": [{"name": "retrieve_policy", "status": "committed"}],
  "side_effects": [],
  "budget": {"steps_left": 2, "tool_ms_left": 900},
  "terminal": null
}
```

`pending`、`side_effects` 和 `terminal` 三个字段很关键：前者让系统知道为什么还不能提交，中间字段记录外部动作，最后字段区分完成、失败、预算耗尽和未知结果。只保存聊天文本时，这些状态会被模型的下一轮重写。

## 计划、执行和反思要有不同责任

很多框架把 plan、act、reflect 写成三个 Prompt，但工程上更重要的是三者的输入输出：

| 阶段 | 输入 | 输出 | 程序约束 |
| --- | --- | --- | --- |
| Plan | 目标、状态、候选动作 | 有序计划或澄清 | 动作白名单、预算 |
| Act | 单个已批准动作 | 工具请求和回执 | 权限、幂等、超时 |
| Reflect | 回执、证据、终态条件 | 继续、修正、结束 | 最大步数、失败状态 |

反思不是让模型无休止地“再想一遍”。如果工具回执已经明确成功，程序应直接推进终态；只有缺证据、状态冲突或工具失败时才允许再次规划。

![规划、行动、观察和终态的回放关系](/images/notes/agent-observability-replay/replay-contract.svg)

## 停止条件要可计算

可以把停止判定写成纯函数，便于测试和回放：

```python
def terminal_reason(state) -> str | None:
    if state.get("error"):
        return "failed"
    if state.get("unknown_side_effect"):
        return "unknown"
    if state.get("goal_satisfied") and state.get("evidence_complete"):
        return "completed"
    if state.get("steps_left", 0) <= 0:
        return "budget_exhausted"
    if state.get("risk") == "high" and not state.get("approval_id"):
        return "awaiting_approval"
    return None
```

这个函数不负责决定“答案是否聪明”，只负责决定系统能否继续运行。把它从模型输出里拿出来，才能保证死循环、越权和未知副作用不会被一句自然语言绕过。

## 观测要回答三个排障问题

一次运行的 trace 至少要能回答：

1. 当时看到了哪些状态、证据和动作候选？
2. 为什么选择了这个动作，预算和权限是否满足？
3. 工具回执之后，状态为什么转移或停止？

```yaml
trace_event:
  run_id: agt_c30782
  seq: 4
  state_before: retrieving
  candidates: [retrieve_policy, ask_missing, handoff]
  selected: retrieve_policy
  policy_version: agent-policy-v2
  tool_receipt: policy-v4#p2
  state_after: evidence_checked
  terminal: null
```

没有 `state_before` 和 `state_after`，只记录“调用了搜索”仍然无法判断是路由错、证据错还是状态没写回。

![Agent 指标从目标到行动再回到评测的闭环](/images/notes/agent-metrics-baseline/agent-metrics-loop.svg)

## 安全边界：模型建议，程序授权

工具网关应至少做四件事：校验动作是否注册、绑定调用者与租户、检查参数和副作用、写入审计记录。示意实现如下：

```python
def guard_action(action, *, user, registry):
    spec = registry.get(action["name"])
    if not spec or user.tenant not in spec.tenants:
        return {"allow": False, "reason": "not_registered"}
    if action.get("side_effect") and not action.get("approval_id"):
        return {"allow": False, "reason": "approval_required"}
    if not spec.validate(action.get("args", {})):
        return {"allow": False, "reason": "invalid_args"}
    return {"allow": True, "audit": {"user": user.id, "tool": spec.name}}
```

这就是“模型会规划”和“系统能执行”的分界。即使未来换模型、换框架，授权层仍然可以保持不变。

![Agent 与工具、权限和审计之间的信任边界](/images/notes/agent-security-boundaries/trust-boundary.svg)

## L1 / L2 / L3 / L5 分层追问

**L1：Agent 和普通 LLM 调用有什么区别？**

Agent 有围绕目标的状态转移、行动和观察闭环，行动结果会影响后续决策，并且有显式停止条件；普通调用可以只是一次输入输出。

**L1：Agent 的核心组件有哪些？**

目标、状态、策略、行动、观察和终态。工具、记忆、规划、评测都是围绕这些责任展开的实现方式。

**L2：Workflow 能不能算 Agent？**

固定流程本身更像 Workflow；如果其中某个节点会根据观察选择动作并更新状态，可以把该节点视为受限 Agent。关键看是否存在动态决策闭环，而不是是否安装了 Agent 框架。

**L2：为什么不能把停止条件只放进 Prompt？**

Prompt 不是强约束。预算、权限、次数和高风险动作应由程序状态机控制，Prompt 只负责提供判断所需的上下文。

**L3：如何证明 Agent 真的在做决策？**

固定目标和输入，改变一个外部观察，检查后续动作、状态和终态是否发生有理由的变化，并记录工具请求和回执，而不是只看最终答案。

**L3：长任务里最容易出现什么问题？**

上下文膨胀、重复行动、未知副作用和终态丢失。需要状态摘要、幂等键、预算、回放和对账共同处理。

**L5：什么时候应该退回 Workflow？**

当步骤、权限和输出都能稳定枚举，动态选择带来的收益小于测试、审计和成本时，应退回固定工作流，把不确定性留在少数节点。

## 面试官追问时怎么接

我理解的 Agent 不是“调用了大模型的流程”，而是一个围绕目标运行的状态闭环：读取状态，选择动作，调用工具或环境，拿到观察后更新状态，直到完成、失败、预算耗尽或升级人工。设计时我会先把目标、状态 schema、动作契约和终态写出来，再决定哪些节点需要模型，哪些节点必须由程序和权限控制。项目里我会用运行 trace 记录决策输入、工具回执、预算和证据引用，这样既能解释为什么选了某个动作，也能在长尾失败时回放和修复。能用固定工作流解决的问题，我不会为了“像 Agent”而增加自由循环。

## 自检清单

- [ ] 能写出目标、状态、动作、观察和终态，而不是只列框架名
- [ ] 能解释一次工具失败如何改变状态和下一步
- [ ] 预算、权限和高风险动作由程序约束，不只靠 Prompt
- [ ] 有成功、失败、未知结果和人工升级的不同终态
- [ ] 能用 trace 或证据卡回放一次真实运行

## 相关阅读

- [记忆系统不是聊天记录：短期、长期和压缩到底怎么分工](/notes/agent-memory-system)
- [规划与反思什么时候有用，什么时候只是让 Agent 多说废话](/notes/agent-planning-reflection)
- [一个 Agent 做不完，什么时候该拆成多个？](/notes/multi-agent-task-decomposition)

## 资料来源

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)：基础知识、面试追问、从零实现的三栏组织方式
