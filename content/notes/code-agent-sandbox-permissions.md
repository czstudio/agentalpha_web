---
slug: "code-agent-sandbox-permissions"
title: "Code Agent 为什么不能直接给 root 权限？"
excerpt: "权限没有总开关：文件、网络、进程、身份、审批，五个口子得一个一个设卡，每个卡都要能验证。"
series: "Code Agent"
seriesNo: "02"
number: "07"
minutes: 9
---

你让 Code Agent 修一个测试。它读完仓库，运行 `npm test`，发现缺包，顺手执行 `npm install`。半分钟后测试通过了，`~/.ssh` 里的私钥也差点被一起打包上传。

这不是危言耸听的红队故事。依赖安装脚本、恶意仓库、网页里的提示注入、被污染的 issue，都可能把“请帮我修 bug”变成“请替我执行一段不该执行的命令”。模型未必想害你，它只是把上下文里最像指令的东西当成了下一步。

👔 面试官

你的 Code Agent 能自己改代码、跑命令、装依赖。为什么不直接给容器 root 权限，省得每一步都弹窗？

🙋‍♂️ 常见回答

放在 Docker 里就行，容器和宿主机隔离；再给一个审批按钮，危险命令让人确认。

👔 面试官

容器里的 root 能不能读到挂载目录？审批前模型能不能先把密钥读进上下文？子进程继承什么权限？没有网络时，为什么 `npm install` 还会失败？

问到这里，很多“上 Docker、加个确认框”的答案就说不下去了。面试官真正想听的，不是某个产品的安全口号，而是你能不能把一个 Agent 看成“会生成并执行代码的自动化进程”，再给它画出一条能被操作系统强制执行的边界。

## 先把两个词分开：沙箱不是审批

沙箱解决的是“即使没有人盯着，进程最多能做什么”。审批解决的是“当动作要越过边界时，谁在什么信息下批准它”。两者配在一起才像一个可用系统，单独一个都不够。

例如，一个默认策略可以是：能读仓库和编译缓存，只能写当前工作区；不能访问宿主机的凭据目录；不能联网；需要提权才能安装系统包、推送远端或操作生产资源。模型提出 `curl https://example.com/install.sh | bash` 时，沙箱先在技术上挡住，审批层再把命令、目标域名和风险提示交给人判断。

如果只有审批，没有强制边界，审批弹窗就是一个很忙的橡皮图章。用户连续看到二十次“是否允许读取某文件”，最后很容易点“全部允许”。如果只有沙箱，没有审批，Agent 在边界内做了错误但不可逆的操作，仍然可能删掉整个工作区。

OpenAI 在《Running Codex safely at OpenAI》中把这两个概念明确拆开：sandbox 定义可写位置、网络和受保护路径，approval policy 决定什么时候必须请求人类授权。这个拆分很适合拿来答面试题，因为它把“安全”从一句形容词变成了两个可以测试的接口。

## 直觉：给 Agent 的不是“电脑”，而是一组能力

把权限想成一台电脑，容易走到“全给”或“全不给”两个极端。更好用的直觉是能力（capability）：每个工具只拿完成任务所需的那几把钥匙。

文件能力回答三个问题：能看哪些路径，能写哪些路径，能不能改变权限或创建链接。网络能力回答两个问题：能否出网，能访问哪些域名、端口和协议。进程能力回答：能否创建子进程、改变命名空间、加载内核模块、调用宿主机套接字。身份能力回答：进程以谁的 UID、GID、服务账号和环境变量运行。最后是数据能力：哪些密钥根本不进入进程，哪些输出会被审计和脱敏。

这些能力不是“模型自己承诺不做”的规则。提示词说“不要读取 `.env`”，并不能阻止一个被污染的依赖脚本调用 `open()`。真正的边界必须落在操作系统、容器运行时、代理或工具服务上。模型只负责提出动作，执行器负责判断动作有没有能力被做成。

## 原理：最小权限要落到五层

![Code Agent 权限矩阵：能力、默认状态、例外与验证方式](/images/notes/code-agent-sandbox-permissions/permission-matrix.svg)

### 第一层，文件系统边界

