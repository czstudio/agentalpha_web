---
slug: "agent-workflow-vs-agent"
title: "Workflow 还是 Agent？先看这件事到底有多不确定"
excerpt: "Workflow 和 Agent 怎么选？先看任务不确定性、风险、验证成本、回退办法，再定哪些步骤交给 Agent，哪些边界写死。"
series: "Agent 架构"
seriesNo: "06"
number: "61"
minutes: 22
---

产品经理说：“这段流程要更智能，用户说一句话就自动完成。”工程师顺手把整条链路改成 Agent。两周后，系统小事绕远路，大事反复试，大家才回头问：这件事原本是不是用 Workflow 就够了？

## 拆完先给结论

Workflow 把步骤、分支和责任提前写死，优点是可预测、易测试、易审计；Agent 把部分选择权放到运行时，适合目标明确但路径不确定、需要根据观察调整动作的任务。实际项目通常不是二选一，而是**用 Workflow 固定边界，用受限 Agent 处理局部不确定性**。判断依据不是“哪种更先进”，而是动态决策带来的收益是否超过测试、延迟、成本和副作用。

![Workflow 与受限 Agent 的选择矩阵](/images/notes/agent-workflow-vs-agent/choice-matrix.svg)

## 先量四种不确定性

“流程不确定”太笼统。先把它拆成四类，才能决定哪些东西应该交给模型。

| 不确定性 | 典型问题 | 更适合的机制 |
| --- | --- | --- |
| 输入不确定 | 用户说法多、字段缺失 | 结构化抽取 + 校验 + 澄清节点 |
| 路径不确定 | 需要先查哪类资料 | 受限规划、工具候选集 |
| 结果不确定 | 外部服务会超时或返回未知 | 状态机、重试、对账、人工升级 |
| 目标不确定 | 用户自己没说清成功标准 | 先澄清目标，不让 Agent 猜副作用 |

大多数业务只在第二类不确定性上需要 Agent。把输入、结果和目标都交给自由循环，就等于把最重要的约束变成概率问题。

## 用成本函数做选择

可以用一个很朴素的估算把讨论从偏好拉回事实：

$$
V_{dynamic}=G_{path}-\left(C_{latency}+C_{token}+C_{test}+C_{risk}\right)
$$

当动态路径带来的收益 $G_{path}$ 只是少写几行分支，而风险和验证成本显著上升时，$V_{dynamic}$ 可能是负数。面试时不需要真的算人民币，但要说清楚自己会比较什么：成功率提升、长尾覆盖、P95、调用次数、人工复核率和事故半径。

## 典型的混合架构

一个企业知识问答流程可以这样分层：

1. Workflow 校验租户、权限、问题类型和预算；
2. Agent 节点选择查询改写、关键词检索或结构化过滤；
3. Workflow 固定证据合并、引用格式和敏感信息过滤；
4. 如果证据冲突或置信度不足，进入人工复核，而不是继续循环。

![混合架构让 Workflow 管边界、Agent 管局部选择](/images/notes/agent-workflow-vs-agent/hybrid-architecture.svg)

这种设计里，Agent 的自由度是一个明确的接口：它只能从注册的动作集合中选，不能临时创建工具，也不能决定是否跳过审计节点。

## 决策表：什么时候不该用 Agent

| 现象 | 不该做的事 | 更稳的替代 |
| --- | --- | --- |
| 规则已经能覆盖 99% 输入 | 为了展示智能加入循环 | 固定流程，保留异常分支 |
| 每次动作都产生不可逆副作用 | 让模型直接执行 | 计划与执行分离 + 审批 |
| 成功标准无法程序验证 | 让模型自己说完成 | 先定义验收或转人工 |
| 任务很短但模型调用很贵 | 增加多轮反思 | 规则预处理 + 单次调用 |
| 线上失败无法回放 | 先扩大工具数量 | 先补 trace、版本和幂等 |

把“不要用 Agent”说清楚，本身就是成熟的 Agent 设计能力。

## 从零实现一个受限决策节点

下面的实现让模型只能选择注册动作，动作本身由程序负责参数校验和执行。生产环境还要加入权限、超时和审计，但边界已经比自由执行清楚。

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class CandidateAction:
    name: str
    reason: str
    risk: str

ALLOWED = {
    "search_policy": CandidateAction("search_policy", "查找制度原文", "low"),
    "ask_clarification": CandidateAction("ask_clarification", "关键信息缺失", "low"),
    "handoff": CandidateAction("handoff", "证据冲突或风险过高", "medium"),
}

def choose_bounded_action(model_output: dict, *, budget: int) -> CandidateAction:
    name = model_output.get("action")
    if budget <= 0:
        return ALLOWED["handoff"]
    if name not in ALLOWED:
        return ALLOWED["ask_clarification"]
    return ALLOWED[name]
