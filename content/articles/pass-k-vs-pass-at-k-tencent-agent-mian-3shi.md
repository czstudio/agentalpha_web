---
slug: "pass-k-vs-pass-at-k-tencent-agent-mian-3shi"
title: "腾讯Agent岗三面：pass@k 高就敢上生产？pass^k 才是坑"
excerpt: "腾讯Agent岗三面：pass@k高就敢上生产？pass^k才是坑这一篇聊一个几乎所有做大模型评测的人都会踩的坑：拿pass@k当上线依据。看着漂亮的通过率"
date: "2026-09-20"
category: "面试解析"
tags: "Agent,面试,大模型"
minutes: 22
---
# 腾讯Agent岗三面：pass@k 高就敢上生产？pass^k 才是坑

这一篇聊一个几乎所有做大模型评测的人都会踩的坑：拿 pass@k 当上线依据。看着漂亮的通过率，落到生产上，用户体验却一言难尽。考点不在指标名字，而在你算的是「能不能做对一次」还是「每一次都对」。

三面现场：让 pass@k 失效的追问

![腾讯滨海大厦，三面现场](/images/articles/pass-k-vs-pass-at-k-tencent-agent-mian-3shi/fig01.jpg)

👔面试官：你们线上跑的 Agent，模型输出是非确定的。上线前跑离线评测，你用什么指标？

🙋‍♂️我：pass@1，一次跑通过率。

👔面试官：pass@1 到 60%，你敢不敢直接上？

🙋‍♂️我：应该可以吧，一半以上能过。

👔面试官：那客户上午来问一次退款，Agent 走对了；下午再来问，Agent 抽风了。你 60% 这个数是不是在告诉客户「十个人里有四个人会被卡住」？

🙋‍♂️我：那我用 pass@5，五次里只要有一次做对就行？

👔面试官：客户不是让你抽五次奖。他问一次，你要给他一次对。同一个任务实例独立跑八次，八次全对的概率是多少？你算过吗？

🙋‍♂️我：……这个数好像真没算过。

【顿悟时刻】面试官这一问才把考点摊开：不是「你知不知道 pass@k」，而是你算的是模型上限，还是用户拿到的稳定性。同一个模型，同一个测试集，换一种指标聚合方式，60% 的漂亮数字立刻变成 25% 以下。下面逐层拆。

![表情包：一次跑通就以为稳了，八次全对才敢吹](/images/articles/pass-k-vs-pass-at-k-tencent-agent-mian-3shi/fig02.jpg)

## 💡 简要回答

我的做法是分层看两个指标，别把它们混成一个。pass@k 回答的是「k 次里至少有一次成功」，衡量的是能力上限，适合模型选型、探索性任务、能重试的场景；pass^k 回答的是「k 次全部成功」，衡量的是生产可靠性，适合面向真实用户的一次性服务。Sierra 团队 2024 年发布的 τ-bench 论文里给过一个非常刺眼的对照：gpt-4o 在 τ-retail 这个域上，pass@1 = 61.2%，看起来还行；论文 §5.1 原话是「Even for the best-performing gpt-4o function calling agent which has a > 60% average task success, pass^8 drops to < 25%」\[1\]。同一批任务，同一模型，独立跑 8 次全对的平均概率不到 25%。这个衰减不能拿 0.612 的 8 次方去算，那样只有 1.97%，跟 25% 差十几倍。差在这：pass^k 是先按任务算成功率再平均，任务难度异质会让衰减明显放缓。落到工程上，pass@k 只适合放在实验早期看趋势，任何要真给用户的接口，指标得切到 pass^k，把 k 拉到业务能容忍的最小上限去核算，比如客服类常见做法是 k=4 或 k=8，把 pass^k 定成上线闸门。

## 📝 详细解析

### pass@k 与 pass^k：分子是同一个池子，聚合方式完全反着来

