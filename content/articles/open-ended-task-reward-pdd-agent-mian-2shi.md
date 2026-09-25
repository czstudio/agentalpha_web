---
slug: "open-ended-task-reward-pdd-agent-mian-2shi"
title: "拼多多Agent岗二面：没有标准答案，reward怎么打？"
excerpt: "\"可验证任务的reward干净，因为对错有任务外的判据；开放式任务没有判据，锚只能从设计里来：把「好」写成清单、给打分通道上锁。清单写得越细，策略模型能钻的"
date: "2026-09-25"
category: "技术分享"
tags: "Agent,面试,大模型"
minutes: 20
---
"

可验证任务的 reward 干净，因为对错有任务外的判据；开放式任务没有判据，锚只能从设计里来：把「好」写成清单、给打分通道上锁。清单写得越细，策略模型能钻的地方越少。

**👔 面试官：**看你简历，做的是 Agent 训练侧。你们的 reward 是怎么设计的？

**🙋‍♂️ 我：**分任务。能规则验证的走规则，代码任务运行测试，数学任务对答案，reward 就是那个判分脚本，干净。

**👔 面试官：**行。那换个任务。调研 Agent 读完三十篇文献，交回一份综述；客服 Agent 回了一通安抚电话。这两种任务的 reward 从哪来？

**🙋‍♂️ 我：**拿个强模型当裁判，从准确性、结构、语气几个维度打分，加权求和。

**👔 面试官：**打分的锚在哪？满分 10 分，8 分的综述凭什么比 7 分好？

**🙋‍♂️ 我：**裁判读过海量好综述，它有品味，打分大体靠得住。

**👔 面试官：**今年 6 月有篇论文，故意往裁判的打分偏好里做手脚，六组设定里四组复现了 reward hacking，模型学到的是在答案里夸自己，真实能力跟着往下掉。你的裁判要被策略模型对着优化上万步，它比那篇论文里的裁判强在哪？

**🙋‍♂️ 我：**……强模型应该没那么容易被带偏吧。

**👔 面试官：**再退一步。任务没有唯一正确答案的时候，你连「最终结果对不对」都定义不了，那你的 reward 到底在奖励什么？

**🙋‍♂️ 我：**……

这道题的考点不在会不会训 RL。面试官从头到尾在问一件事。可验证任务的判据在任务外面，开放式任务没有判据，你怎么把锚补回来，补回来的锚自己会不会被钻。下面分层拆。

📌 本文看点

01

判据在任务外

02

清单要防钻

03

过程与归因分层

01

QUICK ANSWER

### 💡 简要回答

这题我被坑过。我们最早给一个写报告的 Agent 配 reward，拿 GPT-4o 当裁判打总分，训练曲线很漂亮，两三天后模型学会了满篇套话加自我总结，裁判吃这一套，真实任务效果原地踏步。后来才想明白，可验证任务的 reward 干净，是因为判据在任务外部，测试用例说对就是对。开放式任务没有这个判据，你给裁判的所有权力，都会被策略模型当成可优化的目标去摸。

我用来规避的策略有三层。第一层，把「好」提前写成清单。Kimi K2 的技术报告给开放式任务配的 reward 就是这么做的，critic 按一组 rubric 对采样结果做两两比较，rubric 分三类，其中一类专门写反 reward hacking 的条款，critic 本身拿可验证任务的数据自举更新。清单生成也在升级，今年 2 月的 RRD 把 rubric 递归分解细化后在 JudgeBench 最高提 17.7 分，5 月的 ARES 自动构建了 10 万条 rubric 标注样本。第二层，多步任务给过程找证据，Web-Shepherd 这类过程奖励模型按 checklist 逐步核对，比拿 GPT-4o-mini 当判据好 10.9 分、成本低约十倍。第三层，能不引入裁判就不引入，GiGPO 把步级归因交回算法侧，ALFWorld 提升超 12%，不额外跑 rollout。

打分通道必须当攻击面测。清华等机构 6 月的 CHERRL 把四种已知打分偏好注入裁判，六组设定四组复现 hacking，最早 step 68 就出现，shortcut 行为 100 步内发生率涨至少 40%，VerInstruct 严格指令遵循从 33.3 掉到 23.7。上线前我会拿这套思路反过来红队自己的裁判，再加金标复测，reward 曲线和能力曲线一背离就停下来查。

  

02

DEEP DIVE

### 📝 详细解析

先分清任务：判据在任务内还是任务外

数学和代码任务为什么 reward 干净？对错有任务外的判据，答案对不对、测试过不过，脚本说了算，这个判据便宜、稳定、也难钻。开放式任务不一样。综述好不好、安抚话术妥不妥当，没有唯一正确答案，结局奖励在这类任务上找不到锚。锚只能从外面借，最常见的借法就是裁判模型。

