---
slug: "changcheng-renwu-agentrl-fupan"
title: "长程任务为什么难：一个 Agent RL 从业者的复盘"
excerpt: "\"长程任务是一面放大镜，它让三个本来就存在的问题同时显形，概率的乘法、记忆的衰减、目标的漂移，这三层每一个都会随步数一起放大。📌本文看点01先算概率账02"
date: "2026-10-09"
category: "技术分享"
tags: "Agent,面试,大模型"
minutes: 18
---
"

长程任务是一面放大镜，它让三个本来就存在的问题同时显形，概率的乘法、记忆的衰减、目标的漂移，这三层每一个都会随步数一起放大。

📌 本文看点

01

先算概率账

02

RL 把问题放大

03

上下文是预算

01

QUICK ANSWER

### 💡 简要回答

做 Agent 强化学习训练这一年多，被问得最多的问题是，为什么 demo 里三五轮交互漂亮得很，一上真实业务、跑到几十轮就崩？我自己的答案改过三次。最早以为是模型不够聪明，后来以为是奖励太稀疏，现在我倾向于另一个说法，长程任务（long-horizon task，即需要几十上百步决策才能完成的任务）是一面放大镜，它让三个本来就存在的问题同时显形——概率的乘法、记忆的衰减、目标的漂移。

这篇把三层分别拆开，每层附上我觉得真正值得读的论文，算是一份带观点的阅读清单。

  

02

DEEP DIVE

### 📝 详细解析

一、先算一笔账：成功率是乘出来的，不是加出来的

抛这个数字说明一件事，长程任务的难度不是随步数线性增长的，是指数衰减的。开

而真实情况比这个简化模型更糟，因为它的三个假设一个都不成立。

第一，各轮并不独立。第 3 轮的幻觉会写进上下文，成为第 4 到第 50 轮的"事实"。错误不是独立掷骰子，是复利。我自己做 badcase 归因时发现，长轨迹的失败样本里一大半能追溯到前三轮，要么是意图理解偏了，要么是第一步搜索方向就错了，后面几十轮都在给这个错误擦屁股。

第二，越往后单步正确率越低。ReAct 是 append-only（只追加不删除）的，上下文越滚越长，有效信息密度越摊越薄，开头的指令权重被不断稀释。Liu 等人在《Lost in the Middle》里早就量过，模型对上下文首尾的内容记得牢，中间的内容会"丢"。标称 200K 的上下文窗口和真正能有效利用的窗口，中间还隔着不小的距离。

第三，单步 95% 本身就不稳。概率采样意味着同一个状态两次推理可能给两个动作。pass@1（一次通过的概率）95% 不等于每一步都稳定输出 95% 分位的动作，《Where LLM Agents Fail and How They Can Learn from Failures》把这类失败拆得很细，相当一部分不是能力问题，是输出的方差问题，需要验证器（verifier）兜底。

![](/images/articles/changcheng-renwu-agentrl-fupan/fig01.jpg)

图：multi-turn agentic RL 的轨迹示意（Agent 在推理与行动间交替推进，长轨迹让每一步的失误持续累积）

「N 等于 10 时还剩六成，N 等于 50 时只剩 8%。」

二、RL 不是解药，它先把问题放大了一遍

既然推理侧天然衰减，那就靠训练把单步正确率练上去——这是直觉，但 RL 的学习机制在长程上会叠上新的麻烦。

奖励稀疏且延迟。只有任务结束才有结果奖励（outcome reward），中间几十步全是沉默。探索空间随步数指数膨胀，一条最终失败的轨迹里，到底哪一步是罪人？这是经典的价值归因问题（credit assignment）。RUDDER 用序列分解把延迟奖励折算回关键决策点，HER 用"事后改目标"把失败轨迹变成有用样本，这两篇是 2017 到 2019 年的老工作，但今天 LLM Agent 遇到的还是同一个问题。

