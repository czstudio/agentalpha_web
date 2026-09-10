---
slug: "agentic-rl-credit-assignment"
title: "Agent 做错了，二十步里到底哪一步该负责？"
excerpt: "Agentic RL 难的不是把奖励写成一个数字，而是判断最终成败到底由哪几个动作造成。分不清责任，训练就只会给整条轨迹一张模糊的罚单。"
series: "Agentic RL"
seriesNo: "01"
number: "02"
minutes: 10
---

你给面试官看一条成功轨迹：模型先搜资料，再跑代码，最后答对。面试官点点头，接着删掉最后一次工具调用，问你：

“如果整条轨迹最后拿到一个 0，前面十九步是不是都应该被惩罚？”

这不是抬杠。Agentic RL 训练最容易卡在这里。模型可能连续做了十几次决策，奖励却只在结尾出现一个对或错。最后答案错了，究竟是第一步选错了工具，第三步的 query 太宽，还是第十步没读懂返回结果？如果所有 token 都收到同一张罚单，模型最后学到的往往不是“哪一步要改”，而是“这类任务少做一点”。

👔 面试官 你说自己做过 Agentic RL。最终奖励只有一个标量时，长轨迹怎么做 credit assignment？

🙋‍♂️ 常见回答 用 advantage。回报减 baseline，再把优势乘到每一步的 log probability 上。

👔 面试官 公式没错。那一个搜索结果其实已经给出答案，模型却又调用了三次搜索，最后因为超时失败。三次多余调用和第一次正确搜索，拿到的是同一个优势吗？

这时不能继续背公式。真正要回答的是：你怎样定义“动作对后续结果的贡献”，以及在看不清贡献时，怎样避免把噪声写进模型。

## 先把 credit assignment 说成人话

在单轮 RLHF 里，模型生成一段回答，得到一个总分。回合短，状态变化少，credit assignment 已经不轻松，但至少“这段话”是一个相对完整的动作。

Agent 的轨迹更像一串小决定：

1. 要不要调用搜索；
2. query 写成什么；
3. 结果够不够，是否继续搜；
4. 要不要运行代码验证；
5. 报错后改哪一行；
6. 何时停止交互，开始组织答案。

每一步都会改变后面的观察。于是“这次答错了”不是一个动作的属性，而是整条路径的结果。2025 年的 Agentic RL 综述把这类任务放在部分可观测、多步决策的框架里讨论：状态并不完全可见，动作会改变环境，奖励可能延迟到很后面。这也是它和把一段文本打分的偏好优化之间最硬的分界。

一个实用的工程定义是：credit assignment 要估计某个动作相对“当时不做、换一种做法”对未来回报的增量。注意是增量，不是这一步之后出现了多少字。搜索结果很长，不代表搜索动作有功；一条短短的工具调用，可能恰好避免了十步错误。

![Agentic RL 责任分配流程：先记录轨迹，再区分环境事件，最后才把分层信号交给训练](/images/notes/agentic-rl-credit-assignment/credit-flow.svg)

### 用四个字段把“背锅”拆开

一条轨迹至少要把 `state`、`action`、`observation` 和 `event` 分开保存。把它们拼成一段聊天记录，读起来很顺，训练时却无法知道哪一段是模型决定的，哪一段是网页返回的。

```json
{
  "step": 7,
  "state_hash": "s_91c2",
  "action": {"tool": "search", "query": "..."},
  "observation": {"status": 200, "doc_ids": ["d17", "d22"]},
  "event": "TOOL_OK",
  "next_state_hash": "s_91c3"
}
```

`action` 才是策略需要学习的对象；`observation` 是环境给出的事实；`event` 是训练管线用来判断责任边界的证据。字段多一点，会让日志占空间，但能避免把“工具挂了”训练成“模型不该搜索”。

## 结果奖励为什么会把人逼疯

结果奖励有一个优点：便宜、可复现、目标清楚。数学题最终答案对不对，代码测试过不过，检索问答的引用是否支持结论，都可以先变成回合级分数。

问题是信号太远。

假设一次任务有 20 个决策，只有最终答案正确时奖励为 1，否则为 0。最朴素的做法，是把同一个 return 传给轨迹里所有模型 token。失败轨迹的每一步都被压低，成功轨迹的每一步都被抬高。

这会产生三种很烦的后果。