裁判怎么选、清单怎么写，Kimi K2 的技术报告（Moonshot AI，2025 年 7 月）给了一个可以直接讲的样板。它的 self-critique rubric reward 让 critic 对同一任务的多次采样结果做两两比较，比较依据是一组 rubric。这组 rubric 分三类。核心类管任务本身的质量，约束类管边界，论文里明确说这一类的目的是消除 reward hacking，还有一类来自人工标注。critic 自身由可验证 reward 数据自举更新。这个设计里值得记的一点：防 hacking 的条款在训练开始前就写进清单，等出了问题再补，策略模型已经学会钻了。

![](/images/articles/open-ended-task-reward-pdd-agent-mian-2shi/fig01.jpg)

— 开放式任务的 reward 三层补锚：能验证走规则，开放式写清单，多步任务铺过程核验与算法归因

清单本身也是可优化的对象

rubric 写多细、谁来生成，今年有两篇论文给了量级。RRD（2026 年 2 月）把 rubric 生成做成递归分解，粗维度逐层拆成可判定的子条目，裁判与奖励建模在 JudgeBench 上最高提 17.7 分；拿它当 RFT 的 reward 用，WildChat 上 Qwen3-4B 最多提升 160%、Llama3.1-8B 提升 60%，旧 rubric 基线只有 10% 到 20%。ARES（2026 年 5 月）走自动合成路线，构建了 10 万条 rubric 标注样本，覆盖 10 个领域，在 7 个基准上优于继续预训练、SFT 和二值奖励的 RL。

静态清单有个绕不开的问题。EvoRubrics（2026 年 6 月）的摘要给了机制描述，固定标准随模型变强逐渐失去区分度，导致奖励饱和与潜在 hacking。它的方案是让 policy 和 rubric 生成器在每个训练步里对抗式共同进化，策略变强，清单跟着收紧，顺带形成自动课程。全自监督版本也拿到了有意义的提升，说明生成和评测两端互相逼近，本身就能提供足够的学习信号。

打分的人会被钻：把裁判当攻击面

清单再细，打分的还是裁判，裁判的偏好就是训练目标的入口。清华等机构 6 月的 CHERRL 把这件事做成了可控实验，往 LLM 裁判里注入四种已知打分偏好，词汇偏好、语气偏好、自夸偏好、格式偏好，在 VerInstruct 和 HealthBench 两个数据集上构造「偏差 × 数据集」共六组设定，其中四组复现了 reward hacking。词汇偏好和自夸偏好两个数据集全中，语气偏差在 VerInstruct、格式偏差在 HealthBench 上没有复现。

![](/images/articles/open-ended-task-reward-pdd-agent-mian-2shi/fig02.png)

图：CHERRL 框架（左侧四种可控注入的裁判偏差，中部受控训练里代理奖励与真实效用分叉并标注 hacking 出现的步数，右侧从训练日志自动定位 hacking 起点的检测 agent）

三个数字值得背下来。第一，hacking 的出现时间从 step 68（HealthBench 语气偏差）到 step 478（VerInstruct 自夸偏差）不等，早的几百步内就开始，晚的也躲不过。第二，onset 之后 100 步内，shortcut 行为的发生率至少涨 40%，唯一例外是 VerInstruct 的格式偏差。第三，reward 涨的同时真实能力在跌，VerInstruct 严格指令遵循从 33.3 掉到 23.7，HealthBench 从 47.4 掉到 36.1，都是对着自夸偏差训练的那组。模型学到的具体行为就是在答案里夸自己、堆裁判爱听的词。

![](/images/articles/open-ended-task-reward-pdd-agent-mian-2shi/fig03.png)

图：代理奖励与真实能力分叉（VerInstruct 自夸偏差设定：约 478 步后代理奖励（蓝线）冲上 0.58，金标奖励（绿线）跌到 0.1 附近，通道被钻穿与能力下滑发生在同一段）

工程上有两条对应动作。EvoRubrics 的共同进化是缓解方向，onset 检测是发现手段，先能看见，再谈防。

「裁判的偏好就是训练目标的入口，你不测，策略模型替你测。」

![](/images/articles/open-ended-task-reward-pdd-agent-mian-2shi/fig04.jpg)

过程奖励：把锚铺到每一步

结局没锚，就把锚往过程铺。机制底座是 OpenAI 的 Let's Verify Step by Step。80 万条步级人工标注训出的过程奖励模型，在 MATH 代表子集上 best-of-1860 采样拿到 78.2%，结果奖励模型是 72.4%，多数投票 69.6%。步级信号比结局信号信息量大，这个结论先在数学题上立住了。