现有的优势归一化在长轨迹上失真。以 GRPO 为例，它在整个 episode（一条完整轨迹）级别做归一化，再均摊回每个 token。这在长短混杂的批次里有两个后果，长轨迹每个 token 分到的权重被长度稀释，整条的贡献反而不如短轨迹；关键步骤和大段冗余步骤吃一样的权重，步骤越多大锅饭越严重。GiGPO 的思路值得看，它按相似状态把不同轨迹的步骤重新分组再算优势，相当于在步骤层面找回局部对比，某种意义上是 DQN 时代按状态估值的思路在 LLM 上的文艺复兴。VAPO 从另一头切入，让 GAE 的 λ 随思维链长度自适应变长，保证早期步骤能收到最终奖励的回传信号。

工程上，长样本天然稀缺。同步训练里，批次要等最长的轨迹跑完，轮次上限设高了拖垮吞吐，设低了把最有价值的长样本拦腰截断；异步训练里，训推分离导致长轨迹大概率是被旧版本策略采出来的，策略偏移（off-policy）比短轨迹严重得多，训练容易不收敛。《Beyond Ten Turns》把轮次上限放到 128、用全异步架构解耦采样和训练，才让搜索类 Agent 在训练中稳定跑出上百轮、几十万 token 的轨迹。他们的经验是，长样本问题到最后是推理提效问题，只有单条轨迹够便宜，才轮得到谈算法。

还有一个容易被低估的坑，长程会把训推两侧的细微不一致全部放大。精度格式、tokenizer、MoE 专家路由的差异，在短任务上无关痛痒，在几百次调用的累积下足以毁掉训练。GSPO 和 R3（Rollout Routing Replay，记录并回放路由决策）本质上都在补这条缝。

![](/images/articles/changcheng-renwu-agentrl-fupan/fig02.jpg)

图：Beyond Ten Turns 的异步 RL 与长轨迹训练收益（把轮次上限放到 128，搜索类 Agent 才能在训练中稳定跑出长轨迹）

「长样本问题到最后是推理提效问题，只有单条轨迹够便宜，才轮得到谈算法。」

三、上下文不是仓库，是预算

缓解上下文增长，工程上的主线是把记忆当预算管，而不是当仓库堆。

滑窗只留最近几轮，是最省事的，但丢信息。更进一步的是定期总结替换原始历史，ReSum 让 Agent 周期性地调用总结工具压缩上下文，理论上把交互轮次的上限解开了；《Scaling Long-Horizon LLM Agent via Context-Folding》把"折叠"做成模型内生动作；DeepAgent 的 memory folding 分 episodic、working、tool 三层，让 Agent 在走死路时"喘口气"、折叠记忆后换条路重新探索。再往外一层是 Manus 式的文件外挂，长输出卸载到文件系统，上下文里只留句柄，调用时按需读回。

但做训练的要注意，所有改写历史的操作都改了序列的概率分布。推理时剪掉的上下文，训练时如果不对齐，梯度就是错的。这条在论文里很少被正面讨论，工程上却是实打实的坑。

![](/images/articles/changcheng-renwu-agentrl-fupan/fig03.jpg)

图：DeepAgent 的三层 memory folding 框架（episodic、working、tool 分层折叠记忆，让 Agent 换条路重新探索）

「所有改写历史的操作都改了序列的概率分布。」

四、奖励工程：给中间步骤发粮，但别发错

对付奖励稀疏，今年的答案已经基本收敛到过程奖励（PRM）加先验知识，代码任务用单元测试，工具调用用语法树校验，规划任务设里程碑奖励。两个细节值得提醒。一是警惕"假 PRM"，有些实现把过程分累加成结果分再平均摊回去，等于还是大锅饭；二是 PRM 和结果奖励的配比很挑算法，《A Practitioner's Guide to Multi-turn Agentic Reinforcement Learning》系统扫了一遍，密集的过程奖励能明显加速 PPO，但换到 RLOO 这类无偏算法上，优势几乎消失，稳定性反而更好。结论很朴素，奖励设计和算法选型是一件事，不能分开做。