```

注意这里没有让模型直接返回函数名就执行。模型输出先进入候选集合，再根据预算和风险做一次程序决策。这样“模型的判断”和“系统采取的动作”之间有可测试的缓冲层。

## 一个可复跑的对照实验

如果团队争论“Agent 是否更好”，不要只看 Demo。可以固定 120 个匿名任务，比较三种配置：纯 Workflow、Workflow + 受限 Agent、自由循环 Agent。

```yaml
experiment: workflow_agent_20260822
dataset: support_tasks_v3
fixed:
  model: model-x-2026-07
  tools: [search_policy, ask_clarification, handoff]
  budget: 4
metrics: [task_success, p95_latency, tool_calls, unsafe_action, handoff_rate]
decision:
  promote_if: "success +4pp 且 unsafe_action 不增加，P95 增长 < 20%"
  fallback: "保留 Workflow 作为高风险租户默认路径"
```

实验的价值不是证明 Agent 永远更好，而是找出在哪些任务切片上动态路径值得付出成本。

## 把“灵活”拆成可验收的能力

一个客服工单 Agent 说自己比 Workflow 灵活，至少要回答四个具体问题：它能否识别新类型？能否在工具失败后换路？能否在证据不足时停下？能否把每次选择解释给运营？可以把能力写成矩阵：

| 能力 | 纯 Workflow | 受限 Agent | 自由循环 Agent |
| --- | --- | --- | --- |
| 新意图覆盖 | 需要加分支 | 可在候选意图内扩展 | 可能覆盖，也可能漂移 |
| 工具失败恢复 | 预设分支 | 允许有限重路由 | 容易重复调用 |
| 过程可解释 | 高 | 中高，有决策 trace | 取决于日志质量 |
| 风险可控 | 高 | 可按工具和预算控制 | 需要大量额外护栏 |
| 测试空间 | 较小 | 可枚举候选和状态 | 随工具、步数快速膨胀 |

![不确定性、风险和测试成本的决策矩阵](/images/notes/agent-planning-reflection/pattern-matrix.svg)

这张表的作用不是给三种方案排名，而是提醒团队：所谓灵活，必须落在“哪一种新情况被覆盖、代价是多少、失败能不能回退”上。

## 一个可落地的分层方案

以“为客户创建工单”为例，建议把系统拆成四层：

1. **入口层**：Workflow 校验用户、租户、工单类型和必填字段；
2. **决策层**：受限 Agent 在 `search_faq`、`ask_missing`、`draft_ticket` 三个动作中选择；
3. **执行层**：程序校验参数、权限和幂等键，再调用工单 API；
4. **收尾层**：Workflow 检查回执、更新状态、发送通知或进入人工队列。

如果模型在入口层就有权调用“创建工单”，错误分类会直接变成副作用。把动作按风险分层，才能让 Agent 的灵活性停在正确的位置。

![RAG 决策树帮助选择检索、澄清还是升级](/images/notes/agent-rag-why/rag-decision-tree.svg)

## 选择矩阵应该能指导默认路径

```yaml
route_policy:
  - if: "input_complete && side_effect == none && evidence >= 0.9"
    route: "workflow_read"
  - if: "intent_uncertain || missing_required_field"
    route: "bounded_agent_clarify"
  - if: "side_effect == write && approval == false"
    route: "human_review"
  - if: "tool_timeout || result == unknown"
    route: "reconcile_then_resume"
default: "workflow_safe_stop"
```

这份策略让“默认走哪条路”变成可配置、可评测的规则。模型可以提出建议，但不能覆盖 `side_effect == write` 时的审批门槛。

## 失败切片比总体平均更有价值

比较 Workflow 和 Agent 时，至少按以下切片报告：

| 切片 | 要观察什么 | 典型结论 |
| --- | --- | --- |
| 常见单跳 | 成功率、P95、成本 | Workflow 往往更划算 |
| 新意图 | 路由覆盖和澄清率 | Agent 可能带来收益 |
| 工具超时 | unknown、重试和接管 | 受限 Agent 更容易控制 |
| 高风险写操作 | 越权、重复和审批漏过 | 默认 Workflow |
| 长尾多轮 | 预算耗尽、上下文膨胀 | 需要状态摘要和回退 |

![Workflow/Agent 对照实验的失败切片](/images/notes/agent-eval-success-rate/failure-slices.svg)

如果只汇报总体成功率，常见任务的提升可能掩盖高风险切片的回归。上线决策要看最坏切片和失败半径，而不是一张平均分排行榜。

## 最小状态机：让动态选择仍然可回放

```python
TRANSITIONS = {
    ("created", "route"): "planned",
    ("planned", "search"): "retrieving",
    ("retrieving", "evidence_ok"): "drafting",
    ("retrieving", "evidence_low"): "clarifying",
    ("drafting", "approval_required"): "awaiting_approval",
    ("awaiting_approval", "approved"): "executing",
    ("executing", "receipt_ok"): "committed",
    ("executing", "timeout"): "unknown",
}

