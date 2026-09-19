---
slug: "synthetic-data-quality-monitoring"
title: "阿里后训练岗三面:合成数据占比过高,模型会出什么问题?怎么监控?"
excerpt: "\"合成数据的价值在补长尾和难题，不在凑数量。占比过了头，模型学到的是老师模型的措辞习惯，能力没有跟过来。监控要用独立的标尺，别让数据来源既当运动员又当裁判。"
date: "2026-09-18"
category: "技术分享"
tags: "Agent,面试,大模型"
minutes: 12
source: "https://mp.weixin.qq.com/s"
---
"

合成数据的价值在补长尾和难题，不在凑数量。占比过了头，模型学到的是老师模型的措辞习惯，能力没有跟过来。监控要用独立的标尺，别让数据来源既当运动员又当裁判。

**👔 面试官：**你们现在的训练数据里，合成占多少？

**🙋‍♂️ 我：**四成左右，数学和代码里比例更高。

**👔 面试官：**为什么停在这里？继续往上加不行吗？

**🙋‍♂️ 我：**怕模型学到老师模型的……习惯？

**👔 面试官：**什么习惯？你在训练里看到过什么信号？

**🙋‍♂️ 我：**输出开始长得都一样，开头全是「让我们一步步思考」这种。

**👔 面试官：**这只是一层。如果合成分布内的评测分数还在涨，你怎么判断模型是真变强了，还是越来越像老师？

**🙋‍♂️ 我：**……

这道题表面在问数据配比，实际在问一件事：你能不能分清「模型学到了能力」和「模型越来越像老师」。三个信号、四个指标、四招缓解，下面逐层展开。

![](/images/articles/synthetic-data-quality-monitoring/fig01.jpg)

— 阿里总部实景

📌 本文看点

01

三个信号三层深

02

监控别自证

03

缓解四招

01

QUICK ANSWER

### 💡 简要回答

合成数据占比过高，会出现三层信号。最表层是措辞趋同：模型开始复现老师模型的口头禅，「让我们一步步思考」「综上所述」这类模板短语的频率明显上升。第二层是多样性下降：distinct-n 掉、自重复率升。最深一层是能力虚胖：合成分布覆盖的题型分数很高，分布外的题一测就露馅。Nature 2024 年的研究（Shumailov 等）给过理论佐证：在递归生成的数据上训练，真实分布的尾部最先丢失，长尾样本最先消失。

监控布四个指标：输出侧的 distinct-n 和自重复率、模板短语频率、合成集与真实集在 embedding 空间的距离，再加一个独立的人评 holdout。原则只有一条：监控不能自证。全用合成分布内的指标打分，分数永远好看。看分布形态，均值会被少数长样本拉高。

缓解靠四件事：控比例、混真实数据；合成种子用真实 query，不用模板；按语义簇做多样性采样，不做随机采样；用不同来源的老师模型交叉生成。合成数据的价值在覆盖难度。微软的 phi-1（arXiv:2306.11644）用约 7B tokens 的高质量教科书式合成数据，把 1.3B 的模型带到 HumanEval pass@1 50.6%，论文的对比口径是模型尺寸小 10 倍、数据量小 100 倍（GPT-4 除外）。定位对了，合成数据非常强。

  

02

DEEP DIVE

### 📝 详细解析

三个信号，一层比一层深

先把机制说清。用 A 模型造数据训 B，B 拿到的是 A 的输出，里面混着 A 的知识、A 的偏见和 A 的措辞习惯。B 学得最快的是最后一样，因为措辞是最高频、最表层的模式。合成占比越高，训练分布就越贴近老师模型的输出分布，B 的输出风格就越向 A 收拢。

Nature 2024 年那篇被引一千九百多次的研究（Shumailov 等，arXiv:2305.17493）把这个过程推到了极限：在递归生成的数据上一代代训下去，真实分布的尾部最先丢，长尾样本先消失，整体多样性收窄。顺带交代诚实边界：这篇的结论强度后来有商榷（Borji，arXiv:2410.12954），但「无控制地堆合成数据有分布风险」这个方向，业界没有分歧。