先说清楚定义，别把符号看花。τ-bench 论文 §3 里写得很直白：pass@k 是「at least one out of k i.i.d. task trials is successful」\[1\]，k 次独立跑同一任务，至少有一次成功就算过；pass^k 是「all k i.i.d. task trials are successful」\[1\]，同样这 k 次，必须每一次都成功才算过。看起来只差一个字，落到数字上完全两码事。

对同一个任务，如果它的单次成功率是 p，那 pass@k = 1 − (1 − p)^k，pass^k = p^k。两个都是 p 的函数，但一个是「至少一次」，一个是「每一次」。前者会随 k 单调上升往 1 靠，后者会随 k 单调下降往 0 靠。工程上最容易犯的错，是把它们当成互补关系去换算：pass^8 = 1 − pass@8，这是不成立的。它们只是同源于每次成功与否的两种聚合，不是对立面。

![τ-bench 论文 Figure 4：pass^k（实线）与 pass@k（虚线）在 τ-retail 上的分叉曲线](/images/articles/pass-k-vs-pass-at-k-tencent-agent-mian-3shi/fig03.png)

图注：论文 τ-bench Figure 4（图片来源：arXiv:2406.12045）

图里两条曲线的方向刚好相反。虚线 pass@k 一路向上逼近 90%，说明「跑八次里能不能有一次做对」这件事 gpt-4o 已经做得不错了；实线 pass^k 一路向下落到 25% 以下，说明「跑八次全都做对」这件事 gpt-4o 完全没到位。生产环境要的是实线，不是虚线。

### 那个 61% → 25% 的数字，怎么来的

τ-bench 是 Sierra 团队 2024 年 6 月放出来的 Agent 评测基准\[1\]。它跟传统 Agent 基准的区别在两点。第一，它把「用户」也做成模拟：LLM 扮演客户，会追问、会改口、会给不完整信息；第二，它把「领域规则」也做成约束：retail 域有退换货政策、airline 域有改签规则，Agent 违反政策就算错。这两条一叠，Agent 面对的就是一个真实的客服对话环境，而不是一条静态查询。

![τ-bench 论文 Figure 1：Agent 与数据库、API、模拟用户交互的整体框架](/images/articles/pass-k-vs-pass-at-k-tencent-agent-mian-3shi/fig04.png)

图注：论文 τ-bench Figure 1（图片来源：arXiv:2406.12045）

论文 Table 2 里 gpt-4o function calling 在 τ-retail 上的 pass^1 = 61.2%，airline 上 = 35.2%。这两个数单看都不算差，尤其是 retail，超过一半。然后作者把 k 拉到 8，Figure 4 里 gpt-4o 的 pass^8 掉到 25.2%\[1\]，摘要一句话定性为「pass^8 falls below 25% in retail」。同一个模型，同一个测试集，两次采样口径，60 分变成 25 分以下。

![τ-bench 论文 Figure 3：τ-retail 上不同模型 / 方法的 pass^1 柱状对比](/images/articles/pass-k-vs-pass-at-k-tencent-agent-mian-3shi/fig05.png)

图注：论文 τ-bench Figure 3（图片来源：arXiv:2406.12045）

后面 2025 年 6 月的 τ²-bench 论文（arXiv:2506.07982）把这套指标延到了 telecom 域，gpt-4.1 在 retail pass^1 = 74%、airline pass^1 = 56%、telecom pass^1 = 34%\[2\]。作者特别注明「as k increases, the pass^k scores decline more rapidly for telecom compared to airline」\[2\]——k 越大掉得越陡，域越难陡得越厉害。这条结论很实用：跨域做 pass^k 的时候，别拿一个统一阈值卡，得按域设。

### 为什么不是「p 的 k 次方」：任务异质性让衰减比想象中慢

一个直觉算法：pass^1 = 61.2%，那 pass^8 应该是 0.612 的 8 次方 ≈ 1.97%。但论文实测 25.2%，差十几倍。这个差异不是 bug，是任务本身的性质。