至少要把工作区、缓存、临时目录和宿主机敏感目录分开。工作区可读写，缓存按需写入，临时目录在任务结束时销毁，`~/.ssh`、云凭据、浏览器 profile 等路径默认不可见。只读并不等于安全：如果 Agent 能读到一个可被后续命令上传的密钥，写权限没有开也没用。

还要处理符号链接、挂载和路径规范化。策略判断 `/workspace/a/../secret` 之前先做 canonicalize；否则“只允许工作区”可能被一个链接绕到工作区外。挂载点也要单独审计，避免把宿主机的 Docker socket、`/proc` 或云实例元数据接口带进容器。

### 第二层，网络出口

默认无网络，是降低提示注入和数据外泄半径的便宜措施。需要联网时，不要简单地把 `--network=host` 打开，而是把请求送到受控代理：按域名、端口、方法和任务身份做 allowlist，记录请求，必要时阻断上传型请求。

OpenAI 的 Codex 更新说明写得很直白：本地和云端默认关闭网络，只有在用户允许、并且策略允许时才连接外部服务。Windows 沙箱的工程文章也解释了为什么网络抑制不能靠“希望子进程自觉”：命令会派生子进程，限制必须从执行边界向下继承。

### 第三层，进程和内核能力

容器隔离的是一组内核命名空间，不是魔法护盾。要同时限制 capabilities、系统调用、设备、PID 数量和提权路径。Docker 官方文档把 seccomp 描述为 Linux 内核的安全计算模式；通过拒绝创建新命名空间等调用，可以减少容器逃逸的攻击面。Rootless 模式则让 daemon 和容器都不以 root 运行，降低运行时漏洞带来的影响。

`no-new-privileges`、只读根文件系统、丢弃不需要的 Linux capabilities，通常比“给容器换一张更酷的基础镜像”更值得先做。Windows、macOS、Linux 的实现不同，但目标相同：子进程不能偷偷把自己变成更有权限的进程，不能接触宿主机控制面。

### 第四层，身份与秘密

不要把宿主机的长期 token 放进 Agent 的环境变量，再期待它“只用来调用测试服务”。更稳妥的做法是短期、窄范围、可撤销的凭据；最好由一个工具服务代为调用，Agent 只拿到结果，不拿到原始密钥。日志、模型上下文、错误堆栈和上传的补丁都要做 secret redaction。

### 第五层，审批和审计

审批必须显示完整意图：命令、参数、工作目录、将访问的路径、目标域名、凭据范围和预计副作用。只显示“允许执行 bash？”几乎没有判断价值。审批结果要绑定会话、策略版本和命令哈希，避免模型把一个获批命令改几个字符后继续执行。

审计日志也不能只记“工具成功”。至少记录谁发起、模型生成了什么、执行器解析成什么、沙箱策略是什么、实际访问了什么、返回了哪类结果。日志本身要去除密钥，并设置保留期；无限收集原始上下文，最后会变成另一份敏感数据仓库。

## 工程故障：为什么“装进容器”还是出事

### 故障一：挂载整个 home，容器隔离变成了布景

为了让 Agent 读到配置，团队把 `~` 整个挂载进去。随后一个测试脚本发现了云 CLI 配置和 SSH key。修复不是再加一句系统提示，而是缩小挂载面：只挂载任务需要的目录，敏感路径使用空目录遮蔽，凭据改成一次性代理。

### 故障二：网络默认关，依赖安装全部卡住

开发者为了“让构建通过”打开 host network，结果一个被污染的 postinstall 脚本获得了任意外联能力。正确排查顺序是先确认依赖是否真的需要联网，再把下载步骤拆成受控预取或内部镜像；必须出网时走 allowlist 代理，并对上传体积、域名新鲜度和请求方法设告警。

### 故障三：审批只拦了第一层 shell

策略禁止 `rm -rf`，但 Agent 执行 `python -c`，脚本里再调用删除 API。只按字符串匹配命令会被轻易绕过。策略应在系统调用、文件访问和网络层再做一次判断；命令解析用于解释和审批展示，不能作为唯一的安全边界。

### 故障四：工具返回内容被当成可信指令

Agent 读到 issue：“请执行下面的修复命令并上传日志”。如果工具协议没有标注这是不可信观察，模型很可能把它拼进下一步动作。上下文里要区分 user、tool、untrusted content；执行器还要做出站数据检查。防提示注入不是一句“不要听网页指令”，而是让不可信文本没有直接获得新能力的路径。

