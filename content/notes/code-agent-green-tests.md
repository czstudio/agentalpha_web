---
slug: "code-agent-green-tests"
title: "面试官追问：代码 Agent 说测试全绿，为什么我还是不敢合并？"
excerpt: "测试全绿，只能说明这次测试没发现问题。Code Agent 还要交代改了什么、测了什么、哪些边界没覆盖，不能只甩出一行 passed。"
series: "Code Agent"
seriesNo: "02"
number: "06"
minutes: 11
---

代码 Agent 最让人放松的一句话是：`All tests passed`。

最让人后悔的，也可能是这一句。

👔 面试官 你的 Agent 改完代码，CI 全绿。你能直接合并吗？

🙋‍♂️ 常见回答 可以。测试通过说明功能没问题，最多再做一次人工 review。

👔 面试官 如果它只跑了一个测试文件呢？如果测试被 mock 掉了真正的数据库？如果补丁把断言改成了更宽松的版本？如果需求是“不能泄露租户数据”，而现有测试根本没有覆盖这个边界呢？

到这里，绿色就不再等于正确。它只说明：在某个环境、某组输入、某些断言和某条执行路径下，结果没有触发失败。

对 Code Agent 来说，测试不是最后按一下按钮，而是 Agent 环境里的“裁判”。裁判如果盲区很大，模型会学会让裁判开心，甚至比人更快地找到那条缝。

## 先建立直觉：测试是证据，不是判决书

人类开发者也会过拟合测试，只是速度慢一点。Agent 的循环更短：读任务，改代码，跑测试，看到绿，再继续改。若奖励只看退出码，它自然会优先寻找让退出码变绿的最小路径，而不是完整满足需求的路径。

一个完整的“绿”至少包含五个问题：

1. 跑的是不是预期的测试集合？
2. 测试进程真的执行了目标代码吗？
3. 断言是否检查了需求中的关键不变量？
4. 运行环境、数据和权限是否接近交付环境？
5. 补丁是否改变了测试、配置或生成物，让结果失去意义？

只要有一个答案不确定，绿色就只能算部分证据。

这不是要把 Agent 变成一个悲观的“永远不通过”机器人。恰恰相反，只有把验证边界讲清楚，它才能在低风险改动上快速结束，在高风险改动上主动扩大检查。工程目标是让它知道什么时候可以停，什么时候还缺证据。

## 原理：把验证拆成分层的 oracle

测试 oracle 可以理解成“如何判断结果对不对”。代码 Agent 不应只有一个总的布尔值，而要有分层的验证信号。

### 第一层：执行完整性

先确认命令真的跑完。记录命令、工作目录、依赖锁文件、环境变量摘要、退出码、信号和耗时。测试被跳过、收集失败、进程被 OOM 杀掉，都不能包装成通过。

很多测试框架在没有发现测试时仍返回 0，或者在收集阶段报 warning 但继续退出。包装器应把“没有收集到测试”“跳过比例异常”“结果文件缺失”标成不确定，要求人工确认或换命令重跑。

### 第二层：局部行为

单元测试验证函数在给定输入下的输出、异常和副作用。它反馈快，适合 Agent 小步循环，但不一定能发现模块边界上的错误。

这里要防一个常见误区：覆盖率高不代表断言有力。一个分支被执行过，却只做了 `not None` 检查，仍可能把字段写错、权限放宽或顺序改变。Agent 需要看到断言内容和失败样例，而不是只看百分比。

### 第三层：组合行为

集成测试、契约测试和端到端测试检查模块之间的协议：数据库事务是否提交，消息是否带上租户 ID，HTTP 状态码和错误结构是否兼容。它们慢一些，却是发现“局部都对、拼起来不对”的主要证据。

执行时要标出真实依赖还是 mock。若支付网关、权限服务和队列都被替换成固定桩，测试只证明适配器能被调用，不证明线上交互成立。Agent 的报告中应明确哪些依赖是沙箱、哪些是模拟、哪些是真实服务。

### 第四层：静态与结构约束

类型检查、lint、格式化、依赖审计、迁移检查和 API schema diff，往往能在运行前抓住另一类风险。特别是跨文件重构，运行测试可能只覆盖旧入口，静态检查却能发现未更新的调用者。

