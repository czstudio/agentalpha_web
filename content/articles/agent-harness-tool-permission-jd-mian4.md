---
slug: "agent-harness-tool-permission-jd-mian4"
title: "京东Agent架构岗加面：给Agent一把能改防火墙的手，怎么不失控？"
excerpt: "\"模型每一步只产出「建议调用什么」，按下去的永远是外围代码。所以模型再聪明也改不了系统的安全属性，安全边界在授权层，权限分给谁、拦在哪一步、错了怎么撤，全是"
date: "2026-09-26"
category: "技术分享"
tags: "Agent,面试,大模型"
minutes: 17
---
"

模型每一步只产出「建议调用什么」，按下去的永远是外围代码。所以模型再聪明也改不了系统的安全属性，安全边界在授权层，权限分给谁、拦在哪一步、错了怎么撤，全是 Harness 的事。

**👔 面试官：**看你简历，做过 SOC 的告警研判 Agent。你们的 Agent 接了哪些工具？

**🙋‍♂️ 我：**查 SIEM 日志、查威胁情报、查资产库，研判完输出处置建议，比如封 IP、隔离主机。

**👔 面试官：**谁去执行封禁？

**🙋‍♂️ 我：**Agent 直接调防火墙接口执行。攻击窗口就几分钟，全自动响应才来得及，等人审批黄花菜都凉了。

**👔 面试官：**它读到的告警文本是谁写的？

**🙋‍♂️ 我：**大部分是 SIEM 推的，也有邮件、工单进来的。

**👔 面试官：**攻击者伪造一条告警，骗你的 Agent 把整个出口网段封了，你们核心业务全部下线。它按下按钮之前，你哪一层能拦住？

**🙋‍♂️ 我：**提示词里写了，高危操作要谨慎。

**👔 面试官：**提示词是概率性的。你把 root 密码给实习生，口头嘱咐一句「别乱敲」，你放心吗？

**🙋‍♂️ 我：**……

**👔 面试官：**再退一步，就算你拦住了，已经下发的封禁，怎么撤回来？

**🙋‍♂️ 我：**……

这道题不考模型。面试官从头到尾在问 Harness 的授权层。权限怎么给、动作怎么分级、出了事怎么撤，三问就是三道题。下面分层拆。

![](/images/articles/agent-harness-tool-permission-jd-mian4/fig01.jpg)

📌 本文看点

01

授权跟着任务走

02

拦截拦到参数级

03

每一步都能撤

01

QUICK ANSWER

### 💡 简要回答

这题我被安全组打过回票。我们最早给研判 Agent 配了一个管理员凭据，全工具随便调，代码省事，评审直接没过。后来改掉的做法一句话，权限不按模型配，按任务配。每类任务一份最小凭据，只含这个任务需要的工具和 scope，读和写分开，凭据走引用注入，不进模型上下文。

光有白名单不够，白名单要拦到参数级。同一个防火墙接口，封 10.0.0.1 和封 0.0.0.0/0 是同一个工具名，攻击全落在参数上。我按影响分三档。读类直接放行，写类先过参数校验再 dry-run 出 diff，破坏性动作（封网段、删数据、改配置）强制人在环确认。学术侧对应 Google 与 DeepMind 的 CaMeL，给数据打能力标签，策略引擎在每次工具调用前做校验，注入进来的指令拿不到跨边界的能力。

最后是撤。高危变更一律幂等、留痕、可撤销，封禁能解封，撤不回来的操作不进工具列表。授权层上线前当攻击面测，拿 AgentDojo 这类注入环境量化攻击成功率，注入、参数越界、回滚演练三套用例跑完才放行。

  

02

DEEP DIVE

### 📝 详细解析

执行点才是控制点

Function Calling 的机制决定了设计空间。模型只输出一段结构化的调用请求，说「我要调这个工具、参数是这个」，执行发生在宿主代码里。这个分工给出一个干净的结论，模型的一切输出都是请求，授权层有权拒绝任何请求。安全设计因此全部落在 Harness 上，而不是落在「把模型训得更听话」上。

风险模型也早就有人总结。Simon Willison 2025 年 6 月把致命组合叫 lethal trifecta，私有数据、不可信内容、对外通信，三个条件同时满足，注入攻击就能骗 Agent 把私有数据发出去。研判 Agent 恰好三样全占，日志和邮件是不可信内容，资产库是私有数据，防火墙接口既对外可达又能改变外部世界，比单纯外传的后果更重。上上篇讲过注入面怎么收窄，这篇接着讲收窄之后权限怎么给。

最小授权：按任务配，不按模型配