第一，正确的早期动作被误罚。模型第一步已经选对了检索器，后面因为页面 500 失败，整条回合是 0。训练如果不区分环境故障，策略会开始回避检索。

第二，错误的中间动作被误奖。前面几次搜索都没有用，最后一次碰巧命中答案。只看终局时，整条路径都像“有价值”。模型于是学会反复试，直到撞上一个能过验收的结果。

第三，奖励方差很大。长轨迹里只改一个动作，结果可能从 0 变 1；模型看到的梯度方向一会儿向东、一会儿向西，训练曲线像一辆没有方向盘的共享单车。

所以 credit assignment 不是“再加一个 loss 项”这么简单。它首先是实验设计：你是否记录了每一步的状态、动作、观察、环境事件和结束原因。

## 第一种办法：把回报往前传，但要承认它很粗

最基本的做法是 return-to-go。第 t 步只看从 t 开始到回合结束的回报，优势写成：

`A_t = G_t - V(s_t)`

如果第 t 步之后已经失败，后续回报自然低于还没走到悬崖边的状态。相比把终局分数无脑复制给全部 token，它至少保留了时间方向。

但它没有回答反事实问题。第 3 步改一个 query，最终还是可能得到同样的答案；第 3 步到底有没有贡献，return-to-go 看不出来。它只说“从这里往后发生了什么”，没说“这一步做不做会怎样”。

因此第一版系统可以这样做：先用结果奖励和 return-to-go 建立可跑的基线，再把每一步的失败原因拆开。代码测试失败、工具超时、预算耗尽、答案不符题意，不要先混成一个 0。分开记录，后面才有机会改奖励；否则你连坏在策略还是环境都不知道。

## 第二种办法：增加过程信号，但别把启发式当真理

过程奖励的诱惑很大。搜索可以奖励“引用了相关文档”，代码可以奖励“测试通过的中间模块”，计划可以奖励“覆盖了任务约束”。这些信号让梯度离动作更近。

OpenAI 的《Let's Verify Step by Step》展示了过程监督的价值：对推理步骤逐步判断，通常比只看最终答案更能指导模型。不过，在 Agent 场景里，过程信号必须对应任务目标。一个看似合理的中间步骤，可能只是漂亮的格式；一个没有引用的短回答，反而可能完全正确。

实践中我会把过程奖励分成三层，而不是把所有小分相加：

- 约束层：工具名、参数类型、权限、预算是否满足硬约束。错了直接记事件，不需要让裁判模型长篇解释。
- 证据层：这一步产生的观察，是否被后续答案实际使用。可以通过引用检查、单元测试或状态差异验证。
- 结果层：任务最终是否达成，作为最重要的分。

层级的好处是可审计。若过程分和结果分冲突，先看冲突记录，不要悄悄调权重到曲线好看为止。过程奖励应该帮助定位问题，不能替代任务验收。

## 第三种办法：同一状态做相对比较

Agent 任务经常存在这种场景：模型在同一状态下采样几种动作，有的马上搜，有的先算，有的直接回答。若最终结果不同，可以在组内比较动作的相对收益。

GRPO 一类方法不单独训练价值模型，而是用同一问题的一组 rollout 估计相对优势。它不能凭空解决 credit assignment，却能降低一部分 baseline 成本：同一题里，成功轨迹和失败轨迹互相提供参照。

要注意“同一问题”不等于“同一状态”。如果每条轨迹拿到的页面、随机种子、工具延迟不同，组内差异混入环境噪声，相对优势仍然会偏。我的日志会记录：prompt hash、环境版本、工具响应摘要、随机种子、终止原因。没有这些字段，组相对奖励只是一个看起来很科学的平均数。

## 工程故障：模型背了环境的锅

一条真实 rollout 失败，常常有四种原因：策略选错；工具返回错误；环境状态脏了；验收器有 bug。若训练管线只看到 reward=0，四种情况都把梯度打回模型。

解决方式不是给每种故障发一张彩色贴纸，而是让环境返回结构化事件。例如：

`TOOL_OK`、`TOOL_TIMEOUT`、`INVALID_ARGUMENT`、`SANDBOX_ERROR`、`TEST_FAIL`、`TASK_FAIL`。

策略错误才进入负向训练；明确的基础设施故障进入重试或丢弃队列；验收器异常进入人工抽样。这样做会增加一些日志和队列维护成本，但比让模型学会“不要碰会超时的工具”便宜得多。