假设你的评测集里一半任务是「稳过的题」（p 接近 100%），一半是「稳挂的题」（p 接近 0），整体 pass^1 大概 50%。跑八次全对，稳定的那一半依然稳定通过，不稳的那一半一开始就不过——最后 pass^8 大概还是 50%，几乎不衰减。反过来，如果每个任务都是「抛硬币」（p = 50%），八次全对的概率就是 0.5 的 8 次方 ≈ 0.4%。真实任务的 p 分布在这两极之间：既有「Agent 十拿九稳」的模板题，也有「Agent 一半概率翻车」的复杂题。论文在 τ-retail 里测出来的每个任务单独成功率，Figure 7 就是这张分布图，p 值高度右偏\[1\]：相当多任务 p 接近 1，把整体 pass^8 往上托住了 20 多个百分点。

这里有个可以直接背下来的判断：**pass^8 相对 pass^1 掉得慢，说明任务难度分层严重；掉得快，说明任务同质性高、模型对每道题都没把握**。这两种情况在生产上处置方式完全不同。前者应该按难度桶分别核算 pass^k，后者应该看模型本身。

![τ-bench 论文 Figure 7：τ-retail 里每个任务单独成功率排序，p 值明显右偏](/images/articles/pass-k-vs-pass-at-k-tencent-agent-mian-3shi/fig06.png)

图注：论文 τ-bench Figure 7（图片来源：arXiv:2406.12045）

论文 Figure 6 还给了一个具体的解释：retail 域里，任务里包含的数据库写操作越多，成功率掉得越明显。写操作意味着「一次没做对就是真金白银出错」，Agent 在多步写入上的错误会一路往下传。这条曲线也解释了为什么「写库场景」的 pass^k 比「只读场景」的 pass^k 掉得快——一次错就是错。

![τ-bench 论文 Figure 6：τ-retail 里含更多数据库写操作的任务，pass^k 明显下降](/images/articles/pass-k-vs-pass-at-k-tencent-agent-mian-3shi/fig07.png)

图注：论文 τ-bench Figure 6（图片来源：arXiv:2406.12045）

### 什么时候该看 pass@k、什么时候只能看 pass^k

我的经验是把两个指标按「能不能重试」和「用户是不是同一人」切一刀。

**pass@k 适合的场景**：模型选型（同一批题，谁在 k 次里至少能对一次，说明他有这个能力）；探索性任务（帮分析师找证据、生成候选方案，一次错可以再来）；能自动重试的批处理（跑失败的下一轮再跑，最终产出物只有一份）。这时候关心的是能力天花板。

**pass^k 适合的场景**：真实用户对话（客服、投顾、导购，用户不会给你第八次机会）；写库操作（下单、退款、库存变更，一次错就是真金白银）；带状态的长任务（Agent 已经写了三条 SQL 才发现理解错了，回滚代价巨大）。这时候关心的是每一次是不是都靠得住。

论文 §5 开头那句原话很值得贴在工位上：「self-reflection is unrealistic as real-world agents only have one chance to serve the user」\[1\]。用户不是让你反思完再来一遍，他这一次就要拿到对的结果。工业界的直觉口径基本就是：任何用户直接看的接口，指标必须切到 pass^k；任何后台能重试或人来兜底的流程，可以用 pass@k 做上限筛选。

![知识图解：pass@k（至少 1 次成功，看上限）与 pass^k（k 次全部成功，看可靠性）方向相反](/images/articles/pass-k-vs-pass-at-k-tencent-agent-mian-3shi/fig08.png)

### 落地：把 k 次跑成一次成本核算

工程上把 pass^k 变成上线闸门，最难的不是指标本身，是算力预算。你原来的评测一次跑 N 题，改成 pass^k 就是 N×k 次，直接乘以 k。我一般三步走。

第一步，把 k 拉到业务能容忍的最小上限。客服类常见做法是 k = 4 或 k = 8，对应「一天问一个问题被卡住」的概率。假设 pass^4 = 80%，那一个用户连着问四次全对的概率就是 80%，一次错的用户不满概率约 20%。这个数字要给业务方看，不是给算法团队看。