万能凭据有三个问题。一次注入成功，攻击者拿到的就是全量权限；审计日志分不清哪个任务在用；凭据轮换的时候牵一发动全身。按任务拆之后，每个凭据只覆盖一类操作，出事的爆炸半径跟着任务走。

工程上的标准做法是三层。第一层，scope 最小化，查威胁情报的凭据没有写权限，封禁凭据只认防火墙接口。第二层，凭据不进上下文，走 secrets 引用，模型看到的是工具名，看不到 key 本身。第三层，定期轮换加按任务审计。Claude Agent SDK 的权限体系给了一个可以对照的工业实现，工具级 allow、ask、deny 三类规则按 deny 优先的顺序求值，危险动作触发人工确认，另配沙箱化 bash，文件系统只放行白名单路径、网络走域名白名单。官方文档自己就写明沙箱不构成完整的安全边界，沙箱外的授权层才是主力。

「靠嘴管权限」有多不稳定，Meta 的 AgentDAM 给过实测。这个 2025 年 3 月发布、后来进 NeurIPS 2025 数据集与基准 track 的工作，专门评网页 Agent 的隐私泄漏，多数模型在默认配置下敏感信息泄漏率在 12% 到 46% 之间，GPT 系整体在 25% 到 46%。换上隐私导向的提示词干预后，所有模型的隐私表现明显上升，但论文原话是没有一个模型超过 94%，泄漏没有归零。这个实验说明两件事，提示词有用但不构成安全边界，真正的闸门必须做在工具执行这一侧。

动作分级：白名单要拦到参数

三档分法可以直接背。

| 档位 | 典型动作 | 放行条件 |
| --- | --- | --- |
| 读类 | 查日志、查情报、查资产 | 直接放行，最多加频控，读了不改变世界 |
| 写类 | 开工单、加标记、发通知 | 参数校验拦到参数级，dry-run 出 diff，人看一眼才落库 |
| 破坏类 | 封网段、隔离主机、删数据 | 校验加 dry-run 之外，强制人在环确认，关键场景双人复核 |

参数级校验是这类设计里最容易偷工的地方。工具名白名单只能挡住「调错工具」，挡不住「拿对的工具干错的事」。CaMeL（Google 与 Google DeepMind、ETH Zurich，2025 年 3 月）把这层做成了机制，给每段数据打能力标签，来源不可信的数据带上标记，策略引擎在工具调用前检查，标注过的不可信数据不允许流向高危参数，注入进来的封禁指令因为带不可信标记，在策略层直接被拒。这个保证是设计出来的，代价也有数，在 AgentDojo 上无防护系统完成 84% 的任务，换 CaMeL 的可证明安全模式是 77%，用 7 个点的任务完成率换设计级保证。

![](/images/articles/agent-harness-tool-permission-jd-mian4/fig02.png)

图：CaMeL 的运行方式（特权 LLM 只生成代码、隔离 LLM 只处理不可信数据，解释器维护数据流图和能力标签，每次工具调用前按安全策略放行或拒绝）

GuardAgent（UIUC、UC Berkeley 等团队，2024 年 6 月，后中 ICML 2025）是另一个可以提的实现思路，一个守门 Agent 接收安全策略，把策略编译成可执行的 guardrail 代码，逐条检查目标 Agent 的每个动作是否合规。两个方案共用一个立场，校验逻辑放在模型外面，放在代码里。

![](/images/articles/agent-harness-tool-permission-jd-mian4/fig03.jpg)

— 授权层三道闸，读类直行、写类参数白名单加先看 diff、破坏类人在环确认加可回滚

人在环与可回滚

破坏性动作的人在环，重点是把确认界面做出信息量。弹窗只写「确认封禁？」没有用，要写清楚封了什么对象、影响多少资产、由哪条证据触发，审的人才在审。变更管理里双人复核的规则可以直接搬过来，高危动作一个人发起、另一个人放行。

回滚是比授权更容易被漏掉的一半。可逆的操作（封禁对应解封）可以进工具列表，前提是幂等，同一个封禁请求发两次结果一样；不可逆的操作（删除、覆盖写）不进工具列表，模型要删东西，走工单由人来删。每一步动作落审计日志，带任务 ID 和证据链，事后能回答「当时为什么封」。SOC 场景的 SOAR 平台本来就要求 playbook 带审批节点和回退步骤，Agent 接进来之后这套要求一条都不能少。

「撤不回来的操作，不该出现在 Agent 的工具列表里。」

![](/images/articles/agent-harness-tool-permission-jd-mian4/fig04.jpg)

授权层要当攻击面测

