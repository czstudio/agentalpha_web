---
slug: "code-agent-repo-context"
title: "代码 Agent 为什么总要先读仓库，再开始写？"
excerpt: "给 Agent 喂仓库，要讲优先级：任务约束、代码入口、依赖关系、验证路径。读对地方，比读得多更要紧。"
series: "Code Agent"
seriesNo: "02"
number: "05"
minutes: 11
---

代码 Agent 的演示通常很顺：输入一句“给这个接口加分页”，它打开几个文件，改完，跑个测试，最后说 done。真正接手仓库，麻烦才开始。

真正的面试现场没有这么客气。

👔 面试官 你为什么让 Agent 先读仓库？模型不是已经见过很多代码了吗？把相关文件贴进 prompt 不就够了？

🙋‍♂️ 常见回答 因为 Agent 需要相关上下文，不是读得越多，生成就越准确。

👔 面试官 那整个仓库都放进去是不是最好？如果仓库有两百万行，怎么放？README 和 AGENTS.md 过期了怎么办？它读到了错误分支的测试，改错了谁负责？

这几问一出来，“上下文越多越好”就站不住了。

代码 Agent 面对的不是一道孤立的编程题，而是一套已经运行多年的约定：入口在哪里，数据从哪儿进来，谁拥有状态，哪些文件是生成的，测试应该怎么启动，改动不能碰哪些边界。模型只看到函数体，通常只能写出语法正确的局部答案；Agent 读到的是一张有约束的地图。

所以 repo context 的关键不是“喂多少”，而是“让哪几条事实在正确的时机出现”。

## 先把一个直觉改过来：仓库不是大号 prompt

第一次做 Code Agent，很多人会写一个简单的检索器：用户描述进来，向量搜索相似文件，拼成上下文，交给模型。小项目里它能跑，到了真实仓库就开始闹脾气。

相似度高，不代表修改点正确。一个名为 `UserService` 的文件可能有三个版本，真正被当前入口调用的那个只占几十行；测试文件里出现了同样的业务词，却使用了另一套 fixture；旧文档的示例还在，但实现已经迁移到新的模块。纯文本相似度会把“看起来像”的内容拿进来，却不保证依赖关系成立。

更稳的做法，是把仓库看成一组有层次的证据。

第一层是任务和硬约束：用户想改什么，不能改什么，验收命令是什么。第二层是结构：目录树、构建入口、模块边界、配置加载路径。第三层是符号和调用关系：目标函数由谁调用，它写入了什么状态，返回值被谁消费。第四层是行为证据：现有测试、日志、失败样例、issue 和最近的提交。第五层才是相似实现和历史讨论，用来补缺口。

每一层都可能推翻上一层的猜测。任务说“增加分页”，结构告诉你这是 GraphQL resolver，不是 REST controller；调用关系告诉你游标由数据库层生成；测试告诉你默认顺序必须稳定；历史提交又解释了为什么不能直接改成 offset。Agent 的工作是把这些冲突消解掉，再落一笔改动。

![仓库上下文的五层证据：任务、结构、符号、行为与历史](/images/notes/code-agent-repo-context/context-layers.svg)

这五层不是固定的阅读清单，而是一条证据优先级。任务约束决定“要解决什么”，结构决定“从哪儿进入”，符号关系决定“会影响谁”，测试与运行结果决定“现在到底怎么工作”，历史资料只在前四层无法解释时补位。面试时能把这个顺序画出来，比说“我们接了一个代码向量库”更能说明你知道检索为什么会错。