def transition(state: str, event: str) -> str:
    return TRANSITIONS.get((state, event), "failed")
```

模型的输出只产生事件，例如 `search` 或 `approval_required`；状态机决定下一状态。这样即使替换模型，也不会改变高风险状态的跳转规则。

## 一个简单的安全边界检查

动态动作进入执行器前，可以做一次统一校验：

```python
def authorize(action: dict, *, user, policy) -> dict:
    if action["name"] not in policy.allowed_actions(user.role):
        return {"allow": False, "reason": "action_not_registered"}
    if action.get("side_effect") and not action.get("approval_id"):
        return {"allow": False, "reason": "approval_required"}
    if action.get("budget_left", 0) <= 0:
        return {"allow": False, "reason": "budget_exhausted"}
    return {"allow": True}
```

它看起来很朴素，却能把“模型觉得应该执行”与“系统允许执行”明确分开。安全规则也应该进入指标和测试，而不是只出现在设计文档中。

## 逐步增加自由度，而不是一次打开全部工具

一个成熟的迁移顺序可以是：

```text
固定 Workflow（记录基线）
  → Agent 只做意图分类
  → Agent 在只读工具中选路
  → Agent 生成写操作计划，人工确认
  → 少量租户启用受控执行
```

每一步都保留上一阶段的默认路径。比如只读检索的成功率和引用覆盖稳定后，才让 Agent 选择混合检索；计划在沙箱中通过参数校验后，才允许进入审批。这样每次增加的自由度都能对应一组新的测试，而不是把所有风险一次推上线。

## 把“回退到 Workflow”做成产品能力

回退不是事故时临时切一个开关，而是每次任务都应能走的合法路径：

```yaml
fallback_routes:
  evidence_low: ask_clarification
  tool_timeout: workflow_retry_or_reconcile
  action_not_registered: human_review
  budget_exhausted: summarize_and_stop
  policy_version_conflict: show_sources_and_wait
```

用户看到的是“需要补充哪一项”或“正在核对哪一笔动作”，而不是突然换成一个完全不同的错误页面。回退路径也要纳入成功定义：安全停止并给出下一步，通常比继续探索更好。

## 高频追问：灵活性和可控性怎么平衡

**L1：Workflow 和 Agent 的主要区别是什么？**

Workflow 在设计时决定路径，Agent 在运行时根据状态和观察选择动作。前者更可预测，后者覆盖未知路径更好。

**L2：为什么混合架构通常更实用？**

把权限、预算、审计、验收和升级人工固定在 Workflow 里，只把需要理解或选择的局部交给 Agent，可以减少自由度和事故半径。

**L2：Agent 的工具越多越聪明吗？**

不一定。候选动作越多，选择和参数错误越多，测试空间也会膨胀。工具应该按任务、权限和风险分组，并给模型提供最小必要集合。

**L3：如何判断动态决策带来了收益？**

固定数据和模型，比较成功率、长尾覆盖、延迟、成本、人工接管和不安全动作；不能只展示一条成功 Demo。

**L3：什么时候直接拒答比继续探索好？**

当目标不明确、证据冲突、预算耗尽或动作不可逆且没有审批时，拒答或升级人工比继续调用工具更可靠。

**L5：如果面试官坚持说 Agent 是未来，怎么回应？**

可以认可动态决策的价值，同时说明工程选择仍由约束决定：未来可能有更多 Agent，但可靠系统依然需要固定的状态、权限、评测和回退边界。

## 最后，把它讲清楚

我会先区分输入、路径、结果和目标四种不确定性。Workflow 适合步骤和责任固定的场景，Agent 适合目标明确但需要根据观察选择路径的局部。实际设计通常是混合架构：外层 Workflow 负责权限、预算、审计、验收和人工升级，内层受限 Agent 只从注册动作中选择查询、改写或修复方案。上线前我会用固定数据比较成功率、P95、调用次数、风险动作和接管率，只有动态路径的收益覆盖了成本和风险，才扩大 Agent 的自由度。

## 自检清单

- [ ] 能拆出四种不确定性，并说明哪一种需要 Agent
- [ ] 能写出 Workflow、受限 Agent、自由循环的责任边界
- [ ] 动态决策有候选动作集、预算和回退路径
- [ ] 有固定数据和指标做对照，而不是只讲灵活性
- [ ] 能说出至少一个不该使用 Agent 的场景

## 相关阅读

- [Agent 到底是什么：别把会调用模型的流程都叫 Agent](/notes/agent-core-architecture)
- [Agent 安全不是加一句提示词：权限、工具和数据边界怎么设计](/notes/agent-security-boundaries)
- [Agent 评测不能只看成功率：从结果到轨迹的五层指标](/notes/agent-eval-success-rate)

## 资料来源

- [ARIS-in-AI-Offer](https://github.com/wanshuiyin/ARIS-in-AI-Offer)：以基础、追问、实现三层组织面试学习