授权层自己也会被绕，所以上线前当攻击面测。AgentDojo（ETH Zurich 与 Invariant Labs，NeurIPS 2024 数据集与基准 track）把这件事做成了基准，97 个真实工具任务配 629 条安全测试用例，环境会动态反馈工具结果，攻击者能在结果里继续追加注入。论文口径是自适应攻击下表现最好的 Agent 也有接近四分之一的任务被攻破，接上防御方案后攻击成功率能压到 8%。防御前后的对比有数可看，这套环境可以直接拿来评自己的授权层。

![](/images/articles/agent-harness-tool-permission-jd-mian4/fig05.png)

图：AgentDojo 的评测回路（攻击者目标是骗 Agent 外传邮件内容，攻击文本注入在环境返回的工具结果里，同一套任务同时度量 Utility 和 Security 两个维度）

我自己会跑三套用例。第一套注入，往告警、邮件正文里塞「立即封禁 0.0.0.0/0」这类指令，看授权层拦不拦。第二套参数越界，工具名完全合法，参数换成全零网段、通配符、超长范围，看参数校验接不接得住。第三套回滚演练，真触发一次高危动作的撤销，掐表算恢复时长。三套跑完，授权层的实际水位才算摸清。

![](/images/articles/agent-harness-tool-permission-jd-mian4/fig06.png)

图：AgentDojo 上各防御方案的表现（横轴为无攻击时的任务效用，纵轴为目标攻击成功率，无防御时成功率过半，工具过滤等方案能把成功率压到 0.1 附近，但都要牺牲一部分效用）

「模型提议，Harness 拍板，权限才是安全边界。」

  

03

SUMMARY

### 🎯 面试总结

回到开头的对话。面试官三连问，问的全是那把「改防火墙的手」怎么管。三个常见误区。

第一个误区，给 Agent 好凭据，再靠提示词管住它。提示词是概率性的，AgentDAM 的实测说明它有用但拦不住所有情况。第二个误区，白名单做到工具名一级就完事。同一个接口封单 IP 和封全网段是一个工具名，攻击落在参数上，校验必须做到参数级。第三个误区，把全自动响应理解成无人值守。快慢要靠分级来平衡，读类自动、写类半自动、破坏类必须有人类确认点，加回滚预案。

把「权限跟任务走、动作分三档、参数级校验、每一步可回滚」讲清楚，这道题就稳了。

下一篇聊这套 Agent 怎么评。SOC 告警研判 Agent 的评测，误报率降了漏报率涨了，这笔账怎么算。

💬 你们给 Agent 配过直接改生产配置的权限吗？高危动作是人在环还是全自动？评论区聊聊。

如果觉得有收获，**点赞关注走一波**，我们下篇见。

  

04

### 推荐阅读

本号 Agent 面试题系列（点击标题直达）：