这也是为什么一个短小、明确的 `AGENTS.md` 往往比一大段自动摘要更有用。它不是替模型写答案，而是声明仓库自己的规则：从哪里开始看、用什么命令、哪些目录不能手改、完成后必须跑哪些检查。OpenAI 介绍 Codex 时，把这类文件描述成和 README 类似的仓库内指导，并明确建议写导航、测试命令和项目惯例。OpenAI：Introducing Codex (https://openai.com/index/introducing-codex/)

## 原理：把“找代码”拆成可验证的上下文构建

面试官如果继续追问，我会先画一个很朴素的循环：

```
任务 → 建立假设 → 读取结构/符号/测试 → 运行最小验证
     ↑                                      ↓
     └──────── 根据证据更新假设 ←────────────┘
```

这里的 context 不是一次性变量，而是一个会随着证据变化的工作集。它至少要满足四个条件。

### 1. 相关，但不能只靠关键词相关

入口文件、被测文件、直接依赖和对应测试，通常优先级最高。搜索器应同时利用路径、符号、导入、调用、测试映射和版本控制信息。一个实用的候选评分可以写成：

```
score = 任务词命中 + 符号/调用关系 + 测试关联 + 路径邻近 + 最近变更
        - 生成文件惩罚 - 已废弃目录惩罚 - 超大文件惩罚
```

公式本身不是重点，重点是每一项都能解释。面试里不要说“我们用了一个很强的 embedding”；要说“候选文件为什么入选，以及删掉它会漏掉哪条事实”。

### 2. 有边界，不能无限膨胀

上下文窗口再大，也不等于可以把所有内容塞进去。OpenAI 开源 Codex 的工程规则要求注入模型的每个片段有明确上限，避免无界增长，并建议对大型片段做额外审查。Codex `AGENTS.md` (https://github.com/openai/codex/blob/main/AGENTS.md)

工程上可以给每一类内容设预算：任务和约束几百 token，目录和配置一两千，目标文件及直接依赖若干千，测试和命令输出按需截断。超过预算时，不是随机砍尾巴，而是保留能决定行为的定义、调用点和失败输出，把背景说明压缩成摘要。

还有一个经常被忽略的细节：终端输出也属于上下文。一次 `npm test` 打出五万行日志，Agent 后面就会在噪声里找真正的错误。包装命令时应保留失败的首个堆栈、相关测试名、退出码和环境信息，其他重复行折叠。上下文管理做得好，模型不是“记得更多”，而是每一轮都看到了更有用的东西。

### 3. 可追溯，知道事实从哪里来

代码 Agent 给出的判断，最好能落回文件路径、行号、命令和提交。这样人可以复核，Agent 也能在下一轮重新读取，而不是依赖一段无法验证的摘要。

我通常给每个片段附上四个元数据：来源路径、版本或分支、生成时间、用途标签。比如“`src/api/pagination.ts`，当前工作树，目标实现”；“`tests/api/pagination.test.ts`，当前分支，验收证据”；“`docs/migration.md`，两年前提交，仅作历史参考”。同一段内容如果来自缓存，也必须知道缓存对应哪个 commit。

### 4. 可更新，发现矛盾时允许回滚假设

仓库文件不是圣旨。文档、注释、类型和运行结果出现冲突时，运行结果和当前代码通常更接近事实；但如果测试本身过时，仍要把矛盾记录下来。Agent 不应悄悄挑一个自己喜欢的版本。

一个简单的做法是维护“事实表”：

| 事实 | 证据 | 可信度 | 下一步 |
| --- | --- | --- | --- |
| 分页参数在 resolver 入口校验 | `src/graphql/resolver.ts` | 高 | 追调用链 |
| 默认排序按 `created_at` | 现有测试 3 条 | 高 | 保持兼容 |
| 文档说支持 `page` 参数 | `docs/api.md` | 中 | 运行接口测试确认 |
| 旧 service 仍在使用 | 最近一次 grep | 低 | 查 import 和 git log |

事实表不必暴露给用户，但要让 Agent 的计划能指出“我还缺哪条证据”。这比让它先写一版，再靠人找错，更省时间。

![事实表把判断映射回路径、版本和验证动作](/images/notes/code-agent-repo-context/fact-trace.svg)

### 给上下文包设置“停止读取”的条件

上下文工程最容易被误解成“继续找，直到模型满意”。实际系统需要明确的停止条件，否则每一轮都会把更多 README、相似文件和旧日志塞进窗口：

1. **入口闭合**：已经确认目标符号、调用者、直接依赖和对应测试，新增相似文件不能改变调用链。
2. **验收闭合**：每条需求都有可执行命令或明确的人工检查，剩下的内容只影响背景理解，不影响本轮决策。
3. **冲突显式**：文档、代码和运行结果仍有矛盾时，不继续扩大检索假装解决，而是把冲突写进计划，交给人确认。

可以把停止原因写进上下文包的 metadata：`closed_by=callgraph+tests`、`budget_tokens=6800`、`open_questions=[feature_flag]`。这样下一轮恢复时，Agent 知道哪些内容已经读过、哪些问题仍然开放，也不会因为“再搜一个文件”而把原来的证据顺序打乱。

## 面试现场最常见的四个坑

### 把整个仓库塞满，结果关键文件被淹没

某次内部演示里，Agent 为了改一个 Python handler，先读了整棵 monorepo 的目录树、十几个 README 和生成的 OpenAPI 文件。它确实“看到了很多”，却没看清当前服务使用的 feature flag。最后补丁能通过单元测试，线上开关一开就走到旧分支。

排查时先看上下文包，而不是先怪模型：本轮到底注入了哪些文件？目标函数和测试是否都在？关键配置是不是被截断？如果核心证据不在，继续加总 token 没意义，应调整检索顺序和预算。

### 文档过期，Agent 按旧约定改代码

真实仓库里，README 经常比代码老。文档说“运行 `make test`”，CI 实际走的是 `just check`；迁移完成后，旧模块目录还留着示例。Agent 若没有验证命令，就会把旧信息当硬约束。

解决办法不是删文档，而是给文档打新鲜度标签，把命令交给环境验证。无法执行的命令只能作为提示，不能作为成功标准。对于高风险规则，在 CI 中把它变成可运行检查；文档负责解释原因，脚本负责给出事实。

### 相似文件找对了，依赖方向却错了

向量检索很容易召回“长得像”的实现。比如 `billing/discount.py` 和 `checkout/discount.py` 都有 `apply_discount`，但一个处理订单，一个处理订阅。Agent 若只看函数名，修改会落到错误边界。

排查时要沿 import、调用和测试走一遍。可以先让 Agent 输出“目标符号—调用者—被调用者—对应测试”的链路，再允许编辑；链路缺一段，就先补读取动作。SWE-agent 的研究把这种交互界面称为 Agent-Computer Interface：给 Agent 设计合适的浏览、定位和编辑动作，往往比让它直接面对一个无边界终端更可靠。SWE-agent 论文 (https://arxiv.org/abs/2405.15793)

### 分支和工作树不对，读到的是另一份真相

代码 Agent 常在临时 worktree、容器或云环境里运行。它读到的依赖锁文件、环境变量和测试数据，可能与开发者本地不同；如果上下文缓存还来自上一个 commit，问题就更隐蔽。

最低限度要在上下文里记录 commit、工作树路径、运行器版本和未提交改动。开始前跑一次状态检查，关键文件读取后用哈希或版本确认；切换分支、生成代码、安装依赖后都要让缓存失效。上下文缓存不是越久越值钱，错一次就可能把整轮推理带偏。

## 一套可落地的排查与方案

如果你要在项目里实现 repo context，我建议按“观察—计划—最小编辑—验证”的顺序做，而不是一上来堆一个万能检索器。

第一步，建立仓库地图。收集目录树、语言和包管理器、构建入口、测试入口、生成目录、敏感目录和贡献规范。把这些信息生成短摘要，超过长度就按目录分层，而不是平铺所有文件。

第二步，解析任务。把用户话术拆成目标、约束、未知项和验收条件。比如“给导出接口加 CSV”至少包含：接口入口、格式兼容、字段顺序、错误行为、测试命令。任务越具体，检索越容易解释。

第三步，先找符号，再找邻居。用语言服务器、静态索引或简单的 `rg` 找到定义和引用；再读取直接依赖、对应测试、配置和最近变更。只有链路断了，才扩展到相似实现或历史文档。

第四步，生成可审阅计划。计划中写“将改哪些文件、为什么、预计影响、如何验证”，并把每个判断指回证据。计划不是形式，真实作用是让错误假设在写代码前暴露。

第五步，小步编辑。一次只改一个可验证的行为，避免把重构、格式化和功能混在同一补丁里。每次编辑后先跑最短的相关测试，再决定是否扩大范围。长任务中，Agent 应定期重新读取目标文件和 git diff，防止早期摘要与当前代码脱节。

第六步，验证并回写事实。测试失败时，把失败命令、退出码、首个相关堆栈和改动文件放回上下文；若失败来自环境，标记为环境问题，不要让模型盲改业务代码。任务结束后，把新命令、边界和坑写回维护者认可的文档或 `AGENTS.md`，但不把一次性的猜测写成永久规则。

这套流程有一个好处：每一步都可以单独测。你能统计首次定位到正确文件的比例、计划中漏掉的依赖、上下文平均 token、缓存命中后的错误率，以及从第一次失败到修复需要多少轮。没有这些指标，“上下文工程”很容易变成一个听起来先进、实际上没人敢碰的黑盒。

## 2025—2026 年官方工程资料给出的共同方向

最近公开的工程资料，关注点已经从“模型能不能写代码”转向“仓库能不能被 Agent 理解和验证”。OpenAI 的 Harness engineering 文章描述了一个 agent-first 的代码库：通过清晰的结构、可运行的检查和仓库内说明，让 Agent 从代码本身理解业务，而不是靠人不断补充背景。OpenAI：Harness engineering (https://openai.com/index/harness-engineering/)

OpenAI 对 Codex agent loop 的拆解也提醒了一件事：一次任务可能产生数百次工具调用，若没有上下文压缩、边界和恢复策略，工具越多反而越容易耗尽窗口。OpenAI：Unrolling the Codex agent loop (https://openai.com/index/unrolling-the-codex-agent-loop/)

GitHub 对 Copilot 的公开说明，则把“当前文件、选中代码、工作区信息、语言和依赖”列为上下文来源。它没有把整个仓库当默认输入，而是强调在开发环境中组合与当前编辑位置有关的信号。GitHub Copilot：Context in the coding environment (https://github.com/features/copilot)

研究侧也在验证一个朴素问题：仓库级上下文文件到底有没有帮助。2026 年关于 `AGENTS.md` 的评估把它放到 SWE-bench 与真实仓库中比较，结果并非“有文件就更好”：总体成功率没有稳定提升，平均推理成本反而增加超过 20%；真正有价值的主要是非标准工程约束，而不是冗长仓库概览。这说明 context 文件也必须做消融和成本评估。Evaluating AGENTS.md (https://arxiv.org/abs/2602.11988)

这些资料没有给出一个“永远正确的上下文模板”。它们共同强调的是可读、可执行、可追溯和有限预算。模型能力还会变化，仓库的事实和验证链必须先站稳。

## 上下文包要发出一张“停止回执”

Agent 读到多少文件不是效率指标，能否在证据闭合时停下来才是。每次任务结束时保存停止原因、覆盖的调用链和仍未解决的问题，下一轮恢复就不会重复扫描：

~~~yaml
context_stop_receipt: csr_e14d9b
task_id: issue_csv_export
closed_by:
  - target_symbol
  - direct_callers
  - related_tests
  - validation_command
budget:
  files_read: 14
  tokens_used: 6800
open_questions:
  - feature_flag_in_staging
excluded:
  - generated_openapi
  - unrelated_discount_module
next_action: "run staging smoke test"
status: closed_with_open_question
~~~

停止回执不是把未知项藏起来，而是把“已经足够做决定”和“仍需人或环境确认”分开。这样可以统计首次定位正确率、无效读取比例和恢复轮数，也能避免上下文缓存把另一条分支的事实带进当前任务。

![上下文停止回执把闭合证据、预算、开放问题和下一步动作固定下来](/images/notes/code-agent-repo-context/context-stop-receipt.svg)

### L5：什么时候不能继续扩大上下文？

当入口、调用者、直接依赖、测试和验收命令已经闭合，而新增文件只增加背景、不改变决策时就应停止。若仍有代码与文档冲突，记录为 open question，交给人或环境验证，而不是靠继续读取制造确定感。

## 上下文包还要记录“读了什么、没读什么”

仓库级 Agent 很容易把“读得更多”误当作“理解得更深”。每次任务结束时，建议保存一个上下文包：入口、调用链、直接依赖、测试和验收命令属于已闭合证据；未读取的文件、冲突文档和待验证假设单独列出。下一轮恢复时，Agent 可以从开放问题继续，而不是重新扫描整个仓库。

```yaml
context_pack: cp_c4ada1
task: add_csv_export
closed_evidence:
  - src/api/export.ts
  - src/service/exporter.ts
  - tests/export.test.ts
  - command: "pnpm test -- export"
open_questions:
  - "feature_flag 是否由后台配置覆盖"
  - "旧客户端是否依赖字段顺序"
not_read:
  - docs/legacy-import.md
  - packages/mobile/
stop_reason: "entry + callgraph + test + acceptance are closed"
budget_tokens: 6800
next_action: "verify feature_flag before widening patch"
```

`not_read` 不是遗漏清单，而是边界声明：它说明本轮结论没有覆盖哪些区域。只要新增内容不改变入口、调用链、测试或验收，继续扩大上下文的收益就很低；如果代码与文档冲突，把它记成 open question，交给运行结果或人确认，不要靠更多相似文件制造确定感。

![代码 Agent 上下文包同时记录闭合证据、开放问题、未读取范围和停止原因](/images/notes/code-agent-repo-context/context-boundary-card.svg)

### L5：为什么“未读取文件”也要写进交接？

因为它定义了结论边界。下一位工程师知道哪些目录没有被证明、哪些假设仍开放，就不会把局部调用链误当成全仓库结论，也能更快选择下一步验证动作。

## 上下文边界还要绑定“版本快照”

同一条路径在不同分支、工作树或生成代码版本里可能不是同一个事实。只写 `src/service/exporter.ts` 还不够，交接包应绑定 commit、工作树状态和依赖锁文件摘要；恢复时先比对快照，发现代码已经变化就重新验证入口和测试，不要把旧结论直接套到新代码上。

```yaml
context_snapshot: cxs_3b0e84
task: add_csv_export
git:
  commit: 9b7e1d2
  worktree: clean
  branch: feature/csv-export
dependencies_lock: sha256:lock-44...
closed_evidence:
  - src/api/export.ts
  - src/service/exporter.ts
  - tests/export.test.ts
resume:
  compare_snapshot_first: true
  on_drift: rerun_targeted_validation
decision: handoff_replayable
```

![代码 Agent 上下文快照卡：路径、commit、工作树和依赖锁一起绑定恢复边界](/images/notes/code-agent-repo-context/context-snapshot-card.svg)

### L5：为什么路径相同仍不能直接复用上下文？

分支、生成文件或依赖版本变化都会让同一路径的行为不同。上下文包绑定快照后，恢复能先发现漂移，再决定哪些证据需要重读，避免把过期结论当成当前事实。

## 最后，把它讲清楚

Repo context 不是把整个仓库塞进 prompt，而是为当前任务构建一组有优先级、可追溯、有限预算的证据。

我会先解析任务和约束，再从目录、符号调用链、对应测试、配置和最近变更中逐层扩展。每个片段记录路径、版本和用途，超过预算就保留定义、调用点和失败输出，压缩背景噪声。`AGENTS.md` 负责声明仓库的导航和验证规则，但文档必须通过当前代码和命令校验。

工程上最容易出问题的是上下文淹没、过期文档、相似文件误召回，以及缓存对应错误分支。我的排查会先检查本轮实际注入了什么，再沿符号和测试链路确认依赖，最后用最小命令验证。指标不只看最终 patch，还看首次定位正确率、上下文成本和失败恢复轮数。

这段回答的重点，不是说“我会 RAG”。而是让面试官听见：你知道上下文是一条需要维护的工程链路，错误的上下文和错误的代码一样危险。

## AgentAlpha 大模型 Agent 训练营

AgentAlpha 的路线从 RAG、记忆系统、单 Agent、多 Agent、DeepSearch、高效推理，推进到第 7 阶段的 Code Agent，再继续做自进化编码、Agentic RL 和综合项目。

Code Agent 阶段已经确认的内容包括 SWE-agent、RepoMaster 和仓库级代码理解；阶段交付是在真实仓库里完成 issue 修复或仓库复用实验。课程按周任务、作业检查、代码 Review 和项目验收推进，完成项目后再继续打磨 README、运行说明、简历项目段落和面试讲法。

[查看 AgentAlpha 大模型 Agent 训练营](https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb)

## 参考资料

1. Introducing Codex — OpenAI (https://openai.com/index/introducing-codex/)
2. Harness engineering — OpenAI (https://openai.com/index/harness-engineering/)
3. Unrolling the Codex agent loop — OpenAI (https://openai.com/index/unrolling-the-codex-agent-loop/)
4. Codex `AGENTS.md` — OpenAI (https://github.com/openai/codex/blob/main/AGENTS.md)
5. SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering — arXiv (https://arxiv.org/abs/2405.15793)
6. Evaluating AGENTS.md — arXiv (https://arxiv.org/abs/2602.11988)
7. GitHub Copilot (https://github.com/features/copilot)
