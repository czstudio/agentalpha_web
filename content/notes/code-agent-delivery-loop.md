---
slug: "code-agent-delivery-loop"
title: "Code Agent 怎样把一句需求稳稳做成补丁？"
excerpt: "可靠的 Code Agent 不会把一句需求直接变成一大段代码，而是先拆成可验证的任务，沿仓库证据小步修改，最后分层验收，证明补丁真的能交付。"
series: "Code Agent"
seriesNo: "02"
number: "49"
minutes: 27
---

“把这个接口加上批量导出，顺便修一下权限问题。”产品经理说的是一句话，Code Agent 面对的却是好几个需要确认的动作。

如果 Agent 立刻打开 `export.ts` 开始写，通常会卡在三个问题上：“批量”是同步还是异步？权限在中间件还是业务层？验收看文件下载、任务状态还是审计记录？最后补丁也许能编译，人却不敢合并。

## 先给一个能复述的答案

一个可靠的 Code Agent 要把交付拆成五段：理解需求并声明假设、建立仓库上下文、拆成可回滚的小任务、逐步修改并运行最短反馈测试、用验证矩阵和 diff 交接。模型负责提出实现，仓库和测试负责提供事实，人负责高风险边界的最终判断。关键不是让 Agent 一次写更多，而是让每一个中间状态都能被检查。

![从需求到补丁的五段交付闭环](/images/notes/code-agent-delivery-loop/delivery-loop.svg)

## 第一步：把一句话改写成任务合同

需求里常见的词都需要落地。比如“批量导出”至少要问：单次上限多少？是否异步？重复提交会不会创建多个任务？导出的字段能否跨租户？下载链接有效多久？

我会先生成一份任务合同，而不是直接生成代码：

```text
目标：给订单查询增加批量导出
范围：API、任务表、worker、下载凭证、审计事件
不变式：只能导出当前租户数据；同一 idempotency_key 不能重复创建任务
未知：同步上限、文件格式、链接有效期
验收：契约测试、权限测试、重复提交测试、真实文件下载检查
```

未知项不能让模型偷偷补成“合理默认值”。如果暂时问不到人，就把假设写进计划，再给每个假设配一条验证动作。

## 第二步：按证据建立仓库地图

仓库阅读不等于把目录树全塞进上下文。先找入口、调用者、状态所有者、对应测试和运行命令，再补相似实现。一个简化的候选评分可以写成：

```text
score = 入口命中 + 符号调用关系 + 测试关联 + 配置关联
        - 生成文件惩罚 - 废弃目录惩罚 - 超大文件惩罚
```

得到候选后，Agent 应输出“为什么读它”：`src/export/router.ts` 是入口，`src/export/job.ts` 持有状态，`tests/export/permission.test.ts` 覆盖租户边界。这样人可以在写代码前发现它是否读错模块。

![任务拆分把需求映射到入口、状态、测试和交付物](/images/notes/code-agent-delivery-loop/task-breakdown.svg)

## 第三步：把大任务切成能回滚的补丁

一个任务最好有明确的依赖顺序：先定义数据和接口契约，再加纯函数，再接入副作用，最后接入异步 worker 和下载链路。每一步都要有停止条件。

```python
steps = [
    {"id": "contract", "done_when": "schema 和错误码通过契约测试"},
    {"id": "domain", "done_when": "权限与幂等纯函数有单测"},
    {"id": "storage", "done_when": "迁移可前进也可回滚"},
    {"id": "worker", "done_when": "任务状态机能恢复"},
    {"id": "delivery", "done_when": "下载和审计证据完整"},
]
```

如果某一步同时改了 API、数据库和测试，失败时很难知道是哪条假设错了。小补丁的价值不是好看，而是让恢复、回滚和责任归因变得便宜。

## 修改时让 Agent 只拥有当前步骤的权限

规划阶段可以读仓库，编辑阶段只开放目标文件和必要测试，验证阶段开放命令但不开放继续改生产代码的权限。每一轮回写：修改文件、运行命令、结果摘要、未解决问题。

```python
def run_step(step, ctx):
    plan = make_plan(step, ctx.evidence)
    patch = apply_patch(plan, allowed_paths=step.allowed_paths)
    result = run_checks(step.checks)
    return {
        "patch": patch.summary,
        "checks": result.compact(),
        "open_questions": collect_unknowns(ctx),
    }
```