还有一个容易忽略的点：观察 token 不是动作 token。搜索片段、网页 HTML、编译器 traceback 可以回到上下文，但不应当因为它们出现得多，就在 loss 里占更大权重。Search-R1 明确对检索返回的 token 做 mask，只更新模型自己生成的部分。这条边界同样适用于 credit assignment：先确定责任主体，再分配梯度。

## 一个可落地的诊断流程

当训练没有提升，我不会先换算法，而是抽 100 条轨迹，做四张表。

第一张是动作表：每一步模型说了什么，调用了什么，参数是什么。

第二张是环境表：返回了什么、耗时多久、是否发生异常。

第三张是责任表：这一步如果替换成基线动作，最终结果会不会改变。能做反事实就做，不能做就标成未知，不要强行填 0 或 1。

第四张是奖励表：结果分、过程分、惩罚分分别来自哪里，是否存在互相打架的规则。

看完再决定方向。若大量失败来自工具超时，优先修环境；若模型总是早停，检查停止奖励和预算惩罚；若正确答案被过度搜索拖垮，加入重复调用和无效观察的成本；若裁判分和单元测试冲突，先信可执行验收。

这套流程不炫，但能让每一次改动有证据。Agentic RL 最怕的不是没有新论文，而是每轮实验都不知道到底改了什么。

## 先做一个“责任最小单元”实验

如果直接在真实业务环境里改奖励，很难知道收益来自哪里。可以先把任务缩成一个责任最小单元：一次搜索、一次代码修复，或一次带引用的回答。只保留 3 到 5 个决策，给每一步准备一个可执行的替代动作。

例如在检索任务里，准备“立即回答”“搜索一次后回答”“搜索两次后回答”三种路径。让同一个问题在相同快照上跑完，再比较答案是否正确、引用是否支持、总耗时和工具次数。这个小实验无法代表完整 Agent，但能验证奖励是否把正确的搜索动作和无效重复区分开。

接着才把轨迹拉长。每增加一种工具或一种失败分支，都保留一批旧任务做回归。若新奖励让短任务变好、长任务变差，优先检查是否把长轨迹的环境噪声误当成策略责任。把“看起来更复杂”的 reward 先放在离线回放里，别直接让它改线上策略。

还有一个判断标准：同一条轨迹由两名标注者复盘，若他们对“哪一步改变了结果”长期分歧很大，说明任务本身还没有足够证据支撑细粒度奖励。此时降低奖励粒度，通常比逼着标注者猜一个 token 归因更诚实。

![反事实动作分支：固定同一状态，替换一个动作，比较最终结果与成本的变化](/images/notes/agentic-rl-credit-assignment/counterfactual-branch.svg)

### 反事实实验的最小实现

先不做复杂的因果模型，可以用一个可重放的环境快照做差分。关键是：三个分支共享同一个 `state_hash`，并由同一版本验收器打分。

```python
def compare_action(env, state, actions, verify):
    baseline = None
    rows = []
    for action in actions:
        run = env.replay(state=state, action=action)
        result = verify(run)
        row = {
            "action": action,
            "score": result.score,
            "evidence": result.evidence,
            "cost": run.tool_calls + run.tokens / 1000,
        }
        rows.append(row)
        baseline = baseline or row
    return [
        {**row, "delta": row["score"] - baseline["score"]}
        for row in rows
    ]
```

这个 `delta` 仍然不是严格因果效应，因为动作可能改变后续路径；但它比“成功轨迹里的每一步都奖励 1”多了一层证据。若环境无法重放，就把责任写成 `unknown`，不要为了让报表完整而编一个确定答案。

### 什么时候应该降低归因粒度

不是所有任务都适合追到 token。下面这张判断表更实用：

| 任务特征 | 推荐粒度 | 原因 |
| --- | --- | --- |
| 工具参数决定成败，环境可重放 | step / action | 可以做替换实验 |
| 代码 patch 影响多个测试 | patch / 文件 | token 归因会放大噪声 |
| 网页状态不可稳定重放 | turn / 轨迹 | 先保留事件和人工抽样 |
| 多 Agent 共享中间产物 | 节点 / 边 | 需要记录依赖关系 |

归因越细，不代表监督越好。粒度应该和证据能力匹配；证据不够时，粗一点反而更稳定。

## 复现时要锁住哪些东西