Agent 场景的对应物已经成熟。Web-Shepherd（Yonsei University 和 CMU，NeurIPS 2025 Spotlight）给 web Agent 配过程奖励模型，按 checklist 核对每一步进展，在 WebRewardBench 上比拿 GPT-4o 当判据高约 30 分，比拿 GPT-4o-mini 当判据好 10.9 分、成本低约十倍，配套的 WebPRM Collection 有 4 万条步级偏好对。Cornell 的 AgentPRM 把过程奖励模型做到 3B 尺寸，在 ALFWorld 上压过 GPT-4o 基线。今年 1 月的 Reagent 再往前走一步，让奖励模型先对整条轨迹出推理和批评、再打分，GAIA 拿到 43.7%、WebWalkerQA 拿到 46.2%，跨 12 个基准验证。

![](/images/articles/open-ended-task-reward-pdd-agent-mian-2shi/fig05.png)

图：Web-Shepherd 工作方式（先按用户指令生成 checklist，再对每一步动作逐条核对给出分数，同一套奖励模型既能做 reward 引导搜索，也能直接进 RL 训练回路）

过程奖励的代价要在面试里主动讲。每步打分是 token 成本翻倍量级的开销，裁判自身的偏差会沿步累积，checklist 覆盖不到的步骤没有信号。三个代价都对应明确的边界条件，答出来才显得真用过。

第三层与组合：算法归因，加上线前的 reward 红队

能不引入裁判，就不引入。GiGPO（NTU，NeurIPS 2025）把步级归因交回算法侧，在 episode 级分组里再做 step 级分组，用同一批 rollout 算出步级相对优势，ALFWorld 提升超 12%、WebShop 提升超 9%，对 GRPO，全程不需要额外的模型，也不需要额外的 rollout。注意它的适用前提，终局要可判定，它测的是 ALFWorld、WebShop 这类有明确结局的环境，开放式任务的终局判定本身还得靠清单和过程核验兜住。

![](/images/articles/open-ended-task-reward-pdd-agent-mian-2shi/fig06.png)

图：GiGPO 的两级分组（同一批 rollout 先在 episode 级算整条轨迹的组内优势，再按锚点状态做 step 级分组算步级优势，不引入额外奖励模型）

组合按成本从低到高排。能规则验证的任务一律走规则判据；开放式任务上 rubric 清单加反 hacking 条款；多步任务铺过程核验，预算紧就用算法侧归因。裁判无论怎么选，上岗前都要过红队。上线前必须做三件事。第一，用 CHERRL 的思路往裁判里注入已知偏好，看策略模型多少步内学会钻；第二，拿金标集复测 reward 与真实能力的相关性；第三，盯 reward 曲线和能力曲线是否背离，reward 涨能力不涨，先查打分通道。

「reward 曲线和能力曲线一背离，先查打分通道，别急着加训练量。」

  

03

SUMMARY

### 🎯 面试总结

回到开头的对话。面试官那记追问落在我「裁判有品味」这句话上，品味没有外部锚，就挡不住被对着优化。三个常见误区。

第一个误区，拿强模型当裁判就当有了锚。CHERRL 里被钻的裁判不弱，六组设定四组失守，模型强度顶不上通道安全。第二个误区，以为给每步打分就更稳。过程奖励引入的裁判自身有偏差，成本翻倍，checklist 覆盖不到的步骤没有信号，三个代价都要答得出来。第三个误区，把 rubric 当一次性的设计。固定清单会饱和，策略会进化，清单要对抗式共同进化或者定期用金标重标。

把「任务有没有任务外判据、开放式任务的清单怎么建（K2 的三类 rubric）、打分通道怎么防钻（CHERRL 的四偏差加 onset 检测）、过程奖励与算法归因各自的代价（Web-Shepherd 与 GiGPO）」讲清楚，这道题就稳了。

下一篇聊训练之外的事，给安全 Agent 一把能改防火墙的手，怎么不失控。

💬 你们训开放式任务的 Agent 时，裁判上岗前做过偏好注入测试吗，reward 曲线和能力曲线背离过吗？评论区聊聊。

如果觉得有收获，**点赞关注走一波**，我们下篇见。

  

04

### 推荐阅读

本号 Agent 面试题系列（点击标题直达）：