第二步，把 k 次独立跑合并到一个批次里做。别按 pass^1 跑 N 次再按 pass^8 跑一次。直接对每道题跑 k 次，用超几何估计算 pass^k。τ-bench 论文附录里给了具体公式：pass^k = E\_task\[C(c, k) / C(n, k)\]，其中 c 是成功次数、n 是总次数\[1\]。工程上用组合数比率的期望，不是拿单次通过率硬算 p^k。

第三步，只在关键节点跑 pass^k，日常回归还是 pass@1。上线前、大促前、模型换代前，跑一次完整 pass^k；日常迭代跑 pass@1 看趋势，掉到阈值以下再触发 pass^k 复核。不这么设计，评测集群会被吃光。

| 阶段 | 指标 | 用途 | 常见阈值 |
| --- | --- | --- | --- |
| 模型选型 | pass@k | 能力上限筛选 | 视场景 |
| 日常回归 | pass@1 | 趋势监控 | 环比不下降 |
| 上线闸门 | pass^k（k=4/8） | 生产可靠性 | 业务侧拍板 |
| 事故复盘 | 单任务 p 分布 | 定位是任务异质还是模型同质 | 见 Figure 7 |

### 面经里的两个真陷阱，顺手说一下

**第一个陷阱是「一次跑通就上」**。有一位候选人在面试里报「我们 pass@1 干到 78% 就上线了」，面试官没问别的，只追问「同一批任务连续跑八次，全过的比例多少」，候选人沉默。上线后前两周客服工单里，同一个用户问同一个问题被 Agent 卡住两次的投诉明显上升，回过头测 pass^4，只有 34%。指标算错口径，比指标低更可怕。

**第二个陷阱是「拿 p^k 硬算 pass^k」**。有些团队不做多次独立跑，直接用 pass@1 结果开 k 次方当 pass^k，然后跟上线要求一比，觉得 60% 八次方才 1.7%，直接不敢上线了。这个数字对任务同质性极高的场景（比如纯单测、纯代码补全）勉强可用；对 τ-bench 这种客服对话任务，实测差十几倍。宁可多花算力真跑 k 次，别拿指数硬估。

## 🎯 面试总结

回头看开头那段对话，面试官最后没在问「什么是 pass@k」，问的是「同一个任务连续跑八次全都对，你的系统能做到多少次」。这一问，把很多团队的评测口径问题暴露了出来。

第一个误区是把 pass@k 和 pass^k 当成互补换算。它们分子都是 k 次独立试验，但一个「至少一次」、一个「每一次」，聚合方向完全反过来。

第二个误区是拿单次通过率硬算 k 次方。这个公式对任务同质性极高的场景勉强凑合，对真实对话任务能差十几倍，别拿它当决策依据。

第三个误区，也是最深的那个，是拿 pass@k 当上线依据。用户只有一次机会，你的接口每一次都得对。τ-bench 那句「real-world agents only have one chance to serve the user」，就是这层判断的依据。

把「pass@k 与 pass^k 的定义差、τ-bench 61%→25% 那组数字、任务异质性为什么让 pass^8 不等于 p^8、上线闸门怎么定 k」这四件事讲清楚，这道题就稳了。

下一篇我会专门写「评测集被训练数据污染了怎么检测怎么防」，这是 pass^k 之外最容易让指标失真的另一件事。

* * *

💬 你们线上 Agent 评测用的是 pass@k 还是 pass^k？k 定到几？跑一次成本和收益怎么权衡的？评论区聊聊。

如果觉得有收获，点赞关注走一波，我们下篇见。

## 推荐阅读

本号 Agent 面试题系列（更新中）：

•大厂Agentic RL 面试，背完 GRPO 只是刚入门\[1\]

•阿里一面："Agent 已经会 ReAct 了，为什么还要做 Agentic RL？拿成功轨迹做 SFT 不就行了？"\[2\]

•问的最多的大模型 Agent 算法面试题：设计Agent 记忆系统？\[3\]

•字节 Agent 岗二面：RAG 的 Top-K 是不是越大越好？\[4\]

•如何学习Claude Code——从小白到高手的 Agent Harness 学习之路\[5\]