工具层应拒绝越过允许路径的写入，也应拒绝把测试改绿当成验证完成。测试和构建配置属于裁判，不应和业务代码一起无人复核地改变。

## 验收不是“测试通过”四个字

我会把交付证据放进一张矩阵：

| 要求 | 证据 | 状态 |
| --- | --- | --- |
| 只读当前租户 | 跨租户拒绝测试、策略日志 | 已验证 |
| 重复提交不重复建任务 | 幂等键集成测试 | 已验证 |
| 大文件异步生成 | worker 状态机、超时重试 | 已验证 |
| 下载链接过期 | 时间边界测试 | 待验证 |
| 审计可追溯 | request_id 与 provider_ref | 已验证 |

未验证项必须留在交接里，不能被“相关测试都绿了”覆盖。Code Agent 的停止条件应是“关键不变式有证据”，不是“模型觉得差不多”。

![补丁验收把 diff、命令、证据和未验证风险放在一起](/images/notes/code-agent-delivery-loop/patch-verification.svg)

## 四个常见失败

### 任务拆得很细，但没有依赖顺序

五个小任务如果同时改同一张表，最后仍然是一大团冲突。拆分时要标出输入、输出和前置条件，优先让纯函数和契约先稳定。

### Agent 只看成功路径

批量导出最容易漏掉权限、取消、重复、过期和部分失败。每个副作用都至少配一个反例；没有反例的“完成”只能算草稿。

### 把环境故障改成业务修复

数据库连不上、依赖缓存损坏、测试收集不到，都不是随机修改业务代码的理由。报告中要区分实现失败、测试失败和环境失败。

### 交接报告只有一句 pass

最小报告应包含改动范围、已运行命令、测试集合、未验证项和风险。接手的人要能用它决定继续验证还是接受风险，而不是重新猜 Agent 做过什么。

## 交接包要让另一个人接着跑

ARIS 式的面试复盘不止给出一条“正确流程”，还要让读者能从零复现。Code Agent 的交接包至少包含以下五件东西：

| 物件 | 内容 | 验收问题 |
| --- | --- | --- |
| 任务合同 | 目标、不变式、未知项 | 是否把假设写出来？ |
| 证据图 | 入口、调用者、状态、测试 | 每个结论能回到文件吗？ |
| 补丁清单 | 文件、原因、依赖、回滚 | 能否局部撤销？ |
| 验证矩阵 | 命令、样本、结果、环境 | 绿色是否真的覆盖风险？ |
| 未决清单 | 未验证项、负责人、截止点 | 接手者知道下一步吗？ |

交接记录建议固定成机器可读格式，避免 Agent 把“我认为完成”写成事实：

```json
{
  "task_id": "export-2025-08",
  "patch": {"files": ["src/export/job.ts"], "rollback": "revert:abc123"},
  "checks": [{"name": "tenant-boundary", "status": "pass", "evidence": "run-81"}],
  "open_risks": [{"risk": "download expiry", "owner": "human", "next": "add time-boundary test"}]
}
```

如果验证命令因环境故障没有跑起来，状态就应是 `blocked`，不能写成 `pass`。这条纪律能显著减少“测试全绿但人不敢合并”的灰色地带。

![Code Agent 交接包由任务合同、证据图、补丁清单、验证矩阵和未决风险组成](/images/notes/code-agent-delivery-loop/handoff-package.svg)

## 用最短反馈闭环控制上下文

每一步不要把全部仓库和全部日志重新塞给模型，而是只回写三类信息：改了什么、哪条检查失败、哪些假设仍未验证。编译错误可以直接修复，权限越界和数据迁移则应该停下来请求人工判断。

```text
计划 -> 小补丁 -> 最短测试 -> 证据摘要
  ↑                         │
  └────── 失败归因 / 回滚 ────┘
```

当连续两轮修复没有让失败层级变化时，应停止自动编辑，重新检查任务合同和仓库地图。继续随机改文件只会扩大 diff，降低定位能力。

## 补丁也要有状态机，而不是一条绿色流水线

我会把每个补丁标成 `planned → editing → checked → reviewed → releasable`。任何一步遇到环境故障、权限变化或关键断言缺失，都进入 `blocked`，不能沿用上一次的绿色状态。