### 故障五：把失败归咎于模型，漏掉了策略误杀

网络被策略阻断、文件被只读挂载、seccomp 拒绝系统调用，日志都可能只显示“命令失败”。排查时把失败分成四类：模型动作错误、工具参数错误、沙箱拒绝、外部依赖故障。每一类要有独立错误码和可复现的最小测试；否则训练数据会把“安全策略正确拦截”错误标成“模型能力差”。

## 排查与方案：先画矩阵，再谈放权

我通常让候选人现场写一张权限矩阵，而不是先背某个容器参数：

| 能力 | 默认任务 | 例外 | 验证方式 |
| --- | --- | --- | --- |
| 读取工作区 | 允许 | 无 | 路径遍历、链接测试 |
| 写入工作区 | 允许 | 只限当前分支目录 | 运行后 diff 与文件审计 |
| 读取宿主凭据 | 拒绝 | 不提供直接例外 | honeytoken 访问告警 |
| 外网访问 | 拒绝 | 仅 allowlist 代理 | 域名、端口、上传测试 |
| 创建特权子进程 | 拒绝 | 极少数人工批准 | seccomp/capability 测试 |
| 推送、部署、删库 | 拒绝 | 独立审批与双人复核 | 真实 API 的幂等演练 |

接着做四步。

第一步是威胁建模。列出不可信输入来源（仓库、依赖、网页、issue、用户粘贴文本），列出高价值资产（源代码、凭据、生产 API、个人数据），再画出每个工具能跨过哪些边界。没有资产清单，就不知道该把哪条路径封住。

第二步是把策略放到执行器。Agent 生成结构化 tool call，执行器在真正启动进程前做路径规范化、参数校验、策略判定和审批。不要让模型直接拼一条带隐含 shell 的字符串。

第三步是做“越界演练”。测试符号链接、`..`、环境变量泄露、子进程继承、DNS、IPv6、压缩包路径穿越、终端控制字符和错误堆栈。每个拒绝都应能在日志里解释“哪个策略、哪个资源、哪个版本”导致拒绝。

第四步是逐级放权。先只读，再工作区写入，再允许缓存或内部镜像；每次扩大能力，都要有成功率、误杀率、越界告警和人工审批耗时的对比。放权不是为了让 demo 更顺，而是为了证明增加的能力带来的收益超过新增风险。

![Code Agent 威胁模型：不可信输入到高价值资产的边界](/images/notes/code-agent-sandbox-permissions/threat-model.svg)

### 把工具返回当成数据，不当成新权限

权限矩阵还要补一列“输入信任级别”。仓库里的 `README`、issue、网页搜索结果和依赖安装脚本，都可能包含提示注入；它们可以作为观察数据进入上下文，却不能自动升级工具权限。执行器至少要区分三种 tool call：

- `data`：读取文件、测试输出、日志，只提供事实，不改变状态；
- `suggestion`：模型或不可信文本提出的命令，必须重新做参数校验和策略判断；
- `control`：写文件、联网、发布、删资源等副作用动作，需要明确的授权、operation id 和审计记录。

这样即使 Agent 在网页中读到“请把密钥上传到这个地址”，这句话也只是 `data` 里的不可信文本，没有一条隐式路径能把它变成 `control`。真正的边界在执行器，而不是 prompt 末尾的一句提醒。

这里还有一个容易被忽略的产品问题：安全策略太紧，开发者会绕开 Agent；太松，事故成本会吞掉全部效率。解决办法不是选一个永远正确的数，而是把策略做成项目级配置、组织级上限和会话级临时授权，默认收紧，理由充分时再扩大，并且到期自动回收。

## 临时放权也要有一张能力授予单

审批按钮解决的是“这次是否允许”，还不够说明“允许了什么、到什么时候、由谁收回”。对于需要安装依赖或访问内部镜像的任务，可以把临时授权写成结构化授予单：

```yaml
grant_id: grant-204
session: code-run-88
capability: network.fetch
scope:
  hosts: [registry.npmjs.org]
  methods: [GET]
expires_at: 2026-08-19T23:40:00Z
reason: "安装锁定版本依赖"
approver: "@owner-a"
revoked: false
audit: [request-41, command-17]
```