## 如果你想系统补齐这些能力：AgentAlpha 课程介绍

上面这套「pass@k 与 pass^k 分层看、指标口径怎么落到上线闸门」的判断，就来自 AgentAlpha 社区带学员做项目、做面试复盘的沉淀。下面只摆三样东西：课程知识点、社区跑出来的项目、学员案例。

**AgentAlpha 是什么**：一个以实战为核心的大模型 Agent 社区，核心做法是**项目驱动 + 导师带教 + 实战落地**，每一阶段都要留下可检查、可展示、可讲解的项目产出。

**社区已经跑通的项目**（社区公开资料）：

| 项目 | 方向 | 硬结果 |
| --- | --- | --- |
| Idea2Paper | AI 科研智能体 | HF Daily Paper 日榜第 1，GitHub 约 1.4k star，1000+ 内测用户 |
| InkOS | AI 小说创作系统 | GitHub 7800+ star，150+ 部作品签约番茄/七猫 |
| 潜艇 AI | TikTok 跨境电商 AI | 3 人团队 20 天上线，30 天用户破万，帮卖家创收 300 万+ |

**课程主线：Agent 十大模块（建议周期 3–4 个月）**

![Agent 十大模块训练路线图](/images/articles/pass-k-vs-pass-at-k-tencent-agent-mian-3shi/fig09.jpg)

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

看到这里你会发现，pass^k 这类评测指标的问题，落在阶段 1 的 RAGAS 评测、阶段 5 的 DeepSearch 检索轨迹日志和阶段 9 的 Agentic RL 验收报告里都会反复遇到：报告必须给分布，不能只给一次结果。表格只是骨架。挑四个代表模块，看看每个阶段**具体教什么、动手做什么、怎么验收**：

**阶段 1｜RAG：从理论到实践（1–2 周）**

•**学什么**：分块策略（固定长度/语义/递归切分，粒度对召回的影响）；三类检索范式（稀疏 BM25、稠密 embedding+ANN、混合检索）；重排序（Cross-Encoder 与 LLM 做列表式重排）；来源引用（citation）的正确嵌入方式。

•**动手做什么**：先跑通 LangChain 最小 RAG，再用 LlamaIndex 从零手写数据摄取、检索、响应合成，吃透底层原理；对比 Chroma、FAISS 等向量库的选型差异。

•**怎么验收**：基于自选数据集做一个带来源引用的检索问答系统；用 RAGAS 跑一次完整评测，交一份不少于一页的分析报告（分块与检索策略、召回率、答案忠实度、优化方向）；进阶挑战是混合检索+重排的对照实验。本阶段实战产出一套企业级智能知识引擎框架——它的原型来自导师团队为北美头部金融客户交付的定制 RAG 系统，支撑过上万份财报文件的实时问答与可审计访问。

**阶段 2｜记忆系统（7–9 天）**

•**学什么**：短期工作记忆 vs 长期记忆的三种类型（语义事实、情景事件、程序性技能）；写入策略（什么值得记、实时还是异步写、存 buffer/向量库还是图）；召回机制（相似度检索、元数据过滤、时间衰减、top-k）；摘要压缩与记忆淘汰。

•**动手做什么**：用 LangChain 管理短期上下文；基于 mem0 搭建长期记忆层（向量+KV+图混合存储）；设计「什么进长期记忆」的写入规则，区分关键信息与对话噪声。

•**怎么验收**：为阶段 1 的 RAG 系统接入记忆——重启对话后，Agent 要能准确回忆你指定的项目名称、代码风格、输出格式；进阶挑战是设计记忆提取器，用实验初步验证它能否降低幻觉。

**阶段 5｜DeepSearch（5–7 天）**

•**学什么**：推理中动态检索（何时触发、检索多少、何时停止）；文档内推理（Reason-in-Documents：长文切分、压缩、证据对齐，先在文档内推理再注入主链）；Agentic RAG 与传统 RAG 的本质差异与适用边界。