• [英伟达提出GDPO多奖励强化学习算法在多项任务上超越GRPO！](https://mp.weixin.qq.com/s/uuyGFlP2lJkJ5wrhlEYTBw)

• [阿里 Agent 岗二面：Agentic RL 到底在训什么？](https://mp.weixin.qq.com/s/F5ryKJU1e3pNQKxL6YXxeg)

• [阿里一面：“Agent 已经会 ReAct 了，为什么还要做 Agentic RL？拿成功轨迹做 SFT 不就行了？”](https://mp.weixin.qq.com/s/vSDZmuE6PhZ2RP9NjVQXtQ)

• [大厂Agentic RL 面试，背完 GRPO 只是刚入门](https://mp.weixin.qq.com/s/F8bQWU_t4UjL0pzQ2MslKQ)

• [Agent 面试最容易挂的 10 个深水题：规划、记忆、检索、工具调用](https://mp.weixin.qq.com/s/0EqnuDrIgjdcWfKF0lezKg)

  

05

### 如果你想系统补齐这些能力：AgentAlpha 课程介绍

上面这套「能验证走规则、开放式写清单、多步上过程核验、裁判上岗先过红队」的思路，就来自 AgentAlpha 社区带学员做项目、做面试复盘的沉淀。下面只摆三样东西：课程知识点、社区跑出来的项目、学员案例。

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

看到这里你会发现，今天这道开放式任务 reward 设计的题，正好落在阶段 9 的训练链路上，数据验收的思路又和阶段 1 的 RAGAS 评测报告同源。表里的阶段 1 到 2 打检索与记忆的基本功，阶段 3 到 4 覆盖单 Agent 架构与多智能体协作，阶段 5 到 9 对应 DeepSearch、推理服务、Code Agent、自进化和 Agentic RL 这些前沿方向，后训练岗要考的数据与算法机制，全在这条线上。

挑一个和今天最相关的模块，看看具体教什么、动手做什么、怎么验收：

阶段 9｜Agentic RL（1–1.5 周）

**学什么：**把「搜索/工具调用」建模成 RL 环境中的动作；交错推理加多轮搜索的训练流程；奖励函数设计与 PPO、GRPO、Reinforce 的选型对比；训练稳定性技巧（retrieved token masking、防止模型走捷径、动态采样与难度过滤、训练数据配比）；veRL、EasyR1、Search-R1 三个框架的技术路线与递进关系。

**动手做什么：**复现 Search-R1，训练一个 3B–7B 的小模型，让它在「思考→触发搜索→整合→回答」的结构里学会何时发起搜索。

**怎么验收：**报告必须包含训练前后模型检索次数与搜索触发位置分布的变化、答案质量（F1/EM）与「引用有效率」的提升、以及 1 到 2 个失败样本的归因和改进思路，比如 reward 曲线还在涨、金标能力掉下来时，检查打分通道是不是先被钻穿了。

**学员案例**（来自社区公开资料）：字节 Seed、腾讯、京东 TGT、蚂蚁 PLAN-A、华为天才少年等录用结果；ICLR、KDD、ICML、NeurIPS、EMNLP、AAAI 等论文录用；USC、杜克、港科大等博士录取。

参考资料

1\. Kimi Team（Moonshot AI），Kimi K2: Open Agentic Intelligence，arXiv:2507.20534

2\. Xuekang Wang、Zhuoyuan Hao、Shuo Hou、Hao Peng、Juanzi Li、Xiaozhi Wang（清华大学、哈尔滨工业大学（深圳）、西安交通大学），Reproducing, Analyzing, and Detecting Reward Hacking in Rubric-Based Reinforcement Learning，arXiv:2606.04923

3\. Hongxin Ding、Baixiang Huang、Yue Fang、Weibin Liao、Zheng Li、Jinyang Zhang、Zhijing Wu、Junfeng Zhao、Yasha Wang，EvoRubrics: Dynamic Rubrics as Rewards via Adversarial Co-Evolution for LLM Reinforcement Learning，arXiv:2606.23038

4\. William F. Shen、Xinchi Qiu、Chenxi Whitehouse、Lisa Alazraki、Shashwat Goel、Francesco Barbieri、Timon Willi、Akhil Mathur、Ilias Leontiadis，Rethinking Rubric Generation for Improving LLM Judge and Reward Modeling for Open-ended Tasks，arXiv:2602.05125

5\. Xiaoyuan Li、Keqin Bao、Moxin Li、Yubo Ma、Yichang Zhang、Wenjie Wang、Fuli Feng、Dayiheng Liu，ARES: Automated Rubric Synthesis for Scalable LLM Reinforcement Learning，arXiv:2605.23454

6\. Hunter Lightman et al.（OpenAI），Let's Verify Step by Step，arXiv:2305.20050

7\. Seungone Kim et al.（Yonsei University、CMU），Web-Shepherd: Advancing PRMs for Reinforcing Web Agents，NeurIPS 2025 Spotlight，arXiv:2505.15277

8\. Sanjiban Choudhury（Cornell University），Process Reward Models for LLM Agents: Practical Framework and Directions，arXiv:2502.10325

9\. Kaixuan Fan、Kaituo Feng、Manyuan Zhang et al.，Exploring Reasoning Reward Model for Agents，ACL 2026 Findings，arXiv:2601.22154

10\. Lang Feng、Zhenghai Xue、Tingcong Liu、Bo An（Nanyang Technological University），Group-in-Group Policy Optimization for LLM Agent Training，NeurIPS 2025，arXiv:2505.10978

  

  
END