credit assignment 的实验特别容易“同名不同物”。今天的环境快照、工具版本、prompt 模板和验收脚本，只要有一个变了，昨天的优势就不能直接拿来比较。轨迹文件至少保存任务 ID、环境版本、策略版本、随机种子、每一步事件和最终 reward 分解；原始工具响应可以压缩保存，但不能只留一个“搜索成功”的摘要。

复现实验时先回放同一批轨迹，确认新的奖励代码能得到相同分布，再启动训练。若回放结果已经不同，先修数据或验收器，不要把差异归因于优化器。对不能重放的实时工具，明确标记 non-replayable，并把它们排除在核心对比之外。

这些约束会降低数据吞吐，也会让实验目录多几个版本字段。代价是可接受的。没有可重放的责任证据，任何“某个奖励更好”的结论都只能算猜测。

## 2026 年的新变化：归因粒度正在从整条轨迹往图结构走

2026 年的 credit assignment 综述把现有方案按 token、片段、步骤、轮次和多 Agent 等粒度重新整理。它提出的现实问题很直接：Agent 轨迹可能超过一百轮、上下文达到十万乃至百万 token，此时把最终奖励原样广播给整条轨迹，信息密度会越来越低。

GraphGPO 又往前走了一步。它不只把 rollout 当成几条独立长文本，而是把多次采样中重复出现的状态和转移聚合成图，再根据边离目标的距离估计相对价值。直觉上，同一个状态如果反复出现，就不该每次都从零猜哪条路径更好。

这些工作没有把工程问题一笔勾销。状态怎么判定相同、工具观察如何归一化、图会不会被环境噪声污染，都会改变结果。它们真正提供的是一个方向：长轨迹的责任不一定只能沿时间顺序平均传播，也可以利用重复状态、反事实动作和结构关系寻找更小的责任单元。

## credit assignment 先做一张“责任三分账”

长轨迹失败时，不能把最终的 0 平均撒给每一步，也不能看到最后一步报错就认定前面的规划都错了。训练前我会把一次 rollout 拆成策略责任、环境事件和验收器事件三类，先完成归因，再决定哪些信号可以进优势估计。

一张最小回执可以这样写：

~~~yaml
credit_split_receipt: csr_20260820_23
episode_id: ep_7741
steps: 18
policy_fault:
  - step: 7
    type: invalid_tool_args
environment_event:
  - step: 11
    type: tool_timeout
verifier_event:
  - step: 18
    type: missing_expected_state
attribution:
  policy: 0.35
  environment: 0.25
  verifier: 0.40
training_action:
  policy_steps: [6, 7, 8]
  excluded_steps: [11, 18]
decision: replay_with_fixed_environment
~~~

策略错误可以进入训练样本，环境超时要进入鲁棒性评测，验收器错误则先修测试或状态检查。三分账不是为了给每类事件精确到小数点，而是防止把基础设施故障和模型决策混成同一种惩罚，导致策略学会回避本来应该完成的任务。

![Agentic RL 责任三分账：策略错误、环境事件和验收器事件分开处理](/images/notes/agentic-rl-credit-assignment/credit-split-card.svg)

### L5：为什么不能把所有失败都当成策略负反馈？

因为超时、外部服务故障和错误验收器并不是策略动作造成的。把它们混进同一个负奖励，会让模型学到“少做事最安全”。我会先固定环境重放，确认责任归属，再把可学习的策略错误交给训练。

## 分账之后再做一次反事实动作替换

责任三分账能告诉我们“这一步属于哪类事件”，但还不能证明某个动作真的造成了结果。对可重放的状态，我会保留原动作，再替换成一个安全的候选动作，比较后续状态和最终 reward。这样得到的不是绝对真理，却比把整条轨迹的结果平均分配给每个 token 更接近可学习信号。

~~~yaml
counterfactual_credit: cfc_20260820_27
episode_id: ep_7741
state_step: 7
original_action:
  tool: billing.refund
  args_digest: sha256:bad...
  outcome: invalid_args
counterfactual_action:
  tool: billing.refund
  args_digest: sha256:fixed...
  outcome: accepted
replay_constraints:
  environment_version: sandbox-42
  tool_response_sequence: locked
  seed: 17
reward:
  original: -0.8
  counterfactual: 0.6
delta: 1.4
attribution: policy_step_7_candidate
training_action: add_pairwise_preference
~~~

替换实验要限制在无副作用沙箱或已录制的工具响应里；真正的退款、删除和发送消息不能为了估计 reward 去线上重做。若替换动作改变了后续状态，记录完整的分叉轨迹，不要只保留一个分数。对不可重放的步骤，继续沿用 `unknown`，并把它排除在高置信度训练样本之外。