![](http://mmbiz.qpic.cn/sz_mmbiz_jpg/5YsV5NjPaqCLUoUMrATpvS4xA2ibB48tqM9T51JgUjSfZIElRDs2PSA6RdEBibBZnRYepfJzfvic6XljQmBgjTskYNGo8KNGx342H3oSKdkcKs/0?wx_fmt=jpeg)

图：模型坍塌研究的样本分布直方图（在生成数据上反复训练后，样本分布逐渐收窄集中，对应真实分布尾部的消失）

![](http://mmbiz.qpic.cn/sz_mmbiz_jpg/5YsV5NjPaqALAicoZS2Wn7Z8QWNgvgZ3k0PwnTNFf1N2TsVcl6LdKwL8SIcyicCwTZlou09utKMCIJaxgHPTA1bOtpyESca4aWS3Tdic5NzTGk/0?wx_fmt=jpeg)

— 递归训练生成数据，真实分布的尾部最先丢失

「占比越高，模型越像老师。像，不等于会。」

信号一：措辞趋同，最先能看见的信号

最表层的信号在输出文本本身。老师模型的口头禅会被高频继承，「让我们一步步思考」「综上所述」「总的来说」这类模板短语的出现频率明显上升。工程上很好监控：维护一张模板短语频率表，每个版本模型的评测输出过一遍正则，频率曲线画出来，涨得快的直接报警。

这个信号的价值在早：措辞趋同先于能力虚胖出现，等它报警时动手，还来得及调比例。

![](/images/articles/synthetic-data-quality-monitoring/fig02.jpg)

— 措辞趋同是合成过量的第一信号

信号二：多样性下降，看分布别看均值

第二个信号在统计上。distinct-n 反映输出里 n-gram 的丰富程度，自重复率反映模型对自己的重复程度。合成占比上去之后，前者掉、后者升。

这里有个容易踩的坑：看分布形态，别只看均值。评测输出的长度、句式、答案分布要画直方图看形状，均值会被少数超长样本拉高，把「已经收敛到少数模式」这件事藏起来。

信号三：能力虚胖，最危险的一层

前两层还能从输出直接看出来，第三层藏得最深。合成分布覆盖的题型上，模型分数持续上涨，训练报告一片绿；换一批分布外的题、或者拉独立的人评来测，分数掉下来一大截。模型学到的是老师在合成分布内的解题套路，分布外泛化并没有发生。

防自证的办法只有一个：独立的人评 holdout。这批题不能来自合成管线，不能让打分的 judge 和生成数据的模型同源，人评样本按难度分层覆盖。没有这把独立的尺子，合成占比越高，报告越好看，虚胖越严重。

![](http://mmbiz.qpic.cn/mmbiz_jpg/5YsV5NjPaqCxjhEf92vUoGckXla2E0DMf554qSKBQKtuDSJAyejzGEDO0KKv8leyEcDEsM5MmG7hN2Q85y2f8G6q0nIibFNAGArPx5KmdOias/0?wx_fmt=jpeg)

— 合成分布内的分数在涨，分布外一测就露馅

「用合成分布考模型，分数永远好看。」

监控面板：四个指标加一条原则

落到工程上，监控面板布四个指标。输出侧两个：distinct-n 和自重复率，按版本画曲线。文本侧一个：模板短语频率表。数据侧一个：合成集与真实集在 embedding 空间的距离，距离在拉大就是分布在偏。最后压上独立的人评 holdout 一致性，作为唯一的最终标尺。

四条曲线一起看。措辞趋同是早期信号，多样性下降是中期信号，holdout 掉分是晚期信号。等 holdout 报警再动手，回滚成本已经很高了。

![](http://mmbiz.qpic.cn/mmbiz_jpg/5YsV5NjPaqCib2diaIkLPK647THRCrSHk46Bicwmlia2LjzgJnXAibtAUU5q3dPzaiaQgtmNgIWIzcxoHC4077IUeUKGULZVeJlUSLSxREj7vc9fM/0?wx_fmt=jpeg)

— 四个指标一起盯，别只看平均分

缓解四招，外加一个正面例子

缓解四招。一，控比例，合成数据配真实数据，占比超线就停。二，合成种子用真实 query，模型补的是真实场景里长尾的难点，模板生成的样本没有真实感。三，按语义簇做多样性采样，随机采样会让主流簇霸占配额，长尾永远排不上。四，用不同来源的老师模型交叉生成，单个老师的偏见不至于被整体继承。

正面例子是 phi-1。微软把合成数据按「教科书」标准做：概念、解释、练习各就各位，只用了约 7B tokens，1.3B 的模型在 HumanEval 上拿到 pass@1 50.6%，论文的对比口径是模型尺寸比同梯队小 10 倍、数据量小 100 倍（GPT-4 除外）。合成数据的成色取决于定位和质量：拿它补难度和长尾，它很强；拿它凑数量，模型先学会老师的腔调。

![](http://mmbiz.qpic.cn/mmbiz_jpg/5YsV5NjPaqBYGmfxFENhAwwUBAL07DFlb3CC97XGI5x6gIMylibYAwHMFYjfibnqBe87awdKbBO4SqT6NdmR2UGIqMevRn4JFZV5AvKXBiaEh8/0?wx_fmt=jpeg)

— 缓解四招：控比例、真种子、语义簇采样、多老师

「一组合成数据值不值，看它补了什么难度，不看它有多少条。」

  

03

SUMMARY

### 🎯 面试总结

回头看开头的对话，三个典型误区。

第一个误区，是只会说「合成数据有噪声、要清洗」，讲不出措辞趋同、多样性下降、能力虚胖这三层信号的先后和机制。第二个误区，是监控全搭在合成分布内，指标自己给自己作证，没有独立的人评 holdout。第三个误区，是把合成数据当数量工具，随机采样、不按语义簇去重，补的全是主流简单样本。

把「三层信号、四个指标、四招缓解」讲清楚，带上 Nature 2024 模型坍塌研究和 phi-1 这两个出处，这道题就稳了。

💬 你们训练数据里合成占多少？踩过措辞趋同或者能力虚胖的坑吗？最后是怎么发现的？评论区聊聊。

如果觉得有收获，**点赞关注走一波**，我们下篇见。

  

04

### 推荐阅读

本号 Agent 面试题系列（点击标题直达）：

• [大厂Agentic RL 面试，背完 GRPO 只是刚入门](https://mp.weixin.qq.com/s/F8bQWU_t4UjL0pzQ2MslKQ)

• [大厂面试RLHF：从PPO，DPO，GRPO…](https://mp.weixin.qq.com/s/o42oy8SCH7fhrpW537Hs4g)

• [Agent 面试最容易挂的 10 个深水题：规划、记忆、检索、工具调用](https://mp.weixin.qq.com/s/0EqnuDrIgjdcWfKF0lezKg)

• [RL不是大模型最终解？清华NeurIPS最佳论文：大模型推理能力早被基座"锁死"](https://mp.weixin.qq.com/s/CHyM4ZSwfSSJcYSCWeyb0Q)

• [淘天一面最高频：多Agent怎么协作？99%的人答错了第一步](https://mp.weixin.qq.com/s/2pVa6s1hZu5NoUPyJfySSA)

  

05

### 如果你想系统补齐这些能力：AgentAlpha 课程介绍

上面这套「数据配比与监控」的拆解逻辑，就来自 AgentAlpha 社区带学员做项目、做面试复盘的沉淀。下面只摆三样东西：课程知识点、社区跑出来的项目、学员案例。

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

看到这里你会发现，今天这道数据配比的题，正好落在阶段 9 的训练链路上，监控与评测的思路又和阶段 1 的 RAGAS 评测报告同源。表里的阶段 1 到 2 打检索与记忆的基本功，阶段 3 到 4 覆盖单 Agent 架构与多智能体协作，阶段 5 到 9 对应 DeepSearch、推理服务、Code Agent、自进化和 Agentic RL 这些前沿方向，后训练岗要考的数据与算法机制，全在这条线上。

挑一个和今天最相关的模块，看看具体教什么、动手做什么、怎么验收：

阶段 9｜Agentic RL（1–1.5 周）

**学什么：**把「搜索/工具调用」建模成 RL 环境中的动作；交错推理加多轮搜索的训练流程；奖励函数设计与 PPO、GRPO、Reinforce 的选型对比；训练稳定性技巧（retrieved token masking、防止模型走捷径、动态采样与难度过滤、训练数据配比）；veRL、EasyR1、Search-R1 三个框架的技术路线与递进关系。

**动手做什么：**复现 Search-R1，训练一个 3B–7B 的小模型，让它在「思考→触发搜索→整合→回答」的结构里学会何时发起搜索。

**怎么验收：**报告必须包含训练前后模型检索次数与搜索触发位置分布的变化、答案质量（F1/EM）与「引用有效率」的提升、以及 1 到 2 个失败样本的归因和改进思路，比如合成数据占比提高两成后，如何用 distinct-n 和独立 holdout 判断模型有没有变虚。

**学员案例**（来自社区公开资料）：字节 Seed、腾讯、京东 TGT、蚂蚁 PLAN-A、华为天才少年等录用结果；ICLR、KDD、ICML、NeurIPS、EMNLP、AAAI 等论文录用；USC、杜克、港科大等博士录取。

参考资料

1\. Shumailov et al.，AI models collapse when trained on recursively generated data，Nature 631（2024），arXiv:2305.17493

2\. Gunasekar et al.（Microsoft Research），Textbooks Are All You Need（phi-1），arXiv:2306.11644

3\. Borji，A Note on Shumailov et al. (2024)，arXiv:2410.12954

  
END