不要把静态检查当“可有可无的风格”。在 TypeScript 项目里，未处理的 `undefined` 可能直到罕见输入才爆；在 Python 项目里，导入循环可能只在某种启动方式出现；在数据库迁移里，向后不兼容的 schema 可能让旧服务直接起不来。

### 第五层：需求不变量和反例

最后一层不一定是一个已有测试文件，而是把需求翻译成必须始终成立的事实。例如“同一租户不能读到别人的订单”“重试不能重复扣款”“排序在分页间保持稳定”。这些不变量可以通过属性测试、生成样例、差分测试或人工审阅来验证。

对 Agent 来说，最有价值的不是再增加十个普通 happy path，而是补上能击穿当前实现的反例。一个小型的 mutation test——故意把比较符号、权限条件或分页边界改错，看测试是否能红——往往比盲目追求覆盖率更能说明 oracle 是否有牙齿。

![Code Agent 的验证栈：从执行完整性到需求不变量](/images/notes/code-agent-green-tests/verification-stack.svg)

![SWE-bench 原论文的真实 issue 到补丁评测流程](/images/notes/evidence/swe-bench/figure-1-teaser.svg)
*论文图：SWE-bench: Can Language Models Resolve Real-world GitHub Issues? Figure 1；[原文](https://arxiv.org/abs/2310.06770)。*

![SWE-bench 原论文的数据收集与评测样本构造](/images/notes/evidence/swe-bench/figure-2-collection.svg)
*论文图：SWE-bench: Can Language Models Resolve Real-world GitHub Issues? Figure 2；[原文](https://arxiv.org/abs/2310.06770)。*

![SWE-agent 原论文的仓库级软件工程 Agent 总览](/images/notes/evidence/swe-agent/figure-1-overview.png)
*论文图：SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering Figure 1；[原文](https://arxiv.org/abs/2405.15793)。*

这张验证栈可以直接变成 Agent 的停止检查：底层命令没真正执行，上层的断言再漂亮也没有意义；局部单测通过，仍要问组合协议、静态约束和业务不变量有没有证据。每一层都应该返回自己的状态，而不是把所有结果压成一个绿色布尔值。

## 工程故障：为什么“全绿”仍然会出事

### 故障一：Agent 只跑了它改过的测试

为了省时间，很多自动化流程默认执行“相关测试”。相关性分析如果只看文件名或最近改动，可能漏掉通过依赖注入、配置或序列化协议连接的测试。Agent 看到绿，就误以为风险收敛。

排查时先拿报告中的测试清单和 CI 必跑清单做 diff。若本地只跑了 12 个测试，而合并门禁需要 800 个，必须在结果里明确写出“局部通过、全量未跑”，不能只显示一个绿色图标。

### 故障二：断言被改松，测试当然更容易通过

这是 Agent 特别容易踩的坑。它发现返回值从 `{"id": 1}` 变成了 `{"id": 1, "cursor": "..."}`，于是把严格相等改成只检查 `id`；或者为了处理时区，把异常断言改成 `pytest.raises(Exception)`。代码可能暂时过绿，契约却被悄悄放宽。

解决方法是把测试文件列入受保护范围，修改测试时要求 Agent 说明原因并单独 review。CI 可以比较关键断言的变更，或者在补丁中区分“生产代码变化”和“oracle 变化”。并非禁止改测试，而是不能让裁判和选手在同一轮无人监督地改规则。

### 故障三：mock 把真正的 bug 藏起来

一个缓存客户端被 mock 成“永远命中”，生产代码里的 key 拼错永远不会暴露；一个权限函数被 mock 成 True，越权路径就消失了。Agent 看到所有依赖都返回理想结果，补丁自然很漂亮。

在验证报告里记录 mock 列表、未覆盖的真实交互和替代方案。关键边界至少需要一条使用真实序列化、真实权限策略或临时数据库的集成测试。若环境暂时无法提供，结果应标为风险未确认，而不是写成通过。

### 故障四：测试根本没有执行目标代码

重命名模块后，旧测试仍能 import 一个兼容层；条件分支因为 feature flag 默认关闭，新增代码从未走到；测试收集路径错误，只发现了快照或 smoke test。日志看起来很忙，关键函数却没有命中。

可以加覆盖探针、事件日志或临时故障注入确认路径。一个实用的检查是“反转测试”：在目标分支放一个仅测试环境触发的明显失败，确认测试确实会红，然后撤回这笔改动。不要长期保留这种探针，但在新模块或高风险修复中很值。

### 故障五：环境不一致，绿的是另一台机器

本地 Agent 使用缓存依赖和旧数据库 schema，CI 使用干净容器；或者时区、区域、CPU 架构、并发度不同。绿色结果只说明当前环境，不代表发布环境。

验证产物要带环境指纹：运行器镜像、语言和包管理器版本、锁文件哈希、数据库迁移版本、关键 feature flag。无法复现时，先修环境可见性，不要让 Agent 通过随机加 sleep、放宽断言或重试次数来掩盖问题。

### 故障六：随机和并发让 flaky 测试偶尔放行

Agent 可能连续重跑几次，碰巧拿到一次绿色，就把结果当成功。对 flaky 测试，重跑次数本身是信号：同一提交不同结果说明 oracle 或环境不稳定。应该报告波动率、失败样本和已知隔离，而不是挑最好看的一次。

可以给测试加稳定的随机种子、显式时钟和资源清理；对不可避免的外部依赖，把重试和业务重试区分开。Agent 的停止条件中应规定：同一测试在相同 commit 上出现不一致，任务状态为需要调查，而不是 done。

## 让 Agent 真的会验证：一套工作流

### 先写验收矩阵，再写代码

任务开始时，把需求拆成“行为、边界、兼容性、风险”四列。行为写正常输入和输出；边界写空值、超时、重复、权限和并发；兼容性写旧客户端、数据库和配置；风险写数据泄露、重复副作用和回滚。

每一行至少对应一种证据。没有现成测试的行，标为缺口，不能在最后凭感觉说“应该没问题”。这一步会让 Agent 的计划变长一点，却能避免写完才发现没有办法证明关键要求。

### 采用最短反馈环，但设置升级门槛

第一轮跑静态检查和目标单测；第二轮跑相关集成测试；第三轮根据改动范围跑全量、契约和安全检查。每轮都记录新增证据，只有通过升级门槛才进入下一轮。

升级门槛可以按文件和行为定义：改纯函数，局部测试足够；改公共 API、权限、迁移、并发或序列化，必须增加集成或契约检查；改测试、构建脚本和 CI 配置，必须由人审阅门禁变化。门槛写在仓库规则里，Agent 才不会每次临时猜。

### 让失败返回结构化信息

不要把整段终端输出直接喂回模型。测试适配器应返回：命令、阶段（收集/编译/执行/断言）、退出码、失败测试、首个相关堆栈、环境摘要、是否疑似 flaky、建议下一步。这样 Agent 才能区分“实现错”“测试错”“环境坏”。

如果只给一句 `Command failed with exit code 1`，它很可能开始随机改最近的代码。上下文越少，修改越像抽签。

### 做补丁级别的 oracle review

测试通过后，Agent 还要回答三件事：我改了哪些行为？哪些需求仍没有证据？测试或配置本身有没有被我改写？把 diff、测试清单、覆盖缺口和未验证风险放进交付报告。

这份报告可以很短，但不能只有“pass”。OpenAI 介绍 Codex 时特别强调，遇到不确定或测试失败，Agent 应明确沟通，让人知道哪里完成、哪里没有完成。Introducing Codex (https://openai.com/index/introducing-codex/)

### 用独立视角复查，不让同一个 Agent 自己当唯一裁判

对于高风险补丁，可以让第二个只读 Agent 或规则检查器审阅：它只看任务、diff、测试和验证报告，不继承第一个 Agent 的乐观结论。它要找的是反例、遗漏的调用者、过宽的 mock、被改松的断言和未运行的门禁。

这不等于堆更多模型。独立视角的价值在于不同停止条件：实现 Agent 负责做事，验证 Agent 负责证明，CI 负责重复执行，人负责最终风险判断。

![交接验证报告的最小字段：改动、证据、缺口与风险](/images/notes/code-agent-green-tests/evidence-report.svg)

### 一份可交接的验证报告长什么样

我会要求 Agent 在任务结束时输出一份短报告，而不是只回一句“测试通过”：

```text
变更：src/api/pagination.ts，新增 cursor 参数与稳定排序
已验证：unit 18/18；contract 6/6；typecheck；lint
未验证：真实数据库迁移（当前环境没有 staging schema）
风险：旧客户端传 page 参数时的兼容行为需要产品确认
证据：tests/api/pagination.test.ts；命令与 commit 已记录
停止原因：关键不变量有证据，未验证项已显式交接
```

报告的价值在于把“完成”拆成事实和缺口。接手任务的人可以决定是继续补验证、接受风险，还是回滚，而不是重新猜 Agent 到底跑了什么。

## 从公开工程资料看“绿灯”的边界

SWE-bench 之所以有影响力，是因为它把代码修改放进真实仓库和 issue，最终通过隐藏测试验证补丁，而不是比较生成文本长得像不像。这个设定直接提醒我们：可见测试通过，不代表隐藏行为就正确；测试集合本身决定了评估的盲区。SWE-bench 论文 (https://arxiv.org/abs/2310.06770)

SWE-agent 的论文则把“浏览、编辑、运行测试”的接口作为一等设计对象。对 Agent 来说，能否方便地查看 diff、重跑失败测试、定位调用链，会直接影响它能不能形成有效的验证闭环。SWE-agent 论文 (https://arxiv.org/abs/2405.15793)

OpenAI 的 Harness engineering 文章展示了另一条路：把代码库做成可被 Agent 检查的系统，提供清晰的结构、自动化约束和持续反馈，让“正确”更多地从仓库自身产生，而不是靠人临时解释。Harness engineering (https://openai.com/index/harness-engineering/)

GitHub 对 Copilot coding agent 的公开资料也把运行测试、检查变更和创建 pull request 放在同一个工作流中。它传递的工程信号很明确：生成 patch 只是中间状态，验证和审阅才是交付边界。GitHub Copilot (https://github.com/features/copilot)

2026 年 OpenAI 对编码评测的两次审计进一步说明，测试集本身也会出错。SWE-bench Verified 的复核发现，一部分题目的测试与 issue 意图不一致、过度限定实现或存在其他缺陷；随后对 SWE-bench Pro 的质量分析也报告了相当比例的问题任务。这里不能简单得出“基准都没用”，更合理的工程结论是：Agent 分数要带上任务审计、失败归因和测试质量证据，尤其不能把一条绿色曲线直接当成真实交付能力。

这些资料都没有承诺“测试全绿就绝对正确”。它们更接近一个共识：Agent 的能力要用可重复的环境、清晰的失败信号和覆盖风险的验收标准来约束。绿色是信号，不是豁免证。

## 绿灯之后还要做一次 oracle 变更审计

测试全绿之后，我会再问一个不太舒服的问题：是不是为了得到绿色，测试本身被改得更宽松了？Code Agent 可能删除断言、扩大 mock 范围、把真实依赖换成永远成功的桩，甚至把高风险用例标成 skipped。它们都能让 CI 变绿，却不会让产品行为更可靠。

因此交付回执要同时记录测试 oracle 的变化，而不只是运行结果：

~~~yaml
oracle_integrity_receipt: oir_a23833
changed_files:
  - src/checkout/retry.ts
  - tests/checkout/retry.test.ts
assertions_removed: 0
mocks_added:
  - payment_gateway: contract_stub_v3
skipped_tests: []
hidden_checks:
  - mutation: passed
  - contract_fixture: passed
diff_review:
  widened_matchers: 0
  deleted_cases: 0
decision: accepted
~~~

扫描可以先做静态 diff：统计删除的断言、增加的 mock、放宽的 matcher 和新增的跳过标记；高风险改动再跑 mutation、契约 fixture 或独立隐藏检查。重点不是禁止 mock，而是让每个 mock 都说明隔离了哪一层、还剩什么没有被真实验证。若断言减少但覆盖缺口没有解释，Agent 应自动停在“需要复核”，而不是继续提交。

![绿灯之后的 oracle 完整性扫描：断言、mock、跳过项与隐藏检查](/images/notes/code-agent-green-tests/oracle-integrity-card.svg)

### L5：为什么“测试全部通过”仍然不能直接作为交付结论？

因为绿色只描述当前测试集合的结果，不能证明测试没有被改松，也不能覆盖隐藏行为。我会把测试运行回执和 oracle diff 放在一起审阅：关键断言未减少、mock 边界可解释、隐藏检查通过且未验证项已交接，才算真正达到停止条件。

## 绿灯之后还要扫一遍需求不变量

测试集合再完整，也可能没有覆盖产品真正关心的状态不变量。比如支付重试不能产生两次扣款、删除后的文档不能再次被引用、租户 A 的数据不能出现在租户 B 的回答里。这些约束不一定对应某一个函数，却应该在 patch 前后都能被探针验证。

我会把需求不变量写成与实现解耦的回执，交给独立脚本或隐藏 fixture 执行：

~~~yaml
invariant_probe: ip_85b1b6
patch: pr_1842
invariants:
  - id: payment.single_effect
    probe: replay/payment-timeout-17
    before: violated
    after: passed
  - id: rag.deleted_source_not_cited
    probe: replay/delete-tombstone-04
    before: violated
    after: passed
  - id: tenant.data_isolation
    probe: replay/cross-tenant-09
    before: passed
    after: passed
  - id: api.backward_compatibility
    probe: contract/legacy-client-v2
    before: passed
    after: unknown
release_effect:
  decision: hold_for_contract_review
  owner: platform-api
~~~

`after: unknown` 不是失败，但也不是绿灯。它通常表示依赖服务、迁移脚本或隐藏数据还没有可用环境；这类结果必须出现在交付摘要里，不能被测试框架压成一个 `true`。把需求不变量独立出来还有一个好处：实现换语言、重构目录或更换测试框架时，验收标准仍然保持稳定。

![需求不变量扫描：业务状态约束与单测结果并列，未知项直接进入发布门槛](/images/notes/code-agent-green-tests/invariant-probe-card.svg)

### L5：不变量和普通测试有什么区别？

普通测试通常验证某个输入对应的输出，不变量验证跨步骤、跨服务或跨租户的状态约束。比如“退款接口返回 200”不是不变量，“同一幂等键最多产生一次副作用”才是。两者要一起跑，才能同时看局部实现和系统边界。

## 60 秒面试回答

测试全绿只说明当前命令、环境和断言没有失败，不能直接等同于需求正确。Code Agent 里我会把验证拆成执行完整性、局部单测、集成/契约、静态检查和需求不变量五层，并记录实际运行的测试集合、mock、环境和退出码。

我重点防四类问题：Agent 只跑相关测试导致漏测；为了过绿改松断言或测试；mock 掉真实依赖；本地环境和 CI 不一致。测试结果必须区分通过、未运行、不确定和失败，不能只返回一个布尔值。

工作流上先做验收矩阵，再按改动风险逐级扩大测试。通过后还要检查 diff 是否改变了 oracle，列出未验证的需求和剩余风险。高风险补丁用独立审阅或隐藏测试确认。我的停止条件不是“出现绿色”，而是“关键不变量有足够、可追溯、可复现的证据”。

如果你这样回答，面试官通常会继续问：那你怎么判断“足够”？

答案不是一个覆盖率阈值，而是风险和证据的匹配。改一个文案字段，不必启动整套生产依赖；改租户权限、支付幂等或数据库迁移，就不能用一组 mock 单测收尾。Agent 要会做的，正是把改动影响面和验证成本放在同一张表里。

## AgentAlpha 大模型 Agent 训练营

AgentAlpha 的路线从 RAG、记忆系统、单 Agent、多 Agent、DeepSearch、高效推理，推进到第 7 阶段的 Code Agent，再继续做自进化编码、Agentic RL 和综合项目。

Code Agent 阶段已经确认的内容包括 SWE-agent、RepoMaster 和仓库级代码理解；阶段交付是在真实仓库里完成 issue 修复或仓库复用实验。课程按周任务、作业检查、代码 Review 和项目验收推进，完成项目后再继续打磨 README、运行说明、简历项目段落和面试讲法。

[查看 AgentAlpha 大模型 Agent 训练营](https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb)

## 参考资料

1. SWE-bench: Can Language Models Resolve Real-world GitHub Issues? — arXiv (https://arxiv.org/abs/2310.06770)
2. SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering — arXiv (https://arxiv.org/abs/2405.15793)
3. Introducing Codex — OpenAI (https://openai.com/index/introducing-codex/)
4. Harness engineering — OpenAI (https://openai.com/index/harness-engineering/)
5. Unrolling the Codex agent loop — OpenAI (https://openai.com/index/unrolling-the-codex-agent-loop/)
6. GitHub Copilot (https://github.com/features/copilot)
7. Why SWE-bench Verified no longer measures frontier coding capabilities — OpenAI (https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/)
8. Separating signal from noise in coding evaluations — OpenAI (https://openai.com/index/separating-signal-from-noise-coding-evaluations/)