另一条线是课程学习，先在短任务上拿到有效奖励，再逐步放开轮次上限和上下文长度。同一篇实践指南里有个反直觉的观察，在简单环境里训出来的能力，能迁移到同域的复杂任务上，混合任务训练甚至比单任务专精更稳。这暗示直接练长未必有效，长程能力来自练对顺序。

![](/images/articles/changcheng-renwu-agentrl-fupan/fig04.jpg)

图：A Practitioner's Guide 的训练曲线（密集过程奖励能明显加速 PPO，换到 RLOO 上优势几乎消失）

「奖励设计和算法选型是一件事，不能分开做。」

📚 参考文献

1\. Yao et al., ReAct: Synergizing Reasoning and Acting in Language Models, 2022

2\. Liu et al., Lost in the Middle: How Language Models Use Long Contexts, 2023

3\. Where LLM Agents Fail and How They Can Learn from Failures, 2025

4\. Andrychowicz et al., Hindsight Experience Replay, 2017

5\. Arjona-Medina et al., RUDDER: Return Decomposition for Delayed Rewards, 2019

6\. Wang & Ammanabrolu, A Practitioner's Guide to Multi-turn Agentic Reinforcement Learning, 2025（arXiv: 2510.01132）

7\. Group-in-Group Policy Optimization for LLM Agent Training（GiGPO）, 2025

8\. Yue et al., VAPO: Efficient and Reliable Reinforcement Learning for Advanced Reasoning Tasks, 2025

9\. Yu et al., DAPO: An Open-Source LLM Reinforcement Learning System at Scale, 2025

10\. Zheng et al., Group Sequence Policy Optimization（GSPO）, 2025

11\. Gao et al., Beyond Ten Turns: Unlocking Long-Horizon Agentic Search with Large-Scale Asynchronous RL, 2025（arXiv: 2508.07976）

12\. ReSum: Unlocking Long-Horizon Search Intelligence via Context Summarization, 2025

13\. Sun et al., Scaling Long-Horizon LLM Agent via Context-Folding, 2025（arXiv: 2510.11967）

14\. Li et al., DeepAgent: A General Reasoning Agent with Scalable Toolsets, 2025（arXiv: 2510.21618）

15\. Packer et al., MemGPT: Towards LLMs as Operating Systems, 2023

16\. Wang et al., Voyager: An Open-Ended Embodied Agent with Large Language Models, 2023

17\. Pathak et al., Curiosity-driven Exploration by Self-supervised Prediction, 2017

18\. James Carse，《有限与无限的游戏》（Finite and Infinite Games），1986

  

03

SUMMARY

### 🎯 更深一层

最后说点不那么工程的。上面所有讨论其实共享一个前提，任务有明确的终点和可验证的结果奖励。这类任务占今天 Agent 评测的绝大多数，但真实世界不总是这样。Minecraft 式的开放世界、持续数小时的陪伴对话、一直运行的具身任务，它们没有"结束"这一说，规则还会随互动演变。

James Carse 在《有限与无限的游戏》里区分过这两种游戏，有限的游戏为了赢，无限的游戏为了让游戏继续。我们现在的整套 Agent RL 技术栈，episode 奖励、归一化、课程，全是为有限游戏设计的。把它直接搬到无限游戏上会出现经典的局部最优，把每一轮对话当独立 episode 优化"当下满意"，长期训出来的是谄媚。Voyager 在 Minecraft 里给出的暗示是，内在动机可能是绕不开的，没有外部终局奖励时，靠好奇心和信息增益驱动自我设课，反而能走出最远的探索轨迹。

所以我对长程任务的最终判断是，步数变多只是表象，真正的分水岭在于有没有人告诉你什么时候算结束。前者是工程问题，今年的一堆论文已经在拆了；后者是研究范式的转换，现在连评测基准都还没有。谁先做出"无限游戏"的评测，谁可能才真正摸到长程的边。

💬 你训练长程任务时，第一次崩在第几轮？评论区聊聊。

如果觉得有收获，**点赞关注走一波**，我们下篇见。

  

