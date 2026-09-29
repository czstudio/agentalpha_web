---
slug: enterprise-tk626
no: "1526"
title: "| Q47 | When is a deterministic strategy (like Beam Search) preferable to a stochastic (sampling) strategy"
question: "| Q47 | When is a deterministic strategy (like Beam Search) preferable to a stochastic (sampling) strategy"
excerpt: "这道题考察的是工程取舍与任务适配能力，而非单纯背概念。面试官想看你能否跳出“Beam Search 好还是 Sampling 好”的二元对立，基于任务目标（准确率 vs. 多样性）、风险容忍度（事实性错误 vs. 创意枯"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4910
updated: "2026-09-29"
---

## | Q47 | When is a deterministic strategy (like Beam Search) preferable to a stochastic (sampling) strategy

#### 1️⃣ 考察意图

这道题考察的是**工程取舍**与**任务适配**能力，而非单纯背概念。面试官想看你能否跳出“Beam Search 好还是 Sampling 好”的二元对立，基于任务目标（准确率 vs. 多样性）、风险容忍度（事实性错误 vs. 创意枯竭）、以及计算成本（beam width 对延迟的影响）做出理性决策。刁钻点在于：很多候选人只背了“翻译用 Beam Search，写作用 Sampling”，但说不出为什么翻译用 Beam Search 会导致“重复”和“平庸”的 trade-off，以及如何用 length penalty 或 diverse beam search 缓解。答好了能展示你从系统设计到落地调优的完整流程思维。

#### 2️⃣ 标准答

**核心原则：确定性策略（Beam Search）优先用于任务有“唯一正确答案”或“低容错”场景；随机策略（Sampling）用于任务需要“多样性”或“创造性”场景。**

**1. 确定性策略（Beam Search）的适用场景**

- **事实性任务**：机器翻译（WMT 评测）、文本摘要（CNN/DailyMail）、知识问答（如用 LLM 做 closed-book QA）。这些任务输出必须与 ground truth 高度匹配，beam search 通过保留 top-k 候选路径，最大化序列概率，输出稳定可复现。
- **低风险场景**：客服机器人回答“退款流程”，医疗报告生成，代码补全（如 GitHub Copilot 的确定性模式）。一个采样导致的幻觉可能直接造成业务损失。
- **工程取舍**：Beam Search 的 beam width 不是越大越好。宽度从 4 增加到 8，BLEU 提升不到 0.5 点，但解码延迟翻倍（O(batch * beam)）。实际落地常用 beam=4，配合 length penalty（如 Google NMT 的 α=0.6）抑制过短输出。
- **实际坑 + 解法**：Beam Search 容易产生“重复 n-gram”和“平庸输出”（所有候选路径趋同）。解法：① 引入 n-gram blocking（如 fairseq 的 `--no-repeat-ngram-size=3`）；② 使用 Diverse Beam Search（Vijayakumar et al., 2018），通过分组+多样性惩罚让不同 beam 探索不同模式。

**2. 随机策略（Sampling）的适用场景**

- **创意生成**：故事续写、诗歌生成、对话系统（如 ChatGPT 的默认模式）。需要输出多样性，避免千篇一律。
- **高容错场景**：用户对“讲个笑话”的多个版本都接受，甚至期待意外惊喜。
- **工程取舍**：纯 Sampling（temperature=1.0）容易产生低概率的“胡言乱语”。实际用 Top-K（K=40~50）或 Top-P（p=0.9~0.95）截断尾部概率，再配合 temperature 缩放（T=0.7~0.9 平衡多样性与连贯性）。Temperature 不是越高越好：T=2.0 时概率分布趋近均匀，输出几乎随机；T=0.1 时退化为 greedy decoding，丧失多样性。
- **实际坑 + 解法**：Sampling 的随机性导致输出不可复现，给测试和调试带来困难。解法：① 固定 seed 做 A/B 测试；② 对关键业务场景（如金融报告）强制回退到 Beam Search。

**3. 混合策略：两阶段解码**

- **典型方案**：先用 Beam Search 生成一个“骨架”（如摘要的关键句），再用 Sampling 对骨架进行“润色”（如改写为不同风格）。例如，新闻标题生成：Beam Search 确保事实准确，然后 Sampling 生成多个候选标题供编辑选择。
- **实际落地案例**：某电商客服系统，对“退货流程”这类 FAQ 用 Beam Search（准确率 99%），对“推荐商品”用 Top-P Sampling（点击率提升 15%）。评估指标：准确率 + 多样性评分（如 Self-BLEU 衡量生成多样性）。

**总结一句**：选择取决于任务对“正确性”和“多样性”的权重——翻译、摘要、QA 用 Beam Search；故事、对话、创意写作用 Sampling；关键业务场景用混合策略。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，任务类型——事实性任务（翻译、摘要）用 Beam Search，创意性任务（故事、对话）用 Sampling；第二，风险容忍度——低容错场景（医疗、金融）必须用 Beam Search 保证输出稳定，高容错场景（闲聊）用 Sampling 增加趣味；第三，工程落地——Beam Search 要注意 beam width 的延迟 trade-off 和 n-gram 重复问题，Sampling 要用 Top-K/Top-P 截断尾部概率。总结一句：没有绝对好坏，核心是匹配任务对准确性和多样性的需求。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你提到 Beam Search 容易产生重复，那为什么机器翻译任务仍然广泛使用它？难道翻译不会重复吗？