![反事实动作替换：固定状态和工具响应，比较原动作与候选动作的后续 reward](/images/notes/agentic-rl-credit-assignment/counterfactual-credit-card.svg)

### L5：反事实动作比结果奖励更可靠吗？

它只在状态、环境和验收器能稳定重放时提供更强证据，不能自动变成因果真值。我会把它作为高置信度样本的一层，并保留原始轨迹、替换约束和分叉结果；无法满足重放条件时宁可降低权重，也不伪造精确归因。

## credit assignment 还要防“分叉预算不对称”

反事实替换常常比原轨迹多走一步或少一次重试，若不控制预算，reward 差异里就混进了成本和机会差。比较动作时，我会锁住可用步数、工具额度、超时和随机种子；如果候选动作需要额外预算，先把它标成不可比，不直接把更长的搜索当成更好的决策。

```yaml
counterfactual_budget_match: cbm_20260820_88
episode_id: ep_7741
original: {steps: 8, tool_calls: 3, timeout_ms: 2400, seed: 17}
counterfactual: {steps: 8, tool_calls: 3, timeout_ms: 2400, seed: 17}
delta:
  task_reward: 1.1
  cost_penalty: 0.0
comparability: pass
if_budget_mismatch: exclude_from_high_confidence
training_action: keep_pairwise_signal
```

![反事实归因预算对齐卡：原动作和替换动作锁住步数、工具额度、超时与随机种子](/images/notes/agentic-rl-credit-assignment/counterfactual-budget-match-card.svg)

### L5：为什么反事实动作多拿到成功也不一定更好？

它可能只是消耗了更多搜索、重试或工具额度。只有在相同预算和环境下比较，reward 差异才主要反映动作选择；预算不对称的分叉应降权或只用于诊断。

![反事实轨迹的归因回放：把动作、观察和结果放回同一条证据链](/images/notes/agentic-rl-react/rollout-attribution-card.svg)

## 60 秒面试回答

Agentic RL 的 credit assignment 难在长轨迹和延迟奖励。一个回合里既有搜索、代码、规划等动作，也有工具返回的观察；最终失败不代表每一步都错。

我会先用 return-to-go 和结果奖励建立基线，再把工具超时、参数错误、环境故障、验收失败分开记录。过程奖励只用于可验证的中间事实，比如测试通过或引用支持，不把启发式分数当成目标本身。对同一状态采样多条轨迹时，可以用组内相对优势降低方差，但要固定环境版本和随机性。

另外，观察 token 不参与策略梯度，只更新模型自己生成的动作。训练前抽样做责任分析：策略错、环境错、验收器错分别处理。这样 credit assignment 才不是把一个 0 平均撒给二十步。

## 参考资料

1. The Landscape of Agentic Reinforcement Learning for LLMs: A Survey (https://arxiv.org/abs/2509.02547)
2. Let's Verify Step by Step (https://arxiv.org/abs/2305.20050)
3. Search-R1: Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning (https://arxiv.org/abs/2503.09516)
4. DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models (https://arxiv.org/abs/2402.03300)
5. From Reasoning to Agentic: Credit Assignment in Reinforcement Learning for Large Language Models (https://arxiv.org/abs/2604.09459)
6. Beyond Trajectory-Level Attribution: Graph-Based Credit Assignment for Agentic RL (https://arxiv.org/abs/2605.26684)

## AgentAlpha 大模型 Agent 训练营

AgentAlpha 的路线从 RAG、记忆系统、单 Agent、多 Agent、DeepSearch、高效推理、Code Agent、自进化编码，推进到第 9 阶段的 Agentic RL 和最后的综合项目。

Agentic RL 阶段已经确认的内容包括 Search-R1、GRPO / PPO、奖励函数和搜索触发；阶段交付是一份小规模问答或推理任务上的 RL 微型实验报告。课程按周任务、作业检查、代码 Review 和项目验收推进，完成项目后再继续打磨 README、技术报告、简历项目段落和面试讲法。

查看 AgentAlpha 大模型 Agent 训练营 (https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb)

如果你只想先看路线图，发「路线」；想判断自己适合从哪个项目开始，发「项目」；正在准备面试，发「追问」。

把每一步写清楚，模型才知道下一步该改哪里。下篇见。