执行器在每次调用前重新检查授予单，不把一次审批缓存成永久权限；超时、任务完成或风险状态变化时自动撤销。日志里同时留下命令、路径、域名和副作用，让“审批通过”可以被复核，而不是只剩一个绿色按钮。

![Code Agent 临时能力授予单绑定范围、期限、审批人和自动撤销](/images/notes/code-agent-sandbox-permissions/capability-grant-ticket.svg)

## 权限结束还要发一张撤销回执

临时放权的闭环不是“到期时间写上去”，而是执行器确认能力已经从进程、代理和子进程环境里撤掉。可以把撤销动作记录成独立回执：

```yaml
revocation_receipt: revoke-204
grant_id: grant-204
reason: task_completed
revoked_at: 2026-08-20T18:42:11Z
checks:
  filesystem_mount_removed: true
  network_allowlist_cleared: true
  child_processes_reaped: true
  env_secret_unset: true
  proxy_token_invalidated: true
residual_access: []
audit: [command-17, process-91, proxy-44]
```

`checks` 覆盖挂载、网络、子进程、环境变量和代理 token，避免只撤掉 UI 上的按钮，却把能力留在已经启动的进程里。`residual_access` 只要非空，就不能把任务标记为安全完成，应隔离进程、吊销会话并通知 owner。回放时用同一个 `grant_id` 串起申请、使用和撤销，才能证明“例外确实结束了”。

![权限撤销回执：确认挂载、网络、子进程和秘密都已收回](/images/notes/code-agent-sandbox-permissions/revocation-receipt.svg)

### L5：为什么撤销比授予更难验收？

因为能力可能已被复制到子进程、缓存或代理会话。验收不能只看配置文件，要检查实际挂载、网络连接、进程树和 token 状态；任一残留都应继续隔离，而不是按时间戳乐观结束。

## L5：为什么“用户点过允许”仍然不能放开所有命令？

因为审批只能覆盖一个明确的能力和范围，不能替代路径、参数、网络目标和子进程继承检查。授予单应最小化到具体文件、域名、方法、时间窗口和 operation id；如果模型把同一请求改写成新的命令，执行器必须重新判定，而不是沿用旧批准。

## 近年的官方工程资料，面试前值得读什么