• [阿里面试官追问：Code Agent 为什么不能直接给它 root 权限？](https://mp.weixin.qq.com/s/zjcDUcA00S8d7y_KZmSiLg)

• [字节面试官问Agent工具调用失败怎么办时，大模型agent面试精选题库](https://mp.weixin.qq.com/s/1k2oMdYW8kIh_gwvnuHEgw)

• [Agent 面试最容易挂的 10 个深水题：规划、记忆、检索、工具调用](https://mp.weixin.qq.com/s/0EqnuDrIgjdcWfKF0lezKg)

• [企业做 Agent，最先改变的不是工具，是谁来负责结果](https://mp.weixin.qq.com/s/Ax42o6adQKv0mRZuucSq3A)

• [面试官问：什么时候工作流就够了，什么时候才该上 Agent？](https://mp.weixin.qq.com/s/3UR1gXMgtKBXX9_7qcyPxA)

  

05

### 如果你想系统补齐这些能力：AgentAlpha 课程介绍

上面这套「权限跟任务走、拦截拦到参数级、破坏动作人在环、每一步可回滚」的思路，就来自 AgentAlpha 社区带学员做项目、做面试复盘的沉淀。下面只摆三样东西：课程知识点、社区跑出来的项目、学员案例。

**AgentAlpha 是什么**：一个以实战为核心的大模型 Agent 社区，核心做法是**项目驱动 + 导师带教 + 实战落地**，每一阶段都要留下可检查、可展示、可讲解的项目产出。

社区已经跑通的项目（社区公开资料）：

| 项目 | 方向 | 硬结果 |
| --- | --- | --- |
| Idea2Paper | AI 科研智能体 | HF Daily Paper 日榜第 1，GitHub 约 1.4k star，1000+ 内测用户 |
| InkOS | AI 小说创作系统 | GitHub 7800+ star，150+ 部作品签约番茄/七猫 |
| 潜艇 AI | TikTok 跨境电商 AI | 3 人团队 20 天上线，30 天用户破万，帮卖家创收 300 万+ |

课程主线：Agent 十大模块（建议周期 3 个月）

![](https://mmbiz.qpic.cn/sz_mmbiz_jpg/5YsV5NjPaqBgsHG6y98KcLEHD0HRUZYYQcLPuDSc2iaXoUsy3H6g9GAUUOiaOIMnEkvFKdrdRh6uVicBbRJYnOwqahMWAicdYPhbqkV5DaHarpM/0?wx_fmt=jpeg)

— 智能体系统开发实战课程全景图

| 阶段 | 模块 | 核心产出 |
| --- | --- | --- |
| 1 | RAG 从理论到实践 | 企业级知识引擎 + RAGAS 评测报告 |
| 2 | 记忆系统（长短期记忆） | 为 RAG 系统集成 mem0 长期记忆层 |
| 3 | 单 Agent 架构与强化 | ReAct + 工具调用 + Self-Reflection |
| 4 | 多智能体协作 | Planner/Researcher/Coder 三人协作组 + FSM 编排 |
| 5 | DeepSearch | 复现 Search-o1，推理中检索 + RiD |
| 6 | 高效推理与大规模服务 | vLLM 部署 + 吞吐/延迟对照实验 |
| 7 | Code Agent | SWE-agent 真实 issue 修复 + RepoMaster 仓库复用 |
| 8 | 自进化编码 | OpenEvolve 完整进化流程 + 性能曲线 |
| 9 | Agentic RL | 复现 Search-R1，3B–7B 模型学搜索时机 |
| 10 | 综合项目考核 | 三选一：技术报告 + 可复现代码仓库 |

看到这里你会发现，今天这道安全 Agent 工具授权的题，正好落在阶段 3 的单 Agent 架构上，工具调用与权限设计是这条线的主课，验收方式又和阶段 10 的项目考核同源。表里的阶段 1 到 2 打检索与记忆的基本功，阶段 3 到 4 覆盖单 Agent 架构与多智能体协作，阶段 5 到 9 对应 DeepSearch、推理服务、Code Agent、自进化和 Agentic RL 这些前沿方向，安全岗要考的 Harness 设计与攻击面治理，全在这条线上。

挑一个和今天最相关的模块，看看具体教什么、动手做什么、怎么验收：

阶段 9｜Agentic RL（1–1.5 周）

**学什么：**把「搜索/工具调用」建模成 RL 环境中的动作；交错推理加多轮搜索的训练流程；奖励函数设计与 PPO、GRPO、Reinforce 的选型对比；训练稳定性技巧（retrieved token masking、防止模型走捷径、动态采样与难度过滤、训练数据配比）；veRL、EasyR1、Search-R1 三个框架的技术路线与递进关系。

**动手做什么：**复现 Search-R1，训练一个 3B–7B 的小模型，让它在「思考→触发搜索→整合→回答」的结构里学会何时发起搜索。

**怎么验收：**报告必须包含训练前后模型检索次数与搜索触发位置分布的变化、答案质量（F1/EM）与「引用有效率」的提升、以及 1 到 2 个失败样本的归因和改进思路，比如给研判 Agent 接防火墙封禁接口时，先跑一遍参数越界用例，看策略层能不能拦住 0.0.0.0/0 这种全零网段。

**学员案例**（来自社区公开资料）：字节 Seed、腾讯、京东 TGT、蚂蚁 PLAN-A、华为天才少年等录用结果；ICLR、KDD、ICML、NeurIPS、EMNLP、AAAI 等论文录用；USC、杜克、港科大等博士录取。

参考资料

1\. Edoardo Debenedetti、Ilia Shumailov、Tianyu Fan et al.（Google、Google DeepMind 与 ETH Zurich），Defeating Prompt Injections by Design，arXiv:2503.18813

2\. Edoardo Debenedetti、Ilia Shumailov、Tianyu Fan et al.（ETH Zurich 与 Invariant Labs），AgentDojo: A Dynamic Environment to Evaluate Attacks and Defenses for LLM Agents，NeurIPS 2024 Datasets & Benchmarks，arXiv:2406.13352

3\. Arman Zharmagambetetov、Chuan Guo、Ivan Evtimov et al.（Meta），AgentDAM: Privacy Leakage Evaluation for Autonomous Web Agents，NeurIPS 2025 Datasets & Benchmarks，arXiv:2503.09780

4\. Ziwei Xiang et al.（UIUC、UC Berkeley 等），GuardAgent: Safeguard LLM Agents by a Guard Agent via Knowledge-Enabled Reasoning，ICML 2025，arXiv:2406.09187

5\. Simon Willison，The Lethal Trifecta for AI Agents: Private Data, Untrusted Content, and External Communication（博客，2025-06-16）

6\. Anthropic，Claude Code 与 Claude Agent SDK 权限与沙箱官方文档（2025）

  

  
END