```json
{
  "patch_id": "export-2026-17",
  "state": "checked",
  "changed": ["src/export/job.ts", "tests/export/idempotency.test.ts"],
  "checks": {"unit": "pass", "tenant_boundary": "pass", "download_expiry": "blocked"},
  "next": "add time-boundary fixture",
  "rollback": "revert patch-17"
}
```

![Code Agent 补丁从计划、修改、验证到人工放行的状态机](/images/notes/code-agent-delivery-loop/patch-gate.svg)

状态机的价值在于“部分完成”可见：接手者知道哪些可以继续，哪些必须先补证据。它也能防止 Agent 把“命令没跑起来”误写成“测试通过”。

## 用反事实实验检查补丁到底解决了什么

如果一个权限 bug 被修好，至少做一次反事实：只撤掉权限过滤，测试应重新失败；只保留权限过滤、撤掉缓存隔离，越权样本也应失败。这样的对照比多跑十次正常样本更能说明修复确实命中了根因。

## 一份可交接的补丁证明应该长什么样

补丁交给下一个人时，最有用的不是“已完成”，而是一张能沿着命令重新走一遍的证明单。它把任务合同、改动范围、验证命令和未决风险固定在同一个版本里：

```yaml
patch_id: export-batch-017
base_revision: 4f9c2a1
changed:
  - src/export/job.ts
  - src/auth/tenant-policy.ts
invariants:
  - "跨租户请求不能读取导出文件"
  - "重复提交只产生一个 job_id"
checks:
  - command: pnpm test export -- --runInBand
    result: pass
    evidence: artifacts/test-export-017.json
  - command: pnpm test auth:cross-tenant
    result: pass
    evidence: artifacts/auth-boundary-017.json
blocked:
  - "生产对象存储的断点续传尚未压测"
rollback: "revert patch_id=export-batch-017"
owner: "@engineer-a"
```

`blocked` 不是失败的遮羞布，而是交接状态。接手者看到它，就知道下一步是补压测、换环境还是先关闭开关；没有这个字段，绿色测试很容易被误读成“所有风险都已覆盖”。

![补丁证明单把变更、不可变条件、命令证据和阻塞项连成可交接记录](/images/notes/code-agent-delivery-loop/patch-proof.svg)

## 交接前再跑一遍最短 smoke replay

补丁证明单记录了作者跑过什么，但真正的交付验收还要让接手者在干净工作区跑一条最短路径。把环境、命令、预期和实际产物固定成 smoke replay：

```yaml
smoke_replay: sr_patch_017
workspace: clean@4f9c2a1
setup: pnpm install --frozen-lockfile
steps:
  - command: pnpm test export -- --runInBand
    expect: "job_id only once"
  - command: pnpm test auth:cross-tenant
    expect: "403 + audit event"
artifacts:
  success: artifacts/smoke-success.json
  failure: artifacts/smoke-cross-tenant.json
handoff:
  owner: "@engineer-b"
  max_minutes: 12
  result: pass
```

`workspace` 防止接手者在作者残留缓存里得到假绿；`expect` 写行为而不是只写退出码；`artifacts` 让结果能被复核。smoke replay 失败时，交接状态保持 `blocked`，不能因为作者机器上跑过一次就标记完成。

![补丁交接 smoke replay：在干净工作区重跑关键成功与失败路径](/images/notes/code-agent-delivery-loop/smoke-replay-card.svg)

## smoke replay 之后还要做一次“权限缩小回放”

smoke replay 证明补丁能在干净工作区跑通，却没有证明 Agent 只改了交接单里允许的文件。交接前再开一轮最小权限回放：给 worker 只读的仓库上下文、限定的写入目录和明确的命令白名单，故意加入一次越界写入和一次越界测试命令，确认沙箱会拒绝并留下审计记录。

~~~yaml
least_privilege_replay: lpr_20260820_44
workspace: /repo/checkout
allowed_paths: [src/agent, tests/agent]
denied_paths: [infra/prod, secrets, .git/hooks]
scenarios:
  expected_patch: pass
  forbidden_file_write: blocked
  test_command_outside_scope: blocked
decision: handoff_safe
~~~

权限缩小回放的验收点不是“所有命令都失败”，而是目标补丁仍能完成、越界动作被拒绝、拒绝原因可追溯。这样交接人拿到的是一个可复核的最小能力包，而不是一份“在拥有全部权限的机器上跑过”的截图。