•**动手做什么**：复现最小 Search-o1 流程（粗检索→重排→RiD→主推理链整合）；在开放问题集（论文综述、竞品调研）上跑通「思考→搜索→整合」，并自动插入引用与证据定位（段落/页码/锚点）。

•**怎么验收**：提交带完整检索轨迹的日志（检索触发点、查询文本、重排得分、注入时机）和一份含「引用来源+证据热区」的报告；与阶段 1 的纯 RAG 基线做对照，答案质量、引用准确性、推理链完整性三个维度至少两项显著提升。

**阶段 9｜Agentic RL（1–1.5 周）**

•**学什么**：把「搜索/工具调用」建模成 RL 环境中的动作；交错推理+多轮搜索的训练流程；奖励函数设计与 PPO/GRPO/Reinforce 的选型对比；训练稳定性技巧（retrieved token masking、防止模型走捷径）；veRL、EasyR1、Search-R1 三个框架的技术路线与递进关系。

•**动手做什么**：复现 Search-R1，训练一个 3B–7B 的小模型，让它在「思考→触发搜索→整合→回答」的结构里学会何时发起搜索。

•**怎么验收**：报告必须包含训练前后模型检索次数与搜索触发位置分布的变化、答案质量（F1/EM）与「引用有效率」的提升、以及 1–2 个失败样本的归因和改进思路。

剩下六个阶段同样按「掌握内容→核心实践→阶段考核→进阶挑战」的结构推进，篇幅所限不逐一展开，课程介绍视频里有完整版。

**交付方式**：直播+录播+代码库（录播永久回看，配套企业级项目源码）；字节 3-2、NeurIPS Spotlight 得主、大厂 P7-P8 导师每周答疑；每周学习周报+阶段考核；结业优秀项目获内推机会。

**导师阵容**：核心导师包括 MIT 博士、985 青年教授（CVPR/ECCV 等顶会 Workshop 全球冠军），港科大博士后（NeurIPS Spotlight，发表论文 80 余篇），以及面试超 80 场、大厂通过率 100% 的中科院博士。社群里有字节 Seed、Meta、Google、阿里 P7 等在各方向的成员。

**学员案例**（个案，来自社区公开资料）：字节 Seed、腾讯、京东 TGT、蚂蚁 PLAN-A、华为天才少年等录用结果；ICLR、KDD、ICML、NeurIPS、EMNLP、AAAI 等论文录用；USC、杜克、港科大等博士录取。

**参考资料**

1Shunyu Yao, Noah Shinn, Pedram Razavi, Karthik Narasimhan (Sierra). _τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains_. arXiv:2406.12045, 2024-06.

2Sierrа Research. _τ²-bench: Benchmarking Agents with Dual Control and User Interaction_. arXiv:2506.07982, 2025-06.

参考链接：

•\[1\] τ-bench 论文: https://arxiv.org/abs/2406.12045

•\[2\] τ²-bench 论文: https://arxiv.org/abs/2506.07982

•\[3\] τ-bench 官方仓库: https://github.com/sierra-research/tau-bench

参考链接

\[1\] 大厂Agentic RL 面试，背完 GRPO 只是刚入门: https://mp.weixin.qq.com/s/F8bQWU\_t4UjL0pzQ2MslKQ

\[2\] 阿里一面："Agent 已经会 ReAct 了，为什么还要做 Agentic RL？拿成功轨迹做 SFT 不就行了？": https://mp.weixin.qq.com/s/vSDZmuE6PhZ2RP9NjVQXtQ

\[3\] 问的最多的大模型 Agent 算法面试题：设计Agent 记忆系统？: https://mp.weixin.qq.com/s/un7kxtWpzn3uuon7MZu29A

\[4\] 字节 Agent 岗二面：RAG 的 Top-K 是不是越大越好？: https://mp.weixin.qq.com/s/J8JfTyQ0cf95vZ\_WoOk4PA

\[5\] 如何学习Claude Code——从小白到高手的 Agent Harness 学习之路: https://mp.weixin.qq.com/s/faQmfJARYIHbTr5wUKW9tQ