04

### 推荐阅读

本号 Agent 面试题系列（点击标题直达）：

• [大厂Agentic RL 面试，背完 GRPO 只是刚入门](https://mp.weixin.qq.com/s/F8bQWU_t4UjL0pzQ2MslKQ)

• [阿里一面：Agent 已经会 ReAct 了，为什么还要做 Agentic RL？](https://mp.weixin.qq.com/s/vSDZmuE6PhZ2RP9NjVQXtQ)

• [面试官疑惑：你的 Agent 跑了二十轮对话，上下文爆了怎么办？](https://mp.weixin.qq.com/s/4ZRDvL_j-xDP0liOVzJcjA)

• [社区学员刚面完：长期记忆全塞向量库？](https://mp.weixin.qq.com/s/YO8ok7dpVDV7EnX8u-nrFg)

• [为什么 ReAct 已经不够了？从 Plan-Then-Act 到 ToT、LATS 讲透 Agent 推理范式](https://mp.weixin.qq.com/s/TSBzgfyg4W9tfqLwDtGweQ)

  

04

### 如果你想系统补齐这些能力：AgentAlpha 课程介绍

上面这套「先算概率账、再管记忆预算、最后设计奖励」的思路，就来自 AgentAlpha 社区带学员做项目、做面试复盘的沉淀。下面只摆三样东西：课程知识点、社区跑出来的项目、学员案例。

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

看到这里你会发现，今天这篇长程任务复盘，正好落在阶段 5 的 DeepSearch 与阶段 9 的 Agentic RL 上，成功率乘法与记忆预算管理，在阶段 2 的记忆系统里就是硬功夫。表里的阶段 1 到 2 打检索与记忆的基本功，阶段 3 到 4 覆盖单 Agent 架构与多智能体协作，阶段 5 到 9 对应 DeepSearch、推理服务、Code Agent、自进化和 Agentic RL 这些前沿方向，后训练岗要考的数据与算法机制，全在这条线上。

挑一个和今天最相关的模块，看看具体教什么、动手做什么、怎么验收：

阶段 9｜Agentic RL（1–1.5 周）

**学什么：**把「搜索/工具调用」建模成 RL 环境中的动作；交错推理加多轮搜索的训练流程；奖励函数设计与 PPO、GRPO、Reinforce 的选型对比；训练稳定性技巧（retrieved token masking、防止模型走捷径、动态采样与难度过滤、训练数据配比）；veRL、EasyR1、Search-R1 三个框架的技术路线与递进关系。

**动手做什么：**复现 Search-R1，训练一个 3B–7B 的小模型，让它在「思考→触发搜索→整合→回答」的结构里学会何时发起搜索。

**怎么验收：**报告必须包含训练前后模型检索次数与搜索触发位置分布的变化、长轨迹（50 轮以上）的占比与平均 token 消耗、答案质量（F1/EM）的提升，以及 1 到 2 个失败样本的归因和改进思路，比如给一段多步轨迹做贡献标注时，检查必要步和冗余步的权重有没有真的拉开、埋在第 1 步的关键约束到第 20 步模型还记不记得住。

**学员案例**（来自社区公开资料）：字节 Seed、腾讯、京东 TGT、蚂蚁 PLAN-A、华为天才少年等录用结果；ICLR、KDD、ICML、NeurIPS、EMNLP、AAAI 等论文录用；USC、杜克、港科大等博士录取。

参考资料

1\. Wang & Ammanabrolu, A Practitioner's Guide to Multi-turn Agentic Reinforcement Learning, 2025，arXiv:2510.01132

2\. Gao et al., Beyond Ten Turns: Unlocking Long-Horizon Agentic Search with Large-Scale Asynchronous RL, 2025，arXiv:2508.07976

3\. Sun et al., Scaling Long-Horizon LLM Agent via Context-Folding, 2025，arXiv:2510.11967

4\. Li et al., DeepAgent: A General Reasoning Agent with Scalable Toolsets, 2025，arXiv:2510.21618

  

  
END