![权限缩小回放：交接前同时验证目标补丁与越界动作](/images/notes/code-agent-delivery-loop/least-privilege-replay-card.svg)

### L5：为什么 smoke replay 通过，仍不能证明交接安全？

因为 smoke replay 只覆盖行为正确性，权限缩小回放才覆盖能力边界。一个拥有生产凭据的 worker 即使测试全绿，也可能把调试动作带到错误环境；两次回放要分别回答“能不能完成”和“只能完成什么”。

### L5：smoke replay 和完整回归有什么关系？

smoke replay 是交接门槛，不替代完整回归；它用最短路径确认环境、关键不变量和证据链可复现。通过后再跑完整测试，失败时也更容易知道是环境问题还是补丁问题。

## L5：怎样判断交付包是真的“可接手”？

让一个没有参与实现的人只拿交接包，在干净工作区重跑最短验证路径：他应能找到修改原因、复现至少一条关键成功和失败样本、看懂未决风险，并知道如何回滚。若必须依赖作者口头补充环境变量、隐含假设或“这条测试先别看”，交付包就还不完整。

## L1 / L2 / L3 追问

**L1：** Code Agent 为什么要先拆任务？

因为一句自然语言需求同时包含目标、边界、未知项和验收条件。先拆分可以让每一步有证据和回滚点，避免模型把假设直接写进生产代码。

**L2：** 如何决定拆到多细？

以“失败是否能局部归因、改动是否能单独回滚、验收是否能在几分钟内完成”为标准。跨越数据库、权限、并发或公共接口的步骤要更小。

**L3：** 多个 Agent 协作会更快吗？

只有在文件边界和验证责任清晰时才会更快。可以让一个 Agent 读仓库建证据包，另一个做补丁，第三个只读审验；共享的是版本化事实，不是互相复制聊天记录。

**L1：** 为什么不能让 Agent 自己修改测试？

测试是交付的裁判。业务实现可以和测试一起提交，但放宽断言、删除失败样本或修改配置来换绿色必须单独标记并人工确认。

**L2：** 如何防止 Agent 把生成文件当成源码？

仓库地图给路径打角色标签，候选评分对生成目录和废弃目录降权；编辑阶段只允许任务合同列出的源码与测试路径。

**L2：** 迁移失败时先回滚代码还是数据库？

先确认迁移是否已产生不可逆数据，再按兼容窗口选择回滚应用、前向修复或人工停机。不能把数据库回滚当成普通文件撤销。

**L3：** 如何验证 Agent 没有越过租户边界？

用跨租户夹具、策略日志和真实查询链路三层验证，并检查缓存键、导出任务和下载凭证是否都携带租户上下文。

**L3：** 什么情况下应立即停止自动修复？

连续修复没有改变失败层级、涉及生产数据迁移或权限策略、测试环境与生产行为不一致时，应输出未决风险并转人工，而不是继续扩大 diff。

**L2：** 怎样评价一个补丁是否“足够小”？

看失败能否局部归因、提交能否单独回滚、测试能否在短时间反馈，以及是否混入无关重构；行数不是唯一标准。

**L1：** 交接报告最少写哪些字段？

改动文件与原因、已运行命令、证据链接、未验证项、风险负责人和下一步。没有这些信息，接手者仍要重新猜测。

**L4：** 为什么要保存 `blocked`，而不是等所有检查完成再汇报？

因为部分证据本身就是交付状态。把环境故障或未覆盖风险标成 `blocked`，接手者才能准确决定补测试、换环境还是回滚，而不会误把半成品合并。

**L5：** 如何证明一个补丁修的是根因而不是让测试变绿？

为关键不变式设计反事实实验：撤掉负责保护的步骤时样本应失败，保留它时应通过；同时检查 diff 没有删除失败样本、放宽断言或修改裁判配置。

## 交付报告要把“完成”和“可信”分开

一个补丁可以功能完成，却还不具备合并条件。例如主流程通过了，但权限缩小、重复执行或旧版本兼容没有证据。交接报告最好把每一项拆成状态、证据和剩余风险，接手的人一眼就能知道下一步该跑什么，而不是重新猜测上一个 Agent 做过什么。