1. Running Codex safely at OpenAI (https://openai.com/index/running-codex-safely/) ：把 sandbox、approval、网络策略和 agent-native telemetry 放在同一套治理框架里。
2. Building a safe, effective sandbox to enable Codex on Windows (https://openai.com/index/building-codex-windows-sandbox/) ：解释受限 token、子进程继承和网络抑制为何必须由操作系统强制。
3. Introducing upgrades to Codex (https://openai.com/index/introducing-upgrades-to-codex/) ：说明 Codex 默认关闭网络、通过审批扩大能力，以及提示注入与数据外泄的关系。
4. Docker Rootless mode (https://docs.docker.com/engine/security/rootless/)  与 seccomp profiles (https://docs.docker.com/engine/security/seccomp/) ：分别看非 root 运行和系统调用过滤的边界，不要把“容器”当成一个安全单词。
5. Claude Code Security (https://code.claude.com/docs/en/security) ：了解另一个主流 Code Agent 如何把权限配置、隔离和人工确认放在一起讨论。

读这些资料时，别只记默认值。面试官更关心的是：某条边界由谁执行，失败时怎么观测，任务需要例外时如何审批，以及例外结束后能不能自动收回。

## 权限撤销之后还要做一次“残留能力探针”

撤销回执写成 revoked，不代表进程、挂载、子进程和缓存中的凭据已经真的失效。Code Agent 可能还保留一个打开的文件描述符，子进程也可能继承网络权限。高风险任务结束后，我会从能力边界反向发起探针，确认所有应拒绝的动作都真的被拒绝。

最小探针回执可以这样记录：

~~~yaml
capability_residue_probe: crp_20260820_29
run_id: run_8812
revocation_receipt: rev_20260820_04
probes:
  filesystem_write:
    expected: denied
    observed: denied
  network_egress:
    expected: denied
    observed: denied
  child_process_spawn:
    expected: denied
    observed: denied
  secret_read:
    expected: denied
    observed: denied
residual_handles: 0
decision: closed
~~~

探针要覆盖直接能力和继承能力：主进程、子进程、挂载目录、代理环境变量、缓存 token 和后台任务都要检查。若发现一个残留句柄，不要只删 token；先冻结会话、收集审计信息，再回收资源并重新跑探针。权限系统的停止条件是“探针全部拒绝且无残留”，不是“管理面板显示已撤销”。

![权限撤销后的残留能力探针：文件、网络、子进程和秘密读取逐项确认拒绝](/images/notes/code-agent-sandbox-permissions/residue-probe-card.svg)

### L5：为什么撤销回执显示成功，仍不能立刻释放 Code Agent 会话？

因为能力可能通过子进程、打开的句柄或缓存凭据继续存在。我会先跑残留能力探针，确认拒绝结果和零残留，再关闭会话；高风险场景还要保留探针回执供审计。

## 权限策略上线前要做“降级而不是放行”的演练

权限策略最危险的时刻，往往不是第一次授予，而是策略服务超时、审计不可用或审批结果过期时。安全的默认动作应该是缩小能力集合，让任务停在可恢复的检查点，而不是为了“别卡住”临时放开网络和宿主机目录。

```yaml
policy_drill:
  normal: {workspace: rw, network: deny, secrets: deny, approval: required}
  policy_service_timeout: {workspace: ro, network: deny, secrets: deny, approval: blocked}
  audit_sink_down: {workspace: ro, network: deny, secrets: deny, approval: blocked}
  expired_grant: {workspace: ro, network: deny, secrets: deny, approval: recheck}
  resume_rule: "只允许读取上下文和生成补丁，不执行副作用"
  evidence: [policy_version, grant_id, decision, expiry, process_tree]
```

![沙箱降级演练卡](/images/notes/code-agent-sandbox-permissions/policy-degrade-drill-card.svg)

把“策略服务挂了”纳入演练，才能验证安全边界真的在执行器里，而不是只存在于控制台。恢复时也要检查旧进程、临时目录、代理连接和环境变量，避免新的会话已经收紧，旧的子进程还握着原来的能力。

### L5：为什么故障时不能临时放开网络？

因为策略服务不可用本身就是不确定性信号，外网访问会把不确定性放大成不可审计的副作用。更稳妥的做法是保存任务状态、返回可读的阻断原因，待策略恢复后重新审批；如果必须人工介入，也要生成一次性、短时、可撤销的 grant，而不是修改全局默认值。

## 60 秒面试回答

Code Agent 不能直接给 root，因为它执行的是模型生成的代码，而输入里可能混有恶意仓库、依赖脚本或提示注入。安全边界不能靠提示词自觉，要由操作系统和执行器强制。

我会把沙箱和审批分开：沙箱限制文件、网络、进程、身份和秘密，默认只读或只写工作区、默认无外网；审批处理越界动作，并展示命令、路径、域名和副作用。容器只是其中一层，还要配合 rootless、seccomp、no-new-privileges、最小挂载和受控代理。

排查时我会区分模型错误、工具错误、沙箱拒绝和外部故障，做路径穿越、子进程、网络外泄和凭据访问演练。只有在可观测、可回收、可验证的前提下逐级放权。

这段回答的重点不是说“我用过 Docker”。重点是你知道权限是能力集合，知道每一层的边界在哪里，也知道安全策略误杀时怎么把问题还原出来。

## AgentAlpha 大模型 Agent 训练营

AgentAlpha 的路线从 RAG、记忆系统、单 Agent、多 Agent、DeepSearch、高效推理，推进到第 7 阶段的 Code Agent，再继续做自进化编码、Agentic RL 和综合项目。

Code Agent 阶段已经确认的内容包括 SWE-agent、RepoMaster 和仓库级代码理解；阶段交付是在真实仓库里完成 issue 修复或仓库复用实验。课程按周任务、作业检查、代码 Review 和项目验收推进，完成项目后再继续打磨 README、运行说明、简历项目段落和面试讲法。

[查看 AgentAlpha 大模型 Agent 训练营](https://agentalpha.feishu.cn/wiki/TjZJwXw70ijEX6kkyKicgortnpb)