> 翻译任务中，重复问题相对可控，因为源语言和目标语言有长度对应关系（如英中翻译，英文 10 个词对应中文 15 个字左右），模型天然倾向于生成合理长度的输出。但长文本摘要（如 500 词原文生成 50 词摘要）就容易出现“the the the”或“and and and”的重复。实际解法：① 在 beam search 中集成 n-gram blocking（如 fairseq 的 `--no-repeat-ngram-size=3`）；② 使用 length normalization（如 GNMT 的 `length_penalty=0.6`）让模型倾向于生成更长、更完整的句子，减少局部重复。

**追问 2**：如果用户要求“生成 5 个不同版本的广告文案”，你会怎么设计解码策略？

> 这是一个典型的“多样性优先”场景。我会用 Sampling 作为主策略，但需要控制质量：① 设置 Top-P=0.9 截断低概率 token；② Temperature=0.8 在多样性与连贯性之间平衡；③ 对每个版本使用不同的 random seed，确保输出不重复。如果发现某个版本质量差（如包含敏感词），用一个轻量级分类器做后处理过滤。工程取舍：Sampling 的随机性可能导致 5 个版本中有 1-2 个不可用，需要生成 7-8 个候选再筛选，增加计算成本但提升产出质量。

**追问 3**：你提到混合策略，能具体说说在什么场景下用 Beam Search 生成骨架，再用 Sampling 润色？

> 典型场景是新闻标题生成。第一步：用 Beam Search（beam=4）生成一个事实准确、包含关键实体（人名、地名、数字）的标题骨架，例如“苹果公司发布新款 iPhone 15”。第二步：对这个骨架用 Sampling（Top-P=0.95, T=0.9）生成 3 个不同风格的变体，如“苹果正式推出 iPhone 15，性能提升 30%”或“iPhone 15 来了！苹果发布会亮点全解析”。这样既保证了事实正确性，又提供了多样性。实际落地时，需要评估骨架的准确率（用实体召回率）和变体的多样性（用 Self-BLEU），确保两者平衡。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “Beam Search 永远比 Sampling 好，因为输出更准确。” → ✅ “Beam Search 在事实性任务中准确率高，但在创意任务中会输出平庸、重复的内容，反而降低用户体验。选择取决于任务目标，不是一刀切。”
- ❌ “Sampling 就是随机选词，不可控。” → ✅ “Sampling 可以通过 Top-K、Top-P、Temperature 等参数精细控制随机程度，从近乎确定（T=0.1）到完全随机（T=2.0）都可以调节，是一个连续谱。”
- ❌ “Beam Search 的 beam width 越大越好，因为候选路径更多。” → ✅ “Beam width 增大到一定程度后，BLEU 提升趋于饱和（如从 4 到 8 提升不到 0.5 点），但解码延迟翻倍。实际落地常用 beam=4，配合 length penalty 和 n-gram blocking 效果更好。”

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“检索结果多样性 vs. 生成确定性”切入。例如，在 RAG 中，检索阶段用 Top-K 保证多样性，生成阶段对事实性问答用 Beam Search，对开放对话用 Sampling。可以提你如何用 Self-BLEU 评估生成多样性，并调整检索的 K 值。
- **如果你只做过传统 NLP**：用“机器翻译的 BLEU 优化”类比。例如，在 WMT 评测中，Beam Search 是标配，但你会用 length penalty 和 n-gram blocking 解决重复问题。可以提你如何通过调整 beam width 在 BLEU 和延迟之间做 trade-off。
- **如果你是校招无项目**：聚焦“论文复现”或“课程实验”。例如，复现 GPT-2 时，对比了 Beam Search（beam=4）和 Top-K Sampling（K=40）在文本生成上的效果，发现 Beam Search 在故事续写中重复率高达 30%，而 Sampling 只有 5%。可以提你如何用 n-gram blocking 缓解 Beam Search 的重复问题。
- 《The Curious Case of Neural Text Degeneration》（Holtzman et al., 2020）——提出 Nucleus Sampling（Top-P），解释为什么 Beam Search 在开放生成中表现差。
- 《Diverse Beam Search: Decoding Diverse Solutions from Neural Sequence Models》（Vijayakumar et al., 2018）——解决 Beam Search 输出趋同问题。
- 《Google's Neural Machine Translation System: Bridging the Gap between Human and Machine Translation》（Wu et al., 2016）——GNMT 中 length penalty 和 beam search 的工程实践。
- 《A Systematic Study of Decoding Strategies for Neural Language Models》（Meister et al., 2020）——对比各种解码策略的优缺点和 trade-off。
- Hugging Face 官方文档《How to generate text with Transformers》——包含 Beam Search、Sampling、Top-K、Top-P 的代码示例和参数调优指南。

---