```yaml
handoff:
  patch: "fix/tool-timeout"
  status: ready_for_review
  verified:
    - {claim: timeout_returns_typed_error, evidence: test/tool_timeout.spec.ts}
    - {claim: retry_is_idempotent, evidence: replay/duplicate-call.json}
  not_verified:
    - {claim: old_client_compatibility, reason: "fixture 不完整"}
  rollback: "revert 4c91e2 或关闭 feature flag tool_timeout_v2"
  next_owner: "reviewer: platform-runtime"
```

![交付报告分层卡](/images/notes/code-agent-delivery-loop/handoff-confidence-card.svg)

这里的 `not_verified` 不是失败记录，而是防止团队把未知误读成已验证。若某项风险会影响发布，就应把状态降为 blocked；如果只影响后续优化，可以保持 ready_for_review，但要写明负责人和截止条件。交接包同时保存环境指纹、命令和关键日志，才能让另一个人复跑最短路径。

### L5：为什么不能只给一串测试命令？

因为命令只能说明“当时跑了什么”，不能说明它证明了哪个不变量，也不能说明哪些路径没有覆盖。好的交付证据要把需求主张映射到测试、回放或人工检查，并允许接手者只重跑与风险相关的最小集合。

## 交接包还要带“可执行的环境指纹”

一串命令在原作者电脑上跑通，不等于接手者能得到同样结论。Code Agent 交付时，我会把 Node、Python、数据库 schema、feature flag、依赖 lockfile、测试 fixture 和关键环境变量的来源写成 manifest；秘密只记录引用名和是否已注入，不把值复制进文档。接手者先执行最短 replay，再确认输出 hash 和预期不变量。

如果 replay 结果不同，报告要区分代码 diff、依赖漂移、数据 fixture 变化和权限差异。不能用“重新装一下依赖”掩盖环境不一致，也不能让接手者直接拿生产凭证重跑。交接的目标是让另一个人能安全复现结论，而不是让他拥有更多权限。

~~~yaml
handoff_replay_manifest: hrm_20260820_66
commit: 4c91e2
runtime:
  node: 22.14.0
  python: 3.12.8
  package_lock_sha256: sha256:lock-v9
data:
  schema: db-v18
  fixture_sha256: sha256:fixture-tool-timeout-v3
flags: {tool_timeout_v2: true, strict_audit: true}
secrets:
  references: [OPENAI_API_KEY, DATABASE_URL]
  values_included: false
replay:
  command: pnpm test --filter tool-timeout -- --runInBand
  output_sha256: sha256:replay-pass-v2
  invariants: [no_duplicate_effect, audit_event_present]
decision: ready_for_handoff
~~~

![交接回放卡：运行时、fixture、flag 和输出 hash 组成可执行的交付证据](/images/notes/code-agent-delivery-loop/handoff-replay-manifest-card.svg)

## 60 秒面试回答

我不会让 Code Agent 直接从需求生成大补丁。先把需求改成任务合同，写清目标、不变式、未知项和验收；然后按入口、调用链、状态所有者和测试建立仓库上下文。实现时按契约、纯函数、副作用、恢复和交付拆成小步骤，每步限制可写范围并跑最短反馈测试。最后用验证矩阵检查权限、幂等、兼容和失败路径，报告已验证证据与未确认风险。这样 Agent 负责加速实现，代码库和测试负责提供事实，人只在高风险边界上做最终判断。

## 交付前检查清单

- [ ] 需求中的假设和未知项已写出来
- [ ] 入口、状态所有者、直接依赖和测试已闭合
- [ ] 每一步都有允许路径、停止条件和回滚点
- [ ] 权限、幂等、超时、重复和失败路径有反例
- [ ] 测试集合、环境指纹和未验证项已记录
- [ ] diff 没有混入无关重构或放宽断言

## 相关阅读

- [代码 Agent 为什么总要先读仓库，再开始写？](/notes/code-agent-repo-context)
- [面试官追问：代码 Agent 说测试全绿，为什么我还是不敢合并？](/notes/code-agent-green-tests)
- [Code Agent 跑到一半挂了，怎样恢复又不重复执行？](/notes/code-agent-resume-exactly-once)
- [Agent 评测不能只看成功率：从结果到轨迹的五层指标](/notes/agent-eval-success-rate)

## 资料来源

- AgentAlpha《Agent 岗面试宝典 v3》
- ARIS in AI Offer
